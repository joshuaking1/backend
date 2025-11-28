import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  ReportDateRangeDto, 
  SalesReportQueryDto, 
  InventoryReportQueryDto,
  CustomerReportQueryDto,
  AppointmentReportQueryDto,
  StaffReportQueryDto,
  PayrollReportQueryDto,
  ExpenseReportQueryDto
} from './dto/index';
import { 
  startOfDay, 
  endOfDay, 
  parseISO, 
  eachDayOfInterval, 
  isWeekend,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth
} from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // SALES REPORTS
  async getSalesReport(organizationId: string, query: SalesReportQueryDto) {
    const startDate = startOfDay(parseISO(query.startDate));
    const endDate = endOfDay(parseISO(query.endDate));

    const where: any = {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.branchId) where.branchId = query.branchId;
    if (query.staffId) where.processedByStaffId = query.staffId;

    // Get aggregates
    const aggregates = await this.prisma.sale.aggregate({
      where,
      _sum: {
        total: true,
        taxAmount: true,
        discountAmount: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        total: true,
      },
    });

    // Get sales by payment method - query Payment model and join to sales
    const paymentsByMethod = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        sale: {
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(query.branchId && { branchId: query.branchId }),
          ...(query.staffId && { processedByStaffId: query.staffId }),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const salesByPaymentMethod = paymentsByMethod.map(item => ({
      paymentMethod: item.method,
      totalAmount: item._sum.amount || 0,
      count: item._count.id,
    }));

    // Get sales by service
    const salesByService = await this.prisma.saleItem.groupBy({
      by: ['serviceId'],
      where: {
        sale: {
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(query.branchId && { branchId: query.branchId }),
        },
      },
      _sum: {
        quantity: true,
        priceAtTimeOfSale: true,
      },
      _count: {
        id: true,
      },
    });

    // Calculate total revenue for each service
    const serviceRevenue = salesByService.map(item => ({
      serviceId: item.serviceId,
      totalQuantity: item._sum.quantity || 0,
      totalRevenue: (item._sum.quantity || 0) * (item._sum.priceAtTimeOfSale || 0),
      count: item._count.id,
    }));

    // Get service details
    const serviceIds = salesByService.map(item => item.serviceId).filter((id): id is string => id !== null);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });

    const salesByServiceWithNames = serviceRevenue.map(item => ({
      serviceId: item.serviceId,
      serviceName: services.find(s => s.id === item.serviceId)?.name || 'Unknown',
      totalQuantity: item.totalQuantity,
      totalRevenue: item.totalRevenue,
      count: item.count,
    }));

    // Get sales by staff
    const salesByStaff = await this.prisma.sale.groupBy({
      by: ['processedByStaffId'],
      where,
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    });

    // Get staff details
    const staffIds = salesByStaff.map(item => item.processedByStaffId).filter(Boolean);
    const staff = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const salesByStaffWithNames = salesByStaff.map(item => ({
      staffId: item.processedByStaffId,
      staffName: staff.find(s => s.id === item.processedByStaffId) 
        ? `${staff.find(s => s.id === item.processedByStaffId)!.firstName} ${staff.find(s => s.id === item.processedByStaffId)!.lastName}`
        : 'Unknown',
      totalRevenue: item._sum.total || 0,
      count: item._count.id,
    }));

    return {
      totalSales: aggregates._count.id || 0,
      totalRevenue: aggregates._sum.total || 0,
      averageOrderValue: aggregates._avg.total || 0,
      totalTax: aggregates._sum.taxAmount || 0,
      totalDiscount: aggregates._sum.discountAmount || 0,
      salesByPaymentMethod,
      salesByService: salesByServiceWithNames,
      salesByStaff: salesByStaffWithNames,
    };
  }

  async getSalesTimeSeries(organizationId: string, query: SalesReportQueryDto & { groupBy: 'day' | 'week' | 'month' }) {
    const startDate = startOfDay(parseISO(query.startDate));
    const endDate = endOfDay(parseISO(query.endDate));

    const where: any = {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.branchId) where.branchId = query.branchId;
    if (query.staffId) where.processedByStaffId = query.staffId;

    // Group sales by date
    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by specified period
    const groupedData: any[] = [];
    
    if (query.groupBy === 'day') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      for (const day of days) {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const daySales = sales.filter(s => s.createdAt >= dayStart && s.createdAt <= dayEnd);
        groupedData.push({
          date: dayStart.toISOString(),
          totalSales: daySales.length,
          totalRevenue: daySales.reduce((sum, s) => sum + s.total, 0),
        });
      }
    } else if (query.groupBy === 'week') {
      let currentWeek = startOfWeek(startDate);
      while (currentWeek <= endDate) {
        const weekEnd = endOfWeek(currentWeek);
        const weekSales = sales.filter(s => s.createdAt >= currentWeek && s.createdAt <= weekEnd);
        groupedData.push({
          date: currentWeek.toISOString(),
          totalSales: weekSales.length,
          totalRevenue: weekSales.reduce((sum, s) => sum + s.total, 0),
        });
        currentWeek = startOfWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000));
      }
    } else if (query.groupBy === 'month') {
      let currentMonth = startOfMonth(startDate);
      while (currentMonth <= endDate) {
        const monthEnd = endOfMonth(currentMonth);
        const monthSales = sales.filter(s => s.createdAt >= currentMonth && s.createdAt <= monthEnd);
        groupedData.push({
          date: currentMonth.toISOString(),
          totalSales: monthSales.length,
          totalRevenue: monthSales.reduce((sum, s) => sum + s.total, 0),
        });
        currentMonth = startOfMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
      }
    }

    return groupedData;
  }

  // INVENTORY REPORTS
  async getInventoryReport(organizationId: string, query: InventoryReportQueryDto) {
    const where: any = { organizationId };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.supplierId) where.supplierId = query.supplierId;

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
        supplier: true,
      },
    });

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const lowStockItems = items.filter(item => item.quantity <= item.reorderLevel);
    const lowStockCount = lowStockItems.length;

    // Calculate turnover rate (simplified - based on current quantity)
    // Since we don't have historical stock movement, we'll use a simplified approach
    const averageQuantity = totalItems > 0 ? items.reduce((sum, item) => sum + item.quantity, 0) / totalItems : 0;
    const soldItems = items.reduce((sum, item) => sum + Math.max(0, averageQuantity - item.quantity), 0);
    const turnoverRate = totalItems > 0 ? (soldItems / totalItems) * 100 : 0;

    // Group by category
    const itemsByCategory = items.reduce((acc, item) => {
      const categoryName = item.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = { count: 0, value: 0 };
      }
      acc[categoryName].count++;
      acc[categoryName].value += item.unitPrice * item.quantity;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    // Group by supplier
    const itemsBySupplier = items.reduce((acc, item) => {
      const supplierName = item.supplier?.name || 'Unknown';
      if (!acc[supplierName]) {
        acc[supplierName] = { count: 0, value: 0 };
      }
      acc[supplierName].count++;
      acc[supplierName].value += item.unitPrice * item.quantity;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    return {
      totalItems,
      totalValue,
      lowStockCount,
      turnoverRate,
      itemsByCategory: Object.entries(itemsByCategory).map(([name, data]) => ({
        categoryName: name,
        itemCount: data.count,
        totalValue: data.value,
      })),
      itemsBySupplier: Object.entries(itemsBySupplier).map(([name, data]) => ({
        supplierName: name,
        itemCount: data.count,
        totalValue: data.value,
      })),
      lowStockItems: lowStockItems.map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.quantity,
        reorderLevel: item.reorderLevel,
        unitPrice: item.unitPrice,
      })),
    };
  }

  // CUSTOMER REPORTS
  async getCustomerReport(organizationId: string, query: CustomerReportQueryDto) {
    const startDate = startOfDay(parseISO(query.startDate));
    const endDate = endOfDay(parseISO(query.endDate));

    // Get all customers
    const customers = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: 'CUSTOMER',
      },
      include: {
        customerAppointments: {
          where: {
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        customerSales: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    const totalCustomers = customers.length;
    
    // New customers (created within date range)
    const newCustomers = customers.filter(c => 
      c.createdAt >= startDate && c.createdAt <= endDate
    ).length;

    // Returning customers (had appointments before date range)
    const returningCustomers = customers.filter(c => 
      c.customerAppointments.length > 0 && 
      c.createdAt < startDate
    ).length;

    // Calculate total spend per customer
    const customersWithSpend = customers.map(customer => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      totalSpend: customer.customerSales.reduce((sum, sale) => sum + sale.total, 0),
      totalVisits: customer.customerAppointments.length,
      lastVisit: customer.customerAppointments.length > 0 
        ? Math.max(...customer.customerAppointments.map(a => a.startTime.getTime()))
        : null,
    }));

    // Sort by total spend
    const topCustomers = customersWithSpend
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);

    const averageCustomerValue = customersWithSpend.reduce((sum, c) => sum + c.totalSpend, 0) / totalCustomers || 0;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageCustomerValue,
      topCustomers: topCustomers.map(c => ({
        ...c,
        lastVisit: c.lastVisit ? new Date(c.lastVisit).toISOString() : null,
      })),
    };
  }

  // APPOINTMENT REPORTS
  async getAppointmentReport(organizationId: string, query: AppointmentReportQueryDto) {
    const startDate = startOfDay(parseISO(query.startDate));
    const endDate = endOfDay(parseISO(query.endDate));

    const where: any = {
      organizationId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.artistId) where.artistId = query.artistId;
    if (query.status) where.status = query.status;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        artist: true,
        service: true,
      },
    });

    const totalAppointments = appointments.length;
    const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;
    const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length;
    const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
    const noShowCount = appointments.filter(a => a.status === 'NO_SHOW').length;

    const cancellationRate = totalAppointments > 0 ? (cancelledCount / totalAppointments) * 100 : 0;

    // Group by status
    const statusBreakdown = [
      { status: 'CONFIRMED', count: confirmedCount },
      { status: 'CANCELLED', count: cancelledCount },
      { status: 'COMPLETED', count: completedCount },
      { status: 'NO_SHOW', count: noShowCount },
    ];

    // Artist utilization
    const artistUtilization = await this.prisma.appointment.groupBy({
      by: ['artistId'],
      where,
      _count: {
        id: true,
      },
    });

    const artistIds = artistUtilization.map(item => item.artistId);
    const artists = await this.prisma.user.findMany({
      where: { id: { in: artistIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const artistUtilizationWithNames = artistUtilization.map(item => ({
      artistId: item.artistId,
      artistName: artists.find(a => a.id === item.artistId)
        ? `${artists.find(a => a.id === item.artistId)!.firstName} ${artists.find(a => a.id === item.artistId)!.lastName}`
        : 'Unknown',
      totalAppointments: item._count.id,
    }));

    return {
      totalAppointments,
      confirmedCount,
      cancelledCount,
      completedCount,
      noShowCount,
      cancellationRate,
      statusBreakdown,
      artistUtilization: artistUtilizationWithNames,
    };
  }

  // STAFF PERFORMANCE REPORTS
  async getStaffPerformanceReport(organizationId: string, query: StaffReportQueryDto) {
    const startDate = startOfDay(parseISO(query.startDate));
    const endDate = endOfDay(parseISO(query.endDate));

    // Get staff members
    const staff = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: {
          in: ['ARTIST', 'RECEPTIONIST', 'CASHIER', 'MANAGER'],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Get sales data for staff members
    const salesData = await this.prisma.sale.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.staffId && { processedByStaffId: query.staffId }),
      },
      select: {
        processedByStaffId: true,
        total: true,
      },
    });

    // Get appointments data for artist staff
    const appointmentsData = await this.prisma.appointment.findMany({
      where: {
        organizationId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.staffId && { artistId: query.staffId }),
      },
      select: {
        artistId: true,
        status: true,
      },
    });

    // Get attendance data for all staff
    const attendanceData = await this.prisma.attendance.findMany({
      where: {
        organizationId,
        clockInTime: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.staffId && { employeeId: query.staffId }),
      },
      select: {
        employeeId: true,
        totalHours: true,
      },
    });

    const staffPerformance = staff.map(member => {
      const staffSales = salesData.filter(sale => sale.processedByStaffId === member.id);
      const staffAppointments = appointmentsData.filter(apt => apt.artistId === member.id);
      const staffAttendance = attendanceData.filter(att => att.employeeId === member.id);

      return {
        staffId: member.id,
        staffName: `${member.firstName} ${member.lastName}`,
        role: member.role,
        totalSales: staffSales.reduce((sum, sale) => sum + sale.total, 0),
        totalCommissions: 0, // No commissions relation exists - set to 0 for now
        appointmentsCompleted: staffAppointments.filter(a => a.status === 'COMPLETED').length,
        totalAppointments: staffAppointments.length,
        attendanceDays: staffAttendance.length,
        totalHours: staffAttendance.reduce((sum, att) => sum + (att.totalHours || 0), 0),
      };
    });

    const totalStaff = staff.length;
    const topPerformer = staffPerformance.reduce((top, current) => 
      current.totalSales > top.totalSales ? current : top, 
      staffPerformance[0] || { totalSales: 0, staffName: 'N/A' }
    );

    const totalCommissions = staffPerformance.reduce((sum, staff) => sum + staff.totalCommissions, 0);
    const averageProductivity = staffPerformance.length > 0 
      ? staffPerformance.reduce((sum, staff) => sum + staff.appointmentsCompleted, 0) / staffPerformance.length 
      : 0;

    return {
      totalStaff,
      topPerformer: topPerformer.staffName,
      totalCommissions,
      averageProductivity,
      staffPerformance,
    };
  }

  // PAYROLL REPORTS
  async getPayrollReport(organizationId: string, query: PayrollReportQueryDto) {
    const startDate = startOfDay(parseISO(query.startDate));
    const endDate = endOfDay(parseISO(query.endDate));

    const where: any = {
      organizationId,
      startDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.staffId) {
      // Filter by staff through payslips
      where.payslips = {
        some: {
          employeeId: query.staffId
        }
      };
    }

    const payrollRecords = await this.prisma.payroll.findMany({
      where,
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Calculate totals from payslips
    const allPayslips = payrollRecords.flatMap(payroll => payroll.payslips);
    const totalGrossPay = allPayslips.reduce((sum, payslip) => 
      sum + payslip.baseSalary + payslip.totalCommission + payslip.bonuses, 0
    );
    const totalDeductions = allPayslips.reduce((sum, payslip) => sum + payslip.deductions, 0);
    const totalNetPay = allPayslips.reduce((sum, payslip) => sum + payslip.netPay, 0);

    const averageSalary = allPayslips.length > 0 ? totalGrossPay / allPayslips.length : 0;

    // Group payroll by staff
    const payrollByStaff = allPayslips.reduce((acc, payslip) => {
      const staffId = payslip.employeeId;
      if (!acc[staffId]) {
        acc[staffId] = {
          staffId,
          staffName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          payrollCount: 0,
        };
      }
      acc[staffId].totalGrossPay += payslip.baseSalary + payslip.totalCommission + payslip.bonuses;
      acc[staffId].totalDeductions += payslip.deductions;
      acc[staffId].totalNetPay += payslip.netPay;
      acc[staffId].payrollCount += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      averageSalary,
      payrollCount: payrollRecords.length,
      payrollByStaff: Object.values(payrollByStaff),
    };
  }

  // EXPENSE REPORTS
  async getExpenseReport(organizationId: string, query: ExpenseReportQueryDto) {
    const startDate = startOfDay(parseISO(query.startDate));
    const endDate = endOfDay(parseISO(query.endDate));

    const where: any = {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.vendor) where.vendor = { contains: query.vendor, mode: 'insensitive' };

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        category: true,
      },
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

    // Group by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const categoryName = expense.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = { count: 0, totalAmount: 0 };
      }
      acc[categoryName].count++;
      acc[categoryName].totalAmount += expense.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    // Group by vendor
    const expensesByVendor = expenses.reduce((acc, expense) => {
      const vendorName = expense.vendor || 'Unknown';
      if (!acc[vendorName]) {
        acc[vendorName] = { count: 0, totalAmount: 0 };
      }
      acc[vendorName].count++;
      acc[vendorName].totalAmount += expense.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    const topExpenseCategory = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)[0]?.[0] || 'N/A';

    return {
      totalExpenses,
      averageExpense,
      expenseCount: expenses.length,
      topExpenseCategory,
      expensesByCategory: Object.entries(expensesByCategory).map(([name, data]) => ({
        categoryName: name,
        count: data.count,
        totalAmount: data.totalAmount,
      })),
      expensesByVendor: Object.entries(expensesByVendor).map(([name, data]) => ({
        vendorName: name,
        count: data.count,
        totalAmount: data.totalAmount,
      })),
    };
  }
}

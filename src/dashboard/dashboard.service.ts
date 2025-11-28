import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { subDays, subMonths, subYears, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fetches Key Performance Indicators (KPIs) for a given period.
   */
  async getKpis(organizationId: string, branchId?: string) {
    const today = new Date();
    const last30Days = subDays(today, 30);

    const whereClause = {
      organizationId,
      branchId: branchId || undefined, // Prisma handles undefined correctly (no filter)
      createdAt: { gte: last30Days },
    };

    const [salesData, newCustomers, upcomingAppointments] = await Promise.all([
      // 1. Aggregate Sales Data
      this.prisma.sale.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: whereClause,
      }),
      // 2. Count New Customers
      this.prisma.user.count({
        where: {
          organizationId,
          role: 'CUSTOMER',
          createdAt: { gte: last30Days },
        },
      }),
      // 3. Count Upcoming Appointments
      this.prisma.appointment.count({
        where: {
          organizationId,
          branchId: branchId,
          status: 'CONFIRMED',
          startTime: { gte: today },
        },
      }),
    ]);

    return {
      totalRevenue: salesData._sum.total || 0,
      totalSales: salesData._count.id || 0,
      newCustomers,
      upcomingAppointments,
      period: 'Last 30 Days',
    };
  }

  /**
   * Aggregates sales data grouped by day for charts.
   */
  async getSalesOverTime(organizationId: string, branchId?: string) {
    const last30Days = subDays(new Date(), 30);

    const result = await this.prisma.sale.groupBy({
      by: ['createdAt'],
      where: {
        organizationId,
        branchId,
        createdAt: { gte: last30Days },
      },
      _sum: {
        total: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // We need to process the result to be easily consumable by a chart library
    // e.g., group by date string 'YYYY-MM-DD'
    const dailySales = {};
    result.forEach(r => {
        const date = r.createdAt.toISOString().split('T')[0]; // '2025-11-18'
        if (!dailySales[date]) {
            dailySales[date] = 0;
        }
        dailySales[date] += r._sum.total;
    });

    return Object.entries(dailySales).map(([date, total]) => ({ date, total }));
  }

  /**
   * Finds the top-performing artists by revenue generated.
   */
  async getTopPerformingArtists(organizationId: string, branchId?: string) {
    return this.prisma.saleItem.groupBy({
      by: ['artistId'],
      where: {
        sale: {
          organizationId,
          branchId,
        },
        artistId: { not: null },
      },
      _sum: {
        priceAtTimeOfSale: true,
      },
      orderBy: {
        _sum: {
          priceAtTimeOfSale: 'desc',
        },
      },
      take: 5, // Top 5 artists
    });
  }

  /**
   * Finds the most popular services by quantity sold.
   */
  async getTopServices(organizationId: string, branchId?: string) {
    const serviceSales = await this.prisma.saleItem.groupBy({
        by: ['serviceId'],
        where: {
            sale: { organizationId, branchId },
            serviceId: { not: null },
        },
        _sum: {
            quantity: true,
        },
        orderBy: {
            _sum: {
                quantity: 'desc',
            },
        },
        take: 5,
    });
    
    // Now fetch the service names for the IDs
    const serviceIds = serviceSales.map(s => s.serviceId).filter((id): id is string => id !== null);
    const services = await this.prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true }
    });
    
    return serviceSales.map(s => ({
        ...s,
        serviceName: services.find(svc => svc.id === s.serviceId)?.name
    }));
  }

  /**
   * Calculate total expenses for the last 30 days.
   */
  async getTotalExpenses(organizationId: string, branchId?: string) {
    const last30Days = subDays(new Date(), 30);

    const result = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        organizationId,
        branchId: branchId || undefined, // Prisma handles undefined correctly (no filter)
        createdAt: { gte: last30Days },
      },
    });

    return { total: result._sum.amount || 0 };
  }

  /**
   * Group expenses by category for the last 30 days.
   */
  async getExpensesByCategory(organizationId: string, branchId?: string, startDate?: Date, endDate?: Date) {
    const defaultLast30Days = subDays(new Date(), 30);
    const start = startDate || defaultLast30Days;
    const end = endDate || new Date();

    const expensesByCategory = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        organizationId,
        branchId: branchId || undefined,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _sum: { amount: true },
      orderBy: {
        _sum: { amount: 'desc' },
      },
    });

    // Fetch category names for the IDs
    const categoryIds = expensesByCategory
      .map(e => e.categoryId)
      .filter((id): id is string => id !== null);
      
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    return expensesByCategory.map(e => ({
      categoryId: e.categoryId,
      categoryName: categories.find(cat => cat.id === e.categoryId)?.name || 'Unknown',
      amount: e._sum.amount || 0, // Changed from 'total' to 'amount'
    }));
  }

  /**
   * Calculate profit/loss for the last 30 days.
   */
  async getProfitLoss(organizationId: string, branchId?: string) {
    const last30Days = subDays(new Date(), 30);

    // Get total revenue from sales (reuse logic from getKpis)
    const salesData = await this.prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        organizationId,
        branchId: branchId || undefined, // Prisma handles undefined correctly (no filter)
        createdAt: { gte: last30Days },
      },
    });

    // Get total expenses
    const totalExpensesResult = await this.getTotalExpenses(organizationId, branchId);
    const totalExpenses = totalExpensesResult.total;

    // Get total payroll costs - FIXED: Use createdAt and access organizationId through payroll relation
    const payrollData = await this.prisma.payslip.aggregate({
      _sum: { netPay: true },
      where: {
        payroll: {
          organizationId,
          branchId: branchId || undefined, // Prisma handles undefined correctly (no filter)
        },
        createdAt: { gte: last30Days },
      },
    });

    const totalRevenue = salesData._sum.total || 0;
    const totalPayroll = payrollData._sum?.netPay || 0;
    const netProfit = totalRevenue - totalExpenses - totalPayroll;

    return {
      totalRevenue,
      totalExpenses,
      totalPayroll,
      netProfit,
      period: 'Last 30 Days',
    };
  }

  /**
   * Get comprehensive financial report for a date range.
   */
  async getFinancialReport(organizationId: string, startDate: Date, endDate: Date, branchId?: string) {
    // 1. Calculate comparison periods
    const daysDifference = differenceInDays(endDate, startDate) + 1;
    const previousPeriodStart = subDays(startDate, daysDifference);
    const previousPeriodEnd = subDays(startDate, 1);
    const lastYearStart = subYears(startDate, 1);
    const lastYearEnd = subYears(endDate, 1);

    // 2. Fetch data in parallel
    const [
      revenueData,
      expenseData,
      payrollData,
      revenueOverTime,
      expensesOverTime,
      previousPeriodData,
      lastYearData,
      expensesByCategory,
    ] = await Promise.all([
      // Current period revenue
      this.prisma.sale.aggregate({
        _sum: { total: true },
        where: {
          organizationId,
          branchId: branchId || undefined,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Current period expenses
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          organizationId,
          branchId: branchId || undefined,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Current period payroll - FIXED: Use createdAt and access organizationId through payroll relation
      this.prisma.payslip.aggregate({
        _sum: { netPay: true },
        where: {
          payroll: {
            organizationId,
            branchId: branchId || undefined,
          },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Revenue over time (grouped by day)
      this.getRevenueOverTime(organizationId, startDate, endDate, branchId),
      // Expenses over time (grouped by day)
      this.getExpensesOverTime(organizationId, startDate, endDate, branchId),
      // Previous period data for MoM comparison
      this.getPeriodSummary(organizationId, previousPeriodStart, previousPeriodEnd, branchId),
      // Last year data for YoY comparison
      this.getPeriodSummary(organizationId, lastYearStart, lastYearEnd, branchId),
      // Expenses by category
      this.getExpensesByCategory(organizationId, branchId, startDate, endDate),
    ]);

    // 3. Calculate metrics
    const totalRevenue = revenueData._sum.total || 0;
    const totalExpenses = expenseData._sum.amount || 0;
    const totalPayroll = payrollData._sum?.netPay || 0;
    const netProfit = totalRevenue - totalExpenses - totalPayroll;

    // 4. Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    // 5. Prepare response
    return {
      summary: {
        totalRevenue,
        totalExpenses,
        totalPayroll,
        netProfit,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
      revenueOverTime,
      expensesOverTime,
      expensesByCategory,
      comparisons: {
        monthOverMonth: {
          revenue: calculateChange(totalRevenue, previousPeriodData.revenue),
          expenses: calculateChange(totalExpenses, previousPeriodData.expenses),
          payroll: calculateChange(totalPayroll, previousPeriodData.payroll),
          profit: calculateChange(netProfit, previousPeriodData.profit),
        },
        yearOverYear: {
          revenue: calculateChange(totalRevenue, lastYearData.revenue),
          expenses: calculateChange(totalExpenses, lastYearData.expenses),
          payroll: calculateChange(totalPayroll, lastYearData.payroll),
          profit: calculateChange(netProfit, lastYearData.profit),
        },
      },
    };
  }

  /**
   * Helper method to get revenue over time grouped by day.
   */
  private async getRevenueOverTime(organizationId: string, startDate: Date, endDate: Date, branchId?: string) {
    const result = await this.prisma.sale.groupBy({
      by: ['createdAt'],
      where: {
        organizationId,
        branchId: branchId || undefined,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        total: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date string
    const dailyRevenue = {};
    result.forEach(r => {
      const date = r.createdAt.toISOString().split('T')[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += r._sum.total || 0;
    });

    return Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount }));
  }

  /**
   * Helper method to get expenses over time grouped by day.
   */
  private async getExpensesOverTime(organizationId: string, startDate: Date, endDate: Date, branchId?: string) {
    const result = await this.prisma.expense.groupBy({
      by: ['createdAt'],
      where: {
        organizationId,
        branchId: branchId || undefined,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date string
    const dailyExpenses = {};
    result.forEach(r => {
      const date = r.createdAt.toISOString().split('T')[0];
      if (!dailyExpenses[date]) {
        dailyExpenses[date] = 0;
      }
      dailyExpenses[date] += r._sum.amount || 0;
    });

    return Object.entries(dailyExpenses).map(([date, amount]) => ({ date, amount }));
  }

  /**
   * Helper method to get summary for a period.
   */
  private async getPeriodSummary(organizationId: string, startDate: Date, endDate: Date, branchId?: string) {
    const [revenueData, expenseData, payrollData] = await Promise.all([
      this.prisma.sale.aggregate({
        _sum: { total: true },
        where: {
          organizationId,
          branchId: branchId || undefined,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          organizationId,
          branchId: branchId || undefined,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // FIXED: Use createdAt and access organizationId through payroll relation
      this.prisma.payslip.aggregate({
        _sum: { netPay: true },
        where: {
          payroll: {
            organizationId,
            branchId: branchId || undefined,
          },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const revenue = revenueData._sum.total || 0;
    const expenses = expenseData._sum.amount || 0;
    const payroll = payrollData._sum?.netPay || 0;
    const profit = revenue - expenses - payroll;

    return { revenue, expenses, payroll, profit };
  }
}
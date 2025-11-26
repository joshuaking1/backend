import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { subDays } from 'date-fns';

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
      branchId: branchId, // Prisma handles undefined correctly (no filter)
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
}
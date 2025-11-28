import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER) // Analytics are for management
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(
    @GetUser('organizationId') orgId: string,
    @Query('branchId') branchId?: string, // Optional branch filter
  ) {
    return this.dashboardService.getKpis(orgId, branchId);
  }

  @Get('sales-over-time')
  getSalesOverTime(
    @GetUser('organizationId') orgId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getSalesOverTime(orgId, branchId);
  }
  
  @Get('top-performing-artists')
  getTopArtists(
    @GetUser('organizationId') orgId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getTopPerformingArtists(orgId, branchId);
  }

  @Get('top-services')
  getTopServices(
    @GetUser('organizationId') orgId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getTopServices(orgId, branchId);
  }

  @Get('total-expenses')
  getTotalExpenses(
    @GetUser('organizationId') orgId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getTotalExpenses(orgId, branchId);
  }

  @Get('expenses-by-category')
  getExpensesByCategory(
    @GetUser('organizationId') orgId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getExpensesByCategory(orgId, branchId);
  }

  @Get('profit-loss')
  getProfitLoss(
    @GetUser('organizationId') orgId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getProfitLoss(orgId, branchId);
  }

  @Get('financial-report')
  getFinancialReport(
    @GetUser('organizationId') orgId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('branchId') branchId?: string,
  ) {
    // Validate date strings
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Please use ISO date strings.');
    }
    
    if (start > end) {
      throw new BadRequestException('Start date must be before end date.');
    }
    
    return this.dashboardService.getFinancialReport(orgId, start, end, branchId);
  }
}
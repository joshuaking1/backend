import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}
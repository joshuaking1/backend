import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { 
  SalesReportQueryDto, 
  InventoryReportQueryDto,
  CustomerReportQueryDto,
  AppointmentReportQueryDto,
  StaffReportQueryDto,
  PayrollReportQueryDto,
  ExpenseReportQueryDto
} from './dto/index';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  async getSalesReport(@GetUser() user: any, @Query() query: SalesReportQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getSalesReport(user.organizationId, query);
  }

  @Get('sales/time-series')
  async getSalesTimeSeries(@GetUser() user: any, @Query() query: SalesReportQueryDto & { groupBy: 'day' | 'week' | 'month' }) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getSalesTimeSeries(user.organizationId, query);
  }

  @Get('inventory')
  async getInventoryReport(@GetUser() user: any, @Query() query: InventoryReportQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getInventoryReport(user.organizationId, query);
  }

  @Get('customers')
  async getCustomerReport(@GetUser() user: any, @Query() query: CustomerReportQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getCustomerReport(user.organizationId, query);
  }

  @Get('appointments')
  async getAppointmentReport(@GetUser() user: any, @Query() query: AppointmentReportQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getAppointmentReport(user.organizationId, query);
  }

  @Get('staff-performance')
  async getStaffPerformanceReport(@GetUser() user: any, @Query() query: StaffReportQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getStaffPerformanceReport(user.organizationId, query);
  }

  @Get('payroll')
  async getPayrollReport(@GetUser() user: any, @Query() query: PayrollReportQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getPayrollReport(user.organizationId, query);
  }

  @Get('expenses')
  async getExpenseReport(@GetUser() user: any, @Query() query: ExpenseReportQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);
    return this.reportsService.getExpenseReport(user.organizationId, query);
  }

  private validateDateRange(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }

    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }
  }
}

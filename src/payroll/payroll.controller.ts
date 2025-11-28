import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('generate')
  generatePayroll(
    @GetUser('organizationId') organizationId: string,
    @Body() createPayrollDto: CreatePayrollDto,
  ) {
    return this.payrollService.generatePayroll(createPayrollDto, organizationId);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.payrollService.findAllForOrg(organizationId);
  }

  @Get('payslips/:id')
  findPayslipById(@Param('id') id: string, @GetUser('organizationId') organizationId: string) {
    return this.payrollService.findPayslipById(id, organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payrollService.findOneWithPayslips(id);
  }
}

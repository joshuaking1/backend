import { IsString, IsOptional, IsISO8601, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class ReportDateRangeDto {
  @IsString()
  @IsISO8601()
  startDate: string;

  @IsString()
  @IsISO8601()
  endDate: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class SalesReportQueryDto extends ReportDateRangeDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  serviceId?: string;
}

export class InventoryReportQueryDto extends ReportDateRangeDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class CustomerReportQueryDto extends ReportDateRangeDto {
  @IsOptional()
  @IsString()
  serviceId?: string;
}

export class AppointmentReportQueryDto extends ReportDateRangeDto {
  @IsOptional()
  @IsString()
  artistId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class StaffReportQueryDto extends ReportDateRangeDto {
  @IsOptional()
  @IsString()
  staffId?: string;
}

export class PayrollReportQueryDto extends ReportDateRangeDto {
  @IsOptional()
  @IsString()
  staffId?: string;
}

export class ExpenseReportQueryDto extends ReportDateRangeDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  vendor?: string;
}

// src/payroll/dto/create-payroll.dto.ts
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePayrollDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
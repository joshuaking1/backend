// src/staff/dto/update-staff.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { InviteStaffDto } from './invite-staff.dto';
import { IsNumber, IsOptional, IsString, Max, Min, IsEnum } from 'class-validator';
import { SalaryType } from '@prisma/client';

export class UpdateStaffDto extends PartialType(InviteStaffDto) {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  instagramHandle?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  commissionRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  baseSalary?: number;

  @IsEnum(SalaryType)
  @IsOptional()
  salaryType?: SalaryType;
  
  @IsString()
  @IsOptional()
  commissionRuleId?: string;
}
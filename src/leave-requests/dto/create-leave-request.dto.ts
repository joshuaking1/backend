import { IsString, IsEnum, IsOptional } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class CreateLeaveRequestDto {
  @IsString()
  startDate: string; // ISO date

  @IsString()
  endDate: string;

  @IsEnum(LeaveType)
  type: LeaveType;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

import { IsOptional, IsString, IsEnum } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class FindLeaveRequestDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

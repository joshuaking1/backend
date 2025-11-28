import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsString()
  clockOutTime?: string; // ISO date string

  @IsOptional()
  @IsNumber()
  totalHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}

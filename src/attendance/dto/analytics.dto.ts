import { IsString, IsOptional } from 'class-validator';

export class AnalyticsDto {
  @IsString()
  startDate: string; // ISO date string

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

import { IsOptional, IsInt, IsNumber, IsBoolean } from 'class-validator';

export class UpdateAttendanceSettingsDto {
  @IsOptional()
  @IsInt()
  workStartTime?: number; // minutes from midnight

  @IsOptional()
  @IsInt()
  workEndTime?: number;

  @IsOptional()
  @IsInt()
  gracePeriodMinutes?: number;

  @IsOptional()
  @IsNumber()
  overtimeThreshold?: number; // hours

  @IsOptional()
  @IsBoolean()
  requireLocation?: boolean;

  @IsOptional()
  @IsInt()
  autoClockOutHours?: number;
}

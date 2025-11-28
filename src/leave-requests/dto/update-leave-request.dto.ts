import { PartialType } from '@nestjs/mapped-types';
import { CreateLeaveRequestDto } from './create-leave-request.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { LeaveType } from '@prisma/client';

export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(LeaveType)
  type?: LeaveType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

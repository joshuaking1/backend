// src/appointments/dto/create-appointment.dto.ts
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  artistId: string;

  @IsString()
  @IsNotEmpty()
  customerUserId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString() // Ensures the string is a valid ISO 8601 date
  startTime: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
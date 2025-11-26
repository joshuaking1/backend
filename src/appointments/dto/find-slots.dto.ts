// src/appointments/dto/find-slots.dto.ts
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FindSlotsDto {
  @IsDateString()
  startDate: string; // The start of the date range to search

  @IsDateString()
  endDate: string; // The end of the date range to search

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsOptional() // Artist is optional; if not provided, search all available artists
  artistId?: string;
}
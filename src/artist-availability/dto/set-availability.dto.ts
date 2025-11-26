// src/artist-availability/dto/set-availability.dto.ts
    import { Type } from 'class-transformer';
    import {
      IsArray,
      IsInt,
      IsNotEmpty,
      IsString,
      Max,
      Min,
      ValidateNested,
    } from 'class-validator';

    class AvailabilitySlotDto {
      @IsInt()
      @Min(1)
      @Max(7)
      dayOfWeek: number; // 1 = Monday, 7 = Sunday

      @IsInt()
      @Min(0)
      startTime: number; // Minutes from midnight

      @IsInt()
      @Min(0)
      endTime: number; // Minutes from midnight
    }

    export class SetAvailabilityDto {
      @IsString()
      @IsNotEmpty()
      artistId: string;

      @IsArray()
      @ValidateNested({ each: true })
      @Type(() => AvailabilitySlotDto)
      schedule: AvailabilitySlotDto[];
    }
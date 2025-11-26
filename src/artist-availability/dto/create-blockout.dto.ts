 // src/artist-availability/dto/create-blockout.dto.ts
    import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

    export class CreateBlockoutDto {
      @IsString()
      @IsNotEmpty()
      artistId: string;

      @IsDateString()
      startTime: string;

      @IsDateString()
      endTime: string;
      
      @IsString()
      @IsOptional()
      reason?: string;
    }
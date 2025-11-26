import { Module } from '@nestjs/common';
import { ArtistAvailabilityService } from './artist-availability.service';
import { ArtistAvailabilityController } from './artist-availability.controller';

@Module({
  controllers: [ArtistAvailabilityController],
  providers: [ArtistAvailabilityService],
})
export class ArtistAvailabilityModule {}

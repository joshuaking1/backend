import { PartialType } from '@nestjs/mapped-types';
import { CreateArtistAvailabilityDto } from './create-artist-availability.dto';

export class UpdateArtistAvailabilityDto extends PartialType(
  CreateArtistAvailabilityDto,
) {}

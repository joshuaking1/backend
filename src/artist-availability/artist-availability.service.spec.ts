import { Test, TestingModule } from '@nestjs/testing';
import { ArtistAvailabilityService } from './artist-availability.service';

describe('ArtistAvailabilityService', () => {
  let service: ArtistAvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArtistAvailabilityService],
    }).compile();

    service = module.get<ArtistAvailabilityService>(ArtistAvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

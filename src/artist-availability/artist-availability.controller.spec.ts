import { Test, TestingModule } from '@nestjs/testing';
import { ArtistAvailabilityController } from './artist-availability.controller';
import { ArtistAvailabilityService } from './artist-availability.service';

describe('ArtistAvailabilityController', () => {
  let controller: ArtistAvailabilityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistAvailabilityController],
      providers: [ArtistAvailabilityService],
    }).compile();

    controller = module.get<ArtistAvailabilityController>(ArtistAvailabilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

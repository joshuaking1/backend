import { Test, TestingModule } from '@nestjs/testing';
import { InventoryCategoriesService } from './inventory-categories.service';

describe('InventoryCategoriesService', () => {
  let service: InventoryCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryCategoriesService],
    }).compile();

    service = module.get<InventoryCategoriesService>(InventoryCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

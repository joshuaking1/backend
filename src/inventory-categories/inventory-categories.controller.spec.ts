import { Test, TestingModule } from '@nestjs/testing';
import { InventoryCategoriesController } from './inventory-categories.controller';
import { InventoryCategoriesService } from './inventory-categories.service';

describe('InventoryCategoriesController', () => {
  let controller: InventoryCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryCategoriesController],
      providers: [InventoryCategoriesService],
    }).compile();

    controller = module.get<InventoryCategoriesController>(InventoryCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

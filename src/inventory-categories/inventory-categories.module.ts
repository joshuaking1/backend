import { Module } from '@nestjs/common';
import { InventoryCategoriesService } from './inventory-categories.service';
import { InventoryCategoriesController } from './inventory-categories.controller';

@Module({
  controllers: [InventoryCategoriesController],
  providers: [InventoryCategoriesService],
})
export class InventoryCategoriesModule {}

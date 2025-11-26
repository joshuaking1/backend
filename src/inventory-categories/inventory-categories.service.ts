import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';

@Injectable()
export class InventoryCategoriesService {
  constructor(private prisma: PrismaService) {}

  create(
    createInventoryCategoryDto: CreateInventoryCategoryDto,
    organizationId: string,
  ) {
    return this.prisma.inventoryCategory.create({
      data: {
        ...createInventoryCategoryDto,
        organizationId,
      },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.inventoryCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const category = await this.prisma.inventoryCategory.findFirst({
      where: { id, organizationId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }
    return category;
  }

  async update(
    id: string,
    updateInventoryCategoryDto: UpdateInventoryCategoryDto,
    organizationId: string,
  ) {
    await this.findOne(id, organizationId);
    return this.prisma.inventoryCategory.update({
      where: { id },
      data: updateInventoryCategoryDto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.inventoryCategory.delete({ where: { id } });
    return {
      message: 'Successfully deleted category.',
      statusCode: 200,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@Injectable()
export class InventoryItemsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new inventory item for an organization.
   * @param createDto The data for the new item.
   * @param organizationId The organization it belongs to.
   */
  create(createDto: CreateInventoryItemDto, organizationId: string) {
    return this.prisma.inventoryItem.create({
      data: {
        ...createDto,
        organizationId,
      },
    });
  }

  /**
   * Finds all inventory items for an organization, including category and supplier.
   * @param organizationId The organization's ID.
   */
  findAll(organizationId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { organizationId },
      include: {
        category: true,
        supplier: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Finds all inventory items for an organization that are at or below their reorder level.
   * @param organizationId The organization's ID.
   */
  async findLowStock(organizationId: string) {
    const lowStockItems: { id: string }[] = await this.prisma.$queryRaw`
      SELECT "id" FROM "InventoryItem"
      WHERE "organizationId" = ${organizationId} AND "quantity" <= "reorderLevel"
    `;

    const lowStockItemIds = lowStockItems.map(item => item.id);

    if (lowStockItemIds.length === 0) {
      return [];
    }

    return this.prisma.inventoryItem.findMany({
      where: {
        id: {
          in: lowStockItemIds,
        },
      },
      include: {
        category: true,
        supplier: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }


  /**
   * Finds a single inventory item by its ID.
   * @param id The item's ID.
   */
  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: { category: true, supplier: true },
    });
    if (!item) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found.`);
    }
    return item;
  }

  /**
   * Updates an inventory item.
   * @param id The ID of the item to update.
   * @param updateDto The new data for the item.
   */
  async update(id: string, updateDto: UpdateInventoryItemDto) {
    await this.findOne(id); // Ensure the item exists before attempting to update
    return this.prisma.inventoryItem.update({
      where: { id },
      data: updateDto,
    });
  }

  /**
   * Deletes an inventory item.
   * @param id The ID of the item to delete.
   */
  async remove(id: string) {
    await this.findOne(id); // Ensure the item exists
    await this.prisma.inventoryItem.delete({ where: { id } });
    return {
      message: 'Successfully deleted inventory item.',
      statusCode: 200,
    };
  }
}
import { Prisma } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new sale in a single, atomic database transaction.
   * This process includes inventory deduction, financial calculations,
   * and updating appointment status.
   */
  async create(dto: CreateSaleDto, organizationId: string, staffId: string) {
    const { items, payments, taxRate = 0, discountAmount = 0, appointmentId } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch all product/service data and calculate subtotal
      let subtotal = 0;
      const saleItemData: Prisma.SaleItemCreateWithoutSaleInput[] = [];

      for (const item of items) {
        if (item.type === 'SERVICE') {
          const service = await tx.service.findUnique({ where: { id: item.itemId } });
          if (!service) throw new NotFoundException(`Service with ID ${item.itemId} not found.`);
          const price = service.basePrice * item.quantity;
          subtotal += price;
          saleItemData.push({
            service: { connect: { id: item.itemId } },
            quantity: item.quantity,
            priceAtTimeOfSale: price,
          });
        } else if (item.type === 'INVENTORY') {
          const inventoryItem = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
          if (!inventoryItem) throw new NotFoundException(`Inventory item with ID ${item.itemId} not found.`);
          if (inventoryItem.quantity < item.quantity) {
            throw new BadRequestException(`Not enough stock for ${inventoryItem.name}.`);
          }

          // 2. Decrement inventory stock
          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { quantity: { decrement: item.quantity } },
          });

          const price = inventoryItem.unitPrice * item.quantity;
          subtotal += price;
          saleItemData.push({
            inventoryItem: { connect: { id: item.itemId } },
            quantity: item.quantity,
            priceAtTimeOfSale: price,
          });
        }
      }

      // 3. Financial Calculations
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount - discountAmount;
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      // Verify payment matches total
      if (Math.abs(total - totalPaid) > 0.01) { // Use tolerance for float comparison
        throw new BadRequestException(`Total payment (${totalPaid}) does not match the sale total (${total}).`);
      }

      // 4. Create the Sale record
      const newSale = await tx.sale.create({
        data: {
          organizationId,
          customerUserId: dto.customerUserId,
          processedByStaffId: staffId,
          appointmentId: appointmentId,
          subtotal,
          taxAmount,
          discountAmount,
          total,
          notes: dto.notes,
          // Nested writes to create related items and payments
          items: { create: saleItemData },
          payments: { create: payments },
        },
      });

      // 5. Award loyalty points to the customer
      // We'll award 1 point for every dollar/GHS spent, rounded down.
      // const pointsToAward = Math.floor(total);
      // await tx.customerProfile.update({
      //   where: { userId: dto.customerUserId },
      //   data: { loyaltyPoints: { increment: pointsToAward } },
      // });

      // 6. Update appointment status if linked
      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'COMPLETED' },
        });
      }

      // 7. Return the full receipt
      return tx.sale.findUnique({
        where: { id: newSale.id },
        include: { items: true, payments: true, customer: true, processedBy: true },
      });
    });
  }

  // Find methods for reporting
  async findAll(organizationId: string, filters: { startDate?: string; endDate?: string }) {
    const where: any = { organizationId };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        processedBy: { select: { firstName: true, lastName: true } },
        items: { include: { service: true, inventoryItem: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        processedBy: { select: { firstName: true, lastName: true } },
        items: { include: { service: true, inventoryItem: true } },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found.');
    return sale;
  }
}
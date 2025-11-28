import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExpenseCategoryDto, organizationId: string) {
    return this.prisma.expenseCategory.create({
      data: {
        ...dto,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.expenseCategory.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!category) {
      throw new NotFoundException(`Expense category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, dto: UpdateExpenseCategoryDto, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.expenseCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.expenseCategory.delete({
      where: { id },
    });

    return { message: 'Expense category deleted successfully' };
  }
}

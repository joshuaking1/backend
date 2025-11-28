import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto, FilterExpensesDto, UpdateExpenseDto } from './dto';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto, organizationId: string, recordedById: string) {
    // Validate category
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id: createExpenseDto.categoryId,
        organizationId,
      },
    });

    if (!category) {
      throw new BadRequestException('Invalid expense category');
    }

    // Validate branch if provided
    if (createExpenseDto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: createExpenseDto.branchId,
          organizationId,
        },
      });

      if (!branch) {
        throw new BadRequestException('Invalid branch');
      }
    }

    const expenseData = {
      ...createExpenseDto,
      date: new Date(createExpenseDto.date),
      organizationId,
      recordedById,
      paymentMethod: createExpenseDto.paymentMethod || PaymentMethod.CASH, // Default to CASH if not provided
    };

    return this.prisma.expense.create({
      data: expenseData,
      include: {
        category: true,
        branch: true,
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(organizationId: string, filters: FilterExpensesDto) {
    const where: any = {
      organizationId,
    };

    if (filters.startDate) {
      where.date = {
        ...where.date,
        gte: new Date(filters.startDate),
      };
    }

    if (filters.endDate) {
      where.date = {
        ...where.date,
        lte: new Date(filters.endDate),
      };
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.vendor) {
      where.vendor = {
        contains: filters.vendor,
        mode: 'insensitive',
      };
    }

    // Default pagination values
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await this.prisma.expense.count({ where });

    // Get paginated results
    const data = await this.prisma.expense.findMany({
      where,
      include: {
        category: true,
        branch: true,
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, organizationId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        category: true,
        branch: true,
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, organizationId: string) {
    await this.findOne(id, organizationId);

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findFirst({
        where: {
          id: dto.categoryId,
          organizationId,
        },
      });

      if (!category) {
        throw new BadRequestException('Invalid expense category');
      }
    }

    // Validate branch if provided
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          organizationId,
        },
      });

      if (!branch) {
        throw new BadRequestException('Invalid branch');
      }
    }

    const updateData: any = { ...dto };
    if (dto.date) {
      updateData.date = new Date(dto.date);
    }

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        branch: true,
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.expense.delete({
      where: { id },
    });

    return { message: 'Expense deleted successfully' };
  }

  async getTotalExpenses(organizationId: string, filters: FilterExpensesDto) {
    const where: any = {
      organizationId,
    };

    if (filters.startDate) {
      where.date = {
        ...where.date,
        gte: new Date(filters.startDate),
      };
    }

    if (filters.endDate) {
      where.date = {
        ...where.date,
        lte: new Date(filters.endDate),
      };
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    const result = await this.prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return {
      total: result._sum.amount || 0,
    };
  }

  async getExpensesByCategory(organizationId: string, filters: FilterExpensesDto) {
    const where: any = {
      organizationId,
    };

    if (filters.startDate) {
      where.date = {
        ...where.date,
        gte: new Date(filters.startDate),
      };
    }

    if (filters.endDate) {
      where.date = {
        ...where.date,
        lte: new Date(filters.endDate),
      };
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    const grouped = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where,
      _sum: {
        amount: true,
      },
    });

    // Fetch category names
    const categories = await this.prisma.expenseCategory.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map(categories.map((cat: { id: string; name: string }) => [cat.id, cat.name]));

    return grouped.map((item: { categoryId: string; _sum: { amount: number | null } }) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap.get(item.categoryId) || 'Unknown',
      total: item._sum.amount || 0,
    }));
  }

  async getExpensesByPeriod(organizationId: string, filters: FilterExpensesDto) {
    const where: any = {
      organizationId,
    };

    if (filters.startDate) {
      where.date = {
        ...where.date,
        gte: new Date(filters.startDate),
      };
    }

    if (filters.endDate) {
      where.date = {
        ...where.date,
        lte: new Date(filters.endDate),
      };
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    const grouped = await this.prisma.expense.groupBy({
      by: ['date'],
      where,
      _sum: {
        amount: true,
      },
    });

    // Group by date string (YYYY-MM-DD)
    const dateMap = new Map<string, number>();

    grouped.forEach((item: { date: Date; _sum: { amount: number | null } }) => {
      const dateStr = item.date.toISOString().split('T')[0];
      const currentTotal = dateMap.get(dateStr) || 0;
      dateMap.set(dateStr, currentTotal + (item._sum.amount || 0));
    });

    return Array.from(dateMap.entries())
      .map(([date, total]: [string, number]) => ({
        date,
        total,
      }))
      .sort((a: { date: string; total: number }, b: { date: string; total: number }) => a.date.localeCompare(b.date));
  }
}

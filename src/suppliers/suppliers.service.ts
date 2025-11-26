import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto, organizationId: string) {
    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.supplier.findMany({
      where: {
        organizationId,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: {
        id,
        organizationId,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found.`);
    }
    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto, organizationId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: {
        id,
        organizationId,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found.`);
    }

    return this.prisma.supplier.update({
      where: {
        id,
      },
      data: updateSupplierDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: {
        id,
        organizationId,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found.`);
    }

    return this.prisma.supplier.delete({
      where: {
        id,
      },
    });
  }
}

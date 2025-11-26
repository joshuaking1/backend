import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private prisma: PrismaService) { }

  async create(createServiceCategoryDto: CreateServiceCategoryDto, organizationId: string) {
    try {
      return await this.prisma.serviceCategory.create({
        data: {
          name: createServiceCategoryDto.name,
          organizationId,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ForbiddenException('A category with this name already exists.');
      }
      throw error;
    }
  }

  findAll(organizationId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async remove(id: string, organizationId: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Service category with ID "${id}" not found.`);
    }

    if (category.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have permission to delete this category.');
    }

    await this.prisma.serviceCategory.delete({ where: { id } });
    return {
      message: 'Successfully deleted service category.',
      statusCode: 200,
    };
  }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto, organizationId: string) {
    // If this branch is set as default, ensure no other branch is the default.
    if (createBranchDto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.branch.create({
      data: {
        ...createBranchDto,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.branch.findMany({
      where: {
        organizationId,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: {
        id,
        organizationId,
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto, organizationId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: {
        id,
        organizationId,
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    // If this branch is set as default, ensure no other branch is the default.
    if (updateBranchDto.isDefault) {
      await this.prisma.branch.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.branch.update({
      where: {
        id,
      },
      data: updateBranchDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: {
        id,
        organizationId,
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    // Prevent deletion of the default branch if it's the only one
    const branchCount = await this.prisma.branch.count({
      where: { organizationId },
    });

    if (branch.isDefault && branchCount === 1) {
      throw new BadRequestException(
        'Cannot delete the default branch if it is the only branch.',
      );
    }

    return this.prisma.branch.delete({
      where: {
        id,
      },
    });
  }
}

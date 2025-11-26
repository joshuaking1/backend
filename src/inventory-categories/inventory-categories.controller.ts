import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InventoryCategoriesService } from './inventory-categories.service';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: User;
}

@UseGuards(JwtAuthGuard)
@Controller('inventory-categories')
export class InventoryCategoriesController {
  constructor(
    private readonly inventoryCategoriesService: InventoryCategoriesService,
  ) {}

  @Post()
  create(
    @Body() createInventoryCategoryDto: CreateInventoryCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organizationId } = req.user;
    return this.inventoryCategoriesService.create(
      createInventoryCategoryDto,
      organizationId,
    );
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    const categories = this.inventoryCategoriesService.findAll(organizationId);
    return categories;
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.inventoryCategoriesService.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInventoryCategoryDto: UpdateInventoryCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organizationId } = req.user;
    return this.inventoryCategoriesService.update(
      id,
      updateInventoryCategoryDto,
      organizationId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { organizationId } = req.user;
    return this.inventoryCategoriesService.remove(id, organizationId);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly serviceCategoriesService: ServiceCategoriesService) { }

  @Post()
  create(@Body() createServiceCategoryDto: CreateServiceCategoryDto, @GetUser('organizationId') organizationId: string) {
    return this.serviceCategoriesService.create(createServiceCategoryDto, organizationId);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.serviceCategoriesService.findAll(organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('organizationId') organizationId: string) {
    return this.serviceCategoriesService.remove(id, organizationId);
  }
}
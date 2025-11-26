import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER) // Only Admins/Managers can manage inventory
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  create(
    @Body() createInventoryItemDto: CreateInventoryItemDto,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.inventoryItemsService.create(createInventoryItemDto, organizationId);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.inventoryItemsService.findAll(organizationId);
  }

  // Special route to find items that need reordering
  @Get('low-stock')
  findLowStock(@GetUser('organizationId') organizationId: string) {
    return this.inventoryItemsService.findLowStock(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryItemsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ) {
    return this.inventoryItemsService.update(id, updateInventoryItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryItemsService.remove(id);
  }
}
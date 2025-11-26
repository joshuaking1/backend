import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER) // Only Admins/Managers can manage suppliers
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto, @GetUser('organizationId') orgId: string) {
    return this.suppliersService.create(createSupplierDto, orgId);
  }

  @Get()
  findAll(@GetUser('organizationId') orgId: string) {
    return this.suppliersService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('organizationId') orgId: string) {
    return this.suppliersService.findOne(id, orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @GetUser('organizationId') orgId: string,
  ) {
    return this.suppliersService.update(id, updateSupplierDto, orgId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('organizationId') orgId: string) {
    return this.suppliersService.remove(id, orgId);
  }
}

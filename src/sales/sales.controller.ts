import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.RECEPTIONIST)
  create(
    @Body() createSaleDto: CreateSaleDto,
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') staffId: string, // Get the ID of the staff member processing the sale
  ) {
    return this.salesService.create(createSaleDto, organizationId, staffId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(
    @GetUser('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.salesService.findAll(organizationId, { startDate, endDate });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.RECEPTIONIST)
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
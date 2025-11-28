import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, FilterExpensesDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @Body() dto: CreateExpenseDto,
    @GetUser() user: { organizationId: string; id: string },
  ) {
    return this.expensesService.create(dto, user.organizationId, user.id);
  }

  @Get()
  findAll(
    @GetUser() user: { organizationId: string },
    @Query() filters: FilterExpensesDto,
  ) {
    return this.expensesService.findAll(user.organizationId, filters);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string },
  ) {
    return this.expensesService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @GetUser() user: { organizationId: string },
  ) {
    return this.expensesService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string },
  ) {
    return this.expensesService.remove(id, user.organizationId);
  }

  @Get('analytics/total')
  getTotalExpenses(
    @GetUser() user: { organizationId: string },
    @Query() filters: FilterExpensesDto,
  ) {
    return this.expensesService.getTotalExpenses(user.organizationId, filters);
  }

  @Get('analytics/by-category')
  getExpensesByCategory(
    @GetUser() user: { organizationId: string },
    @Query() filters: FilterExpensesDto,
  ) {
    return this.expensesService.getExpensesByCategory(user.organizationId, filters);
  }

  @Get('analytics/by-period')
  getExpensesByPeriod(
    @GetUser() user: { organizationId: string },
    @Query() filters: FilterExpensesDto,
  ) {
    return this.expensesService.getExpensesByPeriod(user.organizationId, filters);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CommissionRulesService } from './commission-rules.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('commission-rules')
export class CommissionRulesController {
  constructor(private readonly commissionRulesService: CommissionRulesService) {}

  @Post()
  create(@GetUser('organizationId') organizationId: string, @Body() createCommissionRuleDto: CreateCommissionRuleDto) {
    return this.commissionRulesService.create(organizationId, createCommissionRuleDto);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.commissionRulesService.findAll(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commissionRulesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommissionRuleDto: UpdateCommissionRuleDto) {
    return this.commissionRulesService.update(id, updateCommissionRuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commissionRulesService.remove(id);
  }
}

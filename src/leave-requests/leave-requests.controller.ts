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
import { LeaveRequestsService } from './leave-requests.service';
import { 
  CreateLeaveRequestDto, 
  FindLeaveRequestDto, 
  UpdateLeaveRequestDto 
} from './dto/index';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  create(
    @Body() dto: CreateLeaveRequestDto,
    @GetUser() user: { organizationId: string; id: string; role: UserRole },
  ) {
    return this.leaveRequestsService.create(user.id, user.organizationId, dto);
  }

  @Get()
  findAll(
    @GetUser() user: { organizationId: string; id: string; role: UserRole },
    @Query() filters: FindLeaveRequestDto,
  ) {
    return this.leaveRequestsService.findAll(user.organizationId, filters, user.id, user.role);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string },
  ) {
    return this.leaveRequestsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveRequestDto,
    @GetUser() user: { organizationId: string; id: string; role: UserRole },
  ) {
    return this.leaveRequestsService.update(id, user.organizationId, dto, user.id, user.role);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  approve(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string; id: string },
  ) {
    return this.leaveRequestsService.approve(id, user.organizationId, user.id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  reject(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string; id: string },
  ) {
    return this.leaveRequestsService.reject(id, user.organizationId, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string; id: string; role: UserRole },
  ) {
    return this.leaveRequestsService.remove(id, user.organizationId, user.id, user.role);
  }
}

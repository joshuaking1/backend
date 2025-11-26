import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards, // Import UseGuards
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard'; // Import our guards
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator'; // Import our decorator
import { UserRole } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator'; // Import GetUser

@UseGuards(JwtAuthGuard, RolesGuard) // <-- Apply guards to the whole controller
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('invite')
  @Roles(UserRole.ADMIN, UserRole.MANAGER) // <-- Only Admins and Managers can invite
  create(@Body() inviteStaffDto: InviteStaffDto, @GetUser('organizationId') organizationId: string) {
    return this.staffService.create(inviteStaffDto, organizationId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER) // <-- Only Admins and Managers can see all staff
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.staffService.findAll(organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ARTIST, UserRole.RECEPTIONIST) // <-- All staff can view a profile
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER) // <-- Only Admins and Managers can update
  update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // <-- Only ADMIN can delete/deactivate staff
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}
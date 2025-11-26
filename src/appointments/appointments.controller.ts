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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { FindSlotsDto } from './dto/find-slots.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // The intelligent slot finder
  @Post('available-slots')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  findAvailableSlots(
    @Body() findSlotsDto: FindSlotsDto,
    @GetUser('organizationId') orgId: string,
    @GetUser('branchId') branchId: string,
  ) {
    return this.appointmentsService.findAvailableSlots(findSlotsDto, orgId, branchId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @GetUser('organizationId') organizationId: string,
    @GetUser('branchId') branchId: string, // <-- Get the user's branch
  ) {
    return this.appointmentsService.create(createAppointmentDto, organizationId, branchId); // <-- Pass it
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.ARTIST)
  findAll(
    @GetUser('organizationId') organizationId: string,
    @GetUser('branchId') branchId: string, // <-- Get the user's branch
    @GetUser('role') role: UserRole, // <-- Get the user's role
    @Query('artistId') artistId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Admins see all branches, Managers and below see only their own.
    const targetBranchId = role === 'ADMIN' ? undefined : branchId;
    return this.appointmentsService.findAll(organizationId, targetBranchId, { artistId, startDate, endDate });
  }

  @Get('customer/:customerUserId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.ARTIST)
  findByCustomer(
    @Param('customerUserId') customerUserId: string,
    @GetUser('organizationId') organizationId: string,
    @GetUser('branchId') branchId: string,
  ) {
    return this.appointmentsService.findByCustomer(customerUserId, organizationId, branchId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.ARTIST)
  findOne(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
    @GetUser('branchId') branchId: string,
  ) {
    return this.appointmentsService.findOne(id, organizationId, branchId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @GetUser('organizationId') organizationId: string,
    @GetUser('branchId') branchId: string,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto, organizationId, branchId);
  }
  
  // We might use a PATCH to cancel, not a DELETE, so we'll leave remove() out for now.
}
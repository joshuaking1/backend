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
import { AttendanceService } from './attendance.service';
import { 
  ClockInDto, 
  FindAttendanceDto, 
  UpdateAttendanceDto, 
  StartBreakDto,
  AnalyticsDto 
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { UserRole, AttendanceStatus, BreakType } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Clock Operations
  @Post('clock-in')
  clockIn(
    @Body() dto: ClockInDto,
    @GetUser() user: { organizationId: string; id: string },
  ) {
    return this.attendanceService.clockIn(user.id, user.organizationId, dto);
  }

  @Post('clock-out')
  clockOut(@GetUser() user: { organizationId: string; id: string }) {
    return this.attendanceService.clockOut(user.id, user.organizationId);
  }

  @Get('current')
  getCurrentAttendance(@GetUser() user: { organizationId: string; id: string }) {
    return this.attendanceService.getCurrentAttendance(user.id, user.organizationId);
  }

  // Break Operations
  @Post(':id/break/start')
  startBreak(
    @Param('id') attendanceId: string,
    @Body() dto: StartBreakDto,
    @GetUser() user: { organizationId: string; id: string },
  ) {
    return this.attendanceService.startBreak(attendanceId, user.id, dto.type);
  }

  @Post(':id/break/end')
  endBreak(
    @Param('id') attendanceId: string,
    @GetUser() user: { organizationId: string; id: string },
  ) {
    return this.attendanceService.endBreak(attendanceId, user.id);
  }

  // CRUD Operations
  @Get()
  findAll(
    @GetUser() user: { organizationId: string },
    @Query() filters: FindAttendanceDto,
  ) {
    return this.attendanceService.findAll(user.organizationId, filters);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string },
  ) {
    return this.attendanceService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @GetUser() user: { organizationId: string },
  ) {
    return this.attendanceService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id') id: string,
    @GetUser() user: { organizationId: string },
  ) {
    return this.attendanceService.remove(id, user.organizationId);
  }

  // Analytics
  @Get('analytics/summary')
  getAttendanceSummary(
    @GetUser() user: { organizationId: string },
    @Query() filters: AnalyticsDto,
  ) {
    return this.attendanceService.getAttendanceSummary(user.organizationId, filters);
  }

  @Get('analytics/by-employee')
  getAttendanceByEmployee(
    @GetUser() user: { organizationId: string },
    @Query() filters: AnalyticsDto,
  ) {
    return this.attendanceService.getAttendanceByEmployee(user.organizationId, filters);
  }
}

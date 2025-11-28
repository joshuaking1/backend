import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AttendanceSettingsService } from './attendance-settings.service';
import { UpdateAttendanceSettingsDto } from './dto/update-attendance-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance-settings')
export class AttendanceSettingsController {
  constructor(private readonly attendanceSettingsService: AttendanceSettingsService) {}

  @Get()
  getSettings(@GetUser() user: { organizationId: string }) {
    return this.attendanceSettingsService.getSettings(user.organizationId);
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateSettings(
    @Body() dto: UpdateAttendanceSettingsDto,
    @GetUser() user: { organizationId: string },
  ) {
    return this.attendanceSettingsService.updateSettings(user.organizationId, dto);
  }
}

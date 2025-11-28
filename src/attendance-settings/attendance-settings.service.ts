import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAttendanceSettingsDto } from './dto/update-attendance-settings.dto';

@Injectable()
export class AttendanceSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(organizationId: string) {
    let settings = await this.prisma.attendanceSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings if not found
      settings = await this.prisma.attendanceSettings.create({
        data: {
          organizationId,
          workStartTime: 540, // 9:00 AM
          workEndTime: 1020, // 5:00 PM
          gracePeriodMinutes: 15,
          overtimeThreshold: 8.0,
          requireLocation: false,
          autoClockOutHours: 12,
        },
      });
    }

    return settings;
  }

  async updateSettings(organizationId: string, dto: UpdateAttendanceSettingsDto) {
    return this.prisma.attendanceSettings.upsert({
      where: { organizationId },
      update: dto,
      create: {
        organizationId,
        workStartTime: dto.workStartTime ?? 540,
        workEndTime: dto.workEndTime ?? 1020,
        gracePeriodMinutes: dto.gracePeriodMinutes ?? 15,
        overtimeThreshold: dto.overtimeThreshold ?? 8.0,
        requireLocation: dto.requireLocation ?? false,
        autoClockOutHours: dto.autoClockOutHours ?? 12,
      },
    });
  }
}

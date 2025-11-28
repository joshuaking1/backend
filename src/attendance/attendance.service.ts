import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  ClockInDto, 
  FindAttendanceDto, 
  UpdateAttendanceDto, 
  AnalyticsDto 
} from './dto/index';
import { 
  AttendanceStatus, 
  BreakType, 
  UserRole 
} from '@prisma/client';
import { 
  parseISO, 
  differenceInMinutes, 
  differenceInHours, 
  startOfDay, 
  endOfDay, 
  eachDayOfInterval,
  isWeekend
} from 'date-fns';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Clock Operations
  async clockIn(userId: string, organizationId: string, dto: ClockInDto) {
    // Check if user already has active attendance
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId: userId,
        status: AttendanceStatus.CLOCKED_IN,
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('You are already clocked in');
    }

    // Get or create attendance settings
    const settings = await this.getOrCreateSettings(organizationId);
    
    // Get user's branch and staff profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        branch: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has staff role
    const staffRoles: UserRole[] = [UserRole.ARTIST, UserRole.RECEPTIONIST, UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!staffRoles.includes(user.role as UserRole)) {
      throw new BadRequestException('Only staff members can clock in');
    }

    // Enforce location requirement if enabled
    if (settings.requireLocation && (!dto.location || dto.location.trim() === '')) {
      throw new BadRequestException('Location is required for clocking in');
    }

    // Calculate if late
    const now = new Date();
    const workStartTime = new Date();
    workStartTime.setHours(Math.floor(settings.workStartTime / 60));
    workStartTime.setMinutes(settings.workStartTime % 60);
    workStartTime.setSeconds(0);
    workStartTime.setMilliseconds(0);

    const gracePeriodEnd = new Date(workStartTime);
    gracePeriodEnd.setMinutes(gracePeriodEnd.getMinutes() + settings.gracePeriodMinutes);

    const isLate = now > gracePeriodEnd;
    const lateMinutes = isLate ? differenceInMinutes(now, workStartTime) : 0;

    // Create attendance record
    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId: userId,
        organizationId,
        branchId: user.branchId,
        location: dto.location,
        notes: dto.notes,
        isLate,
        lateMinutes,
        status: AttendanceStatus.CLOCKED_IN,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: true,
      },
    });

    // Update staff profile clock status if it exists
    if (user.staffProfile) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          staffProfile: {
            update: {
              isClockedIn: true,
            },
          },
        },
      });
    } else {
      // Optionally create a default staff profile for staff roles
      if (staffRoles.includes(user.role as UserRole)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            staffProfile: {
              create: {
                isClockedIn: true,
              },
            },
          },
        });
      }
    }

    return attendance;
  }

  async clockOut(userId: string, organizationId: string) {
    // Find active attendance
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId: userId,
        status: AttendanceStatus.CLOCKED_IN,
      },
      include: { breaks: true },
    });

    if (!attendance) {
      throw new NotFoundException('No active attendance found');
    }

    // Get settings
    const settings = await this.getOrCreateSettings(organizationId);

    // Calculate hours
    const clockOutTime = new Date();
    const totalMinutes = differenceInMinutes(clockOutTime, attendance.clockInTime);
    const totalHours = totalMinutes / 60;

    // Calculate break time
    const totalBreakMinutes = attendance.breaks
      .filter(b => b.duration)
      .reduce((sum, b) => sum + b.duration!, 0);

    const workHours = (totalMinutes - totalBreakMinutes) / 60;
    
    // Calculate overtime
    const overtimeHours = Math.max(0, workHours - settings.overtimeThreshold);

    // Update attendance
    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOutTime,
        totalHours: workHours,
        overtimeHours,
        status: AttendanceStatus.CLOCKED_OUT,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: true,
        breaks: true,
      },
    });

    // Update staff profile clock status if it exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staffProfile: true },
    });

    if (user?.staffProfile) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          staffProfile: {
            update: {
              isClockedIn: false,
            },
          },
        },
      });
    }

    return updatedAttendance;
  }

  async getCurrentAttendance(userId: string, organizationId: string) {
    // Check for stale attendances that need auto-clock-out
    const settings = await this.getOrCreateSettings(organizationId);
    
    // Find attendances that are older than autoClockOutHours threshold
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - settings.autoClockOutHours);
    
    const staleAttendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: userId,
        organizationId,
        status: AttendanceStatus.CLOCKED_IN,
        clockInTime: {
          lt: staleThreshold,
        },
      },
      include: { breaks: true },
    });

    // Auto-clock-out stale attendances
    for (const staleAttendance of staleAttendances) {
      await this.performAutoClockOut(staleAttendance, settings);
    }

    // Return current (non-stale) attendance
    return this.prisma.attendance.findFirst({
      where: {
        employeeId: userId,
        organizationId,
        status: AttendanceStatus.CLOCKED_IN,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: true,
        breaks: {
          where: { endTime: null },
        },
      },
    });
  }

  private async performAutoClockOut(attendance: any, settings: any) {
    const clockOutTime = new Date();
    const totalMinutes = differenceInMinutes(clockOutTime, attendance.clockInTime);
    const totalHours = totalMinutes / 60;

    // Calculate break time
    const totalBreakMinutes = attendance.breaks
      .filter((b: any) => b.duration)
      .reduce((sum: number, b: any) => sum + b.duration!, 0);

    const finalHours = (totalMinutes - totalBreakMinutes) / 60;
    const overtimeHours = finalHours > settings.overtimeThreshold ? finalHours - settings.overtimeThreshold : 0;

    // Update attendance as auto-clocked out
    await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOutTime,
        totalHours: finalHours,
        overtimeHours,
        status: AttendanceStatus.CLOCKED_OUT,
        notes: (attendance.notes || '') + '\n[Auto clocked out due to time limit]',
      },
    });
  }

  // Break Operations
  async startBreak(attendanceId: string, userId: string, type: BreakType) {
    // Verify attendance belongs to user and is active
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        employeeId: userId,
        status: AttendanceStatus.CLOCKED_IN,
      },
      include: { breaks: true },
    });

    if (!attendance) {
      throw new NotFoundException('Active attendance not found');
    }

    // Check for active break
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (activeBreak) {
      throw new BadRequestException('You already have an active break');
    }

    // Create break
    return this.prisma.break.create({
      data: {
        attendanceId,
        type,
        startTime: new Date(),
      },
    });
  }

  async endBreak(attendanceId: string, userId: string) {
    // Find active break with proper relation filter
    const activeBreak = await this.prisma.break.findFirst({
      where: {
        attendanceId,
        endTime: null,
        attendance: {
          employeeId: userId,
          status: AttendanceStatus.CLOCKED_IN,
        },
      },
      include: {
        attendance: true,
      },
    });

    if (!activeBreak) {
      throw new NotFoundException('No active break found');
    }

    // Calculate duration
    const endTime = new Date();
    const duration = differenceInMinutes(endTime, activeBreak.startTime);

    // Update break
    return this.prisma.break.update({
      where: { id: activeBreak.id },
      data: {
        endTime,
        duration,
      },
    });
  }

  // CRUD Operations
  async findAll(organizationId: string, filters: FindAttendanceDto) {
    const where: any = { organizationId };

    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.clockInTime = {};
      if (filters.startDate) {
        where.clockInTime.gte = parseISO(filters.startDate);
      }
      if (filters.endDate) {
        where.clockInTime.lte = endOfDay(parseISO(filters.endDate));
      }
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: true,
        breaks: true,
      },
      orderBy: { clockInTime: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: true,
        breaks: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    return attendance;
  }

  async update(id: string, organizationId: string, dto: UpdateAttendanceDto) {
    // Verify ownership
    const attendance = await this.findOne(id, organizationId);

    // Build data object with proper type handling
    const data: any = {};

    // Add safe fields directly
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.totalHours !== undefined) data.totalHours = dto.totalHours;

    // Handle clockOutTime conversion and recalculation
    if (dto.clockOutTime) {
      const clockOutTime = parseISO(dto.clockOutTime);
      data.clockOutTime = clockOutTime;

      // Recalculate totalHours if clockInTime exists
      if (attendance.clockInTime) {
        let totalHours = differenceInHours(clockOutTime, attendance.clockInTime);
        
        // Subtract break time
        const totalBreakMinutes = attendance.breaks
          .filter(b => b.duration)
          .reduce((sum, b) => sum + b.duration!, 0);
        totalHours = (totalHours * 60 - totalBreakMinutes) / 60;
        data.totalHours = totalHours;

        // Recalculate overtimeHours
        const settings = await this.getOrCreateSettings(attendance.organizationId);
        if (totalHours > settings.overtimeThreshold) {
          data.overtimeHours = totalHours - settings.overtimeThreshold;
        } else {
          data.overtimeHours = 0;
        }
      }
    }

    return this.prisma.attendance.update({
      where: { id },
      data,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: true,
        breaks: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    
    return this.prisma.attendance.delete({
      where: { id },
    });
  }

  // Analytics
  async getAttendanceSummary(organizationId: string, filters: AnalyticsDto) {
    const startDate = parseISO(filters.startDate);
    const endDate = parseISO(filters.endDate);

    const where: any = {
      organizationId,
      clockInTime: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.branchId) where.branchId = filters.branchId;

    // Get aggregates
    const aggregates = await this.prisma.attendance.aggregate({
      where,
      _sum: {
        totalHours: true,
        overtimeHours: true,
      },
      _count: {
        id: true,
      },
    });

    // Get late arrivals count
    const lateCount = await this.prisma.attendance.count({
      where: {
        ...where,
        isLate: true,
      },
    });

    // Calculate attendance rate
    const totalDays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(day => !isWeekend(day)).length;
    
    const attendanceRate = totalDays > 0 
      ? (aggregates._count.id / totalDays) * 100 
      : 0;

    return {
      totalHours: aggregates._sum.totalHours || 0,
      averageHoursPerDay: aggregates._count.id > 0 
        ? (aggregates._sum.totalHours || 0) / aggregates._count.id 
        : 0,
      totalLateArrivals: lateCount,
      totalOvertimeHours: aggregates._sum.overtimeHours || 0,
      attendanceRate,
      totalDays,
    };
  }

  async getAttendanceByEmployee(organizationId: string, filters: AnalyticsDto) {
    const startDate = parseISO(filters.startDate);
    const endDate = parseISO(filters.endDate);

    const where: any = {
      organizationId,
      clockInTime: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    };

    if (filters.branchId) where.branchId = filters.branchId;

    // Group by employee
    const employeeStats = await this.prisma.attendance.groupBy({
      by: ['employeeId'],
      where,
      _sum: {
        totalHours: true,
        overtimeHours: true,
      },
      _count: {
        id: true,
      },
    });

    // Get employee names and late counts
    const employeeIds = employeeStats.map(stat => stat.employeeId);
    const employees = await this.prisma.user.findMany({
      where: {
        id: { in: employeeIds },
        organizationId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const lateCounts = await this.prisma.attendance.groupBy({
      by: ['employeeId'],
      where: {
        ...where,
        isLate: true,
      },
      _count: {
        id: true,
      },
    });

    // Combine results
    return employeeStats.map(stat => {
      const employee = employees.find(e => e.id === stat.employeeId);
      const lateStat = lateCounts.find(l => l.employeeId === stat.employeeId);
      
      return {
        employeeId: stat.employeeId,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
        totalHours: stat._sum.totalHours || 0,
        overtimeHours: stat._sum.overtimeHours || 0,
        attendanceCount: stat._count.id,
        lateCount: lateStat?._count.id || 0,
      };
    });
  }

  // Helper methods
  private async getOrCreateSettings(organizationId: string) {
    let settings = await this.prisma.attendanceSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
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
}

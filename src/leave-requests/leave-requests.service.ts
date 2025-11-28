import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateLeaveRequestDto, 
  FindLeaveRequestDto, 
  UpdateLeaveRequestDto 
} from './dto/index';
import { LeaveStatus, UserRole } from '@prisma/client';
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';

@Injectable()
export class LeaveRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, organizationId: string, dto: CreateLeaveRequestDto) {
    const startDate = parseISO(dto.startDate);
    const endDate = parseISO(dto.endDate);

    // Validate date range
    if (isAfter(startDate, endDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping approved leave requests
    const overlappingLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: userId,
        organizationId,
        status: LeaveStatus.APPROVED,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (overlappingLeave) {
      throw new BadRequestException('You have approved leave during this period');
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: userId,
        organizationId,
        startDate,
        endDate,
        type: dto.type,
        reason: dto.reason,
        notes: dto.notes,
        status: LeaveStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(
    organizationId: string, 
    filters: FindLeaveRequestDto, 
    userId: string, 
    userRole: UserRole
  ) {
    const where: any = { organizationId };

    // Employees can only see their own requests
    if (userRole === UserRole.ARTIST || userRole === UserRole.RECEPTIONIST || userRole === UserRole.CASHIER) {
      where.employeeId = userId;
    } else {
      // Admins/Managers can filter by employee
      if (filters.employeeId) where.employeeId = filters.employeeId;
    }

    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.OR = [
        {
          startDate: {
            gte: filters.startDate ? parseISO(filters.startDate) : undefined,
            lte: filters.endDate ? parseISO(filters.endDate) : undefined,
          },
        },
        {
          endDate: {
            gte: filters.startDate ? parseISO(filters.startDate) : undefined,
            lte: filters.endDate ? parseISO(filters.endDate) : undefined,
          },
        },
      ];
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
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
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest;
  }

  async update(
    id: string, 
    organizationId: string, 
    dto: UpdateLeaveRequestDto, 
    userId: string, 
    userRole: UserRole
  ) {
    const leaveRequest = await this.findOne(id, organizationId);

    // Check permissions
    const canEdit = userRole === UserRole.ADMIN || 
                   userRole === UserRole.MANAGER || 
                   (leaveRequest.employeeId === userId && leaveRequest.status === LeaveStatus.PENDING);

    if (!canEdit) {
      throw new ForbiddenException('You cannot edit this leave request');
    }

    // Only allow edits if status is PENDING (except for admins)
    if (leaveRequest.status !== LeaveStatus.PENDING && userRole !== UserRole.ADMIN) {
      throw new BadRequestException('Can only edit pending requests');
    }

    // Validate date range if provided
    if (dto.startDate && dto.endDate) {
      const startDate = parseISO(dto.startDate);
      const endDate = parseISO(dto.endDate);
      
      if (isAfter(startDate, endDate)) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: dto,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async approve(id: string, organizationId: string, approverId: string) {
    const leaveRequest = await this.findOne(id, organizationId);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Can only approve pending requests');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async reject(id: string, organizationId: string, approverId: string) {
    const leaveRequest = await this.findOne(id, organizationId);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Can only reject pending requests');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, organizationId: string, userId: string, userRole: UserRole) {
    const leaveRequest = await this.findOne(id, organizationId);

    // Check permissions
    const canDelete = userRole === UserRole.ADMIN || 
                     userRole === UserRole.MANAGER || 
                     (leaveRequest.employeeId === userId && leaveRequest.status === LeaveStatus.PENDING);

    if (!canDelete) {
      throw new ForbiddenException('You cannot delete this leave request');
    }

    // Only allow deletion if status is PENDING (except for admins)
    if (leaveRequest.status !== LeaveStatus.PENDING && userRole !== UserRole.ADMIN) {
      throw new BadRequestException('Can only delete pending requests');
    }

    return this.prisma.leaveRequest.delete({
      where: { id },
    });
  }
}

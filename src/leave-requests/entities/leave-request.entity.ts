import { LeaveType, LeaveStatus } from '@prisma/client';

export class LeaveRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  type: LeaveType;
  status: LeaveStatus;
  reason: string;
  notes: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employeeId: string;
  organizationId: string;
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approver?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

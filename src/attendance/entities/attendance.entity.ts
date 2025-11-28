import { AttendanceStatus, BreakType } from '@prisma/client';

export class Break {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  type: BreakType;
  createdAt: Date;
  attendanceId: string;
}

export class Attendance {
  id: string;
  clockInTime: Date;
  clockOutTime: Date | null;
  totalHours: number | null;
  status: AttendanceStatus;
  location: string | null;
  notes: string | null;
  isLate: boolean;
  lateMinutes: number;
  overtimeHours: number;
  createdAt: Date;
  updatedAt: Date;
  employeeId: string;
  branchId: string | null;
  organizationId: string;
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  branch?: {
    id: string;
    name: string;
  };
  breaks?: Break[];
}

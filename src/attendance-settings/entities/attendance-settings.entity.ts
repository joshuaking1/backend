export class AttendanceSettings {
  id: string;
  workStartTime: number; // minutes from midnight
  workEndTime: number;
  gracePeriodMinutes: number;
  overtimeThreshold: number;
  requireLocation: boolean;
  autoClockOutHours: number;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
}

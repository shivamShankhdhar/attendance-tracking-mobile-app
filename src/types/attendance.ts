import type { ApiAttendanceRecord } from '../services/attendanceApi';
export interface Employee {
  id: string;
  name: string;
  email?: string;
  code: string;
  avatarUrl?: string;
  status: ApiAttendanceRecord['status'];
  membershipStatus: 'ACTIVE' | 'INVITED' | 'INACTIVE';
  hasPin: boolean;
  joinedAt?: string;
}
export interface Invitation { id: string; email: string; token: string; joinLink?: string; }

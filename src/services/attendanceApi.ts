import { apiRequest } from './api';

export interface ApiWorkplace {
  id: string;
  name: string;
  timezone: string;
  address?: string;
  wifiSsid?: string;
  role: 'EMPLOYER' | 'EMPLOYEE';
  memberId?: string;
  employeeCode?: string;
  attendanceSettings?: {
    requireWifi?: boolean;
    autoCloseHour?: number;
    allowEmployeeViewHistory?: boolean;
  };
}

export interface ApiSession {
  session: {
    id: string;
    workplaceId: string;
    attendanceDate: string;
    status: 'OPEN' | 'CLOSED';
    openedAt: string;
    expiresAt: string;
  };
  qrToken: string | null;
  qrPayload: string | null;
  checkoutQrPayload: string | null;
}

export interface ApiAttendanceRequestItem {
  id: string;
  attendanceDate: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestType?: 'CHECK_IN' | 'CHECK_OUT';
  employee: {
    memberId: string;
    name: string;
    code?: string;
    email?: string;
    avatarUrl?: string;
  };
  verification: {
    qrVerified: boolean;
    wifiVerified: boolean;
    locationVerified?: boolean;
    deviceSsid?: string;
    notes?: string;
  };
  rejectionReason?: string;
  reviewedAt?: string;
}

export interface ApiEmployeeItem {
  id: string;
  name: string;
  employeeCode: string;
  invitedEmail?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE';
  hasPin: boolean;
  joinedAt?: string;
  createdAt: string;
}

export interface ApiTodayRosterResponse {
  attendanceDate: string;
  counts: {
    totalEmployees: number;
    presentCount: number;
    pendingCount: number;
    notMarkedCount: number;
  };
  roster: {
    memberId: string;
    name: string;
    employeeCode: string;
    avatarUrl?: string;
    status: 'PRESENT' | 'PENDING' | 'NOT_MARKED' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
    checkInTime?: string;
    checkOutTime?: string;
    approvedAt?: string;
    requestedAt?: string;
    requestId?: string;
    source?: string;
  }[];
}

export interface ApiAttendanceRecord {
  id: string;
  attendanceDate: string;
  status: 'PRESENT' | 'PENDING' | 'NOT_MARKED' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  checkInTime?: string;
  checkOutTime?: string;
  approvedAt?: string;
  source?: string;
  verification?: {
    qrVerified?: boolean;
    wifiVerified?: boolean;
  };
  correctionReason?: string;
}

export interface ApiReportsResponse {
  daily?: { date: string; present: number; absent: number; halfDay: number; leave: number; total: number }[];
  month?: string;
  summary?: {
    uniqueEmployees?: number;
    daysWithRecords?: number;
    totalRecords: number;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    attendancePercentage: number;
  };
  metrics?: {
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    totalMarked: number;
  };
  records: {
    id: string;
    attendanceDate: string;
    status: string;
    employee: {
      memberId: string;
      name: string;
      code: string;
    };
    checkInTime?: string;
    checkOutTime?: string;
    approvedAt?: string;
    source?: string;
    correctionReason?: string;
  }[];
}

export const attendanceApi = {
  // Workplace
  getWorkplaceDetails: async (workplaceId: string) => apiRequest<{
    id: string;
    name: string;
    code: string;
    address?: string;
    timezone: string;
    memberCount: number;
    createdAt: string;
    attendanceSettings: {
      requireWifi: boolean;
      autoCloseHour: number;
      allowEmployeeViewHistory?: boolean;
    };
  }>(`/workplaces/${encodeURIComponent(workplaceId)}`),
  getMyWorkplaces: async () => {
    return apiRequest<ApiWorkplace[]>('/workplaces');
  },

  updateWorkplace: async (workplaceId: string, data: Partial<ApiWorkplace>) => {
    return apiRequest<any>(`/workplaces/${workplaceId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  // Sessions & QR
  openSession: async (workplaceId: string) => {
    return apiRequest<ApiSession>(`/workplaces/${workplaceId}/attendance-sessions/open`, {
      method: 'POST',
    });
  },

  getTodaySession: async (workplaceId: string) => {
    return apiRequest<ApiSession | null>(`/workplaces/${workplaceId}/attendance-sessions/today`);
  },

  closeSession: async (workplaceId: string) => {
    return apiRequest<{ message: string; session: any }>(
      `/workplaces/${workplaceId}/attendance-sessions/close`,
      { method: 'POST' }
    );
  },

  // Attendance Requests
  getWorkplaceRequests: async (workplaceId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const qs = status ? `?status=${status}` : '';
    return apiRequest<ApiAttendanceRequestItem[]>(`/workplaces/${workplaceId}/attendance/requests${qs}`);
  },

  approveRequest: async (workplaceId: string, requestId: string) => {
    return apiRequest<{ message: string; attendance: any }>(
      `/workplaces/${workplaceId}/attendance/requests/${requestId}/approve`,
      { method: 'POST' }
    );
  },

  rejectRequest: async (workplaceId: string, requestId: string, reason: string) => {
    return apiRequest<{ message: string; request: any }>(
      `/workplaces/${workplaceId}/attendance/requests/${requestId}/reject`,
      {
        method: 'POST',
        body: { reason },
      }
    );
  },

  submitScanRequest: async (qrToken: string, requestType: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN') => {
    return apiRequest<any>('/attendance/requests', {
      method: 'POST',
      body: { qrToken, requestType },
    });
  },


  submitDirectAttendanceRequest: async (workplaceId: string, note?: string, requestType?: 'CHECK_IN' | 'CHECK_OUT') => {
    return apiRequest<any>('/attendance/requests', {
      method: 'POST',
      body: { workplaceId, note, requestType: requestType || 'CHECK_IN' },
    });
  },

  getMyTodayRequest: async (workplaceId: string) => {
    return apiRequest<{ id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; requestType?: 'CHECK_IN' | 'CHECK_OUT'; requestedAt: string; reviewedAt?: string; rejectionReason?: string } | null>(`/workplaces/${workplaceId}/attendance/requests/my-today`);
  },

  // Roster, Counts & Reports
  getTodayRoster: async (workplaceId: string, date?: string) => {
    return apiRequest<ApiTodayRosterResponse>(`/workplaces/${workplaceId}/attendance/today${date ? `?date=${encodeURIComponent(date)}` : ''}`);
  },

  getMyHistory: async (workplaceId: string, query?: { month?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (query?.startDate && query?.endDate) {
      params.append('startDate', query.startDate);
      params.append('endDate', query.endDate);
    } else if (query?.month) {
      params.append('month', query.month);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<ApiAttendanceRecord[]>(`/workplaces/${workplaceId}/attendance/history${qs}`);
  },

  getReports: async (workplaceId: string, query?: { month?: string; startDate?: string; endDate?: string; status?: string; employeeMemberId?: string }) => {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.employeeMemberId) params.append('employeeMemberId', query.employeeMemberId);
    if (query?.month) params.append('month', query.month);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<ApiReportsResponse>(`/workplaces/${workplaceId}/attendance/reports${qs}`);
  },

  markManualAttendance: async (
    workplaceId: string,
    data: {
      employeeMemberId: string;
      attendanceDate: string;
      status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
      correctionReason: string;
    }
  ) => {
    return apiRequest<{ message: string; attendance: any }>(
      `/workplaces/${workplaceId}/attendance/manual`,
      {
        method: 'POST',
        body: data,
      }
    );
  },

  // Employees
  getEmployees: async (workplaceId: string) => {
    return apiRequest<ApiEmployeeItem[]>(`/workplaces/${workplaceId}/employees`);
  },

  addEmployee: async (
    workplaceId: string,
    data: {
      name?: string;
      email?: string;
      employeeCode?: string;
      pin?: string;
    }
  ) => {
    return apiRequest<{ employee: ApiEmployeeItem; inviteToken: string; joinLink?: string }>(
      `/workplaces/${workplaceId}/employees`,
      {
        method: 'POST',
        body: data,
      }
    );
  },

  updateEmployee: async (
    workplaceId: string,
    memberId: string,
    data: { name?: string; employeeCode?: string; status?: 'ACTIVE' | 'INACTIVE' }
  ) => {
    return apiRequest<{ message: string; employee: any }>(
      `/workplaces/${workplaceId}/employees/${memberId}`,
      {
        method: 'PATCH',
        body: data,
      }
    );
  },

  resetPin: async (workplaceId: string, memberId: string, newPin: string) => {
    return apiRequest<{ message: string }>(
      `/workplaces/${workplaceId}/employees/${memberId}/reset-pin`,
      {
        method: 'POST',
        body: { newPin },
      }
    );
  },

  getEmployeeHistory: async (workplaceId: string, memberId: string, query?: { month?: string }) => {
    const qs = query?.month ? `?month=${query.month}` : '';
    return apiRequest<ApiAttendanceRecord[]>(
      `/workplaces/${workplaceId}/attendance/employees/${memberId}/history${qs}`
    );
  },

  // --- JOIN WORKPLACE VIA QR CODE ---

  getJoinQr: async (workplaceId: string) => {
    return apiRequest<{
      workplaceId: string;
      workplaceName: string;
      address?: string;
      qrToken: string;
      qrPayload: string;
      deepLink?: string;
      joinLink?: string;
    }>(`/workplaces/${workplaceId}/join-qr`);
  },

  createInviteLink: async (workplaceId: string) => {
    return apiRequest<{
      workplaceId: string;
      workplaceName: string;
      address?: string;
      qrToken: string;
      qrPayload: string;
      deepLink?: string;
      joinLink?: string;
    }>(`/workplaces/${encodeURIComponent(workplaceId)}/invite-link`, { method: 'POST' });
  },

  rotateJoinQr: async (workplaceId: string) => {
    return apiRequest<{
      workplaceId: string;
      workplaceName: string;
      address?: string;
      qrToken: string;
      qrPayload: string;
      deepLink?: string;
      joinLink?: string;
    }>(`/workplaces/${workplaceId}/join-qr/rotate`, { method: 'POST' });
  },

  previewJoin: async (token: string) => {
    return apiRequest<JoinPreview>('/workplaces/join-preview', {
      method: 'POST',
      body: { token },
    });
  },

  getMyJoinRequest: (requestId: string) => apiRequest<JoinPreview>(`/workplaces/my-join-requests/${encodeURIComponent(requestId)}`),

  getMyNotifications: () =>
    apiRequest<Array<{
      id: string;
      title: string;
      body: string;
      type: 'ATTENDANCE' | 'REQUEST' | 'SYSTEM' | 'INFO';
      timestamp: string;
      read: boolean;
      data?: Record<string, any>;
    }>>('/notifications/my'),

  submitJoinRequest: async (token: string, note?: string) => {
    return apiRequest<{
      message: string;
      requestId: string;
      status: string;
      workplaceName: string;
      requestedAt?: string;
      alreadyMember?: boolean;
      autoApproved?: boolean;
      workplaceId?: string;
    }>('/workplaces/join-requests', {
      method: 'POST',
      body: { token, note },
    });
  },

  getMyJoinRequests: async () => {
    return apiRequest<Array<{
      id: string;
      workplaceId: string;
      workplaceName: string;
      address?: string;
      timezone?: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
      note?: string;
      rejectionReason?: string;
      requestedAt: string;
      reviewedAt?: string;
    }>>('/workplaces/my-join-requests');
  },

  cancelMyJoinRequest: async (requestId: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/workplaces/my-join-requests/${requestId}/cancel`,
      { method: 'POST' }
    );
  },

  getWorkplaceJoinRequests: async (workplaceId: string, status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiRequest<Array<{
      id: string;
      userId?: string;
      name: string;
      email: string;
      avatarUrl?: string;
      note?: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
      requestedAt: string;
      reviewedAt?: string;
      rejectionReason?: string;
    }>>(`/workplaces/${workplaceId}/join-requests${qs}`);
  },

  approveJoinRequest: async (
    workplaceId: string,
    requestId: string,
    data?: { employeeCode?: string }
  ) => {
    return apiRequest<{
      message: string;
      memberId: string;
      employeeCode?: string;
      name: string;
    }>(`/workplaces/${workplaceId}/join-requests/${requestId}/approve`, {
      method: 'POST',
      body: data || {},
    });
  },

  rejectJoinRequest: async (
    workplaceId: string,
    requestId: string,
    data?: { reason?: string }
  ) => {
    return apiRequest<{ message: string; requestId: string }>(
      `/workplaces/${workplaceId}/join-requests/${requestId}/reject`,
      {
        method: 'POST',
        body: data || {},
      }
    );
  },
};



export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export interface JoinRequestState {
  id: string;
  status: JoinRequestStatus;
  requestedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}
export interface JoinPreview {
  workplaceId: string;
  workplaceName: string;
  description?: string;
  address?: string;
  timezone: string;
  ownerName: string;
  ownerAvatarUrl?: string;
  activeMembersCount: number;
  alreadyMember: boolean;
  isOwner?: boolean;
  isEmployer?: boolean;
  isInvited?: boolean;
  invitedRole?: string;
  latestRequest: JoinRequestState | null;
  pendingRequest: JoinRequestState | null;
  qrToken?: string;
}

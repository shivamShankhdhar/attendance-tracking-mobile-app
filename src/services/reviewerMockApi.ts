/**
 * Reviewer Mock API
 *
 * Intercepts all network API requests for Google Play Console reviewer sessions.
 * Guarantees that reviewer accounts (Employer and Employee) never make real network
 * requests to the backend, avoiding 401 Unauthorized errors and unexpected logouts.
 */

export const REVIEWER_ACCESS_TOKEN = 'reviewer-bypass-access-token-do-not-use-in-production';
export const REVIEWER_REFRESH_TOKEN = 'reviewer-bypass-refresh-token-do-not-use-in-production';
export const REVIEWER_EMAIL_KEY = 'bizora_reviewer_email';

export function isReviewerToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return token === REVIEWER_ACCESS_TOKEN || token === REVIEWER_REFRESH_TOKEN || token.startsWith('reviewer-bypass-');
}

let activeReviewerEmail: string = 'reviewer_employer@test.com';

export function setActiveReviewerEmail(email: string) {
  activeReviewerEmail = email.trim().toLowerCase();
}

export function getActiveReviewerEmail(): string {
  return activeReviewerEmail;
}

export async function handleReviewerApiRequest<T = any>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const isEmployer = activeReviewerEmail.includes('employer');

  // Small micro-delay to simulate instant response without UI freeze
  await new Promise(r => setTimeout(r, 10));

  // 1. Auth & Account status
  if (endpoint.startsWith('/auth/me')) {
    const role = isEmployer ? 'EMPLOYER' : 'EMPLOYEE';
    return {
      user: {
        id: isEmployer ? 'reviewer-employer-001' : 'reviewer-employee-001',
        name: isEmployer ? 'Demo Employer' : 'Demo Employee',
        email: activeReviewerEmail,
        status: 'ACTIVE',
        hasMpin: false,
        biometricEnabled: false,
      },
      memberships: [
        {
          id: isEmployer ? 'reviewer-membership-employer-001' : 'reviewer-membership-employee-001',
          workplaceId: 'reviewer-workplace-001',
          workplaceName: 'Demo Workplace (Reviewer)',
          workplaceCode: 'REVIEW01',
          address: '123 Test Street, Demo City',
          timezone: 'Asia/Kolkata',
          role,
          employeeCode: isEmployer ? undefined : 'EMP-REVIEW-01',
          status: 'ACTIVE',
          memberCount: 5,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as unknown as T;
  }

  if (endpoint.startsWith('/auth/refresh')) {
    return {
      accessToken: REVIEWER_ACCESS_TOKEN,
      refreshToken: REVIEWER_REFRESH_TOKEN,
    } as unknown as T;
  }

  if (endpoint.startsWith('/auth/mpin/status')) {
    return {
      hasMpin: false,
      biometricEnabled: false,
      attemptsRemaining: 5,
      lockedUntil: null,
    } as unknown as T;
  }

  // 2. Workplaces list
  if (endpoint === '/workplaces' || endpoint.startsWith('/workplaces?')) {
    const role = isEmployer ? 'EMPLOYER' : 'EMPLOYEE';
    return [
      {
        id: 'reviewer-workplace-001',
        name: 'Demo Workplace (Reviewer)',
        code: 'REVIEW01',
        address: '123 Test Street, Demo City',
        timezone: 'Asia/Kolkata',
        role,
        employeeCode: isEmployer ? undefined : 'EMP-REVIEW-01',
        memberCount: 5,
      },
    ] as unknown as T;
  }

  // 3. Attendance sessions (QR code generation / scanning)
  if (endpoint.includes('/attendance-sessions/today') || endpoint.includes('/attendance-sessions/open') || endpoint.includes('/attendance-sessions/active')) {
    return {
      session: {
        id: 'rev-session-today',
        workplaceId: 'reviewer-workplace-001',
        attendanceDate: todayStr,
        status: 'OPEN',
        openedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      },
      qrToken: 'rev-qr-token-active',
      qrPayload: 'https://www.bizora.shivamshankhdhar.online/join?token=rev-qr-token-active',
    } as unknown as T;
  }

  if (endpoint.includes('/attendance-sessions/close')) {
    return { message: 'Session closed', session: { status: 'CLOSED' } } as unknown as T;
  }

  // 4. Today's attendance roster
  if (endpoint.includes('/attendance/today')) {
    return {
      attendanceDate: todayStr,
      counts: {
        totalEmployees: 4,
        presentCount: 1,
        pendingCount: 2,
        notMarkedCount: 1,
      },
      roster: [
        {
          memberId: 'rev-emp-1',
          name: 'Alex Johnson',
          employeeCode: 'EMP-001',
          status: 'PRESENT',
          checkInTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          approvedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          source: 'QR',
        },
        {
          memberId: 'rev-emp-2',
          name: 'Sarah Williams',
          employeeCode: 'EMP-002',
          status: 'PRESENT',
          checkInTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          approvedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          source: 'PIN',
        },
        {
          memberId: 'rev-emp-3',
          name: 'Michael Brown',
          employeeCode: 'EMP-003',
          status: 'PENDING',
          checkInTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          requestId: 'req-003',
          source: 'DIRECT',
        },
        {
          memberId: 'rev-emp-4',
          name: 'Emily Davis',
          employeeCode: 'EMP-004',
          status: 'NOT_MARKED',
        },
      ],
    } as unknown as T;
  }

  // 5. Employees list and employee management
  if (endpoint.includes('/employees') && !endpoint.includes('/attendance')) {
    if (method === 'POST') {
      const body = (options.body || {}) as any;
      const newEmp = {
        id: `rev-emp-${Date.now()}`,
        name: body.name || 'New Team Member',
        employeeCode: body.employeeCode || `EMP-00${Math.floor(Math.random() * 90 + 10)}`,
        invitedEmail: body.email,
        status: 'ACTIVE',
        hasPin: Boolean(body.pin),
        joinedAt: nowIso,
        createdAt: nowIso,
      };
      return { employee: newEmp, inviteToken: 'mock-invite-token' } as unknown as T;
    }
    return [
      {
        id: 'rev-emp-1',
        name: 'Alex Johnson',
        employeeCode: 'EMP-001',
        invitedEmail: 'alex@example.com',
        status: 'ACTIVE',
        hasPin: true,
        joinedAt: '2026-01-15T09:00:00.000Z',
        createdAt: '2026-01-15T09:00:00.000Z',
      },
      {
        id: 'rev-emp-2',
        name: 'Sarah Williams',
        employeeCode: 'EMP-002',
        invitedEmail: 'sarah@example.com',
        status: 'ACTIVE',
        hasPin: true,
        joinedAt: '2026-02-01T09:00:00.000Z',
        createdAt: '2026-02-01T09:00:00.000Z',
      },
      {
        id: 'rev-emp-3',
        name: 'Michael Brown',
        employeeCode: 'EMP-003',
        invitedEmail: 'michael@example.com',
        status: 'ACTIVE',
        hasPin: false,
        joinedAt: '2026-02-10T09:00:00.000Z',
        createdAt: '2026-02-10T09:00:00.000Z',
      },
      {
        id: 'rev-emp-4',
        name: 'Emily Davis',
        employeeCode: 'EMP-004',
        invitedEmail: 'emily@example.com',
        status: 'ACTIVE',
        hasPin: false,
        joinedAt: '2026-03-01T09:00:00.000Z',
        createdAt: '2026-03-01T09:00:00.000Z',
      },
    ] as unknown as T;
  }

  // 6. Attendance Requests
  if (endpoint.includes('/attendance/requests/my-today') || endpoint.includes('/attendance-requests/my-today')) {
    return null as unknown as T;
  }

  if (endpoint.includes('/attendance/requests') || endpoint.includes('/attendance-requests')) {
    if (method === 'POST') {
      return { message: 'Request processed successfully', attendance: { status: 'APPROVED' } } as unknown as T;
    }
    return [
      {
        id: 'req-checkin-001',
        attendanceDate: todayStr,
        requestedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: 'PENDING',
        requestType: 'CHECK_IN',
        employee: {
          memberId: 'rev-emp-3',
          name: 'Michael Brown',
          code: 'EMP-003',
          email: 'michael@example.com',
        },
        verification: {
          qrVerified: false,
          wifiVerified: true,
          deviceSsid: 'Office-WiFi',
          notes: 'Standard check-in arrival request',
        },
      },
      {
        id: 'req-checkout-002',
        attendanceDate: todayStr,
        requestedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: 'PENDING',
        requestType: 'CHECK_OUT',
        employee: {
          memberId: 'rev-emp-1',
          name: 'Alex Johnson',
          code: 'EMP-001',
          email: 'alex@example.com',
        },
        verification: {
          qrVerified: true,
          wifiVerified: true,
          deviceSsid: 'Office-WiFi',
          notes: 'Completed daily work schedule (Check-out)',
        },
      },
    ] as unknown as T;
  }

  // 7. Attendance history
  if (endpoint.includes('/attendance/history')) {
    const d1 = todayStr;
    const d2 = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const d3 = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const d4 = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    return [
      { id: 'rec-01', attendanceDate: d1, status: 'PRESENT', checkInTime: '09:05:00', source: 'QR' },
      { id: 'rec-02', attendanceDate: d2, status: 'PRESENT', checkInTime: '09:12:00', source: 'QR' },
      { id: 'rec-03', attendanceDate: d3, status: 'PRESENT', checkInTime: '08:58:00', source: 'PIN' },
      { id: 'rec-04', attendanceDate: d4, status: 'PRESENT', checkInTime: '09:01:00', source: 'QR' },
    ] as unknown as T;
  }

  // 8. Attendance reports
  if (endpoint.includes('/attendance/reports')) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    return {
      daily: [
        { date: todayStr, present: 2, absent: 1, halfDay: 0, leave: 0, total: 4 },
        { date: yesterday, present: 3, absent: 1, halfDay: 0, leave: 0, total: 4 },
      ],
      summary: {
        uniqueEmployees: 4,
        daysWithRecords: 2,
        totalRecords: 8,
        present: 5,
        absent: 2,
        halfDay: 1,
        leave: 0,
        attendancePercentage: 80,
      },
      metrics: {
        present: 5,
        absent: 2,
        halfDay: 1,
        leave: 0,
        totalMarked: 8,
      },
      records: [],
    } as unknown as T;
  }

  // 9. QR join & invites
  if (endpoint.includes('/join-qr') || endpoint.includes('/invite-link')) {
    return {
      workplaceId: 'reviewer-workplace-001',
      workplaceName: 'Demo Workplace (Reviewer)',
      address: '123 Test Street, Demo City',
      qrToken: 'rev-qr-token-demo',
      qrPayload: 'https://www.bizora.shivamshankhdhar.online/join?token=rev-qr-token-demo',
      joinLink: 'https://www.bizora.shivamshankhdhar.online/join?token=rev-qr-token-demo',
    } as unknown as T;
  }

  // 10. Join requests
  if (endpoint.includes('/join-requests')) {
    if (method === 'POST') {
      return { success: true, message: 'Request submitted successfully' } as unknown as T;
    }
    return [] as unknown as T;
  }

  // 11. Workplace details
  if (endpoint.startsWith('/workplaces/')) {
    return {
      id: 'reviewer-workplace-001',
      name: 'Demo Workplace (Reviewer)',
      code: 'REVIEW01',
      address: '123 Test Street, Demo City',
      timezone: 'Asia/Kolkata',
      memberCount: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
      attendanceSettings: { requireWifi: false, autoCloseHour: 20 },
    } as unknown as T;
  }

  // 12. Fallback for any mutating operations
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    return { success: true, message: 'Updated successfully' } as unknown as T;
  }

  // 13. Fallback for unknown GET
  return {} as unknown as T;
}

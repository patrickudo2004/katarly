import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMeeting } from '../convex/meetings';
import { manualMark, approveVerification, declineVerification } from '../convex/attendance';
import { auth } from '../convex/auth';

vi.mock('../convex/auth', () => {
  return {
    auth: {
      getUserId: vi.fn(),
    },
  };
});

describe('Meetings createMeeting mutation authorization checks', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    mockDb = {
      get: vi.fn(),
      insert: vi.fn().mockResolvedValue('meeting-id-123'),
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([]),
        first: vi.fn().mockResolvedValue(null),
      }),
    };

    mockCtx = {
      db: mockDb,
    };
  });

  it('throws "Not authenticated" if user is not logged in', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue(null);

    await expect(
      (createMeeting as any)._handler(mockCtx, {
        name: 'Test Meeting',
        scope: 'ChurchWide',
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        format: 'Online',
        platform: 'Custom',
        meetingUrl: 'https://example.com',
      })
    ).rejects.toThrow('Not authenticated');
  });

  it('throws "User context not found" if user record is missing in DB', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('user-123' as any);
    mockDb.get.mockResolvedValue(null);

    await expect(
      (createMeeting as any)._handler(mockCtx, {
        name: 'Test Meeting',
        scope: 'ChurchWide',
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        format: 'Online',
        platform: 'Custom',
        meetingUrl: 'https://example.com',
      })
    ).rejects.toThrow('User context not found');
  });

  it('throws for Church-wide scope if role is Volunteer (unauthorized)', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('user-123' as any);
    mockDb.get.mockResolvedValue({
      _id: 'user-123',
      churchId: 'church-123',
      role: 'Volunteer',
    });

    await expect(
      (createMeeting as any)._handler(mockCtx, {
        name: 'Test Meeting',
        scope: 'ChurchWide',
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        format: 'Online',
        platform: 'Custom',
        meetingUrl: 'https://example.com',
      })
    ).rejects.toThrow('Only SuperAdmins and DeaconHeads can schedule Church-wide meetings');
  });

  it('succeeds for Church-wide scope if role is SuperAdmin', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('user-123' as any);
    mockDb.get.mockResolvedValue({
      _id: 'user-123',
      churchId: 'church-123',
      role: 'SuperAdmin',
    });

    const result = await (createMeeting as any)._handler(mockCtx, {
      name: 'Test Meeting',
      scope: 'ChurchWide',
      startTime: Date.now(),
      endTime: Date.now() + 3600000,
      format: 'Online',
      platform: 'Custom',
      meetingUrl: 'https://example.com',
    });

    expect(mockDb.insert).toHaveBeenCalledWith('meetings', expect.any(Object));
    expect(result).toEqual('meeting-id-123');
  });

  it('throws for Departmental scope if role is Volunteer (unauthorized)', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('user-123' as any);
    mockDb.get.mockResolvedValue({
      _id: 'user-123',
      churchId: 'church-123',
      role: 'Volunteer',
    });

    await expect(
      (createMeeting as any)._handler(mockCtx, {
        name: 'Test Meeting',
        scope: 'Departmental',
        departmentId: 'dept-123' as any,
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        format: 'Online',
        platform: 'Custom',
        meetingUrl: 'https://example.com',
      })
    ).rejects.toThrow('Unauthorized to schedule departmental meetings');
  });

  it('throws for Departmental scope if user belongs to different department than requested', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('user-123' as any);
    mockDb.get.mockResolvedValue({
      _id: 'user-123',
      churchId: 'church-123',
      role: 'DepartmentHead',
      departmentId: 'dept-123',
    });

    await expect(
      (createMeeting as any)._handler(mockCtx, {
        name: 'Test Departmental Meeting',
        scope: 'Departmental',
        departmentId: 'dept-456' as any,
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        format: 'Online',
        platform: 'Custom',
        meetingUrl: 'https://example.com',
      })
    ).rejects.toThrow('You can only schedule meetings for your own department');
  });
});

describe('Attendance security check mutations', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockDb = {
      get: vi.fn(),
      insert: vi.fn().mockResolvedValue('attendance-id-123'),
      patch: vi.fn(),
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      }),
    };
    mockCtx = { db: mockDb };
  });

  it('manualMark throws "Not authenticated" if user session is invalid', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue(null);

    await expect(
      (manualMark as any)._handler(mockCtx, {
        serviceId: 'service-123' as any,
        userId: 'user-456' as any,
        status: 'Present',
      })
    ).rejects.toThrow('Not authenticated');
  });

  it('manualMark throws "Unauthorized" if actor is not leadership', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('marker-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'marker-123') return { _id: 'marker-123', role: 'Volunteer', churchId: 'church-123' };
      return null;
    });

    await expect(
      (manualMark as any)._handler(mockCtx, {
        serviceId: 'service-123' as any,
        userId: 'user-456' as any,
        status: 'Present',
      })
    ).rejects.toThrow('Unauthorized to mark attendance manually');
  });

  it('manualMark throws "Unauthorized: Cross-church operation blocked" if target user is from different church', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('marker-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'marker-123') return { _id: 'marker-123', role: 'SuperAdmin', churchId: 'church-123' };
      if (id === 'user-456') return { _id: 'user-456', churchId: 'church-999' };
      return null;
    });

    await expect(
      (manualMark as any)._handler(mockCtx, {
        serviceId: 'service-123' as any,
        userId: 'user-456' as any,
        status: 'Present',
      })
    ).rejects.toThrow('Unauthorized: Cross-church operation blocked');
  });

  it('approveVerification throws "Unauthorized" if actor is not leader', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('lead-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'lead-123') return { _id: 'lead-123', role: 'Volunteer', churchId: 'church-123' };
      return null;
    });

    await expect(
      (approveVerification as any)._handler(mockCtx, {
        requestId: 'request-123' as any,
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('declineVerification throws "Unauthorized: Cross-church operation blocked" if request is for different church', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('lead-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'lead-123') return { _id: 'lead-123', role: 'DepartmentHead', churchId: 'church-123' };
      if (id === 'request-123') return { _id: 'request-123', churchId: 'church-999' };
      return null;
    });

    await expect(
      (declineVerification as any)._handler(mockCtx, {
        requestId: 'request-123' as any,
      })
    ).rejects.toThrow('Unauthorized: Cross-church operation blocked');
  });
});

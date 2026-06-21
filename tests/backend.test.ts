import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMeeting } from '../convex/meetings';
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

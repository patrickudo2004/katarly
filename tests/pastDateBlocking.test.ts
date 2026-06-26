import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createRotaEntry, assignUserToShift } from '../convex/rotas';
import { auth } from '../convex/auth';
import { api } from '../convex/_generated/api';

vi.mock('../convex/auth', () => {
  return {
    auth: {
      getUserId: vi.fn(),
    },
  };
});

describe('createRotaEntry mutation past-date scheduling check', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockDb = {
      get: vi.fn(),
      insert: vi.fn().mockResolvedValue('rota-123'),
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      }),
    };
    mockCtx = { db: mockDb };
  });

  it('throws past-date scheduling error if service is in past and user is not SuperAdmin/DeaconHead', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('user-lead' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'user-lead') return { _id: 'user-lead', role: 'SubunitLead', departmentId: 'dept-1', subunitId: 'subunit-1', churchId: 'church-1' };
      if (id === 'service-past') return { _id: 'service-past', startTime: Date.now() - 100000, endTime: Date.now() - 50000, churchId: 'church-1' };
      return null;
    });

    await expect(
      (createRotaEntry as any)._handler(mockCtx, {
        serviceId: 'service-past' as any,
        departmentId: 'dept-1' as any,
        subunitId: 'subunit-1' as any,
        role: 'Steward',
      })
    ).rejects.toThrow('Unauthorized: Only SuperAdmins and DeaconHeads can assign shifts to past services.');
  });

  it('allows scheduling past service if user is SuperAdmin', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'SuperAdmin', churchId: 'church-1' };
      if (id === 'service-past') return { _id: 'service-past', startTime: Date.now() - 100000, endTime: Date.now() - 50000, churchId: 'church-1' };
      return null;
    });

    const result = await (createRotaEntry as any)._handler(mockCtx, {
      serviceId: 'service-past' as any,
      departmentId: 'dept-1' as any,
      subunitId: 'subunit-1' as any,
      role: 'Steward',
    });

    expect(mockDb.insert).toHaveBeenCalledWith('rotas', expect.objectContaining({
      serviceId: 'service-past',
      role: 'Steward',
    }));
    expect(result).toEqual('rota-123');
  });

  it('allows scheduling past service if user is DeaconHead', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'DeaconHead', churchId: 'church-1' };
      if (id === 'service-past') return { _id: 'service-past', startTime: Date.now() - 100000, endTime: Date.now() - 50000, churchId: 'church-1' };
      return null;
    });

    const result = await (createRotaEntry as any)._handler(mockCtx, {
      serviceId: 'service-past' as any,
      departmentId: 'dept-1' as any,
      subunitId: 'subunit-1' as any,
      role: 'Steward',
    });

    expect(mockDb.insert).toHaveBeenCalledWith('rotas', expect.objectContaining({
      serviceId: 'service-past',
      role: 'Steward',
    }));
    expect(result).toEqual('rota-123');
  });
});

describe('assignUserToShift mutation past-date and 2-hour lockout check', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockDb = {
      get: vi.fn(),
      patch: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        collect: vi.fn().mockResolvedValue([]),
      }),
    };
    mockCtx = { db: mockDb, scheduler: { runAfter: vi.fn() } };
  });

  it('throws error for past service assignment if caller is SubunitLead', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('lead-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'lead-123') return { _id: 'lead-123', role: 'SubunitLead', departmentId: 'dept-1', subunitId: 'subunit-1', churchId: 'church-1' };
      if (id === 'rota-123') return { _id: 'rota-123', serviceId: 'service-past', departmentId: 'dept-1', subunitId: 'subunit-1', role: 'Steward' };
      if (id === 'service-past') return { _id: 'service-past', startTime: Date.now() - 100000, endTime: Date.now() - 50000, churchId: 'church-1' };
      if (id === 'volunteer-123') return { _id: 'volunteer-123', churchId: 'church-1' };
      return null;
    });

    await expect(
      (assignUserToShift as any)._handler(mockCtx, {
        rotaId: 'rota-123' as any,
        userId: 'volunteer-123' as any,
      })
    ).rejects.toThrow('Unauthorized: Only SuperAdmins and DeaconHeads can assign shifts to past services.');
  });

  it('allows past service assignment if caller is SuperAdmin, bypassing 2h lockout check', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'SuperAdmin', churchId: 'church-1' };
      if (id === 'rota-123') return { _id: 'rota-123', serviceId: 'service-past', departmentId: 'dept-1', subunitId: 'subunit-1', role: 'Steward' };
      if (id === 'service-past') return { _id: 'service-past', startTime: Date.now() - 100000, endTime: Date.now() - 50000, churchId: 'church-1' };
      if (id === 'volunteer-123') return { _id: 'volunteer-123', churchId: 'church-1' };
      return null;
    });

    const result = await (assignUserToShift as any)._handler(mockCtx, {
      rotaId: 'rota-123' as any,
      userId: 'volunteer-123' as any,
    });

    expect(mockDb.patch).toHaveBeenCalledWith('rota-123', {
      userId: 'volunteer-123',
      status: 'Pending',
    });
    expect(result).toEqual('rota-123');
  });

  it('retains 2h lockout checks for upcoming services', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('lead-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'lead-123') return { _id: 'lead-123', role: 'SubunitLead', departmentId: 'dept-1', subunitId: 'subunit-1', churchId: 'church-1' };
      if (id === 'rota-123') return { _id: 'rota-123', serviceId: 'service-soon', departmentId: 'dept-1', subunitId: 'subunit-1', role: 'Steward' };
      if (id === 'service-soon') return { _id: 'service-soon', startTime: Date.now() + 1000 * 60 * 60, endTime: Date.now() + 1000 * 60 * 120, churchId: 'church-1' }; // Starts in 1 hour
      if (id === 'volunteer-123') return { _id: 'volunteer-123', churchId: 'church-1' };
      return null;
    });

    await expect(
      (assignUserToShift as any)._handler(mockCtx, {
        rotaId: 'rota-123' as any,
        userId: 'volunteer-123' as any,
      })
    ).rejects.toThrow('Service starts in less than 2 hours. Roster changes are locked. Please coordinate directly.');
  });
});

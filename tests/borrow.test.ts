import { vi, describe, it, expect, beforeEach } from 'vitest';
import { updateAdditionalSubunits } from '../convex/users';
import { createBorrowRequest } from '../convex/borrow';
import { auth } from '../convex/auth';

vi.mock('../convex/auth', () => {
  return {
    auth: {
      getUserId: vi.fn(),
    },
  };
});

describe('updateAdditionalSubunits mutation authorization and validation checks', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    mockDb = {
      get: vi.fn(),
      patch: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
    };

    mockCtx = {
      db: mockDb,
    };
  });

  it('throws "Not authenticated" if user is not logged in', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue(null);

    await expect(
      (updateAdditionalSubunits as any)._handler(mockCtx, {
        userId: 'user-123' as any,
        subunitIds: ['subunit-1'],
      })
    ).rejects.toThrow('Not authenticated');
  });

  it('throws "Unauthorized" if admin is a Volunteer', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'Volunteer', departmentId: 'dept-123' };
      if (id === 'user-123') return { _id: 'user-123', departmentId: 'dept-123' };
      return null;
    });

    await expect(
      (updateAdditionalSubunits as any)._handler(mockCtx, {
        userId: 'user-123' as any,
        subunitIds: ['subunit-1'],
      })
    ).rejects.toThrow('Unauthorized to edit additional subunits for this user');
  });

  it('throws "Unauthorized" if DepartmentHead tries to update user in a different department', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'DepartmentHead', departmentId: 'dept-123' };
      if (id === 'user-123') return { _id: 'user-123', departmentId: 'dept-456' }; // Different department
      return null;
    });

    await expect(
      (updateAdditionalSubunits as any)._handler(mockCtx, {
        userId: 'user-123' as any,
        subunitIds: ['subunit-1'],
      })
    ).rejects.toThrow('Unauthorized to edit additional subunits for this user');
  });

  it('throws error if a subunit does not belong to the user\'s primary department', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'DepartmentHead', departmentId: 'dept-123' };
      if (id === 'user-123') return { _id: 'user-123', departmentId: 'dept-123' };
      if (id === 'subunit-999') return { _id: 'subunit-999', departmentId: 'dept-999', name: 'Wrong Subunit' }; // Different department
      return null;
    });

    await expect(
      (updateAdditionalSubunits as any)._handler(mockCtx, {
        userId: 'user-123' as any,
        subunitIds: ['subunit-999'],
      })
    ).rejects.toThrow('Subunit Wrong Subunit is not in the user\'s department');
  });

  it('succeeds if admin is DepartmentHead of the user\'s department and subunits are valid', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'DepartmentHead', departmentId: 'dept-123' };
      if (id === 'user-123') return { _id: 'user-123', departmentId: 'dept-123' };
      if (id === 'subunit-1') return { _id: 'subunit-1', departmentId: 'dept-123', name: 'Subunit 1' };
      return null;
    });

    const result = await (updateAdditionalSubunits as any)._handler(mockCtx, {
      userId: 'user-123' as any,
      subunitIds: ['subunit-1'],
    });

    expect(mockDb.patch).toHaveBeenCalledWith('user-123', { additionalSubunits: ['subunit-1'] });
    expect(result).toEqual({ success: true });
  });
});

describe('createBorrowRequest targeted borrowing validations', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockDb = {
      get: vi.fn(),
      insert: vi.fn().mockResolvedValue('request-id-123'),
      patch: vi.fn(),
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([]),
      }),
    };
    mockCtx = { db: mockDb };
  });

  it('throws error if target volunteer does not belong to target department', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'DepartmentHead', departmentId: 'dept-123', churchId: 'church-123' };
      if (id === 'volunteer-456') return { _id: 'volunteer-456', departmentId: 'dept-999' }; // Different department
      if (id === 'dept-789') return { _id: 'dept-789', churchId: 'church-123', headId: 'lead-789' };
      return null;
    });

    await expect(
      (createBorrowRequest as any)._handler(mockCtx, {
        targetDeptId: 'dept-789' as any,
        targetVolunteerId: 'volunteer-456' as any,
        borrowType: 'inter_dept',
        role: 'Steward',
        count: 5,
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
      })
    ).rejects.toThrow('Target volunteer does not belong to the target department');
  });

  it('overrides count to 1 and inserts record if target volunteer is valid', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'DepartmentHead', departmentId: 'dept-123', churchId: 'church-123' };
      if (id === 'volunteer-456') return { _id: 'volunteer-456', name: 'John Doe', departmentId: 'dept-789' };
      if (id === 'dept-789') return { _id: 'dept-789', churchId: 'church-123', headId: 'lead-789', name: 'IT' };
      return null;
    });

    const result = await (createBorrowRequest as any)._handler(mockCtx, {
      targetDeptId: 'dept-789' as any,
      targetVolunteerId: 'volunteer-456' as any,
      borrowType: 'inter_dept',
      role: 'Steward',
      count: 5, // Should be overridden to 1
      startDate: Date.now(),
      endDate: Date.now() + 86400000,
    });

    expect(mockDb.insert).toHaveBeenCalledWith('borrowRequests', expect.objectContaining({
      targetVolunteerId: 'volunteer-456',
      count: 1, // Overridden
    }));
    expect(result).toEqual('request-id-123');
  });

  it('falls back to target department head if target subunit has no lead', async () => {
    vi.mocked(auth.getUserId).mockResolvedValue('admin-123' as any);
    mockDb.get.mockImplementation(async (id: string) => {
      if (id === 'admin-123') return { _id: 'admin-123', role: 'SubunitLead', departmentId: 'dept-123', subunitId: 'subunit-123', churchId: 'church-123' };
      if (id === 'subunit-999') return { _id: 'subunit-999', departmentId: 'dept-123', name: 'Prayer', leadId: undefined }; // No lead
      if (id === 'dept-123') return { _id: 'dept-123', churchId: 'church-123', headId: 'dept-head-123', name: 'A/V' };
      return null;
    });

    const result = await (createBorrowRequest as any)._handler(mockCtx, {
      targetDeptId: 'dept-123' as any,
      targetSubunitId: 'subunit-999' as any,
      borrowType: 'intra_dept',
      role: 'Intercessor',
      count: 2,
      startDate: Date.now(),
      endDate: Date.now() + 86400000,
    });

    expect(mockDb.insert).toHaveBeenCalledWith('borrowRequests', expect.objectContaining({
      targetUserId: 'dept-head-123', // Fell back to department head
      count: 2,
    }));
    expect(result).toEqual('request-id-123');
  });
});

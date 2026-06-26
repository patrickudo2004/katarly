import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useQuery, useMutation } from 'convex/react';
import { BorrowRequestTracker } from '../src/components/BorrowRequestTracker';

// Mock the generated api reference module
vi.mock('../convex/_generated/api', () => {
  return {
    api: {
      borrow: {
        getOutgoingBorrowRequests: 'borrow:getOutgoingBorrowRequests',
        cancelBorrowRequest: 'borrow:cancelBorrowRequest',
      }
    }
  };
});

// Mock convex react hooks
vi.mock('convex/react', () => {
  return {
    useQuery: vi.fn(),
    useMutation: vi.fn(() => vi.fn()),
  };
});

describe('BorrowRequestTracker outgoing request tracking component tests', () => {
  const mockCancelBorrowRequest = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useMutation).mockReturnValue(mockCancelBorrowRequest as any);

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('renders empty state when no outgoing borrow requests exist', () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<BorrowRequestTracker />);
    expect(screen.getByText('No help requests sent from your team.')).toBeInTheDocument();
  });

  it('renders outgoing requests and updates status details', async () => {
    const mockOutgoingRequests = [
      {
        _id: 'req-1',
        status: 'pending',
        targetDeptName: 'Music',
        targetSubunitName: 'Vocals',
        role: 'Singer',
        count: 1,
        startDate: new Date('2026-07-01').getTime(),
        endDate: new Date('2026-07-05').getTime(),
        note: 'Backup singer needed',
      },
      {
        _id: 'req-2',
        status: 'approved',
        targetDeptName: 'Media',
        targetSubunitName: 'Camera',
        role: 'Videographer',
        count: 2,
        startDate: new Date('2026-07-10').getTime(),
        endDate: new Date('2026-07-12').getTime(),
        assignments: [
          { _id: 'a-1', userName: 'John Doe', userEmail: 'john@church.org', status: 'active' },
          { _id: 'a-2', userName: 'Jane Smith', userEmail: 'jane@church.org', status: 'pending' },
        ],
      }
    ];

    vi.mocked(useQuery).mockReturnValue(mockOutgoingRequests);

    render(<BorrowRequestTracker />);

    // Check request count
    expect(screen.getByText('Sent Requests (2)')).toBeInTheDocument();

    // Check request 1 (pending) details
    expect(screen.getByText('Awaiting Lead Approval')).toBeInTheDocument();
    expect(screen.getByText(/Cancel/i)).toBeInTheDocument();

    // Expand request 1 accordion to see note
    const pendingHeader = screen.getByText('Awaiting Lead Approval').closest('div');
    if (pendingHeader) {
      fireEvent.click(pendingHeader);
    }
    expect(screen.getByText(/Backup singer needed/i)).toBeInTheDocument();

    // Check request 2 (approved) details
    expect(screen.getByText('Approved (Pending Volunteers)')).toBeInTheDocument();
    expect(screen.getByText('1/2 Confirmed')).toBeInTheDocument();

    // Expand request 2 accordion
    const approvedHeader = screen.getByText('Approved (Pending Volunteers)').closest('div');
    if (approvedHeader) {
      fireEvent.click(approvedHeader);
    }

    // Verify nominated volunteers and their statuses are rendered inside the body
    expect(screen.getByText('Nominated Volunteers & Confirmation Status')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Pending Accept')).toBeInTheDocument();
  });

  it('triggers cancel mutation when Cancel button is clicked', async () => {
    const mockOutgoingRequests = [
      {
        _id: 'req-1',
        status: 'pending',
        targetDeptName: 'Music',
        role: 'Drummer',
        count: 1,
        startDate: new Date('2026-07-01').getTime(),
        endDate: new Date('2026-07-05').getTime(),
      }
    ];

    vi.mocked(useQuery).mockReturnValue(mockOutgoingRequests);
    mockCancelBorrowRequest.mockResolvedValue({ success: true });

    render(<BorrowRequestTracker />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to cancel this borrow request?');
    expect(mockCancelBorrowRequest).toHaveBeenCalledWith({ requestId: 'req-1' });
  });
});

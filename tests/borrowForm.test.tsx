import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useQuery, useMutation } from 'convex/react';
import { BorrowRequestForm } from '../src/components/BorrowRequestForm';

// Mock the generated api reference module
vi.mock('../convex/_generated/api', () => {
  return {
    api: {
      users: {
        me: 'users:me',
      },
      departments: {
        getDepartments: 'departments:getDepartments',
      },
      subunits: {
        getSubunits: 'subunits:getSubunits',
      },
      borrow: {
        createBorrowRequest: 'borrow:createBorrowRequest',
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

describe('BorrowRequestForm validation and interaction', () => {
  const mockCreateBorrowRequest = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useMutation).mockReturnValue(mockCreateBorrowRequest as any);

    // Default mock data for queries
    vi.mocked(useQuery).mockImplementation((apiFunc: any) => {
      if (apiFunc === 'users:me') {
        return {
          _id: 'user-123',
          role: 'SubunitLead',
          departmentId: 'dept-123',
          subunitId: 'subunit-123',
          name: 'Lead User',
        };
      }
      if (apiFunc === 'departments:getDepartments') {
        return [
          { _id: 'dept-123', name: 'Media' },
          { _id: 'dept-456', name: 'Music' },
        ];
      }
      if (apiFunc === 'subunits:getSubunits') {
        return [
          { _id: 'subunit-123', departmentId: 'dept-123', name: 'Camera' },
          { _id: 'subunit-456', departmentId: 'dept-123', name: 'Sound' },
        ];
      }
      return null;
    });
  });

  it('displays validation error if intra-department request is submitted without target subunit', async () => {
    render(<BorrowRequestForm />);

    // Click "Within My Department" toggle
    const intraDeptButton = screen.getByText('Within My Department');
    fireEvent.click(intraDeptButton);

    // Set Role Needed
    const roleInput = screen.getByPlaceholderText('e.g. Sound Engineer, Camera Operator…');
    fireEvent.change(roleInput, { target: { value: 'Singer' } });

    // Set Start Date and End Date
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];
    
    fireEvent.change(startDateInput, { target: { value: '2026-07-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-02' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send Help Request/i });
    fireEvent.click(submitButton);

    // Verify validation error is displayed
    expect(
      screen.getByText('Please select the target subunit for an intra-department request.')
    ).toBeInTheDocument();

    // Verify mutation was not called
    expect(mockCreateBorrowRequest).not.toHaveBeenCalled();
  });

  it('submits form successfully and calls mutation with correct parameters for inter-department request', async () => {
    render(<BorrowRequestForm />);

    // Select Target Department (since we are on Inter-Department tab by default)
    const selectDept = screen.getByRole('combobox');
    fireEvent.change(selectDept, { target: { value: 'dept-456' } });

    // Select suggestion chip for Role Needed
    const chipButton = screen.getByRole('button', { name: 'Operator' });
    fireEvent.click(chipButton);

    // Enter Dates
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];
    fireEvent.change(startDateInput, { target: { value: '2026-07-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-05' } });

    // Enter Note
    const noteArea = screen.getByPlaceholderText(/Any context or specific requirements/i);
    fireEvent.change(noteArea, { target: { value: 'Need temporary help' } });

    // Submit Form
    const submitButton = screen.getByRole('button', { name: /Send Help Request/i });
    fireEvent.click(submitButton);

    // Verify mutation was invoked with correct arguments
    expect(mockCreateBorrowRequest).toHaveBeenCalledWith({
      targetDeptId: 'dept-456',
      targetSubunitId: undefined,
      borrowType: 'inter_dept',
      role: 'Operator',
      count: 1,
      startDate: new Date('2026-07-01').getTime(),
      endDate: new Date('2026-07-05').getTime(),
      note: 'Need temporary help',
    });
  });
});

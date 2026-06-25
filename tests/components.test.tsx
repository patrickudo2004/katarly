import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { useQuery } from 'convex/react';
import { ReportsPage } from '../src/pages/ReportsPage';
import { AttendancePage } from '../src/pages/AttendancePage';
import { MeetingsPage } from '../src/pages/MeetingsPage';
import { GuidesPage } from '../src/pages/GuidesPage';

// Mock the generated api reference module
vi.mock('../convex/_generated/api', () => {
  return {
    api: {
      users: {
        me: 'users:me',
      },
      meetings: {
        getMeetingsForUser: 'meetings:getMeetingsForUser',
        createMeeting: 'meetings:createMeeting',
        checkInToMeeting: 'meetings:checkInToMeeting',
      },
      departments: {
        getDepartments: 'departments:getDepartments',
      },
      churches: {
        getMyChurch: 'churches:getMyChurch',
        getAdvancedAnalytics: 'churches:getAdvancedAnalytics',
      },
      services: {
        getDailyServices: 'services:getDailyServices',
        getRecentServices: 'services:getRecentServices',
      },
      attendance: {
        getLatestVerificationStatus: 'attendance:getLatestVerificationStatus',
        markAttendance: 'attendance:markAttendance',
        requestVerification: 'attendance:requestVerification',
        getHistoricalAttendance: 'attendance:getHistoricalAttendance',
      },
      reports: {
        getLiveFloorCoverage: 'reports:getLiveFloorCoverage',
        getBurnoutAlerts: 'reports:getBurnoutAlerts',
        getSafeguardingAudit: 'reports:getSafeguardingAudit',
        getSubunitLeaderboards: 'reports:getSubunitLeaderboards',
        getProbationStatusList: 'reports:getProbationStatusList',
        getMeetingAnalytics: 'reports:getMeetingAnalytics',
        getMeetingsReportList: 'reports:getMeetingsReportList',
        getShiftSwapAnalytics: 'reports:getShiftSwapAnalytics',
      },
      subunits: {
        getSubunits: 'subunits:getSubunits',
      },
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

// Mock Recharts to avoid JS/Canvas rendering issues in JSDOM
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <div>{children}</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    ComposedChart: ({ children }: any) => <div>{children}</div>,
    Line: () => null,
    Bar: () => null,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: () => null,
    Cell: () => null,
  };
});

// Mock HTML5-QRCode scanner
vi.mock('html5-qrcode', () => {
  return {
    Html5QrcodeScanner: vi.fn().mockImplementation(() => {
      return {
        render: vi.fn(),
        clear: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('Page Smoke Tests', () => {
  it('renders ReportsPage without crashing for SuperAdmin', () => {
    vi.mocked(useQuery).mockImplementation((apiFunc: any) => {
      // Mock me query
      if (apiFunc === 'users:me') {
        return {
          _id: 'user-123',
          role: 'SuperAdmin',
          name: 'Admin User',
          departmentId: 'dept-123',
        };
      }
      // Return mock lists for leaderboards, compliance, departments, etc.
      if (apiFunc === 'reports:getSubunitLeaderboards') {
        return [];
      }
      if (apiFunc === 'departments:getDepartments') {
        return [{ _id: 'dept-123', name: 'Media' }];
      }
      return [];
    });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    // Verify it doesn't go blank or throw errors by checking for a known tab or text
    expect(screen.getAllByText(/Trends/i).length).toBeGreaterThan(0);
  });

  it('renders AttendancePage without crashing', () => {
    vi.mocked(useQuery).mockImplementation((apiFunc: any) => {
      if (apiFunc === 'churches:getMyChurch') {
        return {
          _id: 'church-123',
          name: 'Main Church Campus',
          geolocation: { latitude: 6.5244, longitude: 3.3792, radius: 100 },
        };
      }
      if (apiFunc === 'services:getDailyServices') {
        return [
          {
            _id: 'service-123',
            name: 'Sunday Morning Service',
            startTime: Date.now() - 1800000,
            endTime: Date.now() + 1800000,
          },
        ];
      }
      return null;
    });

    render(
      <MemoryRouter>
        <AttendancePage />
      </MemoryRouter>
    );

    // Verify scan step/title
    expect(screen.getByText(/Scan Service QR Code/i)).toBeInTheDocument();
  });

  it('renders MeetingsPage for DepartmentHead', () => {
    vi.mocked(useQuery).mockImplementation((apiFunc: any) => {
      if (apiFunc === 'users:me') {
        return {
          _id: 'user-123',
          role: 'DepartmentHead',
          name: 'Dept Head User',
          departmentId: 'dept-123',
        };
      }
      if (apiFunc === 'meetings:getMeetingsForUser') {
        return [
          {
            _id: 'meeting-123',
            name: 'Staff Sync Meeting',
            description: 'Weekly checkin',
            scope: 'Departmental',
            startTime: Date.now(),
            endTime: Date.now() + 3600000,
            format: 'Online',
            platform: 'Teams',
            meetingUrl: 'https://teams.microsoft.com/l/meetup-join/test',
            createdBy: 'user-123',
          },
        ];
      }
      if (apiFunc === 'departments:getDepartments') {
        return [{ _id: 'dept-123', name: 'Media' }];
      }
      return [];
    });

    render(
      <MemoryRouter>
        <MeetingsPage />
      </MemoryRouter>
    );

    // Verify meeting card name renders
    expect(screen.getByText(/Staff Sync Meeting/i)).toBeInTheDocument();
  });

  it('renders GuidesPage and shows volunteer-scoped tabs', () => {
    vi.mocked(useQuery).mockImplementation((apiFunc: any) => {
      if (apiFunc === 'users:me') {
        return {
          _id: 'user-123',
          role: 'Volunteer',
          name: 'Volunteer User',
        };
      }
      return null;
    });

    render(
      <MemoryRouter>
        <GuidesPage />
      </MemoryRouter>
    );

    // Volunteer tab buttons and guide items should render
    expect(screen.getByText(/Volunteer Guides/i)).toBeInTheDocument();
    expect(screen.queryByText(/System Admin Guides/i)).not.toBeInTheDocument();
  });
});

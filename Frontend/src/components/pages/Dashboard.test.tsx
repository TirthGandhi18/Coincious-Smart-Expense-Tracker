import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard'; // Ensure default or named import matches your component
import { MemoryRouter } from 'react-router-dom';

// --- 1. Hoisted Mocks (Must be at TOP LEVEL) ---
// We define functions here so we can control them inside our tests
const mocks = vi.hoisted(() => {
  // Create a chainable mock for Supabase
  const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const orderMock = vi.fn(() => ({ limit: limitMock }));
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock, order: orderMock, limit: limitMock }));
  // Note: We return specific mocks we need to control in tests
  return {
    navigate: vi.fn(),
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      default: vi.fn(),
    },
    // Expose the chain functions so we can manipulate return values in tests
    selectMock,
    limitMock, 
  };
});

// --- 2. Mock External Libraries ---

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('sonner', () => ({
  toast: Object.assign(mocks.toast.default, mocks.toast),
}));

vi.mock('recharts', () => {
  const MockChart = ({ children }: any) => <div data-testid="chart">{children}</div>;
  return {
    ResponsiveContainer: MockChart,
    PieChart: MockChart,
    Pie: () => <div data-testid="pie-slice" />,
    Cell: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
  };
});

// --- 3. Mock Hooks and Context ---

vi.mock('../../App', () => {
  // Define userMock INSIDE the factory to avoid hoisting errors
  const userMock = { id: 'test-user-123', email: 'test@example.com' };
  
  return {
    useAuth: () => ({
      user: userMock,
      supabase: {
        from: vi.fn(() => ({
          select: mocks.selectMock, // Connect to our hoisted mock
        })),
      },
    }),
  };
});

// Mock Utils (Only mock what actually exists)
vi.mock('../../lib/utils', () => ({
  cn: (...args: any[]) => args.join(' '),
  formatCurrency: (amount: number) => `$${amount}`,
  // Removed fetchDashboardData as it likely doesn't exist in the real file
}));

// --- 4. Tests ---

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default success state for the supabase chain
    mocks.limitMock.mockResolvedValue({ 
      data: [], 
      error: null 
    });
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
  };

  it('shows loading state initially', () => {
    // Simulate a pending promise to keep it in "loading" state
    mocks.selectMock.mockReturnValue({
      eq: vi.fn().mockReturnValue({
         order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(new Promise(() => {})) // Never resolves
         })
      })
    } as any);

    renderDashboard();
    // Note: You might need to adjust the text matcher if your loader doesn't literally say "Loading"
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders dashboard content after data loads', async () => {
    // Mock the specific data structure your Dashboard expects from Supabase
    // WARNING: You must match the exact shape your component expects (e.g., expenses table)
    mocks.limitMock.mockResolvedValue({
      data: [
        { id: 1, description: 'Grocery', amount: 50, created_at: '2023-10-01', category: 'Food' },
      ],
      error: null,
    });

    renderDashboard();

    // Adjust this text to match your actual Dashboard header
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Check for elements that should exist
    expect(screen.getByText(/Grocery/)).toBeInTheDocument();
    expect(screen.getByText(/\$50/)).toBeInTheDocument();
  });

  it('displays the "Add Expense" button and navigates on click', async () => {
    mocks.limitMock.mockResolvedValue({ data: [], error: null });

    renderDashboard();
    
    // Wait for loading to finish
    await waitFor(() => screen.queryByText(/Loading/i));

    // Wait for the button (it might be hidden while loading)
    const addBtn = await screen.findByText(/Add Expense/i);
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);
    expect(mocks.navigate).toHaveBeenCalledWith('/add-expense');
  });

  it('handles API errors gracefully', async () => {
    // Simulate Supabase error
    mocks.limitMock.mockResolvedValue({
      data: null,
      error: { message: 'API Failure' },
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed'));
  });

  it('navigates to groups page when "Manage Groups" is clicked', async () => {
    mocks.limitMock.mockResolvedValue({ data: [], error: null });

    renderDashboard();
    
    // Use findByText to wait for the element to appear
    const groupBtn = await screen.findByText(/Groups/i); 
    fireEvent.click(groupBtn);
    
    expect(mocks.navigate).toHaveBeenCalledWith('/groups');
  });
});
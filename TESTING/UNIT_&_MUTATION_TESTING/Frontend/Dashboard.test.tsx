import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Dashboard } from './Dashboard';
import { BrowserRouter } from 'react-router-dom';
import * as AppContext from '../../App';

// --- Helper to create a thenable builder for Supabase ---
const createSupabaseBuilder = (mockData: any = [], mockError: any = null) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    single: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    insert: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    upsert: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    delete: vi.fn().mockReturnThis(),
  };

  // Make the builder thenable so it can be awaited directly
  Object.defineProperty(builder, 'then', {
    value: (resolve: any, reject: any) => {
      return Promise.resolve({ data: mockData, error: mockError }).then(resolve, reject);
    },
    writable: true,
  });

  return builder;
};

// --- Hoisted Mocks ---
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  supabaseRpc: vi.fn(),
  supabaseFrom: vi.fn(),
  supabaseGetSession: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastCustom: vi.fn(),
}));

// --- Mock Modules ---

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container" style={{ width: '100%', height: '100%' }}>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => <div data-testid="pie">{data?.map((d: any) => <div key={d.name}>{d.name}: {d.value}</div>)}</div>,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}));

// Mock Supabase
vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.supabaseGetSession,
    },
    from: mocks.supabaseFrom,
    rpc: mocks.supabaseRpc,
  },
}));

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    custom: mocks.toastCustom,
  },
}));

// Mock useAuth
vi.mock('../../App', () => ({
  useAuth: vi.fn(),
}));

// Mock React Router
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  DollarSign: () => <span>DollarSign</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  Plus: () => <span>Plus</span>,
  ArrowUpRight: () => <span>ArrowUpRight</span>,
  ArrowDownRight: () => <span>ArrowDownRight</span>,
  Target: () => <span>Target</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  Calendar: () => <span>Calendar</span>,
  Loader2: () => <span>Loader2</span>,
  Pencil: () => <span>Pencil</span>,
  X: () => <span>X</span>,
}));

describe('Dashboard Component', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup useAuth
    (AppContext.useAuth as any).mockReturnValue({ user: mockUser });

    // Setup Supabase Session
    mocks.supabaseGetSession.mockResolvedValue({ data: { session: { access_token: 'mock-token' } } });

    // Setup Supabase RPC defaults
    mocks.supabaseRpc.mockImplementation((fnName) => {
      if (fnName === 'get_user_owe_amount') return Promise.resolve({ data: 100 });
      if (fnName === 'calculate_you_owed') return Promise.resolve({ data: 50 });
      return Promise.resolve({ data: 0 });
    });

    // Setup Supabase From defaults
    mocks.supabaseFrom.mockImplementation((table) => {
      if (table === 'budgets') {
        return createSupabaseBuilder({ amount_limit: 2000, goal_amount: 500 });
      }
      return createSupabaseBuilder([]);
    });

    // Setup Global Fetch
    global.fetch = vi.fn().mockImplementation((url) => {
      const urlString = String(url);

      if (urlString.includes('/api/current-month-total')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ total: 1200 }),
        });
      }

      if (urlString.includes('/api/expense_monthly_donut')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            { category: 'Food', total: 150 },
            { category: 'Transport', total: 50 },
          ]),
        });
      }

      if (urlString.includes('/api/expenses/range')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            { id: '1', title: 'Lunch', amount: 50, date: '2024-04-10', category: 'Food' },
            { id: '2', title: 'Bus', amount: 20, date: '2024-04-11', category: 'Transport' },
          ]),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ([]),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('renders dashboard with initial data', async () => {
    renderComponent();

    // Check Header
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText("Welcome back! Here's your financial overview.")).toBeInTheDocument();

    // Check Stats Cards
    await waitFor(() => {
      expect(screen.getByText('Total Expenses')).toBeInTheDocument();
      const totalExpenses = screen.getAllByText('₹1200.00');
      expect(totalExpenses.length).toBeGreaterThan(0);
      expect(totalExpenses[0]).toBeInTheDocument();
    });

    // Check Balances
    await waitFor(() => {
      expect(screen.getByText('You Owe')).toBeInTheDocument();
      const oweAmounts = screen.getAllByText('₹100.00');
      expect(oweAmounts.length).toBeGreaterThan(0);

      expect(screen.getByText('You Are Owed')).toBeInTheDocument();
      const owedAmounts = screen.getAllByText('₹50.00');
      expect(owedAmounts.length).toBeGreaterThan(0);
    });

    // Check Budget & Savings
    await waitFor(() => {
      expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
      const budgetDisplays = screen.getAllByText('₹2000.00');
      expect(budgetDisplays.length).toBeGreaterThan(0);

      expect(screen.getByText('Monthly Savings')).toBeInTheDocument();
      const savingsDisplays = screen.getAllByText('₹800.00');
      expect(savingsDisplays.length).toBeGreaterThan(0);
    });
  });

  it('toggles date picker modal', async () => {
    renderComponent();

    const calendarBtn = screen.getByLabelText('Open date range picker');
    fireEvent.click(calendarBtn);

    expect(screen.getByText('Select Date Range')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close modal backdrop');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Select Date Range')).not.toBeInTheDocument();
    });
  });

  it('displays category chart data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Expense Categories')).toBeInTheDocument();
      expect(screen.getByText('Food: 150')).toBeInTheDocument();
      expect(screen.getByText('Transport: 50')).toBeInTheDocument();
    });
  });

  it('handles budget editing', async () => {
    renderComponent();

    await waitFor(() => screen.getAllByText('₹2000.00'));

    const budgetTitle = screen.getByText('Monthly Budget');
    const cardHeader = budgetTitle.closest('.flex-row');
    const editBtn = within(cardHeader as HTMLElement).getByRole('button');

    fireEvent.click(editBtn);

    const input = screen.getByPlaceholderText('e.g. 2000');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '3000' } });

    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mocks.supabaseFrom).toHaveBeenCalledWith('budgets');
    });

    await waitFor(() => {
      const updatedBudget = screen.getAllByText('₹3000.00');
      expect(updatedBudget.length).toBeGreaterThan(0);
    });
  });

  it('handles savings goal modal', async () => {
    renderComponent();

    const savingsTitle = screen.getByText('Monthly Savings');
    const savingsHeader = savingsTitle.closest('.flex-row');
    const editGoalBtn = within(savingsHeader as HTMLElement).getByRole('button');

    fireEvent.click(editGoalBtn);

    expect(screen.getByText('Set Monthly Savings Goal')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('e.g. 2000');
    fireEvent.change(input, { target: { value: '1000' } });

    const saveBtn = screen.getByText('Save Goal');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Goal saved');
      expect(screen.queryByText('Set Monthly Savings Goal')).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (String(url).includes('/api/current-month-total')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, json: async () => ([]) });
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    renderComponent();

    await waitFor(() => {
      const zeros = screen.getAllByText('₹0.00');
      expect(zeros.length).toBeGreaterThan(0);
    });

    consoleSpy.mockRestore();
  });

  it('handles goal clearing', async () => {
    renderComponent();

    const savingsTitle = screen.getByText('Monthly Savings');
    const savingsHeader = savingsTitle.closest('.flex-row');
    const editGoalBtn = within(savingsHeader as HTMLElement).getByRole('button');
    fireEvent.click(editGoalBtn);

    const clearBtn = screen.getByText('Clear Goal');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Goal cleared');
      expect(screen.queryByText('Set Monthly Savings Goal')).not.toBeInTheDocument();
    });
  });

  it('shows budget warning toast when usage is high', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (String(url).includes('/api/current-month-total')) {
        return Promise.resolve({ ok: true, json: async () => ({ total: 1700 }) });
      }
      if (String(url).includes('/api/expense_monthly_donut')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (String(url).includes('/api/expenses/range')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderComponent();

    await waitFor(() => {
      expect(mocks.toastCustom).toHaveBeenCalled();
    });
  });

  it('handles date picker interactions', async () => {
    renderComponent();

    const calendarBtn = screen.getByLabelText('Open date range picker');
    fireEvent.click(calendarBtn);

    await waitFor(() => {
      expect(screen.getByText('Select Date Range')).toBeInTheDocument();
    });

    const dayButtons = screen.getAllByText('15');
    const dayBtn = dayButtons.find(el => el.tagName === 'SPAN' && el.parentElement?.tagName === 'BUTTON');

    if (dayBtn) {
      fireEvent.click(dayBtn);
    } else {
      fireEvent.click(dayButtons[0]);
    }

    const applyBtn = screen.getByText('Apply');
    expect(applyBtn).not.toBeDisabled();

    const clearBtn = screen.getByText('Clear');
    fireEvent.click(clearBtn);

    expect(applyBtn).toBeDisabled();

    if (dayBtn) {
      fireEvent.click(dayBtn);
    } else {
      fireEvent.click(dayButtons[0]);
    }

    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.queryByText('Select Date Range')).not.toBeInTheDocument();
    });
  });

  it('validates goal input', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

    renderComponent();

    const savingsTitle = screen.getByText('Monthly Savings');
    const savingsHeader = savingsTitle.closest('.flex-row');
    const editGoalBtn = within(savingsHeader as HTMLElement).getByRole('button');
    fireEvent.click(editGoalBtn);

    const input = screen.getByPlaceholderText('e.g. 2000');
    fireEvent.change(input, { target: { value: '0' } });

    const saveBtn = screen.getByText('Save Goal');
    fireEvent.click(saveBtn);

    expect(alertSpy).toHaveBeenCalledWith('Enter a valid goal > 0');

    alertSpy.mockRestore();
  });
});
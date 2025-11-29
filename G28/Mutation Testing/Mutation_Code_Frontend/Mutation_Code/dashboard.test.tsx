import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Dashboard } from './Dashboard';
import { BrowserRouter } from 'react-router-dom';
import * as AppContext from '../../App';

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
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data }: any) => <div data-testid="pie">{data?.map((d: any) => <div key={d.name}>{d.name}: {d.value}</div>)}</div>,
    Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
    Tooltip: () => <div data-testid="tooltip" />,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    Area: () => <div data-testid="area" />,
}));

vi.mock('../../utils/supabase/client', () => ({
    supabase: {
        auth: { getSession: mocks.supabaseGetSession },
        from: mocks.supabaseFrom,
        rpc: mocks.supabaseRpc,
    },
}));

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
        custom: mocks.toastCustom,
    },
}));

vi.mock('../../App', () => ({
    useAuth: vi.fn(),
}));

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
        localStorage.clear();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        (AppContext.useAuth as any).mockReturnValue({ user: mockUser });
        mocks.supabaseGetSession.mockResolvedValue({ data: { session: { access_token: 'mock-token' } } });

        mocks.supabaseRpc.mockImplementation((fnName) => {
            if (fnName === 'get_user_owe_amount') return Promise.resolve({ data: 100 });
            if (fnName === 'calculate_you_owed') return Promise.resolve({ data: 50 });
            return Promise.resolve({ data: 0 });
        });

        const createBuilder = (data: any) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
            single: vi.fn().mockResolvedValue({ data, error: null }),
            insert: vi.fn().mockResolvedValue({ data, error: null }),
            upsert: vi.fn().mockResolvedValue({ data, error: null }),
            delete: vi.fn().mockReturnThis(),
        });

        mocks.supabaseFrom.mockImplementation((table) => {
            if (table === 'budgets') return createBuilder({ amount_limit: 2000, goal_amount: 500 });
            return createBuilder([]);
        });

        global.fetch = vi.fn().mockImplementation((url) => {
            const urlString = String(url);
            if (urlString.includes('/api/current-month-total')) return Promise.resolve({ ok: true, json: async () => ({ total: 1200 }) });
            if (urlString.includes('/api/expense_monthly_donut')) return Promise.resolve({ ok: true, json: async () => ([{ category: 'Food', total: 150 }]) });
            if (urlString.includes('/api/expenses/range')) return Promise.resolve({ ok: true, json: async () => ([{ id: '1', title: 'Lunch', amount: 50, date: '2024-04-10', category: 'Food' }]) });
            return Promise.resolve({ ok: true, json: async () => ([]) });
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const renderComponent = () => render(<BrowserRouter><Dashboard /></BrowserRouter>);

    it('renders exact static text', async () => {
        renderComponent();
        expect(screen.getByText("Welcome back! Here's your financial overview.")).toBeInTheDocument();
        expect(screen.getByText('Total Expenses')).toBeInTheDocument();
        expect(screen.getByText('Your spending breakdown')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText("This month's total")).toBeInTheDocument());
    });

    it('formats currency exactly', async () => {
        renderComponent();
        await waitFor(() => {
            expect(screen.getAllByText('₹1200.00').length).toBeGreaterThan(0);
            expect(screen.getAllByText('₹100.00').length).toBeGreaterThan(0);
            expect(screen.getAllByText('₹50.00').length).toBeGreaterThan(0);
        });
    });

    it('displays correct budget status (Remaining)', async () => {
        renderComponent();
        await waitFor(() => expect(mocks.supabaseFrom).toHaveBeenCalledWith('budgets'));
        await waitFor(() => {
            expect(screen.getByText(/Remaining budget:/)).toBeInTheDocument();
            expect(screen.getAllByText('₹800.00').length).toBeGreaterThan(0);
        });
    });

    it('displays correct budget status (Over budget)', async () => {
        const createBuilder = (data: any) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
            single: vi.fn().mockResolvedValue({ data, error: null }),
            insert: vi.fn().mockResolvedValue({ data, error: null }),
            upsert: vi.fn().mockResolvedValue({ data, error: null }),
            delete: vi.fn().mockReturnThis(),
        });

        mocks.supabaseFrom.mockImplementation((table) => {
            if (table === 'budgets') return createBuilder({ amount_limit: 1000, goal_amount: 500 });
            return createBuilder([]);
        });

        renderComponent();
        await waitFor(() => expect(mocks.supabaseFrom).toHaveBeenCalledWith('budgets'));
        await waitFor(() => {
            expect(screen.getByText(/Over budget by:/)).toBeInTheDocument();
            expect(screen.getAllByText('₹200.00').length).toBeGreaterThan(0);
        });
    });

    it('handles empty category data', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            const urlString = String(url);
            if (urlString.includes('/api/expense_monthly_donut')) return Promise.resolve({ ok: true, json: async () => [] });
            if (urlString.includes('/api/expenses/range')) return Promise.resolve({ ok: true, json: async () => [] });
            return Promise.resolve({ ok: true, json: async () => ({ total: 0 }) });
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('No data for this month')).toBeInTheDocument();
        });
    });

    it('handles category fetch error', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            const urlString = String(url);
            if (urlString.includes('/api/expense_monthly_donut')) return Promise.resolve({ ok: false, status: 500, text: async () => 'Server Error' });
            if (urlString.includes('/api/expenses/range')) return Promise.resolve({ ok: true, json: async () => [] });
            return Promise.resolve({ ok: true, json: async () => ({ total: 0 }) });
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('Error: Failed to fetch monthly totals: Server Error')).toBeInTheDocument();
        });
    });

    it('handles date picker range selection logic', async () => {
        renderComponent();
        const calendarBtn = screen.getByLabelText('Open date range picker');
        fireEvent.click(calendarBtn);
        await waitFor(() => expect(screen.getByText('Select Date Range')).toBeInTheDocument());

        const day15 = screen.getAllByText('15').find(el => el.tagName === 'SPAN')?.parentElement;
        const day20 = screen.getAllByText('20').find(el => el.tagName === 'SPAN')?.parentElement;

        if (day15 && day20) {
            fireEvent.click(day15);
            fireEvent.click(day20);

            const applyBtn = screen.getByText('Apply');
            expect(applyBtn).not.toBeDisabled();
            fireEvent.click(applyBtn);
        }
    });

    it('handles sidebar empty state', async () => {
        renderComponent();
        const calendarBtn = screen.getByLabelText('Open date range picker');
        fireEvent.click(calendarBtn);
        await waitFor(() => expect(screen.getByText('Select dates')).toBeInTheDocument());
        expect(screen.getByText('No expenses found')).toBeInTheDocument();
        expect(screen.getByText('Try selecting a different range')).toBeInTheDocument();
    });

    it('validates budget input > 0', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        renderComponent();
        await waitFor(() => screen.getAllByText('₹2000.00'));

        const budgetTitle = screen.getByText('Monthly Budget');
        const editBtn = within(budgetTitle.closest('.flex-row') as HTMLElement).getByRole('button');
        fireEvent.click(editBtn);

        const input = screen.getByPlaceholderText('e.g. 2000');
        fireEvent.change(input, { target: { value: '0' } });
        fireEvent.click(screen.getByText('Save'));

        expect(alertSpy).toHaveBeenCalledWith('Enter a valid budget > 0');
        alertSpy.mockRestore();
    });

    it('handles budget save failure', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const createBuilder = (data: any) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
            single: vi.fn().mockResolvedValue({ data, error: null }),
            insert: vi.fn().mockResolvedValue({ data, error: null }),
            upsert: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } }),
            delete: vi.fn().mockReturnThis(),
        });

        mocks.supabaseFrom.mockImplementation((table) => {
            if (table === 'budgets') return createBuilder({ amount_limit: 2000, goal_amount: 500 });
            return createBuilder([]);
        });

        renderComponent();
        await waitFor(() => screen.getAllByText('₹2000.00'));

        const budgetTitle = screen.getByText('Monthly Budget');
        const editBtn = within(budgetTitle.closest('.flex-row') as HTMLElement).getByRole('button');
        fireEvent.click(editBtn);

        const input = screen.getByPlaceholderText('e.g. 2000');
        fireEvent.change(input, { target: { value: '3000' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(screen.getAllByText('₹3000.00').length).toBeGreaterThan(0);
        });
        consoleSpy.mockRestore();
    });

    it('handles goal save success', async () => {
        renderComponent();
        const savingsTitle = screen.getByText('Monthly Savings');
        const editBtn = within(savingsTitle.closest('.flex-row') as HTMLElement).getByRole('button');
        fireEvent.click(editBtn);

        const input = screen.getByPlaceholderText('e.g. 2000');
        fireEvent.change(input, { target: { value: '1500' } });
        fireEvent.click(screen.getByText('Save Goal'));

        await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Goal saved'));
    });
});
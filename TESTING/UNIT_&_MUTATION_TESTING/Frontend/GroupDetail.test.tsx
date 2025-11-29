import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroupDetail } from './GroupDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as AppContext from '../../App'; // Import the module to mock useAuth
import { supabase } from '../../utils/supabase/client';

// --- Mocks ---

// Mock specific icons from lucide-react if necessary, though usually not strictly required for unit logic
// We rely on the fact that they render as SVGs.

// Mock Supabase Client
vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock Sonner Toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock ResizeObserver (required for some Radix UI components like Tabs)
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Mock ScrollIntoView (often missing in JSDOM)
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock PointerEvent (required for Radix UI)
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;
  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}
window.PointerEvent = MockPointerEvent as any;
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

// --- Constants & Fixtures ---

const MOCK_GROUP_ID = 'group-123';
const MOCK_USER_ID = 'user-1';
const MOCK_TOKEN = 'fake-access-token';

const mockUser = {
  id: MOCK_USER_ID,
  email: 'test@example.com',
  name: 'Test User',
  avatar: '',
};

const mockGroupData = {
  group: {
    id: MOCK_GROUP_ID,
    name: 'Test Group',
    description: 'A test group',
    created_at: '2023-01-01',
    lastActivity: '2 hours ago',
  },
  total_expenses: 150.50,
};

const mockMembersData = {
  members: [
    { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar: '', balance: 30 },
    { id: 'user-2', name: 'Alice', email: 'alice@example.com', avatar: '', balance: -30 },
  ],
};

const mockExpensesData = {
  expenses: [
    {
      id: 'exp-1',
      description: 'Lunch',
      amount: '50.00', // API often returns string for decimals
      notes: 'Team lunch',
      category: 'Food & Dining',
      date: '2023-01-02T12:00:00Z',
      paid_by: { id: 'user-1', name: 'Test User' },
      split_among: [{ id: 'user-2' }],
      receipt_url: null,
    },
    {
      id: 'exp-2',
      description: 'Taxi',
      amount: '20.00',
      notes: '',
      category: 'Transportation',
      date: '2023-01-03T12:00:00Z',
      paid_by: { id: 'user-2', name: 'Alice' },
      split_among: [{ id: 'user-1' }],
      receipt_url: 'http://example.com/receipt.jpg',
    },
  ],
};

const mockBalancesData = {
  balances: [
    { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar: '', balance: 30 },
    { id: 'user-2', name: 'Alice', email: 'alice@example.com', avatar: '', balance: -30 },
  ],
  settlements: [
    {
      from_id: 'user-2',
      from_name: 'Alice',
      to_id: 'user-1',
      to_name: 'Test User',
      amount: 30.00,
    },
  ],
};

// --- Test Suite ---

describe('GroupDetail Component', () => {
  // Setup global fetch mock
  const fetchMock = vi.fn();
  global.fetch = fetchMock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Auth Hook
    vi.spyOn(AppContext, 'useAuth').mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      signInWithProvider: vi.fn(),
    });

    // Mock Supabase Session
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to setup the fetch mock for successful responses
  const setupSuccessFetch = () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMembersData),
        });
      }
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBalancesData),
        });
      }
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGroupData),
        });
      }
      if (url.includes('/api/expenses')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockExpensesData),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  };

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={[`/groups/${MOCK_GROUP_ID}`]}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    // Intentionally do not resolve fetch immediately to see loading
    fetchMock.mockImplementation(() => new Promise(() => { }));

    renderComponent();
    expect(screen.getByText(/Loading group data/i)).toBeInTheDocument();
  });

  it('renders group data and expenses successfully', async () => {
    setupSuccessFetch();
    renderComponent();

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/Loading group data/i)).not.toBeInTheDocument();
    });

    // Check Header
    expect(screen.getByText('Test Group')).toBeInTheDocument();

    // Check Summary Cards
    // Total Expenses: 150.50 -> Formatted
    expect(screen.getByText(/\$150.50/)).toBeInTheDocument();

    // Check Expenses Tab (default)
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    expect(screen.getByText(/\$50.00/)).toBeInTheDocument();

    // Check Category Icon rendering (simplified check for presence)
    expect(screen.getByText('🍽️')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock fetch error
    fetchMock.mockRejectedValue(new Error('Network Error'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load group data/i)).toBeInTheDocument();
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
    });

    // Test Retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Setup success for retry
    setupSuccessFetch();
    const user = userEvent.setup();
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
  });

  it('displays correct balance formatting and logic', async () => {
    setupSuccessFetch();
    renderComponent();
    await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

    // Switch to Members tab to check detailed balance text
    const user = userEvent.setup();
    const membersTab = await screen.findByRole('tab', { name: /members/i });
    await user.click(membersTab);

    // User-1 has +30 balance
    // Scope to the Members tab panel to avoid finding the same text in the hidden Balances tab
    // We find the active tabpanel using data-state="active" (Radix UI standard)
    const membersPanel = await waitFor(() => {
      const panels = screen.getAllByRole('tabpanel');
      const activePanel = panels.find(p => p.getAttribute('data-state') === 'active');
      if (!activePanel) throw new Error('No active tabpanel found');
      return activePanel;
    });

    const positiveBalance = within(membersPanel).getByText(/\+\$30.00/);
    expect(positiveBalance).toBeInTheDocument();
    expect(positiveBalance).toHaveClass('text-green-600');
    expect(within(membersPanel).getByText('is owed')).toBeInTheDocument();

    // User-2 has -30 balance
    const negativeBalance = within(membersPanel).getByText(/-\$30.00/);
    expect(negativeBalance).toBeInTheDocument();
    expect(negativeBalance).toHaveClass('text-red-600');
  });

  it('opens "Add Member" dialog when button is clicked', async () => {
    setupSuccessFetch();
    renderComponent();
    await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

    const addMemberBtn = screen.getByRole('button', { name: /add member/i });
    const user = userEvent.setup();
    await user.click(addMemberBtn);

    // Assuming AddMemberDialog renders into the body or a portal
    // We check for some text likely to be in the dialog title
    await waitFor(() => {
      // Note: Since we are not mocking the internal implementation of AddMemberDialog 
      // but using the real component (imported), we expect its content to appear.
      // If the dialog content is completely hidden or complex, checking for role dialog is standard.
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('opens "Settle Up" dialog when button is clicked', async () => {
    setupSuccessFetch();

    // Override balances so that user-1 (Test User) owes user-2 (Alice)
    // This ensures the "Settle Up" button is visible for user-1
    const settlementWhereUserOwes = {
      from_id: 'user-1', // User-1 owes
      from_name: 'Test User',
      to_id: 'user-2',
      to_name: 'Alice',
      amount: 30.00,
    };

    fetchMock.mockImplementation((url) => {
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            balances: mockBalancesData.balances,
            settlements: [settlementWhereUserOwes]
          }),
        });
      }
      // Default others
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
      if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
      return Promise.resolve({ ok: false });
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

    // Go to Balances tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /balances/i }));

    // Find "Settle Up" button
    const settleUpBtn = screen.getByRole('button', { name: /settle up/i });
    expect(settleUpBtn).toBeInTheDocument();
    await user.click(settleUpBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('handles empty expenses state', async () => {
    setupSuccessFetch();
    // Override expenses to be empty
    fetchMock.mockImplementation((url) => {
      if (url.includes('/api/expenses')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ expenses: [] }) });
      }
      // Default other mocks
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
      return Promise.resolve({ ok: false });
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

    expect(screen.getByText(/No expenses yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Add First Expense/i)).toBeInTheDocument();
  });

  it('handles empty settlements state', async () => {
    setupSuccessFetch();
    // Override balances to have no settlements
    fetchMock.mockImplementation((url) => {
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ balances: mockBalancesData.balances, settlements: [] }) });
      }
      // Default others
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
      if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
      if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
      return Promise.resolve({ ok: false });
    });

    renderComponent();
    await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /balances/i }));

    await waitFor(() => {
      expect(screen.getByText(/All balances are settled!/i)).toBeInTheDocument();
    });
  });

  it('updates active tab if URL search param changes', async () => {
    setupSuccessFetch();

    // Render with initial entry having ?tab=balances
    render(
      <MemoryRouter initialEntries={[`/groups/${MOCK_GROUP_ID}?tab=balances`]}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

    // Check if Balances tab content is shown initially
    await waitFor(() => {
      expect(screen.getByText(/Individual Balances/i)).toBeInTheDocument();
    });
  });

});
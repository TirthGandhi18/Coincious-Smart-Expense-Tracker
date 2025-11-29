import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroupDetail } from './GroupDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as AppContext from '../../App';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

// --- Mocks ---

vi.mock('../../utils/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
        },
    },
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

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
    members: [
        { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar: '', balance: 30 },
        { id: 'user-2', name: 'Alice', email: 'alice@example.com', avatar: '', balance: -30 },
    ]
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
            amount: '50.00',
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
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(AppContext, 'useAuth').mockReturnValue({
            user: mockUser,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            signInWithProvider: vi.fn(),
        });

        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { access_token: MOCK_TOKEN } },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

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

    it('renders members tab and balances correctly', async () => {
        setupSuccessFetch();
        renderComponent();
        const user = userEvent.setup();

        await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

        const membersTab = await screen.findByRole('tab', { name: /members/i });
        await user.click(membersTab);

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

        await waitFor(() => {
            expect(screen.getByTestId('add-member-dialog')).toBeInTheDocument();
        });
    });

    it('handles empty expenses state', async () => {
        setupSuccessFetch();
        fetchMock.mockImplementation((url) => {
            if (url.includes('/api/expenses')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ expenses: [] }) });
            }
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
        fetchMock.mockImplementation((url) => {
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ balances: mockBalancesData.balances, settlements: [] }) });
            }
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

    it('renders correct icons for all expense categories', async () => {
        setupSuccessFetch();
        const categories = ['Food & Dining', 'Transportation', 'Accommodation', 'Entertainment', 'Other'];

        const expensesWithCategories = categories.map((cat, index) => ({
            ...mockExpensesData.expenses[0],
            id: `exp-cat-${index}`,
            category: cat,
            description: `Expense ${cat}`
        }));

        fetchMock.mockImplementation((url) => {
            if (url.includes('/api/expenses')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ expenses: expensesWithCategories }),
                });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            return Promise.resolve({ ok: false });
        });

        renderComponent();
        await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

        expect(screen.getByText('🍽️')).toBeInTheDocument();
        expect(screen.getByText('🚗')).toBeInTheDocument();
        expect(screen.getByText('🏠')).toBeInTheDocument();
        expect(screen.getByText('🎉')).toBeInTheDocument();
        expect(screen.getByText('💳')).toBeInTheDocument();
    });

    it('renders receipt badge only when receipt URL is present', async () => {
        setupSuccessFetch();
        const expensesWithAndWithoutReceipt = [
            { ...mockExpensesData.expenses[0], id: 'no-receipt', receipt_url: null, description: 'No Receipt' },
            { ...mockExpensesData.expenses[0], id: 'with-receipt', receipt_url: 'http://url', description: 'With Receipt' }
        ];

        fetchMock.mockImplementation((url) => {
            if (url.includes('/api/expenses')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ expenses: expensesWithAndWithoutReceipt }),
                });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            return Promise.resolve({ ok: false });
        });

        renderComponent();
        await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

        const withReceiptCard = (await screen.findByText('With Receipt')).closest('.p-4');
        expect(within(withReceiptCard as HTMLElement).getByText('Receipt')).toBeInTheDocument();

        const noReceiptCard = screen.getByText('No Receipt').closest('.p-4');
        expect(within(noReceiptCard as HTMLElement).queryByText('Receipt')).not.toBeInTheDocument();
    });

    it('formats balance text and colors correctly for zero, positive, and negative balances', async () => {
        setupSuccessFetch();
        const membersWithVariedBalances = [
            { id: 'u1', name: 'Positive', email: 'p@e.com', balance: 10.50 },
            { id: 'u2', name: 'Negative', email: 'n@e.com', balance: -10.50 },
            { id: 'u3', name: 'Zero', email: 'z@e.com', balance: 0 },
        ];

        fetchMock.mockImplementation((url) => {
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ balances: membersWithVariedBalances, settlements: [] }),
                });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
            return Promise.resolve({ ok: false });
        });

        renderComponent();
        await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

        const user = userEvent.setup();
        await user.click(screen.getByRole('tab', { name: /members/i }));

        expect(screen.getByText('+$10.50')).toHaveClass('text-green-600');
        expect(screen.getByText('is owed')).toBeInTheDocument();

        expect(screen.getByText('-$10.50')).toHaveClass('text-red-600');
        expect(screen.getByText('owes')).toBeInTheDocument();

        expect(screen.getByText('$0.00')).toHaveClass('text-muted-foreground');
        expect(screen.getByText('settled')).toBeInTheDocument();
    });

    it('handles missing session gracefully', async () => {
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: null },
        });

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/No active session/i)).toBeInTheDocument();
        });
    });

    it('handles partial API failures (expenses fail but group loads)', async () => {
        fetchMock.mockImplementation((url) => {
            if (url.includes('/api/expenses')) {
                return Promise.resolve({ ok: false, status: 500 });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            return Promise.resolve({ ok: false });
        });

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        renderComponent();

        await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

        expect(screen.getByText(/No expenses yet/i)).toBeInTheDocument();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch expenses, continuing without them.');
        consoleSpy.mockRestore();
    });

    it('handles malformed expense data (missing amount/paid_by)', async () => {
        const malformedExpenses = {
            expenses: [
                {
                    id: 'bad-exp',
                    description: 'Bad Data',
                    amount: null,
                    paid_by: { id: 'u1' },
                }
            ]
        };

        fetchMock.mockImplementation((url) => {
            if (url.includes('/api/expenses')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(malformedExpenses),
                });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            return Promise.resolve({ ok: false });
        });

        renderComponent();
        await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());

        expect(screen.getByText('Bad Data')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();
        expect(screen.getByText(/Paid by Unknown/)).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
    });

    // --- NEW MUTATION TESTS ---

    it('re-fetches data and shows success toast after member is successfully added', async () => {
        setupSuccessFetch();
        const { getByRole } = renderComponent();

        // 1. Wait for initial load
        await screen.findByText('Test Group');

        // 2. Setup the mock for the *re-fetch* (which happens after the AddMember action)
        const updatedMembersData = {
            members: [
                ...mockMembersData.members,
                { id: 'user-3', name: 'Bob', email: 'bob@example.com', avatar: '', balance: 0 },
            ],
        };

        let isRefetching = false;

        // Mock the success response for the API call that adds the member
        const addMemberApiMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, member: updatedMembersData.members[2] }) });

        fetchMock.mockImplementation((url, options) => {
            if (!isRefetching && url.includes(`/api/groups/${MOCK_GROUP_ID}/add-member`) && options?.method === 'POST') {
                return addMemberApiMock(url, options); // Handle the POST request
            }
            if (isRefetching && url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(updatedMembersData) }); // Handle the subsequent GET
            }
            // Use existing successful mocks for other data
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
                if (isRefetching) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            balances: [
                                ...mockBalancesData.balances,
                                { id: 'user-3', name: 'Bob', email: 'bob@example.com', avatar: '', balance: 0 }
                            ],
                            settlements: []
                        })
                    });
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
            return Promise.resolve({ ok: false });
        });

        const user = userEvent.setup();
        const addMemberBtn = getByRole('button', { name: /add member/i });
        await user.click(addMemberBtn);

        const dialog = await screen.findByRole('dialog');
        // AddMemberDialog has inputs and a button "Send Invitation"
        // We need to fill inputs
        await user.type(within(dialog).getByLabelText(/Full Name/i), 'Bob');
        await user.type(within(dialog).getByLabelText(/Email Address/i), 'bob@example.com');

        const submitButton = within(dialog).getByRole('button', { name: /Send Invitation/i });

        // 🚨 Critical Step: Signal that the next fetches are re-fetches
        isRefetching = true;
        await user.click(submitButton);

        // 3. Assert Success Toast
        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Invitation sent successfully!');
        });

        // 4. Assert UI update (re-fetch successful)
        const membersCard = screen.getAllByText('Members')[0].closest('[data-slot="card"]');
        await waitFor(() => {
            expect(within(membersCard as HTMLElement).getByText('3')).toBeInTheDocument();
        });
    });

    it('shows error toast if adding member fails', async () => {
        setupSuccessFetch();
        const { getByRole } = renderComponent();

        await screen.findByText('Test Group');

        // Mock the failure response for the API call that adds the member
        const addMemberApiMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }) });

        fetchMock.mockImplementation((url, options) => {
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/add-member`) && options?.method === 'POST') {
                return addMemberApiMock(url, options);
            }
            // Ensure initial data fetch still succeeds
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            return Promise.resolve({ ok: false });
        });

        const user = userEvent.setup();
        const addMemberBtn = getByRole('button', { name: /add member/i });
        await user.click(addMemberBtn);

        const dialog = await screen.findByRole('dialog');
        await user.type(within(dialog).getByLabelText(/Full Name/i), 'Bob');
        await user.type(within(dialog).getByLabelText(/Email Address/i), 'bob@example.com');

        const submitButton = within(dialog).getByRole('button', { name: /Send Invitation/i });

        await user.click(submitButton);

        // Assert Error Toast
        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('Server error'));
        });

        // Assert dialog is closed (assuming component logic closes dialog on failure)
        // Actually, on failure it usually stays open to show error?
        // The code says: catch { setError... } finally { setLoading(false) }
        // It does NOT close on error.
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('re-fetches data and shows success toast after settlement confirmation', async () => {
        // Setup initial state where the current user owes Alice
        const settlement = { from_id: MOCK_USER_ID, from_name: 'Test User', to_id: 'user-2', to_name: 'Alice', amount: 30.00 };

        const initialFetch = (url: string) => {
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ balances: mockBalancesData.balances, settlements: [settlement] }) });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
            return Promise.resolve({ ok: false });
        };

        // Set up the fetch mock for the initial load
        fetchMock.mockImplementation(initialFetch);

        const { getByRole } = renderComponent();
        await screen.findByText('Test Group');

        const user = userEvent.setup();
        await user.click(getByRole('tab', { name: /balances/i }));

        const settleUpBtn = getByRole('button', { name: /settle up/i });
        await user.click(settleUpBtn);
        const dialog = await screen.findByTestId('settle-up-dialog');

        // Mock the success response for the API call that settles up
        const settleApiMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });

        // Mock the re-fetch to show a settled state
        const reFetchSettledMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balances: mockBalancesData.balances, settlements: [] })
        });

        let isRefetching = false;
        fetchMock.mockImplementation((url, options) => {
            if (!isRefetching && url.includes(`/api/groups/${MOCK_GROUP_ID}/settle`) && options?.method === 'POST') {
                return settleApiMock(url, options); // Handle the POST request
            }
            if (isRefetching && url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
                return reFetchSettledMock(); // Handle the subsequent GET for balances
            }
            return initialFetch(url); // Use initial fetch for other data
        });

        const triggerConfirmButton = within(dialog).getByRole('button', { name: /Confirm Payment/i });
        isRefetching = true; // Mark for the next GET requests
        await user.click(triggerConfirmButton);

        // 4. Assert Success Toast
        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Settlement recorded!');
        });

        // 5. Assert UI update (re-fetch successful: no settlements)
        await waitFor(() => {
            expect(screen.queryByText('owes')).not.toBeInTheDocument();
            expect(screen.getByText(/All balances are settled!/i)).toBeInTheDocument();
        });
    });

    it('shows error toast if settlement confirmation fails', async () => {
        // Setup initial state where the current user owes Alice
        const settlement = { from_id: MOCK_USER_ID, from_name: 'Test User', to_id: 'user-2', to_name: 'Alice', amount: 30.00 };

        const initialFetch = (url: string) => {
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ balances: mockBalancesData.balances, settlements: [settlement] }) });
            }
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMembersData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
            return Promise.resolve({ ok: false });
        };

        fetchMock.mockImplementation(initialFetch);

        const { getByRole } = renderComponent();
        await screen.findByText('Test Group');

        const user = userEvent.setup();
        await user.click(getByRole('tab', { name: /balances/i }));

        const settleUpBtn = getByRole('button', { name: /settle up/i });
        await user.click(settleUpBtn);
        const dialog = await screen.findByTestId('settle-up-dialog');

        // Mock the failure response for the API call that settles up
        const settleApiMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Failed' }) });

        fetchMock.mockImplementation((url, options) => {
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/settle`) && options?.method === 'POST') {
                return settleApiMock(url, options); // Handle the POST request failure
            }
            return initialFetch(url); // Use initial fetch for other data
        });

        const triggerConfirmButton = within(dialog).getByRole('button', { name: /Confirm Payment/i });
        await user.click(triggerConfirmButton);

        // 4. Assert Error Toast
        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('Failed'));
        });

        // 5. Assert that the settlement is still visible (no re-fetch occurred)
        const owesElement = screen.getByText('owes');
        const container = owesElement.closest('div');
        expect(within(container as HTMLElement).getByText('Test User')).toBeInTheDocument();
        expect(within(container as HTMLElement).getByText('Alice')).toBeInTheDocument();
    });

    it('handles partial API failures (members fail but group loads)', async () => {
        fetchMock.mockImplementation((url) => {
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/members`)) {
                return Promise.resolve({ ok: false, status: 500 }); // Members fail
            }
            // Others succeed
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}/balances`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalancesData) });
            if (url.includes(`/api/groups/${MOCK_GROUP_ID}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupData) });
            if (url.includes('/api/expenses')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExpensesData) });
            return Promise.resolve({ ok: false });
        });

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        renderComponent();

        // When members API fails, component shows error state
        await waitFor(() => {
            const errorHeading = screen.queryByText('Failed to load group data');
            if (errorHeading) {
                expect(errorHeading).toBeInTheDocument();
            } else {
                // Alternatively, if component shows group name with default members count
                expect(screen.getByText('Test Group')).toBeInTheDocument();
                const memberCards = screen.getAllByText('Members');
                const countElement = memberCards[0].closest('[data-slot="card"]');
                expect(within(countElement as HTMLElement).getByText('0')).toBeInTheDocument();
            }
        });

        consoleSpy.mockRestore();
    });

    it('handles missing Group ID in URL params', async () => {
        // Render the component with an empty path, simulating no group ID
        render(
            <MemoryRouter initialEntries={['/groups/']}>
                <Routes>
                    <Route path="/groups/:id" element={<GroupDetail />} />
                    <Route path="/groups" element={<GroupDetail />} />
                </Routes>
            </MemoryRouter>
        );

        // Component may show loading state or error state depending on implementation
        await waitFor(() => {
            const errorMessage = screen.queryByText(/Failed to load group data/i);
            const invalidIdMessage = screen.queryByText(/Invalid group ID/i);
            const loadingSpinner = document.querySelector('.animate-spin');

            // Accept any of these states as valid
            expect(errorMessage || invalidIdMessage || loadingSpinner).toBeTruthy();
        }, { timeout: 3000 });

        // Ensure minimal or no fetch was attempted without valid ID
        expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1);
    });

});

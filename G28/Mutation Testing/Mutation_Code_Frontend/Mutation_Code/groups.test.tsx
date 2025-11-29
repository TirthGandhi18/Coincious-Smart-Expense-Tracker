import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Groups } from './Groups';
import { MemoryRouter } from 'react-router-dom';
import * as AppContext from '../../App';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

// --- Mocks ---

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

// Mock Avatar components to ensure image is rendered for src check
vi.mock('../../components/ui/avatar', () => ({
    Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
    AvatarImage: ({ src, className }: any) => <img src={src} className={className} alt="avatar" />,
    AvatarFallback: ({ children }: any) => <span>{children}</span>,
}));

// Mock ResizeObserver (required for Radix UI)
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock ScrollIntoView
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

const MOCK_USER_ID = 'user-1';
const MOCK_TOKEN = 'fake-access-token';

const mockUser = {
    id: MOCK_USER_ID,
    email: 'test@example.com',
    user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
    },
};

const mockGroups = [
    {
        id: 'group-1',
        name: 'Weekend Trip',
        created_at: '2023-01-01T10:00:00Z',
        updated_at: '2023-01-02T10:00:00Z',
        member_count: 3,
        total_expenses: 150.00,
        your_balance: 50.00,
    },
    {
        id: 'group-2',
        name: 'Office Lunch',
        created_at: '2023-02-01T10:00:00Z',
        updated_at: '2023-02-02T10:00:00Z',
        member_count: 5,
        total_expenses: 200.00,
        your_balance: -20.00,
    },
];

// --- Test Suite ---

describe('Groups Component', () => {
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
        } as any);

        // Mock Supabase Session
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { access_token: MOCK_TOKEN } },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const setupSuccessFetch = (groups = mockGroups) => {
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && (!options || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ groups }),
                    clone: () => ({ json: () => Promise.resolve({ groups }) }),
                });
            }
            return Promise.reject(new Error(`Unknown URL: ${url}`));
        });
    };

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <Groups />
            </MemoryRouter>
        );
    };

    it('renders loading state initially', async () => {
        fetchMock.mockImplementation(() => new Promise(() => { })); // Pending promise
        renderComponent();
        expect(screen.getByText(/Loading your groups/i)).toBeInTheDocument();
    });

    it('renders groups list successfully', async () => {
        setupSuccessFetch();
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/Loading your groups/i)).not.toBeInTheDocument();
        });

        expect(screen.getByText('Weekend Trip')).toBeInTheDocument();
        expect(screen.getByText('Office Lunch')).toBeInTheDocument();
        expect(screen.getByText(/\$150.00/)).toBeInTheDocument(); // Total expenses
        expect(screen.getByText(/\$50.00 owed to you/)).toBeInTheDocument(); // Positive balance
        expect(screen.getByText(/\$20.00 you owe/)).toBeInTheDocument(); // Negative balance
    });

    it('renders empty state when no groups exist', async () => {
        setupSuccessFetch([]);
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/Loading your groups/i)).not.toBeInTheDocument();
        });

        expect(screen.getByText('No groups yet')).toBeInTheDocument();
        expect(screen.getByText('Create Your First Group')).toBeInTheDocument();
    });

    it('filters groups based on search term', async () => {
        setupSuccessFetch();
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Weekend Trip')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Search groups/i);
        fireEvent.change(searchInput, { target: { value: 'Weekend' } });

        expect(screen.getByText('Weekend Trip')).toBeInTheDocument();
        expect(screen.queryByText('Office Lunch')).not.toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
        expect(screen.getByText('No groups found')).toBeInTheDocument();
    });

    it('creates a new group successfully', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        // Open dialog
        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Fill input
        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'New Adventure');

        // Mock Create API
        const newGroup = {
            id: 'group-3',
            name: 'New Adventure',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            member_count: 1,
            total_expenses: 0,
            your_balance: 0,
        };

        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ group: newGroup }),
                    clone: () => ({ json: () => Promise.resolve({ group: newGroup }) }),
                });
            }
            // Default GET mock
            if (url.includes('/api/groups') && options.method === 'GET') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ groups: mockGroups }),
                    clone: () => ({ json: () => Promise.resolve({ groups: mockGroups }) }),
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        // Submit
        const submitButton = screen.getByRole('button', { name: 'Create Group' }); // Inside dialog
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('New Adventure')).toBeInTheDocument();
        });

        expect(toast.success).toHaveBeenCalledWith('Group created successfully!');
    });

    it('deletes a group successfully', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        // Find delete button for the first group (Weekend Trip)
        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Alert Dialog should appear
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();

        // Mock Delete API
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups/group-1') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: 'Deleted' }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        // Confirm delete
        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(screen.queryByText('Weekend Trip')).not.toBeInTheDocument();
        });

        expect(toast.success).toHaveBeenCalledWith('Group deleted successfully');
    });

    it('handles API errors during fetch', async () => {
        fetchMock.mockRejectedValue(new Error('Network Error'));
        renderComponent();

        await waitFor(() => {
            expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
        });
        expect(screen.getByText('No groups yet')).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Network Error', expect.anything());
    });

    // --- NEW TESTS FOR INCREASED COVERAGE ---

    it('shows error when creating group with empty name', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        expect(toast.error).toHaveBeenCalledWith('Please enter a group name');
    });

    it('does not fetch groups if user is not logged in', async () => {
        vi.spyOn(AppContext, 'useAuth').mockReturnValue({ user: null, isLoading: false } as any);
        renderComponent();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    it('handles session retrieval error during fetch', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: { message: 'Session error' } });
        renderComponent();

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Your session has expired'), expect.anything());
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error getting session:', expect.anything());
        consoleSpy.mockRestore();
    });

    it('handles missing session token during fetch', async () => {
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
        renderComponent();

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('No active session'), expect.anything());
        });
    });

    it('handles invalid JSON response from API (GET)', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        fetchMock.mockResolvedValue({
            ok: true,
            clone: () => ({ json: () => Promise.reject(new Error('Invalid JSON')) }),
            text: () => Promise.resolve('Invalid JSON string'),
        });
        renderComponent();

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Invalid server response'), expect.anything());
        });
        expect(consoleSpy).toHaveBeenCalledWith('Failed to parse JSON response:', 'Invalid JSON string');
        consoleSpy.mockRestore();
    });

    it('handles various API error formats (details vs error string)', async () => {
        // Case 1: response.details
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ details: true, error: 'Detailed error' }),
            clone: () => ({ json: () => Promise.resolve({ details: true, error: 'Detailed error' }) }),
        });
        renderComponent();
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error: Detailed error', expect.anything()));
    });

    it('handles API error with error object', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 400,
            clone: () => ({ json: () => Promise.resolve({ error: { code: 'ERR', msg: 'Obj error' } }) }),
        });
        renderComponent();
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('{"code":"ERR","msg":"Obj error"}', expect.anything()));
    });

    it('handles API error with no body', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            clone: () => ({ json: () => Promise.resolve(null) }),
        });
        renderComponent();
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server returned 500: Internal Server Error', expect.anything()));
    });

    it('shows error when creating group without auth', async () => {
        vi.spyOn(AppContext, 'useAuth').mockReturnValue({ user: null, isLoading: false } as any);
        renderComponent();

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        fireEvent.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        fireEvent.change(nameInput, { target: { value: 'Test' } });

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        fireEvent.click(submitButton);

        expect(toast.error).toHaveBeenCalledWith('You must be logged in to create a group');
    });

    it('verifies fetch headers and credentials', async () => {
        setupSuccessFetch();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/api/groups'),
            expect.objectContaining({
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${MOCK_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })
        );
    });

    it('uses default values for missing group data', async () => {
        const incompleteGroup = [{
            id: 'g1',
            // name missing
            // created_at missing
            // member_count missing
            // total_expenses missing
            // your_balance missing
        }];

        fetchMock.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ groups: incompleteGroup }),
            clone: () => ({ json: () => Promise.resolve({ groups: incompleteGroup }) }),
        });

        renderComponent();

        await waitFor(() => expect(screen.getByText('Unnamed Group')).toBeInTheDocument());
        expect(screen.getByText('1 member')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();
        expect(screen.getByText('All settled up')).toBeInTheDocument();
    });

    it('generates avatar fallback when url is missing', async () => {
        const userWithoutAvatar = {
            ...mockUser,
            user_metadata: {
                full_name: 'No Avatar',
                avatar_url: null
            },
            email: 'test@example.com'
        };
        vi.spyOn(AppContext, 'useAuth').mockReturnValue({ user: userWithoutAvatar, isLoading: false } as any);

        setupSuccessFetch();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const avatars = screen.getAllByRole('img');
        // 'T' from 'test@example.com' (email charAt(0) toUpperCase)
        // The code uses user.email.charAt(0).toUpperCase() if avatar is missing.
        // encodeURIComponent('T') is 'T'.
        expect(avatars[0]).toHaveAttribute('src', expect.stringContaining('ui-avatars.com/api/?name=T'));
    });

    // --- MODIFIED TEST (Mutation Killer Fix) ---
    it('generates avatar fallback with default char U when email/name is missing (mutation killer)', async () => {
        const userNoEmail = {
            ...mockUser,
            // Overwrite user_metadata to explicitly remove full_name and avatar_url
            user_metadata: { avatar_url: null, full_name: null },
            email: null // Overwrite email
        };
        vi.spyOn(AppContext, 'useAuth').mockReturnValue({ user: userNoEmail, isLoading: false } as any);

        setupSuccessFetch();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const avatars = screen.getAllByRole('img');
        // Check the generated URL (kills the mutant on the URL generation path)
        // When both email and full_name are null, it should use 'U' as fallback
        expect(avatars[0]).toHaveAttribute('src', expect.stringContaining('name=U'));

        // Also verify the AvatarFallback shows 'Y' (from 'You' when full_name is null)
        const yElements = screen.getAllByText('Y');
        expect(yElements.length).toBeGreaterThan(0);
    });
    // ---------------------------------------------

    it('displays "You" when full_name is missing', async () => {
        const userNoName = {
            ...mockUser,
            user_metadata: { full_name: null, avatar_url: 'http://example.com/avatar.jpg' }
        };
        vi.spyOn(AppContext, 'useAuth').mockReturnValue({ user: userNoName, isLoading: false } as any);

        setupSuccessFetch();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const yElements = screen.getAllByText('Y');
        expect(yElements.length).toBeGreaterThan(0);
    });

    it('logs delete click', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        expect(consoleSpy).toHaveBeenCalledWith('Delete clicked for group:', expect.anything());
        consoleSpy.mockRestore();
    });

    it('handles delete group error with JSON parse failure', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Mock Delete API failure with non-JSON response
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.reject(new Error('Parse error')),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to delete group');
        });
    });

    it('handles create group JSON parse error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'New Group');

        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'POST') {
                return Promise.resolve({
                    ok: true, // or false, but here we want to test the json parse error which happens on `response.clone().json()`
                    clone: () => ({ json: () => Promise.reject(new Error('Invalid JSON')) }),
                    text: () => Promise.resolve('Invalid JSON string'),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Invalid server response'), expect.anything());
        });
        expect(consoleSpy).toHaveBeenCalledWith('Failed to parse JSON response:', 'Invalid JSON string');
        consoleSpy.mockRestore();
    });

    it('handles create group session error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        // Change mock for the create action
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: null },
            error: { message: 'Session error' }
        });

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'New Group');

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to get session', expect.anything());
        });
        expect(consoleSpy).toHaveBeenCalledWith('Session error:', expect.anything());
        consoleSpy.mockRestore();
    });

    // --- STRICT MUTATION TESTS ---

    it('logs exact message on delete click', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Strict check for exact arguments
        expect(consoleSpy).toHaveBeenCalledWith('Delete clicked for group:', expect.objectContaining({
            id: 'group-1',
            name: 'Weekend Trip'
        }));
        consoleSpy.mockRestore();
    });

    it('verifies exact error when session is missing during delete', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Mock session missing
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('No active session');
        });
    });

    it('verifies exact fetch options for delete', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/api/groups/group-1'),
            expect.objectContaining({
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${MOCK_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            })
        );
    });

    it('verifies exact error message fallback on delete failure', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Mock failure with NO error message in body
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({}), // Empty object
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to delete group');
        });
    });

    it('verifies exact error message from server on delete failure', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Mock failure WITH error message
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: 'Custom Delete Error' }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Custom Delete Error');
        });
    });

    it('verifies credentials include in fetchGroups', async () => {
        setupSuccessFetch();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        expect(fetchMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                credentials: 'include'
            })
        );
    });

    it('verifies exact console error on fetchGroups failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        fetchMock.mockResolvedValue({
            ok: false,
            status: 418,
            statusText: 'I am a teapot',
            clone: () => ({ json: () => Promise.resolve(null) }),
        });
        renderComponent();

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('API Error - Status:', 418);
        });
        consoleSpy.mockRestore();
    });

    it('verifies all fallback values in transformedGroups', async () => {
        // Return a group with absolutely NO optional fields
        const emptyGroup = [{
            id: null, // Should fallback to ''
            name: null, // Should fallback to 'Unnamed Group'
            created_at: null, // Should fallback to new Date().toISOString()
            updated_at: null, // Should fallback to new Date().toISOString()
            member_count: null, // Should fallback to 1
            total_expenses: null, // Should fallback to 0
            your_balance: null, // Should fallback to 0
        }];

        fetchMock.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ groups: emptyGroup }),
            clone: () => ({ json: () => Promise.resolve({ groups: emptyGroup }) }),
        });

        renderComponent();

        await waitFor(() => expect(screen.getByText('Unnamed Group')).toBeInTheDocument());

        // Check for default values in the DOM
        expect(screen.getByText('1 member')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();
        expect(screen.getByText('All settled up')).toBeInTheDocument();
        // Date fallback is hard to test exactly as it uses new Date(), but we can check it renders *something* valid.
        // The component renders `new Date(group.created_at).toLocaleDateString()`
        // If created_at is new Date().toISOString(), it should render today's date.
        const today = new Date().toLocaleDateString();
        expect(screen.getByText(today)).toBeInTheDocument();
    });

    it('verifies trim validation for create group', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, '   '); // Spaces only

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        expect(toast.error).toHaveBeenCalledWith('Please enter a group name');
    });

    it('verifies exact JSON body in create group', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'New Group');

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/api/groups'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'New Group' })
            })
        );
    });

    // --- NEW MUTATION KILLER TESTS (75%+ Mutation Score Focus) ---

    it('handles GET API error when error is not a string (error.details false)', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 400,
            clone: () => ({ json: () => Promise.resolve({ error: { code: 400, message: 'Bad Request Object' } }) }),
        });
        renderComponent();
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('{"code":400,"message":"Bad Request Object"}', expect.anything()));
    });

    it('handles CREATE API error when details is true and error is null/undefined', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'Error Group');

        // Mock failure with details: true but no specific error string
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    clone: () => ({ json: () => Promise.resolve({ details: true, error: null }) }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Error: Unknown error', expect.anything());
        });
    });

    it('verifies state resets after successful group deletion', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        // Spy on component's useState setters (indirectly by observing behavior)
        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // State check: Alert is open
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();

        // Mock Delete API success
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups/group-1') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ message: 'Deleted' }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups.filter(g => g.id !== 'group-1') }) });
        });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        // State check: The group is gone and the success toast is shown
        await waitFor(() => {
            expect(screen.queryByText('Weekend Trip')).not.toBeInTheDocument();
        });

        // The best way to kill mutants on setDeleteAlertOpen(false) and setGroupToDelete(null)
        // is to assert that the dialog is no longer on the screen.
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(toast.success).toHaveBeenCalledWith('Group deleted successfully');
    });

    // Add these to the 'Groups Component' describe block, after the existing tests.

    it('handles CREATE API error when error is a string but details is false', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'Error Group');

        // Mock failure with a string error, details: false (Groups.tsx: 245)
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    clone: () => ({ json: () => Promise.resolve({ error: 'Specific Create Error String' }) }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Specific Create Error String', expect.anything());
        });
    });

    it('handles CREATE API error when error is not a string', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'Error Group');

        // Mock failure with a non-string error (Groups.tsx: 247)
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    clone: () => ({ json: () => Promise.resolve({ error: { code: 400, message: 'Bad Request Object' } }) }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('{"code":400,"message":"Bad Request Object"}', expect.anything());
        });
    });

    it('handles CREATE API error when response body is empty', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();

        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const createButton = screen.getByRole('button', { name: /Create Group/i });
        await user.click(createButton);

        const nameInput = screen.getByLabelText(/Group Name/i);
        await user.type(nameInput, 'Error Group');

        // Mock failure with no responseData (Groups.tsx: 250)
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    clone: () => ({ json: () => Promise.resolve(null) }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const submitButton = screen.getByRole('button', { name: 'Create Group' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Server returned 500: Internal Server Error', expect.anything());
        });
    });

    it('handles DELETE group API error with a custom server error', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Mock failure with an error message in the body
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: 'Group is locked for deletion' }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Group is locked for deletion');
        });
    });

    it('handles DELETE group non-Error exception in catch block', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Mock fetch to reject with a non-Error object (to cover Groups.tsx: 93)
        fetchMock.mockImplementation((url, options) => {
            if (url.includes('/api/groups') && options.method === 'DELETE') {
                return Promise.reject('Non-Error failure during fetch');
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ groups: mockGroups }) });
        });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            // Checks the non-Error path: error instanceof Error ? error.message : 'Failed to delete group'
            expect(toast.error).toHaveBeenCalledWith('Failed to delete group');
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error deleting group:', 'Non-Error failure during fetch');
        consoleSpy.mockRestore();
    });

    // Replace or add this test to cover session checks in handleDeleteGroup

    it('verifies exact error when session is missing during delete', async () => {
        setupSuccessFetch();
        const user = userEvent.setup();
        renderComponent();
        await waitFor(() => expect(screen.getByText('Weekend Trip')).toBeInTheDocument());

        const deleteButtons = screen.getAllByTitle('Delete Group');
        await user.click(deleteButtons[0]);

        // Mock session missing
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

        const confirmButton = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('No active session');
        });
    });

});
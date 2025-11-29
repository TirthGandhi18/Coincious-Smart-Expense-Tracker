import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Profile, SessionsModal, PasswordModal } from './Profile';
import * as AppContext from '../../App';
import { toast } from 'sonner';

// --- Mocks ---

// Mock Sonner Toast
vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        loading: vi.fn(() => 'toast-id'),
        dismiss: vi.fn(),
    },
}));

// Mock Avatar components
vi.mock('../ui/avatar', () => ({
    Avatar: ({ children, className }: any) => <div className={className} data-testid="avatar">{children}</div>,
    AvatarImage: ({ src, className }: any) => <img src={src} className={className} alt="avatar" data-testid="avatar-image" />,
    AvatarFallback: ({ children }: any) => <span data-testid="avatar-fallback">{children}</span>,
}));

// Mock UI Components to avoid complex DOM structures and focus on logic
vi.mock('../ui/dialog', () => ({
    Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock ScrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// --- Constants & Fixtures ---

const MOCK_USER = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    user_metadata: {
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
    },
    isParent: false,
};

const MOCK_STATS = {
    expense_count: 10,
    group_count: 5,
    member_since: '2023-01-01',
};

// --- Test Suite ---

describe('Profile Component', () => {
    const mockSingle = vi.fn();
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockUpdate = vi.fn();
    const mockFrom = vi.fn();
    const mockUpload = vi.fn();
    const mockGetPublicUrl = vi.fn();

    const mockSupabase = {
        from: mockFrom,
        rpc: vi.fn(),
        auth: {
            updateUser: vi.fn(),
            update: vi.fn(),
            getUser: vi.fn(),
            signInWithPassword: vi.fn(),
            resetPasswordForEmail: vi.fn(),
        },
        storage: {
            from: vi.fn(() => ({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl,
            })),
        },
    };

    const mockSetUser = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup Mock Chain
        const singleResult = { data: { name: 'Test User', email: 'test@example.com', phone_number: '1234567890', avatar_url: 'https://example.com/avatar.png' }, error: null };
        mockSingle.mockResolvedValue(singleResult);

        const eqResult = {
            single: mockSingle,
            select: mockSelect,
            then: (resolve: any) => resolve({ data: {}, error: null }),
        };
        mockEq.mockReturnValue(eqResult);

        mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
        mockUpdate.mockReturnValue({ eq: mockEq });

        mockFrom.mockReturnValue({
            select: mockSelect,
            update: mockUpdate,
        });

        // Mock useAuth
        vi.spyOn(AppContext, 'useAuth').mockReturnValue({
            user: MOCK_USER,
            supabase: mockSupabase,
            setUser: mockSetUser,
            logout: vi.fn(),
        } as any);

        // Default Supabase Mocks
        mockSupabase.rpc.mockResolvedValue({ data: MOCK_STATS, error: null });
        mockSupabase.auth.updateUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders profile information correctly', async () => {
        render(<Profile />);

        await waitFor(() => {
            const names = screen.getAllByText('Test User');
            expect(names.length).toBeGreaterThan(0);
            const emails = screen.getAllByText('test@example.com');
            expect(emails.length).toBeGreaterThan(0);
            expect(screen.getByText('1234567890')).toBeInTheDocument();
        });

        const expenses = screen.getAllByText('10');
        expect(expenses.length).toBeGreaterThan(0);
        const groups = screen.getAllByText('5');
        expect(groups.length).toBeGreaterThan(0);
    });

    it('handles profile fetch error', async () => {
        mockSingle.mockResolvedValue({ data: null, error: { message: 'Fetch failed' } });
        render(<Profile />);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Fetch failed');
        });
    });

    it('enables edit mode and validates input', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await waitFor(() => expect(screen.getByText('Edit Profile')).toBeInTheDocument());
        await user.click(screen.getByText('Edit Profile'));

        const nameInput = screen.getByLabelText('Name');
        await user.clear(nameInput);
        expect(screen.getByText('Please enter your name')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();

        const emailInput = screen.getByLabelText('Email');
        await user.clear(emailInput);
        await user.type(emailInput, 'invalid-email');
        expect(screen.getByText("That doesn't look like a valid email")).toBeInTheDocument();

        const phoneInput = screen.getByLabelText('Phone');
        await user.clear(phoneInput);
        fireEvent.change(phoneInput, { target: { value: '123' } });
        await waitFor(() => {
            expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
        });
    });

    it('cancels editing and resets form', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await waitFor(() => expect(screen.getByText('Edit Profile')).toBeInTheDocument());
        await user.click(screen.getByText('Edit Profile'));

        const nameInput = screen.getByLabelText('Name');
        await user.clear(nameInput);
        await user.type(nameInput, 'New Name');
        await user.click(screen.getByText('Cancel'));

        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
    });

    it('validates avatar file type and size', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await waitFor(() => expect(screen.getByText('Edit Profile')).toBeInTheDocument());
        await user.click(screen.getByText('Edit Profile'));

        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;

        const textFile = new File(['text'], 'test.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [textFile] } });
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });

        const largeFile = new File(['a'.repeat(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });
    });

    it('uploads avatar successfully', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await waitFor(() => expect(screen.getByText('Edit Profile')).toBeInTheDocument());
        await user.click(screen.getByText('Edit Profile'));

        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        const validFile = new File(['image'], 'avatar.png', { type: 'image/png' });

        mockUpload.mockResolvedValue({ data: { path: 'path/to/avatar' }, error: null });
        mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/new-avatar.png' } });
        mockSupabase.auth.updateUser.mockResolvedValue({ data: { user: { ...MOCK_USER, user_metadata: { ...MOCK_USER.user_metadata, avatar_url: 'https://example.com/new-avatar.png' } } }, error: null });

        fireEvent.change(fileInput, { target: { files: [validFile] } });

        await waitFor(() => {
            expect(mockUpload).toHaveBeenCalled();
            expect(mockGetPublicUrl).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith('Avatar updated!', expect.anything());
        });
    });

    it('opens password modal and validates input', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await waitFor(() => expect(screen.getByText('Change')).toBeInTheDocument());
        await user.click(screen.getByText('Change'));
        expect(screen.getByText('Change Password')).toBeInTheDocument();

        const newPassInput = screen.getByPlaceholderText('Pick a strong password');
        await user.type(newPassInput, 'weak');
        expect(screen.getByText(/At least 8 characters/)).toHaveClass('text-red-600');

        await user.clear(newPassInput);
        await user.type(newPassInput, 'StrongPass1!');
        expect(screen.getByText(/At least 8 characters/)).toHaveClass('text-green-600');
    });

    it('changes password successfully', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('Change'));

        const currentPassInput = screen.getByPlaceholderText('Your current password');
        const newPassInput = screen.getByPlaceholderText('Pick a strong password');
        const passwordInputs = document.querySelectorAll('input[type="password"]');

        await user.type(currentPassInput, 'oldPass');
        await user.type(newPassInput, 'NewStrongPass1!');
        await user.type(passwordInputs[2] as HTMLElement, 'NewStrongPass1!');

        mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });
        mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

        await user.click(screen.getByRole('button', { name: 'Update' }));

        await waitFor(() => {
            expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewStrongPass1!' });
        });
    });

    it('handles password change failure', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('Change'));

        const currentPassInput = screen.getByPlaceholderText('Your current password');
        const newPassInput = screen.getByPlaceholderText('Pick a strong password');
        const passwordInputs = document.querySelectorAll('input[type="password"]');

        await user.type(currentPassInput, 'wrongPass');
        await user.type(newPassInput, 'NewStrongPass1!');
        await user.type(passwordInputs[2] as HTMLElement, 'NewStrongPass1!');

        mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

        await user.click(screen.getByRole('button', { name: 'Update' }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Invalid login credentials');
        });
    });

    it('sends password reset email', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('Change'));
        await user.click(screen.getByText('Forgot password?'));

        mockSupabase.auth.resetPasswordForEmail.mockImplementation(() => Promise.resolve({ error: null }));

        await waitFor(() => {
            expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', expect.anything());
        });
    });

    it('opens sessions modal', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('View All'));
        expect(screen.getByText('Your Sessions')).toBeInTheDocument();
        expect(screen.getByText('No sessions found')).toBeInTheDocument();
    });

    it('handles save profile error', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await waitFor(() => expect(screen.getByText('Edit Profile')).toBeInTheDocument());
        await user.click(screen.getByText('Edit Profile'));

        const nameInput = screen.getByLabelText('Name');
        await user.clear(nameInput);
        await user.type(nameInput, 'New Name');

        // Mock update failure
        const mockSingleUpdate = vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } });
        const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate });
        const mockEqUpdate = vi.fn().mockReturnValue({ select: mockSelectUpdate });
        mockUpdate.mockReturnValue({ eq: mockEqUpdate });

        await user.click(screen.getByRole('button', { name: 'Save Changes' }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Update failed', expect.anything());
        });
    });

    it('handles avatar upload error', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await waitFor(() => expect(screen.getByText('Edit Profile')).toBeInTheDocument());
        await user.click(screen.getByText('Edit Profile'));

        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        const validFile = new File(['image'], 'avatar.png', { type: 'image/png' });

        mockUpload.mockResolvedValue({ data: null, error: { message: 'Upload failed' } });

        fireEvent.change(fileInput, { target: { files: [validFile] } });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Upload failed', expect.anything());
        });
    });

    it('handles stats fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Stats failed' } });

        render(<Profile />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch stats:', expect.objectContaining({ message: 'Stats failed' }));
        });
        consoleSpy.mockRestore();
    });

    it('handles password update failure', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('Change'));

        const currentPassInput = screen.getByPlaceholderText('Your current password');
        const newPassInput = screen.getByPlaceholderText('Pick a strong password');
        const passwordInputs = document.querySelectorAll('input[type="password"]');

        await user.type(currentPassInput, 'oldPass');
        await user.type(newPassInput, 'NewStrongPass1!');
        await user.type(passwordInputs[2] as HTMLElement, 'NewStrongPass1!');

        mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });
        mockSupabase.auth.updateUser.mockResolvedValue({ error: { message: 'Update failed' } });
        await user.click(screen.getByRole('button', { name: 'Update' }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Update failed');
        });
    });

    it('toggles confirm password visibility', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('Change'));

        const toggleBtn = screen.getByText('Show');
        // Confirm input is the last one
        const inputs = screen.getAllByDisplayValue('');
        // Filter for password inputs if needed, or just find by label?
        // Label is "Confirm Password"
        // Input is inside a div with the button.

        await user.click(toggleBtn);
        expect(screen.getByText('Hide')).toBeInTheDocument();
    });
    it('closes password modal when backdrop clicked', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('Change'));

        const backdrop = screen.getByTestId('password-modal-backdrop');
        await user.click(backdrop);

        await waitFor(() => {
            expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
        });
    });

    it('closes password modal when cancel button clicked', async () => {
        const user = userEvent.setup();
        render(<Profile />);
        await user.click(screen.getByText('Change'));

        const cancelBtn = screen.getByText('Cancel');
        await user.click(cancelBtn);

        await waitFor(() => {
            expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
        });
    });
});

describe('SessionsModal Component', () => {
    const mockOnClose = vi.fn();
    const mockOnRefresh = vi.fn();
    const mockOnRevoke = vi.fn();
    const mockSignOutCurrent = vi.fn();

    const sessions = [
        {
            id: 'session-1',
            device: 'Desktop',
            ip: '127.0.0.1',
            last_active: 'Now',
            current: true,
        },
        {
            id: 'session-2',
            device: 'Mobile',
            ip: '192.168.1.1',
            last_active: 'Yesterday',
            current: false,
        },
    ];

    it('renders sessions list correctly', () => {
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={sessions}
                loading={false}
                error={null}
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );

        expect(screen.getByText('Desktop')).toBeInTheDocument();
        expect(screen.getByText('Mobile')).toBeInTheDocument();
        expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('calls onRevoke when revoke button clicked', async () => {
        const user = userEvent.setup();
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={sessions}
                loading={false}
                error={null}
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );

        const revokeButtons = screen.getAllByText('Revoke');
        await user.click(revokeButtons[0]);
        expect(mockOnRevoke).toHaveBeenCalledWith('session-2');
    });

    it('calls signOutCurrent when sign out button clicked', async () => {
        const user = userEvent.setup();
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={sessions}
                loading={false}
                error={null}
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );

        await user.click(screen.getByText('Sign out'));
        expect(mockSignOutCurrent).toHaveBeenCalled();
    });

    it('shows loading state', () => {
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={[]}
                loading={true}
                error={null}
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows error state', () => {
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={[]}
                loading={false}
                error="Failed to load sessions"
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );
        expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button clicked', async () => {
        const user = userEvent.setup();
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={[]}
                loading={false}
                error={null}
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );
        await user.click(screen.getByText('Refresh'));
        expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('calls onClose when close button clicked', async () => {
        const user = userEvent.setup();
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={[]}
                loading={false}
                error={null}
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );
        await user.click(screen.getByText('Close'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop clicked', async () => {
        const user = userEvent.setup();
        render(
            <SessionsModal
                onClose={mockOnClose}
                sessions={[]}
                loading={false}
                error={null}
                onRefresh={mockOnRefresh}
                onRevoke={mockOnRevoke}
                signOutCurrent={mockSignOutCurrent}
            />
        );
        const backdrop = screen.getByTestId('sessions-modal-backdrop');
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
    });
});


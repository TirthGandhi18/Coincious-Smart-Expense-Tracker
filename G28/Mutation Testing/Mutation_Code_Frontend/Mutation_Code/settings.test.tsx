import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Settings } from './Settings';
import { BrowserRouter } from 'react-router-dom';

// --- Hoisted Mocks ---
const mocks = vi.hoisted(() => ({
    toggleTheme: vi.fn(),
    setDataSharing: vi.fn(),
    navigate: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    toastLoading: vi.fn(),
    supabaseSignOut: vi.fn(),
    supabaseGetSession: vi.fn(),
}));

// --- Mock Modules ---
vi.mock('../ui/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
        toggleTheme: mocks.toggleTheme,
    }),
}));

vi.mock('../ui/SettingContext', () => ({
    useSettings: () => ({
        dataSharing: false,
        setDataSharing: mocks.setDataSharing,
    }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
    };
});

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
        loading: mocks.toastLoading,
    },
}));

vi.mock('../../utils/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: mocks.supabaseGetSession,
            signOut: mocks.supabaseSignOut,
        },
    },
}));

// Mock UI components
vi.mock('../ui/card', () => ({
    Card: ({ children }: any) => <div className="mock-card">{children}</div>,
    CardHeader: ({ children }: any) => <div className="mock-card-header">{children}</div>,
    CardTitle: ({ children }: any) => <div className="mock-card-title">{children}</div>,
    CardDescription: ({ children }: any) => <div className="mock-card-description">{children}</div>,
    CardContent: ({ children }: any) => <div className="mock-card-content">{children}</div>,
}));

vi.mock('../ui/button', () => ({
    Button: ({ children, onClick, variant, disabled }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant}>
            {children}
        </button>
    ),
}));

vi.mock('../ui/label', () => ({
    Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('../ui/switch', () => ({
    Switch: ({ checked, onCheckedChange }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            data-testid="mock-switch"
        />
    ),
}));

vi.mock('../ui/separator', () => ({
    Separator: () => <hr />,
}));

vi.mock('./DateRangeExportModal', () => ({
    DateRangeExportModal: ({ open, onOpenChange }: any) => (
        open ? <div data-testid="export-modal">Export Modal <button onClick={() => onOpenChange(false)}>Close</button></div> : null
    ),
}));

// Mock Lucide React
vi.mock('lucide-react', () => ({
    Moon: () => <span>Moon</span>,
    Sun: () => <span>Sun</span>,
    Smartphone: () => <span>Smartphone</span>,
    Download: () => <span>Download</span>,
    AlertTriangle: () => <span>AlertTriangle</span>,
    Save: () => <span>Save</span>,
    Shield: () => <span>Shield</span>,
    Loader2: () => <span>Loader2</span>,
    X: () => <span>X</span>,
}));

describe('Settings Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementation for getSession
        mocks.supabaseGetSession.mockResolvedValue({ data: { session: { access_token: 'mock-token' } } });

        // Mock global fetch
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );
    };

    it('renders the settings page correctly', () => {
        renderComponent();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Customize your app experience and preferences')).toBeInTheDocument();
        expect(screen.getByText('Appearance')).toBeInTheDocument();
        expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
        expect(screen.getByText('App Management')).toBeInTheDocument();
        expect(screen.getByText('App Information')).toBeInTheDocument();
    });

    it('toggles theme', () => {
        renderComponent();
        const switches = screen.getAllByTestId('mock-switch');
        // First switch is usually theme (based on order in code)
        // Appearance card is first
        const themeSwitch = switches[0];

        fireEvent.click(themeSwitch);
        expect(mocks.toggleTheme).toHaveBeenCalled();
    });

    it('toggles data sharing', () => {
        renderComponent();
        const switches = screen.getAllByTestId('mock-switch');
        // Second switch is data sharing
        const dataSharingSwitch = switches[1];

        fireEvent.click(dataSharingSwitch);
        expect(mocks.setDataSharing).toHaveBeenCalled();
    });

    it('opens export modal', () => {
        renderComponent();
        const exportButton = screen.getByText('Export CSV').closest('button');
        fireEvent.click(exportButton!);

        expect(screen.getByTestId('export-modal')).toBeInTheDocument();

        // Close it
        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
    });

    it('handles save settings', () => {
        renderComponent();
        const saveButton = screen.getByText('Save All Changes').closest('button');
        fireEvent.click(saveButton!);

        expect(mocks.toastSuccess).toHaveBeenCalledWith('Settings saved!');
    });

    it('handles account deletion flow - success', async () => {
        // Mock successful fetch
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        renderComponent();

        // Click initial delete button - use getAllByText and pick the button, or use specific selector
        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        // Check if confirmation modal appears
        expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();

        // Click confirm delete
        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        expect(mocks.toastLoading).toHaveBeenCalledWith('Deleting your account...');

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/user'), expect.objectContaining({
                method: 'DELETE',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer mock-token'
                })
            }));
        });

        await waitFor(() => {
            expect(mocks.toastSuccess).toHaveBeenCalledWith('Account deleted successfully. You will be logged out.', expect.any(Object));
        });

        expect(mocks.supabaseSignOut).toHaveBeenCalled();
        expect(mocks.navigate).toHaveBeenCalledWith('/register');
    });

    it('handles account deletion flow - failure (API error)', async () => {
        // Mock failed fetch
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Server error' }),
        });

        renderComponent();

        // Click initial delete button
        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        // Click confirm delete
        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            expect(mocks.toastError).toHaveBeenCalledWith('Server error', expect.any(Object));
        });

        // Modal should close (or at least loading state should stop)
        expect(screen.queryByText('Are you absolutely sure?')).not.toBeInTheDocument();
    });

    it('handles account deletion flow - failure (No session)', async () => {
        mocks.supabaseGetSession.mockResolvedValueOnce({ data: { session: null } });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            expect(mocks.toastError).toHaveBeenCalledWith('You must be logged in to delete your account.', expect.any(Object));
        });
    });

    it('cancels account deletion', () => {
        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();

        const cancelButton = screen.getByText('Cancel').closest('button');
        fireEvent.click(cancelButton!);

        expect(screen.queryByText('Are you absolutely sure?')).not.toBeInTheDocument();
    });

    it('closes delete modal via backdrop', () => {
        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        // Backdrop is the button with aria-label "Close modal"
        const backdrop = screen.getByLabelText('Close modal');
        fireEvent.click(backdrop);

        expect(screen.queryByText('Are you absolutely sure?')).not.toBeInTheDocument();
    });

    // --- MUTATION KILLER TESTS ---

    it('verifies exact console.log output on save settings', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        renderComponent();

        const saveButton = screen.getByText('Save All Changes').closest('button');
        fireEvent.click(saveButton!);

        // Verify exact console.log arguments (kills mutants on line 48)
        expect(consoleSpy).toHaveBeenCalledWith('Saving settings:', {
            notifications: { email: true, expense: true, group: true, payment: true },
            preferences: { currency: 'USD', timezone: 'UTC' },
            dataSharing: false
        });
        consoleSpy.mockRestore();
    });

    it('verifies exact toast success message on save', () => {
        renderComponent();

        const saveButton = screen.getByText('Save All Changes').closest('button');
        fireEvent.click(saveButton!);

        // Exact string match (kills string literal mutants)
        expect(mocks.toastSuccess).toHaveBeenCalledWith('Settings saved!');
    });

    it('verifies exact toast loading message on delete', async () => {
        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // Exact string match for loading toast
        expect(mocks.toastLoading).toHaveBeenCalledWith('Deleting your account...');
    });

    it('verifies exact success message on account deletion', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            // Exact string match with id parameter
            expect(mocks.toastSuccess).toHaveBeenCalledWith(
                'Account deleted successfully. You will be logged out.',
                expect.anything()
            );
        });
    });

    it('verifies exact error message when session is missing', async () => {
        mocks.supabaseGetSession.mockResolvedValueOnce({ data: { session: null } });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            // Exact error message match
            expect(mocks.toastError).toHaveBeenCalledWith(
                'You must be logged in to delete your account.',
                expect.anything()
            );
        });
    });

    it('verifies exact error message from API response', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Custom API Error Message' }),
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            expect(mocks.toastError).toHaveBeenCalledWith(
                'Custom API Error Message',
                expect.anything()
            );
        });
    });

    it('verifies fallback error message when API returns no error', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({}), // No error field
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            // Fallback message (kills || operator mutant on line 75)
            expect(mocks.toastError).toHaveBeenCalledWith(
                'Failed to delete account.',
                expect.anything()
            );
        });
    });

    it('verifies console.error is called on delete failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Test Error' }),
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Error deleting account:', expect.any(Error));
        });
        consoleSpy.mockRestore();
    });

    it('verifies state resets after delete failure', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Test Error' }),
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // After error, modal should close and isDeleting should be false
        await waitFor(() => {
            expect(screen.queryByText('Are you absolutely sure?')).not.toBeInTheDocument();
        });

        // Verify delete button is not disabled (isDeleting = false)
        const deleteButtonsAfter = screen.getAllByText('Delete Account');
        const deleteButtonAfter = deleteButtonsAfter.find(el => el.closest('button'));
        expect(deleteButtonAfter!.closest('button')).not.toBeDisabled();
    });

    it('verifies delete button is disabled while deleting', async () => {
        // Mock a slow response to keep isDeleting true
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // Button should be disabled during deletion
        await waitFor(() => {
            const deleteButtonsWhileDeleting = screen.getAllByText('Delete Account');
            const deleteButtonWhileDeleting = deleteButtonsWhileDeleting.find(el => el.closest('button'));
            expect(deleteButtonWhileDeleting!.closest('button')).toBeDisabled();
        });
    });

    it('verifies exact navigation path after successful deletion', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            // Exact path match (kills string literal mutant)
            expect(mocks.navigate).toHaveBeenCalledWith('/register');
        });
    });

    it('verifies supabase signOut is called after successful deletion', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            expect(mocks.supabaseSignOut).toHaveBeenCalled();
        });
    });

    it('verifies exact API endpoint and headers for delete', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/user'),
                expect.objectContaining({
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer mock-token'
                    }
                })
            );
        });
    });

    it('verifies close X button is hidden while deleting', async () => {
        // Mock slow response
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        // X button should be visible initially
        expect(screen.getByText('Close')).toBeInTheDocument();

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // X button should be hidden while deleting (line 302 condition)
        await waitFor(() => {
            expect(screen.queryByText('Close')).not.toBeInTheDocument();
        });
    });

    it('verifies backdrop is disabled while deleting', async () => {
        // Mock slow response
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // Try to click backdrop while deleting
        const backdrop = screen.getByLabelText('Close modal');
        fireEvent.click(backdrop);

        // Modal should still be open (line 255 condition: !isDeleting)
        expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
    });

    it('verifies cancel button is disabled while deleting', async () => {
        // Mock slow response
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const cancelButton = screen.getByText('Cancel').closest('button');
        expect(cancelButton).not.toBeDisabled();

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // Cancel button should be disabled while deleting
        await waitFor(() => {
            const cancelButtonWhileDeleting = screen.getByText('Cancel').closest('button');
            expect(cancelButtonWhileDeleting).toBeDisabled();
        });
    });

    it('verifies button text changes to "Deleting..." while deleting', async () => {
        // Mock slow response
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        expect(screen.getByText('Yes, delete my account')).toBeInTheDocument();

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // Button text should change (line 296)
        await waitFor(() => {
            expect(screen.getByText('Deleting...')).toBeInTheDocument();
            expect(screen.queryByText('Yes, delete my account')).not.toBeInTheDocument();
        });
    });

    it('verifies Loader2 icon appears while deleting', async () => {
        // Mock slow response
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));

        renderComponent();

        const deleteButtons = screen.getAllByText('Delete Account');
        const deleteButton = deleteButtons.find(el => el.closest('button'));
        fireEvent.click(deleteButton!);

        const confirmButton = screen.getByText('Yes, delete my account').closest('button');
        fireEvent.click(confirmButton!);

        // Loader2 should appear (line 294)
        await waitFor(() => {
            expect(screen.getByText('Loader2')).toBeInTheDocument();
        });
    });
});
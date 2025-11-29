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
});

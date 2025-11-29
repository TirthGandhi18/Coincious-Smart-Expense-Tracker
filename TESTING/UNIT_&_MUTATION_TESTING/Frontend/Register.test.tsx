import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Register } from './Register';
import { BrowserRouter } from 'react-router-dom';

// --- Hoisted Mocks ---
const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    register: vi.fn(),
    signInWithProvider: vi.fn(),
    toggleTheme: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

// --- Mock Modules ---
vi.mock('../../App', () => ({
    useAuth: () => ({
        register: mocks.register,
        signInWithProvider: mocks.signInWithProvider,
        isLoading: false,
    }),
}));

vi.mock('../ui/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
        toggleTheme: mocks.toggleTheme,
    }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        Link: ({ children, to }: any) => <a href={to}>{children}</a>,
    };
});

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}));

// Mock UI components to isolate logic
vi.mock('../ui/button', () => ({
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('../ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));

vi.mock('../ui/label', () => ({
    Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('../ui/card', () => ({
    Card: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h1>{children}</h1>,
    CardDescription: ({ children }: any) => <p>{children}</p>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../ui/checkbox', () => ({
    Checkbox: ({ onCheckedChange, checked, id }: any) => (
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
        />
    ),
}));

vi.mock('../ui/logo', () => ({
    Logo: () => <div>Logo</div>,
}));

// Mock Lucide React
vi.mock('lucide-react', () => ({
    Eye: () => <div>Eye</div>,
    EyeOff: () => <div>EyeOff</div>,
    Sun: () => <div>Sun</div>,
    Moon: () => <div>Moon</div>,
    Mail: () => <div>Mail</div>,
    Lock: () => <div>Lock</div>,
    User: () => <div>User</div>,
    Check: () => <div>Check</div>,
    X: () => <div>X</div>,
}));

describe('Register Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );
    };

    it('renders the registration form correctly', () => {
        renderComponent();
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('validates empty fields', () => {
        renderComponent();
        const submitButton = screen.getByRole('button', { name: /create account/i });

        // Button should be disabled initially due to terms not accepted
        expect(submitButton).toBeDisabled();

        // Accept terms to enable button check
        const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the/i });
        fireEvent.click(termsCheckbox);

        // Even with terms accepted, if password requirements aren't met, button is disabled
        expect(submitButton).toBeDisabled();
    });

    it('shows error when passwords do not match', async () => {
        renderComponent();

        // Fill form
        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Mismatch123!' } });

        const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the/i });
        fireEvent.click(termsCheckbox);

        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).not.toBeDisabled();

        fireEvent.click(submitButton);

        expect(mocks.toastError).toHaveBeenCalledWith('Passwords do not match');
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it('validates password requirements', () => {
        renderComponent();
        const passwordInput = screen.getByLabelText(/^password$/i);

        // Focus to show requirements
        fireEvent.focus(passwordInput);

        // Check if requirements are shown
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();

        // Type weak password
        fireEvent.change(passwordInput, { target: { value: 'weak' } });

        // Blur to trigger toast validation
        fireEvent.blur(passwordInput);

        expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('Password must contain'));
    });

    it('calls register on valid form submission', async () => {
        renderComponent();

        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123!' } });

        const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the/i });
        fireEvent.click(termsCheckbox);

        const submitButton = screen.getByRole('button', { name: /create account/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mocks.register).toHaveBeenCalledWith('test@example.com', 'Password123!', 'Test User');
        });

        await waitFor(() => {
            expect(mocks.toastSuccess).toHaveBeenCalledWith('Check your email and authenticate your email.');
        });
    });

    it('handles "User already registered" error', async () => {
        mocks.register.mockRejectedValueOnce(new Error('User already registered'));
        renderComponent();

        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Existing User' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123!' } });

        const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the/i });
        fireEvent.click(termsCheckbox);

        const submitButton = screen.getByRole('button', { name: /create account/i });
        fireEvent.click(submitButton);

        // Wait for register to be called
        await waitFor(() => expect(mocks.register).toHaveBeenCalled());

        // Check toast (immediate)
        await waitFor(() => {
            expect(mocks.toastError).toHaveBeenCalledWith('This account already exists!', expect.any(Object));
        });

        // Wait for navigation (delayed 2000ms)
        await waitFor(() => {
            expect(mocks.navigate).toHaveBeenCalledWith('/login');
        }, { timeout: 4000 });
    });

    it('handles generic registration error', async () => {
        mocks.register.mockRejectedValueOnce(new Error('Network error'));
        renderComponent();

        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123!' } });

        const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the/i });
        fireEvent.click(termsCheckbox);

        const submitButton = screen.getByRole('button', { name: /create account/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mocks.register).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(mocks.toastError).toHaveBeenCalledWith('Network error');
        });
    });

    it('calls google sign in provider', async () => {
        renderComponent();
        const googleButton = screen.getByRole('button', { name: /continue with google/i });
        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(mocks.signInWithProvider).toHaveBeenCalledWith('google');
        });
    });

    it('toggles password visibility', () => {
        renderComponent();
        const passwordInput = screen.getByLabelText(/^password$/i);
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Find toggle button for the main password field
        const toggleButtons = screen.getAllByText('Eye');
        const toggleButton = toggleButtons[0].closest('button');
        expect(toggleButton).toBeInTheDocument();

        fireEvent.click(toggleButton!);
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(screen.getAllByText('EyeOff')[0]).toBeInTheDocument();

        fireEvent.click(toggleButton!);
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(screen.getAllByText('Eye')[0]).toBeInTheDocument();
    });

    it('handles google sign in failure', async () => {
        mocks.signInWithProvider.mockRejectedValueOnce(new Error('Google error'));
        renderComponent();
        const googleButton = screen.getByRole('button', { name: /continue with google/i });
        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(mocks.toastError).toHaveBeenCalledWith('Google sign-up failed. Please try again.');
        });
    });

    it('toggles confirm password visibility', () => {
        renderComponent();
        const confirmInput = screen.getByLabelText(/confirm password/i);
        expect(confirmInput).toHaveAttribute('type', 'password');

        const toggleButtons = screen.getAllByText('Eye');
        // Second eye icon is for confirm password
        const toggleButton = toggleButtons[1].closest('button');
        expect(toggleButton).toBeInTheDocument();

        fireEvent.click(toggleButton!);
        expect(confirmInput).toHaveAttribute('type', 'text');

        fireEvent.click(toggleButton!);
        expect(confirmInput).toHaveAttribute('type', 'password');
    });
});

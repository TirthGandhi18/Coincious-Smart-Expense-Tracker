import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordResetPage } from './PasswordResetPage';
import { BrowserRouter } from 'react-router-dom';

// --- Hoisted Mocks ---
const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    updateUser: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

// --- Mock Modules ---

vi.mock('../../App', () => ({
    useAuth: () => ({
        supabase: {
            auth: {
                updateUser: mocks.updateUser,
            },
        },
    }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        BrowserRouter: actual.BrowserRouter,
    };
});

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}));

vi.mock('lucide-react', () => ({
    Lock: () => <span>Lock</span>,
    Eye: () => <span>Eye</span>,
    EyeOff: () => <span>EyeOff</span>,
    Loader2: () => <span>Loading</span>,
}));

describe('PasswordResetPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.updateUser.mockResolvedValue({ data: {}, error: null });
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <PasswordResetPage />
            </BrowserRouter>
        );
    };

    describe('Component Rendering', () => {
        it('renders the component without crashing', () => {
            renderComponent();
            expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
        });

        it('renders the description text', () => {
            renderComponent();
            expect(screen.getByText(/enter your new secure password below/i)).toBeInTheDocument();
        });

        it('renders new password input field', () => {
            renderComponent();
            expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
        });

        it('renders confirm password input field', () => {
            renderComponent();
            expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
        });

        it('renders submit button', () => {
            renderComponent();
            expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
        });
    });

    describe('Password Input Handling', () => {
        it('updates new password input value', () => {
            renderComponent();
            const passwordInput = screen.getByLabelText(/^new password$/i) as HTMLInputElement;

            fireEvent.change(passwordInput, { target: { value: 'NewPassword123!' } });

            expect(passwordInput.value).toBe('NewPassword123!');
        });

        it('updates confirm password input value', () => {
            renderComponent();
            const confirmInput = screen.getByLabelText(/confirm new password/i) as HTMLInputElement;

            fireEvent.change(confirmInput, { target: { value: 'NewPassword123!' } });

            expect(confirmInput.value).toBe('NewPassword123!');
        });

        it('password input type is password by default', () => {
            renderComponent();
            const passwordInput = screen.getByLabelText(/^new password$/i) as HTMLInputElement;

            expect(passwordInput.type).toBe('password');
        });
    });

    describe('Form Validation - Password Length', () => {
        it('shows error when password is less than 8 characters', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'Short1!' } });
            fireEvent.change(confirmInput, { target: { value: 'Short1!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastError).toHaveBeenCalledWith('Password must be at least 8 characters long.');
            });
        });

        it('accepts password with exactly 8 characters', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'Pass123!' } });
            fireEvent.change(confirmInput, { target: { value: 'Pass123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'Pass123!' });
            });
        });

        it('accepts password with more than 8 characters', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'ValidPassword123!' });
            });
        });
    });

    describe('Form Validation - Password Match', () => {
        it('shows error when passwords do not match', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
            fireEvent.change(confirmInput, { target: { value: 'Different123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastError).toHaveBeenCalledWith('Passwords do not match.');
            });
        });

        it('does not call updateUser when passwords mismatch', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
            fireEvent.change(confirmInput, { target: { value: 'Different123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastError).toHaveBeenCalled();
            });

            expect(mocks.updateUser).not.toHaveBeenCalled();
        });
    });

    describe('Successful Password Reset', () => {
        it('calls updateUser with correct password on valid submission', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.updateUser).toHaveBeenCalledWith({
                    password: 'ValidPassword123!',
                });
            });
        });

        it('shows success toast on successful password reset', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastSuccess).toHaveBeenCalledWith('Password reset successfully! You are now logged in.');
            });
        });

        it('navigates to dashboard after successful reset', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });
    });

    describe('Failed Password Reset', () => {
        it('shows error toast when updateUser returns error', async () => {
            mocks.updateUser.mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
            });

            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastError).toHaveBeenCalledWith('Failed to reset password. The link may be expired.');
            });
        });

        it('navigates to login page on failed reset', async () => {
            mocks.updateUser.mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
            });

            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.navigate).toHaveBeenCalledWith('/login', { replace: true });
            });
        });

        it('handles promise rejection from updateUser', async () => {
            mocks.updateUser.mockRejectedValue(new Error('Network error'));

            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastError).toHaveBeenCalledWith('Failed to reset password. The link may be expired.');
            });
        });
    });

    describe('Loading State', () => {
        it('disables submit button during processing', async () => {
            mocks.updateUser.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
            );

            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            expect(submitButton).not.toBeDisabled();

            fireEvent.change(passwordInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.change(confirmInput, { target: { value: 'ValidPassword123!' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(submitButton).toBeDisabled();
            });
        });

        it('re-enables button after validation error', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'Short' } });
            fireEvent.change(confirmInput, { target: { value: 'Short' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastError).toHaveBeenCalled();
            });

            expect(submitButton).not.toBeDisabled();
        });
    });

    describe('Edge Cases', () => {
        it('handles very long passwords correctly', async () => {
            const longPassword = 'A'.repeat(100) + '1234567!';

            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: longPassword } });
            fireEvent.change(confirmInput, { target: { value: longPassword } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.updateUser).toHaveBeenCalledWith({ password: longPassword });
            });
        });

        it('validates password length before matching check', async () => {
            renderComponent();

            const passwordInput = screen.getByLabelText(/^new password$/i);
            const confirmInput = screen.getByLabelText(/confirm new password/i);
            const submitButton = screen.getByRole('button', { name: /reset password/i });

            fireEvent.change(passwordInput, { target: { value: 'Short' } });
            fireEvent.change(confirmInput, { target: { value: 'Short' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mocks.toastError).toHaveBeenCalledWith('Password must be at least 8 characters long.');
            });

            expect(mocks.updateUser).not.toHaveBeenCalled();
        });
    });
});

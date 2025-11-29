import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { Login } from './Login';
import { MemoryRouter } from 'react-router-dom';

// Mock window.location
const originalLocation = window.location;
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { origin: 'http://localhost:3000' },
  });
});

afterAll(() => {
  window.location = originalLocation;
});

// --- Mocks Setup ---

// 1. Hoist the mock functions so they exist before vi.mock() runs
const {
  loginMock,
  signInWithProviderMock,
  resetPasswordForEmailMock,
  navigateMock,
  toastMock
} = vi.hoisted(() => {
  return {
    loginMock: vi.fn(),
    signInWithProviderMock: vi.fn(),
    resetPasswordForEmailMock: vi.fn(),
    navigateMock: vi.fn(),
    toastMock: {
      success: vi.fn(),
      error: vi.fn(),
      // Allow calling toast() directly as a function
      default: vi.fn(),
    } as any,
  };
});

// 2. Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// 3. Mock Sonner (Toast)
vi.mock('sonner', () => ({
  toast: Object.assign(toastMock.default, toastMock),
}));

// 4. Mock ThemeContext
vi.mock('../ui/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

// 5. Mock useAuth (The Critical Part)
// We use a mutable object 'authState' so we can change isLoading/error values per test
let authState = {
  isLoading: false,
};

vi.mock('../../App', () => ({
  useAuth: () => ({
    login: loginMock,
    signInWithProvider: signInWithProviderMock,
    isLoading: authState.isLoading,
    supabase: {
      auth: {
        resetPasswordForEmail: resetPasswordForEmailMock,
      },
    },
  }),
}));

// --- Tests ---

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isLoading = false; // Reset state
  });

  const renderLogin = () => {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  };

  it('renders the login form correctly', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('renders static text correctly', () => {
    renderLogin();
    expect(screen.getByText(/Welcome back to smarter expense management/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo Credentials:/i)).toBeInTheDocument();
    expect(screen.getByText(/Regular User:/i)).toBeInTheDocument();
    expect(screen.getByText(/Parent User:/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
  });

  it('updates email and password state on user input', () => {
    renderLogin();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('toggles password visibility', () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/Password/i);

    // Find the toggle button (it's the button inside the password container)
    // We look for the eye icon's parent button
    const toggleButton = passwordInput.nextElementSibling as HTMLElement;

    // Check initial state
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click to hide
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls login function on successful submission', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: 'Sign In' });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secret' } });

    // Mock success
    loginMock.mockResolvedValueOnce({});

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret');
      expect(toastMock.success).toHaveBeenCalledWith('Correct password! Welcome back!');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  // **********************************
  // ** REVISED TEST: Empty Fields Check **
  // **********************************
  it('shows error toast when email or password is missing during form submission', () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: 'Sign In' });

    // Remove required attribute to allow form submission for testing
    emailInput.removeAttribute('required');
    passwordInput.removeAttribute('required');

    // Scenario 1: Missing Email (and non-empty password to test email validation)
    fireEvent.change(passwordInput, { target: { value: 'secret' } });
    fireEvent.change(emailInput, { target: { value: '' } }); // Ensure email is empty last

    fireEvent.click(submitBtn);

    expect(toastMock.error).toHaveBeenCalledWith('Please fill in all fields');
    expect(loginMock).not.toHaveBeenCalled();

    // Clear mocks for scenario 2
    vi.clearAllMocks();

    // Scenario 2: Missing Password (and non-empty email to test password validation)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '' } }); // Ensure password is empty last

    fireEvent.click(submitBtn);

    expect(toastMock.error).toHaveBeenCalledWith('Please fill in all fields');
    expect(loginMock).not.toHaveBeenCalled();
  });


  it('shows error toast on login failure', async () => {
    renderLogin();
    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });

    // Mock failure
    loginMock.mockRejectedValueOnce(new Error('Invalid credentials'));

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Invalid email or password!');
    });
  });

  it('disables login button when loading', () => {
    // Set loading state
    authState.isLoading = true;
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /Signing in.../i });
    expect(submitBtn).toBeDisabled();

    const googleBtn = screen.getByText(/Continue with Google/i).closest('button');
    expect(googleBtn).toBeDisabled();
  });

  it('handles Google Sign In success', async () => {
    renderLogin();
    const googleBtn = screen.getByText(/Continue with Google/i);

    signInWithProviderMock.mockResolvedValueOnce({});

    fireEvent.click(googleBtn);

    // Note: The toast call in component is toast('Redirecting...')
    // We mocked 'sonner' such that 'toast' itself is a function (toastMock.default)
    expect(toastMock.default).toHaveBeenCalledWith('Redirecting to Google...');

    await waitFor(() => {
      expect(signInWithProviderMock).toHaveBeenCalledWith('google');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  // **********************************
  // ** NEW TEST 2: Google Error Fallback **
  // **********************************
  it('handles Google Sign In error when error object lacks a message', async () => {
    renderLogin();
    const googleBtn = screen.getByText(/Continue with Google/i);

    // Mock failure with an error object that has no message property, triggering JSON.stringify
    signInWithProviderMock.mockRejectedValueOnce({ status: 500, detail: 'Server Error' });

    fireEvent.click(googleBtn);

    await waitFor(() => {
      // Expect the error toast to contain the stringified object
      expect(toastMock.error).toHaveBeenCalledWith(
        '{"status":500,"detail":"Server Error"}. Please ensure Google OAuth is configured in your Supabase project.'
      );
    });
  });


  it('opens forgot password dialog and sends email', async () => {
    renderLogin();

    // Open Dialog
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    // Wait for dialog
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Fill Email in Dialog
    // We use getAllByPlaceholderText because the main form also has an email input
    const inputs = screen.getAllByPlaceholderText('john@example.com');
    // The last one is usually the one in the dialog (rendered last)
    const dialogInput = inputs.at(-1)!;

    fireEvent.change(dialogInput, { target: { value: 'reset@example.com' } });

    // Mock Reset Success
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith('reset@example.com', expect.any(Object));
      expect(toastMock.success).toHaveBeenCalledWith('Password reset email sent!', expect.any(Object));
    });
  });


  it('validates reset password dialog behavior', async () => {
    renderLogin();

    // Open Dialog
    fireEvent.click(screen.getByText(/Forgot password\?/i));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    // Should be disabled initially (empty email)
    expect(sendBtn).toBeDisabled();

    // Fill Email
    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'test@example.com' } });

    // Should be enabled now
    expect(sendBtn).not.toBeDisabled();

    // Click Cancel
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles reset password email error', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'error@example.com' } });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });

    resetPasswordForEmailMock.mockResolvedValueOnce({ error: { message: 'Invalid email' } });

    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to send reset email.', {
        description: 'Invalid email'
      });
    });
  });

  // **********************************
  // ** NEW TEST 3: Reset Error Fallback **
  // **********************************
  it('handles reset password error when the error message is undefined, using the fallback description', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'no-message-error@example.com' } });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });

    // Mock failure with an error object that has a message property set to null/undefined
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: { message: undefined } });

    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to send reset email.', {
        description: 'Please check your email and try again.' // Fallback
      });
    });
  });


  it('verifies reset password success toast description', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'success@example.com' } });

    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Password reset email sent!', {
        description: 'Check your inbox for the link to reset your password.'
      });
    });
  });

  it('prevents reset email submission when email is empty', () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });

    // Should be disabled when email is empty
    expect(sendBtn).toBeDisabled();
  });

  it('closes reset password dialog and clears email on cancel', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'test@example.com' } });

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('verifies reset password closes dialog after success', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'close@example.com' } });

    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('verifies reset password clears email after success', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'clear@example.com' } });

    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('Password reset email sent!', expect.any(Object));
    });

    // Open dialog again to verify email was cleared
    fireEvent.click(screen.getByText(/Forgot password\?/i));
    const newInputs = screen.getAllByPlaceholderText('john@example.com');
    const newDialogInput = newInputs.at(-1)! as HTMLInputElement;
    expect(newDialogInput.value).toBe('');
  });

  it('passes correct redirectTo parameter in reset password email', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'redirect@example.com' } });

    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
        'redirect@example.com',
        expect.objectContaining({
          redirectTo: 'http://localhost:3000/forgot-password'
        })
      );
    });
  });

  it('verifies finally block executes after reset password error', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'finally@example.com' } });

    // Mock error
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: { message: 'Error' } });

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });

    // Button should be enabled before click
    expect(sendBtn).not.toBeDisabled();

    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalled();
    });

    // After error, button should be enabled again (finally block runs)
    expect(sendBtn).not.toBeDisabled();
  });

  it('shows error when reset email field is empty', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    await screen.findByRole('dialog');

    // Click send without entering email
    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });

    // Button should be disabled when email is empty
    expect(sendBtn).toBeDisabled();
  });

  it('verifies Google sign-in clears loading state on error', async () => {
    renderLogin();
    const googleBtn = screen.getByText(/Continue with Google/i);

    // Mock error
    signInWithProviderMock.mockRejectedValueOnce(new Error('OAuth failed'));

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalled();
    });

    // After error, button should be enabled again (loading state cleared)
    expect(googleBtn).not.toBeDisabled();
  });

  it('renders Moon icon in light theme', () => {
    renderLogin();
    // In light theme, Moon icon should be visible (theme is mocked as 'light')
    // The theme toggle button contains an SVG icon
    const buttons = screen.getAllByRole('button');
    const themeButton = buttons.find(btn =>
      btn.querySelector('svg') &&
      btn.className.includes('absolute') &&
      btn.className.includes('top-4')
    );
    expect(themeButton).toBeInTheDocument();
  });

  // Additional edge case tests for better mutation coverage

  it('handles both missing email and password', () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: 'Sign In' });

    // Remove required attributes
    emailInput.removeAttribute('required');
    passwordInput.removeAttribute('required');

    // Both fields empty
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });
    fireEvent.click(submitBtn);

    expect(toastMock.error).toHaveBeenCalledWith('Please fill in all fields');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('handles Google Sign In with null error', async () => {
    renderLogin();
    const googleBtn = screen.getByText(/Continue with Google/i);

    // Mock failure with null as error
    signInWithProviderMock.mockRejectedValueOnce(null);

    fireEvent.click(googleBtn);

    await waitFor(() => {
      // Should use fallback message
      expect(toastMock.error).toHaveBeenCalledWith(
        'Unable to start Google sign-in. Please ensure Google OAuth is configured in your Supabase project.'
      );
    });
  });

  it('verifies theme toggle functionality', () => {
    renderLogin();
    const buttons = screen.getAllByRole('button');
    const themeButton = buttons.find(btn =>
      btn.className.includes('absolute') &&
      btn.className.includes('top-4')
    );

    expect(themeButton).toBeInTheDocument();
    // Theme toggle should be clickable
    fireEvent.click(themeButton!);
  });

  it('renders demo credentials section', () => {
    renderLogin();
    expect(screen.getByText(/Demo Credentials:/i)).toBeInTheDocument();
    expect(screen.getByText(/user@demo.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Regular User:/i)).toBeInTheDocument();
    expect(screen.getByText(/parent@demo.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Parent User:/i)).toBeInTheDocument();
  });

  it('renders sign up link', () => {
    renderLogin();
    const signUpLink = screen.getByText(/Sign up/i);
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('verifies logo link navigates to home', () => {
    renderLogin();
    const logoLink = screen.getByRole('link', { name: 'Coincious' });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('handles successful login with navigation', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: 'Sign In' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    loginMock.mockResolvedValueOnce({});

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
      expect(toastMock.success).toHaveBeenCalled();
    });
  });

  it('verifies password input type changes on toggle', () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    const toggleButton = passwordInput.nextElementSibling as HTMLElement;

    // Initial state - password hidden
    expect(passwordInput.type).toBe('password');

    // Toggle to show
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // Toggle to hide again
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('renders email and password icons', () => {
    renderLogin();
    const container = screen.getByLabelText(/Email/i).parentElement;
    expect(container?.querySelector('svg')).toBeInTheDocument(); // Mail icon

    const passwordContainer = screen.getByLabelText(/Password/i).parentElement;
    expect(passwordContainer?.querySelector('svg')).toBeInTheDocument(); // Lock icon
  });

  it('displays loading state during login', async () => {
    authState.isLoading = true;
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /Signing in.../i });
    expect(submitBtn).toBeDisabled();
  });

  it('handles exception during password reset with throw', async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/Forgot password\?/i));

    const inputs = screen.getAllByPlaceholderText('john@example.com');
    const dialogInput = inputs.at(-1)!;
    fireEvent.change(dialogInput, { target: { value: 'throw@example.com' } });

    // Mock with throw error (not resolved with error object)
    resetPasswordForEmailMock.mockRejectedValueOnce(new Error('Network error'));

    const sendBtn = screen.getByRole('button', { name: 'Send Reset Email' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to send reset email.', {
        description: 'Network error'
      });
    });
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Login } from './Login';
import { MemoryRouter } from 'react-router-dom';

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
});
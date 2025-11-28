import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Register } from './Register';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks Setup ---

// 1. Hoist mocks
const { 
  registerMock, 
  signInWithProviderMock, 
  navigateMock, 
  toastMock,
  toggleThemeMock
} = vi.hoisted(() => {
  return {
    registerMock: vi.fn(),
    signInWithProviderMock: vi.fn(),
    navigateMock: vi.fn(),
    toggleThemeMock: vi.fn(),
    toastMock: {
      success: vi.fn(),
      error: vi.fn(),
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

// 3. Mock Sonner
vi.mock('sonner', () => ({
  toast: Object.assign(toastMock.default, toastMock),
}));

// 4. Mock ThemeContext
vi.mock('../ui/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: toggleThemeMock,
  }),
}));

// 5. Mock useAuth
let authState = {
  isLoading: false,
};

vi.mock('../../App', () => ({
  useAuth: () => ({
    register: registerMock,
    signInWithProvider: signInWithProviderMock,
    isLoading: authState.isLoading,
  }),
}));

// --- Tests ---

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isLoading = false;
    vi.useFakeTimers(); 
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderRegister = () => {
    return render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
  };

  it('renders the registration form correctly', () => {
    renderRegister();
    
    expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument(); 
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /I agree to the Terms of Service/i })).toBeInTheDocument();
    expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
  });

  it('updates input fields correctly', () => {
    renderRegister();

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    expect(nameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john@example.com');
  });

  it('toggles password visibility for both password fields', () => {
    renderRegister();
    const passwordInput = screen.getByLabelText('Password');
    const confirmInput = screen.getByLabelText('Confirm Password');

    // Robustly find the toggle buttons relative to their inputs
    const passwordToggle = passwordInput.parentElement?.querySelector('button');
    const confirmToggle = confirmInput.parentElement?.querySelector('button');

    // Test Main Password Toggle
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(passwordToggle!);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(passwordToggle!);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Test Confirm Password Toggle
    expect(confirmInput).toHaveAttribute('type', 'password');
    fireEvent.click(confirmToggle!);
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('shows password requirements popup on focus and validates live', () => {
    renderRegister();
    const passwordInput = screen.getByLabelText('Password');

    // Initially popup is hidden
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument();

    // Focus shows requirements
    fireEvent.focus(passwordInput);
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();

    // 1. Type partial/weak password
    fireEvent.change(passwordInput, { target: { value: 'abc' } });
    
    // Check specific requirement status
    // "At least 8 characters" should have 'text-muted-foreground' (gray/invalid)
    const lengthReq = screen.getByText('At least 8 characters');
    expect(lengthReq).toHaveClass('text-muted-foreground'); 

    // 2. Type valid password
    fireEvent.change(passwordInput, { target: { value: 'Abc123!@' } });
    
    // "At least 8 characters" should now have 'text-green-600' (valid)
    expect(lengthReq).toHaveClass('text-green-600');
    
    // Blur hides the popup
    fireEvent.blur(passwordInput);
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument();
  });

  it('shows validation toast on blur if password is incomplete', async () => {
    renderRegister();
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.focus(passwordInput);
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining('Password must contain'));
    });
  });

  it('validates form on submit (empty fields)', () => {
    renderRegister();
    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    
    fireEvent.click(submitBtn);
    expect(toastMock.error).toHaveBeenCalledWith('Please fill in all fields');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('validates password mismatch', () => {
    renderRegister();
    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 't@t.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abc123!@' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Mismatch' } });
    
    fireEvent.click(submitBtn);
    expect(toastMock.error).toHaveBeenCalledWith('Passwords do not match');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('validates password requirements on submit even if fields match', () => {
    renderRegister();
    const submitBtn = screen.getByRole('button', { name: 'Create Account' });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 't@t.com' } });
    // Weak password that matches
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'weak' } });

    fireEvent.click(submitBtn);
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining('Password must contain'));
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('validates terms acceptance', () => {
    renderRegister();
    const submitBtn = screen.getByRole('button', { name: 'Create Account' });

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 't@t.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abc123!@' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Abc123!@' } });
    // Terms Checkbox NOT clicked

    // Attempting to submit via form event (since button might be disabled visually)
    fireEvent.submit(submitBtn.closest('form')!);
    
    expect(toastMock.error).toHaveBeenCalledWith('Please accept the terms and conditions');
  });

  it('calls register on successful submission', async () => {
    renderRegister();
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abc123!@' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Abc123!@' } });
    
    // Click checkbox
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    expect(submitBtn).not.toBeDisabled();

    registerMock.mockResolvedValueOnce({});

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith('test@example.com', 'Abc123!@', 'Test User');
      expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('Check your email'));
    });
  });

  it('handles generic registration error', async () => {
    renderRegister();
    
    // Fill valid form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'fail@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abc123!@' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Abc123!@' } });
    fireEvent.click(screen.getByRole('checkbox'));

    registerMock.mockRejectedValueOnce(new Error('Network error'));

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Network error');
    });
  });

  it('handles "User already registered" error with redirect', async () => {
    renderRegister();
    
    // Fill valid form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'exists@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abc123!@' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Abc123!@' } });
    fireEvent.click(screen.getByRole('checkbox'));

    // Mock specific error
    registerMock.mockRejectedValueOnce(new Error('User already registered'));

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("This account already exists!", expect.any(Object));
    });

    // Advance timers to trigger navigation
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('handles Google Sign Up', async () => {
    renderRegister();
    const googleBtn = screen.getByText(/Continue with Google/i);

    signInWithProviderMock.mockResolvedValueOnce({});

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(signInWithProviderMock).toHaveBeenCalledWith('google');
    });
  });

  it('handles Google Sign Up failure', async () => {
    renderRegister();
    const googleBtn = screen.getByText(/Continue with Google/i);

    signInWithProviderMock.mockRejectedValueOnce(new Error('Google fail'));

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Google sign-up failed. Please try again.');
    });
  });

  it('toggles theme when theme button is clicked', () => {
    renderRegister();
    
    // The theme toggle is the absolute positioned ghost button at the top right
    // We can identify it by looking for the Sun/Moon icon inside a button
    // Or simply assuming it's the first button in the DOM before the main form
    const buttons = screen.getAllByRole('button');
    const themeBtn = buttons[0]; 
    
    fireEvent.click(themeBtn);
    expect(toggleThemeMock).toHaveBeenCalled();
  });
});
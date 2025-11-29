import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App, { AuthProvider, useAuth } from './App';

// --- Hoisted Mocks ---
const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    getUser: vi.fn(),
    rpcCheckEmail: vi.fn(),
    toastError: vi.fn(),
}));

// --- Mock Modules ---

vi.mock('./utils/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: mocks.getSession,
            onAuthStateChange: mocks.onAuthStateChange,
            signOut: mocks.signOut,
            signInWithPassword: mocks.signInWithPassword,
            signUp: mocks.signUp,
            signInWithOAuth: mocks.signInWithOAuth,
            getUser: mocks.getUser,
        },
        rpc: mocks.rpcCheckEmail,
    },
}));

vi.mock('sonner', () => ({
    toast: {
        error: mocks.toastError,
    },
    Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

// Mock all page components
vi.mock('./components/pages/Landing', () => ({
    Landing: () => <div data-testid="landing-page">Landing</div>,
}));
vi.mock('./components/pages/Login', () => ({
    Login: () => <div data-testid="login-page">Login</div>,
}));
vi.mock('./components/pages/Register', () => ({
    Register: () => <div data-testid="register-page">Register</div>,
}));
vi.mock('./components/pages/Dashboard', () => ({
    Dashboard: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock('./components/pages/AddExpense', () => ({
    AddExpense: () => <div data-testid="add-expense-page">AddExpense</div>,
}));
vi.mock('./components/pages/Profile', () => ({
    Profile: () => <div data-testid="profile-page">Profile</div>,
}));
vi.mock('./components/pages/Groups', () => ({
    Groups: () => <div data-testid="groups-page">Groups</div>,
}));
vi.mock('./components/pages/GroupDetail', () => ({
    GroupDetail: () => <div data-testid="group-detail-page">GroupDetail</div>,
}));
vi.mock('./components/pages/Support', () => ({
    Support: () => <div data-testid="support-page">Support</div>,
}));
vi.mock('./components/pages/Notifications', () => ({
    Notifications: () => <div data-testid="notifications-page">Notifications</div>,
}));
vi.mock('./components/pages/Chatbot', () => ({
    Chatbot: () => <div data-testid="chatbot-page">Chatbot</div>,
}));
vi.mock('./components/pages/Settings', () => ({
    Settings: () => <div data-testid="settings-page">Settings</div>,
}));
vi.mock('./components/pages/PasswordResetPage', () => ({
    PasswordResetPage: () => <div data-testid="password-reset-page">PasswordReset</div>,
}));
vi.mock('./components/pages/AuthVerify', () => ({
    AuthVerify: () => <div data-testid="auth-verify-page">AuthVerify</div>,
}));
vi.mock('./components/Layout', () => ({
    Layout: ({ children }: any) => <div data-testid="layout">{children}</div>,
}));
vi.mock('./components/ui/ThemeContext', () => ({
    ThemeProvider: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('./components/ui/SettingContext', () => ({
    SettingsProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.stubGlobal('import.meta', {
    env: {
        VITE_SUPABASE_REDIRECT_URL: 'http://localhost:3000',
        VITE_SUPABASE_ADMIN_ENDPOINT: 'http://localhost:3000/admin',
    }
});

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock setup
        mocks.getSession.mockResolvedValue({ data: { session: null } });
        mocks.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        });
        mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    });

    describe('App Rendering', () => {
        it('renders without crashing', () => {
            render(<App />);
            expect(document.body).toBeTruthy();
        });
    });

    describe('AuthProvider', () => {
        const TestComponent = () => {
            const { user, isLoading } = useAuth();
            return (
                <div>
                    <div data-testid="user">{user ? user.email : 'null'}</div>
                    <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
                </div>
            );
        };

        it('provides auth context to children', async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
            }, { timeout: 3000 });
        });

        it('initializes with loading state', () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            expect(screen.getByTestId('loading')).toHaveTextContent('loading');
        });

        it('sets user to null when no session exists', async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('null');
            }, { timeout: 3000 });
        });

        it('subscribes to auth state changes', async () => {
            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(mocks.onAuthStateChange).toHaveBeenCalled();
            });
        });

        it('unsubscribes on unmount', async () => {
            const unsubscribe = vi.fn();
            mocks.onAuthStateChange.mockReturnValue({
                data: { subscription: { unsubscribe } },
            });

            const { unmount } = render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(mocks.onAuthStateChange).toHaveBeenCalled();
            });

            unmount();

            expect(unsubscribe).toHaveBeenCalled();
        });
    });

    describe('useAuth Hook', () => {
        it('throws error when used outside AuthProvider', () => {
            const TestComponent = () => {
                useAuth();
                return <div>Test</div>;
            };

            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');

            consoleSpy.mockRestore();
        });

        it('returns auth context when used within AuthProvider', async () => {
            const TestComponent = () => {
                const auth = useAuth();
                return <div data-testid="has-auth">{auth ? 'has auth' : 'no auth'}</div>;
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('has-auth')).toHaveTextContent('has auth');
            }, { timeout: 3000 });
        });
    });

    describe('Login Function', () => {
        it('calls signInWithPassword with correct credentials', async () => {
            mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });

            const TestComponent = () => {
                const { login } = useAuth();
                return <button onClick={() => login('test@example.com', 'password123')}>Login</button>;
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => screen.getByRole('button'), { timeout: 3000 });

            await act(async () => {
                screen.getByRole('button').click();
            });

            await waitFor(() => {
                expect(mocks.signInWithPassword).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'password123',
                });
            }, { timeout: 3000 });
        });

        it('throws error when login fails', async () => {
            const error = new Error('Invalid credentials');
            mocks.signInWithPassword.mockResolvedValue({ error });

            const TestComponent = () => {
                const { login } = useAuth();
                return (
                    <button onClick={async () => {
                        try {
                            await login('test@example.com', 'wrong');
                        } catch (e: any) {
                            document.body.setAttribute('data-error', e.message);
                        }
                    }}>Login</button>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => screen.getByRole('button'), { timeout: 3000 });

            await act(async () => {
                screen.getByRole('button').click();
            });

            await waitFor(() => {
                expect(document.body.getAttribute('data-error')).toBe('Invalid credentials');
            }, { timeout: 3000 });
        });
    });

    describe('Register Function', () => {
        it('calls signUp when email is new', async () => {
            mocks.rpcCheckEmail.mockResolvedValue({ data: false, error: null });
            mocks.signUp.mockResolvedValue({ data: {}, error: null });

            const TestComponent = () => {
                const { register } = useAuth();
                return (
                    <button onClick={() => register('new@example.com', 'password123', 'New User')}>
                        Register
                    </button>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => screen.getByRole('button'), { timeout: 3000 });

            await act(async () => {
                screen.getByRole('button').click();
            });

            await waitFor(() => {
                expect(mocks.rpcCheckEmail).toHaveBeenCalled();
            }, { timeout: 3000 });
        });

        it('throws error when email already exists', async () => {
            mocks.rpcCheckEmail.mockResolvedValue({ data: true, error: null });

            const TestComponent = () => {
                const { register } = useAuth();
                return (
                    <button onClick={async () => {
                        try {
                            await register('existing@example.com', 'password123', 'User');
                        } catch (e: any) {
                            document.body.setAttribute('data-error', e.message);
                        }
                    }}>Register</button>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => screen.getByRole('button'), { timeout: 3000 });

            await act(async () => {
                screen.getByRole('button').click();
            });

            await waitFor(() => {
                expect(document.body.getAttribute('data-error')).toBe('User already registered. Please log in instead.');
            }, { timeout: 3000 });
        });
    });

    describe('Logout Function', () => {
        it('calls signOut', async () => {
            mocks.signOut.mockResolvedValue({ error: null });

            const TestComponent = () => {
                const { logout } = useAuth();
                return <button onClick={logout}>Logout</button>;
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => screen.getByRole('button'), { timeout: 3000 });

            await act(async () => {
                screen.getByRole('button').click();
            });

            await waitFor(() => {
                expect(mocks.signOut).toHaveBeenCalled();
            }, { timeout: 3000 });
        });
    });

    describe('SignInWithProvider Function', () => {
        it('calls signInWithOAuth with correct provider', async () => {
            mocks.signInWithOAuth.mockResolvedValue({ error: null });

            const TestComponent = () => {
                const { signInWithProvider } = useAuth();
                return <button onClick={() => signInWithProvider('google')}>Sign in with Google</button>;
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => screen.getByRole('button'), { timeout: 3000 });

            await act(async () => {
                screen.getByRole('button').click();
            });

            await waitFor(() => {
                expect(mocks.signInWithOAuth).toHaveBeenCalled();
            }, { timeout: 3000 });
        });

        it('throws error when OAuth fails', async () => {
            const error = new Error('OAuth failed');
            mocks.signInWithOAuth.mockResolvedValue({ error });

            const TestComponent = () => {
                const { signInWithProvider } = useAuth();
                return (
                    <button onClick={async () => {
                        try {
                            await signInWithProvider('google');
                        } catch (e: any) {
                            document.body.setAttribute('data-error', e.message);
                        }
                    }}>Sign in</button>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => screen.getByRole('button'), { timeout: 3000 });

            await act(async () => {
                screen.getByRole('button').click();
            });

            await waitFor(() => {
                expect(document.body.getAttribute('data-error')).toBe('OAuth failed');
            }, { timeout: 3000 });
        });
    });

    describe('Auth State Changes', () => {
        it('handles SIGNED_IN event', async () => {
            let authCallback: any;
            mocks.onAuthStateChange.mockImplementation((callback) => {
                authCallback = callback;
                return { data: { subscription: { unsubscribe: vi.fn() } } };
            });

            const TestComponent = () => {
                const { user } = useAuth();
                return <div data-testid="user">{user ? user.email : 'null'}</div>;
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('null');
            }, { timeout: 3000 });

            // Simulate auth state change
            const newSession = {
                user: {
                    id: 'user-456',
                    email: 'newuser@example.com',
                    aud: 'authenticated',
                    user_metadata: {
                        full_name: 'New User',
                        avatar_url: '',
                    },
                },
            };

            act(() => {
                authCallback('SIGNED_IN', newSession);
            });

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('newuser@example.com');
            }, { timeout: 3000 });
        });

        it('handles SIGNED_OUT event', async () => {
            let authCallback: any;
            const mockSession = {
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    aud: 'authenticated',
                    user_metadata: {
                        full_name: 'Test User',
                        avatar_url: '',
                    },
                },
            };

            mocks.getSession.mockResolvedValue({ data: { session: mockSession } });
            mocks.onAuthStateChange.mockImplementation((callback) => {
                authCallback = callback;
                return { data: { subscription: { unsubscribe: vi.fn() } } };
            });

            const TestComponent = () => {
                const { user } = useAuth();
                return <div data-testid="user">{user ? user.email : 'null'}</div>;
            };

            render(
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
            }, { timeout: 3000 });

            // Simulate sign out
            act(() => {
                authCallback('SIGNED_OUT', null);
            });

            await waitFor(() => {
                expect(screen.getByTestId('user')).toHaveTextContent('null');
            }, { timeout: 3000 });
        });
    });
});

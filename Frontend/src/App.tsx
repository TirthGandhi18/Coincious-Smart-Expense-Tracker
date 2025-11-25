import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner'; // Import toast for notifications
import { supabase } from "./utils/supabase/client";
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Page components
import { Landing } from './components/pages/Landing';
import { Login } from './components/pages/Login';
import { Register } from './components/pages/Register';
import { Dashboard } from './components/pages/Dashboard';
import { AddExpense } from './components/pages/AddExpense';
import { Layout } from './components/Layout';
import { Profile } from './components/pages/Profile';
import { Groups } from './components/pages/Groups';
import { GroupDetail } from './components/pages/GroupDetail';
import { Support } from './components/pages/Support';
import { Notifications } from './components/pages/Notifications';
import { Chatbot } from './components/pages/Chatbot';
import { Settings } from './components/pages/Settings';
import { ExpenseCalendar } from './components/pages/ExpenseCalendar';
import { ThemeProvider } from './components/ui/ThemeContext';
import { SettingsProvider } from './components/ui/SettingContext';
import { PasswordResetPage } from './components/pages/PasswordResetPage';
import { AuthVerify } from './components/pages/AuthVerify';

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && user.aud === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Simple Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.aud !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}


// Main App Component
function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/auth/verify" element={<PublicRoute><AuthVerify /></PublicRoute>} />

        <Route
          path="/forgot-password"
          element={
            <ProtectedRoute>
              <PasswordResetPage />
            </ProtectedRoute>
          }
        />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/add-expense" element={<ProtectedRoute><Layout><AddExpense /></Layout></ProtectedRoute>} />

        {/* PROFILE ROUTE - PROPERLY CONFIGURED */}
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />

        {/* Group ROUTES */}
        <Route path="/groups" element={
          <ProtectedRoute>
            <Layout>
              <Groups />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/groups/:id" element={
          <ProtectedRoute>
            <Layout>
              <GroupDetail />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Placeholder routes for other pages */}
        <Route path="/parental" element={<ProtectedRoute><Layout><div className="p-6"><h1 className="text-2xl font-bold">Parental Controls</h1><p>Coming soon...</p></div></Layout></ProtectedRoute>} />


        <Route path="/support" element={
          <ProtectedRoute>
            <Layout>
              <Support />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/chatbot" element={
          <ProtectedRoute>
            <Layout>
              <Chatbot />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/calendar" element={
          <ProtectedRoute>
            <Layout>
              <ExpenseCalendar />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

// Types
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isParent?: boolean;
  aud?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  signInWithProvider: (provider: string) => Promise<void>;
  supabase?: any;
  supabaseAdminEndpoint?: string;
}

// Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Initial Session Load & Realtime Listener
  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name,
          email: session.user.email || "",
          avatar: session.user.user_metadata.avatar_url,
          aud: session.user.aud,
        });
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name,
          email: session.user.email || "",
          avatar: session.user.user_metadata.avatar_url,
          aud: session.user.aud,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- NEW: Session Validity Checker ---
  // This fixes the issue where a user stays logged in on an old device 
  // even after the token was refreshed/invalidated by a new login elsewhere.
  useEffect(() => {
    // Only setup the checker if a user is currently logged in locally
    if (!user) return;

    const checkSession = async () => {
      // getUser() hits the Supabase Auth server to verify the token is still valid
      // Unlike getSession(), this will fail if the token was revoked or replaced
      const { error } = await supabase.auth.getUser();
      
      if (error) {
        console.warn("Session check failed, logging out:", error.message);
        toast.error("Session expired. Please log in again.");
        logout();
      }
    };

    // Check immediately on mount
    checkSession();

    // Check whenever the window regains focus (e.g. user switches tabs back to this app)
    const handleFocus = () => checkSession();
    window.addEventListener('focus', handleFocus);

    // Also check periodically (every 2 minutes) as a fallback
    const intervalId = setInterval(checkSession, 2 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [user]); // Re-run if the user object changes (e.g. log in/out)


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    const redirectTo = `${window.location.origin}/auth/verify`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: name,
        },
      },
    });
    setIsLoading(false);
    if (error) {
      throw error;
    }
  };

  const signInWithProvider = async (provider: string) => {
    setIsLoading(true);
    const redirectTo = (import.meta.env.VITE_SUPABASE_REDIRECT_URL as string) || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({ provider: provider as any, options: { redirectTo } });
    if (error) {
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoading,
        signInWithProvider,
        supabase,
        supabaseAdminEndpoint: (import.meta.env.VITE_SUPABASE_ADMIN_ENDPOINT as string) || undefined,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}



// Custom hooks
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// (Theme handled by shared ThemeProvider in components/ui/ThemeContext)

// App with all providers
export default function App() {
  return (
    <ThemeProvider>
      {/* AuthProvider comes FIRST so SettingsProvider can use the user info */}
      <AuthProvider>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
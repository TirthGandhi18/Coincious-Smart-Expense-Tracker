import React, { useState, createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { supabase } from "./utils/supabase/client";
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

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
import { ThemeProvider } from './components/ui/ThemeContext';
import { SettingsProvider } from './components/ui/SettingContext';
import { PasswordResetPage } from './components/pages/PasswordResetPage';
import { AuthVerify } from './components/pages/AuthVerify';

// Fix S6759: Mark props as readonly
function PublicRoute({ children }: { readonly children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fix S6582: Use optional chaining
  if (user?.aud === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Simple Protected Route Component
function ProtectedRoute({ children }: { readonly children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fix S6582: Use optional chaining (implicitly handles null/undefined checks)
  if (user?.aud !== 'authenticated') {
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
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />

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
export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wrap functions in useCallback for referential stability (part of fixing S6481)
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

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

  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      const { error } = await supabase.auth.getUser();
      
      if (error) {
        console.warn("Session check failed, logging out:", error.message);
        toast.error("Session expired. Please log in again.");
        logout();
      }
    };

    checkSession();
    const handleFocus = () => checkSession();
    // Fix S7764: Use globalThis instead of window
    globalThis.addEventListener('focus', handleFocus);
    const intervalId = setInterval(checkSession, 2 * 60 * 1000);

    return () => {
      globalThis.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [user, logout]);


  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    
    // Fix S2737: Removed redundant catch block. Finally will run, error will bubble up.
    try {
      const { data: emailExists, error: rpcError } = await supabase.rpc('check_email_exists', { 
        email_check: email 
      });

      if (rpcError) {
        console.error("Error checking email:", rpcError);
      }

      if (emailExists) {
        throw new Error("User already registered. Please log in instead.");
      }

      // Fix S7764: Use globalThis for location
      const redirectTo = `${globalThis.location.origin}/auth/verify`;
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

      if (error) throw error;

    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithProvider = useCallback(async (provider: string) => {
    setIsLoading(true);
    // Fix S7764: Use globalThis for location
    const redirectTo = (import.meta.env.VITE_SUPABASE_REDIRECT_URL as string) || globalThis.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({ provider: provider as any, options: { redirectTo } });
    if (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Fix S6481: Wrap the context value in useMemo to prevent re-creation on every render
  const authValue = useMemo(() => ({
    user,
    login,
    register,
    logout,
    isLoading,
    signInWithProvider,
    supabase,
    supabaseAdminEndpoint: (import.meta.env.VITE_SUPABASE_ADMIN_ENDPOINT as string) || undefined,
  }), [user, login, register, logout, isLoading, signInWithProvider]);

  return (
    <AuthContext.Provider value={authValue}>
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
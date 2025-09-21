import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';

// Page components we're keeping
import { Landing } from './components/pages/Landing';
import { Login } from './components/pages/Login';
import { Register } from './components/pages/Register';
import { SimpleDashboard } from './components/pages/SimpleDashboard';

// Simple Public Route Component (redirects to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Simple Protected Route Component (redirects to login if not authenticated)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
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
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected dashboard route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SimpleDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all route - redirect to dashboard if authenticated, otherwise to landing */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

// Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Theme Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hardcoded credentials
const HARDCODED_EMAIL = "admin@gmail.com";
const HARDCODED_PASSWORD = "password";

// Auth Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const userState = useState<User | null>(null);
  const loadingState = useState(false);
  
  const user = userState[0];
  const setUser = userState[1];
  const isLoading = loadingState[0];
  const setIsLoading = loadingState[1];

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate a brief loading time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
      setUser({
        id: '1',
        name: 'Admin User',
        email: HARDCODED_EMAIL,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format'
      });
    } else {
      throw new Error('Invalid credentials');
    }
    
    setIsLoading(false);
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    
    // Simulate a brief loading time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For this simple version, we only accept registration with our hardcoded credentials
    if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
      setUser({
        id: '1',
        name: name || 'Admin User',
        email: HARDCODED_EMAIL,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format'
      });
    } else {
      throw new Error('Registration failed');
    }
    
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Theme Provider
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeState = useState(false);
  
  const isDark = themeState[0];
  const setIsDark = themeState[1];

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
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

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// App with all providers
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
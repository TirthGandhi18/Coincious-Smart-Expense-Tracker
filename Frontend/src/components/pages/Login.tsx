import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

import { Badge } from "../ui/badge";
import { useAuth, useTheme } from "../../App";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Sun,
  Moon,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export function Login() {
  // Simple state for form data
  const userEmail = useState("");
  const userPassword = useState("");
  const showPasswordState = useState(false);

  const email = userEmail[0];
  const setEmail = userEmail[1];
  const password = userPassword[0];
  const setPassword = userPassword[1];
  const showPassword = showPasswordState[0];
  const setShowPassword = showPasswordState[1];

  const { login, isLoading, signInWithProvider } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);

  // Simple form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation - simple and clear
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      // Attempt login with hardcoded credentials
      await login(email, password);
      toast.success("Correct password! Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Invalid email or password!");
    }
  };

  // Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      // Inform the user and start the OAuth flow
      toast('Redirecting to Google...');
      await signInWithProvider('google');
      // If the flow doesn't redirect, reset loading
      setGoogleLoading(false);
    } catch (err: any) {
      setGoogleLoading(false);
      // Show a helpful error message from the provider when available
      const message = err?.message || (err && JSON.stringify(err)) || 'Unable to start Google sign-in';
      toast.error(`${message}. Please ensure Google OAuth is configured in your Supabase project.`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Simple background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20" />

      {/* Theme toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10"
        onClick={toggleTheme}
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      <div className="relative w-full max-w-md">
        {/* App header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-4"
          >
            <h1 className="text-2xl font-bold text-primary">
              Smart Expense
            </h1>
            <Badge variant="secondary">PWA</Badge>
          </Link>
          <p className="text-muted-foreground">
            Welcome back to smarter expense management
          </p>
        </div>

        {/* Login form card */}
        <Card className="backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {/* Email input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login button */}
              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                {/* Small Google OAuth button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || googleLoading}
                >
                  <svg className="h-4 w-4" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                    <path d="M533.5 278.4c0-17.4-1.4-34.1-4-50.3H272v95.1h146.9c-6.3 34.2-25.2 63.2-53.8 82.6v68.6h86.8c50.8-46.8 83.6-115.9 83.6-191.1z" fill="#4285F4"/>
                    <path d="M272 544.3c72.6 0 133.6-24.1 178.2-65.5l-86.8-68.6c-24.1 16.2-55 25.8-91.4 25.8-70 0-129.4-47.2-150.6-110.6H33.4v69.6C77.8 487 168 544.3 272 544.3z" fill="#34A853"/>
                    <path d="M121.4 324.4c-10.8-32.6-10.8-67.6 0-100.2V154.6H33.4c-39.1 76.4-39.1 166.9 0 243.3l88-73.5z" fill="#FBBC05"/>
                    <path d="M272 107.7c39.5-.6 77.3 14.3 106 41.3l79.3-79.3C405.6 24.3 344.6 0 272 0 168 0 77.8 57.3 33.4 154.6l88 69.6C142.6 155 202 107.7 272 107.7z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </CardContent>
          </form>

          <CardFooter className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Demo login info */}
        <Card className="mt-4 bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Demo Credentials:
            </p>
            <div className="text-xs space-y-1 text-center">
              <p>
                <strong>Regular User:</strong> user@demo.com /
                password
              </p>
              <p>
                <strong>Parent User:</strong> parent@demo.com /
                password
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
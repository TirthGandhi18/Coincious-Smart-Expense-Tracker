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

  const { login, isLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

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
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
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
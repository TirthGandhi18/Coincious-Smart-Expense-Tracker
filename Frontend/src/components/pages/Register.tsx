import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../App';
import { ThemeProvider, useTheme } from '../ui/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon, Mail, Lock, User, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../ui/logo';


export function Register() {
  // Simple state for all form fields
  const userName = useState('');
  const userEmail = useState('');
  const userPassword = useState('');
  const userConfirmPassword = useState('');
  const showPasswordState = useState(false);
  const showConfirmPasswordState = useState(false);
  const termsAccepted = useState(false);

  const name = userName[0];
  const setName = userName[1];
  const email = userEmail[0];
  const setEmail = userEmail[1];
  const password = userPassword[0];
  const setPassword = userPassword[1];
  const confirmPassword = userConfirmPassword[0];
  const setConfirmPassword = userConfirmPassword[1];
  const showPassword = showPasswordState[0];
  const setShowPassword = showPasswordState[1];
  const showConfirmPassword = showConfirmPasswordState[0];
  const setShowConfirmPassword = showConfirmPasswordState[1];
  const acceptTerms = termsAccepted[0];
  const setAcceptTerms = termsAccepted[1];
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Helper: return array of missing password requirement descriptions
  const getMissingPasswordRequirements = () => {
    const missing: string[] = [];
    if (!hasLength) missing.push('at least 8 characters');
    if (!hasLower) missing.push('a lowercase letter');
    if (!hasUpper) missing.push('an uppercase letter');
    if (!hasNumber) missing.push('a number');
    if (!hasSpecial) missing.push('a special character');
    return missing;
  };

  const { register, isLoading, signInWithProvider } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Password requirement flags (derived from current password value)
  const hasLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const allPasswordChecks = hasLength && hasLower && hasUpper && hasNumber && hasSpecial;
  

  // Simple validation function
  const isFormValid = () => {
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return false;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    // Password complexity checks (use derived flags)
    if (!allPasswordChecks) {
      const missing = getMissingPasswordRequirements();
      toast.error(`Password must contain ${missing.join(', ')}`);
      return false;
    }

    if (!acceptTerms) {
      toast.error('Please accept the terms and conditions');
      return false;
    }

    return true;
  };

  // Simple registration handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      return;
    }

    try {
      await register(email, password, name);
      toast.success('Check your email and authenticate your email.');
    } catch (error: any) {
      // Check for our specific "User already registered" error
      if (error.message.includes("User already registered") || error.message.includes("already registered")) {
        toast.error("This account already exists!", {
          description: "Redirecting you to login...",
          duration: 3000, // Toast stays visible for 3 seconds
        });
        
        // Wait 2 seconds so the user can read the message, then redirect
        setTimeout(() => {
           navigate('/login');
        }, 2000);
      } else {
        toast.error(error?.message || 'Registration failed!');
      }
    }
  };

  // Google OAuth handler
  const handleGoogleSignUp = async () => {
    try {
      // start the oauth flow using the provider
      await signInWithProvider('google');
    } catch (err) {
      // If signInWithProvider throws, show an error toast
      toast.error('Google sign-up failed');
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
        {theme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="relative w-full max-w-md">
        {/* App header */}
        <div className="text-center mb-8">
         <Link to="/" className="inline-flex items-center gap-2 mb-4">
             <Logo size="md" />
            {/* <Badge variant="secondary">PWA</Badge> */}
          </Link>
          <p className="text-muted-foreground">Start your journey to smarter expense management</p>
        </div>

        {/* Registration form card */}
        <Card className="backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Sign up to start tracking and splitting expenses
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4">
              {/* Name input */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

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
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => {
                      setPasswordFocused(false);
                      if (password && !allPasswordChecks) {
                        const missing = getMissingPasswordRequirements();
                        toast.error(`Password must contain ${missing.join(', ')}`);
                      }
                    }}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Password requirements checklist (shown only when password input is focused) */}
              {passwordFocused && (
                <div className="rounded-md border p-3 bg-muted/5 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  {hasLength ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                  <span className={hasLength ? 'text-green-600' : 'text-muted-foreground'}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasLower ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                  <span className={hasLower ? 'text-green-600' : 'text-muted-foreground'}>Contains a lowercase letter (a-z)</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasUpper ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                  <span className={hasUpper ? 'text-green-600' : 'text-muted-foreground'}>Contains an uppercase letter (A-Z)</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasNumber ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                  <span className={hasNumber ? 'text-green-600' : 'text-muted-foreground'}>Contains a number (0-9)</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasSpecial ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                  <span className={hasSpecial ? 'text-green-600' : 'text-muted-foreground'}>Contains a special character (e.g. !@#$%)</span>
                </div>
                </div>
              )}

              {/* Confirm password input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Terms and conditions checkbox */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
              </div>

              {/* Create account button */}
                <div className="space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !acceptTerms || !allPasswordChecks}
                    size="lg"
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  {/* Small Google OAuth button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleGoogleSignUp}
                  >
                    {/* Google SVG icon (simple multicolor) */}
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
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

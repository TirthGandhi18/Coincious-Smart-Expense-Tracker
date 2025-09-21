import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { useAuth, useTheme } from '../../App';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

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

  const { register, isLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

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

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
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
      // Use the correct parameter order: email, password, name
      await register(email, password, name);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Registration failed! Please use admin@gmail.com and password "password"');
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
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="relative w-full max-w-md">
        {/* App header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <h1 className="text-2xl font-bold text-primary">Smart Expense</h1>
            <Badge variant="secondary">PWA</Badge>
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
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !acceptTerms}
                size="lg"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
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
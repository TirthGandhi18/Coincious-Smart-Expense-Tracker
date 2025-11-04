// src/components/pages/Profile.tsx - COMPLETE WITH EMAIL & PHONE VALIDATION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Edit3,
  Save,
  X,
  Lock,
  Shield,
  Monitor,
} from 'lucide-react';

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
};

/* -------------------------
   Validators & helpers
   ------------------------- */
// Simple but practical email regex for client-side validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// Allow +, digits, spaces, dashes, parentheses, limit to 7-15 digits (international-friendly)
const PHONE_RE = /^(\+)?[0-9\s\-()]{7,30}$/;

function validateName(name: string) {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Name cannot be empty';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 100) return 'Name is too long';
  return null;
}

function validateEmail(email: string) {
  const v = (email || '').trim();
  if (!v) return 'Email cannot be empty';
  if (!EMAIL_RE.test(v)) return 'Invalid email address';
  return null;
}

function validatePhone(phone: string) {
  if (!phone) return null; // phone optional; change if you want required
  const v = phone.trim();
  if (!PHONE_RE.test(v)) return 'Invalid phone format';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Phone number length seems invalid';
  return null;
}

function validateLocation(location: string) {
  if (!location) return null;
  if (location.trim().length > 200) return 'Location is too long';
  return null;
}

function validateBio(bio: string) {
  if (!bio) return null;
  if (bio.trim().length > 1000) return 'Bio is too long (max 1000 characters)';
  return null;
}

function sanitizeInput(s: string) {
  return (s || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

/* -------------------------
   Profile component
   ------------------------- */
export function Profile() {
  const { user, supabase, supabaseAdminEndpoint } = useAuth() as any;

  const [isEditing, setIsEditing] = useState(false);

  // initial profile snapshot (for dirty check)
  const [initialProfile, setInitialProfile] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
  });

  // Form state for profile data
  const [profileData, setProfileData] = useState<ProfileData>(initialProfile);

  // errors & touched state
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileData, boolean>>>({});

  // security & sessions states (unchanged from original)
  const [securityData, setSecurityData] = useState({
    twoFactorEnabled: false,
    lastPasswordChange: '30 days ago',
  });
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [openSessionsModal, setOpenSessionsModal] = useState(false);
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // keep local profileData in sync when user changes externally
  useEffect(() => {
    const snapshot: ProfileData = {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: '',
    };
    setInitialProfile(snapshot);
    setProfileData(snapshot);
  }, [user]);

  // validate whole form when profileData changes
  useEffect(() => {
    setErrors(validateAll(profileData));
  }, [profileData]);

  function validateAll(data: ProfileData) {
    const newErrors: Partial<Record<keyof ProfileData, string>> = {};
    const nameErr = validateName(data.name);
    if (nameErr) newErrors.name = nameErr;

    const emailErr = validateEmail(data.email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validatePhone(data.phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const locErr = validateLocation(data.location);
    if (locErr) newErrors.location = locErr;

    const bioErr = validateBio(data.bio);
    if (bioErr) newErrors.bio = bioErr;

    return newErrors;
  }

  const updateField = (fieldName: keyof ProfileData, value: string) => {
    // sanitize lightly on-change
    const sanitized = sanitizeInput(value);
    setProfileData((p) => ({ ...p, [fieldName]: sanitized }));
    setTouched((t) => ({ ...(t || {}), [fieldName]: true }));
  };

  const saveProfile = async () => {
    // final validation before submit
    const finalErrors = validateAll(profileData);
    setErrors(finalErrors);
    // mark all fields touched so errors are visible if any
    setTouched({
      name: true,
      email: true,
      phone: true,
      location: true,
      bio: true,
    });

    if (Object.keys(finalErrors).length > 0) {
      // focus first invalid field could be added
      return;
    }

    // prepare sanitized payload
    const payload = {
      name: sanitizeInput(profileData.name),
      email: profileData.email.trim().toLowerCase(),
      phone: profileData.phone.trim(),
      location: sanitizeInput(profileData.location),
      bio: sanitizeInput(profileData.bio),
    };

    try {
      if (supabase) {
        // Example upsert - adapt to your DB/schema
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, ...payload }, { returning: 'minimal' });
        if (error) throw error;
      } else {
        console.log('Mock save payload:', payload);
      }

      // refresh initial snapshot and close editing
      setInitialProfile({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        location: payload.location,
        bio: payload.bio,
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      alert('Failed to save profile: ' + (err?.message || err));
    }
  };

  const cancelEdit = () => {
    setProfileData(initialProfile);
    setErrors({});
    setTouched({});
    setIsEditing(false);
  };

  // --- PASSWORD, 2FA, sessions, signout etc (unchanged) ---
  const handleChangePassword = () => setOpenPasswordModal(true);
  const handleToggle2FA = () =>
    setSecurityData((s) => ({ ...s, twoFactorEnabled: !s.twoFactorEnabled }));

  const handleViewSessions = async () => {
    setOpenSessionsModal(true);
    await loadSessions();
  };

  async function loadSessions() {
    setSessionsError(null);
    setSessions([]);
    setSessionsLoading(true);
    try {
      if (supabaseAdminEndpoint) {
        const res = await fetch(`${supabaseAdminEndpoint}/sessions`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch sessions from server');
        const data = await res.json();
        setSessions(data.sessions || []);
      } else if (supabase) {
        const { data, error } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('user_id', user?.id)
          .order('last_active', { ascending: false });
        if (error) throw error;
        setSessions(data || []);
      } else {
        setSessionsError(
          'No sessions endpoint configured. Please add a server-side endpoint that returns active sessions'
        );
      }
    } catch (err: any) {
      console.error(err);
      setSessionsError(err.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      if (!supabaseAdminEndpoint) {
        alert(
          'Revoking other sessions requires a server-side admin endpoint. See the comments in the code.'
        );
        return;
      }
      const res = await fetch(`${supabaseAdminEndpoint}/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke session');
      await loadSessions();
    } catch (err: any) {
      console.error(err);
      alert('Error revoking session: ' + (err.message || err));
    }
  }

  async function signOutCurrent() {
    try {
      if (supabase) {
        await supabase.auth.signOut();
        window.location.href = '/';
      } else {
        console.log('No supabase client available to sign out');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to sign out');
    }
  }

  // compute validity and dirty state
  const hasErrors = Object.keys(errors).length > 0;
  const isDirty = JSON.stringify(profileData) !== JSON.stringify(initialProfile);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>

        {/* Edit/Save Buttons */}
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button onClick={saveProfile} disabled={hasErrors || !isDirty}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left - avatar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-[#8B4513] text-white text-3xl">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {isEditing && (
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg"
                      variant="secondary"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                <div className="text-center">
                  <h3 className="font-semibold text-lg">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>

                  {user?.isParent && (
                    <Badge variant="secondary" className="mt-2">
                      Parent Account
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - info & security */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        onBlur={() =>
                          setErrors((s) => ({
                            ...(s || {}),
                            name: validateName(profileData.name) || undefined,
                          }))
                        }
                        placeholder="Enter your full name"
                        aria-invalid={!!errors.name}
                      />
                      {errors.name && touched.name && (
                        <div className="text-sm text-red-600 mt-1">{errors.name}</div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.name || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  {isEditing ? (
                    <>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        onBlur={() =>
                          setErrors((s) => ({
                            ...(s || {}),
                            email: validateEmail(profileData.email) || undefined,
                          }))
                        }
                        placeholder="Enter your email"
                        aria-invalid={!!errors.email}
                      />
                      {errors.email && touched.email && (
                        <div className="text-sm text-red-600 mt-1">{errors.email}</div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.email || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        onBlur={() =>
                          setErrors((s) => ({
                            ...(s || {}),
                            phone: validatePhone(profileData.phone) || undefined,
                          }))
                        }
                        placeholder="Enter your phone number (e.g. +91 98765 43210)"
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && touched.phone && (
                        <div className="text-sm text-red-600 mt-1">{errors.phone}</div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="Enter your location"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.location || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    className="w-full p-3 border rounded-md min-h-[100px] resize-none bg-background"
                    value={profileData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md min-h-[100px]">
                    <span className="text-muted-foreground">
                      {profileData.bio || 'No bio provided'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account stats */}
          <Card>
            <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
              <CardDescription>Your activity summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-[#8B4513]">156</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Total Expenses
                  </div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-[#8B4513]">8</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Active Groups
                  </div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-[#8B4513]">3</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Months Active
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Change Password */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Last changed {securityData.lastPasswordChange}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleChangePassword}>
                  Change Password
                </Button>
              </div>

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      {securityData.twoFactorEnabled
                        ? 'Additional security layer is active'
                        : 'Add an extra layer of security'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={securityData.twoFactorEnabled ? 'default' : 'outline'}
                  onClick={handleToggle2FA}
                >
                  {securityData.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>

              {/* Login Sessions */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Login Sessions</h4>
                    <p className="text-sm text-muted-foreground">
                      Manage your active sessions across devices
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleViewSessions}>
                  View Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- Password Modal --- */}
      {openPasswordModal && (
        <PasswordModal
          onClose={() => setOpenPasswordModal(false)}
          supabase={supabase}
          onSuccess={() =>
            setSecurityData((s) => ({ ...s, lastPasswordChange: 'just now' }))
          }
        />
      )}

      {/* --- Sessions Modal --- */}
      {openSessionsModal && (
        <SessionsModal
          onClose={() => setOpenSessionsModal(false)}
          sessions={sessions}
          loading={sessionsLoading}
          error={sessionsError}
          onRefresh={loadSessions}
          onRevoke={revokeSession}
          signOutCurrent={signOutCurrent}
        />
      )}
    </div>
  );
}

// Replace your PasswordModal function with this (immediate client-side flow)
function PasswordModal({
  onClose,
  supabase,
  onSuccess,
}: {
  onClose: () => void;
  supabase?: any;
  onSuccess?: () => void;
}) {
  const { user } = useAuth() as any;
  const [current, setCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [touched, setTouched] = useState({
    current: false,
    newPassword: false,
    confirm: false,
  });

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const newRef = React.useRef<HTMLInputElement | null>(null);
  const confirmRef = React.useRef<HTMLInputElement | null>(null);
  const currentRef = React.useRef<HTMLInputElement | null>(null);

  const RULES = {
    minLen: (pw: string) => pw.length >= 8,
    upper: (pw: string) => /[A-Z]/.test(pw),
    lower: (pw: string) => /[a-z]/.test(pw),
    digit: (pw: string) => /\d/.test(pw),
    special: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  };

  const ruleState = {
    minLen: RULES.minLen(newPassword),
    upper: RULES.upper(newPassword),
    lower: RULES.lower(newPassword),
    digit: RULES.digit(newPassword),
    special: RULES.special(newPassword),
  };

  const allRulesSatisfied = Object.values(ruleState).every(Boolean);

  function validateConfirmPassword(pw: string, c: string) {
    if (!c) return 'Please confirm your new password.';
    if (pw !== c) return 'Passwords do not match.';
    return null;
  }

  const confirmError = touched.confirm ? validateConfirmPassword(newPassword, confirm) : undefined;
  const isFormValid = allRulesSatisfied && !confirmError;
  const showRules = touched.newPassword || newPassword.length > 0;

  // NOTE: This version does not re-verify the current password on the server.
  // It requires current password presence and then calls Supabase updateUser.
  // For production: implement server-side re-auth verification for security.

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    setTouched({ current: true, newPassword: true, confirm: true });

    // require current password presence
    if (!current || current.trim().length === 0) {
      setError('Current password is required.');
      currentRef.current?.focus();
      return;
    }

    // client checks for new/confirm
    const confErr = validateConfirmPassword(newPassword, confirm);
    if (!allRulesSatisfied || confErr) {
      if (!allRulesSatisfied && newRef.current) newRef.current.focus();
      else if (confErr && confirmRef.current) confirmRef.current.focus();
      return;
    }

    setLoading(true);
    try {
      if (!supabase) {
        // dev fallback: mock success
        console.warn('No supabase client provided to PasswordModal');
        setSuccess('Password updated (mock). Add supabase client to perform real update.');
        if (onSuccess) onSuccess();
        setLoading(false);
        return;
      }

      // Attempt to call Supabase update user API directly
      if (typeof supabase.auth.updateUser === 'function') {
        const { data, error: supaErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (supaErr) throw supaErr;
      } else if (typeof supabase.auth.update === 'function') {
        const { error: supaErr } = await supabase.auth.update({ password: newPassword });
        if (supaErr) throw supaErr;
      } else {
        throw new Error('Supabase client does not support updateUser in this SDK version.');
      }

      setSuccess('Password updated successfully.');
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      console.error(err);
      // If supabase returns "invalid password" or similar, display it
      setError(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Change Password</h3>
          <Button variant="ghost" onClick={() => !loading && onClose()}>
            <X />
          </Button>
        </div>

        <form onSubmit={(e) => handleSubmit(e)}>
          <div className="space-y-3">
            <div>
              <Label>Current Password</Label>
              <Input
                ref={currentRef}
                type="password"
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  setTouched((t) => ({ ...t, current: true }));
                }}
                onBlur={() => setTouched((t) => ({ ...t, current: true }))}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  ref={newRef}
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setTouched((t) => ({ ...t, newPassword: true }));
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
                  placeholder="Create a strong password"
                  aria-invalid={showRules && !allRulesSatisfied}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-2 top-2 text-sm px-2 py-1"
                >
                  {showNew ? 'Hide' : 'Show'}
                </button>
              </div>

              {showRules && (
                <ul className="mt-2 ml-4 text-sm space-y-1">
                  <li className={ruleState.minLen ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.minLen ? '✓' : '•'} At least 8 characters
                  </li>
                  <li className={ruleState.upper ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.upper ? '✓' : '•'} Uppercase letter (A–Z)
                  </li>
                  <li className={ruleState.lower ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.lower ? '✓' : '•'} Lowercase letter (a–z)
                  </li>
                  <li className={ruleState.digit ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.digit ? '✓' : '•'} Number (0–9)
                  </li>
                  <li className={ruleState.special ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.special ? '✓' : '•'} Special character (e.g. !@#$%)
                  </li>
                </ul>
              )}
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <div className="relative">
                <Input
                  ref={confirmRef}
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setTouched((t) => ({ ...t, confirm: true }));
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  aria-invalid={!!confirmError}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-2 text-sm px-2 py-1"
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {touched.confirm && confirmError && (
                <div className="text-sm text-red-600 mt-1">{confirmError}</div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline"
                  onClick={() => {
                    // open browser reset via your route or call supabase reset - fallback to alert
                    if (supabase && typeof supabase.auth.resetPasswordForEmail === 'function') {
                      supabase.auth.resetPasswordForEmail(user?.email || '');
                      alert('Password reset email sent (check your inbox).');
                    } else {
                      alert('No reset configured. Configure supabase or server endpoint to send reset email.');
                    }
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => !loading && onClose()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !isFormValid}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            {success && <div className="text-sm text-green-600">{success}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}


/* -------------------------
   SessionsModal component
   (unchanged)
   ------------------------- */
function SessionsModal({
  onClose,
  sessions,
  loading,
  error,
  onRefresh,
  onRevoke,
  signOutCurrent,
}: {
  onClose: () => void;
  sessions: Array<any>;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onRevoke: (sessionId: string) => Promise<void>;
  signOutCurrent: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose()} />
      <div className="relative z-10 w-full max-w-3xl p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active Sessions</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onRefresh()}>
              Refresh
            </Button>
            <Button variant="ghost" onClick={() => onClose()}>
              Close
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <div>Loading sessions...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && sessions && sessions.length === 0 && !error && (
            <div className="p-4 bg-muted rounded">No sessions found.</div>
          )}

          {!loading && sessions && sessions.length > 0 && (
            <div className="space-y-2">
              {sessions.map((s: any) => (
                <div
                  key={s.id || s.session_id || JSON.stringify(s)}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <div className="font-medium">
                      {s.device || s.user_agent || s.browser || 'Unknown device'}
                      {s.current && (
                        <span className="ml-2 text-xs px-2 py-1 bg-green-100 rounded text-green-800">
                          This session
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {s.ip || s.location || 'IP unknown'} • Last active:{' '}
                      {s.last_active || s.updated_at || s.created_at || 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!s.current && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRevoke(s.id || s.session_id)}
                      >
                        Revoke
                      </Button>
                    )}
                    {s.current && (
                      <Button size="sm" variant="secondary" onClick={signOutCurrent}>
                        Sign out
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && sessions.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground border rounded">
              If you want to list and revoke other sessions you will need a server
              endpoint that uses Supabase Admin API to list/revoke refresh tokens.
              <div className="mt-2">
                <strong>Quick guide</strong>:
                <ol className="list-decimal ml-5 mt-1">
                  <li>
                    Create a server endpoint that calls the Supabase Admin API to list
                    sessions for a user (requires service_role key).
                  </li>
                  <li>Return sessions as JSON to this client endpoint.</li>
                  <li>Use DELETE on that endpoint to revoke a session (revoke token).</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

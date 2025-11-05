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
  Camera,
  Edit3,
  Save,
  X,
  Lock,
  Monitor,
} from 'lucide-react';

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  bio: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^(\+)?[0-9\s\-()]{7,30}$/;

function validateName(name: string) {
  const trimmed = (name || '').trim();
  if (!trimmed) return "Please enter your name";
  if (trimmed.length < 2) return "Name's too short";
  if (trimmed.length > 100) return "Name's too long";
  return null;
}

function validateEmail(email: string) {
  const v = (email || '').trim();
  if (!v) return "Email is required";
  if (!EMAIL_RE.test(v)) return "That doesn't look like a valid email";
  return null;
}

function validatePhone(phone: string) {
  if (!phone) return null; 
  const v = phone.trim();
  if (!PHONE_RE.test(v)) return "Phone number format doesn't look right";
  const digits = v.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return "Phone number seems too short or too long";
  return null;
}

function validateBio(bio: string) {
  if (!bio) return null;
  if (bio.trim().length > 1000) return "Bio is way too long (keep it under 1000 characters)";
  return null;
}

function sanitizeInput(s: string) {
  return (s || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

export function Profile() {
  const { user, supabase, supabaseAdminEndpoint } = useAuth() as any;

  const [isEditing, setIsEditing] = useState(false);

  const [initialProfile, setInitialProfile] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
  });

  const [profileData, setProfileData] = useState<ProfileData>(initialProfile);

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileData, boolean>>>({});

  const [securityData, setSecurityData] = useState({
    lastPasswordChange: '30 days ago',
  });
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [openSessionsModal, setOpenSessionsModal] = useState(false);
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    const snapshot: ProfileData = {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      bio: '',
    };
    setInitialProfile(snapshot);
    setProfileData(snapshot);
  }, [user]);
  
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

    const bioErr = validateBio(data.bio);
    if (bioErr) newErrors.bio = bioErr;

    return newErrors;
  }

  const updateField = (fieldName: keyof ProfileData, value: string) => {
    const sanitized = sanitizeInput(value);
    setProfileData((p) => ({ ...p, [fieldName]: sanitized }));
    setTouched((t) => ({ ...(t || {}), [fieldName]: true }));
  };

  const saveProfile = async () => {
    const finalErrors = validateAll(profileData);
    setErrors(finalErrors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      bio: true,
    });

    if (Object.keys(finalErrors).length > 0) {
      return;
    }

    const payload = {
      name: sanitizeInput(profileData.name),
      email: profileData.email.trim().toLowerCase(),
      phone: profileData.phone.trim(),
      bio: sanitizeInput(profileData.bio),
    };

    try {
      if (supabase) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, ...payload }, { returning: 'minimal' });
        if (error) throw error;
      } else {
        console.log('Mock save payload:', payload);
      }

      setInitialProfile({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        bio: payload.bio,
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      alert('Couldn\'t save your profile: ' + (err?.message || err));
    }
  };

  const cancelEdit = () => {
    setProfileData(initialProfile);
    setErrors({});
    setTouched({});
    setIsEditing(false);
  };

  const handleChangePassword = () => setOpenPasswordModal(true);

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
        if (!res.ok) throw new Error('Could not load sessions from server');
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
        setSessionsError('Sessions not set up yet');
      }
    } catch (err: any) {
      console.error(err);
      setSessionsError(err.message || 'Failed loading sessions');
    } finally {
      setSessionsLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      if (!supabaseAdminEndpoint) {
        alert('You need a server endpoint to revoke sessions');
        return;
      }
      const res = await fetch(`${supabaseAdminEndpoint}/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Could not revoke session');
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
        console.log('No supabase available to sign out');
      }
    } catch (err) {
      console.error(err);
      alert('Could not sign out');
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  const isDirty = JSON.stringify(profileData) !== JSON.stringify(initialProfile);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Your account info and settings
          </p>
        </div>

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

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Info</CardTitle>
              <CardDescription>
                Your basic details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
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
                        placeholder="Your name"
                        aria-invalid={!!errors.name}
                      />
                      {errors.name && touched.name && (
                        <div className="text-sm text-red-600 mt-1">{errors.name}</div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.name || 'Not set'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                        placeholder="Your email"
                        aria-invalid={!!errors.email}
                      />
                      {errors.email && touched.email && (
                        <div className="text-sm text-red-600 mt-1">{errors.email}</div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.email || 'Not set'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
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
                        placeholder="Your phone number"
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && touched.phone && (
                        <div className="text-sm text-red-600 mt-1">{errors.phone}</div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.phone || 'Not set'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">About You</Label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    className="w-full p-3 border rounded-md min-h-[100px] resize-none bg-background"
                    value={profileData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Tell us a bit about yourself"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md min-h-[100px]">
                    <span className="text-muted-foreground">
                      {profileData.bio || 'Nothing here yet'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
              <CardDescription>What you've been up to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-[#8B4513]">156</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Expenses
                  </div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-[#8B4513]">8</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Groups
                  </div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-[#8B4513]">3</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Months
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Keep your account safe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  Change
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Active Sessions</h4>
                    <p className="text-sm text-muted-foreground">
                      Where you're logged in
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleViewSessions}>
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {openPasswordModal && (
        <PasswordModal
          onClose={() => setOpenPasswordModal(false)}
          supabase={supabase}
          onSuccess={() =>
            setSecurityData((s) => ({ ...s, lastPasswordChange: 'just now' }))
          }
        />
      )}

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
    if (!c) return 'Please confirm your password';
    if (pw !== c) return "Passwords don't match";
    return null;
  }

  const confirmError = touched.confirm ? validateConfirmPassword(newPassword, confirm) : undefined;
  const isFormValid = allRulesSatisfied && !confirmError;
  const showRules = touched.newPassword || newPassword.length > 0;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    setTouched({ current: true, newPassword: true, confirm: true });

    if (!current || current.trim().length === 0) {
      setError('Enter your current password');
      currentRef.current?.focus();
      return;
    }

    const confErr = validateConfirmPassword(newPassword, confirm);
    if (!allRulesSatisfied || confErr) {
      if (!allRulesSatisfied && newRef.current) newRef.current.focus();
      else if (confErr && confirmRef.current) confirmRef.current.focus();
      return;
    }

    setLoading(true);
    try {
      if (!supabase) {
        console.warn('No supabase available');
        setSuccess('Password updated (mock mode)');
        if (onSuccess) onSuccess();
        setLoading(false);
        return;
      }

      if (typeof supabase.auth.updateUser === 'function') {
        const { data, error: supaErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (supaErr) throw supaErr;
      } else if (typeof supabase.auth.update === 'function') {
        const { error: supaErr } = await supabase.auth.update({ password: newPassword });
        if (supaErr) throw supaErr;
      } else {
        throw new Error('Cannot update password with this Supabase version');
      }

      setSuccess('Password updated!');
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not update password');
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
                placeholder="Your current password"
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
                  placeholder="Pick a strong password"
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
                    {ruleState.upper ? '✓' : '•'} One uppercase letter
                  </li>
                  <li className={ruleState.lower ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.lower ? '✓' : '•'} One lowercase letter
                  </li>
                  <li className={ruleState.digit ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.digit ? '✓' : '•'} One number
                  </li>
                  <li className={ruleState.special ? 'text-green-600' : 'text-red-600'}>
                    {ruleState.special ? '✓' : '•'} One special character
                  </li>
                </ul>
              )}
            </div>

            <div>
              <Label>Confirm Password</Label>
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
                    if (supabase && typeof supabase.auth.resetPasswordForEmail === 'function') {
                      supabase.auth.resetPasswordForEmail(user?.email || '');
                      alert('Check your email for password reset link');
                    } else {
                      alert('Password reset not configured yet');
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
                  {loading ? 'Updating...' : 'Update'}
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
          <h3 className="text-lg font-semibold">Your Sessions</h3>
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
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && sessions && sessions.length === 0 && !error && (
            <div className="p-4 bg-muted rounded">No sessions found</div>
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
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {s.ip || s.location || 'Unknown location'} • Active{' '}
                      {s.last_active || s.updated_at || s.created_at || 'recently'}
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
              To see and manage sessions, you'll need a backend endpoint that talks to Supabase Admin API.
              <div className="mt-2">
                <strong>Here's how:</strong>
                <ol className="list-decimal ml-5 mt-1">
                  <li>Set up an endpoint that lists sessions using Supabase service role key</li>
                  <li>Return the sessions as JSON</li>
                  <li>Add a DELETE endpoint to revoke sessions</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

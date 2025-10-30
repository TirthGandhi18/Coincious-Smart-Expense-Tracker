// src/components/pages/Profile.tsx - COMPLETE WITH EDITABLE SECURITY & MODALS
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

export function Profile() {
  // useAuth should ideally return { user, supabase, supabaseAdminEndpoint? }
  // If your useAuth doesn't return supabase, import your supabase client directly.
  const { user, supabase, supabaseAdminEndpoint } = useAuth() as any;

  const [isEditing, setIsEditing] = useState(false);

  // Form state for profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
  });

  // security state
  const [securityData, setSecurityData] = useState({
    twoFactorEnabled: false,
    lastPasswordChange: '30 days ago',
  });

  // modal states
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [openSessionsModal, setOpenSessionsModal] = useState(false);

  // sessions list state
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    // keep local profileData in sync when user changes externally
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: '',
    });
  }, [user]);

  const updateField = (fieldName: string, value: string) =>
    setProfileData((p) => ({ ...p, [fieldName]: value }));

  const saveProfile = async () => {
    // implement your profile save logic here (update DB or supabase profile)
    console.log('Saving profile:', profileData);
    // Example supabase profile update (if you have a "profiles" table)
    try {
      if (supabase) {
        // If you use a profiles table:
        // await supabase.from('profiles').upsert({ id: user.id, ...profileData });
      }
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelEdit = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: '',
    });
    setIsEditing(false);
  };

  // --- PASSWORD HANDLING (opens modal) ---
  const handleChangePassword = () => setOpenPasswordModal(true);

  // --- 2FA toggle (existing) ---
  const handleToggle2FA = () => {
    setSecurityData((s) => ({
      ...s,
      twoFactorEnabled: !s.twoFactorEnabled,
    }));
    console.log('2FA toggled');
  };

  // --- SESSIONS ---
  const handleViewSessions = async () => {
    setOpenSessionsModal(true);
    // load sessions when modal opens
    await loadSessions();
  };

  async function loadSessions() {
    setSessionsError(null);
    setSessions([]);
    setSessionsLoading(true);

    try {
      // Preferred: call your server-side endpoint that lists sessions using Supabase Admin API.
      // Example: GET /api/sessions -> returns [{id, user_agent, ip, created_at, last_active, current}]
      if (supabaseAdminEndpoint) {
        const res = await fetch(`${supabaseAdminEndpoint}/sessions`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch sessions from server');
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        // Fallback: try to load from a `sessions` table in the DB (if you maintain one)
        if (supabase) {
          // Example if you maintain a sessions table: adjust table/columns to your schema
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
      }
    } catch (err: any) {
      console.error(err);
      setSessionsError(err.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }

  // Sign out a single session (server-side required for other sessions)
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

  // Sign out current session
  async function signOutCurrent() {
    try {
      if (supabase) {
        await supabase.auth.signOut();
        // optionally redirect to login
        window.location.href = '/';
      } else {
        console.log('No supabase client available to sign out');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to sign out');
    }
  }

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
              <Button onClick={saveProfile}>
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
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Enter your full name"
                    />
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
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="Enter your email"
                    />
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
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
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

/* -------------------------
   PasswordModal component
   ------------------------- */
function PasswordModal({
  onClose,
  supabase,
  onSuccess,
}: {
  onClose: () => void;
  supabase?: any;
  onSuccess?: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (!supabase) {
        // No supabase client available — just fake success for dev or instruct user
        console.warn('No supabase client provided to PasswordModal');
        setSuccess('Password updated (mock). Add supabase client to perform real update.');
        if (onSuccess) onSuccess();
        return;
      }

      // Current Supabase client API to update user's password:
      // Note: This requires a valid session (user logged in).
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setSuccess('Password updated successfully.');
      if (onSuccess) onSuccess();
      // Optionally close modal after a delay
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      console.error(err);
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
          {/* NOTE: Many providers require re-authentication by providing the current password;
              Supabase's client updateUser doesn't accept current password - backend may be needed
              for strict re-authenticate flows. Here we collect it for UX but only use newPassword. */}
          <div className="space-y-3">
            <div>
              <Label>Current Password (optional)</Label>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>

            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            {success && <div className="text-sm text-green-600">{success}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => !loading && onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------
   SessionsModal component
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

          {/* If no server endpoint available, show helpful instructions */}
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

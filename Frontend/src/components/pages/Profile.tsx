// Profile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../App";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";

/* ---------------------------
   Types & Helpers
   --------------------------- */
type ProfileData = {
  name: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^(\+)?[0-9\s\-()]{7,30}$/;

function validateName(name: string) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "Please enter your name";
  if (trimmed.length < 2) return "Name's too short";
  if (trimmed.length > 100) return "Name's too long";
  return null;
}

function validateEmail(email: string) {
  const v = (email || "").trim();
  if (!v) return "Email is required";
  if (!EMAIL_RE.test(v)) return "That doesn't look like a valid email";
  return null;
}

function validatePhone(phone: string) {
  if (!phone) return null;
  const v = phone.trim();
  if (!PHONE_RE.test(v)) return "Phone number format doesn't look right";
  const digits = v.replace(/\D/g, "");
  if (digits.length != 10)
    return "Phone number seems too short or too long";
  return null;
}

function sanitizeInput(s: string) {
  return (s || "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

/* ---------------------------
   Component
   --------------------------- */
export function Profile() {
  // useAuth should provide at least { user, supabase }.
  // If it also provides setUser, this code will call it to update global user.
  const { user, supabase, setUser } = useAuth() as any;

  // UI / fetch state
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // canonical state loaded from DB
  const [initialProfile, setInitialProfile] = useState<ProfileData>({
    name: (user && (user.user_metadata?.name || user.name)) || "",
    email: (user && user.email) || "",
    phone: "",
    avatar_url: (user && (user.user_metadata?.avatar_url || user.avatar)) || null,
  });

  // form state (editable)
  const [form, setForm] = useState<ProfileData>(initialProfile);

  // validation and touched
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileData, boolean>>>({});

  // security/session/stats (left as your structure)
  const [securityData, setSecurityData] = useState({ lastPasswordChange: "30 days ago" });
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [openSessionsModal, setOpenSessionsModal] = useState(false);
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [stats, setStats] = useState({ expense_count: 0, group_count: 0, member_since: null });


  const isDirty = useMemo(() => {
    if (!initialProfile) return false;
    return (
      (form.name || "") !== (initialProfile.name || "") ||
      (form.email || "") !== (initialProfile.email || "") ||
      (form.phone || "") !== (initialProfile.phone || "")
    );
  }, [form, initialProfile]);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      if (!supabase || !user) {
        if (mounted) setIsLoading(false);
        return;
      }
      // do not fetch while saving (prevents race where auth updates cause re-fetch mid-save)
      if (isSaving) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("name, email, phone_number, avatar_url")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (!mounted) return;

        const newProf: ProfileData = {
          name: data?.name || (user.user_metadata?.name || user.name) || "",
          email: data?.email || user.email || "",
          phone: data?.phone_number || "",
          avatar_url: data?.avatar_url ?? (user.user_metadata?.avatar_url || user.avatar) ?? null,
        };

        setInitialProfile(newProf);
        setForm(newProf);
      } catch (err: any) {
        console.error("Failed to load profile:", err);
        if (mounted) toast.error(err?.message || "Failed to load your profile.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    async function loadStats() {
      if (!supabase || !user) return;
      try {
        const { data, error } = await supabase.rpc("get_user_stats");
        if (error) throw error;
        if (mounted) setStats(data);
      } catch (err: any) {
        console.error("Failed to fetch stats:", err);
      }
    }

    loadProfile();
    loadStats();
    return () => {
      mounted = false;
    };
  }, [supabase, user, isSaving]);

  function validateAll(d: ProfileData) {
    const out: Partial<Record<keyof ProfileData, string>> = {};
    const n = validateName(d.name);
    if (n) out.name = n;
    const e = validateEmail(d.email);
    if (e) out.email = e;
    const p = validatePhone(d.phone);
    if (p) out.phone = p;
    return out;
  }

  useEffect(() => {
    setErrors(validateAll(form));
  }, [form]);

  /* ---------------------------
     Form helpers
     --------------------------- */
  const updateField = (field: keyof ProfileData, value: string) => {
    const v = sanitizeInput(value);
    setForm((s) => ({ ...s, [field]: v }));
    setTouched((t) => ({ ...(t || {}), [field]: true }));
  };

  /* ---------------------------
     Save flow
     - block concurrent fetches by setting isSaving
     - update users table, then update auth metadata (best-effort)
     - update local initial & form state immediately so UI shows saved values
     - attempt to refresh auth user via supabase.auth.getUser and setUser if provided
     - no forced full-page reload
     --------------------------- */
  const saveProfile = async () => {
    const finalErrors = validateAll(form);
    setErrors(finalErrors);
    setTouched({ name: true, email: true, phone: true });

    if (Object.keys(finalErrors).length > 0) {
      toast.error("Please fix the errors in the form.");
      return;
    }
    if (!supabase || !user) {
      toast.error("You must be logged in.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving profile...");
    try {
      const payload = {
        name: sanitizeInput(form.name),
        email: form.email.trim().toLowerCase(),
        phone_number: form.phone.trim(),
      };

      // If email changed, try update auth first (keeps auth and user table in sync)
      if (payload.email !== (user?.email || "")) {
        try {
          if (typeof supabase.auth.updateUser === "function") {
            const { error: authErr } = await supabase.auth.updateUser({ email: payload.email });
            if (authErr) throw authErr;
          } else if (typeof supabase.auth.update === "function") {
            const { error: authErr } = await supabase.auth.update({ email: payload.email });
            if (authErr) throw authErr;
          } else {
            console.warn("Supabase client: no updateUser/update method found for auth email update.");
          }
        } catch (err: any) {
          throw new Error(`Failed to update auth email: ${err?.message || err}`);
        }
      }

      // Update canonical users row
      const { data: updatedRow, error: updateErr } = await supabase
        .from("users")
        .update({
          name: payload.name,
          phone_number: payload.phone_number,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Try update auth user metadata (non-fatal)
      try {
        if (typeof supabase.auth.updateUser === "function") {
          await supabase.auth.updateUser({ data: { name: payload.name } });
        } else if (typeof supabase.auth.update === "function") {
          await supabase.auth.update({ data: { name: payload.name } });
        }
      } catch (metaErr) {
        console.warn("Auth metadata update failed (non-fatal):", metaErr);
      }

      // Update local canonical state so UI shows saved values without relying on a fetch
      const newCanonical: ProfileData = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone_number,
        avatar_url: (updatedRow as any)?.avatar_url ?? initialProfile.avatar_url ?? null,
      };
      setInitialProfile(newCanonical);
      setForm(newCanonical);
      setIsEditing(false);
      toast.success("Profile saved!", { id: toastId });

      // Try to refresh auth user and update global app state if setUser available
      try {
        if (typeof supabase.auth.getUser === "function") {
          const { data: refreshed, error: getUserErr } = await supabase.auth.getUser();
          if (!getUserErr && refreshed?.user && typeof setUser === "function") {
            setUser(refreshed.user);
          }
        }
      } catch (refreshErr) {
        // non-fatal
        console.debug("Could not refresh auth user:", refreshErr);
      }
    } catch (err: any) {
      console.error("Save profile error:", err);
      toast.error(err?.message || "Could not save profile.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------------------
     Cancel edit
     --------------------------- */
  const cancelEdit = () => {
    setForm(initialProfile);
    setErrors({});
    setTouched({});
    setIsEditing(false);
  };

  /* ---------------------------
     Avatar upload
     - validate, upload, update users table + auth metadata (best-effort),
       reflect locally; no page reload
     --------------------------- */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !supabase) {
      toast.error("You must be logged in.");
      return;
    }
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // allow re-select same file later
    if (!file) return;

    const ALLOWED_TYPES = ["image/png", "image/jpeg"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload a PNG or JPEG.");
      return;
    }
    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large! The maximum size is 2MB.");
      return;
    }

    const ext = file.name.split(".").pop() || "png";
    const filePath = `${user.id}.${ext}`;
    const toastId = toast.loading("Uploading avatar...");

    try {
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
        metadata: { user_id: user.id },
      });
      if (uploadError) throw uploadError;

      // get public URL or signed URL as available
      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      let url: string | undefined = (publicData as any)?.publicUrl || (publicData as any)?.publicURL;
      if (!url) {
        const { data: signed, error: signedErr } = await supabase.storage.from("avatars").createSignedUrl(filePath, 60 * 60 * 24);
        if (signedErr) console.warn("createSignedUrl error:", signedErr);
        url = signed?.signedUrl;
      }
      if (!url) throw new Error("Could not get public URL for avatar.");

      const finalUrl = `${url}?t=${Date.now()}`;

      // update auth metadata (best-effort)
      try {
        if (typeof supabase.auth.updateUser === "function") {
          await supabase.auth.updateUser({ data: { avatar_url: finalUrl } });
        } else if (typeof supabase.auth.update === "function") {
          await supabase.auth.update({ data: { avatar_url: finalUrl } });
        }
      } catch (metaErr) {
        console.warn("Auth updateUser for avatar failed:", metaErr);
      }

      // update users table
      const { error: updErr } = await supabase.from("users").update({ avatar_url: finalUrl }).eq("id", user.id);
      if (updErr) throw updErr;

      // reflect locally without reload
      const next: ProfileData = { ...initialProfile, avatar_url: finalUrl };
      setInitialProfile(next);
      setForm(next);
      toast.success("Avatar updated!", { id: toastId });

      // attempt to refresh global user
      try {
        if (typeof supabase.auth.getUser === "function") {
          const { data: refreshed, error: getUserErr } = await supabase.auth.getUser();
          if (!getUserErr && refreshed?.user && typeof setUser === "function") {
            setUser(refreshed.user);
          }
        }
      } catch (err) {
        // ignore
      }
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      toast.error(err?.message || "Failed to upload avatar.", { id: toastId });
    }
  };

  /* ---------------------------
     Password & Sessions (placeholders - keep original approach)
     --------------------------- */
  const handleChangePassword = () => setOpenPasswordModal(true);
  const handleViewSessions = () => setOpenSessionsModal(true);
  async function loadSessions() {
    /* implement admin sessions fetch if desired */
  }
  async function revokeSession(sessionId: string) {
    /* implement revoke via admin endpoint if desired */
  }
  async function signOutCurrent() {
    /* implement sign out current session if desired */
  }

  /* ---------------------------
     Render (keeps your markup & styles)
     --------------------------- */
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Your account info and settings</p>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button onClick={saveProfile} disabled={isSaving || !isDirty || hasErrors}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>
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
                    <AvatarImage src={form.avatar_url || undefined} alt={form.name || undefined} />
                    <AvatarFallback className="bg-[#8B4513] text-white text-3xl">
                      {form.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  {isEditing && (
                    <>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/png, image/jpeg"
                        onChange={handleAvatarUpload}
                        style={{ display: "none" }}
                      />
                      <Button
                        size="icon"
                        className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg"
                        variant="secondary"
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                      >
                        <Camera className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="text-center">
                  <h3 className="font-semibold text-lg">{form.name || user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{form.email || user?.email}</p>

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
              <CardDescription>Your basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  {isEditing ? (
                    <>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Your name"
                        aria-invalid={!!errors.name}
                      />
                      {errors.name && touched.name && <div className="text-sm text-red-600 mt-1">{errors.name}</div>}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{form.name || "Not set"}</span>
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
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="Your email"
                        aria-invalid={!!errors.email}
                      />
                      {errors.email && touched.email && <div className="text-sm text-red-600 mt-1">{errors.email}</div>}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{form.email || "Not set"}</span>
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
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="Your phone number"
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && touched.phone && <div className="text-sm text-red-600 mt-1">{errors.phone}</div>}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{form.phone || "Not set"}</span>
                    </div>
                  )}
                </div>
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
                  {/* --- CHANGE HERE --- */}
                  <div className="text-3xl font-bold text-[#8B4513] dark:text-gray-100">{stats.expense_count}</div>
                  <div className="text-sm text-muted-foreground mt-1">Expenses</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  {/* --- CHANGE HERE --- */}
                  <div className="text-3xl font-bold text-[#8B4513] dark:text-gray-100">{stats.group_count}</div>
                  <div className="text-sm text-muted-foreground mt-1">Groups</div>
                </div>

                <div className="text-center p-4 bg-muted rounded-lg">
                  {/* --- CHANGE HERE --- */}
                  <div className="text-3xl font-bold text-[#8B4513] dark:text-gray-100">
                    {stats.member_since ? Math.max(1, new Date().getMonth() - new Date(stats.member_since).getMonth()) : 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Months</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Keep your account safe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">Last changed {securityData.lastPasswordChange}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleChangePassword}>Change</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Active Sessions</h4>
                    <p className="text-sm text-muted-foreground">Where you're logged in</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleViewSessions}>View All</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {openPasswordModal && (
        <PasswordModal onClose={() => setOpenPasswordModal(false)} supabase={supabase} onSuccess={() => setSecurityData((s) => ({ ...s, lastPasswordChange: "just now" }))} />
      )}

      {openSessionsModal && (
        <SessionsModal onClose={() => setOpenSessionsModal(false)} sessions={sessions} loading={sessionsLoading} error={sessionsError} onRefresh={loadSessions} onRevoke={revokeSession} signOutCurrent={signOutCurrent} />
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
  const [current, setCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ current: false, newPassword: false, confirm: false });

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
    if (!c) return "Please confirm your password";
    if (pw !== c) return "Passwords don't match";
    return null;
  }

  const confirmError = touched.confirm ? validateConfirmPassword(newPassword, confirm) : undefined;
  const isFormValid = allRulesSatisfied && !confirmError;
  const showRules = touched.newPassword || newPassword.length > 0;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setTouched({ current: true, newPassword: true, confirm: true });

    if (!current) {
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
        console.warn("No supabase available");
        onSuccess && onSuccess();
        setLoading(false);
        return;
      }

      const email = user?.email;
      if (!email) throw new Error("No user email available to verify current password");
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signErr) throw signErr;

      if (typeof supabase.auth.updateUser === "function") {
        const { error: supaErr } = await supabase.auth.updateUser({ password: newPassword });
        if (supaErr) throw supaErr;
      } else if (typeof supabase.auth.update === "function") {
        const { error: supaErr } = await supabase.auth.update({ password: newPassword });
        if (supaErr) throw supaErr;
      } else {
        throw new Error("Cannot update password with this Supabase version");
      }

      onSuccess && onSuccess();
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />
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
              <Input ref={currentRef} type="password" value={current} onChange={(e) => { setCurrent(e.target.value); setTouched((t) => ({ ...t, current: true })); }} placeholder="Your current password" />
            </div>

            <div>
              <Label>New Password</Label>
              <div className="relative">
                <Input ref={newRef} type={"password"} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setTouched((t) => ({ ...t, newPassword: true })); }} placeholder="Pick a strong password" aria-invalid={showRules && !allRulesSatisfied} />
              </div>

              {showRules && (
                <ul className="mt-2 ml-4 text-sm space-y-1">
                  <li className={ruleState.minLen ? "text-green-600" : "text-red-600"}>{ruleState.minLen ? "✓" : "•"} At least 8 characters</li>
                  <li className={ruleState.upper ? "text-green-600" : "text-red-600"}>{ruleState.upper ? "✓" : "•"} One uppercase letter</li>
                  <li className={ruleState.lower ? "text-green-600" : "text-red-600"}>{ruleState.lower ? "✓" : "•"} One lowercase letter</li>
                  <li className={ruleState.digit ? "text-green-600" : "text-red-600"}>{ruleState.digit ? "✓" : "•"} One number</li>
                  <li className={ruleState.special ? "text-green-600" : "text-red-600"}>{ruleState.special ? "✓" : "•"} One special character</li>
                </ul>
              )}
            </div>

            <div>
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input ref={confirmRef} type={"password"} value={confirm} onChange={(e) => { setConfirm(e.target.value); setTouched((t) => ({ ...t, confirm: true })); }} aria-invalid={!!confirmError} />
              </div>
              {touched.confirm && confirmError && <div className="text-sm text-red-600 mt-1">{confirmError}</div>}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <button type="button" className="text-sm text-muted-foreground underline" onClick={() => { if (supabase && typeof supabase.auth.resetPasswordForEmail === "function") { supabase.auth.resetPasswordForEmail(user?.email || ""); toast.success("Check your email for password reset link"); } else { toast.error("Password reset not configured yet"); } }}>
                  Forgot password?
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => !loading && onClose()}>Cancel</Button>
                <Button type="submit" disabled={loading || !isFormValid}>{loading ? "Updating..." : "Update"}</Button>
              </div>
            </div>
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
            <Button variant="ghost" onClick={() => onRefresh()}>Refresh</Button>
            <Button variant="ghost" onClick={() => onClose()}>Close</Button>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && sessions && sessions.length === 0 && !error && <div className="p-4 bg-muted rounded">No sessions found</div>}

          {!loading && sessions && sessions.length > 0 && (
            <div className="space-y-2">
              {sessions.map((s: any) => (
                <div key={s.id || s.session_id || JSON.stringify(s)} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">
                      {s.device || s.user_agent || s.browser || "Unknown device"}
                      {s.current && <span className="ml-2 text-xs px-2 py-1 bg-green-100 rounded text-green-800">Current</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{s.ip || s.location || "Unknown location"} • Active {s.last_active || s.updated_at || s.created_at || "recently"}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!s.current && <Button size="sm" variant="outline" onClick={() => onRevoke(s.id || s.session_id)}>Revoke</Button>}
                    {s.current && <Button size="sm" variant="secondary" onClick={signOutCurrent}>Sign out</Button>}
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

import { useState } from 'react';
import { useTheme } from '../ui/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { DateRangeExportModal } from './DateRangeExportModal';
import { 
  Bell,
  Moon,
  Sun,
  Smartphone,
  Download,
  AlertTriangle,
  Save,
  Shield,
  Loader2 // <-- ADDED
} from 'lucide-react';
import { useAuth } from '../../App'; // <-- ADDED
import { supabase } from '../../utils/supabase/client'; // <-- ADDED
import { useNavigate } from 'react-router-dom'; // <-- ADDED
import { toast } from 'sonner'; // <-- ADDED

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth(); // <-- ADDED
  const navigate = useNavigate(); // <-- ADDED

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // <-- ADDED
  const [notifications, setNotifications] = useState({
    email: true,
    expense: true,
    group: true,
    payment: true
  });

  const [preferences, setPreferences] = useState({
    currency: 'USD',
    timezone: 'UTC'
  });

  const [privacy, setPrivacy] = useState({
    analytics: false,
    dataSharing: false
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // Here you would typically save settings to your backend
    console.log('Saving settings:', { notifications, preferences, privacy });
    toast.success('Settings saved!'); // <-- Example notification
  };

  // +++ NEW FUNCTION FOR DELETING ACCOUNT +++
  const handleDeleteAccount = async () => {
    // 1. Confirm with the user
    if (!window.confirm("Are you sure? This will permanently delete your account and all associated data. This action cannot be undone.")) {
      return;
    }
    
    setIsDeleting(true);
    const toastId = toast.loading('Deleting your account...');

    try {
      // 3. Get session token to authenticate with our backend
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to delete your account.');

      // 4. Call our new backend /api/user route
      const response = await fetch('http://localhost:8000/api/user', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete account.');
      }

      // 5. Success! Log the user out and redirect
      toast.success('Account deleted successfully. You will be logged out.', { id: toastId });
      await supabase.auth.signOut();
      navigate('/login'); // Redirect to login page

    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message, { id: toastId });
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Customize your app experience and preferences</p>
        </div>
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks and feels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark themes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                />
                <Moon className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure when and how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Notification Types</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Expense Updates</Label>
                    <p className="text-sm text-muted-foreground">When expenses are added or modified</p>
                  </div>
                  <Switch
                    checked={notifications.expense}
                    onCheckedChange={(checked) => handleNotificationChange('expense', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Group Activity</Label>
                    <p className="text-sm text-muted-foreground">When someone joins or leaves a group</p>
                  </div>
                  <Switch
                    checked={notifications.group}
                    onCheckedChange={(checked) => handleNotificationChange('group', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Payment Reminders</Label>
                    <p className="text-sm text-muted-foreground">When payments are due or received</p>
                  </div>
                  <Switch
                    checked={notifications.payment}
                    onCheckedChange={(checked) => handleNotificationChange('payment', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>Control your data privacy and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Help us improve by sharing anonymous usage data
                </p>
              </div>
              <Switch
                checked={privacy.analytics}
                onCheckedChange={(checked) => handlePrivacyChange('analytics', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Allow sharing data with trusted third-party services
                </p>
              </div>
              <Switch
                checked={privacy.dataSharing}
                onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              App Management
            </CardTitle>
            <CardDescription>Manage your app data and storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Export Data</Label>
                <p className="text-sm text-muted-foreground">Download all your expense data</p>
              </div>
              <Button variant="outline" onClick={() => setExportModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                {/* --- UPDATED BUTTON --- */}
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>App Information</CardTitle>
            <CardDescription>Version and legal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>2.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build</span>
                <span>2024.09.16.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>September 16, 2024</span>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button variant="link" className="h-auto p-0 text-sm">
                Privacy Policy
              </Button>
              <Button variant="link" className="h-auto p-0 text-sm">
                Terms of Service
              </Button>
              <Button variant="link" className="h-auto p-0 text-sm">
                Open Source Licenses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Export Modal */}
      <DateRangeExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
    </div>
  );
}
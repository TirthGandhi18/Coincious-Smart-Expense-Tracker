import { useState } from 'react';
import { useTheme } from '../../App';
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
  Shield
} from 'lucide-react';

export function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const [exportModalOpen, setExportModalOpen] = useState(false);
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
                <Button variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Account
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

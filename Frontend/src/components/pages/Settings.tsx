import React, { useState } from 'react';
import { useTheme } from '../../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { 
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Smartphone,
  Download,
  Trash2,
  AlertTriangle,
  Save
} from 'lucide-react';

export function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    expense: true,
    group: true,
    payment: true
  });

  const [preferences, setPreferences] = useState({
    currency: 'USD',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY'
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    expenseVisible: false,
    analyticsTracking: true,
    dataSharing: false
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive important updates via SMS</p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
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

        {/* General Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Preferences
            </CardTitle>
            <CardDescription>Set your regional and display preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={preferences.currency} onValueChange={(value) => handlePreferenceChange('currency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={preferences.language} onValueChange={(value) => handlePreferenceChange('language', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={preferences.timezone} onValueChange={(value) => handlePreferenceChange('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">Eastern Time</SelectItem>
                    <SelectItem value="PST">Pacific Time</SelectItem>
                    <SelectItem value="CST">Central Time</SelectItem>
                    <SelectItem value="MST">Mountain Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select value={preferences.dateFormat} onValueChange={(value) => handlePreferenceChange('dateFormat', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
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
            <CardDescription>Control your data and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">Allow others to find and view your profile</p>
              </div>
              <Switch
                checked={privacy.profileVisible}
                onCheckedChange={(checked) => handlePrivacyChange('profileVisible', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Expense Visibility</Label>
                <p className="text-sm text-muted-foreground">Allow group members to see your expense history</p>
              </div>
              <Switch
                checked={privacy.expenseVisible}
                onCheckedChange={(checked) => handlePrivacyChange('expenseVisible', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics Tracking</Label>
                <p className="text-sm text-muted-foreground">Help improve the app with anonymous usage data</p>
              </div>
              <Switch
                checked={privacy.analyticsTracking}
                onCheckedChange={(checked) => handlePrivacyChange('analyticsTracking', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Share anonymized data with third-party partners</p>
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
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Cache Size</Label>
                <p className="text-sm text-muted-foreground">Currently using 45.2 MB of storage</p>
              </div>
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
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
    </div>
  );
}
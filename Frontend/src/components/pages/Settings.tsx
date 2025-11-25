import { useState } from 'react';
import { useTheme } from '../ui/ThemeContext';
import { useSettings } from '../ui/SettingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { DateRangeExportModal } from './DateRangeExportModal';
import {
  Moon,
  Sun,
  Smartphone,
  Download,
  AlertTriangle,
  Save,
  Shield,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../../App';
import { supabase } from '../../utils/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { dataSharing, setDataSharing } = useSettings();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [exportModalOpen, setExportModalOpen] = useState(false);
  // State for the custom confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    expense: true,
    group: true,
    payment: true
  });

  const [preferences] = useState({
    currency: 'USD',
    timezone: 'UTC'
  });

  const handleSaveSettings = () => {
    console.log('Saving settings:', { notifications, preferences, dataSharing });
    toast.success('Settings saved!');
  };

  // Triggered when the initial "Delete Account" button is clicked
  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  // Triggered when the user confirms in the custom modal
  const executeAccountDeletion = async () => {
    setIsDeleting(true);
    const toastId = toast.loading('Deleting your account...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to delete your account.');

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

      toast.success('Account deleted successfully. You will be logged out.', { id: toastId });
      await supabase.auth.signOut();
      navigate('/register');

    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message, { id: toastId });
      setIsDeleting(false);
      setDeleteConfirmOpen(false); // Close modal on error
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto relative">
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
                  className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-200 transition-colors"
                />
                <Moon className="h-4 w-4" />
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
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Allow sharing data with trusted third-party services
                </p>
              </div>
              <Switch
                checked={dataSharing}
                onCheckedChange={setDataSharing}
                className={`
                  transition-colors
                  data-[state=checked]:bg-purple-600
                  data-[state=unchecked]:bg-gray-200
                  border
                  ${dataSharing ? 'border-purple-600' : 'border-gray-300'}
                `}
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
          <CardContent className="space-y-6">

            {/* Export Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 transition-all hover:bg-accent/5">
              <div className="space-y-1">
                <Label className="text-base">Export Data</Label>
                <p className="text-sm text-muted-foreground">Download all your expense data in CSV format for external analysis</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setExportModalOpen(true)}
                className="w-full sm:w-auto border-primary/20 text-primary hover:bg-primary/10 hover:text-primary font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Delete Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 transition-all hover:bg-accent/5">
              <div className="space-y-1">
                <Label className="text-destructive text-base font-semibold">Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently remove your account and all associated data. This action is irreversible.
                </p>
              </div>
              {/* Only opens the dialog now */}
              <Button
                variant="outline"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="w-full sm:w-auto shadow-sm border-destructive text-destructive hover:bg-destructive hover:text-white"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
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
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build</span>
                <span>2025.09.16.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>November 29, 2025</span>
              </div>
            </div>
            <Separator />

          </CardContent>
        </Card>
      </div>

      {/* Date Range Export Modal */}
      <DateRangeExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />

      {/* --- CUSTOM DELETE CONFIRMATION DIALOG --- */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isDeleting && setDeleteConfirmOpen(false)}
          />

          {/* Dialog Content */}
          <div className="relative w-full max-w-md transform rounded-xl bg-background p-6 shadow-2xl transition-all border border-border sm:scale-100 scale-100 animate-in zoom-in-95 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-200">

            <div className="flex flex-col gap-4">
              {/* Header Icon & Text */}
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-destructive mb-2">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold leading-none tracking-tight">
                  Are you absolutely sure?
                </h2>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  className="h-10"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={executeAccountDeletion}
                  disabled={isDeleting}
                  className="h-10 shadow-sm"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                </Button>
              </div>
            </div>

            {/* Close X button top-right */}
            {!isDeleting && (
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

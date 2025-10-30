// src/components/pages/Profile.tsx - COMPLETE WITH EDITABLE SECURITY

import { useState } from 'react';
import { useAuth } from '../../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
  Monitor
} from 'lucide-react';

export function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state for profile data
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: ''
  });

  // Security settings state
  const [securityData, setSecurityData] = useState({
    twoFactorEnabled: false,
    lastPasswordChange: '30 days ago'
  });

  // Handle input changes
  const updateField = (fieldName: string, value: string) => {
    setProfileData({
      ...profileData,
      [fieldName]: value
    });
  };

  // Save changes
  const saveProfile = () => {
    console.log('Saving profile:', profileData);
    setIsEditing(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: ''
    });
    setIsEditing(false);
  };

  // Handle password change
  const handleChangePassword = () => {
    console.log('Opening change password modal...');
    // TODO: Open password change modal
  };

  // Handle 2FA toggle
  const handleToggle2FA = () => {
    setSecurityData({
      ...securityData,
      twoFactorEnabled: !securityData.twoFactorEnabled
    });
    console.log('2FA toggled:', !securityData.twoFactorEnabled);
  };

  // Handle view sessions
  const handleViewSessions = () => {
    console.log('Opening sessions view...');
    // TODO: Open sessions modal
  };

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
        {/* Left Column - Profile Picture */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {/* Avatar with camera button */}
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

                {/* User Info */}
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

        {/* Right Column - Profile Information */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Full Name */}
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

                {/* Email */}
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

                {/* Phone */}
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

                {/* Location */}
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

              {/* Bio */}
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

          {/* Account Statistics Card */}
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

          {/* Account Security Card - NOW INTERACTIVE */}
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
                  variant={securityData.twoFactorEnabled ? "default" : "outline"} 
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
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../lib/info';
import { useAuth } from '../../App';
import { 
  Plus, 
  Search, 
  Users, 
  DollarSign, 
  Calendar,
  MoreVertical,
  Settings,
  UserPlus,
  Archive
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { toast } from 'sonner';

// Dummy groups data - matching AddExpense.tsx
const dummyGroups = [
  { id: '1', name: 'Weekend Trip' },
  { id: '2', name: 'Roommates' },
  { id: '3', name: 'Work Lunch Group' },
  { id: '4', name: 'Family Vacation 2024' }
];

// Dummy group members data - matching AddExpense.tsx
const dummyGroupMembers: { [key: string]: Array<{ id: string; name: string; avatar: string; email?: string }> } = {
  '1': [
    { id: 'user-1', name: 'You (Alex)', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format', email: 'alex@example.com' },
    { id: 'user-2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b272?w=150&h=150&fit=crop&crop=face&auto=format', email: 'sarah@example.com' },
    { id: 'user-3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face&auto=format', email: 'mike@example.com' },
    { id: 'user-4', name: 'Lisa Anderson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format', email: 'lisa@example.com' }
  ],
  '2': [
    { id: 'user-1', name: 'You (Alex)', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format', email: 'alex@example.com' },
    { id: 'user-5', name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format', email: 'james@example.com' },
    { id: 'user-6', name: 'Emma Davis', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face&auto=format', email: 'emma@example.com' }
  ],
  '3': [
    { id: 'user-1', name: 'You (Alex)', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format', email: 'alex@example.com' },
    { id: 'user-2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b272?w=150&h=150&fit=crop&crop=face&auto=format', email: 'sarah@example.com' },
    { id: 'user-7', name: 'David Martinez', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format', email: 'david@example.com' },
    { id: 'user-8', name: 'Olivia Taylor', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face&auto=format', email: 'olivia@example.com' },
    { id: 'user-3', name: 'Mike Chen', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face&auto=format', email: 'mike@example.com' }
  ],
  '4': [
    { id: 'user-1', name: 'You (Alex)', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format', email: 'alex@example.com' },
    { id: 'user-9', name: 'Robert Brown', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face&auto=format', email: 'robert@example.com' },
    { id: 'user-10', name: 'Sophia Garcia', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face&auto=format', email: 'sophia@example.com' },
    { id: 'user-4', name: 'Lisa Anderson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format', email: 'lisa@example.com' },
    { id: 'user-11', name: 'William Lee', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face&auto=format', email: 'william@example.com' },
    { id: 'user-12', name: 'Ava White', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face&auto=format', email: 'ava@example.com' }
  ]
};

// Extended groups with additional metadata for display
const dummyGroupsWithMetadata = dummyGroups.map(group => ({
  ...group,
  description: group.id === '1' ? 'Beach house rental and activities' :
               group.id === '2' ? 'Shared apartment expenses' :
               group.id === '3' ? 'Office lunch orders and team dinners' :
               group.id === '4' ? 'Annual family trip expenses' : '',
  members: dummyGroupMembers[group.id] || [],
  totalExpenses: group.id === '1' ? 1248.75 :
                 group.id === '2' ? 2847.30 :
                 group.id === '3' ? 456.90 :
                 group.id === '4' ? 3240.00 : 0,
  yourBalance: group.id === '1' ? -45.20 :
               group.id === '2' ? 125.80 :
               group.id === '3' ? -12.30 :
               group.id === '4' ? 0 : 0,
  lastActivity: group.id === '1' ? '2 hours ago' :
                group.id === '2' ? '1 day ago' :
                group.id === '3' ? '3 days ago' :
                group.id === '4' ? '1 week ago' : '',
  status: group.id === '4' ? 'settled' : 'active'
}));

export function Groups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [selectedGroupForMember, setSelectedGroupForMember] = useState<any>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [groups, setGroups] = useState<any[]>(dummyGroupsWithMetadata);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7f88878c/groups`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Merge backend groups with dummy data
          const backendGroups = data.groups || [];
          setGroups(backendGroups.length > 0 ? backendGroups : dummyGroupsWithMetadata);
        } else {
          // Use dummy data if backend fails
          setGroups(dummyGroupsWithMetadata);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        // Use dummy data on error
        setGroups(dummyGroupsWithMetadata);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to create a group');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7f88878c/groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(prev => [...prev, data.group]);
        toast.success('Group created successfully!');
        setNewGroupName('');
        setNewGroupDescription('');
        setIsCreateDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `You are owed $${balance.toFixed(2)}`;
    if (balance < 0) return `You owe $${Math.abs(balance).toFixed(2)}`;
    return 'All settled up';
  };

  const handleOpenAddMemberDialog = (group: any) => {
    setSelectedGroupForMember(group);
    setNewMemberEmail('');
    setNewMemberName('');
    setIsAddMemberDialogOpen(true);
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter a member email');
      return;
    }

    if (!newMemberName.trim()) {
      toast.error('Please enter a member name');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to add members');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7f88878c/groups/${selectedGroupForMember.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newMemberEmail,
          name: newMemberName,
        }),
      });

      if (response.ok) {
        // Update the local state with the new member
        const newMember = {
          id: `user-${Date.now()}`,
          name: newMemberName,
          email: newMemberEmail,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newMemberName)}&background=random`
        };

        setGroups(prev => prev.map(g => {
          if (g.id === selectedGroupForMember.id) {
            return {
              ...g,
              members: [...(g.members || []), newMember]
            };
          }
          return g;
        }));

        toast.success(`${newMemberName} added to ${selectedGroupForMember.name}!`);
        setNewMemberEmail('');
        setNewMemberName('');
        setIsAddMemberDialogOpen(false);
        setSelectedGroupForMember(null);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Manage your shared expense groups</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a new group to start splitting expenses with friends or family.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Weekend Trip"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="groupDescription">Description (Optional)</Label>
                <Input
                  id="groupDescription"
                  placeholder="e.g., Beach house rental and activities"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateGroup}>
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your groups...</p>
          </CardContent>
        </Card>
      )}

      {/* Groups Grid */}
      {!loading && (
        <div className="grid gap-4 md:gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <CardDescription>{group.description || 'No description'}</CardDescription>
                  </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Group Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Group Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent>
                {/* Members */}
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    {group.members?.slice(0, 4).map((member: any, index: number) => (
                      <Avatar key={member.id} className="h-6 w-6 border-2 border-background" style={{ marginLeft: index > 0 ? '-8px' : '0' }}>
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {group.members && group.members.length > 4 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs" style={{ marginLeft: '-8px' }}>
                        +{group.members.length - 4}
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">
                      {group.members?.length || 1} member{(group.members?.length || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="font-medium">${(group.totalExpenses || group.total_expenses || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      (group.yourBalance || 0) > 0 ? 'bg-green-500' : 
                      (group.yourBalance || 0) < 0 ? 'bg-red-500' : 
                      'bg-gray-500'
                    }`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Balance</p>
                      <p className={`font-medium ${getBalanceColor(group.yourBalance || 0)}`}>
                        {getBalanceText(group.yourBalance || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Activity</p>
                      <p className="font-medium">{group.lastActivity || (group.created_at ? new Date(group.created_at).toLocaleDateString() : 'N/A')}</p>
                    </div>
                  </div>
                </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild className="w-full">
                  <Link to={`/groups/${group.id}`}>
                    View Details
                  </Link>
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to={`/add-expense?group=${group.id}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleOpenAddMemberDialog(group)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>
            </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredGroups.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? 'No groups found' : 'No groups yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? `No groups match "${searchTerm}". Try a different search term.`
                : 'Create your first group to start splitting expenses with friends and family.'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Member to {selectedGroupForMember?.name}</DialogTitle>
            <DialogDescription>
              Invite a new member to join this group. They'll be able to add expenses and see group activity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Current Members */}
            {selectedGroupForMember?.members && selectedGroupForMember.members.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Current Members ({selectedGroupForMember.members.length})</Label>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                  {selectedGroupForMember.members.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{member.name}</p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Member Form */}
            <div className="space-y-4 pt-2">
              <div className="grid gap-2">
                <Label htmlFor="memberName">Member Name</Label>
                <Input
                  id="memberName"
                  placeholder="e.g., John Doe"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="memberEmail">Member Email</Label>
                <Input
                  id="memberEmail"
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  An invitation will be sent to this email address
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

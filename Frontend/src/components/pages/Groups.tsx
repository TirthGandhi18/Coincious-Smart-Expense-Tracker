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

// Mock data
const groups = [
  {
    id: '1',
    name: 'Weekend Trip',
    description: 'Beach house rental and activities',
    members: [
      { id: '1', name: 'You', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '2', name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b272?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '3', name: 'Mike', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '4', name: 'Lisa', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format' }
    ],
    totalExpenses: 1248.75,
    yourBalance: -45.20,
    lastActivity: '2 hours ago',
    status: 'active'
  },
  {
    id: '2',
    name: 'Roommates',
    description: 'Shared apartment expenses',
    members: [
      { id: '1', name: 'You', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '5', name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '6', name: 'Jordan', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face&auto=format' }
    ],
    totalExpenses: 2847.30,
    yourBalance: 125.80,
    lastActivity: '1 day ago',
    status: 'active'
  },
  {
    id: '3',
    name: 'Work Lunch Group',
    description: 'Office lunch orders and team dinners',
    members: [
      { id: '1', name: 'You', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '7', name: 'Emma', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '8', name: 'David', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '9', name: 'Sophie', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '10', name: 'Ryan', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format' }
    ],
    totalExpenses: 456.90,
    yourBalance: -12.30,
    lastActivity: '3 days ago',
    status: 'active'
  },
  {
    id: '4',
    name: 'Family Vacation 2024',
    description: 'Annual family trip expenses',
    members: [
      { id: '1', name: 'You', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '11', name: 'Mom', avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '12', name: 'Dad', avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&h=150&fit=crop&crop=face&auto=format' },
      { id: '13', name: 'Sister', avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=150&h=150&fit=crop&crop=face&auto=format' }
    ],
    totalExpenses: 3240.00,
    yourBalance: 0,
    lastActivity: '1 week ago',
    status: 'settled'
  }
];

export function Groups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
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
          setGroups(data.groups || []);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
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
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Members
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
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-xs">You</AvatarFallback>
                    </Avatar>
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
                      <p className="font-medium">${(group.total_expenses || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Balance</p>
                      <p className="font-medium text-muted-foreground">All settled up</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(group.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1">
                  <Link to={`/groups/${group.id}`}>
                    View Details
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/add-expense?group=${group.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Link>
                </Button>
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
    </div>
  );
}
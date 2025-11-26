import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

type AppUser = SupabaseUser & {
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
};

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Input } from '../ui/input';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../App';
import { Plus, Search, Users, DollarSign, Calendar,  Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { toast } from 'sonner';

export function Groups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth() as { user: AppUser | null };

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any | null>(null);

  // Function to handle the delete button click
  const handleDeleteClick = (group: any) => {
    console.log('Delete clicked for group:', group);
    setGroupToDelete(group);
    setDeleteAlertOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete a group');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete group');
      }

      // Remove the deleted group from the state
      setGroups(groups.filter(group => group.id !== groupId));
      setDeleteAlertOpen(false);
      setGroupToDelete(null);
      toast.success('Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete group');
    }
  };

  // Helper function to get user display info
  const getUserDisplayInfo = (user: AppUser | null) => ({
    id: user?.id || '',
    name: user?.user_metadata?.full_name || 'You',
    avatar: user?.user_metadata?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.charAt(0).toUpperCase() || 'U')}`
  });

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw new Error('Your session has expired. Please log in again.');
        }

        if (!session?.access_token) {
          throw new Error('No active session. Please log in again.');
        }

        const response = await fetch('${import.meta.env.VITE_API_URL}/api/groups', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        let responseData;
        try {
          responseData = await response.clone().json();
        } catch (jsonError) {
          const textResponse = await response.text();
          console.error('Failed to parse JSON response:', textResponse);
          throw new Error(`Invalid server response: ${textResponse.substring(0, 200)}`);
        }

        if (!response.ok) {
          console.error('API Error - Status:', response.status);
          let errorMessage = 'Failed to fetch groups';

          if (responseData) {
            if (responseData.details) {
              errorMessage = `Error: ${responseData.error || 'Unknown error'}`;
            } else if (responseData.error) {
              errorMessage = typeof responseData.error === 'string'
                ? responseData.error
                : JSON.stringify(responseData.error);
            }
          } else {
            errorMessage = `Server returned ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        const transformedGroups = (responseData.groups || []).map((group: any) => ({
          ...group,
          id: group.id || '',
          name: group.name || 'Unnamed Group',
          created_at: group.created_at || new Date().toISOString(),
          updated_at: group.updated_at || new Date().toISOString(),
          member_count: group.member_count || 1,
          total_expenses: group.total_expenses || 0,
          yourBalance: group.your_balance || 0,
          lastActivity: 'Just now',
          status: 'active' as const
        }));

        setGroups(transformedGroups);
      } catch (error) {
        console.error('Error in fetchGroups:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load groups';
        toast.error(errorMessage, {
          duration: 5000,
          description: 'Please check your connection and try again.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create a group');
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get session');
      }

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch('${import.meta.env.VITE_API_URL}/api/groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGroupName,
        }),
      });

      let responseData;
      try {
        responseData = await response.clone().json();
      } catch (jsonError) {
        const textResponse = await response.text();
        console.error('Failed to parse JSON response:', textResponse);
        throw new Error(`Invalid server response: ${textResponse.substring(0, 200)}`);
      }

      if (!response.ok) {
        let errorMessage = 'Failed to create group';

        if (responseData) {
          if (responseData.details) {
            errorMessage = `Error: ${responseData.error || 'Unknown error'}`;
          } else if (responseData.error) {
            errorMessage = typeof responseData.error === 'string'
              ? responseData.error
              : JSON.stringify(responseData.error);
          }
        } else {
          errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const newGroup = responseData.group || responseData;

      setGroups(prev => [{
        ...newGroup,
        member_count: newGroup.member_count || 1,
        total_expenses: 0,
        yourBalance: 0,
        lastActivity: 'Just now',
        status: 'active' as const
      }, ...prev]);

      toast.success('Group created successfully!');
      setNewGroupName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error in handleCreateGroup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group';
      toast.error(errorMessage, {
        duration: 5000,
        description: 'Please check your connection and try again.'
      });
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
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your groups...</p>
          </CardContent>
        </Card>
      )}

      {/* Groups Grid */}
      {!loading && (
        <div className="grid gap-4 md:gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>

                  {/* Settings Icon Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDeleteClick(group)}
                    title="Delete Group"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>

                </div>
              </CardHeader>

              <CardContent>
                {/* Members */}
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={getUserDisplayInfo(user).avatar} />
                      <AvatarFallback className="text-xs">{getUserDisplayInfo(user).name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground ml-2">
                      {group.member_count || 1} member{(group.member_count || 1) !== 1 ? 's' : ''}
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
                    <div className={`h-2 w-2 rounded-full ${group.yourBalance > 0 ? 'bg-green-500' : group.yourBalance < 0 ? 'bg-red-500' : 'bg-gray-500'}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Balance</p>
                      <p className={`font-medium ${group.yourBalance > 0 ? 'text-green-600' : group.yourBalance < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {group.yourBalance === 0 ? 'All settled up' : `$${Math.abs(group.yourBalance).toFixed(2)} ${group.yourBalance > 0 ? 'owed to you' : 'you owe'}`}
                      </p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the group
              <span className="font-semibold"> "{groupToDelete?.name}"</span> and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => groupToDelete && handleDeleteGroup(groupToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

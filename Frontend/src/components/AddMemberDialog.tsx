import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

// Interface for the component props

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onMemberAdded: () => void;
}

export function AddMemberDialog({ open, onOpenChange, groupId, onMemberAdded }: AddMemberDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMember = async () => {
    // Reset previous errors
    setError('');

    // Validate inputs
    if (!formData.name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Call our backend API to handle the user lookup and member addition
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${groupId}/add-member`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          name: formData.name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      toast.success('Invitation sent successfully!');
      setFormData({ name: '', email: '' });
      onMemberAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Invite someone to join this group by entering their email address.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="friend@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMember}
            disabled={loading || !formData.name.trim() || !formData.email.trim()}
          >
           {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

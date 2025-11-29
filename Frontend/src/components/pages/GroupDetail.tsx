import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
import { useAuth } from '../../App';
import {
  ArrowLeft,
  Plus,
  Users,
  DollarSign,
  UserPlus,
  Receipt,
  Clock,
  Loader2,
  RefreshCw,
  Check,
  Trash2
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';
import { AddMemberDialog } from '../AddMemberDialog';
import { SettleUpDialog } from '../SettleUpDialog';

interface Member {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  balance: number;
}

interface BalanceData extends Member {
}

interface Settlement {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
}

interface GroupData {
  id: string;
  name: string;
  description: string;
  members: Member[];
  totalExpenses: number;
  createdAt: string;
  lastActivity: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  paidBy: {
    id: string;
    name: string;
  };
  splitAmong: Array<{ id: string; name?: string }>;
  receipt?: string;
}

export function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'expenses';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [groupData, setGroupData] = useState<GroupData>({
    id: id || '',
    name: 'Loading...',
    description: '',
    members: [],
    totalExpenses: 0,
    createdAt: new Date().toISOString().split('T')[0],
    lastActivity: 'Just now'
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // --- NEW STATE FOR BALANCES AND SETTLEMENTS ---
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

  // --- STATE FOR MEMBER REMOVAL ---
  const [isDeleteMemberDialogOpen, setIsDeleteMemberDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);


  const fetchGroupData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // --- FETCH ALL DATA IN PARALLEL ---
      const [
        groupResponse,
        membersResponse,
        expensesResponse,
        balancesResponse
      ] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/groups/${id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/groups/${id}/members`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/expenses?group_id=${id}`, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/groups/${id}/balances`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      // --- Check critical responses ---
      if (!groupResponse.ok || !membersResponse.ok) {
        const errorData = await groupResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch group data');
      }

      const groupDetailsResponse = await groupResponse.json();
      const membersData = await membersResponse.json();

      // --- Process Expenses (non-critical) ---
      try {
        if (expensesResponse.ok) {
          const expensesData = await expensesResponse.json();
          if (expensesData && Array.isArray(expensesData.expenses)) {
            const formattedExpenses = expensesData.expenses.map((exp: any) => ({
              id: exp.id,
              title: exp.description || 'Expense',
              amount: parseFloat(exp.amount) || 0,
              description: exp.notes || '',
              category: exp.category || 'Other',
              date: exp.date || new Date().toISOString(),
              paidBy: {
                id: exp.paid_by.id,
                name: exp.paid_by.name || 'Unknown'
              },
              splitAmong: exp.split_among || [],
              receipt: exp.receipt_url
            }));
            setExpenses(formattedExpenses);
          }
        } else {
          console.warn('Failed to fetch expenses, continuing without them.');
        }
      } catch (expenseError) {
        console.warn('Error processing expenses:', expenseError);
      }

      // --- Process Balances (non-critical) ---
      let balancesData = { balances: [], settlements: [] };
      try {
        if (balancesResponse.ok) {
          balancesData = await balancesResponse.json();

          if (balancesData.balances && balancesData.balances.length > 0) {
            const mappedBalances = balancesData.balances.map((balance: any) => ({
              id: balance.user_id,
              email: balance.email,
              name: balance.name,
              avatar: balance.avatar,
              balance: balance.balance || 0
            }));
            setBalances(mappedBalances);
            setSettlements(balancesData.settlements || []);
          } else {
            // Use members data as fallback for balances display
            const mappedMembers = (membersData.members || []).map((member: any) => ({
              id: member.id || member.user_id,
              email: member.email,
              name: member.name,
              avatar: member.avatar,
              balance: 0
            }));
            setBalances(mappedMembers);
            setSettlements([]);
          }
        } else {
          console.warn('Failed to fetch balances, using members data as fallback');
          // Use members data as fallback for balances display
          const mappedMembers = (membersData.members || []).map((member: any) => ({
            id: member.id || member.user_id,
            email: member.email,
            name: member.name,
            avatar: member.avatar,
            balance: 0
          }));
          setBalances(mappedMembers);
          setSettlements([]);
        }
      } catch (balanceError) {
        console.warn('Error processing balances:', balanceError);
      }

      // --- Set Group Data ---
      setGroupData(prevData => ({
        ...prevData,
        ...groupDetailsResponse.group,
        totalExpenses: groupDetailsResponse.total_expenses || 0,
        members: ((balancesData?.balances || []).length > 0 ?
          (balancesData.balances || []).map((m: any) => ({
            id: m.user_id || m.id,
            name: m.name,
            email: m.email,
            avatar: m.avatar,
            balance: m.balance || 0
          })) :
          (membersData.members || []).map((m: any) => ({
            id: m.id || m.user_id,
            name: m.name,
            email: m.email,
            avatar: m.avatar,
            balance: m.balance || 0
          }))
        ),
      }));

    } catch (error) {
      console.error('Error fetching group data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load group data';
      setError(new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [id]);
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handleMemberAdded = () => {
    fetchGroupData();
  };

  const handleOpenSettleDialog = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setIsSettleDialogOpen(true);
  };

  const handleConfirmSettlement = (settlement: Settlement) => {
    console.log('Settlement confirmed:', settlement);
    fetchGroupData();
  };

  const handleDeleteMember = (member: Member) => {
    // Check if member has outstanding balances
    if (member.balance !== 0) {
      toast.error(`Cannot remove ${member.name} - they have outstanding balances (${member.balance > 0 ? 'are owed' : 'owe'} ₹${Math.abs(member.balance).toFixed(2)})`);
      return;
    }
    
    setMemberToDelete(member);
    setIsDeleteMemberDialogOpen(true);
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete || !id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${id}/members/${memberToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove member');
      }

      const result = await response.json();
      toast.success(result.message || 'Member removed successfully');
      setIsDeleteMemberDialogOpen(false);
      setMemberToDelete(null);
      fetchGroupData();
    } catch (error) {
      console.error('Error removing member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      toast.error(errorMessage);
    }
  };

  const handleCancelDeleteMember = () => {
    setIsDeleteMemberDialogOpen(false);
    setMemberToDelete(null);
  };


  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Food & Dining': return '🍽️';
      case 'Transportation': return '🚗';
      case 'Accommodation': return '🏠';
      case 'Entertainment': return '🎉';
      default: return '💳';
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `+$${balance.toFixed(2)}`;
    if (balance < 0) return `-$${Math.abs(balance).toFixed(2)}`;
    return '$0.00';
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            <h3 className="font-medium">Failed to load group data</h3>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={fetchGroupData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button
              variant="ghost"
              asChild
            >
              <Link to="/groups">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading group data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">{groupData.name}</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${groupData.totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupData.members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{groupData.lastActivity}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center md:justify-start items-center gap-3">
        <Button size="lg" asChild>
          <Link to={`/add-expense?group=${id}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </Button>

        <Button size="lg" onClick={() => setIsAddMemberDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start adding expenses to this group.
                </p>
                <Button asChild>
                  <Link to={`/add-expense?group=${id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Expense
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg">
                      {getCategoryIcon(expense.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{expense.title}</h3>
                        {expense.receipt && (
                          <Badge variant="outline" className="text-xs">
                            <Receipt className="h-3 w-3 mr-1" />
                            Receipt
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{expense.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{expense.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Paid by {expense.paidBy.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">${expense.amount.toFixed(2)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          {/* Settlements */}
          <Card>
            <CardHeader>
              <CardTitle>Settlements</CardTitle>
              <CardDescription>The simplest way to settle all debts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settlements.length > 0 ? (
                settlements.map((settlement) => (
                  <div key={`${settlement.from_id}-${settlement.to_id}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{settlement.from_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <span className="font-medium">{settlement.from_name}</span>
                        <span className="text-muted-foreground"> owes </span>
                        <span className="font-medium">{settlement.to_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600">${settlement.amount.toFixed(2)}</span>
                      {user?.id === settlement.from_id && (
                        <Button size="sm" onClick={() => handleOpenSettleDialog(settlement)}>
                          <Check className="h-4 w-4 mr-2" />
                          Settle Up
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All balances are settled!
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Individual Balances</CardTitle>
              <CardDescription>Each member's net balance in this group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {balances.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <span className={`font-bold ${getBalanceColor(member.balance)}`}>
                    {getBalanceText(member.balance)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- UPDATED MEMBERS TAB --- */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>People in this expense group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balances.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`font-medium ${getBalanceColor(member.balance)}`}>
                        {getBalanceText(member.balance)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.balance > 0 ? 'is owed' : member.balance < 0 ? 'owes' : 'settled'}
                      </div>
                    </div>
                    {user?.id !== member.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteMember(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AddMemberDialog
        open={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        groupId={id || ''}
        onMemberAdded={handleMemberAdded}
      />
      <SettleUpDialog
        open={isSettleDialogOpen}
        onOpenChange={setIsSettleDialogOpen}
        settlement={selectedSettlement}
        onConfirm={handleConfirmSettlement}
        groupId={id || ''}
      />

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog open={isDeleteMemberDialogOpen} onOpenChange={setIsDeleteMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from this group?
              This action cannot be undone, and the member will lose access to all group expenses and balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteMember}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteMember}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
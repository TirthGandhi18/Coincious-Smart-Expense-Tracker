import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  ArrowLeft,
  Plus, 
  Users, 
  DollarSign, 
  Calendar,
  MoreVertical,
  Settings,
  UserPlus,
  Receipt,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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
} from '../ui/dialog';
import { toast } from 'sonner';

// Mock data for all groups
const allGroupsData: { [key: string]: any } = {
  '1': {
    id: '1',
    name: 'Weekend Trip',
    description: 'Beach house rental and activities',
    members: [
      { 
        id: 'user-1', 
        name: 'You (Alex)', 
        email: 'alex@example.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -45.20
      },
      { 
        id: 'user-2', 
        name: 'Sarah Johnson', 
        email: 'sarah@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b272?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 125.80
      },
      { 
        id: 'user-3', 
        name: 'Mike Chen', 
        email: 'mike@example.com',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -35.40
      },
      { 
        id: 'user-4', 
        name: 'Lisa Anderson', 
        email: 'lisa@example.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -45.20
      }
    ],
    totalExpenses: 1248.75,
    createdAt: '2024-01-15',
    lastActivity: '2 hours ago'
  },
  '2': {
    id: '2',
    name: 'Roommates',
    description: 'Shared apartment expenses',
    members: [
      { 
        id: 'user-1', 
        name: 'You (Alex)', 
        email: 'alex@example.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 125.80
      },
      { 
        id: 'user-5', 
        name: 'James Wilson', 
        email: 'james@example.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -65.40
      },
      { 
        id: 'user-6', 
        name: 'Emma Davis', 
        email: 'emma@example.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -60.40
      }
    ],
    totalExpenses: 2847.30,
    createdAt: '2024-01-10',
    lastActivity: '1 day ago'
  },
  '3': {
    id: '3',
    name: 'Work Lunch Group',
    description: 'Office lunch orders and team dinners',
    members: [
      { 
        id: 'user-1', 
        name: 'You (Alex)', 
        email: 'alex@example.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -12.30
      },
      { 
        id: 'user-2', 
        name: 'Sarah Johnson', 
        email: 'sarah@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b272?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 45.60
      },
      { 
        id: 'user-7', 
        name: 'David Martinez', 
        email: 'david@example.com',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -8.50
      },
      { 
        id: 'user-8', 
        name: 'Olivia Taylor', 
        email: 'olivia@example.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -15.20
      },
      { 
        id: 'user-3', 
        name: 'Mike Chen', 
        email: 'mike@example.com',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: -9.60
      }
    ],
    totalExpenses: 456.90,
    createdAt: '2024-01-01',
    lastActivity: '3 days ago'
  },
  '4': {
    id: '4',
    name: 'Family Vacation 2024',
    description: 'Annual family trip expenses',
    members: [
      { 
        id: 'user-1', 
        name: 'You (Alex)', 
        email: 'alex@example.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 0
      },
      { 
        id: 'user-9', 
        name: 'Robert Brown', 
        email: 'robert@example.com',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 0
      },
      { 
        id: 'user-10', 
        name: 'Sophia Garcia', 
        email: 'sophia@example.com',
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 0
      },
      { 
        id: 'user-4', 
        name: 'Lisa Anderson', 
        email: 'lisa@example.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 0
      },
      { 
        id: 'user-11', 
        name: 'William Lee', 
        email: 'william@example.com',
        avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 0
      },
      { 
        id: 'user-12', 
        name: 'Ava White', 
        email: 'ava@example.com',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face&auto=format',
        balance: 0
      }
    ],
    totalExpenses: 3240.00,
    createdAt: '2023-12-20',
    lastActivity: '1 week ago'
  }
};

const allExpensesData: { [key: string]: any[] } = {
  '1': [
    {
      id: '1-1',
      title: 'Beach House Rental',
      amount: 800.00,
      category: 'Accommodation',
      date: '2024-01-20',
      paidBy: { id: 'user-2', name: 'Sarah Johnson' },
      splitAmong: ['user-1', 'user-2', 'user-3', 'user-4'],
      description: '3-night beach house rental',
      receipt: true
    },
    {
      id: '1-2',
      title: 'Grocery Shopping',
      amount: 156.30,
      category: 'Food & Dining',
      date: '2024-01-20',
      paidBy: { id: 'user-1', name: 'You (Alex)' },
      splitAmong: ['user-1', 'user-2', 'user-3', 'user-4'],
      description: 'Food and drinks for the weekend'
    },
    {
      id: '1-3',
      title: 'Gas for Road Trip',
      amount: 89.45,
      category: 'Transportation',
      date: '2024-01-19',
      paidBy: { id: 'user-3', name: 'Mike Chen' },
      splitAmong: ['user-1', 'user-2', 'user-3', 'user-4'],
      description: 'Fuel for the drive to beach house'
    },
    {
      id: '1-4',
      title: 'Dinner at Seafood Restaurant',
      amount: 203.00,
      category: 'Food & Dining',
      date: '2024-01-21',
      paidBy: { id: 'user-4', name: 'Lisa Anderson' },
      splitAmong: ['user-1', 'user-2', 'user-3', 'user-4'],
      description: 'Group dinner on Saturday night',
      receipt: true
    }
  ],
  '2': [
    {
      id: '2-1',
      title: 'Monthly Rent',
      amount: 1800.00,
      category: 'Accommodation',
      date: '2024-02-01',
      paidBy: { id: 'user-1', name: 'You (Alex)' },
      splitAmong: ['user-1', 'user-5', 'user-6'],
      description: 'February rent payment',
      receipt: true
    },
    {
      id: '2-2',
      title: 'Electricity Bill',
      amount: 145.50,
      category: 'Utilities',
      date: '2024-01-28',
      paidBy: { id: 'user-5', name: 'James Wilson' },
      splitAmong: ['user-1', 'user-5', 'user-6'],
      description: 'January electricity'
    },
    {
      id: '2-3',
      title: 'Internet Bill',
      amount: 89.80,
      category: 'Utilities',
      date: '2024-01-25',
      paidBy: { id: 'user-1', name: 'You (Alex)' },
      splitAmong: ['user-1', 'user-5', 'user-6'],
      description: 'Monthly internet subscription'
    },
    {
      id: '2-4',
      title: 'Grocery Shopping',
      amount: 312.00,
      category: 'Food & Dining',
      date: '2024-01-30',
      paidBy: { id: 'user-6', name: 'Emma Davis' },
      splitAmong: ['user-1', 'user-5', 'user-6'],
      description: 'Weekly groceries'
    },
    {
      id: '2-5',
      title: 'Cleaning Supplies',
      amount: 45.00,
      category: 'Household',
      date: '2024-01-27',
      paidBy: { id: 'user-1', name: 'You (Alex)' },
      splitAmong: ['user-1', 'user-5', 'user-6'],
      description: 'Bathroom and kitchen supplies'
    }
  ],
  '3': [
    {
      id: '3-1',
      title: 'Team Lunch - Italian Restaurant',
      amount: 125.50,
      category: 'Food & Dining',
      date: '2024-01-28',
      paidBy: { id: 'user-2', name: 'Sarah Johnson' },
      splitAmong: ['user-1', 'user-2', 'user-7', 'user-8', 'user-3'],
      description: 'Celebration lunch for project completion'
    },
    {
      id: '3-2',
      title: 'Coffee Run',
      amount: 32.40,
      category: 'Food & Dining',
      date: '2024-01-26',
      paidBy: { id: 'user-7', name: 'David Martinez' },
      splitAmong: ['user-1', 'user-2', 'user-7', 'user-8', 'user-3'],
      description: 'Morning coffee for the team'
    },
    {
      id: '3-3',
      title: 'Pizza Order',
      amount: 89.00,
      category: 'Food & Dining',
      date: '2024-01-25',
      paidBy: { id: 'user-2', name: 'Sarah Johnson' },
      splitAmong: ['user-1', 'user-2', 'user-7', 'user-8', 'user-3'],
      description: 'Late night work session dinner'
    },
    {
      id: '3-4',
      title: 'Team Dinner',
      amount: 210.00,
      category: 'Food & Dining',
      date: '2024-01-22',
      paidBy: { id: 'user-8', name: 'Olivia Taylor' },
      splitAmong: ['user-1', 'user-2', 'user-7', 'user-8', 'user-3'],
      description: 'Monthly team dinner',
      receipt: true
    }
  ],
  '4': [
    {
      id: '4-1',
      title: 'Flight Tickets',
      amount: 1800.00,
      category: 'Transportation',
      date: '2024-01-15',
      paidBy: { id: 'user-9', name: 'Robert Brown' },
      splitAmong: ['user-1', 'user-9', 'user-10', 'user-4', 'user-11', 'user-12'],
      description: 'Round trip flights for family',
      receipt: true
    },
    {
      id: '4-2',
      title: 'Hotel Booking',
      amount: 960.00,
      category: 'Accommodation',
      date: '2024-01-16',
      paidBy: { id: 'user-10', name: 'Sophia Garcia' },
      splitAmong: ['user-1', 'user-9', 'user-10', 'user-4', 'user-11', 'user-12'],
      description: '4-night hotel stay',
      receipt: true
    },
    {
      id: '4-3',
      title: 'Car Rental',
      amount: 280.00,
      category: 'Transportation',
      date: '2024-01-17',
      paidBy: { id: 'user-11', name: 'William Lee' },
      splitAmong: ['user-1', 'user-9', 'user-10', 'user-4', 'user-11', 'user-12'],
      description: 'SUV rental for 5 days'
    },
    {
      id: '4-4',
      title: 'Theme Park Tickets',
      amount: 200.00,
      category: 'Entertainment',
      date: '2024-01-18',
      paidBy: { id: 'user-12', name: 'Ava White' },
      splitAmong: ['user-1', 'user-9', 'user-10', 'user-4', 'user-11', 'user-12'],
      description: 'Family day at theme park',
      receipt: true
    }
  ]
};

const allSettlementsData: { [key: string]: any[] } = {
  '1': [
    {
      from: { id: 'user-1', name: 'You (Alex)' },
      to: { id: 'user-2', name: 'Sarah Johnson' },
      amount: 45.20,
      status: 'pending'
    },
    {
      from: { id: 'user-3', name: 'Mike Chen' },
      to: { id: 'user-2', name: 'Sarah Johnson' },
      amount: 35.40,
      status: 'pending'
    },
    {
      from: { id: 'user-4', name: 'Lisa Anderson' },
      to: { id: 'user-2', name: 'Sarah Johnson' },
      amount: 45.20,
      status: 'pending'
    }
  ],
  '2': [
    {
      from: { id: 'user-5', name: 'James Wilson' },
      to: { id: 'user-1', name: 'You (Alex)' },
      amount: 65.40,
      status: 'pending'
    },
    {
      from: { id: 'user-6', name: 'Emma Davis' },
      to: { id: 'user-1', name: 'You (Alex)' },
      amount: 60.40,
      status: 'pending'
    }
  ],
  '3': [
    {
      from: { id: 'user-1', name: 'You (Alex)' },
      to: { id: 'user-2', name: 'Sarah Johnson' },
      amount: 12.30,
      status: 'pending'
    },
    {
      from: { id: 'user-7', name: 'David Martinez' },
      to: { id: 'user-2', name: 'Sarah Johnson' },
      amount: 8.50,
      status: 'pending'
    },
    {
      from: { id: 'user-8', name: 'Olivia Taylor' },
      to: { id: 'user-2', name: 'Sarah Johnson' },
      amount: 15.20,
      status: 'pending'
    },
    {
      from: { id: 'user-3', name: 'Mike Chen' },
      to: { id: 'user-2', name: 'Sarah Johnson' },
      amount: 9.60,
      status: 'pending'
    }
  ],
  '4': []
};

export function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expenses');
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [groupData, setGroupData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    // Load group data based on ID
    if (id && allGroupsData[id]) {
      setGroupData(allGroupsData[id]);
      setExpenses(allExpensesData[id] || []);
      setSettlements(allSettlementsData[id] || []);
    } else {
      // Group not found, redirect to groups page
      toast.error('Group not found');
      navigate('/groups');
    }
  }, [id, navigate]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Food & Dining': return '🍽️';
      case 'Transportation': return '🚗';
      case 'Accommodation': return '🏠';
      case 'Entertainment': return '🎉';
      case 'Utilities': return '⚡';
      case 'Household': return '🏡';
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

    // Add new member to local state
    const newMember = {
      id: `user-${Date.now()}`,
      name: newMemberName,
      email: newMemberEmail,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newMemberName)}&background=random`,
      balance: 0
    };

    setGroupData((prev: any) => ({
      ...prev,
      members: [...prev.members, newMember]
    }));

    toast.success(`${newMemberName} has been invited to the group!`);
    setNewMemberEmail('');
    setNewMemberName('');
    setIsAddMemberDialogOpen(false);
  };

  // Show loading state while group data is being loaded
  if (!groupData) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading group details...</p>
          </CardContent>
        </Card>
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
          <p className="text-muted-foreground">{groupData.description}</p>
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
          </DropdownMenuContent>
        </DropdownMenu>
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" className="flex-1" asChild>
          <Link to={`/add-expense?group=${id}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </Button>
        <Button size="lg" variant="outline" className="flex-1" onClick={() => setIsAddMemberDialogOpen(true)}>
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
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
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
                      <div className="text-sm text-muted-foreground">
                        ${(expense.amount / expense.splitAmong.length).toFixed(2)} per person
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start adding expenses to track group spending
                </p>
                <Button asChild>
                  <Link to={`/add-expense?group=${id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Expense
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          {/* Settlements */}
          <Card>
            <CardHeader>
              <CardTitle>Settlements</CardTitle>
              <CardDescription>Who owes whom</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settlements.length > 0 ? (
                settlements.map((settlement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={
                          groupData.members.find((m: any) => m.id === settlement.from.id)?.avatar
                        } />
                        <AvatarFallback>{settlement.from.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <span className="font-medium">{settlement.from.name}</span>
                        <span className="text-muted-foreground"> owes </span>
                        <span className="font-medium">{settlement.to.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600">${settlement.amount.toFixed(2)}</span>
                      <Badge variant={settlement.status === 'pending' ? 'secondary' : 'default'}>
                        {settlement.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>All settled up! No pending payments.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Balances</CardTitle>
              <CardDescription>Each member's balance in this group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupData.members.map((member: any) => (
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

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>People in this expense group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupData.members.map((member: any) => (
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
                  <div className="text-right">
                    <div className={`font-medium ${getBalanceColor(member.balance)}`}>
                      {getBalanceText(member.balance)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.balance > 0 ? 'is owed' : member.balance < 0 ? 'owes' : 'settled'}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Member to {groupData.name}</DialogTitle>
            <DialogDescription>
              Invite a new member to join this group. They'll be able to add expenses and see group activity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Current Members */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Current Members ({groupData.members.length})</Label>
              <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                {groupData.members.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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

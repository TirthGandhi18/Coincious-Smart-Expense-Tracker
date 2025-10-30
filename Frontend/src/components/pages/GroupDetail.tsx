import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
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
import { Link, useParams } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

// Mock data
const groupData = {
  id: '1',
  name: 'Weekend Trip',
  description: 'Beach house rental and activities',
  members: [
    { 
      id: '1', 
      name: 'You', 
      email: 'you@example.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
      balance: -45.20
    },
    { 
      id: '2', 
      name: 'Sarah Johnson', 
      email: 'sarah@example.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b272?w=150&h=150&fit=crop&crop=face&auto=format',
      balance: 125.80
    },
    { 
      id: '3', 
      name: 'Mike Chen', 
      email: 'mike@example.com',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face&auto=format',
      balance: -35.40
    },
    { 
      id: '4', 
      name: 'Lisa Wang', 
      email: 'lisa@example.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format',
      balance: -45.20
    }
  ],
  totalExpenses: 1248.75,
  createdAt: '2024-01-15',
  lastActivity: '2 hours ago'
};

const expenses = [
  {
    id: '1',
    title: 'Beach House Rental',
    amount: 800.00,
    category: 'Accommodation',
    date: '2024-01-20',
    paidBy: { id: '2', name: 'Sarah Johnson' },
    splitAmong: ['1', '2', '3', '4'],
    description: '3-night beach house rental',
    receipt: true
  },
  {
    id: '2',
    title: 'Grocery Shopping',
    amount: 156.30,
    category: 'Food & Dining',
    date: '2024-01-20',
    paidBy: { id: '1', name: 'You' },
    splitAmong: ['1', '2', '3', '4'],
    description: 'Food and drinks for the weekend'
  },
  {
    id: '3',
    title: 'Gas for Road Trip',
    amount: 89.45,
    category: 'Transportation',
    date: '2024-01-19',
    paidBy: { id: '3', name: 'Mike Chen' },
    splitAmong: ['1', '2', '3', '4'],
    description: 'Fuel for the drive to beach house'
  },
  {
    id: '4',
    title: 'Dinner at Seafood Restaurant',
    amount: 203.00,
    category: 'Food & Dining',
    date: '2024-01-21',
    paidBy: { id: '4', name: 'Lisa Wang' },
    splitAmong: ['1', '2', '3', '4'],
    description: 'Group dinner on Saturday night',
    receipt: true
  }
];

const settlements = [
  {
    from: { id: '1', name: 'You' },
    to: { id: '2', name: 'Sarah Johnson' },
    amount: 45.20,
    status: 'pending'
  },
  {
    from: { id: '3', name: 'Mike Chen' },
    to: { id: '2', name: 'Sarah Johnson' },
    amount: 35.40,
    status: 'pending'
  },
  {
    from: { id: '4', name: 'Lisa Wang' },
    to: { id: '2', name: 'Sarah Johnson' },
    amount: 45.20,
    status: 'pending'
  }
];

export function GroupDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('expenses');

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
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Members
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

      {/* Add Expense Button */}
      <div className="flex justify-center md:justify-start">
        <Button size="lg" asChild>
          <Link to={`/add-expense?group=${id}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
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
          {expenses.map((expense) => (
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
          ))}
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          {/* Settlements */}
          <Card>
            <CardHeader>
              <CardTitle>Settlements</CardTitle>
              <CardDescription>Who owes whom</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settlements.map((settlement, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={settlement.from.id === '1' ? groupData.members[0].avatar : ''} />
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
              ))}
            </CardContent>
          </Card>

          {/* Individual Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Balances</CardTitle>
              <CardDescription>Each member's balance in this group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupData.members.map((member) => (
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
              {groupData.members.map((member) => (
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

          <Button variant="outline" className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
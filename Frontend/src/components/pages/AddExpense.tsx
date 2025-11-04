import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../lib/info';
import { useAuth } from '../../App';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  ArrowLeft,
  DollarSign,
  Receipt,
  Users,
  Calculator,
  Upload,
  Plus,
  Minus,
  User,
  Calendar
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';

// Mock data
const categories = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏠' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎉' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'health', label: 'Health & Medical', icon: '⚕️' },
  { value: 'other', label: 'Other', icon: '💳' }
];

// Dummy groups data
const dummyGroups = [
  { id: '1', name: 'Weekend Trip' },
  { id: '2', name: 'Roommates' },
  { id: '3', name: 'Work Lunch Group' },
  { id: '4', name: 'Family Vacation 2024' }
];

// Dummy group members data
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

export function AddExpense() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGroup = searchParams.get('group');
  const { user } = useAuth();

  // Expense type state
  const [expenseType, setExpenseType] = useState<'personal' | 'group'>(preselectedGroup ? 'group' : 'personal');

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(preselectedGroup || '');
  const [paidBy, setPaidBy] = useState('user-1'); 
  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['user-1']);
  const [unequalAmounts, setUnequalAmounts] = useState<{ [key: string]: string }>({});
  const [amountErrors, setAmountErrors] = useState<{ [key: string]: string }>({});
  const [groups, setGroups] = useState<any[]>(dummyGroups);
  const [loading, setLoading] = useState(false);

  // Format today's date as DD/MM/YYYY
  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setExpenseDate(`${day}/${month}/${year}`);
  }, []);

  // Get current group members based on selected group
  const currentMembers = selectedGroup ? (dummyGroupMembers[selectedGroup] || []) : [];

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
      }
    };

    fetchGroups();
  }, [user]);

  // Reset split data when group changes
  useEffect(() => {
    if (selectedGroup && currentMembers.length > 0) {
      // Reset selected members to include the first user
      setSelectedMembers(['user-1']);
      setPaidBy('user-1');
      // Clear unequal amounts
      setUnequalAmounts({});
      setAmountErrors({});
    }
  }, [selectedGroup]);

  // Handle date input with auto-formatting
  const handleDateChange = (value: string) => {
    // Remove all non-numeric characters
    const numbersOnly = value.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    let formatted = '';
    if (numbersOnly.length > 0) {
      formatted = numbersOnly.substring(0, 2);
      if (numbersOnly.length >= 3) {
        formatted += '/' + numbersOnly.substring(2, 4);
      }
      if (numbersOnly.length >= 5) {
        formatted += '/' + numbersOnly.substring(4, 8);
      }
    }
    
    setExpenseDate(formatted);
  };

  // Validate date format and validity
  const isValidDate = (dateString: string): boolean => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Check if month is valid
    if (month < 1 || month > 12) return false;
    
    // Check if day is valid for the given month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    
    // Check if the date is not in the future
    const inputDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return inputDate <= today;
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleUnequalAmountChange = (memberId: string, value: string) => {
    // Clear previous error for this member
    setAmountErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[memberId];
      return newErrors;
    });

    // Allow empty string for clearing the input
    if (value === '') {
      setUnequalAmounts(prev => ({
        ...prev,
        [memberId]: ''
      }));
      return;
    }

    // Validate that it's a valid number (integer or float)
    const numberRegex = /^-?\d*\.?\d*$/;
    if (!numberRegex.test(value)) {
      setAmountErrors(prev => ({
        ...prev,
        [memberId]: 'Please enter a valid number'
      }));
      return;
    }

    // Check if it's a valid positive number
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue < 0) {
      setAmountErrors(prev => ({
        ...prev,
        [memberId]: 'Amount must be positive'
      }));
      return;
    }

    setUnequalAmounts(prev => ({
      ...prev,
      [memberId]: value
    }));
  };

  const calculateSplitAmounts = () => {
    const totalAmount = parseFloat(amount) || 0;
    const numMembers = selectedMembers.length;

    if (splitMethod === 'equal') {
      if (numMembers === 0) return {};
      const equalAmount = totalAmount / numMembers;
      return selectedMembers.reduce((acc, memberId) => {
        acc[memberId] = equalAmount.toFixed(2);
        return acc;
      }, {} as { [key: string]: string });
    }

    if (splitMethod === 'unequal') {
      // Return the unequal amounts entered by user
      return unequalAmounts;
    }

    return {};
  };

  const splitAmounts = calculateSplitAmounts();
  const totalSplit = Object.values(splitAmounts).reduce((sum, amount) => sum + parseFloat(amount || '0'), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!title.trim()) {
        toast.error('Please enter an expense title');
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      if (!category) {
        toast.error('Please select a category');
        return;
      }

      if (!expenseDate.trim()) {
        toast.error('Please enter a date');
        return;
      }

      if (!isValidDate(expenseDate)) {
        toast.error('Please enter a valid date in DD/MM/YYYY format (cannot be in the future)');
        return;
      }

      // Personal expense - simpler validation
      if (expenseType === 'personal') {
        // For personal expenses, we'll create a personal expense record
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('Please log in to add an expense');
          return;
        }

        // For now, we'll show a success message for personal expenses
        // In a real app, you'd have a separate endpoint for personal expenses
        toast.success('Personal expense added successfully!');
        navigate('/dashboard');
        return;
      }

      // Group expense validation
      if (!selectedGroup) {
        toast.error('Please select a group');
        return;
      }

      if (selectedMembers.length === 0) {
        toast.error('Please select at least one person to split with');
        return;
      }

      if (splitMethod === 'unequal') {
        // Check if all members have amounts
        const hasAllAmounts = currentMembers.every(member => {
          const amount = unequalAmounts[member.id];
          return amount && amount.trim() !== '' && !isNaN(parseFloat(amount));
        });

        if (!hasAllAmounts) {
          toast.error('Please enter valid amounts for all members');
          return;
        }

        // Check if there are any errors
        if (Object.keys(amountErrors).length > 0) {
          toast.error('Please fix amount errors before submitting');
          return;
        }

        // Validate that the sum equals the total
        const unequalTotal = Object.values(unequalAmounts).reduce((sum, amt) => sum + parseFloat(amt || '0'), 0);
        if (Math.abs(unequalTotal - parseFloat(amount)) > 0.01) {
          toast.error(`Unequal amounts must add up to the total expense amount ($${parseFloat(amount).toFixed(2)})`);
          return;
        }
      }

      // Convert date from DD/MM/YYYY to ISO format
      const [day, month, year] = expenseDate.split('/').map(num => parseInt(num, 10));
      const dateObj = new Date(year, month - 1, day);
      const isoDate = dateObj.toISOString();

      // Calculate splits
      const totalAmount = parseFloat(amount);
      const splits: { [key: string]: number } = {};
      
      if (splitMethod === 'equal') {
        const equalAmount = totalAmount / selectedMembers.length;
        selectedMembers.forEach(memberId => {
          splits[memberId] = equalAmount;
        });
      } else if (splitMethod === 'unequal') {
        currentMembers.forEach(member => {
          splits[member.id] = parseFloat(unequalAmounts[member.id] || '0');
        });
      }

      // Submit to backend
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to add an expense');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7f88878c/expenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          amount: totalAmount,
          description,
          category,
          date: isoDate,
          group_id: selectedGroup,
          paid_by: paidBy,
          split_method: splitMethod,
          splits,
        }),
      });

      if (response.ok) {
        toast.success('Expense added successfully!');
        navigate('/groups/' + selectedGroup);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Add Expense</h1>
          <p className="text-muted-foreground">
            {expenseType === 'personal' ? 'Track your personal expense' : 'Split a new expense with your group'}
          </p>
        </div>
      </div>

      {/* Expense Type Navigation */}
      <Tabs value={expenseType} onValueChange={(value) => setExpenseType(value as 'personal' | 'group')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="group" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information - Always shown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Dinner at Italian Restaurant"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={expenseDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="pl-10"
                  maxLength={10}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the date when this expense occurred (DD/MM/YYYY)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Group Selection - Only shown for group expenses */}
        {expenseType === 'group' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Group & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group">Select Group</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => {
                      const memberCount = dummyGroupMembers[group.id]?.length || 0;
                      return (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{group.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({memberCount} {memberCount === 1 ? 'member' : 'members'})
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedGroup && currentMembers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    This group has {currentMembers.length} {currentMembers.length === 1 ? 'member' : 'members'}
                  </p>
                )}
              </div>

              {selectedGroup && (
                <div className="space-y-2">
                  <Label>Paid by</Label>
                  <RadioGroup value={paidBy} onValueChange={setPaidBy}>
                    {currentMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={member.id} id={`payer-${member.id}`} />
                        <Label htmlFor={`payer-${member.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {member.name}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Split Configuration - Only shown for group expenses */}
        {expenseType === 'group' && selectedGroup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Split Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Split Method */}
              <div className="space-y-3">
                <Label>Split Method</Label>
                <RadioGroup value={splitMethod} onValueChange={(value) => setSplitMethod(value as 'equal' | 'unequal')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="equal" id="equal" />
                    <Label htmlFor="equal" className="cursor-pointer">
                      Equal Division
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unequal" id="unequal" />
                    <Label htmlFor="unequal" className="cursor-pointer">
                      Unequal Division
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Equal Division - Member Selection with Checkboxes */}
              {splitMethod === 'equal' && (
                <div className="space-y-3">
                  <div>
                    <Label>Select members to split equally among</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose which group members will share the expense equally.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {currentMembers.map((member) => {
                      const isSelected = selectedMembers.includes(member.id);
                      const splitAmount = splitAmounts[member.id] || '0.00';

                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleMemberToggle(member.id)}
                              id={`member-${member.id}`}
                            />
                            <Label htmlFor={`member-${member.id}`} className="flex items-center gap-3 cursor-pointer">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{member.name}</div>
                                {member.email && (
                                  <div className="text-xs text-muted-foreground">{member.email}</div>
                                )}
                              </div>
                            </Label>
                          </div>

                          {isSelected && amount && (
                            <Badge variant="outline" className="ml-2">
                              ${splitAmount}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unequal Division - Input boxes for each member */}
              {splitMethod === 'unequal' && (
                <div className="space-y-3">
                  <div>
                    <Label>Enter amount for each member</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Specify how much each member should pay. All amounts must add up to the total expense.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {currentMembers.map((member) => {
                      const memberAmount = unequalAmounts[member.id] || '';
                      const hasError = amountErrors[member.id];

                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{member.name}</div>
                              {member.email && (
                                <div className="text-xs text-muted-foreground">{member.email}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="0.00"
                                value={memberAmount}
                                onChange={(e) => handleUnequalAmountChange(member.id, e.target.value)}
                                className={`w-28 text-right pl-8 ${hasError ? 'border-red-500' : ''}`}
                              />
                            </div>
                            {hasError && (
                              <span className="text-xs text-red-500">{hasError}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Split Summary */}
              {amount && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Expense Amount:</span>
                    <span className="font-bold">${parseFloat(amount).toFixed(2)}</span>
                  </div>
                  
                  {splitMethod === 'equal' && selectedMembers.length > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Members Selected:</span>
                        <span>{selectedMembers.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Amount per Member:</span>
                        <span className="font-bold text-green-600">
                          ${(parseFloat(amount) / selectedMembers.length).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  {splitMethod === 'unequal' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Amount Split:</span>
                        <span className={`font-bold ${Math.abs(totalSplit - parseFloat(amount)) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                          ${totalSplit.toFixed(2)}
                        </span>
                      </div>
                      {Math.abs(totalSplit - parseFloat(amount)) > 0.01 && (
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Remaining to allocate:</span>
                          <span>${Math.abs(parseFloat(amount) - totalSplit).toFixed(2)}</span>
                        </div>
                      )}
                      {Math.abs(totalSplit - parseFloat(amount)) <= 0.01 && totalSplit > 0 && (
                        <div className="text-sm text-green-600 text-center">
                          ✓ Amounts correctly allocated
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Receipt Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Receipt (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your receipt here, or click to browse
              </p>
              <Button variant="outline" size="sm">
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" asChild>
            <Link to="/dashboard">Cancel</Link>
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Adding Expense...' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}

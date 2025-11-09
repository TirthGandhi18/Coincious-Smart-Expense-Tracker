import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
// import { Textarea } from '../ui/textarea'; // No longer needed
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../App';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  Users,
  Calculator,
  Upload,
  User,
  Zap,
  Loader2
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

// --- TYPES ---

type Group = {
  id: string;
  name: string;
};

type GroupMember = {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string | null;
};

type GroupMemberResponse = {
  users: GroupMember | null;
};

type StringMap = { [key: string]: string };

type ExpensePayload = {
  description: string;
  amount: number;
  date: string;
  category: string;
  payer_id: string;
  group_id: string | null;
  // notes?: string | null; // Removed
};

type SplitPayload = {
  user_id: string;
  amount_owed: number;
  status: 'pending';
};

// --- CONSTANTS ---

// Get today's date in YYYY-MM-DD format
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const todaysDate = `${year}-${month}-${day}`;

// --- COMPONENT ---

export function AddExpense() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGroup = searchParams.get('group');
  const { user } = useAuth();

  // Expense type state
  const [expenseType, setExpenseType] = useState<'personal' | 'group'>(preselectedGroup ? 'group' : 'personal');

  // --- Form state ---
  const [description, setDescription] = useState(''); 
  const [amount, setAmount] = useState('');
  // const [notes, setNotes] = useState(''); // Removed
  const [category, setCategory] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(preselectedGroup || '');
  
  const payerId = user?.id || '';

  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [unequalAmounts, setUnequalAmounts] = useState<StringMap>({});
  const [amountErrors, setAmountErrors] = useState<StringMap>({});
  
  const [expenseDate, setExpenseDate] = useState(todaysDate); 
  
  // --- Feature state ---
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);

  // --- Data state ---
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentMembers, setCurrentMembers] = useState<GroupMember[]>([]);
  
  // --- Loading states ---
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Memoized user detail
  const currentUserInGroup = useMemo(() => {
    return currentMembers.find(m => m.id === user?.id);
  }, [currentMembers, user]);

  // Fetch groups
  useEffect(() => {
    if (!user) return;
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const { data, error } = await supabase.rpc('get_user_groups');
        if (error) throw error;
        setGroups(data as Group[]);
      } catch (error: any) {
        console.error('Error fetching groups:', error);
        toast.error('Failed to load your groups');
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, [user]);

  // Fetch dynamic categories
  useEffect(() => {
    if (!user) return; 
    const fetchCategories = async () => {
      // Placeholder list
      const placeholderCategories = [
        'Food & Dining', 'Transportation', 'Accommodation', 
        'Entertainment', 'Utilities', 'Shopping', 
        'Health & Medical', 'Other'
      ];
      
      try {
        const { data, error } = await supabase.rpc('get_all_user_categories');
        if (error) throw error;
        
        const uniqueCategories = [...new Set((data as string[]).concat(placeholderCategories))];
        setAvailableCategories(uniqueCategories);
      } catch (error: any) {
        console.error('Error fetching categories:', error);
        toast.error('Could not load your categories. Using defaults.');
        setAvailableCategories(placeholderCategories);
      }
    };
    fetchCategories();
  }, [user]);

  // Fetch members
  useEffect(() => {
    if (!selectedGroup || !user) {
      setCurrentMembers([]);
      return;
    }
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const { data, error } = await supabase
          .from('group_members')
          .select('users!inner(id, name, avatar_url, email)')
          .eq('group_id', selectedGroup)
          .returns<GroupMemberResponse[]>(); 

        if (error) throw error;
        const fetchedMembers = (data || [])
          .map(item => item.users)
          .filter((u): u is GroupMember => u !== null);
          
        setCurrentMembers(fetchedMembers);
        setSelectedMembers([user.id]); 
        setUnequalAmounts({});
        setAmountErrors({});
      } catch (error: any) {
        console.error('Error fetching group members:', error);
        toast.error('Failed to load group members');
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [selectedGroup, user]);


  // --- FORM HANDLERS ---

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev: string[]) => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleUnequalAmountChange = (memberId: string, value: string) => {
    setAmountErrors((prev: StringMap) => ({ ...prev, [memberId]: '' }));
    const numberRegex = /^\d*\.?\d*$/;
    if (value !== '' && !numberRegex.test(value)) {
      setAmountErrors((prev: StringMap) => ({ ...prev, [memberId]: 'Invalid number' }));
    }
    setUnequalAmounts((prev: StringMap) => ({ ...prev, [memberId]: value }));
  };

  // --- FEATURE HANDLERS ---

  const handleAICategorize = async () => {
    if (!description.trim()) {
      toast.error('Please enter a description first.');
      return;
    }
    setIsCategorizing(true);
    const toastId = toast.loading('Asking the AI for a category...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");
      const formData = new FormData();
      formData.append('description', description);
      formData.append('category', '');
      const response = await fetch('http://localhost:8000/api/categorize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('AI server failed to respond.');
      const result = await response.json();
      const aiCategoryLabel = result.category;
      if (aiCategoryLabel) {
        if (!availableCategories.includes(aiCategoryLabel)) {
          setAvailableCategories(prevCategories => [...prevCategories, aiCategoryLabel]);
        }
        setCategory(aiCategoryLabel);
        toast.success(`AI suggested: ${aiCategoryLabel}`, { id: toastId });
      } else {
        throw new Error("AI could not determine a category.");
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to get AI category.', { id: toastId });
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (!file) return;
    setReceiptFile(file);
    setIsParsingReceipt(true);
    const toastId = toast.loading('Parsing receipt...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to upload receipts', { id: toastId });
        return;
      }
      const formData = new FormData();
      formData.append('receipt', file); // Corrected key
      const response = await fetch('http://localhost:8000/api/parse-bill', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });
      if (!response.ok) {
         const err = await response.json();
         throw new Error(err.error || 'Failed to parse receipt');
      }
      const { parsed } = await response.json();

      if (parsed.vendor_name) setDescription(parsed.vendor_name);
      if (parsed.total) setAmount(parsed.total.toString());
      
      if (parsed.issue_date) {
        try {
          const date = new Date(parsed.issue_date);
          if (!Number.isNaN(date.getTime())) {
            const formattedDate = date.toISOString().split('T')[0];
            if (formattedDate <= todaysDate) {
              setExpenseDate(formattedDate);
            }
          }
        } catch (e) { console.warn("Invalid date from receipt", parsed.issue_date)}
      }

      if (parsed.category_guess) {
        const normalizedGuess = parsed.category_guess.toLowerCase().trim();
        let matchedCategory = availableCategories.find(cat => cat.toLowerCase() === normalizedGuess);
        if (!matchedCategory) {
          matchedCategory = availableCategories.find(cat =>
            cat.toLowerCase().includes(normalizedGuess) ||
            normalizedGuess.includes(cat.toLowerCase())
          );
        }
        if (matchedCategory) {
          setCategory(matchedCategory);
        } else {
          const capitalizedGuess = parsed.category_guess.charAt(0).toUpperCase() + parsed.category_guess.slice(1);
          if (!availableCategories.includes(capitalizedGuess)) {
            setAvailableCategories(prev => [...prev, capitalizedGuess]);
          }
          setCategory(capitalizedGuess);
        }
      }
      toast.success('Receipt processed successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      toast.error(error.message || 'Failed to process receipt.', { id: toastId });
    } finally {
      setIsParsingReceipt(false);
    }
  };


  // --- SPLIT CALCULATIONS ---

  const splitAmounts = useMemo(() => {
    const totalAmount = Number.parseFloat(amount) || 0;
    if (totalAmount === 0) return {};
    if (splitMethod === 'equal') {
      const numMembers = selectedMembers.length;
      if (numMembers === 0) return {};
      const equalAmount = totalAmount / numMembers;
      return selectedMembers.reduce((acc, memberId) => {
        acc[memberId] = equalAmount.toFixed(2);
        return acc;
      }, {} as { [key: string]: string });
    }
    if (splitMethod === 'unequal') {
      return unequalAmounts;
    }
    return {};
  }, [amount, splitMethod, selectedMembers, unequalAmounts]);

  const totalSplit = useMemo(() => {
    return Object.values(splitAmounts).reduce((sum: number, amt: string) => sum + Number.parseFloat(amt || '0'), 0);
  }, [splitAmounts]);


  // --- FORM VALIDATION & SUBMISSION (REFACTORED) ---

  const validateForm = (payload: Partial<ExpensePayload>): string | null => {
    if (!payload.description?.trim()) {
      return 'Please enter an expense description';
    }
    if (payload.amount === undefined || payload.amount === null || payload.amount <= 0) {
      return 'Please enter a valid amount greater than 0';
    }
    if (!payload.category) {
      return 'Please select a category';
    }
    if (!payload.date) {
      return 'Please enter a valid date';
    }
    if (expenseType === 'group' && !selectedGroup) {
      return 'Please select a group';
    }
    return null;
  }
  
  const calculateEqualSplits = (totalAmount: number): SplitPayload[] | string => {
    if (selectedMembers.length === 0) {
      return 'Please select at least one person to split with';
    }
    const numMembers = selectedMembers.length;
    const equalAmount = totalAmount / numMembers;
    let totalAllocated = 0;
    const roundedAmount = Number.parseFloat(equalAmount.toFixed(2));
    const splits: SplitPayload[] = selectedMembers.map(memberId => {
      totalAllocated += roundedAmount;
      return {
        user_id: memberId,
        amount_owed: roundedAmount,
        status: 'pending'
      };
    });
    let remainder = totalAmount - totalAllocated;
    for (let i = 0; i < splits.length && Math.abs(remainder) > 0.001; i++) {
      splits[i].amount_owed = Number.parseFloat((splits[i].amount_owed + 0.01).toFixed(2));
      remainder -= 0.01;
    }
    return splits;
  }

  const calculateUnequalSplits = (totalAmount: number): SplitPayload[] | string => {
    if (Object.keys(amountErrors).some(key => amountErrors[key])) {
      return 'Please fix the errors in the amounts';
    }
    const memberAmounts: SplitPayload[] = [];
    let calculatedTotal = 0;
    for (const member of currentMembers) {
      const memberAmountStr = unequalAmounts[member.id] || '0';
      const memberAmount = Number.parseFloat(memberAmountStr);
      if (Number.isNaN(memberAmount) || memberAmount < 0) {
        return `Invalid amount for ${member.name}`;
      }
      if(memberAmount > 0) {
        memberAmounts.push({
          user_id: member.id,
          amount_owed: memberAmount,
          status: 'pending'
        });
        calculatedTotal += memberAmount;
      }
    }
    if (memberAmounts.length === 0) {
      return 'Please enter at least one amount for unequal split';
    }
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return `Unequal amounts ($${calculatedTotal.toFixed(2)}) must add up to the total expense ($${totalAmount.toFixed(2)})`;
    }
    return memberAmounts;
  }

  const preparePayloads = (): {
    expensePayload: ExpensePayload;
    splitsToInsert: SplitPayload[];
    error: string | null;
  } => {
    const totalAmount = Number.parseFloat(amount);
    
    const expensePayload: ExpensePayload = {
      description: description.trim(),
      amount: totalAmount,
      date: new Date(expenseDate).toISOString(),
      category: category,
      payer_id: payerId,
      group_id: null,
      // notes field removed
    };

    const baseError = validateForm(expensePayload);
    if (baseError) {
      return { error: baseError, expensePayload, splitsToInsert: [] };
    }

    let splitsToInsert: SplitPayload[] = [];
    if (expenseType === 'group') {
      if (!selectedGroup) {
        return { error: 'Please select a group', expensePayload, splitsToInsert: [] };
      }
      expensePayload.group_id = selectedGroup;
      let splitResult: SplitPayload[] | string;
      if (splitMethod === 'equal') {
        splitResult = calculateEqualSplits(totalAmount);
      } else {
        splitResult = calculateUnequalSplits(totalAmount);
      }
      if (typeof splitResult === 'string') {
        return { error: splitResult, expensePayload, splitsToInsert: [] };
      }
      splitsToInsert = splitResult;
    }
    return { error: null, expensePayload, splitsToInsert };
  }

  const executeTransaction = async (expensePayload: ExpensePayload, splitsToInsert: SplitPayload[]) => {
    try {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert(expensePayload)
        .select('id')
        .single();
      if (expenseError) throw expenseError;
      if (!expenseData || !expenseData.id) throw new Error('Failed to get new expense ID');
      const newExpenseId = expenseData.id;

      if (splitsToInsert.length > 0) {
        const splitsWithExpenseId = splitsToInsert.map(split => ({
          ...split,
          expense_id: newExpenseId
        }));
        const { error: splitError } = await supabase
          .from('expense_split')
          .insert(splitsWithExpenseId);
        if (splitError) throw splitError;
      }
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error adding expense:', error);
      return { success: false, error: error.message || 'Failed to save expense to database' };
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to add an expense.');
      return;
    }
    setLoading(true);

    const { error, expensePayload, splitsToInsert } = preparePayloads();
    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }

    // AI Learning Call (Non-critical)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const learningFormData = new FormData();
        learningFormData.append('description', expensePayload.description);
        learningFormData.append('amount', String(expensePayload.amount));
        learningFormData.append('category', expensePayload.category);
        fetch('http://localhost:8000/api/categorize', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: learningFormData,
        }).catch(err => console.warn("AI Learning call failed (non-critical):", err));
      }
    } catch (aiError) {
      console.warn("AI Learning call failed (non-critical):", aiError)
    }

    // Execute Transaction
    const { success, error: dbError } = await executeTransaction(expensePayload, splitsToInsert);
    setLoading(false);
    
    if (success) {
      toast.success('Expense added successfully!');
      if (expenseType === 'group' && selectedGroup) {
        navigate('/groups/' + selectedGroup);
      } else {
        navigate('/dashboard');
      }
    } else {
      toast.error(`Failed to add expense: ${dbError}`);
    }
  };

  // --- RENDER ---

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
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Dinner at Italian Restaurant"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number.parseFloat(val) >= 0) {
                      setAmount(val);
                    }
                  }}
                  className="pl-10"
                  required
                  min="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full"
                max={todaysDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(availableCategories.concat(category ? [category] : []))]
                    .filter(Boolean)
                    .sort()
                    .map((categoryName) => (
                      <SelectItem key={categoryName} value={categoryName}>
                        {categoryName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAICategorize}
                disabled={isCategorizing || !description.trim()}
                className="w-full flex items-center gap-2"
              >
                {isCategorizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {isCategorizing ? 'Asking AI...' : 'Auto-Categorize with AI'}
              </Button>
            </div>

            {/* Notes field has been removed */}

          </CardContent>
        </Card>

        {/* Group Selection */}
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
                <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={loadingGroups}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingGroups ? "Loading groups..." : "Select a group"} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGroup && (
                <div className="space-y-2">
                  <Label>Paid by</Label>
                  <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                    <RadioGroupItem value={user?.id || ''} id={`payer-${user?.id}`} checked={true} />
                    <Label htmlFor={`payer-${user?.id}`} className="flex items-center gap-2 cursor-pointer">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={currentUserInGroup?.avatar_url || ''} alt={currentUserInGroup?.name} />
                        <AvatarFallback className="text-xs">{currentUserInGroup?.name?.charAt(0) || 'Y'}</AvatarFallback>
                      </Avatar>
                      {currentUserInGroup?.name || 'You'} (You)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You are adding this expense as the payer.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Split Configuration */}
        {expenseType === 'group' && selectedGroup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Split Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingMembers ? (
                <p className="text-muted-foreground text-center">Loading members...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label>Split Method</Label>
                    <RadioGroup value={splitMethod} onValueChange={(value) => setSplitMethod(value as 'equal' | 'unequal')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="equal" id="equal" />
                        <Label htmlFor="equal" className="cursor-pointer">Equal Division</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unequal" id="unequal" />
                        <Label htmlFor="unequal" className="cursor-pointer">Unequal Division</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {splitMethod === 'equal' && (
                    <div className="space-y-3">
                      <Label>Select members to split with</Label>
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
                                    <AvatarImage src={member.avatar_url || ''} alt={member.name} />
                                    <AvatarFallback className="text-xs">{member.name?.charAt(0) || '?'}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{member.name} {member.id === user?.id ? '(You)' : ''}</div>
                                    <div className="text-xs text-muted-foreground">{member.email}</div>
                                  </div>
                                </Label>
                              </div>
                              {isSelected && Number.parseFloat(amount) > 0 && (
                                <Badge variant="outline" className="ml-2">${splitAmount}</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {splitMethod === 'unequal' && (
                    <div className="space-y-3">
                      <Label>Enter amount for each member</Label>
                      <div className="space-y-3">
                        {currentMembers.map((member) => {
                          const memberAmount = unequalAmounts[member.id] || '';
                          const hasError = amountErrors[member.id];
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatar_url || ''} alt={member.name} />
                                  <AvatarFallback className="text-xs">{member.name?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="font-medium">{member.name} {member.id === user?.id ? '(You)' : ''}</div>
                                  <div className="text-xs text-muted-foreground">{member.email}</div>
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
                                {hasError && (<span className="text-xs text-red-500">{hasError}</span>)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {Number.parseFloat(amount) > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Expense:</span>
                        <span className="font-bold">${Number.parseFloat(amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Split:</span>
                        <span className={`font-bold ${Math.abs(totalSplit - Number.parseFloat(amount)) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                          ${totalSplit.toFixed(2)}
                        </span>
                      </div>
                      {Math.abs(totalSplit - Number.parseFloat(amount)) > 0.01 && (
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Remaining:</span>
                          <span>${(Number.parseFloat(amount) - totalSplit).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Functional Receipt Upload */}
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
                {receiptFile
                  ? `Selected: ${receiptFile.name}`
                  : 'Drag and drop your receipt here, or click to browse'}
              </p>
              <div className="relative">
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/*,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { handleReceiptUpload(file); }
                  }}
                  disabled={isParsingReceipt}
                />
                <Button
                  type="button" 
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('receipt-upload')?.click()}
                  disabled={isParsingReceipt}
                >
                  {isParsingReceipt ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : receiptFile ? (
                    'Change File'
                  ) : (
                    'Choose File'
                  )}
                </Button>
                {receiptFile && !isParsingReceipt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setReceiptFile(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: JPG, PNG, PDF
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" asChild>
            <Link to="/dashboard">Cancel</Link>
          </Button>
          <Button 
            type="submit" 
            className="flex-1" 
            disabled={loading || isCategorizing || isParsingReceipt}
          >
            {loading ? 'Adding Expense...' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}

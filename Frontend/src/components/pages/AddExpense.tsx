import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
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
  User,
  Zap,
  Upload
} from 'lucide-react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';

// Fetch Group Memeber from Supabase
interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}

// Mock category list (frontend-only)
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

type RecurringExpense = {
  id: string;
  title: string;
  amount: number;
  category: string | null;
};

export function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const expenseData = location.state?.expenseData;
  const isEdit = location.state?.isEdit || false;

  const { user } = useAuth(); //custom hook
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Expense type
  const [expenseType, setExpenseType] = useState<'personal' | 'group'>(
    searchParams.get('group') ? 'group' : 'personal'
  );

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(
    searchParams.get('group') || ''
  );
  const [paidBy, setPaidBy] = useState(user?.id || '');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([user?.id || '']);
  const [unequalAmounts, setUnequalAmounts] = useState<{ [key: string]: string }>({});
  const [amountErrors, setAmountErrors] = useState<{ [key: string]: string }>({});
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  const [selectedRecurringExpense, setSelectedRecurringExpense] = useState<string>('');

  // Data state
  const [groups, setGroups] = useState<any[]>([]);
  const [currentMembers, setCurrentMembers] = useState<GroupMember[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [expenseDate, setExpenseDate] = useState('');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const localOffset = today.getTimezoneOffset();
    const istTime = new Date(today.getTime() + (istOffset + localOffset) * 60000);
    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const day = String(istTime.getDate()).padStart(2, '0');
    setExpenseDate(`${year}-${month}-${day}`);
  }, []);

  useEffect(() => {
    if (isEdit && expenseData) {
      setIsEditMode(true);
      setEditingExpenseId(expenseData.id?.toString() || null);
      setTitle(expenseData.description || '');
      setAmount(expenseData.amount?.toString() || '');

      if (expenseData.category) {
        if (!availableCategories.includes(expenseData.category)) {
          setAvailableCategories(prev => [...prev, expenseData.category]);
        }
        setTimeout(() => setCategory(expenseData.category), 100);
      }

      setExpenseType(expenseData.type || 'personal');

      if (expenseData.date) {
        try {
          const date = new Date(expenseData.date);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            setExpenseDate(`${year}-${month}-${day}`);
          }
        } catch (err) {
          console.error('Error parsing date:', err);
        }
      }
    }
  }, [isEdit, expenseData, availableCategories]);

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_user_groups');
      if (error) {
        console.error('Error fetching groups:', error);
        toast.error('Could not load your groups.');
      } else {
        setGroups(data || []);
        const g = searchParams.get('group');
        if (g && Array.isArray(data) && data.find((gg: any) => gg.id === g)) {
          setSelectedGroup(g);
        }
      }
    };
    fetchGroups();
  }, [user, searchParams]);

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!selectedGroup || !user) {
        setCurrentMembers([]);
        return;
      }
      try {
        setMembersLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No active session');

        const response = await fetch(`http://localhost:8000/api/groups/${selectedGroup}/members`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch group members');

        const res = await response.json();
        const members = res.members || [];

        const formattedMembers: GroupMember[] = members.map((member: any) => ({
          id: member.user_id || member.id,
          name: member.name || member.email || 'No Name',
          avatar: member.avatar_url || '',
          email: member.email || '',
        }));

        setCurrentMembers(formattedMembers);
        setSelectedMembers(formattedMembers.map(m => m.id));
        setPaidBy(user.id);
        setUnequalAmounts({});
        setAmountErrors({});
      } catch (error) {
        console.error('Error fetching group members:', error);
        toast.error('Could not load group members. Please try again.');
        setCurrentMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchGroupMembers();
  }, [selectedGroup, user]);

  // Fetch recurring expenses
  useEffect(() => {
    const fetchRecurringExpenses = async () => {
      if (!user || expenseType !== 'personal') return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.warn('No session token, skipping recurring expenses fetch.');
          return;
        }

        const response = await fetch(`http://localhost:8000/api/recurring-expenses`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Failed to fetch recurring expenses from /api/recurring-expenses: ${errorText}`);
          return;
        }

        const data = await response.json();

        const rec = (data?.recurring || []).map((r: any) => ({
          id: String(r.id),
          title: String(r.title),
          amount: Number(r.amount || 0),
          category: r.category ?? null,
        })) as RecurringExpense[];

        setRecurringExpenses(rec);
      } catch (err) {
        console.error('Error fetching recurring expenses:', err);
      }
    };

    fetchRecurringExpenses();
  }, [user, expenseType]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_all_user_categories');
      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Could not load your categories.');
      } else {
        const uniqueCategories = [...new Set((data as string[]) || [])];
        setAvailableCategories(uniqueCategories);

        if (isEdit && expenseData?.category) {
          if (!uniqueCategories.includes(expenseData.category)) {
            setAvailableCategories(prev => [...prev, expenseData.category]);
          }
          setCategory(expenseData.category);
        }
      }
    };
    fetchCategories();
  }, [user, isEdit, expenseData?.category]);

  const handleRecurringExpenseChange = (value: string) => {
    setSelectedRecurringExpense(value);

    if (value === 'none') {
      return;
    }

    const recurring = recurringExpenses.find(exp => exp.id === value);
    if (recurring) {
      setTitle(recurring.title);
      setAmount(recurring.amount.toString());
      if (recurring.category) {
        setCategory(recurring.category);
      }
    }
  };

  const handleAICategorize = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title or description first.');
      return;
    }
    setIsCategorizing(true);
    const toastId = toast.loading('Asking the AI for a category...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const formData = new FormData();
      formData.append('description', title);
      formData.append('category', ''); // Trigger prediction mode

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

    const maxMB = 8;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File too large. Please upload < ${maxMB}MB.`);
      return;
    }

    const allowed = ['image/jpeg','image/png','image/jpg','application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Unsupported file type. Use JPG/PNG/PDF.');
      return;
    }

    setReceiptFile(file);
    setIsParsingReceipt(true);
    const toastId = toast.loading('Parsing receipt...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to upload receipts', { id: toastId });
        setIsParsingReceipt(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', file); 
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch('http://localhost:8000/api/parse-bill', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errText = `Request failed (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.error) errText = errJson.error;
          else if (errJson?.message) errText = errJson.message;
        } catch (_) {
          errText = await response.text().catch(() => errText);
        }
        throw new Error(errText);
      }

      let json;
      try {
        json = await response.json();
      } catch (err) {
        throw new Error('Invalid JSON from server');
      }

      const parsed = json?.parsed ?? json;
      if (!parsed) throw new Error('No parsed result returned');

      if (parsed.vendor_name) setTitle(parsed.vendor_name);
      if (parsed.total != null) setAmount(String(parsed.total));
      if (parsed.issue_date) {
        const date = new Date(parsed.issue_date);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toISOString().split('T')[0];
          setDescription(`Date: ${formattedDate}\n${parsed.notes || ''}`.trim());
        }
      } else if (parsed.notes) {
        setDescription(parsed.notes);
      }

      if (parsed.category_guess) {
        const guess = parsed.category_guess;
        const normalizedGuess = typeof guess === 'string' ? guess.trim() : String(guess);
        const capitalizedGuess = normalizedGuess.charAt(0).toUpperCase() + normalizedGuess.slice(1);
        if (!availableCategories.includes(capitalizedGuess)) {
          setAvailableCategories(prev => [...prev, capitalizedGuess]);
        }
        setCategory(capitalizedGuess);
      }

      toast.success('Receipt processed successfully!', { id: toastId });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.error('Receipt parsing timed out. Try again.', { id: toastId });
      } else {
        console.error('Error processing receipt:', err);
        toast.error(err.message || 'Failed to process receipt. Please enter details manually.', { id: toastId });
      }
    } finally {
      setIsParsingReceipt(false);
    }
  };


  // Split logic helpers
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
    setAmountErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[memberId];
      return newErrors;
    });

    if (value === '') {
      setUnequalAmounts(prev => ({ ...prev, [memberId]: '' }));
      return;
    }

    const numberRegex = /^\d*\.?\d*$/;
    if (!numberRegex.test(value)) {
      setAmountErrors(prev => ({ ...prev, [memberId]: 'Invalid number' }));
      return;
    }

    setUnequalAmounts(prev => ({ ...prev, [memberId]: value }));
  };

  const calculateSplitAmounts = () => {
    const totalAmount = Number.parseFloat(amount) || 0;
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
      return unequalAmounts;
    }
    return {};
  };

  const splitAmounts = calculateSplitAmounts();
  const totalSplit = Object.values(splitAmounts).reduce((sum, a) => sum + Number.parseFloat(a || '0'), 0);

  // Add state for amount error feedback
  const [amountError, setAmountError] = useState<string>('');

  // Handle amount input change and validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    if (val && parseFloat(val) < 0) {
      setAmountError('Invalid amount');
    } else {
      setAmountError('');
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!title.trim()) {
      toast.error('Please enter an expense title');
      setLoading(false);
      return;
    }
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast.error('Please enter a valid amount');
      setAmountError('Invalid amount');
      setLoading(false);
      return;
    }
    setAmountError('');
    if (!category) {
      toast.error('Please select a category');
      setLoading(false);
      return;
    }
    if (expenseDate) {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(utcTime + istOffset);
  
      const year = istDate.getFullYear();
      const month = String(istDate.getMonth() + 1).padStart(2, '0');
      const day = String(istDate.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;
      if (expenseDate > todayString) {
        toast.error('Expense date cannot be in the future.');
        setLoading(false);
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !user) {
      toast.error('Please log in');
      setLoading(false);
      return;
    }

    try {
      const learningFormData = new FormData();
      learningFormData.append('description', title);
      learningFormData.append('amount', String(finalAmount));
      learningFormData.append('category', category);
      fetch('http://localhost:8000/api/categorize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: learningFormData,
      }).catch(err => console.error("AI Learning call failed:", err));

      if (isEditMode && editingExpenseId) {
        // UPDATE MODE
        if (expenseType === 'personal') {
          const { error: updateError } = await supabase
            .from('expenses')
            .update({
              description: title,
              amount: finalAmount,
              category: category,
              date: new Date(expenseDate).toISOString()
            })
            .eq('id', editingExpenseId);

          if (updateError) throw updateError;

          toast.success('✅ Expense updated successfully!');
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          toast.info('Group expense update - implement based on your needs');
        }
      } else {
        // CREATE MODE
        if (expenseType === 'personal') {
          const { error: expenseError } = await supabase
            .from('expenses')
            .insert({
              description: title,
              amount: finalAmount,
              category: category,
              payer_id: user.id,
              group_id: null,
              date: new Date(expenseDate).toISOString()
            });

          if (expenseError) throw expenseError;
          toast.success('Personal expense added!');
          navigate('/dashboard');
        } else {
          // Group expense creation
          if (!selectedGroup) {
            toast.error('Please select a group');
            setLoading(false);
            return;
          }
          if (selectedMembers.length === 0) {
            toast.error('Please select at least one person');
            setLoading(false);
            return;
          }

          const finalSplits: { user_id: string; amount_owed: number }[] = [];

          if (splitMethod === 'equal') {
            const equalAmount = finalAmount / selectedMembers.length;
            selectedMembers.forEach(memberId => {
              finalSplits.push({ user_id: memberId, amount_owed: equalAmount });
            });
          } else {
            if (Math.abs(totalSplit - finalAmount) > 0.01) {
              toast.error(`Amounts must add up to $${finalAmount.toFixed(2)}`);
              setLoading(false);
              return;
            }
            currentMembers.forEach(member => {
              finalSplits.push({
                user_id: member.id,
                amount_owed: parseFloat(unequalAmounts[member.id] || '0')
              });
            });
          }

          const { error: rpcError } = await supabase.rpc('create_group_expense_and_splits', {
            expense_data: {
              description: title,
              amount: finalAmount,
              category: category,
              payer_id: paidBy,
              group_id: selectedGroup,
            },
            splits_data: finalSplits
          });

          if (rpcError) throw rpcError;
          toast.success('Group expense added!');
          navigate('/groups/' + selectedGroup);
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const previewUrlRef = useRef<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [removing, setRemoving] = useState(false);

  const FALLBACK_PREVIEW = '/assets/Receipt_Upload_Fallback.png';

  useEffect(() => {
    if (receiptFile) {
      if (previewUrlRef.current && previewUrlRef.current !== FALLBACK_PREVIEW) {
        try { URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
      }
      if (receiptFile.type.startsWith('image/')) {
        previewUrlRef.current = URL.createObjectURL(receiptFile);
      } else {
        previewUrlRef.current = FALLBACK_PREVIEW;
      }
    } else {
      previewUrlRef.current = FALLBACK_PREVIEW;
    }

    return () => {
      if (previewUrlRef.current && previewUrlRef.current !== FALLBACK_PREVIEW) {
        try { URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
        previewUrlRef.current = null;
      }
    };
  }, [receiptFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleReceiptUpload(file);
  };

  const handleRemoveWithAnimation = () => {
    if (isParsingReceipt) return;
    setRemoving(true);
    setTimeout(() => {
      const inputEl = document.getElementById('receipt-upload') as HTMLInputElement | null;
      if (inputEl) inputEl.value = '';
      if (previewUrlRef.current && previewUrlRef.current !== FALLBACK_PREVIEW) {
        try { URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
      }
      previewUrlRef.current = FALLBACK_PREVIEW;
      setRemoving(false);
      setReceiptFile(null);
    }, 300); 
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
          <h1 className="text-2xl md:text-3xl font-bold">
            {isEditMode ? 'Edit Expense' : 'Add Expense'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update your expense details below'
              : expenseType === 'personal'
                ? 'Track your personal expense'
                : 'Split a new expense with your group'}
          </p>
        </div>
      </div>

      {/* Edit Mode Indicator */}
      {isEditMode && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
              <span className="text-2xl">✏️</span>
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">Edit Mode Active</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You are editing: <span className="font-bold">{title || 'Unnamed expense'}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs
        value={expenseType}
        onValueChange={(value) => {
          if (!isEditMode) {
            setExpenseType(value as 'personal' | 'group');
          }
        }}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="flex items-center gap-2 dark:data-[state=active]:text-green-500">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="group" className="flex items-center gap-2 dark:data-[state=active]:text-green-500">
            <Users className="h-4 w-4" />
            Group
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Expense Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recurring dropdown — only for personal expenses */}
            {expenseType === 'personal' && (
              <div className="space-y-2">
                <Label htmlFor="recurring">Quick Select (Recurring Expenses)</Label>
                <Select value={selectedRecurringExpense} onValueChange={handleRecurringExpenseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a frequently used expense" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- None (Enter manually) --</SelectItem>
                    {recurringExpenses.map((expense) => {
                      const categoryInfo = categories.find(c => c.value === expense.category);
                      return (
                        <SelectItem key={expense.id} value={expense.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="flex items-center gap-2">
                              {categoryInfo?.icon} {expense.title}
                            </span>
                            <span className="text-muted-foreground">${expense.amount}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a recurring expense to auto-fill the details.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Dinner at Italian Restaurant"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="pl-10"
                  required
                  min="0"
                />
              </div>
              {amountError && (
                <div className="text-xs text-red-600 mt-1">{amountError}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                max={
                  (() => {
                    const today = new Date();
                    const istOffset = 5.5 * 60;
                    const localOffset = today.getTimezoneOffset();
                    const istTime = new Date(today.getTime() + (istOffset + localOffset) * 60000);
                    const year = istTime.getFullYear();
                    const month = String(istTime.getMonth() + 1).padStart(2, '0');
                    const day = String(istTime.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category-trigger">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(availableCategories.concat(category ? [category] : []))].map((categoryName) => (
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
                disabled={isCategorizing || !title.trim()}
                className="w-full flex items-center gap-2 mt-2"
              >
                <Zap className="h-4 w-4" />
                {isCategorizing ? 'Asking AI...' : 'Auto-Categorize with AI'}
              </Button>
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

        {/* Group Selection - Only show for group expenses */}
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
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {membersLoading && (
                <div className="flex items-center p-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading members...
                </div>
              )}

              {!membersLoading && selectedGroup && (
                <div className="space-y-2">
                  <Label>Paid by</Label>
                  <RadioGroup value={paidBy} onValueChange={setPaidBy}>
                    {currentMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={member.id} id={`payer-${member.id}`} />
                        <Label htmlFor={`payer-${member.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar || undefined} alt={member.name} />
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

        {/* Split Configuration */}
        {expenseType === 'group' && selectedGroup && !membersLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Split Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              {splitMethod === 'equal' && (
                <div className="space-y-3">
                  <div>
                    <Label>Select members to split equally among</Label>
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
                                <AvatarImage src={member.avatar || undefined} alt={member.name} />
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

              {splitMethod === 'unequal' && (
                <div className="space-y-3">
                  <div>
                    <Label>Enter amount for each member</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Amounts must add up to the total expense.
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
                              <AvatarImage src={member.avatar || undefined} alt={member.name} />
                              <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{member.name}</div>
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

              {amount && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Expense Amount:</span>
                    <span className="font-bold">${Number.parseFloat(amount).toFixed(2)}</span>
                  </div>

                  {splitMethod === 'equal' && selectedMembers.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Amount per Member:</span>
                      <span className="font-bold text-green-600">
                        ${(Number.parseFloat(amount) / selectedMembers.length).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {splitMethod === 'unequal' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Amount Split:</span>
                        <span className={`font-bold ${Math.abs(totalSplit - Number.parseFloat(amount)) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                          ${totalSplit.toFixed(2)}
                        </span>
                      </div>
                      {Math.abs(totalSplit - parseFloat(amount)) > 0.01 && (
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Remaining to allocate:</span>
                          <span>${Math.abs(Number.parseFloat(amount) - totalSplit).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        { /*Receipt Upload*/}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Receipt (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-200
                ${dragActive ? 'border-purple-400 bg-purple-50/10' : 'border-muted-foreground/25 bg-transparent'}`}
            >
              {/* Preview Image Area */}
              <div className="mb-6 w-full max-w-sm relative">
                {receiptFile ? (
                  (receiptFile.type.startsWith('image/') && previewUrlRef.current) ? (
                    <img
                      src={previewUrlRef.current!}
                      alt="receipt preview"
                      className={`mx-auto rounded-md shadow-sm object-cover w-full h-48 ${removing ? 'opacity-0 scale-95' : 'opacity-100 scale-100' } transition-all duration-300`}
                    />
                  ) : (
                    <div className={`p-8 rounded-md border bg-muted/20 text-sm ${removing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300`}>
                      <div className="font-medium truncate max-w-[200px] mx-auto">{receiptFile.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{(receiptFile.size / 1024).toFixed(0)} KB</div>
                    </div>
                  )
                ) : (
                  <img 
                    src={FALLBACK_PREVIEW} 
                    alt="upload placeholder" 
                    className="mx-auto w-full h-48 object-contain opacity-75" 
                  />
                )}
              </div>

              {receiptFile && (
                 <p className="text-sm text-muted-foreground mb-4 font-medium">
                   Selected: <span className="text-foreground">{receiptFile.name}</span>
                 </p>
              )}

              {/* Input & Buttons */}
              <input
                type="file"
                id="receipt-upload"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReceiptUpload(file);
                }}
                disabled={isParsingReceipt}
              />

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={receiptFile ? "outline" : "default"}
                  onClick={() => (document.getElementById('receipt-upload') as HTMLInputElement | null)?.click()}
                  disabled={isParsingReceipt}
                >
                  {isParsingReceipt ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveWithAnimation();
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
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
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                {isEditMode ? 'Update Expense' : 'Add Expense'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddExpense;

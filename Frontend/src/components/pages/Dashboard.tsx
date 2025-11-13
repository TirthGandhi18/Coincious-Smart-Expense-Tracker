import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../lib/info';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuth } from '../../App';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  DollarSign,
  TrendingUp,
  Plus,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Target,
  ChevronDown,
  Calendar as CalendarIcon
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';

const DEFAULT_COLORS = [
  '#ECAABA',
  '#D38DAB',
  '#8B4D6C',
  '#9B89B0',
  '#675C83',
  '#483B63'
];

const monthlyTrends = [
  { month: 'Jan', personal: 1200, group: 800 },
  { month: 'Feb', personal: 1100, group: 1400 },
  { month: 'Mar', personal: 1300, group: 850 },
  { month: 'Apr', personal: 1250, group: 1950 },
  { month: 'May', personal: 1400, group: 1100 },
  { month: 'Jun', personal: 1180, group: 870 }
];

const recentTransactions = [
  {
    id: '1',
    title: 'Dinner at Italian Restaurant',
    amount: -45.80,
    type: 'group',
    category: 'Food & Dining',
    date: '2 hours ago',
    participants: ['John', 'Sarah', 'Mike'],
    status: 'settled'
  },
  {
    id: '2',
    title: 'Uber to Airport',
    amount: -28.50,
    type: 'personal',
    category: 'Transportation',
    date: '1 day ago',
    status: 'completed'
  },
  {
    id: '3',
    title: 'Coffee with Team',
    amount: -15.60,
    type: 'group',
    category: 'Food & Dining',
    date: '2 days ago',
    participants: ['Alex', 'Lisa'],
    status: 'pending'
  },
  {
    id: '4',
    title: 'Monthly Spotify',
    amount: -9.99,
    type: 'personal',
    category: 'Entertainment',
    date: '3 days ago',
    status: 'completed'
  }
];

const insights = [
  {
    type: 'spending',
    title: 'Spending Alert',
    message: 'You\'ve spent 15% more on dining this month compared to last month.',
    icon: TrendingUp,
    color: 'text-amber-600'
  },
  {
    type: 'savings',
    title: 'Great Progress!',
    message: 'You\'re on track to reach your savings goal this month.',
    icon: Target,
    color: 'text-green-600'
  },
  {
    type: 'recommendation',
    title: 'Smart Tip',
    message: 'Consider setting up automatic splits for recurring group expenses.',
    icon: Brain,
    color: 'text-blue-600'
  }
];

const DUMMY_EXPENSES = [
  { id: 1, date: '2025-11-06', description: 'Grocery Shopping', amount: 125.50, category: 'Food', type: 'personal' },
  { id: 2, date: '2025-11-06', description: 'Gas Station', amount: 45.00, category: 'Transportation', type: 'personal' },
  { id: 3, date: '2025-11-07', description: 'Team Lunch', amount: 280.00, category: 'Food', type: 'group' },
  { id: 4, date: '2025-11-07', description: 'Coffee Shop', amount: 15.75, category: 'Food', type: 'personal' },
  { id: 5, date: '2025-11-08', description: 'Movie Night', amount: 65.00, category: 'Entertainment', type: 'group' },
  { id: 6, date: '2025-11-08', description: 'Uber Ride', amount: 22.50, category: 'Transportation', type: 'personal' },
  { id: 7, date: '2025-11-08', description: 'Amazon Order', amount: 89.99, category: 'Shopping', type: 'personal' },
  { id: 8, date: '2025-11-09', description: 'Dinner Party', amount: 450.00, category: 'Food', type: 'group' },
  { id: 9, date: '2025-11-09', description: 'Gym Membership', amount: 49.99, category: 'Health', type: 'personal' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryPeriod, setCategoryPeriod] = useState<'current' | 'previous'>('current');
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filteredExpenses, setFilteredExpenses] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dailyExpenses, setDailyExpenses] = useState<any[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'start' | 'end' | null;
    originalRange: { from: Date | undefined; to: Date | undefined };
  }>({
    isDragging: false,
    dragType: null,
    originalRange: { from: undefined, to: undefined }
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7f88878c/analytics/spending`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  useEffect(() => {
    const fetchMonthlyTotals = async () => {
      if (!user) return;
      setCategoryLoading(true);
      setCategoryError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setCategoryError('No session token');
          return;
        }

        const reqBody = { period: categoryPeriod };

        const res = await fetch(`http://localhost:8000/api/expense_monthly_donut`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => String(res.status));
          setCategoryError(`Failed to fetch monthly totals: ${text}`);
          return;
        }

        const data = await res.json();

        const mapped = (data || []).map((d: any, i: number) => ({
          name: d.category,
          value: Number(d.total) || 0,
          color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }));

        setCategoryData(mapped);
      } catch (err: any) {
        console.error('Error fetching monthly totals', err);
        setCategoryError(String(err?.message || err));
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchMonthlyTotals();
  }, [user, categoryPeriod]);

  useEffect(() => {
    const fetchExpensesByDateRange = async () => {
      if (!user || !dateRange.from) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const params = new URLSearchParams({
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd')
        });

        const response = await fetch(`http://localhost:8000/api/expenses_by_date_range?${params}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const total = data.reduce((sum: number, exp: any) => sum + exp.amount, 0);
          setFilteredExpenses(total);
        }
      } catch (error) {
        console.error('Error fetching expenses by date range:', error);
      }
    };

    fetchExpensesByDateRange();
  }, [user, dateRange]);

  useEffect(() => {
    const fetchDailyExpenses = async () => {
      if (!user || !dateRange.from) {
        setDailyExpenses([]);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const params = new URLSearchParams({
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd')
        });

        const response = await fetch(`http://localhost:8000/api/expenses_by_date_range?${params}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setDailyExpenses(data);
          const total = data.reduce((sum: number, exp: any) => sum + exp.amount, 0);
          setFilteredExpenses(total);
        }
      } catch (error) {
        console.error('Error fetching daily expenses:', error);
      }
    };

    fetchDailyExpenses();
  }, [user, dateRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDatePicker && !target.closest('.calendar-wrapper')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const totalSpending = analyticsData?.total_spending || 0;
  const savingsGoal = 1000;
  const monthlySavings = Math.max(0, savingsGoal - totalSpending);
  const savingsProgress = (monthlySavings / savingsGoal) * 100;

  const displayAmount = dateRange.from ? filteredExpenses : totalSpending;

  // ✅ ADD THIS HANDLER RIGHT AFTER navigate declaration (around line 80):
  const handleEditExpense = (expense: any) => {
    console.log('🔧 EDIT CLICKED:', expense);
    navigate('/add-expense', {
      state: {
        isEdit: true,
        expenseData: expense
      }
    });
  };

  // Add handler for deleting expense
  const handleDeleteExpense = (expenseId: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    // Remove from dummy data (in real app, call API)
    const updatedExpenses = dailyExpenses.filter(exp => exp.id !== expenseId);
    setDailyExpenses(updatedExpenses);
    
    // Recalculate total
    const total = updatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    setFilteredExpenses(total);
    
    // Show success message
    alert('Expense deleted successfully!');
  };

  const handleDateSelect = (date: Date) => {
    // Don't allow selection during drag
    if (dragState.isDragging) return;

    if (!dateRange.from || (dateRange.from && dateRange.to)) {
      // First click or reset
      setDateRange({ from: date, to: undefined });
    } else {
      // Second click
      if (date >= dateRange.from) {
        setDateRange({ from: dateRange.from, to: date });
      } else {
        setDateRange({ from: date, to: dateRange.from });
      }
    }
  };

  const handleDragStart = (date: Date, dragType: 'start' | 'end') => {
    setDragState({
      isDragging: true,
      dragType,
      originalRange: { ...dateRange }
    });
  };

  const handleDragOver = (date: Date) => {
    if (!dragState.isDragging || !dragState.dragType) return;

    if (dragState.dragType === 'start') {
      // Dragging start date
      if (dateRange.to && date <= dateRange.to) {
        setDateRange({ from: date, to: dateRange.to });
      } else if (!dateRange.to) {
        setDateRange({ from: date, to: undefined });
      }
    } else if (dragState.dragType === 'end') {
      // Dragging end date
      if (dateRange.from && date >= dateRange.from) {
        setDateRange({ from: dateRange.from, to: date });
      }
    }
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      dragType: null,
      originalRange: { from: undefined, to: undefined }
    });
  };

  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.getTime() === today.getTime();
      const isFuture = currentDate > today;
      
      // Get expenses for this date
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayExpenses = DUMMY_EXPENSES.filter(exp => exp.date === dateStr);
      const hasExpenses = dayExpenses.length > 0;
      const totalAmount = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Enhanced selection logic
      const isStartDate = dateRange.from && currentDate.getTime() === dateRange.from.getTime();
      const isEndDate = dateRange.to && currentDate.getTime() === dateRange.to.getTime();
      const isSelected = isStartDate || isEndDate;
      const isInRange = dateRange.from && dateRange.to &&
                       currentDate > dateRange.from && currentDate < dateRange.to;
      
      // Better styling with drag support
      let buttonClasses = `
        aspect-square p-2 text-sm font-medium rounded-xl transition-all duration-200 relative border-2 select-none
        ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600 opacity-60' : ''}
        ${isFuture ? 'text-gray-300 cursor-not-allowed opacity-40 border-transparent' : 'cursor-pointer border-transparent'}
        ${isToday && !isSelected ? 'bg-blue-100 text-blue-800 font-bold border-blue-400 ring-2 ring-blue-200' : ''}
      `;

      // Add expense indicator styling
      if (hasExpenses && !isSelected && !isInRange) {
        buttonClasses += ' bg-purple-50 dark:bg-purple-900/20 border-purple-200';
      }

      if (isStartDate) {
        buttonClasses += ` bg-purple-600 text-white shadow-lg scale-110 border-purple-700 font-bold ring-2 ring-purple-300`;
      } else if (isEndDate) {
        buttonClasses += ` bg-pink-600 text-white shadow-lg scale-110 border-pink-700 font-bold ring-2 ring-pink-300`;
      } else if (isInRange) {
        buttonClasses += ' bg-purple-200 text-purple-900 border-purple-300 font-semibold';
      } else if (!isFuture && isCurrentMonth) {
        buttonClasses += ' hover:bg-purple-100 hover:text-purple-700 hover:scale-105';
      }

      days.push(
        <button
          key={i}
          onClick={() => !isFuture && handleDateSelect(currentDate)}
          onMouseDown={() => {
            if (isFuture) return;
            if (isStartDate || isEndDate) {
              setDragState({
                isDragging: true,
                dragType: isStartDate ? 'start' : 'end',
                originalRange: { ...dateRange }
              });
            }
          }}
          onMouseEnter={() => {
            if (dragState.isDragging) {
              if (dragState.dragType === 'start' && dateRange.to && currentDate <= dateRange.to) {
                setDateRange({ from: currentDate, to: dateRange.to });
              } else if (dragState.dragType === 'end' && dateRange.from && currentDate >= dateRange.from) {
                setDateRange({ from: dateRange.from, to: currentDate });
              }
            }
          }}
          onMouseUp={() => {
            if (dragState.isDragging) {
              setDragState({
                isDragging: false,
                dragType: null,
                originalRange: { from: undefined, to: undefined }
              });
            }
          }}
          disabled={isFuture}
          className={buttonClasses}
          draggable={false}
        >
          <div className="flex flex-col items-center justify-center h-full relative">
            <span className="text-sm font-semibold mb-1">{currentDate.getDate()}</span>
            
            {/* Show expense indicators */}
            {hasExpenses && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex gap-0.5">
                  {dayExpenses.slice(0, 3).map((exp, idx) => {
                    const emoji = exp.category === 'Food' ? '🍔' : 
                                 exp.category === 'Transportation' ? '🚗' :
                                 exp.category === 'Entertainment' ? '🎉' :
                                 exp.category === 'Shopping' ? '🛍️' :
                                 exp.category === 'Health' ? '⚕️' : '💳';
                    return <span key={idx} className="text-xs">{emoji}</span>;
                  })}
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  ${totalAmount.toFixed(0)}
                </span>
              </div>
            )}
            
            {/* Drag handles */}
            {(isStartDate || isEndDate) && (
              <div className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="text-white text-xs font-bold">⟲</div>
              </div>
            )}
            
            {isToday && !isSelected && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full shadow-sm"></div>
            )}
          </div>
        </button>
      );
    }
    return days;
  };

  // Add mouse event listener for drag end
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isDragging) {
        handleDragEnd();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState.isDragging]);

  // Replace your expense fetching logic with this:
  useEffect(() => {
    const loadExpenses = () => {
      setLoading(true);
      
      try {
        // Filter dummy expenses by date range
        const filtered = DUMMY_EXPENSES.filter(expense => {
          const expenseDate = new Date(expense.date);
          expenseDate.setHours(0, 0, 0, 0);
          
          const fromDate = dateRange.from ? new Date(dateRange.from) : null;
          if (fromDate) fromDate.setHours(0, 0, 0, 0);
          
          const toDate = dateRange.to ? new Date(dateRange.to) : fromDate; // If no end date, use start date
          if (toDate) toDate.setHours(0, 0, 0, 0);
          
          if (fromDate && toDate) {
            // Check if expense date is within range (inclusive)
            return expenseDate >= fromDate && expenseDate <= toDate;
          }
          return false;
        });
        
        setDailyExpenses(filtered);
        
        // Calculate total
        const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);
        setFilteredExpenses(total);
      } catch (error) {
        console.error('Error loading expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExpenses();
  }, [dateRange]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
        </div>
        <Button asChild>
          <Link to="/add-expense">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20" />
          
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            
            <div className="relative calendar-wrapper">
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:scale-110 transition-all cursor-pointer bg-white border border-purple-200 shadow-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDatePicker(!showDatePicker);
                }}
              >
                <CalendarIcon className="h-4 w-4 text-purple-600" />
              </button>
              
              {showDatePicker && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-300"
                    onClick={() => setShowDatePicker(false)}
                  />
                  
                  {/* Enhanced Calendar Modal - LARGER SIZE */}
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
                      {/* Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Select Date Range</h3>
                          
                          {/* Enhanced date display */}
                          <div className="mt-2 space-y-1">
                            {!dateRange.from ? (
                              <p className="text-sm text-gray-600 dark:text-gray-400">Choose your start date</p>
                            ) : !dateRange.to ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                                  <span className="text-sm font-medium text-purple-700">From: {format(dateRange.from, "dd MMM yyyy")}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Now choose your end date</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                                  <span className="text-sm font-medium text-purple-700">From: {format(dateRange.from, "dd MMM yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-pink-600 rounded-full"></div>
                                  <span className="text-sm font-medium text-pink-700">To: {format(dateRange.to, "dd MMM yyyy")}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6 p-6">
                        {/* Calendar Section - WIDER */}
                        <div className="md:col-span-2">
                          {/* Month Navigation */}
                          <div className="flex items-center justify-between mb-6">
                            <button
                              onClick={() => {
                                const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
                                setCurrentMonth(newDate);
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            
                            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {format(currentMonth, "MMMM yyyy")}
                            </h4>
                            
                            <button
                              onClick={() => {
                                const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
                                setCurrentMonth(newDate);
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>

                          {/* Days Header */}
                          <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Calendar Grid - LARGER CELLS */}
                          <div className="grid grid-cols-7 gap-2">
                            {renderCalendarDays()}
                          </div>

                          {/* Legend */}
                          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-purple-50 border border-purple-200 rounded"></div>
                              <span>Has expenses</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></div>
                              <span>Today</span>
                            </div>
                          </div>
                        </div>

                        {/* Expenses Section - WITH EDIT/DELETE ICONS */}
                        <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {dateRange.from ? 
                                (dateRange.to ? 'Expenses in Range' : 'Expenses on Date') : 
                                'Select dates'}
                            </h4>
                            
                            {dailyExpenses.length > 0 && (
                              <div className="text-right">
                                <div className="text-xs text-gray-500">{dailyExpenses.length} expense{dailyExpenses.length !== 1 ? 's' : ''}</div>
                                <div className="text-lg font-bold text-purple-600">${filteredExpenses.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {dailyExpenses.length > 0 ? (
                              dailyExpenses.map((expense, index) => (
                                <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 hover:shadow-lg transition-all border border-purple-200 dark:border-purple-800 group">
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                        {expense.description}
                                      </h5>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          {expense.category}
                                        </p>
                                        <span className="text-xs text-gray-400">•</span>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          {format(new Date(expense.date), "MMM dd")}
                                        </p>
                                      </div>
                                      <div className="mt-2">
                                        <Badge 
                                          variant={expense.type === 'group' ? 'secondary' : 'outline'} 
                                          className="text-xs"
                                        >
                                          {expense.type}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-2">
                                      <span className="text-sm font-bold text-red-600 whitespace-nowrap">
                                        ${expense.amount.toFixed(2)}
                                      </span>
                                      
                                      {/* Edit and Delete Icons */}
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleEditExpense(expense);
                                          }}
                                          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                          title="Edit expense"
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteExpense(expense.id);
                                          }}
                                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                          title="Delete expense"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : dateRange.from ? (
                              <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-sm font-medium">No expenses found</p>
                                <p className="text-xs text-gray-400 mt-1">Try selecting a different date range</p>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm font-medium">Click on dates to view expenses</p>
                                <p className="text-xs text-gray-400 mt-1">You can drag to select a range</p>
                              </div>
                            )}
                          </div>

                          {/* Drag instruction hint */}
                          {dateRange.from && !dateRange.to && (
                            <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 text-center">
                              💡 Drag the selected date or click another date to create a range
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => {
                            setDateRange({ from: undefined, to: undefined });
                            setDailyExpenses([]);
                          }}
                          className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-gray-700 dark:text-gray-300"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          disabled={!dateRange.from}
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium shadow-lg"
                        >
                          Apply Filter
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {loading ? '...' : `$${displayAmount.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {dateRange.from ? (
                <span className="font-medium">
                  Custom range
                </span>
              ) : (
                "This month's total"
              )}
            </p>
            
            {dateRange.from && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  <CalendarIcon className="h-3 w-3" />
                  <span className="font-medium">
                    {format(dateRange.from, "MMM dd")}
                    {dateRange.to && ` - ${format(dateRange.to, "MMM dd")}`}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Owe</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$0.00</div>
            <p className="text-xs text-muted-foreground">All settled up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Are Owed</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-[#ac1852]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$0.00</div>
            <p className="text-xs text-muted-foreground">All settled up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `$${monthlySavings.toFixed(2)}`}</div>
            <Progress value={savingsProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{savingsProgress.toFixed(0)}% of ${savingsGoal} goal</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expense Categories</CardTitle>
                  <CardDescription>Your spending breakdown</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="outline" size="sm" className="flex gap-1 text-sm">
                      {categoryPeriod === 'current' ? 'Current Month' : 'Previous Month'}
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setCategoryPeriod('current')}>
                      Current Month
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setCategoryPeriod('previous')}>
                      Previous Month
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-[300px]">
                {categoryLoading ? (
                  <div className="h-full flex items-center justify-center">Loading chart...</div>
                ) : categoryError ? (
                  <div className="h-full flex items-center justify-center text-sm text-red-500">
                    Error: {categoryError}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.length ? categoryData : DEFAULT_COLORS.map((c, i) => ({ name: `Category ${i+1}`, value: 0, color: c }))}
                        innerRadius={50}
                        outerRadius={80}
                        cx="50%"
                        cy="50%"
                        dataKey="value"
                      >
                        {(categoryData.length ? categoryData : DEFAULT_COLORS).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color ?? entry} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {categoryData.length ? categoryData.map((category) => (
                  <div key={category.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <span>{category.name}</span>
                    </div>
                    <span className="font-medium">${category.value.toFixed(2)}</span>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground">No data for this month</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Personal vs Group expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="personal" stroke="#9B1313" name="Personal" />
                    <Line type="monotone" dataKey="group" stroke="#FFA896" name="Group" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <CardDescription>Personalized financial insights powered by AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Icon className={`h-5 w-5 mt-0.5 ${insight.color}`} />
                    <div className="flex-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">{insight.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
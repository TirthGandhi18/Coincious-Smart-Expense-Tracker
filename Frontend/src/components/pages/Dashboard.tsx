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
import { Link } from 'react-router-dom';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';

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

export function Dashboard() {
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
      
      // Enhanced selection logic
      const isStartDate = dateRange.from && currentDate.getTime() === dateRange.from.getTime();
      const isEndDate = dateRange.to && currentDate.getTime() === dateRange.to.getTime();
      const isSelected = isStartDate || isEndDate;
      const isInRange = dateRange.from && dateRange.to &&
                       currentDate > dateRange.from && currentDate < dateRange.to;
      
      // Drag preview logic
      const isDragHover = dragState.isDragging && 
        ((dragState.dragType === 'start' && dateRange.to && currentDate < dateRange.to) ||
         (dragState.dragType === 'end' && dateRange.from && currentDate > dateRange.from));
      
      // Better styling with distinct colors and drag states
      let buttonClasses = `
        aspect-square p-2 text-sm font-medium rounded-lg transition-all duration-200 relative border-2 select-none
        ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600 opacity-60' : ''}
        ${isFuture ? 'text-gray-300 cursor-not-allowed opacity-40 border-transparent' : 'cursor-pointer border-transparent'}
        ${isToday && !isSelected ? 'bg-blue-100 text-blue-800 font-bold border-blue-400 ring-2 ring-blue-200' : ''}
        ${dragState.isDragging ? 'pointer-events-auto' : ''}
      `;

      // Start date styling with drag handle
      if (isStartDate) {
        buttonClasses += ` bg-purple-600 text-white shadow-lg scale-110 border-purple-700 font-bold ring-2 ring-purple-300
          ${dragState.isDragging && dragState.dragType === 'start' ? 'scale-125 shadow-2xl' : 'hover:scale-115'}
        `;
      }
      // End date styling with drag handle
      else if (isEndDate) {
        buttonClasses += ` bg-pink-600 text-white shadow-lg scale-110 border-pink-700 font-bold ring-2 ring-pink-300
          ${dragState.isDragging && dragState.dragType === 'end' ? 'scale-125 shadow-2xl' : 'hover:scale-115'}
        `;
      }
      // In-range styling
      else if (isInRange) {
        buttonClasses += ' bg-purple-200 text-purple-900 border-purple-300 font-semibold';
      }
      // Drag hover preview
      else if (isDragHover) {
        buttonClasses += ' bg-gray-300 text-gray-700 border-gray-400 scale-105';
      }
      // Default hover state
      else if (!isFuture && isCurrentMonth && !dragState.isDragging) {
        buttonClasses += ' hover:bg-purple-100 hover:text-purple-700 hover:scale-105';
      }

      days.push(
        <button
          key={i}
          onClick={() => handleDateSelect(currentDate)}
          onMouseDown={() => {
            if (isStartDate) handleDragStart(currentDate, 'start');
            else if (isEndDate) handleDragStart(currentDate, 'end');
          }}
          onMouseEnter={() => handleDragOver(currentDate)}
          onMouseUp={handleDragEnd}
          disabled={isFuture}
          className={buttonClasses}
          draggable={false}
        >
          <div className="flex flex-col items-center justify-center h-full relative">
            <span className="text-sm font-semibold">{currentDate.getDate()}</span>
            
            {/* Enhanced visual indicators with drag handles */}
            {isStartDate && (
              <div className="absolute -top-1 -left-1 bg-white rounded-full p-0.5 shadow-md border border-purple-300">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              </div>
            )}
            
            {isEndDate && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-md border border-pink-300">
                <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
              </div>
            )}

            {/* Drag handles for better UX */}
            {isStartDate && (
              <div className="absolute inset-0 cursor-move flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="text-white text-xs font-bold">⟲</div>
              </div>
            )}

            {isEndDate && (
              <div className="absolute inset-0 cursor-move flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="text-white text-xs font-bold">⟳</div>
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
                  
                  {/* Hotel Booking Style Calendar */}
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in duration-300">
                      {/* Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Date Range</h3>
                          
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
                                <div className="flex items-center gap-2 mt-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                                  <span className="text-sm font-semibold text-gray-700">
                                    {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} day{Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) !== 0 ? 's' : ''} selected
                                  </span>
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

                      <div className="grid md:grid-cols-2 gap-6 p-6">
                        {/* Calendar Section */}
                        <div>
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
                            
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {renderCalendarDays()}
                          </div>
                        </div>

                        {/* Expenses Section */}
                        <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {dateRange.from ? 
                                (dateRange.to ? 'Expenses in Range' : 'Expenses on Date') : 
                                'Select dates to view expenses'}
                            </h4>
                            
                            {dailyExpenses.length > 0 && (
                              <div className="text-right">
                                <div className="text-xs text-gray-500">{dailyExpenses.length} expense{dailyExpenses.length !== 1 ? 's' : ''}</div>
                                <div className="text-lg font-bold text-purple-600">${filteredExpenses.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {dailyExpenses.length > 0 ? (
                              dailyExpenses.map((expense, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                        {expense.title}
                                      </h5>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {expense.category} • {format(new Date(expense.date), "MMM dd")}
                                      </p>
                                    </div>
                                    <span className="text-sm font-bold text-red-600">
                                      ${expense.amount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : dateRange.from ? (
                              <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-sm">No expenses found for selected date{dateRange.to ? 's' : ''}</p>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm">Click on dates to view expenses</p>
                              </div>
                            )}
                          </div>

                          {dailyExpenses.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Total:</span>
                                <span className="text-lg font-bold text-purple-600">
                                  ${filteredExpenses.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
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
            <div className="text-2xl font-bold">{loading ? '...' : `${monthlySavings.toFixed(2)}`}</div>
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
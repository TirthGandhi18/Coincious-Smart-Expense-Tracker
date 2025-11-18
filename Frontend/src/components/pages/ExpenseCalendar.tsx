// ExpenseCalendar.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Flame,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  type: string;
  date: string;
  description?: string;
  // NOTE: You can add group_id, payer_id, splits etc if needed
}

interface ValidationErrors {
  title?: string;
  amount?: string;
  category?: string;
}

interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// Category colors and emojis
const categoryStyles: { [key: string]: { color: string; emoji: string; gradient: string } } = {
  'food': { color: '#FF6B6B', emoji: '🍔', gradient: 'from-red-400 to-pink-500' },
  'transportation': { color: '#4ECDC4', emoji: '🚗', gradient: 'from-teal-400 to-cyan-500' },
  'accommodation': { color: '#95E1D3', emoji: '🏠', gradient: 'from-green-400 to-emerald-500' },
  'entertainment': { color: '#FFE66D', emoji: '🎉', gradient: 'from-yellow-400 to-orange-500' },
  'utilities': { color: '#A8E6CF', emoji: '💡', gradient: 'from-lime-400 to-green-500' },
  'shopping': { color: '#C7CEEA', emoji: '🛍️', gradient: 'from-purple-400 to-indigo-500' },
  'health': { color: '#FFB6B9', emoji: '⚕️', gradient: 'from-rose-400 to-red-500' },
  'other': { color: '#B4A7D6', emoji: '💳', gradient: 'from-violet-400 to-purple-500' }
};

// Validation constants
const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 50,
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 1000000,
  AMOUNT_DECIMAL_PLACES: 2,
};

// Toast Component
function Toast({ message, type, onClose }: ToastMessage & { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    info: <AlertCircle className="h-5 w-5" />,
  };

  const colors = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-rose-500',
    warning: 'from-amber-500 to-orange-500',
    info: 'from-blue-500 to-cyan-500',
  };

  return (
    <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-right-5">
      <div className={`bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-sm min-w-[300px]`}>
        {icons[type]}
        <span className="font-semibold flex-1">{message}</span>
        <button onClick={onClose} className="hover:opacity-70 transition-opacity">
          ✕
        </button>
      </div>
    </div>
  );
}

export function ExpenseCalendar() {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 1)); // November 2025 default
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expensesByDate, setExpensesByDate] = useState<{ [key: string]: Expense[] }>({});
  const [loading, setLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    category: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const showToast = (type: ToastMessage['type'], message: string) => {
    setToast({ type, message });
  };

  // Sanitize input to prevent XSS
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
      .trim()
      .slice(0, VALIDATION_RULES.TITLE_MAX_LENGTH);
  };

  // Validate form fields (kept for inline editing in-calendar if you want to keep)
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    const title = editForm.title.trim();
    const amount = parseFloat(editForm.amount);

    if (!title) {
      errors.title = 'Title is required';
    } else if (title.length < VALIDATION_RULES.TITLE_MIN_LENGTH) {
      errors.title = `Title must be at least ${VALIDATION_RULES.TITLE_MIN_LENGTH} characters`;
    } else if (!/^[a-zA-Z0-9\s\-&,'().]+$/.test(title)) {
      errors.title = 'Title contains invalid characters';
    }

    if (!editForm.amount || editForm.amount === '') {
      errors.amount = 'Amount is required';
    } else if (isNaN(amount)) {
      errors.amount = 'Amount must be a valid number';
    } else if (amount < VALIDATION_RULES.AMOUNT_MIN) {
      errors.amount = `Amount must be at least $${VALIDATION_RULES.AMOUNT_MIN}`;
    } else if (amount > VALIDATION_RULES.AMOUNT_MAX) {
      errors.amount = `Amount cannot exceed $${VALIDATION_RULES.AMOUNT_MAX.toLocaleString()}`;
    } else {
      const decimalParts = editForm.amount.split('.');
      if (decimalParts[1] && decimalParts[1].length > VALIDATION_RULES.AMOUNT_DECIMAL_PLACES) {
        errors.amount = `Amount can have maximum ${VALIDATION_RULES.AMOUNT_DECIMAL_PLACES} decimal places`;
      }
    }

    if (!editForm.category) {
      errors.category = 'Category is required';
    } else if (!categoryStyles[editForm.category]) {
      errors.category = 'Invalid category selected';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [editForm.title, editForm.amount, editForm.category]);

  const handleMonthYearChange = (month: number, year: number) => {
    if (year < 1900 || year > 2100) {
      showToast('error', 'Invalid year selected');
      return;
    }
    setCurrentDate(new Date(year, month, 1));
    setSelectedDate(null);
  };

  // Dummy expense data for November 6-9, 2025
  const DUMMY_EXPENSES: Expense[] = [
    { id: 1, date: '2025-11-06', title: 'Grocery Shopping', amount: 125.50, category: 'food', type: 'personal' },
    { id: 2, date: '2025-11-06', title: 'Gas Station', amount: 45.00, category: 'transportation', type: 'personal' },
    { id: 3, date: '2025-11-07', title: 'Team Lunch', amount: 280.00, category: 'food', type: 'group', description: 'Lunch with team at nice restaurant' },
    { id: 4, date: '2025-11-07', title: 'Coffee Shop', amount: 15.75, category: 'food', type: 'personal' },
    { id: 5, date: '2025-11-08', title: 'Movie Night', amount: 65.00, category: 'entertainment', type: 'group', description: 'Movies with friends' },
    { id: 6, date: '2025-11-08', title: 'Uber Ride', amount: 22.50, category: 'transportation', type: 'personal' },
    { id: 7, date: '2025-11-08', title: 'Amazon Order', amount: 89.99, category: 'shopping', type: 'personal' },
    { id: 8, date: '2025-11-09', title: 'Dinner Party', amount: 450.00, category: 'food', type: 'group', description: 'Dinner with family' },
    { id: 9, date: '2025-11-09', title: 'Gym Membership', amount: 49.99, category: 'health', type: 'personal' },
  ];

  // Load (dummy) expenses and organize by date
  useEffect(() => {
    const loadExpenses = () => {
      setLoading(true);
      try {
        const organized: { [key: string]: Expense[] } = {};
        DUMMY_EXPENSES.forEach(expense => {
          if (!organized[expense.date]) organized[expense.date] = [];
          organized[expense.date].push(expense);
        });
        setExpensesByDate(organized);
      } catch (error) {
        console.error('Error loading expenses:', error);
        showToast('error', 'Failed to load expenses');
      } finally {
        setLoading(false);
      }
    };

    loadExpenses();
  }, [currentDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const formatDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getExpensesForDay = (day: number) => {
    const dateKey = formatDate(day);
    return expensesByDate[dateKey] || [];
  };

  const getTotalForDay = (day: number) => {
    const expenses = getExpensesForDay(day);
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getHeatIntensity = (amount: number) => {
    const maxAmount = Math.max(...Object.values(expensesByDate).map(expenses => 
      expenses.reduce((sum, exp) => sum + exp.amount, 0)
    ), 0);
    const intensity = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
    if (intensity === 0) return 'bg-background';
    if (intensity < 25) return 'bg-green-100 dark:bg-green-900/20';
    if (intensity < 50) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (intensity < 75) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (day: number) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    clickedDate.setHours(0,0,0,0);
    if (clickedDate > today) {
      showToast('warning', "You can't view expenses for future dates!");
      return;
    }
    const dateKey = formatDate(day);
    setSelectedDate(prev => prev === dateKey ? null : dateKey);
  };

  // EDIT -> now navigates to /add-expense with state containing expenseData and isEdit:true
  const handleEditExpense = (expense: Expense) => {
    // Navigate to AddExpense and pass the expense object in state
    navigate('/add-expense', { state: { expenseData: expense, isEdit: true } });
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedExpenses = { ...expensesByDate };
      Object.keys(updatedExpenses).forEach(date => {
        updatedExpenses[date] = updatedExpenses[date].filter(exp => exp.id !== expenseId);
        if (updatedExpenses[date].length === 0) delete updatedExpenses[date];
      });
      setExpensesByDate(updatedExpenses);
      showToast('success', 'Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast('error', 'Failed to delete expense. Please try again.');
    }
  };

  // Monthly stats
  const monthlyTotal = Object.values(expensesByDate).reduce((sum, expenses) => 
    sum + expenses.reduce((daySum, exp) => daySum + exp.amount, 0), 0
  );
  const daysWithExpenses = Object.keys(expensesByDate).length;
  const avgDailySpending = daysWithExpenses > 0 ? monthlyTotal / daysWithExpenses : 0;

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const expenses = getExpensesForDay(day);
    const total = getTotalForDay(day);
    const hasExpenses = expenses.length > 0;
    const dateKey = formatDate(day);
    const today = new Date(); today.setHours(0,0,0,0);
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day); dayDate.setHours(0,0,0,0);
    const isFuture = dayDate > today;
    const isToday = dayDate.getTime() === today.getTime();
    const heatClass = getHeatIntensity(total);

    days.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        onMouseEnter={() => setHoveredDay(day)}
        onMouseLeave={() => setHoveredDay(null)}
        disabled={isFuture}
        className={`
          relative aspect-square p-2 rounded-xl transition-all duration-300 transform
          ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg cursor-pointer'}
          ${selectedDate === dateKey ? 'ring-2 ring-[#8B4D6C] scale-105 shadow-xl' : ''}
          ${isToday ? 'ring-2 ring-blue-500' : ''}
          ${heatClass}
          ${hoveredDay === day && !isFuture ? 'z-10' : ''}
        `}
      >
        <div className="relative h-full flex flex-col justify-between">
          <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : ''} ${selectedDate === dateKey ? 'text-[#8B4D6C]' : ''}`}>
            {day}
          </div>

          {hasExpenses && (
            <>
              <div className="flex items-center justify-center gap-1 my-1">
                {expenses.slice(0,3).map((exp, i) => {
                  const style = categoryStyles[exp.category] || categoryStyles['other'];
                  return (<span key={i} className="text-xs" title={exp.title}>{style.emoji}</span>);
                })}
                {expenses.length > 3 && <span className="text-xs text-muted-foreground">+{expenses.length - 3}</span>}
              </div>

              <div className={`text-xs font-bold ${selectedDate === dateKey ? 'text-[#8B4D6C]' : 'text-muted-foreground'}`}>
                ${total.toFixed(0)}
              </div>

              {total > avgDailySpending * 1.5 && <Flame className="absolute top-1 right-1 h-3 w-3 text-red-500 animate-pulse" />}
            </>
          )}
        </div>

        {hoveredDay === day && hasExpenses && !isFuture && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-xl border text-xs whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
            <div className="font-bold">{expenses.length} expense{expenses.length > 1 ? 's' : ''}</div>
            <div className="text-muted-foreground">${total.toFixed(2)}</div>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Total</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ${monthlyTotal.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg per Day</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ${avgDailySpending.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden shadow-xl border-2">
          <CardHeader className="bg-[#8B4D6C] p-6">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl md:text-2xl flex items-center gap-3 text-white font-bold drop-shadow-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
                <span className="text-white">Calendar</span>
              </CardTitle>

              <div className="flex items-center gap-2">
                <Select 
                  value={currentDate.getMonth().toString()} 
                  onValueChange={(value) => handleMonthYearChange(parseInt(value), currentDate.getFullYear())}
                >
                  <SelectTrigger className="w-[130px] bg-white/20 border-white/30 text-white hover:bg-white/30 font-semibold">
                    <SelectValue className="text-white" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={currentDate.getFullYear().toString()} 
                  onValueChange={(value) => handleMonthYearChange(currentDate.getMonth(), parseInt(value))
                  }
                >
                  <SelectTrigger className="w-[100px] bg-white/20 border-white/30 text-white hover:bg-white/30 font-semibold">
                    <SelectValue className="text-white" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} className="hover:scale-110 transition-transform bg-white/20 hover:bg-white/40 border-white/30 h-10 w-10">
                    <ChevronLeft className="h-6 w-6 text-white" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} className="hover:scale-110 transition-transform bg-white/20 hover:bg-white/40 border-white/30 h-10 w-10">
                    <ChevronRight className="h-6 w-6 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 bg-white dark:bg-background">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-[#8B4D6C]"></div>
                <p className="mt-4 text-muted-foreground">Loading your expenses...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map(day => <div key={day} className="text-center text-sm font-bold text-muted-foreground p-2">{day}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-2">{days}</div>

                <div className="flex items-center justify-center gap-2 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">Less</span>
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded bg-green-100 dark:bg-green-900/20"></div>
                    <div className="w-6 h-6 rounded bg-yellow-100 dark:bg-yellow-900/20"></div>
                    <div className="w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/20"></div>
                    <div className="w-6 h-6 rounded bg-red-100 dark:bg-red-900/20"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">More</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-[#8B4D6C] to-[#D38DAB] text-white">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Select a Date'}
            </CardTitle>
            <CardDescription className="text-white/80">
              {selectedDate && expensesByDate[selectedDate]
                ? `${expensesByDate[selectedDate].length} expense${expensesByDate[selectedDate].length !== 1 ? 's' : ''}`
                : 'Click a date to see details'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {selectedDate && expensesByDate[selectedDate] ? (
                expensesByDate[selectedDate].map((expense, index) => {
                  const style = categoryStyles[expense.category] || categoryStyles['other'];
                  return (
                    <div key={expense.id} className={`border-2 rounded-xl p-4 space-y-3 animate-in slide-in-from-right hover:shadow-lg transition-all bg-gradient-to-br ${style.gradient} bg-opacity-5`} style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{style.emoji}</span>
                          <div>
                            <div className="font-bold text-lg">{expense.title}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              {expense.category}
                              <Badge variant={expense.type === 'group' ? 'secondary' : 'outline'} className="ml-1">{expense.type}</Badge>
                            </div>
                            {expense.description && <div className="text-xs text-muted-foreground mt-1">{expense.description}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                          ${expense.amount.toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:scale-110 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditExpense(expense);
                            }}
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 hover:bg-red-100 dark:hover:bg-red-900/20 hover:scale-110 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExpense(expense.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">
                    {selectedDate ? 'No expenses on this date' : 'Click a date to view expenses'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ExpenseCalendar;

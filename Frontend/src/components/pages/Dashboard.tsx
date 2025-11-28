import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '../../utils/supabase/client';
import { Badge } from '../ui/badge';
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
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ChevronDown,
  Calendar as CalendarIcon,
  Loader2,
  Pencil as PencilIcon
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, startOfDay } from 'date-fns';
import { toast } from 'sonner';

// --- Types & Constants ---

const DEFAULT_COLORS = [
  '#ECAABA',
  '#D38DAB',
  '#8B4D6C',
  '#9B89B0',
  '#675C83',
  '#483B63'
];

type CategoryData = { name: string; value: number; color: string };
type ExpenseItem = { id?: string; created_at?: string; title: string; category: string; date: string; amount: number };

// --- Helper Functions ---

const parseNumberInput = (input: string): number => {
  const numericString = input.split('').filter(c => /[0-9.]/.test(c)).join('');
  return Number.parseFloat(numericString);
};

// --- Helper Components ---

function BudgetProgressRing({
  percent,
  size = 160,
  stroke = 16,
}: { readonly percent: number; readonly size?: number; readonly stroke?: number; }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circ - (clamped / 100) * circ;

  let ringColor = '#22c55e';
  if (percent >= 100) ringColor = '#ef4444';
  else if (percent >= 80) ringColor = '#f59e0b';
  else if (percent >= 50) ringColor = '#eab308';

  return (
    <svg width={size} height={size} className="block mx-auto">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,2,.6,1), stroke 0.3s' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.3em" fontSize={size * 0.22} fontWeight={700} fill={ringColor}>
        {`${Math.round(clamped)}%`}
      </text>
    </svg>
  );
}

const CalendarDay = ({
  date,
  isCurrentMonth,
  isFuture,
  isSelected,
  isInRange,
  hasExpenses,
  dailyTotal,
  onClick
}: {
  readonly date: Date;
  readonly isCurrentMonth: boolean;
  readonly isFuture: boolean;
  readonly isSelected: boolean;
  readonly isInRange: boolean;
  readonly hasExpenses: boolean;
  readonly dailyTotal: number;
  readonly onClick: () => void;
}) => {
  const isToday = isSameDay(date, new Date());

  const baseClasses = "aspect-square p-1 text-sm font-medium rounded-xl transition-all duration-200 relative border-2 select-none flex flex-col items-center justify-start pt-2 gap-0.5";
  let colorClasses = isCurrentMonth ? "text-gray-700 dark:text-gray-200" : "text-gray-300 dark:text-gray-700 opacity-50";
  const cursorClasses = isFuture ? "cursor-not-allowed opacity-30 bg-gray-50 dark:bg-gray-900/50" : "cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20";
  let borderClasses = "border-transparent";

  if (isToday && !isSelected && !isInRange && !isFuture) {
    borderClasses = "border-blue-400 text-blue-600 font-bold";
  }

  if (isSelected) {
    colorClasses = "bg-purple-600 text-white shadow-md scale-105 z-10 border-transparent";
  } else if (isInRange) {
    colorClasses = "bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 rounded-none mx-[-2px] border-y border-purple-200";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isFuture}
      className={`${baseClasses} ${colorClasses} ${cursorClasses} ${borderClasses}`}
    >
      <span className="text-sm">{date.getDate()}</span>
      {hasExpenses && !isFuture && (
        <span className={`text-[10px] font-bold truncate w-full text-center px-1 ${isSelected ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`}>
          ₹{dailyTotal.toFixed(0)}
        </span>
      )}
      {isToday && !hasExpenses && !isSelected && (
        <div className="w-1 h-1 bg-blue-500 rounded-full mt-1"></div>
      )}
    </button>
  );
};

const CalendarGrid = ({
  currentMonth,
  monthlyExpenses,
  dateRange,
  onDateSelect
}: {
  readonly currentMonth: Date;
  readonly monthlyExpenses: any[];
  readonly dateRange: { from: Date | undefined; to: Date | undefined };
  readonly onDateSelect: (date: Date) => void;
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const isCurrentMonth = currentDate.getMonth() === month;
    const isFuture = isAfter(currentDate, today);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    const dayExpenses = monthlyExpenses.filter(exp => exp.date && String(exp.date).startsWith(dateStr));
    const hasExpenses = dayExpenses.length > 0;
    const dailyTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const isStartDate = dateRange.from ? isSameDay(currentDate, dateRange.from) : false;
    const isEndDate = dateRange.to ? isSameDay(currentDate, dateRange.to) : false;
    const isSelected = isStartDate || isEndDate;
    
    const isInRange = Boolean(
      dateRange.from && 
      dateRange.to && 
      isAfter(currentDate, dateRange.from) && 
      isAfter(dateRange.to, currentDate)
    );

    days.push(
      <CalendarDay
        key={dateStr}
        date={currentDate}
        isCurrentMonth={isCurrentMonth}
        isFuture={isFuture}
        isSelected={isSelected}
        isInRange={isInRange}
        hasExpenses={hasExpenses}
        dailyTotal={dailyTotal}
        onClick={() => { 
          // S7735: if (!isFuture) -> if (isFuture === false)
          if (isFuture === false) onDateSelect(currentDate); 
        }}
      />
    );
  }
  return <>{days}</>;
};

const SidebarExpenseList = ({
  expenses,
  isLoading,
  onClear,
  onApply,
  hasRange
}: {
  readonly expenses: ExpenseItem[];
  readonly isLoading: boolean;
  readonly onClear: () => void;
  readonly onApply: () => void;
  readonly hasRange: boolean;
}) => {
  let content;

  if (isLoading) {
    content = <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-500" /></div>;
  } else if (expenses.length > 0) {
    content = expenses.map((expense) => (
      <div key={expense.id || expense.created_at} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-purple-200 transition-all">
        <div className="flex justify-between items-start">
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white text-sm truncate line-clamp-1">{expense.title}</h5>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] h-5 px-1">{expense.category}</Badge>
              <p className="text-xs text-gray-500">{format(new Date(expense.date), 'MMM dd')}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">₹{expense.amount.toFixed(2)}</span>
        </div>
      </div>
    ));
  } else {
    content = (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm font-medium">No expenses found</p>
        <p className="text-xs text-gray-400 mt-1">Try selecting a different range</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 flex-1 overflow-y-auto p-4">
        {content}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <button onClick={onClear} className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Clear</button>
          {/* S7735: disabled={!hasRange} -> disabled={hasRange === false} */}
          <button onClick={onApply} disabled={hasRange === false} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">Apply</button>
        </div>
      </div>
    </>
  );
};

const DateRangePickerModal = ({
  show,
  onClose,
  dateRange,
  currentMonth,
  setCurrentMonth,
  monthlyExpenses,
  handleDateSelect,
  sidebarExpenses,
  sidebarTotal,
  isCalendarLoading,
  clearRange,
  applyRange
}: {
  readonly show: boolean;
  readonly onClose: () => void;
  readonly dateRange: { from: Date | undefined; to: Date | undefined };
  readonly currentMonth: Date;
  readonly setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  readonly monthlyExpenses: any[];
  readonly handleDateSelect: (d: Date) => void;
  readonly sidebarExpenses: any[];
  readonly sidebarTotal: number;
  readonly isCalendarLoading: boolean;
  readonly clearRange: () => void;
  readonly applyRange: () => void;
}) => {
  if (!show) return null;

  return (
    <>
      <button 
        type="button"
        className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-300 w-full h-full cursor-default border-0 p-0"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300 pointer-events-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Select Date Range</h3>
              <div className="mt-2 space-y-1">
                {dateRange.from ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-700">From: {format(dateRange.from, 'dd MMM yyyy')}</span>
                    {dateRange.to && <span className="text-sm font-medium text-pink-700">To: {format(dateRange.to, 'dd MMM yyyy')}</span>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Choose your start date</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
          </div>

          <div className="flex-1 overflow-hidden grid md:grid-cols-3">
            <div className="md:col-span-2 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-full">←</button>
                <h4 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h4>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-full">→</button>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-sm font-semibold text-gray-600 p-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                <CalendarGrid 
                  currentMonth={currentMonth}
                  monthlyExpenses={monthlyExpenses}
                  dateRange={dateRange}
                  onDateSelect={handleDateSelect}
                />
              </div>
            </div>

            <div className="border-l border-gray-200 dark:border-gray-700 pl-6 flex flex-col h-full bg-gray-50 dark:bg-gray-900/30">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>{dateRange.from ? 'Expenses in Range' : 'Select dates'}</span>
                  {dateRange.from && sidebarTotal > 0 && (
                    <span className="text-lg font-bold text-purple-600">₹{sidebarTotal.toFixed(2)}</span>
                  )}
                </h4>
                {sidebarExpenses.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">{sidebarExpenses.length} transaction{sidebarExpenses.length === 1 ? '' : 's'}</div>
                )}
              </div>

              <SidebarExpenseList 
                expenses={sidebarExpenses}
                isLoading={isCalendarLoading}
                onClear={clearRange}
                onApply={applyRange}
                hasRange={Boolean(dateRange.from)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const DashboardStats = ({
  loading,
  dateRange,
  filteredExpenses,
  currentMonthTotal,
  setShowDatePicker,
  youOwe,
  youAreOwed,
  budgetValue,
  monthlySavings,
  budgetUsed,
  overBudgetAmount,
  budgetRemaining,
  goalValue,
  savingsProgressToGoal,
  setIsGoalModalOpen,
  clearGoal,
  formatBalance,
  youOweMessage,
  youAreOwedMessage
}: any) => {
  let totalExpensesDisplay;
  if (loading) {
    totalExpensesDisplay = '...';
  } else if (dateRange.from) {
    totalExpensesDisplay = `₹${filteredExpenses.toFixed(2)}`;
  } else {
    totalExpensesDisplay = `₹${currentMonthTotal.toFixed(2)}`;
  }

  let monthlySavingsDisplay;
  if (loading) {
    monthlySavingsDisplay = '...';
  } else if (budgetValue !== null) {
    monthlySavingsDisplay = `₹${monthlySavings.toFixed(2)}`;
  } else {
    monthlySavingsDisplay = '—';
  }

  let budgetStatus;
  if (budgetValue !== null) {
    if (overBudgetAmount > 0) {
      budgetStatus = <div className="text-red-600"><span className="font-medium">Over budget by: </span>₹{overBudgetAmount.toFixed(2)}</div>;
    } else {
      budgetStatus = <div><span className="font-medium">Remaining budget: </span>₹{budgetRemaining.toFixed(2)}</div>;
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Expenses Card */}
      <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20" />
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <div className="relative calendar-wrapper">
            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:scale-110 transition-all cursor-pointer bg-white border border-purple-200 shadow-sm"
              // S6644 & S7735: prev ? false : true -> prev === false (explicit positive check for toggle)
              onClick={() => setShowDatePicker((prev: boolean) => prev === false)}
              aria-label="Open date range picker"
            >
              <CalendarIcon className="h-4 w-4 text-purple-600" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totalExpensesDisplay}
          </div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            {dateRange.from ? <span className="font-medium">Custom range</span> : "This month's total"}
          </p>
        </CardContent>
      </Card>

      {/* You Owe */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">You Owe</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatBalance(youOwe)}</div>
          <p className="text-xs text-muted-foreground">{youOweMessage}</p>
        </CardContent>
      </Card>

      {/* You Are Owed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">You Are Owed</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatBalance(youAreOwed)}</div>
          <p className="text-xs text-muted-foreground">{youAreOwedMessage}</p>
        </CardContent>
      </Card>

      {/* Monthly Savings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
          </div>
          <button title="Set savings goal" onClick={() => setIsGoalModalOpen(true)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-xs">
            <PencilIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {monthlySavingsDisplay}
          </div>

          <div className="mt-3 flex items-start gap-6">
            <div className="flex flex-col text-xs text-muted-foreground gap-1">
              <div><span className="font-medium">Budget: </span>{budgetValue === null ? 'Not set' : `₹${budgetValue.toFixed(2)}`}</div>
              <div><span className="font-medium">Spent: </span>₹{budgetUsed.toFixed(2)}</div>
              {budgetValue !== null && budgetStatus}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {goalValue === null ? (
                <>No savings goal set</>
              ) : (
                <>
                  Savings vs goal: <span className="font-semibold">₹{monthlySavings.toFixed(2)}</span> / <span className="font-semibold">₹{goalValue.toFixed(2)}</span>
                  <span className="ml-2">({Math.round(savingsProgressToGoal)}%)</span>
                </>
              )}
            </div>
            {goalValue !== null && (
              <Button size="sm" variant="outline" onClick={clearGoal}>Clear Goal</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CategoryChart = ({
  data,
  loading,
  error,
  period,
  setPeriod
}: {
  readonly data: CategoryData[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly period: 'current' | 'previous';
  readonly setPeriod: (p: 'current' | 'previous') => void;
}) => {
  const chartData = data.length > 0 ? data : DEFAULT_COLORS.map((c, i) => ({ name: `Category ${i + 1}`, value: 0, color: c }));

  const renderChartContent = () => {
    if (loading) {
      return <div className="h-full flex items-center justify-center">Loading chart...</div>;
    }
    if (error) {
      return <div className="h-full flex items-center justify-center text-sm text-red-500">Error: {error}</div>;
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            innerRadius={50}
            outerRadius={80}
            cx="50%"
            cy="50%"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name || `cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`₹${Number(value).toFixed(2)}`, name]} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="md:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Expense Categories</CardTitle>
            <p className="text-sm text-muted-foreground">Your spending breakdown</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="flex gap-1 text-sm">
                {period === 'current' ? 'Current Month' : 'Previous Month'}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setPeriod('current')}>Current Month</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPeriod('previous')}>Previous Month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {renderChartContent()}
        </div>
        <div className="mt-4 space-y-2">
          {data.length ? (
            data.map((category) => (
              <div key={category.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <span>{category.name}</span>
                </div>
                <span className="font-medium">₹{category.value.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No data for this month</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const BudgetCard = ({
  budget,
  budgetUsed,
  budgetRemaining,
  isEditing,
  setIsEditing,
  budgetInput,
  setBudgetInput,
  onSave,
  saving
}: {
  readonly budget: number | null;
  readonly budgetUsed: number;
  readonly budgetRemaining: number;
  readonly isEditing: boolean;
  readonly setIsEditing: (v: boolean) => void;
  readonly budgetInput: string;
  readonly setBudgetInput: (v: string) => void;
  readonly onSave: (val: number) => Promise<void>;
  readonly saving: boolean;
}) => {
  const percent = budget ? Math.min(100, (budgetUsed / budget) * 100) : 0;

  return (
    <Card className="md:col-span-2 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 w-full">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
        </div>
        {/* S7735: isEditing ? null : (...) -> isEditing === false && (...) */}
        {isEditing === false && (
          <button
            onClick={() => { 
              setBudgetInput(budget === null ? '' : String(budget)); 
              setIsEditing(true); 
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-xs"
          >
            <PencilIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center w-full pt-4 pb-6">
        {isEditing ? (
          <div className="space-y-3 w-full">
            <label htmlFor="budget-input" className="text-xs text-gray-600 dark:text-gray-400">Enter monthly budget</label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 rounded-md border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">₹</span>
              </div>
              <input
                id="budget-input"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="e.g. 2000"
                className="flex-1 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[500, 1000, 2000].map(val => (
                <Button key={val} size="sm" variant="outline" onClick={() => onSave(val)}>₹{val}</Button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setBudgetInput(''); }}>Cancel</Button>
              <Button size="sm" onClick={async () => {
                const parsed = parseNumberInput(budgetInput);
                if (parsed > 0) {
                  await onSave(parsed);
                } else {
                   alert('Enter a valid budget > 0');
                }
              }} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-start w-full">
            <div className="flex items-center justify-center w-full mb-2">
              <BudgetProgressRing percent={percent} />
            </div>
            <div className="mt-2 text-lg font-bold text-center">
              {budget !== null ? `₹${budget.toFixed(2)}` : <span className="text-sm text-muted-foreground">No budget set</span>}
            </div>
            <div className="flex flex-col items-center gap-1 mt-2 text-xs text-muted-foreground w-full">
              <span>Spent: <span className="font-semibold text-purple-700">₹{budgetUsed.toFixed(2)}</span></span>
              <span>Remaining: <span className={`font-semibold ${budgetRemaining <= 0 && budget !== null ? 'text-red-600' : ''}`}>
                {budget !== null ? `₹${budgetRemaining.toFixed(2)}` : '--'}
              </span></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GoalModal = ({
  open,
  onClose,
  goalInput,
  setGoalInput,
  onSave,
  onClear,
  saving
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly goalInput: string;
  readonly setGoalInput: (v: string) => void;
  readonly onSave: () => Promise<void>;
  readonly onClear: () => Promise<void>;
  readonly saving: boolean;
}) => {
  if (!open) return null;

  return (
    <>
      <button 
        type="button"
        className="fixed inset-0 bg-black/40 z-[9998] w-full h-full cursor-default border-0 p-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Set Monthly Savings Goal</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Set a target you'd like to save this month. Savings = Budget - Expenses.</p>
          <div className="mt-4">
            <div className="flex gap-2">
              <div className="flex items-center px-3 rounded-md border border-gray-200 bg-white">
                <span className="text-sm">₹</span>
              </div>
              <input value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="e.g. 2000" className="flex-1 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Goal'}</Button>
              <div className="flex-1" />
              <Button variant="destructive" size="sm" onClick={onClear}>Clear Goal</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// --- Main Component ---

export function Dashboard() {
  const { user } = useAuth();

  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [categoryPeriod, setCategoryPeriod] = useState<'current' | 'previous'>('current');
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);
  const [sidebarExpenses, setSidebarExpenses] = useState<any[]>([]);
  const [sidebarTotal, setSidebarTotal] = useState<number>(0);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [filteredExpenses, setFilteredExpenses] = useState<number>(0);
  const [dragState, setDragState] = useState<{ isDragging: boolean; dragType: 'start' | 'end' | null; originalRange: { from: Date | undefined; to: Date | undefined } }>({ isDragging: false, dragType: null, originalRange: { from: undefined, to: undefined } });

  // Balances / Budget states
  const [youOwe, setYouOwe] = useState<number | null>(null);
  const [youAreOwed, setYouAreOwed] = useState<number | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);

  const [budget, setBudget] = useState<number | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [budgetSaving, setBudgetSaving] = useState(false);

  const [goalInput, setGoalInput] = useState<string>('');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);

  const [currentMonthTotal, setCurrentMonthTotal] = useState<number>(0);

  const BUDGET_TABLE = 'budgets';
  const near80ShownRef = useRef(false);

  // Load initial data
  useEffect(() => {
    const loadSupabaseBudget = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from(BUDGET_TABLE)
          .select('amount_limit, goal_amount')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.amount_limit != null) {
            const parsedBudget = Number.parseFloat(String(data.amount_limit));
            if (Number.isFinite(parsedBudget)) setBudget(parsedBudget);
          }
          if (data.goal_amount != null) {
            setGoalInput(String(data.goal_amount));
          }
        }
      } catch (e) {
        console.warn('Failed to load budgets row', e);
      }
    };

    const loadLocalBudget = () => {
      try {
        const bkey = user?.id ? `budget_${user.id}` : 'budget_anon';
        const gkey = user?.id ? `goal_${user.id}` : 'goal_anon';
        const sb = localStorage.getItem(bkey);
        const sg = localStorage.getItem(gkey);
        if (sb) {
          const pb = Number.parseFloat(sb);
          if (Number.isFinite(pb)) setBudget(pb);
        }
        if (sg) setGoalInput(sg);
      } catch { /* ignore local storage errors */ }
    };

    loadSupabaseBudget();
    loadLocalBudget();
  }, [user?.id]);

  // Refactored persist logic
  const clearBudget = async () => {
    if (user?.id) {
      try { await supabase.from(BUDGET_TABLE).delete().eq('user_id', user.id); } catch (e) { console.warn(e); }
    }
    try {
      const bkey = user?.id ? `budget_${user.id}` : 'budget_anon';
      const gkey = user?.id ? `goal_${user.id}` : 'goal_anon';
      localStorage.removeItem(bkey);
      localStorage.removeItem(gkey);
    } catch { /* ignore */ }
    setBudget(null);
    setGoalInput('');
  };

  const saveBudgetToSupabase = async (amountLimit: number, goalAmount: number | null) => {
    try {
      setBudgetSaving(true);
      const payload: any = { user_id: user?.id, amount_limit: amountLimit };
      if (goalAmount != null) payload.goal_amount = goalAmount;
      
      const { error } = await supabase.from(BUDGET_TABLE).upsert(payload, { onConflict: 'user_id' });
      
      if (error) {
        saveBudgetToLocal(amountLimit, goalAmount);
      } else {
        setBudget(amountLimit);
        if (goalAmount != null) setGoalInput(String(goalAmount));
      }
    } catch (e) {
      console.warn('persist budget error', e);
      saveBudgetToLocal(amountLimit, goalAmount);
    } finally {
      setBudgetSaving(false);
    }
  };

  const saveBudgetToLocal = (amountLimit: number, goalAmount: number | null) => {
    try {
      const userIdKey = user?.id ?? 'anon';
      localStorage.setItem(`budget_${userIdKey}`, String(amountLimit));
      if (goalAmount != null) localStorage.setItem(`goal_${userIdKey}`, String(goalAmount));
      
      setBudget(amountLimit);
      if (goalAmount != null) setGoalInput(String(goalAmount));
    } catch (e) { console.warn(e); }
  };

  const persistBudgetAndMaybeGoal = async (amountLimit: number | null, goalAmount: number | null = null) => {
    if (amountLimit === null) {
      return clearBudget();
    }
    if (user?.id) {
      return saveBudgetToSupabase(amountLimit, goalAmount);
    }
    return saveBudgetToLocal(amountLimit, goalAmount);
  };

  const fetchBalances = async () => {
    if (!user?.id) return;
    setBalancesLoading(true);
    try {
      const { data: oweData } = await supabase.rpc('get_user_owe_amount', { p_user_id: user.id });
      const owedAmount = Number.parseFloat(String(oweData)) || 0;
      setYouOwe(Math.max(0, owedAmount));

      const { data: owedData } = await supabase.rpc('calculate_you_owed', { p_user_id: user.id });
      const owedToUserAmount = Number.parseFloat(String(owedData)) || 0;
      setYouAreOwed(Math.max(0, owedToUserAmount));
    } catch (error) {
      console.error('General error fetching balances:', error);
    } finally {
      setBalancesLoading(false);
    }
  };
  useEffect(() => { fetchBalances(); }, [user]);

  useEffect(() => {
    const fetchMonthlyTotal = async () => {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/current-month-total`, {
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentMonthTotal(Number(data.total || 0));
        }
      } catch (error) {
        console.error('Error fetching monthly total:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMonthlyTotal();
  }, [user]);

  useEffect(() => {
    const fetchMonthlyTotals = async () => {
      if (!user) return;
      setCategoryLoading(true);
      setCategoryError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setCategoryError('No session token'); return; }
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/expense_monthly_donut`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: categoryPeriod })
        });
        
        if (res.ok) {
           const data = await res.json();
           const mapped = (data || []).map((d: any, i: number) => ({
            name: d.category,
            value: Number(d.total) || 0,
            color: DEFAULT_COLORS[i % DEFAULT_COLORS.length]
           }));
           setCategoryData(mapped);
        } else {
           const text = await res.text().catch(() => String(res.status));
           setCategoryError(`Failed to fetch monthly totals: ${text}`);
        }
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
    const fetchMonthlyData = async () => {
      if (!user) return;
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/expenses/range?start_date=${start}&end_date=${end}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setMonthlyExpenses(data || []);
        }
      } catch (error) {
        console.error("Error fetching monthly expenses:", error);
      }
    };
    fetchMonthlyData();
  }, [user, currentMonth, showDatePicker]);

  useEffect(() => {
    const fetchRangeData = async () => {
      if (!user || !dateRange.from) {
        setSidebarExpenses([]);
        setSidebarTotal(0);
        setFilteredExpenses(0);
        return;
      }
      
      setIsCalendarLoading(true);
      const startStr = format(dateRange.from, 'yyyy-MM-dd');
      const endStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : startStr;
      const startFull = `${startStr}T00:00:00`;
      const endFull = `${endStr}T23:59:59`;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/expenses/range?start_date=${startFull}&end_date=${endFull}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setSidebarExpenses(data || []);
          const total = (data || []).reduce((sum: number, item: any) => sum + item.amount, 0);
          setSidebarTotal(total);
          setFilteredExpenses(total);
        }
      } catch (error) {
        console.error("Error fetching range expenses:", error);
      } finally {
        setIsCalendarLoading(false);
      }
    };
    fetchRangeData();
  }, [user, dateRange]);

  const handleDateSelect = (date: Date) => {
    if (dragState.isDragging) return;
    
    // S7735: if (!dateRange.from ...) -> if (dateRange.from === undefined ...)
    if (dateRange.from === undefined || (dateRange.from && dateRange.to)) {
      setDateRange({ from: date, to: undefined });
    } else if (date >= dateRange.from) {
      setDateRange({ from: dateRange.from, to: date });
    } else {
      setDateRange({ from: date, to: dateRange.from });
    }
  };

  const handleDragEnd = () => setDragState({ isDragging: false, dragType: null, originalRange: { from: undefined, to: undefined } });

  useEffect(() => {
    const handleGlobalMouseUp = () => { if (dragState.isDragging) handleDragEnd(); };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState.isDragging]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDatePicker && !target.closest('.calendar-wrapper')) setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const budgetValue = budget ?? null;
  const budgetUsed = currentMonthTotal || 0;
  
  const parsedGoal = useMemo(() => {
    const g = parseNumberInput(goalInput);
    return Number.isFinite(g) ? g : null;
  }, [goalInput]);
  
  const goalValue = parsedGoal;
  const monthlySavings = budgetValue !== null ? Math.max(0, budgetValue - budgetUsed) : 0;
  const savingsProgressToGoal = goalValue && goalValue > 0 ? Math.min(100, (monthlySavings / goalValue) * 100) : 0;
  const overBudgetAmount = budgetValue !== null && budgetUsed > budgetValue ? budgetUsed - budgetValue : 0;
  const budgetRemaining = budgetValue !== null ? Math.max(0, budgetValue - budgetUsed) : 0;

  const dailySparkline = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const map: { [k: string]: number } = {};
    for (const d of days) map[format(d, 'yyyy-MM-dd')] = 0;
    for (const e of monthlyExpenses) {
      if (!e.date) continue;
      const dateKey = String(e.date).slice(0, 10);
      if (map[dateKey] !== undefined) map[dateKey] += Number(e.amount || 0);
    }
    return days.map(d => ({ date: format(d, 'dd MMM'), value: map[format(d, 'yyyy-MM-dd')] || 0 }));
  }, [monthlyExpenses, currentMonth]);

  useEffect(() => {
    if (!near80ShownRef.current && budgetValue && budgetValue > 0) {
      const percent = (budgetUsed / budgetValue) * 100;
      if (percent >= 80 && percent < 100) {
        toast.custom(() => (
          <div className="rounded-xl bg-white dark:bg-gray-800 p-3 shadow-md flex flex-col gap-1">
            <div className="font-semibold text-red-600">Budget warning</div>
            <div className="text-sm text-red-600">You&apos;ve used {Math.round(percent)}% of your monthly budget.</div>
          </div>
        ));
        near80ShownRef.current = true;
      }
    }
  }, [budgetUsed, budgetValue]);

  const applyPreset = async (value: number) => {
    await persistBudgetAndMaybeGoal(value, goalValue ?? null);
    toast.success(`Budget set to ₹${value}`);
  };

  const saveGoalFromModal = async () => {
    const parsed = parseNumberInput(goalInput);
    if (parsed > 0) {
      setGoalSaving(true);
      try {
        await persistBudgetAndMaybeGoal(budgetValue ?? 0, parsed);
        toast.success('Goal saved');
        setIsGoalModalOpen(false);
      } catch (e) {
        console.error(e);
        toast.error('Failed to save goal');
      } finally {
        setGoalSaving(false);
      }
    } else {
      alert('Enter a valid goal > 0');
    }
  };

  const clearGoal = async () => {
    try {
      if (user?.id) {
        const payload: any = { user_id: user.id, amount_limit: budgetValue ?? null, goal_amount: null };
        await supabase.from(BUDGET_TABLE).upsert(payload, { onConflict: 'user_id' });
      } else {
        const gkey = user?.id ? `goal_${user.id}` : 'goal_anon';
        localStorage.removeItem(gkey);
      }
      setGoalInput('');
      toast.success('Goal cleared');
      setIsGoalModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to clear goal');
    }
  };

  const formatBalance = (amount: number | null) => {
    if (balancesLoading && amount === null) return '...';
    if (amount !== null) return `₹${amount.toFixed(2)}`;
    return '₹0.00';
  };

  const youOweMessage = youOwe !== null && youOwe > 0 ? `Settlement needed` : 'All settled up!';
  const youAreOwedMessage = youAreOwed !== null && youAreOwed > 0 ? `Awaiting repayment` : 'All settled up!';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
        </div>
        <Button asChild>
          <Link to="/add-expense"><Plus className="h-4 w-4 mr-2" />Add Expense</Link>
        </Button>
      </div>

      <DashboardStats 
        loading={loading}
        dateRange={dateRange}
        filteredExpenses={filteredExpenses}
        currentMonthTotal={currentMonthTotal}
        setShowDatePicker={setShowDatePicker}
        youOwe={youOwe}
        youAreOwed={youAreOwed}
        budgetValue={budgetValue}
        monthlySavings={monthlySavings}
        budgetUsed={budgetUsed}
        overBudgetAmount={overBudgetAmount}
        budgetRemaining={budgetRemaining}
        goalValue={goalValue}
        savingsProgressToGoal={savingsProgressToGoal}
        setIsGoalModalOpen={setIsGoalModalOpen}
        clearGoal={clearGoal}
        formatBalance={formatBalance}
        youOweMessage={youOweMessage}
        youAreOwedMessage={youAreOwedMessage}
        showDatePicker={showDatePicker}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        monthlyExpenses={monthlyExpenses}
        handleDateSelect={handleDateSelect}
        sidebarExpenses={sidebarExpenses}
        sidebarTotal={sidebarTotal}
        isCalendarLoading={isCalendarLoading}
        setSidebarExpenses={setSidebarExpenses}
        setDateRange={setDateRange}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          <CategoryChart 
            data={categoryData} 
            loading={categoryLoading} 
            error={categoryError} 
            period={categoryPeriod} 
            setPeriod={setCategoryPeriod} 
          />
          <BudgetCard 
            budget={budget} 
            budgetUsed={budgetUsed} 
            budgetRemaining={budgetRemaining} 
            isEditing={isEditingBudget} 
            setIsEditing={setIsEditingBudget} 
            budgetInput={budgetInput} 
            setBudgetInput={setBudgetInput} 
            onSave={applyPreset} 
            saving={budgetSaving} 
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Spend Trend</CardTitle>
            <p className="text-sm text-muted-foreground">How your spending is distributed across this month</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySparkline}>
                  <defs>
                    <linearGradient id="dailySpendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Tooltip formatter={(v: number) => `₹${v.toFixed(2)}`} labelFormatter={(l) => l} />
                  <Area type="monotone" dataKey="value" stroke="#A78BFA" strokeWidth={2} fill="url(#dailySpendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <GoalModal 
        open={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goalInput={goalInput}
        setGoalInput={setGoalInput}
        onSave={saveGoalFromModal}
        onClear={clearGoal}
        saving={goalSaving}
      />

      <DateRangePickerModal 
        show={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        dateRange={dateRange}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        monthlyExpenses={monthlyExpenses}
        handleDateSelect={handleDateSelect}
        sidebarExpenses={sidebarExpenses}
        sidebarTotal={sidebarTotal}
        isCalendarLoading={isCalendarLoading}
        clearRange={() => { setDateRange({ from: undefined, to: undefined }); setSidebarExpenses([]); }}
        applyRange={() => setShowDatePicker(false)}
      />
    </div>
  );
}

export default Dashboard;
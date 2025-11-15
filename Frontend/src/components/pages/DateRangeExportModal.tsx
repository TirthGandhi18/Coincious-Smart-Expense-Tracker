import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Badge } from '../ui/badge';

interface DateRangeExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock expense data for demonstration
const mockExpenses = [
  {
    id: '1',
    date: '2025-11-01',
    title: 'Grocery Shopping',
    category: 'Food & Dining',
    amount: 125.50,
    type: 'personal',
    description: 'Weekly groceries from Whole Foods'
  },
  {
    id: '2',
    date: '2025-11-03',
    title: 'Uber to Airport',
    category: 'Transportation',
    amount: 45.00,
    type: 'personal',
    description: 'Trip to LAX'
  },
  {
    id: '3',
    date: '2025-11-05',
    title: 'Team Dinner',
    category: 'Food & Dining',
    amount: 180.00,
    type: 'group',
    description: 'Dinner with work team'
  },
  {
    id: '4',
    date: '2025-11-07',
    title: 'Netflix Subscription',
    category: 'Entertainment',
    amount: 15.99,
    type: 'personal',
    description: 'Monthly subscription'
  },
  {
    id: '5',
    date: '2025-11-10',
    title: 'Gas Station',
    category: 'Transportation',
    amount: 60.00,
    type: 'personal',
    description: 'Fill up gas tank'
  },
  {
    id: '6',
    date: '2025-11-12',
    title: 'Coffee Shop',
    category: 'Food & Dining',
    amount: 12.50,
    type: 'personal',
    description: 'Latte and pastry'
  },
  {
    id: '7',
    date: '2025-11-13',
    title: 'Gym Membership',
    category: 'Health & Medical',
    amount: 49.99,
    type: 'personal',
    description: 'Monthly gym fee'
  },
  {
    id: '8',
    date: '2025-10-27',
    title: 'Electricity Bill',
    category: 'Utilities',
    amount: 95.00,
    type: 'personal',
    description: 'October electric bill'
  },
  {
    id: '9',
    date: '2025-10-30',
    title: 'Movie Tickets',
    category: 'Entertainment',
    amount: 28.00,
    type: 'group',
    description: 'Movie with friends'
  }
];

export function DateRangeExportModal({ open, onOpenChange }: DateRangeExportModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10)); // November 2025
  const [startDate, setStartDate] = useState<Date | null>(new Date(2025, 9, 27)); // Oct 27
  const [endDate, setEndDate] = useState<Date | null>(new Date(2025, 10, 13)); // Nov 13

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (!open) return null;

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    // Don't allow selecting future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clickedDate > today) return;

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(clickedDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Set end date
      if (clickedDate < startDate) {
        setEndDate(startDate);
        setStartDate(clickedDate);
      } else {
        setEndDate(clickedDate);
      }
    }
  };

  const isDateInRange = (day: number): boolean => {
    if (!startDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    if (endDate) {
      return date >= startDate && date <= endDate;
    }
    return date.getTime() === startDate.getTime();
  };

  const isStartDate = (day: number): boolean => {
    if (!startDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === startDate.toDateString();
  };

  const isEndDate = (day: number): boolean => {
    if (!endDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === endDate.toDateString();
  };

  const isFutureDate = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const isToday = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate();
    const month = monthNames[date.getMonth()].substring(0, 3);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDaysDifference = (): number => {
    if (!startDate || !endDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const getDaysInMonth = (): number => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (): number => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  };

  const getExpensesInRange = () => {
    if (!startDate || !endDate) return [];

    return mockExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  };

  const getTotalAmount = (): number => {
    return getExpensesInRange().reduce((sum, expense) => sum + expense.amount, 0);
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleExport = () => {
    const expenses = getExpensesInRange();

    if (expenses.length === 0) {
      toast.error('No expenses found in the selected date range');
      return;
    }

    // Prepare data for Excel
    const excelData = expenses.map(expense => ({
      'Date': new Date(expense.date).toLocaleDateString(),
      'Title': expense.title,
      'Category': expense.category,
      'Amount': `$${expense.amount.toFixed(2)}`,
      'Type': expense.type,
      'Description': expense.description
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 25 }, // Title
      { wch: 18 }, // Category
      { wch: 12 }, // Amount
      { wch: 10 }, // Type
      { wch: 40 }  // Description
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

    // Generate filename with date range
    const filename = `expenses_${formatDate(startDate).replace(/ /g, '_')}_to_${formatDate(endDate).replace(/ /g, '_')}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    toast.success(`Exported ${expenses.length} expense${expenses.length > 1 ? 's' : ''} successfully!`);
    onOpenChange(false);
  };

  // Generate calendar days
  const renderCalendarDays = () => {
    const days: JSX.Element[] = [];
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push(
        <div
          key={`prev-${day}`}
          className="h-14 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600"
        >
          {day}
        </div>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const inRange = isDateInRange(day);
      const isStart = isStartDate(day);
      const isEnd = isEndDate(day);
      const isFuture = isFutureDate(day);
      const todayDate = isToday(day);

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={isFuture}
          className={`h-14 flex items-center justify-center text-base font-medium rounded-xl transition-all
            ${isFuture ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'}
            ${todayDate && !isStart && !isEnd ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600' : ''}
            ${inRange && !isStart && !isEnd ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' : ''}
            ${isStart ? 'bg-purple-600 dark:bg-purple-600 text-white hover:bg-purple-700 shadow-lg' : ''}
            ${isEnd ? 'bg-pink-600 dark:bg-pink-600 text-white hover:bg-pink-700 shadow-lg' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    // Next month's leading days
    const totalCells = days.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="h-14 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600"
        >
          {i}
        </div>
      );
    }

    return days;
  };

  const expensesInRange = getExpensesInRange();
  const totalAmount = getTotalAmount();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-300"
        onClick={() => onOpenChange(false)}
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
                {!startDate ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Choose your start date</p>
                ) : !endDate ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-400">From: {formatDate(startDate)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Now choose your end date</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-400">From: {formatDate(startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-pink-600 rounded-full"></div>
                      <span className="text-sm font-medium text-pink-700 dark:text-pink-400">To: {formatDate(endDate)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                      {getDaysDifference()} days selected
                    </p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
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
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={handleNextMonth}
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
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid - LARGER CELLS */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded"></div>
                  <span>In range</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600 rounded"></div>
                  <span>Today</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {startDate ? (endDate ? 'Expenses in Range' : 'Expenses on Date') : 'Select dates'}
                </h4>
                {expensesInRange.length > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {expensesInRange.length} expense{expensesInRange.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      ${totalAmount.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {expensesInRange.length > 0 ? (
                  expensesInRange.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 hover:shadow-lg transition-all border border-purple-200 dark:border-purple-800 group"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {expense.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {expense.category}
                            </p>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                          <span className="text-sm font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                            ${expense.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : startDate ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-medium">No expenses found</p>
                    <p className="text-xs text-gray-400 mt-1">Try selecting a different date range</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium">Click on dates to view expenses</p>
                    <p className="text-xs text-gray-400 mt-1">Select a date range to see expenses</p>
                  </div>
                )}
              </div>

              {/* Instruction hint */}
              {startDate && !endDate && (
                <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 text-center">
                  💡 Click another date to create a range
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClear}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-gray-700 dark:text-gray-300"
            >
              Clear
            </button>
            <button
              onClick={handleExport}
              disabled={!startDate || !endDate || expensesInRange.length === 0}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-lg transition-all font-medium shadow-lg flex items-center justify-center gap-2 border border-white/20"
              >
              <FileDown className="h-4 w-4" />
              Export to Excel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

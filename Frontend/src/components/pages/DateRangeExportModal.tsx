import { useState, useEffect } from 'react';
import { FileDown, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Badge } from '../ui/badge';
import { useAuth } from '../../App';
import { format } from 'date-fns';

interface DateRangeExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Expense {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  type: 'personal' | 'group';
  description?: string;
}

export function DateRangeExportModal({ open, onOpenChange }: DateRangeExportModalProps) {
  const { user, supabase } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Data States
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [rangeExpenses, setRangeExpenses] = useState<Expense[]>([]);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isLoadingRange, setIsLoadingRange] = useState(false);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // --- 1. Fetch Data for the Entire Calendar Month (For Daily Totals) ---
  useEffect(() => {
    if (!open || !user) return;

    const fetchMonthlyData = async () => {
      setIsLoadingMonth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Calculate start and end of the displayed month
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Format as ISO strings for backend
        const startStr = format(firstDay, 'yyyy-MM-dd');
        const endStr = format(lastDay, 'yyyy-MM-dd');

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/expenses/range?start_date=${startStr}&end_date=${endStr}`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          setMonthlyExpenses(data);
        }
      } catch (error) {
        console.error("Error fetching monthly data", error);
      } finally {
        setIsLoadingMonth(false);
      }
    };

    fetchMonthlyData();
  }, [currentMonth, open, user]);

  // --- 2. Fetch Data for the Side Panel (Selected Range) ---
  useEffect(() => {
    if (!open || !user || !startDate) {
        setRangeExpenses([]);
        return;
    }

    const fetchRangeData = async () => {
      setIsLoadingRange(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // If only start date selected, range is that single day
        const effectiveEnd = endDate || startDate;
        
        // Ensure we capture the full day time range
        const startStr = format(startDate, 'yyyy-MM-dd') + 'T00:00:00';
        const endStr = format(effectiveEnd, 'yyyy-MM-dd') + 'T23:59:59';

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/expenses/range?start_date=${startStr}&end_date=${endStr}`,
          { headers: { 'Authorization': `Bearer ${session.access_token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          setRangeExpenses(data);
        }
      } catch (error) {
        toast.error("Failed to load expenses for selected range");
      } finally {
        setIsLoadingRange(false);
      }
    };

    fetchRangeData();
  }, [startDate, endDate, open, user]);

  if (!open) return null;

  // --- Helper Functions ---

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (clickedDate > today) return; // Prevent future selection

    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (clickedDate < startDate) {
        setEndDate(startDate);
        setStartDate(clickedDate);
      } else {
        setEndDate(clickedDate);
      }
    }
  };

  // Helper to get daily total from the monthly dataset
  const getDailyTotal = (day: number) => {
    const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    const dailyItems = monthlyExpenses.filter(exp => {
        if(!exp.date) return false;
        return exp.date.startsWith(dateStr);
    });

    return dailyItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const formatDateLabel = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'dd MMM yyyy');
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    setRangeExpenses([]);
  };

  const handleExport = () => {
    if (rangeExpenses.length === 0) {
      toast.error('No expenses found in the selected date range');
      return;
    }

    const excelData = rangeExpenses.map(expense => ({
      'Date': new Date(expense.date).toLocaleDateString(),
      'Title': expense.title,
      'Category': expense.category,
      'Amount': expense.amount,
      'Type': expense.type,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    
    const startStr = startDate ? format(startDate, 'yyyy-MM-dd') : 'start';
    const filename = `expenses_${startStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Export successful!');
    onOpenChange(false);
  };

  // --- Rendering ---

  const renderCalendarDays = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16" />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0,0,0,0);
      const isFuture = currentDate > today;
      
      // Selection Logic
      const isStart = startDate && currentDate.getTime() === startDate.getTime();
      const isEnd = endDate && currentDate.getTime() === endDate.getTime();
      const isInRange = startDate && endDate && currentDate > startDate && currentDate < endDate;
      const isSelected = isStart || isEnd;

      // Data Logic
      const dailyTotal = getDailyTotal(day);
      const hasData = dailyTotal > 0;

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={isFuture}
          className={`
            h-16 flex flex-col items-center justify-start pt-2 rounded-xl transition-all relative border-2
            ${isFuture ? 'opacity-30 cursor-not-allowed border-transparent' : 'cursor-pointer hover:border-purple-300 dark:hover:border-purple-700'}
            ${!isFuture && !isSelected && !isInRange ? 'border-transparent bg-gray-50 dark:bg-gray-800/50' : ''}
            ${isSelected ? 'bg-purple-600 text-white border-purple-600 shadow-lg z-10' : ''}
            ${isInRange ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 border-purple-200 rounded-none mx-[-2px]' : ''}
          `}
        >
          <span className={`text-sm font-semibold ${!isFuture && !isSelected ? 'text-gray-700 dark:text-gray-300' : ''}`}>
            {day}
          </span>
          
          {/* Daily Total Display (With Rupee) */}
          {hasData && !isFuture && (
            <span className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-purple-100' : 'text-purple-600 dark:text-purple-400'}`}>
              ₹{dailyTotal.toFixed(0)}
            </span>
          )}
        </button>
      );
    }
    return days;
  };

  const totalRangeAmount = rangeExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[9998] animate-in fade-in duration-200 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Export Data</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                   <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                   {startDate ? formatDateLabel(startDate) : 'Select Start'}
                </div>
                <span className="text-gray-300">—</span>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                   <span className="w-2 h-2 rounded-full bg-pink-600"></span>
                   {endDate ? formatDateLabel(endDate) : startDate ? formatDateLabel(startDate) : 'Select End'}
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden grid md:grid-cols-3">
            {/* Left: Calendar */}
            <div className="md:col-span-2 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
               {/* Month Navigation */}
               <div className="flex items-center justify-between mb-6">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">←</button>
                  <h3 className="text-lg font-semibold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">→</button>
               </div>
               
               {/* Weekday Headers */}
               <div className="grid grid-cols-7 gap-2 mb-2">
                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                   <div key={d} className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider">{d}</div>
                 ))}
               </div>

               {/* Calendar Grid */}
               <div className="grid grid-cols-7 gap-2">
                 {renderCalendarDays()}
               </div>
               
               {isLoadingMonth && (
                 <div className="mt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                   <Loader2 className="w-3 h-3 animate-spin" /> Updating totals...
                 </div>
               )}
            </div>

            {/* Right: Expense List (Side Panel) */}
            <div className="bg-gray-50 dark:bg-gray-800/30 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                <div className="flex justify-between items-end mb-1">
                   <span className="text-sm font-medium text-muted-foreground">Total Selected</span>
                   <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">₹{totalRangeAmount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-right text-muted-foreground">
                  {rangeExpenses.length} transactions
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {!startDate ? (
                   <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                     <p>Select a date or range on the calendar to view detailed expenses.</p>
                   </div>
                 ) : isLoadingRange ? (
                   <div className="h-full flex items-center justify-center">
                     <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                   </div>
                 ) : rangeExpenses.length === 0 ? (
                   <div className="text-center py-10 text-muted-foreground">
                     <p>No expenses found for this period.</p>
                   </div>
                 ) : (
                   rangeExpenses.map((exp) => (
                     <div key={exp.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                           <div className="flex-1 min-w-0 pr-2">
                             <h4 className="font-semibold text-sm truncate">{exp.title}</h4>
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] h-5 px-1">{exp.category}</Badge>
                                {exp.type === 'group' && <Badge variant="outline" className="text-[10px] h-5 px-1">Group</Badge>}
                             </div>
                             <p className="text-xs text-gray-400 mt-1">{new Date(exp.date).toLocaleDateString()}</p>
                           </div>
                           <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">₹{exp.amount.toFixed(2)}</span>
                        </div>
                     </div>
                   ))
                 )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 flex gap-3">
                 <button onClick={handleClear} className="flex-1 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Clear</button>
                 <button 
                   onClick={handleExport}
                   disabled={rangeExpenses.length === 0}
                   className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   <FileDown className="w-4 h-4" /> Export
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
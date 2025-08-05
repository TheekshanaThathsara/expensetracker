import { addWeeks, endOfMonth, endOfWeek, format, getWeek, startOfMonth, startOfWeek, subWeeks } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ActivityIndicator, Button, Card, Chip, Divider, IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { CATEGORY_COLORS } from '@/constants/ExpenseCategories';
import { api, Expense, ExpenseSummary } from '@/services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

// Responsive dimensions
const getResponsiveDimensions = (dateRange?: DateRange) => {
  const padding = isSmallScreen ? 12 : isMediumScreen ? 16 : 20;
  let chartWidth = screenWidth - (padding * 4); // Account for card padding and margins
  
  // For month view, calculate width based on number of days to make it scrollable
  if (dateRange === 'month') {
    const daysInMonth = 31; // Maximum days in a month
    const barWidth = isSmallScreen ? 25 : isMediumScreen ? 30 : 35; // Width per bar
    chartWidth = Math.max(screenWidth - (padding * 4), daysInMonth * barWidth + 100); // Ensure minimum scrollable width
  }
  
  const pieChartHeight = isSmallScreen ? 180 : isMediumScreen ? 200 : 220;
  const barChartHeight = isSmallScreen ? 200 : isMediumScreen ? 220 : 240;
  
  return {
    padding,
    chartWidth,
    pieChartHeight,
    barChartHeight,
    fontSize: {
      small: isSmallScreen ? 10 : isMediumScreen ? 12 : 14,
      medium: isSmallScreen ? 12 : isMediumScreen ? 14 : 16,
      large: isSmallScreen ? 14 : isMediumScreen ? 16 : 18,
      xlarge: isSmallScreen ? 18 : isMediumScreen ? 20 : 24,
    }
  };
};

// Default responsive values for styles (will be overridden inside component)
const defaultResponsive = getResponsiveDimensions('week');

type DateRange = 'day' | 'week' | 'month' | 'all';

export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  
  // Calculate responsive dimensions based on current dateRange
  const responsive = getResponsiveDimensions(dateRange);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const [currentDay, setCurrentDay] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [summary, setSummary] = useState<ExpenseSummary>({});
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<{date: string, amount: number}[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showRefreshTime, setShowRefreshTime] = useState(false);
  
  // Pagination state for month view
  const [monthChartPage, setMonthChartPage] = useState(0);
  const daysPerPage = isSmallScreen ? 7 : isMediumScreen ? 10 : 14; // Responsive days per page

  useEffect(() => {
    console.log('=== COMPONENT INITIALIZATION DEBUG ===');
    console.log('Initial dateRange:', dateRange);
    console.log('Initial currentMonth:', currentMonth);
    console.log('Initial currentMonth formatted:', format(currentMonth, 'MMM yyyy'));
    console.log('Today:', new Date());
    console.log('Today formatted:', format(new Date(), 'MMM yyyy'));
    console.log('=== END COMPONENT INITIALIZATION DEBUG ===');
    updateDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    console.log('Current week start changed, updating date range...');
    if (dateRange === 'week') {
      updateDateRange(dateRange);
    }
  }, [currentWeekStart, dateRange]);

  useEffect(() => {
    console.log('Current day changed, updating date range...');
    if (dateRange === 'day') {
      updateDateRange(dateRange);
    }
  }, [currentDay, dateRange]);

  useEffect(() => {
    console.log('Current month changed, updating date range...');
    if (dateRange === 'month') {
      updateDateRange(dateRange);
      // Reset chart page when month changes
      setMonthChartPage(0);
    }
  }, [currentMonth, dateRange]);

  useEffect(() => {
    console.log('Start/End date changed, fetching data...');
    fetchData(false); // Normal fetch, not force refresh
  }, [startDate, endDate]);

  // Refresh data when screen comes into focus (e.g., after adding expense)
  useFocusEffect(
    useCallback(() => {
      console.log('Reports screen focused, refreshing data...');
      console.log('Current state - dateRange:', dateRange, 'startDate:', startDate, 'endDate:', endDate);
      setShowRefreshTime(true);
      // Minimal delay to ensure any pending API calls from expense creation are complete
      setTimeout(() => {
        fetchData(true); // Force refresh when screen is focused
        setTimeout(() => setShowRefreshTime(false), 2000); // Hide after 2 seconds
      }, 200); // Reduced from 500ms to 200ms for faster refresh
    }, [dateRange]) // Only depend on dateRange to avoid stale closures with dates
  );

  const updateDateRange = (range: DateRange) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    console.log('=== updateDateRange DEBUG ===');
    console.log('Updating date range to:', range);
    console.log('Today:', today);

    switch (range) {
      case 'day':
        // For day, show expenses from the selected day
        start = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 0, 0, 0);
        end = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 23, 59, 59);
        console.log('Day calculation - currentDay:', currentDay);
        console.log('Day calculation - start:', start);
        console.log('Day calculation - end:', end);
        break;
      case 'week':
        // Use standard week (Monday to Sunday) based on currentWeekStart state
        start = startOfWeek(currentWeekStart, { weekStartsOn: 1 }); // Monday = 1
        end = endOfWeek(currentWeekStart, { weekStartsOn: 1 }); // Sunday
        console.log('Week calculation - currentWeekStart:', currentWeekStart);
        console.log('Week calculation - calculated start (Monday):', start);
        console.log('Week calculation - calculated end (Sunday):', end);
        console.log('Week calculation - start formatted:', format(start, 'yyyy-MM-dd'));
        console.log('Week calculation - end formatted:', format(end, 'yyyy-MM-dd'));
        break;
      case 'month':
        // For month, show the selected month
        start = startOfMonth(currentMonth);
        end = endOfMonth(currentMonth);
        console.log('Month calculation - currentMonth:', currentMonth);
        console.log('Month calculation - start:', start);
        console.log('Month calculation - end:', end);
        console.log('Month calculation - start formatted:', format(start, 'yyyy-MM-dd HH:mm:ss'));
        console.log('Month calculation - end formatted:', format(end, 'yyyy-MM-dd HH:mm:ss'));
        console.log('Month calculation - current month name:', format(currentMonth, 'MMM yyyy'));
        console.log('Month calculation - days in month:', format(end, 'dd'));
        break;
      case 'all':
        // For "all", show last 30 days for better performance and relevance
        start = new Date(today);
        start.setDate(today.getDate() - 29); // Go back 29 days to include today as 30th day
        start.setHours(0, 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      default:
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    }

    console.log('Calculated start date:', start);
    console.log('Calculated end date:', end);
    console.log('Date range in days:', Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    console.log('=== END updateDateRange DEBUG ===');

    setStartDate(start);
    setEndDate(end);
  };

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('=== fetchData DEBUG ===');
      console.log('Fetching data for date range:', dateRange);
      console.log('Force refresh:', forceRefresh);
      console.log('Start date:', startDate.toISOString());
      console.log('End date:', endDate.toISOString());
      console.log('Date range span:', Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)), 'days');
      
      // If this is a force refresh (after adding expense), add a small delay to ensure database consistency
      if (forceRefresh) {
        console.log('🔄 Force refresh detected - brief wait for database sync...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1 second to 500ms
      }
      
      // Debug current week calculation
      if (dateRange === 'week') {
        const today = new Date();
        const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const todayWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
        console.log('🗓️ CURRENT WEEK DEBUG:');
        console.log('Today:', today.toISOString());
        console.log('Today formatted:', format(today, 'yyyy-MM-dd EEEE'));
        console.log('Current week start (Monday):', todayWeekStart.toISOString());
        console.log('Current week end (Sunday):', todayWeekEnd.toISOString());
        console.log('Selected currentWeekStart state:', currentWeekStart.toISOString());
        console.log('Request start date:', startDate.toISOString());
        console.log('Request end date:', endDate.toISOString());
      }
      
      // Always use comprehensive data fetching strategy for consistent results
      console.log('🔍 COMPREHENSIVE DATA FETCH STRATEGY:');
      console.log('Fetching all expenses for comprehensive filtering...');
      
      // Fetch all expenses first for comprehensive data
      const allExpensesResponse = await api.getExpensesByDateRange(
        new Date('2020-01-01'), // Very old start date
        new Date(new Date().getTime() + 24 * 60 * 60 * 1000) // Tomorrow
      );
      
      console.log('All expenses fetched:', allExpensesResponse.length);
      
      // Filter for the specific date range
      let expensesData = allExpensesResponse.filter((expense: any) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
      
      console.log('Expenses filtered for date range:', expensesData.length);
      
      // Generate summary from filtered expenses
      let data: ExpenseSummary = {};
      expensesData.forEach((expense: any) => {
        if (data[expense.category]) {
          data[expense.category] += expense.amount;
        } else {
          data[expense.category] = expense.amount;
        }
      });
      
      console.log('🔍 COMPREHENSIVE API RESPONSE DEBUG:');
      console.log('API called with start date:', startDate.toISOString(), '(', format(startDate, 'yyyy-MM-dd HH:mm:ss'), ')');
      console.log('API called with end date:', endDate.toISOString(), '(', format(endDate, 'yyyy-MM-dd HH:mm:ss'), ')');
      console.log('Summary data keys:', Object.keys(data));
      console.log('Summary data values:', Object.values(data));
      console.log('Total from summary:', Object.values(data).reduce((sum: number, value: number) => sum + value, 0));
      console.log('Expenses data count:', expensesData.length);
      console.log('Total from expenses:', expensesData.reduce((sum: number, expense: any) => sum + expense.amount, 0));
      console.log('Expenses data sample:', expensesData.slice(0, 5).map((exp: any) => ({ 
        id: exp.id, 
        date: exp.date, 
        amount: exp.amount, 
        category: exp.category,
        title: exp.title
      })));
      
      // If we're in month view, log all expenses with their dates for debugging
      if (dateRange === 'month') {
        console.log('🗓️ MONTH VIEW - All expenses returned by comprehensive fetch:');
        expensesData.forEach((expense: any, index: number) => {
          console.log(`${index + 1}. ${format(new Date(expense.date), 'yyyy-MM-dd')} - ${expense.amount} LKR (${expense.category}) - ${expense.title || 'No title'}`);
        });
      }
      
      // Apply specific filtering based on date range type for extra precision
      if (dateRange === 'day') {
        console.log('Day tab - filtering for selected day:', format(currentDay, 'yyyy-MM-dd'));
        expensesData = expensesData.filter((expense: any) => {
          const expenseDate = new Date(expense.date);
          const selectedDate = new Date(currentDay);
          
          // Compare dates only (year, month, day) - ignore time
          const expenseDateStr = format(expenseDate, 'yyyy-MM-dd');
          const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
          
          return expenseDateStr === selectedDateStr;
        });
        
        // Recalculate summary for day
        data = {};
        expensesData.forEach((expense: any) => {
          data[expense.category] = (data[expense.category] || 0) + expense.amount;
        });
        
        console.log('Day expenses after filtering:', expensesData.length);
      } else if (dateRange === 'week') {
        console.log('Week tab - filtering for selected week:', format(startDate, 'MMM dd'), '-', format(endDate, 'MMM dd, yyyy'));
        // Week filtering is already done by date range, but ensure precision
        expensesData = expensesData.filter((expense: any) => {
          const expenseDate = new Date(expense.date);
          const expenseDateStart = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate());
          const startDateStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endDateStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          
          return expenseDateStart >= startDateStart && expenseDateStart <= endDateStart;
        });
        
        // Recalculate summary for week
        data = {};
        expensesData.forEach((expense: any) => {
          data[expense.category] = (data[expense.category] || 0) + expense.amount;
        });
        
        console.log('Week expenses after filtering:', expensesData.length);
      } else if (dateRange === 'month') {
        console.log('Month tab - filtering for selected month:', format(currentMonth, 'MMM yyyy'));
        expensesData = expensesData.filter((expense: any) => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getFullYear() === currentMonth.getFullYear() && 
                 expenseDate.getMonth() === currentMonth.getMonth();
        });
        
        // Recalculate summary for month
        data = {};
        expensesData.forEach((expense: any) => {
          data[expense.category] = (data[expense.category] || 0) + expense.amount;
        });
        
        console.log('Month expenses after filtering:', expensesData.length);
      }
      
      // Debug logging for specific date ranges
      if (dateRange === 'week') {
        console.log('🗓️ WEEK DEBUG:');
        console.log('Requested week range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
        console.log('Final week expenses:', expensesData.length);
        expensesData.forEach((expense: any, index: number) => {
          console.log(`Week expense ${index + 1}: ${expense.date} - ${formatCurrency(expense.amount)} (${expense.category})`);
        });
      }
      
      setSummary(data);
      setExpenses(expensesData);
      console.log('Final expenses data set in state:', expensesData.length, 'expenses');
      console.log('Final summary data set in state:', Object.keys(data).length, 'categories');
      
      // Final validation: Log all expenses with their dates for debugging
      if (expensesData.length > 0) {
        console.log('📋 FINAL EXPENSE LIST:');
        expensesData.forEach((expense: any, index: number) => {
          console.log(`${index + 1}. ${format(new Date(expense.date), 'yyyy-MM-dd EEEE')} - ${formatCurrency(expense.amount)} (${expense.category}) - ${expense.title || 'No title'}`);
        });
        
        // Validate that expenses match the current date range
        const expenseInRange = expensesData.filter((expense: any) => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startDate && expenseDate <= endDate;
        });
        
        console.log(`📊 Expenses in range ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}: ${expenseInRange.length}/${expensesData.length}`);
        
        if (expenseInRange.length !== expensesData.length) {
          console.warn('⚠️ WARNING: Some expenses are outside the selected date range!');
        }
        
        console.log('First expense sample:', expensesData[0]);
        console.log('First expense date type:', typeof expensesData[0].date);
        console.log('First expense date value:', expensesData[0].date);
        console.log('First expense date as Date object:', new Date(expensesData[0].date));
      } else {
        console.log('📋 No expenses found for the selected period');
        console.log('Selected date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
        console.log('Date range type:', dateRange);
      }
      
      // Calculate daily expenses
      const dailyData = calculateDailyExpenses(expensesData, startDate, endDate);
      setDailyExpenses(dailyData);
      console.log('Final daily expenses set in state:', dailyData);
      
      const total = Object.values(data).reduce((sum, value) => sum + value, 0);
      setTotalAmount(total);
      setLastRefresh(new Date());
      console.log('Total amount calculated:', total);
      console.log('Data refreshed at:', new Date().toLocaleTimeString());
      console.log('=== END fetchData DEBUG ===');
    } catch (error) {
      console.error('Error fetching expense summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyExpenses = (expenses: Expense[], start: Date, end: Date) => {
    console.log('=== calculateDailyExpenses DEBUG ===');
    console.log('dateRange:', dateRange);
    console.log('expenses count:', expenses.length);
    console.log('start date:', start);
    console.log('end date:', end);
    
    if (expenses.length > 0) {
      console.log('All expense dates for debugging:', expenses.map(e => ({
        original: e.date,
        parsed: new Date(e.date),
        amount: e.amount,
        category: e.category
      })));
    }
    
    // If we have no expenses at all, return empty
    if (expenses.length === 0) {
      console.log('No expenses available at all');
      return [];
    }
    
    // For debugging, let's try a more inclusive approach first
    let result: {date: string, amount: number}[] = [];
    
    if (dateRange === 'day') {
      // For day view, show expenses only from the selected day
      const dayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        const selectedDate = new Date(currentDay);
        
        // Compare dates only (year, month, day) - ignore time
        const expenseDateStr = format(expenseDate, 'yyyy-MM-dd');
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        
        console.log(`Checking expense: ${expenseDateStr} vs selected: ${selectedDateStr}`);
        return expenseDateStr === selectedDateStr;
      });
      
      console.log(`Day view - found ${dayExpenses.length} expenses for ${format(currentDay, 'yyyy-MM-dd')}`);
      
      if (dayExpenses.length > 0) {
        const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        result = [{
          date: format(currentDay, 'MMM dd'),
          amount: totalAmount
        }];
        console.log('Day view - showing expenses for selected date:', totalAmount);
      } else {
        result = [{
          date: format(currentDay, 'MMM dd'),
          amount: 0
        }];
        console.log('Day view - no expenses found for selected date');
      }
    } else if (dateRange === 'week') {
      // Group expenses by day for the week (Monday to Sunday)
      // Only include expenses that fall within the selected week range
      const expensesByDay: { [key: string]: number } = {};
      
      console.log('Processing week expenses for range:', format(start, 'yyyy-MM-dd'), 'to', format(end, 'yyyy-MM-dd'));
      
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        // Check if expense falls within the selected week range
        // Note: Convert to start of day for proper comparison
        const expenseDateStart = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate());
        const startDateStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDateStart = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        
        if (expenseDateStart >= startDateStart && expenseDateStart <= endDateStart) {
          const dayKey = format(expenseDate, 'EEE'); // Mon, Tue, etc.
          expensesByDay[dayKey] = (expensesByDay[dayKey] || 0) + expense.amount;
          console.log(`✅ Expense INCLUDED: ${format(expenseDate, 'yyyy-MM-dd')} (${dayKey}): LKR ${expense.amount}`);
        } else {
          console.log(`❌ Expense EXCLUDED: ${format(expenseDate, 'yyyy-MM-dd')} is outside week range ${format(startDateStart, 'yyyy-MM-dd')} to ${format(endDateStart, 'yyyy-MM-dd')}`);
        }
      });
      
      // Create result for all days of week in standard order (Monday to Sunday)
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      result = weekDays.map(day => ({
        date: day,
        amount: expensesByDay[day] || 0
      }));
      
      console.log('Week view - expenses by day:', expensesByDay);
      console.log('Week view - final result:', result);
      console.log('Week range being processed:', format(start, 'yyyy-MM-dd'), 'to', format(end, 'yyyy-MM-dd'));
      
      // Show the actual data for the week (including zero amounts for days with no expenses)
      const totalWeekExpenses = result.reduce((sum, day) => sum + day.amount, 0);
      console.log('Total expenses for this week:', totalWeekExpenses);
      
      if (totalWeekExpenses === 0) {
        console.log('No expenses found for the selected week - showing empty chart');
      } else {
        console.log('Found expenses for the selected week - showing actual data');
      }
    } else if (dateRange === 'month') {
      // Group expenses by day of month for the selected month
      const expensesByDay: { [key: string]: number } = {};
      
      console.log('Month calculation - Processing expenses for:', format(currentMonth, 'MMM yyyy'));
      console.log('Month calculation - Total expenses to process:', expenses.length);
      
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        console.log('Month calculation - Processing expense:', format(expenseDate, 'yyyy-MM-dd'), 'Amount:', expense.amount);
        
        // Only include expenses from the selected month
        if (expenseDate.getFullYear() === currentMonth.getFullYear() && 
            expenseDate.getMonth() === currentMonth.getMonth()) {
          const dayNum = expenseDate.getDate(); // Get actual day number (1-31)
          const dayKey = dayNum.toString().padStart(2, '0'); // Format as 01, 02, etc.
          expensesByDay[dayKey] = (expensesByDay[dayKey] || 0) + expense.amount;
          console.log('Month calculation - Added to day', dayKey, ':', expense.amount, 'Total for day:', expensesByDay[dayKey]);
        } else {
          console.log('Month calculation - Skipped expense (wrong month):', format(expenseDate, 'yyyy-MM-dd'));
        }
      });
      
      // Get selected month's days
      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      console.log('Month calculation - Days in month:', daysInMonth);
      
      result = Array.from({length: daysInMonth}, (_, i) => {
        const dayNum = (i + 1).toString().padStart(2, '0');
        const amount = expensesByDay[dayNum] || 0;
        return {
          date: dayNum,
          amount: amount
        };
      });
      
      console.log('Month view - expenses by day for', format(currentMonth, 'MMM yyyy'), ':', expensesByDay);
      console.log('Month view - final result array length:', result.length);
      console.log('Month view - first 5 days:', result.slice(0, 5));
    } else if (dateRange === 'all') {
      // Group expenses by date
      const expensesByDate: { [key: string]: number } = {};
      
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const dateKey = format(expenseDate, 'MM/dd');
        expensesByDate[dateKey] = (expensesByDate[dateKey] || 0) + expense.amount;
      });
      
      // Show only dates that have expenses
      result = Object.entries(expensesByDate).map(([date, amount]) => ({
        date,
        amount
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      console.log('All view - expenses by date:', expensesByDate);
    }
    
    console.log('Final result:', result);
    console.log('Days with expenses:', result.filter(r => r.amount > 0));
    console.log('=== END calculateDailyExpenses DEBUG ===');
    
    return result;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-LK', {
      style: 'currency',
      currency: 'LKR'
    });
  };

  const getPieChartData = () => {
    return Object.entries(summary).map(([category, amount]) => {
      const color = Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, category) 
        ? CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
        : CATEGORY_COLORS.Other;
        
      return {
        name: category,
        amount,
        color,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      };
    });
  };

  const getBarChartData = () => {
    console.log('=== getBarChartData DEBUG ===');
    console.log('dateRange:', dateRange);
    console.log('dailyExpenses length:', dailyExpenses.length);
    console.log('dailyExpenses data:', dailyExpenses);
    console.log('Total expenses available:', expenses.length);
    console.log('Current month:', format(currentMonth, 'MMM yyyy'));
    
    // Always return valid data structure
    let labels: string[] = [];
    let data: number[] = [];
    
    if (dailyExpenses.length === 0) {
      console.log('No daily expenses calculated, providing fallback based on date range');
      
      // For week tab, always show empty week structure if no daily expenses calculated
      if (dateRange === 'week') {
        console.log('Week tab: No daily expenses calculated, showing empty week structure');
        const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        labels = weekDays;
        data = [0, 0, 0, 0, 0, 0, 0];
        console.log('Week tab empty structure - labels:', labels);
        console.log('Week tab empty structure - data:', data);
      } else if (dateRange === 'month') {
        console.log('Month tab: No daily expenses, generating month structure from current month');
        // Generate month structure even if no dailyExpenses calculated
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        console.log('Days in current month:', daysInMonth);
        
        labels = Array.from({length: daysInMonth}, (_, i) => (i + 1).toString().padStart(2, '0'));
        data = Array.from({length: daysInMonth}, () => 0);
        
        // Try to populate from expenses directly if dailyExpenses is empty
        if (expenses.length > 0) {
          console.log('Trying to populate month data directly from expenses');
          const expensesByDay: { [key: string]: number } = {};
          
          expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            console.log('Processing expense for month fallback:', format(expenseDate, 'yyyy-MM-dd'), expense.amount);
            
            if (expenseDate.getFullYear() === currentMonth.getFullYear() && 
                expenseDate.getMonth() === currentMonth.getMonth()) {
              const dayNum = expenseDate.getDate();
              const dayKey = dayNum.toString().padStart(2, '0');
              expensesByDay[dayKey] = (expensesByDay[dayKey] || 0) + expense.amount;
              console.log('Added to month fallback day', dayKey, ':', expense.amount);
            }
          });
          
          // Update data array with actual expenses
          data = labels.map(dayKey => expensesByDay[dayKey] || 0);
          console.log('Month fallback data populated:', data.slice(0, 10)); // Show first 10 days
        }
      } else if (expenses.length > 0) {
        // General fallback for other tabs (not week or month, since they are handled above)
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        console.log('Found expenses, total amount:', totalAmount);
        
        labels = ['All Data'];
        data = [totalAmount];
      } else {
        console.log('No expenses at all, using zero fallback');
        // Provide appropriate empty structure based on date range
        // Using explicit type annotation to avoid TypeScript narrowing issues
        const currentDateRange: string = dateRange;
        if (currentDateRange === 'month') {
          const monthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
          labels = Array.from({length: monthDays}, (_, i) => (i + 1).toString().padStart(2, '0'));
          data = Array.from({length: monthDays}, () => 0);
        } else if (currentDateRange === 'week') {
          labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          data = [0, 0, 0, 0, 0, 0, 0];
        } else {
          labels = ['No Data'];
          data = [0];
        }
      }
    } else {
      console.log('Using calculated daily expenses data');
      labels = dailyExpenses.map(item => item.date);
      data = dailyExpenses.map(item => item.amount);
      
      // Ensure we have at least some labels and data
      if (labels.length === 0) {
        labels = ['No Data'];
        data = [0];
      }
      
      console.log('Chart labels:', labels);
      console.log('Chart data values:', data);
      
      // Check if we have any non-zero data
      const totalExpenses = data.reduce((sum, amount) => sum + amount, 0);
      const hasRealData = totalExpenses > 0;
      console.log('Total expenses in chart:', totalExpenses);
      console.log('Has real data:', hasRealData);
    }
    
    // Ensure data array has at least one non-negative value for chart rendering
    data = data.map(value => Math.max(0, value || 0));
    
    const result = {
      labels: labels,
      datasets: [{ data: data }]
    };
    
    console.log('Final chart data structure:');
    console.log('- Labels length:', result.labels.length);
    console.log('- Data length:', result.datasets[0].data.length);
    console.log('- First 5 labels:', result.labels.slice(0, 5));
    console.log('- First 5 data points:', result.datasets[0].data.slice(0, 5));
    console.log('=== END getBarChartData DEBUG ===');
    return result;
  };

  // Get paginated month chart data for better mobile responsiveness
  const getPaginatedMonthChartData = () => {
    const fullData = getBarChartData();
    const allLabels = fullData.labels;
    const allData = fullData.datasets[0].data;
    
    console.log('=== getPaginatedMonthChartData DEBUG ===');
    console.log('DateRange:', dateRange);
    console.log('Full data labels:', allLabels);
    console.log('Full data values:', allData);
    console.log('Current month chart page:', monthChartPage);
    console.log('Days per page:', daysPerPage);
    
    if (dateRange !== 'month') {
      console.log('Not month view, returning full data with pagination info');
      return {
        ...fullData,
        pagination: {
          currentPage: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
          startDay: 1,
          endDay: allLabels.length,
          totalDays: allLabels.length
        }
      };
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(allLabels.length / daysPerPage);
    const startIndex = monthChartPage * daysPerPage;
    const endIndex = Math.min(startIndex + daysPerPage, allLabels.length);
    
    console.log('Month pagination calculation:');
    console.log('- Total pages:', totalPages);
    console.log('- Start index:', startIndex);
    console.log('- End index:', endIndex);
    console.log('- Current page:', monthChartPage);
    
    // Get current page data
    const pageLabels = allLabels.slice(startIndex, endIndex);
    const pageData = allData.slice(startIndex, endIndex);
    
    console.log('Paginated data:');
    console.log('- Page labels:', pageLabels);
    console.log('- Page data:', pageData);
    console.log('- Page data length:', pageData.length);
    
    const result = {
      labels: pageLabels,
      datasets: [{ data: pageData }],
      pagination: {
        currentPage: monthChartPage,
        totalPages: totalPages,
        hasNext: monthChartPage < totalPages - 1,
        hasPrev: monthChartPage > 0,
        startDay: startIndex + 1,
        endDay: endIndex,
        totalDays: allLabels.length
      }
    };
    
    console.log('Final pagination result:', result.pagination);
    console.log('=== END getPaginatedMonthChartData DEBUG ===');
    
    return result;
  };

  // Navigate month chart pages
  const navigateMonthChart = (direction: 'prev' | 'next') => {
    if (dateRange !== 'month') return;
    
    console.log('=== navigateMonthChart DEBUG ===');
    console.log('Direction:', direction);
    console.log('Current page before:', monthChartPage);
    
    const fullData = getBarChartData();
    const totalPages = Math.ceil(fullData.labels.length / daysPerPage);
    
    console.log('Total labels:', fullData.labels.length);
    console.log('Days per page:', daysPerPage);
    console.log('Total pages:', totalPages);
    
    if (direction === 'prev' && monthChartPage > 0) {
      const newPage = monthChartPage - 1;
      console.log('Moving to previous page:', newPage);
      setMonthChartPage(newPage);
    } else if (direction === 'next' && monthChartPage < totalPages - 1) {
      const newPage = monthChartPage + 1;
      console.log('Moving to next page:', newPage);
      setMonthChartPage(newPage);
    } else {
      console.log('Cannot navigate - at boundary or invalid direction');
      console.log('Can go prev:', monthChartPage > 0);
      console.log('Can go next:', monthChartPage < totalPages - 1);
    }
    console.log('=== END navigateMonthChart DEBUG ===');
  };

  // Reset month chart page when month changes
  const resetMonthChartPage = () => {
    setMonthChartPage(0);
  };

  // Get the primary color for the highest amount range in current data
  const getChartPrimaryColor = () => {
    const chartData = getBarChartData();
    const dataValues = chartData.datasets[0].data;
    
    // For mixed amounts, use a gradient or the most dominant color
    const colorCounts = { green: 0, yellow: 0, red: 0 };
    
    dataValues.forEach(amount => {
      if (amount > 1000) {
        colorCounts.red++;
      } else if (amount >= 500) {
        colorCounts.yellow++;
      } else if (amount > 0) {
        colorCounts.green++;
      }
    });
    
    // Return the most common color, or red if there's a tie (highest priority)
    if (colorCounts.red > 0) {
      return '#F44336'; // Solid Red
    } else if (colorCounts.yellow > 0) {
      return '#FFC107'; // Solid Yellow 
    } else if (colorCounts.green > 0) {
      return '#4CAF50'; // Solid Green
    } else {
      return '#4568DC'; // Solid Default blue
    }
  };

  // Get multiple datasets for different color ranges
  const getColoredBarChartData = () => {
    const baseData = getBarChartData();
    const allAmounts = baseData.datasets[0].data;
    
    // Separate data into color ranges
    const yellowData = allAmounts.map(amount => amount > 0 && amount < 500 ? amount : 0);
    const orangeData = allAmounts.map(amount => amount >= 500 && amount <= 1000 ? amount : 0);
    const redData = allAmounts.map(amount => amount > 1000 ? amount : 0);
    
    return {
      labels: baseData.labels,
      datasets: [
        {
          data: yellowData,
          color: () => '#4CAF50', // Green
        },
        {
          data: orangeData,
          color: () => '#FFC107', // Yellow
        },
        {
          data: redData,
          color: () => '#F44336', // Red
        }
      ]
    };
  };

  // Helper function to get bar color based on expense amount
  const getBarColor = (amount: number) => {
    if (amount === 0) {
      return '#E0E0E0'; // Light gray for zero amounts
    } else if (amount < 500) {
      return '#4CAF50'; // Green for < LKR 500
    } else if (amount >= 500 && amount <= 1000) {
      return '#FFC107'; // Yellow for LKR 500-1000
    } else {
      return '#F44336'; // Red for > LKR 1000
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    console.log('=== navigateWeek DEBUG ===');
    console.log('Current week start before:', currentWeekStart);
    console.log('Direction:', direction);
    
    if (direction === 'prev') {
      const newWeekStart = subWeeks(currentWeekStart, 1);
      console.log('New week start (prev):', newWeekStart);
      setCurrentWeekStart(newWeekStart);
    } else {
      const newWeekStart = addWeeks(currentWeekStart, 1);
      console.log('New week start (next):', newWeekStart);
      setCurrentWeekStart(newWeekStart);
    }
    console.log('=== END navigateWeek DEBUG ===');
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    console.log('=== navigateDay DEBUG ===');
    console.log('Current day before:', currentDay);
    console.log('Direction:', direction);
    
    if (direction === 'prev') {
      const newDay = new Date(currentDay);
      newDay.setDate(currentDay.getDate() - 1);
      console.log('New day (prev):', newDay);
      setCurrentDay(newDay);
    } else {
      const newDay = new Date(currentDay);
      newDay.setDate(currentDay.getDate() + 1);
      console.log('New day (next):', newDay);
      setCurrentDay(newDay);
    }
    console.log('=== END navigateDay DEBUG ===');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    console.log('=== navigateMonth DEBUG ===');
    console.log('Current month before:', currentMonth);
    console.log('Direction:', direction);
    
    if (direction === 'prev') {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(currentMonth.getMonth() - 1);
      console.log('New month (prev):', newMonth);
      setCurrentMonth(newMonth);
    } else {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(currentMonth.getMonth() + 1);
      console.log('New month (next):', newMonth);
      setCurrentMonth(newMonth);
    }
    console.log('=== END navigateMonth DEBUG ===');
  };

  const goToCurrentWeek = () => {
    console.log('=== goToCurrentWeek DEBUG ===');
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    console.log('Going to current week:', currentWeek);
    setCurrentWeekStart(currentWeek);
    console.log('=== END goToCurrentWeek DEBUG ===');
  };

  const goToCurrentDay = () => {
    console.log('=== goToCurrentDay DEBUG ===');
    const today = new Date();
    console.log('Going to current day:', today);
    setCurrentDay(today);
    console.log('=== END goToCurrentDay DEBUG ===');
  };

  const goToCurrentMonth = () => {
    console.log('=== goToCurrentMonth DEBUG ===');
    const thisMonth = new Date();
    console.log('Going to current month:', thisMonth);
    console.log('Current month formatted:', format(thisMonth, 'MMM yyyy'));
    console.log('Current month year:', thisMonth.getFullYear());
    console.log('Current month month (0-based):', thisMonth.getMonth());
    console.log('Current month month name:', format(thisMonth, 'MMMM'));
    setCurrentMonth(thisMonth);
    console.log('=== END goToCurrentMonth DEBUG ===');
  };

  const weekButtonText = useMemo(() => {
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const selectedWeek = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
    
    console.log('=== weekButtonText useMemo DEBUG ===');
    console.log('Current week (today):', currentWeek);
    console.log('Selected week (currentWeekStart):', selectedWeek);
    console.log('Current week start state:', currentWeekStart);
    
    // Get week numbers
    const currentWeekNumber = getWeek(currentWeek, { weekStartsOn: 1 });
    const selectedWeekNumber = getWeek(selectedWeek, { weekStartsOn: 1 });
    
    console.log('Current week number:', currentWeekNumber);
    console.log('Selected week number:', selectedWeekNumber);
    
    // Check if selected week is the current week (compare dates only, not time)
    const currentWeekDate = format(currentWeek, 'yyyy-MM-dd');
    const selectedWeekDate = format(selectedWeek, 'yyyy-MM-dd');
    const isCurrentWeek = currentWeekDate === selectedWeekDate;
    
    console.log('Current week date:', currentWeekDate);
    console.log('Selected week date:', selectedWeekDate);
    console.log('Is current week?', isCurrentWeek);
    
    let buttonText;
    if (isCurrentWeek) {
      buttonText = `Week ${currentWeekNumber} (Current)`;
    } else {
      buttonText = `Week ${selectedWeekNumber}`;
    }
    
    console.log('Button text:', buttonText);
    console.log('=== END weekButtonText useMemo DEBUG ===');
    
    return buttonText;
  }, [currentWeekStart]);

  const dayButtonText = useMemo(() => {
    const today = new Date();
    const selectedDay = currentDay;
    
    // Check if selected day is today
    const todayDate = format(today, 'yyyy-MM-dd');
    const selectedDayDate = format(selectedDay, 'yyyy-MM-dd');
    const isToday = todayDate === selectedDayDate;
    
    let buttonText;
    if (isToday) {
      buttonText = `${format(selectedDay, 'MMM dd')} (Today)`;
    } else {
      buttonText = format(selectedDay, 'MMM dd, yyyy');
    }
    
    return buttonText;
  }, [currentDay]);

  const monthButtonText = useMemo(() => {
    const thisMonth = new Date();
    const selectedMonth = currentMonth;
    
    // Check if selected month is this month
    const thisMonthKey = format(thisMonth, 'yyyy-MM');
    const selectedMonthKey = format(selectedMonth, 'yyyy-MM');
    const isThisMonth = thisMonthKey === selectedMonthKey;
    
    let buttonText;
    if (isThisMonth) {
      buttonText = `${format(selectedMonth, 'MMM yyyy')} (Current)`;
    } else {
      buttonText = format(selectedMonth, 'MMM yyyy');
    }
    
    return buttonText;
  }, [currentMonth]);

  const getWeekButtonText = () => {
    return weekButtonText;
  };

  const getDayButtonText = () => {
    return dayButtonText;
  };

  const getMonthButtonText = () => {
    return monthButtonText;
  };

  const renderDateRangeText = () => {
    if (dateRange === 'day') {
      return `Day: ${format(currentDay, 'MMM dd, yyyy')}`;
    } else if (dateRange === 'week') {
      const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      return `Week: ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
    } else if (dateRange === 'month') {
      return `Month: ${format(currentMonth, 'MMM yyyy')}`;
    }
    return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#5C6BC0', '#3949AB', '#283593']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Expense Reports</Text>
          <Text style={styles.headerSubtitle}>Analyze your spending habits</Text>
        </LinearGradient>
      </View>

      {/* Refresh Indicator */}
      {showRefreshTime && (
        <Card style={styles.refreshIndicator} mode="outlined">
          <Card.Content style={styles.refreshContent}>
            <Text style={styles.refreshText}>
              📊 Reports updated at {format(lastRefresh, 'h:mm:ss a')}
            </Text>
          </Card.Content>
        </Card>
      )}

      <View style={styles.content}>
        <Card style={styles.filterCard} mode="elevated">
          <Card.Content>
            <SegmentedButtons
              value={dateRange}
              onValueChange={(value) => setDateRange(value as DateRange)}
              buttons={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'all', label: 'All' },
              ]}
              style={styles.segmentedButtons}
            />
            
            {/* Day Navigation Controls */}
            {dateRange === 'day' && (
              <View style={styles.weekNavigationContainer}>
                <IconButton
                  icon="chevron-left"
                  mode="outlined"
                  onPress={() => navigateDay('prev')}
                  style={styles.weekNavButton}
                />
                <Button
                  mode="outlined"
                  onPress={goToCurrentDay}
                  style={styles.currentWeekButton}
                  compact
                >
                  {getDayButtonText()}
                </Button>
                <IconButton
                  icon="chevron-right"
                  mode="outlined"
                  onPress={() => navigateDay('next')}
                  style={styles.weekNavButton}
                />
              </View>
            )}
            
            {/* Week Navigation Controls */}
            {dateRange === 'week' && (
              <View style={styles.weekNavigationContainer}>
                <IconButton
                  icon="chevron-left"
                  mode="outlined"
                  onPress={() => navigateWeek('prev')}
                  style={styles.weekNavButton}
                />
                <Button
                  mode="outlined"
                  onPress={goToCurrentWeek}
                  style={styles.currentWeekButton}
                  compact
                >
                  {getWeekButtonText()}
                </Button>
                <IconButton
                  icon="chevron-right"
                  mode="outlined"
                  onPress={() => navigateWeek('next')}
                  style={styles.weekNavButton}
                />
              </View>
            )}
            
            {/* Month Navigation Controls */}
            {dateRange === 'month' && (
              <View style={styles.weekNavigationContainer}>
                <IconButton
                  icon="chevron-left"
                  mode="outlined"
                  onPress={() => navigateMonth('prev')}
                  style={styles.weekNavButton}
                />
                <Button
                  mode="outlined"
                  onPress={goToCurrentMonth}
                  style={styles.currentWeekButton}
                  compact
                >
                  {getMonthButtonText()}
                </Button>
                <IconButton
                  icon="chevron-right"
                  mode="outlined"
                  onPress={() => navigateMonth('next')}
                  style={styles.weekNavButton}
                />
              </View>
            )}
            
            <Chip 
              style={styles.dateRangeChip}
              icon="calendar"
              mode="outlined"
              elevated
            >
              {renderDateRangeText()}
            </Chip>
            
            {/* Debug pagination button for month view */}
            {dateRange === 'month' && (
              <>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    console.log('=== MONTH DEBUG INFO ===');
                    console.log('Current month:', format(currentMonth, 'MMM yyyy'));
                    console.log('Current month chart page:', monthChartPage);
                    console.log('Days per page:', daysPerPage);
                    console.log('Total expenses in state:', expenses.length);
                    console.log('Daily expenses length:', dailyExpenses.length);
                    
                    const chartData = getBarChartData();
                    console.log('Chart data labels length:', chartData.labels.length);
                    console.log('Chart data first 10 labels:', chartData.labels.slice(0, 10));
                    console.log('Chart data first 10 values:', chartData.datasets[0].data.slice(0, 10));
                    
                    const paginatedData = getPaginatedMonthChartData();
                    console.log('Paginated data:', paginatedData.pagination);
                    
                    // Log all expenses for current month
                    console.log('All expenses currently in state:');
                    expenses.forEach((expense: any, index: number) => {
                      console.log(`${index + 1}. ${format(new Date(expense.date), 'yyyy-MM-dd')} - ${expense.amount} LKR (${expense.category})`);
                    });
                    
                    console.log('=== END MONTH DEBUG INFO ===');
                  }}
                  style={{ marginTop: 5 }}
                  icon="bug-outline"
                  compact
                >
                  Debug Month View
                </Button>
                
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    console.log('=== FORCE REFRESH MONTH DATA ===');
                    console.log('Force refreshing month data for:', format(currentMonth, 'MMM yyyy'));
                    fetchData(true); // Force refresh specifically for month
                  }}
                  style={{ marginTop: 5 }}
                  icon="refresh-circle"
                  compact
                >
                  Force Refresh Month
                </Button>
              </>
            )}
          </Card.Content>
        </Card>

        {loading ? (
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading data...</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={styles.totalCard} mode="elevated">
              <LinearGradient
                colors={['#43A047', '#2E7D32']}
                style={styles.totalCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.totalLabel}>Total Expenses</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(totalAmount)}
                </Text>
              </LinearGradient>
            </Card>

            {Object.keys(summary).length > 0 && (
              <Card style={styles.chartCard} mode="elevated">
                <Card.Content>
                  <Text style={styles.chartTitle}>Expense Distribution</Text>
                  <View style={styles.chartContainer}>
                    <PieChart
                      data={getPieChartData()}
                      width={responsive.chartWidth}
                      height={responsive.pieChartHeight}
                      chartConfig={{
                        backgroundColor: theme.colors.background,
                        backgroundGradientFrom: theme.colors.background,
                        backgroundGradientTo: theme.colors.background,
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                          borderRadius: 16,
                        },
                      }}
                      accessor="amount"
                      backgroundColor="transparent"
                      paddingLeft={isSmallScreen ? "5" : "15"}
                      center={isSmallScreen ? [0, 0] : [0, 0]}
                      absolute
                      hasLegend={false}
                      style={{
                        alignSelf: 'center',
                      }}
                    />
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Daily Expenses Bar Chart - Show only for week, month, and all tabs */}
            {dateRange !== 'day' && (
              <Card style={styles.chartCard} mode="elevated">
                <Card.Content>
                  <Text style={styles.chartTitle}>Daily Expense Tracking</Text>
                  <Text style={styles.chartSubtitle}>
                    {dateRange === 'week' ? `Week: ${format(startOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM dd')} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM dd, yyyy')}` : 
                     dateRange === 'month' ? `${format(currentMonth, 'MMM yyyy')} Daily Expenses (${(() => {
                       const fullData = getBarChartData();
                       const totalPages = Math.ceil(fullData.labels.length / daysPerPage);
                       return totalPages > 1 ? `Page ${monthChartPage + 1} of ${totalPages}` : 'All days shown';
                     })()})` : 
                     'Daily Expenses'}
                  </Text>
                  <View style={styles.chartContainer}>
                    {dateRange === 'month' ? (
                      <View style={styles.paginatedChartContainer}>
                        {(() => {
                          const monthChartData = getPaginatedMonthChartData();
                          return (
                            <>
                              {/* Pagination Controls */}
                              <View style={styles.paginationContainer}>
                                <IconButton
                                  icon="chevron-left"
                                  mode="outlined"
                                  size={isSmallScreen ? 16 : 20}
                                  disabled={!monthChartData.pagination.hasPrev}
                                  onPress={() => navigateMonthChart('prev')}
                                  style={[styles.paginationButton, { opacity: !monthChartData.pagination.hasPrev ? 0.3 : 1 }]}
                                />
                                
                                <View style={styles.paginationInfo}>
                                  <Text style={styles.paginationText}>
                                    Days {monthChartData.pagination.startDay}-{monthChartData.pagination.endDay} of {monthChartData.pagination.totalDays}
                                  </Text>
                                  <Text style={styles.paginationSubtext}>
                                    Page {monthChartData.pagination.currentPage + 1} of {monthChartData.pagination.totalPages}
                                  </Text>
                                </View>
                                
                                <IconButton
                                  icon="chevron-right"
                                  mode="outlined"
                                  size={isSmallScreen ? 16 : 20}
                                  disabled={!monthChartData.pagination.hasNext}
                                  onPress={() => navigateMonthChart('next')}
                                  style={[styles.paginationButton, { opacity: !monthChartData.pagination.hasNext ? 0.3 : 1 }]}
                                />
                              </View>
                              
                              <BarChart
                                data={{
                                  labels: monthChartData.labels,
                                  datasets: [{
                                    data: monthChartData.datasets[0].data,
                                    colors: monthChartData.datasets[0].data.map((amount: number) => {
                                // Return solid color based on amount range
                                if (amount === 0) {
                                  return () => '#E0E0E0'; // Light gray for zero amounts
                                } else if (amount < 500) {
                                  return () => '#4CAF50'; // Solid Green for < LKR 500
                                } else if (amount >= 500 && amount <= 1000) {
                                  return () => '#FFC107'; // Solid Yellow for LKR 500-1000
                                } else {
                                  return () => '#F44336'; // Solid Red for > LKR 1000
                                }
                              })
                            }]
                          }}
                          width={responsive.chartWidth}
                          height={responsive.barChartHeight}
                          yAxisLabel={isSmallScreen ? "" : "LKR "}
                          yAxisSuffix=""
                          chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            decimalPlaces: 0,
                            color: (opacity = 1) => '#4568DC', // Default color (will be overridden by individual bar colors)
                            labelColor: (opacity = 1) => '#333333',
                            style: {
                              borderRadius: 16,
                            },
                            barPercentage: isSmallScreen ? 0.7 : isMediumScreen ? 0.8 : 0.9, // Responsive bar width
                            fillShadowGradientOpacity: 1, // Completely solid bars
                            propsForBackgroundLines: {
                              strokeWidth: 1,
                              stroke: '#E0E0E0',
                              strokeOpacity: 0.3,
                            },
                            propsForLabels: {
                              fontSize: responsive.fontSize.small,
                            },
                          }}
                          style={{
                            marginVertical: 8,
                            borderRadius: 16,
                          }}
                          showValuesOnTopOfBars={!isSmallScreen} // Show values on larger screens
                          fromZero={true}
                          withCustomBarColorFromData={true}
                        />
                            </>
                          );
                        })()}
                      </View>
                    ) : (
                      <BarChart
                        data={{
                          labels: getBarChartData().labels,
                          datasets: [{
                            data: getBarChartData().datasets[0].data,
                            colors: getBarChartData().datasets[0].data.map((amount) => {
                              // Return solid color based on amount range
                              if (amount === 0) {
                                return () => '#E0E0E0'; // Light gray for zero amounts
                              } else if (amount < 500) {
                                return () => '#4CAF50'; // Solid Green for < LKR 500
                              } else if (amount >= 500 && amount <= 1000) {
                                return () => '#FFC107'; // Solid Yellow for LKR 500-1000
                              } else {
                                return () => '#F44336'; // Solid Red for > LKR 1000
                              }
                            })
                          }]
                        }}
                        width={responsive.chartWidth}
                        height={responsive.barChartHeight}
                        yAxisLabel={isSmallScreen ? "" : "LKR "}
                        yAxisSuffix=""
                        chartConfig={{
                          backgroundColor: '#ffffff',
                          backgroundGradientFrom: '#ffffff',
                          backgroundGradientTo: '#ffffff',
                          decimalPlaces: 0,
                          color: (opacity = 1) => '#4568DC', // Default color (will be overridden by individual bar colors)
                          labelColor: (opacity = 1) => '#333333',
                          style: {
                            borderRadius: 16,
                          },
                          barPercentage: isSmallScreen ? 0.6 : isMediumScreen ? 0.7 : 0.8,
                          fillShadowGradientOpacity: 1, // Completely solid bars
                          propsForBackgroundLines: {
                            strokeWidth: 1,
                            stroke: '#E0E0E0',
                            strokeOpacity: 0.3,
                          },
                          propsForLabels: {
                            fontSize: responsive.fontSize.small,
                          },
                        }}
                        style={{
                          marginVertical: 8,
                          borderRadius: 16,
                        }}
                        showValuesOnTopOfBars={!isSmallScreen} // Hide values on small screens to avoid clutter
                        fromZero={true}
                        withCustomBarColorFromData={true}
                      />
                    )}
                    
                    {/* Custom expense breakdown below chart */}
                    <View style={styles.expenseBreakdown}>
                      {getBarChartData().datasets[0].data.map((amount, index) => {
                        const label = getBarChartData().labels[index];
                        if (amount > 0) {
                          return (
                            <View key={index} style={styles.expenseItem}>
                              <Text style={styles.expenseDay}>{label}</Text>
                              <View style={styles.expenseAmount}>
                                <View 
                                  style={[
                                    styles.expenseColorDot, 
                                    { backgroundColor: getBarColor(amount) }
                                  ]} 
                                />
                                <Text style={[styles.expenseText, { color: getBarColor(amount) }]}>
                                  {formatCurrency(amount)}
                                </Text>
                              </View>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                    
                    {dailyExpenses.length === 0 && (
                      <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No expenses found for the selected period</Text>
                      </View>
                    )}
                    
                    {/* Color Legend */}
                    <View style={styles.colorLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
                        <Text style={styles.legendText}>{'< LKR 500'}</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                        <Text style={styles.legendText}>LKR 500-1000</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
                        <Text style={styles.legendText}>{'> LKR 1000'}</Text>
                      </View>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            )}

            {Object.keys(summary).length > 0 && (
              <Card style={styles.breakdownCard} mode="elevated">
              <Card.Content>
                <Text style={styles.breakdownTitle}>Expense Breakdown</Text>
                <Divider style={styles.divider} />
                {Object.entries(summary).map(([category, amount], index) => {
                  const categoryColor = Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, category) 
                    ? CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
                    : CATEGORY_COLORS.Other;
                  const percentage = ((amount / totalAmount) * 100).toFixed(1);
                  
                  return (
                    <React.Fragment key={category}>
                      <View style={styles.categoryRow}>
                        <View style={styles.categoryNameContainer}>
                          <View style={[styles.categoryColorDot, { backgroundColor: categoryColor }]} />
                          <Text style={styles.categoryName} numberOfLines={1}>{category}</Text>
                        </View>
                        <View style={styles.categoryAmountContainer}>
                          <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                          <Text style={styles.percentage}>{percentage}%</Text>
                        </View>
                      </View>
                      {index < Object.entries(summary).length - 1 && (
                        <Divider style={styles.rowDivider} />
                      )}
                    </React.Fragment>
                  );
                })}
              </Card.Content>
            </Card>
            )}

            {Object.keys(summary).length === 0 && (
              <Card style={styles.emptyCard} mode="elevated">
                <Card.Content style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No expenses found</Text>
                  <Text style={styles.emptyText}>Add some expenses to see your spending report.</Text>
                  <Button 
                    mode="contained" 
                    onPress={() => router.push('/(tabs)/add-expense' as any)}
                    style={styles.addButton}
                    icon="plus"
                  >
                    Add Expense
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    height: isSmallScreen ? 160 : 180,
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: defaultResponsive.padding,
    paddingTop: isSmallScreen ? 50 : 60,
    paddingBottom: isSmallScreen ? 20 : 30,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: isSmallScreen ? 24 : isMediumScreen ? 28 : 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: defaultResponsive.fontSize.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    paddingHorizontal: defaultResponsive.padding,
    marginTop: isSmallScreen ? -20 : -30,
    paddingBottom: 20,
  },
  filterCard: {
    marginBottom: defaultResponsive.padding,
    borderRadius: 12,
  },
  segmentedButtons: {
    marginBottom: 10,
  },
  weekNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: isSmallScreen ? 5 : 10,
  },
  weekNavButton: {
    margin: 0,
  },
  currentWeekButton: {
    minWidth: isSmallScreen ? 120 : 140,
  },
  dateRangeChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  loadingCard: {
    borderRadius: 12,
    minHeight: isSmallScreen ? 250 : 300,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: isSmallScreen ? 20 : 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: defaultResponsive.fontSize.medium,
    opacity: 0.7,
  },
  totalCard: {
    marginBottom: defaultResponsive.padding,
    borderRadius: 12,
    overflow: 'hidden',
  },
  totalCardGradient: {
    padding: defaultResponsive.padding,
  },
  totalLabel: {
    fontSize: defaultResponsive.fontSize.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: isSmallScreen ? 24 : isMediumScreen ? 30 : 36,
    fontWeight: 'bold',
    color: 'white',
  },
  chartCard: {
    marginBottom: defaultResponsive.padding,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: defaultResponsive.fontSize.large,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 10 : 15,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: defaultResponsive.fontSize.small,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: isSmallScreen ? 10 : 0,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
    overflow: 'hidden', // Prevent chart overflow on small screens
  },
  stackedBarContainer: {
    position: 'relative',
    height: defaultResponsive.barChartHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isSmallScreen ? 30 : 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginVertical: 10,
  },
  noDataText: {
    fontSize: defaultResponsive.fontSize.medium,
    color: '#666',
    textAlign: 'center',
  },
  breakdownCard: {
    marginBottom: defaultResponsive.padding,
    borderRadius: 12,
  },
  breakdownTitle: {
    fontSize: defaultResponsive.fontSize.large,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  divider: {
    height: 1.5,
    marginBottom: 15,
  },
  rowDivider: {
    height: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 10 : 12,
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  categoryColorDot: {
    width: isSmallScreen ? 12 : 14,
    height: isSmallScreen ? 12 : 14,
    borderRadius: isSmallScreen ? 6 : 7,
    marginRight: isSmallScreen ? 8 : 10,
  },
  categoryName: {
    fontSize: defaultResponsive.fontSize.medium,
    flex: 1,
  },
  categoryAmountContainer: {
    alignItems: 'flex-end',
    minWidth: isSmallScreen ? 80 : 100, // Ensure enough space for amounts
  },
  categoryAmount: {
    fontSize: defaultResponsive.fontSize.medium,
    fontWeight: '600',
  },
  percentage: {
    fontSize: defaultResponsive.fontSize.small,
    opacity: 0.6,
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 12,
  },
  emptyContainer: {
    padding: isSmallScreen ? 20 : 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: defaultResponsive.fontSize.large,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: defaultResponsive.fontSize.medium,
    opacity: 0.7,
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 25,
  },
  colorLegend: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    gap: isSmallScreen ? 8 : 20,
    paddingHorizontal: isSmallScreen ? 20 : 0,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 4 : 0,
  },
  legendColor: {
    width: isSmallScreen ? 10 : 12,
    height: isSmallScreen ? 10 : 12,
    borderRadius: isSmallScreen ? 5 : 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: defaultResponsive.fontSize.small,
    color: '#666',
  },
  colorIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: -40,
    marginBottom: 20,
    paddingHorizontal: isSmallScreen ? 20 : 40,
  },
  colorIndicatorContainer: {
    alignItems: 'center',
  },
  colorIndicator: {
    width: isSmallScreen ? 6 : 8,
    height: isSmallScreen ? 6 : 8,
    borderRadius: isSmallScreen ? 3 : 4,
    marginBottom: 2,
  },
  amountText: {
    fontSize: defaultResponsive.fontSize.small,
    fontWeight: 'bold',
    color: '#333',
  },
  expenseBreakdown: {
    marginTop: 10,
    paddingHorizontal: isSmallScreen ? 5 : 10,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expenseDay: {
    fontSize: defaultResponsive.fontSize.small,
    fontWeight: '500',
    color: '#333',
  },
  expenseAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseColorDot: {
    width: isSmallScreen ? 6 : 8,
    height: isSmallScreen ? 6 : 8,
    borderRadius: isSmallScreen ? 3 : 4,
    marginRight: 6,
  },
  expenseText: {
    fontSize: defaultResponsive.fontSize.small,
    fontWeight: 'bold',
  },
  refreshIndicator: {
    marginHorizontal: defaultResponsive.padding,
    marginVertical: 8,
    borderRadius: 12,
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  refreshContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  refreshText: {
    fontSize: defaultResponsive.fontSize.small,
    fontWeight: '600',
    color: '#2E7D32',
  },
  horizontalScrollContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingRight: 20, // Add some padding at the end of scroll
  },
  paginatedChartContainer: {
    width: '100%',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: isSmallScreen ? 10 : 20,
    width: '100%',
  },
  paginationButton: {
    margin: 0,
  },
  paginationInfo: {
    alignItems: 'center',
    flex: 1,
  },
  paginationText: {
    fontSize: defaultResponsive.fontSize.small,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  paginationSubtext: {
    fontSize: defaultResponsive.fontSize.small - 1,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
});

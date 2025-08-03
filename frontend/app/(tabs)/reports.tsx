import { addWeeks, endOfMonth, endOfWeek, format, getWeek, startOfMonth, startOfWeek, subWeeks } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ActivityIndicator, Button, Card, Chip, Divider, IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { CATEGORY_COLORS } from '@/constants/ExpenseCategories';
import { api, Expense, ExpenseSummary } from '@/services/api';

const screenWidth = Dimensions.get('window').width;

type DateRange = 'day' | 'week' | 'month' | 'all';

export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const [summary, setSummary] = useState<ExpenseSummary>({});
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<{date: string, amount: number}[]>([]);

  useEffect(() => {
    console.log('DateRange changed to:', dateRange);
    updateDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    console.log('Current week start changed, updating date range...');
    if (dateRange === 'week') {
      updateDateRange(dateRange);
    }
  }, [currentWeekStart, dateRange]);

  useEffect(() => {
    console.log('Start/End date changed, fetching data...');
    fetchData();
  }, [startDate, endDate]);

  const updateDateRange = (range: DateRange) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    console.log('=== updateDateRange DEBUG ===');
    console.log('Updating date range to:', range);
    console.log('Today:', today);

    switch (range) {
      case 'day':
        // For day, show all expenses from the current day (more flexible approach)
        // But if no expenses today, we'll show all expenses for better UX
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
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
        // For month, show this month
        start = startOfMonth(today);
        end = endOfMonth(today);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('=== fetchData DEBUG ===');
      console.log('Fetching data for date range:', dateRange);
      console.log('Start date:', startDate.toISOString());
      console.log('End date:', endDate.toISOString());
      console.log('Date range span:', Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)), 'days');
      
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
      
      let data = await api.getExpenseSummary(startDate, endDate);
      let expensesData = await api.getExpensesByDateRange(startDate, endDate);
      
      console.log('🔍 API RESPONSE DEBUG:');
      console.log('Summary data keys:', Object.keys(data));
      console.log('Expenses data count:', expensesData.length);
      console.log('Expenses data sample:', expensesData.slice(0, 3).map((exp: any) => ({ 
        id: exp.id, 
        date: exp.date, 
        amount: exp.amount, 
        category: exp.category 
      })));
      
      // For week view specifically, let's debug what we're getting from API
      if (dateRange === 'week') {
        console.log('🗓️ WEEK API DEBUG:');
        console.log('Requested week range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
        console.log('Received expenses for week:', expensesData.length);
        expensesData.forEach((expense: any, index: number) => {
          console.log(`Week expense ${index + 1}: ${expense.date} - ${formatCurrency(expense.amount)} (${expense.category})`);
        });
      }
      
      // For day tab, if no expenses found for today, fetch all expenses
      if (dateRange === 'day' && expensesData.length === 0) {
        console.log('No expenses found for today, fetching all expenses for day view...');
        // Get all expenses without date restriction for day view
        const allExpensesResponse = await api.getExpensesByDateRange(
          new Date('2020-01-01'), // Very old start date
          new Date(new Date().getTime() + 24 * 60 * 60 * 1000) // Tomorrow
        );
        
        if (allExpensesResponse.length > 0) {
          // Get the most recent expenses for today's view
          expensesData = allExpensesResponse;
          
          // Recalculate summary for all expenses
          const allSummary: ExpenseSummary = {};
          allExpensesResponse.forEach((expense: Expense) => {
            if (allSummary[expense.category]) {
              allSummary[expense.category] += expense.amount;
            } else {
              allSummary[expense.category] = expense.amount;
            }
          });
          data = allSummary;
          
          console.log('Using all expenses for day view:', allExpensesResponse.length);
          console.log('Recalculated summary:', data);
        }
      }
      
      // For week tab, show data for the specific selected week only
      // But if it's the current week and no data found, fetch all data and filter manually
      if (dateRange === 'week') {
        console.log('Week tab - showing data for selected week:', format(startDate, 'MMM dd'), '-', format(endDate, 'MMM dd, yyyy'));
        console.log('Week expenses found:', expensesData.length);
        
        // Check if this is the current week
        const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
        const selectedWeek = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
        const isCurrentWeek = format(currentWeek, 'yyyy-MM-dd') === format(selectedWeek, 'yyyy-MM-dd');
        
        console.log('Is this the current week?', isCurrentWeek);
        
        // If it's the current week and we have no expenses, try fetching all expenses to see if there are any
        if (isCurrentWeek && expensesData.length === 0) {
          console.log('Current week has no expenses from API, fetching all expenses to double-check...');
          const allExpensesResponse = await api.getExpensesByDateRange(
            new Date('2020-01-01'), // Very old start date
            new Date(new Date().getTime() + 24 * 60 * 60 * 1000) // Tomorrow
          );
          
          console.log('All expenses fetched for current week check:', allExpensesResponse.length);
          
          // Filter for current week manually
          const currentWeekExpenses = allExpensesResponse.filter((expense: any) => {
            const expenseDate = new Date(expense.date);
            const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
            return expenseDate >= weekStart && expenseDate <= weekEnd;
          });
          
          console.log('Current week expenses found in all data:', currentWeekExpenses.length);
          
          if (currentWeekExpenses.length > 0) {
            console.log('Found current week expenses, using them instead');
            expensesData = currentWeekExpenses;
            
            // Recalculate summary for current week expenses
            const weekSummary: ExpenseSummary = {};
            currentWeekExpenses.forEach((expense: any) => {
              if (weekSummary[expense.category]) {
                weekSummary[expense.category] += expense.amount;
              } else {
                weekSummary[expense.category] = expense.amount;
              }
            });
            data = weekSummary;
            console.log('Recalculated summary for current week:', data);
          }
        }
      }
      
      // For all tab, if no expenses found for last 30 days, fetch all expenses
      if (dateRange === 'all' && expensesData.length === 0) {
        console.log('No expenses found for last 30 days, fetching all expenses for all view...');
        // Get all expenses without date restriction for all view
        const allExpensesResponse = await api.getExpensesByDateRange(
          new Date('2020-01-01'), // Very old start date
          new Date(new Date().getTime() + 24 * 60 * 60 * 1000) // Tomorrow
        );
        
        if (allExpensesResponse.length > 0) {
          // Get the most recent expenses for all view
          expensesData = allExpensesResponse;
          
          // Recalculate summary for all expenses
          const allSummary: ExpenseSummary = {};
          allExpensesResponse.forEach((expense: Expense) => {
            if (allSummary[expense.category]) {
              allSummary[expense.category] += expense.amount;
            } else {
              allSummary[expense.category] = expense.amount;
            }
          });
          data = allSummary;
          
          console.log('Using all expenses for all view:', allExpensesResponse.length);
          console.log('Recalculated summary:', data);
        }
      }
      
      setSummary(data);
      setExpenses(expensesData);
      console.log('Final expenses data from API:', expensesData);
      
      // Log the first expense to see the date format
      if (expensesData.length > 0) {
        console.log('First expense sample:', expensesData[0]);
        console.log('First expense date type:', typeof expensesData[0].date);
        console.log('First expense date value:', expensesData[0].date);
        console.log('First expense date as Date object:', new Date(expensesData[0].date));
      }
      
      // Calculate daily expenses
      const dailyData = calculateDailyExpenses(expensesData, startDate, endDate);
      setDailyExpenses(dailyData);
      console.log('Final daily expenses set in state:', dailyData);
      
      const total = Object.values(data).reduce((sum, value) => sum + value, 0);
      setTotalAmount(total);
      console.log('Total amount calculated:', total);
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
      // For day view, show total of ALL expenses (for debugging)
      const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      result = [{
        date: 'Today',
        amount: totalAmount
      }];
      console.log('Day view - showing total of all expenses:', totalAmount);
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
      // Group expenses by day of month
      const expensesByDay: { [key: string]: number } = {};
      
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const dayKey = format(expenseDate, 'dd'); // 01, 02, etc.
        expensesByDay[dayKey] = (expensesByDay[dayKey] || 0) + expense.amount;
      });
      
      // Get current month's days
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      
      result = Array.from({length: daysInMonth}, (_, i) => {
        const dayNum = (i + 1).toString().padStart(2, '0');
        return {
          date: dayNum,
          amount: expensesByDay[dayNum] || 0
        };
      });
      
      console.log('Month view - expenses by day:', expensesByDay);
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
      } else if (expenses.length > 0) {
        // General fallback for other tabs (not week, since week is handled above)
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        console.log('Found expenses, total amount:', totalAmount);
        
        switch (dateRange) {
          case 'day':
            labels = ['All Data'];
            data = [totalAmount];
            break;
          case 'month':
            labels = ['All Data'];
            data = [totalAmount];
            break;
          case 'all':
            labels = ['All Data'];
            data = [totalAmount];
            break;
          default:
            labels = ['All Data'];
            data = [totalAmount];
        }
      } else {
        console.log('No expenses at all, using zero fallback');
        // Provide appropriate empty structure based on date range
        switch (dateRange) {
          case 'month':
            labels = ['01', '02', '03', '04', '05'];
            data = [0, 0, 0, 0, 0];
            break;
          case 'day':
          case 'all':
          default:
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
    
    console.log('Final chart data structure:', result);
    console.log('=== END getBarChartData DEBUG ===');
    return result;
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

  const goToCurrentWeek = () => {
    console.log('=== goToCurrentWeek DEBUG ===');
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    console.log('Going to current week:', currentWeek);
    setCurrentWeekStart(currentWeek);
    console.log('=== END goToCurrentWeek DEBUG ===');
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

  const getWeekButtonText = () => {
    return weekButtonText;
  };

  const renderDateRangeText = () => {
    if (dateRange === 'week') {
      const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      return `Week: ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
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
            
            <Chip 
              style={styles.dateRangeChip}
              icon="calendar"
              mode="outlined"
              elevated
            >
              {renderDateRangeText()}
            </Chip>
            
            {/* Debug refresh button */}
            <Button 
              mode="outlined" 
              onPress={() => {
                console.log('Manual refresh triggered');
                fetchData();
              }}
              style={{ marginTop: 10 }}
              icon="refresh"
              compact
            >
              Refresh Data
            </Button>
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
                      width={screenWidth - 64}
                      height={200}
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
                      paddingLeft="15"
                      center={[10, 0]}
                      absolute
                      hasLegend={false}
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
                     dateRange === 'month' ? 'This Month\'s Daily Expenses' : 
                     'Daily Expenses'}
                  </Text>
                  <View style={styles.chartContainer}>
                    <BarChart
                      data={getBarChartData()}
                      width={screenWidth - 64}
                      height={220}
                      yAxisLabel="LKR"
                      yAxisSuffix=""
                      chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(69, 104, 220, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                          borderRadius: 16,
                        },
                        barPercentage: 0.6,
                      }}
                      style={{
                        marginVertical: 8,
                        borderRadius: 16,
                      }}
                      showValuesOnTopOfBars={true}
                      fromZero={true}
                    />
                    {dailyExpenses.length === 0 && (
                      <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No expenses found for the selected period</Text>
                      </View>
                    )}
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
                          <Text style={styles.categoryName}>{category}</Text>
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
                    onPress={() => router.push('/(tabs)/add-expense')}
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
    height: 180,
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -30,
    paddingBottom: 20,
  },
  filterCard: {
    marginBottom: 16,
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
    gap: 10,
  },
  weekNavButton: {
    margin: 0,
  },
  currentWeekButton: {
    minWidth: 140,
  },
  dateRangeChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  loadingCard: {
    borderRadius: 12,
    minHeight: 300,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    opacity: 0.7,
  },
  totalCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  totalCardGradient: {
    padding: 20,
  },
  totalLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
  },
  chartCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginVertical: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  breakdownCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  breakdownTitle: {
    fontSize: 18,
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
    paddingVertical: 12,
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
  },
  categoryAmountContainer: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 12,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 25,
  },
});

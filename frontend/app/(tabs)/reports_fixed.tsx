import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ActivityIndicator, Button, Card, Chip, Divider, SegmentedButtons, Text, useTheme } from 'react-native-paper';

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
  const [summary, setSummary] = useState<ExpenseSummary>({});
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<{date: string, amount: number}[]>([]);

  useEffect(() => {
    updateDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const updateDateRange = (range: DateRange) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (range) {
      case 'day':
        start = today;
        break;
      case 'week':
        start = startOfWeek(today);
        end = endOfWeek(today);
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'all':
        // For "all", we'll use a date from a few years back
        start = subDays(today, 1095); // ~3 years
        break;
      default:
        start = subDays(today, 7);
    }

    setStartDate(start);
    setEndDate(end);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data for date range:', dateRange, 'from:', startDate, 'to:', endDate);
      const data = await api.getExpenseSummary(startDate, endDate);
      setSummary(data);
      console.log('Summary data:', data);
      
      // Fetch individual expenses for daily breakdown
      const expensesData = await api.getExpensesByDateRange(startDate, endDate);
      setExpenses(expensesData);
      console.log('Expenses data:', expensesData);
      
      // Calculate daily expenses
      const dailyData = calculateDailyExpenses(expensesData, startDate, endDate);
      setDailyExpenses(dailyData);
      console.log('Daily expenses data:', dailyData);
      
      const total = Object.values(data).reduce((sum, value) => sum + value, 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Error fetching expense summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyExpenses = (expenses: Expense[], start: Date, end: Date) => {
    console.log('Calculating daily expenses for:', dateRange, 'expenses count:', expenses.length);
    
    // For 'day' range, just show today
    if (dateRange === 'day') {
      const dayExpenses = expenses.filter(expense => 
        isSameDay(new Date(expense.date), start)
      );
      const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      const result = [{
        date: 'Today',
        amount: totalAmount
      }];
      console.log('Day result:', result);
      return result;
    }
    
    // For other ranges, calculate daily breakdown
    const days = eachDayOfInterval({ start, end });
    console.log('Days in interval:', days.length);
    
    // Limit the number of days to prevent too many bars
    const maxDays = dateRange === 'week' ? 7 : dateRange === 'month' ? 31 : 30;
    const limitedDays = days.slice(0, maxDays);
    
    const result = limitedDays.map(day => {
      const dayExpenses = expenses.filter(expense => 
        isSameDay(new Date(expense.date), day)
      );
      const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      return {
        date: dateRange === 'week' ? format(day, 'EEE') : format(day, 'MM/dd'),
        amount: totalAmount
      };
    });
    
    console.log('Calculated daily expenses result:', result);
    return result;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
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
    console.log('getBarChartData called, dateRange:', dateRange, 'dailyExpenses:', dailyExpenses);
    
    // Always return valid data structure for testing
    let labels: string[] = [];
    let data: number[] = [];
    
    if (dailyExpenses.length === 0) {
      // Default data based on date range
      switch (dateRange) {
        case 'day':
          labels = ['Today'];
          data = [0];
          break;
        case 'week':
          labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          data = [0, 0, 0, 0, 0, 0, 0];
          break;
        case 'month':
          labels = ['1', '2', '3', '4', '5'];
          data = [0, 0, 0, 0, 0];
          break;
        case 'all':
          labels = ['1', '2', '3', '4', '5'];
          data = [0, 0, 0, 0, 0];
          break;
        default:
          labels = ['No Data'];
          data = [0];
      }
    } else {
      labels = dailyExpenses.map(item => item.date);
      data = dailyExpenses.map(item => item.amount);
    }
    
    const result = {
      labels: labels,
      datasets: [{ data: data }]
    };
    
    console.log('Chart data result:', result);
    return result;
  };

  const renderDateRangeText = () => {
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
            <Chip 
              style={styles.dateRangeChip}
              icon="calendar"
              mode="outlined"
              elevated
            >
              {renderDateRangeText()}
            </Chip>
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

            {/* Daily Expenses Bar Chart - Always show */}
            <Card style={styles.chartCard} mode="elevated">
              <Card.Content>
                <Text style={styles.chartTitle}>Daily Expense Tracking</Text>
                <Text style={styles.chartSubtitle}>
                  {dateRange === 'day' ? 'Today\'s Expenses' : 
                   dateRange === 'week' ? 'This Week\'s Daily Expenses' : 
                   dateRange === 'month' ? 'This Month\'s Daily Expenses' : 
                   'Daily Expenses'}
                </Text>
                <View style={styles.chartContainer}>
                  <BarChart
                    data={getBarChartData()}
                    width={screenWidth - 64}
                    height={220}
                    yAxisLabel="$"
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

            {Object.keys(summary).length > 0 && (
              <>
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
              </>
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

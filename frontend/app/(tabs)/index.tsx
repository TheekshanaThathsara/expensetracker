import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, RefreshControl, Dimensions, StatusBar } from 'react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Button, Card, Text, IconButton, Chip, ActivityIndicator, FAB, useTheme, Searchbar, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { api, Expense } from '@/services/api';
import { CATEGORY_COLORS } from '@/constants/ExpenseCategories';

const screenWidth = Dimensions.get('window').width;

export default function ExpensesScreen() {
  const theme = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const router = useRouter();

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses();
      setExpenses(data);
      setFilteredExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);
  
  // Filter expenses based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredExpenses(expenses);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = expenses.filter(expense => 
        expense.title.toLowerCase().includes(query) || 
        expense.category.toLowerCase().includes(query) || 
        (expense.notes && expense.notes.toLowerCase().includes(query))
      );
      setFilteredExpenses(filtered);
    }
  }, [searchQuery, expenses]);

  const deleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      // Update the expenses list after deletion
      setExpenses(expenses.filter(expense => expense.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };
  
  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const categoryColor = item.category && 
      Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, item.category) 
        ? CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] 
        : CATEGORY_COLORS.Other;

    return (
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          </View>
          
          <View style={styles.detailsRow}>
            <Chip 
              mode="outlined" 
              style={[styles.categoryChip, { borderColor: categoryColor }]}
              textStyle={{ color: categoryColor }}
            >
              {item.category}
            </Chip>
            <Text style={styles.date}>
              {format(new Date(item.date), 'MMM dd, yyyy')}
            </Text>
          </View>
          
          {item.notes && (
            <Text style={styles.notes}>{item.notes}</Text>
          )}
        </Card.Content>
        <Divider />
        <Card.Actions style={styles.cardActions}>
          <Button 
            icon="pencil" 
            mode="text" 
            onPress={() => router.push({
              pathname: '/expense-detail/[id]',
              params: { id: item.id || '' }
            })}
          >
            Edit
          </Button>
          <IconButton
            icon="trash-can-outline"
            iconColor="#FF5252"
            size={20}
            onPress={() => deleteExpense(item.id!)}
          />
        </Card.Actions>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#5C6BC0" barStyle="light-content" />
      
      {/* Header Section */}
      <LinearGradient
        colors={['#5C6BC0', '#3949AB', '#283593']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Daily Expenses</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Total Spent</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(getTotalExpenses())}
          </Text>
        </View>
      </LinearGradient>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search expenses..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
        />
      </View>
      
      {/* Expenses List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your expenses...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id || ''}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[theme.colors.primary]} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No matching expenses found" : "No expenses yet"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? "Try a different search term" 
                  : "Start tracking your expenses by adding a new one."
                }
              </Text>
              {!searchQuery && (
                <Button 
                  mode="contained" 
                  onPress={() => router.push('/add-expense')}
                  style={styles.addButton}
                  icon="plus"
                >
                  Add Expense
                </Button>
              )}
            </View>
          }
        />
      )}
      
      {/* FAB for adding new expenses */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(tabs)/add-expense')}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  balanceContainer: {
    marginTop: 10,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: -25,
    marginBottom: 15,
  },
  searchBar: {
    borderRadius: 30,
    elevation: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 5,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    opacity: 0.7,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    paddingBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryChip: {
    height: 30,
  },
  date: {
    fontSize: 14,
    opacity: 0.7,
  },
  notes: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingTop: 0,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
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
    paddingVertical: 6,
    borderRadius: 25,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3949AB',
  },
});

import axios from 'axios';
import { format } from 'date-fns';
import { Alert, Platform } from 'react-native';

// Mock data for offline mode or when backend is unavailable
const generateMockExpenses = (): Expense[] => {
  const categories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health'];
  const titles = [
    'Grocery shopping', 'Bus fare', 'Movie tickets', 'Coffee', 'Electricity bill',
    'Lunch', 'Taxi ride', 'Book purchase', 'Medicine', 'Internet bill'
  ];
  
  const mockExpenses: Expense[] = [];
  const today = new Date();
  
  // Generate expenses for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Random number of expenses per day (0-3)
    const expensesPerDay = Math.floor(Math.random() * 4);
    
    for (let j = 0; j < expensesPerDay; j++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const amount = Math.floor(Math.random() * 2000) + 100; // 100-2100 LKR
      
      mockExpenses.push({
        id: `mock-${i}-${j}`,
        title,
        amount,
        category,
        date: format(date, 'yyyy-MM-dd'),
        notes: `Mock expense for ${format(date, 'MMM dd')}`
      });
    }
  }
  
  return mockExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Define the base URL for your API based on the platform
const getApiUrl = () => {
  // Use environment variables if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For Android emulator, use 10.0.2.2 to access host's localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  } 
  // For iOS simulator
  else if (Platform.OS === 'ios') {
    return 'http://localhost:8080/api';
  }
  // For web or other platforms
  else if (Platform.OS === 'web') {
    return 'http://localhost:8080/api';
  }

  // For physical devices - try multiple options in case one doesn't work
  // You might need to update one of these IPs to match your local network
  const possibleIps = [
    'http://localhost:8080/api',
    'http://127.0.0.1:8080/api',
    'http://192.168.1.100:8080/api',
    'http://10.0.0.1:8080/api'
  ];
  
  return possibleIps[0]; // Default to the first option
};

const API_URL = getApiUrl();
const mockExpenses = generateMockExpenses();

// Configure axios with timeout and error handling
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Define types
export interface Expense {
  id?: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
}

export interface ExpenseSummary {
  [category: string]: number;
}

// Utility function for error handling - improved for reports
const handleApiError = (error: any, customMessage: string, useAlert: boolean = false) => {
  console.error(`${customMessage}:`, error);
  
  // Only show alerts if explicitly requested (not for reports)
  if (useAlert) {
    if (error.code === 'ECONNABORTED') {
      Alert.alert('Connection Timeout', 'Unable to connect to the server. Please check your network connection and make sure the backend server is running.');
    } else if (error.response) {
      Alert.alert('Error', `${customMessage}: ${error.response.data.message || 'Unknown error'}`);
    } else if (error.request) {
      Alert.alert('Connection Error', 'Unable to reach the server. Please check your network connection and make sure the backend server is running.');
    } else {
      Alert.alert('Error', `${customMessage}: ${error.message}`);
    }
  }
  
  return error;
};

// Helper function to filter mock expenses by date range
const filterExpensesByDateRange = (expenses: Expense[], startDate: Date, endDate: Date): Expense[] => {
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  });
};

// Helper function to generate expense summary from expenses array
const generateExpenseSummary = (expenses: Expense[]): ExpenseSummary => {
  const summary: ExpenseSummary = {};
  expenses.forEach(expense => {
    summary[expense.category] = (summary[expense.category] || 0) + expense.amount;
  });
  return summary;
};

// API functions
export const api = {
  // Get all expenses with fallback to mock data
  getExpenses: async () => {
    try {
      const response = await axiosInstance.get('/expenses');
      console.log('✅ Successfully fetched expenses from API');
      return response.data;
    } catch (error) {
      handleApiError(error, 'Failed to load expenses from API, using mock data');
      console.log('📱 Using mock data due to API unavailability');
      return mockExpenses;
    }
  },

  // Get expense by ID with fallback
  getExpenseById: async (id: string) => {
    try {
      const response = await axiosInstance.get(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error, `Failed to load expense details`, true); // Show alert for individual expense
      // Try to find in mock data
      const mockExpense = mockExpenses.find(expense => expense.id === id);
      return mockExpense || null;
    }
  },

  // Create a new expense
  createExpense: async (expense: Expense) => {
    try {
      const response = await axiosInstance.post('/expenses', expense);
      return response.data;
    } catch (error) {
      handleApiError(error, 'Failed to create expense', true); // Show alert for creation errors
      // Add to mock data for testing
      const newExpense = {
        ...expense,
        id: `mock-new-${Date.now()}`
      };
      mockExpenses.unshift(newExpense);
      console.log('💾 Added expense to mock data');
      return newExpense;
    }
  },

  // Update an expense
  updateExpense: async (id: string, expense: Expense) => {
    try {
      const response = await axiosInstance.put(`/expenses/${id}`, expense);
      return response.data;
    } catch (error) {
      handleApiError(error, `Failed to update expense`, true); // Show alert for update errors
      // Update in mock data
      const index = mockExpenses.findIndex(e => e.id === id);
      if (index !== -1) {
        mockExpenses[index] = { ...expense, id };
        console.log('📝 Updated expense in mock data');
        return mockExpenses[index];
      }
      return null;
    }
  },

  // Delete an expense
  deleteExpense: async (id: string) => {
    try {
      await axiosInstance.delete(`/expenses/${id}`);
      return true;
    } catch (error) {
      handleApiError(error, `Failed to delete expense`, true); // Show alert for deletion errors
      // Remove from mock data
      const index = mockExpenses.findIndex(e => e.id === id);
      if (index !== -1) {
        mockExpenses.splice(index, 1);
        console.log('🗑️ Removed expense from mock data');
        return true;
      }
      return false;
    }
  },

  // Get expenses by date range with fallback to mock data
  getExpensesByDateRange: async (startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const response = await axiosInstance.get(
        `/expenses/byDate?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      console.log('✅ Successfully fetched expenses by date range from API');
      return response.data;
    } catch (error) {
      handleApiError(error, 'Failed to fetch expenses by date range from API, using mock data');
      console.log('📱 Using filtered mock data for date range');
      return filterExpensesByDateRange(mockExpenses, startDate, endDate);
    }
  },

  // Get expenses by category with fallback
  getExpensesByCategory: async (category: string) => {
    try {
      const response = await axiosInstance.get(`/expenses/byCategory?category=${category}`);
      return response.data;
    } catch (error) {
      handleApiError(error, `Failed to fetch expenses for category ${category}, using mock data`);
      console.log('📱 Using filtered mock data for category');
      return mockExpenses.filter(expense => expense.category === category);
    }
  },

  // Get expense summary by date range with fallback to mock data
  getExpenseSummary: async (startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const response = await axiosInstance.get(
        `/expenses/summary?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      console.log('✅ Successfully fetched expense summary from API');
      return response.data as ExpenseSummary;
    } catch (error) {
      handleApiError(error, 'Failed to fetch expense summary from API, using mock data');
      console.log('📱 Using generated summary from mock data');
      const filteredExpenses = filterExpensesByDateRange(mockExpenses, startDate, endDate);
      return generateExpenseSummary(filteredExpenses);
    }
  }
};

export default api;

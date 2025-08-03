import axios from 'axios';
import { format } from 'date-fns';
import { Alert, Platform } from 'react-native';

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

// Utility function for error handling
const handleApiError = (error: any, customMessage: string) => {
  if (error.code === 'ECONNABORTED') {
    console.error(`${customMessage} (Timeout):`, error);
    Alert.alert('Connection Timeout', 'Unable to connect to the server. Please check your network connection and make sure the backend server is running.');
  } else if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(`${customMessage} (Status ${error.response.status}):`, error.response.data);
    Alert.alert('Error', `${customMessage}: ${error.response.data.message || 'Unknown error'}`);
  } else if (error.request) {
    // The request was made but no response was received
    console.error(`${customMessage} (No Response):`, error.request);
    Alert.alert('Connection Error', 'Unable to reach the server. Please check your network connection and make sure the backend server is running.');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error(`${customMessage} (Unknown):`, error.message);
    Alert.alert('Error', `${customMessage}: ${error.message}`);
  }
  throw error;
};

// API functions
export const api = {
  // Get all expenses
  getExpenses: async () => {
    try {
      const response = await axiosInstance.get('/expenses');
      return response.data;
    } catch (error) {
      handleApiError(error, 'Failed to load expenses');
      return []; // Return empty array on error
    }
  },

  // Get expense by ID
  getExpenseById: async (id: string) => {
    try {
      const response = await axiosInstance.get(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error, `Failed to load expense details`);
      return null; // Return null on error
    }
  },

  // Create a new expense
  createExpense: async (expense: Expense) => {
    try {
      const response = await axiosInstance.post('/expenses', expense);
      return response.data;
    } catch (error) {
      handleApiError(error, 'Failed to create expense');
      return null; // Return null on error
    }
  },

  // Update an expense
  updateExpense: async (id: string, expense: Expense) => {
    try {
      const response = await axiosInstance.put(`/expenses/${id}`, expense);
      return response.data;
    } catch (error) {
      handleApiError(error, `Failed to update expense`);
      return null; // Return null on error
    }
  },

  // Delete an expense
  deleteExpense: async (id: string) => {
    try {
      await axiosInstance.delete(`/expenses/${id}`);
      return true;
    } catch (error) {
      handleApiError(error, `Failed to delete expense`);
      return false; // Return false on error
    }
  },

  // Get expenses by date range
  getExpensesByDateRange: async (startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const response = await axiosInstance.get(
        `/expenses/byDate?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Failed to fetch expenses by date range');
      return []; // Return empty array on error
    }
  },

  // Get expenses by category
  getExpensesByCategory: async (category: string) => {
    try {
      const response = await axiosInstance.get(`/expenses/byCategory?category=${category}`);
      return response.data;
    } catch (error) {
      handleApiError(error, `Failed to fetch expenses for category ${category}`);
      return []; // Return empty array on error
    }
  },

  // Get expense summary by date range
  getExpenseSummary: async (startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const response = await axiosInstance.get(
        `/expenses/summary?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      return response.data as ExpenseSummary;
    } catch (error) {
      handleApiError(error, 'Failed to fetch expense summary');
      return {} as ExpenseSummary; // Return empty object on error
    }
  }
};

export default api;

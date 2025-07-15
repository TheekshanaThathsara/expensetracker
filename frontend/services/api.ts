import axios from 'axios';
import { format } from 'date-fns';
import { Platform, Alert } from 'react-native';

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
      return handleApiError(error, 'Failed to load expenses');
    }
  },

  // Get expense by ID
  getExpenseById: async (id: string) => {
    try {
      const response = await axiosInstance.get(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, `Failed to load expense details`);
    }
  },

  // Create a new expense
  createExpense: async (expense: Expense) => {
    try {
      const response = await axios.post(`${API_URL}/expenses`, expense);
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  },

  // Update an expense
  updateExpense: async (id: string, expense: Expense) => {
    try {
      const response = await axios.put(`${API_URL}/expenses/${id}`, expense);
      return response.data;
    } catch (error) {
      console.error(`Error updating expense with id ${id}:`, error);
      throw error;
    }
  },

  // Delete an expense
  deleteExpense: async (id: string) => {
    try {
      await axios.delete(`${API_URL}/expenses/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting expense with id ${id}:`, error);
      throw error;
    }
  },

  // Get expenses by date range
  getExpensesByDateRange: async (startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const response = await axios.get(
        `${API_URL}/expenses/byDate?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses by date range:', error);
      throw error;
    }
  },

  // Get expenses by category
  getExpensesByCategory: async (category: string) => {
    try {
      const response = await axios.get(`${API_URL}/expenses/byCategory?category=${category}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching expenses for category ${category}:`, error);
      throw error;
    }
  },

  // Get expense summary by date range
  getExpenseSummary: async (startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const response = await axios.get(
        `${API_URL}/expenses/summary?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      return response.data as ExpenseSummary;
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      throw error;
    }
  }
};

export default api;

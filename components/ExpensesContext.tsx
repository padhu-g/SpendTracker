import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface Budget {
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
  categoryLimits?: { [key: string]: number };
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  timestamp?: number;
}

interface ExpensesContextType {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  budget: Budget | null;
  addExpense: (expense: Omit<Expense, 'id' | 'timestamp'>) => Promise<void>;
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'timestamp'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setBudget: (budget: Budget) => Promise<void>;
  getBudgetStatus: () => { 
    total: number; 
    remaining: number; 
    categoryTotals: { [key: string]: number };
    isOverBudget: boolean;
  };
  clearAllExpenses: () => Promise<void>;
}

export const ExpensesContext = createContext<ExpensesContextType>({
  expenses: [],
  loading: true,
  error: null,
  budget: null,
  addExpense: async () => {},
  updateExpense: async () => {},
  deleteExpense: async () => {},
  clearAllExpenses: async () => {},
  setBudget: async () => {},
  getBudgetStatus: () => ({ total: 0, remaining: 0, categoryTotals: {}, isOverBudget: false }),
});

const STORAGE_KEY = '@spendtracker_expenses';
const BUDGET_STORAGE_KEY = '@spendtracker_budget';

interface SaveError extends Error {
  isRetry?: boolean;
}

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudgetState] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savingPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const shouldSaveRef = useRef(false);

  // Load data function
  const loadStoredData = useCallback(async () => {
    if (!shouldSaveRef.current) {
      try {
        setError(null);
        const [storedExpenses, storedBudget] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(BUDGET_STORAGE_KEY)
        ]);
        
        if (storedExpenses) {
          try {
            const parsed = JSON.parse(storedExpenses);
            if (Array.isArray(parsed)) {
              const validated = parsed
                .filter(expense => 
                  expense.id && 
                  expense.description && 
                  typeof expense.amount === 'number' && 
                  expense.date
                )
                .map(expense => ({
                  id: expense.id,
                  description: expense.description.trim(),
                  amount: Math.round(expense.amount * 100) / 100,
                  date: expense.date,
                  category: expense.category || 'other',
                  timestamp: expense.timestamp || new Date(expense.date).getTime()
                }));
              
              setExpenses(validated);
            }
          } catch (error) {
            console.error('Data parsing error:', error);
            await AsyncStorage.removeItem(STORAGE_KEY);
            setExpenses([]);
          }
        }

        if (storedBudget) {
          try {
            const parsedBudget = JSON.parse(storedBudget);
            if (typeof parsedBudget.amount === 'number' && 
                ['daily', 'weekly', 'monthly'].includes(parsedBudget.period)) {
              setBudgetState(parsedBudget);
            }
          } catch (error) {
            console.error('Error parsing budget:', error);
            await AsyncStorage.removeItem(BUDGET_STORAGE_KEY);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error loading data';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Initialize data loading
  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  // Optimized save function with better error handling
  const saveToStorage = useCallback(async (data: Expense[]) => {
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current);
    }

    shouldSaveRef.current = true;

    const save = async () => {
      try {
        setIsSaving(true);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        shouldSaveRef.current = false;
      } catch (error) {
        console.error('Save error:', error);
        // Retry after a delay
        pendingSaveRef.current = setTimeout(() => save(), 3000);
      } finally {
        setIsSaving(false);
      }
    };

    // Debounce saves to prevent rapid storage writes
    pendingSaveRef.current = setTimeout(() => {
      save();
    }, 300);
  }, []);

  // Save expenses to storage whenever they change
  useEffect(() => {
    if (!loading && expenses.length > 0) {
      saveToStorage(expenses);
    }
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
      }
    };
  }, [expenses, loading, saveToStorage]);

  const setBudget = useCallback(async (newBudget: Budget) => {
    try {
      setError(null);
      await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(newBudget));
      setBudgetState(newBudget);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving budget';
      setError(message);
      Alert.alert('Error', 'Failed to save budget settings.');
      throw error;
    }
  }, []);

  const getBudgetStatus = useCallback(() => {
    if (!budget) {
      return { 
        total: 0, 
        remaining: 0, 
        categoryTotals: {}, 
        isOverBudget: false 
      };
    }

    const now = new Date();
    const startOfPeriod = new Date();

    // Set start date based on budget period
    switch (budget.period) {
      case 'daily':
        startOfPeriod.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startOfPeriod.setDate(now.getDate() - now.getDay());
        startOfPeriod.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startOfPeriod.setDate(1);
        startOfPeriod.setHours(0, 0, 0, 0);
        break;
    }

    // Filter expenses for current period
    const periodExpenses = expenses.filter(expense => 
      new Date(expense.timestamp || new Date(expense.date).getTime()) >= startOfPeriod
    );

    // Calculate totals
    const categoryTotals: { [key: string]: number } = {};
    const total = periodExpenses.reduce((sum, expense) => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      return sum + expense.amount;
    }, 0);

    // Check category limits
    let isOverBudget = total > budget.amount;
    if (budget.categoryLimits && !isOverBudget) {
      isOverBudget = Object.entries(budget.categoryLimits).some(
        ([category, limit]) => (categoryTotals[category] || 0) > limit
      );
    }

    return {
      total,
      remaining: Math.max(0, budget.amount - total),
      categoryTotals,
      isOverBudget
    };
  }, [budget, expenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'timestamp'>) => {
    try {
      setError(null);
      const timestamp = Date.now();
      const newExpense: Expense = {
        ...expense,
        id: timestamp.toString(),
        timestamp,
      };

      // Check budget before adding
      const budgetStatus = getBudgetStatus();
      const newTotal = budgetStatus.total + expense.amount;
      const categoryTotal = (budgetStatus.categoryTotals[expense.category] || 0) + expense.amount;

      let warningMessage = '';
      if (budget) {
        if (newTotal > budget.amount) {
          warningMessage = `This expense will exceed your ${budget.period} budget by ₹${(newTotal - budget.amount).toLocaleString()}`;
        } else if (budget.categoryLimits?.[expense.category] && 
                  categoryTotal > budget.categoryLimits[expense.category]) {
          warningMessage = `This expense will exceed your ${expense.category} category limit by ₹${(categoryTotal - budget.categoryLimits[expense.category]).toLocaleString()}`;
        }
      }

      if (warningMessage) {
        await new Promise((resolve, reject) => {
          Alert.alert(
            'Budget Warning',
            warningMessage,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => reject(new Error('Expense cancelled'))
              },
              {
                text: 'Add Anyway',
                style: 'destructive',
                onPress: resolve
              }
            ]
          );
        });
      }

      const updatedExpenses = [...expenses, newExpense];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
      setExpenses(updatedExpenses);
    } catch (error) {
      if (error instanceof Error && error.message === 'Expense cancelled') {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Error adding expense';
      setError(message);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
      throw error;
    }
  }, [expenses, budget, getBudgetStatus]);

  // Update existing functions with budget checks
  const updateExpense = useCallback(async (id: string, expense: Omit<Expense, 'id' | 'timestamp'>) => {
    try {
      setError(null);
      const timestamp = Date.now();
      const updatedExpense: Expense = {
        ...expense,
        id,
        timestamp,
      };

      const oldExpense = expenses.find(e => e.id === id);
      if (!oldExpense) throw new Error('Expense not found');

      // Check budget impact of the update
      const budgetStatus = getBudgetStatus();
      const amountDiff = expense.amount - oldExpense.amount;
      const newTotal = budgetStatus.total + amountDiff;

      let categoryTotal = budgetStatus.categoryTotals[expense.category] || 0;
      if (expense.category === oldExpense.category) {
        categoryTotal += amountDiff;
      } else {
        categoryTotal += expense.amount;
      }

      let warningMessage = '';
      if (budget && amountDiff > 0) {
        if (newTotal > budget.amount) {
          warningMessage = `This update will exceed your ${budget.period} budget by ₹${(newTotal - budget.amount).toLocaleString()}`;
        } else if (budget.categoryLimits?.[expense.category] && 
                  categoryTotal > budget.categoryLimits[expense.category]) {
          warningMessage = `This update will exceed your ${expense.category} category limit by ₹${(categoryTotal - budget.categoryLimits[expense.category]).toLocaleString()}`;
        }
      }

      if (warningMessage) {
        await new Promise((resolve, reject) => {
          Alert.alert(
            'Budget Warning',
            warningMessage,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => reject(new Error('Update cancelled'))
              },
              {
                text: 'Update Anyway',
                style: 'destructive',
                onPress: resolve
              }
            ]
          );
        });
      }

      const updatedExpenses = expenses.map(e => e.id === id ? updatedExpense : e);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
      setExpenses(updatedExpenses);
    } catch (error) {
      if (error instanceof Error && error.message === 'Update cancelled') {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Error updating expense';
      setError(message);
      Alert.alert('Error', 'Failed to update expense. Please try again.');
      throw error;
    }
  }, [expenses, budget, getBudgetStatus]);
  const deleteExpense = useCallback(async (id: string) => {
    try {
      setError(null);
      
      // Find the expense in current state first
      const expenseToDelete = expenses.find(expense => expense.id === id);
      if (!expenseToDelete) {
        throw new Error('Expense not found');
      }

      // Update state immediately
      const updatedExpenses = expenses.filter(expense => expense.id !== id);
      setExpenses(updatedExpenses);

      // Then update storage
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
      } catch (storageError) {
        // If storage fails, revert the state
        console.error('Storage error:', storageError);
        setExpenses(expenses);
        throw new Error('Failed to save changes');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting expense';
      setError(message);
      Alert.alert('Error', 'Failed to delete expense. Please try again.');
      throw error;
    }
  }, [expenses]);

  const clearAllExpenses = useCallback(async () => {
    try {
      setError(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setExpenses([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error clearing expenses';
      setError(message);
      Alert.alert('Error', 'Failed to clear expenses. Please try again.');
      throw error;
    }
  }, []);

  return (
    <ExpensesContext.Provider 
      value={{ 
        expenses,
        loading,
        error,
        budget,
        addExpense,
        updateExpense,
        deleteExpense,
        clearAllExpenses,
        setBudget,
        getBudgetStatus,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};

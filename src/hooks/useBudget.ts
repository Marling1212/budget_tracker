import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { getDaysInMonth, getDate } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Category, Transaction, BudgetStatus } from '../types/database';

interface BudgetContextType {
  categories: Category[];
  transactions: Transaction[];
  budgetStatuses: BudgetStatus[];
  loading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      // 2. Fetch current month's transactions
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', firstDayOfMonth)
        .lt('date', firstDayOfNextMonth);

      if (transactionsError) throw transactionsError;

      setCategories(categoriesData as Category[]);
      setTransactions(transactionsData as Transaction[]);
    } catch (err: any) {
      console.error('Error fetching budget data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate budget statuses whenever data changes
  useEffect(() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    const currentDayOfMonth = getDate(now);

    const statuses: BudgetStatus[] = categories.map((category) => {
      const categoryTransactions = transactions.filter(t => t.category_id === category.id);
      const spentThisMonth = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

      const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const spentToday = categoryTransactions
        .filter(t => t.date === todayString)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const spentPast = categoryTransactions
        .filter(t => t.date !== todayString)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const dailyBudget = category.daily_budget;
      const expectedMonthlyBudget = dailyBudget * daysInMonth;
      
      const todayRemaining = Math.max(0, dailyBudget - spentToday);
      const totalSaved = (dailyBudget * (currentDayOfMonth - 1)) - spentPast;

      let accumulatedLimit = expectedMonthlyBudget;
      if (category.is_accumulative) {
        accumulatedLimit = dailyBudget * currentDayOfMonth;
      }

      const remaining = accumulatedLimit - spentThisMonth;

      return {
        category,
        spentThisMonth,
        spentToday,
        spentPast,
        dailyBudget,
        expectedMonthlyBudget,
        accumulatedLimit,
        todayRemaining,
        totalSaved,
        remaining,
        daysInMonth,
        currentDayOfMonth,
      };
    });

    setBudgetStatuses(statuses);
  }, [categories, transactions]);

  return (
    <BudgetContext.Provider value={{
      categories,
      transactions,
      budgetStatuses,
      loading,
      error,
      refreshData: fetchData,
    }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}

import { useState, useEffect, useCallback } from 'react';
import { getDaysInMonth, getDate } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Category, Transaction, BudgetStatus } from '../types/database';

export function useBudget() {
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
      // Get next month's first day to use as upper bound (exclusive)
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
      // Calculate spent this month for this category
      const categoryTransactions = transactions.filter(t => t.category_id === category.id);
      const spentThisMonth = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

      const dailyBudget = category.daily_budget;
      const expectedMonthlyBudget = dailyBudget * daysInMonth;
      
      let accumulatedLimit = expectedMonthlyBudget;
      if (category.is_accumulative) {
        accumulatedLimit = dailyBudget * currentDayOfMonth;
      }

      const remaining = accumulatedLimit - spentThisMonth;

      return {
        category,
        spentThisMonth,
        dailyBudget,
        expectedMonthlyBudget,
        accumulatedLimit,
        remaining,
        daysInMonth,
        currentDayOfMonth,
      };
    });

    setBudgetStatuses(statuses);
  }, [categories, transactions]);

  return {
    categories,
    transactions,
    budgetStatuses,
    loading,
    error,
    refreshData: fetchData,
  };
}

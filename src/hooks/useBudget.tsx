import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { getDaysInMonth, getDate, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Category, Transaction, BudgetStatus, RecurringTransaction, Account } from '../types/database';

interface BudgetContextType {
  categories: Category[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  accounts: Account[];
  budgetStatuses: BudgetStatus[];
  netWorth: number;
  loading: boolean;
  error: Error | null;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  refreshData: (background?: boolean) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchData = useCallback(async (background: boolean = false) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      // 1. Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .lte('created_at', new Date().toISOString()) // Cache buster
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      // 1.5 Process Recurring Transactions
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_transactions')
        .select('*');
      
      if (recurringError) throw recurringError;

      // 1.8 Fetch Accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (accountsError) throw accountsError;

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      let dueRecurring = (recurringData as RecurringTransaction[]).filter(r => r.next_date <= todayStr);
      let didProcessAny = false;

      if (dueRecurring.length > 0) {
        const newTransactions = [];
        const updates = [];
        
        for (const r of dueRecurring) {
          let currentDate = new Date(r.next_date);
          
          while (format(currentDate, 'yyyy-MM-dd') <= todayStr) {
            newTransactions.push({
              category_id: r.category_id,
              amount: r.amount,
              note: r.note,
              date: format(currentDate, 'yyyy-MM-dd'),
              recurring_id: r.id,
              account_id: r.account_id,
              type: r.type,
            });
            
            if (r.frequency === 'DAILY') currentDate.setDate(currentDate.getDate() + 1);
            else if (r.frequency === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7);
            else if (r.frequency === 'MONTHLY') currentDate.setMonth(currentDate.getMonth() + 1);
            else if (r.frequency === 'YEARLY') currentDate.setFullYear(currentDate.getFullYear() + 1);
            else break;
          }
          
          updates.push({
            id: r.id,
            next_date: format(currentDate, 'yyyy-MM-dd')
          });
        }
        
        if (newTransactions.length > 0) {
          const { error: insertError } = await supabase.from('transactions').insert(newTransactions);
          if (insertError) console.error("Error inserting recurring:", insertError);
          else didProcessAny = true;
        }
        
        if (updates.length > 0) {
          for (const u of updates) {
            await supabase.from('recurring_transactions').update({ next_date: u.next_date }).eq('id', u.id);
          }
        }
      }

      let finalRecurringData = recurringData;
      if (didProcessAny) {
        const { data: refetched } = await supabase.from('recurring_transactions').select('*');
        if (refetched) finalRecurringData = refetched;
      }

      // 2. Fetch current month's transactions
      const now = currentMonth;
      const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const firstDayOfNextMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', firstDayOfMonth)
        .lt('date', firstDayOfNextMonth)
        .lte('created_at', new Date().toISOString()); // Cache buster

      if (transactionsError) throw transactionsError;

      setCategories(categoriesData as Category[]);
      setTransactions(transactionsData as Transaction[]);
      setRecurringTransactions(finalRecurringData as RecurringTransaction[]);
      setAccounts(accountsData as Account[]);
    } catch (err: any) {
      console.error('Error fetching budget data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate budget statuses whenever data changes
  useEffect(() => {
    const actualNow = new Date();
    const isCurrentMonth = actualNow.getMonth() === currentMonth.getMonth() && actualNow.getFullYear() === currentMonth.getFullYear();
    
    const daysInMonth = getDaysInMonth(currentMonth);
    const currentDayOfMonth = isCurrentMonth ? getDate(actualNow) : daysInMonth;

    const statuses: BudgetStatus[] = categories.map((category) => {
      const categoryTransactions = transactions.filter(t => t.category_id === category.id && t.type === 'EXPENSE');
      const spentThisMonth = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

      const todayString = isCurrentMonth 
        ? `${actualNow.getFullYear()}-${String(actualNow.getMonth() + 1).padStart(2, '0')}-${String(actualNow.getDate()).padStart(2, '0')}`
        : 'NOT_TODAY';

      const spentToday = categoryTransactions
        .filter(t => t.date === todayString)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const spentPast = categoryTransactions
        .filter(t => t.date !== todayString)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const dailyBudget = category.daily_budget;
      const expectedMonthlyBudget = dailyBudget * daysInMonth;
      
      const todayRemaining = dailyBudget - spentToday;
      const totalSaved = (dailyBudget * currentDayOfMonth) - spentThisMonth;

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
  }, [categories, transactions, currentMonth]);

  const netWorth = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <BudgetContext.Provider value={{
      categories,
      transactions,
      recurringTransactions,
      accounts,
      budgetStatuses,
      netWorth,
      loading,
      error,
      currentMonth,
      setCurrentMonth,
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

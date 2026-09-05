export type Category = {
  id: string; // uuid
  user_id: string; // uuid
  name: string;
  daily_budget: number;
  is_accumulative: boolean;
  icon: string;
  color: string;
  created_at: string;
};

export type Transaction = {
  id: string; // uuid
  category_id: string | null; // uuid
  amount: number;
  date: string; // YYYY-MM-DD
  note: string | null;
  tags: string[];
  recurring_id: string | null; // uuid
  account_id: string | null; // uuid
  type: 'EXPENSE' | 'INCOME';
  created_at: string;
};

export type RecurringTransaction = {
  id: string; // uuid
  category_id: string | null; // uuid
  amount: number;
  note: string | null;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  next_date: string; // YYYY-MM-DD
  account_id: string | null; // uuid
  type: 'EXPENSE' | 'INCOME';
  created_at: string;
};

export type Account = {
  id: string; // uuid
  user_id: string; // uuid
  name: string;
  type: 'CASH' | 'BANK' | 'CREDIT';
  balance: number;
  color: string | null;
  created_at: string;
};

export type BudgetStatus = {
  category: Category;
  spentThisMonth: number;
  spentToday: number;
  spentPast: number;
  dailyBudget: number;
  expectedMonthlyBudget: number;
  accumulatedLimit: number;
  todayRemaining: number;
  totalSaved: number;
  remaining: number;
  daysInMonth: number;
  currentDayOfMonth: number;
};

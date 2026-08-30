export type Category = {
  id: string; // uuid
  name: string;
  daily_budget: number;
  is_accumulative: boolean;
  created_at: string;
};

export type Transaction = {
  id: string; // uuid
  category_id: string; // uuid
  amount: number;
  date: string; // YYYY-MM-DD
  note: string | null;
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

export type Category = {
  id: string; // uuid
  name: string;
  monthly_budget: number;
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
  dailyQuota: number;
  accumulatedLimit: number;
  remaining: number;
  daysInMonth: number;
  currentDayOfMonth: number;
};

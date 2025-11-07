// Finance Type Definitions for ZenCash

export interface Pocket {
  id: string;              // UUID
  name: string;            // "Kantong Utama", "Kantong Jajan"
  balance: number;         // Current balance (can be negative)
  color: string;           // Hex color for UI (#4ECDC4)
  icon: string;            // Emoji icon (💰, 🍔, 📦)
  isDefault: boolean;      // true for Kantong Utama (cannot delete)
  order: number;           // Display order (0 is first)
  createdAt: string;       // ISO date string
  updatedAt: string;       // ISO date string
}

export interface Transaction {
  id: string;              // UUID
  type: 'income' | 'expense' | 'transfer';
  amount: number;          // Positive number (Rupiah)
  date: string;            // ISO date string "2025-11-04"
  description: string;     // Optional note
  createdAt: string;       // ISO date string

  // For income/expense
  categoryId?: string;     // Reference to Category
  pocketId?: string;       // Which pocket (income=to, expense=from)

  // For transfers only
  fromPocketId?: string;   // Source pocket
  toPocketId?: string;     // Destination pocket
}

export interface Category {
  id: string;              // "food", "transport", "salary"
  name: string;            // "Makanan", "Transportasi"
  type: 'income' | 'expense';
  icon: string;            // Emoji (🍔, 🚗, 💰)
  color: string;           // Hex color for UI
  isDefault: boolean;      // true for built-in categories
}

export interface FinanceState {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netMonthly: number;
}

// JSON file structures
export interface PocketsData {
  version: string;
  lastUpdated: string;
  pockets: Pocket[];
}

export interface TransactionsData {
  version: string;
  lastUpdated: string;
  transactions: Transaction[];
}

export interface CategoriesData {
  version: string;
  lastUpdated: string;
  categories: Category[];
}

// Monthly summary statistics
export interface MonthlyStats {
  income: number;
  expense: number;
  count: number;
}

export interface PocketSummary {
  balance: number;
  lastUpdated: string;
}

export interface FinanceSummary {
  version: string;
  lastUpdated: string;
  monthlyStats: Record<string, MonthlyStats>; // Key: "YYYY-MM"
  pocketSummaries: Record<string, PocketSummary>; // Key: pocketId
}

// Pagination and filtering
export interface TransactionFilters {
  pocketId?: string;
  categoryId?: string;
  type?: 'income' | 'expense' | 'transfer';
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
  month: string; // "YYYY-MM"
}

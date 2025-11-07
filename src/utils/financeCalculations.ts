import { Transaction, Pocket } from '../types/finance';

/**
 * Calculate the balance of a specific pocket based on transactions
 */
export function calculatePocketBalance(pocketId: string, transactions: Transaction[]): number {
  let balance = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'income' && transaction.pocketId === pocketId) {
      // Money coming into this pocket
      balance += transaction.amount;
    } else if (transaction.type === 'expense' && transaction.pocketId === pocketId) {
      // Money going out of this pocket
      balance -= transaction.amount;
    } else if (transaction.type === 'transfer') {
      // Transfer from this pocket
      if (transaction.fromPocketId === pocketId) {
        balance -= transaction.amount;
      }
      // Transfer to this pocket
      if (transaction.toPocketId === pocketId) {
        balance += transaction.amount;
      }
    }
  }

  return balance;
}

/**
 * Calculate monthly income for a pocket (or all pockets if pocketId is null)
 */
export function calculateMonthlyIncome(
  pocketId: string | null,
  transactions: Transaction[],
  month: Date
): number {
  const { start, end } = getMonthDateRange(month);
  let income = 0;

  for (const transaction of transactions) {
    if (transaction.type !== 'income') continue;

    const transactionDate = new Date(transaction.date);
    if (transactionDate >= start && transactionDate <= end) {
      if (pocketId === null || transaction.pocketId === pocketId) {
        income += transaction.amount;
      }
    }
  }

  return income;
}

/**
 * Calculate monthly expense for a pocket (or all pockets if pocketId is null)
 */
export function calculateMonthlyExpense(
  pocketId: string | null,
  transactions: Transaction[],
  month: Date
): number {
  const { start, end } = getMonthDateRange(month);
  let expense = 0;

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;

    const transactionDate = new Date(transaction.date);
    if (transactionDate >= start && transactionDate <= end) {
      if (pocketId === null || transaction.pocketId === pocketId) {
        expense += transaction.amount;
      }
    }
  }

  return expense;
}

/**
 * Calculate total balance across all pockets
 */
export function calculateTotalBalance(pockets: Pocket[]): number {
  return pockets.reduce((total, pocket) => total + pocket.balance, 0);
}

/**
 * Group transactions by date
 */
export function groupTransactionsByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const date = transaction.date;
    const existing = grouped.get(date) || [];
    existing.push(transaction);
    grouped.set(date, existing);
  }

  return grouped;
}

/**
 * Get month date range (start and end of month)
 */
export function getMonthDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Recalculate all pocket balances based on transactions
 * Returns updated pockets with new balances
 */
export function recalculatePocketBalances(
  pockets: Pocket[],
  transactions: Transaction[]
): Pocket[] {
  return pockets.map(pocket => ({
    ...pocket,
    balance: calculatePocketBalance(pocket.id, transactions),
    updatedAt: new Date().toISOString()
  }));
}

/**
 * Get transfer statistics for a pocket in a given month
 */
export function calculatePocketTransfers(
  pocketId: string,
  transactions: Transaction[],
  month: Date
): { transfersIn: number; transfersOut: number } {
  const { start, end } = getMonthDateRange(month);
  let transfersIn = 0;
  let transfersOut = 0;

  for (const transaction of transactions) {
    if (transaction.type !== 'transfer') continue;

    const transactionDate = new Date(transaction.date);
    if (transactionDate >= start && transactionDate <= end) {
      if (transaction.fromPocketId === pocketId) {
        transfersOut += transaction.amount;
      }
      if (transaction.toPocketId === pocketId) {
        transfersIn += transaction.amount;
      }
    }
  }

  return { transfersIn, transfersOut };
}

/**
 * Group expense transactions by category for a specific month
 * Returns data formatted for pie chart visualization
 */
export interface ExpenseByCategoryData {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export function groupExpensesByCategory(
  transactions: Transaction[],
  categories: { id: string; name: string; color: string; icon: string; type: string }[],
  month: Date
): ExpenseByCategoryData[] {
  const { start, end } = getMonthDateRange(month);

  // Filter expenses for the given month
  const monthExpenses = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const transactionDate = new Date(t.date);
    return transactionDate >= start && transactionDate <= end;
  });

  // Group by category
  const categoryTotals = new Map<string, number>();
  for (const transaction of monthExpenses) {
    if (transaction.categoryId) {
      const current = categoryTotals.get(transaction.categoryId) || 0;
      categoryTotals.set(transaction.categoryId, current + transaction.amount);
    }
  }

  // Calculate total for percentage
  const totalExpense = Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0);

  // Convert to array with category details
  const result: ExpenseByCategoryData[] = [];
  for (const [categoryId, amount] of categoryTotals.entries()) {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      result.push({
        categoryId,
        categoryName: category.name,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        color: category.color,
        icon: category.icon
      });
    }
  }

  // Sort by amount descending
  result.sort((a, b) => b.amount - a.amount);

  return result;
}

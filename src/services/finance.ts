import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Transaction,
  Pocket,
  Category,
  TransactionsData,
  PocketsData,
  CategoriesData,
  FinanceSummary,
  MonthlyStats,
  PocketSummary,
  PaginatedTransactions,
  TransactionFilters
} from '../types/finance';

export class FinanceService {
  private syncDirectory: string | null = null;
  private financeDirectory: string | null = null;
  private transactionsDirectory: string | null = null;
  private summaryCache: FinanceSummary | null = null;

  constructor() {}

  /**
   * Initialize finance service with the sync directory
   */
  async initialize(syncDirectory: string): Promise<void> {
    console.log('[FINANCE-SERVICE] initialize:', syncDirectory);
    this.syncDirectory = syncDirectory;
    this.financeDirectory = path.join(syncDirectory, 'finance');
    this.transactionsDirectory = path.join(this.financeDirectory, 'transactions');

    // Ensure directories exist
    await fs.mkdir(this.financeDirectory, { recursive: true });
    await fs.mkdir(this.transactionsDirectory, { recursive: true });
    console.log('[FINANCE-SERVICE] Finance directories created/verified');

    // Load summary cache
    await this.loadSummary();
  }

  /**
   * Get the finance directory path
   */
  getFinanceDirectory(): string | null {
    return this.financeDirectory;
  }

  /**
   * Get month key from date string (YYYY-MM)
   */
  private getMonthKey(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get file path for a specific month
   */
  private getMonthFilePath(monthKey: string): string {
    if (!this.transactionsDirectory) {
      throw new Error('Finance service not initialized');
    }
    return path.join(this.transactionsDirectory, `${monthKey}.json`);
  }

  /**
   * Get summary file path
   */
  private getSummaryFilePath(): string {
    if (!this.financeDirectory) {
      throw new Error('Finance service not initialized');
    }
    return path.join(this.financeDirectory, 'summary.json');
  }

  /**
   * Load summary from file
   */
  private async loadSummary(): Promise<FinanceSummary> {
    const filePath = this.getSummaryFilePath();

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.summaryCache = JSON.parse(content);
      console.log('[FINANCE-SERVICE] Summary loaded');
      return this.summaryCache!;
    } catch (error) {
      // If file doesn't exist, create empty summary
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('[FINANCE-SERVICE] No summary file found, creating new one');
        this.summaryCache = {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          monthlyStats: {},
          pocketSummaries: {}
        };
        await this.saveSummary(true); // Update timestamp for new file
        return this.summaryCache;
      }
      throw error;
    }
  }

  /**
   * Save summary to file
   */
  private async saveSummary(updateTimestamp: boolean = true): Promise<void> {
    if (!this.summaryCache) {
      throw new Error('Summary cache not initialized');
    }

    const filePath = this.getSummaryFilePath();
    if (updateTimestamp) {
      this.summaryCache.lastUpdated = new Date().toISOString();
    }
    await fs.writeFile(filePath, JSON.stringify(this.summaryCache, null, 2), 'utf-8');
    console.log('[FINANCE-SERVICE] Summary saved');
  }

  /**
   * Load transactions for a specific month
   */
  async loadTransactionsByMonth(monthKey: string): Promise<Transaction[]> {
    const filePath = this.getMonthFilePath(monthKey);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data: TransactionsData = JSON.parse(content);
      console.log('[FINANCE-SERVICE] Transactions loaded for', monthKey, ':', data.transactions.length);
      return data.transactions;
    } catch (error) {
      // If file doesn't exist, return empty array
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('[FINANCE-SERVICE] No transactions file for', monthKey);
        return [];
      }
      throw error;
    }
  }

  /**
   * Save transactions for a specific month
   */
  private async saveTransactionsForMonth(monthKey: string, transactions: Transaction[]): Promise<void> {
    const filePath = this.getMonthFilePath(monthKey);
    const data: TransactionsData = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      transactions
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[FINANCE-SERVICE] Transactions saved for', monthKey, ':', transactions.length);
  }

  /**
   * Load recent transactions (current month + previous months)
   */
  async loadRecentTransactions(monthsBack: number = 2): Promise<Transaction[]> {
    const allTransactions: Transaction[] = [];
    const currentDate = new Date();

    for (let i = 0; i <= monthsBack; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = this.getMonthKey(date.toISOString());
      const transactions = await this.loadTransactionsByMonth(monthKey);
      allTransactions.push(...transactions);
    }

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('[FINANCE-SERVICE] Recent transactions loaded:', allTransactions.length);
    return allTransactions;
  }

  /**
   * Add a single transaction
   */
  async addTransaction(transaction: Transaction): Promise<void> {
    const monthKey = this.getMonthKey(transaction.date);
    const transactions = await this.loadTransactionsByMonth(monthKey);

    transactions.push(transaction);
    await this.saveTransactionsForMonth(monthKey, transactions);

    // Update summary
    await this.updateSummaryForTransaction(transaction, 'add');
  }

  /**
   * Update a transaction
   * IMPORTANT: Handles moving transaction between months if date changed
   */
  async updateTransaction(oldTransaction: Transaction, newTransaction: Transaction): Promise<void> {
    const oldMonthKey = this.getMonthKey(oldTransaction.date);
    const newMonthKey = this.getMonthKey(newTransaction.date);

    // If month changed, remove from old month and add to new month
    if (oldMonthKey !== newMonthKey) {
      console.log('[FINANCE-SERVICE] Transaction moved from', oldMonthKey, 'to', newMonthKey);

      // Remove from old month
      const oldTransactions = await this.loadTransactionsByMonth(oldMonthKey);
      const filteredOld = oldTransactions.filter(t => t.id !== oldTransaction.id);
      await this.saveTransactionsForMonth(oldMonthKey, filteredOld);

      // Add to new month
      const newTransactions = await this.loadTransactionsByMonth(newMonthKey);
      newTransactions.push(newTransaction);
      await this.saveTransactionsForMonth(newMonthKey, newTransactions);
    } else {
      // Same month, just update
      const transactions = await this.loadTransactionsByMonth(oldMonthKey);
      const index = transactions.findIndex(t => t.id === oldTransaction.id);
      if (index !== -1) {
        transactions[index] = newTransaction;
        await this.saveTransactionsForMonth(oldMonthKey, transactions);
      }
    }

    // Update summary (remove old, add new)
    await this.updateSummaryForTransaction(oldTransaction, 'remove');
    await this.updateSummaryForTransaction(newTransaction, 'add');
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transaction: Transaction): Promise<void> {
    const monthKey = this.getMonthKey(transaction.date);
    const transactions = await this.loadTransactionsByMonth(monthKey);

    const filtered = transactions.filter(t => t.id !== transaction.id);
    await this.saveTransactionsForMonth(monthKey, filtered);

    // Update summary
    await this.updateSummaryForTransaction(transaction, 'remove');
  }

  /**
   * Update summary statistics for a transaction
   */
  private async updateSummaryForTransaction(transaction: Transaction, operation: 'add' | 'remove'): Promise<void> {
    if (!this.summaryCache) {
      await this.loadSummary();
    }

    const monthKey = this.getMonthKey(transaction.date);
    const multiplier = operation === 'add' ? 1 : -1;

    // Initialize monthly stats if not exists
    if (!this.summaryCache!.monthlyStats[monthKey]) {
      this.summaryCache!.monthlyStats[monthKey] = {
        income: 0,
        expense: 0,
        count: 0
      };
    }

    const monthStats = this.summaryCache!.monthlyStats[monthKey];

    // Update monthly stats
    if (transaction.type === 'income') {
      monthStats.income += transaction.amount * multiplier;
      monthStats.count += multiplier;
    } else if (transaction.type === 'expense') {
      monthStats.expense += transaction.amount * multiplier;
      monthStats.count += multiplier;
    } else if (transaction.type === 'transfer') {
      // Transfers don't affect income/expense but count as transactions
      monthStats.count += multiplier;
    }

    // Clean up empty months
    if (monthStats.count <= 0) {
      delete this.summaryCache!.monthlyStats[monthKey];
    }

    await this.saveSummary();
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<FinanceSummary> {
    if (!this.summaryCache) {
      await this.loadSummary();
    }
    return this.summaryCache!;
  }

  /**
   * Update pocket balances in summary
   */
  async updatePocketSummaries(pockets: Pocket[]): Promise<void> {
    if (!this.summaryCache) {
      await this.loadSummary();
    }

    let hasChanges = false;

    for (const pocket of pockets) {
      const existingSummary = this.summaryCache!.pocketSummaries[pocket.id];

      // Check if balance actually changed
      if (!existingSummary || existingSummary.balance !== pocket.balance) {
        hasChanges = true;
        this.summaryCache!.pocketSummaries[pocket.id] = {
          balance: pocket.balance,
          lastUpdated: new Date().toISOString()
        };
      }
    }

    // Only save if balances actually changed
    if (hasChanges) {
      await this.saveSummary();
    }
  }

  /**
   * Recalculate all pocket balances from ALL transactions
   * Use this for data integrity checks or migrations
   */
  async recalculateAllBalances(pockets: Pocket[]): Promise<Pocket[]> {
    console.log('[FINANCE-SERVICE] Recalculating all balances...');

    // Reset all balances
    const updatedPockets = pockets.map(p => ({ ...p, balance: 0 }));
    const balanceMap: Record<string, number> = {};
    pockets.forEach(p => balanceMap[p.id] = 0);

    // Load all transaction files
    if (!this.summaryCache) {
      await this.loadSummary();
    }

    const monthKeys = Object.keys(this.summaryCache!.monthlyStats);

    for (const monthKey of monthKeys) {
      const transactions = await this.loadTransactionsByMonth(monthKey);

      for (const transaction of transactions) {
        if (transaction.type === 'income' && transaction.pocketId) {
          balanceMap[transaction.pocketId] = (balanceMap[transaction.pocketId] || 0) + transaction.amount;
        } else if (transaction.type === 'expense' && transaction.pocketId) {
          balanceMap[transaction.pocketId] = (balanceMap[transaction.pocketId] || 0) - transaction.amount;
        } else if (transaction.type === 'transfer' && transaction.fromPocketId && transaction.toPocketId) {
          balanceMap[transaction.fromPocketId] = (balanceMap[transaction.fromPocketId] || 0) - transaction.amount;
          balanceMap[transaction.toPocketId] = (balanceMap[transaction.toPocketId] || 0) + transaction.amount;
        }
      }
    }

    // Update pocket balances
    updatedPockets.forEach(p => {
      p.balance = balanceMap[p.id] || 0;
    });

    // Update summary
    await this.updatePocketSummaries(updatedPockets);

    console.log('[FINANCE-SERVICE] Balances recalculated');
    return updatedPockets;
  }

  /**
   * Get all available months with transactions
   */
  async getAvailableMonths(): Promise<string[]> {
    if (!this.transactionsDirectory) {
      throw new Error('Finance service not initialized');
    }

    try {
      const files = await fs.readdir(this.transactionsDirectory);
      const months = files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort()
        .reverse(); // Most recent first

      return months;
    } catch (error) {
      console.error('[FINANCE-SERVICE] Error reading months:', error);
      return [];
    }
  }

  /**
   * Save pockets to JSON file
   */
  async savePockets(pockets: Pocket[]): Promise<void> {
    if (!this.financeDirectory) {
      throw new Error('Finance service not initialized');
    }

    const filePath = path.join(this.financeDirectory, 'pockets.json');
    const data: PocketsData = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      pockets
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[FINANCE-SERVICE] Pockets saved:', pockets.length);

    // Update summary
    await this.updatePocketSummaries(pockets);
  }

  /**
   * Load pockets from JSON file
   */
  async loadPockets(): Promise<Pocket[]> {
    if (!this.financeDirectory) {
      throw new Error('Finance service not initialized');
    }

    const filePath = path.join(this.financeDirectory, 'pockets.json');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data: PocketsData = JSON.parse(content);
      console.log('[FINANCE-SERVICE] Pockets loaded:', data.pockets.length);
      return data.pockets;
    } catch (error) {
      // If file doesn't exist, return empty array
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('[FINANCE-SERVICE] No pockets file found, returning empty array');
        return [];
      }
      throw error;
    }
  }

  /**
   * Save categories to JSON file
   */
  async saveCategories(categories: Category[]): Promise<void> {
    if (!this.financeDirectory) {
      throw new Error('Finance service not initialized');
    }

    const filePath = path.join(this.financeDirectory, 'categories.json');
    const data: CategoriesData = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      categories
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[FINANCE-SERVICE] Categories saved:', categories.length);
  }

  /**
   * Load categories from JSON file
   */
  async loadCategories(): Promise<Category[]> {
    if (!this.financeDirectory) {
      throw new Error('Finance service not initialized');
    }

    const filePath = path.join(this.financeDirectory, 'categories.json');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data: CategoriesData = JSON.parse(content);
      console.log('[FINANCE-SERVICE] Categories loaded:', data.categories.length);
      return data.categories;
    } catch (error) {
      // If file doesn't exist, return empty array
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('[FINANCE-SERVICE] No categories file found, returning empty array');
        return [];
      }
      throw error;
    }
  }

  /**
   * Migrate old single-file transactions to monthly files
   * Call this once to migrate existing data
   */
  async migrateToMonthlyFiles(): Promise<void> {
    if (!this.financeDirectory) {
      throw new Error('Finance service not initialized');
    }

    const oldFilePath = path.join(this.financeDirectory, 'transactions.json');

    try {
      const content = await fs.readFile(oldFilePath, 'utf-8');
      const data: TransactionsData = JSON.parse(content);
      console.log('[FINANCE-SERVICE] Migrating', data.transactions.length, 'transactions...');

      // Group by month
      const byMonth: Record<string, Transaction[]> = {};
      for (const transaction of data.transactions) {
        const monthKey = this.getMonthKey(transaction.date);
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(transaction);
      }

      // Save each month
      for (const [monthKey, transactions] of Object.entries(byMonth)) {
        await this.saveTransactionsForMonth(monthKey, transactions);
      }

      // Rebuild summary from scratch
      await this.rebuildSummary();

      // Backup old file
      const backupPath = path.join(this.financeDirectory, 'transactions.json.backup');
      await fs.rename(oldFilePath, backupPath);
      console.log('[FINANCE-SERVICE] Migration complete. Old file backed up to:', backupPath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('[FINANCE-SERVICE] No old transactions file to migrate');
        return;
      }
      throw error;
    }
  }

  /**
   * Rebuild summary from all transaction files
   */
  private async rebuildSummary(): Promise<void> {
    console.log('[FINANCE-SERVICE] Rebuilding summary...');

    this.summaryCache = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      monthlyStats: {},
      pocketSummaries: {}
    };

    const months = await this.getAvailableMonths();

    for (const monthKey of months) {
      const transactions = await this.loadTransactionsByMonth(monthKey);

      const stats: MonthlyStats = {
        income: 0,
        expense: 0,
        count: transactions.length
      };

      for (const transaction of transactions) {
        if (transaction.type === 'income') {
          stats.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          stats.expense += transaction.amount;
        }
      }

      this.summaryCache.monthlyStats[monthKey] = stats;
    }

    await this.saveSummary();
    console.log('[FINANCE-SERVICE] Summary rebuilt');
  }
}

// Export singleton instance
export const financeService = new FinanceService();

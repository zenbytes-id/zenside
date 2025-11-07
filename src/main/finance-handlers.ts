import { ipcMain } from 'electron';
import { financeService } from '../services/finance';
import { Transaction, Pocket, Category, FinanceSummary } from '../types/finance';

/**
 * Register all finance-related IPC handlers
 */
export function registerFinanceHandlers(): void {
  console.log('[Finance Handlers] Registering finance IPC handlers');

  // Initialize finance service with sync directory
  ipcMain.handle('finance:initialize', async (_, syncDirectory: string): Promise<void> => {
    console.log('[Finance Handlers] finance:initialize called with:', syncDirectory);
    try {
      await financeService.initialize(syncDirectory);
    } catch (error) {
      console.error('[Finance Handlers] Error initializing finance service:', error);
      throw error;
    }
  });

  // Migrate old transactions to monthly files
  ipcMain.handle('finance:migrateToMonthlyFiles', async (): Promise<void> => {
    console.log('[Finance Handlers] finance:migrateToMonthlyFiles called');
    try {
      await financeService.migrateToMonthlyFiles();
    } catch (error) {
      console.error('[Finance Handlers] Error migrating to monthly files:', error);
      throw error;
    }
  });

  // Get available months with transactions
  ipcMain.handle('finance:getAvailableMonths', async (): Promise<string[]> => {
    console.log('[Finance Handlers] finance:getAvailableMonths called');
    try {
      return await financeService.getAvailableMonths();
    } catch (error) {
      console.error('[Finance Handlers] Error getting available months:', error);
      throw error;
    }
  });

  // Load transactions for a specific month
  ipcMain.handle('finance:loadTransactionsByMonth', async (_, monthKey: string): Promise<Transaction[]> => {
    console.log('[Finance Handlers] finance:loadTransactionsByMonth called with:', monthKey);
    try {
      return await financeService.loadTransactionsByMonth(monthKey);
    } catch (error) {
      console.error('[Finance Handlers] Error loading transactions for month:', error);
      throw error;
    }
  });

  // Load recent transactions (last N months)
  ipcMain.handle('finance:loadRecentTransactions', async (_, monthsBack: number = 2): Promise<Transaction[]> => {
    console.log('[Finance Handlers] finance:loadRecentTransactions called with months:', monthsBack);
    try {
      return await financeService.loadRecentTransactions(monthsBack);
    } catch (error) {
      console.error('[Finance Handlers] Error loading recent transactions:', error);
      throw error;
    }
  });

  // Add a single transaction
  ipcMain.handle('finance:addTransaction', async (_, transaction: Transaction): Promise<void> => {
    console.log('[Finance Handlers] finance:addTransaction called');
    try {
      await financeService.addTransaction(transaction);
    } catch (error) {
      console.error('[Finance Handlers] Error adding transaction:', error);
      throw error;
    }
  });

  // Update a transaction
  ipcMain.handle('finance:updateTransaction', async (_, oldTransaction: Transaction, newTransaction: Transaction): Promise<void> => {
    console.log('[Finance Handlers] finance:updateTransaction called');
    try {
      await financeService.updateTransaction(oldTransaction, newTransaction);
    } catch (error) {
      console.error('[Finance Handlers] Error updating transaction:', error);
      throw error;
    }
  });

  // Delete a transaction
  ipcMain.handle('finance:deleteTransaction', async (_, transaction: Transaction): Promise<void> => {
    console.log('[Finance Handlers] finance:deleteTransaction called');
    try {
      await financeService.deleteTransaction(transaction);
    } catch (error) {
      console.error('[Finance Handlers] Error deleting transaction:', error);
      throw error;
    }
  });

  // Get summary statistics
  ipcMain.handle('finance:getSummary', async (): Promise<FinanceSummary> => {
    console.log('[Finance Handlers] finance:getSummary called');
    try {
      return await financeService.getSummary();
    } catch (error) {
      console.error('[Finance Handlers] Error getting summary:', error);
      throw error;
    }
  });

  // Recalculate all pocket balances
  ipcMain.handle('finance:recalculateAllBalances', async (_, pockets: Pocket[]): Promise<Pocket[]> => {
    console.log('[Finance Handlers] finance:recalculateAllBalances called');
    try {
      return await financeService.recalculateAllBalances(pockets);
    } catch (error) {
      console.error('[Finance Handlers] Error recalculating balances:', error);
      throw error;
    }
  });

  // Load pockets
  ipcMain.handle('finance:loadPockets', async (): Promise<Pocket[]> => {
    console.log('[Finance Handlers] finance:loadPockets called');
    try {
      return await financeService.loadPockets();
    } catch (error) {
      console.error('[Finance Handlers] Error loading pockets:', error);
      throw error;
    }
  });

  // Save pockets
  ipcMain.handle('finance:savePockets', async (_, pockets: Pocket[]): Promise<void> => {
    console.log('[Finance Handlers] finance:savePockets called with count:', pockets.length);
    try {
      await financeService.savePockets(pockets);
    } catch (error) {
      console.error('[Finance Handlers] Error saving pockets:', error);
      throw error;
    }
  });

  // Load categories
  ipcMain.handle('finance:loadCategories', async (): Promise<Category[]> => {
    console.log('[Finance Handlers] finance:loadCategories called');
    try {
      return await financeService.loadCategories();
    } catch (error) {
      console.error('[Finance Handlers] Error loading categories:', error);
      throw error;
    }
  });

  // Save categories
  ipcMain.handle('finance:saveCategories', async (_, categories: Category[]): Promise<void> => {
    console.log('[Finance Handlers] finance:saveCategories called with count:', categories.length);
    try {
      await financeService.saveCategories(categories);
    } catch (error) {
      console.error('[Finance Handlers] Error saving categories:', error);
      throw error;
    }
  });

  console.log('[Finance Handlers] Finance IPC handlers registered successfully');
}

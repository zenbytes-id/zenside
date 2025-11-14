import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, Pocket, Category, Bill, BillPayment, BillsData } from '../types/finance';
import { DEFAULT_CATEGORIES, createDefaultMainPocket } from '../constants/financeDefaults';
import { recalculatePocketBalances } from '../utils/financeCalculations';

export function useFinance() {
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Auto-commit timer ref
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Debounced git commit for finance changes
   * Waits 30 seconds after last change before committing
   */
  const scheduleGitCommit = useCallback((message: string) => {
    // Clear existing timer
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
    }

    // Schedule new commit
    commitTimerRef.current = setTimeout(async () => {
      try {
        // Add all finance files and commit
        await window.electronAPI?.git.add('finance/');
        await window.electronAPI?.git.commit(message);
        console.log('[Finance] Auto-committed:', message);
      } catch (error) {
        console.error('[Finance] Auto-commit failed:', error);
      }
    }, 30000); // 30 seconds
  }, []);

  /**
   * Initialize finance data - load from filesystem
   */
  const initialize = useCallback(async (syncDirectory: string) => {
    try {
      setIsLoading(true);

      // Initialize finance service
      await window.electronAPI?.finance.initialize(syncDirectory);

      // Check if we need to migrate old data
      await window.electronAPI?.finance.migrateToMonthlyFiles();

      // Load available months
      const months = await window.electronAPI?.finance.getAvailableMonths() || [];
      setAvailableMonths(months);

      // Load data
      const [loadedPockets, recentTransactions, loadedCategories, billsData] = await Promise.all([
        window.electronAPI?.finance.loadPockets() || [],
        window.electronAPI?.finance.loadRecentTransactions(2) || [], // Load last 3 months
        window.electronAPI?.finance.loadCategories() || [],
        window.electronAPI?.finance.loadBills() || { version: '1.0', lastUpdated: new Date().toISOString(), bills: [], payments: [] }
      ]);

      // If no pockets exist, create default main pocket
      if (loadedPockets.length === 0) {
        const defaultPocket = createDefaultMainPocket();
        await window.electronAPI?.finance.savePockets([defaultPocket]);
        setPockets([defaultPocket]);
      } else {
        // Recalculate balances from ALL transactions to ensure accuracy
        let recalculatedPockets = await window.electronAPI?.finance.recalculateAllBalances(loadedPockets) || loadedPockets;

        // Migration: Add order field to pockets that don't have it
        let needsSave = false;
        recalculatedPockets = recalculatedPockets.map((pocket, index) => {
          if (pocket.order === undefined) {
            needsSave = true;
            return { ...pocket, order: index };
          }
          return pocket;
        });

        if (needsSave) {
          await window.electronAPI?.finance.savePockets(recalculatedPockets);
        }

        setPockets(recalculatedPockets);
      }

      setTransactions(recentTransactions);

      // Use loaded categories, or DEFAULT_CATEGORIES if none exist
      if (loadedCategories.length === 0) {
        await window.electronAPI?.finance.saveCategories(DEFAULT_CATEGORIES);
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(loadedCategories);
      }

      // Set bills and payments
      setBills(billsData.bills);
      setBillPayments(billsData.payments);

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing finance:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load transactions for a specific month (lazy loading)
   */
  const loadTransactionsByMonth = useCallback(async (monthKey: string) => {
    try {
      const monthTransactions = await window.electronAPI?.finance.loadTransactionsByMonth(monthKey) || [];

      // Merge with existing transactions (avoid duplicates)
      setTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTransactions = monthTransactions.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTransactions].sort((a, b) => {
          // Sort by date first (descending)
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          // If dates are equal, sort by createdAt (descending) for stable ordering
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      return monthTransactions;
    } catch (error) {
      console.error('Error loading transactions for month:', monthKey, error);
      return [];
    }
  }, []);

  /**
   * Add a new transaction
   */
  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    // Save to monthly file via service
    await window.electronAPI?.finance.addTransaction(newTransaction);

    // Update local state
    setTransactions(prev => [newTransaction, ...prev].sort((a, b) => {
      // Sort by date first (descending)
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      // If dates are equal, sort by createdAt (descending) for stable ordering
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }));

    // Recalculate pocket balances
    const updatedPockets = await window.electronAPI?.finance.recalculateAllBalances(pockets) || pockets;
    setPockets(updatedPockets);

    // Schedule git commit
    scheduleGitCommit(`Add finance transaction: ${transaction.type} ${transaction.amount}`);

    return newTransaction;
  }, [pockets, scheduleGitCommit]);

  /**
   * Update a transaction
   */
  const updateTransaction = useCallback(async (id: string, updates: Omit<Transaction, 'id' | 'createdAt'>) => {
    // Find the old transaction
    const oldTransaction = transactions.find(t => t.id === id);
    if (!oldTransaction) {
      console.error('Transaction not found:', id);
      return;
    }

    const newTransaction: Transaction = {
      ...oldTransaction,
      ...updates
    };

    // Update via service (handles month changes)
    await window.electronAPI?.finance.updateTransaction(oldTransaction, newTransaction);

    // Update local state
    setTransactions(prev =>
      prev.map(t => t.id === id ? newTransaction : t).sort((a, b) => {
        // Sort by date first (descending)
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        // If dates are equal, sort by createdAt (descending) for stable ordering
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    );

    // Recalculate pocket balances
    const updatedPockets = await window.electronAPI?.finance.recalculateAllBalances(pockets) || pockets;
    setPockets(updatedPockets);

    // Schedule git commit
    scheduleGitCommit(`Update finance transaction: ${id}`);
  }, [transactions, pockets, scheduleGitCommit]);

  /**
   * Delete a transaction
   */
  const deleteTransaction = useCallback(async (id: string) => {
    // Find the transaction to delete
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) {
      console.error('Transaction not found:', id);
      return;
    }

    // Delete via service
    await window.electronAPI?.finance.deleteTransaction(transaction);

    // Update local state
    setTransactions(prev => prev.filter(t => t.id !== id));

    // Recalculate pocket balances
    const updatedPockets = await window.electronAPI?.finance.recalculateAllBalances(pockets) || pockets;
    setPockets(updatedPockets);

    // Schedule git commit
    scheduleGitCommit(`Delete finance transaction: ${id}`);
  }, [transactions, pockets, scheduleGitCommit]);

  /**
   * Add a new pocket
   */
  const addPocket = useCallback(async (pocket: Omit<Pocket, 'id' | 'balance' | 'order' | 'createdAt' | 'updatedAt'>) => {
    // Calculate the next order number
    const maxOrder = pockets.length > 0 ? Math.max(...pockets.map(p => p.order)) : -1;

    const newPocket: Pocket = {
      ...pocket,
      id: uuidv4(),
      balance: pocket.openingBalance || 0, // Start with opening balance if set, otherwise 0
      order: maxOrder + 1, // Assign next order number
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedPockets = [...pockets, newPocket];
    setPockets(updatedPockets);

    // Save to filesystem
    await window.electronAPI?.finance.savePockets(updatedPockets);

    // Schedule git commit
    scheduleGitCommit(`Add finance pocket: ${pocket.name}`);

    return newPocket;
  }, [pockets, scheduleGitCommit]);

  /**
   * Update a pocket
   */
  const updatePocket = useCallback(async (id: string, updates: Partial<Pocket>) => {
    let updatedPockets = pockets.map(p =>
      p.id === id
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    );

    // If opening balance was changed, recalculate all balances
    if (updates.openingBalance !== undefined) {
      updatedPockets = await window.electronAPI?.finance.recalculateAllBalances(updatedPockets) || updatedPockets;
    }

    setPockets(updatedPockets);

    // Save to filesystem
    await window.electronAPI?.finance.savePockets(updatedPockets);

    // Schedule git commit
    scheduleGitCommit(`Update finance pocket: ${id}`);
  }, [pockets, scheduleGitCommit]);

  /**
   * Delete a pocket
   * WARNING: This will orphan transactions associated with this pocket
   */
  const deletePocket = useCallback(async (id: string) => {
    // Don't allow deleting the default pocket
    const pocket = pockets.find(p => p.id === id);
    if (pocket?.isDefault) {
      throw new Error('Cannot delete the default pocket');
    }

    const updatedPockets = pockets.filter(p => p.id !== id);
    setPockets(updatedPockets);

    // Save to filesystem
    await window.electronAPI?.finance.savePockets(updatedPockets);

    // Schedule git commit
    scheduleGitCommit(`Delete finance pocket: ${id}`);
  }, [pockets, scheduleGitCommit]);

  /**
   * Reorder pockets
   */
  const reorderPockets = useCallback(async (reorderedPockets: Pocket[]) => {
    setPockets(reorderedPockets);

    // Save to filesystem
    await window.electronAPI?.finance.savePockets(reorderedPockets);

    // Schedule git commit
    scheduleGitCommit('Reorder finance pockets');
  }, [scheduleGitCommit]);

  /**
   * Get transactions for a specific pocket
   */
  const getTransactionsForPocket = useCallback((pocketId: string): Transaction[] => {
    return transactions.filter(t => {
      if (t.type === 'transfer') {
        return t.fromPocketId === pocketId || t.toPocketId === pocketId;
      }
      return t.pocketId === pocketId;
    });
  }, [transactions]);

  /**
   * Get category by ID
   */
  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  }, [categories]);

  /**
   * Get pocket by ID
   */
  const getPocketById = useCallback((id: string): Pocket | undefined => {
    return pockets.find(p => p.id === id);
  }, [pockets]);

  /**
   * Get summary statistics
   */
  const getSummary = useCallback(async () => {
    return await window.electronAPI?.finance.getSummary();
  }, []);

  // ========== BILL MANAGEMENT ==========

  /**
   * Reload bills from filesystem
   */
  const reloadBills = useCallback(async () => {
    try {
      const billsData = await window.electronAPI?.finance.loadBills() || { version: '1.0', lastUpdated: new Date().toISOString(), bills: [], payments: [] };
      setBills(billsData.bills);
      setBillPayments(billsData.payments);
    } catch (error) {
      console.error('Error reloading bills:', error);
    }
  }, []);

  /**
   * Add a new bill
   */
  const addBill = useCallback(async (bill: Omit<Bill, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => {
    // Calculate the next order number (higher = first)
    const maxOrder = bills.length > 0 ? Math.max(...bills.map(b => b.order)) : -1;

    const newBill: Bill = {
      ...bill,
      id: uuidv4(),
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await window.electronAPI?.finance.addBill(newBill);
    setBills(prev => [...prev, newBill]);

    // Schedule git commit
    scheduleGitCommit(`Add bill: ${bill.name}`);

    return newBill;
  }, [bills, scheduleGitCommit]);

  /**
   * Update a bill
   */
  const updateBill = useCallback(async (id: string, updates: Partial<Bill>) => {
    const updatedBills = bills.map(b =>
      b.id === id
        ? { ...b, ...updates, updatedAt: new Date().toISOString() }
        : b
    );

    const updatedBill = updatedBills.find(b => b.id === id);
    if (updatedBill) {
      await window.electronAPI?.finance.updateBill(updatedBill);
      setBills(updatedBills);

      // Schedule git commit
      scheduleGitCommit(`Update bill: ${id}`);
    }
  }, [bills, scheduleGitCommit]);

  /**
   * Delete a bill
   */
  const deleteBill = useCallback(async (id: string) => {
    await window.electronAPI?.finance.deleteBill(id);
    setBills(prev => prev.filter(b => b.id !== id));
    setBillPayments(prev => prev.filter(p => p.billId !== id));

    // Schedule git commit
    scheduleGitCommit(`Delete bill: ${id}`);
  }, [scheduleGitCommit]);

  /**
   * Reorder bills
   */
  const reorderBills = useCallback(async (reorderedBills: Bill[]) => {
    setBills(reorderedBills);
    await window.electronAPI?.finance.reorderBills(reorderedBills);

    // Schedule git commit
    scheduleGitCommit('Reorder bills');
  }, [scheduleGitCommit]);

  /**
   * Pay a bill
   */
  const payBill = useCallback(async (
    billId: string,
    pocketId: string,
    amount: number,
    date: string,
    description: string
  ) => {
    const result = await window.electronAPI?.finance.payBill(billId, pocketId, amount, date, description);

    if (result) {
      // Update local state
      setTransactions(prev => [result.transaction, ...prev].sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));

      setBillPayments(prev => [...prev, result.payment]);

      // Recalculate pocket balances
      const updatedPockets = await window.electronAPI?.finance.recalculateAllBalances(pockets) || pockets;
      setPockets(updatedPockets);

      // Schedule git commit
      const bill = bills.find(b => b.id === billId);
      scheduleGitCommit(`Pay bill: ${bill?.name || billId}`);

      return result;
    }
  }, [pockets, bills, scheduleGitCommit]);

  /**
   * Get payment status for a bill in a specific month
   */
  const getBillPaymentStatus = useCallback((billId: string, monthKey: string): BillPayment | null => {
    return billPayments.find(p => p.billId === billId && p.month === monthKey) || null;
  }, [billPayments]);

  /**
   * Get payment history for a bill
   */
  const getBillPaymentHistory = useCallback((billId: string): BillPayment[] => {
    return billPayments.filter(p => p.billId === billId);
  }, [billPayments]);

  /**
   * Get bill by ID
   */
  const getBillById = useCallback((id: string): Bill | undefined => {
    return bills.find(b => b.id === id);
  }, [bills]);

  return {
    // State
    pockets,
    transactions,
    categories,
    bills,
    billPayments,
    isLoading,
    isInitialized,
    availableMonths,

    // Actions
    initialize,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addPocket,
    updatePocket,
    deletePocket,
    reorderPockets,
    loadTransactionsByMonth,

    // Bill actions
    addBill,
    updateBill,
    deleteBill,
    reorderBills,
    payBill,
    reloadBills,

    // Helpers
    getTransactionsForPocket,
    getCategoryById,
    getPocketById,
    getSummary,
    getBillPaymentStatus,
    getBillPaymentHistory,
    getBillById
  };
}

import React, { useEffect, useState, useRef } from 'react';
import { Pocket, Transaction, Bill } from '../../types/finance';
import { useFinance } from '../../hooks/useFinance';
import { formatCurrency } from '../../utils/dateFormatting';
import { calculateTotalBalance, calculateMonthlyIncome, calculateMonthlyExpense } from '../../utils/financeCalculations';
import { AddTransactionDialog } from './AddTransactionDialog';
import { EditTransactionDialog } from './EditTransactionDialog';
import { AddPocketDialog } from './AddPocketDialog';
import { EditPocketDialog } from './EditPocketDialog';
import { ManagePocketsDialog } from './ManagePocketsDialog';
import { ExpenseChartDialog } from './ExpenseChartDialog';
import { BillCarousel } from './BillCarousel';
import { PayBillModal } from './PayBillModal';
import { AddBillDialog } from './AddBillDialog';
import { EditBillDialog } from './EditBillDialog';
import { ManageBillsDialog } from './ManageBillsDialog';
import { FiSearch, FiSettings, FiPlus, FiX, FiFilter, FiList, FiPieChart, FiChevronDown, FiChevronUp, FiEye, FiEyeOff } from 'react-icons/fi';

interface FinanceViewProps {
  syncDirectory: string | null;
  onOpenSettings?: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ syncDirectory, onOpenSettings }) => {
  const {
    pockets,
    transactions,
    categories,
    bills,
    billPayments,
    isLoading,
    isInitialized,
    availableMonths,
    initialize,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addPocket,
    updatePocket,
    deletePocket,
    reorderPockets,
    addBill,
    updateBill,
    deleteBill,
    reorderBills,
    payBill,
    getTransactionsForPocket,
    getCategoryById,
    getPocketById,
    loadTransactionsByMonth
  } = useFinance();

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [showAddPocket, setShowAddPocket] = useState(false);
  const [showEditPocket, setShowEditPocket] = useState(false);
  const [showManagePockets, setShowManagePockets] = useState(false);
  const [showExpenseChart, setShowExpenseChart] = useState(false);
  const [showPayBill, setShowPayBill] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showEditBill, setShowEditBill] = useState(false);
  const [showManageBills, setShowManageBills] = useState(false);
  const [selectedPocket, setSelectedPocket] = useState<Pocket | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSearchAnimating, setIsSearchAnimating] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set());
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isExpenseExpanded, setIsExpenseExpanded] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    const saved = localStorage.getItem('zenside-balance-visible');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const addMenuRef = useRef<HTMLDivElement>(null);
  const transactionsListRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate active filter count
  const activeFiltersCount = (dateFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  // Handle search toggle with animation
  const handleSearchToggle = () => {
    if (isSearchExpanded && !isSearchAnimating) {
      // Start collapse animation
      setIsSearchAnimating(true);
      setIsSearchExpanded(false);
      // Wait for animation to complete before fully hiding
      setTimeout(() => {
        setIsSearchAnimating(false);
      }, 300); // Match animation duration
    } else if (!isSearchExpanded && !isSearchAnimating) {
      // Expand immediately
      setIsSearchExpanded(true);
    }
  };

  // Helper function to display balance as hidden or visible
  const formatBalance = (amount: number) => {
    return isBalanceVisible ? formatCurrency(amount) : '••••••';
  };

  // Save balance visibility preference to localStorage
  useEffect(() => {
    localStorage.setItem('zenside-balance-visible', JSON.stringify(isBalanceVisible));
  }, [isBalanceVisible]);

  // Handle scrollbar auto-hide for transactions list
  useEffect(() => {
    const transactionsList = transactionsListRef.current;
    if (!transactionsList) return;

    // Remove any existing scrolling class on mount
    transactionsList.classList.remove('scrolling');

    const handleScroll = () => {
      // Show scrollbar when scrolling
      transactionsList.classList.add('scrolling');

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set new timeout to hide scrollbar after 3 seconds of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        transactionsList.classList.remove('scrolling');
      }, 3000);
    };

    transactionsList.addEventListener('scroll', handleScroll);

    return () => {
      transactionsList.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Clean up scrolling class on unmount
      transactionsList.classList.remove('scrolling');
    };
  }, []); // Run once on mount, matching ZenNote pattern

  // Close add menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddMenu]);

  // Initialize finance when sync directory is available
  useEffect(() => {
    if (syncDirectory && !isInitialized) {
      initialize(syncDirectory);
    }
  }, [syncDirectory, isInitialized, initialize]);

  // Track loaded months (initially last 3 months)
  useEffect(() => {
    if (isInitialized && availableMonths.length > 0) {
      const recent = new Set(availableMonths.slice(0, 3));
      setLoadedMonths(recent);
    }
  }, [isInitialized, availableMonths]);

  // Load more transactions (next month)
  const handleLoadMore = async () => {
    if (isLoadingMore || availableMonths.length === 0) return;

    // Find next unloaded month
    const nextMonth = availableMonths.find(month => !loadedMonths.has(month));
    if (!nextMonth) return;

    setIsLoadingMore(true);
    try {
      await loadTransactionsByMonth(nextMonth);
      setLoadedMonths(prev => new Set([...prev, nextMonth]));
    } catch (error) {
      console.error('Error loading more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Check if there are more months to load
  const hasMoreToLoad = availableMonths.some(month => !loadedMonths.has(month));

  // Calculate summary for current month
  const currentMonth = new Date();
  const totalBalance = calculateTotalBalance(pockets);
  const monthlyIncome = calculateMonthlyIncome(null, transactions, currentMonth);
  const monthlyExpense = calculateMonthlyExpense(null, transactions, currentMonth);
  const netMonthly = monthlyIncome - monthlyExpense;

  // Filter transactions based on search query, date, and type
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const description = transaction.description?.toLowerCase() || '';
      const category = transaction.categoryId ? getCategoryById(transaction.categoryId)?.name.toLowerCase() : '';
      const pocket = transaction.pocketId ? getPocketById(transaction.pocketId)?.name.toLowerCase() : '';
      const fromPocket = transaction.fromPocketId ? getPocketById(transaction.fromPocketId)?.name.toLowerCase() : '';
      const toPocket = transaction.toPocketId ? getPocketById(transaction.toPocketId)?.name.toLowerCase() : '';

      const matchesSearch = description.includes(query) ||
             category?.includes(query) ||
             pocket?.includes(query) ||
             fromPocket?.includes(query) ||
             toPocket?.includes(query);

      if (!matchesSearch) return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      switch (dateFilter) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * dayMs);
          if (transactionDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (transactionDate < monthAgo) return false;
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          if (transactionDate < yearAgo) return false;
          break;
      }
    }

    // Type filter
    if (typeFilter !== 'all' && transaction.type !== typeFilter) {
      return false;
    }

    return true;
  });

  if (!syncDirectory) {
    return (
      <div className="finance-view">
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p className="empty-state-title">Choose Directory First</p>
          <p className="empty-state-description">
            Please select a sync directory in Settings to start using ZenCash
          </p>
          <button
            onClick={onOpenSettings}
            className="btn-create-first"
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="finance-view">
        <div className="loading-state">
          <p>Loading finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header - matching ZenNote style */}
      <div className="header">
        <h2 className="header-title">ZenCash</h2>
        <div className="header-actions">
          <button
            className="btn-icon"
            onClick={onOpenSettings}
            title="Settings"
          >
            <FiSettings size={18} />
          </button>
          <div className="add-menu-wrapper" ref={addMenuRef}>
            <button
              className="btn-add-transaction"
              onClick={() => setShowAddMenu(!showAddMenu)}
              title="Add"
            >
              <FiPlus size={18} />
            </button>
            {showAddMenu && (
              <div className="add-dropdown-menu">
                <button
                  className="add-menu-item"
                  onClick={() => {
                    setShowAddTransaction(true);
                    setShowAddMenu(false);
                  }}
                >
                  <FiPlus size={16} />
                  Add Transaction
                </button>
                <button
                  className="add-menu-item"
                  onClick={() => {
                    setShowAddPocket(true);
                    setShowAddMenu(false);
                  }}
                >
                  <FiPlus size={16} />
                  Add Pocket
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="finance-view">

      {/* Summary Widget */}
      <div className="finance-summary">
        {/* Single Container with All Stats */}
        <div className="monthly-stats">
          {/* Total Balance - Always Visible */}
          <div className="stat-row total-balance-row">
            <div className="total-balance-left">
              <div className="stat-label">Total Balance</div>
              <div className="stat-value total-balance-value">{formatBalance(totalBalance)}</div>
            </div>
            <button
              className="btn-toggle-visibility"
              onClick={(e) => {
                e.stopPropagation();
                setIsBalanceVisible(!isBalanceVisible);
              }}
              title={isBalanceVisible ? "Hide balance" : "Show balance"}
            >
              {isBalanceVisible ? <FiEye size={18} /> : <FiEyeOff size={18} />}
            </button>
          </div>

          {/* Expandable Section Toggle */}
          <div
            className="stat-row expandable-toggle-row"
            onClick={() => setIsExpenseExpanded(!isExpenseExpanded)}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-label">Monthly Summary</div>
            <div className="expand-icon">
              {isExpenseExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </div>
          </div>

          {/* Expandable Content: Income, Expense, and View Chart */}
          {isExpenseExpanded && (
            <div className="expandable-content">
              {/* This Month Income */}
              <div className="stat-row">
                <div className="stat-label">This Month Income</div>
                <div className="stat-value income">{formatBalance(monthlyIncome)}</div>
              </div>

              {/* This Month Expense */}
              <div className="stat-row">
                <div className="stat-label">This Month Expense</div>
                <div className="stat-value expense">{formatBalance(monthlyExpense)}</div>
              </div>

              {/* View Chart Button */}
              <div className="stat-row chart-action">
                <button
                  className="btn-view-chart"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExpenseChart(true);
                  }}
                  title="View expense breakdown chart"
                >
                  <FiPieChart size={16} />
                  View Chart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pockets List */}
      <div className="pockets-section">
        <div className="pockets-header">
          <h3>Pockets</h3>
          {pockets.length > 0 && (
            <button
              className="btn-manage-pockets"
              onClick={() => setShowManagePockets(true)}
              title="Manage pocket order"
            >
              <FiList size={18} />
            </button>
          )}
        </div>
        {pockets.length === 0 ? (
          <div className="empty-state">
            <p>No pockets yet. Click the + button to add your first pocket.</p>
          </div>
        ) : (
          <div className="pockets-list">
            {[...pockets].sort((a, b) => a.order - b.order).map(pocket => {
              const handleDeletePocket = (e: React.MouseEvent) => {
                e.stopPropagation();

                if (pocket.isDefault) {
                  alert('Cannot delete the default pocket');
                  return;
                }

                const confirmMessage = `Are you sure you want to delete "${pocket.name}"?\n\nWarning: Transactions associated with this pocket will become orphaned.`;
                if (window.confirm(confirmMessage)) {
                  deletePocket(pocket.id);
                }
              };

              return (
                <div
                  key={pocket.id}
                  className="pocket-card"
                  style={{ borderColor: `${pocket.color}33` }}
                  onClick={() => {
                    setSelectedPocket(pocket);
                    setShowEditPocket(true);
                  }}
                >
                  <div className="pocket-icon">{pocket.icon}</div>
                  <div className="pocket-info">
                    <div className="pocket-name">{pocket.name}</div>
                    <div className="pocket-balance" style={{ color: pocket.color }}>
                      {formatBalance(pocket.balance)}
                    </div>
                  </div>
                  {!pocket.isDefault && (
                    <button
                      className="btn-delete-pocket"
                      onClick={handleDeletePocket}
                      title="Delete pocket"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bills Section */}
      <BillCarousel
        bills={bills}
        billPayments={billPayments}
        currentMonth={new Date().toISOString().slice(0, 7)} // "YYYY-MM"
        isBalanceVisible={isBalanceVisible}
        onPayBill={(bill) => {
          setSelectedBill(bill);
          setShowPayBill(true);
        }}
        onEditBill={(bill) => {
          setSelectedBill(bill);
          setShowEditBill(true);
        }}
        onAddBill={() => setShowAddBill(true)}
        onManageBills={() => setShowManageBills(true)}
      />

      {/* Recent Transactions */}
      <div className="transactions-section">
        <div className="transactions-header">
          <h3>Recent Transactions</h3>
          <div className="transactions-header-actions">
            <button
              className="btn-icon"
              onClick={handleSearchToggle}
              title="Search transactions"
            >
              <FiSearch size={18} />
            </button>
            <button
              className="btn-add-transaction-quick"
              onClick={() => setShowAddTransaction(true)}
              title="Add transaction"
            >
              <FiPlus size={18} />
            </button>
          </div>
        </div>

        {/* Collapsible Search Bar */}
        {(isSearchExpanded || isSearchAnimating) && (
          <div className={`search-bar ${!isSearchExpanded && isSearchAnimating ? 'search-bar-collapsing' : ''}`}>
            <div className="search-input-wrapper">
              <FiSearch className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <FiX size={18} />
                </button>
              )}
              <button
                className="btn-filter"
                onClick={() => setShowFilters(true)}
                title="Filter transactions"
              >
                <FiFilter size={16} />
                {activeFiltersCount > 0 && (
                  <span className="filter-badge">{activeFiltersCount}</span>
                )}
              </button>
            </div>
          </div>
        )}
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions yet</p>
            <button
              className="btn-create-first"
              onClick={() => setShowAddTransaction(true)}
            >
              Add your first transaction
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions match your search</p>
            <button
              className="btn-secondary"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="transactions-list" ref={transactionsListRef}>
              {filteredTransactions
                .sort((a, b) => {
                  // Sort by date first (descending)
                  const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                  if (dateDiff !== 0) return dateDiff;
                  // If dates are equal, sort by createdAt (descending) for stable ordering
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map(transaction => {
                  const category = transaction.categoryId ? getCategoryById(transaction.categoryId) : null;
                  const pocket = transaction.pocketId ? getPocketById(transaction.pocketId) : null;
                  const fromPocket = transaction.fromPocketId ? getPocketById(transaction.fromPocketId) : null;
                  const toPocket = transaction.toPocketId ? getPocketById(transaction.toPocketId) : null;

                  const handleDelete = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this transaction?')) {
                      deleteTransaction(transaction.id);
                    }
                  };

                  const handleEdit = () => {
                    setSelectedTransaction(transaction);
                    setShowEditTransaction(true);
                  };

                  return (
                    <div
                      key={transaction.id}
                      className={`transaction-item ${transaction.type}`}
                      onClick={handleEdit}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="transaction-icon">
                        {category?.icon || (transaction.type === 'transfer' ? '🔄' : '💰')}
                      </div>
                      <div className="transaction-info">
                        <div className="transaction-description">
                          {transaction.description || category?.name || 'Transaction'}
                        </div>
                        <div className="transaction-details">
                          {transaction.type === 'transfer' ? (
                            <span>
                              {fromPocket?.name} → {toPocket?.name}
                            </span>
                          ) : (
                            <span>{pocket?.name}</span>
                          )}
                          {' • '}
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className={`transaction-amount ${transaction.type}`}>
                        {transaction.type === 'income' && '+'}
                        {transaction.type === 'expense' && '-'}
                        {formatCurrency(transaction.amount)}
                      </div>
                      <button
                        className="btn-delete-transaction"
                        onClick={handleDelete}
                        title="Delete transaction"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

              {/* Load More Button */}
              {hasMoreToLoad && (
                <button
                  className="btn-load-more"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : `Load More (${availableMonths.length - loadedMonths.size} months available)`}
                </button>
              )}
            </div>

            {/* Info: Showing loaded months - moved outside scrollable area */}
            {loadedMonths.size > 0 && (
              <div className="transactions-info">
                <small>
                  Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                  {dateFilter === 'all' && ` from ${loadedMonths.size} month${loadedMonths.size !== 1 ? 's' : ''}`}
                  {dateFilter === 'week' && ` from last week`}
                  {dateFilter === 'month' && ` from last month`}
                  {dateFilter === 'year' && ` from last year`}
                  {typeFilter !== 'all' && ` (${typeFilter} only)`}
                  {hasMoreToLoad && ` • ${availableMonths.length - loadedMonths.size} more month${availableMonths.length - loadedMonths.size !== 1 ? 's' : ''} available`}
                </small>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        onSubmit={addTransaction}
        pockets={pockets}
        categories={categories}
      />

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        isOpen={showEditTransaction}
        onClose={() => {
          setShowEditTransaction(false);
          setSelectedTransaction(null);
        }}
        onSubmit={updateTransaction}
        pockets={pockets}
        categories={categories}
        transaction={selectedTransaction}
      />

      {/* Add Pocket Dialog */}
      <AddPocketDialog
        isOpen={showAddPocket}
        onClose={() => setShowAddPocket(false)}
        onSubmit={addPocket}
      />

      {/* Edit Pocket Dialog */}
      <EditPocketDialog
        isOpen={showEditPocket}
        onClose={() => {
          setShowEditPocket(false);
          setSelectedPocket(null);
        }}
        onSubmit={updatePocket}
        pocket={selectedPocket}
      />

      {/* Manage Pockets Dialog */}
      <ManagePocketsDialog
        isOpen={showManagePockets}
        onClose={() => setShowManagePockets(false)}
        pockets={pockets}
        onReorder={reorderPockets}
      />

      {/* Expense Chart Dialog */}
      <ExpenseChartDialog
        isOpen={showExpenseChart}
        onClose={() => setShowExpenseChart(false)}
        transactions={transactions}
        categories={categories}
        availableMonths={availableMonths}
        onLoadMonth={loadTransactionsByMonth}
      />

      {/* Pay Bill Modal */}
      <PayBillModal
        isOpen={showPayBill}
        onClose={() => {
          setShowPayBill(false);
          setSelectedBill(null);
        }}
        onSubmit={async (pocketId, amount, date, description) => {
          if (selectedBill) {
            await payBill(selectedBill.id, pocketId, amount, date, description);
          }
        }}
        bill={selectedBill}
        pockets={pockets}
      />

      {/* Add Bill Dialog */}
      <AddBillDialog
        isOpen={showAddBill}
        onClose={() => setShowAddBill(false)}
        onSubmit={addBill}
        categories={categories}
      />

      {/* Edit Bill Dialog */}
      <EditBillDialog
        isOpen={showEditBill}
        onClose={() => {
          setShowEditBill(false);
          setSelectedBill(null);
        }}
        onSubmit={updateBill}
        onDelete={deleteBill}
        bill={selectedBill}
        categories={categories}
      />

      {/* Manage Bills Dialog */}
      <ManageBillsDialog
        isOpen={showManageBills}
        onClose={() => setShowManageBills(false)}
        bills={bills}
        onReorder={reorderBills}
      />

      {/* Filter Modal */}
      {showFilters && (
        <div className="modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filter Transactions</h3>
              <button className="btn-close" onClick={() => setShowFilters(false)}>×</button>
            </div>

            <div className="modal-body">
              {/* Info about loaded data */}
              {loadedMonths.size > 0 && (
                <div className="filter-info-banner">
                  <small>
                    Showing <strong>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</strong>
                    {dateFilter === 'all' && ` from ${loadedMonths.size} month${loadedMonths.size !== 1 ? 's' : ''}`}
                    {dateFilter === 'week' && ` from last week`}
                    {dateFilter === 'month' && ` from last month`}
                    {dateFilter === 'year' && ` from last year`}
                    {typeFilter !== 'all' && ` (${typeFilter} only)`}
                    {hasMoreToLoad && (
                      <>
                        <br />
                        {availableMonths.length - loadedMonths.size} more month{availableMonths.length - loadedMonths.size !== 1 ? 's' : ''} available to load
                      </>
                    )}
                  </small>
                </div>
              )}

              {/* Date Filter */}
              <div className="form-group">
                <label className="form-label">Period</label>
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDateFilter('all')}
                  >
                    All Loaded
                  </button>
                  <button
                    className={`filter-btn ${dateFilter === 'week' ? 'active' : ''}`}
                    onClick={() => setDateFilter('week')}
                  >
                    Last Week
                  </button>
                  <button
                    className={`filter-btn ${dateFilter === 'month' ? 'active' : ''}`}
                    onClick={() => setDateFilter('month')}
                  >
                    Last Month
                  </button>
                  <button
                    className={`filter-btn ${dateFilter === 'year' ? 'active' : ''}`}
                    onClick={() => setDateFilter('year')}
                  >
                    Last Year
                  </button>
                </div>
                {dateFilter !== 'all' && hasMoreToLoad && (
                  <div className="filter-hint">
                    <small>💡 Filters apply to loaded data only. Use "Load More" to expand search.</small>
                  </div>
                )}
              </div>

              {/* Type Filter */}
              <div className="form-group">
                <label className="form-label">Transaction Type</label>
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setTypeFilter('all')}
                  >
                    All Types
                  </button>
                  <button
                    className={`filter-btn ${typeFilter === 'income' ? 'active' : ''}`}
                    onClick={() => setTypeFilter('income')}
                  >
                    Income
                  </button>
                  <button
                    className={`filter-btn ${typeFilter === 'expense' ? 'active' : ''}`}
                    onClick={() => setTypeFilter('expense')}
                  >
                    Expense
                  </button>
                  <button
                    className={`filter-btn ${typeFilter === 'transfer' ? 'active' : ''}`}
                    onClick={() => setTypeFilter('transfer')}
                  >
                    Transfer
                  </button>
                </div>
              </div>

              {/* Quick Load More Option */}
              {hasMoreToLoad && (dateFilter !== 'all' || typeFilter !== 'all') && (
                <div className="filter-load-more-section">
                  <div className="divider"></div>
                  <button
                    type="button"
                    className="btn-filter-load-more"
                    onClick={async () => {
                      await handleLoadMore();
                    }}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Loading...' : '📥 Load More Data Before Filtering'}
                  </button>
                  <small className="helper-text">
                    Load additional months to include more transactions in your filter results
                  </small>
                </div>
              )}

              {/* Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setDateFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowFilters(false)}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

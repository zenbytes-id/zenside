import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category } from '../../types/finance';
import { groupExpensesByCategory, getMonthDateRange } from '../../utils/financeCalculations';
import { formatCurrency } from '../../utils/dateFormatting';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface ExpenseChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  availableMonths: string[]; // Format: "YYYY-MM"
  onLoadMonth: (monthKey: string) => Promise<Transaction[]>;
}

export const ExpenseChartDialog: React.FC<ExpenseChartDialogProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  availableMonths,
  onLoadMonth
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last' | 'pick'>('current');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [isHovering, setIsHovering] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Initialize selectedMonth to current month
  useEffect(() => {
    if (isOpen && !selectedMonth) {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(currentMonthKey);
    }
  }, [isOpen, selectedMonth]);

  // Determine which month to display
  const displayMonth = useMemo(() => {
    const now = new Date();

    switch (selectedPeriod) {
      case 'current':
        return now;
      case 'last':
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
      case 'pick':
        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-').map(Number);
          return new Date(year, month - 1, 1);
        }
        return now;
      default:
        return now;
    }
  }, [selectedPeriod, selectedMonth]);

  // Get month key for the display month
  const displayMonthKey = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = String(displayMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [displayMonth]);

  // Load month data if needed
  useEffect(() => {
    const loadMonthData = async () => {
      if (displayMonthKey && !availableMonths.includes(displayMonthKey)) {
        setIsLoadingMonth(true);
        try {
          await onLoadMonth(displayMonthKey);
        } catch (error) {
          console.error('Error loading month:', error);
        } finally {
          setIsLoadingMonth(false);
        }
      }
    };

    if (isOpen) {
      loadMonthData();
    }
  }, [displayMonthKey, availableMonths, onLoadMonth, isOpen]);

  // Calculate expense data for the selected month
  const expenseData = useMemo(() => {
    return groupExpensesByCategory(transactions, categories, displayMonth);
  }, [transactions, categories, displayMonth]);

  // Reset animation state when data changes
  useEffect(() => {
    setAnimationComplete(false);
    setActiveIndex(undefined);
    setIsHovering(false);
  }, [expenseData]);

  // Calculate total expense for the month
  const totalExpense = useMemo(() => {
    return expenseData.reduce((sum, item) => sum + item.amount, 0);
  }, [expenseData]);

  // Format month for display
  const formatMonthDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Handle month navigation
  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonth = new Date(year, month - 2, 1);
    const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(prevMonthKey);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextMonth = new Date(year, month, 1);
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextMonthKey);
  };

  // Check if we can navigate to previous/next month
  const canGoPrevious = useMemo(() => {
    if (selectedPeriod !== 'pick' || !selectedMonth) return false;
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonth = new Date(year, month - 2, 1);
    const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    return true; // Can always go previous
  }, [selectedPeriod, selectedMonth]);

  const canGoNext = useMemo(() => {
    if (selectedPeriod !== 'pick' || !selectedMonth) return false;
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextMonth = new Date(year, month, 1);
    const now = new Date();
    return nextMonth <= now; // Can't go beyond current month
  }, [selectedPeriod, selectedMonth]);

  // Custom tooltip with coordinate positioning
  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-icon">{data.icon}</span>
            <span className="tooltip-name">{data.categoryName}</span>
          </div>
          <div className="tooltip-amount">{formatCurrency(data.amount)}</div>
          <div className="tooltip-percentage">{Number(data.percentage).toFixed(1)}%</div>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content expense-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Expense Analysis</h3>
          <button className="btn-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Period Selector */}
          <div className="period-selector">
            <div className="period-buttons">
              <button
                className={`period-btn ${selectedPeriod === 'current' ? 'active' : ''}`}
                onClick={() => setSelectedPeriod('current')}
              >
                This Month
              </button>
              <button
                className={`period-btn ${selectedPeriod === 'last' ? 'active' : ''}`}
                onClick={() => setSelectedPeriod('last')}
              >
                Last Month
              </button>
              <button
                className={`period-btn ${selectedPeriod === 'pick' ? 'active' : ''}`}
                onClick={() => setSelectedPeriod('pick')}
              >
                Pick Month
              </button>
            </div>

            {/* Month Picker (shown when 'pick' is selected) */}
            {selectedPeriod === 'pick' && (
              <div className="month-picker">
                <button
                  className="btn-month-nav"
                  onClick={handlePreviousMonth}
                  disabled={!canGoPrevious}
                >
                  <FiChevronLeft size={18} />
                </button>
                <div className="selected-month">
                  {formatMonthDisplay(displayMonth)}
                </div>
                <button
                  className="btn-month-nav"
                  onClick={handleNextMonth}
                  disabled={!canGoNext}
                >
                  <FiChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoadingMonth && (
            <div className="chart-loading">
              <p>Loading month data...</p>
            </div>
          )}

          {/* Chart */}
          {!isLoadingMonth && expenseData.length === 0 && (
            <div className="empty-state">
              <p>No expense data for {formatMonthDisplay(displayMonth)}</p>
            </div>
          )}

          {!isLoadingMonth && expenseData.length > 0 && (
            <>
              <div className="chart-header">
                <div className="chart-period">{formatMonthDisplay(displayMonth)}</div>
                <div className="chart-total">
                  <span className="total-label">Total Expenses</span>
                  <span className="total-amount">{formatCurrency(totalExpense)}</span>
                </div>
              </div>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={expenseData as any}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={120}
                      innerRadius={70}
                      fill="#8884d8"
                      dataKey="amount"
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={!isHovering && !animationComplete}
                      animationDuration={800}
                      onAnimationEnd={() => setAnimationComplete(true)}
                      {...(animationComplete ? { activeIndex } as any : {})}
                      activeShape={animationComplete ? (props: any) => {
                        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                        return (
                          <g>
                            <Sector
                              cx={cx}
                              cy={cy}
                              innerRadius={innerRadius}
                              outerRadius={outerRadius + 6}
                              startAngle={startAngle}
                              endAngle={endAngle}
                              fill={fill}
                              stroke="none"
                            />
                          </g>
                        );
                      } : undefined}
                      onMouseEnter={animationComplete ? (_: any, index: number) => {
                        setActiveIndex(index);
                        setIsHovering(true);
                      } : undefined}
                      onMouseLeave={animationComplete ? () => {
                        setActiveIndex(undefined);
                        setIsHovering(false);
                      } : undefined}
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'transparent' }}
                      wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                      isAnimationActive={false}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label for donut chart */}
                <div className="chart-center-label">
                  <div className="center-label-count">{expenseData.length}</div>
                  <div className="center-label-text">Categories</div>
                </div>
              </div>

              {/* Legend with detailed breakdown */}
              <div className="chart-legend">
                <h4>Category Breakdown</h4>
                <div className="legend-items">
                  {expenseData.map((item, index) => (
                    <div
                      key={item.categoryId}
                      className={`legend-item ${activeIndex === index ? 'active' : ''}`}
                      onMouseEnter={animationComplete ? () => {
                        setActiveIndex(index);
                        setIsHovering(true);
                      } : undefined}
                      onMouseLeave={animationComplete ? () => {
                        setActiveIndex(undefined);
                        setIsHovering(false);
                      } : undefined}
                      style={{ cursor: animationComplete ? 'pointer' : 'default' }}
                    >
                      <div className="legend-left">
                        <div className="legend-rank">{index + 1}</div>
                        <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                        <div className="legend-icon">{item.icon}</div>
                        <div className="legend-name">{item.categoryName}</div>
                      </div>
                      <div className="legend-right">
                        <div className="legend-amount">{formatCurrency(item.amount)}</div>
                        <div className="legend-percentage">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

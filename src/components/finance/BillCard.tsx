import React, { useMemo } from 'react';
import { Bill, BillPayment } from '../../types/finance';
import { formatCurrency } from '../../utils/dateFormatting';
import { FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';

interface BillCardProps {
  bill: Bill;
  paymentStatus: BillPayment | null;
  currentMonth: string; // "YYYY-MM"
  onPay: () => void;
  onClick: () => void;
  isBalanceVisible: boolean;
}

export const BillCard: React.FC<BillCardProps> = ({
  bill,
  paymentStatus,
  currentMonth,
  onPay,
  onClick,
  isBalanceVisible
}) => {
  // Calculate days until deadline
  const { daysUntil, isOverdue, isToday } = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth(); // 0-indexed
    const todayDate = today.getDate();

    // Check if we're looking at current month
    const [year, month] = currentMonth.split('-').map(Number);
    const isCurrentMonth = year === currentYear && month === currentMonthNum + 1;

    if (!isCurrentMonth) {
      return { daysUntil: null, isOverdue: false, isToday: false };
    }

    const deadline = bill.deadlineDate;
    const diff = deadline - todayDate;

    return {
      daysUntil: diff,
      isOverdue: diff < 0,
      isToday: diff === 0
    };
  }, [bill.deadlineDate, currentMonth]);

  const isPaid = !!paymentStatus;

  // Determine status indicator
  const getStatusIndicator = () => {
    if (isPaid) {
      return (
        <div className="bill-status paid" title="Paid">
          <FiCheckCircle size={14} />
        </div>
      );
    }

    if (isOverdue) {
      const days = Math.abs(daysUntil!);
      return (
        <div className="bill-status overdue" title={`Overdue ${days} day${days !== 1 ? 's' : ''}`}>
          <FiAlertCircle size={14} />
          <span>-{days}d</span>
        </div>
      );
    }

    if (isToday) {
      return (
        <div className="bill-status today" title="Due Today">
          <FiClock size={14} />
          <span>Today</span>
        </div>
      );
    }

    if (daysUntil !== null && daysUntil <= 3) {
      return (
        <div className="bill-status upcoming" title={`${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}>
          <FiClock size={14} />
          <span>{daysUntil}d</span>
        </div>
      );
    }

    return (
      <div className="bill-status pending" title={`Due on day ${bill.deadlineDate}`}>
        <FiClock size={14} />
        <span>Day {bill.deadlineDate}</span>
      </div>
    );
  };

  const formatBalance = (amount: number) => {
    return isBalanceVisible ? formatCurrency(amount) : '••••••';
  };

  return (
    <div
      className={`bill-card ${isPaid ? 'paid' : ''}`}
      style={{ borderColor: `${bill.color}33` }}
      onClick={onClick}
    >
      {getStatusIndicator()}
      <div className="bill-header">
        <div className="bill-icon">{bill.icon}</div>
        <div className="bill-main">
          <div className="bill-name">{bill.name}</div>
          <div className="bill-amount" style={{ color: bill.color }}>
            {formatBalance(bill.amount)}
          </div>
        </div>
      </div>
      {!isPaid && (
        <button
          className="btn-pay-bill"
          onClick={(e) => {
            e.stopPropagation();
            onPay();
          }}
          title="Pay bill"
        >
          Pay
        </button>
      )}
    </div>
  );
};

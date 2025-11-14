import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bill, BillPayment } from '../../types/finance';
import { BillCard } from './BillCard';
import { formatCurrency } from '../../utils/dateFormatting';
import { FiChevronLeft, FiChevronRight, FiPlus, FiList } from 'react-icons/fi';

interface BillCarouselProps {
  bills: Bill[];
  billPayments: BillPayment[];
  currentMonth: string; // "YYYY-MM"
  isBalanceVisible: boolean;
  onPayBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onAddBill: () => void;
  onManageBills: () => void;
}

export const BillCarousel: React.FC<BillCarouselProps> = ({
  bills,
  billPayments,
  currentMonth,
  isBalanceVisible,
  onPayBill,
  onEditBill,
  onAddBill,
  onManageBills
}) => {
  // Sort bills by order (higher = first)
  const sortedBills = [...bills].sort((a, b) => b.order - a.order);

  // Get payment status for a bill
  const getPaymentStatus = (billId: string): BillPayment | null => {
    return billPayments.find(p => p.billId === billId && p.month === currentMonth) || null;
  };

  if (sortedBills.length === 0) {
    return (
      <div className="bills-section">
        <div className="bills-header">
          <h3>Bills</h3>
        </div>
        <div className="empty-state-inline">
          <span className="empty-text">No bills yet</span>
          <button className="btn-add-inline" onClick={onAddBill}>
            <FiPlus size={14} />
            Add Bill
          </button>
        </div>
      </div>
    );
  }

  // Calculate total bills amount
  const totalBillsAmount = useMemo(() => {
    return sortedBills.reduce((sum, bill) => sum + bill.amount, 0);
  }, [sortedBills]);

  // Format balance helper
  const formatBalance = (amount: number) => {
    return isBalanceVisible ? formatCurrency(amount) : '••••••';
  };

  return (
    <div className="bills-section">
      <div className="bills-header">
        <h3>Bills</h3>
        <div className="bills-total">
          <span className="total-label">Total:</span>
          <span className="total-amount">{formatBalance(totalBillsAmount)}</span>
        </div>
        <div className="bills-header-actions">
          {sortedBills.length > 0 && (
            <button
              className="btn-icon"
              onClick={onManageBills}
              title="Manage bills"
            >
              <FiList size={18} />
            </button>
          )}
          <button
            className="btn-icon"
            onClick={onAddBill}
            title="Add bill"
          >
            <FiPlus size={18} />
          </button>
        </div>
      </div>

      <div className="bills-list">
        {sortedBills.map((bill) => {
          const paymentStatus = getPaymentStatus(bill.id);
          return (
            <BillCard
              key={bill.id}
              bill={bill}
              paymentStatus={paymentStatus}
              currentMonth={currentMonth}
              onPay={() => onPayBill(bill)}
              onClick={() => onEditBill(bill)}
              isBalanceVisible={isBalanceVisible}
            />
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Bill, Pocket } from '../../types/finance';
import { getTodayISO } from '../../utils/dateFormatting';

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pocketId: string, amount: number, date: string, description: string) => void;
  bill: Bill | null;
  pockets: Pocket[];
}

export const PayBillModal: React.FC<PayBillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  bill,
  pockets
}) => {
  const [pocketId, setPocketId] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [description, setDescription] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && bill) {
      setPocketId('');
      setAmount(bill.amount.toString());
      setDisplayAmount(formatRupiah(bill.amount.toString()));
      setDate(getTodayISO());
      setDescription(`Payment for ${bill.name}`);
    }
  }, [isOpen, bill]);

  // Format number to Rupiah display format
  const formatRupiah = (value: string): string => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';

    // Format with thousand separators
    const formatted = parseInt(numbers).toLocaleString('id-ID');
    return `Rp ${formatted}`;
  };

  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove all non-digit characters to get the raw number
    const numbers = inputValue.replace(/\D/g, '');

    setAmount(numbers);
    setDisplayAmount(numbers ? formatRupiah(numbers) : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!pocketId) {
      alert('Please select a pocket');
      return;
    }

    onSubmit(pocketId, amountNum, date, description);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen || !bill) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pay Bill: {bill.name}</h2>
          <button className="modal-close" onClick={handleCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="pocket">Pay From Pocket *</label>
            <select
              id="pocket"
              value={pocketId}
              onChange={(e) => setPocketId(e.target.value)}
              required
              className="form-select"
            >
              <option value="">Select pocket...</option>
              {pockets.map(pocket => (
                <option key={pocket.id} value={pocket.id}>
                  {pocket.icon} {pocket.name} (Balance: Rp {pocket.balance.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount *</label>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="Rp 0"
              required
              className="form-input"
            />
            <small className="form-hint">Default: Rp {bill.amount.toLocaleString('id-ID')}</small>
          </div>

          <div className="form-group">
            <label htmlFor="date">Payment Date *</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="form-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={handleCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Pay Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Transaction, Pocket, Category } from '../../types/finance';
import { formatDateForInput, getTodayISO } from '../../utils/dateFormatting';

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  pockets: Pocket[];
  categories: Category[];
}

type TransactionType = 'income' | 'expense' | 'transfer';

export const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pockets,
  categories
}) => {
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pocketId, setPocketId] = useState('');
  const [fromPocketId, setFromPocketId] = useState('');
  const [toPocketId, setToPocketId] = useState('');

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

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

  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    // Reset fields when type changes
    setCategoryId('');
    setPocketId('');
    setFromPocketId('');
    setToPocketId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (transactionType === 'transfer') {
      if (!fromPocketId || !toPocketId) {
        alert('Please select both source and destination pockets');
        return;
      }
      if (fromPocketId === toPocketId) {
        alert('Cannot transfer to the same pocket');
        return;
      }

      onSubmit({
        type: 'transfer',
        amount: amountNum,
        date,
        description,
        fromPocketId,
        toPocketId
      });
    } else {
      if (!pocketId) {
        alert('Please select a pocket');
        return;
      }
      if (!categoryId) {
        alert('Please select a category');
        return;
      }

      onSubmit({
        type: transactionType,
        amount: amountNum,
        date,
        description,
        categoryId,
        pocketId
      });
    }

    // Reset form
    setAmount('');
    setDisplayAmount('');
    setDescription('');
    setCategoryId('');
    setPocketId('');
    setFromPocketId('');
    setToPocketId('');
    setDate(getTodayISO());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Transaction</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Transaction Type Selector */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="transaction-type-selector">
              <button
                type="button"
                className={`type-btn ${transactionType === 'income' ? 'active income' : ''}`}
                onClick={() => handleTypeChange('income')}
              >
                Income
              </button>
              <button
                type="button"
                className={`type-btn ${transactionType === 'expense' ? 'active expense' : ''}`}
                onClick={() => handleTypeChange('expense')}
              >
                Expense
              </button>
              <button
                type="button"
                className={`type-btn ${transactionType === 'transfer' ? 'active transfer' : ''}`}
                onClick={() => handleTypeChange('transfer')}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="text"
              className="form-input"
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="Rp 0"
              required
            />
          </div>

          {/* Date Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Category Selector - Only for Income/Expense */}
          {transactionType !== 'transfer' && (
            <div className="form-group">
              <label className="form-label" htmlFor="category">Category</label>
              <select
                id="category"
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Select category</option>
                {(transactionType === 'income' ? incomeCategories : expenseCategories).map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pocket Selector - For Income/Expense */}
          {transactionType !== 'transfer' && (
            <div className="form-group">
              <label className="form-label" htmlFor="pocket">
                {transactionType === 'income' ? 'To Pocket' : 'From Pocket'}
              </label>
              <select
                id="pocket"
                className="form-select"
                value={pocketId}
                onChange={(e) => setPocketId(e.target.value)}
                required
              >
                <option value="">Select pocket</option>
                {pockets.map(pocket => (
                  <option key={pocket.id} value={pocket.id}>
                    {pocket.icon} {pocket.name} (Rp {pocket.balance.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transfer Pockets - For Transfer */}
          {transactionType === 'transfer' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="fromPocket">From Pocket</label>
                <select
                  id="fromPocket"
                  className="form-select"
                  value={fromPocketId}
                  onChange={(e) => setFromPocketId(e.target.value)}
                  required
                >
                  <option value="">Select source pocket</option>
                  {pockets.map(pocket => (
                    <option key={pocket.id} value={pocket.id}>
                      {pocket.icon} {pocket.name} (Rp {pocket.balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="toPocket">To Pocket</label>
                <select
                  id="toPocket"
                  className="form-select"
                  value={toPocketId}
                  onChange={(e) => setToPocketId(e.target.value)}
                  required
                >
                  <option value="">Select destination pocket</option>
                  {pockets.map(pocket => (
                    <option key={pocket.id} value={pocket.id}>
                      {pocket.icon} {pocket.name} (Rp {pocket.balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Description (optional)</label>
            <input
              id="description"
              type="text"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Coffee at Starbucks"
            />
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

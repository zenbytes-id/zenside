import React, { useState, useEffect } from 'react';
import { Bill, Category } from '../../types/finance';
import { POCKET_ICONS, POCKET_COLORS } from '../../constants/financeDefaults';

interface EditBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, updates: Partial<Bill>) => void;
  onDelete: (id: string) => void;
  bill: Bill | null;
  categories: Category[];
}

export const EditBillDialog: React.FC<EditBillDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  bill,
  categories
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('1');
  const [icon, setIcon] = useState('💡');
  const [color, setColor] = useState(POCKET_COLORS[0]);

  // Filter expense categories only
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Format number to Rupiah display format
  const formatRupiah = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const formatted = parseInt(numbers).toLocaleString('id-ID');
    return `Rp ${formatted}`;
  };

  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numbers = inputValue.replace(/\D/g, '');
    setAmount(numbers);
    setDisplayAmount(numbers ? formatRupiah(numbers) : '');
  };

  // Update form when bill changes
  useEffect(() => {
    if (bill && isOpen) {
      setName(bill.name);
      setAmount(bill.amount.toString());
      setDisplayAmount(formatRupiah(bill.amount.toString()));
      setCategoryId(bill.categoryId);
      setDeadlineDate(bill.deadlineDate.toString());
      setIcon(bill.icon);
      setColor(bill.color);
    }
  }, [bill, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bill) return;

    if (!name.trim()) {
      alert('Please enter a bill name');
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!categoryId) {
      alert('Please select a category');
      return;
    }

    const deadline = parseInt(deadlineDate);
    if (isNaN(deadline) || deadline < 1 || deadline > 31) {
      alert('Please enter a valid deadline date (1-31)');
      return;
    }

    onSubmit(bill.id, {
      name: name.trim(),
      amount: amountNum,
      categoryId,
      deadlineDate: deadline,
      color,
      icon
    });

    onClose();
  };

  const handleDelete = () => {
    if (!bill) return;

    const confirmMessage = `Are you sure you want to delete "${bill.name}"?\n\nAll payment history for this bill will also be removed.`;
    if (window.confirm(confirmMessage)) {
      onDelete(bill.id);
      onClose();
    }
  };

  if (!isOpen || !bill) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Bill</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Bill Name Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="billName">Bill Name *</label>
            <input
              id="billName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Listrik, Internet, Cicilan Motor"
              maxLength={50}
              required
            />
          </div>

          {/* Amount Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="amount">Amount *</label>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              className="form-input"
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="Rp 0"
              required
            />
          </div>

          {/* Category Select */}
          <div className="form-group">
            <label className="form-label" htmlFor="category">Category *</label>
            <select
              id="category"
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Select category...</option>
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline Date Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="deadlineDate">Deadline Date (1-31) *</label>
            <input
              id="deadlineDate"
              type="number"
              className="form-input"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              min="1"
              max="31"
              required
            />
            <div className="form-hint">Day of month when bill is due</div>
          </div>

          {/* Icon Picker */}
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="icon-picker">
              {POCKET_ICONS.slice(0, 24).map((iconOption) => (
                <button
                  key={iconOption}
                  type="button"
                  className={`icon-option ${icon === iconOption ? 'active' : ''}`}
                  onClick={() => setIcon(iconOption)}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-picker">
              {POCKET_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  className={`color-option ${color === colorOption ? 'active' : ''}`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                  title={colorOption}
                />
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-danger" onClick={handleDelete}>
              Delete Bill
            </button>
            <div className="form-actions-right">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

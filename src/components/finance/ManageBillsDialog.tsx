import React, { useState, useEffect } from 'react';
import { Bill } from '../../types/finance';
import { FiMove } from 'react-icons/fi';

interface ManageBillsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  onReorder: (bills: Bill[]) => void;
}

export const ManageBillsDialog: React.FC<ManageBillsDialogProps> = ({
  isOpen,
  onClose,
  bills,
  onReorder
}) => {
  const [orderedBills, setOrderedBills] = useState<Bill[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Initialize ordered bills when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Sort by order field (higher = first)
      const sorted = [...bills].sort((a, b) => b.order - a.order);
      setOrderedBills(sorted);
    }
  }, [isOpen, bills]);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder the bills
    const reordered = [...orderedBills];
    const [draggedBill] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, draggedBill);

    setOrderedBills(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = () => {
    // Update order field for all bills (higher = first)
    const maxOrder = orderedBills.length - 1;
    const updatedBills = orderedBills.map((bill, index) => ({
      ...bill,
      order: maxOrder - index // Reverse so first item has highest order
    }));

    onReorder(updatedBills);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manage-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Bills Order</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="manage-hint">
            Drag and drop to reorder your bills. The first bill will appear in the carousel.
          </p>

          <div className="manage-list">
            {orderedBills.map((bill, index) => (
              <div
                key={bill.id}
                className={`manage-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="drag-handle">
                  <FiMove size={18} />
                </div>
                <div className="item-icon">{bill.icon}</div>
                <div className="item-info">
                  <div className="item-name">{bill.name}</div>
                  <div className="item-meta" style={{ color: bill.color }}>
                    Rp {bill.amount.toLocaleString('id-ID')} • Due: {bill.deadlineDate}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

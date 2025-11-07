import React, { useState, useEffect } from 'react';
import { Pocket } from '../../types/finance';
import { FiX, FiMove } from 'react-icons/fi';

interface ManagePocketsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pockets: Pocket[];
  onReorder: (pockets: Pocket[]) => void;
}

export const ManagePocketsDialog: React.FC<ManagePocketsDialogProps> = ({
  isOpen,
  onClose,
  pockets,
  onReorder
}) => {
  const [orderedPockets, setOrderedPockets] = useState<Pocket[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Initialize ordered pockets when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Sort by order field
      const sorted = [...pockets].sort((a, b) => a.order - b.order);
      setOrderedPockets(sorted);
    }
  }, [isOpen, pockets]);

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

    // Reorder the pockets
    const reordered = [...orderedPockets];
    const [draggedPocket] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, draggedPocket);

    setOrderedPockets(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = () => {
    // Update order field for all pockets
    const updatedPockets = orderedPockets.map((pocket, index) => ({
      ...pocket,
      order: index
    }));

    onReorder(updatedPockets);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content manage-pockets-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Pockets Order</h3>
          <button className="btn-close" onClick={handleCancel}>
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="manage-pockets-hint">
            <p>Drag and drop pockets to reorder them</p>
          </div>

          <div className="manage-pockets-list">
            {orderedPockets.map((pocket, index) => (
              <div
                key={pocket.id}
                className={`manage-pocket-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="drag-handle">
                  <FiMove size={20} />
                </div>
                <div className="pocket-icon-circle" style={{ backgroundColor: `${pocket.color}22`, color: pocket.color }}>
                  {pocket.icon}
                </div>
                <div className="pocket-details">
                  <div className="pocket-name">{pocket.name}</div>
                  <div className="pocket-meta">
                    {pocket.isDefault && <span className="default-badge">Default</span>}
                  </div>
                </div>
                <div className="order-number">#{index + 1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
};

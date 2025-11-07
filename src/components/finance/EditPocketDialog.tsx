import React, { useState, useEffect } from 'react';
import { Pocket } from '../../types/finance';
import { POCKET_ICONS, POCKET_COLORS } from '../../constants/financeDefaults';

interface EditPocketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, updates: Partial<Pocket>) => void;
  pocket: Pocket | null;
}

export const EditPocketDialog: React.FC<EditPocketDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pocket
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(POCKET_ICONS[0]);
  const [color, setColor] = useState(POCKET_COLORS[0]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Update form when pocket changes
  useEffect(() => {
    if (pocket && isOpen) {
      setIsInitializing(true);
      // Simulate slight delay for loading state visibility
      const timer = setTimeout(() => {
        setName(pocket.name);
        setIcon(pocket.icon);
        setColor(pocket.color);
        setIsInitializing(false);
      }, 150);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      setIsInitializing(true);
    }
  }, [pocket, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pocket) return;

    if (!name.trim()) {
      alert('Please enter a pocket name');
      return;
    }

    if (name.length > 30) {
      alert('Pocket name must be 30 characters or less');
      return;
    }

    onSubmit(pocket.id, {
      name: name.trim(),
      icon,
      color
    });

    onClose();
  };

  if (!isOpen || !pocket) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {isInitializing ? (
          <>
            <div className="modal-header">
              <h3>Edit Pocket</h3>
              <button className="btn-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-loading">
              <div className="modal-spinner"></div>
              <div className="modal-loading-text">Loading pocket...</div>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h3>Edit Pocket</h3>
              <button className="btn-close" onClick={onClose}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
          {/* Pocket Name Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="pocketName">Pocket Name</label>
            <input
              id="pocketName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kantong Jajan"
              maxLength={30}
              required
            />
            <div className="form-hint">{name.length}/30 characters</div>
          </div>

          {/* Icon Picker */}
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="icon-picker">
              {POCKET_ICONS.map((iconOption) => (
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

          {/* Preview */}
          <div className="form-group">
            <label className="form-label">Preview</label>
            <div className="pocket-preview">
              <div className="pocket-card preview">
                <div className="pocket-icon">{icon}</div>
                <div className="pocket-info">
                  <div className="pocket-name">{name || 'Pocket Name'}</div>
                  <div className="pocket-balance" style={{ color: color }}>
                    Rp {pocket.balance.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
};

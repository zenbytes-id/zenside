import React, { useState, useEffect } from 'react';
import { Pocket } from '../../types/finance';
import { POCKET_ICONS, POCKET_COLORS } from '../../constants/financeDefaults';

interface AddPocketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pocket: Omit<Pocket, 'id' | 'balance' | 'order' | 'createdAt' | 'updatedAt'>) => void;
}

export const AddPocketDialog: React.FC<AddPocketDialogProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(POCKET_ICONS[0]);
  const [color, setColor] = useState(POCKET_COLORS[0]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setIcon(POCKET_ICONS[0]);
      setColor(POCKET_COLORS[0]);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a pocket name');
      return;
    }

    if (name.length > 30) {
      alert('Pocket name must be 30 characters or less');
      return;
    }

    onSubmit({
      name: name.trim(),
      icon,
      color,
      isDefault: false
    });

    // Reset form
    setName('');
    setIcon(POCKET_ICONS[0]);
    setColor(POCKET_COLORS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Pocket</h3>
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
                    Rp 0
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
              Create Pocket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

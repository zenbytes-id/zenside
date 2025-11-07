import React, { useState } from 'react';
import { Category, CategoryType } from '../types/note';
import { useCategories } from '../hooks/useCategories';
import '../styles/categoryManager.css';

const EMOJI_OPTIONS = [
  '💰', '💸', '🍔', '🚗', '🛍️', '🎬', '📝', '⚕️',
  '💼', '📈', '🎁', '🏠', '✈️', '📱', '🎓', '🎮',
  '☕', '🍕', '🎵', '📚', '💊', '🚌', '🔧', '🎨'
];

const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#FF8B94',
  '#A8E6CF', '#6BCF7F', '#51CF66', '#37B24D', '#74C0FC',
  '#748FFC', '#9775FA', '#F06595', '#FF922B', '#FFD43B'
];

interface CategoryManagerProps {
  onClose?: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
  } = useCategories();

  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState(EMOJI_OPTIONS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const expenseCategories = getCategoriesByType('expense');
  const incomeCategories = getCategoriesByType('income');
  const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories;

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await addCategory(newCategoryName.trim(), activeTab, selectedColor, selectedIcon);
      setNewCategoryName('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setSelectedIcon(EMOJI_OPTIONS[0]);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteCategory(id);
    }
  };

  if (isLoading) {
    return (
      <div className="category-manager">
        <div className="category-manager-loading">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="category-manager">
      <div className="category-tabs">
        <button
          className={`category-tab ${activeTab === 'expense' ? 'active' : ''}`}
          onClick={() => setActiveTab('expense')}
        >
          Expenses ({expenseCategories.length})
        </button>
        <button
          className={`category-tab ${activeTab === 'income' ? 'active' : ''}`}
          onClick={() => setActiveTab('income')}
        >
          Income ({incomeCategories.length})
        </button>
      </div>

      <div className="category-list">
        {currentCategories.length === 0 ? (
          <div className="category-empty">
            <p>No {activeTab} categories yet</p>
            <p className="category-hint">Add your first category below</p>
          </div>
        ) : (
          currentCategories.map((category) => (
            <div key={category.id} className="category-item">
              {editingId === category.id ? (
                <div className="category-edit-form">
                  <div className="category-edit-row">
                    <button
                      className="category-icon-button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      style={{ backgroundColor: category.color }}
                    >
                      {category.icon}
                    </button>
                    <input
                      type="text"
                      className="category-input"
                      value={category.name}
                      onChange={(e) =>
                        updateCategory(category.id, { name: e.target.value })
                      }
                      placeholder="Category name"
                    />
                  </div>
                  {showIconPicker && (
                    <div className="icon-picker">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          className="icon-option"
                          onClick={() => {
                            updateCategory(category.id, { icon: emoji });
                            setShowIconPicker(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  {showColorPicker && (
                    <div className="color-picker">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          className="color-option"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            updateCategory(category.id, { color });
                            setShowColorPicker(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <div className="category-edit-actions">
                    <button
                      className="btn-secondary small"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    >
                      Color
                    </button>
                    <button
                      className="btn-primary small"
                      onClick={() => setEditingId(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="category-info">
                    <span
                      className="category-icon"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.icon}
                    </span>
                    <span className="category-name">{category.name}</span>
                  </div>
                  <div className="category-actions">
                    <button
                      className="btn-edit"
                      onClick={() => setEditingId(category.id)}
                      title="Edit category"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteCategory(category.id)}
                      title="Delete category"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="category-add-section">
        <h4>Add New {activeTab === 'expense' ? 'Expense' : 'Income'} Category</h4>
        <div className="category-add-form">
          <div className="category-add-row">
            <button
              className="category-icon-button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              style={{ backgroundColor: selectedColor }}
            >
              {selectedIcon}
            </button>
            <input
              type="text"
              className="category-input"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCategory();
                }
              }}
            />
            <button
              className="btn-primary"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
            >
              Add
            </button>
          </div>

          {showIconPicker && (
            <div className="icon-picker">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="icon-option"
                  onClick={() => {
                    setSelectedIcon(emoji);
                    setShowIconPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {showColorPicker && (
            <div className="color-picker">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  className="color-option"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}

          <div className="category-add-options">
            <button
              className="btn-secondary small"
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              Change Color
            </button>
          </div>
        </div>
      </div>

      <div className="category-manager-footer">
        <div className="category-stats">
          Total: {categories.length} categories
        </div>
      </div>
    </div>
  );
};

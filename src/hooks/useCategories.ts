import { useState, useEffect } from 'react';
import { Category, CategoryType } from '../types/note';
import { Category as FinanceCategory } from '../types/finance';

const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Food & Dining', type: 'expense', color: '#FF6B6B', icon: '🍔' },
  { name: 'Transportation', type: 'expense', color: '#4ECDC4', icon: '🚗' },
  { name: 'Shopping', type: 'expense', color: '#FFE66D', icon: '🛍️' },
  { name: 'Entertainment', type: 'expense', color: '#95E1D3', icon: '🎬' },
  { name: 'Bills & Utilities', type: 'expense', color: '#FF8B94', icon: '📝' },
  { name: 'Health', type: 'expense', color: '#A8E6CF', icon: '⚕️' },
];

const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Salary', type: 'income', color: '#6BCF7F', icon: '💰' },
  { name: 'Freelance', type: 'income', color: '#51CF66', icon: '💼' },
  { name: 'Investment', type: 'income', color: '#37B24D', icon: '📈' },
  { name: 'Gift', type: 'income', color: '#74C0FC', icon: '🎁' },
];

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load categories from localStorage
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Load from finance API
      const loaded = await window.electronAPI?.finance.loadCategories();
      if (loaded && loaded.length > 0) {
        const categoriesWithDates = loaded.map((cat: any) => ({
          ...cat,
          createdAt: new Date(cat.createdAt),
          updatedAt: new Date(cat.updatedAt),
        }));
        setCategories(categoriesWithDates);
      } else {
        // Initialize with default categories
        await initializeDefaultCategories();
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      await initializeDefaultCategories();
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultCategories = async () => {
    const now = new Date();
    const allDefaults = [
      ...DEFAULT_EXPENSE_CATEGORIES,
      ...DEFAULT_INCOME_CATEGORIES,
    ];

    const initialCategories: Category[] = allDefaults.map((cat, index) => ({
      ...cat,
      id: `cat-${Date.now()}-${index}`,
      createdAt: now,
      updatedAt: now,
    }));

    setCategories(initialCategories);
    await saveCategoriesToStorage(initialCategories);
  };

  const saveCategoriesToStorage = async (cats: Category[]) => {
    try {
      await window.electronAPI?.finance.saveCategories(cats);

      // Trigger git auto-sync
      scheduleGitCommit();
    } catch (error) {
      console.error('Failed to save categories:', error);
    }
  };

  const scheduleGitCommit = () => {
    // Dispatch event to trigger git auto-commit (handled by finance system)
    window.dispatchEvent(new CustomEvent('finance:data-changed', {
      detail: { message: 'Updated categories' }
    }));
  };

  const addCategory = async (
    name: string,
    type: CategoryType,
    color?: string,
    icon?: string
  ): Promise<Category> => {
    const now = new Date();
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      type,
      color: color || (type === 'expense' ? '#FF6B6B' : '#6BCF7F'),
      icon: icon || (type === 'expense' ? '💸' : '💰'),
      createdAt: now,
      updatedAt: now,
    };

    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    await saveCategoriesToStorage(updatedCategories);

    return newCategory;
  };

  const updateCategory = async (
    id: string,
    updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const updatedCategories = categories.map((cat) =>
      cat.id === id
        ? { ...cat, ...updates, updatedAt: new Date() }
        : cat
    );
    setCategories(updatedCategories);
    await saveCategoriesToStorage(updatedCategories);
  };

  const deleteCategory = async (id: string) => {
    const updatedCategories = categories.filter((cat) => cat.id !== id);
    setCategories(updatedCategories);
    await saveCategoriesToStorage(updatedCategories);
  };

  const getCategoriesByType = (type: CategoryType) => {
    return categories.filter((cat) => cat.type === type);
  };

  const resetToDefaults = () => {
    initializeDefaultCategories();
  };

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    resetToDefaults,
  };
};

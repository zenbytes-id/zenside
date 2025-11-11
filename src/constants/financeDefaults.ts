import { Category, Pocket } from '../types/finance';

/**
 * Default expense categories
 */
export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'uncategorized_expense',
    name: 'Tidak Dikategorikan',
    type: 'expense',
    icon: '❓',
    color: '#858585',
    isDefault: true
  },
  {
    id: 'food',
    name: 'Makanan',
    type: 'expense',
    icon: '🍔',
    color: '#ff6b6b',
    isDefault: true
  },
  {
    id: 'transport',
    name: 'Transportasi',
    type: 'expense',
    icon: '🚗',
    color: '#00d4ff',
    isDefault: true
  },
  {
    id: 'shopping',
    name: 'Belanja',
    type: 'expense',
    icon: '🛒',
    color: '#858585',
    isDefault: true
  },
  {
    id: 'bills',
    name: 'Tagihan',
    type: 'expense',
    icon: '💡',
    color: '#ff9999',
    isDefault: true
  },
  {
    id: 'entertainment',
    name: 'Hiburan',
    type: 'expense',
    icon: '🎮',
    color: '#aa96da',
    isDefault: true
  },
  {
    id: 'other_expense',
    name: 'Lainnya',
    type: 'expense',
    icon: '📦',
    color: '#cccccc',
    isDefault: true
  }
];

/**
 * Default income categories
 */
export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  {
    id: 'uncategorized_income',
    name: 'Tidak Dikategorikan',
    type: 'income',
    icon: '❓',
    color: '#858585',
    isDefault: true
  },
  {
    id: 'salary',
    name: 'Gaji',
    type: 'income',
    icon: '💰',
    color: '#00d4ff',
    isDefault: true
  },
  {
    id: 'freelance',
    name: 'Freelance',
    type: 'income',
    icon: '💼',
    color: '#00bfea',
    isDefault: true
  },
  {
    id: 'gift',
    name: 'Hadiah',
    type: 'income',
    icon: '🎁',
    color: '#ffeb3b',
    isDefault: true
  },
  {
    id: 'other_income',
    name: 'Lainnya',
    type: 'income',
    icon: '💵',
    color: '#4caf50',
    isDefault: true
  }
];

/**
 * All default categories (income + expense)
 */
export const DEFAULT_CATEGORIES: Category[] = [
  ...DEFAULT_INCOME_CATEGORIES,
  ...DEFAULT_EXPENSE_CATEGORIES
];

/**
 * Create the default main pocket
 */
export function createDefaultMainPocket(): Pocket {
  return {
    id: 'main',
    name: 'Kantong Utama',
    balance: 0,
    color: '#00d4ff',
    icon: '💰',
    isDefault: true,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Category color mappings
 */
export const CATEGORY_COLORS = {
  uncategorized_expense: '#858585',
  uncategorized_income: '#858585',
  food: '#ff6b6b',
  transport: '#00d4ff',
  shopping: '#858585',
  bills: '#ff9999',
  entertainment: '#aa96da',
  other_expense: '#cccccc',
  salary: '#00d4ff',
  freelance: '#00bfea',
  gift: '#ffeb3b',
  other_income: '#4caf50'
};

/**
 * Transaction type colors
 */
export const TRANSACTION_TYPE_COLORS = {
  income: '#00d4ff',  // Cyan (primary)
  expense: '#ff6b6b', // Red
  transfer: '#858585' // Gray
};

/**
 * Available pocket colors
 */
export const POCKET_COLORS = [
  '#00d4ff', // Cyan (primary)
  '#00bfea', // Light cyan
  '#ff6b6b', // Red
  '#ff9999', // Light red
  '#aa96da', // Purple
  '#858585', // Gray
  '#ffeb3b', // Yellow
  '#4caf50'  // Green
];

/**
 * Available category icons (same as pocket icons for consistency)
 */
export const CATEGORY_ICONS = [
  // Money & Finance
  '💰', // Money bag
  '💵', // Dollar
  '💳', // Credit card
  '🏦', // Bank
  '💎', // Gem
  '🪙', // Coin

  // Food & Drink
  '🍔', // Food
  '☕', // Coffee
  '🍕', // Pizza
  '🍜', // Ramen
  '🥤', // Drink
  '🍰', // Cake

  // Transportation
  '🚗', // Car
  '✈️', // Plane
  '🚲', // Bicycle
  '🚌', // Bus
  '🛵', // Scooter
  '⛽', // Gas station

  // Shopping & Items
  '🛒', // Shopping cart
  '🛍️', // Shopping bags
  '📦', // Package
  '🎁', // Gift
  '👕', // Clothes
  '👟', // Shoes

  // Entertainment & Hobbies
  '🎮', // Game
  '🎬', // Movie
  '🎵', // Music
  '📚', // Books
  '🎨', // Art
  '⚽', // Sports

  // Work & Study
  '💼', // Briefcase
  '📱', // Phone
  '💻', // Laptop
  '📝', // Note
  '🎓', // Education
  '🏢', // Office

  // Home & Living
  '🏠', // House
  '🛏️', // Bed
  '🔑', // Key
  '💡', // Light
  '🧺', // Laundry
  '🪴', // Plant

  // Health & Wellness
  '💊', // Medicine
  '❤️', // Health
  '🏥', // Hospital
  '💪', // Fitness
  '🧘', // Yoga
  '😊', // Happy

  // Goals & Planning
  '🎯', // Target
  '⭐', // Star
  '🏆', // Trophy
  '📈', // Chart
  '💫', // Sparkles
  '🔥', // Fire

  // Miscellaneous
  '🌟', // Glowing star
  '🎈', // Balloon
  '🌈', // Rainbow
  '☀️', // Sun
  '🌙', // Moon
  '⚡'  // Lightning
];

/**
 * Available pocket icons
 */
export const POCKET_ICONS = [
  // Money & Finance
  '💰', // Money bag
  '💵', // Dollar
  '💳', // Credit card
  '🏦', // Bank
  '💎', // Gem
  '🪙', // Coin

  // Food & Drink
  '🍔', // Food
  '☕', // Coffee
  '🍕', // Pizza
  '🍜', // Ramen
  '🥤', // Drink
  '🍰', // Cake

  // Transportation
  '🚗', // Car
  '✈️', // Plane
  '🚲', // Bicycle
  '🚌', // Bus
  '🛵', // Scooter
  '⛽', // Gas station

  // Shopping & Items
  '🛒', // Shopping cart
  '🛍️', // Shopping bags
  '📦', // Package
  '🎁', // Gift
  '👕', // Clothes
  '👟', // Shoes

  // Entertainment & Hobbies
  '🎮', // Game
  '🎬', // Movie
  '🎵', // Music
  '📚', // Books
  '🎨', // Art
  '⚽', // Sports

  // Work & Study
  '💼', // Briefcase
  '📱', // Phone
  '💻', // Laptop
  '📝', // Note
  '🎓', // Education
  '🏢', // Office

  // Home & Living
  '🏠', // House
  '🛏️', // Bed
  '🔑', // Key
  '💡', // Light
  '🧺', // Laundry
  '🪴', // Plant

  // Health & Wellness
  '💊', // Medicine
  '❤️', // Health
  '🏥', // Hospital
  '💪', // Fitness
  '🧘', // Yoga
  '😊', // Happy

  // Goals & Planning
  '🎯', // Target
  '⭐', // Star
  '🏆', // Trophy
  '📈', // Chart
  '💫', // Sparkles
  '🔥', // Fire

  // Miscellaneous
  '🌟', // Glowing star
  '🎈', // Balloon
  '🌈', // Rainbow
  '☀️', // Sun
  '🌙', // Moon
  '⚡'  // Lightning
];

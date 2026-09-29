export type Category =
  | 'Home Appliances'
  | 'Electronics'
  | 'Computers'
  | 'Phones'
  | 'Audio'
  | 'Furniture'
  | 'Tools'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Home Appliances',
  'Electronics',
  'Computers',
  'Phones',
  'Audio',
  'Furniture',
  'Tools',
  'Other',
];

export type Product = {
  id: string;
  name: string;
  brand: string;
  model?: string;
  category: Category;
  store: string;
  /** ISO date, YYYY-MM-DD */
  purchaseDate: string;
  warrantyMonths: number;
  price?: number;
  currency: string;
  serial?: string;
  /** What to display: a local file, or a signed URL for a synced file. */
  photoUri?: string;
  receiptUri?: string;
  /** Location in Supabase Storage once uploaded. */
  photoPath?: string;
  receiptPath?: string;
  /** Days before expiry to remind */
  reminderDays: number;
  createdAt: string;
};

export type ClaimStatus = 'draft' | 'submitted';

export type Claim = {
  id: string;
  productId: string;
  issue: string;
  createdAt: string;
  status: ClaimStatus;
};

export type Settings = {
  userName: string;
  email: string;
  notifications: boolean;
  language: 'English' | 'Français' | 'Español' | 'العربية';
  defaultReminderDays: number;
  onboarded: boolean;
};

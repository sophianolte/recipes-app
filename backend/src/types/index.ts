// ============ DATABASE TYPES ============

export interface User {
  id: number;
  username: string;
  password: string;
  displayName: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  createdAt: string;
}

export interface Recipe {
  id: number;
  categoryId: number | null;
  userId: number | null;
  title: string;
  description: string | null;
  servings: number | null;
  prepTime: number | null;
  imageUrl: string | null;
  isFavorite: number | boolean;
  isPublic: number | boolean;
  createdAt: string;
  categoryName?: string;
  ownerName?: string;
}

export interface UserFavorite {
  id: number;
  userId: number;
  recipeId: number;
}

export interface Ingredient {
  id: number;
  recipeId: number;
  name: string;
  amount: string | null;
  unit: string | null;
}

export interface Step {
  id: number;
  recipeId: number;
  stepNumber: number;
  instruction: string;
}

// ============ API REQUEST TYPES ============

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateRecipeRequest {
  categoryId?: number | null;
  title: string;
  description?: string | null;
  servings?: number | null;
  prepTime?: number | null;
  imageUrl?: string | null;
  isPublic?: boolean;
  ingredients: IngredientInput[];
  steps: StepInput[];
}

export interface UpdateRecipeRequest extends CreateRecipeRequest {}

export interface IngredientInput {
  name: string;
  amount?: string | null;
  unit?: string | null;
}

export interface StepInput {
  stepNumber?: number;
  instruction: string;
}

export interface CreateCategoryRequest {
  name: string;
}

// ============ API RESPONSE TYPES ============

export interface RecipeWithDetails extends Recipe {
  ingredients: Ingredient[];
  steps: Step[];
}

export interface RecipeQueryParams {
  categoryId?: string;
  search?: string;
  favorite?: string;
}

export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  message: string;
}

export interface FavoriteToggleResponse {
  id: number;
  isFavorite: boolean;
}

// ============ DATABASE ROW TYPES ============

export interface CountResult {
  count: number;
}

// ============ AUTH TYPES ============

export interface AuthenticatedRequest {
  userId?: number;
  username?: string;
}

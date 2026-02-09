'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRecipes, getCategories, toggleFavorite, deleteRecipe } from '@/lib/api';
import RecipeCard from '@/components/RecipeCard';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [recipesData, categoriesData] = await Promise.all([
          getRecipes({
            categoryId: selectedCategory,
            search: searchTerm,
            favorite: showFavorites,
          }),
          getCategories(),
        ]);

        setRecipes(recipesData);
        setCategories(categoriesData);
      } catch (err) {
        setError('Failed to load recipes. Is the backend running?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedCategory, searchTerm, showFavorites]);

  async function handleToggleFavorite(id) {
    try {
      const result = await toggleFavorite(id);
      setRecipes(recipes.map(recipe => 
        recipe.id === id ? { ...recipe, isFavorite: result.isFavorite } : recipe
      ));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      await deleteRecipe(id);
      setRecipes(recipes.filter(recipe => recipe.id !== id));
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  }

  function handleSearch(term) {
    setSearchTerm(term);
  }

  function handleCategoryChange(categoryId) {
    setSelectedCategory(categoryId);
  }

  function handleFavoritesToggle() {
    setShowFavorites(!showFavorites);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading recipes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-destructive/20 rounded-xl p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-foreground font-medium mb-2">{error}</p>
        <p className="text-muted-foreground text-sm">
          Make sure the backend is running on http://localhost:4000
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1 text-balance">Explore Recipes</h1>
        <p className="text-muted-foreground">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} in your collection
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-card rounded-xl border border-border-light p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>

          <div className="w-full md:w-56">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={handleCategoryChange}
            />
          </div>

          <button
            onClick={handleFavoritesToggle}
            className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFavorites
                ? 'bg-primary-light border-primary/30 text-primary'
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill={showFavorites ? "var(--primary)" : "none"} stroke={showFavorites ? "var(--primary)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Favorites
            </span>
          </button>
        </div>
      </div>

      {/* Recipe Grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <p className="text-foreground font-medium text-lg mb-2">No recipes found</p>
          <p className="text-muted-foreground mb-6">Start building your collection</p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create your first recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

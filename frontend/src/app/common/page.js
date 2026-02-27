'use client';

import { useState, useEffect } from 'react';
import { getRecipes, getCategories, toggleFavorite } from '@/lib/api';
import RecipeCard from '@/components/RecipeCard';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';

export default function CommonRecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [r, c] = await Promise.all([getRecipes(), getCategories()]);
        setRecipes(r);
        setCategories(c);
      } catch (err) {
        setError('Could not load recipes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = recipes.filter((r) => {
    const matchSearch = !searchTerm || r.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !selectedCategory || r.categoryId === parseInt(selectedCategory, 10);
    const matchFav = !showFavorites || r.isFavorite;
    return matchSearch && matchCat && matchFav;
  });

  async function handleToggleFavorite(id) {
    try {
      const result = await toggleFavorite(id);
      setRecipes(recipes.map((r) => r.id === id ? { ...r, isFavorite: result.isFavorite } : r));
    } catch (err) {
      console.error(err);
    }
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
    return <p className="text-center text-destructive py-12">{error}</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-primary-light rounded-lg flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Common Recipes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {recipes.length} recipes</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border-light p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <SearchBar onSearch={(term) => setSearchTerm(term)} />
          </div>
          <div className="w-full md:w-56">
            <CategoryFilter categories={categories} selectedCategory={selectedCategory} onChange={(c) => setSelectedCategory(c)} />
          </div>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFavorites ? 'bg-primary-light border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
          >
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill={showFavorites ? 'var(--primary)' : 'none'} stroke={showFavorites ? 'var(--primary)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Favorites
            </span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No recipes found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}

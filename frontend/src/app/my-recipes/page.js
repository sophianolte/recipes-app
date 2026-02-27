'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMyRecipes, getCategories, toggleFavorite, toggleVisibility, deleteRecipe } from '@/lib/api';
import RecipeCard from '@/components/RecipeCard';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';

export default function MyRecipesPage() {
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
        const [r, c] = await Promise.all([getMyRecipes(), getCategories()]);
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

  async function handleToggleVisibility(id) {
    try {
      const result = await toggleVisibility(id);
      setRecipes(recipes.map((r) => r.id === id ? { ...r, isPublic: result.isPublic } : r));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await deleteRecipe(id);
      setRecipes(recipes.filter((r) => r.id !== id));
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Recipes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {recipes.length} own recipes</p>
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
      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You don't have any recipes yet.</p>
          <Link
            href="/recipes/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-accent transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create first recipe
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No recipes match your filters</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              onToggleVisibility={handleToggleVisibility}
              showVisibility
              isOwner
            />
          ))}
        </div>
      )}
    </div>
  );
}

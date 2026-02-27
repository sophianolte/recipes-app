'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRecipes, getMyRecipes, getOthersPublicRecipes, getCategories, toggleFavorite, toggleVisibility, deleteRecipe } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import RecipeCard from '@/components/RecipeCard';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  const { user } = useAuth();
  const [globalRecipes, setGlobalRecipes] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);
  const [othersRecipes, setOthersRecipes] = useState([]);
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

        const [recipesData, myData, othersData, categoriesData] = await Promise.all([
          getRecipes(),
          getMyRecipes(),
          getOthersPublicRecipes(),
          getCategories(),
        ]);

        setGlobalRecipes(recipesData);
        setMyRecipes(myData);
        setOthersRecipes(othersData);
        setCategories(categoriesData);
      } catch (err) {
        setError('Could not load recipes. Is the backend running?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function applyFilters(recipes) {
    return recipes.filter(recipe => {
      const matchesSearch = !searchTerm ||
        recipe.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory ||
        recipe.categoryId === parseInt(selectedCategory, 10);
      const matchesFavorite = !showFavorites || recipe.isFavorite;
      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }

  const filteredGlobal = applyFilters(globalRecipes);
  const filteredMy = applyFilters(myRecipes);
  const filteredOthers = applyFilters(othersRecipes);

  async function handleToggleFavorite(id) {
    try {
      const result = await toggleFavorite(id);
      const update = recipes => recipes.map(r =>
        r.id === id ? { ...r, isFavorite: result.isFavorite } : r
      );
      setGlobalRecipes(update);
      setMyRecipes(update);
      setOthersRecipes(update);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  async function handleToggleVisibility(id) {
    try {
      const result = await toggleVisibility(id);
      setMyRecipes(myRecipes.map(recipe =>
        recipe.id === id ? { ...recipe, isPublic: result.isPublic } : recipe
      ));
      const othersData = await getOthersPublicRecipes();
      setOthersRecipes(othersData);
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await deleteRecipe(id);
      setMyRecipes(myRecipes.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete recipe:', err);
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
        <p className="text-muted-foreground text-sm">Backend must be running on http://localhost:4000</p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Hello, {user?.displayName}!
        </h1>
        <p className="text-muted-foreground">Welcome to your recipe collection</p>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-card rounded-xl border border-border-light p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <SearchBar onSearch={(term) => setSearchTerm(term)} />
          </div>
          <div className="w-full md:w-56">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={(catId) => setSelectedCategory(catId)}
            />
          </div>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
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

      {/* ========== SECTION 1: All Recipes ========== */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">All Recipes</h2>
            <p className="text-sm text-muted-foreground">{filteredGlobal.length} global recipes</p>
          </div>
        </div>

        {filteredGlobal.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No recipes found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGlobal.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>

      {/* ========== SECTION 2: My Recipes ========== */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">My Recipes</h2>
            <p className="text-sm text-muted-foreground">{filteredMy.length} of {myRecipes.length} own recipes</p>
          </div>
        </div>

        {myRecipes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You don't have any recipes yet.</p>
            <Link
              href="/recipes/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create first recipe
            </Link>
          </div>
        ) : filteredMy.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No recipes match your filters</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMy.map(recipe => (
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
      </section>

      {/* ========== SECTION 3: Other Users' Recipes ========== */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Other Users' Recipes</h2>
            <p className="text-sm text-muted-foreground">{filteredOthers.length} public recipes</p>
          </div>
        </div>

        {filteredOthers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No public recipes from other users found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOthers.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onToggleFavorite={handleToggleFavorite}
                showOwner
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

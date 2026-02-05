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
        <div className="text-xl text-gray-500">Loading recipes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 text-lg">{error}</p>
        <p className="text-gray-500 mt-2">
          Make sure the backend is running on http://localhost:4000
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My Recipes</h1>
        <p className="text-gray-600">
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} found
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>

          <div className="w-full md:w-64">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={handleCategoryChange}
            />
          </div>

          <button
            onClick={handleFavoritesToggle}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showFavorites
                ? 'bg-orange-100 border-orange-300 text-orange-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showFavorites ? '★ Favorites' : '☆ Favorites'}
          </button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No recipes found</p>
          <Link
            href="/recipes/new"
            className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Create your first recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
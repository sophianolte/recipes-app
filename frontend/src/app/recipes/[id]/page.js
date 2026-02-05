'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRecipe, deleteRecipe, toggleFavorite } from '@/lib/api';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        setLoading(true);
        const data = await getRecipe(params.id);
        setRecipe(data);
      } catch (err) {
        setError('Recipe not found');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchRecipe();
    }
  }, [params.id]);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      await deleteRecipe(params.id);
      router.push('/');
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  }

  async function handleToggleFavorite() {
    try {
      const result = await toggleFavorite(params.id);
      setRecipe({ ...recipe, isFavorite: result.isFavorite });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-500">Loading recipe...</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg mb-4">{error || 'Recipe not found'}</p>
        <Link
          href="/"
          className="text-orange-600 hover:text-orange-700"
        >
          ← Back to recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center text-gray-600 hover:text-orange-600 mb-6"
      >
        ← Back to recipes
      </Link>

      {/* Recipe Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {recipe.title}
            </h1>
            {recipe.categoryName && (
              <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                {recipe.categoryName}
              </span>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg border transition-colors ${
                recipe.isFavorite
                  ? 'bg-yellow-100 border-yellow-300 text-yellow-600'
                  : 'bg-white border-gray-300 text-gray-400 hover:text-yellow-500'
              }`}
              title={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {recipe.isFavorite ? '★' : '☆'}
            </button>
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              title="Edit recipe"
            >
              ✏️
            </Link>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
              title="Delete recipe"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-gray-600 mb-4">{recipe.description}</p>
        )}

        {/* Meta Info */}
        <div className="flex gap-6 text-gray-500">
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <span>👥</span>
              <span>{recipe.servings} servings</span>
            </div>
          )}
          {recipe.prepTime && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{recipe.prepTime} minutes</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ingredients */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>
                  {ingredient.amount && (
                    <span className="font-medium">{ingredient.amount} </span>
                  )}
                  {ingredient.unit && (
                    <span className="text-gray-500">{ingredient.unit} </span>
                  )}
                  {ingredient.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Instructions
          </h2>
          <ol className="space-y-4">
            {recipe.steps && recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-semibold">
                  {step.stepNumber || index + 1}
                </span>
                <p className="text-gray-700 pt-1">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
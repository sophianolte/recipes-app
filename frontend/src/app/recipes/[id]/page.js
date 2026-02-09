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
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading recipe...</span>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-lg mb-4">{error || 'Recipe not found'}</p>
        <Link
          href="/"
          className="text-primary hover:text-accent transition-colors"
        >
          Back to recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mb-6 text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to recipes
      </Link>

      {/* Recipe Header */}
      <div className="bg-card rounded-xl border border-border-light p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-balance">
              {recipe.title}
            </h1>
            {recipe.categoryName && (
              <span className="inline-block bg-primary-light text-primary px-3 py-1 rounded-full text-sm font-medium">
                {recipe.categoryName}
              </span>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                recipe.isFavorite
                  ? 'bg-primary-light border-primary/30 text-primary'
                  : 'bg-card border-border text-muted-foreground hover:text-primary hover:border-primary/30'
              }`}
              title={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={recipe.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
              title="Edit recipe"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </Link>
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
              title="Delete recipe"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-muted-foreground mb-4 leading-relaxed">{recipe.description}</p>
        )}

        {/* Meta Info */}
        <div className="flex gap-6 text-muted-foreground text-sm">
          {recipe.servings && (
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>{recipe.servings} servings</span>
            </div>
          )}
          {recipe.prepTime && (
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{recipe.prepTime} minutes</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ingredients */}
        <div className="bg-card rounded-xl border border-border-light p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Ingredients
          </h2>
          <ul className="space-y-2.5">
            {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-sm leading-relaxed">
                  {ingredient.amount && (
                    <span className="font-medium text-foreground">{ingredient.amount} </span>
                  )}
                  {ingredient.unit && (
                    <span className="text-muted-foreground">{ingredient.unit} </span>
                  )}
                  <span className="text-foreground">{ingredient.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="md:col-span-2 bg-card rounded-xl border border-border-light p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Instructions
          </h2>
          <ol className="space-y-5">
            {recipe.steps && recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 bg-primary-light text-primary rounded-full flex items-center justify-center text-sm font-semibold">
                  {step.stepNumber || index + 1}
                </span>
                <p className="text-foreground text-sm leading-relaxed pt-0.5">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

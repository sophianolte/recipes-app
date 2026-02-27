'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getRecipe, updateRecipe, getCategories } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const inputClasses = "w-full px-4 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors";

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    servings: '',
    prepTime: '',
    imageUrl: '',
    ingredients: [{ name: '', amount: '', unit: '' }],
    steps: [{ stepNumber: 1, instruction: '' }],
  });

  // Fetch recipe and categories
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [recipeData, categoriesData] = await Promise.all([
          getRecipe(params.id),
          getCategories(),
        ]);

        if (recipeData.userId !== user?.id) {
          router.replace(`/recipes/${params.id}`);
          return;
        }

        setCategories(categoriesData);
        setFormData({
          title: recipeData.title || '',
          description: recipeData.description || '',
          categoryId: recipeData.categoryId || '',
          servings: recipeData.servings || '',
          prepTime: recipeData.prepTime || '',
          imageUrl: recipeData.imageUrl || '',
          ingredients: recipeData.ingredients?.length > 0
            ? recipeData.ingredients.map(i => ({
                name: i.name || '',
                amount: i.amount || '',
                unit: i.unit || '',
              }))
            : [{ name: '', amount: '', unit: '' }],
          steps: recipeData.steps?.length > 0
            ? recipeData.steps.map(s => ({
                stepNumber: s.stepNumber,
                instruction: s.instruction || '',
              }))
            : [{ stepNumber: 1, instruction: '' }],
        });
      } catch (err) {
        setError('Recipe not found');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  // Handle input changes
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  // Handle ingredient changes
  function handleIngredientChange(index, field, value) {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  }

  // Add ingredient
  function addIngredient() {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { name: '', amount: '', unit: '' }],
    });
  }

  // Remove ingredient
  function removeIngredient(index) {
    if (formData.ingredients.length === 1) return;
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  }

  // Handle step changes
  function handleStepChange(index, value) {
    const newSteps = [...formData.steps];
    newSteps[index].instruction = value;
    setFormData({ ...formData, steps: newSteps });
  }

  // Add step
  function addStep() {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        { stepNumber: formData.steps.length + 1, instruction: '' },
      ],
    });
  }

  // Remove step
  function removeStep(index) {
    if (formData.steps.length === 1) return;
    const newSteps = formData.steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, stepNumber: i + 1 }));
    setFormData({ ...formData, steps: newSteps });
  }

  // Handle form submit
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Validate
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    const validIngredients = formData.ingredients.filter(i => i.name.trim());
    if (validIngredients.length === 0) {
      setError('At least one ingredient is required');
      return;
    }

    const validSteps = formData.steps.filter(s => s.instruction.trim());
    if (validSteps.length === 0) {
      setError('At least one step is required');
      return;
    }

    try {
      setSaving(true);

      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        servings: formData.servings ? parseInt(formData.servings) : null,
        prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
        imageUrl: formData.imageUrl.trim() || null,
        ingredients: validIngredients.map(i => ({
          name: i.name.trim(),
          amount: i.amount.trim() || null,
          unit: i.unit.trim() || null,
        })),
        steps: validSteps.map((s, index) => ({
          stepNumber: index + 1,
          instruction: s.instruction.trim(),
        })),
      };

      await updateRecipe(params.id, recipeData);
      router.push(`/recipes/${params.id}`);
    } catch (err) {
      setError('Failed to update recipe. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
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

  if (error === 'Recipe not found') {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-lg mb-4">Recipe not found</p>
        <Link href="/" className="text-primary hover:text-accent transition-colors">
          Back to recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <Link
        href={`/recipes/${params.id}`}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mb-6 text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to recipe
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Edit Recipe</h1>

      {/* Error Message */}
      {error && error !== 'Recipe not found' && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border-light p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={inputClasses}
                placeholder="e.g. Spaghetti Carbonara"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className={inputClasses}
                placeholder="A short description of your recipe..."
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className={inputClasses}
                placeholder="https://example.com/photo.jpg"
              />
              {formData.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border-light max-h-48">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                    onLoad={(e) => { e.target.style.display = 'block'; }}
                  />
                </div>
              )}
            </div>

            {/* Category, Servings, Prep Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Category
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className={inputClasses}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Servings
                </label>
                <input
                  type="number"
                  name="servings"
                  value={formData.servings}
                  onChange={handleChange}
                  min="1"
                  className={inputClasses}
                  placeholder="4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Prep Time (min)
                </label>
                <input
                  type="number"
                  name="prepTime"
                  value={formData.prepTime}
                  onChange={handleChange}
                  min="1"
                  className={inputClasses}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-card rounded-xl border border-border-light p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Ingredients *</h2>
          
          <div className="space-y-3">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={ingredient.amount}
                  onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                  className="w-20 px-3 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors"
                  placeholder="500"
                />
                <input
                  type="text"
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  className="w-20 px-3 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors"
                  placeholder="g"
                />
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors"
                  placeholder="Ingredient name"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="px-3 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-30"
                  disabled={formData.ingredients.length === 1}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addIngredient}
            className="mt-3 text-primary hover:text-accent text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add ingredient
          </button>
        </div>

        {/* Steps */}
        <div className="bg-card rounded-xl border border-border-light p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Instructions *</h2>
          
          <div className="space-y-3">
            {formData.steps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-primary-light text-primary rounded-full flex items-center justify-center text-sm font-semibold mt-2.5">
                  {index + 1}
                </span>
                <textarea
                  value={step.instruction}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  rows={2}
                  className="flex-1 px-3 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors"
                  placeholder={`Step ${index + 1}...`}
                />
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="px-3 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg h-fit transition-colors disabled:opacity-30"
                  disabled={formData.steps.length === 1}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStep}
            className="mt-3 text-primary hover:text-accent text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add step
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/recipes/${params.id}`}
            className="px-6 py-3 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
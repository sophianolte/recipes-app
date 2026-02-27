import { Router, Request, Response } from 'express';
import { dbHelpers } from '../database';
import {
  Recipe, Ingredient, Step, RecipeWithDetails,
  CreateRecipeRequest, UpdateRecipeRequest, FavoriteToggleResponse,
} from '../types';

const router = Router();

// Helper to get userId from header
function getUserId(req: Request): number | null {
  const id = req.headers['x-user-id'];
  return id ? parseInt(id as string, 10) : null;
}

/**
 * GET /api/recipes - Get all GLOBAL recipes (userId IS NULL) with per-user favorite status
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { categoryId, search, favorite } = req.query as any;
    const userId = getUserId(req);

    let query = `
      SELECT r.*, c.name as categoryName,
        CASE WHEN uf.id IS NOT NULL THEN 1 ELSE 0 END as isFavorite
      FROM Recipe r
      LEFT JOIN Category c ON r.categoryId = c.id
      LEFT JOIN UserFavorite uf ON r.id = uf.recipeId AND uf.userId = ${userId || 0}
      WHERE r.userId IS NULL
    `;

    if (categoryId) {
      query += ` AND r.categoryId = ${parseInt(categoryId, 10)}`;
    }
    if (search) {
      query += ` AND r.title LIKE '%${search}%'`;
    }
    if (favorite === 'true') {
      query += ' AND uf.id IS NOT NULL';
    }

    query += ' ORDER BY r.createdAt DESC';

    const recipes = dbHelpers.prepare(query).all() as Recipe[];
    res.json(recipes);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/my - Get current user's private recipes
 */
router.get('/my', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const recipes = dbHelpers.prepare(`
      SELECT r.*, c.name as categoryName, u.displayName as ownerName,
        CASE WHEN uf.id IS NOT NULL THEN 1 ELSE 0 END as isFavorite
      FROM Recipe r
      LEFT JOIN Category c ON r.categoryId = c.id
      LEFT JOIN User u ON r.userId = u.id
      LEFT JOIN UserFavorite uf ON r.id = uf.recipeId AND uf.userId = ${userId}
      WHERE r.userId = ${userId}
      ORDER BY r.createdAt DESC
    `).all() as Recipe[];

    res.json(recipes);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/others-public - Get other users' public recipes
 */
router.get('/others-public', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const recipes = dbHelpers.prepare(`
      SELECT r.*, c.name as categoryName, u.displayName as ownerName,
        CASE WHEN uf.id IS NOT NULL THEN 1 ELSE 0 END as isFavorite
      FROM Recipe r
      LEFT JOIN Category c ON r.categoryId = c.id
      LEFT JOIN User u ON r.userId = u.id
      LEFT JOIN UserFavorite uf ON r.id = uf.recipeId AND uf.userId = ${userId}
      WHERE r.userId IS NOT NULL AND r.userId != ${userId} AND r.isPublic = 1
      ORDER BY r.createdAt DESC
    `).all() as Recipe[];

    res.json(recipes);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/:id - Get a single recipe with ingredients and steps
 */
router.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const recipe = dbHelpers.prepare(`
      SELECT r.*, c.name as categoryName, u.displayName as ownerName,
        CASE WHEN uf.id IS NOT NULL THEN 1 ELSE 0 END as isFavorite
      FROM Recipe r
      LEFT JOIN Category c ON r.categoryId = c.id
      LEFT JOIN User u ON r.userId = u.id
      LEFT JOIN UserFavorite uf ON r.id = uf.recipeId AND uf.userId = ${userId || 0}
      WHERE r.id = ${id}
    `).get() as Recipe | undefined;

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const ingredients = dbHelpers.prepare(`SELECT * FROM Ingredient WHERE recipeId = ${id}`).all() as Ingredient[];
    const steps = dbHelpers.prepare(`SELECT * FROM Step WHERE recipeId = ${id} ORDER BY stepNumber`).all() as Step[];

    const recipeWithDetails: RecipeWithDetails = {
      ...recipe,
      isFavorite: Boolean(recipe.isFavorite),
      isPublic: Boolean(recipe.isPublic),
      ingredients,
      steps,
    };

    res.json(recipeWithDetails);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/recipes - Create a new recipe (private by default)
 */
router.post('/', (req: Request<{}, {}, CreateRecipeRequest>, res: Response) => {
  try {
    const userId = getUserId(req);
    const { categoryId, title, description, servings, prepTime, imageUrl, isPublic, ingredients, steps } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!ingredients || ingredients.length === 0) return res.status(400).json({ error: 'At least one ingredient is required' });
    if (!steps || steps.length === 0) return res.status(400).json({ error: 'At least one step is required' });

    const recipeResult = dbHelpers.prepare(`
      INSERT INTO Recipe (categoryId, userId, title, description, servings, prepTime, imageUrl, isPublic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      categoryId || null, userId, title, description || null,
      servings || null, prepTime || null, imageUrl || null, isPublic ? 1 : 0
    );

    const recipeId = recipeResult.lastInsertRowid;

    ingredients.forEach(ing => {
      dbHelpers.prepare('INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)').run(
        recipeId, ing.name, ing.amount || null, ing.unit || null
      );
    });

    steps.forEach((step, index) => {
      dbHelpers.prepare('INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)').run(
        recipeId, step.stepNumber || index + 1, step.instruction
      );
    });

    const createdRecipe = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${recipeId}`).get() as Recipe;
    const createdIngredients = dbHelpers.prepare(`SELECT * FROM Ingredient WHERE recipeId = ${recipeId}`).all() as Ingredient[];
    const createdSteps = dbHelpers.prepare(`SELECT * FROM Step WHERE recipeId = ${recipeId} ORDER BY stepNumber`).all() as Step[];

    res.status(201).json({
      ...createdRecipe,
      isFavorite: false,
      isPublic: Boolean(createdRecipe.isPublic),
      ingredients: createdIngredients,
      steps: createdSteps,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/recipes/:id - Update a recipe (only owner can edit)
 */
router.put('/:id', (req: Request<{ id: string }, {}, UpdateRecipeRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { categoryId, title, description, servings, prepTime, imageUrl, isPublic, ingredients, steps } = req.body;

    const existing = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe | undefined;
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    if (existing.userId === null || existing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    dbHelpers.prepare(`
      UPDATE Recipe SET categoryId = ?, title = ?, description = ?, servings = ?, prepTime = ?, imageUrl = ?, isPublic = ?
      WHERE id = ?
    `).run(
      categoryId || null, title, description || null,
      servings || null, prepTime || null, imageUrl || null,
      isPublic !== undefined ? (isPublic ? 1 : 0) : existing.isPublic,
      parseInt(id, 10)
    );

    if (ingredients) {
      dbHelpers.prepare(`DELETE FROM Ingredient WHERE recipeId = ${id}`).run();
      ingredients.forEach(ing => {
        dbHelpers.prepare('INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)').run(
          parseInt(id, 10), ing.name, ing.amount || null, ing.unit || null
        );
      });
    }

    if (steps) {
      dbHelpers.prepare(`DELETE FROM Step WHERE recipeId = ${id}`).run();
      steps.forEach((step, index) => {
        dbHelpers.prepare('INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)').run(
          parseInt(id, 10), step.stepNumber || index + 1, step.instruction
        );
      });
    }

    const updatedRecipe = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe;
    const updatedIngredients = dbHelpers.prepare(`SELECT * FROM Ingredient WHERE recipeId = ${id}`).all() as Ingredient[];
    const updatedSteps = dbHelpers.prepare(`SELECT * FROM Step WHERE recipeId = ${id} ORDER BY stepNumber`).all() as Step[];

    res.json({
      ...updatedRecipe,
      isFavorite: Boolean(updatedRecipe.isFavorite),
      isPublic: Boolean(updatedRecipe.isPublic),
      ingredients: updatedIngredients,
      steps: updatedSteps,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/recipes/:id (only owner can delete)
 */
router.delete('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const existing = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe | undefined;
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    if (existing.userId === null || existing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    dbHelpers.prepare(`DELETE FROM UserFavorite WHERE recipeId = ${id}`).run();
    dbHelpers.prepare(`DELETE FROM Ingredient WHERE recipeId = ${id}`).run();
    dbHelpers.prepare(`DELETE FROM Step WHERE recipeId = ${id}`).run();
    dbHelpers.prepare(`DELETE FROM Recipe WHERE id = ${id}`).run();

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/recipes/:id/favorite - Toggle per-user favorite
 */
router.patch('/:id/favorite', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const existing = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe | undefined;
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    const fav = dbHelpers.prepare(
      `SELECT * FROM UserFavorite WHERE userId = ${userId} AND recipeId = ${id}`
    ).get();

    if (fav) {
      dbHelpers.prepare(`DELETE FROM UserFavorite WHERE userId = ${userId} AND recipeId = ${id}`).run();
      res.json({ id: parseInt(id, 10), isFavorite: false } as FavoriteToggleResponse);
    } else {
      dbHelpers.prepare('INSERT INTO UserFavorite (userId, recipeId) VALUES (?, ?)').run(userId, parseInt(id, 10));
      res.json({ id: parseInt(id, 10), isFavorite: true } as FavoriteToggleResponse);
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/recipes/:id/visibility - Toggle public/private
 */
router.patch('/:id/visibility', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const existing = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe | undefined;
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const newStatus = existing.isPublic ? 0 : 1;
    dbHelpers.prepare(`UPDATE Recipe SET isPublic = ? WHERE id = ?`).run(newStatus, parseInt(id, 10));

    res.json({ id: parseInt(id, 10), isPublic: Boolean(newStatus) });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

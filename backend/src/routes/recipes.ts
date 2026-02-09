import { Router, Request, Response } from 'express';
import { dbHelpers } from '../database';
import {
  Recipe,
  Ingredient,
  Step,
  RecipeWithDetails,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  RecipeQueryParams,
  FavoriteToggleResponse,
} from '../types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Ingredient:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *           example: "Spaghetti"
 *         amount:
 *           type: string
 *           example: "500"
 *         unit:
 *           type: string
 *           example: "g"
 *     Step:
 *       type: object
 *       required:
 *         - stepNumber
 *         - instruction
 *       properties:
 *         id:
 *           type: integer
 *         stepNumber:
 *           type: integer
 *           example: 1
 *         instruction:
 *           type: string
 *           example: "Boil water in a large pot"
 *     Recipe:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *         categoryId:
 *           type: integer
 *           nullable: true
 *         title:
 *           type: string
 *           example: "Spaghetti Carbonara"
 *         description:
 *           type: string
 *           example: "Classic Italian pasta dish"
 *         servings:
 *           type: integer
 *           example: 4
 *         prepTime:
 *           type: integer
 *           example: 30
 *         imageUrl:
 *           type: string
 *           nullable: true
 *         isFavorite:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *         ingredients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Ingredient'
 *         steps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Step'
 *     RecipeInput:
 *       type: object
 *       required:
 *         - title
 *         - ingredients
 *         - steps
 *       properties:
 *         categoryId:
 *           type: integer
 *           nullable: true
 *         title:
 *           type: string
 *           example: "Spaghetti Carbonara"
 *         description:
 *           type: string
 *           example: "Classic Italian pasta dish"
 *         servings:
 *           type: integer
 *           example: 4
 *         prepTime:
 *           type: integer
 *           example: 30
 *         imageUrl:
 *           type: string
 *           nullable: true
 *         ingredients:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               amount:
 *                 type: string
 *               unit:
 *                 type: string
 *         steps:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               stepNumber:
 *                 type: integer
 *               instruction:
 *                 type: string
 */

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Get all recipes
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by recipe title
 *       - in: query
 *         name: favorite
 *         schema:
 *           type: boolean
 *         description: Filter favorites only
 *     responses:
 *       200:
 *         description: List of recipes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recipe'
 */
router.get('/', (req: Request<{}, {}, {}, RecipeQueryParams>, res: Response) => {
  try {
    const { categoryId, search, favorite } = req.query;

    let query = `
      SELECT r.*, c.name as categoryName 
      FROM Recipe r 
      LEFT JOIN Category c ON r.categoryId = c.id 
      WHERE 1=1
    `;

    if (categoryId) {
      query += ` AND r.categoryId = ${parseInt(categoryId, 10)}`;
    }

    if (search) {
      query += ` AND r.title LIKE '%${search}%'`;
    }

    if (favorite === 'true') {
      query += ' AND r.isFavorite = 1';
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
 * @swagger
 * /api/recipes/{id}:
 *   get:
 *     summary: Get a single recipe with ingredients and steps
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Recipe details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       404:
 *         description: Recipe not found
 */
router.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const recipe = dbHelpers.prepare(`
      SELECT r.*, c.name as categoryName 
      FROM Recipe r 
      LEFT JOIN Category c ON r.categoryId = c.id 
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
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create a new recipe
 *     tags: [Recipes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Invalid input
 */
router.post('/', (req: Request<{}, {}, CreateRecipeRequest>, res: Response) => {
  try {
    const { categoryId, title, description, servings, prepTime, imageUrl, ingredients, steps } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    if (!steps || steps.length === 0) {
      return res.status(400).json({ error: 'At least one step is required' });
    }

    // Insert recipe
    const recipeResult = dbHelpers.prepare(`
      INSERT INTO Recipe (categoryId, title, description, servings, prepTime, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      categoryId || null,
      title,
      description || null,
      servings || null,
      prepTime || null,
      imageUrl || null
    );

    const recipeId = recipeResult.lastInsertRowid;

    // Insert ingredients
    ingredients.forEach(ing => {
      dbHelpers.prepare('INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)').run(
        recipeId, ing.name, ing.amount || null, ing.unit || null
      );
    });

    // Insert steps
    steps.forEach((step, index) => {
      dbHelpers.prepare('INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)').run(
        recipeId, step.stepNumber || index + 1, step.instruction
      );
    });

    // Fetch and return the created recipe
    const createdRecipe = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${recipeId}`).get() as Recipe;
    const createdIngredients = dbHelpers.prepare(`SELECT * FROM Ingredient WHERE recipeId = ${recipeId}`).all() as Ingredient[];
    const createdSteps = dbHelpers.prepare(`SELECT * FROM Step WHERE recipeId = ${recipeId} ORDER BY stepNumber`).all() as Step[];

    const recipeWithDetails: RecipeWithDetails = {
      ...createdRecipe,
      isFavorite: Boolean(createdRecipe.isFavorite),
      ingredients: createdIngredients,
      steps: createdSteps,
    };

    res.status(201).json(recipeWithDetails);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/recipes/{id}:
 *   put:
 *     summary: Update a recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       200:
 *         description: Recipe updated successfully
 *       404:
 *         description: Recipe not found
 */
router.put('/:id', (req: Request<{ id: string }, {}, UpdateRecipeRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const { categoryId, title, description, servings, prepTime, imageUrl, ingredients, steps } = req.body;

    // Check if recipe exists
    const existing = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Update recipe
    dbHelpers.prepare(`
      UPDATE Recipe 
      SET categoryId = ?, title = ?, description = ?, servings = ?, prepTime = ?, imageUrl = ?
      WHERE id = ?
    `).run(
      categoryId || null,
      title,
      description || null,
      servings || null,
      prepTime || null,
      imageUrl || null,
      parseInt(id, 10)
    );

    // Update ingredients (delete and re-insert)
    if (ingredients) {
      dbHelpers.prepare(`DELETE FROM Ingredient WHERE recipeId = ${id}`).run();
      ingredients.forEach(ing => {
        dbHelpers.prepare('INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)').run(
          parseInt(id, 10), ing.name, ing.amount || null, ing.unit || null
        );
      });
    }

    // Update steps (delete and re-insert)
    if (steps) {
      dbHelpers.prepare(`DELETE FROM Step WHERE recipeId = ${id}`).run();
      steps.forEach((step, index) => {
        dbHelpers.prepare('INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)').run(
          parseInt(id, 10), step.stepNumber || index + 1, step.instruction
        );
      });
    }

    // Fetch and return the updated recipe
    const updatedRecipe = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe;
    const updatedIngredients = dbHelpers.prepare(`SELECT * FROM Ingredient WHERE recipeId = ${id}`).all() as Ingredient[];
    const updatedSteps = dbHelpers.prepare(`SELECT * FROM Step WHERE recipeId = ${id} ORDER BY stepNumber`).all() as Step[];

    const recipeWithDetails: RecipeWithDetails = {
      ...updatedRecipe,
      isFavorite: Boolean(updatedRecipe.isFavorite),
      ingredients: updatedIngredients,
      steps: updatedSteps,
    };

    res.json(recipeWithDetails);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/recipes/{id}:
 *   delete:
 *     summary: Delete a recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Recipe deleted successfully
 *       404:
 *         description: Recipe not found
 */
router.delete('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const existing = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Delete ingredients and steps first (since sql.js doesn't support CASCADE well)
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
 * @swagger
 * /api/recipes/{id}/favorite:
 *   patch:
 *     summary: Toggle favorite status
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe ID
 *     responses:
 *       200:
 *         description: Favorite status toggled
 *       404:
 *         description: Recipe not found
 */
router.patch('/:id/favorite', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const existing = dbHelpers.prepare(`SELECT * FROM Recipe WHERE id = ${id}`).get() as Recipe | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const newFavoriteStatus = existing.isFavorite ? 0 : 1;
    dbHelpers.prepare(`UPDATE Recipe SET isFavorite = ? WHERE id = ?`).run(newFavoriteStatus, parseInt(id, 10));

    const response: FavoriteToggleResponse = {
      id: parseInt(id, 10),
      isFavorite: Boolean(newFavoriteStatus),
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

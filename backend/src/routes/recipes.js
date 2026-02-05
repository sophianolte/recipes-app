const express = require('express');
const router = express.Router();
const { db } = require('../database');

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
router.get('/', (req, res) => {
  try {
    const { categoryId, search, favorite } = req.query;
    
    let query = `
      SELECT r.*, c.name as categoryName 
      FROM Recipe r 
      LEFT JOIN Category c ON r.categoryId = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (categoryId) {
      query += ' AND r.categoryId = ?';
      params.push(categoryId);
    }

    if (search) {
      query += ' AND r.title LIKE ?';
      params.push(`%${search}%`);
    }

    if (favorite === 'true') {
      query += ' AND r.isFavorite = 1';
    }

    query += ' ORDER BY r.createdAt DESC';

    const recipes = db.prepare(query).all(...params);
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const recipe = db.prepare(`
      SELECT r.*, c.name as categoryName 
      FROM Recipe r 
      LEFT JOIN Category c ON r.categoryId = c.id 
      WHERE r.id = ?
    `).get(id);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const ingredients = db.prepare('SELECT * FROM Ingredient WHERE recipeId = ?').all(id);
    const steps = db.prepare('SELECT * FROM Step WHERE recipeId = ? ORDER BY stepNumber').all(id);

    res.json({
      ...recipe,
      isFavorite: Boolean(recipe.isFavorite),
      ingredients,
      steps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.post('/', (req, res) => {
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
    const recipeResult = db.prepare(`
      INSERT INTO Recipe (categoryId, title, description, servings, prepTime, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(categoryId || null, title, description || null, servings || null, prepTime || null, imageUrl || null);

    const recipeId = recipeResult.lastInsertRowid;

    // Insert ingredients
    const insertIngredient = db.prepare('INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)');
    ingredients.forEach(ing => {
      insertIngredient.run(recipeId, ing.name, ing.amount || null, ing.unit || null);
    });

    // Insert steps
    const insertStep = db.prepare('INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)');
    steps.forEach((step, index) => {
      insertStep.run(recipeId, step.stepNumber || index + 1, step.instruction);
    });

    // Fetch and return the created recipe
    const createdRecipe = db.prepare('SELECT * FROM Recipe WHERE id = ?').get(recipeId);
    const createdIngredients = db.prepare('SELECT * FROM Ingredient WHERE recipeId = ?').all(recipeId);
    const createdSteps = db.prepare('SELECT * FROM Step WHERE recipeId = ? ORDER BY stepNumber').all(recipeId);

    res.status(201).json({
      ...createdRecipe,
      isFavorite: Boolean(createdRecipe.isFavorite),
      ingredients: createdIngredients,
      steps: createdSteps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, title, description, servings, prepTime, imageUrl, ingredients, steps } = req.body;

    // Check if recipe exists
    const existing = db.prepare('SELECT * FROM Recipe WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Update recipe
    db.prepare(`
      UPDATE Recipe 
      SET categoryId = ?, title = ?, description = ?, servings = ?, prepTime = ?, imageUrl = ?
      WHERE id = ?
    `).run(categoryId || null, title, description || null, servings || null, prepTime || null, imageUrl || null, id);

    // Update ingredients (delete and re-insert)
    if (ingredients) {
      db.prepare('DELETE FROM Ingredient WHERE recipeId = ?').run(id);
      const insertIngredient = db.prepare('INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)');
      ingredients.forEach(ing => {
        insertIngredient.run(id, ing.name, ing.amount || null, ing.unit || null);
      });
    }

    // Update steps (delete and re-insert)
    if (steps) {
      db.prepare('DELETE FROM Step WHERE recipeId = ?').run(id);
      const insertStep = db.prepare('INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)');
      steps.forEach((step, index) => {
        insertStep.run(id, step.stepNumber || index + 1, step.instruction);
      });
    }

    // Fetch and return the updated recipe
    const updatedRecipe = db.prepare('SELECT * FROM Recipe WHERE id = ?').get(id);
    const updatedIngredients = db.prepare('SELECT * FROM Ingredient WHERE recipeId = ?').all(id);
    const updatedSteps = db.prepare('SELECT * FROM Step WHERE recipeId = ? ORDER BY stepNumber').all(id);

    res.json({
      ...updatedRecipe,
      isFavorite: Boolean(updatedRecipe.isFavorite),
      ingredients: updatedIngredients,
      steps: updatedSteps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM Recipe WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Ingredients and Steps are deleted automatically due to ON DELETE CASCADE
    db.prepare('DELETE FROM Recipe WHERE id = ?').run(id);

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.patch('/:id/favorite', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM Recipe WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const newFavoriteStatus = existing.isFavorite ? 0 : 1;
    db.prepare('UPDATE Recipe SET isFavorite = ? WHERE id = ?').run(newFavoriteStatus, id);

    res.json({ 
      id: Number(id), 
      isFavorite: Boolean(newFavoriteStatus) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
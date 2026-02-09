import { Router, Request, Response } from 'express';
import { dbHelpers } from '../database';
import { Category, Recipe, CreateCategoryRequest } from '../types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Main Course"
 *         createdAt:
 *           type: string
 *           example: "2024-01-15T10:30:00.000Z"
 *     CategoryInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Main Course"
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const categories = dbHelpers.prepare('SELECT * FROM Category ORDER BY name').all() as Category[];
    res.json(categories);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a single category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const category = dbHelpers.prepare(`SELECT * FROM Category WHERE id = ${id}`).get() as Category | undefined;

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid input or category already exists
 */
router.post('/', (req: Request<{}, {}, CreateCategoryRequest>, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const existing = dbHelpers.prepare(`SELECT * FROM Category WHERE name = '${name.trim()}'`).get() as Category | undefined;
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const result = dbHelpers.prepare('INSERT INTO Category (name) VALUES (?)').run(name.trim());
    const newCategory = dbHelpers.prepare(`SELECT * FROM Category WHERE id = ${result.lastInsertRowid}`).get() as Category;

    res.status(201).json(newCategory);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
router.put('/:id', (req: Request<{ id: string }, {}, CreateCategoryRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = dbHelpers.prepare(`SELECT * FROM Category WHERE id = ${id}`).get() as Category | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new name already exists (for a different category)
    const duplicate = dbHelpers.prepare(`SELECT * FROM Category WHERE name = '${name.trim()}' AND id != ${id}`).get() as Category | undefined;
    if (duplicate) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    dbHelpers.prepare(`UPDATE Category SET name = ? WHERE id = ?`).run(name.trim(), parseInt(id, 10));
    const updatedCategory = dbHelpers.prepare(`SELECT * FROM Category WHERE id = ${id}`).get() as Category;

    res.json(updatedCategory);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 */
router.delete('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const existing = dbHelpers.prepare(`SELECT * FROM Category WHERE id = ${id}`).get() as Category | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Set categoryId to NULL for recipes with this category
    dbHelpers.prepare(`UPDATE Recipe SET categoryId = NULL WHERE categoryId = ${id}`).run();
    dbHelpers.prepare(`DELETE FROM Category WHERE id = ${id}`).run();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}/recipes:
 *   get:
 *     summary: Get all recipes in a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: List of recipes in this category
 *       404:
 *         description: Category not found
 */
router.get('/:id/recipes', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const category = dbHelpers.prepare(`SELECT * FROM Category WHERE id = ${id}`).get() as Category | undefined;
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const recipes = dbHelpers.prepare(`
      SELECT * FROM Recipe WHERE categoryId = ${id} ORDER BY createdAt DESC
    `).all() as Recipe[];

    res.json({
      category,
      recipes,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

const express = require('express');
const router = express.Router();
const { db } = require('../database');

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
router.get('/', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM Category ORDER BY name').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const category = db.prepare('SELECT * FROM Category WHERE id = ?').get(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.post('/', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const existing = db.prepare('SELECT * FROM Category WHERE name = ?').get(name.trim());
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const result = db.prepare('INSERT INTO Category (name) VALUES (?)').run(name.trim());
    const newCategory = db.prepare('SELECT * FROM Category WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = db.prepare('SELECT * FROM Category WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new name already exists (for a different category)
    const duplicate = db.prepare('SELECT * FROM Category WHERE name = ? AND id != ?').get(name.trim(), id);
    if (duplicate) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    db.prepare('UPDATE Category SET name = ? WHERE id = ?').run(name.trim(), id);
    const updatedCategory = db.prepare('SELECT * FROM Category WHERE id = ?').get(id);

    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM Category WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Recipes with this categoryId will have categoryId set to NULL (ON DELETE SET NULL)
    db.prepare('DELETE FROM Category WHERE id = ?').run(id);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.get('/:id/recipes', (req, res) => {
  try {
    const { id } = req.params;

    const category = db.prepare('SELECT * FROM Category WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const recipes = db.prepare(`
      SELECT * FROM Recipe WHERE categoryId = ? ORDER BY createdAt DESC
    `).all(id);

    res.json({
      category,
      recipes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
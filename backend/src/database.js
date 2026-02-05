const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'recipes.db');
const db = new Database(dbPath);

function initializeDatabase() {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create Category table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Recipe table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Recipe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      servings INTEGER,
      prepTime INTEGER,
      imageUrl TEXT,
      isFavorite INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE SET NULL
    )
  `);

  // Create Ingredient table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Ingredient (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount TEXT,
      unit TEXT,
      FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE
    )
  `);

  // Create Step table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Step (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL,
      stepNumber INTEGER NOT NULL,
      instruction TEXT NOT NULL,
      FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE
    )
  `);

  // Insert default categories if none exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM Category').get();
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO Category (name) VALUES (?)');
    const defaultCategories = ['Starter', 'Main Course', 'Dessert', 'Soup', 'Salad', 'Snack', 'Drink'];
    defaultCategories.forEach(name => insertCategory.run(name));
    console.log('✅ Default categories created');
  }

  console.log('✅ Database initialized');
}

module.exports = { db, initializeDatabase };
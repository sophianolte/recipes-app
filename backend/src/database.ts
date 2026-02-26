import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { CountResult } from './types';

const dbPath = path.join(__dirname, '..', 'recipes.db');

let db: SqlJsDatabase;

export async function initializeDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create Category table
  db.run(`
    CREATE TABLE IF NOT EXISTS Category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Recipe table
  db.run(`
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
  db.run(`
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
  db.run(`
    CREATE TABLE IF NOT EXISTS Step (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL,
      stepNumber INTEGER NOT NULL,
      instruction TEXT NOT NULL,
      FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE
    )
  `);

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Insert default categories if none exist
  const categoryResult = db.exec('SELECT COUNT(*) as count FROM Category');
  const categoryCount = categoryResult[0]?.values[0]?.[0] as number || 0;
  
  if (categoryCount === 0) {
    const defaultCategories = ['Starter', 'Main Course', 'Dessert', 'Soup', 'Salad', 'Snack', 'Drink'];
    defaultCategories.forEach(name => {
      db.run('INSERT INTO Category (name) VALUES (?)', [name]);
    });
    console.log('✅ Default categories created');
  }

  // Insert seed recipes if none exist
  const recipeResult = db.exec('SELECT COUNT(*) as count FROM Recipe');
  const recipeCount = recipeResult[0]?.values[0]?.[0] as number || 0;
  
  if (recipeCount === 0) {
    seedRecipes();
    console.log('✅ Seed recipes created');
  }

  // Save to file
  saveDatabase();

  console.log('✅ Database initialized');
}

export function saveDatabase(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function getDb(): SqlJsDatabase {
  return db;
}

// Helper functions to match better-sqlite3 API style
export const dbHelpers = {
  prepare: (sql: string) => ({
    all: (...params: any[]): any[] => {
      const result = db.exec(sql, params);
      if (result.length === 0) return [];
      
      const columns = result[0].columns;
      return result[0].values.map((row: { [x: string]: any; }) => {
        const obj: any = {};
        columns.forEach((col: string | number, i: number) => {
          obj[col as string] = row[i];
        });
        return obj;
      });
    },
    get: (...params: any[]): any | undefined => {
      const result = db.exec(sql, params);
      if (result.length === 0 || result[0].values.length === 0) return undefined;
      
      const columns = result[0].columns;
      const row = result[0].values[0];
      const obj: any = {};
      columns.forEach((col: string | number, i: number) => {
        obj[col as string] = row[i];
      });
      return obj;
    },
    run: (...params: any[]): { lastInsertRowid: number; changes: number } => {
      db.run(sql, params);
      const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number || 0;
      const changes = db.getRowsModified();
      saveDatabase();
      return { lastInsertRowid: lastId, changes };
    }
  }),
  exec: (sql: string): void => {
    db.run(sql);
    saveDatabase();
  }
};

interface SeedIngredient {
  name: string;
  amount: string;
  unit: string;
}

interface SeedRecipe {
  categoryId: number;
  title: string;
  description: string;
  servings: number;
  prepTime: number;
  imageUrl: string | null;
  isFavorite: number;
  ingredients: SeedIngredient[];
  steps: string[];
}

function seedRecipes(): void {
  const recipes: SeedRecipe[] = [
    // Recipe 1: Spaghetti Carbonara (Main Course)
    {
      categoryId: 2,
      title: 'Spaghetti Carbonara',
      description: 'A classic Italian pasta dish with creamy egg sauce and crispy pancetta.',
      servings: 4,
      prepTime: 25,
      imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
      isFavorite: 1,
      ingredients: [
        { name: 'Spaghetti', amount: '400', unit: 'g' },
        { name: 'Pancetta', amount: '200', unit: 'g' },
        { name: 'Egg yolks', amount: '4', unit: 'pcs' },
        { name: 'Parmesan cheese', amount: '100', unit: 'g' },
        { name: 'Black pepper', amount: '2', unit: 'tsp' },
        { name: 'Salt', amount: '1', unit: 'tsp' }
      ],
      steps: [
        'Bring a large pot of salted water to boil and cook spaghetti according to package instructions.',
        'While pasta cooks, cut pancetta into small cubes and fry in a large pan until crispy.',
        'In a bowl, whisk together egg yolks, grated Parmesan, and black pepper.',
        'Reserve 1 cup of pasta water, then drain the spaghetti.',
        'Add hot pasta to the pan with pancetta (off heat) and quickly toss with the egg mixture.',
        'Add pasta water a little at a time to create a creamy sauce. Serve immediately.'
      ]
    },
    // Recipe 2: Caesar Salad (Salad)
    {
      categoryId: 5,
      title: 'Classic Caesar Salad',
      description: 'Crisp romaine lettuce with homemade Caesar dressing and crunchy croutons.',
      servings: 2,
      prepTime: 15,
      imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800',
      isFavorite: 0,
      ingredients: [
        { name: 'Romaine lettuce', amount: '1', unit: 'head' },
        { name: 'Parmesan cheese', amount: '50', unit: 'g' },
        { name: 'Croutons', amount: '100', unit: 'g' },
        { name: 'Mayonnaise', amount: '3', unit: 'tbsp' },
        { name: 'Lemon juice', amount: '1', unit: 'tbsp' },
        { name: 'Garlic', amount: '1', unit: 'clove' },
        { name: 'Anchovy paste', amount: '1', unit: 'tsp' }
      ],
      steps: [
        'Wash and dry the romaine lettuce, then tear into bite-sized pieces.',
        'Make the dressing: mix mayonnaise, lemon juice, minced garlic, and anchovy paste.',
        'Add grated Parmesan to the dressing and whisk until smooth.',
        'Toss the lettuce with the dressing until evenly coated.',
        'Top with croutons and extra Parmesan shavings. Serve immediately.'
      ]
    },
    // Recipe 3: Tomato Soup (Soup)
    {
      categoryId: 4,
      title: 'Creamy Tomato Soup',
      description: 'A comforting homemade tomato soup perfect for cold days.',
      servings: 4,
      prepTime: 35,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
      isFavorite: 1,
      ingredients: [
        { name: 'Canned tomatoes', amount: '800', unit: 'g' },
        { name: 'Onion', amount: '1', unit: 'large' },
        { name: 'Garlic', amount: '3', unit: 'cloves' },
        { name: 'Vegetable broth', amount: '500', unit: 'ml' },
        { name: 'Heavy cream', amount: '100', unit: 'ml' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Basil', amount: '10', unit: 'leaves' },
        { name: 'Sugar', amount: '1', unit: 'tsp' }
      ],
      steps: [
        'Dice the onion and mince the garlic.',
        'Heat olive oil in a large pot and sauté onion until translucent, about 5 minutes.',
        'Add garlic and cook for another minute.',
        'Pour in the canned tomatoes and vegetable broth. Add sugar and season with salt and pepper.',
        'Simmer for 20 minutes, then blend until smooth using an immersion blender.',
        'Stir in heavy cream and fresh basil. Serve hot with crusty bread.'
      ]
    },
    // Recipe 4: Chocolate Mousse (Dessert)
    {
      categoryId: 3,
      title: 'Dark Chocolate Mousse',
      description: 'Rich and silky French chocolate mousse that melts in your mouth.',
      servings: 6,
      prepTime: 30,
      imageUrl: 'https://images.unsplash.com/photo-1590080875852-ba44f83ff2db?w=800',
      isFavorite: 1,
      ingredients: [
        { name: 'Dark chocolate', amount: '200', unit: 'g' },
        { name: 'Eggs', amount: '4', unit: 'pcs' },
        { name: 'Sugar', amount: '50', unit: 'g' },
        { name: 'Heavy cream', amount: '200', unit: 'ml' },
        { name: 'Vanilla extract', amount: '1', unit: 'tsp' },
        { name: 'Salt', amount: '1', unit: 'pinch' }
      ],
      steps: [
        'Melt the dark chocolate in a double boiler, then let it cool slightly.',
        'Separate the eggs. Whisk yolks with half the sugar until pale and creamy.',
        'Beat egg whites with a pinch of salt until soft peaks form, then gradually add remaining sugar.',
        'Whip the heavy cream with vanilla extract until soft peaks form.',
        'Fold the melted chocolate into the egg yolk mixture.',
        'Gently fold in the whipped cream, then the egg whites.',
        'Divide into serving glasses and refrigerate for at least 4 hours before serving.'
      ]
    },
    // Recipe 5: Bruschetta (Starter)
    {
      categoryId: 1,
      title: 'Tomato Bruschetta',
      description: 'Classic Italian appetizer with fresh tomatoes, basil, and garlic on toasted bread.',
      servings: 4,
      prepTime: 15,
      imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800',
      isFavorite: 0,
      ingredients: [
        { name: 'Baguette', amount: '1', unit: 'loaf' },
        { name: 'Tomatoes', amount: '4', unit: 'medium' },
        { name: 'Fresh basil', amount: '15', unit: 'leaves' },
        { name: 'Garlic', amount: '2', unit: 'cloves' },
        { name: 'Olive oil', amount: '4', unit: 'tbsp' },
        { name: 'Balsamic vinegar', amount: '1', unit: 'tbsp' },
        { name: 'Salt', amount: '1', unit: 'tsp' }
      ],
      steps: [
        'Dice the tomatoes and chop the fresh basil.',
        'Mix tomatoes, basil, 2 tbsp olive oil, balsamic vinegar, and salt in a bowl.',
        'Let the tomato mixture marinate for 10 minutes.',
        'Slice the baguette and toast until golden brown.',
        'Rub each toast with a cut garlic clove and drizzle with remaining olive oil.',
        'Top with the tomato mixture and serve immediately.'
      ]
    },
    // Recipe 6: Chicken Stir Fry (Main Course)
    {
      categoryId: 2,
      title: 'Asian Chicken Stir Fry',
      description: 'Quick and healthy stir fry with tender chicken and colorful vegetables.',
      servings: 4,
      prepTime: 20,
      imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
      isFavorite: 0,
      ingredients: [
        { name: 'Chicken breast', amount: '500', unit: 'g' },
        { name: 'Bell peppers', amount: '2', unit: 'pcs' },
        { name: 'Broccoli', amount: '200', unit: 'g' },
        { name: 'Soy sauce', amount: '4', unit: 'tbsp' },
        { name: 'Sesame oil', amount: '2', unit: 'tbsp' },
        { name: 'Ginger', amount: '1', unit: 'inch' },
        { name: 'Garlic', amount: '3', unit: 'cloves' },
        { name: 'Cornstarch', amount: '1', unit: 'tbsp' }
      ],
      steps: [
        'Cut chicken into bite-sized pieces and toss with 1 tbsp soy sauce and cornstarch.',
        'Slice bell peppers and cut broccoli into florets.',
        'Heat sesame oil in a wok over high heat.',
        'Stir fry chicken until golden, about 5 minutes. Remove and set aside.',
        'Add more oil if needed, then stir fry vegetables for 3 minutes.',
        'Add minced ginger and garlic, cook for 30 seconds.',
        'Return chicken to wok, add remaining soy sauce, and toss everything together.',
        'Serve hot over steamed rice.'
      ]
    },
    // Recipe 7: Banana Pancakes (Snack)
    {
      categoryId: 6,
      title: 'Fluffy Banana Pancakes',
      description: 'Naturally sweet pancakes made with ripe bananas, perfect for breakfast or snack.',
      servings: 2,
      prepTime: 20,
      imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
      isFavorite: 1,
      ingredients: [
        { name: 'Ripe bananas', amount: '2', unit: 'pcs' },
        { name: 'Eggs', amount: '2', unit: 'pcs' },
        { name: 'Flour', amount: '150', unit: 'g' },
        { name: 'Milk', amount: '100', unit: 'ml' },
        { name: 'Baking powder', amount: '1', unit: 'tsp' },
        { name: 'Butter', amount: '30', unit: 'g' },
        { name: 'Maple syrup', amount: '2', unit: 'tbsp' }
      ],
      steps: [
        'Mash the bananas in a large bowl until smooth.',
        'Add eggs and milk, whisk until combined.',
        'Mix in flour and baking powder until just combined (don\'t overmix).',
        'Heat a non-stick pan over medium heat and add a little butter.',
        'Pour batter to form pancakes and cook until bubbles form on top, then flip.',
        'Cook for another 2 minutes until golden brown.',
        'Serve stacked with maple syrup and sliced bananas on top.'
      ]
    },
    // Recipe 8: Greek Salad (Salad)
    {
      categoryId: 5,
      title: 'Traditional Greek Salad',
      description: 'Fresh Mediterranean salad with feta cheese, olives, and oregano dressing.',
      servings: 4,
      prepTime: 10,
      imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
      isFavorite: 0,
      ingredients: [
        { name: 'Cucumber', amount: '1', unit: 'large' },
        { name: 'Tomatoes', amount: '4', unit: 'medium' },
        { name: 'Red onion', amount: '1', unit: 'small' },
        { name: 'Feta cheese', amount: '200', unit: 'g' },
        { name: 'Kalamata olives', amount: '100', unit: 'g' },
        { name: 'Olive oil', amount: '4', unit: 'tbsp' },
        { name: 'Dried oregano', amount: '1', unit: 'tsp' },
        { name: 'Red wine vinegar', amount: '1', unit: 'tbsp' }
      ],
      steps: [
        'Cut cucumber and tomatoes into large chunks.',
        'Slice red onion into thin rings.',
        'Combine vegetables in a large bowl.',
        'Add olives and crumble feta cheese on top.',
        'Drizzle with olive oil and red wine vinegar.',
        'Sprinkle with oregano and season with salt and pepper.',
        'Toss gently and serve immediately.'
      ]
    },
    // Recipe 9: Mango Smoothie (Drink)
    {
      categoryId: 7,
      title: 'Tropical Mango Smoothie',
      description: 'Refreshing and healthy smoothie with mango, banana, and coconut milk.',
      servings: 2,
      prepTime: 5,
      imageUrl: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800',
      isFavorite: 0,
      ingredients: [
        { name: 'Mango', amount: '1', unit: 'large' },
        { name: 'Banana', amount: '1', unit: 'pc' },
        { name: 'Coconut milk', amount: '200', unit: 'ml' },
        { name: 'Greek yogurt', amount: '100', unit: 'g' },
        { name: 'Honey', amount: '1', unit: 'tbsp' },
        { name: 'Ice cubes', amount: '6', unit: 'pcs' }
      ],
      steps: [
        'Peel and chop the mango, removing the pit.',
        'Break the banana into chunks.',
        'Add all ingredients to a blender.',
        'Blend on high until smooth and creamy.',
        'Pour into glasses and serve immediately.',
        'Optionally garnish with a slice of mango or shredded coconut.'
      ]
    },
    // Recipe 10: Beef Tacos (Main Course)
    {
      categoryId: 2,
      title: 'Mexican Beef Tacos',
      description: 'Flavorful ground beef tacos with fresh toppings and homemade seasoning.',
      servings: 4,
      prepTime: 25,
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
      isFavorite: 1,
      ingredients: [
        { name: 'Ground beef', amount: '500', unit: 'g' },
        { name: 'Taco shells', amount: '8', unit: 'pcs' },
        { name: 'Onion', amount: '1', unit: 'medium' },
        { name: 'Tomatoes', amount: '2', unit: 'pcs' },
        { name: 'Lettuce', amount: '100', unit: 'g' },
        { name: 'Cheddar cheese', amount: '100', unit: 'g' },
        { name: 'Sour cream', amount: '100', unit: 'ml' },
        { name: 'Cumin', amount: '1', unit: 'tsp' },
        { name: 'Chili powder', amount: '1', unit: 'tsp' },
        { name: 'Garlic powder', amount: '1', unit: 'tsp' }
      ],
      steps: [
        'Dice the onion and sauté in a pan until soft.',
        'Add ground beef and cook until browned, breaking it up as it cooks.',
        'Add cumin, chili powder, garlic powder, salt, and pepper. Stir well.',
        'Simmer for 5 minutes, adding a splash of water if needed.',
        'Warm taco shells according to package instructions.',
        'Prepare toppings: shred lettuce, dice tomatoes, grate cheese.',
        'Fill each taco shell with meat and top with lettuce, tomatoes, cheese, and sour cream.',
        'Serve immediately with lime wedges on the side.'
      ]
    }
  ];

  // Insert each recipe with its ingredients and steps
  for (const recipe of recipes) {
    db.run(
      'INSERT INTO Recipe (categoryId, title, description, servings, prepTime, imageUrl, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [recipe.categoryId, recipe.title, recipe.description, recipe.servings, recipe.prepTime, recipe.imageUrl, recipe.isFavorite]
    );

    const lastIdResult = db.exec('SELECT last_insert_rowid()');
    const recipeId = lastIdResult[0]?.values[0]?.[0] as number;

    for (const ingredient of recipe.ingredients) {
      db.run(
        'INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)',
        [recipeId, ingredient.name, ingredient.amount, ingredient.unit]
      );
    }

    for (let i = 0; i < recipe.steps.length; i++) {
      db.run(
        'INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)',
        [recipeId, i + 1, recipe.steps[i]]
      );
    }
  }

  saveDatabase();
}

export { db };
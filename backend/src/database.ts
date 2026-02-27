import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { CountResult } from './types';

const dbPath = path.join(__dirname, '..', 'recipes.db');

let db: SqlJsDatabase;

export async function initializeDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // Always create fresh database to apply schema changes
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  db = new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    displayName TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Recipe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryId INTEGER,
    userId INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    servings INTEGER,
    prepTime INTEGER,
    imageUrl TEXT,
    isPublic INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE SET NULL,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS UserFavorite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    recipeId INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE,
    UNIQUE(userId, recipeId)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Ingredient (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipeId INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount TEXT,
    unit TEXT,
    FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Step (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipeId INTEGER NOT NULL,
    stepNumber INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    FOREIGN KEY (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE
  )`);

  db.run('PRAGMA foreign_keys = ON');

  seedUsers();
  const defaultCategories = ['Starter', 'Main Course', 'Dessert', 'Soup', 'Salad', 'Snack', 'Drink'];
  defaultCategories.forEach(name => { db.run('INSERT INTO Category (name) VALUES (?)', [name]); });
  seedGlobalRecipes();
  seedUserFavorites();
  seedPrivateRecipes();
  saveDatabase();
  console.log('✅ Database initialized with users, recipes, and favorites');
}

function seedUsers(): void {
  const users = [
    { username: 'pascal', password: 'pascal123', displayName: 'Pascal' },
    { username: 'alex', password: 'alex123', displayName: 'Alex' },
    { username: 'twan', password: 'twan123', displayName: 'Twan' },
    { username: 'sophia', password: 'sophia123', displayName: 'Sophia' },
  ];
  users.forEach(u => {
    db.run('INSERT INTO User (username, password, displayName) VALUES (?, ?, ?)', [u.username, u.password, u.displayName]);
  });
}

function seedUserFavorites(): void {
  const favorites: Record<number, number[]> = {
    1: [1, 3, 7, 10],    // Pascal
    2: [2, 5, 6, 8],     // Alex
    3: [1, 4, 9, 10],    // Twan
    4: [3, 5, 7, 8, 9],  // Sophia
  };
  for (const [userId, recipeIds] of Object.entries(favorites)) {
    for (const recipeId of recipeIds) {
      db.run('INSERT INTO UserFavorite (userId, recipeId) VALUES (?, ?)', [parseInt(userId), recipeId]);
    }
  }
}

export function saveDatabase(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function getDb(): SqlJsDatabase { return db; }

export const dbHelpers = {
  prepare: (sql: string) => ({
    all: (...params: any[]): any[] => {
      const result = db.exec(sql, params);
      if (result.length === 0) return [];
      const columns = result[0].columns;
      return result[0].values.map((row: any) => {
        const obj: any = {};
        columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
        return obj;
      });
    },
    get: (...params: any[]): any | undefined => {
      const result = db.exec(sql, params);
      if (result.length === 0 || result[0].values.length === 0) return undefined;
      const columns = result[0].columns;
      const row = result[0].values[0];
      const obj: any = {};
      columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
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
  exec: (sql: string): void => { db.run(sql); saveDatabase(); }
};

interface SeedIngredient { name: string; amount: string; unit: string; }
interface SeedRecipe {
  categoryId: number; userId: number | null; title: string; description: string;
  servings: number; prepTime: number; imageUrl: string | null; isPublic: number;
  ingredients: SeedIngredient[]; steps: string[];
}

function insertRecipe(recipe: SeedRecipe): number {
  db.run(
    'INSERT INTO Recipe (categoryId, userId, title, description, servings, prepTime, imageUrl, isPublic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [recipe.categoryId, recipe.userId, recipe.title, recipe.description, recipe.servings, recipe.prepTime, recipe.imageUrl, recipe.isPublic]
  );
  const recipeId = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number;
  for (const ing of recipe.ingredients) {
    db.run('INSERT INTO Ingredient (recipeId, name, amount, unit) VALUES (?, ?, ?, ?)', [recipeId, ing.name, ing.amount, ing.unit]);
  }
  for (let i = 0; i < recipe.steps.length; i++) {
    db.run('INSERT INTO Step (recipeId, stepNumber, instruction) VALUES (?, ?, ?)', [recipeId, i + 1, recipe.steps[i]]);
  }
  return recipeId;
}

function seedGlobalRecipes(): void {
  const recipes: SeedRecipe[] = [
    { categoryId: 2, userId: null, isPublic: 1, title: 'Spaghetti Carbonara', description: 'A classic Italian pasta dish with creamy egg sauce and crispy pancetta.', servings: 4, prepTime: 25, imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
      ingredients: [{name:'Spaghetti',amount:'400',unit:'g'},{name:'Pancetta',amount:'200',unit:'g'},{name:'Egg yolks',amount:'4',unit:'pcs'},{name:'Parmesan cheese',amount:'100',unit:'g'},{name:'Black pepper',amount:'2',unit:'tsp'},{name:'Salt',amount:'1',unit:'tsp'}],
      steps: ['Bring a large pot of salted water to boil and cook spaghetti according to package instructions.','While pasta cooks, cut pancetta into small cubes and fry in a large pan until crispy.','In a bowl, whisk together egg yolks, grated Parmesan, and black pepper.','Reserve 1 cup of pasta water, then drain the spaghetti.','Add hot pasta to the pan with pancetta (off heat) and quickly toss with the egg mixture.','Add pasta water a little at a time to create a creamy sauce. Serve immediately.']
    },
    { categoryId: 5, userId: null, isPublic: 1, title: 'Classic Caesar Salad', description: 'Crisp romaine lettuce with homemade Caesar dressing and crunchy croutons.', servings: 2, prepTime: 15, imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800',
      ingredients: [{name:'Romaine lettuce',amount:'1',unit:'head'},{name:'Parmesan cheese',amount:'50',unit:'g'},{name:'Croutons',amount:'100',unit:'g'},{name:'Mayonnaise',amount:'3',unit:'tbsp'},{name:'Lemon juice',amount:'1',unit:'tbsp'},{name:'Garlic',amount:'1',unit:'clove'},{name:'Olive oil',amount:'2',unit:'tbsp'},{name:'Worcestershire sauce',amount:'1',unit:'tsp'}],
      steps: ['Wash and chop romaine lettuce into bite-sized pieces.','Make dressing: mix mayonnaise, lemon juice, minced garlic, olive oil, and Worcestershire sauce.','Toss lettuce with dressing until well coated.','Top with croutons and shaved Parmesan cheese.','Season with black pepper and serve immediately.']
    },
    { categoryId: 3, userId: null, isPublic: 1, title: 'Chocolate Mousse', description: 'Rich and airy French chocolate mousse with a velvety smooth texture.', servings: 6, prepTime: 30, imageUrl: 'https://images.unsplash.com/photo-1590080875852-ba44f83ff2db?q=80&w=800',
      ingredients: [{name:'Dark chocolate',amount:'200',unit:'g'},{name:'Eggs',amount:'4',unit:'pcs'},{name:'Sugar',amount:'50',unit:'g'},{name:'Heavy cream',amount:'200',unit:'ml'},{name:'Vanilla extract',amount:'1',unit:'tsp'},{name:'Salt',amount:'1',unit:'pinch'}],
      steps: ['Melt the dark chocolate in a heatproof bowl over simmering water. Let it cool slightly.','Separate the eggs. Whisk yolks with half the sugar until pale and creamy.','Beat egg whites with a pinch of salt until soft peaks form, then gradually add remaining sugar.','Whip the heavy cream with vanilla extract until soft peaks form.','Fold the melted chocolate into the egg yolk mixture.','Gently fold in the whipped cream, then the egg whites.','Divide into serving glasses and refrigerate for at least 4 hours before serving.']
    },
    { categoryId: 4, userId: null, isPublic: 1, title: 'Creamy Pumpkin Soup', description: 'Silky smooth pumpkin soup with warm spices and a hint of cream.', servings: 4, prepTime: 35, imageUrl: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800',
      ingredients: [{name:'Pumpkin',amount:'800',unit:'g'},{name:'Onion',amount:'1',unit:'large'},{name:'Garlic',amount:'3',unit:'cloves'},{name:'Vegetable broth',amount:'500',unit:'ml'},{name:'Heavy cream',amount:'100',unit:'ml'},{name:'Nutmeg',amount:'0.5',unit:'tsp'},{name:'Olive oil',amount:'2',unit:'tbsp'}],
      steps: ['Peel and cube the pumpkin. Dice the onion and mince the garlic.','Heat olive oil in a large pot and sauté onion until translucent.','Add garlic and pumpkin, cook for 5 minutes.','Pour in vegetable broth, bring to a boil, then simmer for 20 minutes.','Blend until smooth with an immersion blender.','Stir in cream and nutmeg. Season with salt and pepper. Serve hot.']
    },
    { categoryId: 1, userId: null, isPublic: 1, title: 'Tomato Bruschetta', description: 'Classic Italian appetizer with fresh tomatoes, basil, and garlic on toasted bread.', servings: 4, prepTime: 15, imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800',
      ingredients: [{name:'Baguette',amount:'1',unit:'loaf'},{name:'Tomatoes',amount:'4',unit:'medium'},{name:'Fresh basil',amount:'15',unit:'leaves'},{name:'Garlic',amount:'2',unit:'cloves'},{name:'Olive oil',amount:'4',unit:'tbsp'},{name:'Balsamic vinegar',amount:'1',unit:'tbsp'},{name:'Salt',amount:'1',unit:'tsp'}],
      steps: ['Dice the tomatoes and chop the fresh basil.','Mix tomatoes, basil, 2 tbsp olive oil, balsamic vinegar, and salt in a bowl.','Let the tomato mixture marinate for 10 minutes.','Slice the baguette and toast until golden brown.','Rub each toast with a cut garlic clove and drizzle with remaining olive oil.','Top with the tomato mixture and serve immediately.']
    },
    { categoryId: 2, userId: null, isPublic: 1, title: 'Asian Chicken Stir Fry', description: 'Quick and healthy stir fry with tender chicken and colorful vegetables.', servings: 4, prepTime: 20, imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
      ingredients: [{name:'Chicken breast',amount:'500',unit:'g'},{name:'Bell peppers',amount:'2',unit:'pcs'},{name:'Broccoli',amount:'200',unit:'g'},{name:'Soy sauce',amount:'4',unit:'tbsp'},{name:'Sesame oil',amount:'2',unit:'tbsp'},{name:'Ginger',amount:'1',unit:'inch'},{name:'Garlic',amount:'3',unit:'cloves'},{name:'Cornstarch',amount:'1',unit:'tbsp'}],
      steps: ['Cut chicken into bite-sized pieces and toss with 1 tbsp soy sauce and cornstarch.','Slice bell peppers and cut broccoli into florets.','Heat sesame oil in a wok over high heat.','Stir fry chicken until golden, about 5 minutes. Remove and set aside.','Add more oil if needed, then stir fry vegetables for 3 minutes.','Add minced ginger and garlic, cook for 30 seconds.','Return chicken to wok, add remaining soy sauce, and toss everything together.','Serve hot over steamed rice.']
    },
    { categoryId: 6, userId: null, isPublic: 1, title: 'Fluffy Banana Pancakes', description: 'Naturally sweet pancakes made with ripe bananas, perfect for breakfast or snack.', servings: 2, prepTime: 20, imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
      ingredients: [{name:'Ripe bananas',amount:'2',unit:'pcs'},{name:'Eggs',amount:'2',unit:'pcs'},{name:'Flour',amount:'150',unit:'g'},{name:'Milk',amount:'100',unit:'ml'},{name:'Baking powder',amount:'1',unit:'tsp'},{name:'Butter',amount:'30',unit:'g'},{name:'Maple syrup',amount:'2',unit:'tbsp'}],
      steps: ['Mash the bananas in a large bowl until smooth.','Add eggs and milk, whisk until combined.','Mix in flour and baking powder until just combined.','Heat a non-stick pan over medium heat and add a little butter.','Pour batter to form pancakes and cook until bubbles form on top, then flip.','Cook for another 2 minutes until golden brown.','Serve stacked with maple syrup and sliced bananas on top.']
    },
    { categoryId: 5, userId: null, isPublic: 1, title: 'Traditional Greek Salad', description: 'Fresh Mediterranean salad with feta cheese, olives, and oregano dressing.', servings: 4, prepTime: 10, imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
      ingredients: [{name:'Cucumber',amount:'1',unit:'large'},{name:'Tomatoes',amount:'4',unit:'medium'},{name:'Red onion',amount:'1',unit:'small'},{name:'Feta cheese',amount:'200',unit:'g'},{name:'Kalamata olives',amount:'100',unit:'g'},{name:'Olive oil',amount:'4',unit:'tbsp'},{name:'Dried oregano',amount:'1',unit:'tsp'},{name:'Red wine vinegar',amount:'1',unit:'tbsp'}],
      steps: ['Cut cucumber and tomatoes into large chunks.','Slice red onion into thin rings.','Combine vegetables in a large bowl.','Add olives and crumble feta cheese on top.','Drizzle with olive oil and red wine vinegar.','Sprinkle with oregano and season with salt and pepper.','Toss gently and serve immediately.']
    },
    { categoryId: 7, userId: null, isPublic: 1, title: 'Tropical Mango Smoothie', description: 'Refreshing and healthy smoothie with mango, banana, and coconut milk.', servings: 2, prepTime: 5, imageUrl: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800',
      ingredients: [{name:'Mango',amount:'1',unit:'large'},{name:'Banana',amount:'1',unit:'pc'},{name:'Coconut milk',amount:'200',unit:'ml'},{name:'Greek yogurt',amount:'100',unit:'g'},{name:'Honey',amount:'1',unit:'tbsp'},{name:'Ice cubes',amount:'6',unit:'pcs'}],
      steps: ['Peel and chop the mango, removing the pit.','Break the banana into chunks.','Add all ingredients to a blender.','Blend on high until smooth and creamy.','Pour into glasses and serve immediately.','Optionally garnish with a slice of mango or shredded coconut.']
    },
    { categoryId: 2, userId: null, isPublic: 1, title: 'Mexican Beef Tacos', description: 'Flavorful ground beef tacos with fresh toppings and homemade seasoning.', servings: 4, prepTime: 25, imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
      ingredients: [{name:'Ground beef',amount:'500',unit:'g'},{name:'Taco shells',amount:'8',unit:'pcs'},{name:'Onion',amount:'1',unit:'medium'},{name:'Tomatoes',amount:'2',unit:'pcs'},{name:'Lettuce',amount:'100',unit:'g'},{name:'Cheddar cheese',amount:'100',unit:'g'},{name:'Sour cream',amount:'100',unit:'ml'},{name:'Cumin',amount:'1',unit:'tsp'},{name:'Chili powder',amount:'1',unit:'tsp'},{name:'Garlic powder',amount:'1',unit:'tsp'}],
      steps: ['Dice the onion and sauté in a pan until soft.','Add ground beef and cook until browned.','Add cumin, chili powder, garlic powder, salt, and pepper.','Simmer for 5 minutes.','Warm taco shells.','Prepare toppings: shred lettuce, dice tomatoes, grate cheese.','Fill each taco shell with meat and toppings.','Serve immediately with lime wedges.']
    }
  ];
  for (const recipe of recipes) { insertRecipe(recipe); }
  saveDatabase();
}

function seedPrivateRecipes(): void {
  // pascal (userId=1)
  const p1: SeedRecipe[] = [
    { categoryId:2, userId:1, isPublic:0, title:"Pascal's Cutlet", description:'Crispy Viennese cutlet following a family recipe.', servings:2, prepTime:30, imageUrl:'https://images.unsplash.com/photo-1599921841143-819065a55cc6?q=80&w=800',
      ingredients:[{name:'Veal cutlet',amount:'2',unit:'pcs'},{name:'Flour',amount:'100',unit:'g'},{name:'Eggs',amount:'2',unit:'pcs'},{name:'Breadcrumbs',amount:'150',unit:'g'},{name:'Clarified butter',amount:'100',unit:'g'},{name:'Lemon',amount:'1',unit:'pc'}],
      steps:['Pound cutlet flat, season with salt and pepper.','Coat in flour, egg, and breadcrumbs.','Fry in hot clarified butter until golden brown.','Serve with lemon.'] },
    { categoryId:2, userId:1, isPublic:1, title:'Potato Gratin', description:'Creamy potato gratin with melted cheese.', servings:4, prepTime:50, imageUrl:'https://plus.unsplash.com/premium_photo-1667233385688-fe3618a52ac5?q=80&w=800',
      ingredients:[{name:'Potatoes',amount:'1',unit:'kg'},{name:'Heavy cream',amount:'200',unit:'ml'},{name:'Gouda',amount:'200',unit:'g'},{name:'Garlic',amount:'2',unit:'cloves'},{name:'Nutmeg',amount:'1',unit:'pinch'},{name:'Butter',amount:'30',unit:'g'}],
      steps:['Peel and thinly slice potatoes.','Grease baking dish with butter.','Layer potatoes and pour cream over.','Distribute garlic and nutmeg.','Cover with cheese and bake at 180°C for 40 min.'] },
    { categoryId:3, userId:1, isPublic:0, title:'Quark Dessert', description:'Light quark dessert with fresh berries.', servings:2, prepTime:10, imageUrl:'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
      ingredients:[{name:'Low-fat quark',amount:'500',unit:'g'},{name:'Milk',amount:'100',unit:'ml'},{name:'Honey',amount:'2',unit:'tbsp'},{name:'Vanilla sugar',amount:'1',unit:'packet'},{name:'Mixed berries',amount:'200',unit:'g'}],
      steps:['Mix quark smooth with milk.','Stir in honey and vanilla sugar.','Wash berries and fold in.','Serve chilled.'] },
    { categoryId:6, userId:1, isPublic:0, title:"Pascal's Power Muesli", description:'Energy-rich breakfast muesli.', servings:1, prepTime:5, imageUrl:'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=800',
      ingredients:[{name:'Oats',amount:'80',unit:'g'},{name:'Yogurt',amount:'150',unit:'g'},{name:'Walnuts',amount:'30',unit:'g'},{name:'Raisins',amount:'20',unit:'g'},{name:'Honey',amount:'1',unit:'tbsp'},{name:'Banana',amount:'1',unit:'pc'}],
      steps:['Put oats in a bowl.','Add yogurt on top.','Top with nuts, raisins, and banana.','Drizzle with honey.'] },
    { categoryId:4, userId:1, isPublic:1, title:'Goulash Soup', description:'Hearty Hungarian goulash soup.', servings:6, prepTime:90, imageUrl:'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
      ingredients:[{name:'Beef',amount:'500',unit:'g'},{name:'Onions',amount:'3',unit:'pcs'},{name:'Sweet paprika',amount:'3',unit:'tbsp'},{name:'Potatoes',amount:'400',unit:'g'},{name:'Tomato paste',amount:'2',unit:'tbsp'},{name:'Beef broth',amount:'1',unit:'l'}],
      steps:['Dice beef and onions.','Sauté onions, stir in paprika.','Brown the meat.','Stir in tomato paste, deglaze with broth.','Simmer for 60 min, add potatoes.','Cook for another 20 min.'] }
  ];
  // Alex (userId=2)
  const p2: SeedRecipe[] = [
    { categoryId:2, userId:2, isPublic:0, title:"Alex's Pad Thai", description:'Authentic pad thai with shrimp.', servings:2, prepTime:25, imageUrl:'https://images.unsplash.com/photo-1655091273851-7bdc2e578a88?q=80&w=800',
      ingredients:[{name:'Rice noodles',amount:'200',unit:'g'},{name:'Shrimp',amount:'200',unit:'g'},{name:'Peanuts',amount:'50',unit:'g'},{name:'Lime',amount:'1',unit:'pc'},{name:'Fish sauce',amount:'3',unit:'tbsp'},{name:'Eggs',amount:'2',unit:'pcs'}],
      steps:['Soak rice noodles.','Sauté shrimp.','Scramble eggs.','Toss everything together.','Serve with peanuts and lime.'] },
    { categoryId:3, userId:2, isPublic:1, title:'Tiramisu Classico', description:'Classic Italian tiramisu with mascarpone.', servings:6, prepTime:30, imageUrl:'https://images.unsplash.com/photo-1712262582593-e13609aaf12b?q=80&w=800',
      ingredients:[{name:'Mascarpone',amount:'500',unit:'g'},{name:'Ladyfingers',amount:'200',unit:'g'},{name:'Espresso',amount:'300',unit:'ml'},{name:'Eggs',amount:'4',unit:'pcs'},{name:'Sugar',amount:'100',unit:'g'},{name:'Cocoa powder',amount:'2',unit:'tbsp'}],
      steps:['Whisk egg yolks with sugar until fluffy.','Fold in mascarpone.','Beat egg whites stiff and fold in.','Dip ladyfingers in espresso and layer.','Cover with cream, repeat.','Chill for 4 hours, dust with cocoa.'] },
    { categoryId:5, userId:2, isPublic:0, title:'Avocado Bowl', description:'Fresh Buddha bowl with avocado and quinoa.', servings:2, prepTime:20, imageUrl:'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      ingredients:[{name:'Quinoa',amount:'150',unit:'g'},{name:'Avocado',amount:'1',unit:'pc'},{name:'Edamame',amount:'100',unit:'g'},{name:'Carrots',amount:'2',unit:'pcs'},{name:'Sesame',amount:'1',unit:'tbsp'},{name:'Soy sauce',amount:'2',unit:'tbsp'}],
      steps:['Cook quinoa and let cool.','Slice avocado, grate carrots.','Cook edamame.','Arrange in a bowl.','Drizzle with soy sauce and sesame.'] },
    { categoryId:7, userId:2, isPublic:1, title:'Matcha Latte', description:'Creamy matcha latte.', servings:1, prepTime:5, imageUrl:'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=800',
      ingredients:[{name:'Matcha powder',amount:'2',unit:'g'},{name:'Hot water',amount:'80',unit:'ml'},{name:'Milk',amount:'200',unit:'ml'},{name:'Honey',amount:'1',unit:'tsp'}],
      steps:['Brew matcha with hot water.','Whisk until frothy.','Froth the milk.','Pour matcha in cup, add milk on top.'] },
    { categoryId:1, userId:2, isPublic:0, title:'Hummus Deluxe', description:'Homemade hummus with pine nuts.', servings:4, prepTime:15, imageUrl:'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800',
      ingredients:[{name:'Chickpeas',amount:'400',unit:'g'},{name:'Tahini',amount:'3',unit:'tbsp'},{name:'Lemon juice',amount:'2',unit:'tbsp'},{name:'Garlic',amount:'2',unit:'cloves'},{name:'Olive oil',amount:'3',unit:'tbsp'},{name:'Pine nuts',amount:'30',unit:'g'}],
      steps:['Blend chickpeas with tahini, lemon, and garlic.','Work in olive oil.','Toast pine nuts.','Top with pine nuts and oil.'] }
  ];
  // Twan (userId=3)
  const p3: SeedRecipe[] = [
    { categoryId:2, userId:3, isPublic:1, title:'Bami Goreng', description:'Indonesian fried noodle dish.', servings:4, prepTime:25, imageUrl:'https://plus.unsplash.com/premium_photo-1694707235544-c9f6884d77d8?q=80&w=800',
      ingredients:[{name:'Egg noodles',amount:'300',unit:'g'},{name:'Chicken breast',amount:'300',unit:'g'},{name:'Kecap Manis',amount:'4',unit:'tbsp'},{name:'Garlic',amount:'3',unit:'cloves'},{name:'Pointed cabbage',amount:'200',unit:'g'},{name:'Spring onions',amount:'3',unit:'pcs'}],
      steps:['Cook noodles.','Sauté chicken.','Add garlic and cabbage.','Add noodles and kecap manis.','Garnish with spring onions.'] },
    { categoryId:6, userId:3, isPublic:0, title:"Twan's Cheese Toast", description:'Cheesy melted toast.', servings:2, prepTime:10, imageUrl:'https://plus.unsplash.com/premium_photo-1739907121476-9dffe9e7578e?q=80&w=800',
      ingredients:[{name:'Toast bread',amount:'4',unit:'slices'},{name:'Gouda',amount:'100',unit:'g'},{name:'Tomatoes',amount:'2',unit:'pcs'},{name:'Oregano',amount:'1',unit:'tsp'},{name:'Butter',amount:'20',unit:'g'}],
      steps:['Spread butter on toast.','Place tomatoes on top.','Add cheese and oregano.','Bake at 200°C until melted.'] },
    { categoryId:3, userId:3, isPublic:1, title:'Panna Cotta', description:'Italian panna cotta with berry sauce.', servings:4, prepTime:20, imageUrl:'https://plus.unsplash.com/premium_photo-1713551474564-c3916a5eb3bf?q=80&w=800',
      ingredients:[{name:'Heavy cream',amount:'500',unit:'ml'},{name:'Sugar',amount:'80',unit:'g'},{name:'Gelatin',amount:'3',unit:'sheets'},{name:'Vanilla bean',amount:'1',unit:'pc'},{name:'Mixed berries',amount:'200',unit:'g'}],
      steps:['Soak gelatin.','Bring cream with sugar and vanilla to a boil.','Stir in gelatin.','Pour into molds, chill for 4 hours.','Blend berries into a sauce.'] },
    { categoryId:4, userId:3, isPublic:0, title:'Tom Kha Gai', description:'Thai coconut soup.', servings:4, prepTime:30, imageUrl:'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
      ingredients:[{name:'Coconut milk',amount:'400',unit:'ml'},{name:'Chicken breast',amount:'300',unit:'g'},{name:'Mushrooms',amount:'150',unit:'g'},{name:'Lime juice',amount:'3',unit:'tbsp'},{name:'Fish sauce',amount:'2',unit:'tbsp'},{name:'Chili',amount:'2',unit:'pcs'}],
      steps:['Heat coconut milk.','Add chicken in strips.','Quarter mushrooms and add.','Simmer for 15 min.','Season with fish sauce, lime, and chili.'] },
    { categoryId:2, userId:3, isPublic:0, title:'Nasi Goreng', description:'Indonesian fried rice.', servings:2, prepTime:20, imageUrl:'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800',
      ingredients:[{name:'Rice (day-old)',amount:'400',unit:'g'},{name:'Eggs',amount:'2',unit:'pcs'},{name:'Sambal Oelek',amount:'2',unit:'tsp'},{name:'Kecap Manis',amount:'3',unit:'tbsp'},{name:'Onion',amount:'1',unit:'pc'},{name:'Shrimp',amount:'100',unit:'g'}],
      steps:['Sauté onion.','Add shrimp.','Fry rice on high heat.','Stir in sambal and kecap manis.','Top with fried eggs.'] }
  ];
  // Sophia (userId=4)
  const p4: SeedRecipe[] = [
    { categoryId:3, userId:4, isPublic:1, title:"Sophia's Crème Brûlée", description:'Classic French crème brûlée.', servings:4, prepTime:45, imageUrl:'https://images.unsplash.com/photo-1676300184943-09b2a08319a3?q=80&w=800',
      ingredients:[{name:'Heavy cream',amount:'400',unit:'ml'},{name:'Egg yolks',amount:'5',unit:'pcs'},{name:'Sugar',amount:'100',unit:'g'},{name:'Vanilla bean',amount:'1',unit:'pc'},{name:'Cane sugar',amount:'4',unit:'tbsp'}],
      steps:['Bring cream with vanilla to a boil.','Whisk egg yolks with sugar until fluffy.','Slowly stir in cream.','Bake in a water bath at 160°C for 35 min.','Let cool, caramelize with cane sugar.'] },
    { categoryId:5, userId:4, isPublic:0, title:'Mediterranean Quinoa Salad', description:'Colorful Mediterranean quinoa salad.', servings:4, prepTime:25, imageUrl:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
      ingredients:[{name:'Quinoa',amount:'200',unit:'g'},{name:'Sun-dried tomatoes',amount:'80',unit:'g'},{name:'Olives',amount:'50',unit:'g'},{name:'Feta',amount:'100',unit:'g'},{name:'Arugula',amount:'50',unit:'g'},{name:'Balsamic vinegar',amount:'2',unit:'tbsp'}],
      steps:['Cook quinoa and let cool.','Chop tomatoes.','Mix everything together.','Crumble feta on top.','Dress with balsamic and olive oil.'] },
    { categoryId:7, userId:4, isPublic:1, title:'Golden Milk', description:'Warming golden milk with turmeric.', servings:1, prepTime:10, imageUrl:'https://plus.unsplash.com/premium_photo-1672076780992-7629039b1739?q=80&w=800',
      ingredients:[{name:'Oat milk',amount:'250',unit:'ml'},{name:'Turmeric',amount:'1',unit:'tsp'},{name:'Fresh ginger',amount:'1',unit:'cm'},{name:'Cinnamon',amount:'0.5',unit:'tsp'},{name:'Honey',amount:'1',unit:'tsp'},{name:'Black pepper',amount:'1',unit:'pinch'}],
      steps:['Grate ginger.','Warm oat milk.','Stir in spices.','Let simmer.','Sweeten with honey.'] },
    { categoryId:1, userId:4, isPublic:0, title:'Zucchini Fritters', description:'Crispy zucchini fritters.', servings:4, prepTime:20, imageUrl:'https://images.unsplash.com/photo-1692742246345-c6e7f28ae345?q=80&w=800',
      ingredients:[{name:'Zucchini',amount:'2',unit:'pcs'},{name:'Eggs',amount:'2',unit:'pcs'},{name:'Flour',amount:'80',unit:'g'},{name:'Parmesan',amount:'50',unit:'g'},{name:'Quark',amount:'200',unit:'g'},{name:'Fresh herbs',amount:'1',unit:'bunch'}],
      steps:['Grate zucchini and squeeze out moisture.','Mix with eggs, flour, and parmesan.','Fry fritters until golden brown.','Mix quark with herbs.','Serve together.'] },
    { categoryId:2, userId:4, isPublic:0, title:'Sweet Potato Curry', description:'Creamy vegan curry.', servings:4, prepTime:35, imageUrl:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
      ingredients:[{name:'Sweet potatoes',amount:'600',unit:'g'},{name:'Coconut milk',amount:'400',unit:'ml'},{name:'Curry paste',amount:'2',unit:'tbsp'},{name:'Spinach',amount:'200',unit:'g'},{name:'Chickpeas',amount:'1',unit:'can'},{name:'Basmati rice',amount:'300',unit:'g'}],
      steps:['Dice sweet potatoes.','Toast curry paste.','Deglaze with coconut milk.','Simmer for 20 min.','Fold in chickpeas and spinach.','Serve with rice.'] }
  ];
  for (const r of p1) insertRecipe(r);
  for (const r of p2) insertRecipe(r);
  for (const r of p3) insertRecipe(r);
  for (const r of p4) insertRecipe(r);
  saveDatabase();
}

export { db };

import { type Category } from '@/components/my-ingredients/CabinetRow';

/**
 * Maps ingredient names to appropriate categories for the cabinet
 */

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Spirits: [
    'vodka', 'gin', 'rum', 'tequila', 'whiskey', 'whisky', 'bourbon', 'scotch',
    'brandy', 'cognac', 'mezcal', 'cachaça', 'cachaca', 'pisco', 'sake',
    'soju', 'absinthe', 'aquavit', 'grappa', 'moonshine', 'everclear',
    'white rum', 'dark rum', 'gold rum', 'spiced rum', 'silver tequila',
    'reposado', 'añejo', 'anejo', 'blanco', 'rye whiskey', 'irish whiskey',
    'tennessee whiskey', 'canadian whisky', 'single malt', 'blended whisky',
  ],
  Liqueurs: [
    'liqueur', 'triple sec', 'cointreau', 'grand marnier', 'amaretto',
    'kahlua', 'kahlúa', 'baileys', "bailey's", 'irish cream', 'frangelico',
    'chambord', 'midori', 'blue curacao', 'curaçao', 'curacao', 'schnapps',
    'sambuca', 'drambuie', 'benedictine', 'chartreuse', 'galliano',
    'maraschino', 'luxardo', 'st. germain', 'st germain', 'elderflower liqueur',
    'campari', 'aperol', 'fernet', 'amaro', 'jagermeister', 'jägermeister',
    'limoncello', 'creme de', 'crème de', 'cream de', 'sloe gin',
    'southern comfort', 'pimm', 'disaronno', 'fireball', 'rumchata',
    'peach schnapps', 'butterscotch schnapps', 'coffee liqueur', 'orange liqueur',
    'cherry liqueur', 'raspberry liqueur', 'blackberry liqueur',
  ],
  Mixers: [
    'tonic', 'soda water', 'club soda', 'sparkling water', 'seltzer',
    'cola', 'coke', 'pepsi', 'ginger ale', 'ginger beer', 'lemon-lime soda',
    'sprite', '7-up', '7up', 'mountain dew', 'red bull', 'energy drink',
    'coconut water', 'coconut milk', 'coconut cream', 'cream of coconut',
    'tomato juice', 'clamato', 'orange juice', 'cranberry juice', 'pineapple juice',
    'grapefruit juice', 'apple juice', 'pomegranate juice', 'passion fruit juice',
    'lemon juice', 'lime juice', 'lemonade', 'sweet and sour', 'sour mix',
    'margarita mix', 'bloody mary mix', 'piña colada mix', 'daiquiri mix',
    'grenadine', 'rose water', 'orgeat', 'falernum',
  ],
  Bitters: [
    'bitters', 'angostura', 'orange bitters', 'peychaud', 'aromatic bitters',
    'chocolate bitters', 'celery bitters', 'lavender bitters', 'mole bitters',
    'grapefruit bitters', 'cherry bitters', 'fee brothers', 'regan\'s',
  ],
  Fruits: [
    'lime', 'lemon', 'orange', 'grapefruit', 'cherry', 'maraschino cherry',
    'olive', 'strawberry', 'raspberry', 'blackberry', 'blueberry', 'cranberry',
    'pineapple', 'mango', 'passion fruit', 'banana', 'apple', 'pear', 'peach',
    'apricot', 'watermelon', 'melon', 'kiwi', 'pomegranate', 'fig', 'grape',
    'coconut', 'papaya', 'guava', 'lychee', 'dragonfruit', 'citrus',
  ],
  Syrups: [
    'syrup', 'simple syrup', 'honey', 'agave', 'maple syrup', 'molasses',
    'demerara syrup', 'brown sugar syrup', 'cinnamon syrup', 'vanilla syrup',
    'lavender syrup', 'ginger syrup', 'mint syrup', 'raspberry syrup',
    'strawberry syrup', 'passion fruit syrup', 'orgeat syrup', 'grenadine syrup',
    'gomme syrup', 'rock candy syrup', 'caramel syrup', 'chocolate syrup',
    'hazelnut syrup', 'almond syrup', 'coconut syrup', 'elderflower syrup',
  ],
  Dairy: [
    'cream', 'heavy cream', 'whipping cream', 'half and half', 'half & half',
    'milk', 'whole milk', 'skim milk', 'almond milk', 'oat milk', 'soy milk',
    'egg', 'egg white', 'egg yolk', 'butter', 'yogurt', 'ice cream',
    'condensed milk', 'evaporated milk',
  ],
  Garnishes: [
    'mint', 'basil', 'rosemary', 'thyme', 'cilantro', 'sage', 'dill',
    'salt', 'sea salt', 'kosher salt', 'celery salt', 'tajin', 'li hing mui',
    'sugar', 'powdered sugar', 'brown sugar', 'demerara sugar', 'turbinado',
    'cinnamon', 'nutmeg', 'clove', 'allspice', 'star anise', 'cardamom',
    'ginger', 'fresh ginger', 'candied ginger', 'jalapeño', 'jalapeno',
    'pepper', 'black pepper', 'cayenne', 'hot sauce', 'tabasco',
    'worcestershire', 'horseradish', 'celery', 'cucumber', 'onion',
    'cocktail onion', 'pickled onion', 'bacon', 'whipped cream',
    'cocoa', 'cocoa powder', 'chocolate', 'coffee beans', 'espresso',
    'zest', 'peel', 'twist', 'wedge', 'wheel', 'sprig', 'leaves',
    'edible flowers', 'umbrella', 'cherry flag', 'cocktail pick',
  ],
  Wine: [
    'wine', 'red wine', 'white wine', 'rosé', 'rose wine', 'champagne',
    'prosecco', 'sparkling wine', 'cava', 'vermouth', 'dry vermouth',
    'sweet vermouth', 'blanc vermouth', 'sherry', 'port', 'madeira',
    'marsala', 'dubonnet', 'lillet', 'cocchi', 'punt e mes',
  ],
  Beer: [
    'beer', 'lager', 'ale', 'ipa', 'stout', 'porter', 'pilsner', 'wheat beer',
    'hefeweizen', 'witbier', 'saison', 'sour beer', 'gose', 'lambic',
    'hard cider', 'cider', 'hard seltzer', 'malt liquor', 'shandy', 'radler',
  ],
  Other: [], // Fallback category
};

// Exact match overrides for specific ingredients
const EXACT_MATCHES: Record<string, Category> = {
  'vodka': 'Spirits',
  'gin': 'Spirits',
  'rum': 'Spirits',
  'tequila': 'Spirits',
  'whiskey': 'Spirits',
  'bourbon': 'Spirits',
  'scotch': 'Spirits',
  'brandy': 'Spirits',
  'cognac': 'Spirits',
  'lime': 'Fruits',
  'lemon': 'Fruits',
  'orange': 'Fruits',
  'mint': 'Garnishes',
  'sugar': 'Garnishes',
  'salt': 'Garnishes',
  'ice': 'Other',
  'water': 'Mixers',
  'coffee': 'Mixers',
  'tea': 'Mixers',
  'espresso': 'Mixers',
};

/**
 * Determines the category for an ingredient based on its name
 */
export function categorizeIngredient(ingredientName: string): Category {
  const normalized = ingredientName.toLowerCase().trim();
  
  // Check exact matches first
  if (EXACT_MATCHES[normalized]) {
    return EXACT_MATCHES[normalized];
  }
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Other') continue; // Skip fallback category
    
    for (const keyword of keywords) {
      // Check if the ingredient name contains the keyword
      if (normalized.includes(keyword.toLowerCase())) {
        return category as Category;
      }
      // Also check if the keyword contains the ingredient name (for short names like "gin")
      if (keyword.toLowerCase().includes(normalized) && normalized.length >= 3) {
        return category as Category;
      }
    }
  }
  
  // Fallback to Other
  return 'Other';
}

export default categorizeIngredient;
export interface PersonalizedInstruction {
  id: string;
  title: string;
  detail: string;
}

export interface PersonalizedRecipeCard {
  id: string;
  title: string;
  mealType: string;
  cookTimeLabel: string;
  savedLabel: string;
  lastCookedLabel: string;
  personalizationSummary: string;
  heroNote: string;
  bestFor: string;
  tags: string[];
  notes: string[];
  adjustedInstructions: PersonalizedInstruction[];
}

export interface RecipeHistoryEntry {
  id: string;
  recipeId: PersonalizedRecipeCard['id'];
  title: string;
  cookedAtLabel: string;
  outcome: string;
  adjustment: string;
  note: string;
}

export const MOCK_SAVED_RECIPES: PersonalizedRecipeCard[] = [
  {
    id: 'weeknight-salmon-bowl',
    title: 'Weeknight Miso Salmon Bowl',
    mealType: 'Dinner',
    cookTimeLabel: '24 min',
    savedLabel: 'Saved after 3 cooks',
    lastCookedLabel: 'Tuesday',
    personalizationSummary:
      'A faster salmon bowl tuned for crisp edges, less sugar in the glaze, and a gentler broil finish.',
    heroNote:
      'This version keeps the salmon glossy without over-reducing the glaze, which was the main issue in your last two sessions.',
    bestFor:
      'Busy weeknights when you want a full dinner in one pan and enough rice left over for lunch.',
    tags: ['High protein', 'Broiler finish', '15-minute prep'],
    notes: [
      'Start the rice first so the salmon can rest while the bowl base finishes steaming.',
      'Use the second rack position on iOS-focused mock builds to keep the glaze from scorching.',
      'Add cucumbers at the end so the bowl stays cold-and-crisp against the warm salmon.',
    ],
    adjustedInstructions: [
      {
        id: 'salmon-1',
        title: 'Mix a lighter glaze',
        detail:
          'Whisk white miso, soy, rice vinegar, and only a teaspoon of honey so the surface caramelizes without turning bitter.',
      },
      {
        id: 'salmon-2',
        title: 'Broil in a short burst',
        detail:
          'Cook the salmon most of the way at 425°F, then broil for 60 to 90 seconds only after brushing on the final glaze.',
      },
      {
        id: 'salmon-3',
        title: 'Build the bowl with contrast',
        detail:
          'Spoon the salmon over rice with cucumbers, herbs, and a sharp squeeze of lime to balance the richer miso finish.',
      },
    ],
  },
  {
    id: 'silky-lemon-pasta',
    title: 'Silky Lemon Garlic Pasta',
    mealType: 'Dinner',
    cookTimeLabel: '18 min',
    savedLabel: 'Saved for date night',
    lastCookedLabel: 'Last weekend',
    personalizationSummary:
      'Your lighter pasta version adds more lemon lift and a tighter emulsion so the sauce stays glossy instead of heavy.',
    heroNote:
      'The pasta water ratio is dialed back here so the sauce coats the noodles cleanly and does not pool at the bottom of the bowl.',
    bestFor:
      'Fast stovetop dinners when you want something polished but still forgiving if the pasta sits for a minute.',
    tags: ['Pantry-friendly', 'Glossy sauce', 'Vegetarian'],
    notes: [
      'Finish with the heat off so the cheese melts into the sauce instead of clumping.',
      'Reserve more pasta water than you think you need; the final splash is what keeps leftovers silky.',
      'A pinch of chile flakes wakes up the lemon without changing the core profile.',
    ],
    adjustedInstructions: [
      {
        id: 'pasta-1',
        title: 'Toast the garlic gently',
        detail:
          'Warm the butter and olive oil first, then cook the garlic until fragrant and pale gold so the citrus stays bright.',
      },
      {
        id: 'pasta-2',
        title: 'Emulsify before adding cheese',
        detail:
          'Toss the pasta with lemon zest, juice, and a few tablespoons of pasta water until the pan looks glossy before adding parmesan.',
      },
      {
        id: 'pasta-3',
        title: 'Finish off heat',
        detail:
          'Take the pan off the burner, then stir in parmesan and black pepper so the sauce stays smooth and creamy.',
      },
    ],
  },
  {
    id: 'soft-chive-omelette',
    title: 'Soft Chive Omelette',
    mealType: 'Breakfast',
    cookTimeLabel: '9 min',
    savedLabel: 'Saved for Sunday mornings',
    lastCookedLabel: 'Yesterday',
    personalizationSummary:
      'A softer omelette flow with lower heat, shorter curd setting, and chives folded in at the finish for better color.',
    heroNote:
      'The lower-heat scramble phase gives you a more even interior, which matches the texture you called out after the last mock run.',
    bestFor:
      'Quick breakfasts when you want a French-style omelette feel without a stressful final roll.',
    tags: ['Breakfast', 'Low effort', 'Soft set'],
    notes: [
      'Pre-warm the plate so the omelette keeps its texture on the short walk from stove to table.',
      'Use a silicone spatula to keep the curds fine and the pan surface protected.',
      'Fold the chives in right before the final shape so they stay bright green.',
    ],
    adjustedInstructions: [
      {
        id: 'omelette-1',
        title: 'Beat until completely smooth',
        detail:
          'Whisk the eggs with salt and a teaspoon of water until no white streaks remain and the mixture looks lightly foamy.',
      },
      {
        id: 'omelette-2',
        title: 'Set tiny curds over medium-low heat',
        detail:
          'Pour the eggs into buttered pan and stir constantly with short circles so the curds stay fine and glossy.',
      },
      {
        id: 'omelette-3',
        title: 'Fold before it looks fully done',
        detail:
          'When the top is just barely wet, add chives, roll it closed, and let carryover heat finish the center.',
      },
    ],
  },
];

export const MOCK_RECIPE_HISTORY: RecipeHistoryEntry[] = [
  {
    id: 'history-1',
    recipeId: 'weeknight-salmon-bowl',
    title: 'Weeknight Miso Salmon Bowl',
    cookedAtLabel: 'Tue · 7:12 PM',
    outcome: 'Great texture',
    adjustment: 'Shortening the broil step kept the glaze glossy and the salmon medium in the center.',
    note: 'Next time: double the cucumber salad because it disappeared first.',
  },
  {
    id: 'history-2',
    recipeId: 'silky-lemon-pasta',
    title: 'Silky Lemon Garlic Pasta',
    cookedAtLabel: 'Sat · 8:03 PM',
    outcome: 'Saved',
    adjustment: 'Holding the parmesan until the heat was off fixed the grainy sauce from the previous run.',
    note: 'Would add shrimp or white beans if this becomes the standard dinner version.',
  },
  {
    id: 'history-3',
    recipeId: 'soft-chive-omelette',
    title: 'Soft Chive Omelette',
    cookedAtLabel: 'Sun · 9:01 AM',
    outcome: 'Best so far',
    adjustment: 'Lower heat produced a more even center and made the fold easier to control.',
    note: 'Still worth using a smaller pan if you want a tighter final shape.',
  },
];

export function findMockRecipeCard(recipeId?: string) {
  if (!recipeId) {
    return undefined;
  }

  return MOCK_SAVED_RECIPES.find((recipe) => recipe.id === recipeId);
}

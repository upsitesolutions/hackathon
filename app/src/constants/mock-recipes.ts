export interface RecipeStep {
  stepId: string;
  instruction: string;
  expectedVisualState: string;
  commonFailures: string[];
  checkpointMinutes: number;
}

export interface Recipe {
  id: string;
  title: string;
  steps: RecipeStep[];
}

export const MOCK_RECIPES: Recipe[] = [
  {
    id: 'sous-recipe-001',
    title: 'Classic French Omelette',
    steps: [
      {
        stepId: 'step-1',
        instruction:
          'Crack 3 eggs into a bowl, add a pinch of salt, and beat vigorously with a fork until fully combined and slightly frothy.',
        expectedVisualState:
          'Uniform pale-yellow mixture with no streaks of white. Small bubbles on the surface.',
        commonFailures: [
          'Under-beaten eggs leave white streaks',
          'Too much salt makes it rubbery',
        ],
        checkpointMinutes: 1,
      },
      {
        stepId: 'step-2',
        instruction:
          'Heat a 20 cm non-stick pan over medium-high heat. Add 1 tbsp of unsalted butter and swirl to coat evenly.',
        expectedVisualState:
          'Butter fully melted and foaming. No browning yet — the foam should just be starting to subside.',
        commonFailures: [
          'Brown butter means the pan is too hot',
          'Cold butter pools and the omelette sticks',
        ],
        checkpointMinutes: 1,
      },
      {
        stepId: 'step-3',
        instruction:
          'Pour in the eggs all at once. Immediately shake the pan while stirring with a spatula in small circles to create fine curds.',
        expectedVisualState:
          'Pale, creamy surface — just set at the edges with a slightly wet centre. No visible liquid egg.',
        commonFailures: ['Large curds mean overmixing', 'Brown spots mean the heat is too high'],
        checkpointMinutes: 2,
      },
      {
        stepId: 'step-4',
        instruction:
          'Remove from heat. Tilt the pan and roll the omelette onto a warm plate, folding it into a cylinder as it slides off.',
        expectedVisualState:
          'Smooth, pale-yellow log shape. No tears or brown patches on the outside.',
        commonFailures: [
          "Tearing means the omelette was overcooked",
          "Won't roll if left too long on heat",
        ],
        checkpointMinutes: 1,
      },
    ],
  },
  {
    id: 'sous-recipe-002',
    title: 'Garlic Butter Pasta',
    steps: [
      {
        stepId: 'step-1',
        instruction:
          'Bring a large pot of water to a rolling boil. Add 2 tsp of salt — it should taste like mild sea water. Cook 200 g of spaghetti according to package directions until al dente.',
        expectedVisualState:
          'Water at a full rolling boil before adding pasta. Pasta should be flexible but still have a faint white dot in the centre when bitten.',
        commonFailures: ['Unsalted water = bland pasta', 'Overcooked pasta goes limp and clumps'],
        checkpointMinutes: 10,
      },
      {
        stepId: 'step-2',
        instruction:
          'While pasta cooks, melt 60 g of butter in a wide pan over medium-low heat. Add 4 minced garlic cloves and cook for 2 minutes, stirring often.',
        expectedVisualState: 'Garlic is pale gold and fragrant. Butter is gently bubbling — not smoking.',
        commonFailures: [
          'Dark brown garlic is bitter and should be discarded',
          'Too low heat = no flavour development',
        ],
        checkpointMinutes: 2,
      },
      {
        stepId: 'step-3',
        instruction:
          'Reserve ½ cup of pasta water, then drain. Add pasta to the garlic butter. Toss vigorously, adding pasta water a splash at a time until a glossy sauce coats every strand.',
        expectedVisualState:
          'Each strand glistening and coated in a translucent sauce. Pan bottom should look nearly dry, not soupy.',
        commonFailures: ['Too much water makes it watery', 'Too little water and it clumps'],
        checkpointMinutes: 3,
      },
    ],
  },
  {
    id: 'sous-recipe-003',
    title: 'Pan-Seared Salmon',
    steps: [
      {
        stepId: 'step-1',
        instruction:
          'Pat two salmon fillets completely dry with paper towels. Season generously with salt and pepper on both sides. Let rest at room temperature for 10 minutes.',
        expectedVisualState:
          'Surface of fish looks matte and dry — no visible moisture. White salt crystals visible on flesh.',
        commonFailures: [
          'Wet fish steams instead of searing',
          'Seasoning too close to cooking time pulls more moisture out',
        ],
        checkpointMinutes: 10,
      },
      {
        stepId: 'step-2',
        instruction:
          'Heat a cast-iron or stainless pan over high heat for 2 minutes. Add 1 tbsp of neutral oil. Place salmon skin-side down. Press firmly for 10 seconds to prevent curling.',
        expectedVisualState:
          'Immediate loud sizzle on contact. Skin is in full contact with pan. White albumin creeping up sides of fillet — about one-third up.',
        commonFailures: [
          'No sizzle means the pan is not hot enough',
          'Curled fillet cooks unevenly',
        ],
        checkpointMinutes: 4,
      },
      {
        stepId: 'step-3',
        instruction:
          'Flip once. Cook flesh-side down for 1–2 minutes until the centre is just opaque when pressed gently. Add butter, thyme, and baste.',
        expectedVisualState:
          'Flesh colour has changed from deep orange-pink to a pale peachy-pink throughout. Fish flakes easily at the thickest point.',
        commonFailures: ['Translucent centre = undercooked', 'Dry, white throughout = overcooked'],
        checkpointMinutes: 2,
      },
    ],
  },
];

export function totalMinutes(steps: RecipeStep[]) {
  return steps.reduce((sum, step) => sum + step.checkpointMinutes, 0);
}

const recipeMatchers: Array<{ recipeId: Recipe['id']; keywords: string[] }> = [
  {
    recipeId: 'sous-recipe-001',
    keywords: ['omelette', 'omelet', 'eggs', 'egg'],
  },
  {
    recipeId: 'sous-recipe-002',
    keywords: ['pasta', 'spaghetti', 'noodles', 'garlic butter'],
  },
  {
    recipeId: 'sous-recipe-003',
    keywords: ['salmon', 'fish', 'seared salmon'],
  },
];

export function enrichMockRecipeFromInput(source: string) {
  const normalizedSource = source.trim().toLowerCase();
  const matchedRecipeId = recipeMatchers.find(({ keywords }) =>
    keywords.some((keyword) => normalizedSource.includes(keyword))
  )?.recipeId;

  if (matchedRecipeId) {
    return MOCK_RECIPES.find((recipe) => recipe.id === matchedRecipeId) ?? MOCK_RECIPES[0];
  }

  return MOCK_RECIPES[0];
}

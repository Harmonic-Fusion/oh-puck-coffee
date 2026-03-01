# Problem Statement

The `flavor-wheel.json` data only contains a simplified subset of flavors (5 main categories with ~80 leaf nodes). The Counter Culture Coffee Taster's Flavor Wheel has significantly more sub-categories and leaf flavors that are missing. The route is named `/flavor-selector` which is developer-facing jargon — it should be renamed to `/tasting` for users. There is no sidebar menu item for this page, making it undiscoverable.

# Scope

- **Keep the existing 5 top-level categories**: Fruity, Floral, Sweet, Spicy, Earthy
- **Update `src/data/flavor-wheel.json`** to add ALL missing sub-categories and leaf flavors from the Counter Culture Coffee Taster's Flavor Wheel image under those 5 top-level categories, preserving the existing `FlavorNode` type structure (`name`, `color`, `colorName`, `children`)
- **Extract colors from the wheel image** — each category, sub-category, and leaf flavor should have its `color` (RGBA) and `colorName` (descriptive name) extracted from the corresponding section of the Counter Culture wheel image
- **Refactor route** from `/flavor-selector` → `/tasting` (route definition, filesystem path, all references)
- **Add sidebar menu item** "Tasting Notes" pointing to `/tasting` in both desktop sidebar and mobile nav bar
- **No database changes** — this is purely front-end data and routing
- **No API changes** — the flavor wheel data is loaded from static JSON
- Body selector (`body-selector.json`) and adjectives/intensifiers (`adjectives-intensifiers.json`) already match the wheel and need no changes

# Solution

### 1. Comprehensive Flavor Wheel Data Update

Expand `flavor-wheel.json` by adding all missing sub-categories and leaf flavors from the Counter Culture Coffee Taster's Flavor Wheel. The existing 5 top-level categories are **preserved** — new entries from the wheel (Chocolate, Nut, Grain & Cereal, Roast, Savory, etc.) are folded under the matching top-level. The `FlavorNode` type structure is unchanged.

**Color extraction:** Extract the visual color from each category, sub-category, and leaf flavor section in the Counter Culture wheel image. Convert to RGBA format (e.g., `rgba(233, 30, 99, 0.25)`) for the `color` field and provide a descriptive `colorName` (e.g., "Muted Pink/Red"). Colors should match the visual appearance of each section in the wheel image to maintain visual consistency with the industry-standard reference.

**Mapping of Counter Culture wheel → existing 5 categories:**

#### Fruity (existing sub-categories: Berry, Citrus, Stone Fruit, Tropical, Dried Fruit)

**Add new sub-categories:**
- **Apple/Pear:** Green Apple, Red Apple
- **Melon:** Honeydew, Cantaloupe
- **Grape:** Wine, White Grape, Green Grape, Red Grape, Concord Grape

**Expand existing sub-categories with missing leaf flavors:**
- **Citrus** — add: Lemon & Lemonade, Clementine, Mandarine, Mandarin Orange, Blood Orange
- **Tropical** — add: Lychee, Star Fruit, Tamarind, Kiwi, Banana, Coconut
- **Stone Fruit** — add: Nectarine, Black Cherry
- **Berry** — add: Cranberry, Red Currant, Black Currant
- **Dried Fruit** — add: Golden Raisin, Dried Fig, Dried Dates

#### Floral (existing sub-categories: Flower, Tea-like, Herbal)

**Expand existing sub-categories with missing leaf flavors:**
- **Flower** — add: Rose Hips, Magnolia, Jasmine Honeysuckle, Orange Blossom
- **Tea-like** — add: Bergamot, Chamomile
- **Herbal** — add: (already has Lavender, Mint, Eucalyptus, Lemongrass — no additions needed)

#### Sweet (existing sub-categories: Chocolate, Caramel, Honey, Vanilla)

**Add new sub-categories:**
- **Sugary:** Marshmallow, Sugar Cane, Brown Sugar
- **Nut:** Cola, Peanut, Cashew, Pecan, Hazelnut, Almond, Walnut

**Expand existing sub-categories with missing leaf flavors:**
- **Chocolate** — add: Cacao Nibs, Baker's Chocolate, White Chocolate
- **Caramel** — already complete
- **Honey** — already has Maple Syrup, Molasses
- **Vanilla** — add: Marshmallow (or under Sugary)

#### Spicy (existing sub-categories: Warm Spice, Pungent, Nut, Roasted)

**Add new sub-categories:**
- **Savory:** Tomato, Sundried Tomato, Soy Sauce, Meat-like, Leathery
- **Grain & Cereal:** Graham, Bread Pastry, Cracker, Rye, Wheat, Fresh Bread, Barley

**Expand existing sub-categories with missing leaf flavors:**
- **Warm Spice** — add: Coriander, Curry, Licorice-Anise, White Pepper
- **Roasted** — add: Smokey, Carbon, Burnt Sugar

#### Earthy (existing sub-categories: Soil, Wood, Tobacco, Vegetal)

**Expand existing sub-categories with missing leaf flavors:**
- **Soil** — add: (already has Wet Soil, Mineral, Dusty — close enough)
- **Wood** — add: Fresh Wood
- **Tobacco** — add: (already has Leather, Smoky, Pipe Tobacco)
- **Vegetal** — add: Olive, Green Pepper, Mushroom, Squash, Sweet Pea, Snow Pea, Dill, Sage, Leafy Greens, Hay/Strawy

This approach was chosen to preserve the existing 5-category structure (already used by components and shared types) while incorporating the industry-standard Counter Culture flavor vocabulary. Folding sub-categories under the existing top-level keeps the UI consistent and avoids breaking changes.

### 2. Route Refactor

Rename `flavorSelector: "/flavor-selector"` → `tasting: "/tasting"` in `src/app/routes.ts` and move the page directory from `src/app/(app)/flavor-selector/` to `src/app/(app)/tasting/`. There's only 1 file referencing this route (`src/app/routes.ts`), so the blast radius is minimal.

### 3. Sidebar Menu Item

Add a "Tasting Notes" nav item to:
- `src/components/layout/Sidebar.tsx` — the `navItems` array (desktop sidebar)
- `src/components/layout/NavBar.tsx` — the `mobileNavItems` array (mobile bottom bar)

Use an appropriate Heroicon (e.g., `SparklesIcon` or `SwatchIcon` from `@heroicons/react/24/outline`).

# Tasks

## Phase 1: Update Flavor Wheel Data

- [x] Extract all flavor names and colors from the Counter Culture Coffee Taster's Flavor Wheel image (`assets/coffee_flavor_wheel.jpg`) — identify each category, sub-category, and leaf flavor along with its visual color
- [x] Expand `src/data/flavor-wheel.json` — keep the 5 top-level categories (Fruity, Floral, Sweet, Spicy, Earthy), add all missing sub-categories and leaf flavors from the Counter Culture wheel as described in the Solution section
- [x] Apply extracted colors to each node — convert wheel colors to RGBA format and assign to `color` and `colorName` fields for all categories, sub-categories, and leaf flavors
- [x] Verify the updated JSON is valid and conforms to `FlavorWheelData` type in `src/shared/flavor-wheel/types.ts`

## Phase 2: Route Refactor (`/flavor-selector` → `/tasting`)

- [x] Rename `flavorSelector: "/flavor-selector"` → `tasting: "/tasting"` in `src/app/routes.ts`
- [x] Move `src/app/(app)/flavor-selector/` directory to `src/app/(app)/tasting/`
- [x] Update page title/heading in the page component from "Flavor Selector Demo" to "Tasting Notes"

## Phase 3: Navigation Menu Item

- [x] Add "Tasting Notes" to `navItems` array in `src/components/layout/Sidebar.tsx` with an appropriate Heroicon
- [x] Add "Tasting" to `mobileNavItems` array in `src/components/layout/NavBar.tsx` with the same icon



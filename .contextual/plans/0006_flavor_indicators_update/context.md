# Problem Statement

The current flavor indicators UI uses a flat structure that doesn't match the revised flavor wheel hierarchy. Users need a more intuitive nested interface for selecting flavors, body characteristics, and adjectives/intensifiers that supports mobile interaction and visual hierarchy with colors.

# Scope

## Requirements

1. **Flavors Component**
   - Replace current flat flavor wheel with nested structure from `assets/untracked_wheel_revised.json`
   - Support clicking at any level (category → subcategory → specific flavor)
   - Display nested view with progressive indentation
   - Include color coding for visual distinction
   - Allow multiple selections across different levels
   - **Data Storage**: Store full paths and all intermediate values
     - Example: If user selects "Dark Chocolate" under "Sweet:Chocolate", store: `["Sweet", "Sweet:Chocolate", "Sweet:Chocolate:Dark Chocolate"]`
     - This preserves the full hierarchy context for each selection
   - Maintain existing data structure compatibility (`flavorWheelCategories: Record<string, string[]>`)

2. **Body Selector Component**
   - Replace current flat radio group with nested structure from `assets/untracked_coffee_flavor_wheel.json` (lines 253-276)
   - Top level: Light, Medium, Heavy
   - Second level: Specific body descriptors (e.g., "WATERY", "SILKY" for light; "SMOOTH", "CREAMY" for medium; "FULL", "VELVETY" for heavy)
   - Single selection only (radio behavior)
   - Include color coding
   - **Data Storage**: Store full paths and all intermediate values
     - Example: If user selects "Watery" under "Light", store: `["Light", "Light:Watery"]`
     - This preserves both the category and specific descriptor
   - Update schema to store selected value (currently `flavorWheelBody: string` or array of strings)

3. **Adjectives and Intensifiers Component**
   - Create new UI component for adjectives and intensifiers from `assets/untracked_coffee_flavor_wheel.json` (lines 276-299)
   - Display as rows with left/right pairs (e.g., "CRISP" vs "MUTED", "BRIGHT" vs "DULL")
   - Mobile-friendly interaction
   - Allow multiple selections
   - Include color coding
   - Store in existing `flavorWheelAdjectives: string[]` field

## Boundaries

- No database schema changes required (existing JSONB fields support the data)
- Maintain backward compatibility with existing shot data
- Update only the UI components, not API routes
- Colors should match the Counter Culture Coffee Taster's Flavor Wheel palette (reference: `coffee_flavor_wheel.jpg`)
- Map color palette to Tailwind CSS classes or CSS custom properties for consistency

## Dependencies

- `assets/untracked_wheel_revised.json` - New flavor hierarchy structure
- `assets/untracked_coffee_flavor_wheel.json` - Body and adjectives/intensifiers data
- `assets/coffee_flavor_wheel.jpg` - Source reference for color palette
- Existing `SectionFlavorWheel` component structure
- React Hook Form integration for form state management

## Data Storage Format

**Critical Requirement**: When storing selections, store only the explicitly selected paths. Do not automatically include parent categories or subcategories unless explicitly selected.

### Flavors Storage Examples

When a user selects an item at any level, store only the explicitly selected path (not all ancestors):

- User selects "Sweet" (top level):
  - Store: `["Sweet"]` (only "Sweet", no subcategories)

- User selects "Chocolate" under "Sweet":
  - Store: `["Sweet:Chocolate"]` (only the path to "Chocolate", not "Sweet" separately)

- User selects "Dark Chocolate" under "Sweet:Chocolate":
  - Store: `["Sweet:Chocolate:Dark Chocolate"]` (only the full path to "Dark Chocolate")

- User selects multiple items:
  - If user selects both "Sweet" and "Sweet:Chocolate:Dark Chocolate":
  - Store: `["Sweet", "Sweet:Chocolate:Dark Chocolate"]` (only explicitly selected items)

### Body Storage Examples

When a user selects a body descriptor, store both the category and full path:

- User selects "Light" (top level only):
  - Store: `["Light"]`

- User selects "Watery" under "Light":
  - Store: `["Light", "Light:Watery"]`

- User selects "Creamy" under "Medium":
  - Store: `["Medium", "Medium:Creamy"]`

### Storage Structure

- **Flavors**: Store in `flavorWheelCategories: Record<string, string[]>` where:
  - Keys are category paths (e.g., "Sweet", "Sweet:Chocolate")
  - Values are arrays of all selected paths within that category hierarchy
  
- **Body**: Store in `flavorWheelBody: string[]` (array of strings) containing:
  - Category name (e.g., "Light")
  - Full path if descriptor selected (e.g., "Light:Watery")
  
- **Adjectives**: Store in `flavorWheelAdjectives: string[]` (unchanged, no hierarchy)

## Color Specifications (from Counter Culture Coffee Taster's Flavor Wheel)

**Note:** Exact HEX values should be extracted from `assets/coffee_flavor_wheel.jpg` using a color picker tool. The values below are approximations based on color descriptions. Use `scripts/extract_colors_advanced.py` or manual color picking for accurate values.

### Color Extraction Methodology

1. **Automated Extraction (Recommended for initial pass):**
   - Install dependencies: `pip install pillow numpy scikit-learn`
   - Run: `python3 scripts/extract_colors_advanced.py`
   - This extracts dominant colors from the entire image
   - Manual refinement needed for category-specific colors

2. **Manual Color Picking (Recommended for accuracy):**
   - Open `assets/coffee_flavor_wheel.jpg` in an image editor (GIMP, Photoshop, Preview)
   - Use color picker tool to sample from each category region
   - Record HEX values for:
     - Each primary category (Fruity, Floral, Sweet, Spicy, Earthy)
     - Each subcategory (Berry, Citrus, Stone Fruit, etc.)
     - Body selector backgrounds (Light, Medium, Heavy)
     - Adjectives & Intensifiers rows (left and right sides)

3. **Online Tools:**
   - https://imagecolorpicker.com/ - Upload image and click to get HEX
   - https://html-color-codes.info/colors-from-image/ - Extract palette from image
   - Browser DevTools - Use color picker in browser when viewing image

4. **Reference Implementations:**
   - https://www.jasondavies.com/coffee-wheel/ - Interactive implementation (may have colors in source)
   - Check browser DevTools Network tab for CSS/JS files with color definitions

### Flavor Wheel Colors

**Primary Categories:**
- **Fruity**: Red/Pink/Orange/Yellow/Purple spectrum
  - Berry: Pink/Red/Purple
    - Approximate: `#E91E63` (Pink), `#C2185B` (Deep Pink), `#9C27B0` (Purple)
  - Citrus: Yellow/Orange
    - Approximate: `#FFC107` (Amber), `#FF9800` (Orange), `#FF5722` (Deep Orange)
  - Stone Fruit: Orange/Red
    - Approximate: `#FF6F00` (Orange), `#E64A19` (Deep Orange), `#D32F2F` (Red)
  - Tropical Fruit: Orange/Yellow
    - Approximate: `#FFB300` (Amber), `#FFA000` (Orange), `#FF8F00` (Amber)
  - Dried Fruit: Dark Purple/Brown
    - Approximate: `#6A1B9A` (Purple), `#5D4037` (Brown), `#4E342E` (Dark Brown)
- **Floral**: Light Pink/Purple
  - Approximate: `#F8BBD0` (Light Pink), `#E1BEE7` (Light Purple), `#CE93D8` (Purple)
- **Sweet**: Yellow/Orange
  - Chocolate: Dark Brown
    - Approximate: `#5D4037` (Brown), `#4E342E` (Dark Brown), `#3E2723` (Very Dark Brown)
  - Caramel: Yellow/Orange tones
    - Approximate: `#FFB74D` (Light Orange), `#FFA726` (Orange), `#FF9800` (Orange)
  - Honey: Yellow/Orange tones
    - Approximate: `#FFC107` (Amber), `#FFB300` (Amber), `#FFA000` (Orange)
  - Vanilla: Yellow/Orange tones
    - Approximate: `#FFF9C4` (Light Yellow), `#FFF59D` (Yellow), `#FFEB3B` (Yellow)
- **Spicy**: Orange/Brown
  - Warm Spice: Orange/Brown
    - Approximate: `#FF9800` (Orange), `#F57C00` (Deep Orange), `#E65100` (Orange)
  - Pungent: Orange/Brown
    - Approximate: `#FF6F00` (Orange), `#E65100` (Orange), `#BF360C` (Deep Orange)
  - Nut: Tan
    - Approximate: `#D7CCC8` (Light Brown), `#BCAAA4` (Brown), `#A1887F` (Brown)
  - Roasted: Dark Brown
    - Approximate: `#5D4037` (Brown), `#4E342E` (Dark Brown), `#3E2723` (Very Dark Brown)
- **Earthy**: Darker Green
  - Soil: Darker Green
    - Approximate: `#558B2F` (Green), `#33691E` (Dark Green), `#1B5E20` (Very Dark Green)
  - Wood: Darker Green
    - Approximate: `#689F38` (Green), `#558B2F` (Green), `#33691E` (Dark Green)
  - Tobacco: Darker Green
    - Approximate: `#5D4037` (Brown), `#4E342E` (Dark Brown), `#3E2723` (Very Dark Brown)
  - Vegetal: Light Green
    - Approximate: `#8BC34A` (Light Green), `#7CB342` (Green), `#689F38` (Green)

### Body Selector Colors

- **Light**: Light Gray background
  - Approximate: `#E0E0E0` (Light Gray), `#F5F5F5` (Very Light Gray), `#EEEEEE` (Light Gray)
- **Medium**: Medium Gray background
  - Approximate: `#9E9E9E` (Gray), `#757575` (Medium Gray), `#616161` (Gray)
- **Heavy**: Dark Gray background
  - Approximate: `#424242` (Dark Gray), `#212121` (Very Dark Gray), `#303030` (Dark Gray)

### Adjectives & Intensifiers Colors

**Row 1 (Crisp/Bright/Vibrant/Tart vs Muted/Dull/Mild):**
- Left side: Light Blue
  - Approximate: `#81D4FA` (Light Blue), `#4FC3F7` (Blue), `#29B6F6` (Blue)
- Right side: Light Gray
  - Approximate: `#E0E0E0` (Light Gray), `#BDBDBD` (Gray), `#9E9E9E` (Gray)

**Row 2 (Wild/Unbalanced/Sharp/Pointed vs Structured/Balanced/Rounded):**
- Left side: Light Purple
  - Approximate: `#CE93D8` (Purple), `#BA68C8` (Purple), `#AB47BC` (Purple)
- Right side: Light Green
  - Approximate: `#A5D6A7` (Light Green), `#81C784` (Green), `#66BB6A` (Green)

**Row 3 (Dense/Deep/Complex vs Soft/Faint/Delicate):**
- Left side: Dark Purple
  - Approximate: `#7B1FA2` (Purple), `#6A1B9A` (Purple), `#4A148C` (Dark Purple)
- Right side: Light Pink
  - Approximate: `#F8BBD0` (Light Pink), `#F48FB1` (Pink), `#F06292` (Pink)

**Row 4 (Juicy vs Dry/Astringent):**
- Left side: Light Orange
  - Approximate: `#FFB74D` (Light Orange), `#FFA726` (Orange), `#FF9800` (Orange)
- Right side: Light Brown
  - Approximate: `#D7CCC8` (Light Brown), `#BCAAA4` (Brown), `#A1887F` (Brown)

**Row 5 (Lingering/Dirty vs Quick/Clean):**
- Left side: Dark Gray
  - Approximate: `#424242` (Dark Gray), `#212121` (Very Dark Gray), `#303030` (Dark Gray)
- Right side: Light Blue
  - Approximate: `#81D4FA` (Light Blue), `#4FC3F7` (Blue), `#29B6F6` (Blue)

# Solution

## Approach

1. **Flavors**: Create a recursive nested component that renders the tree structure from the JSON. Each level is clickable to expand/collapse, with visual indentation. Selected items are highlighted with colors. When a user selects an item at any level, store the full path from root to that item, including all intermediate levels. For example, selecting "Dark Chocolate" under "Sweet:Chocolate" stores `["Sweet", "Sweet:Chocolate", "Sweet:Chocolate:Dark Chocolate"]`. The component transforms the nested selection into the existing `Record<string, string[]>` format for storage, where each key represents a category path and the array contains all selected paths within that category.

2. **Body**: Create a two-level selector where users first choose Light/Medium/Heavy, then select a specific descriptor. Use radio button behavior (single selection) with visual grouping and colors. Store both the category and full path. For example, if user selects "Watery" under "Light", store `["Light", "Light:Watery"]` to preserve both the category context and the specific selection.

3. **Adjectives/Intensifiers**: Create a mobile-friendly grid/list component that displays adjective pairs. Users can select multiple adjectives. Use toggle buttons with color coding to indicate selection state.

## Reasoning

- Nested structure matches the revised flavor wheel taxonomy more accurately
- Progressive disclosure (expand on click) reduces visual clutter
- Indentation provides clear visual hierarchy
- Color coding improves scannability and selection feedback
- Mobile-first design ensures usability on all devices
- Maintaining existing data structure avoids migration complexity
- Storing full paths preserves hierarchy context, enabling better analytics and display of selections

# Tasks

## Phase 1: Update Flavor Constants and Types

- [x] Create constants files: flavor wheel (`untracked_wheel_revised.json`), body (`untracked_coffee_flavor_wheel.json` lines 253-276), adjectives (`untracked_coffee_flavor_wheel.json` lines 276-299)
- [x] Define TypeScript types for nested flavor structure (tree with name/children)
- [x] Extract HEX colors from `coffee_flavor_wheel.jpg` (use `scripts/extract_colors_advanced.py` or manual color picker)
- [x] Create color palette constants with HEX values mapped to categories/subcategories
- [x] Create Tailwind CSS custom colors or CSS custom properties for the palette
- [x] Update `src/shared/flavor-wheel/constants.ts` with new structure

## Phase 2: Build Nested Flavor Component

- [x] Create `NestedFlavorWheel` component with recursive tree rendering
- [x] Implement click-to-expand/collapse at any level with progressive indentation
- [x] Apply color coding from palette to categories/subcategories/flavors
- [x] Implement selection state: store full path hierarchy (e.g., "Dark Chocolate" → `["Sweet", "Sweet:Chocolate", "Sweet:Chocolate:Dark Chocolate"]`)
- [x] Transform selections to `Record<string, string[]>` format (keys: category paths, values: all selected paths including intermediates)
- [x] Ensure mobile-responsive layout

## Phase 3: Build Nested Body Selector

- [x] Create `NestedBodySelector` component: two-level (Light/Medium/Heavy → descriptors)
- [x] Implement radio selection with color-coded backgrounds (light/medium/dark gray)
- [x] Store full path: descriptor selection stores `["Light", "Light:Watery"]` (category + full path)
- [x] Update form schema: change `flavorWheelBody` from `string` to `string[]`
- [x] Ensure mobile-responsive layout

## Phase 4: Build Adjectives/Intensifiers Component

- [x] Create `AdjectivesIntensifiersSelector` component with row-based left/right pairs
- [x] Apply color coding per row (Light Blue/Gray, Light Purple/Green, Dark Purple/Pink, Light Orange/Brown, Dark Gray/Light Blue)
- [x] Implement toggle selection (multiple allowed) integrated with `flavorWheelAdjectives` field
- [x] Ensure mobile-friendly responsive layout

## Phase 5: Integration and Testing

- [x] Update `SectionFlavorWheel` to integrate all three new components
- [x] Test form submission: verify full path storage includes all intermediate values
- [x] Verify backward compatibility: handle both old `flavorWheelBody: string` and new `string[]` formats
- [x] Update shot display components to render new nested format
- [x] Update export/share functionality to handle new data structure
- [x] Test mobile responsiveness across all components

# Plan Summary

This plan implements a nested flavor indicator system with three main components:

1. **Nested Flavor Wheel**: Recursive tree structure with click-to-expand, color coding, and full path storage
2. **Nested Body Selector**: Two-level selector (Light/Medium/Heavy → descriptors) with color-coded backgrounds
3. **Adjectives/Intensifiers Selector**: Row-based component with left/right pairs and color coding

**Key Implementation Details:**
- All selections store full path hierarchies (e.g., `["Sweet", "Sweet:Chocolate", "Sweet:Chocolate:Dark Chocolate"]`)
- Colors extracted from Counter Culture Coffee Taster's Flavor Wheel image
- Backward compatible with existing shot data
- Mobile-first responsive design
- No database schema changes required (uses existing JSONB fields)

**Phases:**
- Phase 1: Constants, types, and color palette (6 tasks)
- Phase 2: Nested flavor component (6 tasks)
- Phase 3: Body selector (5 tasks)
- Phase 4: Adjectives/intensifiers (4 tasks)
- Phase 5: Integration and testing (6 tasks)
- Phase 6: Add info icons and help text (8 tasks)

**Total: 35 tasks across 6 phases**

# Additional Tasks

- [x] Update body/texture selector to stack descriptors vertically instead of horizontally, preserving order from JSON data
- [x] In the Selected Flavors footer, show only the flavor word (e.g., "Earl Grey") instead of the full path (e.g., "Floral:Floral:Tea-like:Earl Grey")
- [x] Add number badge next to each node showing count of selected descendants (including self)
- [x] Update "Flavor Wheel" to just be "Flavors"
- [x] Remove children where the child equals the parent. Example Honey with Honey child. Vanilla, Tobacco

## Phase 6: Add Info Icons and Help Text

- [x] Create reusable `InfoTooltip` or `HelpText` component with info icon and clickable text that displays help content
- [x] Add info icon and clickable help text to Flavor Wheel section title with text: "Selecting all the flavors of your coffee. This helps calibrate your palate. The flavors are nested going from overall categories to the specific flavors. If it's overwhelming at first, stay to the higher levels."
- [x] Add info icon and clickable help text to Body/Texture section title with text: "Select one level for your coffee, closest to how it feels in your mouth"
- [x] Add info icon and clickable help text to Adjectives & Intensifiers section title with text: "Select multiple adjectives that describe your coffee. Each row shows opposite characteristics—choose what best matches your experience."
- [x] Implement tooltip or modal display for help text (tooltip preferred for inline help, modal for longer content)
- [x] Ensure info icons are accessible (keyboard navigable, screen reader friendly with aria-labels)
- [x] Style info icons consistently across all three sections (size, color, spacing)
- [x] Test mobile responsiveness of info icons and help text display
# Output / Resolution

## Flavor Wheel Display

### Inline Badge Count
- Each node in the hierarchy displays a number badge next to its name
- The badge shows the count of selected descendants (including the node itself) at that level
- Count is calculated recursively through the tree structure
- Badge only appears when count > 0
- Styled to match the selection state (white text on colored background when selected, dark text on light background when not selected)

### Selected Flavors Footer
- Footer appears at the bottom of the flavor wheel card when flavors are selected
- Displays only the flavor word (e.g., "Earl Grey") without the full path hierarchy
- Each flavor badge uses its appropriate color from the flavor wheel
- Simple, scannable list format with flex-wrap layout
- Example: Shows "Earl Grey" instead of "Floral:Floral:Tea-like:Earl Grey"

## Benefits of Simplified Output

1. **Cleaner UI**: Badge count provides quick visual feedback without cluttering the interface
2. **Easier Scanning**: Footer with just flavor words is faster to read and understand
3. **Visual Hierarchy**: Color-coded badges maintain category context without showing verbose paths
4. **Mobile Friendly**: Simplified display works better on smaller screens

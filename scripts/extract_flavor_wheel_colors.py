#!/usr/bin/env python3
"""
Extract color palette from Counter Culture Coffee Taster's Flavor Wheel image.
This script samples colors from the image to help identify the HEX values.
"""

from PIL import Image
import json
from pathlib import Path

def extract_colors_from_image(image_path: str) -> dict:
    """Extract dominant colors from the flavor wheel image."""
    img = Image.open(image_path)
    
    # Convert to RGB if needed
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Get image dimensions
    width, height = img.size
    
    # Sample colors from different regions
    # Note: This is a basic approach - for accurate extraction, 
    # you'd need to manually identify regions or use more sophisticated color extraction
    
    colors = {}
    
    # Sample from center regions (this is approximate)
    # In a real implementation, you'd want to manually identify regions
    # or use a color picker tool on the actual image
    
    print(f"Image size: {width}x{height}")
    print("\nTo extract accurate colors:")
    print("1. Open the image in an image editor (GIMP, Photoshop, etc.)")
    print("2. Use the color picker tool on each category")
    print("3. Record the HEX values")
    print("\nAlternatively, use an online tool like:")
    print("- https://imagecolorpicker.com/")
    print("- https://html-color-codes.info/colors-from-image/")
    
    return colors

if __name__ == "__main__":
    image_path = Path(__file__).parent.parent / "assets" / "coffee_flavor_wheel.jpg"
    
    if not image_path.exists():
        print(f"Error: Image not found at {image_path}")
        exit(1)
    
    colors = extract_colors_from_image(str(image_path))
    
    # Output structure for color mapping
    color_structure = {
        "flavor_wheel": {
            "fruity": {
                "berry": "#HEX_VALUE",
                "citrus": "#HEX_VALUE",
                "stone_fruit": "#HEX_VALUE",
                "tropical": "#HEX_VALUE",
                "dried_fruit": "#HEX_VALUE"
            },
            "floral": "#HEX_VALUE",
            "sweet": {
                "chocolate": "#HEX_VALUE",
                "caramel": "#HEX_VALUE",
                "honey": "#HEX_VALUE",
                "vanilla": "#HEX_VALUE"
            },
            "spicy": {
                "warm_spice": "#HEX_VALUE",
                "pungent": "#HEX_VALUE",
                "nut": "#HEX_VALUE",
                "roasted": "#HEX_VALUE"
            },
            "earthy": {
                "soil": "#HEX_VALUE",
                "wood": "#HEX_VALUE",
                "tobacco": "#HEX_VALUE",
                "vegetal": "#HEX_VALUE"
            }
        },
        "body": {
            "light": "#HEX_VALUE",
            "medium": "#HEX_VALUE",
            "heavy": "#HEX_VALUE"
        },
        "adjectives": {
            "row1_left": "#HEX_VALUE",  # Light Blue
            "row1_right": "#HEX_VALUE",  # Light Gray
            "row2_left": "#HEX_VALUE",  # Light Purple
            "row2_right": "#HEX_VALUE",  # Light Green
            "row3_left": "#HEX_VALUE",  # Dark Purple
            "row3_right": "#HEX_VALUE",  # Light Pink
            "row4_left": "#HEX_VALUE",  # Light Orange
            "row4_right": "#HEX_VALUE",  # Light Brown
            "row5_left": "#HEX_VALUE",  # Dark Gray
            "row5_right": "#HEX_VALUE"   # Light Blue
        }
    }
    
    output_path = Path(__file__).parent.parent / "assets" / "flavor_wheel_colors_template.json"
    with open(output_path, 'w') as f:
        json.dump(color_structure, f, indent=2)
    
    print(f"\nColor template structure saved to: {output_path}")
    print("Please fill in the HEX values using a color picker tool.")

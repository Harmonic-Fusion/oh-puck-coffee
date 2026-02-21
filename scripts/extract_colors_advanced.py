#!/usr/bin/env python3
"""
Advanced color extraction from Counter Culture Coffee Taster's Flavor Wheel.
Uses k-means clustering to find dominant colors in the image.
"""

try:
    from PIL import Image
    import numpy as np
    from sklearn.cluster import KMeans
    import json
    from pathlib import Path
    
    def rgb_to_hex(rgb):
        """Convert RGB tuple to HEX string."""
        return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}".upper()
    
    def extract_dominant_colors(image_path: str, n_colors: int = 20) -> list:
        """Extract dominant colors using k-means clustering."""
        img = Image.open(image_path)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize for faster processing (maintain aspect ratio)
        img.thumbnail((500, 500))
        
        # Convert to numpy array
        img_array = np.array(img)
        pixels = img_array.reshape(-1, 3)
        
        # Use k-means to find dominant colors
        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
        kmeans.fit(pixels)
        
        # Get cluster centers (dominant colors)
        colors = kmeans.cluster_centers_.astype(int)
        
        # Convert to HEX
        hex_colors = [rgb_to_hex(tuple(color)) for color in colors]
        
        return hex_colors
    
    if __name__ == "__main__":
        image_path = Path(__file__).parent.parent / "assets" / "coffee_flavor_wheel.jpg"
        
        if not image_path.exists():
            print(f"Error: Image not found at {image_path}")
            exit(1)
        
        print("Extracting dominant colors from flavor wheel image...")
        colors = extract_dominant_colors(str(image_path), n_colors=30)
        
        print(f"\nFound {len(colors)} dominant colors:")
        for i, color in enumerate(colors, 1):
            print(f"{i:2d}. {color}")
        
        # Save to JSON
        output_path = Path(__file__).parent.parent / "assets" / "extracted_colors.json"
        with open(output_path, 'w') as f:
            json.dump({"dominant_colors": colors}, f, indent=2)
        
        print(f"\nColors saved to: {output_path}")
        print("\nNote: These are dominant colors from the entire image.")
        print("For accurate category-specific colors, use a color picker tool")
        print("on the actual image to sample from each specific region.")
        
except ImportError as e:
    print(f"Error: Missing required library. Install with: pip install pillow numpy scikit-learn")
    print(f"Import error: {e}")
    exit(1)

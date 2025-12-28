// Renaissance-style base images organized by category
// Replace placeholder URLs with actual image paths or URLs

export const RENAISSANCE_CATEGORIES = [
  {
    id: 'men-outfits',
    name: 'Men Outfits',
    description: 'Renaissance style men\'s clothing and portraits',
    icon: '👔'
  },
  {
    id: 'women-outfits',
    name: 'Women Outfits',
    description: 'Renaissance style women\'s clothing and portraits',
    icon: '👗'
  },
  {
    id: 'two-people',
    name: 'Two People',
    description: 'Renaissance style portraits with two subjects',
    icon: '👫'
  },
  {
    id: 'three-people',
    name: 'Three People',
    description: 'Renaissance style portraits with three subjects',
    icon: '👨‍👩‍👧'
  }
];

// Base path for images - update this to match your image hosting
const BASE_PATH = '/images/renaissance';

// Generate image entries for each category
const generateImages = (category, count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${category}-${i + 1}`,
    category,
    name: `${category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${i + 1}`,
    // Update these URLs to point to your actual images
    url: `${BASE_PATH}/${category}/${i + 1}.jpg`,
    thumbnail: `${BASE_PATH}/${category}/thumbnails/${i + 1}.jpg`
  }));
};

export const RENAISSANCE_IMAGES = {
  'men-outfits': generateImages('men-outfits', 20),
  'women-outfits': generateImages('women-outfits', 20),
  'two-people': generateImages('two-people', 20),
  'three-people': generateImages('three-people', 20)
};

// Helper to get all images as flat array
export const getAllImages = () => {
  return Object.values(RENAISSANCE_IMAGES).flat();
};

// Helper to get images by category
export const getImagesByCategory = (categoryId) => {
  return RENAISSANCE_IMAGES[categoryId] || [];
};

// Helper to find image by ID
export const getImageById = (imageId) => {
  return getAllImages().find(img => img.id === imageId);
};

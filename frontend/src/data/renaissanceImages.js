// Renaissance-style base images organized by category
// Images are now loaded dynamically from the server via API

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

// No mock images - all images are loaded from the server
export const RENAISSANCE_IMAGES = {
  'men-outfits': [],
  'women-outfits': [],
  'two-people': [],
  'three-people': []
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

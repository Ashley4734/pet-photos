import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Check, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { RENAISSANCE_CATEGORIES, getImagesByCategory } from '../data/renaissanceImages';

export default function ImageSelectionPanel({ selectedImage, onSelectImage, onClear }) {
  const [activeCategory, setActiveCategory] = useState(RENAISSANCE_CATEGORIES[0].id);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const currentImages = getImagesByCategory(activeCategory);
  const currentCategory = RENAISSANCE_CATEGORIES.find(c => c.id === activeCategory);

  const handleImageError = (imageId) => {
    setImageErrors(prev => ({ ...prev, [imageId]: true }));
  };

  const handleSelectImage = (image) => {
    if (selectedImage?.id === image.id) {
      onClear();
    } else {
      onSelectImage(image);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {RENAISSANCE_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeCategory === category.id
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white hover:shadow-sm border border-slate-200'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Category Description */}
      <p className="text-sm text-slate-500">{currentCategory?.description}</p>

      {/* Selected Image Preview */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-700 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Selected Base Image
            </span>
            <button
              onClick={onClear}
              className="text-amber-600 hover:text-amber-800 p-1 rounded-lg hover:bg-amber-100 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="w-24 h-24 rounded-lg object-cover border-2 border-amber-300 shadow-md"
                onError={() => handleImageError(selectedImage.id)}
              />
              <button
                onClick={() => setPreviewImage(selectedImage)}
                className="absolute bottom-1 right-1 p-1 bg-white/90 rounded-md hover:bg-white transition-colors"
                title="View full size"
              >
                <Maximize2 className="w-3 h-3 text-slate-600" />
              </button>
            </div>
            <div>
              <p className="font-medium text-slate-700">{selectedImage.name}</p>
              <p className="text-xs text-slate-500">
                {RENAISSANCE_CATEGORIES.find(c => c.id === selectedImage.category)?.name}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
        <AnimatePresence mode="popLayout">
          {currentImages.map((image, index) => (
            <motion.button
              key={image.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => handleSelectImage(image)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:shadow-lg group ${
                selectedImage?.id === image.id
                  ? 'border-amber-500 ring-2 ring-amber-300 shadow-md scale-105'
                  : 'border-slate-200 hover:border-amber-300'
              }`}
            >
              {imageErrors[image.id] ? (
                <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                  <Image className="w-6 h-6 mb-1" />
                  <span className="text-xs">{index + 1}</span>
                </div>
              ) : (
                <img
                  src={image.thumbnail || image.url}
                  alt={image.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onError={() => handleImageError(image.id)}
                  loading="lazy"
                />
              )}

              {/* Selection indicator */}
              {selectedImage?.id === image.id && (
                <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                  <div className="bg-amber-500 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-medium mb-1 drop-shadow-lg">
                  {index + 1}
                </span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Page indicator */}
      <div className="text-center text-sm text-slate-500">
        Showing {currentImages.length} images in {currentCategory?.name}
      </div>

      {/* Full-size Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
                <p className="text-white font-medium">{previewImage.name}</p>
                <p className="text-white/70 text-sm">
                  {RENAISSANCE_CATEGORIES.find(c => c.id === previewImage.category)?.name}
                </p>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  handleSelectImage(previewImage);
                  setPreviewImage(null);
                }}
                className={`absolute bottom-4 right-4 px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  selectedImage?.id === previewImage.id
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {selectedImage?.id === previewImage.id ? (
                  <>
                    <X className="w-4 h-4" />
                    Deselect
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Select This Image
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

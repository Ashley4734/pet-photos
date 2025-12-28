import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Check, X, Maximize2, Upload, Trash2, RefreshCw, Plus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { RENAISSANCE_CATEGORIES } from '../data/renaissanceImages';

const ALL_CATEGORIES = RENAISSANCE_CATEGORIES;

export default function ImageSelectionPanel({ selectedImage, onSelectImage, onClear }) {
  const [activeCategory, setActiveCategory] = useState(RENAISSANCE_CATEGORIES[0].id);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [uploadedImagesByCategory, setUploadedImagesByCategory] = useState({});
  const [loadingCategory, setLoadingCategory] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);

  // Fetch uploaded images for a specific category
  const fetchUploadedImages = useCallback(async (categoryId) => {
    setLoadingCategory(categoryId);
    try {
      const response = await fetch(`/api/images?category=${categoryId}`);
      const data = await response.json();
      if (data.success && data.images) {
        // Convert to the same format as renaissance images
        const formattedImages = data.images.map((img) => ({
          id: `uploaded-${categoryId}-${img.filename}`,
          category: categoryId,
          name: img.filename.replace(/\.[^/.]+$/, '').replace(/-/g, ' '),
          url: img.url,
          thumbnail: img.url,
          filename: img.filename,
          isUploaded: true
        }));
        setUploadedImagesByCategory(prev => ({
          ...prev,
          [categoryId]: formattedImages
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch uploaded images for ${categoryId}:`, error);
    } finally {
      setLoadingCategory(null);
    }
  }, []);

  // Fetch all category uploads on mount
  const fetchAllCategoryUploads = useCallback(async () => {
    for (const category of RENAISSANCE_CATEGORIES) {
      await fetchUploadedImages(category.id);
    }
  }, [fetchUploadedImages]);

  useEffect(() => {
    fetchAllCategoryUploads();
  }, [fetchAllCategoryUploads]);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file drop for uploading to current category
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    const targetCategory = activeCategory;

    for (const file of acceptedFiles) {
      try {
        const base64 = await fileToBase64(file);
        const response = await fetch('/api/images/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            category: targetCategory,
            filename: file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
          })
        });
        const data = await response.json();
        if (data.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} image(s) to ${ALL_CATEGORIES.find(c => c.id === targetCategory)?.name}`);
      fetchUploadedImages(targetCategory);
      setShowUploadZone(false);
    }

    setUploading(false);
  }, [activeCategory, fetchUploadedImages]);

  // Delete uploaded image
  const deleteUploadedImage = async (image, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/images/${image.category}/${image.filename}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Image deleted');
        if (selectedImage?.id === image.id) {
          onClear();
        }
        fetchUploadedImages(image.category);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    multiple: true,
    onDrop,
    noClick: false,
    noKeyboard: false
  });

  // Get uploaded images for the current category (all images are now server-uploaded)
  const currentImages = uploadedImagesByCategory[activeCategory] || [];
  const currentCategory = ALL_CATEGORIES.find(c => c.id === activeCategory);

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
        {ALL_CATEGORIES.map((category) => {
          const categoryUploadCount = uploadedImagesByCategory[category.id]?.length || 0;
          return (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id);
                setShowUploadZone(false);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeCategory === category.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'bg-white/70 text-slate-600 hover:bg-white hover:shadow-sm border border-slate-200'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
              {categoryUploadCount > 0 && (
                <span className="bg-white/30 px-1.5 py-0.5 rounded-full text-xs">
                  {categoryUploadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Description with Upload Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{currentCategory?.description}</p>
        <button
          onClick={() => setShowUploadZone(!showUploadZone)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            showUploadZone
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Plus className={`w-4 h-4 transition-transform ${showUploadZone ? 'rotate-45' : ''}`} />
          Add Images
        </button>
      </div>

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
                {ALL_CATEGORIES.find(c => c.id === selectedImage.category)?.name || 'Uploaded'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upload Zone for Current Category */}
      <AnimatePresence>
        {showUploadZone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                  <p className="text-sm text-amber-700 font-medium">Uploading to {currentCategory?.name}...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-amber-700 font-medium">
                    {isDragActive ? 'Drop images here...' : `Drag & drop images to add to ${currentCategory?.name}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG, GIF, WebP</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Grid */}
      {loadingCategory === activeCategory ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : currentImages.length > 0 ? (
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

                {/* Delete button for uploaded images */}
                {image.isUploaded && (
                  <button
                    onClick={(e) => deleteUploadedImage(image, e)}
                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Delete image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <span className="text-white text-xs font-medium mb-1 drop-shadow-lg">
                    {index + 1}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <Image className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No images in {currentCategory?.name} yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Images" to upload images to this category</p>
        </div>
      )}

      {/* Page indicator */}
      {currentImages.length > 0 && (
        <div className="text-center text-sm text-slate-500">
          Showing {currentImages.length} images in {currentCategory?.name}
        </div>
      )}

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
                  {ALL_CATEGORIES.find(c => c.id === previewImage.category)?.name || 'Uploaded'}
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

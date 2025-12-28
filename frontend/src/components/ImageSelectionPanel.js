import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Check, ChevronLeft, ChevronRight, X, Maximize2, Upload, Trash2, RefreshCw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { RENAISSANCE_CATEGORIES, getImagesByCategory } from '../data/renaissanceImages';

// Add uploaded category
const UPLOADED_CATEGORY = {
  id: 'uploaded',
  name: 'Uploaded',
  description: 'Your uploaded base images',
  icon: '📤'
};

const ALL_CATEGORIES = [...RENAISSANCE_CATEGORIES, UPLOADED_CATEGORY];

export default function ImageSelectionPanel({ selectedImage, onSelectImage, onClear }) {
  const [activeCategory, setActiveCategory] = useState(RENAISSANCE_CATEGORIES[0].id);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loadingUploaded, setLoadingUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch uploaded base images
  const fetchUploadedImages = useCallback(async () => {
    setLoadingUploaded(true);
    try {
      const response = await fetch('/api/images?category=base');
      const data = await response.json();
      if (data.success && data.images) {
        // Convert to the same format as renaissance images
        const formattedImages = data.images.map((img, index) => ({
          id: `uploaded-${img.filename}`,
          category: 'uploaded',
          name: img.filename.replace(/\.[^/.]+$/, '').replace(/-/g, ' '),
          url: img.url,
          thumbnail: img.url,
          filename: img.filename,
          isUploaded: true
        }));
        setUploadedImages(formattedImages);
      }
    } catch (error) {
      console.error('Failed to fetch uploaded images:', error);
    } finally {
      setLoadingUploaded(false);
    }
  }, []);

  useEffect(() => {
    fetchUploadedImages();
  }, [fetchUploadedImages]);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file drop for uploading
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of acceptedFiles) {
      try {
        const base64 = await fileToBase64(file);
        const response = await fetch('/api/images/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            category: 'base',
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
      toast.success(`Uploaded ${successCount} image(s)`);
      fetchUploadedImages();
    }

    setUploading(false);
  }, [fetchUploadedImages]);

  // Delete uploaded image
  const deleteUploadedImage = async (image, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/images/base/${image.filename}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Image deleted');
        if (selectedImage?.id === image.id) {
          onClear();
        }
        fetchUploadedImages();
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

  const currentImages = activeCategory === 'uploaded' ? uploadedImages : getImagesByCategory(activeCategory);
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
        {ALL_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeCategory === category.id
                ? category.id === 'uploaded'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white hover:shadow-sm border border-slate-200'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
            {category.id === 'uploaded' && uploadedImages.length > 0 && (
              <span className="bg-white/30 px-1.5 py-0.5 rounded-full text-xs">
                {uploadedImages.length}
              </span>
            )}
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
                {ALL_CATEGORIES.find(c => c.id === selectedImage.category)?.name || 'Uploaded'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upload Zone for Uploaded Category */}
      {activeCategory === 'uploaded' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-purple-400 bg-purple-50'
              : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mb-2" />
              <p className="text-sm text-purple-700 font-medium">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-purple-700 font-medium">
                {isDragActive ? 'Drop images here...' : 'Drag & drop base images or click to upload'}
              </p>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, GIF, WebP</p>
            </>
          )}
        </div>
      )}

      {/* Image Grid */}
      {activeCategory === 'uploaded' && loadingUploaded ? (
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
      ) : activeCategory === 'uploaded' ? (
        <div className="text-center py-8 text-slate-500">
          <Image className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No uploaded images yet</p>
          <p className="text-xs text-slate-400 mt-1">Upload some images above to use as style references</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {/* Empty state for other categories */}
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

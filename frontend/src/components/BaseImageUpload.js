import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Upload, X, Trash2, Image, RefreshCw } from 'lucide-react';

export default function BaseImageUpload({ onImagesChange }) {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch existing base images on mount
  const fetchBaseImages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/images?category=base');
      const data = await response.json();
      if (data.success && data.images) {
        setUploadedImages(data.images);
        onImagesChange?.(data.images);
      }
    } catch (error) {
      console.error('Failed to fetch base images:', error);
    } finally {
      setLoading(false);
    }
  }, [onImagesChange]);

  useEffect(() => {
    fetchBaseImages();
  }, [fetchBaseImages]);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const uploadPromises = acceptedFiles.map(async (file) => {
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
          return {
            filename: data.filename,
            url: data.url,
            size: data.size,
            category: 'base',
            createdAt: new Date().toISOString()
          };
        }
        throw new Error(data.error || 'Upload failed');
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(r => r !== null);

    if (successfulUploads.length > 0) {
      const newImages = [...uploadedImages, ...successfulUploads];
      setUploadedImages(newImages);
      onImagesChange?.(newImages);
      toast.success(`Uploaded ${successfulUploads.length} image(s)`);
    }

    setUploading(false);
  }, [uploadedImages, onImagesChange]);

  // Delete an image
  const deleteImage = async (image) => {
    try {
      const response = await fetch(`/api/images/${image.category}/${image.filename}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        const newImages = uploadedImages.filter(i => i.filename !== image.filename);
        setUploadedImages(newImages);
        onImagesChange?.(newImages);
        toast.success('Image deleted');
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    multiple: true,
    onDrop
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-700 flex items-center gap-2">
          <Image className="w-5 h-5 text-purple-500" />
          Upload Base Images
        </h4>
        <button
          onClick={fetchBaseImages}
          disabled={loading}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Dropzone */}
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
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mb-3" />
            <p className="text-sm text-purple-700 font-medium">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <p className="text-sm text-purple-700 font-medium">
              {isDragActive ? 'Drop images here...' : 'Drag & drop base images or click to upload'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              JPG, PNG, GIF, WebP - These will be available as style references
            </p>
          </>
        )}
      </div>

      {/* Uploaded Images Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : uploadedImages.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          <AnimatePresence>
            {uploadedImages.map((image) => (
              <motion.div
                key={image.filename}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group aspect-square"
              >
                <img
                  src={image.url}
                  alt={image.filename}
                  className="w-full h-full object-cover rounded-lg border border-slate-200"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => deleteImage(image)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">{image.filename}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 text-sm">
          No base images uploaded yet. Upload some images to use as style references.
        </div>
      )}

      {/* Image count */}
      {uploadedImages.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          {uploadedImages.length} base image{uploadedImages.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
}

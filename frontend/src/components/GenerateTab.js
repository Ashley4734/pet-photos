import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Sparkles, Zap, Settings, CheckCircle, Download, Eye, RefreshCw, Upload, X, Link, Palette, User } from 'lucide-react';
import ImageSelectionPanel from './ImageSelectionPanel';

export default function GenerateTab() {
  const [prompts, setPrompts] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null); // Track which image is being regenerated

  // OpenAI Image 1.5 Parameters
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [openaiQuality, setOpenaiQuality] = useState('auto');
  const [openaiBackground, setOpenaiBackground] = useState('auto');
  const [openaiModeration, setOpenaiModeration] = useState('auto');
  const [openaiOutputFormat, setOpenaiOutputFormat] = useState('webp');
  const [openaiInputFidelity, setOpenaiInputFidelity] = useState('low');
  const [openaiNumberOfImages, setOpenaiNumberOfImages] = useState(1);
  const [openaiOutputCompression, setOpenaiOutputCompression] = useState(90);
  const [openaiInputImages, setOpenaiInputImages] = useState([]);
  const [openaiInputImagePreviews, setOpenaiInputImagePreviews] = useState([]);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiUserId, setOpenaiUserId] = useState('');

  // Renaissance base image selection
  const [selectedBaseImage, setSelectedBaseImage] = useState(null);
  const [customerPhotos, setCustomerPhotos] = useState([]);
  const [customerPhotoPreviews, setCustomerPhotoPreviews] = useState([]);

  // Convert file to base64 data URI
  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle OpenAI input images drop
  const onOpenaiImageDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.slice(0, 5 - openaiInputImages.length); // Max 5 images
    setOpenaiInputImages(prev => [...prev, ...newFiles]);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setOpenaiInputImagePreviews(prev => [...prev, ...newPreviews]);
    if (newFiles.length > 0) {
      toast.success(`Added ${newFiles.length} input image(s)`);
    }
  }, [openaiInputImages.length]);

  // Clear OpenAI input images
  const clearOpenaiInputImages = useCallback(() => {
    openaiInputImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setOpenaiInputImages([]);
    setOpenaiInputImagePreviews([]);
  }, [openaiInputImagePreviews]);

  // Remove single OpenAI input image
  const removeOpenaiInputImage = useCallback((index) => {
    URL.revokeObjectURL(openaiInputImagePreviews[index]);
    setOpenaiInputImages(prev => prev.filter((_, i) => i !== index));
    setOpenaiInputImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, [openaiInputImagePreviews]);

  // Dropzone for OpenAI input images
  const openaiImageDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    multiple: true,
    maxFiles: 5,
    onDrop: onOpenaiImageDrop
  });

  // Handle customer photos drop (multiple)
  const onCustomerPhotoDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setCustomerPhotos(prev => [...prev, ...acceptedFiles]);
      const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
      setCustomerPhotoPreviews(prev => [...prev, ...newPreviews]);
      toast.success(`Added ${acceptedFiles.length} customer photo${acceptedFiles.length > 1 ? 's' : ''}!`);
    }
  }, []);

  // Clear all customer photos
  const clearCustomerPhotos = useCallback(() => {
    customerPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setCustomerPhotos([]);
    setCustomerPhotoPreviews([]);
  }, [customerPhotoPreviews]);

  // Remove single customer photo
  const removeCustomerPhoto = useCallback((index) => {
    URL.revokeObjectURL(customerPhotoPreviews[index]);
    setCustomerPhotos(prev => prev.filter((_, i) => i !== index));
    setCustomerPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }, [customerPhotoPreviews]);

  // Dropzone for customer photos (multiple)
  const customerPhotoDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    multiple: true,
    onDrop: onCustomerPhotoDrop
  });

  // Clear base image selection
  const clearBaseImageSelection = useCallback(() => {
    setSelectedBaseImage(null);
  }, []);

  // Fetch image URL and convert to base64
  const urlToBase64 = useCallback(async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert URL to base64:', error);
      return null;
    }
  }, []);

  const generateImages = async () => {
    const promptLines = prompts.split('\n').map(p => p.trim()).filter(p => p.length > 0);

    if (promptLines.length === 0) {
      toast.error('Enter at least one prompt');
      return;
    }

    console.log('🎨 Starting generation for prompts:', promptLines);
    console.log('📐 Using parameters:', { aspectRatio, openaiQuality, openaiBackground });

    setGenerating(true);
    setResults([]);
    setGenerationProgress(0);

    try {
      const newResults = [];
      const totalPrompts = promptLines.length;

      for (let i = 0; i < promptLines.length; i++) {
        const prompt = promptLines[i];
        setCurrentPrompt(prompt);
        setGenerationProgress(((i) / totalPrompts) * 100);

        console.log(`🎯 Processing prompt ${i + 1}/${totalPrompts}: "${prompt}"`);

        try {
          // Prepare generation parameters for OpenAI Image 1.5
          const requestBody = {
            prompt,
            model: 'openai-image-1.5',
            aspect_ratio: aspectRatio,
            quality: openaiQuality,
            background: openaiBackground,
            moderation: openaiModeration,
            output_format: openaiOutputFormat,
            input_fidelity: openaiInputFidelity,
            number_of_images: openaiNumberOfImages,
            output_compression: openaiOutputCompression
          };

          // Add API key if provided
          if (openaiApiKey.trim()) {
            requestBody.openai_api_key = openaiApiKey.trim();
          }
          // Add user ID if provided
          if (openaiUserId.trim()) {
            requestBody.user_id = openaiUserId.trim();
          }
          // Collect all input images (base image, customer photos, and any additional reference images)
          const inputImagePromises = [];

          // Add selected base image first (if any)
          if (selectedBaseImage) {
            inputImagePromises.push(urlToBase64(selectedBaseImage.url));
          }

          // Add customer photos
          if (customerPhotos.length > 0) {
            customerPhotos.forEach(file => {
              inputImagePromises.push(fileToBase64(file));
            });
          }

          // Add any additional reference images
          if (openaiInputImages.length > 0) {
            openaiInputImages.forEach(file => {
              inputImagePromises.push(fileToBase64(file));
            });
          }

          // Combine all images (limit to 5 as per API)
          if (inputImagePromises.length > 0) {
            const allImages = await Promise.all(inputImagePromises);
            const validImages = allImages.filter(img => img !== null).slice(0, 5);
            if (validImages.length > 0) {
              requestBody.input_images = validImages;
            }
          }

          console.log('📋 Request body:', requestBody);

          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          console.log('📡 Response status:', response.status);

          const responseData = await response.json();
          console.log('📦 Response data:', responseData);

          if (response.ok && responseData.success) {
            const result = {
              ...responseData,
              id: Date.now() + Math.random(),
              model: 'openai-image-1.5',
              parameters: requestBody,
              baseImage: selectedBaseImage,
              customerPhotoCount: customerPhotos.length
            };
            newResults.push(result);
            console.log(`✅ Successfully generated image for: "${prompt}"`);
            console.log(`📐 Generated with OpenAI Image 1.5`);
            toast.success(`Generated image ${i + 1}/${totalPrompts}`);
          } else {
            console.error(`❌ Failed to generate image for: "${prompt}"`, responseData);
            toast.error(`Failed: ${responseData.error || 'Unknown error'}`);

            if (responseData.details) {
              console.error('Error details:', responseData.details);
            }
          }
        } catch (fetchError) {
          console.error(`❌ Network error for prompt "${prompt}":`, fetchError);
          toast.error(`Network error for prompt ${i + 1}`);
        }
      }

      setGenerationProgress(100);
      setCurrentPrompt('');
      setResults(newResults);

      if (newResults.length > 0) {
        toast.success(`Generated ${newResults.length} image(s) with OpenAI Image 1.5!`, {
          icon: '🎨',
          duration: 4000
        });
      } else {
        toast.error('No images were generated. Check console for details.', {
          duration: 6000
        });
      }

      console.log(`🏁 Generation complete. Successfully generated ${newResults.length}/${totalPrompts} images`);

    } catch (error) {
      console.error('❌ Generation process failed:', error);
      toast.error('Generation process failed');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setCurrentPrompt('');
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/health');
      const health = await response.json();

      if (health.status === 'healthy') {
        toast.success('Server connection OK');
        console.log('🏥 Health check:', health);
      } else {
        toast.error('Server health check failed');
      }
    } catch (error) {
      toast.error('Cannot connect to server');
      console.error('Health check failed:', error);
    }
  };

  const downloadImage = async (imageUrl, prompt, index) => {
    try {
      // Create filename from prompt (sanitized) or use index
      const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
      const filename = `generated_${sanitizedPrompt || `image_${index + 1}`}_${Date.now()}.jpg`;

      toast.loading('Processing image with 300 DPI...', { id: 'download' });

      // Use our backend proxy to add 300 DPI metadata
      const response = await fetch('/api/download-with-dpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, filename })
      });

      if (!response.ok) {
        throw new Error('Download processing failed');
      }

      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Image downloaded with 300 DPI!', { id: 'download' });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image', { id: 'download' });
    }
  };

  const downloadAllImages = async () => {
    if (results.length === 0) return;

    try {
      toast.loading('Processing and downloading images with 300 DPI...', { id: 'download-all' });

      // Process each image through our DPI proxy
      const imageBlobs = await Promise.all(
        results.map(async (result, index) => {
          const sanitizedPrompt = result.prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);
          const filename = `${sanitizedPrompt || `image_${index + 1}`}.jpg`;

          // Use our backend proxy to add 300 DPI metadata
          const response = await fetch('/api/download-with-dpi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: result.imageUrl, filename })
          });

          const blob = await response.blob();
          return { blob, filename };
        })
      );

      // Create individual downloads
      for (let i = 0; i < imageBlobs.length; i++) {
        const { blob, filename } = imageBlobs[i];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${i + 1}_${filename}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Small delay between downloads
        if (i < imageBlobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success(`Downloaded ${results.length} images with 300 DPI!`, { id: 'download-all' });
    } catch (error) {
      console.error('Batch download failed:', error);
      toast.error('Failed to download images', { id: 'download-all' });
    }
  };

  const regenerateImage = async (index) => {
    const result = results[index];
    if (!result) return;

    console.log('🔄 Regenerating image at index:', index);
    console.log('📋 Original parameters:', result.parameters);

    setRegeneratingIndex(index);

    try {
      toast.loading('Regenerating image...', { id: 'regenerate' });

      // Use the same parameters from the original generation
      const requestBody = { ...result.parameters };

      console.log('📋 Regeneration request body:', requestBody);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Regeneration response status:', response.status);

      const responseData = await response.json();
      console.log('📦 Regeneration response data:', responseData);

      if (response.ok && responseData.success) {
        // Update the specific image in the results array
        const updatedResults = [...results];
        updatedResults[index] = {
          ...responseData,
          id: Date.now() + Math.random(),
          model: result.model,
          parameters: requestBody
        };
        setResults(updatedResults);

        console.log(`✅ Successfully regenerated image`);
        toast.success('Image regenerated successfully!', { id: 'regenerate' });
      } else {
        console.error(`❌ Failed to regenerate image:`, responseData);
        toast.error(`Failed: ${responseData.error || 'Unknown error'}`, { id: 'regenerate' });
      }
    } catch (error) {
      console.error('❌ Regeneration failed:', error);
      toast.error('Failed to regenerate image', { id: 'regenerate' });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-accent-500" />
            AI Art Generation
            <span className="text-sm px-2 py-1 rounded-full bg-cyan-100 text-cyan-700">
              OpenAI Image 1.5
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              Advanced
            </button>
            <button
              onClick={testConnection}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full transition-colors"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Renaissance Base Image Selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200"
        >
          <h4 className="font-medium text-amber-800 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Step 1: Choose a Renaissance Style Base Image
          </h4>
          <ImageSelectionPanel
            selectedImage={selectedBaseImage}
            onSelectImage={setSelectedBaseImage}
            onClear={clearBaseImageSelection}
          />
        </motion.div>

        {/* Customer Photo Upload */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
        >
          <h4 className="font-medium text-blue-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Step 2: Upload Customer Photos
            {customerPhotos.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-700">
                {customerPhotos.length} photo{customerPhotos.length !== 1 ? 's' : ''}
              </span>
            )}
          </h4>

          {customerPhotoPreviews.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {customerPhotoPreviews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview}
                      alt={`Customer photo ${idx + 1}`}
                      className="w-24 h-24 rounded-lg object-cover border-2 border-blue-300 shadow-md"
                    />
                    <button
                      onClick={() => removeCustomerPhoto(idx)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => customerPhotoDropzone.open()}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Upload className="w-4 h-4" />
                  Add more photos
                </button>
                <button
                  onClick={clearCustomerPhotos}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear all
                </button>
              </div>
              <input {...customerPhotoDropzone.getInputProps()} />
            </div>
          ) : (
            <div
              {...customerPhotoDropzone.getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                customerPhotoDropzone.isDragActive
                  ? 'border-blue-400 bg-blue-100'
                  : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <input {...customerPhotoDropzone.getInputProps()} />
              <User className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-blue-700 font-medium">
                {customerPhotoDropzone.isDragActive
                  ? 'Drop photos here...'
                  : 'Drag & drop customer photos or click to upload'}
              </p>
              <p className="text-xs text-blue-500 mt-1">Upload multiple photos at once - faces will be merged with the renaissance style</p>
            </div>
          )}
        </motion.div>

        {/* Generation Summary */}
        {(selectedBaseImage || customerPhotos.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
          >
            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Ready to Generate
            </h4>
            <div className="flex flex-wrap gap-4 text-sm text-green-700">
              {selectedBaseImage && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Base Style:</span>
                  <span>{selectedBaseImage.name}</span>
                </div>
              )}
              {customerPhotos.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Customer Photos:</span>
                  <span>{customerPhotos.length} photo{customerPhotos.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Advanced Parameters */}
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200"
          >
            <h4 className="font-medium text-slate-700 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Generation Parameters
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="3:2">Landscape (3:2)</option>
                  <option value="2:3">Portrait (2:3)</option>
                </select>
              </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Quality</label>
                  <select
                    value={openaiQuality}
                    onChange={(e) => setOpenaiQuality(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Background</label>
                  <select
                    value={openaiBackground}
                    onChange={(e) => setOpenaiBackground(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="transparent">Transparent</option>
                    <option value="opaque">Opaque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Moderation</label>
                  <select
                    value={openaiModeration}
                    onChange={(e) => setOpenaiModeration(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Output Format</label>
                  <select
                    value={openaiOutputFormat}
                    onChange={(e) => setOpenaiOutputFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="webp">WebP</option>
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Input Fidelity</label>
                  <select
                    value={openaiInputFidelity}
                    onChange={(e) => setOpenaiInputFidelity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="low">Low</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Number of Images: {openaiNumberOfImages}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={openaiNumberOfImages}
                    onChange={(e) => setOpenaiNumberOfImages(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Output Compression: {openaiOutputCompression}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={openaiOutputCompression}
                    onChange={(e) => setOpenaiOutputCompression(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    OpenAI API Key <span className="text-xs text-slate-400">(Optional - uses proxy if not provided)</span>
                  </label>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    User ID <span className="text-xs text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={openaiUserId}
                    onChange={(e) => setOpenaiUserId(e.target.value)}
                    placeholder="user-123"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Input Images <span className="text-xs text-slate-400">(Optional - up to 5 reference images)</span>
                  </label>

                  {openaiInputImagePreviews.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {openaiInputImagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative inline-block">
                            <img
                              src={preview}
                              alt={`Input ${idx + 1}`}
                              className="h-20 w-20 rounded-lg border border-slate-300 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeOpenaiInputImage(idx)}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
                              title="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {openaiInputImages.length < 5 && (
                        <button
                          type="button"
                          onClick={() => openaiImageDropzone.open()}
                          className="text-sm text-cyan-600 hover:text-cyan-700"
                        >
                          + Add more images ({openaiInputImages.length}/5)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      {...openaiImageDropzone.getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                        openaiImageDropzone.isDragActive
                          ? 'border-cyan-400 bg-cyan-50'
                          : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
                      }`}
                    >
                      <input {...openaiImageDropzone.getInputProps()} />
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        {openaiImageDropzone.isDragActive
                          ? 'Drop images here...'
                          : 'Drag & drop or click to upload (up to 5 images)'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF, WebP</p>
                    </div>
                  )}
                </div>
              </div>

            {/* Current Settings Display */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">
                <strong>Current Settings:</strong> {aspectRatio} • Quality: {openaiQuality} • BG: {openaiBackground} • {openaiOutputFormat.toUpperCase()} • Images: {openaiNumberOfImages}
              </div>
            </div>
          </motion.div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Step 3: Enter Prompt (one per line)
          </label>
          <textarea
            value={prompts}
            onChange={(e) => setPrompts(e.target.value)}
            placeholder={selectedBaseImage || customerPhotos.length > 0
              ? "Create a renaissance portrait combining the person's face with the elegant style and clothing from the reference image, maintaining the artistic quality and period-accurate details"
              : "beautiful renaissance portrait painting\nelegant royal court portrait in oil painting style\nclassic renaissance family portrait with ornate clothing"}
            rows={4}
            className="w-full px-4 py-4 bg-white/70 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-2">
            {selectedBaseImage || customerPhotos.length > 0
              ? "Describe how to combine the customer's photos with the selected renaissance style. The AI will blend the people into the artistic style."
              : "Each line will generate one image. Select a base image and upload customer photos for best results."}
          </p>
        </div>

        {/* Progress Section */}
        {generating && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-blue-700">
                Generating with OpenAI Image 1.5...
              </span>
            </div>
            {currentPrompt && (
              <p className="text-sm text-blue-600 mb-2">Current: {currentPrompt}</p>
            )}
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-500 mt-1">{Math.round(generationProgress)}% complete</p>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={generateImages}
          disabled={generating || !prompts.trim()}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-accent-500 to-primary-500 text-white rounded-2xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate with OpenAI Image 1.5
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Results Section */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h4 className="text-xl font-semibold text-slate-800">
                Generated Artwork ({results.length})
              </h4>
            </div>
            {results.length > 1 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={downloadAllImages}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download All
              </motion.button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/70 rounded-2xl overflow-hidden border border-white/50 hover:shadow-lg transition-all"
              >
                <div className="aspect-square bg-slate-100 relative group">
                  <img
                    src={result.imageUrl}
                    alt={result.prompt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', result.imageUrl);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-200 flex items-center justify-center text-slate-500 text-sm" style={{display: 'none'}}>
                    Failed to load image
                  </div>

                  {/* Loading overlay when regenerating */}
                  {regeneratingIndex === index && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-white animate-spin mb-2" />
                      <span className="text-white text-sm font-medium">Regenerating...</span>
                    </div>
                  )}

                  {/* Hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadImage(result.imageUrl, result.prompt, index)}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        title="Download Image"
                        disabled={regeneratingIndex === index}
                      >
                        <Download className="w-4 h-4 text-slate-700" />
                      </button>
                      <button
                        onClick={() => regenerateImage(index)}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Regenerate Image"
                        disabled={regeneratingIndex === index}
                      >
                        <RefreshCw className={`w-4 h-4 text-slate-700 ${regeneratingIndex === index ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <button
                      onClick={() => window.open(result.imageUrl, '_blank')}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                      title="View Full Size"
                      disabled={regeneratingIndex === index}
                    >
                      <Eye className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-600 mb-2 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{result.prompt}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-cyan-50 text-cyan-600">
                        OpenAI Image 1.5
                      </span>
                      <span className="text-slate-400">
                        {result.parameters?.aspect_ratio} • Quality: {result.parameters?.quality}
                      </span>
                      {result.baseImage && (
                        <span className="text-amber-600 text-xs">
                          Base: {result.baseImage.name}
                        </span>
                      )}
                      {result.customerPhotoCount > 0 && (
                        <span className="text-blue-600 text-xs">
                          + {result.customerPhotoCount} Customer Photo{result.customerPhotoCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {result.parameters?.input_images && result.parameters.input_images.length > 0 && !result.baseImage && !result.customerPhotoCount && (
                        <span className="text-slate-400">
                          Reference images: {result.parameters.input_images.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => downloadImage(result.imageUrl, result.prompt, index)}
                      className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full hover:bg-primary-200 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Debug Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <details className="inline-block text-left">
          <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
            Debug Information
          </summary>
          <div className="mt-2 p-3 bg-slate-100 rounded-lg text-xs text-slate-600 max-w-md">
            <p>Check browser console (F12) for detailed logs</p>
            <p>API endpoint: /api/generate</p>
            <p>Model: OpenAI Image 1.5</p>
            <p>Current settings: {aspectRatio} • Quality: {openaiQuality} • Images: {openaiNumberOfImages}</p>
            <p className="mt-2 text-slate-500">💡 Tip: Click download buttons to save images locally</p>
          </div>
        </details>
      </motion.div>
    </div>
  );
}

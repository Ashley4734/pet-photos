import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Sparkles, Zap, Settings, CheckCircle, Download, Eye, RefreshCw, Upload, X, Link } from 'lucide-react';

export default function GenerateTab() {
  const [prompts, setPrompts] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [artworkType, setArtworkType] = useState('tv'); // 'tv' or 'wall'
  const [selectedModel, setSelectedModel] = useState('seedream'); // 'seedream', 'flux-schnell', 'flux-1.1-pro', 'stable-diffusion', or 'openai-image-1.5'
  const [regeneratingIndex, setRegeneratingIndex] = useState(null); // Track which image is being regenerated

  // SeedreamS-3 Parameters
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [size, setSize] = useState('big');
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [useRandomSeed, setUseRandomSeed] = useState(true);

  // Flux Schnell Parameters
  const [numInferenceSteps, setNumInferenceSteps] = useState(4);
  const [goFast, setGoFast] = useState(true);
  const [megapixels, setMegapixels] = useState('1');
  const [outputFormat, setOutputFormat] = useState('webp');
  const [outputQuality, setOutputQuality] = useState(80);
  const [disableSafetyChecker, setDisableSafetyChecker] = useState(false);

  // Flux 1.1 Pro Parameters
  const [safetyTolerance, setSafetyTolerance] = useState(2);
  const [promptUpsampling, setPromptUpsampling] = useState(false);
  const [fluxWidth, setFluxWidth] = useState(1024);
  const [fluxHeight, setFluxHeight] = useState(1024);
  const [imagePromptUrl, setImagePromptUrl] = useState('');
  const [imagePromptFile, setImagePromptFile] = useState(null);
  const [imagePromptPreview, setImagePromptPreview] = useState(null);
  const [imagePromptMode, setImagePromptMode] = useState('upload'); // 'upload' or 'url'

  // Stable Diffusion Parameters
  const [sdWidth, setSdWidth] = useState(1024);
  const [sdHeight, setSdHeight] = useState(1024);
  const [sdNumOutputs, setSdNumOutputs] = useState(1);
  const [sdDisableNsfwChecker, setSdDisableNsfwChecker] = useState(false);
  const [sdRemoveBackground, setSdRemoveBackground] = useState(false);
  const [sdThreshold, setSdThreshold] = useState(80);
  const [sdStrayRemoval, setSdStrayRemoval] = useState(0.01);
  const [sdTrimBackground, setSdTrimBackground] = useState(false);
  const [sdPadding, setSdPadding] = useState(0);

  // OpenAI Image 1.5 Parameters
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

  // Convert file to base64 data URI
  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle image drop for reference image
  const onImageDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setImagePromptFile(file);
      setImagePromptPreview(URL.createObjectURL(file));
      setImagePromptUrl(''); // Clear URL when file is uploaded
      toast.success('Reference image uploaded');
    }
  }, []);

  // Clear the uploaded reference image
  const clearImagePrompt = useCallback(() => {
    if (imagePromptPreview) {
      URL.revokeObjectURL(imagePromptPreview);
    }
    setImagePromptFile(null);
    setImagePromptPreview(null);
    setImagePromptUrl('');
  }, [imagePromptPreview]);

  // Dropzone for reference image
  const imagePromptDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    multiple: false,
    onDrop: onImageDrop
  });

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

  const generateImages = async () => {
    const promptLines = prompts.split('\n').map(p => p.trim()).filter(p => p.length > 0);

    if (promptLines.length === 0) {
      toast.error('Enter at least one prompt');
      return;
    }

    console.log('🎨 Starting generation for prompts:', promptLines);
    console.log('📐 Using parameters:', { aspectRatio, size, guidanceScale, useRandomSeed });

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
          // Prepare generation parameters based on selected model
          const requestBody = {
            prompt,
            model: selectedModel,
            aspect_ratio: aspectRatio
          };

          // Add model-specific parameters
          if (selectedModel === 'seedream') {
            requestBody.size = size;
            requestBody.guidance_scale = guidanceScale;
            // Handle seed parameter
            if (useRandomSeed) {
              requestBody.seed = Math.floor(Math.random() * 1000000);
            }
          } else if (selectedModel === 'flux-schnell') {
            requestBody.num_inference_steps = numInferenceSteps;
            requestBody.go_fast = goFast;
            requestBody.megapixels = megapixels;
            requestBody.output_format = outputFormat;
            requestBody.output_quality = outputQuality;
            requestBody.disable_safety_checker = disableSafetyChecker;
            // Handle seed parameter
            if (useRandomSeed) {
              requestBody.seed = Math.floor(Math.random() * 1000000);
            }
          } else if (selectedModel === 'flux-1.1-pro') {
            requestBody.output_format = outputFormat;
            requestBody.output_quality = outputQuality;
            requestBody.safety_tolerance = safetyTolerance;
            requestBody.prompt_upsampling = promptUpsampling;
            // Add custom width/height when using custom aspect ratio
            if (aspectRatio === 'custom') {
              requestBody.width = fluxWidth;
              requestBody.height = fluxHeight;
            }
            // Add image prompt for Flux Redux if provided (file or URL)
            if (imagePromptFile) {
              // Convert file to base64 data URI
              const base64Image = await fileToBase64(imagePromptFile);
              requestBody.image_prompt = base64Image;
            } else if (imagePromptUrl.trim()) {
              requestBody.image_prompt = imagePromptUrl.trim();
            }
            // Handle seed parameter
            if (useRandomSeed) {
              requestBody.seed = Math.floor(Math.random() * 1000000);
            }
          } else if (selectedModel === 'stable-diffusion') {
            requestBody.width = sdWidth;
            requestBody.height = sdHeight;
            requestBody.num_outputs = sdNumOutputs;
            requestBody.disable_nsfw_checker = sdDisableNsfwChecker;
            requestBody.remove_background = sdRemoveBackground;
            // Background removal options
            if (sdRemoveBackground) {
              requestBody.threshold = sdThreshold;
              requestBody.stray_removal = sdStrayRemoval;
              requestBody.trim_background = sdTrimBackground;
              if (sdTrimBackground) {
                requestBody.padding = sdPadding;
              }
            }
            // Handle seed parameter
            if (useRandomSeed) {
              requestBody.seed = Math.floor(Math.random() * 1000000);
            } else {
              requestBody.seed = -1; // Stable Diffusion uses -1 for random
            }
          } else if (selectedModel === 'openai-image-1.5') {
            requestBody.quality = openaiQuality;
            requestBody.background = openaiBackground;
            requestBody.moderation = openaiModeration;
            requestBody.output_format = openaiOutputFormat;
            requestBody.input_fidelity = openaiInputFidelity;
            requestBody.number_of_images = openaiNumberOfImages;
            requestBody.output_compression = openaiOutputCompression;
            // Add API key if provided
            if (openaiApiKey.trim()) {
              requestBody.openai_api_key = openaiApiKey.trim();
            }
            // Add user ID if provided
            if (openaiUserId.trim()) {
              requestBody.user_id = openaiUserId.trim();
            }
            // Add input images if provided
            if (openaiInputImages.length > 0) {
              const base64Images = await Promise.all(
                openaiInputImages.map(file => fileToBase64(file))
              );
              requestBody.input_images = base64Images;
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
              model: selectedModel,
              parameters: requestBody
            };
            newResults.push(result);
            console.log(`✅ Successfully generated image for: "${prompt}"`);
            console.log(`📐 Generated with model: ${selectedModel}`);
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
        const modelName = selectedModel === 'flux-schnell' ? 'Flux Schnell' : selectedModel === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : selectedModel === 'stable-diffusion' ? 'Stable Diffusion' : selectedModel === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3';
        toast.success(`Generated ${newResults.length} image(s) with ${modelName}!`, {
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

      // Generate new random seed if random seed was used
      if (result.parameters.seed && useRandomSeed) {
        requestBody.seed = Math.floor(Math.random() * 1000000);
      }

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

  // Switch artwork type and update preset settings
  const switchArtworkType = (type) => {
    setArtworkType(type);
    if (type === 'tv') {
      setAspectRatio('16:9');
      setSize('big');
    } else if (type === 'wall') {
      setAspectRatio('3:4'); // Using 3:4 (closest valid ratio to 4:5 for 16x20" prints)
      setSize('big');
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-accent-500" />
            AI Art Generation
            <span className={`text-sm px-2 py-1 rounded-full ${
              selectedModel === 'flux-schnell'
                ? 'bg-blue-100 text-blue-700'
                : selectedModel === 'flux-1.1-pro'
                ? 'bg-emerald-100 text-emerald-700'
                : selectedModel === 'stable-diffusion'
                ? 'bg-orange-100 text-orange-700'
                : selectedModel === 'openai-image-1.5'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {selectedModel === 'flux-schnell' ? 'Flux Schnell' : selectedModel === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : selectedModel === 'stable-diffusion' ? 'Stable Diffusion' : selectedModel === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3'}
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

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">AI Model</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedModel('seedream')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedModel === 'seedream'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="text-left">
                <h4 className={`font-semibold mb-1 ${selectedModel === 'seedream' ? 'text-purple-700' : 'text-slate-700'}`}>
                  SeedreamS-3
                </h4>
                <p className="text-sm text-slate-600">High-quality artistic images with guidance control</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedModel('flux-schnell')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedModel === 'flux-schnell'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="text-left">
                <h4 className={`font-semibold mb-1 ${selectedModel === 'flux-schnell' ? 'text-blue-700' : 'text-slate-700'}`}>
                  Flux Schnell
                </h4>
                <p className="text-sm text-slate-600">Fast, high-quality image generation (1-4 steps)</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedModel('flux-1.1-pro')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedModel === 'flux-1.1-pro'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="text-left">
                <h4 className={`font-semibold mb-1 ${selectedModel === 'flux-1.1-pro' ? 'text-emerald-700' : 'text-slate-700'}`}>
                  Flux 1.1 Pro
                </h4>
                <p className="text-sm text-slate-600">Premium quality with prompt upsampling</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedModel('stable-diffusion')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedModel === 'stable-diffusion'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-orange-300'
              }`}
            >
              <div className="text-left">
                <h4 className={`font-semibold mb-1 ${selectedModel === 'stable-diffusion' ? 'text-orange-700' : 'text-slate-700'}`}>
                  Stable Diffusion
                </h4>
                <p className="text-sm text-slate-600">Classic SD with background removal options</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedModel('openai-image-1.5')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedModel === 'openai-image-1.5'
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-slate-200 bg-white hover:border-cyan-300'
              }`}
            >
              <div className="text-left">
                <h4 className={`font-semibold mb-1 ${selectedModel === 'openai-image-1.5' ? 'text-cyan-700' : 'text-slate-700'}`}>
                  OpenAI Image 1.5
                </h4>
                <p className="text-sm text-slate-600">Latest OpenAI image generation with quality control</p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Artwork Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">Artwork Type</label>
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => switchArtworkType('tv')}
              className={`p-4 rounded-xl border-2 transition-all ${
                artworkType === 'tv'
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-slate-200 bg-white hover:border-accent-300'
              }`}
            >
              <div className="text-left">
                <h4 className={`font-semibold mb-1 ${artworkType === 'tv' ? 'text-accent-700' : 'text-slate-700'}`}>
                  TV Artwork
                </h4>
                <p className="text-sm text-slate-600 mb-2">For Samsung Frame TV and digital displays</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded">16:9 aspect ratio</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">2048px max</span>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => switchArtworkType('wall')}
              className={`p-4 rounded-xl border-2 transition-all ${
                artworkType === 'wall'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 bg-white hover:border-primary-300'
              }`}
            >
              <div className="text-left">
                <h4 className={`font-semibold mb-1 ${artworkType === 'wall' ? 'text-primary-700' : 'text-slate-700'}`}>
                  Wall Artwork
                </h4>
                <p className="text-sm text-slate-600 mb-2">For printing and wall display (16x20")</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded">3:4 aspect ratio</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">2048px max</span>
                </div>
              </div>
            </motion.button>
          </div>
        </div>

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
                  {selectedModel === 'flux-1.1-pro' && (
                    <option value="custom">Custom (set width/height)</option>
                  )}
                  <option value="1:1">Square (1:1)</option>
                  <option value="16:9">TV Landscape (16:9)</option>
                  <option value="3:4">Wall Portrait (3:4 / Similar to 16x20")</option>
                  <option value="9:16">Portrait (9:16)</option>
                  <option value="4:3">Classic (4:3)</option>
                  {selectedModel === 'flux-1.1-pro' && (
                    <>
                      <option value="4:5">Portrait (4:5)</option>
                      <option value="5:4">Landscape (5:4)</option>
                    </>
                  )}
                  {selectedModel !== 'flux-1.1-pro' && (
                    <option value="21:9">Ultra-wide (21:9)</option>
                  )}
                  <option value="3:2">Camera (3:2)</option>
                  <option value="2:3">Vertical (2:3)</option>
                </select>
              </div>

              {selectedModel === 'seedream' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Image Size</label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="small">Small (512px min)</option>
                      <option value="regular">Regular (1MP)</option>
                      <option value="big">Big (2048px max)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Guidance Scale: {guidanceScale}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Creative</span>
                      <span>Literal</span>
                    </div>
                  </div>
                </>
              )}

              {selectedModel === 'flux-schnell' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Inference Steps: {numInferenceSteps}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={numInferenceSteps}
                      onChange={(e) => setNumInferenceSteps(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Faster</span>
                      <span>Higher Quality</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Megapixels</label>
                    <select
                      value={megapixels}
                      onChange={(e) => setMegapixels(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    >
                      <option value="0.25">0.25 MP (Small)</option>
                      <option value="1">1 MP (Standard)</option>
                    </select>
                  </div>
                </>
              )}

              {selectedModel === 'flux-1.1-pro' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Safety Tolerance: {safetyTolerance}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="1"
                      value={safetyTolerance}
                      onChange={(e) => setSafetyTolerance(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Strict</span>
                      <span>Permissive</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={promptUpsampling}
                        onChange={(e) => setPromptUpsampling(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-600">Prompt upsampling (more creative)</span>
                    </label>
                  </div>
                </>
              )}

              {/* Custom Width/Height for Flux 1.1 Pro */}
              {selectedModel === 'flux-1.1-pro' && aspectRatio === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Width: {fluxWidth}px
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="1440"
                      step="32"
                      value={fluxWidth}
                      onChange={(e) => setFluxWidth(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>256</span>
                      <span>1440</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Height: {fluxHeight}px
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="1440"
                      step="32"
                      value={fluxHeight}
                      onChange={(e) => setFluxHeight(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>256</span>
                      <span>1440</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {selectedModel === 'flux-schnell' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Output Format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="webp">WebP</option>
                    <option value="jpg">JPG</option>
                    <option value="png">PNG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Quality: {outputQuality}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={outputQuality}
                    onChange={(e) => setOutputQuality(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col gap-2 justify-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={goFast}
                      onChange={(e) => setGoFast(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-600">Fast mode (FP8)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={disableSafetyChecker}
                      onChange={(e) => setDisableSafetyChecker(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-600">Disable safety checker</span>
                  </label>
                </div>
              </div>
            )}

            {selectedModel === 'flux-1.1-pro' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Output Format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  >
                    <option value="webp">WebP</option>
                    <option value="jpg">JPG</option>
                    <option value="png">PNG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Quality: {outputQuality}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={outputQuality}
                    onChange={(e) => setOutputQuality(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Image Prompt (Flux Redux)
                    <span className="text-xs text-slate-400 ml-2">Optional - guide generation with a reference image</span>
                  </label>

                  {/* Mode Toggle */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setImagePromptMode('upload')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        imagePromptMode === 'upload'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagePromptMode('url')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        imagePromptMode === 'url'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      URL
                    </button>
                  </div>

                  {/* Upload Mode */}
                  {imagePromptMode === 'upload' && (
                    <>
                      {imagePromptPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={imagePromptPreview}
                            alt="Reference"
                            className="h-24 w-auto rounded-lg border border-slate-300 object-cover"
                          />
                          <button
                            type="button"
                            onClick={clearImagePrompt}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <p className="text-xs text-slate-500 mt-1">{imagePromptFile?.name}</p>
                        </div>
                      ) : (
                        <div
                          {...imagePromptDropzone.getRootProps()}
                          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                            imagePromptDropzone.isDragActive
                              ? 'border-emerald-400 bg-emerald-50'
                              : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                          }`}
                        >
                          <input {...imagePromptDropzone.getInputProps()} />
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-600">
                            {imagePromptDropzone.isDragActive
                              ? 'Drop image here...'
                              : 'Drag & drop or click to upload'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF, WebP</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* URL Mode */}
                  {imagePromptMode === 'url' && (
                    <input
                      type="url"
                      value={imagePromptUrl}
                      onChange={(e) => {
                        setImagePromptUrl(e.target.value);
                        // Clear file if URL is entered
                        if (e.target.value && imagePromptFile) {
                          clearImagePrompt();
                        }
                      }}
                      placeholder="https://example.com/reference-image.jpg"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    />
                  )}

                  <p className="text-xs text-slate-500 mt-2">
                    Provide an image to guide the generation towards its composition
                  </p>
                </div>
              </div>
            )}

            {selectedModel === 'stable-diffusion' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Width: {sdWidth}px
                  </label>
                  <input
                    type="range"
                    min="512"
                    max="1536"
                    step="64"
                    value={sdWidth}
                    onChange={(e) => setSdWidth(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>512</span>
                    <span>1536</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Height: {sdHeight}px
                  </label>
                  <input
                    type="range"
                    min="512"
                    max="1536"
                    step="64"
                    value={sdHeight}
                    onChange={(e) => setSdHeight(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>512</span>
                    <span>1536</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Number of Outputs: {sdNumOutputs}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={sdNumOutputs}
                    onChange={(e) => setSdNumOutputs(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1</span>
                    <span>4</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sdDisableNsfwChecker}
                      onChange={(e) => setSdDisableNsfwChecker(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-600">Disable safety checker</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sdRemoveBackground}
                      onChange={(e) => setSdRemoveBackground(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-600">Remove background</span>
                  </label>
                </div>

                {sdRemoveBackground && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Transparency Threshold: {sdThreshold}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        step="5"
                        value={sdThreshold}
                        onChange={(e) => setSdThreshold(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Less transparent</span>
                        <span>More transparent</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        Stray Removal: {(sdStrayRemoval * 100).toFixed(1)}%
                      </label>
                      <input
                        type="range"
                        min="0.001"
                        max="0.3"
                        step="0.01"
                        value={sdStrayRemoval}
                        onChange={(e) => setSdStrayRemoval(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Keep more</span>
                        <span>Remove more</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {selectedModel === 'stable-diffusion' && sdRemoveBackground && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sdTrimBackground}
                      onChange={(e) => setSdTrimBackground(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-600">Trim transparent background</span>
                  </label>
                </div>

                {sdTrimBackground && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Padding: {sdPadding}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={sdPadding}
                      onChange={(e) => setSdPadding(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {selectedModel === 'openai-image-1.5' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
            )}

            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useRandomSeed}
                  onChange={(e) => setUseRandomSeed(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-600">Use random seed for variety</span>
              </label>
            </div>

            {/* Current Settings Display */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">
                <strong>Current Settings:</strong> {selectedModel !== 'stable-diffusion' && selectedModel !== 'openai-image-1.5' ? aspectRatio : selectedModel === 'stable-diffusion' ? `${sdWidth}×${sdHeight}px` : aspectRatio}
                {selectedModel === 'flux-1.1-pro' && aspectRatio === 'custom' && ` (${fluxWidth}×${fluxHeight}px)`} •
                {selectedModel === 'seedream' && ` ${size} • Guidance: ${guidanceScale}`}
                {selectedModel === 'flux-schnell' && ` ${megapixels}MP • Steps: ${numInferenceSteps} • ${outputFormat.toUpperCase()}`}
                {selectedModel === 'flux-1.1-pro' && ` Safety: ${safetyTolerance} • ${outputFormat.toUpperCase()} • ${promptUpsampling ? 'Upsampling ON' : 'Upsampling OFF'}`}
                {selectedModel === 'flux-1.1-pro' && (imagePromptFile || imagePromptUrl.trim()) && ' • Redux: ON'}
                {selectedModel === 'stable-diffusion' && ` Outputs: ${sdNumOutputs} • ${sdRemoveBackground ? 'BG Remove: ON' : 'BG Remove: OFF'}`}
                {selectedModel === 'openai-image-1.5' && ` Quality: ${openaiQuality} • BG: ${openaiBackground} • ${openaiOutputFormat.toUpperCase()} • Images: ${openaiNumberOfImages}`}
                {selectedModel !== 'openai-image-1.5' && ' • Seed: ' + (useRandomSeed ? 'Random' : 'Fixed')}
              </div>
            </div>
          </motion.div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Enter prompts (one per line)
          </label>
          <textarea
            value={prompts}
            onChange={(e) => setPrompts(e.target.value)}
            placeholder="beautiful landscape painting
abstract geometric art
fantasy dragon illustration
cyberpunk city at night"
            rows={6}
            className="w-full px-4 py-4 bg-white/70 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-2">
            Each line will generate one image. Be descriptive for better results with {selectedModel === 'flux-schnell' ? 'Flux Schnell' : selectedModel === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : selectedModel === 'stable-diffusion' ? 'Stable Diffusion' : selectedModel === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3'}.
          </p>
        </div>

        {/* Progress Section */}
        {generating && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-blue-700">
                Generating with {selectedModel === 'flux-schnell' ? 'Flux Schnell' : selectedModel === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : selectedModel === 'stable-diffusion' ? 'Stable Diffusion' : selectedModel === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3'}...
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
              Generate with {selectedModel === 'flux-schnell' ? 'Flux Schnell' : selectedModel === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : selectedModel === 'stable-diffusion' ? 'Stable Diffusion' : selectedModel === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3'}
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
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        result.model === 'flux-schnell'
                          ? 'bg-blue-50 text-blue-600'
                          : result.model === 'flux-1.1-pro'
                          ? 'bg-emerald-50 text-emerald-600'
                          : result.model === 'stable-diffusion'
                          ? 'bg-orange-50 text-orange-600'
                          : result.model === 'openai-image-1.5'
                          ? 'bg-cyan-50 text-cyan-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}>
                        {result.model === 'flux-schnell' ? 'Flux Schnell' : result.model === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : result.model === 'stable-diffusion' ? 'Stable Diffusion' : result.model === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3'}
                      </span>
                      <span className="text-slate-400">
                        {result.model === 'stable-diffusion' ? `${result.parameters?.width}×${result.parameters?.height}px` : result.parameters?.aspect_ratio}
                        {result.model === 'flux-1.1-pro' && result.parameters?.aspect_ratio === 'custom' && result.parameters?.width && ` (${result.parameters.width}×${result.parameters.height})`}
                        {result.model === 'seedream' && result.parameters?.size && ` • ${result.parameters.size}`}
                        {result.model === 'flux-schnell' && result.parameters?.megapixels && ` • ${result.parameters.megapixels}MP`}
                        {result.model === 'stable-diffusion' && result.parameters?.num_outputs > 1 && ` • ${result.parameters.num_outputs} outputs`}
                      </span>
                      {result.model === 'seedream' && result.parameters?.guidance_scale && (
                        <span className="text-slate-400">
                          Guidance: {result.parameters.guidance_scale}
                        </span>
                      )}
                      {result.model === 'flux-schnell' && result.parameters?.num_inference_steps && (
                        <span className="text-slate-400">
                          Steps: {result.parameters.num_inference_steps}
                        </span>
                      )}
                      {result.model === 'flux-1.1-pro' && (
                        <span className="text-slate-400">
                          Safety: {result.parameters?.safety_tolerance} • {result.parameters?.prompt_upsampling ? 'Upsampling' : 'No upsampling'}
                        </span>
                      )}
                      {result.model === 'flux-1.1-pro' && result.parameters?.image_prompt && (
                        <span className="text-slate-400">
                          Redux: ON
                        </span>
                      )}
                      {result.model === 'stable-diffusion' && result.parameters?.remove_background && (
                        <span className="text-slate-400">
                          BG Remove: ON
                        </span>
                      )}
                      {result.parameters?.seed && (
                        <span className="text-slate-400">
                          Seed: {result.parameters.seed}
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
            <p>Model: {selectedModel === 'flux-schnell' ? 'black-forest-labs/flux-schnell' : selectedModel === 'flux-1.1-pro' ? 'black-forest-labs/flux-1.1-pro' : selectedModel === 'stable-diffusion' ? 'zedge/stable-diffusion' : selectedModel === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'bytedance/seedream-3'}</p>
            <p>Current settings: {selectedModel === 'stable-diffusion' ? `${sdWidth}×${sdHeight}` : selectedModel === 'openai-image-1.5' ? aspectRatio : aspectRatio}
              {selectedModel === 'flux-1.1-pro' && aspectRatio === 'custom' ? ` (${fluxWidth}×${fluxHeight})` : ''} •
              {selectedModel === 'seedream' && ` ${size} • Guidance: ${guidanceScale}`}
              {selectedModel === 'flux-schnell' && ` ${megapixels}MP • Steps: ${numInferenceSteps}`}
              {selectedModel === 'flux-1.1-pro' && ` Safety: ${safetyTolerance} • ${promptUpsampling ? 'Upsampling' : 'No upsampling'}`}
              {selectedModel === 'stable-diffusion' && ` Outputs: ${sdNumOutputs} • ${sdRemoveBackground ? 'BG Remove' : 'No BG Remove'}`}
              {selectedModel === 'openai-image-1.5' && ` Quality: ${openaiQuality} • Images: ${openaiNumberOfImages}`}
            </p>
            <p className="mt-2 text-slate-500">💡 Tip: Click download buttons to save images locally</p>
          </div>
        </details>
      </motion.div>
    </div>
  );
}

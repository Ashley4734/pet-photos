import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import Replicate from 'replicate';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'build')));

console.log('Starting AI Art Generator server...');

// Python script to add DPI metadata using PIL
const createDPIProcessorScript = () => {
  return `
import sys
import json
import base64
from PIL import Image
import io

try:
    input_data = json.loads(sys.stdin.read())
    image_b64 = input_data['image']

    # Decode base64
    if ',' in image_b64:
        image_b64 = image_b64.split(',')[1]
    image_data = base64.b64decode(image_b64)

    # Open image with PIL
    img = Image.open(io.BytesIO(image_data))

    # Convert to RGB if needed
    if img.mode in ('RGBA', 'LA', 'P'):
        if img.mode == 'RGBA' or img.mode == 'LA':
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[-1])
            else:
                background.paste(img)
            img = background
        else:
            img = img.convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Save with 300 DPI
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=95, optimize=True, dpi=(300, 300))

    # Return base64 result
    result = base64.b64encode(output.getvalue()).decode('utf-8')
    print(json.dumps({'success': True, 'image': result}))

except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
    sys.exit(1)
`;
};

const safeFilename = (name) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) || 'file';
};

// Main generate endpoint
app.post('/api/generate', async (req, res) => {
  console.log('AI Generation request received');

  try {
    // Extract ALL parameters from request body
    const {
      prompt,
      model = 'seedream',
      aspect_ratio = '1:1',
      // SeedreamS-3 parameters
      size,
      guidance_scale,
      // Flux Schnell parameters
      num_inference_steps,
      go_fast,
      megapixels,
      output_format,
      output_quality,
      disable_safety_checker,
      // Flux 1.1 Pro parameters
      safety_tolerance,
      prompt_upsampling,
      width,
      height,
      image_prompt,
      // Stable Diffusion parameters
      num_outputs,
      disable_nsfw_checker,
      remove_background,
      threshold,
      stray_removal,
      trim_background,
      padding,
      // OpenAI Image 1.5 parameters
      quality,
      background,
      moderation,
      input_fidelity,
      number_of_images,
      output_compression,
      input_images,
      user_id,
      openai_api_key,
      // Common parameters
      seed
    } = req.body;

    // Validate prompt
    if (!prompt?.trim()) {
      console.log('No prompt provided');
      return res.status(400).json({ error: 'Prompt required' });
    }

    const modelName = model === 'flux-schnell' ? 'Flux Schnell' : model === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : model === 'stable-diffusion' ? 'Stable Diffusion' : model === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3';
    console.log(`Processing prompt: "${prompt.trim()}"`);
    console.log(`Selected model: ${modelName}`);

    // Check for API token
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      console.log('REPLICATE_API_TOKEN not configured');
      return res.status(500).json({
        error: 'Replicate API token not configured',
        details: 'Please set REPLICATE_API_TOKEN environment variable'
      });
    }

    console.log('API token found, initializing Replicate...');

    // Initialize Replicate
    const replicate = new Replicate({ auth: token });

    // Try the generation with detailed logging
    console.log(`Starting image generation with ${modelName}...`);

    try {
      // Prepare input parameters based on selected model
      let inputParams;
      let replicateModel;

      if (model === 'flux-schnell') {
        // Flux Schnell parameters
        replicateModel = "black-forest-labs/flux-schnell";
        inputParams = {
          prompt: prompt.trim(),
          aspect_ratio: aspect_ratio,
          num_inference_steps: num_inference_steps || 4,
          go_fast: go_fast !== undefined ? go_fast : true,
          megapixels: megapixels || '1',
          output_format: output_format || 'webp',
          output_quality: output_quality || 80,
          disable_safety_checker: disable_safety_checker || false
        };

        // Add seed if provided
        if (seed !== undefined && seed !== null) {
          inputParams.seed = seed;
        }
      } else if (model === 'flux-1.1-pro') {
        // Flux 1.1 Pro parameters
        replicateModel = "black-forest-labs/flux-1.1-pro";
        inputParams = {
          prompt: prompt.trim(),
          aspect_ratio: aspect_ratio,
          output_format: output_format || 'webp',
          output_quality: output_quality || 80,
          safety_tolerance: safety_tolerance || 2,
          prompt_upsampling: prompt_upsampling || false
        };

        // Add custom width/height when using custom aspect ratio
        if (aspect_ratio === 'custom') {
          if (width !== undefined && width !== null) {
            // Round to nearest multiple of 32
            inputParams.width = Math.round(width / 32) * 32;
          }
          if (height !== undefined && height !== null) {
            // Round to nearest multiple of 32
            inputParams.height = Math.round(height / 32) * 32;
          }
        }

        // Add image prompt URL for Flux Redux if provided
        if (image_prompt && image_prompt.trim()) {
          inputParams.image_prompt = image_prompt.trim();
        }

        // Add seed if provided
        if (seed !== undefined && seed !== null) {
          inputParams.seed = seed;
        }
      } else if (model === 'stable-diffusion') {
        // Stable Diffusion parameters
        replicateModel = "zedge/stable-diffusion:328e5d9bb8ece3bc78d873f6d9c23070c3d656221b24350e034f4a1a4548f275";
        inputParams = {
          prompt: prompt.trim(),
          width: width || 1024,
          height: height || 1024,
          num_outputs: num_outputs || 1,
          disable_nsfw_checker: disable_nsfw_checker || false,
          remove_background: remove_background || false
        };

        // Add background removal options if enabled
        if (remove_background) {
          inputParams.threshold = threshold !== undefined ? threshold : 80;
          inputParams.stray_removal = stray_removal !== undefined ? stray_removal : 0.01;
          inputParams.trim_background = trim_background || false;
          if (trim_background) {
            inputParams.padding = padding !== undefined ? padding : 0;
          }
        }

        // Add seed if provided (negative for random)
        if (seed !== undefined && seed !== null) {
          inputParams.seed = seed;
        } else {
          inputParams.seed = -1; // Stable Diffusion uses -1 for random
        }
      } else if (model === 'openai-image-1.5') {
        // GPT Image 1.5 via Replicate API (supports reference images)
        replicateModel = "openai/gpt-image-1.5";

        // OpenAI API key is optional - Replicate uses proxy if not provided
        const apiKey = openai_api_key || process.env.OPENAI_API_KEY;

        // Map aspect_ratio to supported values (1:1, 3:2, 2:3)
        let mappedAspectRatio = '1:1';
        if (aspect_ratio === '3:2' || aspect_ratio === '4:3' || aspect_ratio === '16:9' || aspect_ratio === '21:9') {
          mappedAspectRatio = '3:2';
        } else if (aspect_ratio === '2:3' || aspect_ratio === '3:4' || aspect_ratio === '9:16') {
          mappedAspectRatio = '2:3';
        }

        inputParams = {
          prompt: prompt.trim(),
          aspect_ratio: mappedAspectRatio,
          quality: quality || 'auto',
          number_of_images: Math.min(number_of_images || 1, 10),
          output_format: output_format || 'webp',
          output_compression: output_compression || 90,
          background: background || 'auto',
          moderation: moderation || 'auto'
        };

        // Add OpenAI API key if provided (optional - uses Replicate proxy if not set)
        if (apiKey) {
          inputParams.openai_api_key = apiKey;
        }

        // Add input_fidelity parameter
        if (input_fidelity) {
          inputParams.input_fidelity = input_fidelity;
        }

        // Add user_id if provided
        if (user_id) {
          inputParams.user_id = user_id;
        }

        // Add input images if provided (reference images)
        if (input_images && Array.isArray(input_images) && input_images.length > 0) {
          console.log(`Adding ${input_images.length} reference image(s)`);
          inputParams.input_images = input_images;
        }
      } else {
        // SeedreamS-3 parameters
        replicateModel = "bytedance/seedream-3";
        inputParams = {
          prompt: prompt.trim(),
          aspect_ratio: aspect_ratio,
          size: size || 'regular',
          guidance_scale: guidance_scale || 3.5
        };

        // Add seed if provided or use random
        if (seed !== undefined && seed !== null) {
          inputParams.seed = seed;
        } else {
          inputParams.seed = Math.floor(Math.random() * 1000000);
        }
      }

      console.log('Input parameters:', inputParams);
      console.log(`Calling ${replicateModel}...`);

      // Use the selected model
      const output = await replicate.run(replicateModel, {
        input: inputParams
      });

      console.log('Replicate API call successful');
      console.log('Output type:', typeof output);
      console.log('Output:', Array.isArray(output) ? `Array with ${output.length} items` : output);

      // Handle different output formats
      let imageUrl;
      if (Array.isArray(output)) {
        imageUrl = output[0];
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (output && output.output) {
        imageUrl = Array.isArray(output.output) ? output.output[0] : output.output;
      } else if (output && output.output_paths) {
        // Handle zedge/stable-diffusion and similar models that return output_paths
        imageUrl = Array.isArray(output.output_paths) ? output.output_paths[0] : output.output_paths;
      } else {
        throw new Error('Unexpected output format from Replicate');
      }

      if (!imageUrl) {
        throw new Error('No image URL received from Replicate');
      }

      console.log('Image URL received:', imageUrl);

      const result = {
        imageUrl: imageUrl,
        prompt: prompt.trim(),
        timestamp: new Date().toISOString(),
        model: model,
        modelName: modelName,
        replicateModel: replicateModel,
        parameters: inputParams,
        success: true
      };

      console.log('Generation completed successfully');
      res.json(result);

    } catch (replicateError) {
      console.error('Replicate API Error:', replicateError);
      console.error('Error details:', {
        message: replicateError.message,
        status: replicateError.status,
        response: replicateError.response
      });

      // Try fallback with different parameters if model fails
      if (replicateError.message?.includes('not found') || replicateError.status === 404) {
        console.log(`Trying ${modelName} with fallback parameters...`);

        try {
          let fallbackParams;

          if (model === 'flux-schnell') {
            // For Flux Schnell, try with minimal steps and lower quality
            fallbackParams = {
              ...inputParams,
              num_inference_steps: 1,  // Fastest setting
              megapixels: '0.25'        // Smallest size
            };
          } else {
            // For SeedreamS-3, downgrade size if big fails
            fallbackParams = {
              prompt: prompt.trim(),
              aspect_ratio: aspect_ratio,
              size: size === 'big' ? 'regular' : size,
              guidance_scale: guidance_scale || 3.5,
              seed: Math.floor(Math.random() * 1000000)
            };
          }

          console.log('Fallback parameters:', fallbackParams);

          const fallbackOutput = await replicate.run(replicateModel, {
            input: fallbackParams
          });

          const fallbackImageUrl = Array.isArray(fallbackOutput) ? fallbackOutput[0] : fallbackOutput;

          console.log('Fallback generation successful');

          res.json({
            imageUrl: fallbackImageUrl,
            prompt: prompt.trim(),
            timestamp: new Date().toISOString(),
            model: `${model}-fallback`,
            modelName: `${modelName} (fallback)`,
            replicateModel: replicateModel,
            parameters: fallbackParams,
            success: true
          });

        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          throw replicateError; // Throw original error
        }
      } else {
        throw replicateError;
      }
    }

  } catch (error) {
    console.error('Generation failed:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Image generation failed';
    let errorDetails = error.message;

    const modelName = req.body.model === 'flux-schnell' ? 'Flux Schnell' : req.body.model === 'flux-1.1-pro' ? 'Flux 1.1 Pro' : req.body.model === 'stable-diffusion' ? 'Stable Diffusion' : req.body.model === 'openai-image-1.5' ? 'OpenAI Image 1.5' : 'SeedreamS-3';

    if (error.message?.includes('auth') || error.message?.includes('token')) {
      statusCode = 401;
      errorMessage = 'Authentication failed';
      errorDetails = 'Invalid or missing Replicate API token';
    } else if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Model not found';
      errorDetails = `The ${modelName} model is not available`;
    } else if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
      errorDetails = 'Too many requests. Please wait and try again.';
    } else if (error.message?.includes('insufficient credits')) {
      statusCode = 402;
      errorMessage = 'Insufficient credits';
      errorDetails = 'Not enough Replicate credits to generate image';
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      success: false
    });
  }
});

// Download proxy endpoint to add 300 DPI metadata to images
app.post('/api/download-with-dpi', async (req, res) => {
  try {
    const { imageUrl, filename } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL required' });
    }

    console.log(`Downloading and processing image with 300 DPI: ${imageUrl}`);

    // Fetch the image from the URL
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const imageBuffer = Buffer.from(imageResponse.data);
    const imageB64 = imageBuffer.toString('base64');

    // Use Python PIL to set DPI (most reliable method)
    const python = spawn('python3', ['-c', createDPIProcessorScript()]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          if (result.success) {
            const processedBuffer = Buffer.from(result.image, 'base64');

            // Set appropriate headers
            const safeFileName = filename ? safeFilename(filename) : 'artwork.jpg';
            res.set({
              'Content-Type': 'image/jpeg',
              'Content-Disposition': `attachment; filename="${safeFileName}"`,
              'X-DPI-Processing': 'true',
              'X-DPI-Value': '300'
            });

            res.send(processedBuffer);
            console.log(`Image processed and sent with 300 DPI: ${safeFileName}`);
          } else {
            console.error('Python processing failed:', result.error);
            res.status(500).json({ error: 'Image processing failed', details: result.error });
          }
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          res.status(500).json({ error: 'Processing output parse failed' });
        }
      } else {
        console.error('Python process failed:', stderr);
        res.status(500).json({ error: 'Python process failed', details: stderr });
      }
    });

    // Send input to Python
    python.stdin.write(JSON.stringify({ image: imageB64 }));
    python.stdin.end();

  } catch (error) {
    console.error('Download proxy failed:', error.message);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      models: ['seedream', 'flux-schnell', 'flux-1.1-pro', 'stable-diffusion', 'openai-image-1.5'],
      dpiProcessing: true
    }
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Art Generator running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Replicate API: ${process.env.REPLICATE_API_TOKEN ? 'Configured' : 'Missing'}`);
  console.log('Supported models: SeedreamS-3, Flux Schnell, Flux 1.1 Pro, Stable Diffusion, OpenAI Image 1.5');
});

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
    // Extract OpenAI Image 1.5 parameters from request body
    const {
      prompt,
      aspect_ratio = '1:1',
      quality,
      background,
      moderation,
      output_format,
      input_fidelity,
      number_of_images,
      output_compression,
      input_images,
      user_id,
      openai_api_key
    } = req.body;

    // Validate prompt
    if (!prompt?.trim()) {
      console.log('No prompt provided');
      return res.status(400).json({ error: 'Prompt required' });
    }

    console.log(`Processing prompt: "${prompt.trim()}"`);
    console.log(`Using model: OpenAI Image 1.5`);

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
    console.log(`Starting image generation with OpenAI Image 1.5...`);

    try {
      // GPT Image 1.5 via Replicate API (supports reference images)
      const replicateModel = "openai/gpt-image-1.5";

      // OpenAI API key is optional - Replicate uses proxy if not provided
      const apiKey = openai_api_key || process.env.OPENAI_API_KEY;

      // Map aspect_ratio to supported values (1:1, 3:2, 2:3)
      let mappedAspectRatio = aspect_ratio;

      // Validate aspect ratio - only 1:1, 3:2, 2:3 are supported
      if (!['1:1', '3:2', '2:3'].includes(aspect_ratio)) {
        mappedAspectRatio = '1:1'; // Default fallback
      }

      const inputParams = {
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
        model: 'openai-image-1.5',
        modelName: 'OpenAI Image 1.5',
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

      throw replicateError;
    }

  } catch (error) {
    console.error('Generation failed:', error);

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Image generation failed';
    let errorDetails = error.message;

    if (error.message?.includes('auth') || error.message?.includes('token')) {
      statusCode = 401;
      errorMessage = 'Authentication failed';
      errorDetails = 'Invalid or missing Replicate API token';
    } else if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Model not found';
      errorDetails = 'The OpenAI Image 1.5 model is not available';
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
      models: ['openai-image-1.5'],
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
  console.log('Supported model: OpenAI Image 1.5');
});

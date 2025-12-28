# AI Art Generator

A standalone AI-powered art generation application with support for multiple AI models including Flux, SeedreamS-3, Stable Diffusion, and OpenAI Image 1.5.

## Features

- **Multiple AI Models**: Choose from 5 different AI models for image generation:
  - **SeedreamS-3** - High-quality artistic images with guidance control
  - **Flux Schnell** - Fast, high-quality generation (1-4 steps)
  - **Flux 1.1 Pro** - Premium quality with prompt upsampling and reference images
  - **Stable Diffusion** - Classic model with background removal options
  - **OpenAI Image 1.5** - Latest OpenAI generation with quality controls

- **Batch Processing**: Generate multiple images from a list of prompts
- **Artwork Presets**: Optimized presets for TV artwork (16:9) and Wall artwork (3:4)
- **Advanced Parameters**: Fine-tune generation with model-specific settings
- **Reference Images**: Use reference images with Flux Redux and OpenAI models
- **300 DPI Export**: Download images with print-ready 300 DPI metadata
- **Real-time Progress**: Track generation progress with visual feedback

## Prerequisites

- Node.js 18+
- Python 3 with PIL/Pillow (for DPI processing)
- Replicate API token ([get one here](https://replicate.com/account/api-tokens))

## Quick Start

### Local Development

1. **Clone and install dependencies**:

```bash
cd generated-standalone

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

2. **Set up environment variables**:

```bash
cp .env.example .env
# Edit .env and add your REPLICATE_API_TOKEN
```

3. **Start the development servers**:

In one terminal (backend):
```bash
cd backend
npm run dev
```

In another terminal (frontend):
```bash
cd frontend
npm start
```

4. Open http://localhost:3000 in your browser

### Docker Deployment

1. **Build the Docker image**:

```bash
docker build -t ai-art-generator .
```

2. **Run the container**:

```bash
docker run -d \
  --name ai-art-generator \
  -p 3000:3000 \
  -e REPLICATE_API_TOKEN=your_token_here \
  ai-art-generator
```

3. Open http://localhost:3000 in your browser

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REPLICATE_API_TOKEN` | Yes | Your Replicate API token |
| `OPENAI_API_KEY` | No | OpenAI API key (optional, uses Replicate proxy if not set) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment mode (default: production) |

## API Endpoints

### POST /api/generate
Generate images using AI models.

**Request Body**:
```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "seedream",
  "aspect_ratio": "16:9",
  "size": "big",
  "guidance_scale": 3.5
}
```

**Response**:
```json
{
  "success": true,
  "imageUrl": "https://...",
  "prompt": "A beautiful sunset over mountains",
  "model": "seedream",
  "parameters": {...}
}
```

### POST /api/download-with-dpi
Download an image with 300 DPI metadata.

**Request Body**:
```json
{
  "imageUrl": "https://...",
  "filename": "artwork.jpg"
}
```

### GET /api/health
Check server health status.

## Model-Specific Parameters

### SeedreamS-3
- `size`: small, regular, big
- `guidance_scale`: 1-10

### Flux Schnell
- `num_inference_steps`: 1-4
- `go_fast`: true/false
- `megapixels`: 0.25, 1
- `output_format`: webp, jpg, png

### Flux 1.1 Pro
- `safety_tolerance`: 1-6
- `prompt_upsampling`: true/false
- `image_prompt`: URL or base64 for reference image

### Stable Diffusion
- `width`, `height`: 512-1536
- `num_outputs`: 1-4
- `remove_background`: true/false

### OpenAI Image 1.5
- `quality`: auto, low, medium, high
- `background`: auto, transparent, opaque
- `number_of_images`: 1-10
- `input_images`: Array of reference images

## Project Structure

```
generated-standalone/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── index.css
│   │   └── components/
│   │       └── GenerateTab.js
│   └── package.json
├── backend/
│   ├── server.js
│   └── package.json
├── Dockerfile
├── docker-entrypoint.sh
├── .env.example
└── README.md
```

## License

MIT

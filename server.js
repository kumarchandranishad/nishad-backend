const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration for deployment
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, // Your Hostinger domain
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'https://nishad-backend.onrender.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// All supported models from API documentation
const supportedModels = [
  "gemini-2.0-flash",
  "img3", 
  "img4", 
  "uncen", 
  "qwen", 
  "kontext-max", 
  "kontext-pro", 
  "flux-1.1-pro", 
  "flux-pro", 
  "flux-schnell", 
  "flux-dev"
];

const supportedSizes = ["1024x1024", "1792x1024", "1024x1792"];

// Model constraints based on API documentation
const modelConstraints = {
  "gemini-2.0-flash": { maxImages: 4, supportedSizes: ["1024x1024", "1024x1792", "1792x1024"] },
  "img3": { maxImages: 4, supportedSizes: ["1024x1024", "1024x1792", "1792x1024"] },
  "img4": { maxImages: 4, supportedSizes: ["1024x1024", "1024x1792", "1792x1024"] },
  "uncen": { maxImages: 1, supportedSizes: ["1024x1024"] },
  "qwen": { maxImages: 4, supportedSizes: ["1024x1024", "1024x1792", "1792x1024"] },
  "kontext-max": { maxImages: 4, supportedSizes: ["1024x1024"] },
  "kontext-pro": { maxImages: 4, supportedSizes: ["1024x1024"] },
  "flux-1.1-pro": { maxImages: 1, supportedSizes: ["1024x1024"] },
  "flux-pro": { maxImages: 1, supportedSizes: ["1024x1024"] },
  "flux-schnell": { maxImages: 4, supportedSizes: ["1024x1024"] },
  "flux-dev": { maxImages: 4, supportedSizes: ["1024x1024"] }
};

// Main image generation endpoint
app.post("/generate", async (req, res) => {
  const { prompt, model = "img3", size = "1024x1024", num_images = 1 } = req.body;

  // API key validation
  if (!process.env.API_KEY) {
    console.error("❌ API key not configured");
    return res.status(500).json({ 
      error: "Server configuration error. API key not found." 
    });
  }

  // Input validation
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ 
      error: "Prompt is required and cannot be empty" 
    });
  }

  if (prompt.trim().length > 1000) {
    return res.status(400).json({ 
      error: "Prompt too long. Maximum 1000 characters allowed." 
    });
  }

  if (!supportedModels.includes(model)) {
    return res.status(400).json({ 
      error: `Unsupported model '${model}'. Supported models: ${supportedModels.join(", ")}` 
    });
  }

  // Check model-specific constraints
  const constraints = modelConstraints[model];
  if (constraints) {
    if (!constraints.supportedSizes.includes(size)) {
      return res.status(400).json({ 
        error: `Size '${size}' not supported for model '${model}'. Supported sizes: ${constraints.supportedSizes.join(", ")}` 
      });
    }

    if (num_images > constraints.maxImages) {
      return res.status(400).json({ 
        error: `Model '${model}' supports maximum ${constraints.maxImages} images. Requested: ${num_images}` 
      });
    }
  }

  if (num_images < 1 || num_images > 4) {
    return res.status(400).json({ 
      error: "Number of images must be between 1 and 4" 
    });
  }

  console.log(`🎨 Generating ${num_images} image(s) with model: ${model}, size: ${size}`);
  console.log(`📝 Prompt: "${prompt.trim()}"`);

  try {
    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      { 
        prompt: prompt.trim(), 
        model: model, 
        size, 
        num_images: parseInt(num_images) || 1
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "Nishad-Image-Generator/2.0"
        },
        timeout: 180000 // 3 minute timeout for image generation
      }
    );

    console.log(`✅ Image generation successful - ${response.data.images?.length || 0} images generated`);
    
    res.status(200).json({
      images: response.data.images || [],
      seed: response.data.seed,
      model: model,
      size: size,
      prompt: prompt.trim(),
      timestamp: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    console.error("❌ Error generating image:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      res.status(401).json({ 
        error: "API authentication failed. Please check your API key configuration." 
      });
    } else if (error.response?.status === 429) {
      res.status(429).json({ 
        error: "Rate limit exceeded. Please wait before making another request." 
      });
    } else if (error.response?.status === 400) {
      res.status(400).json({ 
        error: error.response.data?.error || "Invalid request parameters." 
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ 
        error: "Request timeout. Image generation took too long. Please try again." 
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: "Unable to connect to image generation service. Please try again later." 
      });
    } else {
      res.status(500).json({ 
        error: "Image generation failed due to server error.",
        details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
      });
    }
  }
});

// Get available models with their capabilities
app.get("/models", async (req, res) => {
  try {
    const response = await axios.get("https://api.infip.pro/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
      timeout: 10000
    });

    const modelsWithCapabilities = response.data.data.map(model => ({
      ...model,
      constraints: modelConstraints[model.id] || { maxImages: 1, supportedSizes: ["1024x1024"] }
    }));

    res.status(200).json({
      models: modelsWithCapabilities,
      total: modelsWithCapabilities.length
    });
  } catch (error) {
    console.error("Error fetching models:", error.response?.data || error.message);
    
    // Fallback to hardcoded model list
    res.status(200).json({
      models: supportedModels.map(modelId => ({
        id: modelId,
        name: modelId.charAt(0).toUpperCase() + modelId.slice(1).replace(/-/g, " "),
        constraints: modelConstraints[modelId]
      })),
      total: supportedModels.length,
      fallback: true
    });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Nishad Image Generator Backend is running!",
    version: "2.0.0",
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    supportedModels: supportedModels.length,
    apiProvider: "Infip.pro",
    timestamp: new Date().toISOString(),
    deployment: "Render.com + GitHub",
    apiConfigured: !!process.env.API_KEY
  });
});

// Keep alive endpoint for Render free tier
app.get("/ping", (req, res) => {
  res.json({ 
    status: "alive", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get model constraints endpoint
app.get("/constraints", (req, res) => {
  res.json({
    constraints: modelConstraints,
    supportedModels: supportedModels,
    supportedSizes: supportedSizes
  });
});

// Test API connectivity
app.get("/test-api", async (req, res) => {
  try {
    const response = await axios.get("https://api.infip.pro/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
      timeout: 10000
    });
    
    res.json({
      status: "✅ API connection successful",
      availableModels: response.data.data?.length || 0,
      apiKey: process.env.API_KEY ? "Configured" : "Missing"
    });
  } catch (error) {
    res.status(500).json({
      status: "❌ API connection failed",
      error: error.message,
      apiKey: process.env.API_KEY ? "Configured" : "Missing"
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    availableEndpoints: ["/", "/generate", "/models", "/ping", "/constraints", "/test-api"],
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Supported models (${supportedModels.length}): ${supportedModels.join(", ")}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔑 API Key configured: ${process.env.API_KEY ? "✅ Yes (infip-c5d4def5)" : "❌ No"}`);
  console.log(`📱 CORS enabled for multiple origins`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

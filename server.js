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

// Only Imagen 4 model configuration
const MODEL_INFO = {
  id: "img4",
  name: "Imagen 4",
  description: "Latest Imagen series with improved coherence and detail",
  maxImages: 4,
  supportedSizes: ["1024x1024", "1024x1792", "1792x1024"],
  tier: "free"
};

const supportedSizes = ["1024x1024", "1792x1024", "1024x1792"];

// Main image generation endpoint - Only Imagen 4
app.post("/generate", async (req, res) => {
  const { prompt, size = "1024x1024", num_images = 1 } = req.body;
  
  // Force model to img4
  const model = "img4";

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

  if (!supportedSizes.includes(size)) {
    return res.status(400).json({ 
      error: `Size '${size}' not supported. Supported sizes: ${supportedSizes.join(", ")}` 
    });
  }

  if (num_images < 1 || num_images > MODEL_INFO.maxImages) {
    return res.status(400).json({ 
      error: `Number of images must be between 1 and ${MODEL_INFO.maxImages}. Requested: ${num_images}` 
    });
  }

  console.log(`🎨 Generating ${num_images} image(s) with ${MODEL_INFO.name}, size: ${size}`);
  console.log(`📝 Prompt: "${prompt.trim()}"`);

  try {
    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      { 
        prompt: prompt.trim(), 
        model: model, // Always img4
        size, 
        num_images: parseInt(num_images) || 1
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
          "User-Agent": "Nishad-Imagen4-Generator/2.0"
        },
        timeout: 180000 // 3 minute timeout for image generation
      }
    );

    console.log(`✅ ${MODEL_INFO.name} generation successful - ${response.data.images?.length || 0} images generated`);
    
    res.status(200).json({
      images: response.data.images || [],
      seed: response.data.seed,
      model: MODEL_INFO.name,
      modelId: model,
      size: size,
      prompt: prompt.trim(),
      timestamp: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    console.error("❌ Error generating image with Imagen 4:", error.response?.data || error.message);
    
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
        error: error.response.data?.error || "Invalid request parameters for Imagen 4." 
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ 
        error: "Request timeout. Imagen 4 generation took too long. Please try again." 
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: "Unable to connect to Imagen 4 service. Please try again later." 
      });
    } else {
      res.status(500).json({ 
        error: "Imagen 4 generation failed due to server error.",
        details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
      });
    }
  }
});

// Get model info - Only Imagen 4
app.get("/model", (req, res) => {
  res.status(200).json({
    model: MODEL_INFO,
    supportedSizes: supportedSizes
  });
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Nishad Image Generator - Imagen 4 Only!",
    version: "2.1.0",
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    model: MODEL_INFO.name,
    modelId: MODEL_INFO.id,
    maxImages: MODEL_INFO.maxImages,
    supportedSizes: supportedSizes,
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
    model: MODEL_INFO.name,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get model capabilities
app.get("/capabilities", (req, res) => {
  res.json({
    model: MODEL_INFO,
    supportedSizes: supportedSizes,
    features: [
      "High-quality image generation",
      "Improved coherence and detail",
      "Multiple aspect ratios support",
      "Up to 4 images per request",
      "Free tier access"
    ]
  });
});

// Test API connectivity with Imagen 4
app.get("/test-api", async (req, res) => {
  try {
    const response = await axios.get("https://api.infip.pro/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
      timeout: 10000
    });
    
    // Check if img4 is available
    const availableModels = response.data.data || [];
    const img4Available = availableModels.find(model => model.id === "img4");
    
    res.json({
      status: img4Available ? "✅ Imagen 4 available" : "⚠️ Imagen 4 not found",
      imagen4: img4Available || null,
      totalModels: availableModels.length,
      apiKey: process.env.API_KEY ? "Configured (infip-c5d4def5)" : "Missing"
    });
  } catch (error) {
    res.status(500).json({
      status: "❌ API connection failed",
      error: error.message,
      apiKey: process.env.API_KEY ? "Configured" : "Missing"
    });
  }
});

// Generate sample image endpoint (for testing)
app.post("/test-generate", async (req, res) => {
  const testPrompt = "A beautiful sunset over mountains";
  
  try {
    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      { 
        prompt: testPrompt, 
        model: "img4", 
        size: "1024x1024", 
        num_images: 1
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );

    res.json({
      status: "✅ Imagen 4 test generation successful",
      prompt: testPrompt,
      images: response.data.images || [],
      seed: response.data.seed
    });
  } catch (error) {
    res.status(500).json({
      status: "❌ Imagen 4 test generation failed",
      error: error.response?.data || error.message
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
    availableEndpoints: [
      "/", 
      "/generate", 
      "/model", 
      "/ping", 
      "/capabilities", 
      "/test-api",
      "/test-generate"
    ],
    message: "This backend only supports Imagen 4 model",
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
  console.log(`🎯 Model: ${MODEL_INFO.name} (${MODEL_INFO.id})`);
  console.log(`📏 Supported sizes: ${supportedSizes.join(", ")}`);
  console.log(`🖼️ Max images per request: ${MODEL_INFO.maxImages}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔑 API Key configured: ${process.env.API_KEY ? "✅ Yes (infip-c5d4def5)" : "❌ No"}`);
  console.log(`📱 CORS enabled for multiple origins`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🎨 Ready to generate images with Imagen 4!`);
});

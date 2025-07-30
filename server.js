const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/generate", async (req, res) => {
  const { prompt, size = "1024x1024", num_images = 1 } = req.body;
  
  // Always use img4 model
  const model = "img4";

  // Input validation
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  console.log(`🎨 Generating image with Imagen 4, size: ${size}`);

  try {
    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      { 
        prompt: prompt.trim(), 
        model, // Always img4
        size, 
        num_images: parseInt(num_images) || 1 
      },
      {
        headers: {
          Authorization: `Bearer infip-c5d4def5`,
          "Content-Type": "application/json",
        },
        timeout: 120000 // 2 minute timeout
      }
    );

    console.log("✅ Imagen 4 generation successful");
    
    // Return response in both formats for compatibility
    res.status(200).json({
      ...response.data,
      // Add compatibility for old format
      data: response.data.images ? response.data.images.map(url => ({ url })) : []
    });

  } catch (error) {
    console.error("❌ Error generating image with Imagen 4:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      res.status(401).json({ error: "API authentication failed" });
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ error: "Request timeout. Please try again." });
    } else {
      res.status(500).json({ error: "Image generation failed." });
    }
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Nishad Image Generator - Imagen 4 Only",
    model: "Imagen 4 (img4)",
    status: "healthy"
  });
});

// Ping endpoint
app.get("/ping", (req, res) => {
  res.json({ 
    status: "alive", 
    model: "Imagen 4",
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎯 Model: Imagen 4 (img4) Only`);
  console.log(`🔑 API Key: ${process.env.API_KEY ? "Configured" : "Missing"}`);
});

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
  const { prompt, model = "img4", size = "1024x1024", num_images = 1 } = req.body;

  console.log(`🎨 Generating image with ${model}, size: ${size}`);
  console.log(`📝 Prompt: "${prompt}"`);

  try {
    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      { 
        prompt: prompt.trim(), 
        model, 
        size, 
        num_images: 1  // Always request 1 image from API
      },
      {
        headers: {
          Authorization: `Bearer infip-c5d4def5`,
          "Content-Type": "application/json",
        },
        timeout: 120000
      }
    );

    console.log("✅ API Response:", response.data);
    
    // Return response in multiple formats for compatibility
    res.status(200).json({
      ...response.data,
      // Add backward compatibility
      data: response.data.images ? response.data.images.map(url => ({ url })) : []
    });

  } catch (error) {
    console.error("❌ Error generating image:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Image generation failed",
      details: error.response?.data || error.message
    });
  }
});

app.get("/", (req, res) => {
  res.send("Nishad Image Generator backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

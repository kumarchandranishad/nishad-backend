const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Image generation endpoint
app.post("/generate", async (req, res) => {
  const { prompt, model = "img4", size = "1024x1024", num_images = 1 } = req.body;

  try {
    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      { prompt, model, size, num_images },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error generating image:", error.response?.data || error.message);
    res.status(500).json({ error: "Image generation failed." });
  }
});

// Image download proxy endpoint (for working downloads)
app.get("/download-image", async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "URL required" });
  }
  
  try {
    console.log(`📥 Proxying download for: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Set headers for forced download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `nishad-ai-image-${timestamp}.png`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Pipe the image stream to response
    response.data.pipe(res);
    
  } catch (error) {
    console.error("Download proxy error:", error.message);
    res.status(500).json({ error: "Download failed" });
  }
});

app.get("/", (req, res) => {
  res.send("Nishad Image Generator backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`📥 Download proxy available at /download-image`);
});

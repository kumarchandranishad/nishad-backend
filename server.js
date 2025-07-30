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

  console.log(`🎨 Generating ${num_images} image(s) with ${model}, size: ${size}`);

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

    console.log(`✅ API Response:`, response.data);
    console.log(`✅ Successfully generated ${response.data.images?.length || 0} image(s)`);
    
    // Return response with both formats for compatibility
    res.status(200).json({
      ...response.data,
      // Add backward compatibility
      data: response.data.images ? response.data.images.map(url => ({ url })) : []
    });

  } catch (error) {
    console.error("❌ Error generating image:", error.response?.data || error.message);
    res.status(500).json({ error: "Image generation failed." });
  }
});

app.get("/", (req, res) => {
  res.send("Nishad Image Generator backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

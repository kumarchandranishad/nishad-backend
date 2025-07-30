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

  console.log(`🎨 API Request - Prompt: "${prompt}"`);
  console.log(`🎨 API Request - Model: ${model}`);
  console.log(`🎨 API Request - Size: ${size}`);
  console.log(`🎨 API Request - Num Images: ${num_images}`);

  try {
    const apiPayload = {
      prompt: prompt.trim(),
      model: model,
      size: size,
      num_images: parseInt(num_images)
    };

    console.log("📤 Sending to API:", apiPayload);

    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      apiPayload,
      {
        headers: {
          Authorization: `Bearer infip-c5d4def5`,
          "Content-Type": "application/json",
        },
        timeout: 180000 // 3 minutes
      }
    );

    console.log("📥 Raw API Response:", JSON.stringify(response.data, null, 2));

    // Check response format and return accordingly
    if (response.data) {
      res.status(200).json(response.data);
    } else {
      console.error("❌ Empty API response");
      res.status(500).json({ 
        error: "Empty response from API",
        debug: response.data 
      });
    }

  } catch (error) {
    console.error("❌ API Error Details:");
    console.error("Status:", error.response?.status);
    console.error("Headers:", error.response?.headers);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
    
    res.status(500).json({ 
      error: "API call failed",
      status: error.response?.status,
      details: error.response?.data || error.message
    });
  }
});

// Test endpoint to check exact API response
app.post("/test-generate", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.infip.pro/v1/images/generations",
      {
        prompt: "A beautiful sunset",
        model: "img4",
        size: "1024x1024",
        num_images: 2
      },
      {
        headers: {
          Authorization: `Bearer infip-c5d4def5`,
          "Content-Type": "application/json",
        }
      }
    );

    res.json({
      status: "Test successful",
      response: response.data
    });
  } catch (error) {
    res.status(500).json({
      status: "Test failed",
      error: error.response?.data || error.message
    });
  }
});

app.get("/", (req, res) => {
  res.send("Nishad Image Generator backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

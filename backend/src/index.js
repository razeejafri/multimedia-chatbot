// server.js
import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";

dotenv.config();

/* ---------------- MongoDB Connection ---------------- */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ---------------- Constants ---------------- */
const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY
const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- Routes ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

/* ---------------- Gemini Response Formatter ---------------- */
const formatGeminiResponse = (response) => {
  if (!response || typeof response !== "string") return { text_content: "", logo_content: "" };

  // Split lines and remove empty lines
  const lines = response.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  let logo_content = "";
  const textParts = [];

  lines.forEach((line, index) => {
    // Assume first line is logo if it matches some pattern or you can customize
    if (index === 0 && line.match(/^[A-Z\s]+$/)) {
      logo_content = line;
      return;
    }

    // Split line into math and text blocks
    const regex = /\$(.+?)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const beforeMath = line.slice(lastIndex, match.index).trim();
      if (beforeMath) textParts.push(beforeMath);

      // Add math content with $...$ preserved
      textParts.push(`$${match[1]}$`);
      lastIndex = match.index + match[0].length;
    }

    const after = line.slice(lastIndex).trim();
    if (after) textParts.push(after);
  });

  return {
    text_content: textParts.join("\n"), // Combine lines into single string with newlines
    logo_content,
  };
};


/* ---------------- Google Gemini Helper ---------------- */
const askGoogle = async (input) => {
  const model = "gemini-2.5-flash";
  const contents =
    typeof input === "string"
      ? [{ role: "user", parts: [{ text: input }] }]
      : [{ role: "user", parts: input }];

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );

  const data = await resp.json();
  console.log("📩 Gemini API Response:", JSON.stringify(data, null, 2));

  // Handle network or API-level errors
  if (!resp.ok) {
    console.error("❌ Gemini API Error:", data);
    throw new Error(`Gemini API error: ${data.error?.message || "Unknown error"}`);
  }

  // ✅ Safely extract the model's text response
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const modelText = parts.map((p) => p.text).filter(Boolean).join("\n");

  // ✅ If Gemini didn't return text, fallback
  const rawText = modelText || "Sorry, I could not process your request.";

  // ✅ Return formatted text
  return formatGeminiResponse(rawText);
};


/* ---------------- Chat Endpoint ---------------- */
app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    const inputText = req.body.text?.trim() || "";
    const file = req.file;
    const parts = [];

    // Ensure at least one input type
    if (!inputText && !file) {
      return res.status(400).json({
        success: false,
        error: "Please provide text, image, or audio input.",
      });
    }

    // Add text input
    if (inputText) parts.push({ text: inputText });

    // Handle file input
    if (file) {
      const mime = file.mimetype;
      let base64Data;

      if (file.buffer) {
        base64Data = file.buffer.toString("base64");
      } else if (file.path) {
        const fileData = fs.readFileSync(file.path);
        base64Data = fileData.toString("base64");
        fs.unlinkSync(file.path);
      } else {
        return res.status(400).json({
          success: false,
          error: "Invalid file data received.",
        });
      }

      if (mime.startsWith("image/") || mime.startsWith("audio/")) {
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mime,
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "Unsupported file type. Only image or audio allowed.",
        });
      }
    }

    // Always pass 'parts' array to Gemini
    const response = await askGoogle(parts);

    res.json({
      success: true,
      input: inputText || (file ? file.originalname : "No input"),
      response, // now an array of { type, content }
    });
  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  }
});

/* ---------------- Healthcheck ---------------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok", provider: "google-gemini" });
});

/* ---------------- Start Server ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Gemini chatbot running on http://localhost:${PORT}`);
});

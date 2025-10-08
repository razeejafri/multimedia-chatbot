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
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- Routes ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

/* ---------------- Response Formatter ---------------- */
const formatGeminiResponse = (text) => {
  if (!text || typeof text !== "string") return [];

  // Split by paragraphs or lines
  const segments = text.split(/\n{2,}|\r?\n/).map((s) => s.trim()).filter(Boolean);

  const formatted = [];

  segments.forEach((segment) => {
    // Detect math blocks like $E=mc^2$
    const mathPattern = /\$(.+?)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = mathPattern.exec(segment)) !== null) {
      const before = segment.slice(lastIndex, match.index).trim();
      if (before) formatted.push({ type: "text", content: before });

      formatted.push({ type: "math", content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    const after = segment.slice(lastIndex).trim();
    if (after) formatted.push({ type: "text", content: after });
  });

  return formatted;
};

/* ---------------- Google Gemini Helper ---------------- */
const askGoogle = async (input) => {
  const model = "gemini-2.5-flash";

  const contents =
    typeof input === "string"
      ? [{ role: "user", parts: [{ text: input }] }]
      : [{ role: "user", parts: input }];

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GOOGLE_API_KEY, // ✅ safer than query param
      },
      body: JSON.stringify({ contents }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await resp.json();
  console.log("📩 Gemini API Response:", JSON.stringify(data, null, 2));

  // Collect all response parts (not just first)
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const combinedText = parts.map((p) => p.text || "").join("\n").trim();

  // Format into array [{type, content}]
  return formatGeminiResponse(combinedText);
};

/* ---------------- Chat Endpoint ---------------- */
app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    const inputText = req.body.text?.trim() || "";
    const file = req.file;
    const parts = [];

    if (!inputText && !file) {
      return res.status(400).json({
        success: false,
        error: "Please provide text, image, or audio input.",
      });
    }

    // Add user text
    if (inputText) parts.push({ text: inputText });

    // Add optional file input (image/audio)
    if (file) {
      const mime = file.mimetype;
      let base64Data;

      if (file.buffer) {
        base64Data = file.buffer.toString("base64");
      } else if (file.path) {
        const fileData = fs.readFileSync(file.path);
        base64Data = fileData.toString("base64");
        fs.unlinkSync(file.path);
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

    // Ask Gemini
    const response = await askGoogle(parts);

    res.json({
      success: true,
      input: inputText || (file ? file.originalname : "No input"),
      response, // [{ type, content }]
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

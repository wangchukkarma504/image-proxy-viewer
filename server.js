import fetch from "node-fetch";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Improved CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://fir-url-85c0f.web.app',
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// Preflight for /ai
app.options("/ai", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  res.status(204).end();
});

// AI route MUST be POST
app.post("/ai", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    let clientKey = req.headers["x-api-key"] || req.body.api_key;

    const serverKey = process.env.AI_ROUTE_KEY;
    if (!serverKey || clientKey !== serverKey) {
      return res.status(403).send("Forbidden: Invalid or missing API key");
    }

    if (!prompt) {
      return res.status(400).send("prompt parameter is required in JSON body");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).send("Gemini API key not set in environment");
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`);
    }

    const data = await geminiResponse.json();

    let output = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const origin = req.headers.origin;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.send(output);

  } catch (err) {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.status(500).send("AI Error: " + err.message);
  }
});

app.get("/", async (req, res) => {
  try {
    const imageUrl = req.query.image_url;
    if (!imageUrl) {
      return res.status(400).send("image_url parameter is required");
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://comick.live",  // for anti-hotlinking images
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");

    // ...existing code...

    // Stream for all clients (mobile and desktop)
    try {
      if (response.body && typeof response.body.pipe === 'function') {
        res.setHeader("Content-Type", contentType);
        response.body.pipe(res);
      } else if (response.body) {
        res.setHeader("Content-Type", contentType);
        const streamModule = await import('stream');
        const { Readable } = streamModule;
        Readable.fromWeb(response.body).pipe(res);
      } else {
        // Fallback: buffer
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader("Content-Type", contentType);
        res.send(buffer);
      }
    } catch (err) {
      console.error("Image streaming error:", err);
      res.status(500).send("Failed to stream image: " + err.message);
    }
  } catch (err) {
    res.status(500).send(`Failed to fetch image: ${err.message}`);
  }
});

app.get("/html", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).send("url parameter is required");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(html);

  } catch (err) {
    res.status(500).send(`Failed to fetch URL: ${err.message}`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on", port));
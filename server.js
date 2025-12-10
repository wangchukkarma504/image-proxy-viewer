import express from "express";
import sharp from "sharp";

const app = express();

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

    // Detect mobile User-Agent
    const userAgent = req.headers["user-agent"] || "";
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(userAgent);

    // If mobile, resize/compress image before sending
    if (isMobile) {
      // Get image buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      // Resize to max width 600px, compress to JPEG quality 70
      const processed = await sharp(buffer)
        .resize({ width: 600, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      res.setHeader("Content-Type", "image/jpeg");
      res.send(processed);
    } else {
      // Stream for desktop/other clients
      if (response.body && typeof response.body.pipe === 'function') {
        response.body.pipe(res);
      } else if (response.body) {
        const stream = require('stream');
        const { Readable } = stream;
        Readable.fromWeb(response.body).pipe(res);
      } else {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
      }
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
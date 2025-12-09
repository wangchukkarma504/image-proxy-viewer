import express from "express";

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

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);

  } catch (err) {
    res.status(500).send(`Failed to fetch image: ${err.message}`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on", port));
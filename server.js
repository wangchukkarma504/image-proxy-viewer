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
        "Referer": "https://comick.live", // anti-hotlinking bypass
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    const contentType =
      response.headers.get("content-type") || "image/jpeg";

    const html = `
      <html>
      <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;">
        <img src="data:${contentType};base64,${base64}" />
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    res.status(500).send(`Failed to fetch image: ${err.message}`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on", port));

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let igdbToken: string | null = null;
  let tokenExpiry = 0;

  async function getIgdbToken(clientId: string, clientSecret: string) {
    if (igdbToken && Date.now() < tokenExpiry) {
      return igdbToken;
    }
    
    const response = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch auth token from Twitch: ${text}`);
    }
    
    const data = await response.json();
    igdbToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    return igdbToken;
  }

  // API Route for IGDB Search
  app.post("/api/igdb/search", async (req, res) => {
    const envClientId = process.env.IGDB_CLIENT_ID;
    const envClientSecret = process.env.IGDB_CLIENT_SECRET;
    
    const fallbackClientId = "1t7kot4q2e1e7cvssvgqh9mgo3r1da";
    const fallbackClientSecret = "9p9zvqkjcbcy4970fytfm1yk30hgjm";

    let clientId = fallbackClientId;
    let accessToken: string;

    try {
      if (!envClientId || !envClientSecret || envClientId.trim() === "" || envClientSecret.trim() === "" || envClientId.includes("YOUR_")) {
        throw new Error("Environment variables are empty or contain placeholder values.");
      }
      // Try to authenticate using environment variables first
      accessToken = await getIgdbToken(envClientId, envClientSecret);
      clientId = envClientId;
    } catch (error) {
      console.warn("Failed to authorize with environmental keys, trying default fallback keys:", error);
      try {
        accessToken = await getIgdbToken(fallbackClientId, fallbackClientSecret);
        clientId = fallbackClientId;
      } catch (fallbackError: any) {
        return res.status(500).json({ error: `IGDB Authorization Error: ${fallbackError.message || fallbackError}` });
      }
    }

    try {
      const { query, year } = req.body;
      let conditions = ["cover != null"];
      
      // Removed category filtering because it seemed to filter out some main games like Laika
      
      if (query) {
        conditions.push(`name ~ *"${query.replace(/"/g, '')}"*`);
      }
      
      if (year) {
        const start = Math.floor(new Date(year, 0, 1).getTime() / 1000);
        const end = Math.floor(new Date(year, 11, 31, 23, 59, 59).getTime() / 1000);
        conditions.push(`first_release_date >= ${start}`);
        conditions.push(`first_release_date <= ${end}`);
      }

      const igdbBody = `fields name, cover.image_id, first_release_date, category; where ${conditions.join(" & ")}; sort total_rating_count desc; limit 40;`;

      const response = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Client-ID": clientId,
          "Authorization": `Bearer ${accessToken}`,
        },
        body: igdbBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("IGDB API Error:", response.statusText, errorText);
        return res.status(response.status).json({ error: `IGDB API Error: ${errorText || response.statusText}` });
      }

      let data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Use * for express 4, *all for express 5? Actually Express 4 is installed, so * is fine.
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

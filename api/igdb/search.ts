import type { VercelRequest, VercelResponse } from "@vercel/node";

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
  
  const data = (await response.json()) as { access_token: string; expires_in: number };
  igdbToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  return igdbToken;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const envClientId = process.env.IGDB_CLIENT_ID;
  const envClientSecret = process.env.IGDB_CLIENT_SECRET;
  
  const fallbackClientId = "1t7kot4q2e1e7cvssvgqh9mgo3r1da";
  const fallbackClientSecret = "9p9zvqkjcbcy4970fytfm1yk30hgjm";

  let clientId = fallbackClientId;
  let accessToken: string;

  try {
    if (!envClientId || !envClientSecret || envClientId.trim() === "" || envClientSecret.trim() === "" || envClientId.includes("YOUR_")) {
      throw new Error("Local/Vercel environmental credentials are empty or configured with placeholder values.");
    }
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
    const { query, year, isPokemonMode, searchKeyword } = (req.body || {}) as { query?: string; year?: number; isPokemonMode?: boolean; searchKeyword?: string };
    let conditions = ["cover != null"];
    
    if (isPokemonMode) {
      conditions.push("(name ~ *\"pokemon\"* | name ~ *\"pokémon\"*)");
    } else if (searchKeyword) {
      const keywords = String(searchKeyword).split(",").map((k: string) => k.trim()).filter(Boolean);
      if (keywords.length > 0) {
        const subConds = keywords.map((kw: string) => {
          const clean = kw.replace(/"/g, "");
          if (clean.toLowerCase() === "pokemon" || clean.toLowerCase() === "pokémon") {
            return "(name ~ *\"pokemon\"* | name ~ *\"pokémon\"*)";
          } else {
            return `name ~ *"${clean}"*`;
          }
        });
        conditions.push(`(${subConds.join(" | ")})`);
      }
    }
    
    if (query) {
      conditions.push(`name ~ *"${query.replace(/"/g, "")}"*`);
    }
    
    if (year) {
      const yearsList = String(year)
        .split(",")
        .map(y => parseInt(y.trim()))
        .filter(y => !isNaN(y) && y >= 1900 && y <= 2100);

      if (yearsList.length > 0) {
        const yearConditions = yearsList.map(y => {
          const start = Math.floor(new Date(y, 0, 1).getTime() / 1000);
          const end = Math.floor(new Date(y, 11, 31, 23, 59, 59).getTime() / 1000);
          return `(first_release_date >= ${start} & first_release_date <= ${end})`;
        });
        conditions.push(`(${yearConditions.join("|")})`);
      }
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

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

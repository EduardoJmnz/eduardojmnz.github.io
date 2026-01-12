import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { renderMapSvg } from "./renderMapSvg.js";

const app = express();

// --- CORS ---
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";
app.use(cors({
  origin: (origin, cb) => {
    if (!FRONTEND_ORIGIN) return cb(null, true); // dev / sin restricción
    if (!origin) return cb(null, true);
    if (origin === FRONTEND_ORIGIN) return cb(null, true);
    return cb(new Error("CORS blocked"), false);
  },
  credentials: true,
}));

// Para endpoints normales
// Para endpoints normales (NO webhook)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/billing/webhook") return next();
  return express.json({ limit: "1mb" })(req, res, next);
});


app.get("/health", (_req, res) => res.json({ ok: true }));

// -------------------- MAP RENDER (SVG) --------------------
app.post("/api/maps/render-svg", (req, res) => {
  try {
    const svg = renderMapSvg(req.body || {});
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(svg);
  } catch (e) {
    res.status(400).json({ error: e?.message || String(e) });
  }
});

// -------------------- SPOTIFY PROXY (si lo estás usando) --------------------
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiryMs = 0;

async function getSpotifyAppToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiryMs - 30_000) return cachedToken;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Faltan SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET en variables de entorno.");
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" });

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!r.ok) throw new Error("No pude obtener token Spotify: " + (await r.text()));
  const data = await r.json();

  cachedToken = data.access_token;
  tokenExpiryMs = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

app.get("/api/spotify/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Falta q" });

    const token = await getSpotifyAppToken();
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", q);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "8");

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return res.status(r.status).send(await r.text());

    const data = await r.json();
    const items = (data.tracks?.items || []).map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists?.map(a => a.name).join(", "),
      album: t.album?.name,
      image: t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || null,
      uri: t.uri,
    }));

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/api/spotify/code", async (req, res) => {
  try {
    const uri = String(req.query.uri || "").trim();
    if (!uri.startsWith("spotify:")) return res.status(400).json({ error: "uri inválido" });

    const colorBg = "000000";
    const colorCode = "white";
    const size = "640";

    const codeUrl = `https://scannables.scdn.co/uri/plain/svg/${colorBg}/${colorCode}/${size}/${encodeURIComponent(uri)}`;
    const r = await fetch(codeUrl);
    if (!r.ok) return res.status(r.status).send(await r.text());

    const svg = await r.text();
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(svg);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// -------------------- STRIPE (Checkout + Webhook) --------------------
// Requiere: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, FRONTEND_SUCCESS_URL, FRONTEND_CANCEL_URL
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "";
const FRONTEND_SUCCESS_URL = process.env.FRONTEND_SUCCESS_URL || "";
const FRONTEND_CANCEL_URL = process.env.FRONTEND_CANCEL_URL || "";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Crea sesión de checkout (redirect en frontend a session.url)
app.post("/api/billing/checkout-session", async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: "Stripe no configurado (STRIPE_SECRET_KEY)" });
    if (!STRIPE_PRICE_ID) return res.status(500).json({ error: "Falta STRIPE_PRICE_ID" });
    if (!FRONTEND_SUCCESS_URL || !FRONTEND_CANCEL_URL) {
      return res.status(500).json({ error: "Faltan FRONTEND_SUCCESS_URL / FRONTEND_CANCEL_URL" });
    }

    // Si tienes login, pon aquí tu userId y pásalo como client_reference_id / metadata
    const { customer_email } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: FRONTEND_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: FRONTEND_CANCEL_URL,
      customer_email: customer_email || undefined,
      metadata: {
        product: "skymap",
      },
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Webhook necesita raw body
app.post("/api/billing/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      if (!stripe) return res.status(500).send("Stripe no configurado");
      if (!STRIPE_WEBHOOK_SECRET) return res.status(500).send("Falta STRIPE_WEBHOOK_SECRET");

      const sig = req.headers["stripe-signature"];
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
      }

      // IMPORTANT: aquí es donde debes guardar en BD que el usuario pagó / asignar créditos.
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log("✅ Pago completado:", session.id, session.customer_email, session.metadata);
      }

      res.json({ received: true });
    } catch (e) {
      res.status(500).send(e?.message || String(e));
    }
  }
);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Backend OK http://localhost:${PORT}`));

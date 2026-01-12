import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { renderMapSVG } from "./mapGenerator.js";

const app = express();

// CORS (en prod, pon FRONTEND_ORIGIN)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";
app.use(cors({
  origin: FRONTEND_ORIGIN ? [FRONTEND_ORIGIN] : true,
}));

// Webhook necesita raw body
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret || !stripeKey){
    return res.status(500).send('Stripe no configurado');
  }
  const stripe = new Stripe(stripeKey);
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], stripeSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  // TODO: aquí guardas en DB y asignas créditos.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('✅ Pago completado:', { id: session.id, email: session.customer_details?.email, amount_total: session.amount_total });
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req,res)=>res.json({ ok:true }));

// ---------- Spotify proxy (igual que tu server.js, pero en backend dedicado) ----------
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiryMs = 0;

async function getAppToken(){
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Faltan SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET');
  }
  const now = Date.now();
  if (cachedToken && now < tokenExpiryMs - 30_000) return cachedToken;

  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!r.ok) throw new Error('No pude obtener token Spotify: ' + (await r.text()));
  const data = await r.json();
  cachedToken = data.access_token;
  tokenExpiryMs = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

app.get('/api/spotify/search', async (req,res)=>{
  try{
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error:'Falta q' });
    const token = await getAppToken();
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'track');
    url.searchParams.set('limit', '8');

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return res.status(r.status).send(await r.text());
    const data = await r.json();
    const items = (data.tracks?.items || []).map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists?.map(a => a.name).join(', '),
      album: t.album?.name,
      image: t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || null,
      uri: t.uri,
    }));
    res.json({ items });
  }catch(e){
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get('/api/spotify/code', async (req,res)=>{
  try{
    const uri = String(req.query.uri || '').trim();
    if (!uri.startsWith('spotify:')) return res.status(400).json({ error:'uri inválido' });

    const colorBg = '000000';
    const colorCode = 'white';
    const size = '640';
    const codeUrl = `https://scannables.scdn.co/uri/plain/svg/${colorBg}/${colorCode}/${size}/${encodeURIComponent(uri)}`;
    const r = await fetch(codeUrl);
    if (!r.ok) return res.status(r.status).send(await r.text());
    const svg = await r.text();
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  }catch(e){
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ---------- Map render (SVG) ----------
app.post('/api/maps/render-svg', (req,res)=>{
  try{
    const svg = renderMapSVG(req.body || {});
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  }catch(e){
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ---------- Stripe Checkout (skeleton) ----------
app.post('/api/billing/checkout-session', async (req,res)=>{
  try{
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!stripeKey || !priceId || !successUrl || !cancelUrl){
      return res.status(500).json({ error:'Faltan STRIPE_SECRET_KEY / STRIPE_PRICE_ID / STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL' });
    }

    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // metadata: { userId: '...' }
    });

    res.json({ url: session.url });
  }catch(e){
    res.status(500).json({ error: e.message || String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Backend OK http://localhost:${PORT}`));

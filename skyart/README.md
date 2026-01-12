# Sky Art Creator — Frontend + Backend

Este repo separa **Frontend (estático)** y **Backend (Node/Express)** para:
- No exponer el algoritmo de generación del mapa en el navegador.
- Tener una API para **Stripe** y (si aplica) proxy de **Spotify**.

## Estructura

- `frontend/public` → sitio estático (Render Static Site)
- `backend` → Node/Express (Render Web Service)

---

## Local (desarrollo)

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Variables (opcional según lo uses):

- `FRONTEND_ORIGIN=http://localhost:5173` (o el origen del frontend)
- Spotify:
  - `SPOTIFY_CLIENT_ID=...`
  - `SPOTIFY_CLIENT_SECRET=...`
- Stripe:
  - `STRIPE_SECRET_KEY=sk_live_...` (o test)
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `STRIPE_PRICE_ID=price_...`
  - `FRONTEND_SUCCESS_URL=http://localhost:5173/success`
  - `FRONTEND_CANCEL_URL=http://localhost:5173/`

### 2) Frontend

Para local, puedes servirlo con cualquier server estático. Ejemplos:

```bash
cd frontend/public
python3 -m http.server 5173
```

Luego abre: `http://localhost:5173`

En `frontend/public/config.js` pon:

```js
window.SKymapConfig = { apiBase: "http://localhost:3000" };
```

---

## Render (deploy)

### Backend (Web Service)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Variables (Environment):
  - `FRONTEND_ORIGIN=https://TU-FRONT.onrender.com`
  - (Spotify/Stripe si aplica)

### Frontend (Static Site)
- Publish directory: `frontend/public`
- **No build command necesario** (es estático)
- Edita `frontend/public/config.js` y define:
  - `apiBase: "https://TU-BACK.onrender.com"`

---

## Endpoints

- `POST /api/maps/render-svg` → devuelve un SVG del mapa (lo dibuja el frontend en el canvas).
- `POST /api/billing/checkout-session` → crea checkout session y regresa `{ url }`.
- `POST /api/billing/webhook` → webhook de Stripe (aquí debes guardar en BD el pago y otorgar acceso/créditos).
- `GET /api/spotify/search` y `GET /api/spotify/code` → proxy Spotify (opcional).

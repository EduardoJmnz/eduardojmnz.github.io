# SkyMap (Front + Back)

## Estructura
- `frontend/public`: sitio estático (HTML/JS)
- `backend`: API Node/Express (Render)

## Local
### 1) Backend
```bash
cd backend
npm i
export SPOTIFY_CLIENT_ID=...
export SPOTIFY_CLIENT_SECRET=...
# Stripe (opcional)
export STRIPE_SECRET_KEY=...
export STRIPE_PRICE_ID=...
export STRIPE_SUCCESS_URL=http://localhost:5173/#success
export STRIPE_CANCEL_URL=http://localhost:5173/#cancel
export STRIPE_WEBHOOK_SECRET=...
# CORS (opcional)
export FRONTEND_ORIGIN=http://localhost:5173
npm start
```

### 2) Frontend
Edita `frontend/public/config.js`:
```js
window.SKymapConfig = { apiBase: "http://localhost:3000" };
```

Luego:
```bash
cd frontend
npm run dev
```
Abre `http://localhost:5173`.

## Deploy en Render
### Backend (Web Service)
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Env Vars:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `FRONTEND_ORIGIN` = tu dominio del frontend en Render
  - Stripe (si usarás pagos):
    - `STRIPE_SECRET_KEY`
    - `STRIPE_PRICE_ID`
    - `STRIPE_SUCCESS_URL` (URL del frontend /success)
    - `STRIPE_CANCEL_URL`
    - `STRIPE_WEBHOOK_SECRET`

### Frontend (Static Site)
- Root Directory: `frontend/public`
- Publish Directory: `.`
- (Sin build command)

Luego, en el frontend, actualiza `config.js` con la URL del backend en Render.

> Nota: Para Stripe webhook en Render, configura el endpoint:
> `https://TU_BACKEND.onrender.com/api/billing/webhook`

# Our Kitchen

Shared recipe manager for Kievz and Lauren.

## Features
- Recipe storage with full nutritional info (carbs, sugar, calories, protein)
- Portion scaling — all macros recalculate automatically
- Per-ingredient quantity adjustment
- Allergen flagging (Lauren: gluten · Kievz: lactose)
- Import from recipe URLs (og:image + JSON-LD scraper + Claude AI)
- Import from YouTube (transcript extraction + Claude parsing)
- TikTok reference saving (thumbnail + manual entry)
- Voice input (Web Speech API + Claude structuring)
- Ingredient database via Open Food Facts + barcode scanning
- Custom ingredient library
- PWA — installs to iPhone home screen

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
ANTHROPIC_API_KEY=your_key python app.py
```
Runs on http://localhost:5000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173 (proxies /api to :5000)

## Environment Variables
- `ANTHROPIC_API_KEY` — required for YouTube/voice/URL import AI parsing

## Deployment (Render)
1. Push to GitHub
2. New Blueprint → point to repo
3. Render reads `render.yaml` and creates both services
4. Add `ANTHROPIC_API_KEY` to the API service env vars
5. Note the API URL and update the frontend proxy in `render.yaml`

## Database
SQLite at `backend/our_kitchen.db` (local) or `/data/our_kitchen.db` (Render with persistent disk).

Default profiles are seeded on first run:
- Kievz (allergens: lactose)
- Lauren (allergens: gluten)

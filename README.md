# Το σπίτι της γριάς: Halloween QR hunt

A personal party game for friends. Players scan 5 hidden QR codes with their phone camera. Progress is shared by everyone, and the admin page broadcasts scares to every phone.

## Run locally

```bash
npm install
npm run dev
```

- Player: http://localhost:5199/?c=gria-k7q2 (the start code)
- Admin: http://localhost:5199/grimoire.html (PIN-protected; the hash is in `src/config.ts`)

Live: https://nikonakkan.github.io/halloween-hunt/ (deployed by GitHub Actions on every push to `main`).
Set `FIREBASE_CONFIG` to null in `src/config.ts` to sync only between tabs of one browser.

## Edit

- Story text and QR codes: `src/content.ts`
- Firebase config and admin PIN: `src/config.ts`
- Sounds: `public/sounds/` (CC0, see `CREDITS.md`). To change one, replace the file and keep the name. Switch to `scream-alt.ogg` by renaming it to `scream.ogg`.

## Check

```bash
npm run check
```

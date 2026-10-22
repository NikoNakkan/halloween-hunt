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

## GRANDDAUGHTER quiz

A live Halloween quiz at `/granddaughter/` (password **GRANDDAUGHTER**, or **ΕΓΓΟΝΗ**, which the hunt reveals at the end; the old `/nephew/` link redirects). Everyone votes as one team, and
the majority answer is the team's pick. Wrong picks trigger a jumpscare.

- Players: https://nikonakkan.github.io/halloween-hunt/granddaughter/
- Admin: https://nikonakkan.github.io/halloween-hunt/granddaughter/crypt.html (same PIN as the hunt)
- Questions: `src/quiz/questions.ts` (the first answer is the correct one; the game shuffles them)
- Keep the admin page open during a game, because it triggers the reveal when time runs out.

## Check

```bash
npm run check
```

## Cursed tape video (dev tool, not deployed)

`tape/` renders a 9-second analog-horror clip (VHS effects over public-domain
*The Skeleton Dance* footage from Wikimedia Commons, ending on grandma's face).

1. Put the 480p 16mm print from Commons in `tape/footage/skeleton-dance-16mm-480p.webm`.
2. Run `node node_modules/vite/bin/vite.js --config tape/vite.config.ts` and open http://localhost:5198.
3. In the console, run `await tape.render()`. The result goes to `tape/out/cursed-tape.webm`.

Shots, timings and texts are in `tape/src/timeline.ts`.

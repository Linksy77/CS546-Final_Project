# Noise Complaint Detective

Noise Complaint Detective is a Node.js/Express + Handlebars app that lets users view, browse, submit, and co‑sign noise complaints in the New York City area, while tracking neighborhood noise patterns and quiet scores backed by MongoDB data.

## Authors
- DJ Gereski - dgereski@stevens.edu (GitHub username: Toweringg)
- Yaseen Ismail - yismail@stevens.edu (GitHub username: YaseenFire12)
- Cecilia Esteban - cesteba1@stevens.edu (GitHub username: Linksy77)
- Rebecca Kaspar - rkaspar@stevens.edu (GitHub username: rkaspar123)

## Prerequisites
- Node.js 18+ and npm
- MongoDB running locally (defaults to `mongodb://localhost:27017/Noise-Complaint-Detective`)

## Install dependencies
```bash
npm i zod mongodb express bcryptjs express-session express-handlebars
```

## Seeding data
For convenience we've put all of our seed scripts into one easy seed command. However, if you'd rather run each seed one by one, those commands will be given, in order, as well. 
### Seed all at once command:
> [!WARNING]
> One of the seed scripts (import-311-complaints) is pulling and seeding over 750,000 noise complaints (that's just the complaints from 2025) so this script will take ~15 minutes to complete seeding to avoid any kind of rate limiting. It may be worth letting this seed in the background while you complete another task! 
```bash
npm run seed-all
```
### Seeding one by one (skip if you already seeded with the above seed-all command):
1) Sample users (drops/reseeds the users collection with demo accounts)  
```bash
npm run users-seed
```
2) Seeds the neighborhood database with all the neighborhoods of NYC
```bash
npm run neighborhood-seed
```
3) Pulls all the noise complaints from 2025 from the 311 noise complaints database into our database. **This will take a while, there are more than 750,000 noise complaints being seeded here, expect this to take ~15 minutes**.
```bash
npm run import-311-complaints
```

4) Recalculate neighborhood stats with the newley seeded complaints (quiet scores, personalities, peaks, etc.)  
```bash
npm run recalculate-stats
```

## Start the site
```bash
npm start
```
Then open http://localhost:3000 and enjoy!

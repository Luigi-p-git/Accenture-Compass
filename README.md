# Compass App

Internal setup instructions for sharing this app through git and running locally.

## Prerequisites

- Node.js 20+
- npm 10+

## Quick Start (Teammates)

```bash
git clone <internal-repo-url>
cd compass
npm install
npm run dev -- -p 4000
```

Open http://localhost:4000.

## Environment Variables

- Do not commit secret values.
- If this project requires local env vars, create `.env.local` from `.env.example`.
- Keep `.env.local` out of git.

## Common Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

To keep local usage consistent across the team, prefer:

```bash
npm run dev -- -p 4000
```

## Troubleshooting

- Port already in use: run on a different port, for example `npm run dev -- -p 4001`.
- Clean install if dependencies are corrupted:

```bash
rm -rf node_modules package-lock.json
npm install
```

PowerShell equivalent:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

# Fortnite Sprite Tracker

<<<<<<< HEAD
Static personal tracker for Fortnite Sprites, including Base, Gold, Gummy, Galaxy, Holofoil, Gem, and custom/future Sprites.

## What is included


- Static website ready for GitLab Pages.
- Pink / purple / blue / teal UI.
- Editable acquired status.
- Editable level 0–5.
- Search and filters for status, rarity, and variant.
- Holofoil and Gem tracker entries.
- Custom Sprite creator for newly released/missing Sprites.
- Image URL editor per Sprite.
- Notes field per Sprite.
- Browser auto-save through `localStorage`.
- Export / import JSON backup.

## GitLab Pages deployment

1. Create a new GitLab project.
2. Upload this whole folder to the repository, keeping the `public/` folder and `.gitlab-ci.yml` at the repo root.
3. Commit and push to the default branch, usually `main`.
4. GitLab will run the Pages pipeline.
5. Open **Deploy > Pages** in GitLab to get your public website URL.

## Local testing


Open:

```text
public/index.html
```

No build step is required.

## Important storage note

The tracker saves your changes in the browser using `localStorage`. That means updates are stored on the device/browser you used. Use **Export JSON** regularly if you want a backup or if you want to import the same progress on another device.

## Adding new Sprites later

Use **+ Add future Sprite** inside the website. Add the name, variant, rarity, level, acquired status, and an image URL. The new entry is stored locally and included in exported JSON backups.

## Updating Sprite images

Each card has an **Edit image / notes** section. Paste a new image URL there when a new Sprite image becomes available. For a permanent repository-level change, put the image in `public/assets/` and use a path like:

```text
assets/my-new-sprite.png
```
=======
A static GitHub Pages site for tracking Fortnite Sprite collection progress and personal map locations.
>>>>>>> fbac270 (Update professional Fortnite Sprite Tracker website)

## Files

- `index.html` — Sprite collection tracker
- `map.html` — Interactive chest / gold fishing spot map
- `styles.css` — Pink, purple, blue, teal interface styling
- `app.js` — Tracker and map logic
- `data.js` — Default Sprite data from the latest backup
- `assets/` — Sprite images and current season map

## Deploy on GitHub Pages

Use repository root as the publishing source:

1. Go to **Settings → Pages**
2. Set **Source** to **Deploy from a branch**
3. Set **Branch** to `main`
4. Set **Folder** to `/ (root)`
5. Save

Your published URL should be:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## Backup

Use **Export JSON** before making major changes. The site stores changes in browser local storage, so exporting JSON is your portable backup.

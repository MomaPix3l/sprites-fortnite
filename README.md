# Fortnite Sprite Tracker

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

## Files

```text
.gitlab-ci.yml          GitLab Pages deployment config
public/index.html       Website page
public/styles.css       Pink/purple/blue/teal theme
public/app.js           Tracker logic
public/data.js          Starting Sprite list
public/assets/          Local fallback Sprite images
```

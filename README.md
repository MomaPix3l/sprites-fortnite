# Fortnite Sprite Tracker

Static GitHub Pages website for tracking Fortnite Sprites and personal map locations.

## Pages

- `index.html` — Sprite collection tracker.
- `map.html` — Interactive map tracker.

## Map tracker features

- Separate pins per season map.
- Add new season maps by uploading a map image.
- Built-in location types:
  - Sprite Chest — chest icon
  - Gold Fishing Hole — gold target icon
  - Regular Fishing Hole — blue target icon
- Custom location types for future Fortnite events.
- Show/hide filters by type, quality, and confirmed status.
- Upload a close-up screenshot per pin or use the automatic map crop.
- Export/import map JSON backups.

## GitHub Pages setup

Use repository root as the publish source:

Settings → Pages → Deploy from a branch → main → / root

Expected repo structure:

```text
assets/
index.html
map.html
styles.css
app.js
data.js
README.md
```

## Future updates

After replacing files locally:

```powershell
git add .
git commit -m "Update Fortnite Sprite Tracker"
git push origin main
```

Then wait for GitHub Pages deployment and hard-refresh the site with Ctrl+F5.

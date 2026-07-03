const STORAGE_KEY = "fortnite-sprite-tracker-v5-professional";
const MAP_STORAGE_KEY = "fortnite-sprite-tracker-map-pins-v2";

const $ = (id) => document.getElementById(id);
const clampLevel = (v) => Math.max(0, Math.min(5, Number(v) || 0));
const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;
const escapeHtml = (str) => String(str || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

let sprites = loadSprites();
let mapPins = loadMapPins();

function loadSprites(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(!saved) return structuredClone(DEFAULT_SPRITES);
  try{
    const parsed = JSON.parse(saved);
    const byId = new Map(parsed.map(s => [s.id, s]));
    return DEFAULT_SPRITES.map(base => ({...base, ...(byId.get(base.id) || {})}));
  } catch(e){
    return structuredClone(DEFAULT_SPRITES);
  }
}
function saveSprites(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(sprites)); }
function loadMapPins(){
  const saved = localStorage.getItem(MAP_STORAGE_KEY);
  if(!saved) return [];
  try{ const parsed = JSON.parse(saved); return Array.isArray(parsed) ? parsed : []; }
  catch(e){ return []; }
}
function saveMapPins(){ localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(mapPins)); }

function familyOrder(f){ return {Base:0, Gold:1, Gummy:2, Galaxy:3, Holofoil:4, Gem:5}[f] ?? 9; }
function downloadJson(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Sprite tracker page ----------
function initTrackerPage(){
  const grid = $("grid");
  const template = $("cardTemplate");
  if(!grid || !template) return;

  const search = $("search");
  const filter = $("filter");
  const rarity = $("rarity");
  const variant = $("variant");

  function updateStats(){
    const acquired = sprites.filter(s => s.acquired).length;
    const maxed = sprites.filter(s => s.acquired && Number(s.level) === 5).length;
    const missing = sprites.length - acquired;
    const totalLevel = sprites.reduce((a, s) => a + (s.acquired ? Number(s.level || 0) : 0), 0);
    const maxTotal = sprites.length * 5;
    $("acquiredCount").textContent = acquired;
    $("maxedCount").textContent = maxed;
    $("missingCount").textContent = missing;
    $("totalLevel").textContent = totalLevel;
    $("progressTitle").textContent = `${acquired} / ${sprites.length} acquired`;
    $("progressText").textContent = `Level progress: ${pct(totalLevel, maxTotal)}%`;
    $("progressFill").style.width = `${pct(totalLevel, maxTotal)}%`;
    const families = ["Base", "Gold", "Gummy", "Galaxy", "Holofoil", "Gem"];
    $("variantSummary").innerHTML = families.map(f => {
      const items = sprites.filter(s => s.variantFamily === f);
      const got = items.filter(s => s.acquired).length;
      return `<span class="pill">${f}: <strong>${got}/${items.length}</strong></span>`;
    }).join("");
  }

  function filteredSprites(){
    const q = search.value.trim().toLowerCase();
    return sprites.filter(s => {
      if(q && !(`${s.name} ${s.baseName} ${s.variantFamily} ${s.rarity}`.toLowerCase().includes(q))) return false;
      if(filter.value === "acquired" && !s.acquired) return false;
      if(filter.value === "missing" && s.acquired) return false;
      if(filter.value === "maxed" && !(s.acquired && Number(s.level) === 5)) return false;
      if(filter.value === "notmaxed" && !(s.acquired && Number(s.level) < 5)) return false;
      if(rarity.value !== "all" && s.rarity !== rarity.value) return false;
      if(variant.value !== "all" && s.variantFamily !== variant.value) return false;
      return true;
    }).sort((a,b) => (a.sortGroup - b.sortGroup) || familyOrder(a.variantFamily) - familyOrder(b.variantFamily) || a.id - b.id);
  }

  function renderTracker(){
    updateStats();
    const list = filteredSprites();
    grid.innerHTML = "";
    if(!list.length){ grid.innerHTML = '<div class="empty">No sprites match this filter.</div>'; return; }
    for(const s of list){
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = s.id;
      node.classList.toggle("missing", !s.acquired);
      node.querySelector(".number").textContent = String(s.id).padStart(2,"0");
      const rarityEl = node.querySelector(".rarity"); rarityEl.textContent = s.rarity; rarityEl.classList.add(s.rarity);
      const wrap = node.querySelector(".image-wrap"); wrap.dataset.variant = s.variantFamily;
      const img = node.querySelector(".sprite-img");
      img.src = s.image || s.fallbackImage || "";
      img.alt = s.name;
      img.onerror = () => {
        if(s.fallbackImage && img.src.indexOf(s.fallbackImage) === -1){ img.src = s.fallbackImage; }
      };
      node.querySelector("h2").textContent = s.name;
      const vt = node.querySelector(".variant-tag"); vt.textContent = s.variantFamily; vt.classList.add(s.variantFamily);
      node.querySelector(".base-tag").textContent = s.baseName;
      const acquired = node.querySelector(".acquired"); acquired.checked = !!s.acquired;
      const level = node.querySelector(".level"); level.value = String(clampLevel(s.level));
      node.querySelector(".level-pill").textContent = `Lvl ${clampLevel(s.level)}`;
      const notes = node.querySelector(".notes"); notes.value = s.notes || "";
      acquired.addEventListener("change", () => { s.acquired = acquired.checked; if(!s.acquired) s.level = 0; saveSprites(); renderTracker(); });
      level.addEventListener("change", () => { s.level = clampLevel(level.value); if(s.level > 0) s.acquired = true; saveSprites(); renderTracker(); });
      node.querySelector(".minus").addEventListener("click", () => { s.level = clampLevel(Number(s.level) - 1); if(s.level === 0) s.acquired = false; saveSprites(); renderTracker(); });
      node.querySelector(".plus").addEventListener("click", () => { s.level = clampLevel(Number(s.level) + 1); if(s.level > 0) s.acquired = true; saveSprites(); renderTracker(); });
      notes.addEventListener("input", () => { s.notes = notes.value; saveSprites(); });
      grid.appendChild(node);
    }
  }

  [search, filter, rarity, variant].forEach(el => el.addEventListener("input", renderTracker));
  $("showMissingBtn").addEventListener("click", () => { filter.value = "missing"; renderTracker(); });
  $("showNeedsBtn").addEventListener("click", () => { filter.value = "notmaxed"; renderTracker(); });
  $("showAllBtn").addEventListener("click", () => { filter.value = "all"; rarity.value = "all"; variant.value = "all"; search.value = ""; renderTracker(); });
  $("resetBtn").addEventListener("click", () => { if(confirm("Reset tracker to the starting data?")){ localStorage.removeItem(STORAGE_KEY); sprites = structuredClone(DEFAULT_SPRITES); renderTracker(); } });
  $("exportBtn").addEventListener("click", () => downloadJson({version:5, exportedAt:new Date().toISOString(), app:"fortnite-sprite-tracker-github-v5", sprites, mapPins}, "fortnite-sprite-tracker-full-backup.json"));
  $("importFile").addEventListener("change", async e => {
    const file = e.target.files[0]; if(!file) return;
    try{
      const data = JSON.parse(await file.text());
      const spriteData = Array.isArray(data) ? data : data.sprites;
      if(!Array.isArray(spriteData)) throw new Error("Invalid file");
      const byId = new Map(spriteData.map(s => [s.id, s]));
      sprites = DEFAULT_SPRITES.map(base => ({...base, ...(byId.get(base.id) || {})}));
      if(Array.isArray(data.mapPins)){ mapPins = data.mapPins; saveMapPins(); }
      saveSprites(); renderTracker();
    }catch(err){ alert("Could not import this JSON file."); }
    e.target.value = "";
  });

  renderTracker();
}

// ---------- Interactive map page ----------
function initMapPage(){
  const mapScroll = $("mapScroll");
  const mapStage = $("mapStage");
  const seasonMap = $("seasonMap");
  const pinLayer = $("pinLayer");
  if(!mapScroll || !mapStage || !seasonMap || !pinLayer) return;

  let addingPin = false;
  let selectedPinId = null;
  let pendingCloseupData = null;
  let mapZoomValue = 1;
  let showMapLabels = true;

  const uid = () => `pin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clampPercent = (v) => Math.max(0, Math.min(100, Number(v) || 0));
  const pinDisplayName = (pin) => pin.name || pin.type || "Sprite";

  function renderMapPins(){
    pinLayer.innerHTML = "";
    $("pinCount").textContent = mapPins.length;
    $("bestPinCount").textContent = mapPins.filter(p => p.quality === "Best").length;
    for(const pin of mapPins){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `map-pin ${pin.color || "blue"} ${selectedPinId === pin.id ? "selected" : ""} ${showMapLabels ? "" : "hide-label"}`;
      btn.style.left = `${pin.x}%`;
      btn.style.top = `${pin.y}%`;
      btn.title = `${pinDisplayName(pin)}${pin.area ? " — " + pin.area : ""}`;
      btn.innerHTML = `<span class="pin-dot"></span><span class="pin-label">${escapeHtml(pinDisplayName(pin))}</span>`;
      btn.addEventListener("click", ev => { ev.stopPropagation(); selectPin(pin.id); });
      pinLayer.appendChild(btn);
    }
  }
  function setAddMode(on){
    addingPin = on;
    $("addPinModeBtn").textContent = on ? "Click map to place pin" : "Add pin by clicking map";
    $("addModeLabel").textContent = on ? "Add mode active" : "Click “Add pin” first";
    $("addModeLabel").classList.toggle("active", on);
    mapScroll.classList.toggle("adding", on);
  }
  function setCloseupPreview(src){
    const prev = $("closeupPreview");
    prev.innerHTML = src ? `<img src="${src}" alt="Pin close-up preview" />` : `<span>No close-up yet. Auto-crop will be created from the map when you save.</span>`;
  }
  function clearPinForm(){
    selectedPinId = null; pendingCloseupData = null;
    $("pinFormTitle").textContent = "Add / Edit Map Pin";
    $("editingPinId").value = "";
    $("pinName").value = "Sprite";
    $("pinType").value = "Sprite chest";
    $("pinArea").value = "";
    $("pinQuality").value = "Best";
    $("pinX").value = "";
    $("pinY").value = "";
    $("pinColor").value = "blue";
    $("pinConfirmed").checked = false;
    $("pinNotes").value = "";
    $("pinCloseup").value = "";
    setCloseupPreview(null);
    renderMapPins();
  }
  function selectPin(id){
    const pin = mapPins.find(p => p.id === id); if(!pin) return;
    selectedPinId = id; pendingCloseupData = null;
    $("pinFormTitle").textContent = "Editing Map Pin";
    $("editingPinId").value = pin.id;
    $("pinName").value = pin.name || "Sprite";
    $("pinType").value = pin.type || "Sprite chest";
    $("pinArea").value = pin.area || "";
    $("pinQuality").value = pin.quality || "Best";
    $("pinX").value = Number(pin.x).toFixed(2);
    $("pinY").value = Number(pin.y).toFixed(2);
    $("pinColor").value = pin.color || "blue";
    $("pinConfirmed").checked = !!pin.confirmed;
    $("pinNotes").value = pin.notes || "";
    setCloseupPreview(pin.closeup || null);
    renderMapPins();
  }
  function placePinFromClick(ev){
    if(!addingPin) return;
    const rect = seasonMap.getBoundingClientRect();
    const x = clampPercent(((ev.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((ev.clientY - rect.top) / rect.height) * 100);
    $("pinX").value = x.toFixed(2);
    $("pinY").value = y.toFixed(2);
    setAddMode(false);
  }
  function getPinFromForm(){
    return {
      id: $("editingPinId").value || uid(),
      name: $("pinName").value.trim() || "Sprite",
      type: $("pinType").value,
      area: $("pinArea").value.trim(),
      quality: $("pinQuality").value,
      x: clampPercent($("pinX").value),
      y: clampPercent($("pinY").value),
      color: $("pinColor").value,
      confirmed: $("pinConfirmed").checked,
      notes: $("pinNotes").value.trim(),
      closeup: pendingCloseupData || null,
      updatedAt: new Date().toISOString()
    };
  }
  function ensureImageLoaded(img){ return img.complete && img.naturalWidth ? Promise.resolve() : new Promise(res => img.addEventListener("load", res, {once:true})); }
  async function createMapCropDataUrl(xPct, yPct){
    await ensureImageLoaded(seasonMap);
    const canvas = document.createElement("canvas");
    const cropSize = 360; canvas.width = cropSize; canvas.height = cropSize;
    const ctx = canvas.getContext("2d");
    const naturalX = (xPct / 100) * seasonMap.naturalWidth;
    const naturalY = (yPct / 100) * seasonMap.naturalHeight;
    const side = Math.min(seasonMap.naturalWidth, seasonMap.naturalHeight) * 0.28;
    const sx = Math.max(0, Math.min(seasonMap.naturalWidth - side, naturalX - side / 2));
    const sy = Math.max(0, Math.min(seasonMap.naturalHeight - side, naturalY - side / 2));
    ctx.fillStyle = "#07101d"; ctx.fillRect(0, 0, cropSize, cropSize);
    ctx.drawImage(seasonMap, sx, sy, side, side, 0, 0, cropSize, cropSize);
    const cx = ((naturalX - sx) / side) * cropSize;
    const cy = ((naturalY - sy) / side) * cropSize;
    ctx.strokeStyle = "#16f0d0"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 32, cy); ctx.lineTo(cx + 32, cy); ctx.moveTo(cx, cy - 32); ctx.lineTo(cx, cy + 32); ctx.stroke();
    return canvas.toDataURL("image/png");
  }
  async function savePinFromForm(){
    const pin = getPinFromForm();
    if(!$("pinX").value || !$("pinY").value){ alert("Click the map or enter X/Y percentages first."); return; }
    const existing = mapPins.find(p => p.id === pin.id);
    if(existing && !pin.closeup) pin.closeup = existing.closeup || null;
    if(!pin.closeup) pin.closeup = await createMapCropDataUrl(pin.x, pin.y);
    const idx = mapPins.findIndex(p => p.id === pin.id);
    if(idx >= 0) mapPins[idx] = {...mapPins[idx], ...pin}; else mapPins.push(pin);
    saveMapPins(); selectPin(pin.id);
  }
  function deleteSelectedPin(){
    const id = $("editingPinId").value;
    if(!id){ clearPinForm(); return; }
    if(!confirm("Delete this map pin?")) return;
    mapPins = mapPins.filter(p => p.id !== id);
    saveMapPins(); clearPinForm(); renderMapPins();
  }
  function setMapZoom(v){
    mapZoomValue = Math.max(1, Math.min(3, Number(v) || 1));
    $("mapZoom").value = String(mapZoomValue);
    mapStage.style.width = `${mapZoomValue * 100}%`;
  }
  function exportMapPins(){ downloadJson({version:1, exportedAt:new Date().toISOString(), mapPins}, "fortnite-map-pins-backup.json"); }
  async function importMapPinsFile(e){
    const file = e.target.files[0]; if(!file) return;
    try{
      const data = JSON.parse(await file.text());
      const pins = Array.isArray(data) ? data : data.mapPins;
      if(!Array.isArray(pins)) throw new Error("Invalid map pin backup");
      mapPins = pins; saveMapPins(); clearPinForm(); renderMapPins();
    }catch(err){ alert("Could not import this map JSON file."); }
    e.target.value = "";
  }

  $("addPinModeBtn").addEventListener("click", () => setAddMode(!addingPin));
  $("clearPinFormBtn").addEventListener("click", clearPinForm);
  $("savePinBtn").addEventListener("click", savePinFromForm);
  $("deletePinBtn").addEventListener("click", deleteSelectedPin);
  $("exportMapBtn").addEventListener("click", exportMapPins);
  $("importMapFile").addEventListener("change", importMapPinsFile);
  $("resetMapBtn").addEventListener("click", () => { if(confirm("Delete every map pin?")){ mapPins = []; saveMapPins(); clearPinForm(); renderMapPins(); } });
  $("mapZoom").addEventListener("input", e => setMapZoom(e.target.value));
  $("zoomOutBtn").addEventListener("click", () => setMapZoom(mapZoomValue - .2));
  $("zoomInBtn").addEventListener("click", () => setMapZoom(mapZoomValue + .2));
  $("toggleLabelsBtn").addEventListener("click", () => { showMapLabels = !showMapLabels; renderMapPins(); });
  mapStage.addEventListener("click", placePinFromClick);
  $("pinCloseup").addEventListener("change", async e => {
    const file = e.target.files[0]; if(!file) return;
    pendingCloseupData = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    setCloseupPreview(pendingCloseupData);
  });

  let dragging = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
  mapScroll.addEventListener("mousedown", e => { if(addingPin || e.target.closest(".map-pin")) return; dragging = true; startX = e.pageX; startY = e.pageY; scrollLeft = mapScroll.scrollLeft; scrollTop = mapScroll.scrollTop; mapScroll.style.cursor = "grabbing"; });
  window.addEventListener("mouseup", () => { dragging = false; mapScroll.style.cursor = addingPin ? "crosshair" : ""; });
  mapScroll.addEventListener("mousemove", e => { if(!dragging) return; e.preventDefault(); mapScroll.scrollLeft = scrollLeft - (e.pageX - startX); mapScroll.scrollTop = scrollTop - (e.pageY - startY); });

  setMapZoom(1);
  renderMapPins();
}

initTrackerPage();
initMapPage();

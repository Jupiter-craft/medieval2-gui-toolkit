/* =========================================================================
   Armory Studio - the kitbash workbench, a tab of the Models Editor (Phase 95e on)

   A port of the behaviour of Armory Studio 3D (muhamadridhomm, MIT) onto this
   toolkit: no three.js, no code of his, none of his art. One model is built out
   of the parts of others.

     * an ASSET is a model loaded to take parts from: a model entry or a unit's
       models out of any installed mod, or a .obj/.glb/.dae on disk;
     * an OBJECT is one part of the model being edited: one group of an asset,
       with what was done to it (moved, renamed, hidden, recoloured);
     * the PROJECT is the assets and the objects, kept in config/armory/ and
       never a copy of anyone's art: the export (95i) reads each source again.

   The page draws with ONE WebGL context on a canvas that is never on the page:
   it draws the viewport and copies it into the viewport's own 2D canvas, and it
   draws each object's thumbnail the same way. Both WebGL traps of this UI apply
   (memory: requestAnimationFrame never fires in a hidden tab, and loseContext is
   final): a frame is asked for, not looped, and a lost context is rebuilt.
   ========================================================================= */

const ARM = {
  gl: null, glCanvas: null, prog: null,
  assets: new Map(),      // key -> {view, geo, buf, tex, img, uScale, err, loading}
  cam: {yaw: 0.6, pitch: 0.25, dist: 4, target: [0, 1, 0]},
  hover: null, sel: new Set(),
  frameAsked: false, catalogue: {}, mods: null,
  thumbs: new Map(),      // "<asset>|<group>" -> dataURL
  saveTimer: 0, loaded: false,
};

const ARM_VERT = `
attribute vec3 aPos; attribute vec3 aNormal; attribute vec2 aUv;
uniform mat4 uProj, uView, uModel;
varying vec3 vNormal; varying vec2 vUv;
void main(){
  vNormal = mat3(uModel) * aNormal;
  vUv = aUv;
  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
}`;
const ARM_FRAG = `
precision mediump float;
varying vec3 vNormal; varying vec2 vUv;
uniform sampler2D uTex;
uniform float uHasTex, uUScale, uHi, uSel, uFlip, uXray;
uniform vec4 uCrop;
${V3_ENV}
void main(){
  // uCrop: a dyed object's own crop of the sheet, (x, y, width, height)
  // in the glued image's 0..1; the whole sheet otherwise
  vec2 st = (vec2(vUv.x * uUScale, vUv.y) - uCrop.xy) / uCrop.zw;
  vec4 base = uHasTex > 0.5 ? texture2D(uTex, st) : vec4(0.72, 0.66, 0.56, 1.0);
  if(uHasTex > 0.5 && base.a < 0.35) discard;
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : uFlip);
  vec3 light = v3Env(n) * 0.62 + vec3(1.0, 0.96, 0.9) * 0.5 * max(dot(n, normalize(vec3(0.4, 0.8, 0.5))), 0.0)
             + vec3(0.62, 0.7, 0.85) * 0.2 * max(dot(n, normalize(vec3(-0.6, 0.2, -0.7))), 0.0);
  vec3 col = pow(clamp(base.rgb * light, 0.0, 1.0), vec3(0.78));
  col = mix(col, vec3(0.36, 0.55, 0.94), uHi * 0.28);
  col = mix(col, vec3(0.97, 0.62, 0.18), uSel * 0.30);
  // face orientation, Blender's colours: blue the front, red the back
  if(uFlip < 0.0) col = mix(col, gl_FrontFacing ? vec3(0.2, 0.4, 1.0) : vec3(1.0, 0.15, 0.15), 0.55);
  gl_FragColor = vec4(col, uXray > 0.5 ? 0.45 : 1.0);
}`;

/* --- the project ----------------------------------------------------------- */

function armProj(){
  const p = state.armProj = state.armProj || {};
  // an empty project comes back from the server as {}; fill what it lacks
  if(!p.v){ Object.assign(p, {v: 1, assets: p.assets || [], objects: p.objects || [],
                              collections: p.collections || [], base: p.base || null}); }
  if(!Number.isFinite(p.nextId)){
    // ids lost to that (95e saved null ones) are given back in order
    let top = 0;
    for(const o of p.objects || []) if(Number.isFinite(o.id)) top = Math.max(top, o.id);
    for(const c of p.collections || []) if(Number.isFinite(c.id)) top = Math.max(top, c.id);
    p.nextId = top + 1;
    for(const o of p.objects || []) if(!Number.isFinite(o.id)) o.id = p.nextId++;
  }
  return p;
}
function armSave(){
  clearTimeout(ARM.saveTimer);
  ARM.saveTimer = setTimeout(() => {
    api.post('/api/armory/project', {project: armProj()}).catch(() => {});
  }, 600);
}
function armAssetKey(a){ return a.kind === 'external' ? 'ext|' + (a.path || '').toLowerCase() : `${a.mod}|${a.entry}`; }
function armAssetLabel(a){
  if(!a) return '';
  if(a.kind === 'external') return a.path.split(/[\\/]/).pop();
  return a.unit ? `${a.entry} · ${a.unit}` : a.entry;
}
function armObj(id){ return armProj().objects.find(o => o.id === id); }

/* --- the tab --------------------------------------------------------------- */

async function renderArmory(){
  count.textContent = '';
  if(!ARM.loaded){
    ARM.loaded = true;
    try{ state.armProj = await api.get('/api/armory/project'); }catch(e){ state.armProj = null; }
    const p = armProj();
    p.objects = p.objects || []; p.assets = p.assets || []; p.collections = p.collections || [];
    // 95e kept one source per object; an object holds pieces from 95f on
    for(const o of p.objects) if(!o.src){ o.src = [{asset: o.asset, group: o.group}]; delete o.asset; delete o.group; }
    if(stale('armory')) return;
    p.assets.forEach(a => armLoadAsset(a));
    armLoadPresets().then(() => { if(state.mode === 'armory') armPaintObjects(); });
  }
  main.innerHTML = bmdbTabsHtml(tt('armory.tab_note')) + `<div class="armgrid" id="armGrid">
    <aside class="armleft" id="armLeft"></aside>
    <section class="armmid">
      <div class="armbar" id="armBar"></div>
      <div class="armview" id="armView"></div>
      <div class="armfoot" id="armFoot"></div>
    </section>
    <aside class="armright" id="armRight"></aside>
  </div>`;
  armMountView();
  armPaintAssets();
  armPaintObjects();
  armPaintBar();
  armPaintFoot();
  armFrame();
}

function armPaintBar(){
  const el = document.getElementById('armBar');
  if(!el) return;
  const p = armProj();
  const tris = p.objects.filter(o => !o.hidden).reduce((s, o) => s + armObjTris(o), 0);
  el.innerHTML = `<b>${esc(p.name || tt('armory.untitled'))}</b>
    <span class="count">${tt('armory.bar_counts', {objects: p.objects.length, tris: tris.toLocaleString()})}</span>
    <span style="flex:1"></span>
    <button class="mini" onclick="armFrameAll()" title="${esc(tt('armory.frame_all_title'))}">${tt('armory.frame_all')}</button>
    <button class="mini" onclick="armNew()">${tt('armory.new_project')}</button>`;
}
function armPaintFoot(){
  const el = document.getElementById('armFoot');
  if(el && !el.dataset.filled){ el.dataset.filled = '1'; el.innerHTML = ''; }
}
function armObjTris(o){
  let n = 0;
  for(const pc of o.src || []){
    if(pc.tris){ n += pc.tris.length; continue; }
    const a = ARM.assets.get(pc.asset);
    const ob = a && a.view && a.view.objects[pc.group];
    n += ob ? ob.triangles : 0;
  }
  return n;
}
/* An object holds pieces: a whole group of an asset, or some of its
   triangles (a split, 95f), each with a matrix of its own once merged. */
const armUses = (o, key, group) => (o.src || []).some(pc => pc.asset === key && (group == null || pc.group === group));

function armNew(){
  if(armProj().objects.length && !confirm(tt('armory.new_project_confirm'))) return;
  state.armProj = null;
  ARM.sel.clear();
  armSave();
  renderArmory();
}

/* --- the assets panel ------------------------------------------------------ */

function armPaintAssets(){
  const el = document.getElementById('armLeft');
  if(!el) return;
  const p = armProj();
  const open = !(state.armUi && state.armUi.assetsShut);
  el.innerHTML = `<div class="armhead">
      <button class="armfold" onclick="armToggleAssets()">${open ? '▾' : '▸'} ${tt('armory.loaded_assets')}</button>
      <span class="count">${p.assets.length}</span>
      <span style="flex:1"></span>
      <button class="mini primary" onclick="armImportOpen()">${tt('armory.import')}</button>
    </div>
    ${open ? (p.assets.length ? p.assets.map(armAssetHtml).join('')
      : `<div class="empty armempty">${tt('armory.no_assets_yet')}</div>`) : ''}`;
  armThumbsPaint();
}
function armToggleAssets(){
  state.armUi = state.armUi || {};
  state.armUi.assetsShut = !state.armUi.assetsShut;
  armPaintAssets();
}

function armAssetHtml(a){
  const key = armAssetKey(a), live = ARM.assets.get(key) || {};
  const v = live.view;
  const open = !!a.open;
  const mode = a.show || 'list';
  let body = '';
  if(open){
    if(live.err) body = `<div class="w-bad armnote">${esc(live.err)}</div>`;
    else if(!v) body = `<div class="count armnote">${tt('armory.reading')}</div>`;
    else{
      const objs = v.objects.map(o => armAssetObjHtml(a, key, o, mode)).join('');
      body = `<div class="armobjtools">
          <button class="mini${mode === 'list' ? ' on' : ''}" onclick="armAssetShow('${esc(key)}','list')">${tt('armory.as_list')}</button>
          <button class="mini${mode === 'gallery' ? ' on' : ''}" onclick="armAssetShow('${esc(key)}','gallery')">${tt('armory.as_gallery')}</button>
          <span style="flex:1"></span>
          <button class="mini" onclick="armPullAll('${esc(key)}')" title="${esc(tt('armory.pull_all_title'))}">${tt('armory.pull_all')}</button>
        </div>
        ${armSkinPickHtml(a, key, v)}
        <div class="${mode === 'gallery' ? 'armtiles' : 'armrows'}">${objs}</div>`;
    }
  }
  const sub = a.kind === 'external' ? tt('armory.external_file') : esc(a.mod);
  const isBase = armProj().base === key;
  return `<div class="armasset${open ? ' open' : ''}">
    <div class="armassethead" onclick="armAssetToggle('${esc(key)}')">
      <span class="armcaret">${open ? '▾' : '▸'}</span>
      <span class="armname" title="${esc(a.kind === 'external' ? a.path : a.mesh || '')}">${esc(armAssetLabel(a))}</span>
      ${isBase ? `<span class="pill">${tt('armory.base')}</span>` : ''}
      <span class="count">${v ? ttN('armory.asset_sub', v.objects.length, {where: sub}) : sub}</span>
      <button class="mini armx" onclick="event.stopPropagation();armRemoveAsset('${esc(key)}')" title="${esc(tt('armory.remove_asset'))}">✕</button>
    </div>${body}</div>`;
}

function armSkinPickHtml(a, key, v){
  if(a.kind === 'external' || !v.skins || v.skins.length < 2) return '';
  return `<label class="count armskin">${tt('armory.skin')}
    <select onchange="armSetSkin('${esc(key)}', +this.value)">${v.skins.map((s, i) =>
      `<option value="${i}"${(a.skin || 0) === i ? ' selected' : ''}>${esc(v3SkinLabel(s))}</option>`).join('')}</select></label>`;
}

/* Two objects are the same art when their triangles hash the same, or when
   their triangle count, centre and spread agree to a tenth of a millimetre:
   the second catches a copy that went through an .obj's six decimals. */
function armSameArt(a, b){
  if(a.fingerprint === b.fingerprint) return true;
  const x = a.shape, y = b.shape;
  if(!x || !y || x[0] !== y[0] || !x[0]) return false;
  for(let i = 1; i < 5; i++) if(Math.abs(x[i] - y[i]) > 1e-4) return false;
  return true;
}
function armDupOf(key, ob){
  // the same triangles somewhere else already loaded
  const hits = [];
  for(const [k, live] of ARM.assets){
    if(k === key || !live.view) continue;
    for(const o of live.view.objects)
      if(armSameArt(o, ob)){ hits.push(`${o.mesh} · ${armAssetLabel(live.asset)}`); break; }
  }
  return hits;
}

function armAssetObjHtml(a, key, ob, mode){
  const inModel = armProj().objects.some(o => armUses(o, key, ob.index));
  const dups = armDupOf(key, ob);
  const sheet = ob.sheets === 'attach' ? tt('armory.sheet_attach') : ob.sheets === 'both' ? tt('armory.sheet_both') : tt('armory.sheet_main');
  const tex = a.kind === 'external'
    ? (armObjTexture(a, ob.index) ? '' : `<button class="mini" onclick="event.stopPropagation();armPickTexture('${esc(key)}',${ob.index})" title="${esc(tt('armory.no_texture_found'))}">🎨 ${tt('armory.pick_sheet')}</button>`)
    : '';
  const badge = dups.length ? `<span class="pill warn" title="${esc(tt('armory.duplicate_title', {where: dups.join(', ')}))}">${tt('armory.duplicate')}</span>` : '';
  const title = `${ob.name} / ${ob.mesh}${ob.flag ? ' (opt)' : ''}`;
  const tk = `${key}|${ob.index}`;
  if(mode === 'gallery')
    return `<div class="armtile${inModel ? ' in' : ''}" ondblclick="armPull('${esc(key)}',${ob.index})" title="${esc(title)}">
      <img class="armthumb" data-thumb="${esc(tk)}" alt="">
      <div class="armtilename">${esc(ob.mesh)}</div>
      <div class="armtilefoot">${badge}${tex}
        <button class="mini" onclick="armPull('${esc(key)}',${ob.index})">${inModel ? '✓' : tt('armory.pull')}</button></div>
    </div>`;
  return `<div class="armrow${inModel ? ' in' : ''}" ondblclick="armPull('${esc(key)}',${ob.index})">
    <span class="armrowname" title="${esc(title)}"><b>${esc(ob.name)}</b> ${esc(ob.mesh)}${ob.flag ? ` <i class="count">${tt('armory.opt')}</i>` : ''}</span>
    <span class="count">${ob.triangles.toLocaleString()} · ${sheet}</span>${badge}${tex}
    <button class="mini" onclick="armPull('${esc(key)}',${ob.index})">${inModel ? '✓' : tt('armory.pull')}</button>
  </div>`;
}

function armAssetToggle(key){
  const a = armProj().assets.find(x => armAssetKey(x) === key);
  if(!a) return;
  a.open = !a.open; armSave(); armPaintAssets();
}
function armAssetShow(key, mode){
  const a = armProj().assets.find(x => armAssetKey(x) === key);
  if(!a) return;
  a.show = mode; armSave(); armPaintAssets();
}
function armSetSkin(key, i){
  const a = armProj().assets.find(x => armAssetKey(x) === key);
  if(!a) return;
  a.skin = i; armSave();
  const live = ARM.assets.get(key);
  if(live) armLoadSkin(a, live);
}
function armRemoveAsset(key){
  const p = armProj();
  const used = p.objects.filter(o => armUses(o, key)).length;
  if(used && !confirm(ttN('armory.remove_asset_confirm', used))) return;
  p.objects = p.objects.filter(o => !armUses(o, key));
  p.assets = p.assets.filter(a => armAssetKey(a) !== key);
  if(p.base === key) p.base = null;
  const live = ARM.assets.get(key);
  if(live && live.buf && ARM.gl) armFreeBuffers(live);
  ARM.assets.delete(key);
  armSave(); armPaintAssets(); armPaintObjects(); armPaintBar(); armFrame();
}

/* --- pulling a part into the model ----------------------------------------- */

function armPull(key, group){
  const p = armProj();
  const live = ARM.assets.get(key);
  if(!live || !live.view) return;
  const ob = live.view.objects[group];
  if(p.objects.some(o => armUses(o, key, group))){
    toast(tt('armory.already_in_model', {name: ob.mesh}));
    return;
  }
  p.objects.push(armNewObject(key, ob));
  armSave(); armPaintAssets(); armPaintObjects(); armPaintBar(); armFrame();
}
function armNewObject(key, ob){
  const p = armProj();
  return {id: p.nextId++, src: [{asset: key, group: ob.index}], name: ob.name, mesh: ob.mesh,
          flag: ob.flag, hidden: false, coll: null, t: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1],
          material: '', dye: null};
}
function armPullAll(key){
  const live = ARM.assets.get(key);
  if(!live || !live.view) return;
  const p = armProj();
  let added = 0;
  for(const ob of live.view.objects){
    if(p.objects.some(o => armUses(o, key, ob.index))) continue;
    p.objects.push(armNewObject(key, ob)); added++;
  }
  toast(ttN('armory.pulled_n', added));
  armSave(); armPaintAssets(); armPaintObjects(); armPaintBar(); armFrameAll();
}

/* --- loading an asset ------------------------------------------------------ */

async function armLoadAsset(a){
  const key = armAssetKey(a);
  let live = ARM.assets.get(key);
  if(live && (live.view || live.loading)) return live;
  live = {asset: a, loading: true};
  ARM.assets.set(key, live);
  try{
    live.view = a.kind === 'external'
      ? await api.get('/api/armory/external?path=' + enc(a.path), 1)
      : await api.get(`/api/armory/asset?mod=${enc(a.mod)}&entry=${enc(a.entry)}`, 1);
    if(a.kind === 'external') a.id = live.view.id;
    const url = a.kind === 'external' ? '/api/armory/geometry?ext=' + enc(live.view.id)
      : `/api/model/geometry?mod=${enc(a.mod)}&entry=${enc(a.entry)}&lod=0`;
    const r = await fetch(url, {cache: 'no-store'});
    if(!r.ok) throw await httpAnswer(r);
    live.geo = v3Parse(await r.arrayBuffer());
    armUpload(live);
    armLoadSkin(a, live);
  }catch(e){ live.err = errText(e); }
  live.loading = false;
  if(state.mode === 'armory'){ armPaintAssets(); armPaintBar(); armFrame(); }
  return live;
}

/* Calls fn(vertex) for each index of a piece, every `step`-th one. */
function armPieceEach(live, pc, fn, step){
  const g = live.geo.groups[pc.group];
  if(!g) return;
  const I = live.geo.indices, k = step || 1;
  if(pc.tris){
    for(const t of pc.tris) for(let c = 0; c < 3; c += k) fn(I[g.start + t*3 + c]);
  }else for(let i = g.start; i < g.start + g.count; i += k) fn(I[i]);
}
/* An object's centre, which it turns and scales about: the mean of its
   pieces' indices where they stand, the way armory.object_mesh counts it. */
const ARM_PIVOT = new WeakMap();
function armPivot(o){
  const sig = JSON.stringify(o.src || []);
  const hit = ARM_PIVOT.get(o);
  if(hit && hit.sig === sig && hit.ready) return hit.p;
  let x = 0, y = 0, z = 0, n = 0, ready = true;
  for(const pc of o.src || []){
    const live = ARM.assets.get(pc.asset);
    if(!live || !live.geo){ ready = false; continue; }
    const P = live.geo.positions, m = pc.xf;
    armPieceEach(live, pc, v => {
      let px = P[v*3], py = P[v*3+1], pz = P[v*3+2];
      if(m){ const q = [m[0]*px + m[4]*py + m[8]*pz + m[12], m[1]*px + m[5]*py + m[9]*pz + m[13], m[2]*px + m[6]*py + m[10]*pz + m[14]]; px = q[0]; py = q[1]; pz = q[2]; }
      x += px; y += py; z += pz; n++;
    });
  }
  const p = n ? [x/n, y/n, z/n] : [0, 0, 0];
  ARM_PIVOT.set(o, {sig, p, ready});
  return p;
}
/* A split piece's own index buffer, made once per triangle list. */
const ARM_SUB = new WeakMap();
function armPieceBuffer(live, pc){
  let hit = ARM_SUB.get(pc);
  if(hit && hit.tris === pc.tris) return hit;
  const gl = armGl();
  const g = live.geo.groups[pc.group], I = live.geo.indices;
  const idx = new Uint16Array(pc.tris.length * 3);
  pc.tris.forEach((t, i) => { idx[i*3] = I[g.start + t*3]; idx[i*3+1] = I[g.start + t*3+1]; idx[i*3+2] = I[g.start + t*3+2]; });
  if(hit && hit.buf) gl.deleteBuffer(hit.buf);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  hit = {buf, count: idx.length, tris: pc.tris};
  ARM_SUB.set(pc, hit);
  return hit;
}

function armObjTexture(a, group){
  const over = (a.textures || {})[group];
  if(over) return over;
  const live = ARM.assets.get(armAssetKey(a));
  const ob = live && live.view && live.view.objects[group];
  return ob ? ob.texture_file || '' : '';
}

async function armPickTexture(key, group){
  const a = armProj().assets.find(x => armAssetKey(x) === key);
  if(!a) return;
  let r;
  try{ r = await api.post('/api/browse_file', {title: tt('armory.pick_sheet_title'),
    filter: 'Images|*.png;*.tga;*.dds;*.jpg;*.jpeg;*.texture;*.bmp'}); }
  catch(e){ toast(errText(e)); return; }
  if(!r || !r.path) return;
  const ok = await api.post('/api/armory/allow_texture', {path: r.path}).catch(() => ({}));
  if(!ok.ok){ toast(tt('armory.not_an_image')); return; }
  a.textures = a.textures || {};
  a.textures[group] = r.path;
  armSave();
  const live = ARM.assets.get(key);
  if(live) armLoadSkin(a, live);
  armPaintAssets();
}

function armImage(url){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(url));
    img.src = url;
  });
}

/* An entry's skin is its main and attachment sheets glued side by side, the
   way the game lays them out and the viewer draws them (viewer3d.js). An
   external model's objects each have their own sheet. */
async function armLoadSkin(a, live){
  const gl = armGl();
  if(!gl || !live.view) return;
  if(a.kind === 'external'){
    live.objTex = live.objTex || {};
    for(const ob of live.view.objects){
      const file = armObjTexture(a, ob.index);
      if(!file){ live.objTex[ob.index] = null; continue; }
      try{
        const img = await armImage('/api/armory/texture?path=' + enc(file));
        live.objTex[ob.index] = armTexture(img, 1);
        (live.objImg = live.objImg || {})[ob.index] = img;
      }catch(e){ live.objTex[ob.index] = null; }
    }
    armFrame(); armThumbsPaint(true);
    return;
  }
  const skin = (live.view.skins || [])[a.skin || 0];
  live.tex = null; live.uScale = 0.5;
  if(!skin || !skin.exists){ armFrame(); return; }
  const url = rel => `/model_texture?mod=${enc(a.mod)}&rel=${enc(rel)}`;
  try{
    const main = await armImage(url(skin.rel));
    const same = skin.attach && skin.attach.toLowerCase() === skin.rel.toLowerCase();
    let img = main;
    if(skin.attach && skin.attach_exists && !same){
      try{ img = v3Atlas(main, await armImage(url(skin.attach))); }catch(e){ img = main; }
    }else if(skin.attach && !same){
      live.uScale = 1.0;       // named and not here: the game repeats the main sheet
    }
    if(same) live.uScale = 1.0;
    live.tex = armTexture(img, live.uScale);
    live.img = img;
  }catch(e){ live.tex = null; }
  armFrame(); armThumbsPaint(true);
}

/* --- GL -------------------------------------------------------------------- */

function armGl(){
  if(ARM.gl && !ARM.gl.isContextLost()) return ARM.gl;
  const c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  const gl = c.getContext('webgl', {antialias: true, alpha: false, preserveDrawingBuffer: true});
  if(!gl) return null;
  c.addEventListener('webglcontextlost', e => { e.preventDefault(); });
  c.addEventListener('webglcontextrestored', () => {
    ARM.gl = null; armGl();
    for(const live of ARM.assets.values()){ live.buf = null; if(live.geo) armUpload(live); armLoadSkin(live.asset, live); }
    armFrame();
  });
  ARM.glCanvas = c; ARM.gl = gl;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, ARM_VERT));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, ARM_FRAG));
  gl.linkProgram(p);
  ARM.prog = p;
  ARM.loc = {};
  for(const n of ['aPos', 'aNormal', 'aUv']) ARM.loc[n] = gl.getAttribLocation(p, n);
  for(const n of ['uProj', 'uView', 'uModel', 'uTex', 'uHasTex', 'uUScale', 'uHi', 'uSel', 'uFlip', 'uXray', 'uCrop'])
    ARM.loc[n] = gl.getUniformLocation(p, n);
  gl.enable(gl.DEPTH_TEST);
  return gl;
}

function armUpload(live){
  const gl = armGl();
  if(!gl || !live.geo) return;
  const g = live.geo;
  const mk = (data, type) => { const b = gl.createBuffer(); gl.bindBuffer(type, b); gl.bufferData(type, data, gl.STATIC_DRAW); return b; };
  live.buf = {
    pos: mk(g.positions, gl.ARRAY_BUFFER),
    nrm: mk(g.normals || new Float32Array(g.vertices * 3), gl.ARRAY_BUFFER),
    uv: mk(g.uvs || new Float32Array(g.vertices * 2), gl.ARRAY_BUFFER),
    idx: mk(g.indices, gl.ELEMENT_ARRAY_BUFFER),
  };
}
function armFreeBuffers(live){
  const gl = ARM.gl;
  if(!gl || !live.buf) return;
  for(const b of Object.values(live.buf)) gl.deleteBuffer(b);
  live.buf = null;
}
function armTexture(img, uScale){
  const gl = armGl();
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  const pot = n => n > 0 && (n & (n - 1)) === 0;
  if(pot(img.width) && pot(img.height)){
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }else{
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  return t;
}

/* --- matrices -------------------------------------------------------------- */

function armMul(a, b){
  const o = new Array(16).fill(0);
  for(let c = 0; c < 4; c++) for(let r = 0; r < 4; r++){
    let s = 0;
    for(let k = 0; k < 4; k++) s += a[k*4 + r] * b[c*4 + k];
    o[c*4 + r] = s;
  }
  return o;
}
const armTrans = (x, y, z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
const armScale = (x, y, z) => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
function armRot(rx, ry, rz){
  const d = Math.PI / 180;
  const [a, b, c] = [rx*d, ry*d, rz*d];
  const X = [1,0,0,0, 0,Math.cos(a),Math.sin(a),0, 0,-Math.sin(a),Math.cos(a),0, 0,0,0,1];
  const Y = [Math.cos(b),0,-Math.sin(b),0, 0,1,0,0, Math.sin(b),0,Math.cos(b),0, 0,0,0,1];
  const Z = [Math.cos(c),Math.sin(c),0,0, -Math.sin(c),Math.cos(c),0,0, 0,0,1,0, 0,0,0,1];
  return armMul(Z, armMul(Y, X));
}
/* An object's matrix in the game's own space: about its pivot, scale, then
   turn, then move. The page mirrors x once on top, as the viewer does. */
function armObjMatrix(o, pivot){
  const [px, py, pz] = pivot || [0, 0, 0];
  let m = armTrans(-px, -py, -pz);
  m = armMul(armScale(o.s[0], o.s[1], o.s[2]), m);
  m = armMul(armRot(o.r[0], o.r[1], o.r[2]), m);
  m = armMul(armTrans(px + o.t[0], py + o.t[1], pz + o.t[2]), m);
  return m;
}
const ARM_MIRROR = [-1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

/* --- the viewport ---------------------------------------------------------- */

function armMountView(){
  const host = document.getElementById('armView');
  if(!host) return;
  if(!ARM.view){
    ARM.view = document.createElement('canvas');
    ARM.view.className = 'armcanvas';
    armInstallControls(ARM.view);
  }
  host.appendChild(ARM.view);
  if(!ARM.resizeObs){
    ARM.resizeObs = new ResizeObserver(() => armFrame());
  }
  ARM.resizeObs.disconnect();
  ARM.resizeObs.observe(host);
}

function armFrame(){
  if(ARM.frameAsked) return;
  ARM.frameAsked = true;
  const go = () => { ARM.frameAsked = false; armDraw(); };
  // requestAnimationFrame never fires in a hidden tab (memory: two WebGL
  // traps); a draw asked for there waits for the tab to come back
  if(document.hidden){
    const back = () => { document.removeEventListener('visibilitychange', back); go(); };
    document.addEventListener('visibilitychange', back);
  }else requestAnimationFrame(go);
}

function armVisibleObjects(){
  // the detail view (armobj.js) shows its one object and nothing else
  if(ARM.detail) return armProj().objects.filter(o => o.id === ARM.detail.id);
  return armProj().objects.filter(o => !o.hidden && !armCollHidden(o));
}
function armCollHidden(o){
  if(!o.coll) return false;
  const c = armProj().collections.find(x => x.id === o.coll);
  return !!(c && c.hidden);
}

function armBounds(objs){
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for(const o of objs){
    const om = armObjMatrix(o, armPivot(o));
    for(const pc of o.src || []){
      const live = ARM.assets.get(pc.asset);
      if(!live || !live.geo) continue;
      const m = pc.xf ? armMul(om, pc.xf) : om;
      const P = live.geo.positions;
      armPieceEach(live, pc, v => {
        const x = P[v*3], y = P[v*3+1], z = P[v*3+2];
        const w = [m[0]*x + m[4]*y + m[8]*z + m[12], m[1]*x + m[5]*y + m[9]*z + m[13], m[2]*x + m[6]*y + m[10]*z + m[14]];
        for(let k = 0; k < 3; k++){ if(w[k] < lo[k]) lo[k] = w[k]; if(w[k] > hi[k]) hi[k] = w[k]; }
      }, 3);
    }
  }
  return lo[0] === Infinity ? null : [lo, hi];
}
function armFrameAll(){
  const b = armBounds(armVisibleObjects());
  if(b){
    const [lo, hi] = b;
    ARM.cam.target = [-(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    ARM.cam.dist = Math.max(0.5, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) * 1.15);
  }
  armFrame();
}

function armCamera(aspect){
  const c = ARM.cam;
  const eye = [c.target[0] + c.dist * Math.cos(c.pitch) * Math.sin(c.yaw),
               c.target[1] + c.dist * Math.sin(c.pitch),
               c.target[2] + c.dist * Math.cos(c.pitch) * Math.cos(c.yaw)];
  return {proj: c.ortho ? armOrtho(c.dist, aspect) : v3Perspective(0.75, aspect, Math.max(0.01, c.dist / 200), c.dist * 20),
          view: v3LookAt(eye, c.target, [0, 1, 0]), eye};
}
function armOrtho(dist, aspect){
  const h = dist * 0.42, w = h * aspect, n = -dist * 20, f = dist * 20;
  return [1/w,0,0,0, 0,1/h,0,0, 0,0,-2/(f-n),0, 0,0,-(f+n)/(f-n),1];
}

/* Draws into the shared context, at `w` x `h`, the objects given. */
function armRender(objs, w, h, cam, opts){
  const gl = armGl();
  if(!gl) return false;
  const o = opts || {};
  if(ARM.glCanvas.width < w || ARM.glCanvas.height < h){
    ARM.glCanvas.width = Math.max(ARM.glCanvas.width, w);
    ARM.glCanvas.height = Math.max(ARM.glCanvas.height, h);
  }
  gl.viewport(0, ARM.glCanvas.height - h, w, h);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, ARM.glCanvas.height - h, w, h);
  const bg = o.bg || [0.16, 0.18, 0.21];
  gl.clearColor(bg[0], bg[1], bg[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(ARM.prog);
  const L = ARM.loc;
  gl.uniformMatrix4fv(L.uProj, false, new Float32Array(cam.proj));
  gl.uniformMatrix4fv(L.uView, false, new Float32Array(cam.view));
  gl.uniform1f(L.uFlip, o.faceOrient ? -1 : 1);
  if(!o.plain && ARM.xray){ gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
  for(const ob of objs){
    const om = armMul(ARM_MIRROR, armObjMatrix(ob, armPivot(ob)));
    for(const pc of ob.src || []){
      const live = ARM.assets.get(pc.asset);
      if(!live || !live.buf || !live.geo) continue;
      const g = live.geo.groups[pc.group];
      if(!g) continue;
      gl.uniformMatrix4fv(L.uModel, false, new Float32Array(pc.xf ? armMul(om, pc.xf) : om));
      // a dyed object draws from its own crop of the sheet (armobj.js)
      const dyed = typeof armDyedTexture === 'function' ? armDyedTexture(ob, pc) : null;
      const tex = dyed ? dyed.tex : live.objTex ? live.objTex[pc.group] : live.tex;
      gl.uniform1f(L.uHasTex, tex ? 1 : 0);
      gl.uniform1f(L.uUScale, live.objTex ? 1.0 : (live.uScale || 0.5));
      gl.uniform4fv(L.uCrop, dyed ? dyed.crop : [0, 0, 1, 1]);
      if(tex){ gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(L.uTex, 0); }
      gl.uniform1f(L.uHi, !o.plain && ARM.hover === ob.id ? 1 : 0);
      gl.uniform1f(L.uSel, !o.plain && ARM.sel.has(ob.id) ? 1 : 0);
      gl.uniform1f(L.uXray, !o.plain && ARM.xray ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, live.buf.pos);
      gl.enableVertexAttribArray(L.aPos); gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, live.buf.nrm);
      gl.enableVertexAttribArray(L.aNormal); gl.vertexAttribPointer(L.aNormal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, live.buf.uv);
      gl.enableVertexAttribArray(L.aUv); gl.vertexAttribPointer(L.aUv, 2, gl.FLOAT, false, 0, 0);
      if(pc.tris){
        const sub = armPieceBuffer(live, pc);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sub.buf);
        gl.drawElements(gl.TRIANGLES, sub.count, gl.UNSIGNED_SHORT, 0);
      }else{
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, live.buf.idx);
        gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_SHORT, g.start * 2);
      }
    }
  }
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND); gl.depthMask(true);
  return true;
}

function armDraw(){
  const view = ARM.view;
  if(!view || !view.isConnected || state.mode !== 'armory') return;
  const r = view.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(64, Math.round(r.width * dpr)), h = Math.max(64, Math.round(r.height * dpr));
  if(view.width !== w || view.height !== h){ view.width = w; view.height = h; }
  const cam = armCamera(w / h);
  if(!armRender(armVisibleObjects(), w, h, cam, {faceOrient: ARM.faceOrient})) return;
  const ctx = view.getContext('2d');
  ctx.drawImage(ARM.glCanvas, 0, 0, w, h, 0, 0, w, h);
  if(typeof armOverlay === 'function') armOverlay(ctx, w, h, cam);
}

/* --- thumbnails ------------------------------------------------------------ */

function armThumbsPaint(fresh){
  if(fresh) ARM.thumbs.clear();
  const imgs = document.querySelectorAll('img.armthumb[data-thumb]');
  if(!imgs.length) return;
  const S = 128;
  for(const img of imgs){
    const k = img.dataset.thumb;
    if(ARM.thumbs.has(k)){ img.src = ARM.thumbs.get(k); continue; }
    const cut = k.lastIndexOf('|');
    const key = k.slice(0, cut), group = +k.slice(cut + 1);
    const live = ARM.assets.get(key);
    if(!live || !live.geo || !live.buf) continue;
    const ob = {id: -1, src: [{asset: key, group}], t: [0,0,0], r: [0,0,0], s: [1,1,1]};
    const b = armBounds([ob]);
    if(!b) continue;
    const [lo, hi] = b;
    const target = [-(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    const dist = Math.max(0.05, Math.hypot(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]) * 1.1);
    const eye = [target[0] + dist * 0.55, target[1] + dist * 0.25, target[2] + dist * 0.8];
    const cam = {proj: v3Perspective(0.75, 1, dist / 100, dist * 10), view: v3LookAt(eye, target, [0, 1, 0])};
    if(!armRender([ob], S, S, cam, {plain: true, bg: [0.21, 0.24, 0.28]})) return;
    const c = document.createElement('canvas'); c.width = c.height = S;
    c.getContext('2d').drawImage(ARM.glCanvas, 0, 0, S, S, 0, 0, S, S);
    const url = c.toDataURL('image/jpeg', 0.82);
    ARM.thumbs.set(k, url);
    img.src = url;
  }
  armFrame();
}

/* --- viewport controls (95g makes them Blender's) -------------------------- */

function armInstallControls(c){
  let drag = null;
  c.tabIndex = 0;
  c.addEventListener('pointerdown', e => {
    c.focus({preventScroll: true});
    if(typeof armPointerDown === 'function' && armPointerDown(e)) return;
    drag = {x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, button: e.button, moved: false};
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', e => {
    if(!drag){ if(typeof armHoverAt === 'function') armHoverAt(e); return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if(Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 3) drag.moved = true;
    drag.x = e.clientX; drag.y = e.clientY;
    if(drag.button === 0 && typeof armBoxDrag === 'function' && armBoxDrag(drag, e)) return;
    if(!drag.moved) return;
    if(drag.button === 1 && e.shiftKey || drag.button === 2) armPan(dx, dy);
    else if(drag.button === 0 || drag.button === 1){
      ARM.cam.yaw -= dx * 0.01;
      ARM.cam.pitch = Math.max(-1.5, Math.min(1.5, ARM.cam.pitch + dy * 0.01));
    }
    armFrame();
  });
  c.addEventListener('pointerup', e => {
    const d = drag; drag = null;
    if(!d) return;
    if(d.box && typeof armBoxEnd === 'function'){ armBoxEnd(d, e); return; }
    if(!d.moved && d.button === 0 && typeof armClick === 'function') armClick(e);
  });
  c.addEventListener('pointerleave', () => { if(typeof armHoverAt === 'function') armHoverAt(null); });
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('wheel', e => {
    e.preventDefault();
    ARM.cam.dist = Math.max(0.05, ARM.cam.dist * Math.exp(e.deltaY * 0.0012));
    armFrame();
  }, {passive: false});
}
function armPan(dx, dy){
  const c = ARM.cam;
  const k = c.dist * 0.0016;
  const right = [Math.cos(c.yaw), 0, -Math.sin(c.yaw)];
  const up = [-Math.sin(c.pitch) * Math.sin(c.yaw), Math.cos(c.pitch), -Math.sin(c.pitch) * Math.cos(c.yaw)];
  for(let i = 0; i < 3; i++) c.target[i] += (-dx * right[i] + dy * up[i]) * k;
}

/* --- the import dialog ----------------------------------------------------- */

async function armImportOpen(){
  state.armImp = state.armImp || {tab: 'mod', mod: state.src, by: 'units', q: '', picked: new Set(), path: ''};
  const imp = state.armImp;
  if(!imp.picked) imp.picked = new Set();
  if(!ARM.mods){
    try{ ARM.mods = (await api.get('/api/mods')).map(m => m.name); }catch(e){ ARM.mods = [state.src]; }
  }
  armImportPaint();
  overlay.classList.add('open');
  if(imp.tab === 'mod') armImportCatalogue();
}

function armImportPaint(){
  const imp = state.armImp;
  document.getElementById('modal').className = 'modal wide';
  modal.innerHTML = `<div class="armimp">
    <h3>${tt('armory.import_title')}</h3>
    <div class="mftabs">
      <button class="mftab${imp.tab === 'mod' ? ' on' : ''}" onclick="armImportTab('mod')">${tt('armory.from_a_mod')}</button>
      <button class="mftab${imp.tab === 'file' ? ' on' : ''}" onclick="armImportTab('file')">${tt('armory.from_a_file')}</button>
      <button class="mftab${imp.tab === 'library' ? ' on' : ''}" onclick="armImportTab('library')">${tt('armory.from_the_library')}</button>
    </div>
    <div id="armImpBody">${armImportBodyHtml()}</div>
    <div class="armimpfoot">
      <span class="count" id="armImpCount"></span><span style="flex:1"></span>
      <button onclick="closeModal()">${tt('common.close')}</button>
      <button class="primary" id="armImpGo" onclick="armImportGo()">${tt('armory.import')}</button>
    </div></div>`;
  armImportCount();
}
function armImportTab(t){ state.armImp.tab = t; armImportPaint(); if(t === 'mod') armImportCatalogue(); }

function armImportBodyHtml(){
  const imp = state.armImp;
  if(imp.tab === 'file')
    return `<div class="count" style="margin:8px 0">${tt('armory.file_intro')}</div>
      <div class="armpathrow"><input id="armImpPath" value="${esc(imp.path || '')}" placeholder="${esc(tt('armory.file_placeholder'))}"
        oninput="state.armImp.path=this.value">
      <button onclick="armImportBrowse()">${tt('armory.browse')}</button></div>`;
  if(imp.tab === 'library')
    return `<div id="armLibPick">${typeof armLibPickHtml === 'function' ? armLibPickHtml() : ''}</div>`;
  return `<div class="armimpctl">
      <select onchange="state.armImp.mod=this.value;state.armImp.picked.clear();armImportCatalogue()">${(ARM.mods || []).map(m =>
        `<option${m === imp.mod ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <button class="mini${imp.by === 'units' ? ' on' : ''}" onclick="state.armImp.by='units';armImportRows()">${tt('armory.units')}</button>
      <button class="mini${imp.by === 'entries' ? ' on' : ''}" onclick="state.armImp.by='entries';armImportRows()">${tt('armory.model_entries')}</button>
      <input id="armImpQ" placeholder="${esc(tt('armory.find'))}" value="${esc(imp.q)}" oninput="state.armImp.q=this.value;armImportRows()">
    </div>
    <div class="armimprows" id="armImpRows"><div class="count">${tt('armory.reading')}</div></div>`;
}

async function armImportCatalogue(){
  const imp = state.armImp;
  const mod = imp.mod;
  if(!ARM.catalogue[mod]){
    try{ ARM.catalogue[mod] = await api.get('/api/armory/catalogue?mod=' + enc(mod)); }
    catch(e){ const el = document.getElementById('armImpRows'); if(el) el.innerHTML = `<div class="w-bad">${esc(errText(e))}</div>`; return; }
  }
  if(state.armImp.mod === mod) armImportRows();
}

/* Repaints the rows under the Find box only, never the box (memory: never
   repaint the box being typed in). */
function armImportRows(){
  const el = document.getElementById('armImpRows');
  const imp = state.armImp;
  const cat = ARM.catalogue[imp.mod];
  if(!el || !cat) return;
  document.querySelectorAll('.armimpctl .mini').forEach((b, i) => b.classList.toggle('on', (i === 0) === (imp.by === 'units')));
  const q = imp.q.trim().toLowerCase();
  const CAP = 300;
  let html = '', shown = 0, total = 0;
  if(imp.by === 'units'){
    for(const u of cat.units){
      if(q && !u.type.toLowerCase().includes(q) && !u.models.some(m => m.name.includes(q))) continue;
      total++;
      if(shown >= CAP) continue;
      shown++;
      html += `<div class="armimprow"><span class="armimpunit"><b>${esc(u.type)}</b>
        <span class="count">${esc([u.category, u.class, u.mount].filter(Boolean).join(' · '))}</span></span>
        <span class="armchips">${u.models.map(m => {
          const k = `${imp.mod}|${m.name}|${u.type}`;
          const role = m.role === 'soldier' ? tt('armory.role_soldier') : m.role === 'officer'
            ? tt('armory.role_officer', {n: m.n}) : tt('armory.role_upgrade', {n: m.n});
          return m.missing ? `<span class="armchip off" title="${esc(tt('armory.model_missing'))}">${esc(role)}: ${esc(m.name)}</span>`
            : `<label class="armchip${imp.picked.has(k) ? ' on' : ''}"><input type="checkbox"${imp.picked.has(k) ? ' checked' : ''}
                onchange="armImportPick('${esc(k)}', this.checked, this)"> ${esc(role)}: ${esc(m.name)}</label>`;
        }).join('')}</span></div>`;
    }
  }else{
    for(const e of cat.entries){
      if(q && !e.name.toLowerCase().includes(q) && !e.mesh.toLowerCase().includes(q)) continue;
      total++;
      if(shown >= CAP) continue;
      shown++;
      const k = `${imp.mod}|${e.name}|`;
      html += `<label class="armimprow"><input type="checkbox"${imp.picked.has(k) ? ' checked' : ''}
          onchange="armImportPick('${esc(k)}', this.checked)">
        <b>${esc(e.name)}</b> <span class="count">${esc(e.mesh)} · ${esc(e.skeletons.join(', '))}</span></label>`;
    }
  }
  if(total > shown) html += `<div class="count">${ttN('armory.more_rows', total - shown)}</div>`;
  el.innerHTML = html || `<div class="count">${tt('armory.nothing_matches')}</div>`;
}
function armImportPick(k, on, input){
  const imp = state.armImp;
  if(on) imp.picked.add(k); else imp.picked.delete(k);
  if(input && input.parentElement) input.parentElement.classList.toggle('on', on);
  armImportCount();
}
function armImportCount(){
  const el = document.getElementById('armImpCount');
  if(el && state.armImp.tab === 'mod') el.textContent = ttN('armory.n_picked', state.armImp.picked.size);
  else if(el) el.textContent = '';
}

async function armImportBrowse(){
  let r;
  try{ r = await api.post('/api/browse_file', {title: tt('armory.file_title'),
    filter: 'Models|*.obj;*.glb;*.gltf;*.dae;*.mesh'}); }
  catch(e){ toast(errText(e)); return; }
  if(r && r.path){
    state.armImp.path = r.path;
    const el = document.getElementById('armImpPath');
    if(el) el.value = r.path;
  }
}

async function armImportGo(){
  const imp = state.armImp, p = armProj();
  const adds = [];
  if(imp.tab === 'file'){
    if(!(imp.path || '').trim()){ toast(tt('armory.file_first')); return; }
    adds.push({kind: 'external', path: imp.path.trim()});
  }else if(imp.tab === 'library'){
    if(typeof armLibPicked === 'function') adds.push(...armLibPicked());
  }else{
    for(const k of imp.picked){
      const [mod, entry, unit] = k.split('|');
      adds.push({kind: 'entry', mod, entry, unit: unit || ''});
    }
  }
  if(!adds.length){ toast(tt('armory.pick_something')); return; }
  const btn = document.getElementById('armImpGo');
  if(btn) btn.disabled = true;
  const said = [];
  let added = 0;
  for(const a of adds){
    const key = armAssetKey(a);
    if(p.assets.some(x => armAssetKey(x) === key)){
      said.push(tt('armory.already_loaded', {name: armAssetLabel(a)}));
      continue;
    }
    const live = await armLoadAsset(a);
    if(live.err){ ARM.assets.delete(key); said.push(`${armAssetLabel(a)}: ${live.err}`); continue; }
    // the same file under another name (an entry that points at a mesh
    // another loaded entry uses, or a model copied into a second mod)
    const twin = p.assets.find(x => { const l = ARM.assets.get(armAssetKey(x)); return l && l.view && l.view.file_hash === live.view.file_hash; });
    if(twin){
      ARM.assets.delete(key);
      said.push(tt('armory.same_file_as', {name: armAssetLabel(a), other: armAssetLabel(twin)}));
      continue;
    }
    a.open = p.assets.length < 3;
    p.assets.push(a);
    added++;
  }
  imp.picked.clear();
  armSave();
  closeModal();
  if(said.length) toast(said.join(' · '), 6000);
  if(added && !p.objects.length && p.base == null) armStartChooser();
  else renderArmory();
}

/* After the first import into an empty project: which loaded model to start
   from, its every object pulled in, or nothing at all. */
function armStartChooser(){
  const p = armProj();
  document.getElementById('modal').className = 'modal';
  modal.innerHTML = `<div style="padding:16px">
    <h3>${tt('armory.start_from')}</h3>
    <div class="count" style="margin-bottom:10px">${tt('armory.start_from_intro')}</div>
    ${p.assets.map(a => `<label class="armimprow"><input type="radio" name="armBase" value="${esc(armAssetKey(a))}">
      ${esc(armAssetLabel(a))} <span class="count">${esc(a.kind === 'external' ? a.path : a.mod)}</span></label>`).join('')}
    <label class="armimprow"><input type="radio" name="armBase" value="" checked> ${tt('armory.start_from_scratch')}</label>
    <div style="text-align:right;margin-top:12px"><button class="primary" onclick="armStartGo()">${tt('armory.start')}</button></div>
  </div>`;
  overlay.classList.add('open');
}
function armStartGo(){
  const pick = document.querySelector('input[name=armBase]:checked');
  const key = pick ? pick.value : '';
  const p = armProj();
  p.base = key || null;
  closeModal();
  if(key) armPullAll(key);
  renderArmory();
  armFrameAll();
}

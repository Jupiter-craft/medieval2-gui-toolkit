/* =========================================================================
   Unit cards, Generate (Phase 95m): the card maker

   The Unit cards tab is in two: GENERATE, this, and CLEAN UP, the menu that
   was there (cards.js). The maker follows the Blender kit's card procedure
   (tasks/card_renderer.py) on the model Armory Studio holds:

     1. POSE  - a preset (T-pose, guard, spear brace, archer draw, riding,
                march), each a frame of the real animation of that name, or
                any animation stopped at any point;
     2. LIGHT - one lamp, a sun or a point, its direction, amount, level and
                an ambient;
     3. RENDER at 10x the card's size (up to 40x), orthographic, from a
                camera that stays put; a second pass draws the silhouette,
                from which the black outline is drawn (0.30 card pixels);
     4. SCALE DOWN through a blur, then colour (exposure, brightness,
                contrast, gamma, saturation, hue) and a sharpen.

   The HD render is at the top right, the finished pixel card at the bottom
   right. Cards are 48x64, 68x90 (large) or 180x230 (info), or a size of the
   user's. Saving writes a .tga (and a .png) under config/armory/cards/, and
   Give to a unit hands it to the unit editor's own card import, which copies
   it to every owning faction's folder through the edit door.
   ========================================================================= */

const CG_SIZES = {card: [48, 64], large: [68, 90], info: [180, 230]};
const CG_POSES = [
  {id: 'tpose', acts: []},
  {id: 'guard', acts: ['stand_a_idle', 'stand_idle', 'idle'], f: 0.3},
  {id: 'brace', acts: ['ready', 'ready_hf_idle_1'], f: 0.3},
  {id: 'draw', acts: ['attack_missile_hold', 'attack_missile_ready'], f: 0.5},
  {id: 'riding', acts: ['stand_a_idle', 'ready'], f: 0.3, skel: /(^|_)hr_|mounted|cav|horse/i},
  {id: 'march', acts: ['walk', 'march'], f: 0.25},
];

function cg(){
  return state.cg = state.cg || {
    size: 'card', w: 48, h: 64, ss: 10, oneEach: true, pose: 'guard', name: '', unit: '', err: '', saved: null,
    cam: {yaw: 20, pitch: 4, scale: 1.2, height: 0},
    light: {type: 'sun', azimuth: 35, elevation: 40, amount: 0.95, level: 1.0, ambient: 0.38},
    post: {blur: 0.5, exposure: 0, brightness: 0, contrast: 1.0, gamma: 1.0, saturation: 1.0, hue: 0, sharpen: 0.2, outline: 0.3},
  };
}
function cgDims(){ const c = cg(); return c.size === 'custom' ? [Math.max(8, c.w | 0), Math.max(8, c.h | 0)] : CG_SIZES[c.size]; }

/* What is drawn: the model's visible objects, one of each group type (the
   first, as the game would choose one variant per soldier) unless all. */
function cgObjects(){
  const objs = armProj().objects.filter(o => !o.hidden && !armCollHidden(o));
  if(!cg().oneEach) return objs;
  const seen = new Set();
  return objs.filter(o => { const k = (o.name || '').toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
}

/* --- the tab ----------------------------------------------------------------- */

const cgSizeLabel = s => ({card: tt('cards.gen_size_card'), large: tt('cards.gen_size_large'), info: tt('cards.gen_size_info'),
  custom: tt('cards.gen_size_custom')})[s] || s;
const cgLightLabel = t => t === 'point' ? tt('cards.gen_light_point') : tt('cards.gen_light_sun');
const cgPoseLabel = id => ({tpose: tt('cards.gen_pose_tpose'), guard: tt('cards.gen_pose_guard'), brace: tt('cards.gen_pose_brace'),
  draw: tt('cards.gen_pose_draw'), riding: tt('cards.gen_pose_riding'), march: tt('cards.gen_pose_march'),
  anim: tt('cards.gen_pose_anim')})[id] || id;

async function renderCardGen(){
  await armEnsureLoaded();
  if(ARM.loading) await ARM.loading;
  if(state.mode !== 'cards' || (state.cardsSub || 'generate') !== 'generate') return;
  const c = cg(), [w, h] = cgDims();
  const sl = (path, key, min, max, step, label) => {
    const v = c[path][key];
    return `<label class="cgrange">${label}<input type="range" min="${min}" max="${max}" step="${step}" value="${v}"
      oninput="cgSet('${path}','${key}',+this.value)"><span class="count" id="cgv_${path}_${key}">${(+v).toFixed(step < 1 ? 2 : 0)}</span></label>`;
  };
  const objs = cgObjects();
  const a = armAnim(), entries = armAnimEntries();
  const sk = a.list && a.list.skeletons ? a.list.skeletons[(a.skel || '').toLowerCase()] : null;
  const actions = sk ? (sk.actions || []).filter(r => r.playable) : [];
  main.innerHTML = bmdbTabsHtml(tt('cards.data_ui_units_data_ui_unit')) + cardsSubTabsHtml() + `
    <div class="cggrid">
      <div class="cgctl">
        ${objs.length ? `<div class="count">${ttN('cards.gen_source', objs.length)}
            <label class="armcheck"><input type="checkbox"${c.oneEach ? ' checked' : ''} onchange="cg().oneEach=this.checked;cgRepaint()"> ${tt('cards.gen_one_each')}</label></div>`
          : `<div class="empty armempty">${tt('cards.gen_no_model')} <button class="mini" onclick="setAppMode('armory')">${tt('core.armory_studio')}</button></div>`}
        <fieldset><legend>${tt('cards.gen_size')}</legend>
          <div class="armexprow">${['card', 'large', 'info', 'custom'].map(s => `<label class="armcheck"><input type="radio" name="cgSize"${c.size === s ? ' checked' : ''}
              onchange="cg().size='${s}';cgRepaint()"> ${cgSizeLabel(s)}${s !== 'custom' ? ` <span class="count">${CG_SIZES[s].join('×')}</span>` : ''}</label>`).join('')}</div>
          ${c.size === 'custom' ? `<div class="armexprow"><input type="number" class="armnum" value="${c.w}" onchange="cg().w=+this.value;cgRepaint()"> ×
            <input type="number" class="armnum" value="${c.h}" onchange="cg().h=+this.value;cgRepaint()"></div>` : ''}
          <label class="cgrange">${tt('cards.gen_render_at')}<input type="range" min="10" max="40" step="5" value="${c.ss}" onchange="cg().ss=+this.value;cgRepaint()"><span class="count">${c.ss}×</span></label>
        </fieldset>
        <fieldset><legend>${tt('cards.gen_pose')}</legend>
          <div class="armexprow">${CG_POSES.concat([{id: 'anim'}]).map(p => `<button class="mini${c.pose === p.id ? ' on' : ''}" onclick="cgPose('${p.id}')">${cgPoseLabel(p.id)}</button>`).join('')}</div>
          <div class="armexprow"><label>${tt('armory.skeleton_of')}<select onchange="cgAnimFrom(this.value)">
              <option value="">${tt('cards.gen_pick_entry')}</option>${entries.map(x => `<option value="${esc(armAssetKey(x))}"${(armProj().anim || {}).asset === armAssetKey(x) ? ' selected' : ''}>${esc(armAssetLabel(x))}</option>`).join('')}</select></label>
            ${a.list && a.list.skeletons ? `<select onchange="armAnimSkel(this.value);cgRepaint()">${Object.keys(a.list.skeletons).map(s => `<option${s === (a.skel || '').toLowerCase() ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>` : ''}</div>
          ${c.pose === 'anim' && actions.length ? `<div class="armexprow"><select onchange="cgAnimPick(this.value)">${actions.map(r => {
              const k = r.slot != null ? String(r.slot) : 'a:' + r.action;
              return `<option value="${esc(k)}"${a.key === k ? ' selected' : ''}>${esc(r.action)}</option>`; }).join('')}</select>
            <input type="range" min="0" max="1000" value="${armAnimFrac()}" oninput="cgScrub(+this.value)"></div>` : ''}
          ${c.poseNote ? `<div class="count">${esc(c.poseNote)}</div>` : ''}
          ${c.poseNote2 ? `<div class="count">${esc(c.poseNote2)}</div>` : ''}
        </fieldset>
        <fieldset><legend>${tt('cards.gen_camera')}</legend>
          ${sl('cam', 'yaw', -180, 180, 1, tt('cards.gen_turn'))}${sl('cam', 'pitch', -30, 45, 1, tt('cards.gen_tilt'))}
          ${sl('cam', 'scale', 0.4, 3, 0.05, tt('cards.gen_ortho_scale'))}${sl('cam', 'height', -1.5, 1.5, 0.02, tt('cards.gen_height'))}
        </fieldset>
        <fieldset><legend>${tt('cards.gen_light')}</legend>
          <div class="armexprow">${['sun', 'point'].map(t => `<label class="armcheck"><input type="radio" name="cgLight"${c.light.type === t ? ' checked' : ''}
              onchange="cg().light.type='${t}';cgRender()"> ${cgLightLabel(t)}</label>`).join('')}</div>
          ${sl('light', 'azimuth', -180, 180, 1, tt('cards.gen_azimuth'))}${sl('light', 'elevation', -60, 89, 1, tt('cards.gen_elevation'))}
          ${sl('light', 'amount', 0, 2, 0.01, tt('cards.gen_amount'))}${sl('light', 'level', 0.2, 2.5, 0.01, tt('cards.gen_level'))}
          ${sl('light', 'ambient', 0, 1, 0.01, tt('cards.gen_ambient'))}
        </fieldset>
        <fieldset><legend>${tt('cards.gen_finish')}</legend>
          ${sl('post', 'blur', 0, 2, 0.05, tt('cards.gen_blur'))}${sl('post', 'exposure', -2, 2, 0.05, tt('cards.gen_exposure'))}
          ${sl('post', 'brightness', -0.5, 0.5, 0.01, tt('cards.gen_brightness'))}${sl('post', 'contrast', 0.3, 2, 0.01, tt('cards.gen_contrast'))}
          ${sl('post', 'gamma', 0.3, 3, 0.01, tt('cards.gen_gamma'))}${sl('post', 'saturation', 0, 2, 0.01, tt('cards.gen_saturation'))}
          ${sl('post', 'hue', -180, 180, 1, tt('cards.gen_hue'))}${sl('post', 'sharpen', 0, 1, 0.01, tt('cards.gen_sharpen'))}
          ${sl('post', 'outline', 0, 1.5, 0.05, tt('cards.gen_outline'))}
        </fieldset>
      </div>
      <div class="cgout">
        <div class="cghd"><div class="count">${tt('cards.gen_hd', {w: w * c.ss, h: h * c.ss})}</div><canvas id="cgHd"></canvas></div>
        <div class="cgcard"><div class="count">${tt('cards.gen_card', {w, h})}</div>
          <canvas id="cgCard" width="${w}" height="${h}" style="width:${w * 4}px;height:${h * 4}px"></canvas>
          <div class="armexprow"><label>${tt('cards.gen_name')}<input value="${esc(c.name)}" placeholder="${esc(tt('cards.gen_name_hint'))}" oninput="cg().name=this.value"></label>
            <button class="primary" onclick="cgSave()">${tt('cards.gen_save')}</button>
            <button onclick="cgSaveHd()">${tt('cards.gen_save_hd')}</button></div>
          ${c.saved ? `<div class="armissue ok">${tt('cards.gen_saved', {path: c.saved.path})}</div>
            <div class="armexprow"><label>${tt('cards.gen_unit')}<input list="cgUnits" value="${esc(c.unit)}" onchange="cg().unit=this.value"></label>
              <datalist id="cgUnits">${(c.units || []).map(u => `<option value="${esc(u)}">`).join('')}</datalist>
              <button onclick="cgGive(false)">${tt('cards.gen_give')}</button>
              ${c.givePlan ? `<button class="primary" onclick="cgGive(true)">${tt('cards.gen_give_apply')}</button>` : ''}</div>
            ${c.givePlan ? `<div class="count">${c.givePlan.map(esc).join('<br>')}</div>` : ''}` : ''}
          ${c.err ? `<div class="armexperr">${esc(c.err)}</div>` : ''}
        </div>
      </div>
    </div>`;
  cgRender();
}
function cgRepaint(){ renderCardGen(); }
function cgSet(path, key, v){
  cg()[path][key] = v;
  const el = document.getElementById(`cgv_${path}_${key}`);
  if(el) el.textContent = (+v).toFixed(Math.abs(v) < 10 && v % 1 ? 2 : (String(v).includes('.') ? 2 : 0));
  clearTimeout(ARM.cgTimer); ARM.cgTimer = setTimeout(cgRender, 60);
}

/* --- posing ------------------------------------------------------------------------ */

async function cgAnimFrom(key){ await armAnimFrom(key); cgRepaint(); }
async function cgAnimPick(key){
  await armAnimPick(key);
  const a = armAnim(); a.playing = false;
  cgRender();
}
function cgScrub(v){ const a = armAnim(); a.playing = false; a.t = armAnimLength() * v / 1000; cgRender(); }

/* A preset is a frame of the real animation of that name, from the first
   loaded entry whose skeletons have it. */
async function cgPose(id){
  const c = cg(), a = armAnim();
  c.pose = id; c.poseNote = ''; c.poseNote2 = '';
  if(id === 'anim'){ cgRepaint(); return; }
  if(id === 'tpose'){ armAnimRest(); cgRepaint(); return; }
  const p = CG_POSES.find(x => x.id === id);
  if(!(armProj().anim || {}).asset){
    const first = armAnimEntries()[0];
    if(!first){ c.poseNote = tt('cards.gen_no_entry'); armAnimRest(); cgRepaint(); return; }
    await armAnimFrom(armAssetKey(first));
  }
  const skels = Object.keys((a.list && a.list.skeletons) || {});
  const order = p.skel ? skels.filter(s => p.skel.test(s)).concat(skels.filter(s => !p.skel.test(s))) : [a.skel.toLowerCase()].concat(skels);
  for(const s of order){
    const sk = a.list.skeletons[s];
    for(const name of p.acts){
      const row = (sk && sk.actions || []).find(r => r.playable && r.action.toLowerCase() === name);
      if(!row) continue;
      if(s !== (a.skel || '').toLowerCase()) armAnimSkel(s);
      await armAnimPick(row.slot != null ? String(row.slot) : 'a:' + row.action);
      a.playing = false;
      a.t = armAnimLength() * p.f;
      c.poseNote = tt('cards.gen_pose_from', {action: row.action, skeleton: s});
      c.poseNote2 = p.skel && !p.skel.test(s) ? tt('cards.gen_pose_no_mount') : '';
      cgRepaint();
      return;
    }
  }
  c.poseNote = tt('cards.gen_pose_missing', {pose: cgPoseLabel(id)});
  armAnimRest();
  cgRepaint();
}

/* --- rendering ---------------------------------------------------------------------- */

function cgCamera(objs, w, h){
  const c = cg().cam, b = armBounds(objs);
  if(!b) return null;
  // the game's x is mirrored on the way to the screen (ARM_MIRROR)
  const cx = -(b[0][0] + b[1][0]) / 2, cz = (b[0][2] + b[1][2]) / 2;
  const halfH = c.scale / 2, halfW = halfH * w / h;
  const target = [cx, b[1][1] - halfH * 0.92 + c.height, cz];
  const yaw = c.yaw * Math.PI / 180, pitch = c.pitch * Math.PI / 180, d = 10;
  const eye = [target[0] + d * Math.cos(pitch) * Math.sin(yaw), target[1] + d * Math.sin(pitch), target[2] + d * Math.cos(pitch) * Math.cos(yaw)];
  const n = 0.01, f = 40;
  return {proj: [1/halfW,0,0,0, 0,1/halfH,0,0, 0,0,-2/(f-n),0, 0,0,-(f+n)/(f-n),1], view: v3LookAt(eye, target, [0, 1, 0]), eye, target};
}
function cgLight(cam){
  const l = cg().light, az = l.azimuth * Math.PI / 180, el = l.elevation * Math.PI / 180;
  const yaw = cg().cam.yaw * Math.PI / 180;
  // the lamp is placed about the camera's own direction, as the kit's lamp
  // stays put beside its camera
  const dir = [Math.cos(el) * Math.sin(yaw + az), Math.sin(el), Math.cos(el) * Math.cos(yaw + az)];
  return {amount: l.amount * 1.6, ambient: l.ambient, level: l.level, point: l.type === 'point', dir,
          pos: [cam.target[0] + dir[0] * 2.2, cam.target[1] + dir[1] * 2.2, cam.target[2] + dir[2] * 2.2]};
}
function cgPass(objs, W, H, cam, opts){
  armRender(objs, W, H, cam, Object.assign({plain: true, card: true, bg: [0, 0, 0]}, opts));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d', {willReadFrequently: true});
  x.drawImage(ARM.glCanvas, 0, 0, W, H, 0, 0, W, H);
  return x.getImageData(0, 0, W, H);
}

/* Square dilation of a 0/1 mask by r pixels, rows then columns. */
function cgDilate(m, W, H, r){
  if(r <= 0) return m.slice();
  const t = new Uint8Array(W * H), o = new Uint8Array(W * H);
  for(let y = 0; y < H; y++){
    let run = -1e9;
    for(let x = 0; x < W + r; x++){
      if(x < W && m[y * W + x]) run = x;
      const at = x - r;
      if(at >= 0 && at < W && x - run <= 2 * r) t[y * W + at] = 1;
    }
  }
  for(let x = 0; x < W; x++){
    let run = -1e9;
    for(let y = 0; y < H + r; y++){
      if(y < H && t[y * W + x]) run = y;
      const at = y - r;
      if(at >= 0 && at < H && y - run <= 2 * r) o[at * W + x] = 1;
    }
  }
  return o;
}

function cgRender(){
  const c = cg(), hdCv = document.getElementById('cgHd'), cardCv = document.getElementById('cgCard');
  if(!hdCv || !cardCv) return;
  const objs = cgObjects(), [w, h] = cgDims(), ss = c.ss, W = w * ss, H = h * ss;
  if(!objs.length || !armGl()) return;
  if(typeof armAnimPose === 'function') armAnimPose();
  const cam = cgCamera(objs, W, H);
  if(!cam) return;
  const col = cgPass(objs, W, H, cam, {light: cgLight(cam)});
  const sil = cgPass(objs, W, H, cam, {mask: true});
  const mask = new Uint8Array(W * H);
  for(let i = 0; i < W * H; i++) mask[i] = sil.data[i * 4] > 127 ? 1 : 0;
  const grown = cgDilate(mask, W, H, Math.round(c.post.outline * ss));
  const hi = new ImageData(W, H);
  for(let i = 0; i < W * H; i++){
    if(mask[i]){ hi.data[i*4] = col.data[i*4]; hi.data[i*4+1] = col.data[i*4+1]; hi.data[i*4+2] = col.data[i*4+2]; hi.data[i*4+3] = 255; }
    else if(grown[i]) hi.data[i*4+3] = 255;
  }
  // the HD render: no blur, no scaling
  hdCv.width = W; hdCv.height = H;
  hdCv.getContext('2d').putImageData(hi, 0, 0);
  // the card: blurred, scaled down, coloured and sharpened
  const big = document.createElement('canvas'); big.width = W; big.height = H;
  const bx = big.getContext('2d');
  // a CSS filter, built from its parts
  bx.filter = c.post.blur > 0 ? ['blur', '(', (c.post.blur * ss).toFixed(2), 'px', ')'].join('') : 'none';
  bx.drawImage(hdCv, 0, 0);
  const cx = cardCv.getContext('2d', {willReadFrequently: true});
  cardCv.width = w; cardCv.height = h;
  cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  cx.clearRect(0, 0, w, h);
  cx.drawImage(big, 0, 0, w, h);
  const im = cx.getImageData(0, 0, w, h);
  cgFinish(im.data, w, h, c.post);
  cx.putImageData(im, 0, 0);
}

/* The colour and sharpen steps, on the card's own pixels. */
function cgFinish(d, w, h, p){
  const ex = Math.pow(2, p.exposure), hue = p.hue * Math.PI / 180, ch = Math.cos(hue), sh = Math.sin(hue);
  for(let i = 0; i < d.length; i += 4){
    if(!d[i+3]) continue;
    let r = d[i] / 255 * ex + p.brightness, g = d[i+1] / 255 * ex + p.brightness, b = d[i+2] / 255 * ex + p.brightness;
    r = (r - 0.5) * p.contrast + 0.5; g = (g - 0.5) * p.contrast + 0.5; b = (b - 0.5) * p.contrast + 0.5;
    r = Math.pow(Math.max(r, 0), 1 / p.gamma); g = Math.pow(Math.max(g, 0), 1 / p.gamma); b = Math.pow(Math.max(b, 0), 1 / p.gamma);
    // hue turned and saturation scaled in YIQ, which keeps the lightness
    const Y = 0.299 * r + 0.587 * g + 0.114 * b, I0 = 0.596 * r - 0.274 * g - 0.322 * b, Q0 = 0.211 * r - 0.523 * g + 0.312 * b;
    const I = (I0 * ch - Q0 * sh) * p.saturation, Q = (I0 * sh + Q0 * ch) * p.saturation;
    d[i] = Math.max(0, Math.min(255, Math.round((Y + 0.956 * I + 0.621 * Q) * 255)));
    d[i+1] = Math.max(0, Math.min(255, Math.round((Y - 0.272 * I - 0.647 * Q) * 255)));
    d[i+2] = Math.max(0, Math.min(255, Math.round((Y - 1.106 * I + 1.703 * Q) * 255)));
  }
  if(p.sharpen > 0){
    const src = Uint8ClampedArray.from(d);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
      const i = (y * w + x) * 4;
      if(!src[i+3]) continue;
      for(let k = 0; k < 3; k++){
        let s = 0, n = 0;
        for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
          const xx = x + dx, yy = y + dy;
          if(xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          s += src[(yy * w + xx) * 4 + k]; n++;
        }
        d[i+k] = Math.max(0, Math.min(255, Math.round(src[i+k] + p.sharpen * (src[i+k] - s / n))));
      }
    }
  }
}

/* --- saving --------------------------------------------------------------------------- */

function cgKind(){ const s = cg().size; return s === 'info' ? 'info' : s === 'custom' ? 'custom' : 'card'; }
async function cgSave(){
  const c = cg(), cv = document.getElementById('cgCard');
  if(!cv) return;
  const name = (c.name || '').trim();
  if(!name){ toast(tt('cards.gen_name_first')); return; }
  try{
    const r = await api.post('/api/armory/cards/save', {name, kind: cgKind(), size: cgDims(), png: cv.toDataURL('image/png')});
    c.saved = r; c.err = ''; c.givePlan = null;
    if(!c.units){ try{ c.units = (await api.get('/api/armory/templates?mod=' + enc(state.src))).units.map(u => u.type); }catch(e){ c.units = []; } }
  }catch(e){ c.err = errText(e); }
  cgRepaint();
}
async function cgSaveHd(){
  const c = cg(), cv = document.getElementById('cgHd');
  const name = (c.name || '').trim();
  if(!cv || !name){ toast(tt('cards.gen_name_first')); return; }
  try{ const r = await api.post('/api/armory/cards/save', {name, kind: 'hd', size: [cv.width, cv.height], png: cv.toDataURL('image/png')});
       toast(tt('cards.gen_saved', {path: r.path}), 5000); }
  catch(e){ toast(errText(e)); }
}
/* The saved card handed to the unit editor's own import, planned first. */
async function cgGive(apply){
  const c = cg();
  if(!c.saved || !c.unit){ toast(tt('cards.gen_unit_first')); return; }
  const body = {mod: state.src, unit: c.unit};
  body[c.saved.kind === 'info' ? 'info_src' : 'card_src'] = c.saved.path;
  try{
    if(!apply){
      const r = await api.post('/api/edit/plan', body);
      if(r.errors && r.errors.length){ c.err = r.errors.join('; '); c.givePlan = null; }
      else{ c.givePlan = (r.changes || []).concat(r.warnings || []); c.err = ''; }
    }else{
      await api.post('/api/edit/apply', body);
      toast(tt('cards.gen_given', {unit: c.unit}));
      c.givePlan = null;
    }
  }catch(e){ c.err = errText(e); }
  cgRepaint();
}

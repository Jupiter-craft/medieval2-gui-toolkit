/* =========================================================================
   Armory Studio's export (Phase 95i): check, UV packing and the bake

   Three steps in one dialog, each answered by the server (armbake.py) on the
   project as the page holds it:

     1. CHECK  - the Blender kit's export checks that still apply (names, opt,
                 weights, the ranged objects), with its rename fix; the UV and
                 texture checks are left out, since the sheets are baked new.
                 What goes: everything visible, or the chosen collections.
     2. UVs    - every object's islands measured in its source's texels and
                 the size of sheet it needs; a list setting which sheet each
                 object goes on; the packing drawn, with what did not fit and
                 the ways out (automatic, move, scale, a smaller margin).
     3. BAKE   - the sheets and the .mesh written to a folder.
   ========================================================================= */

const ARM_SIZES = [512, 1024, 2048, 4096];

function armExp(){
  const p = armProj();
  return state.armExp = state.armExp || {step: 'check', scope: {mode: 'visible',
    collections: p.collections.filter(c => c.export).map(c => c.id)},
    settings: {size: {main: 'auto', attach: 'auto'}, margin: 0.4, obj_sheet: {}, block_sheet: {}, scale: {}, dyes: true},
    check: null, plan: null, busy: false, err: '', folder: '', stem: '', done: null};
}
function armExpBody(){ return {project: armProj(), scope: armExp().scope}; }

async function armExportOpen(){
  const e = armExp();
  e.done = null; e.err = '';
  if(!e.stem){
    const p = armProj();
    e.stem = (p.name || (p.objects[0] && p.objects[0].mesh) || 'armory_model').replace(/[^A-Za-z0-9_\-]/g, '_');
  }
  e.step = 'check';
  armExportPaint();
  overlay.classList.add('open');
  armExportCheck();
}

function armExportPaint(){
  const e = armExp();
  document.getElementById('modal').className = 'modal wide';
  const tab = (id, label) => `<button class="mftab${e.step === id ? ' on' : ''}" onclick="armExportStep('${id}')">${label}</button>`;
  const errors = e.check ? e.check.issues.filter(i => i.level === 'error').length : 0;
  modal.innerHTML = `<div class="armexp">
    <h3>${tt('armory.exp_title')}</h3>
    <div class="mftabs">${tab('check', tt('armory.exp_step_check'))}${tab('uv', tt('armory.exp_step_uv'))}${tab('bake', tt('armory.exp_step_bake'))}</div>
    <div id="armExpBody">${e.step === 'check' ? armExpCheckHtml() : e.step === 'uv' ? armExpUvHtml() : armExpBakeHtml()}</div>
    ${e.err ? `<div class="armexperr">${esc(e.err)}</div>` : ''}
    <div class="armimpfoot"><span class="count">${e.busy ? tt('armory.reading') : ''}</span><span style="flex:1"></span>
      <button onclick="closeModal()">${tt('common.close')}</button>
      ${e.step === 'check' ? `<button class="primary" onclick="armExportStep('uv')"${errors || !e.check ? ' disabled' : ''}>${tt('armory.exp_next')}</button>` : ''}
      ${e.step === 'uv' ? `<button class="primary" onclick="armExportStep('bake')"${e.plan && e.plan.fits ? '' : ' disabled'}>${tt('armory.exp_next')}</button>` : ''}
    </div></div>`;
  if(e.step === 'uv') armExpDrawSheets();
}

function armExportStep(s){
  const e = armExp();
  if(s !== 'check' && (!e.check || e.check.issues.some(i => i.level === 'error'))){ e.step = 'check'; armExportPaint(); return; }
  if(s === 'bake' && !(e.plan && e.plan.fits)) s = 'uv';
  e.step = s; e.err = '';
  armExportPaint();
  if(s === 'check') armExportCheck();
  if(s === 'uv') armExportPlan();
}

/* --- 1. check ------------------------------------------------------------ */

async function armExportCheck(){
  const e = armExp();
  e.busy = true; armExportPaint();
  try{
    e.check = await api.post('/api/armory/check', Object.assign(armExpBody(),
      {skeleton: typeof armAnim === 'function' ? armAnim().skel || '' : ''}));
    e.err = '';
  }catch(err){ e.err = errText(err); e.check = null; }
  e.busy = false;
  if(e.step === 'check') armExportPaint();
}

function armExpCheckHtml(){
  const e = armExp(), p = armProj();
  const colls = p.collections.map(c => `<label class="armcheck"><input type="checkbox"${e.scope.collections.includes(c.id) ? ' checked' : ''}
      onchange="armExpColl(${c.id}, this.checked)"> ${esc(c.name)}</label>`).join('');
  const scope = `<div class="armexprow">
    <label class="armcheck"><input type="radio" name="armExpScope"${e.scope.mode !== 'collections' ? ' checked' : ''} onchange="armExpScope('visible')"> ${tt('armory.exp_scope_visible')}</label>
    <label class="armcheck"><input type="radio" name="armExpScope"${e.scope.mode === 'collections' ? ' checked' : ''}${p.collections.length ? '' : ' disabled'} onchange="armExpScope('collections')"> ${tt('armory.exp_scope_collections')}</label>
    ${e.scope.mode === 'collections' ? `<span class="armexpcolls">${colls}</span>` : ''}</div>`;
  if(!e.check) return scope + `<div class="count">${e.busy ? tt('armory.reading') : ''}</div>`;
  const c = e.check;
  const rows = c.issues.map(i => `<div class="armissue ${i.level}"><b>${i.level === 'error' ? tt('armory.exp_error') : tt('armory.exp_warning')}</b>
      ${esc(armChkText(i))}
      ${i.id != null ? `<button class="mini" onclick="armExpShow(${i.id})">${tt('armory.exp_show')}</button>` : ''}</div>`).join('');
  return scope + `<div class="count armnote">${tt('armory.exp_check_summary', {objects: c.objects.length, vertices: (c.vertices || 0).toLocaleString()})}
      ${c.ranged ? `<span>${tt('armory.exp_ranged')}</span>` : ''}</div>
    ${rows || `<div class="armissue ok">${tt('armory.exp_all_clear')}</div>`}
    <div class="armexprow">${c.fixable ? `<button onclick="armExpFixNames()">${tt('armory.exp_fix_names')}</button>` : ''}
      <button class="mini" onclick="armExportCheck()">${tt('armory.exp_recheck')}</button>
      <span class="count">${tt('armory.exp_check_note')}</span></div>`;
}
/* An issue in words, by its code (armbake.check_model). */
function armChkText(i){
  const p = i.params || {};
  switch(i.code){
    case 'empty_name': return tt('armory.chk_empty_name', p);
    case 'name_clash': return tt('armory.chk_name_clash', p);
    case 'name_form': return tt('armory.chk_name_form', p);
    case 'no_texture': return tt('armory.chk_no_texture', p);
    case 'no_weights': return tt('armory.chk_no_weights', p);
    case 'nothing': return tt('armory.chk_nothing', p);
    case 'opt_in_name': return tt('armory.chk_opt_in_name', p);
    case 'ranged_no_primary': return tt('armory.chk_ranged_no_primary', p);
    case 'ranged_no_secondary': return tt('armory.chk_ranged_no_secondary', p);
    case 'too_many_vertices': return tt('armory.chk_too_many_vertices', p);
    case 'unreadable': return tt('armory.chk_unreadable', p);
    default: return i.code;
  }
}
function armExpScope(m){ armExp().scope.mode = m; armExp().plan = null; armExportCheck(); }
function armExpColl(id, on){
  const s = armExp().scope;
  s.collections = s.collections.filter(x => x !== id);
  if(on) s.collections.push(id);
  armExp().plan = null;
  armExportCheck();
}
function armExpShow(id){
  closeModal();
  ARM.sel.clear(); ARM.sel.add(id);
  armRepaint();
}
/* The kit's rename fix on every object that goes, and `_opt` at the end of a
   mesh name made into the optional flag it meant. */
function armExpFixNames(){
  const ids = new Set(armExp().check.objects);
  for(const o of armProj().objects){
    if(!ids.has(o.id)) continue;
    if(/_opt$/i.test(o.mesh || '')){ o.mesh = o.mesh.replace(/_{1,2}opt$/i, ''); o.flag = 1; }
    const [n, m] = armSplitName(armFixName(armFullName(o)));
    o.name = n; o.mesh = m;
  }
  armRepaint();
  armExportCheck();
}

/* --- 2. UVs and packing ------------------------------------------------------- */

async function armExportPlan(auto){
  const e = armExp();
  e.busy = true;
  if(!e.plan && e.step === 'uv') armExportPaint();
  const seq = (e.seq || 0) + 1; e.seq = seq;
  try{
    const r = await api.post('/api/armory/uv', Object.assign(armExpBody(), {settings: Object.assign({}, e.settings, {auto: !!auto})}));
    if(seq !== e.seq) return;
    e.plan = r; e.err = '';
    if(auto){
      // the way out the server found becomes the settings, to be seen and changed
      e.settings.scale = r.settings.scale; e.settings.block_sheet = r.settings.block_sheet;
    }
  }catch(err){ if(seq === e.seq){ e.err = errText(err); e.plan = null; } }
  e.busy = false;
  if(e.step === 'uv') armExportPaint();
}
function armExpReplan(){ clearTimeout(ARM.expTimer); ARM.expTimer = setTimeout(() => armExportPlan(), 250); }
function armExpSet(key, v){
  const s = armExp().settings;
  if(key === 'margin') s.margin = Math.max(0, Math.min(5, +v || 0));
  else if(key === 'dyes') s.dyes = !!v;
  else if(key === 'main' || key === 'attach') s.size[key] = v === 'auto' ? 'auto' : +v;
  armExpReplan();
}
function armExpObjSheet(id, v){
  const s = armExp().settings;
  if(v) s.obj_sheet[id] = v; else delete s.obj_sheet[id];
  // an object's own choice beats what was said for its islands one by one
  if(armExp().plan) for(const sh of Object.values(armExp().plan.sheets))
    for(const b of sh.blocks) if(b.objs.includes(id)) delete s.block_sheet[b.id];
  armExpReplan();
}
function armExpScale(id, pct){
  const s = armExp().settings;
  const v = Math.max(5, Math.min(100, +pct || 100)) / 100;
  if(v >= 1) delete s.scale[id]; else s.scale[id] = v;
  armExpReplan();
}
function armExpMoveBlock(sh, i, to){
  const b = armExp().plan.sheets[sh].blocks[i];
  if(b){ armExp().settings.block_sheet[b.id] = to; armExpReplan(); }
}
function armExpScaleSheet(sheet, pct){
  const e = armExp();
  if(!e.plan) return;
  const ids = new Set(e.plan.sheets[sheet].blocks.flatMap(b => b.objs));
  for(const id of ids) armExpScale(id, pct);
}

const armExpLabel = s => s === 'attach' ? tt('armory.exp_sheet_attach') : tt('armory.exp_sheet_main');

function armExpUvHtml(){
  const e = armExp(), P = e.plan, s = e.settings;
  if(!P) return `<div class="count">${e.busy ? tt('armory.reading') : ''}</div>`;
  const sizeSel = sh => `<label>${armExpLabel(sh)}<select onchange="armExpSet('${sh}', this.value)">
      <option value="auto"${s.size[sh] === 'auto' ? ' selected' : ''}>${tt('armory.exp_size_auto')}</option>
      ${ARM_SIZES.map(z => `<option value="${z}"${s.size[sh] === z ? ' selected' : ''}>${z}</option>`).join('')}</select></label>`;
  const rows = P.objects.map(o => `<tr>
      <td><span class="armswatch" style="background:${armExpColour(o.id)}"></span> ${esc(o.name)}</td>
      <td class="num">${o.islands}</td>
      <td class="num">${Math.round(Math.sqrt(o.area)).toLocaleString()}²</td>
      <td class="num">${o.needs || '-'}</td>
      <td>${o.origin === 'any' ? tt('armory.exp_origin_file') : o.origin === 'both' ? tt('armory.exp_origin_both') : armExpLabel(o.origin)}</td>
      <td><select onchange="armExpObjSheet(${o.id}, this.value)">
        <option value="">${tt('armory.exp_sheet_default')}</option>
        ${['main', 'attach'].map(x => `<option value="${x}"${s.obj_sheet[o.id] === x ? ' selected' : ''}>${armExpLabel(x)}</option>`).join('')}</select>
        <span class="count">${o.sheets.map(armExpLabel).join(' + ')}</span></td>
      <td><input type="number" class="armnum" min="5" max="100" step="5" value="${Math.round(o.scale * 100)}"
        onchange="armExpScale(${o.id}, this.value)" title="${esc(tt('armory.exp_scale_title'))}">%</td></tr>`).join('');
  const sheet = sh => {
    const S = P.sheets[sh];
    if(!S.size) return `<div class="armexpsheet"><b>${armExpLabel(sh)}</b><div class="count">${tt('armory.exp_sheet_unused')}</div></div>`;
    return `<div class="armexpsheet"><b>${armExpLabel(sh)} · ${S.size}²</b>
      <span class="count">${tt('armory.exp_sheet_facts', {fill: Math.round(S.fill * 100), needs: S.needs, margin: S.margin_px})}</span>
      <canvas id="armExpCv_${sh}" width="320" height="320"></canvas></div>`;
  };
  return `<div class="armexprow">${sizeSel('main')}${sizeSel('attach')}
      <label>${tt('armory.exp_margin')}<input type="number" class="armnum" min="0" max="5" step="0.1" value="${s.margin}"
        onchange="armExpSet('margin', this.value)" title="${esc(tt('armory.exp_margin_title'))}">%</label>
      <label class="armcheck"><input type="checkbox"${s.dyes ? ' checked' : ''} onchange="armExpSet('dyes', this.checked)"> ${tt('armory.exp_apply_dyes')}</label></div>
    <div class="count armnote">${tt('armory.exp_uv_summary', {islands: P.islands, blocks: P.blocks, folded: P.folded})}</div>
    ${P.fits ? '' : armExpOverflowHtml()}
    ${P.auto ? `<div class="armissue warning">${P.auto.sheet ? tt('armory.exp_auto_done', {sheet: armExpLabel(P.auto.sheet), pct: Math.round(P.auto.scale * 100)})
                                                       : tt('armory.exp_auto_moved', {n: P.auto.moved})}</div>` : ''}
    <div class="armexpuv">
      <div class="armexplist"><table class="armexptable"><thead><tr><th>${tt('armory.exp_col_object')}</th><th>${tt('armory.exp_col_islands')}</th>
        <th>${tt('armory.exp_col_area')}</th><th>${tt('armory.exp_col_needs')}</th><th>${tt('armory.exp_col_from')}</th>
        <th>${tt('armory.exp_col_sheet')}</th><th>${tt('armory.exp_col_scale')}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="armexpsheets">${sheet('main')}${sheet('attach')}</div>
    </div>`;
}

/* A sheet ran out of room: say which islands did not fit and what each
   would take, and the four ways out. */
function armExpOverflowHtml(){
  const e = armExp(), P = e.plan;
  const names = new Map(P.objects.map(o => [o.id, o.name]));
  let out = `<div class="armexpfull"><b>${tt('armory.exp_full')}</b>
    <div class="armexprow"><button onclick="armExportPlan(true)">${tt('armory.exp_auto')}</button><span class="count">${tt('armory.exp_auto_note')}</span></div>`;
  for(const sh of ['main', 'attach']){
    const S = P.sheets[sh];
    if(!S.left.length) continue;
    const other = sh === 'main' ? 'attach' : 'main';
    const left = S.blocks.filter(b => S.left.includes(b.id));
    out += `<div class="armsect">${tt('armory.exp_left_on', {sheet: armExpLabel(sh), n: left.length})}</div>`;
    out += left.map(b => `<div class="armexprow"><span>${esc(b.objs.map(id => names.get(id) || id).join(', '))}</span>
        <span class="count">${tt('armory.exp_share', {pct: (b.share * 100).toFixed(1)})}</span>
        <button class="mini" onclick="armExpMoveBlock('${sh}', ${S.blocks.indexOf(b)}, '${other}')">${tt('armory.exp_move_to', {sheet: armExpLabel(other)})}</button></div>`).join('');
    out += `<div class="armexprow"><label>${tt('armory.exp_scale_sheet')}<input type="number" class="armnum" min="5" max="100" step="5" value="90"
        onchange="armExpScaleSheet('${sh}', this.value)">%</label>
      <span class="count">${tt('armory.exp_scale_margin', {pct: S.recommended_margin})}</span>
      <span class="count">${tt('armory.exp_lower_margin')}</span></div>`;
  }
  return out + '</div>';
}

function armExpColour(id){
  const h = (id * 137.508) % 360;
  return `hsl(${h.toFixed(0)},62%,58%)`;
}
function armExpDrawSheets(){
  const P = armExp().plan;
  if(!P) return;
  for(const sh of ['main', 'attach']){
    const cv = document.getElementById('armExpCv_' + sh), S = P.sheets[sh];
    if(!cv || !S.size) continue;
    const ctx = cv.getContext('2d'), k = cv.width / S.size;
    ctx.fillStyle = '#1d2128'; ctx.fillRect(0, 0, cv.width, cv.height);
    for(const b of S.blocks){
      if(!b.placed) continue;
      const w = (b.rot ? b.h : b.w) * k, h = (b.rot ? b.w : b.h) * k;
      ctx.fillStyle = armExpColour(b.objs[0]);
      ctx.globalAlpha = 0.75; ctx.fillRect(b.x * k, b.y * k, w, h);
      ctx.globalAlpha = 1; ctx.strokeStyle = '#000'; ctx.strokeRect(b.x * k + 0.5, b.y * k + 0.5, w - 1, h - 1);
    }
  }
}

/* --- 3. bake --------------------------------------------------------------- */

function armExpBakeHtml(){
  const e = armExp(), P = e.plan;
  const sizes = P ? ['main', 'attach'].filter(s => P.sheets[s].size).map(s => `${armExpLabel(s)} ${P.sheets[s].size}²`).join(', ') : '';
  const done = e.done ? `<div class="armissue ok">${tt('armory.exp_written', {folder: e.done.folder})}
      <div class="count">${e.done.files.map(esc).join(', ')}</div>
      <div class="count">${tt('armory.exp_written_facts', {vertices: e.done.vertices.toLocaleString(), triangles: e.done.triangles.toLocaleString(), groups: e.done.groups})}</div></div>` : '';
  return `<div class="count armnote">${tt('armory.exp_bake_intro', {sheets: sizes})}</div>
    <div class="armpathrow"><input id="armExpFolder" value="${esc(e.folder)}" placeholder="${esc(tt('armory.exp_folder'))}" oninput="armExp().folder=this.value">
      <button onclick="armExpBrowse()">${tt('armory.browse')}</button></div>
    <div class="armexprow"><label>${tt('armory.exp_stem')}<input value="${esc(e.stem)}" oninput="armExp().stem=this.value"></label>
      <button class="primary" onclick="armExpBake()"${e.busy ? ' disabled' : ''}>${tt('armory.exp_bake')}</button></div>
    <div class="count">${tt('armory.exp_bake_note')}</div>
    <div class="count">${tt('armory.exp_normals', {mode: typeof armNormModeLabel === 'function' ? armNormModeLabel(armNormals().mode) : ''})}</div>${done}`;
}
async function armExpBrowse(){
  let r;
  try{ r = await api.post('/api/browse_folder', {title: tt('armory.exp_folder')}); }catch(err){ toast(errText(err)); return; }
  if(r && r.path){ armExp().folder = r.path; armExportPaint(); }
}
async function armExpBake(){
  const e = armExp();
  if(!e.folder.trim()){ toast(tt('armory.exp_folder')); return; }
  e.busy = true; e.done = null; armExportPaint();
  try{
    e.done = await api.post('/api/armory/bake', Object.assign(armExpBody(), {settings: e.settings, folder: e.folder, stem: e.stem}));
    e.err = '';
  }catch(err){ e.err = errText(err); }
  e.busy = false;
  armExportPaint();
}

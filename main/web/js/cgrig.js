/* =========================================================================
   The card maker's IK rig and pose library (Phase 99n)

   The Blender kit poses a unit card through an IK control rig and a pose
   library (Medieval 2 Toolkit, tasks/control_rig.py, control_rig_data.py,
   pose_library.py, assets/Poses.blend). Its three layouts (IK_Infantry,
   IK_Archer, IK_Dwarf) and its pose assets were read out of the kit with
   Blender into unittransfer/data/m2_poses.json (/api/armory/poses), and are
   played here the way the kit plays them:

     * the rig is a Blender armature: each bone's rest matrix, its parent, and
       a pose of location, rotation and scale per bone, chained;
     * the legs and arms are two-bone IK chains onto targets (IK angle, IK
       frist) with poles (IK knee, IK elbow), solved as Blender's IK solver
       ends up: the chain bent in its rest plane, then turned about the line
       to the target until the root bone's X axis (turned by the pole angle)
       faces the pole; the torso is a chain onto IK Torso Controller and takes
       its turn; the Switch bone pushed forward pins the left hand to the
       right hand's Pole, two-handed;
     * the Med2 bones ride the rig, and each one's turn from its rest is put
       on the model's own skeleton (the game's axes are Blender's with y and z
       swapped), chained over the skeleton's own bone lengths.

   A pose is applied whole or by body part, and the controllers are dragged
   with the mouse in the card maker's HD view (cardgen.js). The arithmetic is
   pure, so tests/test_armory.py runs it under node against Blender's own
   solve of thirteen of the kit's poses.
   ========================================================================= */

/* --- 3x4 affine matrices, row-major: [r00 r01 r02 tx, r10 r11 r12 ty, r20 r21 r22 tz] --- */

function crMul(a, b){
  const o = new Array(12);
  for(let r = 0; r < 3; r++){
    for(let c = 0; c < 4; c++){
      o[r*4+c] = a[r*4]*b[c] + a[r*4+1]*b[4+c] + a[r*4+2]*b[8+c] + (c === 3 ? a[r*4+3] : 0);
    }
  }
  return o;
}
function crInv(m){
  // the inverse of an affine matrix: its 3x3 inverted, the move taken back
  const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
  const A = e*i - f*h, B = -(d*i - f*g), C = d*h - e*g;
  const det = a*A + b*B + c*C || 1e-12;
  const r = [A/det, -(b*i - c*h)/det, (b*f - c*e)/det,
             B/det, (a*i - c*g)/det, -(a*f - c*d)/det,
             C/det, -(a*h - b*g)/det, (a*e - b*d)/det];
  const t = [m[3], m[7], m[11]];
  return [r[0], r[1], r[2], -(r[0]*t[0] + r[1]*t[1] + r[2]*t[2]),
          r[3], r[4], r[5], -(r[3]*t[0] + r[4]*t[1] + r[5]*t[2]),
          r[6], r[7], r[8], -(r[6]*t[0] + r[7]*t[1] + r[8]*t[2])];
}
const crRot = m => [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
const crPos = m => [m[3], m[7], m[11]];
const crAff = (r, t) => [r[0], r[1], r[2], t[0], r[3], r[4], r[5], t[1], r[6], r[7], r[8], t[2]];
const crR3 = (r, v) => [r[0]*v[0] + r[1]*v[1] + r[2]*v[2], r[3]*v[0] + r[4]*v[1] + r[5]*v[2], r[6]*v[0] + r[7]*v[1] + r[8]*v[2]];
function crR3Mul(a, b){
  const o = new Array(9);
  for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++) o[r*3+c] = a[r*3]*b[c] + a[r*3+1]*b[3+c] + a[r*3+2]*b[6+c];
  return o;
}
/* A turn without its scale, as Copy Rotation takes it: the columns made
   unit and square again (Gram-Schmidt, y kept first). */
function crPure(r){
  const y = crNorm([r[1], r[4], r[7]]);
  let z = [r[2], r[5], r[8]];
  z = crNorm(crSub(z, crScl(y, crDot(z, y))));
  const x = crCross(y, z);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}
const crT3 = r => [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
const crSub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const crAdd = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const crScl = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
const crDot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const crCross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const crLen = a => Math.hypot(a[0], a[1], a[2]);
const crNorm = a => { const l = crLen(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };

/* A turn about a unit axis, as a row-major 3x3. */
function crAxisAngle(ax, t){
  const [x, y, z] = ax, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [c + x*x*k, x*y*k - z*s, x*z*k + y*s,
          y*x*k + z*s, c + y*y*k, y*z*k - x*s,
          z*x*k - y*s, z*y*k + x*s, c + z*z*k];
}
/* The shortest turn taking unit a onto unit b. */
function crSwing(a, b){
  const ax = crCross(a, b), s = crLen(ax), c = Math.max(-1, Math.min(1, crDot(a, b)));
  if(s < 1e-9){
    if(c > 0) return [1,0,0, 0,1,0, 0,0,1];
    // opposite: half a turn about any axis square to a
    const o = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return crAxisAngle(crNorm(crCross(a, o)), Math.PI);
  }
  return crAxisAngle(crScl(ax, 1 / s), Math.atan2(s, c));
}
/* Blender's quaternion, w first, as a row-major 3x3. */
function crQuat(q){
  let [w, x, y, z] = q;
  const n = Math.hypot(w, x, y, z) || 1; w /= n; x /= n; y /= n; z /= n;
  return [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w),
          2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w),
          2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)];
}
/* Euler XYZ (Blender's default order: x turned first) both ways. */
function crEuler(e){
  const X = crAxisAngle([1, 0, 0], e[0]), Y = crAxisAngle([0, 1, 0], e[1]), Z = crAxisAngle([0, 0, 1], e[2]);
  return crR3Mul(Z, crR3Mul(Y, X));
}
function crToEuler(r){
  const sy = Math.max(-1, Math.min(1, -r[6]));
  const y = Math.asin(sy);
  if(Math.abs(sy) < 0.99999) return [Math.atan2(r[7], r[8]), y, Math.atan2(r[3], r[0])];
  return [Math.atan2(-r[5], r[4]), y, 0];
}
function crToQuat(r){
  const tr = r[0] + r[4] + r[8];
  let w, x, y, z;
  if(tr > 0){ const s = Math.sqrt(tr + 1) * 2; w = s/4; x = (r[7]-r[5])/s; y = (r[2]-r[6])/s; z = (r[3]-r[1])/s; }
  else if(r[0] > r[4] && r[0] > r[8]){ const s = Math.sqrt(1 + r[0] - r[4] - r[8]) * 2; w = (r[7]-r[5])/s; x = s/4; y = (r[1]+r[3])/s; z = (r[2]+r[6])/s; }
  else if(r[4] > r[8]){ const s = Math.sqrt(1 + r[4] - r[0] - r[8]) * 2; w = (r[2]-r[6])/s; x = (r[1]+r[3])/s; y = s/4; z = (r[5]+r[7])/s; }
  else{ const s = Math.sqrt(1 + r[8] - r[0] - r[4]) * 2; w = (r[3]-r[1])/s; x = (r[2]+r[6])/s; y = (r[5]+r[7])/s; z = s/4; }
  return [w, x, y, z];
}

/* --- the rig ------------------------------------------------------------------ */

/* A rig layout from the data: by name, each bone's rest relative to its
   parent, and the bones under each. */
function crRig(bones){
  const byName = new Map(bones.map((b, i) => [b.n, i]));
  const rel = bones.map(b => b.p < 0 ? b.m.slice() : crMul(crInv(bones[b.p].m), b.m));
  const kids = bones.map(() => []);
  bones.forEach((b, i) => { if(b.p >= 0) kids[b.p].push(i); });
  return {bones, byName, rel, kids};
}

/* One bone's pose (Blender's matrix_basis): its move, turn and scale from
   rest, in its own frame. The two limits the kit sets on it are kept. */
function crBasis(rig, i, basis){
  const name = rig.bones[i].n, ch = basis[name] || {};
  let r = ch.q ? crQuat(ch.q) : ch.e ? crEuler(ch.e) : [1,0,0, 0,1,0, 0,0,1];
  let l = (ch.l || [0, 0, 0]).slice();
  const lim = CR_LIMITS[name];
  if(lim){
    const e = crToEuler(r);
    for(let k = 0; k < 3; k++) e[k] = Math.max(lim[k][0], Math.min(lim[k][1], e[k]));
    r = crEuler(e);
  }
  if(name === 'Switch'){ l = [0, Math.max(-0.05, Math.min(0.05, l[1])), 0]; }
  const s = ch.s || [1, 1, 1];
  return crAff([r[0]*s[0], r[1]*s[1], r[2]*s[2], r[3]*s[0], r[4]*s[1], r[5]*s[2], r[6]*s[0], r[7]*s[1], r[8]*s[2]], l);
}
/* control_rig.py's two Limit Rotation constraints, local, in radians. */
const CR_LIMITS = {
  'IK Head': [[-0.959931, 0.436332], [-0.785398, 0.785398], [-1.39626, 1.39626]],
  'IK Torso Controller': [[0, 0], [0, 0], [-Math.PI / 2, Math.PI / 2]],
};

/* The whole rig posed: every bone's matrix in the armature's space, as
   Blender's pose_bone.matrix. */
function crSolve(rig, basis, type){
  const B = rig.bones, W = new Array(B.length), fixed = new Set();
  const at = n => rig.byName.get(n);
  const fk = i => { const b = B[i]; W[i] = b.p < 0 ? crMul(b.m, crBasis(rig, i, basis)) : crMul(crMul(W[b.p], rig.rel[i]), crBasis(rig, i, basis)); };
  // everything under bone i again, the bones a constraint has set kept
  const under = i => { for(const k of rig.kids[i]){ if(!fixed.has(k)) fk(k); under(k); } };
  for(let i = 0; i < B.length; i++) fk(i);
  const head = n => crPos(W[at(n)]);
  const tail = n => { const i = at(n); return crAdd(crPos(W[i]), crR3(crRot(W[i]), [0, B[i].l, 0])); };

  const chain = (a, b, target, pole, angle) => {
    const A = at(a), Bi = at(b);
    if(A === undefined || Bi === undefined) return;
    crIk(rig, W, A, Bi, target, pole, angle);
    fixed.add(A); fixed.add(Bi);
    under(A);
  };
  // the legs
  chain('IK thigh right', 'IK calf right', head('IK angle right'), head('IK knee right'), Math.PI / 2);
  chain('IK thigh left', 'IK calf left', head('IK angle left'), head('IK knee left'), Math.PI / 2);
  // the torso onto its controller, and its turn: Blender runs the Copy
  // Rotation first and the IK solver starts from it, so the torso points
  // where the IK sends it and keeps the controller's twist about that line
  chain('IK Abs', 'IK Torso', head('IK Torso Controller'), null, 0);
  const T = at('IK Torso'), TC = at('IK Torso Controller');
  if(T !== undefined && TC !== undefined){
    const yOf = r => crNorm([r[1], r[4], r[7]]);
    const cr = crPure(crRot(W[TC]));
    W[T] = crAff(crR3Mul(crSwing(yOf(cr), yOf(crRot(W[T]))), cr), crPos(W[T]));
    under(T);
  }
  // the Switch bone pushed forward: two hands on one weapon
  const sw = ((basis.Switch || {}).l || [0, 0, 0])[1] > 0;
  if(sw && type === 'archer'){
    const S = at('IK Bow String');
    if(S !== undefined && at('bone_sling') !== undefined){ W[S] = crAff(crRot(W[S]), head('bone_sling')); fixed.add(S); under(S); }
  }else if(sw){
    const L = at('IK frist  left'), P = at('Pole');
    if(L !== undefined && P !== undefined){ W[L] = crAff(crPure(crRot(W[P])), tail('Pole')); fixed.add(L); under(L); }
  }
  // the arms onto the fists
  chain('IK upper arm right', 'IK lower arm right', head('IK frist right'), head('IK elbow right'), 0);
  chain('IK upper arm left', 'IK lower arm left', head('IK frist  left'), head('IK elbow left'), Math.PI);
  return W;
}

/* A two-bone chain (a, then b) whose end reaches `target`, as Blender's IK
   leaves it: bent in its rest plane by the triangle its lengths make, swung
   onto the target, then turned about the line to it until the root's X axis,
   turned by the pole angle about its Y, faces the pole. Over every pose of
   the kit on its three rigs, Blender's own solve and this one put the Med2
   bones within 1.1 cm of each other at the median, 9 cm at the 90th centile. */
function crIk(rig, W, a, b, target, pole, angle){
  crIkRest(rig, W, a, b, target, pole, angle);
  if(!pole) return;
  const S = crPos(W[a]), E = crPos(W[b]), dir = crNorm(crSub(target, S));
  const flat = v => crSub(v, crScl(dir, crDot(v, dir)));
  if(crDot(flat(crSub(E, S)), flat(crSub(pole, S))) < 0) crIkPlane(rig, W, a, b, target, pole, angle);
}
function crIkRest(rig, W, a, b, target, pole, angle){
  const A = rig.bones[a], Bb = rig.bones[b];
  const base = A.p < 0 ? A.m : crMul(W[A.p], rig.rel[a]);
  const S = crPos(base), FA0 = crRot(base);
  const LA = A.l, LB = Bb.l, MAB = crRot(rig.rel[b]), offB = crPos(rig.rel[b]);
  const Y = [0, 1, 0], dB = crR3(MAB, Y);
  const theta0 = Math.acos(Math.max(-1, Math.min(1, crDot(Y, dB))));
  let nL = crCross(Y, dB);
  nL = crLen(nL) > 1e-6 ? crNorm(nL) : [1, 0, 0];
  const to = crSub(target, S);
  const D = Math.max(Math.abs(LA - LB) + 1e-6, Math.min(LA + LB - 1e-6, crLen(to) || 1e-6));
  const theta = Math.acos(Math.max(-1, Math.min(1, (D*D - LA*LA - LB*LB) / (2 * LA * LB))));
  const bend = crAxisAngle(nL, theta - theta0);
  const MAB2 = crR3Mul(bend, MAB);
  // the chain's end, in a's frame: b's head where it is, then along b
  const endL = crAdd(offB, crScl(crR3(bend, dB), LB));
  const dir = crLen(to) > 1e-9 ? crNorm(to) : crNorm(crR3(FA0, endL));
  let FA = crR3Mul(crSwing(crNorm(crR3(FA0, endL)), dir), FA0);
  if(pole){
    const up = crR3(FA, [Math.cos(angle), 0, Math.sin(angle)]);
    const flat = v => { const p = crSub(v, crScl(dir, crDot(v, dir))); return crLen(p) > 1e-9 ? crNorm(p) : null; };
    const u = flat(up), p = flat(crSub(pole, S));
    if(u && p){
      const phi = Math.atan2(crDot(crCross(u, p), dir), crDot(u, p));
      FA = crR3Mul(crAxisAngle(dir, phi), FA);
    }
  }
  W[a] = crAff(FA, S);
  W[b] = crAff(crR3Mul(FA, MAB2), crAdd(S, crR3(FA, offB)));
}

/* The other way, for a chain folded so far that bending in its rest plane
   puts the elbow on the far side of the pole, which Blender never does: the
   elbow in the plane of the shoulder, the target and the pole, on the
   pole's side; the root twisted about its own line by the pole rule; the
   second bone the least turn onto the target. */
function crIkPlane(rig, W, a, b, target, pole, angle){
  const A = rig.bones[a], Bb = rig.bones[b];
  const base = A.p < 0 ? A.m : crMul(W[A.p], rig.rel[a]);
  const S = crPos(base), FA0 = crRot(base);
  const LA = A.l, LB = Bb.l, MAB = crRot(rig.rel[b]), offB = crPos(rig.rel[b]);
  const to = crSub(target, S);
  const D = Math.max(Math.abs(LA - LB) + 1e-6, Math.min(LA + LB - 1e-6, crLen(to) || 1e-6));
  const dir = crLen(to) > 1e-9 ? crNorm(to) : crNorm(crR3(FA0, [0, 1, 0]));
  const flat = v => { const p = crSub(v, crScl(dir, crDot(v, dir))); return crLen(p) > 1e-9 ? crNorm(p) : null; };
  // the side the elbow goes: the pole's, else the side it bends to at rest
  const restEnd = crR3(FA0, crAdd(offB, crScl(crR3(MAB, [0, 1, 0]), LB)));
  const restKnee = crR3(FA0, offB);
  let side = pole ? flat(crSub(pole, S)) : null;
  if(!side) side = flat(crSub(restKnee, crScl(crNorm(restEnd), crDot(restKnee, crNorm(restEnd))))) || flat(crR3(FA0, [1, 0, 0])) || [1, 0, 0];
  const along = (LA*LA - LB*LB + D*D) / (2*D), up = Math.sqrt(Math.max(0, LA*LA - along*along));
  const E = crAdd(S, crAdd(crScl(dir, along), crScl(side, up)));
  // a: its Y onto the elbow, the least turn from rest, then twisted about its
  // Y until its X (turned by the pole angle) faces the pole across dir
  let FA = crR3Mul(crSwing(crNorm(crR3(FA0, [0, 1, 0])), crNorm(crSub(E, S))), FA0);
  if(pole){
    const ya = crNorm(crSub(E, S)), want = flat(crSub(pole, S));
    if(want){
      let best = 0, bv = -2;
      const score = psi => { const R = crR3Mul(crAxisAngle(ya, psi), FA); const u = flat(crR3(R, [Math.cos(angle), 0, Math.sin(angle)])); return u ? crDot(u, want) : -2; };
      for(let k = 0; k < 72; k++){ const p = k * Math.PI / 36; const v = score(p); if(v > bv){ bv = v; best = p; } }
      for(let step = Math.PI / 72; step > 1e-5; step /= 2){
        const l = score(best - step), r = score(best + step);
        if(l > bv){ bv = l; best -= step; } else if(r > bv){ bv = r; best += step; }
      }
      FA = crR3Mul(crAxisAngle(ya, best), FA);
    }
  }
  // b: from where a carries it, its Y onto the target, the least turn
  const FB0 = crR3Mul(FA, MAB), hb = crAdd(S, crR3(FA, offB));
  const FB = crR3Mul(crSwing(crNorm(crR3(FB0, [0, 1, 0])), crNorm(crSub(target, hb))), FB0);
  W[a] = crAff(FA, S);
  W[b] = crAff(FB, hb);
}

/* --- onto the model's skeleton --------------------------------------------------- */

/* The game's axes from Blender's: y and z swapped (a mirror, which turns a
   right-handed turn into the left-handed space's own). */
const CR_SWAP = [1,0,0, 0,0,1, 0,1,0];
const crToGame = v => [v[0], v[2], v[1]];

/* The rig's pose on an animation's skeleton, in v3aPose's form (each track's
   world turn and place), for v3aSkin with v3aBind's bind pose. A bone the
   rig has (by name, either spelling) takes its turn from rest; one it has
   not goes with its parent; places are chained over the skeleton's own
   bone lengths, the pelvis moved as the rig's moved. */
function crPoseOn(rig, W, anim){
  const bind = v3aBind(anim);
  const lower = new Map();
  rig.bones.forEach((b, i) => { if(b.c === 'm' && !lower.has(b.n.toLowerCase())) lower.set(b.n.toLowerCase(), i); });
  const hub = anim.bones.findIndex(b => b.parent === 0);
  const out = [];
  anim.bones.forEach((b, i) => {
    const ri = lower.get((b.name || '').toLowerCase());
    let m;
    if(ri !== undefined){
      const d = crR3Mul(crRot(W[ri]), crT3(crRot(rig.bones[ri].m)));
      m = crR3Mul(CR_SWAP, crR3Mul(d, CR_SWAP));
    }else m = b.parent >= 0 && out[b.parent] ? out[b.parent].m : [1,0,0, 0,1,0, 0,0,1];
    let p;
    if(b.parent < 0 || !out[b.parent]) p = bind[i].slice();
    else if(i === hub && ri !== undefined){
      p = crAdd(bind[i], crToGame(crSub(crPos(W[ri]), crPos(rig.bones[ri].m))));
    }else{
      const par = out[b.parent];
      p = crAdd(par.p, crR3(par.m, crSub(bind[i], bind[b.parent])));
    }
    out.push({m, p});
  });
  return out;
}

/* --- body parts, for a pose applied in part ------------------------------------- */

const CR_PARTS = {
  arms: /frist|pole|switch|elbow|arm|clavical|hand|bow string|sling|weapon|shield/i,
  legs: /angle|knee|thigh|calf|lowerleg|foot/i,
  head: /head|jaw|eyebrow/i,
  posture: /pelvis|torso|abs/i,
};
const crPartOf = name => Object.keys(CR_PARTS).find(k => CR_PARTS[k].test(name)) || 'posture';

/* A library pose onto a rig's pose, whole or in part: the bones of the part
   go back to rest and take the pose's values, the rest stay as they were. */
function crApply(basis, pose, part){
  const out = {};
  for(const [n, ch] of Object.entries(basis || {})) if(part !== 'whole' && crPartOf(n) !== part) out[n] = ch;
  for(const [n, ch] of Object.entries(pose.b || {})){
    if(part !== 'whole' && crPartOf(n) !== part) continue;
    out[n] = JSON.parse(JSON.stringify(ch));
  }
  return out;
}

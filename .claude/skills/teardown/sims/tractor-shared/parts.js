// Shared geometry for the tractor: gears cut from their tooth counts (external, internal, helical by twisting the
// extrusion), turned parts from a profile, tubes and cylinders along z. Everything in metres.
import * as THREE from 'three';

// ------------------------------------------------------------ gear geometry
/** a gear about z: z teeth at module m, face width w; helix > 0 right hand, < 0 left, 0 straight; bore radius */
export function gearGeo(z, w, {m, helix = 0, bore = 0, steps, internal = 0} = {}) {
  const r0 = (m * z) / 2;
  // an internal gear: the cut is a hole whose bumps are the gaps (out to r0 + 1.25 m) and whose dips are the teeth
  const ra = internal ? r0 + 1.25 * m : r0 + m;
  const rr = internal ? r0 - m : r0 - 1.25 * m;
  const hpitch = Math.PI / z;
  // half tooth angle at root, pitch and tip; the flank bows between them
  const hR = 0.64 * hpitch;
  const hP = 0.5 * hpitch;
  const hT = 0.24 * hpitch;
  const uP = (r0 - rr) / (ra - rr);
  const half = (u) => (u < uP ? hR + (hP - hR) * Math.pow(u / uP, 0.9) : hP + (hT - hP) * ((u - uP) / (1 - uP)));
  const sh = internal ? new THREE.Path() : new THREE.Shape();
  const F = [0, 0.2, 0.42, uP, 0.78, 1];
  let first = true;
  const pt = (r, a) => {
    if (first) sh.moveTo(r * Math.cos(a), r * Math.sin(a));
    else sh.lineTo(r * Math.cos(a), r * Math.sin(a));
    first = false;
  };
  for (let i = 0; i < z; i++) {
    const ac = i * 2 * hpitch;
    pt(rr, ac - hpitch);
    for (const u of F) pt(rr + (ra - rr) * u, ac - half(u));
    for (const u of [...F].reverse()) pt(rr + (ra - rr) * u, ac + half(u));
  }
  sh.closePath();
  let shape = sh;
  if (internal) {
    shape = new THREE.Shape();
    shape.absarc(0, 0, internal, 0, Math.PI * 2, false);
    shape.holes.push(sh);
  }
  if (bore) {
    const h = new THREE.Path();
    h.absarc(0, 0, bore, 0, Math.PI * 2, true);
    sh.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(shape, {depth: w, steps: steps ?? (helix ? 6 : 1), bevelEnabled: true, bevelThickness: m * 0.25, bevelSize: m * 0.18, bevelSegments: 1, curveSegments: 24});
  g.translate(0, 0, -w / 2);
  if (helix) {
    const p = g.attributes.position;
    const k = Math.tan(helix) / r0;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const a = p.getZ(i) * k;
      const c = Math.cos(a);
      const s = Math.sin(a);
      p.setXY(i, x * c - y * s, x * s + y * c);
    }
  }
  g.computeVertexNormals();
  return g;
}
// a turned part about z from a profile [[r, z], ...]
export const lathe = (prof, seg = 64, half = false) => {
  const g = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), half ? seg / 2 : seg, half ? Math.PI : 0, half ? Math.PI : Math.PI * 2);
  g.rotateX(Math.PI / 2);
  return g;
};
export const tube = (r0, r1, z0, z1, seg = 48) => lathe([[r0, z0], [r1, z0], [r1, z1], [r0, z1], [r0, z0]], seg);
export const cyl = (r, z0, z1, seg = 32) => {
  const g = new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
};


/** a cylinder along an arbitrary axis: 'x' | 'y' | 'z' */
export const rod = (r, len, axis = 'z', seg = 24) => {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
};
/** a bevel gear about z: the teeth taper toward the apex (+z) along a pitch cone of half-angle `cone`; heel pitch
 * radius r, face length f along the axis */
export function bevelGeo(z, r, f, cone, bore = 0) {
  const g = gearGeo(z, f, {m: (2 * r) / z, bore});
  const p = g.attributes.position;
  const t = Math.tan(cone);
  for (let i = 0; i < p.count; i++) {
    const k = 1 - ((p.getZ(i) + f / 2) * t) / r;
    p.setXY(i, p.getX(i) * k, p.getY(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

// Every part of the rear axle centre as its own mesh group, in the tractor's frame (axle along x, pinion along z):
// the centre housing with its side bores and pinion neck, the right side already in place, the 9-tooth pinion with
// its two taper bearings, shim, tab washer and nut; the two-piece differential case, the two side gears and their
// bronze washers, the cross pin with two spider gears and their spherical bronze washers, the 43-tooth crown with 12
// bolts, the case bearings, cups and backlash shims, the lock collar with its fork, rod and spring, the left half shaft.
// update(st) places every part between exploded and installed, turns the pinion, the crown and case, both side gears
// and the spiders (straight, in a curve, locked), lights the power path and cuts the housing.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {bevelGeo, cyl, gearGeo, lathe, tube} from '../tractor-shared/parts.js';
import {AXLE, CROWN_BOLTS, CROWN_R, diffAngles, groupAt, installed, PARTS, PIN_R, Z} from './model.js';

const V3 = THREE.Vector3;
const gP = Math.atan(Z.pin / Z.crown);
const gS = Math.atan(Z.side / Z.spider);
// geometry about z -> about x (toward +x) or toward -x
const toX = (g, s = 1) => g.rotateY((s * Math.PI) / 2);
const latheX = (prof, seg, s = 1) => toX(lathe(prof, seg), s);

function hexHead(r, h) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    i ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  sh.closePath();
  return new THREE.ExtrudeGeometry(sh, {depth: h, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1});
}
function taper(ri, ro, z0, z1, n) {
  const out = [lathe([[ri, z0], [ri + (ro - ri) * 0.35, z0], [ri + (ro - ri) * 0.3, z1], [ri, z1], [ri, z0]], 48)];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const g = new THREE.CylinderGeometry((ro - ri) * 0.17, (ro - ri) * 0.21, (z1 - z0) * 0.85, 10).rotateX(Math.PI / 2);
    out.push(g.translate(((ri + ro) / 2) * Math.cos(a), ((ri + ro) / 2) * Math.sin(a), (z0 + z1) / 2));
  }
  return out;
}

export function buildAxle() {
  const std = (color, metalness, roughness, env = 1) => new THREE.MeshStandardMaterial({color, metalness, roughness, envMapIntensity: env});
  const M = {
    steel: std('#d0d4d9', 1, 0.22, 1.2),
    dark: std('#7f868d', 0.9, 0.35),
    bright: std('#e6e9ec', 1, 0.14, 1.2),
    bronze: std('#c4974a', 0.9, 0.32),
    cast: new THREE.MeshPhysicalMaterial({color: '#3f6f7c', metalness: 0.3, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3}),
    zinc: std('#d6cfa8', 0.9, 0.35),
    fork: std('#596069', 0.6, 0.5),
  };
  const CUT = [new THREE.Plane(new V3(0, 0, 1), 0), new THREE.Plane(new V3(0, -1, 0), 0)];
  M.cut = M.cast.clone();
  M.cut.clippingPlanes = CUT;
  M.cut.clipIntersection = true;
  M.caseCut = M.steel.clone();
  M.caseCut.clippingPlanes = CUT;
  M.caseCut.clipIntersection = true;
  M.cap = new THREE.MeshBasicMaterial({color: '#e4e1d8', side: THREE.BackSide, clippingPlanes: CUT, clipIntersection: true});
  // the outlines of a cutaway drawing on every casting (clipped with it)
  M.line = new THREE.LineBasicMaterial({color: '#14232b', transparent: true, opacity: 0.6, clippingPlanes: CUT, clipIntersection: true});
  const root = new THREE.Group();
  const groups = {base: new THREE.Group(), pin: new THREE.Group(), diff: new THREE.Group()};
  for (const g of Object.values(groups)) root.add(g);
  const G = {};
  const add = (R, geo, mat, cut = false, parent = null) => {
    const m = new THREE.Mesh(geo, mat.clone());
    if (m.material.clippingPlanes) m.material.clippingPlanes = CUT;
    m.castShadow = true;
    m.receiveShadow = true;
    (parent ?? R.spin).add(m);
    R.meshes.push(m);
    if (cut) {
      const c = new THREE.Mesh(geo, M.cap);
      c.renderOrder = -1;
      m.add(c);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), M.line));
    }
    return m;
  };
  for (const p of PARTS) {
    const g = new THREE.Group();
    const spin = new THREE.Group();
    g.add(spin);
    groups[p.grp].add(g);
    const R = (G[p.id] = {p, g, spin, meshes: []});
    spin.position.y = AXLE;
    switch (p.kind) {
      case 'centreHousing': {
        add(R, latheX([[0.06, -0.21], [0.2, -0.21], [0.235, -0.15], [0.245, 0.0], [0.235, 0.15], [0.2, 0.21], [0.06, 0.21], [0.06, 0.2], [0.13, 0.2], [0.13, 0.14], [0.21, 0.12], [0.215, 0.0], [0.21, -0.12], [0.13, -0.14], [0.13, -0.2], [0.06, -0.2], [0.06, -0.21]], 96), M.cut, true);
        // the pinion neck toward the gearbox
        add(R, lathe([[0.055, 0.16], [0.08, 0.16], [0.08, 0.37], [0.055, 0.37], [0.055, 0.16]], 64), M.cut, true);
        break;
      }
      case 'rightSide':
        add(R, latheX([[0.04, 0.21], [0.1, 0.21], [0.085, 0.3], [0.085, 0.52], [0.155, 0.56], [0.16, 0.64], [0.06, 0.66], [0.04, 0.66], [0.04, 0.21]], 64, -1), M.cut, true);
        add(R, toX(cyl(0.028, 0.06, 0.6, 24), -1), M.steel);
        break;
      case 'pinion': {
        add(R, bevelGeo(Z.pin, PIN_R, 0.04, gP, 0).rotateY(Math.PI).translate(0, 0, CROWN_R - 0.02), M.steel);
        add(R, cyl(0.024, CROWN_R, 0.37, 28), M.steel);
        add(R, gearGeo(22, 0.04, {m: 0.002}).translate(0, 0, 0.35), M.steel);
        break;
      }
      case 'taperCone':
        for (const geo of taper(p.r[0], p.r[1], p.at - 0.012, p.at + 0.012, 14)) add(R, geo, M.bright);
        break;
      case 'pinCups':
        for (const z of [0.17, 0.31]) add(R, tube(0.045, 0.055, z - 0.012, z + 0.012, 48), M.bright);
        break;
      case 'shim':
        add(R, tube(0.045, 0.056, 0.156, 0.158, 48), M.zinc);
        break;
      case 'pinWasher':
        add(R, tube(0.0242, 0.04, 0.326, 0.328, 40), M.bright);
        break;
      case 'pinNut':
        add(R, hexHead(0.04, 0.014).translate(0, 0, 0.329), M.dark);
        break;
      case 'caseHalf': {
        const s = p.side;
        add(R, latheX([[0.03, 0.0], [0.072, 0.0], [0.075, 0.04], [0.06, 0.075], [0.035, 0.075], [0.035, 0.125], [0.028, 0.125], [0.028, 0.06], [0.03, 0.0]], 64, s), M.caseCut, true);
        if (s < 0) add(R, latheX([[0.06, 0.03], [0.108, 0.03], [0.108, 0.046], [0.06, 0.046], [0.06, 0.03]], 64, -1), M.caseCut, true);
        if (s > 0) add(R, toX(gearGeo(20, 0.008, {m: 0.0032, bore: 0.03}).translate(0, 0, 0.121), 1), M.steel); // dogs for the lock
        break;
      }
      case 'sideGear': {
        const s = p.side;
        const g0 = bevelGeo(Z.side, 0.045, 0.016, gS, 0.018);
        add(R, toX(g0, -s).translate(s * (0.05 - 0.008), 0, 0), M.steel);
        add(R, latheX([[0.018, 0.05], [0.03, 0.05], [0.03, 0.1], [0.018, 0.1], [0.018, 0.05]], 40, s), M.steel);
        break;
      }
      case 'sideWasher':
        add(R, latheX([[0.03, 0.058], [0.05, 0.058], [0.05, 0.0605], [0.03, 0.0605], [0.03, 0.058]], 48, p.side), M.bronze);
        break;
      case 'crossPin':
        add(R, new THREE.CylinderGeometry(0.01, 0.01, 0.15, 16), M.bright);
        break;
      case 'spider': {
        // the spider turns about the cross pin (y); it hangs from an inner group so it can
        const inner = new THREE.Group();
        R.spin.add(inner);
        R.inner = inner;
        const g0 = bevelGeo(Z.spider, 0.029, 0.016, Math.PI / 2 - gS, 0.0105);
        g0.rotateX((p.side * Math.PI) / 2);
        g0.translate(0, p.side * (0.05 - 0.008), 0);
        add(R, g0, M.steel, false, inner);
        break;
      }
      case 'spiderWasher':
        add(R, new THREE.SphereGeometry(0.03, 24, 8, 0, Math.PI * 2, 0, 0.6).rotateX(p.side > 0 ? 0 : Math.PI).translate(0, p.side * 0.032, 0), M.bronze);
        break;
      case 'crown': {
        add(R, toX(bevelGeo(Z.crown, CROWN_R, 0.02, Math.PI / 2 - gP, 0.09), 1).translate(-PIN_R - 0.01, 0, 0), M.steel);
        add(R, latheX([[0.09, 0.025], [0.12, 0.025], [0.12, 0.045], [0.09, 0.045], [0.09, 0.025]], 72, -1), M.steel);
        break;
      }
      case 'crownBolt': {
        const a = (p.bolt / CROWN_BOLTS) * Math.PI * 2;
        const head = toX(hexHead(0.009, 0.007), -1).translate(-0.047, Math.sin(a) * 0.1, Math.cos(a) * 0.1);
        add(R, head, M.dark);
        add(R, toX(cyl(0.005, 0.03, 0.047, 10), -1).translate(0, Math.sin(a) * 0.1, Math.cos(a) * 0.1), M.dark);
        break;
      }
      case 'taperConeX':
        for (const geo of taper(0.03, 0.05, 0.11, 0.13, 14)) add(R, toX(geo, p.side), M.bright);
        break;
      case 'diffCups':
        for (const s of [-1, 1]) add(R, toX(tube(0.05, 0.06, 0.11, 0.13, 48), s), M.bright);
        break;
      case 'diffShims':
        for (const s of [-1, 1]) add(R, toX(tube(0.05, 0.065, 0.131, 0.133, 48), s), M.zinc);
        break;
      case 'lockCollar':
        add(R, toX(lathe([[0.03, 0.135], [0.045, 0.135], [0.045, 0.142], [0.04, 0.142], [0.04, 0.148], [0.045, 0.148], [0.045, 0.155], [0.03, 0.155], [0.03, 0.135]], 48), 1), M.dark);
        add(R, toX(gearGeo(20, 0.006, {m: 0.0032, internal: 0.045}).translate(0, 0, 0.132), 1), M.dark);
        break;
      case 'lockFork': {
        const yoke = add(R, new THREE.TorusGeometry(0.043, 0.003, 8, 32, Math.PI * 1.1).rotateY(Math.PI / 2), M.fork);
        yoke.position.x = 0.145;
        yoke.rotation.x = -Math.PI * 0.05;
        add(R, toX(cyl(0.006, 0.12, 0.3, 12), 1).translate(0, 0.075, 0), M.bright);
        add(R, new RoundedBoxGeometry(0.01, 0.035, 0.012, 1, 0.003).translate(0.145, 0.06, 0), M.fork);
        break;
      }
      case 'lockSpring': {
        const pts = [];
        for (let i = 0; i <= 120; i++) pts.push(new V3(0.18 + i * 0.0008, 0.075 + 0.009 * Math.cos(i * 0.6), 0.009 * Math.sin(i * 0.6)));
        add(R, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0012, 5), M.bright);
        break;
      }
      case 'halfShaft':
        add(R, toX(cyl(0.028, 0.065, 0.62, 24), 1), M.steel);
        add(R, toX(gearGeo(24, 0.04, {m: 0.0022}).translate(0, 0, 0.08), 1), M.steel);
        break;
    }
  }

  const ACC = new THREE.Color('#f2661c');
  const base0 = new Map();
  for (const r of Object.values(G)) for (const m of r.meshes) base0.set(m, m.material.color.clone());
  const setLook = (r, hot, fade) => {
    for (const m of r.meshes) {
      m.material.color.copy(base0.get(m)).lerp(ACC, hot * 0.72);
      if (m.material.emissive) m.material.emissive.copy(ACC).multiplyScalar(hot * 0.16);
      const want = fade > 0.01;
      if (m.material.transparent !== want) {
        m.material.transparent = want;
        m.material.needsUpdate = true;
      }
      m.material.opacity = 1 - fade;
      m.material.depthWrite = fade < 0.4;
    }
  };
  const PATH = ['pinhao', 'coroa', 'caixaA', 'caixaB', 'cruzeta', 'satelite0', 'satelite1', 'planetE', 'planetD', 'semieixoE', 'rightSide'];
  const tmp = new V3();
  /** st: u, active, func, thPin, split (rad, + left faster), lock 0..1, cut 0..1, camZ */
  const update = (st) => {
    const u = st.u;
    for (const k of ['pin', 'diff']) {
      const o = groupAt(k, u);
      groups[k].position.set(o.x, o.y, o.z);
    }
    // the cut: the quarter toward the camera (behind) and above the axle
    const side = (st.camZ ?? -1) >= 0 ? 1 : -1;
    CUT[0].normal.set(0, 0, -side);
    CUT[0].constant = 0;
    CUT[1].normal.set(0, -1, 0);
    CUT[1].constant = AXLE + 0.5 - 0.5 * (st.cut ?? 0);
    M.cap.visible = (st.cut ?? 0) > 0.001;
    const A = diffAngles(st.thPin ?? 0, st.split ?? 0);
    for (const r of Object.values(G)) {
      const p = r.p;
      const k = installed(p, u);
      const [ex, ey, ez] = p.ex;
      const kr = Math.min(1, k / 0.6);
      const kz = Math.min(1, Math.max(0, (k - 0.3) / 0.7));
      // radial (y, z for the diff parts; x, y for the pinion parts) first, then along the part's own axis
      if (p.grp === 'pin' || (p.grp === 'base' && ['conePinF', 'arruelaPin', 'porcaPin', 'capasPin', 'calcoPin'].includes(p.id))) r.g.position.set(ex * (1 - kr), ey * (1 - kr), ez * (1 - kz));
      else r.g.position.set(ex * (1 - kz), ey * (1 - kr), ez * (1 - kr));
      r.spin.rotation.set(0, 0, 0);
      if (st.func) {
        if (['pinhao', 'conePinT', 'conePinF', 'arruelaPin', 'porcaPin'].includes(p.id)) r.spin.rotation.z = A.pin;
        if (['coroa', 'caixaA', 'caixaB', 'cruzeta', 'coneDifE', 'coneDifD', 'arruelaSat0', 'arruelaSat1'].includes(p.id) || p.kind === 'crownBolt') r.spin.rotation.x = A.crown;
        if (p.id === 'planetE' || p.id === 'arruelaPlE' || p.id === 'semieixoE') r.spin.rotation.x = A.L;
        if (p.id === 'planetD' || p.id === 'arruelaPlD' || p.id === 'luvaBloq') r.spin.rotation.x = A.R;
        if (p.kind === 'spider') {
          r.spin.rotation.x = A.crown;
          r.inner.rotation.y = p.side * A.spider;
        }
      }
      if (p.id === 'luvaBloq' || p.id === 'garfoBloq') r.g.position.x -= (st.lock ?? 0) * 0.012;
      const hot = st.func ? (PATH.includes(p.id) ? 1 : 0) : st.active?.has(p.id) ? 1 : 0;
      setLook(r, hot, k < 0.02 && !hot ? st.ghost ?? 0 : 0);
    }
  };
  const centreOf = (id) => {
    const box = new THREE.Box3().setFromObject(G[id].g);
    if (box.isEmpty()) return G[id].g.getWorldPosition(tmp).clone();
    return box.getCenter(tmp).clone();
  };
  update({u: 0});
  return {root, update, G, M, centreOf, groups};
}

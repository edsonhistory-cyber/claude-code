// Every part of the 4-speed box as its own mesh group, built from code in metres from model.js: the case (walls,
// bores, top opening), the countershaft cluster and its roller bearings, the main shaft with needle bushes, three
// free gears with dog rings and cones, four bronze synchro rings, two hubs with struts and wire springs, two sleeves,
// the thrust washer, the pilot needle bearing, the rear ball bearing; the 23-tooth pilot shaft with its bearing; the
// front cover, gasket, seal and 6 bolts; the shift cover with 2 rails, 2 forks, their screws, detent balls and springs,
// the interlock pin, its gasket and 8 bolts. update(st) places every part between exploded and installed, turns the
// shafts, slides the sleeves and forks for the selected gear, lights the power path, cuts the case.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cyl, gearGeo, lathe, tube} from '../tractor-shared/parts.js';
import {angles, BOT, COVER_BOLTS, DOG, FRONT_BOLTS, groupAt, installed, MOD, PARTS, TOP, TRAVEL, Z, ZP} from './model.js';

const V3 = THREE.Vector3;
const HELIX = (22 * Math.PI) / 180;
const SH = 0.022;
const CASE = {x: 0.15, y0: BOT - 0.13, y1: TOP + 0.11, z0: 0.655, z1: 1.02, t: 0.012};
const TOPB = [[-0.12, 0.71], [-0.12, 0.79], [-0.12, 0.89], [-0.12, 0.97], [0.12, 0.97], [0.12, 0.89], [0.12, 0.79], [0.12, 0.71]];
// the rails run beside the main shaft, along it, on the case's side wall (as in the open TL box)
export const RAIL = [[0.095, TOP + 0.03], [0.095, TOP - 0.03]];
const HUBZ = [ZP.hub12, ZP.hub34];

function hexNut(r, h, bore = 0) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    i ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  sh.closePath();
  if (bore) {
    const h0 = new THREE.Path();
    h0.absarc(0, 0, bore, 0, Math.PI * 2, true);
    sh.holes.push(h0);
  }
  return new THREE.ExtrudeGeometry(sh, {depth: h, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1});
}
function snapRing(r0, r1, t) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, r1, 0.35, Math.PI * 2 - 0.35, false);
  sh.absarc(0, 0, r0, Math.PI * 2 - 0.35, 0.35, true);
  return new THREE.ExtrudeGeometry(sh, {depth: t, bevelEnabled: false, curveSegments: 40});
}
function plate(w, h, holes, depth) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, -h / 2);
  sh.lineTo(w / 2, -h / 2);
  sh.lineTo(w / 2, h / 2);
  sh.lineTo(-w / 2, h / 2);
  sh.closePath();
  for (const [x, y, r] of holes) {
    const p = new THREE.Path();
    p.absarc(x, y, r, 0, Math.PI * 2, true);
    sh.holes.push(p);
  }
  return new THREE.ExtrudeGeometry(sh, {depth, bevelEnabled: false, curveSegments: 40});
}
const sleeveGeo = () => lathe([[0.0365, -0.013], [0.048, -0.013], [0.049, -0.011], [0.049, -0.0045], [0.043, -0.004], [0.043, 0.004], [0.049, 0.0045], [0.049, 0.011], [0.048, 0.013], [0.0365, 0.013], [0.0365, -0.013]], 72);

export function buildGearbox() {
  const std = (color, metalness, roughness, env = 1) => new THREE.MeshStandardMaterial({color, metalness, roughness, envMapIntensity: env});
  const M = {
    steel: std('#d0d4d9', 1, 0.22, 1.2),
    dark: std('#7f868d', 0.9, 0.35),
    bright: std('#e6e9ec', 1, 0.14, 1.2),
    brass: std('#c4974a', 0.9, 0.32),
    cast: new THREE.MeshPhysicalMaterial({color: '#3f6f7c', metalness: 0.3, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3}),
    rubber: std('#1d1e20', 0, 0.7, 0.5),
    gasket: std('#c9b27c', 0, 0.85, 0.5),
    zinc: std('#d6cfa8', 0.9, 0.35),
    fork: std('#596069', 0.6, 0.5),
  };
  const CUT = [new THREE.Plane(new V3(-1, 0, 0), 0), new THREE.Plane(new V3(0, -1, 0), 0)];
  M.cut = M.cast.clone();
  M.cut.clippingPlanes = CUT;
  M.cut.clipIntersection = true;
  M.cap = new THREE.MeshBasicMaterial({color: '#e4e1d8', side: THREE.BackSide, clippingPlanes: CUT, clipIntersection: true});
  // the outlines of a cutaway drawing on every casting (clipped with it)
  M.line = new THREE.LineBasicMaterial({color: '#14232b', transparent: true, opacity: 0.6, clippingPlanes: CUT, clipIntersection: true});
  const root = new THREE.Group();
  const groups = {};
  for (const g of ['case', 'cs', 'main', 'cover']) {
    groups[g] = new THREE.Group();
    root.add(groups[g]);
  }
  const G = {};
  const add = (R, geo, mat, cut = false) => {
    const m = new THREE.Mesh(geo, mat.clone());
    if (m.material.clippingPlanes) m.material.clippingPlanes = CUT;
    m.castShadow = true;
    m.receiveShadow = true;
    R.spin.add(m);
    R.meshes.push(m);
    if (cut) {
      const c = new THREE.Mesh(geo, M.cap);
      c.renderOrder = -1;
      m.add(c);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), M.line));
    }
    return m;
  };
  const yOf = (p) => p.y ?? (p.grp === 'cs' ? BOT : TOP);
  const dogRing = (R, hz, gz) => {
    const side = hz > gz ? 1 : -1;
    const dz = hz - side * DOG;
    add(R, gearGeo(34, 0.006, {m: 0.002, bore: 0.0225}), M.steel).position.z = dz;
    // the synchro cone between dog ring and hub, and the neck back to the gear
    add(R, lathe([[0.0225, -0.004], [0.031, -0.004], [0.028, 0.004], [0.0225, 0.004], [0.0225, -0.004]], 48), M.bright).position.z = dz + side * 0.0065;
    const a = Math.min(dz - side * 0.003, gz + side * 0.011);
    const b = Math.max(dz - side * 0.003, gz + side * 0.011);
    if (b - a > 1e-4) add(R, tube(0.0225, 0.03, a, b), M.steel);
  };

  for (const p of PARTS) {
    const g = new THREE.Group();
    const spin = new THREE.Group();
    g.add(spin);
    if (p.grp !== 'front') groups[p.grp].add(g);
    const R = (G[p.id] = {p, g, spin, meshes: []});
    const y = yOf(p);
    spin.position.y = 0;
    const axisAt = (yy) => {
      g.userData.axisY = yy;
    };
    switch (p.kind) {
      case 'case': {
        const {x, y0, y1, z0, z1, t} = CASE;
        const W = 2 * x;
        const Hh = y1 - y0;
        add(R, new THREE.BoxGeometry(W, t, z1 - z0).translate(0, y0 + t / 2, (z0 + z1) / 2), M.cut, true);
        for (const s of [-1, 1]) add(R, new THREE.BoxGeometry(t, Hh, z1 - z0).translate(s * (x - t / 2), (y0 + y1) / 2, (z0 + z1) / 2), M.cut, true);
        add(R, plate(W, Hh, [[0, TOP - (y0 + y1) / 2, 0.05], [0, BOT - (y0 + y1) / 2, 0.045]], 0.03).translate(0, (y0 + y1) / 2, z1 - 0.03), M.cut, true);
        add(R, plate(W, Hh, [[0, TOP - (y0 + y1) / 2, 0.045], [0, BOT - (y0 + y1) / 2, 0.045]], 0.035).translate(0, (y0 + y1) / 2, z0), M.cut, true);
        // the top: a frame round the cover opening
        for (const s of [-1, 1]) add(R, new THREE.BoxGeometry(0.04, t, z1 - z0).translate(s * (x - 0.02), y1 - t / 2, (z0 + z1) / 2), M.cut, true);
        add(R, new THREE.BoxGeometry(W, t, 0.045).translate(0, y1 - t / 2, z0 + 0.0225), M.cut, true);
        add(R, new THREE.BoxGeometry(W, t, 0.04).translate(0, y1 - t / 2, z1 - 0.02), M.cut, true);
        // the inside is painted red, as on the line: a thin lining on the inner faces
        const red = new THREE.MeshStandardMaterial({color: '#b8372a', metalness: 0.1, roughness: 0.6, clippingPlanes: CUT, clipIntersection: true});
        const li = 0.0015;
        add(R, new THREE.BoxGeometry(W - 2 * t, li, z1 - z0 - 0.07).translate(0, y0 + t + li / 2, (z0 + z1) / 2 + 0.0025), red);
        for (const sx of [-1, 1]) add(R, new THREE.BoxGeometry(li, Hh - 2 * t, z1 - z0 - 0.07).translate(sx * (x - t - li / 2), (y0 + y1) / 2, (z0 + z1) / 2 + 0.0025), red);
        add(R, new THREE.BoxGeometry(W - 2 * t, Hh - 2 * t, li).translate(0, (y0 + y1) / 2, z1 - 0.03 - li / 2), red);
        add(R, new THREE.BoxGeometry(W - 2 * t, Hh - 2 * t, li).translate(0, (y0 + y1) / 2, z0 + 0.035 + li / 2), red);
        // ribs
        for (const z of [0.76, 0.88]) for (const s of [-1, 1]) add(R, new THREE.BoxGeometry(0.012, Hh * 0.8, 0.012).translate(s * (x + 0.006), (y0 + y1) / 2, z), M.cut, true);
        break;
      }
      case 'tractorFront':
        break;
      case 'cluster': {
        axisAt(BOT);
        spin.position.y = BOT;
        add(R, cyl(SH, 0.655, 0.99), M.steel);
        add(R, gearGeo(Z.c1, 0.024, {m: MOD, helix: HELIX, bore: 0.018}).translate(0, 0, ZP.m1), M.steel);
        add(R, gearGeo(Z.c2, 0.022, {m: MOD, helix: HELIX, bore: 0.018}).translate(0, 0, ZP.m2), M.steel);
        add(R, gearGeo(Z.c3, 0.02, {m: MOD, helix: HELIX, bore: 0.018}).translate(0, 0, ZP.m3), M.steel);
        add(R, gearGeo(Z.head, 0.026, {m: MOD, helix: -HELIX, bore: 0.018}).translate(0, 0, ZP.pilotGear), M.steel);
        break;
      }
      case 'rollerBrg':
      case 'ballBrg': {
        spin.position.y = y;
        const [ri, ro] = p.r ?? [0.022, 0.045];
        const w = 0.022;
        const t0 = (ro - ri) * 0.3;
        add(R, tube(ri, ri + t0, p.at - w / 2, p.at + w / 2, 48), M.bright);
        add(R, tube(ro - t0, ro, p.at - w / 2, p.at + w / 2, 48), M.bright);
        const n = p.kind === 'ballBrg' ? 11 : 16;
        const rc = (ri + ro) / 2;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const geo = p.kind === 'ballBrg' ? new THREE.SphereGeometry((ro - ri) * 0.2, 12, 8) : new THREE.CylinderGeometry((ro - ri) * 0.17, (ro - ri) * 0.17, w * 0.8, 10).rotateX(Math.PI / 2);
          add(R, geo.translate(rc * Math.cos(a), rc * Math.sin(a), p.at), M.steel);
        }
        break;
      }
      case 'snapShaft':
        spin.position.y = y;
        add(R, snapRing(SH, SH + 0.007, 0.0018).translate(0, 0, p.at - 0.0009), M.bright);
        break;
      case 'mainShaft':
        spin.position.y = TOP;
        add(R, cyl(SH, 0.6, 0.885), M.steel);
        add(R, cyl(0.016, 0.885, 0.906), M.steel);
        add(R, gearGeo(26, 0.06, {m: 0.0017}).translate(0, 0, 0.63), M.steel);
        break;
      case 'needleBush': {
        spin.position.y = TOP;
        add(R, tube(SH, 0.0232, p.at - 0.011, p.at + 0.011, 40), M.bright);
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          add(R, cyl(0.0012, p.at - 0.01, p.at + 0.01, 6).translate(0.0242 * Math.cos(a), 0.0242 * Math.sin(a), 0), M.steel);
        }
        break;
      }
      case 'freeGear': {
        spin.position.y = TOP;
        const zg = ZP['m' + p.gear];
        add(R, gearGeo(Z['m' + p.gear], 0.022, {m: MOD, helix: -HELIX, bore: 0.0255}).translate(0, 0, zg), M.steel);
        dogRing(R, p.gear < 3 ? ZP.hub12 : ZP.hub34, zg);
        break;
      }
      case 'synchroRing':
        spin.position.y = TOP;
        add(R, gearGeo(34, 0.004, {m: 0.0019, bore: 0.0285}).translate(0, 0, p.at), M.brass);
        add(R, tube(0.0285, 0.031, p.at - 0.004, p.at + 0.004, 48), M.brass);
        break;
      case 'hub':
        spin.position.y = TOP;
        add(R, gearGeo(36, 0.02, {m: 0.0019, bore: 0.0225}).translate(0, 0, p.at), M.dark);
        break;
      case 'struts':
        spin.position.y = TOP;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
          const m = add(R, new RoundedBoxGeometry(0.008, 0.006, 0.022, 1, 0.0015).translate(0, 0.036, p.at), M.bright);
          m.rotation.z = a - Math.PI / 2;
        }
        break;
      case 'strutSprings':
        spin.position.y = TOP;
        for (const s of [-1, 1]) add(R, new THREE.TorusGeometry(0.031, 0.0011, 6, 48, Math.PI * 1.7).translate(0, 0, p.at + s * 0.008), M.bright);
        break;
      case 'sleeve':
        spin.position.y = TOP;
        add(R, sleeveGeo().translate(0, 0, p.at), M.dark);
        add(R, gearGeo(36, 0.024, {m: 0.0019, internal: 0.04}).translate(0, 0, p.at), M.dark);
        break;
      case 'thrustW':
        spin.position.y = TOP;
        add(R, tube(0.0225, 0.04, p.at - 0.0018, p.at + 0.0018, 48), M.zinc);
        break;
      case 'pilotNeedle':
        spin.position.y = TOP;
        add(R, tube(0.016, 0.0195, p.at - 0.008, p.at + 0.008, 32), M.bright);
        break;
      case 'csSnaps':
        for (const zz of [0.664, 0.99]) {
          const m = add(R, snapRing(0.045, 0.051, 0.0018).translate(0, 0, zz), M.bright);
          m.position.y = BOT;
        }
        break;
      case 'boreSnap':
        spin.position.y = p.y;
        add(R, snapRing(p.r, p.r + 0.006, 0.0018).translate(0, 0, p.at), M.bright);
        break;
      case 'pilotShaft': {
        spin.position.y = TOP;
        add(R, lathe([[0.0165, 0.89], [SH, 0.89], [SH, 1.154], [0.0, 1.154], [0.0, 0.92], [0.0165, 0.92], [0.0165, 0.89]], 48), M.steel);
        add(R, gearGeo(Z.pilot, 0.026, {m: MOD, helix: HELIX, bore: 0.018}).translate(0, 0, ZP.pilotGear), M.steel);
        add(R, gearGeo(22, 0.074, {m: 0.0016}).translate(0, 0, 1.117), M.steel); // the clutch-disc splines
        dogRing(R, ZP.hub34, ZP.pilotGear);
        break;
      }
      case 'frontGasket':
        add(R, plate(0.2, 0.2, [[0, 0, 0.045]], 0.002).translate(0, TOP, 1.02), M.gasket);
        break;
      case 'frontCover':
        add(R, lathe([[0.03, 1.022], [0.085, 1.022], [0.085, 1.034], [0.045, 1.034], [0.045, 1.12], [0.036, 1.12], [0.036, 1.034], [0.03, 1.034], [0.03, 1.022]], 64).translate(0, TOP, 0), M.cut, true);
        break;
      case 'frontSeal':
        add(R, tube(SH + 0.0005, 0.036, 1.106, 1.118, 40).translate(0, TOP, 0), M.rubber);
        break;
      case 'bolt': {
        let bx;
        let by;
        let bz;
        let along;
        if (p.face === 'front') {
          const a = (p.bolt / FRONT_BOLTS) * Math.PI * 2;
          [bx, by, bz, along] = [0.07 * Math.cos(a), TOP + 0.07 * Math.sin(a), 1.034, 'z'];
        } else {
          const [x0, z0] = TOPB[p.bolt];
          [bx, by, bz, along] = [x0, CASE.y1 + 0.016, z0, 'y'];
        }
        const head = hexNut(0.0085, 0.007);
        const wsh = tube(0.0055, 0.011, 0, 0.0018, 20);
        const shank = cyl(0.005, -0.03, 0, 10);
        const grp = new THREE.Group();
        for (const [geo, mat, dz] of [[head, M.zinc, 0.0018], [wsh, M.zinc, 0], [shank, M.dark, 0]]) {
          const m = new THREE.Mesh(geo, mat.clone());
    if (m.material.clippingPlanes) m.material.clippingPlanes = CUT;
          m.position.z = dz;
          m.castShadow = true;
          grp.add(m);
          R.meshes.push(m);
        }
        if (along === 'y') grp.rotation.x = -Math.PI / 2;
        grp.position.set(bx, by, bz);
        spin.add(grp);
        break;
      }
      case 'coverGasket':
        add(R, plate(0.27, 0.3, [], 0.002).rotateX(Math.PI / 2).translate(0, CASE.y1 + 0.002, 0.84), M.gasket).scale.set(1, 1, 1);
        break;
      case 'shiftCover':
        add(R, new RoundedBoxGeometry(0.27, 0.012, 0.3, 2, 0.004).translate(0, CASE.y1 + 0.009, 0.84), M.cut, true);
        add(R, new RoundedBoxGeometry(0.2, 0.04, 0.24, 3, 0.012).translate(0, CASE.y1 + 0.034, 0.84), M.cut, true);
        add(R, cyl(0.03, -0.02, 0.02, 24).rotateX(Math.PI / 2).translate(0, CASE.y1 + 0.07, 0.84), M.cut, true);
        add(R, new THREE.BoxGeometry(0.03, 0.03, 0.26).translate(0, CASE.y1 - 0.004, 0.84), M.cut, true); // rail bosses
        break;
      case 'rail': {
        const [rx, ry] = RAIL[p.rail];
        add(R, cyl(0.006, 0.68, 1.0, 16).translate(rx, ry, 0), M.bright);
        for (const dz of [-1, 0, 1]) add(R, tube(0.0058, 0.0061, 0.94 + dz * TRAVEL - 0.002, 0.94 + dz * TRAVEL + 0.002, 16).translate(rx, ry, 0), M.dark); // detent notches
        break;
      }
      case 'fork': {
        const [rx, ry] = RAIL[p.rail];
        const hz = HUBZ[p.rail];
        const yoke = add(R, new THREE.TorusGeometry(0.046, 0.0035, 10, 40, Math.PI * 1.15), M.fork);
        yoke.position.set(0, TOP, hz);
        yoke.rotation.z = Math.atan2(ry - TOP, rx) - Math.PI * 0.575;
        const ang = Math.atan2(ry - TOP, rx);
        const ax = Math.cos(ang) * 0.048;
        const ay = TOP + Math.sin(ang) * 0.048;
        const len = Math.hypot(rx - ax, ry - ay);
        const arm = add(R, new RoundedBoxGeometry(0.016, len + 0.01, 0.008, 2, 0.003), M.fork);
        arm.position.set((rx + ax) / 2, (ry + ay) / 2, hz);
        arm.rotation.z = -Math.atan2(rx - ax, ry - ay);
        add(R, cyl(0.011, hz - 0.012, hz + 0.012, 16).translate(rx, ry, 0), M.fork);
        break;
      }
      case 'forkScrew': {
        const [rx, ry] = RAIL[p.rail];
        add(R, cyl(0.0035, -0.012, 0.012, 10).rotateX(Math.PI / 2).translate(rx, ry + 0.014, HUBZ[p.rail]), M.zinc);
        break;
      }
      case 'detentBall': {
        const [rx, ry] = RAIL[p.rail];
        add(R, new THREE.SphereGeometry(0.0045, 14, 10).translate(rx, ry + 0.01, 0.94), M.bright);
        break;
      }
      case 'detentSpring': {
        const [rx, ry] = RAIL[p.rail];
        const pts = [];
        for (let i = 0; i <= 80; i++) pts.push(new V3(rx + 0.004 * Math.cos(i * 0.5), ry + 0.015 + i * 0.0003, 0.94 + 0.004 * Math.sin(i * 0.5)));
        add(R, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.0008, 5), M.bright);
        break;
      }
      case 'interlock':
        // a short pin between the two rails: one rail out of neutral pushes it into the other's notch
        add(R, cyl(0.004, -0.024, 0.024, 10).rotateX(Math.PI / 2).translate(RAIL[0][0] + 0.012, TOP, 0.925), M.bright);
        break;
    }
  }

  // ------------------------------------------------------------ looks
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
  // the parts that carry the torque in each gear
  const PATH = {
    N: ['eixoPiloto', 'eixoInt'],
    1: ['eixoPiloto', 'eixoInt', 'eng1', 'luva12', 'cubo12', 'eixoSec'],
    2: ['eixoPiloto', 'eixoInt', 'eng2', 'luva12', 'cubo12', 'eixoSec'],
    3: ['eixoPiloto', 'eixoInt', 'eng3', 'luva34', 'cubo34', 'eixoSec'],
    4: ['eixoPiloto', 'luva34', 'cubo34', 'eixoSec'],
  };
  const tmp = new V3();
  /**
   * st: u, active (Set), func (bool), sl [hub12, hub34] sleeve offsets -1..1, engaged (gear or 'N'), sync (index of the
   * ring glowing or -1), thIn, thOut, cut 0..1, setCut, camX, power 0..1
   */
  const update = (st) => {
    const u = st.u;
    for (const k of ['cs', 'main', 'cover']) {
      const o = groupAt(k, u);
      groups[k].position.set(0, o.y, o.z);
    }
    if (st.setCut) st.setCut(CUT, st.cut ?? 0);
    else {
      CUT[0].normal.set((st.camX ?? 1) >= 0 ? -1 : 1, 0, 0);
      CUT[0].constant = 0;
      CUT[1].normal.set(0, -1, 0);
      CUT[1].constant = TOP + 0.4 - 0.48 * (st.cut ?? 0);
    }
    M.cap.visible = (st.cut ?? 0) > 0.001;
    const A = angles(st.thIn ?? 0, st.thOut ?? 0);
    const sl = st.sl ?? [0, 0];
    const path = new Set(st.func ? PATH[st.engaged ?? 'N'] : []);
    for (const r of Object.values(G)) {
      const p = r.p;
      const k = installed(p, u);
      const [ex, ey, ez] = p.ex;
      const kr = Math.min(1, k / 0.6);
      const kz = Math.min(1, Math.max(0, (k - 0.3) / 0.7));
      r.g.position.set(ex * (1 - kr), ey * (1 - kr), ez * (1 - kz));
      // turning: about each part's own shaft axis (the spin group carries the axis height)
      let rot = 0;
      if (p.id === 'eixoInt' || p.id === 'rolIntF' || p.id === 'rolIntT' || p.id === 'anelIntT') rot = A.cs;
      if (['eixoSec', 'cubo12', 'cubo34', 'chav12', 'chav34', 'mola12', 'mola34', 'anelCubo', 'luva12', 'luva34', 'rolSec', 'arruela23', 'bucha1', 'bucha2', 'bucha3', 'rolGuia'].includes(p.id)) rot = A.out;
      if (p.id === 'eng1') rot = A.m1;
      if (p.id === 'eng2') rot = A.m2;
      if (p.id === 'eng3') rot = A.m3;
      if (['eixoPiloto', 'rolPiloto', 'anelPiloto', 'anelS4'].includes(p.id)) rot = A.pilot;
      if (p.id === 'anelS1') rot = A.m1;
      if (p.id === 'anelS2') rot = A.m2;
      if (p.id === 'anelS3') rot = A.m3;
      // spin about the shaft axis: the meshes are built around x = 0 at their axis height
      const ay = r.spin.position.y;
      r.spin.rotation.z = st.func ? rot : 0;
      for (const m of r.spin.children) if (m.isMesh) m.position.y = m.userData.y0 ?? (m.userData.y0 = m.position.y);
      // sleeves, forks, rails follow the selected gear
      if (p.id === 'luva12' || p.id === 'garfo0' || p.id === 'trilho0' || p.id === 'parGarfo0') r.g.position.z += sl[0] * TRAVEL;
      if (p.id === 'luva34' || p.id === 'garfo1' || p.id === 'trilho1' || p.id === 'parGarfo1') r.g.position.z += sl[1] * TRAVEL;
      void ay;
      const hot = st.func ? (path.has(p.id) ? st.power ?? 1 : 0) : st.active?.has(p.id) ? 1 : 0;
      setLook(r, hot, k < 0.02 && !hot ? st.ghost ?? 0 : 0);
    }
    // the bronze ring doing the work glows while it matches the speeds
    const rings = ['anelS1', 'anelS2', 'anelS3', 'anelS4'];
    rings.forEach((id, i) => {
      if (st.sync === i) for (const m of G[id].meshes) m.material.emissive.set('#ff8a3c').multiplyScalar(0.6);
    });
  };
  const centreOf = (id) => {
    const r = G[id];
    const box = new THREE.Box3().setFromObject(r.g);
    if (box.isEmpty()) return r.g.getWorldPosition(tmp).clone();
    return box.getCenter(tmp).clone();
  };
  update({u: 0});
  return {root, update, G, M, centreOf, groups, CUT};
}

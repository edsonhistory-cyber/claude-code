// Every part of the PDM transfer box as its own mesh group, in the tractor's frame: the box housing (orange-red, as on
// the line) with its top flange, opening, bores and side boss; the splined output shaft with two ball bearings, hub,
// snap rings, dog sleeve, needle bush, the 30-tooth input gear with its dog ring and thrust washer; the front cover,
// seal and bolts; the selector shaft across the box with the fork, roll pin, detent ball, spring and plug; the rear
// gasket, cover and bolts; outside, the notched command disc, the torsion spring, the bent arm with its clamp bolt and
// the lower lever with its eye; the dowels, gasket and 6 bolts to the transmission; the command rod; the brass drain
// plug. On the bench a slab of the transmission's underside with the drive gear stands in for the tractor.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cyl, gearGeo, lathe, tube} from '../tractor-shared/parts.js';
import {groupAt, installed, PARTS, SY, TOP_BOLTS, TRAVEL, Y, ZG, ZH} from './model.js';

const V3 = THREE.Vector3;
const HELIX = (20 * Math.PI) / 180;
const BOX = {x: 0.075, y0: Y - 0.1, y1: Y + 0.006, z0: 0.19, z1: 0.48};
const PIV = new V3(0, Y - 0.06, ZH); // the selector shaft's axis (along x)
const TOPB = [[-0.09, 0.22], [-0.09, 0.335], [-0.09, 0.45], [0.09, 0.45], [0.09, 0.335], [0.09, 0.22]];

function hexHead(r, h) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    i ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  sh.closePath();
  return new THREE.ExtrudeGeometry(sh, {depth: h, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 1});
}
function snapRing(r0, r1, t) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, r1, 0.35, Math.PI * 2 - 0.35, false);
  sh.absarc(0, 0, r0, Math.PI * 2 - 0.35, 0.35, true);
  return new THREE.ExtrudeGeometry(sh, {depth: t, bevelEnabled: false, curveSegments: 36});
}
function plate(w, h, depth, holes = []) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, -h / 2);
  sh.lineTo(w / 2, -h / 2);
  sh.lineTo(w / 2, h / 2);
  sh.lineTo(-w / 2, h / 2);
  sh.closePath();
  for (const [x, y, r, ww, hh] of holes) {
    const p = new THREE.Path();
    if (ww) {
      p.moveTo(x - ww / 2, y - hh / 2);
      p.lineTo(x - ww / 2, y + hh / 2);
      p.lineTo(x + ww / 2, y + hh / 2);
      p.lineTo(x + ww / 2, y - hh / 2);
      p.closePath();
    } else p.absarc(x, y, r, 0, Math.PI * 2, true);
    sh.holes.push(p);
  }
  return new THREE.ExtrudeGeometry(sh, {depth, bevelEnabled: false, curveSegments: 32});
}
const toX = (g) => g.rotateY(Math.PI / 2);

export function buildPdm() {
  const std = (color, metalness, roughness, env = 1) => new THREE.MeshStandardMaterial({color, metalness, roughness, envMapIntensity: env});
  const M = {
    steel: std('#d0d4d9', 1, 0.22, 1.2),
    dark: std('#8a9097', 0.9, 0.32),
    bright: std('#e6e9ec', 1, 0.14, 1.2),
    cast: new THREE.MeshPhysicalMaterial({color: '#c4472a', metalness: 0.15, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35}),
    trans: new THREE.MeshPhysicalMaterial({color: '#2a2e33', metalness: 0.3, roughness: 0.55, clearcoat: 0.3}),
    rubber: std('#1d1e20', 0, 0.7, 0.5),
    gasket: std('#c9b27c', 0, 0.85, 0.5),
    zinc: std('#d6cfa8', 0.9, 0.35),
    brass: std('#c9a54a', 0.95, 0.3),
  };
  const CUT = [new THREE.Plane(new V3(-1, 0, 0), 0), new THREE.Plane(new V3(0, 1, 0), 0)];
  M.cut = M.cast.clone();
  M.transCut = M.trans.clone();
  for (const m of [M.cut, M.transCut]) {
    m.clippingPlanes = CUT;
    m.clipIntersection = true;
  }
  M.cap = new THREE.MeshBasicMaterial({color: '#e4e1d8', side: THREE.BackSide, clippingPlanes: CUT, clipIntersection: true});
  M.line = new THREE.LineBasicMaterial({color: '#2b140c', transparent: true, opacity: 0.55, clippingPlanes: CUT, clipIntersection: true});
  const root = new THREE.Group();
  const groups = {case: new THREE.Group(), box: new THREE.Group(), shaft: new THREE.Group()};
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
  // parts that turn about the box axis hang from a spin group at the axis height; the selector parts from a pivot
  const AXIAL = new Set(['outShaft', 'ballBrg', 'hub', 'snap', 'sleeve', 'needleBush', 'inputGear', 'thrustW']);
  const SELECTOR = new Set(['selShaft', 'fork', 'rollPin', 'camDisc', 'arm', 'clampBolt', 'lowerLever']);
  for (const p of PARTS) {
    const g = new THREE.Group();
    const spin = new THREE.Group();
    g.add(spin);
    groups[p.grp].add(g);
    const R = (G[p.id] = {p, g, spin, meshes: []});
    if (AXIAL.has(p.kind)) spin.position.set(0, Y, 0);
    if (SELECTOR.has(p.kind)) spin.position.copy(PIV);
    switch (p.kind) {
      case 'gearboxStub': {
        // the underside of the transmission with the drive gear on the pinion shaft (bench only)
        add(R, plate(0.36, 0.4, 0.14, [[0, 0, 0, 0.13, 0.12]]).rotateX(Math.PI / 2).translate(0, Y + 0.15, 0.335), M.transCut, true);
        const dg = new THREE.Group();
        dg.position.set(0, Y + 0.12, 0);
        R.spin.add(dg);
        R.drive = dg;
        add(R, gearGeo(30, 0.03, {m: 0.004, helix: -HELIX, bore: 0.02}).translate(0, 0, ZG), M.steel, false, dg);
        add(R, cyl(0.02, 0.15, 0.55, 20), M.dark, false, dg);
        break;
      }
      case 'boxHousing': {
        const {x, y0, y1, z0, z1} = BOX;
        const t = 0.01;
        const W = 2 * x;
        add(R, new RoundedBoxGeometry(W, t, z1 - z0, 2, 0.004).translate(0, y0 + t / 2, (z0 + z1) / 2), M.cut, true);
        for (const s of [-1, 1]) add(R, new RoundedBoxGeometry(t, y1 - y0, z1 - z0, 2, 0.004).translate(s * (x - t / 2), (y0 + y1) / 2, (z0 + z1) / 2), M.cut, true);
        add(R, plate(W, y1 - y0, 0.03, [[0, Y - (y0 + y1) / 2, 0.043]]).translate(0, (y0 + y1) / 2, z1 - 0.03), M.cut, true);
        add(R, plate(W, y1 - y0, 0.015, [[0, Y - (y0 + y1) / 2, 0.043]]).translate(0, (y0 + y1) / 2, z0), M.cut, true);
        // the top flange with the opening the gear comes through
        add(R, plate(0.2, z1 - z0 + 0.02, 0.014, [[0, 0, 0, 0.13, 0.15]]).rotateX(Math.PI / 2).translate(0, y1 + 0.007, (z0 + z1) / 2 - 0.045 + 0.045), M.cut, true);
        // the round front face, the side boss for the selector shaft, the detent and drain bosses
        add(R, lathe([[0.043, z1], [0.07, z1], [0.07, z1 + 0.006], [0.043, z1 + 0.006], [0.043, z1]], 64).translate(0, Y, 0), M.cut, true);
        add(R, toX(cyl(0.022, 0.0, 0.03, 24)).translate(x, PIV.y, PIV.z), M.cut, true);
        add(R, cyl(0.012, -0.01, 0.01, 16).rotateX(Math.PI / 2).translate(0.035, y0 - 0.006, ZH + 0.03), M.cut, true);
        add(R, cyl(0.014, -0.01, 0.01, 16).rotateX(Math.PI / 2).translate(0, y0 - 0.006, 0.42), M.cut, true);
        break;
      }
      case 'outShaft':
        add(R, cyl(0.02, 0.18, 0.49, 28), M.steel);
        add(R, gearGeo(14, 0.05, {m: 0.0028}).translate(0, 0, 0.515), M.steel); // the splined end, to the cardan
        break;
      case 'ballBrg': {
        const w = 0.02;
        add(R, tube(0.02, 0.026, p.at - w / 2, p.at + w / 2, 40), M.bright);
        add(R, tube(0.036, 0.042, p.at - w / 2, p.at + w / 2, 40), M.bright);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          add(R, new THREE.SphereGeometry(0.0055, 12, 8).translate(0.031 * Math.cos(a), 0.031 * Math.sin(a), p.at), M.steel);
        }
        break;
      }
      case 'hub':
        add(R, gearGeo(30, 0.02, {m: 0.002, bore: 0.0205}).translate(0, 0, ZH), M.dark);
        break;
      case 'snap':
        add(R, snapRing(0.02, 0.026, 0.0016).translate(0, 0, p.at), M.bright);
        break;
      case 'sleeve':
        add(R, lathe([[0.031, -0.012], [0.043, -0.012], [0.043, -0.004], [0.038, -0.004], [0.038, 0.004], [0.043, 0.004], [0.043, 0.012], [0.031, 0.012], [0.031, -0.012]], 64).translate(0, 0, ZH), M.dark);
        break;
      case 'needleBush':
        add(R, tube(0.02, 0.0232, ZG - 0.014, ZG + 0.014, 36), M.bright);
        break;
      case 'inputGear':
        add(R, gearGeo(30, 0.03, {m: 0.004, helix: HELIX, bore: 0.0235}).translate(0, 0, ZG), M.steel);
        add(R, gearGeo(30, 0.008, {m: 0.0019, bore: 0.0235}).translate(0, 0, ZH - 0.025), M.steel); // the dogs the sleeve takes
        add(R, tube(0.0235, 0.03, ZG + 0.015, ZH - 0.029, 36), M.steel);
        break;
      case 'thrustW':
        add(R, tube(0.0205, 0.04, p.at - 0.0015, p.at + 0.0015, 40), M.zinc);
        break;
      case 'boreSnap':
        add(R, snapRing(0.042, 0.047, 0.0016).translate(0, Y, p.at), M.bright);
        break;
      case 'seal':
        add(R, tube(0.0205, 0.035, BOX.z1 + 0.0, BOX.z1 + 0.008, 40).translate(0, Y, 0), M.rubber);
        break;
      case 'frontCover':
        add(R, lathe([[0.035, BOX.z1 + 0.006], [0.064, BOX.z1 + 0.006], [0.064, BOX.z1 + 0.016], [0.035, BOX.z1 + 0.016], [0.035, BOX.z1 + 0.006]], 64).translate(0, Y, 0), M.bright);
        break;
      case 'frontBolt': {
        const a = (p.bolt / 3) * Math.PI * 2 + Math.PI / 2;
        add(R, hexHead(0.006, 0.005).translate(0.052 * Math.cos(a), Y + 0.052 * Math.sin(a), BOX.z1 + 0.016), M.zinc);
        break;
      }
      case 'selShaft':
        add(R, toX(cyl(0.0085, -0.06, 0.17, 18)), M.bright);
        add(R, toX(tube(0.0085, 0.0105, 0.082, 0.086, 18)), M.rubber); // the O-ring at the boss
        for (const dz of [-1, 1]) add(R, new THREE.SphereGeometry(0.0035, 10, 8).translate(0.035, -0.0085, dz * 0.006), M.dark); // detent notches
        break;
      case 'fork': {
        // a U round the sleeve's groove, hanging from the selector shaft below it
        const arc = add(R, new THREE.TorusGeometry(0.0405, 0.003, 8, 32, Math.PI * 0.9), M.dark);
        arc.rotation.z = Math.PI * 1.05;
        arc.position.set(0, 0.06, 0);
        add(R, new RoundedBoxGeometry(0.012, 0.03, 0.008, 1, 0.002).translate(0, 0.008, 0), M.dark);
        add(R, toX(tube(0.0085, 0.016, -0.012, 0.012, 20)), M.dark);
        break;
      }
      case 'rollPin':
        add(R, cyl(0.0025, -0.018, 0.018, 8).rotateX(Math.PI / 2), M.dark);
        break;
      case 'detentBall':
        add(R, new THREE.SphereGeometry(0.0045, 12, 8).translate(0.035, PIV.y - 0.014, ZH), M.bright);
        break;
      case 'detentSpring': {
        const pts = [];
        for (let i = 0; i <= 60; i++) pts.push(new V3(0.035 + 0.0035 * Math.cos(i * 0.7), PIV.y - 0.02 - i * 0.0004, ZH + 0.0035 * Math.sin(i * 0.7)));
        add(R, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.0007, 5), M.bright);
        break;
      }
      case 'detentPlug':
        add(R, hexHead(0.01, 0.008).rotateX(Math.PI / 2).translate(0.035, BOX.y0 - 0.008, ZH + 0.03 - 0.03), M.zinc);
        break;
      case 'rearGasket':
        add(R, plate(0.15, 0.1, 0.0015, [[0, Y - (BOX.y0 + BOX.y1) / 2 + 0.002, 0.043]]).translate(0, (BOX.y0 + BOX.y1) / 2, BOX.z0 - 0.0015), M.gasket);
        break;
      case 'rearCover':
        add(R, new RoundedBoxGeometry(0.15, 0.1, 0.01, 2, 0.008).translate(0, (BOX.y0 + BOX.y1) / 2, BOX.z0 - 0.0065), M.cut, true);
        break;
      case 'rearBolt': {
        const [dx, dy] = [[-0.06, -0.035], [0.06, -0.035], [0.06, 0.035], [-0.06, 0.035]][p.bolt];
        add(R, hexHead(0.0065, 0.005).rotateY(Math.PI).translate(dx, (BOX.y0 + BOX.y1) / 2 + dy, BOX.z0 - 0.0115), M.zinc);
        break;
      }
      case 'camDisc': {
        // the round disc with two notches seen on the line, on the selector shaft outside the boss
        const sh = new THREE.Shape();
        sh.absarc(0, 0, 0.03, 0.25, Math.PI - 0.25, false);
        sh.lineTo(-0.024, 0.006);
        sh.absarc(0, 0, 0.03, Math.PI + 0.25, Math.PI * 2 - 0.25, false);
        sh.lineTo(0.024, -0.006);
        const hole = new THREE.Path();
        hole.absarc(0, 0, 0.0085, 0, Math.PI * 2, true);
        sh.holes.push(hole);
        const g0 = new THREE.ExtrudeGeometry(sh, {depth: 0.008, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, curveSegments: 32});
        add(R, toX(g0).translate(0.106, 0, 0), M.bright);
        break;
      }
      case 'torsionSpring': {
        const pts = [];
        for (let i = 0; i <= 100; i++) pts.push(new V3(0.116 + i * 0.00012, 0.0155 * Math.cos(i * 0.4), 0.0155 * Math.sin(i * 0.4)));
        const g0 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.0014, 6);
        add(R, g0.translate(0, PIV.y, PIV.z), M.bright);
        break;
      }
      case 'arm': {
        // the bent arm: up from the shaft, then out and up again (as in the photo)
        const pts = [new V3(0, 0, 0), new V3(0, 0.04, -0.01), new V3(-0.02, 0.07, -0.03), new V3(-0.025, 0.1, -0.03)];
        add(R, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.004, 8).translate(0.136, 0, 0), M.bright);
        add(R, toX(tube(0.0085, 0.016, 0.13, 0.142, 24)), M.bright);
        add(R, toX(tube(0.003, 0.009, -0.003, 0.003, 16)).translate(0.111, 0.1, -0.03), M.bright);
        break;
      }
      case 'clampBolt':
        add(R, hexHead(0.005, 0.005).rotateX(-Math.PI / 2).translate(0.136, 0.017, 0), M.zinc);
        break;
      case 'lowerLever':
        add(R, new RoundedBoxGeometry(0.016, 0.09, 0.026, 2, 0.006).translate(0.15, -0.045, 0), M.bright);
        add(R, toX(tube(0.0085, 0.02, 0.142, 0.158, 24)), M.bright);
        add(R, toX(tube(0.005, 0.014, 0.142, 0.158, 20)).translate(0, -0.09, 0), M.bright); // the eye for the rod
        break;
      case 'dowels':
        for (const [x, z] of [[-0.09, 0.27], [0.09, 0.4]]) add(R, cyl(0.005, -0.012, 0.012, 10).rotateX(Math.PI / 2).translate(x, BOX.y1 + 0.014, z), M.bright);
        break;
      case 'topGasket':
        add(R, plate(0.2, 0.31, 0.0015, [[0, 0, 0, 0.13, 0.15]]).rotateX(Math.PI / 2).translate(0, BOX.y1 + 0.0155, 0.335), M.gasket);
        break;
      case 'topBolt': {
        const [x, z] = TOPB[p.bolt];
        add(R, hexHead(0.0085, 0.007).rotateX(Math.PI / 2).translate(x, BOX.y1, z), M.zinc);
        add(R, cyl(0.005, -0.03, 0, 10).rotateX(-Math.PI / 2).translate(x, BOX.y1, z), M.dark);
        break;
      }
      case 'rod': {
        const a = new V3(0.15, PIV.y - 0.09, PIV.z);
        const pts = [a, a.clone().add(new V3(0.02, 0.0, 0.08)), a.clone().add(new V3(0.03, 0.06, 0.4)), a.clone().add(new V3(0.03, 0.2, 0.7))];
        add(R, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.0045, 8), M.dark);
        add(R, new RoundedBoxGeometry(0.03, 0.018, 0.03, 1, 0.004).translate(a.x, a.y, a.z + 0.012), M.dark);
        break;
      }
      case 'drainPlug':
        add(R, hexHead(0.011, 0.009).rotateX(Math.PI / 2).translate(0, BOX.y0 - 0.016, 0.42), M.brass);
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
  const tmp = new V3();
  /** st: u, active, func, engage 0..1, thIn, thOut, cut 0..1, camX, stub (show the bench stand-in) */
  const update = (st) => {
    const u = st.u;
    for (const k of ['box', 'shaft']) {
      const o = groupAt(k, u);
      groups[k].position.set(0, o.y, o.z);
    }
    CUT[0].normal.set((st.camX ?? 1) >= 0 ? -1 : 1, 0, 0);
    CUT[0].constant = 0;
    // cut the half toward the camera from below up to the top flange, so the gear, sleeve and fork show
    CUT[1].normal.set(0, 1, 0);
    CUT[1].constant = -(Y - 0.2 + 0.27 * (st.cut ?? 0));
    M.cap.visible = (st.cut ?? 0) > 0.001;
    const e = st.engage ?? 0;
    const sel = -e * 0.2; // the selector shaft turns; the fork swings the sleeve toward the gear
    const engagedHot = st.func && e > 0.97;
    for (const r of Object.values(G)) {
      const p = r.p;
      const k = installed(p, u);
      const [ex, ey, ez] = p.ex;
      const kr = Math.min(1, k / 0.6);
      const kz = Math.min(1, Math.max(0, (k - 0.3) / 0.7));
      r.g.position.set(ex * (1 - kr), ey * (1 - kr), ez * (1 - kz));
      r.spin.rotation.set(0, 0, 0);
      if (SELECTOR.has(p.kind)) r.spin.rotation.x = sel;
      if (st.func) {
        if (['inputGear', 'needleBush'].includes(p.kind)) r.spin.rotation.z = st.thIn ?? 0;
        if (['outShaft', 'hub', 'sleeve', 'snap', 'thrustW'].includes(p.kind) || (p.kind === 'ballBrg')) r.spin.rotation.z = (st.thOut ?? 0) * (p.kind === 'ballBrg' ? 0.5 : 1);
      }
      if (p.id === 'luva') r.g.position.z -= e * TRAVEL;
      if (p.kind === 'gearboxStub') {
        r.g.visible = st.stub !== false;
        r.drive.rotation.z = -(st.thIn ?? 0);
      }
      const inPath = st.func && (['engEntrada', 'cambioBase'].includes(p.id) || (engagedHot && ['luva', 'cubo', 'eixoSaida'].includes(p.id)));
      const hot = st.func ? (inPath ? 1 : 0) : st.active?.has(p.id) ? 1 : 0;
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

// Every part of the final drive as its own mesh group, built from code in metres from model.js: the centre housing
// stub with its 10 studs, the half shaft, two wet brake discs, the ball-ramp actuator (two plates, 5 balls, 3 return
// springs), the reaction plate, the 18 T sun and its snap ring, the gasket, the dowels, the 90 T ring gear; on the
// trumpet side the casting, both tapered bearings (cups, cones, rollers), the seal, the wheel axle with hub and studs,
// the tab washer and ring nut, the planet carrier with its snap ring, and for each of the 3 planets 24 needle rollers,
// two thrust washers, the planet, its pin and roll pin; 10 plain washers, 10 nuts, two plugs. update(st) places each
// part between its exploded and installed pose, turns what turns, opens the brake, cuts the castings.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cyl, gearGeo, lathe, tube} from '../tractor-shared/parts.js';
import {BOLT_R, epicyclic, FD_M, installed, NUTS, PARTS, PLANET_R, subAt, Z} from './model.js';

const V3 = THREE.Vector3;
const HELIX = 0;

function hexNut(r, h, bore) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    i ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  sh.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, {depth: h, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1, curveSegments: 16});
  return g;
}
// a C-shaped snap ring with its two lug holes
function snapRing(r0, r1, t) {
  const sh = new THREE.Shape();
  const gap = 0.35;
  sh.absarc(0, 0, r1, gap, Math.PI * 2 - gap, false);
  sh.absarc(0, 0, r0, Math.PI * 2 - gap, gap, true);
  const g = new THREE.ExtrudeGeometry(sh, {depth: t, bevelEnabled: false, curveSegments: 40});
  return g;
}
function holedDisc(r0, r1, t, holes) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, r1, 0, Math.PI * 2, false);
  const h0 = new THREE.Path();
  h0.absarc(0, 0, r0, 0, Math.PI * 2, true);
  sh.holes.push(h0);
  for (const [x, y, r] of holes) {
    const h = new THREE.Path();
    h.absarc(x, y, r, 0, Math.PI * 2, true);
    sh.holes.push(h);
  }
  return new THREE.ExtrudeGeometry(sh, {depth: t, bevelEnabled: false, curveSegments: 48});
}
const boltHoles = (r) => Array.from({length: NUTS}, (_, i) => [Math.cos((i / NUTS) * Math.PI * 2) * BOLT_R, Math.sin((i / NUTS) * Math.PI * 2) * BOLT_R, r]);
function spring(r, z0, z1, turns = 5) {
  const pts = [];
  for (let i = 0; i <= turns * 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(new V3(r * Math.cos(a), r * Math.sin(a), z0 + ((z1 - z0) * i) / (turns * 16)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.0012, 6);
}
function taperRollers(n, rc, z0, z1, rA, rB) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(rB, rA, z1 - z0, 12);
    g.rotateX(Math.PI / 2);
    g.translate(rc * Math.cos(a), rc * Math.sin(a), (z0 + z1) / 2);
    out.push(g);
  }
  return out;
}

export function buildFinalDrive() {
  const std = (color, metalness, roughness, env = 1) => new THREE.MeshStandardMaterial({color, metalness, roughness, envMapIntensity: env});
  const M = {
    steel: std('#c6cacf', 0.95, 0.28),
    dark: std('#7f868d', 0.9, 0.35),
    bright: std('#dfe3e7', 1, 0.18),
    cast: new THREE.MeshPhysicalMaterial({color: '#3d4a57', metalness: 0.35, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4}),
    friction: std('#8a5a32', 0.2, 0.75, 0.6),
    rubber: std('#1d1e20', 0, 0.7, 0.5),
    gasket: std('#c9b27c', 0, 0.85, 0.5),
    zinc: std('#d6cfa8', 0.9, 0.35),
    grease: std('#c7a54a', 0.1, 0.4),
  };
  const CUT = [new THREE.Plane(new V3(-1, 0, 0), 0), new THREE.Plane(new V3(0, -1, 0), 0)];
  M.cut = M.cast.clone();
  M.ringCut = M.steel.clone();
  for (const m of [M.cut, M.ringCut]) {
    m.clippingPlanes = CUT;
    m.clipIntersection = true;
  }
  M.cap = new THREE.MeshBasicMaterial({color: '#b3b9bf', side: THREE.BackSide, clippingPlanes: CUT, clipIntersection: true});
  const root = new THREE.Group();
  const base = new THREE.Group();
  const sub = new THREE.Group();
  root.add(base, sub);
  const G = {}; // part id -> {g (placed group), spin (turns), mats}
  const mk = (p, parent) => {
    const g = new THREE.Group();
    const spin = new THREE.Group();
    g.add(spin);
    parent.add(g);
    G[p.id] = {p, g, spin, meshes: []};
    return G[p.id];
  };
  const add = (rec, geo, mat, {cut = false} = {}) => {
    const material = mat.clone();
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    rec.spin.add(m);
    rec.meshes.push(m);
    if (cut) {
      const c = new THREE.Mesh(geo, M.cap);
      c.renderOrder = -1;
      m.add(c);
    }
    return m;
  };

  for (const p of PARTS) {
    const R = mk(p, p.grp === 'base' ? base : sub);
    switch (p.kind) {
      case 'centreHousing': {
        add(R, lathe([[0.03, -0.32], [0.27, -0.32], [0.27, 0.05], [0.235, 0.07], [0.235, 0.095], [0.13, 0.095], [0.13, 0.0], [0.03, 0.0], [0.03, -0.32]], 96), M.cut, {cut: true});
        for (let i = 0; i < 8; i++) {
          const r = add(R, new RoundedBoxGeometry(0.02, 0.06, 0.3, 2, 0.006).translate(0, 0.29, -0.15), M.cut, {cut: true});
          r.rotation.z = (i / 8) * Math.PI * 2;
        }
        break;
      }
      case 'studs':
        for (const [x, y] of boltHoles(0)) add(R, cyl(0.008, 0.095, 0.19, 12).translate(x, y, 0), M.zinc);
        break;
      case 'halfShaft':
        add(R, cyl(0.028, -0.33, 0.13, 32), M.steel);
        add(R, gearGeo(24, 0.07, {m: 0.0024}).translate(0, 0, 0.042), M.steel);
        add(R, gearGeo(22, 0.03, {m: 0.0026}).translate(0, 0, 0.112), M.steel);
        break;
      case 'brakeDisc': {
        const zc = p.id === 'disco1' ? 0.015 : 0.065;
        add(R, holedDisc(0.03, 0.118, 0.0025, []).translate(0, 0, zc - 0.00125), M.dark);
        for (const s of [-1, 1]) add(R, holedDisc(0.07, 0.118, 0.0018, []).translate(0, 0, zc + s * 0.0021 - 0.0009), M.friction);
        add(R, gearGeo(24, 0.006, {m: 0.0024, internal: 0.036}).translate(0, 0, zc), M.dark);
        break;
      }
      case 'actuatorPlate': {
        const zc = p.side < 0 ? 0.028 : 0.052;
        add(R, holedDisc(0.035, 0.122, 0.01, []).translate(0, 0, zc - 0.005), M.dark);
        // the lug the pedal linkage pulls, and the five ramps (shallow pockets) facing the balls
        add(R, new RoundedBoxGeometry(0.03, 0.04, 0.01, 2, 0.004).translate(0, 0.135, zc), M.dark);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          add(R, new THREE.CylinderGeometry(0.009, 0.009, 0.002, 20).rotateX(Math.PI / 2).translate(0.085 * Math.cos(a), 0.085 * Math.sin(a), zc - p.side * 0.0055), M.bright);
        }
        break;
      }
      case 'balls':
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          add(R, new THREE.SphereGeometry(0.0075, 20, 14).translate(0.085 * Math.cos(a), 0.085 * Math.sin(a), 0.04), M.bright);
        }
        break;
      case 'springs':
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + 0.6;
          add(R, spring(0.004, 0.03, 0.05).translate(0.106 * Math.cos(a), 0.106 * Math.sin(a), 0), M.bright);
        }
        break;
      case 'reactionPlate':
        add(R, holedDisc(0.035, 0.128, 0.01, [[0.112, 0.06, 0.004], [-0.112, -0.06, 0.004]]).translate(0, 0, 0.072), M.dark);
        break;
      case 'sun':
        add(R, gearGeo(Z.sun, 0.026, {m: FD_M, bore: 0.024}).translate(0, 0, 0.112), M.steel);
        break;
      case 'snapSun':
        add(R, snapRing(0.026, 0.034, 0.0018).translate(0, 0, 0.1265), M.bright);
        break;
      case 'gasket':
        add(R, holedDisc(0.14, 0.232, 0.0015, boltHoles(0.0095)).translate(0, 0, 0.0955), M.gasket);
        break;
      case 'dowels':
        for (const a of [Math.PI * 0.1, Math.PI * 1.1]) add(R, cyl(0.006, 0.085, 0.118, 12).translate(0.205 * Math.cos(a), 0.205 * Math.sin(a), 0), M.bright);
        break;
      case 'ring':
        add(R, gearGeo(Z.ring, 0.03, {m: FD_M, internal: 0.232}).translate(0, 0, 0.112), M.ringCut, {cut: true});
        break;
      case 'washer': {
        const a = (p.bolt / NUTS) * Math.PI * 2;
        add(R, tube(0.0085, 0.016, 0.1485, 0.1515, 24).translate(BOLT_R * Math.cos(a), BOLT_R * Math.sin(a), 0), M.zinc);
        break;
      }
      case 'nut': {
        const a = (p.bolt / NUTS) * Math.PI * 2;
        add(R, hexNut(0.014, 0.013, 0.008).translate(BOLT_R * Math.cos(a), BOLT_R * Math.sin(a), 0.1515), M.zinc);
        break;
      }
      case 'trumpet': {
        add(R, lathe([[0.13, 0.128], [0.232, 0.128], [0.232, 0.148], [0.165, 0.152], [0.112, 0.2], [0.097, 0.26], [0.097, 0.43], [0.12, 0.44], [0.12, 0.5], [0.0805, 0.5], [0.0805, 0.46], [0.065, 0.455], [0.065, 0.205], [0.0705, 0.2], [0.0705, 0.172], [0.13, 0.168], [0.13, 0.128]], 96), M.cut, {cut: true});
        for (const [x, y] of boltHoles(0)) add(R, cyl(0.02, 0.146, 0.15, 16).translate(x, y, 0), M.cut, {cut: true}); // spot faces
        add(R, new RoundedBoxGeometry(0.05, 0.03, 0.05, 2, 0.008).translate(0, -0.1, 0.35), M.cut, {cut: true}); // drain boss
        add(R, new RoundedBoxGeometry(0.03, 0.05, 0.05, 2, 0.008).translate(-0.1, 0, 0.3), M.cut, {cut: true}); // level boss
        break;
      }
      case 'cupInner':
        add(R, lathe([[0.058, 0.172], [0.0705, 0.172], [0.0705, 0.197], [0.062, 0.197], [0.058, 0.172]], 64), M.bright);
        break;
      case 'cupOuter':
        add(R, lathe([[0.066, 0.465], [0.0805, 0.465], [0.0805, 0.49], [0.07, 0.49], [0.066, 0.465]], 64), M.bright);
        break;
      case 'seal':
        add(R, lathe([[0.041, 0.49], [0.0805, 0.49], [0.0805, 0.5], [0.05, 0.5], [0.043, 0.497], [0.041, 0.49]], 64), M.rubber);
        add(R, tube(0.07, 0.08, 0.4985, 0.5, 64), M.bright);
        break;
      case 'coneOuter':
        add(R, lathe([[0.04, 0.465], [0.052, 0.465], [0.056, 0.49], [0.04, 0.49], [0.04, 0.465]], 64), M.bright);
        for (const g of taperRollers(18, 0.06, 0.467, 0.488, 0.0055, 0.0065)) add(R, g, M.steel);
        break;
      case 'coneInner':
        add(R, lathe([[0.04, 0.172], [0.05, 0.172], [0.047, 0.197], [0.04, 0.197], [0.04, 0.172]], 64), M.bright);
        for (const g of taperRollers(16, 0.0545, 0.174, 0.195, 0.0055, 0.0048)) add(R, g, M.steel);
        break;
      case 'axle':
        add(R, cyl(0.04, 0.134, 0.535, 48), M.steel);
        add(R, gearGeo(40, 0.02, {m: 0.002}).translate(0, 0, 0.145), M.steel);
        for (let i = 0; i < 6; i++) add(R, tube(0.04, 0.0412, 0.157 + i * 0.0018, 0.1578 + i * 0.0018, 40), M.dark); // thread
        add(R, lathe([[0.03, 0.53], [0.17, 0.53], [0.17, 0.555], [0.06, 0.555], [0.06, 0.575], [0.03, 0.575], [0.03, 0.53]], 96), M.steel);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          add(R, cyl(0.009, 0.555, 0.61, 14).translate(0.135 * Math.cos(a), 0.135 * Math.sin(a), 0), M.zinc);
        }
        break;
      case 'tabWasher':
        add(R, tube(0.0405, 0.062, 0.1685, 0.171, 48), M.bright);
        add(R, new THREE.BoxGeometry(0.012, 0.012, 0.0025).translate(0, 0.066, 0.1697), M.bright);
        break;
      case 'ringNut': {
        add(R, tube(0.0405, 0.06, 0.157, 0.168, 48), M.dark);
        for (let i = 0; i < 4; i++) {
          const s = add(R, new THREE.BoxGeometry(0.008, 0.012, 0.0115).translate(0, 0.056, 0.1625), M.cast);
          s.rotation.z = (i / 4) * Math.PI * 2;
        }
        break;
      }
      case 'carrier': {
        add(R, holedDisc(0.033, 0.1, 0.006, [0, 1, 2].map((k) => [PLANET_R * Math.cos((2 * Math.PI * k) / 3), PLANET_R * Math.sin((2 * Math.PI * k) / 3), 0.0133])).translate(0, 0, 0.088), M.steel, {});
        add(R, holedDisc(0.0405, 0.1, 0.006, [0, 1, 2].map((k) => [PLANET_R * Math.cos((2 * Math.PI * k) / 3), PLANET_R * Math.sin((2 * Math.PI * k) / 3), 0.0133])).translate(0, 0, 0.13), M.steel);
        for (let k = 0; k < 3; k++) {
          const a = (2 * Math.PI * k) / 3 + Math.PI / 3;
          const b = add(R, new RoundedBoxGeometry(0.028, 0.03, 0.036, 2, 0.006).translate(0.077, 0, 0.112), M.steel);
          b.rotation.z = a;
        }
        add(R, tube(0.0405, 0.056, 0.136, 0.155, 48), M.steel);
        add(R, gearGeo(40, 0.019, {m: 0.002, internal: 0.05}).translate(0, 0, 0.1455), M.steel);
        break;
      }
      case 'snapCarrier':
        add(R, snapRing(0.04, 0.047, 0.0018).translate(0, 0, 0.1335), M.bright);
        break;
      case 'needles':
      case 'thrust':
      case 'planet':
      case 'planetPin':
      case 'rollPin': {
        const a = (2 * Math.PI * p.planet) / 3;
        R.g.userData.home = [PLANET_R * Math.cos(a), PLANET_R * Math.sin(a)];
        R.spin.position.set(R.g.userData.home[0], R.g.userData.home[1], 0);
        if (p.kind === 'needles')
          for (let i = 0; i < 24; i++) {
            const b = (i / 24) * Math.PI * 2;
            add(R, cyl(0.0021, 0.1, 0.124, 8).translate(0.0155 * Math.cos(b), 0.0155 * Math.sin(b), 0), M.bright);
          }
        if (p.kind === 'thrust') add(R, tube(0.0134, 0.024, p.side < 0 ? 0.0965 : 0.1255, p.side < 0 ? 0.0985 : 0.1275, 40), M.zinc);
        if (p.kind === 'planet') {
          add(R, gearGeo(Z.planet, 0.026, {m: FD_M, bore: 0.0185}).translate(0, 0, 0.112), M.steel);
          add(R, new THREE.BoxGeometry(0.004, 0.012, 0.0262).translate(0.038, 0, 0.112), M.dark); // a mark so its spin reads
        }
        if (p.kind === 'planetPin') add(R, cyl(0.0133, 0.087, 0.137, 24), M.bright);
        if (p.kind === 'rollPin') {
          const g = new THREE.CylinderGeometry(0.0028, 0.0028, 0.03, 10);
          g.rotateZ(Math.PI / 2);
          g.rotateZ(a);
          add(R, g.translate(0, 0, 0.133), M.dark);
        }
        break;
      }
      case 'plug': {
        const g = new THREE.Group();
        R.spin.add(g);
        const head = new THREE.Mesh(hexNut(0.013, 0.012, 0.001).rotateX(-Math.PI / 2), M.zinc.clone());
        const sealW = new THREE.Mesh(tube(0.009, 0.016, -0.002, 0.0, 24).rotateX(-Math.PI / 2), M.bright.clone());
        const thr = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.02, 16).translate(0, -0.01, 0), M.dark.clone());
        for (const m of [head, sealW, thr]) {
          m.castShadow = true;
          g.add(m);
          R.meshes.push(m);
        }
        if (p.at === 'drain') {
          g.position.set(0, -0.115, 0.35);
          g.rotation.x = Math.PI;
        } else {
          g.position.set(-0.115, 0, 0.3);
          g.rotation.z = Math.PI / 2;
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------ highlight, fade, labels
  const ACC = new THREE.Color('#f2661c');
  const base0 = new Map();
  for (const r of Object.values(G)) for (const m of r.meshes) base0.set(m, {color: m.material.color.clone(), em: m.material.emissive?.clone()});
  const setLook = (r, hot, fade) => {
    for (const m of r.meshes) {
      const b = base0.get(m);
      m.material.color.copy(b.color).lerp(ACC, hot * 0.7);
      if (m.material.emissive) m.material.emissive.copy(ACC).multiplyScalar(hot * 0.18);
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

  /**
   * st: u (assembly position 0..N), active (Set of part ids being placed now), th (half shaft angle, rad), brake 0..1,
   * cut 0..1, camX, ghost (fade for parts still waiting, 0..1)
   */
  const update = (st) => {
    const u = st.u;
    const S = subAt(u);
    sub.position.set(0, S.y, S.z);
    // the cut: a quarter on the camera side, above the axis, dropping in
    CUT[0].normal.set((st.camX ?? 1) >= 0 ? -1 : 1, 0, 0);
    CUT[1].constant = 0.6 + (0.0 - 0.6) * (st.cut ?? 0);
    M.cap.visible = (st.cut ?? 0) > 0.001;
    const E = epicyclic(st.th ?? 0);
    const sep = (st.brake ?? 0) * 0.004; // the actuator plates spread (drawn 2x)
    for (const r of Object.values(G)) {
      const p = r.p;
      const k = installed(p, u);
      const [ex, ey, ez] = p.ex;
      // waiting parts sit exploded; an installing part first comes in line with the axis, then slides home along it
      const kr = Math.min(1, k / 0.6);
      const kz = Math.min(1, Math.max(0, (k - 0.3) / 0.7));
      r.g.position.set(ex * (1 - kr), ey * (1 - kr), ez * (1 - kz));
      // turning parts: the half shaft side turns with the sun, the wheel side with the carrier
      r.spin.rotation.z = 0;
      if (['semieixo', 'disco1', 'disco2', 'sol', 'anelSol'].includes(p.id)) r.spin.rotation.z = E.sun;
      if (['portaSat', 'anelPorta', 'eixoRoda', 'coneInt', 'coneExt', 'arruelaTrava', 'porcaAjuste'].includes(p.id)) r.spin.rotation.z = E.carrier;
      if (p.planet !== undefined) {
        // planet parts orbit with the carrier; the planet spins on its pin as it rolls round the fixed ring, the
        // needle cage at about half that
        const [hx, hy] = r.g.userData.home;
        const c = Math.cos(E.carrier);
        const s = Math.sin(E.carrier);
        r.spin.position.set(hx * c - hy * s, hx * s + hy * c, 0);
        r.spin.rotation.z = E.carrier;
        if (p.kind === 'planet') r.spin.rotation.z = E.carrier + E.planets[p.planet];
        if (p.kind === 'needles') r.spin.rotation.z = E.carrier + E.planets[p.planet] * 0.5;
      }
      // the brake: plate A back, plate B forward, the discs pressed with them
      if (p.id === 'atuadorA' || p.id === 'disco1') r.spin.position.z = -sep;
      if (p.id === 'atuadorB' || p.id === 'disco2') r.spin.position.z = sep;
      if (p.id === 'atuadorA') r.spin.rotation.z = (st.brake ?? 0) * 0.05;
      const hot = st.active?.has(p.id) ? 1 : 0;
      const fade = k < 0.02 && !hot ? st.ghost ?? 0 : 0;
      setLook(r, hot, fade);
    }
  };
  /** a part's centre in world space (for labels) */
  const centreOf = (id) => {
    const r = G[id];
    const box = new THREE.Box3().setFromObject(r.g);
    return box.getCenter(tmp).clone();
  };
  update({u: 0});
  return {root, update, G, M, centreOf, base, sub};
}

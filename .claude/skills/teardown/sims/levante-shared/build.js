// Every part of the hydraulic lift as its own mesh group, in the tractor's frame: the top of the rear centre housing
// (it stands in on the bench), the lift housing (cut, with its cylinder bore and the rockshaft bosses), the cylinder
// liner and O-ring, the piston with its seal and back-up ring, the conrod and its pin, the two bushes, the rockshaft
// with the inner arm and its bolt, the two seals, the position cam with the feedback lever and spring, the control
// valve body with its spool and spring, the gasket and 8 bolts, the two outer lift arms with their bolts, the lift
// rods, the hitch's lower links, the control rod with the height-adjust nut. update(st) places every part, then poses
// the mechanism from one number, the lift height h.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cyl, gearGeo, lathe, tube} from '../tractor-shared/parts.js';
import {ARM, AXLE, COVER_BOLTS, CYL, groupAt, installed, lift, PARTS, ROCK, ROD} from './model.js';

const V3 = THREE.Vector3;
const H = {x: 0.2, y0: 0.99, y1: 1.18, z0: -0.3, z1: 0.26};
const BOLTS = [[-0.18, -0.27], [-0.18, -0.02], [-0.18, 0.12], [-0.18, 0.23], [0.18, 0.23], [0.18, 0.12], [0.18, -0.02], [0.18, -0.27]];
const toX = (g) => g.rotateY(Math.PI / 2);
function hexHead(r, h) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    i ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  sh.closePath();
  return new THREE.ExtrudeGeometry(sh, {depth: h, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 1});
}
const coil = (a, b, r, turns, wire) => {
  const pts = [];
  const n = turns * 16;
  const d = b.clone().sub(a);
  const L = d.length();
  d.normalize();
  const u = new V3(0, 1, 0).cross(d).lengthSq() > 1e-6 ? new V3(0, 1, 0).cross(d).normalize() : new V3(1, 0, 0);
  const v = d.clone().cross(u);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 * turns;
    pts.push(a.clone().addScaledVector(d, (L * i) / n).addScaledVector(u, r * Math.cos(t)).addScaledVector(v, r * Math.sin(t)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 5);
};

export function buildLift() {
  const std = (color, metalness, roughness, env = 1) => new THREE.MeshStandardMaterial({color, metalness, roughness, envMapIntensity: env});
  const M = {
    steel: std('#d0d4d9', 1, 0.22, 1.2),
    dark: std('#7d848b', 0.9, 0.35),
    bright: std('#e6e9ec', 1, 0.14, 1.2),
    cast: new THREE.MeshPhysicalMaterial({color: '#3f6f7c', metalness: 0.3, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3}),
    black: new THREE.MeshPhysicalMaterial({color: '#202326', metalness: 0.3, roughness: 0.5, clearcoat: 0.3}),
    rubber: std('#1d1e20', 0, 0.7, 0.5),
    blue: std('#2b55a8', 0.1, 0.5, 0.6),
    gasket: std('#c9b27c', 0, 0.85, 0.5),
    zinc: std('#d6cfa8', 0.9, 0.35),
    brass: std('#c9a54a', 0.95, 0.3),
  };
  const CUT = [new THREE.Plane(new V3(-1, 0, 0), 0), new THREE.Plane(new V3(0, -1, 0), 0)];
  M.cut = M.cast.clone();
  M.cut.clippingPlanes = CUT;
  M.cut.clipIntersection = true;
  M.cap = new THREE.MeshBasicMaterial({color: '#e4e1d8', side: THREE.BackSide, clippingPlanes: CUT, clipIntersection: true});
  M.line = new THREE.LineBasicMaterial({color: '#14232b', transparent: true, opacity: 0.6, clippingPlanes: CUT, clipIntersection: true});
  const root = new THREE.Group();
  const groups = {case: new THREE.Group(), lift: new THREE.Group()};
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
  const ROTX = new Set(['rockshaft', 'innerArm', 'innerArmBolt', 'cam', 'liftArm', 'armBolt']);
  for (const p of PARTS) {
    const g = new THREE.Group();
    const spin = new THREE.Group();
    g.add(spin);
    groups[p.grp].add(g);
    const R = (G[p.id] = {p, g, spin, meshes: []});
    if (ROTX.has(p.kind)) spin.position.set(0, ROCK.y, ROCK.z);
    switch (p.kind) {
      case 'centreTop':
        add(R, new RoundedBoxGeometry(0.46, 0.06, 0.6, 3, 0.02).translate(0, H.y0 - 0.03, -0.02), M.black);
        break;
      case 'liftHousing': {
        const {x, y0, y1, z0, z1} = H;
        const t = 0.012;
        add(R, new RoundedBoxGeometry(2 * x, t, z1 - z0, 2, 0.006).translate(0, y1 - t / 2, (z0 + z1) / 2), M.cut, true);
        for (const s of [-1, 1]) add(R, new RoundedBoxGeometry(t, y1 - y0, z1 - z0, 2, 0.004).translate(s * (x - t / 2), (y0 + y1) / 2, (z0 + z1) / 2), M.cut, true);
        add(R, new RoundedBoxGeometry(2 * x, y1 - y0, t, 2, 0.004).translate(0, (y0 + y1) / 2, z1 - t / 2), M.cut, true);
        add(R, new RoundedBoxGeometry(2 * x, y1 - y0, t, 2, 0.004).translate(0, (y0 + y1) / 2, z0 + t / 2), M.cut, true);
        // the cylinder bore cast into the housing, and the bosses for the rockshaft bushes
        add(R, lathe([[CYL.r + 0.012, CYL.z0], [CYL.r + 0.024, CYL.z0], [CYL.r + 0.024, CYL.z1], [CYL.r + 0.012, CYL.z1], [CYL.r + 0.012, CYL.z0]], 56).translate(0, CYL.y, 0), M.cut, true);
        for (const s of [-1, 1]) add(R, toX(cyl(0.045, 0, 0.04, 32)).translate(s > 0 ? x - 0.01 : -x - 0.03, ROCK.y, ROCK.z), M.cut, true);
        // the flange the bolts go through
        add(R, new RoundedBoxGeometry(2 * x + 0.03, 0.014, z1 - z0 + 0.03, 2, 0.005).translate(0, y0 + 0.007, (z0 + z1) / 2), M.cut, true);
        break;
      }
      case 'liner':
        add(R, tube(CYL.r, CYL.r + 0.012, CYL.z0 - 0.04, CYL.z1, 56).translate(0, CYL.y, 0), M.bright);
        break;
      case 'linerOring':
        add(R, tube(CYL.r + 0.012, CYL.r + 0.016, CYL.z1 - 0.02, CYL.z1 - 0.014, 56).translate(0, CYL.y, 0), M.rubber);
        break;
      case 'piston':
        R.spin.position.y = CYL.y;
        add(R, lathe([[0.0, 0.0], [CYL.r - 0.001, 0.0], [CYL.r - 0.001, 0.014], [CYL.r - 0.006, 0.016], [CYL.r - 0.006, 0.026], [CYL.r - 0.001, 0.028], [CYL.r - 0.001, 0.05], [0.0, 0.05]], 56), M.steel);
        add(R, toX(cyl(0.012, -0.022, 0.022, 16)), M.dark); // the gudgeon boss
        break;
      case 'pistonSeal':
        R.spin.position.y = CYL.y;
        add(R, tube(CYL.r - 0.006, CYL.r, 0.017, 0.022, 56), M.rubber);
        break;
      case 'backupRing':
        R.spin.position.y = CYL.y;
        add(R, tube(CYL.r - 0.006, CYL.r - 0.0005, 0.022, 0.025, 56), M.blue);
        break;
      case 'bushes':
        for (const s of [-1, 1]) add(R, toX(tube(ROCK.r, ROCK.r + 0.006, 0, 0.035, 32)).translate(s > 0 ? H.x - 0.005 : -H.x - 0.03, ROCK.y, ROCK.z), M.brass);
        break;
      case 'rockshaft':
        add(R, toX(cyl(ROCK.r, -0.42, 0.42, 32)), M.steel);
        for (const s of [-1, 1]) add(R, toX(gearGeo(26, 0.06, {m: 0.002}).translate(0, 0, 0)).translate(s * 0.37, 0, 0), M.steel);
        break;
      case 'innerArm':
        add(R, toX(tube(ROCK.r, 0.045, -0.025, 0.025, 32)), M.dark);
        add(R, new RoundedBoxGeometry(0.04, 0.03, 0.085, 2, 0.008).translate(0, 0, 0.042), M.dark);
        add(R, toX(cyl(0.016, -0.025, 0.025, 20)).translate(0, 0, 0.075), M.dark);
        break;
      case 'innerArmBolt':
        add(R, hexHead(0.008, 0.008).rotateX(-Math.PI / 2).translate(0.03, 0.045, 0), M.zinc);
        break;
      case 'conRod':
        add(R, new RoundedBoxGeometry(0.022, 0.026, ROD, 2, 0.008).translate(0, 0, ROD / 2), M.steel);
        for (const z of [0, ROD]) add(R, toX(tube(0.009, 0.02, -0.014, 0.014, 24)).translate(0, 0, z), M.steel);
        break;
      case 'rodPin':
        add(R, toX(cyl(0.009, -0.03, 0.03, 16)), M.bright);
        break;
      case 'shaftSeals':
        for (const s of [-1, 1]) add(R, toX(tube(ROCK.r, ROCK.r + 0.012, 0, 0.008, 32)).translate(s > 0 ? H.x + 0.032 : -H.x - 0.04, ROCK.y, ROCK.z), M.rubber);
        break;
      case 'cam': {
        const sh = new THREE.Shape();
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const r = 0.04 + 0.018 * (0.5 + 0.5 * Math.sin(a));
          i ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a));
        }
        const hole = new THREE.Path();
        hole.absarc(0, 0, ROCK.r, 0, Math.PI * 2, true);
        sh.holes.push(hole);
        add(R, toX(new THREE.ExtrudeGeometry(sh, {depth: 0.012, bevelEnabled: false})).translate(-0.13, 0, 0), M.dark);
        break;
      }
      case 'feedbackLever':
        R.spin.position.set(-0.13, ROCK.y - 0.075, ROCK.z + 0.09);
        add(R, new RoundedBoxGeometry(0.012, 0.012, 0.2, 2, 0.004).translate(0, 0, 0.09), M.bright);
        add(R, toX(cyl(0.008, -0.008, 0.008, 16)), M.bright); // the roller on the cam
        break;
      case 'feedbackSpring':
        add(R, coil(new V3(-0.13, ROCK.y - 0.08, ROCK.z + 0.2), new V3(-0.13, H.y0 + 0.02, ROCK.z + 0.2), 0.006, 8, 0.0011), M.bright);
        break;
      case 'valveBody':
        add(R, new RoundedBoxGeometry(0.06, 0.07, 0.16, 3, 0.01).translate(-H.x - 0.03, 1.09, 0.1), M.dark);
        for (const z of [0.05, 0.15]) add(R, hexHead(0.01, 0.006).rotateY(-Math.PI / 2).translate(-H.x - 0.06, 1.09, z), M.zinc);
        break;
      case 'spool':
        R.spin.position.set(-H.x - 0.03, 1.09, 0.1);
        add(R, lathe([[0, -0.09], [0.008, -0.09], [0.008, -0.06], [0.011, -0.06], [0.011, -0.035], [0.008, -0.035], [0.008, 0.0], [0.011, 0.0], [0.011, 0.03], [0.008, 0.03], [0.008, 0.07], [0, 0.07]], 24), M.bright);
        break;
      case 'spoolSpring':
        add(R, coil(new V3(-H.x - 0.03, 1.09, 0.175), new V3(-H.x - 0.03, 1.09, 0.21), 0.009, 6, 0.0012), M.bright);
        break;
      case 'liftGasket':
        add(R, new THREE.BoxGeometry(2 * H.x + 0.02, 0.002, H.z1 - H.z0 + 0.02).translate(0, H.y0 - 0.001, (H.z0 + H.z1) / 2), M.gasket);
        break;
      case 'bolt': {
        const [x, z] = BOLTS[p.bolt];
        add(R, hexHead(0.0085, 0.007).rotateX(-Math.PI / 2).translate(x, H.y0 + 0.014, z), M.zinc);
        break;
      }
      case 'liftArm': {
        const s = p.side;
        add(R, toX(tube(0.026, 0.045, -0.025, 0.025, 32)).translate(s * 0.37, 0, 0), M.black);
        add(R, new RoundedBoxGeometry(0.04, 0.035, ARM, 2, 0.01).translate(s * 0.37, 0, -ARM / 2), M.black);
        add(R, toX(cyl(0.012, -0.025, 0.025, 16)).translate(s * 0.37, 0, -ARM), M.bright);
        break;
      }
      case 'armBolt':
        add(R, hexHead(0.012, 0.009).rotateY((p.side * Math.PI) / 2).translate(p.side * 0.4, 0, 0), M.zinc);
        break;
      case 'liftRod': {
        const m = add(R, new THREE.CylinderGeometry(0.011, 0.011, 1, 12), M.black);
        R.rod = m;
        const nut = add(R, new RoundedBoxGeometry(0.03, 0.06, 0.03, 2, 0.006), M.zinc);
        R.nut = nut;
        break;
      }
      case 'lowerLinks':
        for (const s of [-1, 1]) {
          const l = new THREE.Group();
          l.position.set(s * 0.34, 0.45, -0.2);
          R.spin.add(l);
          add(R, new RoundedBoxGeometry(0.04, 0.05, 0.82, 2, 0.01).translate(0, 0, -0.41), M.black, false, l);
          add(R, new THREE.SphereGeometry(0.035, 16, 10).translate(0, 0, -0.82), M.bright, false, l);
          R[s > 0 ? 'left' : 'right'] = l;
        }
        break;
      case 'controlRod':
        add(R, cyl(0.005, 0.18, 0.5, 10).translate(-H.x - 0.03, 1.09, 0), M.bright);
        add(R, hexHead(0.009, 0.008).translate(-H.x - 0.03, 1.09, 0.22), M.zinc); // the height-adjust nut
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
  const PATH = ['valvula', 'carretel', 'pistao', 'anelPistao', 'biela', 'braco', 'eixoLev', 'bracoExtE', 'bracoExtD', 'hasteE', 'hasteD', 'barras'];
  /** st: u, active, func, h (lift height 0..1), valve (-1 down, 0 hold, 1 up), cut 0..1, camX, stub, ghost */
  const update = (st) => {
    const u = st.u;
    const o = groupAt('lift', u);
    groups.lift.position.set(0, o.y, o.z);
    CUT[0].normal.set((st.camX ?? 1) >= 0 ? -1 : 1, 0, 0);
    CUT[0].constant = 0;
    CUT[1].normal.set(0, -1, 0);
    CUT[1].constant = H.y1 + 0.3 - 0.42 * (st.cut ?? 0); // down to the cylinder's axis
    M.cap.visible = (st.cut ?? 0) > 0.001;
    const L = lift(st.h ?? 0);
    for (const r of Object.values(G)) {
      const p = r.p;
      const k = installed(p, u);
      const [ex, ey, ez] = p.ex;
      const kr = Math.min(1, k / 0.6);
      const kz = Math.min(1, Math.max(0, (k - 0.3) / 0.7));
      r.g.position.set(ex * (1 - kr), ey * (1 - kr), ez * (1 - kz));
      // the mechanism: the rockshaft and everything on it turn by the inner arm's angle
      // (a turn about +x of angle t takes +z to (0, -sin t, cos t): the inner arm points forward and down by phi, the
      // outer arms back and up by arm; both change by the same angle, as on one shaft)
      if (p.kind === 'innerArm' || p.kind === 'innerArmBolt' || p.kind === 'rockshaft' || p.kind === 'cam') r.spin.rotation.x = L.phi;
      if (p.kind === 'liftArm' || p.kind === 'armBolt') r.spin.rotation.x = L.arm;
      if (p.kind === 'piston' || p.kind === 'pistonSeal' || p.kind === 'backupRing') r.spin.position.z = L.pz;
      if (p.kind === 'conRod') {
        r.spin.position.set(0, L.pin.y, L.pin.z);
        r.spin.rotation.x = -L.rod;
      }
      if (p.kind === 'rodPin') r.spin.position.set(0, L.pin.y, L.pin.z);
      if (p.kind === 'spool') r.spin.position.z = 0.1 + (st.valve ?? 0) * 0.008;
      if (p.kind === 'feedbackLever') r.spin.rotation.x = -0.25 * (st.h ?? 0);
      if (p.kind === 'liftRod' || p.kind === 'lowerLinks') {
        // the arm tip drives the rod; the rod hangs the lower link (its tip rises with the arm)
        const a = L.arm;
        const tip = new V3(0, ROCK.y + ARM * Math.sin(a) + o.y, ROCK.z - ARM * Math.cos(a) + o.z);
        const link = -0.25 + (a + 0.45) * 0.55; // the lower links' angle above horizontal
        if (p.kind === 'lowerLinks') {
          r.left.rotation.x = link;
          r.right.rotation.x = link;
        } else {
          const s = p.side;
          const lp = new V3(s * 0.36, 0.45 + 0.45 * Math.sin(link), -0.2 - 0.45 * Math.cos(link));
          const tp = new V3(s * 0.37, tip.y, tip.z);
          const kk = installed(p, u);
          if (kk < 0.999) tp.copy(lp).add(new V3(0, 0.4, 0));
          const mid = lp.clone().add(tp).multiplyScalar(0.5);
          r.rod.position.copy(mid);
          r.rod.scale.y = lp.distanceTo(tp);
          r.rod.quaternion.setFromUnitVectors(new V3(0, 1, 0), tp.clone().sub(lp).normalize());
          r.nut.position.copy(lp.clone().lerp(tp, 0.35));
          r.nut.quaternion.copy(r.rod.quaternion);
        }
      }
      if (p.kind === 'centreTop') r.g.visible = st.stub !== false;
      const hot = st.func ? (PATH.includes(p.id) && (st.valve ?? 0) !== 0 ? 1 : 0) : st.active?.has(p.id) ? 1 : 0;
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

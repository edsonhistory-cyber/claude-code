// The tractor, built from code in metres from kin.js: the 4-cylinder engine with flywheel and clutch; the 12x12
// transmission (reverser with its idler, the 4-speed, the ranges) on four shafts with five synchro sleeves, their
// forks and rails; the transfer and front drive shaft; the spiral bevel, the differential, the planetary final drives;
// the wheels on 18.4-30 and 12.4-24 tyres; and the blue body, the cab, the levers the operator moves. update(st) poses
// everything; anchors give the labels' points. Rear axle centre at z = 0, +z forward, +x to the tractor's left.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {AXLE_Y, BOT, CD, DOG, ENGINE, FACE, gearAngles, HUBS, meshed, MOD, RF, rp, RW, TOP, TRAVEL, WHEELBASE, Z, ZP} from './kin.js';
import {bevelGeo, cyl, gearGeo, lathe, rod, tube} from './parts.js';

const V3 = THREE.Vector3;
const HELIX = (22 * Math.PI) / 180;
const SH_R = 0.022; // shaft radius
const BORE = 0.0225;
const REAR_X = 0.72; // rear wheel centre
const FRONT_X = 0.75;
const FD_X = 0.6; // final drive plane
const FD_M = 0.0028;
const CAM_DIR = [-0.08, Math.sqrt(0.135 * 0.135 - 0.08 * 0.08)];
const PUMP_DIR = [0.11, Math.sqrt(0.135 * 0.135 - 0.11 * 0.11)];

// ------------------------------------------------------------ tyres
function tyreGeo(R, W, rim, lugs, lugH, lugW) {
  // the carcass: a rounded profile turned about x
  const pts = [];
  const r0 = rim;
  const h = R - lugH - r0;
  for (let i = 0; i <= 20; i++) {
    const a = -Math.PI / 2 + (i / 20) * Math.PI;
    pts.push(new THREE.Vector2(r0 + h * 0.5 + h * 0.5 * Math.cos(a) * 1.0, (W / 2) * 0.96 * Math.sin(a)));
  }
  pts.unshift(new THREE.Vector2(r0, -W * 0.45));
  pts.push(new THREE.Vector2(r0, W * 0.45));
  const carcass = new THREE.LatheGeometry(pts, 72);
  carcass.rotateZ(Math.PI / 2);
  // the bars: a chevron, each half a slanted block from the centre out to the shoulder
  const bars = [];
  const Rc = R - lugH;
  for (let i = 0; i < lugs; i++) {
    for (const s of [-1, 1]) {
      const b = new RoundedBoxGeometry(W * 0.52, lugH, lugW, 1, lugH * 0.25);
      b.translate(s * W * 0.25, 0, 0);
      b.rotateY(s * 0.55);
      const a = ((i + (s > 0 ? 0.5 : 0)) / lugs) * Math.PI * 2;
      b.translate(0, Rc + lugH * 0.45, 0);
      b.rotateX(a);
      bars.push(b);
    }
  }
  return {carcass, bars: mergeGeometries(bars)};
}
function rimGeo(rim, W, disc) {
  const g = [];
  g.push(lathe([[rim - 0.012, -W * 0.46], [rim, -W * 0.46], [rim + 0.012, -W * 0.5], [rim + 0.014, -W * 0.47], [rim - 0.004, -W * 0.42], [rim - 0.004, W * 0.42], [rim + 0.014, W * 0.47], [rim + 0.012, W * 0.5], [rim, W * 0.46], [rim - 0.012, W * 0.46], [rim - 0.012, -W * 0.46]], 72).rotateY(Math.PI / 2));
  // the disc, dished outboard, with its holes as a ring of bumps
  g.push(lathe([[0.05, disc - 0.012], [rim - 0.012, disc - 0.012], [rim - 0.012, disc + 0.004], [0.05, disc + 0.004], [0.05, disc - 0.012]], 64).rotateY(Math.PI / 2));
  return mergeGeometries(g.map((x) => x.toNonIndexed()));
}

export function buildTractor() {
  const std = (color, metalness, roughness, env = 0.6) => new THREE.MeshStandardMaterial({color, metalness, roughness, envMapIntensity: env});
  const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({color, metalness: 0.1, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25, ...o});
  const M = {
    gear: std('#c4c8cd', 0.95, 0.3, 1.0),
    shaft: std('#8d939a', 0.95, 0.28, 1.0),
    brass: std('#b98f43', 0.9, 0.38),
    sleeve: std('#a9afb6', 0.95, 0.3, 1.0),
    fork: std('#596069', 0.6, 0.5),
    rail: std('#c7cbd0', 1, 0.3),
    dark: std('#2a2d32', 0.4, 0.55),
    friction: std('#4a3d33', 0.1, 0.85),
    blue: phys('#1c46bd'),
    housing: phys('#3a4148', {clearcoat: 0.35, roughness: 0.5, metalness: 0.35}),
    black: phys('#17181b', {roughness: 0.5, clearcoat: 0.2}),
    rubber: std('#1c1d1f', 0, 0.85, 0.4),
    rim: phys('#eceae3', {roughness: 0.4}),
    glass: new THREE.MeshPhysicalMaterial({color: '#cfe3ea', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false}),
    seat: std('#2f5f78', 0.05, 0.85),
    red: new THREE.MeshStandardMaterial({color: '#d8261c', emissive: '#a01008', emissiveIntensity: 0.35, roughness: 0.3}),
    mirror: std('#d9e2e6', 1, 0.05, 1),
    lamp: new THREE.MeshStandardMaterial({color: '#fffaf0', emissive: '#fff3d6', emissiveIntensity: 0.6, roughness: 0.2}),
    amber: new THREE.MeshStandardMaterial({color: '#ff9a2e', emissive: '#ff7a10', emissiveIntensity: 0.4, roughness: 0.3}),
    knobBlue: phys('#1f4fc9'),
    knobAmber: phys('#e8a12c'),
  };
  const all = [];
  const tint = [];
  const root = new THREE.Group();
  const add = (parent, geo, mat, own = false) => {
    const m = new THREE.Mesh(geo, own ? mat.clone() : mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    all.push(m);
    if (own) tint.push({mesh: m, base: m.material.color.clone()});
    return m;
  };
  const group = (parent = root, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const P = {};

  // ================================================================ powertrain
  const pt = group();
  P.pt = pt;
  // ---------------------------------------- engine: block, head, sump, fan; the crank turns the flywheel
  const engine = group(pt);
  P.engine = engine;
  add(engine, new RoundedBoxGeometry(0.34, 0.42, 0.8, 4, 0.03).translate(0, TOP + 0.07, 1.86), M.housing);
  add(engine, new RoundedBoxGeometry(0.3, 0.12, 0.76, 4, 0.025).translate(0, TOP + 0.34, 1.86), M.housing);
  add(engine, new RoundedBoxGeometry(0.26, 0.05, 0.7, 3, 0.015).translate(0, TOP + 0.42, 1.86), M.housing);
  add(engine, new RoundedBoxGeometry(0.3, 0.18, 0.7, 3, 0.04).translate(0, TOP - 0.23, 1.86), M.housing);
  add(engine, new RoundedBoxGeometry(0.12, 0.1, 0.3, 2, 0.02).translate(0.2, TOP + 0.2, 1.86), M.housing); // manifold
  add(engine, new RoundedBoxGeometry(0.62, 0.5, 0.06, 3, 0.02).translate(0, TOP + 0.12, 2.5), M.housing); // radiator
  const crank = group(engine, 0, TOP, 0);
  P.crank = crank;
  // inside the block: the crankshaft throws, four pistons on their rods (bore 104, stroke 115), firing 1-3-4-2
  const pistons = [];
  {
    const r = ENGINE.stroke / 2;
    const PH = [0, Math.PI, Math.PI, 0];
    add(crank, cyl(0.03, ENGINE.z0 - 0.1, ENGINE.z0 + 3 * ENGINE.pitch + 0.1, 24), M.shaft, true);
    for (let i = 0; i < 4; i++) {
      const z = ENGINE.z0 + i * ENGINE.pitch;
      const px = -r * Math.sin(PH[i]);
      const py = r * Math.cos(PH[i]);
      for (const dz of [-0.035, 0.035]) {
        const web = add(crank, new RoundedBoxGeometry(0.09, r + 0.09, 0.022, 2, 0.01), M.shaft, true);
        web.position.set(px / 2, py / 2, z + dz);
        web.rotation.z = -PH[i];
      }
      add(crank, cyl(0.024, z - 0.035, z + 0.035, 20).translate(px, py, 0), M.rail, true);
      const pg = group(engine, 0, TOP, z);
      const piston = add(pg, new THREE.CylinderGeometry(ENGINE.bore / 2, ENGINE.bore / 2, 0.1, 32), M.rail);
      const rodM = add(pg, new RoundedBoxGeometry(0.03, ENGINE.rod, 0.022, 2, 0.008).translate(0, ENGINE.rod / 2, 0), M.gear);
      // the cylinder liners, so the pistons read inside a glass block
      add(engine, tube(ENGINE.bore / 2 + 0.001, ENGINE.bore / 2 + 0.007, -0.11, 0.11, 32).rotateX(Math.PI / 2).translate(0, TOP + ENGINE.rod + 0.03, z), M.housing);
      pistons.push({piston, rodM, z});
    }
  }
  P.pistons = pistons;
  // a tractor engine is a structural member: no frame, the block carries the cast front support (bolted to the
  // block and sump), the front axle pivots on it (11 deg of oscillation), the gearbox bolts to its back
  const bolster = group(engine);
  P.bolster = bolster;
  {
    const sh = new THREE.Shape();
    sh.moveTo(-0.19, 0.46);
    sh.lineTo(0.19, 0.46);
    sh.lineTo(0.2, 0.76);
    sh.lineTo(-0.2, 0.76);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {depth: 0.8, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2});
    g.translate(0, 0, 2.22);
    add(bolster, g, M.housing);
    add(bolster, cyl(0.05, WHEELBASE - 0.14, WHEELBASE + 0.14, 24).translate(0, RF + 0.02, 0), M.housing); // pivot boss
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) add(bolster, cyl(0.011, 2.2, 2.235, 10).translate(s * 0.17, 0.5 + i * 0.075, 0), M.dark);
  }
  // front of the block: the timing gears (no belt): crank 30 T drives the camshaft and the injection pump at half speed
  const TM = 0.003;
  const timingCover = add(engine, new RoundedBoxGeometry(0.4, 0.4, 0.05, 3, 0.04).translate(0, TOP + 0.05, 2.3), M.housing);
  void timingCover;
  add(crank, gearGeo(30, 0.02, {m: TM, bore: 0.02}).translate(0, 0, 2.285), M.gear, true);
  const CAM = [-0.08, Math.sqrt(0.135 * 0.135 - 0.08 * 0.08)];
  const PUMP = [0.11, Math.sqrt(0.135 * 0.135 - 0.11 * 0.11)];
  const cam = group(engine, CAM[0], TOP + CAM[1], 0);
  add(cam, gearGeo(60, 0.02, {m: TM, bore: 0.012}).translate(0, 0, 2.285), M.gear, true);
  add(cam, cyl(0.014, 1.6, 2.28, 16), M.shaft, true);
  for (let i = 0; i < 8; i++) {
    const lobe = add(cam, new THREE.CylinderGeometry(0.022, 0.022, 0.016, 20).rotateX(Math.PI / 2).translate(0.008, 0, ENGINE.z0 - 0.025 + Math.floor(i / 2) * ENGINE.pitch + (i % 2) * 0.05), M.rail, true);
    lobe.rotation.z = (i * Math.PI) / 4;
  }
  const pumpG = group(engine, PUMP[0], TOP + PUMP[1], 0);
  add(pumpG, gearGeo(60, 0.02, {m: TM, bore: 0.012}).translate(0, 0, 2.285), M.gear, true);
  // the injection pump (mechanical) on the side of the block, its lines up to the four injectors
  add(engine, new RoundedBoxGeometry(0.09, 0.12, 0.2, 3, 0.03).translate(0.24, TOP + 0.02, 2.12), M.dark);
  add(engine, cyl(0.04, 2.02, 2.26, 20).translate(0.24, TOP - 0.03, 0), M.dark);
  for (let i = 0; i < 4; i++) {
    const z = ENGINE.z0 + i * ENGINE.pitch;
    const c = new THREE.CatmullRomCurve3([new V3(0.24, TOP + 0.08, 2.1 - i * 0.01), new V3(0.22, TOP + 0.25, 2.0 - i * 0.05), new V3(0.12, TOP + 0.33, z + 0.02), new V3(0.06, TOP + 0.3, z)]);
    add(engine, new THREE.TubeGeometry(c, 24, 0.004, 6), M.rail);
    add(engine, cyl(0.009, -0.03, 0.03, 10).rotateX(Math.PI / 2).translate(0.06, TOP + 0.3, z), M.rail); // injector
  }
  P.timing = {cam, pumpG};
  // starter, alternator, oil filter, air cleaner, the radiator top tank
  add(engine, cyl(0.045, 1.42, 1.62, 20).translate(-0.22, TOP - 0.12, 0), M.dark);
  add(engine, cyl(0.06, -0.04, 0.04, 24).rotateZ(Math.PI / 2).translate(-0.22, TOP + 0.25, 2.25), M.dark);
  add(engine, cyl(0.045, -0.07, 0.07, 20).rotateX(Math.PI / 2).translate(-0.2, TOP - 0.1, 1.9), M.blue);
  add(engine, cyl(0.09, 1.9, 2.35, 28).translate(-0.18, TOP + 0.44, 0), M.dark);
  add(engine, new RoundedBoxGeometry(0.56, 0.18, 0.05, 3, 0.02).translate(0, TOP + 0.42, 2.57), M.housing);
  // the turbo on the exhaust side
  add(engine, new THREE.TorusGeometry(0.05, 0.03, 12, 24).rotateY(Math.PI / 2).translate(0.24, TOP + 0.22, 1.7), M.housing);
  const fan = group(crank, 0, 0, 2.38);
  add(fan, cyl(0.04, -0.03, 0.03), M.housing);
  for (let i = 0; i < 6; i++) {
    const b = add(fan, new THREE.BoxGeometry(0.06, 0.22, 0.008).translate(0, 0.13, 0), M.housing);
    b.rotation.set(0, 0.4, (i / 6) * Math.PI * 2);
  }
  add(crank, cyl(0.2, 1.38, 1.43, 64), M.shaft, true); // flywheel
  add(crank, gearGeo(110, 0.02, {m: 0.0037, bore: 0.18}).translate(0, 0, 1.41), M.gear, true); // ring gear
  // bell (clutch housing) between engine and gearbox
  const bell = add(pt, lathe([[0.17, 1.2], [0.27, 1.3], [0.28, 1.46], [0.26, 1.46], [0.25, 1.31], [0.16, 1.21], [0.17, 1.2]], 64).translate(0, TOP, 0), M.housing);
  P.bell = bell;

  // ---------------------------------------- shafts
  const shafts = [group(pt, 0, TOP), group(pt, 0, BOT), group(pt, 0, TOP), group(pt, 0, BOT)];
  P.shafts = shafts;
  add(shafts[0], cyl(SH_R, 0.98, 1.39), M.shaft, true);
  add(shafts[0], gearGeo(22, 0.05, {m: 0.0016}).translate(0, 0, 1.335), M.shaft, true); // clutch splines
  add(shafts[1], cyl(SH_R, 0.69, 1.12), M.shaft, true);
  add(shafts[2], cyl(SH_R, 0.5, 0.96), M.shaft, true);
  add(shafts[2], cyl(0.016, 0.44, 0.5), M.shaft, true); // the L pinion is cut into the shaft
  add(shafts[3], cyl(SH_R, 0.12, 0.66), M.shaft, true);
  const clutch = group(shafts[0]);
  P.clutch = clutch;
  add(clutch, tube(0.025, 0.05, 1.355, 1.37), M.dark, true);
  add(clutch, tube(0.05, 0.17, 1.36, 1.366), M.dark, true);
  for (const s of [-1, 1]) add(clutch, tube(0.1, 0.175, 1.363 + s * 0.005 - 0.002, 1.363 + s * 0.005 + 0.002), M.friction);
  const fixed = (shaft, z, zp, opt = {}) => add(shafts[shaft], gearGeo(z, opt.w ?? FACE, {m: MOD, helix: opt.helix ?? 0, bore: opt.bore ?? 0.018}).translate(0, 0, zp), M.gear, true);
  // fixed gears: S1 (reverser driven, 4-speed drivers), S2 (range drivers)
  const fx = {};
  fx.s1F = fixed(1, Z.s1F, ZP.sF, {helix: HELIX});
  fx.s1R = fixed(1, Z.s1R, ZP.sR);
  fx.c1 = fixed(1, Z.c1, ZP.m1, {helix: HELIX});
  fx.c2 = fixed(1, Z.c2, ZP.m2, {helix: HELIX});
  fx.c3 = fixed(1, Z.c3, ZP.m3, {helix: HELIX});
  fx.c4 = fixed(1, Z.c4, ZP.m4, {helix: HELIX});
  fx.dL = fixed(2, Z.dL, ZP.gL, {bore: 0.01});
  fx.dM = fixed(2, Z.dM, ZP.gM, {helix: HELIX});
  fx.dH = fixed(2, Z.dH, ZP.gH, {helix: HELIX});
  fx.tr = fixed(3, 30, 0.3, {w: 0.02}); // transfer to the front drive
  P.fx = fx;
  // free gears, each with its dog ring and neck toward its hub
  const free = {};
  const freeGear = (key, shaft, z, zp, hubZ, helix) => {
    const g = group(pt, 0, shafts[shaft].position.y);
    add(g, gearGeo(z, FACE, {m: MOD, helix, bore: BORE}).translate(0, 0, zp), M.gear, true);
    const side = hubZ > zp ? 1 : -1;
    const dz = hubZ - side * DOG;
    add(g, gearGeo(34, 0.006, {m: 0.002, bore: BORE}).translate(0, 0, dz), M.gear, true);
    const a = Math.min(dz + side * 0.003 * -1, zp + side * FACE * 0.5);
    const b = Math.max(dz + side * 0.003 * -1, zp + side * FACE * 0.5);
    if (b - a > 1e-4) add(g, tube(BORE, 0.03, a, b), M.gear, true);
    free[key] = g;
    return g;
  };
  freeGear('sF', 0, Z.sF, ZP.sF, ZP.hubS, -HELIX);
  freeGear('sR', 0, Z.sR, ZP.sR, ZP.hubS, 0);
  freeGear('m1', 2, Z.m1, ZP.m1, ZP.hub12, -HELIX);
  freeGear('m2', 2, Z.m2, ZP.m2, ZP.hub12, -HELIX);
  freeGear('m3', 2, Z.m3, ZP.m3, ZP.hub34, -HELIX);
  freeGear('m4', 2, Z.m4, ZP.m4, ZP.hub34, -HELIX);
  freeGear('gL', 3, Z.gL, ZP.gL, ZP.hubLM, 0);
  freeGear('gM', 3, Z.gM, ZP.gM, ZP.hubLM, -HELIX);
  freeGear('gH', 3, Z.gH, ZP.gH, ZP.hubH, -HELIX);
  P.free = free;
  // the reverse idler on its own pin, off to the left
  const idl = group(pt, Z.idlerXY[0], BOT + Z.idlerXY[1]);
  P.idl = idl;
  add(idl, gearGeo(Z.idR, FACE, {m: MOD, bore: 0.012}).translate(0, 0, ZP.sR), M.gear, true);
  add(pt, cyl(0.011, ZP.sR - 0.03, ZP.sR + 0.03, 16).translate(Z.idlerXY[0], BOT + Z.idlerXY[1], 0), M.rail);
  // hubs and sleeves (the sleeve: a ring with a fork groove), blocker rings either side
  const sleeveGeo = lathe([[0.0365, -0.013], [0.048, -0.013], [0.049, -0.011], [0.049, -0.0045], [0.043, -0.004], [0.043, 0.004], [0.049, 0.0045], [0.049, 0.011], [0.048, 0.013], [0.0365, 0.013], [0.0365, -0.013]], 72);
  const hubs = HUBS.map((h) => {
    const S = shafts[h.shaft];
    const hub = add(S, gearGeo(36, 0.02, {m: 0.0019, bore: BORE}).translate(0, 0, h.z), M.sleeve, true);
    const sl = group(S);
    add(sl, sleeveGeo, M.sleeve, true);
    sl.position.z = h.z;
    const blockers = [-1, 1].filter((s) => (s > 0 ? h.plus : h.minus) !== null).map((s) => add(S, gearGeo(34, 0.004, {m: 0.0019, bore: 0.03}).translate(0, 0, h.z + s * 0.016), M.brass, true));
    return {h, hub, sl, blockers, S};
  });
  P.hubs = hubs;
  // forks on rails above the shafts; a rail per sleeve
  const RAIL = [[0.0, TOP + 0.085], [-0.03, TOP + 0.085], [0.03, TOP + 0.085], [0.085, BOT - 0.085], [-0.085, BOT - 0.085]];
  const forks = HUBS.map((h, i) => {
    const f = group(pt);
    const [rx, ry] = RAIL[i];
    const sy = h.shaft % 2 ? BOT : TOP;
    add(f, cyl(0.006, h.z - 0.16, h.z + 0.16, 16).translate(rx, ry, 0), M.rail);
    const yoke = add(f, new THREE.TorusGeometry(0.046, 0.0035, 10, 40, Math.PI * 1.2), M.fork);
    yoke.position.set(0, sy, h.z);
    yoke.rotation.z = Math.atan2(ry - sy, rx) - Math.PI * 0.6;
    const ax = Math.cos(Math.atan2(ry - sy, rx)) * 0.048;
    const ay = sy + Math.sin(Math.atan2(ry - sy, rx)) * 0.048;
    const len = Math.hypot(rx - ax, ry - ay);
    const arm = add(f, new RoundedBoxGeometry(0.016, len + 0.01, 0.008, 2, 0.003), M.fork);
    arm.position.set((rx + ax) / 2, (ry + ay) / 2, h.z);
    arm.rotation.z = -Math.atan2(rx - ax, ry - ay);
    add(f, cyl(0.011, h.z - 0.012, h.z + 0.012, 16).translate(rx, ry, 0), M.fork);
    return f;
  });
  P.forks = forks;
  // ---------------------------------------- transfer, front drive shaft, front axle
  const drop = group(pt, 0, BOT - CD);
  P.drop = drop;
  add(drop, gearGeo(30, 0.02, {m: MOD, bore: 0.018}).translate(0, 0, 0.3), M.gear, true);
  const FA = new V3(0, RF, WHEELBASE);
  const propFrom = new V3(0, BOT - CD, 0.34);
  const propTo = new V3(0, RF + 0.01, WHEELBASE - 0.16);
  const prop = group(pt);
  prop.position.copy(propFrom);
  prop.quaternion.setFromUnitVectors(new V3(0, 0, 1), propTo.clone().sub(propFrom).normalize());
  const propSpin = group(prop);
  P.prop = propSpin;
  const pl = propTo.distanceTo(propFrom);
  add(propSpin, cyl(0.022, 0, pl, 20), M.shaft, true);
  for (const z of [0.05, pl - 0.05]) add(propSpin, new RoundedBoxGeometry(0.07, 0.03, 0.04, 2, 0.008).translate(0, 0, z), M.dark, true);
  add(propSpin, new THREE.BoxGeometry(0.006, 0.05, pl * 0.7).translate(0, 0.0, pl / 2), M.dark);
  const fAxle = group(pt, 0, FA.y, FA.z);
  P.fAxle = fAxle;
  add(fAxle, rod(0.065, 1.24, 'x'), M.housing);
  add(fAxle, new THREE.SphereGeometry(0.14, 32, 20).scale(1, 0.95, 1.05), M.housing);
  // PDM: the pinion on the drive shaft, the crown and differential, half shafts out to the planetary hubs
  const F_PIN_R = 0.03;
  const F_CROWN_R = (F_PIN_R * Z.fCrown) / Z.fPin;
  const fgP = Math.atan(Z.fPin / Z.fCrown);
  const fCrown = group(fAxle);
  add(fCrown, bevelGeo(Z.fCrown, F_CROWN_R, 0.01, Math.PI / 2 - fgP, 0.06).rotateY(Math.PI / 2).translate(-F_PIN_R + 0.005, 0, 0), M.gear, true);
  add(fCrown, lathe([[0.02, -0.03], [0.06, -0.03], [0.07, 0.0], [0.06, 0.07], [0.02, 0.07], [0.02, -0.03]], 40).rotateY(Math.PI / 2), M.shaft, true);
  add(fCrown, rod(0.022, 1.24, 'x'), M.shaft, true);
  const fPin = group(fAxle);
  add(fPin, bevelGeo(Z.fPin, F_PIN_R, 0.034, fgP, 0).translate(0, 0, -F_CROWN_R - 0.017 + 0.034), M.gear, true);
  const fHubs = [-1, 1].map((s) => {
    add(fAxle, lathe([[0.03, 0.0], [0.1, 0.0], [0.105, 0.05], [0.08, 0.09], [0.03, 0.09], [0.03, 0.0]], 48).rotateY((s * Math.PI) / 2).translate(s * 0.6, 0, 0), M.housing);
    add(fAxle, cyl(0.03, -0.08, 0.08, 20).rotateX(Math.PI / 2).translate(s * 0.57, 0, 0), M.housing); // kingpin
    const hub = group(fAxle, s * 0.65, 0, 0);
    hub.rotation.y = Math.PI / 2;
    const sun = group(hub);
    add(sun, gearGeo(Z.fSun, 0.026, {m: 0.0022}), M.gear, true);
    const carrier = group(hub);
    add(carrier, tube(0.015, 0.065, 0.016, 0.022), M.shaft, true);
    const planets = [0, 1, 2, 3].map((k) => {
      const phi = (Math.PI * k) / 2;
      const pg = group(carrier, Math.cos(phi) * rp(Z.fSun + Z.fPlanet, 0.0022), Math.sin(phi) * rp(Z.fSun + Z.fPlanet, 0.0022));
      add(pg, gearGeo(Z.fPlanet, 0.024, {m: 0.0022, bore: 0.008}), M.gear, true);
      return pg;
    });
    add(hub, gearGeo(Z.fRing, 0.026, {m: 0.0022, internal: 0.088}), M.gear);
    return {sun, carrier, planets};
  });
  P.pdm = {fCrown, fPin, fHubs};
  // ---------------------------------------- spiral bevel, differential, final drives
  const PIN_R = 0.035;
  const CROWN_R = (PIN_R * Z.crown) / Z.pin;
  const gP = Math.atan(Z.pin / Z.crown);
  const pinion = group(shafts[3]);
  P.pinion = pinion;
  add(pinion, bevelGeo(Z.pin, PIN_R, 0.042, gP, 0.0).rotateY(Math.PI).translate(0, 0, CROWN_R - 0.021), M.gear, true);
  const diff = group(pt, 0, AXLE_Y, 0);
  P.diff = diff;
  const crownSpin = group(diff);
  P.crown = crownSpin;
  add(crownSpin, bevelGeo(Z.crown, CROWN_R, 0.012, Math.PI / 2 - gP, 0.09).rotateY(Math.PI / 2).translate(-PIN_R + 0.006, 0, 0), M.gear, true);
  add(crownSpin, lathe([[0.03, -0.04], [0.09, -0.04], [0.1, 0.0], [0.09, 0.09], [0.03, 0.1], [0.03, -0.04]], 48).rotateY(Math.PI / 2), M.shaft, true);
  for (const s of [-1, 1]) add(crownSpin, bevelGeo(12, 0.04, 0.02, Math.PI / 4, 0).rotateX(Math.PI / 2).translate(0.03, s * 0.055, 0), M.gear, true);
  const halfShafts = [-1, 1].map((s) => {
    const h = group(diff);
    add(h, rod(0.028, FD_X - 0.04, 'x').translate((s * (FD_X - 0.04)) / 2, 0, 0), M.shaft, true);
    // the wet disc brake pack: friction discs splined to the half shaft between steel plates, in oil
    for (let i = 0; i < 5; i++) add(h, rod(0.075, 0.004, 'x', 40).translate(s * (0.3 + i * 0.009), 0, 0), i % 2 ? M.gear : M.friction, true);
    return h;
  });
  P.halfShafts = halfShafts;
  // planetary final drives: the sun on the half shaft, three planets on the carrier, the ring in the housing
  const fds = [-1, 1].map((s) => {
    const fd = group(diff, s * FD_X, 0, 0);
    fd.rotation.y = Math.PI / 2;
    const sun = group(fd);
    add(sun, gearGeo(Z.sun, 0.03, {m: FD_M, bore: 0.0}), M.gear, true);
    const carrier = group(fd);
    add(carrier, tube(0.02, 0.1, 0.018, 0.026), M.shaft, true);
    const planets = [0, 1, 2].map((k) => {
      const phi = (2 * Math.PI * k) / 3;
      const pg = group(carrier, Math.cos(phi) * rp(Z.sun + Z.planet, FD_M), Math.sin(phi) * rp(Z.sun + Z.planet, FD_M));
      add(pg, gearGeo(Z.planet, 0.028, {m: FD_M, bore: 0.01}), M.gear, true);
      return {pg, phi};
    });
    add(fd, gearGeo(Z.ring, 0.03, {m: FD_M, internal: 0.142}), M.gear, false);
    return {fd, sun, carrier, planets};
  });
  P.fds = fds;
  // rear axle housing: the centre round the crown and the trumpets out to the final drives
  const axleHousing = group(pt, 0, AXLE_Y, 0);
  P.axleHousing = axleHousing;
  const centre = add(axleHousing, lathe([[0.05, -0.2], [0.17, -0.2], [0.21, -0.12], [0.22, 0.0], [0.21, 0.13], [0.17, 0.2], [0.05, 0.2], [0.05, -0.2]], 64).rotateY(Math.PI / 2), M.housing);
  for (const s of [-1, 1]) add(axleHousing, lathe([[0.04, 0.27], [0.105, 0.27], [0.105, 0.36], [0.04, 0.36], [0.04, 0.27]], 48).rotateY((s * Math.PI) / 2), M.housing); // brake housings
  void centre;
  for (const s of [-1, 1]) {
    add(axleHousing, lathe([[0.04, 0.2], [0.1, 0.2], [0.085, 0.3], [0.085, 0.52], [0.155, 0.56], [0.16, 0.64], [0.06, 0.66], [0.04, 0.66], [0.04, 0.2]], 64).rotateY((s * Math.PI) / 2), M.housing);
  }
  // ---------------------------------------- transmission case (the shaft levels inside), PTO
  const gbCase = group(pt);
  P.gbCase = gbCase;
  {
    const sh = new THREE.Shape();
    const W = 0.135;
    sh.moveTo(-W, BOT - 0.12);
    sh.lineTo(W, BOT - 0.12);
    sh.quadraticCurveTo(W + 0.04, TOP, W, TOP + 0.13);
    sh.lineTo(-W, TOP + 0.13);
    sh.quadraticCurveTo(-W - 0.04, TOP, -W, BOT - 0.12);
    const g = new THREE.ExtrudeGeometry(sh, {depth: 1.0, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20});
    g.translate(0, 0, 0.2);
    add(gbCase, g, M.housing);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      add(gbCase, cyl(0.011, 1.455, 1.475, 10).translate(Math.cos(a) * 0.29, TOP + Math.sin(a) * 0.29, 0), M.dark);
    }
    for (const [x, y] of [[-0.15, BOT - 0.1], [0.15, BOT - 0.1], [-0.16, TOP + 0.1], [0.16, TOP + 0.1], [-0.18, AXLE_Y], [0.18, AXLE_Y]]) add(gbCase, cyl(0.012, 0.19, 0.215, 10).translate(x, y, 0), M.dark);
    // side inspection plate with its bolts
    add(gbCase, new RoundedBoxGeometry(0.012, 0.16, 0.24, 2, 0.01).translate(0.152, AXLE_Y + 0.05, 0.62), M.housing);
    for (const [dy, dz] of [[-0.06, -0.1], [0.06, -0.1], [-0.06, 0.1], [0.06, 0.1]]) add(gbCase, cyl(0.008, -0.006, 0.006, 8).rotateY(Math.PI / 2).rotateX(0).translate(0.16, AXLE_Y + 0.05 + dy, 0.62 + dz), M.dark);
    for (const z of [0.45, 0.68, 0.95]) {
      const r = new THREE.ExtrudeGeometry(sh, {depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.012, bevelSegments: 1, curveSegments: 20});
      r.scale(1.06, 1, 1);
      r.translate(0, 0, z);
      add(gbCase, r, M.housing);
    }
  }
  // the independent PTO: a gear off the flywheel hub drops through an idler to the PTO line below the box; the PTO
  // clutch on that line; along under the axle to the 18/80 reduction and the 540 stub at the back
  const PTO_Y = 0.5;
  const PM = 0.00404; // 47 T on a 190 mm centre
  const ptoDrive = group(pt, 0, TOP, 0); // the hollow PTO shaft from the 2nd clutch disc
  add(ptoDrive, gearGeo(47, 0.022, {m: PM, bore: 0.03}).translate(0, 0, 1.3), M.gear, true);
  add(ptoDrive, tube(0.024, 0.034, 1.29, 1.37, 24), M.shaft, true);
  // the double clutch: the 2nd disc (behind the 1st) drives the PTO
  add(ptoDrive, tube(0.034, 0.05, 1.34, 1.352), M.dark, true);
  add(ptoDrive, tube(0.05, 0.16, 1.343, 1.349), M.dark, true);
  for (const dz of [-0.004, 0.004]) add(ptoDrive, tube(0.09, 0.165, 1.346 + dz - 0.0015, 1.346 + dz + 0.0015), M.friction, true);
  const ptoIdl = group(pt, 0, TOP - 0.19, 0);
  add(ptoIdl, gearGeo(47, 0.022, {m: PM, bore: 0.012}).translate(0, 0, 1.3), M.gear, true);
  const ptoIn = group(pt, 0, PTO_Y, 0); // the lower drop gear
  add(ptoIn, gearGeo(47, 0.022, {m: PM, bore: 0.012}).translate(0, 0, 1.3), M.gear, true);
  const ptoLine = group(pt, 0, PTO_Y, 0); // the driven side
  add(ptoLine, cyl(0.02, -0.18, 1.23, 20), M.shaft, true);
  add(ptoLine, gearGeo(Z.ptoA, 0.03, {m: 0.0025, helix: HELIX, bore: 0.01}).translate(0, 0, -0.16), M.gear, true);
  const pto = group(pt, 0, PTO_Y + rp(Z.ptoA + Z.ptoB, 0.0025), 0);
  P.pto = pto;
  const ptoSpin = group(pto);
  add(ptoSpin, gearGeo(Z.ptoB, 0.03, {m: 0.0025, helix: -HELIX, bore: 0.018}).translate(0, 0, -0.16), M.gear, true);
  add(ptoSpin, cyl(0.02, -0.33, -0.12, 20), M.shaft, true);
  add(ptoSpin, gearGeo(6, 0.08, {m: 0.0058}).translate(0, 0, -0.37), M.rail, true); // the 6-spline stub, 1 3/8"
  add(pto, lathe([[0.03, -0.33], [0.075, -0.33], [0.08, -0.36], [0.085, -0.4], [0.075, -0.405], [0.03, -0.33]], 40), M.dark);
  add(pto, new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 0.9).translate(0, 0.03, -0.38), M.black);
  add(pt, lathe([[0.03, -0.2], [0.13, -0.2], [0.13, -0.33], [0.03, -0.33], [0.03, -0.2]], 40).translate(0, PTO_Y + 0.06, 0), M.housing);
  P.ptoSpin = ptoSpin;
  P.ptoParts = {ptoDrive, ptoIdl, ptoIn, ptoLine};
  // the shift cover (tampa de comando) on top of the box: the selector shaft and its finger over the three rails
  const cover = group(pt);
  P.cover = cover;
  add(cover, new RoundedBoxGeometry(0.26, 0.05, 0.62, 3, 0.012).translate(0, TOP + 0.16, 0.86), M.housing);
  const selector = group(cover, 0, TOP + 0.118, 0.86);
  P.selector = selector;
  add(selector, cyl(0.009, -0.25, 0.25, 16), M.rail);
  add(selector, new RoundedBoxGeometry(0.018, 0.04, 0.02, 2, 0.005).translate(0, -0.02, 0), M.fork);
  // the rods from the cab levers down to the cover
  for (const [x, z] of [[0.32, 0.42], [0.42, 0.28], [-0.17, 0.9]]) {
    const g = new THREE.CylinderGeometry(0.005, 0.005, 1, 8);
    const from = new V3(x, 1.52, z);
    const to = new V3(x * 0.2, TOP + 0.185, Math.max(0.6, Math.min(1.1, z + 0.3)));
    const m = add(cover, g, M.rail);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.scale.y = from.distanceTo(to);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), to.clone().sub(from).normalize());
  }

  // ================================================================ wheels
  const rearT = tyreGeo(RW, 0.48, 0.432, 24, 0.032, 0.07); // 480/70R34
  const frontT = tyreGeo(RF, 0.38, 0.305, 21, 0.028, 0.055); // 380/70R24
  const rearRim = rimGeo(0.432, 0.48, 0.06);
  const frontRim = rimGeo(0.305, 0.38, 0.04);
  const wheel = (parent, x, R, T, rim, side) => {
    const w = group(parent, x, R, 0);
    const spin = group(w);
    add(spin, T.carcass, M.rubber);
    add(spin, T.bars, M.rubber);
    const r = add(spin, rim, M.rim);
    r.scale.x = side;
    // hub and nuts
    add(spin, rod(0.09, 0.08, 'x').translate(side * 0.06, 0, 0), M.rim);
    add(spin, rod(0.05, 0.05, 'x').translate(side * 0.1, 0, 0), M.dark);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(spin, rod(0.009, 0.03, 'x', 8).translate(side * 0.1, Math.cos(a) * 0.075, Math.sin(a) * 0.075), M.dark);
    }
    return {w, spin};
  };
  const rearWheels = [1, -1].map((s) => wheel(root, s * REAR_X, AXLE_Y, rearT, rearRim, s));
  const frontAxleGroup = group(root, 0, 0, WHEELBASE);
  const frontWheels = [1, -1].map((s) => wheel(frontAxleGroup, s * FRONT_X, RF, frontT, frontRim, s));
  P.rearWheels = rearWheels;
  P.frontWheels = frontWheels;

  // ================================================================ body and cab
  const body = group();
  P.body = body;
  const bodyMats = [M.blue, M.black, M.glass, M.seat, M.lamp];
  // hood: a long rounded box, a little narrower at the nose, the grille and lamps
  {
    const hood = new RoundedBoxGeometry(0.76, 0.66, 1.72, 6, 0.12);
    const p = hood.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      const k = 1 - Math.max(0, z / 0.86) * 0.08;
      p.setX(i, p.getX(i) * k);
      if (p.getY(i) > 0) p.setY(i, p.getY(i) - Math.max(0, z / 0.86) * 0.08);
    }
    hood.computeVertexNormals();
    hood.translate(0, 1.33, 2.11);
    add(body, hood, M.blue);
    add(body, new RoundedBoxGeometry(0.6, 0.42, 0.05, 3, 0.03).translate(0, 1.2, 2.86), M.black);
    for (let i = 0; i < 6; i++) add(body, new THREE.BoxGeometry(0.5, 0.015, 0.02).translate(0, 1.06 + i * 0.055, 2.89), M.dark);
    // the louvres across the front of the hood top
    for (let i = 0; i < 7; i++) add(body, new RoundedBoxGeometry(0.5, 0.008, 0.03, 1, 0.003).translate(0, 1.585 - i * 0.004, 2.5 + i * 0.045), M.dark);
    for (const s of [-1, 1]) {
      // the headlamps in the corners of the nose: a black bezel, a clear lens and the reflector behind it
      add(body, new RoundedBoxGeometry(0.16, 0.13, 0.05, 3, 0.03).translate(s * 0.27, 1.37, 2.86), M.black);
      add(body, new THREE.SphereGeometry(0.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(s * 0.27, 1.37, 2.885), M.lamp);
      // the side vents, black
      add(body, new RoundedBoxGeometry(0.02, 0.3, 0.55, 2, 0.008).translate(s * 0.37, 1.2, 2.25), M.black);
    }
    // the frame rails and the black front support under the nose
    add(body, new RoundedBoxGeometry(0.6, 0.34, 0.24, 3, 0.04).translate(0, 0.78, 2.95), M.black);
    add(body, new RoundedBoxGeometry(0.66, 0.05, 0.08, 2, 0.015).translate(0, 0.6, 3.07), M.black);
  }
  // cab: floor, four posts, roof, glass, seat, wheel, dash, exhaust and the beacon
  const CAB = {z0: -0.38, z1: 1.18, x: 0.56, floor: 1.22, roof: 2.62}; // (the floor and the column; the TL80 shown has no cab)
  // TL80 operator platform: an open floor with the rear two-post ROPS arch (no cab), the lamps on the fenders
  add(body, new RoundedBoxGeometry(1.14, 0.06, 1.3, 2, 0.02).translate(0, CAB.floor, 0.35), M.black);
  for (let i = 0; i < 8; i++) add(body, new THREE.BoxGeometry(0.9, 0.006, 0.02).translate(0, CAB.floor + 0.033, -0.15 + i * 0.13), M.dark);
  for (const s of [-1, 1]) {
    // the ROPS posts bolted to the rear axle housing, up past the operator
    add(body, new RoundedBoxGeometry(0.08, 1.5, 0.08, 2, 0.02).translate(s * 0.58, 1.3 + 0.75 - 0.15, -0.5), M.black);
    add(body, new RoundedBoxGeometry(0.2, 0.08, 0.14, 2, 0.02).translate(s * 0.56, 0.98, -0.5), M.black);
    // fender lamps: amber turn lamp to the front, red tail lamp to the back, a work lamp on the post
    add(body, new THREE.SphereGeometry(0.04, 16, 10).scale(1, 0.8, 0.7).translate(s * (REAR_X + 0.05), 1.58, 0.2), M.amber);
    add(body, new RoundedBoxGeometry(0.16, 0.07, 0.05, 2, 0.015).translate(s * REAR_X, 1.06, -0.8), M.red);
    add(body, cyl(0.045, -0.48, -0.44, 24).translate(s * 0.58, 2.2, 0), M.lamp);
  }
  add(body, new THREE.TorusGeometry(0.58, 0.04, 12, 40, Math.PI).translate(0, 2.4, -0.5), M.black);
  add(body, new RoundedBoxGeometry(0.5, 0.12, 0.48, 3, 0.04).translate(0, CAB.floor + 0.42, 0.05), M.seat);
  add(body, new RoundedBoxGeometry(0.5, 0.55, 0.12, 3, 0.04).translate(0, CAB.floor + 0.72, -0.2).rotateX(0), M.seat);
  add(body, new RoundedBoxGeometry(0.06, 0.4, 0.06, 2, 0.02).translate(0, CAB.floor + 0.2, 0.05), M.dark);
  add(body, new RoundedBoxGeometry(0.46, 0.5, 0.18, 3, 0.04).translate(0, CAB.floor + 0.3, 1.02), M.black); // dash
  const steer = group(body, 0, CAB.floor + 0.72, 0.86);
  steer.rotation.x = -0.75;
  add(steer, new THREE.TorusGeometry(0.17, 0.014, 10, 40), M.black);
  add(steer, rod(0.022, 0.3, 'z').translate(0, 0, 0.15), M.black);
  for (let i = 0; i < 3; i++) add(steer, new THREE.BoxGeometry(0.16, 0.014, 0.01).translate(0.08, 0, 0).rotateZ((i / 3) * Math.PI * 2 + 0.5), M.black);
  add(body, cyl(0.045, -0.7, 0.7, 20).rotateX(Math.PI / 2).translate(0.36, CAB.floor + 0.75, CAB.z1 + 0.06), M.black); // exhaust
  add(body, cyl(0.05, -0.08, 0.08, 20).rotateX(Math.PI / 2).translate(0.36, CAB.floor + 1.5, CAB.z1 + 0.06), M.black);
  // rear fenders (arcs over the rear tyres), small front fenders, the step and the fuel tank
  for (const s of [1, -1]) {
    const sh = new THREE.Shape();
    const R0 = RW + 0.05;
    const R1 = RW + 0.08;
    sh.absarc(0, 0, R1, Math.PI * 0.1, Math.PI * 0.92, false);
    sh.absarc(0, 0, R0, Math.PI * 0.92, Math.PI * 0.1, true);
    const g = new THREE.ExtrudeGeometry(sh, {depth: 0.56, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 40});
    g.translate(0, 0, -0.28);
    g.rotateY(Math.PI / 2);
    g.translate(s * REAR_X, AXLE_Y, 0);
    add(body, g, M.blue);
    const fg = new THREE.Shape();
    fg.absarc(0, 0, RF + 0.08, Math.PI * 0.15, Math.PI * 0.85, false);
    fg.absarc(0, 0, RF + 0.05, Math.PI * 0.85, Math.PI * 0.15, true);
    const f = new THREE.ExtrudeGeometry(fg, {depth: 0.34, bevelEnabled: false, curveSegments: 30});
    f.translate(0, 0, -0.17);
    f.rotateY(Math.PI / 2);
    f.translate(s * FRONT_X, RF, WHEELBASE);
    add(body, f, M.black);
  }
  add(body, new RoundedBoxGeometry(0.22, 0.34, 0.5, 3, 0.05).translate(0.38, 0.92, 0.95), M.black);
  for (let i = 0; i < 3; i++) add(body, new THREE.BoxGeometry(0.2, 0.02, 0.12).translate(0.56, 0.55 + i * 0.22, 1.12), M.dark);
  // the 3-point hitch at the back (Cat. II, 3600 kgf): lift arms on the rockshaft, lift rods, lower links with their
  // ball ends, the top link with its turnbuckle, the drawbar frame and pin, the remote valve couplers
  const hitch = group();
  P.hitch = hitch;
  add(hitch, rod(0.035, 0.6, 'x').translate(0, 1.0, -0.3), M.black);
  for (const s of [-1, 1]) {
    add(hitch, new RoundedBoxGeometry(0.05, 0.06, 0.42, 2, 0.012).rotateX(-0.25).translate(s * 0.25, 0.95, -0.48), M.black);
    add(hitch, new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10).rotateX(0.12).translate(s * 0.27, 0.72, -0.66), M.rail);
    add(hitch, new RoundedBoxGeometry(0.05, 0.06, 0.8, 2, 0.012).rotateX(0.18).translate(s * 0.3, 0.45, -0.62), M.black);
    add(hitch, new THREE.SphereGeometry(0.035, 16, 10).translate(s * 0.31, 0.38, -1.0), M.rail);
    add(hitch, cyl(0.012, -0.03, 0.03, 12).translate(0.08 + s * 0.04, 1.02, -0.5), M.amber);
  }
  add(hitch, new RoundedBoxGeometry(0.045, 0.045, 0.5, 2, 0.01).rotateX(-0.15).translate(0, 1.1, -0.6), M.black);
  add(hitch, cyl(0.03, -0.75, -0.55, 16).rotateX(-0.15).translate(0, 1.1 + 0.0, 0), M.rail);
  add(hitch, new RoundedBoxGeometry(0.46, 0.05, 0.08, 2, 0.012).translate(0, 0.42, -0.5), M.black);
  for (const s of [-1, 1]) add(hitch, new RoundedBoxGeometry(0.05, 0.35, 0.06, 2, 0.012).translate(s * 0.21, 0.58, -0.45), M.black);
  add(hitch, new RoundedBoxGeometry(0.1, 0.03, 0.4, 2, 0.008).translate(0, 0.42, -0.68), M.black);
  add(hitch, new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10).translate(0, 0.44, -0.84), M.brass);

  // ---------------------------------------- the operator's levers: reverser, gears (an H), range
  const leverRoot = group();
  const leverAt = (x, y, z, len, mat = M.dark) => {
    const g = group(leverRoot, x, y, z);
    add(g, rod(0.008, len, 'y').translate(0, len / 2, 0), M.rail);
    add(g, new THREE.SphereGeometry(0.024, 20, 14).translate(0, len, 0), mat);
    return g;
  };
  const levers = {
    sh: leverAt(-0.17, CAB.floor + 0.62, 0.9, 0.22, M.knobBlue),
    g: leverAt(0.32, CAB.floor + 0.3, 0.42, 0.34),
    r: leverAt(0.42, CAB.floor + 0.3, 0.28, 0.3, M.knobAmber),
  };
  P.levers = levers;

  // ================================================================ the cutaway
  // A quarter of every casting (engine block, bell, gearbox, axle housings, PDM, supports) is cut away on the camera's
  // side above the cut height, like a factory cutaway: two clipping planes intersected. The castings are closed
  // solids, so their back faces show through the cut; a second, unlit back-face copy paints them as solid machined
  // iron, the section face. (The AO pass is switched off while cut: it would still see the removed quarter.)
  const CUT = [new THREE.Plane(new V3(-1, 0, 0), 0), new THREE.Plane(new V3(0, -1, 0), 9)];
  M.housing.clippingPlanes = CUT;
  M.housing.clipIntersection = true;
  M.cap = new THREE.MeshBasicMaterial({color: '#aeb4ba', side: THREE.BackSide, clippingPlanes: CUT, clipIntersection: true});
  M.capLine = new THREE.MeshBasicMaterial({color: '#f2661c', side: THREE.BackSide, clippingPlanes: CUT, clipIntersection: true});
  const castings = all.filter((m) => m.material === M.housing);
  for (const m of castings) {
    const c = new THREE.Mesh(m.geometry, M.cap);
    c.renderOrder = -1;
    m.add(c);
  }

  // ================================================================ display modes and the power path
  const ghost = (mats, k) => {
    for (const m of mats) {
      if (m === M.glass) continue;
      const want = k > 0.001;
      if (m.transparent !== want) {
        m.transparent = want;
        m.needsUpdate = true;
      }
      m.opacity = 1 - 0.88 * k;
      m.depthWrite = k < 0.5;
    }
  };
  const housingMats = [M.housing];
  const ACC = new THREE.Color('#f2661c');
  const lit = new Set();
  const meshesOf = (...objs) => {
    const s = [];
    for (const o of objs) o?.traverse((m) => m.isMesh && s.push(m));
    return s;
  };
  const tintSet = (k, path) => {
    for (const t of tint) {
      const on = path.has(t.mesh) ? k : 0;
      if (!on && !lit.has(t.mesh)) continue;
      t.mesh.material.color.copy(t.base).lerp(ACC, on * 0.75);
      t.mesh.material.emissive.copy(ACC).multiplyScalar(on * 0.14);
      if (on) lit.add(t.mesh);
      else lit.delete(t.mesh);
    }
  };
  // the meshes the torque passes through for a pose
  const pathOf = (P0, fwd4, ptoOn) => {
    const s = new Set(meshesOf(crank));
    if (ptoOn > 0.5) meshesOf(P.ptoParts.ptoDrive, P.ptoParts.ptoIdl, P.ptoParts.ptoIn, P.ptoParts.ptoLine, ptoSpin).forEach((m) => s.add(m));
    if (P0.clutch < 0.5) return s;
    s.add(shafts[0].children[0]);
    s.add(shafts[0].children[1]);
    meshesOf(clutch).forEach((m) => s.add(m));
    if (!P0.sh) return s;
    const add2 = (...o) => meshesOf(...o).forEach((m) => s.add(m));
    if (P0.sh === 'F') add2(free.sF, fx.s1F);
    else add2(free.sR, idl, fx.s1R);
    add2(hubs[0].sl);
    s.add(hubs[0].hub);
    s.add(shafts[1].children[0]);
    if (!P0.g) return s;
    const gi = P0.g;
    add2(free['m' + gi], fx['c' + gi], hubs[gi > 2 ? 1 : 2].sl);
    s.add(hubs[gi > 2 ? 1 : 2].hub);
    s.add(shafts[2].children[0]);
    s.add(shafts[2].children[1]);
    if (!P0.r) return s;
    add2(free['g' + P0.r], fx['d' + P0.r], hubs[P0.r === 'H' ? 3 : 4].sl);
    s.add(hubs[P0.r === 'H' ? 3 : 4].hub);
    s.add(shafts[3].children[0]);
    add2(pinion, crownSpin, ...halfShafts, ...fds.map((f) => f.fd));
    if (fwd4) add2(fx.tr, drop, propSpin, P.pdm.fCrown, P.pdm.fPin, ...P.pdm.fHubs.map((h) => h.sun.parent));
    return s;
  };

  /**
   * st: th (angles from kin.step), pose (kin.poseOf), fwd4 (0/1), ptoOn, body 0..1 (ghost the body),
   * housing 0..1 (ghost the housings), power 0..1, levers {sh, g, r} as poses
   */
  const update = (st) => {
    const th = st.th;
    const A = gearAngles(th);
    crank.rotation.z = th.eng;
    shafts.forEach((s, i) => (s.rotation.z = th['s' + i]));
    for (const k of ['sF', 'sR', 'm1', 'm2', 'm3', 'm4', 'gL', 'gM', 'gH']) free[k].rotation.z = A[k];
    idl.rotation.z = A.idl;
    drop.rotation.z = -th.s3;
    propSpin.rotation.z = th.prop;
    clutch.position.z = (1 - (st.pose?.clutch ?? 1)) * 0.006;
    // the pinion on S3 turns the crown about x; the crown carries the diff case and both half shafts
    crownSpin.rotation.x = A.carrier * 6;
    halfShafts.forEach((h) => (h.rotation.x = A.carrier * 6));
    fds.forEach((f) => {
      f.sun.rotation.z = A.rear.sun;
      f.carrier.rotation.z = A.rear.carrier;
      f.planets.forEach((p, k) => (p.pg.rotation.z = A.rear.planets[k]));
    });
    rearWheels.forEach((w) => (w.spin.rotation.x = th.wheel));
    frontWheels.forEach((w) => (w.spin.rotation.x = th.front));
    const ptoL = th.ptoL ?? 0;
    P.ptoParts.ptoDrive.rotation.z = ptoL;
    P.ptoParts.ptoIdl.rotation.z = meshed(ptoL, 47, 47, -Math.PI / 2);
    P.ptoParts.ptoIn.rotation.z = meshed(P.ptoParts.ptoIdl.rotation.z, 47, 47, -Math.PI / 2);
    P.ptoParts.ptoLine.rotation.z = ptoL;
    P.timing.cam.rotation.z = meshed(th.eng, 30, 60, Math.atan2(CAM_DIR[1], CAM_DIR[0]));
    P.timing.pumpG.rotation.z = meshed(th.eng, 30, 60, Math.atan2(PUMP_DIR[1], PUMP_DIR[0]));
    ptoSpin.rotation.z = meshed(ptoL, Z.ptoA, Z.ptoB, Math.PI / 2);
    // engine: pistons and rods from the crank angle
    A.pistons.forEach((pp, i) => {
      const {piston, rodM} = pistons[i];
      piston.position.y = pp.y + 0.03;
      rodM.position.set(-(ENGINE.stroke / 2) * Math.sin(pp.a), (ENGINE.stroke / 2) * Math.cos(pp.a), 0);
      rodM.rotation.z = -pp.rodAng;
    });
    // PDM: the front hubs' planets from the front wheel, the crown from the sun, the pinion from the crown
    P.pdm.fHubs.forEach((h) => {
      h.sun.rotation.z = A.front.sun;
      h.carrier.rotation.z = A.front.carrier;
      h.planets.forEach((pg, k) => (pg.rotation.z = A.front.planets[k]));
    });
    P.pdm.fCrown.rotation.x = A.front.sun;
    P.pdm.fPin.rotation.z = A.front.sun * (Z.fCrown / Z.fPin);
    // the selector finger: across with the gear plane, turning with the lever's fore/aft
    const sel0 = st.pose?.sl ?? [0, 0, 0, 0, 0];
    P.selector.position.x = Math.abs(sel0[2]) > 0.02 ? -0.03 : Math.abs(sel0[1]) > 0.02 ? 0.03 : 0;
    P.selector.rotation.x = 0;
    // sleeves and their forks
    const sl = st.pose?.sl ?? [0, 0, 0, 0, 0];
    hubs.forEach((H, i) => {
      H.sl.position.z = H.h.z + sl[i] * TRAVEL;
      forks[i].position.z = sl[i] * TRAVEL;
    });
    // the levers: the reverser fore/aft, the gear lever in an H (1-2 left, 3-4 right; odd forward), range fore/aft
    levers.sh.rotation.x = sl[0] * 0.38;
    const gx = (Math.abs(sl[2]) > 0.02 ? -1 : Math.abs(sl[1]) > 0.02 ? 1 : st.gGate ?? 0) * 0.22;
    const gy = (sl[2] !== 0 ? -sl[2] : -sl[1]) * 0.34;
    levers.g.rotation.set(gy, 0, gx);
    // range: L back, M centre, H forward
    levers.r.rotation.x = 0.42 * sl[3] + 0.42 * Math.min(0, sl[4]);
    ghost(bodyMats, Math.min(1, (st.body ?? 0) * 1.02));
    ghost(housingMats, st.housing ?? 0);
    // body: fades out entirely, wheels with it, so the cutaway stands alone like a catalogue drawing
    ghost([M.rubber, M.rim], st.body ?? 0);
    for (const w of [...rearWheels, ...frontWheels]) w.w.visible = (st.body ?? 0) < 0.995;
    leverRoot.visible = (st.body ?? 0) < 0.995;
    // the cut: drops from above the tractor to just over the shaft line, on the side the camera is on
    const cut = st.cut ?? 0;
    const side = (st.camX ?? 1) >= 0 ? 1 : -1;
    CUT[0].normal.set(-side, 0, 0);
    CUT[0].constant = 0;
    CUT[1].constant = 3.2 + (0.7 - 3.2) * cut;
    M.cap.visible = cut > 0.001;
    M.glass.opacity = 0.18 * (1 - (st.body ?? 0));
    body.visible = (st.body ?? 0) < 0.995;
    tintSet(st.power ?? 0, (st.power ?? 0) > 0.001 && st.pose ? pathOf(st.pose, st.fwd4, st.ptoOn ?? 0) : new Set());
    for (const H of hubs) for (const b of H.blockers) b.material.emissive.setRGB(0, 0, 0);
    if (st.pose && st.pose.sync >= 0) {
      const H = hubs[st.pose.sync];
      const b = H.blockers.length > 1 ? H.blockers[st.pose.syncSide > 0 ? 1 : 0] : H.blockers[0];
      b.material.emissive.set('#ff8a3c').multiplyScalar(0.6);
    }
  };
  const wp = new V3();
  const at = (o, local) => {
    o.updateWorldMatrix(true, false);
    return local ? o.localToWorld(wp.copy(local)) : o.getWorldPosition(wp);
  };
  const anchors = {
    engine: () => at(engine, new V3(0, TOP + 0.3, 1.86)),
    pistons: () => at(pistons[1].piston),
    timing: () => at(P.timing.cam, new V3(0, 0.09, 2.29)),
    pump: () => at(engine, new V3(0.29, TOP + 0.02, 2.12)),
    bolster: () => at(bolster, new V3(0.2, 0.62, 2.6)),
    brakes: () => at(diff, new V3(0.33, 0.08, 0)),
    cover: () => at(cover, new V3(0.13, TOP + 0.17, 0.75)),
    ptoClutch: () => at(P.ptoParts.ptoLine, new V3(0, 0.08, 1.22)),
    ptoRed: () => at(pto, new V3(0, rp(Z.ptoB, 0.0025) * 0.7, -0.16)),
    pdm: () => at(P.pdm.fCrown, new V3(0, 0.11, 0.0)),
    pdmHub: () => at(P.pdm.fHubs[0].carrier.parent, new V3(0, 0.07, 0)),
    trumpet: () => at(diff, new V3(0.36, 0.03, 0)),
    clutch: () => at(shafts[0], new V3(0, 0.17, 1.363)),
    shuttle: () => at(hubs[0].sl, new V3(0, 0.049, 0)),
    idler: () => at(idl, new V3(0, 0, ZP.sR)),
    gears: () => at(free.m2, new V3(0, rp(Z.m2), ZP.m2)),
    hub12: () => at(hubs[2].sl, new V3(0, 0.049, 0)),
    hub34: () => at(hubs[1].sl, new V3(0, 0.049, 0)),
    range: () => at(free.gL, new V3(0, -rp(Z.gL), ZP.gL)),
    crown: () => at(diff, new V3(-0.03, CROWN_R * 0.7, 0.08)),
    final: () => at(diff, new V3(FD_X, 0.15, 0)),
    prop: () => at(propSpin, new V3(0, 0.02, pl * 0.5)),
    pto: () => at(pto, new V3(0, 0.0, -0.38)),
    levers: () => at(levers.g, new V3(0, 0.34, 0)),
    wheel: () => at(rearWheels[0].w, new V3(0.24, RW * 0.7, 0)),
  };
  update({th: {eng: 0, s0: 0, s1: 0, s2: 0, s3: 0, wheel: 0, front: 0, prop: 0, pto: 0}, pose: null});
  return {root, update, M, all, anchors, P};
}

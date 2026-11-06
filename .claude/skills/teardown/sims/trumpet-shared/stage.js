// The workshop stage for the final drive lesson: a pale bench mat with a 10 mm grid fading out, soft light, shadows,
// GTAO kept off the floor (and off while the castings are cut). frame(state, cam) poses the parts and draws one frame.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {buildFinalDrive} from './build.js';
import {buildTractor} from '../tractor-shared/tractor.js';
import {AXLE_Y} from '../tractor-shared/kin.js';
import {installed, PARTS} from './model.js';

const V3 = THREE.Vector3;
export const COL = {bg: '#ecebe8', ground: '#e3e1dc', mark: '#cfccc5', shadow: '#3d3a35'};
export const FLOOR = -0.3;

const GROUND_VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GROUND_FRAG = /* glsl */ `uniform vec3 uG; uniform vec3 uM; uniform vec3 uBg; uniform vec3 uC; uniform float uD; varying vec3 vW;
  void main(){
    vec2 p = vW.xz;
    vec2 f = abs(fract(p / 0.01 + 0.5) - 0.5) * 0.01;
    vec2 F = abs(fract(p / 0.1 + 0.5) - 0.5) * 0.1;
    float w = fwidth(p.x) + fwidth(p.y);
    float m = (1.0 - smoothstep(0.0, w * 0.8, min(f.x, f.y))) * 0.3;
    m = max(m, 1.0 - smoothstep(0.0, w * 1.2, min(F.x, F.y)));
    vec3 col = mix(uG, uM, m * 0.6);
    float d = length(p - uC.xz);
    gl_FragColor = vec4(mix(col, uBg, smoothstep(1.2, 4.5, d)), 1.0);
  }`;

export function createStage({canvas, tractor: withTractor = false}) {
  const floorY = withTractor ? 0 : FLOOR;
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.Fog(COL.bg, 4, 14);
  const camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.02, 60);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 8}));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.75;
  gtao.updateGtaoMaterial({radius: 0.02, distanceExponent: 1.4, thickness: 0.2, scale: 1.0, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false});
  gtao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16});
  class Toggle extends Pass {
    constructor(fn) {
      super();
      this.needsSwap = false;
      this.fn = fn;
    }
    render() {
      this.fn();
    }
  }
  const groundVis = (v) => () => {
    ground.visible = v;
    shade.visible = v;
  };
  composer.addPass(new Toggle(groundVis(false)));
  composer.addPass(gtao);
  composer.addPass(new Toggle(groundVis(true)));
  composer.addPass(new OutputPass());

  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#dedad3');
    const box = (w, h, pos, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 0.985, 0.96).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(12, 12, new V3(0, 14, 2), 2.4);
    box(3, 14, new V3(-12, 4, 6), 3.0);
    box(3, 14, new V3(12, 4, -4), 2.2);
    box(18, 2, new V3(0, 2, 14), 1.4);
    box(18, 2, new V3(0, 1, -14), 0.9);
    const g = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({color: '#cfc9be', side: THREE.DoubleSide}));
    g.rotation.x = -Math.PI / 2;
    g.position.y = -2;
    env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.02).texture;
    scene.environmentIntensity = 0.9;
    pm.dispose();
  }
  const SUN_DIR = new V3(0.45, 0.8, 0.5).normalize();
  const sun = new THREE.DirectionalLight('#fff7ec', 2.2);
  sun.castShadow = true;
  const EXT = 1.6;
  Object.assign(sun.shadow.camera, {left: -EXT, right: EXT, top: EXT, bottom: -EXT, near: 0.2, far: 10});
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.radius = 8;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.0015;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#fffaf2', '#cfc6b8', 0.7));
  const rim = new THREE.DirectionalLight('#eef3ff', 0.7);
  rim.position.set(-2, 1.2, -2.4);
  scene.add(rim);

  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    uniforms: {uG: {value: new THREE.Color(COL.ground)}, uM: {value: new THREE.Color(COL.mark)}, uBg: {value: new THREE.Color(COL.bg)}, uC: {value: new V3()}, uD: {value: 0}},
    toneMapped: false,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = floorY;
  scene.add(ground);
  const shade = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.ShadowMaterial({color: COL.shadow, opacity: 0.32, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8}),
  );
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = floorY;
  shade.receiveShadow = true;
  scene.add(shade);

  let aoWanted = true;
  const box = buildFinalDrive();
  // ---- on the whole tractor: the lesson's axis (z) along the tractor's left half shaft (+x), its hub flange on the
  // wheel's disc face; the tractor's own left trumpet, brake and final drive are taken out for it; a jack stand under
  // the axle housing; the left rear wheel comes off and goes back on in the last step
  const HUB_X = 0.72 + 0.06 - 0.012 - 0.555;
  let trac = null;
  let leftWheel = null;
  const wrap = new THREE.Group();
  wrap.add(box.root);
  scene.add(wrap);
  if (withTractor) {
    trac = buildTractor();
    scene.add(trac.root);
    wrap.position.set(HUB_X, AXLE_Y, 0);
    wrap.rotation.y = Math.PI / 2;
    trac.root.updateMatrixWorld(true);
    const bb = new THREE.Box3();
    for (const g of [trac.P.diff, trac.P.axleHousing])
      g.traverse((m) => {
        if (!m.isMesh) return;
        bb.setFromObject(m);
        const c = bb.getCenter(new V3());
        if (c.x > 0.12) m.visible = false;
      });
    leftWheel = trac.P.rearWheels[0];
    const stand = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color: '#4a4f57', metalness: 0.5, roughness: 0.5});
    const leg = new THREE.CylinderGeometry(0.02, 0.03, 0.62, 12);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const m = new THREE.Mesh(leg, mat);
      m.position.set(Math.cos(a) * 0.1, 0.3, Math.sin(a) * 0.1);
      m.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      m.castShadow = true;
      stand.add(m);
    }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 16).translate(0, 0.62, 0), mat);
    post.castShadow = true;
    stand.add(post);
    stand.position.set(0.18, 0, 0.26);
    scene.add(stand);
    trac.stand = stand;
  } else box.root.position.y = 0;
  const WHEEL = PARTS.find((p) => p.id === 'roda');
  const TH0 = {eng: 0, s0: 0, s1: 0, s2: 0, s3: 0, wheel: 0, front: 0, prop: 0, pto: 0, ptoL: 0};

  const size = {w: 1600, h: 900};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  sun.target.position.set(0, 0.2, 0.4);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 5);

  // cam: {tx, ty, tz, az, el, d (radians, metres), sx, sy}
  const frame = (st, cam) => {
    groundMat.uniforms.uD.value = st.dist ?? 0;
    const {tx, ty, tz} = cam;
    camera.position.set(tx + cam.d * Math.cos(cam.el) * Math.sin(cam.az), ty + cam.d * Math.sin(cam.el), tz + cam.d * Math.cos(cam.el) * Math.cos(cam.az));
    if (trac) {
      // the cut, in tractor space: the quarter on the camera's side (+-z) above the axle
      const side = camera.position.z >= 0 ? 1 : -1;
      box.update({
        ...st,
        setCut: (CUT, k) => {
          CUT[0].normal.set(0, 0, -side);
          CUT[0].constant = 0;
          CUT[1].normal.set(0, -1, 0);
          CUT[1].constant = AXLE_Y + 0.6 * (1 - k);
        },
      });
      const hl = st.isolate ?? 0;
      trac.update({th: TH0, pose: null, body: Math.max(hl, st.bodyFade ?? 0), housing: hl * 0.9, cut: 0, power: 0, fwd4: 0, ptoOn: 0});
      trac.root.visible = hl < 0.985;
      trac.stand.visible = trac.root.visible;
      // the left wheel: off to the side until its step, then rolled in; turning with the hub once on
      const k = installed(WHEEL, st.u);
      leftWheel.w.visible = trac.root.visible;
      // waiting off to the front-left, out of the cameras' way (they look from behind), rolled back to the hub
      leftWheel.w.position.set(0.72 + 1.0 * (1 - Math.min(1, k / 0.6)), AXLE_Y, 1.5 * (1 - k));
      leftWheel.spin.rotation.x = k > 0.99 ? box.epicyclic(st.th ?? 0).carrier : 0;
    } else box.update({...st, camX: camera.position.x});
    gtao.enabled = aoWanted && !((st.cut ?? 0) > 0.001);
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(size.w, size.h, -(cam.sx ?? 0), -(cam.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
    groundMat.uniforms.uC.value.set(tx, 0, tz);
    composer.render();
  };
  const pv = new V3();
  const project = (p) => {
    pv.copy(p).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  const setQuality = ({samples, ao, shadow}) => {
    if (samples !== undefined)
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        t.samples = samples;
        t.dispose();
      }
    if (ao !== undefined) aoWanted = ao;
    if (shadow !== undefined) {
      sun.shadow.mapSize.set(shadow, shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
  };
  return {renderer, scene, camera, fd: box, box, trac, wrap, composer, gtao, sun, resize, frame, project, size, setQuality};
}

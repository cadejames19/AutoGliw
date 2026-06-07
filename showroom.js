// ===== Auto Glow — 3D Showroom (Lamborghini Aventador) =====
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const canvas = document.getElementById("stage");
const loaderEl = document.getElementById("stageLoader");
const progressEl = document.getElementById("stageProgress");
const controlsEl = document.getElementById("stageControls");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && window.WebGLRenderingContext) {
  // Lazy-init when the section approaches the viewport
  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    init().catch((err) => {
      console.error("Showroom failed:", err);
      if (progressEl) progressEl.textContent = "3D showroom unavailable on this device.";
    });
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([e], io) => {
        if (e.isIntersecting) {
          io.disconnect();
          boot();
        }
      },
      { rootMargin: "600px" }
    ).observe(canvas);
  } else {
    boot();
  }

  async function init() {
    // ---------- Renderer ----------
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    renderer.setClearColor(0x000000, 0);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    camera.position.set(8.5, 2.8, 9.5);

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // ---------- Environment (studio HDRI) ----------
    const pmrem = new THREE.PMREMGenerator(renderer);
    const hdr = await new RGBELoader().loadAsync("models/env/studio.hdr");
    const envMap = pmrem.fromEquirectangular(hdr).texture;
    scene.environment = envMap;
    hdr.dispose();
    pmrem.dispose();

    // ---------- Studio lights ----------
    const key = new THREE.DirectionalLight(0xeef2ff, 1.6);
    key.position.set(4.5, 7, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.camera.far = 20;
    key.shadow.radius = 7;
    key.shadow.bias = -0.0004;
    scene.add(key);

    const rim = new THREE.SpotLight(0x9db9ff, 24, 24, 0.7, 0.6);
    rim.position.set(-7, 5.5, -6);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0x8aa2ff, 0.25);
    fill.position.set(-5, 3, 6);
    scene.add(fill);

    // ---------- Grounding: soft shadow + ambient blob only (no showroom floor) ----------
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.38 });
    const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(9, 32), shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.001;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const blobTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
      g.addColorStop(0, "rgba(1,3,12,0.5)");
      g.addColorStop(1, "rgba(1,3,12,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 3.4),
      new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.0005;
    scene.add(blob);

    // ---------- Load the car ----------
    const gltf = await new Promise((resolve, reject) => {
      new GLTFLoader().load(
        "models/aventador/aventador.gltf",
        resolve,
        (e) => {
          if (progressEl && e.total) progressEl.textContent = `Loading the car… ${Math.round((e.loaded / e.total) * 100)}%`;
          else if (progressEl) progressEl.textContent = `Loading the Aventador… ${(e.loaded / 1048576).toFixed(1)} MB`;
        },
        reject
      );
    });
    const car = gltf.scene;

    // ---------- Normalize: scale to real length (4.78 m), wheels on the floor ----------
    car.updateMatrixWorld(true);
    let bbox = new THREE.Box3().setFromObject(car);
    const size = bbox.getSize(new THREE.Vector3());
    const length = Math.max(size.x, size.z);
    car.scale.setScalar(4.78 / length);
    car.updateMatrixWorld(true);
    bbox = new THREE.Box3().setFromObject(car);
    const center = bbox.getCenter(new THREE.Vector3());
    car.position.x -= center.x;
    car.position.z -= center.z;
    car.position.y -= bbox.min.y;
    car.updateMatrixWorld(true);

    // figure out which world axis is the car's长 axis and which way is "front"
    const nodeWorld = (name) => {
      const n = car.getObjectByName(name);
      if (!n) return null;
      return new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3());
    };
    const fl = nodeWorld("Obj_Tyre_FL"), rl = nodeWorld("Obj_Tyre_RL");
    const longAxis = Math.abs(fl.x - rl.x) > Math.abs(fl.z - rl.z) ? "x" : "z";
    const frontSign = Math.sign(fl[longAxis] - rl[longAxis]); // + means front is +axis

    // ---------- Materials ----------
    const lensNames = new Set(["Obj_HeadLight", "Obj_Headlight_Glass"]);
    const headlightMats = [];
    car.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      const m = o.material;
      if (!m) return;
      switch (m.name) {
        case "Mt_Body": {
          const paint = new THREE.MeshPhysicalMaterial({
            color: 0x16309c, // deep Lamborghini blue (Blu Sideris vibes)
            metalness: 0.85,
            roughness: 0.34,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.35,
          });
          o.material = paint;
          break;
        }
        case "Mt_WindScreens":
        case "Mt_Glass_Translucent":
          o.material = new THREE.MeshPhysicalMaterial({
            color: 0x10151f,
            metalness: 0,
            roughness: 0.04,
            transparent: true,
            opacity: 0.72,
            envMapIntensity: 1.6,
          });
          break;
        case "Mt_AlloyWheels":
          m.metalness = 0.92;
          m.roughness = 0.28;
          m.envMapIntensity = 1.3;
          break;
        case "Mt_Tyres":
          m.roughness = 0.96;
          m.color && m.color.setHex(0x0a0b0e);
          break;
        case "Mt_BrakeCaliper":
          m.color && m.color.setHex(0x2452e8);
          m.roughness = 0.35;
          m.envMapIntensity = 1.2;
          break;
        case "Mt_Chrome":
        case "Mt_Metal_Brushed":
          m.envMapIntensity = 1.4;
          break;
        case "Mt_Glass_Lens":
          headlightMats.push(m);
          break;
      }
      if (lensNames.has(o.name) && m.name !== "Mt_Glass_Lens") headlightMats.push(m);
    });

    const rig = new THREE.Group();
    rig.add(car);
    scene.add(rig);

    // ---------- Scissor doors: pivot near the A-pillar base, rotate up the door's rear ----------
    const doorNodes = ["Obj_Side_Doors", "Obj_Doors_UpperFrame"]
      .map((n) => car.getObjectByName(n))
      .filter(Boolean);
    const doorBox = new THREE.Box3();
    doorNodes.forEach((n) => doorBox.expandByObject(n));
    const hinge = new THREE.Vector3();
    doorBox.getCenter(hinge);
    hinge.y = doorBox.min.y + (doorBox.max.y - doorBox.min.y) * 0.18; // low pivot
    hinge[longAxis] = frontSign > 0 ? doorBox.max[longAxis] - 0.06 : doorBox.min[longAxis] + 0.06; // front edge
    const doorPivot = new THREE.Group();
    doorPivot.position.copy(hinge);
    car.add(doorPivot);
    doorPivot.position.sub(car.position); // into car-local space (car has no rotation)
    doorNodes.forEach((n) => doorPivot.attach(n));
    // rotation axis: lateral (perpendicular to the long axis, horizontal)
    const doorAxis = longAxis === "x" ? "z" : "x";
    let doorOpenAngle = 1.4; // ~80° per SVJ reference notes — sign verified empirically below

    // ---------- Front wheel steering groups ----------
    const cornerNodes = (sfx) =>
      ["Obj_Tyre_", "Obj_Rim_T0A_", "Obj_Rim_T0B_", "Obj_WheelHub_", "Obj_Caliper_", "Obj_DiscRotor_"]
        .flatMap((p) => {
          const out = [];
          car.traverse((o) => { if (o.name === p + sfx) out.push(o); });
          return out;
        });
    const mkSteer = (sfx) => {
      const nodes = cornerNodes(sfx);
      if (!nodes.length) return null;
      const b = new THREE.Box3();
      nodes.forEach((n) => b.expandByObject(n));
      const c = b.getCenter(new THREE.Vector3());
      const g = new THREE.Group();
      g.position.copy(c).sub(car.position);
      car.add(g);
      nodes.forEach((n) => g.attach(n));
      return g;
    };
    const steerFL = mkSteer("FL");
    const steerFR = mkSteer("FR");

    // steering wheel assembly
    const swNames = ["Obj_SteeringWheel_Metals", "Obj_SteeringWheel_Plastics", "Obj_Steering_Leather", "Obj_Steering_Stitching", "Obj_Interior_Steering_Btns", "Obj_Interior_Steering_Emblem"];
    const swNodes = swNames.map((n) => car.getObjectByName(n)).filter(Boolean);
    let swPivot = null;
    let swAxis = new THREE.Vector3();
    if (swNodes.length) {
      const b = new THREE.Box3();
      swNodes.forEach((n) => b.expandByObject(n));
      const c = b.getCenter(new THREE.Vector3());
      swPivot = new THREE.Group();
      swPivot.position.copy(c).sub(car.position);
      car.add(swPivot);
      swNodes.forEach((n) => swPivot.attach(n));
      // column axis ≈ car forward tilted up ~25°
      swAxis[longAxis === "x" ? "x" : "z"] = frontSign;
      swAxis.y = 0.45;
      swAxis.normalize();
    }

    // ---------- Headlights ----------
    const beamL = new THREE.SpotLight(0xcfe4ff, 0, 16, 0.55, 0.5, 1.2);
    const beamR = beamL.clone();
    const hl = car.getObjectByName("Obj_HeadLight");
    if (hl) {
      const hb = new THREE.Box3().setFromObject(hl);
      const hc = hb.getCenter(new THREE.Vector3());
      const lateral = longAxis === "x" ? "z" : "x";
      [beamL, beamR].forEach((b, i) => {
        b.position.copy(hc);
        b.position[lateral] = i ? hb.max[lateral] : hb.min[lateral];
        const t = new THREE.Object3D();
        t.position.copy(b.position);
        t.position[longAxis] += frontSign * 8;
        t.position.y = 0.1;
        rig.add(t);
        b.target = t;
        rig.add(b);
      });
    }

    // ---------- Animation helpers ----------
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    // heavy mechanical settle: fast rise, damped finish
    const easeDoor = (t) => 1 - Math.pow(1 - t, 2.4) * Math.cos(t * 3.4);
    const tweens = [];
    const tween = (dur, ease, fn, done) => {
      tweens.push({ t0: performance.now(), dur, ease, fn, done });
    };
    const runTweens = (now) => {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const t = Math.min((now - tw.t0) / tw.dur, 1);
        tw.fn(tw.ease(t));
        if (t >= 1) {
          tweens.splice(i, 1);
          tw.done && tw.done();
        }
      }
    };

    // ---------- States ----------
    let doorsOpen = false, lightsOn = false, steered = false;
    const setBtn = (act, on) => {
      const b = controlsEl?.querySelector(`[data-act="${act}"]`);
      b && b.classList.toggle("active", on);
    };

    const toggleDoors = () => {
      doorsOpen = !doorsOpen;
      setBtn("doors", doorsOpen);
      const from = doorPivot.rotation[doorAxis];
      const to = doorsOpen ? doorOpenAngle : 0;
      tween(doorsOpen ? 2400 : 1800, doorsOpen ? easeDoor : easeInOut, (k) => {
        doorPivot.rotation[doorAxis] = from + (to - from) * k;
      });
    };
    const toggleLights = () => {
      lightsOn = !lightsOn;
      setBtn("lights", lightsOn);
      beamL.intensity = beamR.intensity = lightsOn ? 90 : 0;
      headlightMats.forEach((m) => {
        if (m.emissive) {
          m.emissive.setHex(lightsOn ? 0xbfdcff : 0x000000);
          m.emissiveIntensity = lightsOn ? 2.6 : 0;
        }
      });
    };
    const toggleSteer = () => {
      steered = !steered;
      setBtn("steer", steered);
      const to = steered ? 0.58 : 0;
      const fromL = steerFL ? steerFL.rotation.y : 0;
      tween(900, easeInOut, (k) => {
        if (steerFL) steerFL.rotation.y = fromL + (to - fromL) * k;
        if (steerFR) steerFR.rotation.y = fromL + (to - fromL) * k;
        if (swPivot) swPivot.setRotationFromAxisAngle(swAxis, (fromL + (to - fromL) * k) * 2.4);
      });
    };

    // ---------- Camera & controls ----------
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.55, 0);
    controls.minDistance = 3.2;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.52; // never under the floor
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.autoRotateSpeed = -0.55;

    const presets = [
      { pos: [4.6, 1.35, 4.9], tgt: [0, 0.5, 0] },   // hero 3/4 front
      { pos: [-5.2, 1.1, -4.4], tgt: [0, 0.55, 0] }, // rear wing
      { pos: [0.2, 0.85, 6.4], tgt: [0, 0.5, 0] },   // low side
      { pos: [3.4, 3.6, -5.0], tgt: [0, 0.4, 0] },   // high rear 3/4
    ];
    let presetIdx = 0;
    const flyTo = (p, dur = 1900) => {
      const p0 = camera.position.clone();
      const t0 = controls.target.clone();
      const p1 = new THREE.Vector3(...p.pos);
      const t1 = new THREE.Vector3(...p.tgt);
      tween(reduceMotion ? 1 : dur, easeInOut, (k) => {
        camera.position.lerpVectors(p0, p1, k);
        controls.target.lerpVectors(t0, t1, k);
      });
    };
    const cycleCamera = () => {
      presetIdx = (presetIdx + 1) % presets.length;
      flyTo(presets[presetIdx]);
    };

    // idle auto-orbit: pause while the user interacts
    let idleTimer = null;
    const wake = () => {
      controls.autoRotate = false;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!reduceMotion) controls.autoRotate = true;
      }, 7000);
    };
    canvas.addEventListener("pointerdown", wake);
    canvas.addEventListener("wheel", wake, { passive: true });
    wake();

    // ---------- UI ----------
    controlsEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      wake();
      switch (btn.dataset.act) {
        case "doors": toggleDoors(); break;
        case "lights": toggleLights(); break;
        case "steer": toggleSteer(); break;
        case "camera": cycleCamera(); break;
      }
    });

    // ---------- Door axis sign self-check ----------
    // Nudge the pivot; if the door's top goes DOWN instead of up, flip the angle.
    if (doorNodes.length) {
      const probe = doorNodes[0];
      car.updateMatrixWorld(true);
      const before = new THREE.Box3().setFromObject(probe).max.y;
      doorPivot.rotation[doorAxis] = doorOpenAngle * 0.12;
      car.updateMatrixWorld(true);
      const after = new THREE.Box3().setFromObject(probe).max.y;
      doorPivot.rotation[doorAxis] = 0;
      car.updateMatrixWorld(true);
      if (after < before) doorOpenAngle = -doorOpenAngle;
    }

    // ---------- Canonical orientation: nose toward +X so camera presets line up ----------
    rig.rotation.y =
      longAxis === "x" ? (frontSign > 0 ? 0 : Math.PI) : (frontSign > 0 ? Math.PI / 2 : -Math.PI / 2);

    // ---------- Reveal + intro ----------
    loaderEl?.classList.add("done");
    if (controlsEl) controlsEl.hidden = false;
    flyTo(presets[0], 2400);

    // ---------- Render loop (only when visible) ----------
    let visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.02 }).observe(canvas);
    }
    renderer.setAnimationLoop((now) => {
      if (!visible || document.hidden) return;
      runTweens(now);
      controls.update();
      renderer.render(scene, camera);
    });
  }
}

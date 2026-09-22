"use client";

/**
 * The hero's 3D scene: WICLOUD's infrastructure as a floating, exploded stack.
 *
 *   - Four glass layers, top to bottom Applications · Données · Calcul · Réseau, each
 *     etched with its own pattern (app tiles, disk clusters, server racks, circuit
 *     traces), with blinking status LEDs and a scan line sweeping across it.
 *   - Light pillars at the corners carry packets between the layers.
 *   - Each solution is a glowing module docked on one layer, linked to the next by a
 *     beam — the services sit *on* the platform, and talk to each other through it.
 *   - A glowing grid floor below, motes rising from it into the stack, and a faint
 *     halo above the top layer.
 *
 * The stack unfolds on entry (layers start pressed together), then floats and turns.
 * The sky behind it lives in `./sky`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { Service } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { InfraStackFallback } from "./fallbacks";
import {
  AQUA,
  PAPER,
  SIGNAL,
  SIGNAL_BRIGHT,
  SIGNAL_SOFT,
  TEAL,
  hash,
  radialGlowTexture,
} from "./sky";

/* The hero's ground is LIGHT (`.texture-weave`), so this scene draws no sky at all and
   anything drawn over the BACKGROUND has to be dark and normally blended — additive over
   a pale ground composites toward white and disappears. `WIRE` / `WIRE_HOT` are those:
   steel and signal-deep, the two cool values that hold 3:1 against the whole gradient.

   Anything drawn ON a layer's own glass plate keeps additive blending, because the plate
   is still dark: the etched pattern, the scan line, the status LEDs and the modules' core
   lights all sit on `#1d2a42` and still read as light. Don't "unify" the two. */
const WIRE = "#366479";
const WIRE_HOT = "#0D7D55";

const INTRO_DURATION = 1.4;
const INTRO_DELAY = 0.5;
/** The unfold runs after the pop has mostly landed, so the two read as one gesture. */
const UNFOLD_DURATION = 1.6;
const UNFOLD_DELAY = 0.9;

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function easeOutBack(x: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/* ------------------------------------------------------------------------------------
 * Geometry
 * ---------------------------------------------------------------------------------- */

const LAYER_W = 4.4;
const LAYER_D = 2.8;
const LAYER_H = 0.08;
const GAP = 0.92;

type Pattern = "apps" | "data" | "compute" | "network";
/** Top to bottom. The index is also the solution docked on that layer. */
const LAYERS: { pattern: Pattern; y: number }[] = [
  { pattern: "apps", y: GAP * 1.5 },
  { pattern: "data", y: GAP * 0.5 },
  { pattern: "compute", y: -GAP * 0.5 },
  { pattern: "network", y: -GAP * 1.5 },
];
const TOP = LAYERS[0].y;
const BOTTOM = LAYERS[LAYERS.length - 1].y;
const FLOOR = BOTTOM - 1.05;

/** Where each solution's module docks on its layer. Alternating corners, so the stack
 * of labels zig-zags instead of piling up in one column. */
const DOCKS: [number, number][] = [
  [1.25, 0.45],
  [-1.3, 0.5],
  [1.3, 0.55],
  [-1.25, 0.4],
];
const PILLARS: [number, number][] = [
  [-2.0, -1.2],
  [2.0, -1.2],
  [-2.0, 1.2],
  [2.0, 1.2],
];

/* ------------------------------------------------------------------------------------
 * Etched layer patterns — drawn once to a canvas, white on transparent, tinted by the
 * material and additively blended so they read as light in the glass.
 * ---------------------------------------------------------------------------------- */

function patternTexture(pattern: Pattern) {
  const W = 512;
  const H = Math.round((512 * LAYER_D) / LAYER_W);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;

  // Inset frame, shared by every layer.
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.roundRect(14, 14, W - 28, H - 28, 18);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const r = (n: number) => hash(n + pattern.length * 91);

  if (pattern === "apps") {
    // A grid of rounded app tiles, a few with an inner bar.
    const cols = 6;
    const rows = 3;
    const tw = 54;
    const gx = (W - 80 - cols * tw) / (cols - 1);
    const gy = (H - 80 - rows * tw) / (rows - 1);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const px = 40 + x * (tw + gx);
        const py = 40 + y * (tw + gy);
        ctx.globalAlpha = 0.45 + r(x * 7 + y) * 0.5;
        ctx.beginPath();
        ctx.roundRect(px, py, tw, tw, 12);
        ctx.stroke();
        ctx.fillRect(px + 12, py + tw - 18, tw * (0.3 + r(x + y * 11) * 0.45), 4);
      }
  } else if (pattern === "data") {
    // Clusters of disks: concentric circles, hex-packed.
    const rad = 20;
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 10; x++) {
        const cx = 50 + x * 46 + (y % 2) * 23;
        const cy = 48 + y * 46;
        if (cx > W - 40 || cy > H - 36) continue;
        ctx.globalAlpha = 0.35 + r(x * 5 + y * 13) * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
  } else if (pattern === "compute") {
    // Racks of blades, each with a status dot.
    const racks = 7;
    const rw = 52;
    const gap = (W - 80 - racks * rw) / (racks - 1);
    for (let k = 0; k < racks; k++) {
      const x = 40 + k * (rw + gap);
      ctx.globalAlpha = 0.6;
      ctx.strokeRect(x, 40, rw, H - 80);
      for (let b = 0; b < 9; b++) {
        const y = 52 + b * ((H - 104) / 9);
        ctx.globalAlpha = 0.3 + r(k * 17 + b) * 0.5;
        ctx.fillRect(x + 8, y, rw - 26, 3);
        ctx.fillRect(x + rw - 12, y - 1, 5, 5);
      }
    }
  } else {
    // Circuit traces: right-angle runs between pads.
    ctx.globalAlpha = 0.25;
    for (let x = 48; x < W - 40; x += 32)
      for (let y = 48; y < H - 40; y += 32) ctx.fillRect(x - 1, y - 1, 3, 3);
    for (let n = 0; n < 26; n++) {
      let x = 48 + Math.floor(r(n * 3.1) * 13) * 32;
      let y = 48 + Math.floor(r(n * 4.7) * 6) * 32;
      ctx.globalAlpha = 0.5 + r(n) * 0.45;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 3; s++) {
        const len = (1 + Math.floor(r(n * 9 + s) * 4)) * 32;
        if (s % 2 === 0) x = Math.min(W - 48, Math.max(48, x + (r(n + s) > 0.5 ? len : -len)));
        else y = Math.min(H - 48, Math.max(48, y + (r(n * 2 + s) > 0.5 ? len : -len)));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

/** Concentric rings and spokes for the floor, fading out toward the rim. */
function floorTexture() {
  const S = 512;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = S / 2;
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 8; i++) {
    ctx.globalAlpha = 0.9 * (1 - i / 9);
    ctx.beginPath();
    ctx.arc(c, c, (i / 8) * (c - 8), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    const g = ctx.createLinearGradient(c, c, c + Math.cos(t) * c, c + Math.sin(t) * c);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(t) * c, c + Math.sin(t) * c);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

const SOFT_POINT_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
  }
`;

/* ------------------------------------------------------------------------------------
 * A layer
 * ---------------------------------------------------------------------------------- */

/** Status LEDs scattered on a layer, blinking on their own clocks — the stack is live. */
function Blinkers({ seed, active, still }: { seed: number; active: boolean; still: boolean }) {
  const count = 46;
  const dpr = useThree((s) => s.viewport.dpr);
  const material = useRef<THREE.ShaderMaterial>(null);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const a = new THREE.Color(AQUA);
    const g = new THREE.Color(SIGNAL_SOFT);
    for (let i = 0; i < count; i++) {
      positions.set(
        [
          (hash(i * 1.7 + seed) - 0.5) * (LAYER_W - 0.5),
          LAYER_H / 2 + 0.02,
          (hash(i * 2.9 + seed) - 0.5) * (LAYER_D - 0.4),
        ],
        i * 3,
      );
      const c = hash(i * 5.3 + seed) > 0.78 ? g : a;
      colors.set([c.r, c.g, c.b], i * 3);
      seeds[i] = hash(i * 7.1 + seed);
    }
    return { positions, colors, seeds };
  }, [seed]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uBoost: { value: 0 } }),
    [],
  );
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!still) time.current += delta;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = time.current;
    u.uPixelRatio.value = dpr;
    u.uBoost.value = THREE.MathUtils.lerp(u.uBoost.value, active ? 1 : 0, 0.1);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uBoost;
          attribute vec3 aColor;
          attribute float aSeed;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            // Each LED holds on for a while, then blinks off: a square-ish wave with
            // its own rate and phase, rather than a smooth shimmer.
            float rate = 0.35 + aSeed * 0.9;
            float on = step(0.28, fract(uTime * rate + aSeed * 7.0));
            gl_PointSize = (9.0 + uBoost * 5.0) * uPixelRatio * 8.0 / -mv.z;
            gl_Position = projectionMatrix * mv;
            vColor = mix(aColor, vec3(0.0, 1.0, 0.66), uBoost * 0.6);
            vAlpha = mix(0.25, 1.0, on) * (0.8 + uBoost * 0.2);
          }
        `}
        fragmentShader={SOFT_POINT_FRAG}
      />
    </points>
  );
}

function Layer({
  index,
  pattern,
  active,
  still,
}: {
  index: number;
  pattern: Pattern;
  active: boolean;
  still: boolean;
}) {
  const etch = useMemo(
    () => (typeof document !== "undefined" ? patternTexture(pattern) : null),
    [pattern],
  );
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(LAYER_W, LAYER_H, LAYER_D)),
    [],
  );
  const scan = useRef<THREE.Mesh>(null);
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  const elapsed = useRef(hash(index * 23) * 5);

  useFrame((_, delta) => {
    if (!still) elapsed.current += delta * (active ? 0.45 : 0.2);
    if (scan.current) {
      const f = elapsed.current % 1;
      scan.current.position.x = (f - 0.5) * (LAYER_W - 0.3);
      (scan.current.material as THREE.MeshBasicMaterial).opacity = still
        ? 0
        : Math.sin(f * Math.PI) * (active ? 0.85 : 0.4);
    }
    if (glass.current) {
      glass.current.emissiveIntensity = THREE.MathUtils.lerp(
        glass.current.emissiveIntensity,
        active ? 0.55 : 0.12,
        0.1,
      );
    }
  });

  const tint = active ? SIGNAL_SOFT : AQUA;
  return (
    <group>
      {/* The glass slab */}
      <mesh>
        <boxGeometry args={[LAYER_W, LAYER_H, LAYER_D]} />
        <meshStandardMaterial
          ref={glass}
          color="#1d2a42"
          emissive={active ? SIGNAL : TEAL}
          emissiveIntensity={0.12}
          metalness={0.4}
          roughness={0.3}
          transparent
          opacity={0.62}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={active ? WIRE_HOT : WIRE} transparent opacity={active ? 1 : 0.7} />
      </lineSegments>

      {/* Etched pattern, as light in the top face */}
      {etch && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYER_H / 2 + 0.004, 0]}>
          <planeGeometry args={[LAYER_W, LAYER_D]} />
          <meshBasicMaterial
            map={etch}
            color={tint}
            transparent
            opacity={active ? 0.75 : 0.42}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Scan line sweeping the layer */}
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYER_H / 2 + 0.01, 0]}>
        <planeGeometry args={[0.07, LAYER_D - 0.1]} />
        <meshBasicMaterial
          color={active ? SIGNAL_BRIGHT : AQUA}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <Blinkers seed={index * 37 + 3} active={active} still={still} />
    </group>
  );
}

/* ------------------------------------------------------------------------------------
 * Connective tissue: pillars, links between modules, floor, rising motes
 * ---------------------------------------------------------------------------------- */

/** A vertical light pillar through the stack, with packets travelling up it. */
function Pillar({
  x,
  z,
  index,
  glow,
  still,
}: {
  x: number;
  z: number;
  index: number;
  glow: THREE.CanvasTexture | null;
  still: boolean;
}) {
  const packets = useRef<(THREE.Sprite | null)[]>([]);
  const elapsed = useRef(hash(index * 41) * 3);
  const from = BOTTOM - 0.4;
  const to = TOP + 0.5;

  useFrame((_, delta) => {
    if (!still) elapsed.current += delta * 0.22;
    packets.current.forEach((s, k) => {
      if (!s) return;
      const f = (elapsed.current + k / 2) % 1;
      s.position.set(x, from + f * (to - from), z);
      (s.material as THREE.SpriteMaterial).opacity = still ? 0 : Math.sin(f * Math.PI) * 0.9;
    });
  });

  return (
    <>
      <mesh position={[x, (from + to) / 2, z]}>
        <cylinderGeometry args={[0.014, 0.014, to - from, 6, 1, true]} />
        <meshBasicMaterial color={WIRE} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {glow &&
        [0, 1].map((k) => (
          <sprite
            key={k}
            ref={(el) => {
              packets.current[k] = el;
            }}
            scale={[0.22, 0.22, 1]}
          >
            <spriteMaterial
              map={glow}
              color={k === 0 ? WIRE_HOT : WIRE}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </sprite>
        ))}
    </>
  );
}

/** A beam from one solution's module down to the next, carrying a packet. */
function ModuleLink({
  from,
  to,
  active,
  glow,
  index,
  still,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  active: boolean;
  glow: THREE.CanvasTexture | null;
  index: number;
  still: boolean;
}) {
  const packet = useRef<THREE.Sprite>(null);
  const elapsed = useRef(hash(index * 53) * 2);
  // Bow the beam outward past the layers' edge, so it doesn't cut through the glass.
  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const control = new THREE.Vector3(mid.x * 1.9, mid.y, mid.z + 1.1);
    return new THREE.QuadraticBezierCurve3(from, control, to);
  }, [from, to]);
  const points = useMemo(() => curve.getPoints(40), [curve]);

  useFrame((_, delta) => {
    if (!still) elapsed.current += delta * (active ? 0.6 : 0.3);
    if (packet.current) {
      const f = elapsed.current % 1;
      packet.current.position.copy(curve.getPointAt(f));
      (packet.current.material as THREE.SpriteMaterial).opacity = still ? 0 : Math.sin(f * Math.PI);
    }
  });

  const color = active ? WIRE_HOT : WIRE;
  return (
    <>
      <Line points={points} color={color} transparent opacity={active ? 1 : 0.55} lineWidth={active ? 1.8 : 1.1} />
      {glow && (
        <sprite ref={packet} scale={[0.26, 0.26, 1]}>
          <spriteMaterial
            map={glow}
            color={active ? WIRE_HOT : WIRE}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </sprite>
      )}
    </>
  );
}

function Floor() {
  const grid = useMemo(() => (typeof document !== "undefined" ? floorTexture() : null), []);
  return (
    <group position={[0, FLOOR, 0]}>
      {grid && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8, 8]} />
          <meshBasicMaterial map={grid} color={WIRE} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** Motes rising from the floor into the stack. Positions are computed in the vertex
 * shader from time, so they cost no CPU. */
function Uplink({ still }: { still: boolean }) {
  const count = 140;
  const dpr = useThree((s) => s.viewport.dpr);
  const material = useRef<THREE.ShaderMaterial>(null);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions.set(
        [(hash(i * 1.9 + 5) - 0.5) * LAYER_W, 0, (hash(i * 2.7 + 5) - 0.5) * LAYER_D],
        i * 3,
      );
      seeds[i] = hash(i * 3.3 + 5);
      speeds[i] = 0.1 + hash(i * 4.1 + 5) * 0.14;
    }
    return { positions, seeds, speeds };
  }, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color(WIRE) },
      uColorB: { value: new THREE.Color(WIRE_HOT) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = clock.elapsedTime;
    u.uPixelRatio.value = dpr;
  });

  if (still) return null;
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[data.speeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={/* glsl */ `
          uniform float uTime;
          uniform float uPixelRatio;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          attribute float aSeed;
          attribute float aSpeed;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float f = fract(uTime * aSpeed + aSeed);
            vec3 p = position;
            p.y = mix(${FLOOR.toFixed(2)}, ${(TOP + 0.9).toFixed(2)}, f);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = 26.0 * uPixelRatio / -mv.z;
            gl_Position = projectionMatrix * mv;
            vColor = aSeed > 0.8 ? uColorB : uColorA;
            vAlpha = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.7, 1.0, f)) * 0.8;
          }
        `}
        fragmentShader={SOFT_POINT_FRAG}
      />
    </points>
  );
}

/* ------------------------------------------------------------------------------------
 * A solution's module
 * ---------------------------------------------------------------------------------- */

function ServiceModule({
  service,
  index,
  position,
  hovered,
  onHover,
  onSelect,
  overlayRef,
  glow,
  showLabel,
}: {
  service: Service;
  index: number;
  position: THREE.Vector3;
  hovered: number | null;
  onHover: (i: number | null) => void;
  onSelect: (slug: string) => void;
  overlayRef?: RefObject<HTMLDivElement | null>;
  glow: THREE.CanvasTexture | null;
  showLabel: boolean;
}) {
  // Alternate the idle colour so the stack mixes signal and cool rather than reading
  // as one hue (an even 2/2 split across four solutions). Hover escalates to
  // signal-bright with a white core — the active state has to read on a module that
  // is already green.
  const idle = index % 2 === 1 ? SIGNAL_SOFT : AQUA;
  const isActive = hovered === index;
  const portal = overlayRef as RefObject<HTMLElement> | undefined;

  const body = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const elapsed = useRef(hash(index * 13) * 4);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (body.current) {
      const s = THREE.MathUtils.lerp(body.current.scale.x, isActive ? 1.3 : 1, 0.14);
      body.current.scale.setScalar(s);
      // Hovers a hair above its dock.
      body.current.position.y = 0.2 + Math.sin(elapsed.current * 1.6) * 0.03;
    }
    if (halo.current) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsed.current * 2.2);
      (halo.current.material as THREE.SpriteMaterial).opacity = isActive
        ? 0.75
        : 0.28 + pulse * 0.14;
    }
  });

  return (
    <group position={position}>
      <group ref={body} position={[0, 0.2, 0]}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(index);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onHover(null);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(service.slug);
          }}
        >
          {/* Generous invisible hit box so the module is comfortably clickable */}
          <boxGeometry args={[0.9, 0.7, 0.9]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* A dark glass case lit from within, so the module reads as a coloured light
            source rather than a pale block under the scene's white key light. */}
        <RoundedBox args={[0.56, 0.3, 0.56]} radius={0.07} smoothness={3}>
          <meshStandardMaterial
            color="#1d2a42"
            metalness={0.5}
            roughness={0.2}
            emissive={isActive ? SIGNAL_BRIGHT : idle}
            emissiveIntensity={isActive ? 1.4 : 0.75}
          />
        </RoundedBox>
        {/* White core light on top */}
        {glow && (
          <>
            <sprite position={[0, 0.2, 0]} scale={isActive ? [0.34, 0.34, 1] : [0.2, 0.2, 1]}>
              <spriteMaterial map={glow} color={PAPER} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            <sprite ref={halo} scale={[1.4, 1.4, 1]}>
              <spriteMaterial
                map={glow}
                color={isActive ? SIGNAL_BRIGHT : idle}
                transparent
                opacity={0.3}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </>
        )}

        {showLabel && (
          <Html
            center
            portal={portal}
            // The open card must paint over the other modules' pills, which drei
            // would otherwise order by depth alone.
            zIndexRange={isActive ? [100, 90] : [40, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(service.slug)}
              className="pointer-events-auto -translate-y-12 cursor-pointer select-none"
            >
              <div
                // w-fit keeps the pill compact: as a block-level flex child it would
                // otherwise stretch to the (much wider) card below it.
                className={`glass-panel mx-auto flex w-fit items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-paper shadow-xl transition-colors duration-300 ${
                  isActive ? "border-signal-soft/80" : ""
                }`}
              >
                <Icon
                  name={service.icon}
                  className={`h-4 w-4 ${isActive ? "text-signal-soft" : "text-signal"}`}
                />
                <span className="text-base font-semibold tracking-tight">{service.shortName}</span>
              </div>

              {isActive && (
                <div className="mt-2.5 flex w-[38rem] overflow-hidden rounded-2xl border border-signal-soft/30 bg-[#2c3a56]/96 text-paper shadow-2xl backdrop-blur-md">
                  <div className="flex w-[15rem] shrink-0 flex-col justify-center p-5">
                    <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-signal-soft">
                      {service.category}
                    </p>
                    <p className="mt-1.5 text-lg font-semibold leading-tight">{service.name}</p>
                    <p className="mt-2 text-xs leading-relaxed opacity-80">{service.tagline}</p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-signal-soft">
                      Découvrir
                      <Icon name="arrow-right" className="h-3.5 w-3.5" />
                    </p>
                  </div>

                  {/* Project preview. Drops in a real GIF as soon as `previewGif` is
                      set on the service, otherwise shows a labelled placeholder. */}
                  <div className="relative min-h-[16.5rem] flex-1 overflow-hidden border-l border-signal-soft/20 bg-[#233047]">
                    {service.previewGif ? (
                      // eslint-disable-next-line @next/next/no-img-element -- animated GIF: next/image would strip the animation
                      <img
                        src={service.previewGif}
                        alt={`Aperçu animé de ${service.name}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:18px_18px]" />
                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal/20 blur-2xl" />
                        <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-signal/25 blur-2xl" />
                        <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-signal-soft/45 text-signal-soft">
                          <Icon name="sparkles" className="h-5 w-5" />
                        </span>
                        <span className="relative text-[10px] font-semibold uppercase tracking-[0.14em] opacity-55">
                          Aperçu du projet
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------------------------
 * Scene
 * ---------------------------------------------------------------------------------- */

/**
 * Fits the stack to its panel. `OrbitControls.target` always renders at screen centre,
 * so fitting means scaling the object, not moving the camera. The hero panel is the right
 * 70% on desktop (aspect ~1.1) and a 58svh band on a phone (~0.8), and the stack is
 * wide, so only the narrow case needs shrinking.
 */
function useFit() {
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  return { scale: THREE.MathUtils.clamp(aspect / 1.05, 0.5, 1), lift: 0 };
}

function Scene({
  services,
  hovered,
  onHover,
  onSelect,
  paused,
  still,
  overlayRef,
}: {
  services: Service[];
  hovered: number | null;
  onHover: (i: number | null) => void;
  onSelect: (slug: string) => void;
  paused: boolean;
  still: boolean;
  overlayRef?: RefObject<HTMLDivElement | null>;
}) {
  const glow = useMemo(() => (typeof document !== "undefined" ? radialGlowTexture() : null), []);
  const fit = useFit();

  const intro = useRef<THREE.Group>(null);
  const unfold = useRef<THREE.Group>(null);
  const drift = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const clockRef = useRef(0);
  const [introDone, setIntroDone] = useState(still);

  // Solution i docks on layer i (wrapping if there are ever more solutions than layers).
  const docks = useMemo(
    () =>
      services.map((_, i) => {
        const layer = LAYERS[i % LAYERS.length];
        const [x, z] = DOCKS[i % DOCKS.length];
        return new THREE.Vector3(x, layer.y + LAYER_H / 2, z);
      }),
    [services],
  );

  useFrame(({ clock }, delta) => {
    // Entrance, driven by the render loop rather than a GSAP tween so a throttled tab
    // can never leave the stack stuck mid-way: the whole thing pops in, then the
    // layers — pressed together at first — spring apart.
    if (!still && clockRef.current < UNFOLD_DELAY + UNFOLD_DURATION + INTRO_DELAY) {
      clockRef.current += delta;
      const t = clockRef.current;
      if (intro.current) {
        const p = THREE.MathUtils.clamp((t - INTRO_DELAY) / INTRO_DURATION, 0, 1);
        intro.current.scale.setScalar(Math.max(0.0001, easeOutBack(p)));
      }
      if (unfold.current) {
        const p = THREE.MathUtils.clamp((t - INTRO_DELAY - UNFOLD_DELAY) / UNFOLD_DURATION, 0, 1);
        unfold.current.scale.y = 0.18 + 0.82 * easeOutBack(p);
        if (p >= 1 && !introDone) setIntroDone(true);
      }
    }

    if (still) return;
    if (spin.current && !paused) spin.current.rotation.y += delta * 0.08;
    if (drift.current) {
      const t = clock.elapsedTime;
      drift.current.rotation.x = Math.sin(t * 0.13) * 0.035;
      drift.current.rotation.z = Math.cos(t * 0.1) * 0.03;
      drift.current.position.y = Math.sin(t * 0.45) * 0.08;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 6, 6]} intensity={90} color={PAPER} />
      <pointLight position={[-7, -2, -4]} intensity={35} color={TEAL} />
      <pointLight position={[0, 7, -6]} intensity={24} color={AQUA} />
      {/* Low signal rim from below, so the modules aren't lit from one hue only. */}
      <pointLight position={[3, -6, 2]} intensity={26} color={SIGNAL} />

      <group position={[0, fit.lift, 0]}>
        <group ref={intro} scale={still ? 1 : 0.0001}>
          <group scale={fit.scale}>
            <group ref={drift}>
              <group ref={spin} rotation={[0, -0.5, 0]}>
                <Floor />
                <Uplink still={still} />

                {/* Everything positional lives in the unfold group, so the layers,
                    pillars, modules and links spring apart together and never
                    disagree about where a layer is. */}
                <group ref={unfold} scale={still ? [1, 1, 1] : [1, 0.18, 1]}>
                  {LAYERS.map((layer, i) => (
                    <group key={layer.pattern} position={[0, layer.y, 0]}>
                      <Layer
                        index={i}
                        pattern={layer.pattern}
                        active={hovered !== null && hovered % LAYERS.length === i}
                        still={still}
                      />
                    </group>
                  ))}

                  {PILLARS.map(([x, z], i) => (
                    <Pillar key={i} x={x} z={z} index={i} glow={glow} still={still} />
                  ))}

                  {docks.slice(0, -1).map((from, i) => (
                    <ModuleLink
                      key={i}
                      index={i}
                      from={from.clone().setY(from.y + 0.2)}
                      to={docks[i + 1].clone().setY(docks[i + 1].y + 0.2)}
                      active={hovered === i || hovered === i + 1}
                      glow={glow}
                      still={still}
                    />
                  ))}

                  {services.map((service, i) => (
                    <ServiceModule
                      key={service.slug}
                      service={service}
                      index={i}
                      position={docks[i]}
                      hovered={hovered}
                      onHover={onHover}
                      onSelect={onSelect}
                      overlayRef={overlayRef}
                      glow={glow}
                      showLabel={introDone}
                    />
                  ))}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Free 360° orbit in every direction, with inertia and wheel zoom. Zoom
          intentionally captures the wheel, so the hint chip beside the canvas tells
          visitors to leave the scene to scroll the page. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.6}
        zoomSpeed={0.5}
        minDistance={5.5}
        maxDistance={15}
      />
    </>
  );
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCE_MOTION_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(REDUCE_MOTION_QUERY);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

export default function InfraStack({
  services,
  overlayRef,
  onSelect,
}: {
  services: Service[];
  overlayRef?: RefObject<HTMLDivElement | null>;
  onSelect?: (slug: string) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const still = useReducedMotion();

  return (
    <>
      <Canvas
        dpr={[1, 1.5]}
        // No antialiasing: fill rate from the additive layers is the real cost, and
        // the soft sprites and textures are already smooth.
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 3.6, 10.6], fov: 40 }}
        fallback={<InfraStackFallback message="Aperçu 3D indisponible sur cet appareil" />}
        onCreated={() => setReady(true)}
        className={`!absolute inset-0 transition-opacity duration-700 ease-out ${
          ready ? "opacity-100" : "opacity-0"
        } ${hovered !== null ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => {
          setPaused(false);
          setHovered(null);
        }}
      >
        <Scene
          services={services}
          hovered={hovered}
          onHover={setHovered}
          onSelect={(slug) => onSelect?.(slug)}
          paused={paused}
          still={still}
          overlayRef={overlayRef}
        />
      </Canvas>

      {/* Interaction hint. Zoom deliberately captures the mouse wheel, so this appears
          while the pointer is inside the scene to explain the controls and make clear
          the page scrolls again once you leave the area. Top-right, above the copy
          band's z-30, whose gradient would otherwise wash it out. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute right-5 top-24 z-[31] max-w-[15.5rem] rounded-2xl border border-aqua/30 bg-[#2c3a56]/95 px-4 py-3 text-paper shadow-2xl backdrop-blur-md transition-all duration-300 ${
          paused ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-aqua">
          <Icon name="move" className="h-3.5 w-3.5" />
          Zone interactive
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed opacity-90">
          Glissez pour faire pivoter l&apos;infrastructure, molette pour zoomer.
        </p>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-aqua">
          Sortez de cette zone pour faire défiler la page.
        </p>
      </div>
    </>
  );
}

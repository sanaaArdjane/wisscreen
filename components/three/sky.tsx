"use client";

/**
 * The hero's background sky — stars, gas and meteors, nothing else — plus the shared
 * palette constants and canvas textures the centrepiece (`CloudCore`) also draws with.
 * Split out of the old `EarthNetwork` when the globe was replaced, unchanged: the rules
 * that make it work are written up under "The background sky" in AGENTS.md.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const AQUA = "#7FC9C8";
export const TEAL = "#379F9E";
export const PAPER = "#FFFFFF";
/* The signal accent in the scene. It is the ACTIVE colour: idle markers, arcs and
   bands are cool, and hovering one turns it green — so the hue carries the interaction
   state rather than just decorating. #00FFA9 is safe to use freely in here: it's far
   too bright to carry text anywhere (1.3:1 on paper), but an additively-blended glow
   has no contrast floor. */
export const SIGNAL_BRIGHT = "#00FFA9";
export const SIGNAL_SOFT = "#4ED39D";
/** The brand value, for lit geometry that would blow out at SIGNAL_BRIGHT. */
export const SIGNAL = "#13B78C";

/** Deterministic pseudo-random from an index — pure, so it's safe during render
 * (unlike Math.random, which React's purity rules forbid). */
export function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function radialGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.4)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Soft round star sprite. THREE renders `points` as hard SQUARES unless the material
 * carries a map with alpha — that alone is most of what makes a procedural starfield
 * look cheap. Tight core, long tail, so a star reads as a point of light with bloom
 * rather than a dot.
 */
export function starTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.95)");
  g.addColorStop(0.3, "rgba(255,255,255,0.35)");
  g.addColorStop(0.6, "rgba(255,255,255,0.07)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Per-star colour. A field of identical white points reads flat and synthetic; real
 * skies vary in colour temperature. Kept inside the brand family: mostly `paper`, a
 * cool minority tinted toward `aqua`, and a few tinted toward `signal`. Brightness
 * varies far more than hue — that is what gives a starfield depth.
 */
function writeStarColor(i: number, seed: number, out: Float32Array) {
  const hue = hash(i * 5.9 + seed);
  let r = 1;
  let g = 1;
  let b = 1;
  if (hue > 0.94) {
    // signal — green tinted
    r = 1;
    g = 0.78;
    b = 0.66;
  } else if (hue > 0.66) {
    // cool — aqua tinted
    r = 0.76;
    g = 0.92;
    b = 0.98;
  }
  // Still a tail toward dim, but the floor is high: this sky's ground is mid-navy
  // rather than black, so anything below ~0.4 disappears into it entirely.
  const t = hash(i * 8.3 + seed);
  const brightness = 0.45 + Math.pow(t, 1.4) * 0.55;
  out.set([r * brightness, g * brightness, b * brightness], i * 3);
}

/** Positions + per-star colours for one depth shell. */
function buildStarLayer(count: number, min: number, max: number, seed: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = min + hash(i + seed) * (max - min);
    const theta = hash(i * 2.3 + seed) * Math.PI * 2;
    const phi = Math.acos(2 * hash(i * 3.7 + seed) - 1);
    positions.set(
      [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      i * 3,
    );
    writeStarColor(i, seed, colors);
  }
  return { positions, colors };
}

/** Dense band of stars squashed toward a plane — the galactic-plane look. */
function buildStarBand(
  count: number,
  min: number,
  max: number,
  seed: number,
  flatten: number,
) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const r = min + hash(i + seed) * (max - min);
    const theta = hash(i * 2.3 + seed) * Math.PI * 2;
    const phi = Math.acos(2 * hash(i * 3.7 + seed) - 1);
    v.set(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
    );
    // Compress toward the y=0 plane, then renormalise, so density concentrates in a
    // band instead of thinning out evenly.
    v.y *= flatten;
    v.normalize().multiplyScalar(r);
    positions.set([v.x, v.y, v.z], i * 3);
    writeStarColor(i, seed, colors);
  }
  return { positions, colors };
}

/** One shell of stars. */
function StarLayer({
  data,
  size,
  opacity,
  star,
}: {
  data: { positions: Float32Array; colors: Float32Array };
  size: number;
  opacity: number;
  star: THREE.CanvasTexture | null;
}) {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={star ?? undefined}
        vertexColors
        size={size}
        transparent
        opacity={opacity}
        // Screen-space size, NOT sizeAttenuation. These shells sit 28-95 units out
        // while the camera is 6-14 units from the stack, so attenuated points collapse
        // to sub-pixel and the whole field renders invisible — which is exactly how
        // this looked before. In pixels, every shell reads, and the parallax comes
        // from the differing rotation rates instead.
        sizeAttenuation={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * The sky. Four depth shells plus a galactic band, each drifting at its own rate so
 * the field has parallax rather than turning as one rigid dome. Additive blending and
 * a mapped sprite are what make these read as light instead of dots.
 */
export function StarField({
  star,
  glow,
}: {
  star: THREE.CanvasTexture | null;
  glow: THREE.CanvasTexture | null;
}) {
  const near = useRef<THREE.Points>(null);
  const mid = useRef<THREE.Group>(null);
  const far = useRef<THREE.Group>(null);
  const band = useRef<THREE.Group>(null);

  const nearData = useMemo(() => buildStarLayer(170, 7, 15, 11), []);
  const midData = useMemo(() => buildStarLayer(760, 13, 32, 41), []);
  const farData = useMemo(() => buildStarLayer(2300, 28, 62, 77), []);
  const hazeData = useMemo(() => buildStarLayer(3600, 55, 95, 131), []);
  const bandData = useMemo(() => buildStarBand(2800, 34, 74, 197, 0.14), []);

  useFrame((_, delta) => {
    // Nearer shells drift faster. The differential is the whole point — a single
    // rotation speed reads as a painted backdrop.
    if (near.current) near.current.rotation.y += delta * 0.016;
    if (mid.current) mid.current.rotation.y += delta * 0.009;
    if (far.current) far.current.rotation.y -= delta * 0.004;
    if (band.current) band.current.rotation.y -= delta * 0.0025;
  });

  return (
    <>
      <points ref={near}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[nearData.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[nearData.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={star ?? undefined}
          vertexColors
          size={5}
          transparent
          opacity={1}
          sizeAttenuation={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <group ref={mid}>
        <StarLayer data={midData} size={3.4} opacity={1} star={star} />
      </group>

      <group ref={far}>
        <StarLayer data={farData} size={2.5} opacity={0.95} star={star} />
        <StarLayer data={hazeData} size={1.8} opacity={0.8} star={star} />
      </group>

      {/* Galactic band, tilted so it crosses the frame diagonally rather than sitting
          level with the orbit rings. */}
      <group ref={band} rotation={[0.34, 0, 0.52]}>
        <StarLayer data={bandData} size={2.3} opacity={1} star={star} />
        {glow && (
          <>
            <sprite position={[0, 0, -46]} scale={[120, 26, 1]}>
              <spriteMaterial
                map={glow}
                color={AQUA}
                transparent
                opacity={0.075}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
            <sprite position={[16, 2, -52]} scale={[80, 15, 1]}>
              <spriteMaterial
                map={glow}
                color={PAPER}
                transparent
                opacity={0.05}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </>
        )}
      </group>
    </>
  );
}

/**
 * A handful of foreground stars bright enough to carry a halo and diffraction spikes.
 * Sprites always face the camera, and `spriteMaterial.rotation` lets two thin streaks
 * cross into a spike — the classic bright-star signature, and the cheapest way to make
 * a starfield look photographed rather than generated. Deliberately few: the effect
 * works because most stars are plain points.
 */
export function BrightStars({ glow }: { glow: THREE.CanvasTexture | null }) {
  const stars = useMemo(
    () => [
      {
        pos: [11.5, 5.4, -17] as [number, number, number],
        scale: 0.55,
        color: PAPER,
      },
      {
        pos: [13.8, -1.6, -19] as [number, number, number],
        scale: 0.4,
        color: AQUA,
      },
      {
        pos: [-5.2, 7.6, -22] as [number, number, number],
        scale: 0.42,
        color: PAPER,
      },
      {
        pos: [8.8, -6.4, -18] as [number, number, number],
        scale: 0.34,
        color: SIGNAL_SOFT,
      },
    ],
    [],
  );

  if (!glow) return null;

  return (
    <>
      {stars.map((s, i) => (
        <group key={i} position={s.pos}>
          {/* Wide soft halo */}
          <sprite scale={[3.4 * s.scale, 3.4 * s.scale, 1]}>
            <spriteMaterial
              map={glow}
              color={s.color}
              transparent
              opacity={0.13}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          {/* Core */}
          <sprite scale={[0.34 * s.scale, 0.34 * s.scale, 1]}>
            <spriteMaterial
              map={glow}
              color={PAPER}
              transparent
              opacity={0.9}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          {/* Crossed diffraction spikes */}
          <sprite scale={[3.1 * s.scale, 0.055 * s.scale, 1]}>
            <spriteMaterial
              map={glow}
              color={s.color}
              transparent
              opacity={0.3}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <sprite scale={[0.055 * s.scale, 3.1 * s.scale, 1]}>
            <spriteMaterial
              map={glow}
              color={s.color}
              transparent
              opacity={0.3}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </group>
      ))}
    </>
  );
}

/** A meteor streaking across the upper aqua on a loop. */
function ShootingStar({
  start,
  dir,
  speed,
  offset,
  distance,
  glow,
}: {
  start: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  offset: number;
  distance: number;
  glow: THREE.CanvasTexture | null;
}) {
  const group = useRef<THREE.Group>(null);
  const streak = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Sprite>(null);
  const time = useRef(0);

  const normalized = useMemo(() => dir.clone().normalize(), [dir]);
  const quat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normalized,
      ),
    [normalized],
  );

  useFrame((_, delta) => {
    time.current += delta * speed;
    const p = (time.current + offset) % 1;

    if (group.current)
      group.current.position
        .copy(start)
        .addScaledVector(normalized, p * distance);

    // Fade in and out across the pass so meteors don't pop at the loop seam.
    const fade = Math.sin(p * Math.PI);
    if (streak.current)
      (streak.current.material as THREE.Material).opacity = fade * 0.8;
    if (head.current)
      (head.current.material as THREE.SpriteMaterial).opacity = fade;
  });

  return (
    <group ref={group} quaternion={quat}>
      {/* Tapered tail: wide at the head (+Y, the travel direction), fading to a point */}
      <mesh ref={streak} position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.035, 0.001, 2.2, 6, 1, true]} />
        <meshBasicMaterial
          color={SIGNAL_BRIGHT}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {glow && (
        <sprite ref={head} scale={[0.55, 0.55, 1]}>
          <spriteMaterial
            map={glow}
            color={SIGNAL_SOFT}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}
    </group>
  );
}

/** A large, very soft tinted gas patch — used to fill the space behind and beside the
 * stack so the scene doesn't read as empty black. */
export function NebulaCloud({
  position,
  scale,
  color,
  opacity,
  glow,
}: {
  position: [number, number, number];
  scale: number;
  color: string;
  opacity: number;
  glow: THREE.CanvasTexture | null;
}) {
  if (!glow) return null;
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={glow}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

/**
 * Meteors, on a loop across the upper frame. This used to also host a ringed planet, a
 * moon, a gas giant and connect-the-dots constellations; they read as cartoon scenery
 * against a real starfield, so the sky is now stars and gas only. Meteors survive
 * because they are motion, not props — they give the sky life without naming objects.
 */
export function Meteors({ glow }: { glow: THREE.CanvasTexture | null }) {
  return (
    <>
      <ShootingStar
        start={new THREE.Vector3(-13, 9.5, -6)}
        dir={new THREE.Vector3(1, -0.42, 0.1)}
        speed={0.11}
        offset={0}
        distance={30}
        glow={glow}
      />
      <ShootingStar
        start={new THREE.Vector3(-10, 12, -12)}
        dir={new THREE.Vector3(1, -0.3, 0.22)}
        speed={0.085}
        offset={0.45}
        distance={34}
        glow={glow}
      />
      <ShootingStar
        start={new THREE.Vector3(-15, 6.5, -3)}
        dir={new THREE.Vector3(1, -0.5, -0.05)}
        speed={0.13}
        offset={0.72}
        distance={28}
        glow={glow}
      />
    </>
  );
}

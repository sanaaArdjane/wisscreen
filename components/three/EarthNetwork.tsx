"use client";

import { useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Service } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

const AQUA = "#7FC9C8";
const TEAL = "#379F9E";
const PAPER = "#FFFFFF";
/* The signal accent in the scene. It is the ACTIVE colour: idle markers, arcs and
   bands are cool, and hovering one turns it green — so the hue carries the interaction
   state rather than just decorating. #00FFA9 is safe to use freely in here: it's far
   too bright to carry text anywhere (1.3:1 on paper), but an additively-blended glow
   has no contrast floor. */
const SIGNAL_BRIGHT = "#00FFA9";
const SIGNAL_SOFT = "#4ED39D";
/** The brand value, for lit geometry that would blow out at SIGNAL_BRIGHT. */
const SIGNAL = "#13B78C";

const GLOBE_RADIUS = 2.1;
/** Markers sit just above the surface so they read as mounted ON the globe. */
const MARKER_RADIUS = GLOBE_RADIUS * 1.11;

/** Deterministic pseudo-random from an index — pure, so it's safe during render
 * (unlike Math.random, which React's purity rules forbid). */
function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Seconds the globe's pop-in entrance takes. */
const INTRO_DURATION = 1.5;
/** Beat held before the globe pops, so the starfield and scenery ease in first. */
const INTRO_DELAY = 0.55;

/** Standard easeOutBack — settles past 1 then eases back, giving the pop its snap. */
function easeOutBack(x: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** Marker placement, spread around the sphere so the connecting arcs wrap it. */
const MARKER_ANGLES = [
  { phiDeg: 58, thetaDeg: 34 },
  { phiDeg: 84, thetaDeg: -48 },
  { phiDeg: 116, thetaDeg: 22 },
  { phiDeg: 72, thetaDeg: 128 },
];

function sphericalToCartesian(
  phiDeg: number,
  thetaDeg: number,
  radius: number,
) {
  const phi = THREE.MathUtils.degToRad(phiDeg);
  const theta = THREE.MathUtils.degToRad(thetaDeg);
  const ring = radius * Math.sin(phi);
  return new THREE.Vector3(
    ring * Math.cos(theta),
    radius * Math.cos(phi),
    ring * Math.sin(theta),
  );
}

function radialGlowTexture() {
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
function starTexture() {
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

function fibonacciSphere(count: number, radius: number, offset = 0) {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + offset) / (count - 1 + offset)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * (i + offset);
    positions.set(
      [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius],
      i * 3,
    );
  }
  return positions;
}

function circlePoints(radius: number, y = 0, segments = 128) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
  }
  return pts;
}

/** Soft atmospheric rim light (fresnel falloff) around the globe. */
function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(AQUA) },
      uIntensity: { value: 0.5 },
      uPower: { value: 3.2 },
    }),
    [],
  );

  return (
    <mesh scale={1.14}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uPower;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float fresnel = pow(1.0 - abs(dot(vNormal, vView)), uPower);
            gl_FragColor = vec4(uColor, fresnel * uIntensity);
          }
        `}
      />
    </mesh>
  );
}

/** Globe body: opaque core + two layers of glowing dots + latitude bands that
 * visually "wrap" the sphere. No rotation of its own — the parent group spins so
 * the markers and arcs stay locked to it. */
function GlobeBody() {
  const dense = useMemo(() => fibonacciSphere(5200, GLOBE_RADIUS * 1.002), []);
  const sparse = useMemo(
    () => fibonacciSphere(520, GLOBE_RADIUS * 1.012, 0.37),
    [],
  );

  const bands = useMemo(() => {
    const R = GLOBE_RADIUS * 1.008;
    return [-0.5, 0, 0.5].map((frac) => {
      const y = R * frac;
      return {
        y,
        radius: Math.sqrt(Math.max(0.0001, R * R - y * y)),
        isEquator: frac === 0,
      };
    });
  }, []);

  return (
    <group>
      {/* Opaque core: gives the dot shell a crisp silhouette and hides far dots */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.99, 64, 64]} />
        <meshStandardMaterial
          color="#2b3852"
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dense, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={AQUA}
          size={0.026}
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparse, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={PAPER}
          size={0.05}
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {bands.map((band, i) => (
        <Line
          key={i}
          points={circlePoints(band.radius, band.y)}
          // The equator takes the signal accent: it's the one line on the globe that
          // reads as a deliberate belt rather than part of the dotted grid.
          color={band.isEquator ? SIGNAL_SOFT : AQUA}
          transparent
          opacity={band.isEquator ? 0.42 : 0.13}
          lineWidth={1}
        />
      ))}
    </group>
  );
}

/** Slow-drifting dust so the scene reads as weightless deep space. */
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
        // while the camera is 6-14 units from the globe, so attenuated points collapse
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
function StarField({
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
          level with the globe's equator. */}
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
function BrightStars({ glow }: { glow: THREE.CanvasTexture | null }) {
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

/** A large, very soft tinted cloud — used to fill the space behind and beside the
 * globe so the scene doesn't read as empty black. */
function NebulaCloud({
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
function Meteors({ glow }: { glow: THREE.CanvasTexture | null }) {
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

function ServiceMarker({
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
  // Alternate the idle colour so the constellation mixes signal and cool rather than
  // reading as one hue. With four services this is an even 2/2 split.
  const idleSignal = index % 2 === 1;
  const idle = idleSignal ? SIGNAL_SOFT : AQUA;

  const anchor = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const label = useRef<HTMLDivElement>(null);
  const world = useRef(new THREE.Vector3());
  const elapsed = useRef(hash(index * 13) * 4);

  const isActive = hovered === index;
  const portal = overlayRef as RefObject<HTMLElement> | undefined;

  const normal = useMemo(() => position.clone().normalize(), [position]);
  const footPoint = useMemo(
    () => normal.clone().multiplyScalar(GLOBE_RADIUS * 1.005),
    [normal],
  );
  // Flat pad lying on the globe surface, oriented to the local normal.
  const padQuat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      ),
    [normal],
  );

  useFrame(({ camera }, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;

    if (orb.current) {
      const scale = isActive ? 1.6 : 1;
      orb.current.scale.setScalar(
        THREE.MathUtils.lerp(orb.current.scale.x, scale, 0.14),
      );
    }

    // Radar ping expanding across the surface pad.
    if (pulse.current) {
      const p = (t % 2.2) / 2.2;
      pulse.current.scale.setScalar(THREE.MathUtils.lerp(0.35, 2.1, p));
      (pulse.current.material as THREE.Material).opacity =
        (1 - p) * (isActive ? 0.8 : 0.5);
    }

    // Fade labels on the far side so the front stays readable while the camera
    // orbits. The hovered marker always stays fully opaque — otherwise its open
    // info card would be unreadable whenever it sits behind the globe.
    if (anchor.current && label.current) {
      anchor.current.getWorldPosition(world.current);
      const toCam = camera.position.clone().sub(world.current).normalize();
      const outward = world.current.clone().normalize();
      const facing = outward.dot(toCam);
      label.current.style.opacity = isActive || facing > -0.05 ? "1" : "0.16";
    }
  });

  return (
    <group>
      {/* Surface pad + expanding ping, flush against the globe */}
      <group position={footPoint} quaternion={padQuat}>
        <mesh>
          <ringGeometry args={[0.13, 0.165, 48]} />
          <meshBasicMaterial
            color={isActive ? SIGNAL_BRIGHT : idle}
            transparent
            opacity={isActive ? 0.95 : 0.65}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={pulse}>
          <ringGeometry args={[0.17, 0.2, 48]} />
          <meshBasicMaterial
            color={isActive ? SIGNAL_BRIGHT : idle}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Short tether from the surface up to the marker — visibly mounted on the globe */}
      <Line
        points={[footPoint, position]}
        color={isActive ? SIGNAL_BRIGHT : idle}
        transparent
        opacity={isActive ? 0.95 : 0.55}
        lineWidth={2}
      />

      <group ref={anchor} position={position}>
        <mesh
          // The cursor is driven by a class on the Canvas (see EarthNetwork) rather
          // than by mutating document.body here: the canvas's own `cursor` wins over
          // an inherited one, and a body-level override can leak if a pointerout is
          // missed.
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
          {/* Generous invisible hit sphere so the orb is comfortably clickable */}
          <sphereGeometry args={[0.38, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh ref={orb}>
          <sphereGeometry args={[0.15, 28, 28]} />
          <meshStandardMaterial
            color={PAPER}
            emissive={isActive ? SIGNAL_BRIGHT : idle}
            emissiveIntensity={isActive ? 1.9 : 1}
          />
        </mesh>

        {glow && (
          <sprite scale={[1.05, 1.05, 1]}>
            <spriteMaterial
              map={glow}
              color={isActive ? SIGNAL_BRIGHT : idle}
              transparent
              opacity={isActive ? 0.68 : 0.32}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        )}

        {showLabel && (
          <Html
            center
            portal={portal}
            zIndexRange={[40, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              ref={label}
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(service.slug)}
              className="pointer-events-auto -translate-y-16 cursor-pointer select-none"
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
                <span className="text-base font-semibold tracking-tight">
                  {service.shortName}
                </span>
              </div>

              {isActive && (
                <div className="mt-2.5 flex w-[38rem] overflow-hidden rounded-2xl border border-signal-soft/30 bg-[#2c3a56]/96 text-paper shadow-2xl backdrop-blur-md">
                  {/* Text — left column */}
                  <div className="flex w-[15rem] shrink-0 flex-col justify-center p-5">
                    <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-signal-soft">
                      {service.category}
                    </p>
                    <p className="mt-1.5 text-lg font-semibold leading-tight">
                      {service.name}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed opacity-80">
                      {service.tagline}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-signal-soft">
                      Découvrir
                      <Icon name="arrow-right" className="h-3.5 w-3.5" />
                    </p>
                  </div>

                  {/* Project preview — right column, large. Drops in a real GIF as soon
                    as `previewGif` is set on the service, otherwise shows a labelled
                    placeholder. */}
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

/** Arc that hugs the globe surface between two markers, so the solutions read as
 * wrapped around and linked through the earth rather than floating beside it. */
function ServiceArc({
  from,
  to,
  isActive,
  glow,
  index,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  isActive: boolean;
  glow: THREE.CanvasTexture | null;
  index: number;
}) {
  const travel = useRef<THREE.Sprite>(null);
  const elapsed = useRef(hash(index * 31) * 5);

  const curve = useMemo(() => {
    // A quadratic bezier approximates a circular arc when its control point sits
    // at radius / cos(halfAngle) — that makes the line follow the sphere instead
    // of cutting a chord through it.
    const radius = from.length();
    const half = from.angleTo(to) / 2;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const control = mid
      .normalize()
      .multiplyScalar((radius / Math.max(0.2, Math.cos(half))) * 1.015);
    return new THREE.QuadraticBezierCurve3(from, control, to);
  }, [from, to]);

  const points = useMemo(() => curve.getPoints(72), [curve]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (travel.current)
      travel.current.position.copy(
        curve.getPointAt((elapsed.current * 0.15) % 1),
      );
  });

  return (
    <>
      <Line
        points={points}
        color={isActive ? SIGNAL_SOFT : TEAL}
        transparent
        opacity={isActive ? 0.9 : 0.42}
        lineWidth={1.3}
      />
      {glow && (
        <sprite ref={travel} scale={[0.3, 0.3, 1]}>
          <spriteMaterial
            map={glow}
            color={isActive ? SIGNAL_SOFT : TEAL}
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}
    </>
  );
}

function Scene({
  services,
  hovered,
  onHover,
  onSelect,
  paused,
  overlayRef,
}: {
  services: Service[];
  hovered: number | null;
  onHover: (i: number | null) => void;
  onSelect: (slug: string) => void;
  paused: boolean;
  overlayRef?: RefObject<HTMLDivElement | null>;
}) {
  const glow = useMemo(
    () => (typeof document !== "undefined" ? radialGlowTexture() : null),
    [],
  );
  const starMap = useMemo(
    () => (typeof document !== "undefined" ? starTexture() : null),
    [],
  );
  const drift = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const intro = useRef<THREE.Group>(null);
  const introProgress = useRef(0);
  const introDelay = useRef(0);
  const [introDone, setIntroDone] = useState(false);

  const markers = useMemo(
    () =>
      services.map((_, i) => {
        const a = MARKER_ANGLES[i % MARKER_ANGLES.length];
        return sphericalToCartesian(a.phiDeg, a.thetaDeg, MARKER_RADIUS);
      }),
    [services],
  );

  useFrame(({ clock }, delta) => {
    // Entrance: the globe system pops in from nothing with an ease-out overshoot
    // instead of snapping into place. Driven by the render loop rather than a GSAP
    // tween on purpose — progress then only advances on frames that actually draw,
    // so a throttled/backgrounded tab can never leave the globe stuck at scale 0.
    if (intro.current && introProgress.current < 1) {
      // Hold at zero for a beat first: the aqua, scenery and dust are already
      // fading in over this window, so the globe arrives into an existing space.
      introDelay.current += delta;
      if (introDelay.current >= INTRO_DELAY) {
        introProgress.current = Math.min(
          1,
          introProgress.current + delta / INTRO_DURATION,
        );
        const eased = easeOutBack(introProgress.current);
        intro.current.scale.setScalar(Math.max(0.0001, eased));
        if (introProgress.current >= 1) setIntroDone(true);
      }
    }

    // Everything mounted on the globe spins as one body, so markers and arcs stay
    // locked to the surface instead of drifting independently.
    if (spin.current && !paused) spin.current.rotation.y += delta * 0.055;
    if (drift.current) {
      const t = clock.elapsedTime;
      drift.current.rotation.x = Math.sin(t * 0.11) * 0.05;
      drift.current.rotation.z = Math.cos(t * 0.09) * 0.04;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 4, 6]} intensity={80} color={PAPER} />
      <pointLight position={[-7, -2, -4]} intensity={35} color={TEAL} />
      <pointLight position={[0, 6, -6]} intensity={22} color={AQUA} />
      {/* Low signal rim from below, so the globe isn't lit from one hue only. */}
      <pointLight position={[3, -6, 2]} intensity={26} color={SIGNAL} />

      <StarField star={starMap} glow={glow} />
      <BrightStars glow={glow} />
      <Meteors glow={glow} />

      {/* Deep gas, kept much fainter than it used to be. It exists so the globe's back
          isn't empty black and so the frame has some colour temperature — not as
          visible clouds. Anything stronger competes with the stars and the sky starts
          looking illustrated again. */}
      <NebulaCloud
        position={[0, 0.5, -12]}
        scale={30}
        color={AQUA}
        opacity={0.07}
        glow={glow}
      />
      <NebulaCloud
        position={[-15, 2.5, -22]}
        scale={26}
        color={TEAL}
        opacity={0.055}
        glow={glow}
      />
      <NebulaCloud
        position={[14, -3, -20]}
        scale={24}
        color={SIGNAL}
        opacity={0.06}
        glow={glow}
      />

      {/* scale starts near zero so the very first painted frame is already tiny —
          the pop-in then grows it via the render loop. */}
      <group ref={intro} scale={0.0001}>
        <group ref={drift}>
          <Atmosphere />

          <group ref={spin}>
            <GlobeBody />

            {services.map((_, i) => {
              const next = (i + 1) % services.length;
              return (
                <ServiceArc
                  key={i}
                  index={i}
                  from={markers[i]}
                  to={markers[next]}
                  isActive={hovered === i || hovered === next}
                  glow={glow}
                />
              );
            })}

            {services.map((service, i) => (
              <ServiceMarker
                key={service.slug}
                service={service}
                index={i}
                position={markers[i]}
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
        minDistance={6}
        maxDistance={14}
      />
    </>
  );
}

export default function EarthNetwork({
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

  return (
    <>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 1.2, 8.4], fov: 42 }}
        // Rendered inside the <canvas> when a WebGL context can't be created at all
        // (unsupported browser, disabled hardware acceleration, exhausted contexts).
        fallback={
          <EarthNetworkFallback message="Aperçu 3D indisponible sur cet appareil" />
        }
        // Fade in once the GL context exists, so there's no hard cut from placeholder
        // to scene. Grab hand over the scene so it reads as draggable, switching to a
        // pointer when a service marker is under the cursor.
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
          overlayRef={overlayRef}
        />
      </Canvas>

      {/* Interaction hint. Zoom deliberately captures the mouse wheel, so this
          appears while the pointer is inside the scene to explain the controls and
          make clear the page scrolls again once you leave the area. */}
      <div
        aria-hidden="true"
        // Top-right, and above the copy band's z-30: anchored at the bottom it sat
        // underneath that band's gradient overlay, which washed the text out.
        className={`pointer-events-none absolute right-5 top-24 z-[31] max-w-[15.5rem] rounded-2xl border border-aqua/30 bg-[#2c3a56]/95 px-4 py-3 text-paper shadow-2xl backdrop-blur-md transition-all duration-300 ${
          paused ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-aqua">
          <Icon name="move" className="h-3.5 w-3.5" />
          Zone interactive
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed opacity-90">
          Glissez pour tourner le globe, molette pour zoomer.
        </p>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-aqua">
          Sortez de cette zone pour faire défiler la page.
        </p>
      </div>
    </>
  );
}

/**
 * Static stand-in for the 3D scene. Used three ways: while the chunk loads, as the
 * `<canvas>` fallback when WebGL is unavailable, and as the error-boundary fallback
 * if the scene throws. Pure CSS so it can never fail for the same reasons the 3D can.
 */
export function EarthNetworkFallback({ message }: { message?: string } = {}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:30px_30px]" />
      <div className="absolute h-[28rem] w-[28rem] max-w-[80vw] rounded-full bg-aqua/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative h-[20rem] w-[20rem] max-w-[68vw] rounded-full border border-aqua/25 bg-[radial-gradient(circle_at_35%_28%,#3d5175_0%,#2b3852_55%,#233047_100%)] shadow-2xl">
          <div className="absolute inset-0 rounded-full opacity-55 [background-image:radial-gradient(circle_at_1px_1px,rgba(127,201,200,0.6)_1px,transparent_0)] [background-size:15px_15px]" />
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-teal/35" />
          <div className="absolute inset-x-0 top-[30%] h-px bg-aqua/15" />
          <div className="absolute inset-x-0 top-[70%] h-px bg-aqua/15" />
          <div className="absolute -inset-3 rounded-full border border-aqua/10" />
        </div>

        {message && (
          <p className="max-w-xs text-center text-xs uppercase tracking-[0.14em] text-aqua/70">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Transient placeholder for while the 3D chunk loads. Just soft ambient glow — no
 * globe (drawing one here then popping the real one in reads as loading twice) and
 * no dot pattern (the real starfield is rendered in GL; a CSS one underneath the
 * canvas would linger behind the whole scene).
 */
export function EarthSkyPlaceholder() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua/10 blur-3xl" />
      <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
    </div>
  );
}

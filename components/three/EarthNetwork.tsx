"use client";

import { useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Service } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

const AQUA = "#7FC9C8";
const TEAL = "#379F9E";
const PAPER = "#FFFFFF";
/* The warm accent in the scene. Ember is the ACTIVE colour: idle markers, arcs and
   bands are cool, and hovering one turns it warm — so the hue carries the interaction
   state rather than just decorating. #FF4100 is safe to use freely in here: it's far
   too bright to carry text anywhere (3.5:1 at best), but an additively-blended glow
   has no contrast floor. */
const EMBER_HOT = "#FF4100";
const EMBER = "#F2A48A";
/** Mid warm, for lit geometry that would blow out at EMBER_HOT. */
const EMBER_MID = "#C5522C";

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

function sphericalToCartesian(phiDeg: number, thetaDeg: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(phiDeg);
  const theta = THREE.MathUtils.degToRad(thetaDeg);
  const ring = radius * Math.sin(phi);
  return new THREE.Vector3(ring * Math.cos(theta), radius * Math.cos(phi), ring * Math.sin(theta));
}

function radialGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.4)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

function fibonacciSphere(count: number, radius: number, offset = 0) {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + offset) / (count - 1 + offset)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * (i + offset);
    positions.set([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius], i * 3);
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
  const sparse = useMemo(() => fibonacciSphere(520, GLOBE_RADIUS * 1.012, 0.37), []);

  const bands = useMemo(() => {
    const R = GLOBE_RADIUS * 1.008;
    return [-0.5, 0, 0.5].map((frac) => {
      const y = R * frac;
      return { y, radius: Math.sqrt(Math.max(0.0001, R * R - y * y)), isEquator: frac === 0 };
    });
  }, []);

  return (
    <group>
      {/* Opaque core: gives the dot shell a crisp silhouette and hides far dots */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.99, 64, 64]} />
        <meshStandardMaterial color="#2b3852" roughness={0.85} metalness={0.15} />
      </mesh>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dense, 3]} />
        </bufferGeometry>
        <pointsMaterial color={AQUA} size={0.026} transparent opacity={0.6} sizeAttenuation depthWrite={false} />
      </points>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparse, 3]} />
        </bufferGeometry>
        <pointsMaterial color={PAPER} size={0.05} transparent opacity={0.9} sizeAttenuation depthWrite={false} />
      </points>

      {bands.map((band, i) => (
        <Line
          key={i}
          points={circlePoints(band.radius, band.y)}
          // The equator takes the warm accent: it's the one line on the globe that
          // reads as a deliberate belt rather than part of the dotted grid.
          color={band.isEquator ? EMBER : AQUA}
          transparent
          opacity={band.isEquator ? 0.42 : 0.13}
          lineWidth={1}
        />
      ))}
    </group>
  );
}

/** Slow-drifting dust so the scene reads as weightless deep space. */
function SpaceDust() {
  const inner = useRef<THREE.Points>(null);
  const outer = useRef<THREE.Points>(null);

  const build = (count: number, min: number, max: number, seed: number) => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = min + hash(i + seed) * (max - min);
      const theta = hash(i * 2.3 + seed) * Math.PI * 2;
      const phi = Math.acos(2 * hash(i * 3.7 + seed) - 1);
      positions.set(
        [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
        i * 3,
      );
    }
    return positions;
  };

  const near = useMemo(() => build(700, 5, 16, 11), []);
  const far = useMemo(() => build(2000, 18, 58, 77), []);

  useFrame((_, delta) => {
    if (inner.current) {
      inner.current.rotation.y += delta * 0.018;
      inner.current.rotation.x += delta * 0.006;
    }
    if (outer.current) outer.current.rotation.y -= delta * 0.005;
  });

  return (
    <>
      <points ref={inner}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[near, 3]} />
        </bufferGeometry>
        <pointsMaterial color={AQUA} size={0.05} transparent opacity={0.7} sizeAttenuation depthWrite={false} />
      </points>
      <points ref={outer}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[far, 3]} />
        </bufferGeometry>
        <pointsMaterial color={PAPER} size={0.11} transparent opacity={0.55} sizeAttenuation depthWrite={false} />
      </points>
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
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalized),
    [normalized],
  );

  useFrame((_, delta) => {
    time.current += delta * speed;
    const p = (time.current + offset) % 1;

    if (group.current) group.current.position.copy(start).addScaledVector(normalized, p * distance);

    // Fade in and out across the pass so meteors don't pop at the loop seam.
    const fade = Math.sin(p * Math.PI);
    if (streak.current) (streak.current.material as THREE.Material).opacity = fade * 0.8;
    if (head.current) (head.current.material as THREE.SpriteMaterial).opacity = fade;
  });

  return (
    <group ref={group} quaternion={quat}>
      {/* Tapered tail: wide at the head (+Y, the travel direction), fading to a point */}
      <mesh ref={streak} position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.035, 0.001, 2.2, 6, 1, true]} />
        <meshBasicMaterial
          color={EMBER_HOT}
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
            color={EMBER}
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

/** A small star cluster joined by faint lines — fills the side margins with
 * something that reads as deep aqua rather than noise. */
function Constellation({
  position,
  scale,
  seed,
  color,
}: {
  position: [number, number, number];
  scale: number;
  seed: number;
  color: string;
}) {
  const stars = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 7; i++) {
      pts.push(
        new THREE.Vector3(
          (hash(i * 1.7 + seed) - 0.5) * 2.2,
          (hash(i * 3.1 + seed) - 0.5) * 2.2,
          (hash(i * 7.7 + seed) - 0.5) * 0.6,
        ),
      );
    }
    return pts;
  }, [seed]);

  const positions = useMemo(() => {
    const arr = new Float32Array(stars.length * 3);
    stars.forEach((p, i) => arr.set([p.x, p.y, p.z], i * 3));
    return arr;
  }, [stars]);

  return (
    <group position={position} scale={scale}>
      <Line points={stars} color={color} transparent opacity={0.22} lineWidth={1} />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={PAPER} size={0.09} transparent opacity={0.9} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  );
}

/** Universe scenery in the upper part of the scene: a distant ringed planet, a
 * far moon, and meteors. Sits behind the globe and never rotates with it. */
function CosmicSky({ glow }: { glow: THREE.CanvasTexture | null }) {
  const planet = useRef<THREE.Group>(null);
  const ringRadius = 1.05;

  useFrame((_, delta) => {
    if (planet.current) planet.current.rotation.y += delta * 0.05;
  });

  return (
    <>
      {/* Ringed planet, upper-left, far away — kept clear of the fixed navbar */}
      <group position={[-7.2, 2.9, -13]}>
        <Float speed={0.5} rotationIntensity={0.15} floatIntensity={0.5}>
          <group ref={planet} rotation={[0.42, 0, 0.22]}>
            <mesh>
              <sphereGeometry args={[0.62, 48, 48]} />
              <meshStandardMaterial color="#3d5175" roughness={0.75} metalness={0.2} emissive={AQUA} emissiveIntensity={0.12} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[ringRadius, 0.012, 8, 96]} />
              <meshBasicMaterial color={TEAL} transparent opacity={0.6} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[ringRadius * 1.16, 0.006, 8, 96]} />
              <meshBasicMaterial color={AQUA} transparent opacity={0.4} />
            </mesh>
          </group>
        </Float>
        {glow && (
          <sprite scale={[4.2, 4.2, 1]}>
            <spriteMaterial
              map={glow}
              color={AQUA}
              transparent
              opacity={0.16}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        )}
      </group>

      {/* Small pale moon, upper-right */}
      <group position={[9.5, 4.2, -11]}>
        <Float speed={0.65} rotationIntensity={0.2} floatIntensity={0.7}>
          <mesh>
            <sphereGeometry args={[0.26, 32, 32]} />
            <meshStandardMaterial color="#dfeceb" roughness={0.9} emissive={AQUA} emissiveIntensity={0.2} />
          </mesh>
        </Float>
      </group>

      {/* Warm gas giant filling the right margin */}
      <group position={[11.5, -2.4, -16]}>
        <Float speed={0.45} rotationIntensity={0.12} floatIntensity={0.6}>
          <mesh>
            <sphereGeometry args={[1.05, 48, 48]} />
            <meshStandardMaterial color="#2f6a72" roughness={0.8} metalness={0.15} emissive={TEAL} emissiveIntensity={0.14} />
          </mesh>
        </Float>
        {glow && (
          <sprite scale={[6, 6, 1]}>
            <spriteMaterial
              map={glow}
              color={TEAL}
              transparent
              opacity={0.13}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        )}
      </group>

      {/* Constellations filling the side margins */}
      <Constellation position={[-12, 0.5, -10]} scale={1.5} seed={3} color={AQUA} />
      <Constellation position={[12.5, 2.8, -9]} scale={1.25} seed={17} color={AQUA} />
      <Constellation position={[-11, -4.5, -8]} scale={1.1} seed={29} color={TEAL} />

      {/* Meteors across the top */}
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

/** Small tumbling shards drifting weightlessly around the globe. */
function FloatingDebris() {
  return (
    <>
      {[0, 1, 2].map((i) => {
        const pos = sphericalToCartesian(35 + hash(i) * 110, hash(i * 5.1) * 360, 5.4 + hash(i * 2.2) * 2.6);
        return (
          <Float key={i} speed={0.8 + hash(i * 9) * 0.8} rotationIntensity={1.6} floatIntensity={1.8}>
            <mesh position={pos}>
              <icosahedronGeometry args={[0.05 + hash(i * 3.3) * 0.05, 0]} />
              <meshStandardMaterial
                color={i === 1 ? EMBER : i === 0 ? AQUA : TEAL}
                emissive={i === 1 ? EMBER : i === 0 ? AQUA : TEAL}
                emissiveIntensity={0.5}
                roughness={0.4}
              />
            </mesh>
          </Float>
        );
      })}
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
  // Alternate the idle colour so the constellation mixes warm and cool rather than
  // reading as one hue. With four services this is an even 2/2 split.
  const idleWarm = index % 2 === 1;
  const idle = idleWarm ? EMBER : AQUA;

  const anchor = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const label = useRef<HTMLDivElement>(null);
  const world = useRef(new THREE.Vector3());
  const elapsed = useRef(hash(index * 13) * 4);

  const isActive = hovered === index;
  const portal = overlayRef as RefObject<HTMLElement> | undefined;

  const normal = useMemo(() => position.clone().normalize(), [position]);
  const footPoint = useMemo(() => normal.clone().multiplyScalar(GLOBE_RADIUS * 1.005), [normal]);
  // Flat pad lying on the globe surface, oriented to the local normal.
  const padQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
    [normal],
  );

  useFrame(({ camera }, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;

    if (orb.current) {
      const scale = isActive ? 1.6 : 1;
      orb.current.scale.setScalar(THREE.MathUtils.lerp(orb.current.scale.x, scale, 0.14));
    }

    // Radar ping expanding across the surface pad.
    if (pulse.current) {
      const p = (t % 2.2) / 2.2;
      pulse.current.scale.setScalar(THREE.MathUtils.lerp(0.35, 2.1, p));
      (pulse.current.material as THREE.Material).opacity = (1 - p) * (isActive ? 0.8 : 0.5);
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
            color={isActive ? EMBER_HOT : idle}
            transparent
            opacity={isActive ? 0.95 : 0.65}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={pulse}>
          <ringGeometry args={[0.17, 0.2, 48]} />
          <meshBasicMaterial
            color={isActive ? EMBER_HOT : idle}
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
        color={isActive ? EMBER_HOT : idle}
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
            emissive={isActive ? EMBER_HOT : idle}
            emissiveIntensity={isActive ? 1.9 : 1}
          />
        </mesh>

        {glow && (
          <sprite scale={[1.05, 1.05, 1]}>
            <spriteMaterial
              map={glow}
              color={isActive ? EMBER_HOT : idle}
              transparent
              opacity={isActive ? 0.68 : 0.32}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        )}

        {showLabel && (
        <Html center portal={portal} zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
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
                isActive ? "border-ember-soft/80" : ""
              }`}
            >
              <Icon name={service.icon} className={`h-4 w-4 ${isActive ? "text-ember-soft" : "text-ember"}`} />
              <span className="text-base font-semibold tracking-tight">{service.shortName}</span>
            </div>

            {isActive && (
              <div className="mt-2.5 flex w-[38rem] overflow-hidden rounded-2xl border border-ember-soft/30 bg-[#2c3a56]/96 text-paper shadow-2xl backdrop-blur-md">
                {/* Text — left column */}
                <div className="flex w-[15rem] shrink-0 flex-col justify-center p-5">
                  <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-ember-soft">
                    {service.category}
                  </p>
                  <p className="mt-1.5 text-lg font-semibold leading-tight">{service.name}</p>
                  <p className="mt-2 text-xs leading-relaxed opacity-80">{service.tagline}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ember-soft">
                    Découvrir
                    <Icon name="arrow-right" className="h-3.5 w-3.5" />
                  </p>
                </div>

                {/* Project preview — right column, large. Drops in a real GIF as soon
                    as `previewGif` is set on the service, otherwise shows a labelled
                    placeholder. */}
                <div className="relative min-h-[16.5rem] flex-1 overflow-hidden border-l border-ember-soft/20 bg-[#233047]">
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
                      <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-ember/25 blur-2xl" />
                      <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ember-soft/45 text-ember-soft">
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
    const control = mid.normalize().multiplyScalar((radius / Math.max(0.2, Math.cos(half))) * 1.015);
    return new THREE.QuadraticBezierCurve3(from, control, to);
  }, [from, to]);

  const points = useMemo(() => curve.getPoints(72), [curve]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (travel.current) travel.current.position.copy(curve.getPointAt((elapsed.current * 0.15) % 1));
  });

  return (
    <>
      <Line points={points} color={isActive ? EMBER : TEAL} transparent opacity={isActive ? 0.9 : 0.42} lineWidth={1.3} />
      {glow && (
        <sprite ref={travel} scale={[0.3, 0.3, 1]}>
          <spriteMaterial
            map={glow}
            color={isActive ? EMBER : TEAL}
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
  const glow = useMemo(() => (typeof document !== "undefined" ? radialGlowTexture() : null), []);
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
        introProgress.current = Math.min(1, introProgress.current + delta / INTRO_DURATION);
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
      {/* Low warm rim from below, so the globe isn't lit purely blue-green. */}
      <pointLight position={[3, -6, 2]} intensity={26} color={EMBER_MID} />

      <SpaceDust />
      <CosmicSky glow={glow} />

      {/* Deep nebula wash: one large cloud directly behind the globe so its back
          isn't empty black, plus two more reaching into the side margins. */}
      <NebulaCloud position={[0, 0.5, -10]} scale={22} color={AQUA} opacity={0.14} glow={glow} />
      <NebulaCloud position={[-13, 1.5, -17]} scale={18} color={TEAL} opacity={0.1} glow={glow} />
      <NebulaCloud position={[13, -2, -15]} scale={17} color={EMBER_MID} opacity={0.13} glow={glow} />

      {/* scale starts near zero so the very first painted frame is already tiny —
          the pop-in then grows it via the render loop. */}
      <group ref={intro} scale={0.0001}>
        <group ref={drift}>
          <Atmosphere />
          <FloatingDebris />

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
        fallback={<EarthNetworkFallback message="Aperçu 3D indisponible sur cet appareil" />}
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
          <p className="max-w-xs text-center text-xs uppercase tracking-[0.14em] text-aqua/70">{message}</p>
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

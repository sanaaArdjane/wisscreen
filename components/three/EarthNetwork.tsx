"use client";

import { useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Service } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { EarthNetworkFallback } from "./fallbacks";
import {
  AQUA,
  BrightStars,
  Meteors,
  NebulaCloud,
  PAPER,
  SIGNAL,
  SIGNAL_BRIGHT,
  SIGNAL_SOFT,
  StarField,
  TEAL,
  hash,
  radialGlowTexture,
  starTexture,
} from "./sky";

const GLOBE_RADIUS = 2.1;
/** Markers sit just above the surface so they read as mounted ON the globe. */
const MARKER_RADIUS = GLOBE_RADIUS * 1.11;

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
        dpr={[1, 1.5]}
        // Antialiasing multiplies per-pixel shading cost, and this scene's silhouettes
        // (globe sphere, sprites) are already softened by dpr scaling and the mapped
        // glow/star textures — see the file-level note on fill rate being the real
        // cost, not geometry. `high-performance` nudges dual-GPU laptops off the
        // integrated chip; it can't force a real GPU where none exists (e.g. a
        // sandboxed Lighthouse run), but it costs nothing where one does.
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
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

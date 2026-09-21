"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const NODES = [
  [-3.05, 1.25, -0.25],
  [-3.15, -1.2, 0.1],
  [3.05, 1.3, 0.1],
  [3.15, -1.15, -0.25],
] as const;

const LINKS = NODES.map(([x, y, z]) =>
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(x * 0.38, y * 0.16, 0.25),
    new THREE.Vector3(x * 0.7, y * 0.88, z + 0.35),
    new THREE.Vector3(x, y, z),
  ]),
);

function DataPulse({ curve, index }: { curve: THREE.CatmullRomCurve3; index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.copy(curve.getPointAt((clock.elapsedTime * 0.12 + index * 0.23) % 1));
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshBasicMaterial color="#13C182" transparent opacity={0.65} />
    </mesh>
  );
}

function Network() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.08;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.38) * 0.07;
  });

  return (
    <group ref={group}>
      {LINKS.map((curve, index) => (
        <group key={index}>
          <Line points={curve.getPoints(40)} color="#354666" transparent opacity={0.2} lineWidth={1} />
          <DataPulse curve={curve} index={index} />
        </group>
      ))}

      {NODES.map(([x, y, z], index) => (
        <group key={index} position={[x, y, z]}>
          <RoundedBox args={[0.78, 0.54, 0.1]} radius={0.08} smoothness={3}>
            <meshBasicMaterial color="#354666" transparent opacity={0.13} />
          </RoundedBox>
          <mesh position={[-0.24, 0.1, 0.07]}>
            <boxGeometry args={[0.12, 0.12, 0.015]} />
            <meshBasicMaterial color={index === 1 || index === 2 ? "#13C182" : "#354666"} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0.08, 0.12, 0.07]}>
            <boxGeometry args={[0.34, 0.035, 0.015]} />
            <meshBasicMaterial color="#354666" transparent opacity={0.35} />
          </mesh>
          <mesh position={[0.04, -0.1, 0.07]}>
            <boxGeometry args={[0.48, 0.035, 0.015]} />
            <meshBasicMaterial color="#354666" transparent opacity={0.2} />
          </mesh>
        </group>
      ))}

      <RoundedBox args={[1.1, 0.92, 0.18]} radius={0.16} smoothness={4}>
        <meshBasicMaterial color="#354666" transparent opacity={0.38} />
      </RoundedBox>
      {[-0.24, 0, 0.24].map((x) => (
        <RoundedBox key={x} position={[x, 0, 0.11]} args={[0.14, 0.43, 0.02]} radius={0.04} smoothness={2}>
          <meshBasicMaterial color={x === 0 ? "#13C182" : "#FFFFFF"} transparent opacity={0.72} />
        </RoundedBox>
      ))}
    </group>
  );
}

export default function AuthScene({ onReady }: { onReady: () => void }) {
  const [ready, setReady] = useState(false);

  return (
    <Canvas
      className={`!absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      fallback={null}
      onCreated={() => {
        setReady(true);
        onReady();
      }}
    >
      <Network />
    </Canvas>
  );
}

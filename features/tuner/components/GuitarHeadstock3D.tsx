"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

/* ── Colors ────────────────────────────────────────────────────────────────── */
const BODY = "#2a2a2a";
const BODY_SIDE = "#222";
const NUT = "#e8e0d0";
const PEG_METAL = "#c0bdb8";
const PEG_CAP = "#9a9590";
const FRET = "#b8b5b0";
const STRING_COLOR = "#999";
const DOT = "#444";

/* ── Headstock shape (extruded) ────────────────────────────────────────────── */
function HeadstockBody() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    // Start at bottom-left of headstock
    s.moveTo(-0.38, 0);
    // Left side curves up
    s.lineTo(-0.42, 0.15);
    s.quadraticCurveTo(-0.44, 0.6, -0.42, 0.95);
    // Top-left horn
    s.quadraticCurveTo(-0.42, 1.15, -0.3, 1.25);
    // Top curve
    s.quadraticCurveTo(-0.1, 1.35, 0, 1.35);
    s.quadraticCurveTo(0.1, 1.35, 0.3, 1.25);
    // Top-right horn
    s.quadraticCurveTo(0.42, 1.15, 0.42, 0.95);
    // Right side down
    s.quadraticCurveTo(0.44, 0.6, 0.42, 0.15);
    s.lineTo(0.38, 0);
    s.lineTo(-0.38, 0);
    return s;
  }, []);

  const extrudeSettings = useMemo(
    () => ({
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.01,
      bevelSegments: 3,
    }),
    [],
  );

  return (
    <mesh position={[0, 0, -0.06]} castShadow>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial
        color={BODY}
        roughness={0.35}
        metalness={0.05}
      />
    </mesh>
  );
}

/* ── Tuning peg (machine head) ─────────────────────────────────────────────── */
function TuningPeg({
  position,
  side,
}: {
  position: [number, number, number];
  side: "left" | "right";
}) {
  const xDir = side === "left" ? -1 : 1;
  return (
    <group position={position}>
      {/* Shaft through headstock */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
        <meshStandardMaterial
          color={PEG_METAL}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* String post on front */}
      <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.06, 12]} />
        <meshStandardMaterial
          color={PEG_METAL}
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>
      {/* Button/cap on back */}
      <group position={[xDir * 0.06, 0, -0.09]} rotation={[0, 0, side === "left" ? -Math.PI / 12 : Math.PI / 12]}>
        {/* Peg button — capsule shape */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.03, 0.06, 8, 12]} />
          <meshStandardMaterial
            color={PEG_CAP}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ── Nut ───────────────────────────────────────────────────────────────────── */
function Nut() {
  return (
    <mesh position={[0, -0.02, 0.06]}>
      <boxGeometry args={[0.72, 0.04, 0.04]} />
      <meshStandardMaterial color={NUT} roughness={0.5} metalness={0.05} />
    </mesh>
  );
}

/* ── Neck section (below headstock) ────────────────────────────────────────── */
function Neck() {
  return (
    <group position={[0, -1.0, 0]}>
      {/* Neck body */}
      <mesh>
        <boxGeometry args={[0.42, 1.9, 0.12]} />
        <meshStandardMaterial color={BODY_SIDE} roughness={0.4} metalness={0.02} />
      </mesh>
      {/* Fretboard surface */}
      <mesh position={[0, 0, 0.061]}>
        <boxGeometry args={[0.4, 1.9, 0.005]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.0} />
      </mesh>
      {/* Frets */}
      {[-0.75, -0.55, -0.37, -0.2, -0.05, 0.09, 0.22, 0.34, 0.45, 0.55, 0.64, 0.72].map((y, i) => (
        <mesh key={i} position={[0, y, 0.066]}>
          <boxGeometry args={[0.38, 0.012, 0.004]} />
          <meshStandardMaterial color={FRET} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      {/* Fret dots — 3rd, 5th, 7th, 9th */}
      {[-0.46, -0.13, 0.16, 0.5].map((y, i) => (
        <mesh key={`dot${i}`} position={[0, y, 0.066]}>
          <circleGeometry args={[0.018, 16]} />
          <meshStandardMaterial color={DOT} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Strings ───────────────────────────────────────────────────────────────── */
function Strings() {
  const stringX = [-0.14, -0.084, -0.028, 0.028, 0.084, 0.14];
  const thicknesses = [0.006, 0.0055, 0.005, 0.004, 0.0035, 0.003];

  return (
    <group>
      {stringX.map((x, i) => (
        <mesh key={i} position={[x, -0.15, 0.08]}>
          <cylinderGeometry args={[thicknesses[i], thicknesses[i], 2.6, 6]} />
          <meshStandardMaterial
            color={STRING_COLOR}
            metalness={0.9}
            roughness={0.15}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Full guitar headstock assembly ────────────────────────────────────────── */
function HeadstockAssembly() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      // Gentle breathing sway
      ref.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.4) * 0.06;
      ref.current.rotation.x =
        0.15 + Math.sin(state.clock.elapsedTime * 0.3 + 1) * 0.02;
    }
  });

  // Peg positions: 3 on each side
  const leftPegs: [number, number, number][] = [
    [-0.32, 0.35, 0],
    [-0.34, 0.65, 0],
    [-0.34, 0.95, 0],
  ];
  const rightPegs: [number, number, number][] = [
    [0.32, 0.35, 0],
    [0.34, 0.65, 0],
    [0.34, 0.95, 0],
  ];

  return (
    <group ref={ref} position={[0, -0.2, 0]}>
      <HeadstockBody />
      <Nut />
      <Neck />
      <Strings />
      {leftPegs.map((pos, i) => (
        <TuningPeg key={`l${i}`} position={pos} side="left" />
      ))}
      {rightPegs.map((pos, i) => (
        <TuningPeg key={`r${i}`} position={pos} side="right" />
      ))}
    </group>
  );
}

/* ── Exported component ────────────────────────────────────────────────────── */
export function GuitarHeadstock3D() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "rgba(200,245,0,0.2)",
              letterSpacing: "0.1em",
            }}
          >
            ЗАВАНТАЖЕННЯ...
          </div>
        }
      >
        <Canvas
          camera={{
            position: [0, 0.15, 2.6],
            fov: 34,
            near: 0.01,
            far: 20,
          }}
          style={{ background: "transparent" }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 4, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-2, 1, 3]} intensity={0.3} />
          <pointLight position={[0, 1, 2]} intensity={0.4} color="#fff" />
          <HeadstockAssembly />
          <Environment preset="studio" />
        </Canvas>
      </Suspense>
    </div>
  );
}

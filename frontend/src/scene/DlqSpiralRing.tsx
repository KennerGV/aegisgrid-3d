import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { TelemetryFrame } from '../types/telemetry';

interface DlqSpiralRingProps {
  telemetryRef: MutableRefObject<TelemetryFrame>;
}

const SPIRAL_POS: [number, number, number] = [9.6, 0, 3.2];
const SPIRAL_PARTICLES = 104;
const SPIRAL_SAMPLES = 240;

export function DlqSpiralRing({ telemetryRef }: DlqSpiralRingProps) {
  const spiralGroupRef = useRef<THREE.Group>(null);
  const counterRingRef = useRef<THREE.Group>(null);
  const vortexCoreRef = useRef<THREE.Mesh>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Build Archimedean glowing cyan spiral coil + perimeter tick markers
  const { spiralGeo, sampleCoords, tickAngles } = useMemo(() => {
    const turns = 4.0;
    const innerR = 0.26;
    const outerR = 1.5;
    const pts: THREE.Vector3[] = [];
    const coords = new Float32Array(SPIRAL_SAMPLES * 3);

    for (let i = 0; i < SPIRAL_SAMPLES; i++) {
      const u = i / (SPIRAL_SAMPLES - 1);
      const theta = u * turns * Math.PI * 2;
      const r = THREE.MathUtils.lerp(innerR, outerR, u);
      const x = Math.cos(theta) * r;
      const y = 0.21 + (1 - u) * 0.09;
      const z = Math.sin(theta) * r;

      pts.push(new THREE.Vector3(x, y, z));
      coords[i * 3] = x;
      coords[i * 3 + 1] = y;
      coords[i * 3 + 2] = z;
    }

    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 180, 0.026, 8, false);

    const ticks: number[] = [];
    for (let t = 0; t < 16; t++) {
      ticks.push((t / 16) * Math.PI * 2);
    }

    return { spiralGeo: geo, sampleCoords: coords, tickAngles: ticks };
  }, []);

  const cyanNeonHdr = useMemo(() => new THREE.Color(0.22, 2.3, 2.8), []);
  const cyanBrightHdr = useMemo(() => new THREE.Color(0.68, 2.9, 3.35), []);
  const cyanRimColor = useMemo(() => new THREE.Color(0.14, 1.6, 2.05), []);

  const phaseRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const frame = telemetryRef.current;

    const hasQueue = frame.dlqDepth > 0;
    const diverting = frame.circuitState === 'OPEN' || frame.failureInjected;
    const replaying = frame.replayActive;

    const spinDir = replaying ? -1 : 1;
    const spinSpeed = replaying ? 3.4 : diverting ? 1.6 : hasQueue ? 0.88 : 0.36;

    if (spiralGroupRef.current) {
      spiralGroupRef.current.rotation.y += dt * spinSpeed * spinDir;
    }

    if (counterRingRef.current) {
      counterRingRef.current.rotation.y -= dt * spinSpeed * 0.55 * spinDir;
    }

    if (vortexCoreRef.current) {
      const coreScale = replaying
        ? 1.25 + Math.sin(t * 14) * 0.18
        : diverting
          ? 1.05 + Math.sin(t * 6) * 0.12
          : 0.72 + Math.sin(t * 3) * 0.06;
      vortexCoreRef.current.scale.set(coreScale, 1, coreScale);
    }

    if (pulseRingRef.current) {
      if (replaying) {
        const wave = (t * 2.15) % 1;
        const s = 0.35 + wave * 1.7;
        pulseRingRef.current.scale.set(s, s, 1);
        pulseRingRef.current.visible = true;
        if (pulseRingRef.current.material instanceof THREE.MeshBasicMaterial) {
          pulseRingRef.current.material.opacity = (1 - wave) * 0.88;
        }
      } else {
        pulseRingRef.current.visible = false;
      }
    }

    // Update InstancedMesh queued packets orbiting the spiral buffer
    const pMesh = particleMeshRef.current;
    if (pMesh) {
      phaseRef.current += dt * (replaying ? 1.5 : diverting ? 0.75 : 0.28);

      const activeRatio = replaying
        ? 1.0
        : diverting
          ? Math.max(0.48, Math.min(1.0, frame.dlqDepth / 180))
          : hasQueue
            ? Math.max(0.26, Math.min(1.0, frame.dlqDepth / 180))
            : 0.14;

      const visibleCount = Math.floor(SPIRAL_PARTICLES * activeRatio);

      for (let i = 0; i < SPIRAL_PARTICLES; i++) {
        if (i >= visibleCount) {
          dummy.position.set(0, -50, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          pMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const baseU = i / SPIRAL_PARTICLES;
        const rawU = replaying
          ? (baseU + phaseRef.current) % 1
          : 1 - ((baseU + phaseRef.current) % 1);

        const idx = Math.min(SPIRAL_SAMPLES - 1, Math.floor(rawU * (SPIRAL_SAMPLES - 1)));
        const px = sampleCoords[idx * 3]!;
        const py = sampleCoords[idx * 3 + 1]! + 0.04;
        const pz = sampleCoords[idx * 3 + 2]!;

        const pulse = replaying ? 1.38 : 1.0;
        dummy.position.set(px, py, pz);
        dummy.rotation.set(0, rawU * Math.PI * 8, 0);
        dummy.scale.set(0.085 * pulse, 0.052 * pulse, 0.15 * pulse);
        dummy.updateMatrix();
        pMesh.setMatrixAt(i, dummy.matrix);
      }

      pMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={SPIRAL_POS}>
      {/* Multi-tiered beveled dark anodized titanium pedestal */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.86, 2.02, 0.1, 56]} />
        <meshStandardMaterial color="#0C1018" metalness={0.9} roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[1.64, 1.74, 0.06, 56]} />
        <meshStandardMaterial color="#151D2B" metalness={0.92} roughness={0.22} />
      </mesh>

      {/* Outer cyan containment halo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.17, 0]}>
        <ringGeometry args={[1.6, 1.66, 64]} />
        <meshBasicMaterial color={cyanRimColor} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Counter-rotating radial telemetry tick bezel */}
      <group ref={counterRingRef} position={[0, 0.175, 0]}>
        {tickAngles.map((ang, idx) => (
          <mesh
            key={`dlq-tick-${idx}`}
            position={[Math.cos(ang) * 1.73, 0, Math.sin(ang) * 1.73]}
            rotation={[0, -ang, 0]}
          >
            <boxGeometry args={[0.11, 0.025, 0.032]} />
            <meshBasicMaterial color={cyanRimColor} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* Central glowing cyan vortex core */}
      <mesh ref={vortexCoreRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <circleGeometry args={[0.24, 32]} />
        <meshBasicMaterial
          color={cyanBrightHdr}
          transparent
          opacity={0.78}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Rotating Archimedean glowing cyan spiral coil */}
      <group ref={spiralGroupRef}>
        <mesh geometry={spiralGeo}>
          <meshBasicMaterial color={cyanNeonHdr} toneMapped={false} />
        </mesh>
      </group>

      {/* Replay radial shockwave ring */}
      <mesh
        ref={pulseRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.24, 0]}
        visible={false}
      >
        <ringGeometry args={[0.92, 1.06, 64]} />
        <meshBasicMaterial
          color={cyanBrightHdr}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* InstancedMesh: Concentric DLQ Buffered & Replaying Packets */}
      <instancedMesh
        ref={particleMeshRef}
        args={[undefined, undefined, SPIRAL_PARTICLES]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={cyanBrightHdr} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

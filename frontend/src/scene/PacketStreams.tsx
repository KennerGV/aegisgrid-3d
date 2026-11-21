import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { TelemetryFrame } from '../types/telemetry';

interface PacketStreamsProps {
  telemetryRef: MutableRefObject<TelemetryFrame>;
}

interface BakedSpline {
  samples: number;
  positions: Float32Array;
  tangents: Float32Array;
  tubeGeometry: THREE.TubeGeometry;
  bedGeometry: THREE.TubeGeometry;
}

const SAMPLES_PER_CURVE = 200;

function bakeSpline(points: [number, number, number][], tubeRadius = 0.025): BakedSpline {
  const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.18);

  const positions = new Float32Array(SAMPLES_PER_CURVE * 3);
  const tangents = new Float32Array(SAMPLES_PER_CURVE * 3);

  for (let i = 0; i < SAMPLES_PER_CURVE; i++) {
    const t = i / (SAMPLES_PER_CURVE - 1);
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;

    tangents[i * 3] = tan.x;
    tangents[i * 3 + 1] = tan.y;
    tangents[i * 3 + 2] = tan.z;
  }

  const tubeGeometry = new THREE.TubeGeometry(curve, 76, tubeRadius, 6, false);
  const bedGeometry = new THREE.TubeGeometry(curve, 56, tubeRadius * 2.1, 4, false);
  return { samples: SAMPLES_PER_CURVE, positions, tangents, tubeGeometry, bedGeometry };
}

interface PacketSlot {
  routeIdx: number;
  offset: number;
  speedMul: number;
  laneY: number;
  scaleLen: number;
  isWorkerSegment: boolean;
}

interface AmbientMote {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  size: number;
}

const NOMINAL_PACKET_COUNT = 220;
const CYAN_PACKET_COUNT = 136;
const AMBIENT_MOTE_COUNT = 54;

const JUNCTION_PADS: { pos: [number, number, number]; kind: 'gold' | 'cyan' }[] = [
  { pos: [-3.1, 0.04, 0.2], kind: 'gold' },
  { pos: [-1.2, 0.04, 0.2], kind: 'gold' },
  { pos: [2.4, 0.04, 0.2], kind: 'gold' },
  { pos: [4.6, 0.04, 0.2], kind: 'gold' },
  { pos: [1.6, 0.04, -3.4], kind: 'gold' },
  { pos: [5.4, 0.04, -2.1], kind: 'gold' },
  { pos: [6.2, 0.05, 1.9], kind: 'cyan' },
  { pos: [5.2, 0.05, 3.6], kind: 'cyan' },
];

export function PacketStreams({ telemetryRef }: PacketStreamsProps) {
  const goldMeshRef = useRef<THREE.InstancedMesh>(null);
  const cyanMeshRef = useRef<THREE.InstancedMesh>(null);
  const moteMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  const {
    goldRoutes,
    cyanDivertRoutes,
    cyanReplayRoutes,
    goldSlots,
    cyanSlots,
    ambientMotes,
  } = useMemo(() => {
    const goldDefs: { pts: [number, number, number][]; isWorkerSegment: boolean; radius?: number }[] = [
      // Main 3-lane central artery: OPA Policy Gate -> Central Agent Reactor Core
      {
        pts: [
          [-5.7, 0.06, -0.15],
          [-3.2, 0.06, -0.15],
          [-1.3, 0.08, 0.0],
          [0.0, 0.08, 0.2],
        ],
        isWorkerSegment: false,
        radius: 0.03,
      },
      {
        pts: [
          [-5.7, 0.06, 0.2],
          [-3.0, 0.06, 0.2],
          [-1.2, 0.08, 0.2],
          [0.0, 0.08, 0.2],
        ],
        isWorkerSegment: false,
        radius: 0.035,
      },
      {
        pts: [
          [-5.7, 0.06, 0.55],
          [-3.1, 0.06, 0.55],
          [-1.2, 0.08, 0.4],
          [0.0, 0.08, 0.2],
        ],
        isWorkerSegment: false,
        radius: 0.03,
      },
      // North flank: OPA Gate -> North AI Agent Hub Towers -> API Gateway
      {
        pts: [
          [-5.7, 0.05, -2.6],
          [-2.6, 0.05, -2.6],
          [-0.4, 0.06, -3.5],
          [3.8, 0.07, -3.6],
        ],
        isWorkerSegment: false,
      },
      // Central Agent Reactor -> API Gateway (Twin golden conduits)
      {
        pts: [
          [0.0, 0.07, 0.2],
          [0.0, 0.07, -1.5],
          [1.6, 0.07, -3.4],
          [3.8, 0.07, -3.6],
        ],
        isWorkerSegment: false,
        radius: 0.032,
      },
      {
        pts: [
          [0.35, 0.07, 0.2],
          [1.8, 0.07, -0.8],
          [2.8, 0.07, -2.4],
          [3.8, 0.07, -3.6],
        ],
        isWorkerSegment: false,
      },
      // South flank: OPA Gate -> South Data-Vault District -> Central Spine
      {
        pts: [
          [-5.7, 0.05, 3.1],
          [-1.8, 0.05, 3.1],
          [1.2, 0.06, 3.1],
          [2.4, 0.06, 0.35],
        ],
        isWorkerSegment: false,
      },
      // API Gateway -> Worker Cluster (throttles/diverts when Circuit Breaker is OPEN)
      {
        pts: [
          [3.8, 0.07, -3.6],
          [5.4, 0.07, -2.1],
          [6.8, 0.07, -0.9],
          [6.8, 0.07, 0.2],
        ],
        isWorkerSegment: true,
        radius: 0.032,
      },
      // Central Spine -> Worker Cluster direct golden bus
      {
        pts: [
          [0.0, 0.07, 0.2],
          [2.4, 0.07, 0.2],
          [4.6, 0.07, 0.2],
          [6.8, 0.07, 0.2],
        ],
        isWorkerSegment: true,
        radius: 0.034,
      },
    ];

    const bakedGold = goldDefs.map((d) => ({
      baked: bakeSpline(d.pts, d.radius ?? 0.024),
      isWorkerSegment: d.isWorkerSegment,
    }));

    const bakedDivert = [
      bakeSpline(
        [
          [5.1, 0.08, 0.2],
          [6.2, 0.1, 1.9],
          [8.1, 0.14, 2.3],
          [9.6, 0.22, 3.2],
        ],
        0.028
      ),
      bakeSpline(
        [
          [6.8, 0.09, -1.3],
          [8.4, 0.12, -0.4],
          [9.9, 0.16, 1.4],
          [9.6, 0.22, 3.2],
        ],
        0.026
      ),
    ];

    const bakedReplay = [
      bakeSpline(
        [
          [9.6, 0.2, 3.2],
          [8.2, 0.1, 4.1],
          [5.2, 0.08, 3.6],
          [4.6, 0.08, 1.4],
          [6.8, 0.09, 0.2],
        ],
        0.03
      ),
      bakeSpline(
        [
          [9.6, 0.2, 3.2],
          [7.4, 0.09, 4.3],
          [3.4, 0.07, 4.2],
          [1.4, 0.07, 1.8],
          [6.8, 0.09, 0.2],
        ],
        0.024
      ),
    ];

    const gSlots: PacketSlot[] = [];
    for (let i = 0; i < NOMINAL_PACKET_COUNT; i++) {
      const routeIdx = i % bakedGold.length;
      gSlots.push({
        routeIdx,
        offset: (i * 0.6180339887) % 1,
        speedMul: 0.78 + ((i * 17) % 13) * 0.038,
        laneY: 0.022 + ((i % 3) - 1) * 0.012,
        scaleLen: 0.88 + ((i * 7) % 9) * 0.085,
        isWorkerSegment: bakedGold[routeIdx]?.isWorkerSegment ?? false,
      });
    }

    const cSlots: PacketSlot[] = [];
    for (let i = 0; i < CYAN_PACKET_COUNT; i++) {
      cSlots.push({
        routeIdx: i % 2,
        offset: (i * 0.381966) % 1,
        speedMul: 0.82 + ((i * 11) % 10) * 0.045,
        laneY: 0.026,
        scaleLen: 0.92 + ((i * 5) % 7) * 0.075,
        isWorkerSegment: i >= CYAN_PACKET_COUNT / 2,
      });
    }

    const motes: AmbientMote[] = [];
    for (let i = 0; i < AMBIENT_MOTE_COUNT; i++) {
      motes.push({
        x: -4.5 + Math.random() * 14.5,
        y: 0.6 + Math.random() * 4.4,
        z: -4.2 + Math.random() * 8.6,
        speed: 0.18 + Math.random() * 0.28,
        phase: Math.random() * Math.PI * 2,
        size: 0.022 + Math.random() * 0.026,
      });
    }

    return {
      goldRoutes: bakedGold,
      cyanDivertRoutes: bakedDivert,
      cyanReplayRoutes: bakedReplay,
      goldSlots: gSlots,
      cyanSlots: cSlots,
      ambientMotes: motes,
    };
  }, []);

  const goldHdrColor = useMemo(() => new THREE.Color(2.6, 1.62, 0.3), []);
  const cyanHdrColor = useMemo(() => new THREE.Color(0.2, 2.35, 2.75), []);
  const goldRailColor = useMemo(() => new THREE.Color(1.55, 0.95, 0.18), []);
  const cyanRailColor = useMemo(() => new THREE.Color(0.14, 1.45, 1.8), []);
  const moteHdrColor = useMemo(() => new THREE.Color(2.1, 1.5, 0.55), []);

  const clockAccumRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const elapsed = clock.getElapsedTime();
    const frame = telemetryRef.current;
    const rpsFactor = Math.max(0.55, frame.requestsPerSec / 180);
    clockAccumRef.current += dt * 0.42 * rpsFactor;
    const tBase = clockAccumRef.current;

    const breakerOpen = frame.circuitState === 'OPEN';
    const diverting = breakerOpen || frame.failureInjected;
    const replaying = frame.replayActive;

    // 1. Nominal Gold InstancedMesh packets
    const gMesh = goldMeshRef.current;
    if (gMesh) {
      for (let i = 0; i < NOMINAL_PACKET_COUNT; i++) {
        const slot = goldSlots[i]!;
        const route = goldRoutes[slot.routeIdx]!.baked;

        if (slot.isWorkerSegment && breakerOpen && i % 8 !== 0) {
          dummy.position.set(0, -50, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          gMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const u = (slot.offset + tBase * slot.speedMul) % 1;
        const idx = Math.min(route.samples - 1, Math.floor(u * (route.samples - 1)));
        const px = route.positions[idx * 3]!;
        const py = route.positions[idx * 3 + 1]! + slot.laneY;
        const pz = route.positions[idx * 3 + 2]!;

        const tx = route.tangents[idx * 3]!;
        const ty = route.tangents[idx * 3 + 1]!;
        const tz = route.tangents[idx * 3 + 2]!;

        dummy.position.set(px, py, pz);
        lookTarget.set(px + tx, py + ty, pz + tz);
        dummy.lookAt(lookTarget);

        const edgeFade = Math.min(1, Math.min(u * 10, (1 - u) * 10));
        dummy.scale.set(0.062 * edgeFade, 0.036 * edgeFade, 0.38 * slot.scaleLen * edgeFade);
        dummy.updateMatrix();
        gMesh.setMatrixAt(i, dummy.matrix);
      }
      gMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Electric Cyan Diversion & Replay InstancedMesh packets
    const cMesh = cyanMeshRef.current;
    if (cMesh) {
      for (let i = 0; i < CYAN_PACKET_COUNT; i++) {
        const slot = cyanSlots[i]!;
        const isReplaySlot = slot.isWorkerSegment;

        const active = isReplaySlot
          ? replaying || (frame.dlqDepth > 0 && i % 9 === 0)
          : diverting || (frame.dlqDepth > 0 && i % 10 === 0);

        if (!active) {
          dummy.position.set(0, -50, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          cMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const route = isReplaySlot
          ? cyanReplayRoutes[slot.routeIdx]!
          : cyanDivertRoutes[slot.routeIdx]!;

        const speedBoost = isReplaySlot && replaying ? 1.65 : 1.15;
        const u = (slot.offset + tBase * slot.speedMul * speedBoost) % 1;
        const idx = Math.min(route.samples - 1, Math.floor(u * (route.samples - 1)));

        const px = route.positions[idx * 3]!;
        const py = route.positions[idx * 3 + 1]! + slot.laneY;
        const pz = route.positions[idx * 3 + 2]!;

        const tx = route.tangents[idx * 3]!;
        const ty = route.tangents[idx * 3 + 1]!;
        const tz = route.tangents[idx * 3 + 2]!;

        dummy.position.set(px, py, pz);
        lookTarget.set(px + tx, py + ty, pz + tz);
        dummy.lookAt(lookTarget);

        const edgeFade = Math.min(1, Math.min(u * 9, (1 - u) * 9));
        const widthMul = isReplaySlot && replaying ? 1.25 : 1.0;
        dummy.scale.set(
          0.072 * widthMul * edgeFade,
          0.04 * edgeFade,
          0.4 * slot.scaleLen * widthMul * edgeFade
        );
        dummy.updateMatrix();
        cMesh.setMatrixAt(i, dummy.matrix);
      }
      cMesh.instanceMatrix.needsUpdate = true;
    }

    // 3. Subtle atmospheric floating micro-data motes above skyline
    const mMesh = moteMeshRef.current;
    if (mMesh) {
      for (let i = 0; i < AMBIENT_MOTE_COUNT; i++) {
        const m = ambientMotes[i]!;
        const yDrift = ((m.y + elapsed * m.speed) % 4.6) + 0.5;
        const alphaScale = Math.sin((yDrift / 5.1) * Math.PI);
        dummy.position.set(
          m.x + Math.sin(elapsed * 0.45 + m.phase) * 0.18,
          yDrift,
          m.z + Math.cos(elapsed * 0.4 + m.phase) * 0.18
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(m.size * Math.max(0.05, alphaScale));
        dummy.updateMatrix();
        mMesh.setMatrixAt(i, dummy.matrix);
      }
      mMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Metallic cable-tray beds + glowing HDR fiber cores for golden highways */}
      {goldRoutes.map((r, idx) => (
        <group key={`gold-conduit-${idx}`}>
          <mesh geometry={r.baked.bedGeometry} position={[0, -0.02, 0]}>
            <meshStandardMaterial color="#101520" metalness={0.88} roughness={0.3} />
          </mesh>
          <mesh geometry={r.baked.tubeGeometry}>
            <meshBasicMaterial
              color={goldRailColor}
              transparent
              opacity={0.46}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Metallic cable-tray beds + glowing HDR fiber cores for cyan DLQ conduits */}
      {[...cyanDivertRoutes, ...cyanReplayRoutes].map((r, idx) => (
        <group key={`cyan-conduit-${idx}`}>
          <mesh geometry={r.bedGeometry} position={[0, -0.02, 0]}>
            <meshStandardMaterial color="#0C1620" metalness={0.88} roughness={0.3} />
          </mesh>
          <mesh geometry={r.tubeGeometry}>
            <meshBasicMaterial
              color={cyanRailColor}
              transparent
              opacity={0.4}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Glowing circuit junction nodes where avenues branch */}
      {JUNCTION_PADS.map((j, idx) => (
        <group key={`junc-${idx}`} position={j.pos}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.2, 24]} />
            <meshBasicMaterial
              color={j.kind === 'cyan' ? cyanRailColor : goldRailColor}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <circleGeometry args={[0.07, 16]} />
            <meshBasicMaterial
              color={j.kind === 'cyan' ? cyanHdrColor : goldHdrColor}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Locked-60-FPS InstancedMesh: Warm Gold Nominal Data Stream */}
      <instancedMesh
        ref={goldMeshRef}
        args={[undefined, undefined, NOMINAL_PACKET_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={goldHdrColor} toneMapped={false} />
      </instancedMesh>

      {/* Locked-60-FPS InstancedMesh: Electric Cyan DLQ Diversion & Replay Stream */}
      <instancedMesh
        ref={cyanMeshRef}
        args={[undefined, undefined, CYAN_PACKET_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={cyanHdrColor} toneMapped={false} />
      </instancedMesh>

      {/* Locked-60-FPS InstancedMesh: Atmospheric Skyline Micro-Motes */}
      <instancedMesh
        ref={moteMeshRef}
        args={[undefined, undefined, AMBIENT_MOTE_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={moteHdrColor} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

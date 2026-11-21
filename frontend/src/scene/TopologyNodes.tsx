import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MutableRefObject, RefObject } from 'react';
import type { TelemetryFrame, VaultBlueprintId } from '../types/telemetry';

interface TopologyNodesProps {
  telemetryRef: MutableRefObject<TelemetryFrame>;
  portalRef: RefObject<HTMLElement>;
  onSelectBlueprint?: (id: VaultBlueprintId) => void;
}

interface TowerSpec {
  pos: [number, number, number];
  size: [number, number, number];
  crownHeight?: number;
  hasSpire?: boolean;
  hasGoldCore?: boolean;
  accentKind: 'gold' | 'cyan';
  seed: number;
}

const AGENT_HUB_TOWERS: TowerSpec[] = [
  // Tall signature skyscrapers flanking Central Core (360° lit facades + spires)
  { pos: [-1.55, 0, -1.55], size: [0.96, 3.9, 0.96], crownHeight: 0.5, hasSpire: true, hasGoldCore: true, accentKind: 'gold', seed: 1.1 },
  { pos: [0.15, 0, -2.15], size: [1.06, 4.4, 1.06], crownHeight: 0.62, hasSpire: true, hasGoldCore: true, accentKind: 'gold', seed: 2.3 },
  { pos: [1.55, 0, -0.75], size: [0.9, 3.7, 0.9], crownHeight: 0.65, hasSpire: true, hasGoldCore: true, accentKind: 'gold', seed: 3.7 },
  { pos: [-2.45, 0, -0.85], size: [0.94, 3.0, 0.94], crownHeight: 0.38, hasGoldCore: true, accentKind: 'gold', seed: 4.5 },
  { pos: [-3.15, 0, -2.1], size: [1.08, 2.6, 1.08], crownHeight: 0.34, hasGoldCore: true, accentKind: 'gold', seed: 5.9 },
  { pos: [-2.55, 0, 0.95], size: [0.98, 2.3, 0.98], crownHeight: 0.3, hasGoldCore: true, accentKind: 'gold', seed: 6.4 },
  { pos: [-1.45, 0, 1.45], size: [0.86, 2.7, 0.86], crownHeight: 0.35, hasGoldCore: true, accentKind: 'gold', seed: 7.2 },
  { pos: [1.65, 0, -2.35], size: [0.84, 2.4, 0.84], crownHeight: 0.28, hasGoldCore: true, accentKind: 'gold', seed: 8.8 },
  { pos: [-4.15, 0, -1.65], size: [1.18, 1.25, 1.48], crownHeight: 0.16, accentKind: 'gold', seed: 9.1 },

  // Foreground South-East Data-Vault Sub-District
  { pos: [0.65, 0, 2.25], size: [1.14, 2.0, 1.14], crownHeight: 0.25, hasGoldCore: true, accentKind: 'cyan', seed: 10.4 },
  { pos: [2.15, 0, 1.75], size: [1.2, 2.2, 1.2], crownHeight: 0.28, hasGoldCore: true, accentKind: 'gold', seed: 11.7 },
  { pos: [3.55, 0, 2.35], size: [0.94, 2.1, 0.94], crownHeight: 0.24, hasGoldCore: true, accentKind: 'gold', seed: 12.2 },
  { pos: [1.95, 0, 3.45], size: [0.86, 0.95, 0.86], crownHeight: 0.12, accentKind: 'cyan', seed: 13.5 },
  { pos: [2.95, 0, 3.65], size: [0.86, 0.88, 0.86], crownHeight: 0.12, accentKind: 'gold', seed: 14.1 },
  { pos: [0.95, 0, 4.15], size: [1.38, 0.82, 1.16], crownHeight: 0.1, accentKind: 'gold', seed: 15.6 },
];

const AUX_MICRO_PODS: [number, number, number][] = [
  [-1.3, 0, -4.1],
  [-0.55, 0, -4.35],
  [0.25, 0, -4.55],
  [1.05, 0, -4.35],
  [-0.85, 0, -3.45],
  [0.65, 0, -3.55],
];

const WORKER_OFFSETS: [number, number][] = [
  [-0.58, -0.58],
  [0.58, -0.58],
  [-0.58, 0.58],
  [0.58, 0.58],
];

// Procedural GLSL 4-sided illuminated window matrix + vertical light seam shader
const FACADE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FACADE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uPrimaryColor;
  uniform vec2 uGrid;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 gv = vUv * uGrid;
    vec2 id = floor(gv);
    vec2 f = fract(gv);

    // Crisp architectural window panes
    float maskX = step(0.15, f.x) * step(f.x, 0.85);
    float maskY = step(0.22, f.y) * step(f.y, 0.78);
    float windowMask = maskX * maskY;

    float rnd = hash21(id + uSeed);
    // ~54% of windows warmly illuminated across all 4 facades
    float lit = step(0.46, rnd);
    float pulse = 0.82 + 0.18 * sin(uTime * (1.2 + rnd * 2.6) + rnd * 18.0);

    // Vertical center light fin + subtle horizontal floor accent
    float centerSeam = smoothstep(0.055, 0.0, abs(vUv.x - 0.5)) * 0.92;

    float brightness = (windowMask * lit * pulse * (0.55 + 0.55 * rnd)) + centerSeam;
    if (brightness < 0.05) discard;

    gl_FragColor = vec4(uPrimaryColor * brightness, clamp(brightness, 0.0, 0.96));
  }
`;

function TowerFacadeFace({
  position,
  rotation,
  width,
  height,
  seed,
  accentKind,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  seed: number;
  accentKind: 'gold' | 'cyan';
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: seed },
      uPrimaryColor: {
        value:
          accentKind === 'cyan'
            ? new THREE.Color(0.24, 1.95, 2.45)
            : new THREE.Color(2.3, 1.42, 0.26),
      },
      uGrid: {
        value: new THREE.Vector2(
          Math.max(4, Math.round(width * 7)),
          Math.max(4, Math.round(height * 6.5))
        ),
      },
    }),
    [width, height, seed, accentKind]
  );

  useFrame(({ clock }) => {
    const m = matRef.current;
    if (m && m.uniforms.uTime) {
      m.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        key={`facade-v3-${seed.toFixed(2)}`}
        ref={matRef}
        vertexShader={FACADE_VERT}
        fragmentShader={FACADE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function TitaniumTower({ spec }: { spec: TowerSpec }) {
  const [x, y, z] = spec.pos;
  const [w, h, d] = spec.size;

  const goldEmissive = useMemo(() => new THREE.Color(2.35, 1.48, 0.25), []);
  const cyanEmissive = useMemo(() => new THREE.Color(0.2, 1.95, 2.4), []);
  const crownH = spec.crownHeight ?? 0.22;

  return (
    <group position={[x, y, z]}>
      {/* Two-stepped dark titanium architectural podium */}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[w * 1.18, 0.14, d * 1.18]} />
        <meshStandardMaterial color="#131926" metalness={0.84} roughness={0.28} />
        <Edges threshold={15} color="#5C3D16" />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[w * 1.07, 0.08, d * 1.07]} />
        <meshStandardMaterial color="#1A2233" metalness={0.86} roughness={0.24} />
      </mesh>

      {/* Main brushed dark anodized titanium tower shaft */}
      <mesh position={[0, h / 2 + 0.2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#192131" metalness={0.84} roughness={0.26} />
        <Edges
          threshold={15}
          color={spec.accentKind === 'cyan' ? '#0891B2' : '#D97706'}
        />
      </mesh>

      {/* 4 Chamfered vertical corner structural ribs */}
      {[
        [-w * 0.49, -d * 0.49],
        [w * 0.49, -d * 0.49],
        [-w * 0.49, d * 0.49],
        [w * 0.49, d * 0.49],
      ].map(([rx, rz], idx) => (
        <mesh key={`rib-${idx}`} position={[rx, h / 2 + 0.2, rz]}>
          <boxGeometry args={[0.075, h * 1.01, 0.075]} />
          <meshStandardMaterial color="#222C40" metalness={0.88} roughness={0.22} />
        </mesh>
      ))}

      {/* 360° ALL 4 FACES (+Z Front, -Z Back, -X Left, +X Right) Illuminated Window Curtain Walls */}
      <TowerFacadeFace
        position={[0, h * 0.46 + 0.2, d * 0.506]}
        rotation={[0, 0, 0]}
        width={w * 0.82}
        height={h * 0.8}
        seed={spec.seed + 0.11}
        accentKind={spec.accentKind}
      />
      <TowerFacadeFace
        position={[0, h * 0.46 + 0.2, -d * 0.506]}
        rotation={[0, Math.PI, 0]}
        width={w * 0.82}
        height={h * 0.8}
        seed={spec.seed + 3.37}
        accentKind={spec.accentKind}
      />
      <TowerFacadeFace
        position={[-w * 0.506, h * 0.46 + 0.2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={d * 0.82}
        height={h * 0.8}
        seed={spec.seed + 6.73}
        accentKind={spec.accentKind}
      />
      <TowerFacadeFace
        position={[w * 0.506, h * 0.46 + 0.2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={d * 0.82}
        height={h * 0.8}
        seed={spec.seed + 9.91}
        accentKind={spec.accentKind}
      />

      {/* Visible 360° Illuminated Upper-Story Atrium Band (protrudes slightly beyond shaft so visible on all 4 sides) */}
      {spec.hasGoldCore && (
        <group position={[0, h * 0.8 + 0.2, 0]}>
          <mesh>
            <boxGeometry args={[w * 1.014, h * 0.1, d * 1.014]} />
            <meshBasicMaterial
              color={spec.accentKind === 'cyan' ? cyanEmissive : goldEmissive}
              toneMapped={false}
            />
          </mesh>
          {/* Upper & lower titanium louver trim rings */}
          <mesh position={[0, h * 0.055, 0]}>
            <boxGeometry args={[w * 1.05, 0.03, d * 1.05]} />
            <meshStandardMaterial color="#232D42" metalness={0.88} roughness={0.22} />
          </mesh>
          <mesh position={[0, -h * 0.055, 0]}>
            <boxGeometry args={[w * 1.05, 0.03, d * 1.05]} />
            <meshStandardMaterial color="#232D42" metalness={0.88} roughness={0.22} />
          </mesh>
        </group>
      )}

      {/* Stepped architectural crown + mechanical penthouse */}
      <mesh position={[0, h + 0.2 + crownH / 2, 0]}>
        <boxGeometry args={[w * 0.72, crownH, d * 0.72]} />
        <meshStandardMaterial color="#1C2536" metalness={0.88} roughness={0.22} />
        <Edges threshold={15} color="#D97706" />
      </mesh>
      <mesh position={[0, h + 0.2 + crownH + 0.08, 0]}>
        <boxGeometry args={[w * 0.44, 0.16, d * 0.44]} />
        <meshStandardMaterial color="#151C2A" metalness={0.88} roughness={0.24} />
      </mesh>

      {/* Sleek tapered skyscraper spire & glowing tip beacon */}
      {spec.hasSpire && (
        <group position={[0, h + 0.2 + crownH + 0.16, 0]}>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.012, 0.055, 0.84, 8]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.86, 0]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color={goldEmissive} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function TopologyNodes({
  telemetryRef,
  portalRef,
  onSelectBlueprint,
}: TopologyNodesProps) {
  const reactorCrystalRef = useRef<THREE.Mesh>(null);
  const reactorRingRef = useRef<THREE.Mesh>(null);
  const workerStripRefs = useRef<(THREE.Mesh | null)[]>([]);

  const heroCoreGold = useMemo(() => new THREE.Color(2.75, 1.78, 0.38), []);
  const columnGold = useMemo(() => new THREE.Color(2.15, 1.35, 0.22), []);
  const gatewayGold = useMemo(() => new THREE.Color(2.45, 1.56, 0.3), []);
  const healthyGold = useMemo(() => new THREE.Color(2.1, 1.35, 0.24), []);
  const degradedAmber = useMemo(() => new THREE.Color(2.75, 0.7, 0.14), []);
  const replayCyan = useMemo(() => new THREE.Color(0.2, 2.4, 2.8), []);

  const padClamps = useMemo(() => {
    const list: { x: number; z: number; rot: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      list.push({
        x: Math.cos(a) * 2.12,
        z: Math.sin(a) * 2.12,
        rot: -a,
      });
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const frame = telemetryRef.current;

    if (reactorCrystalRef.current) {
      reactorCrystalRef.current.rotation.y = t * 0.65;
      const pulse = 0.94 + Math.sin(t * 2.8) * 0.06;
      reactorCrystalRef.current.scale.set(pulse, 1.05, pulse);
    }

    if (reactorRingRef.current) {
      reactorRingRef.current.rotation.z = -t * 0.45;
    }

    const isOpen = frame.circuitState === 'OPEN' || frame.failureInjected;
    const isReplay = frame.replayActive;
    const targetColor = isReplay ? replayCyan : isOpen ? degradedAmber : healthyGold;

    for (let i = 0; i < workerStripRefs.current.length; i++) {
      const m = workerStripRefs.current[i];
      if (m && m.material instanceof THREE.MeshBasicMaterial) {
        m.material.color.lerp(targetColor, 0.14);
      }
    }
  });

  return (
    <group>
      {/* =====================================================================
          0. URBAN DISTRICT TITANIUM ISLAND PLINTHS
          ===================================================================== */}
      <mesh position={[-1.4, 0.025, -1.85]}>
        <boxGeometry args={[6.9, 0.05, 3.2]} />
        <meshStandardMaterial color="#111622" metalness={0.82} roughness={0.34} />
        <Edges threshold={15} color="#2F3B52" />
      </mesh>
      <mesh position={[2.05, 0.025, 2.85]}>
        <boxGeometry args={[4.1, 0.05, 3.3]} />
        <meshStandardMaterial color="#111622" metalness={0.82} roughness={0.34} />
        <Edges threshold={15} color="#2F3B52" />
      </mesh>

      {/* =====================================================================
          1. CENTRAL HERO REACTOR MONOLITH (Heart of AI AGENT HUB at [0, 0, 0.2])
          ===================================================================== */}
      <group position={[0, 0, 0.2]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[2.3, 0.24, 2.3]} />
          <meshStandardMaterial color="#131926" metalness={0.86} roughness={0.26} />
          <Edges threshold={15} color="#B45309" />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <boxGeometry args={[1.98, 0.04, 1.98]} />
          <meshBasicMaterial color={columnGold} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <boxGeometry args={[1.82, 0.18, 1.82]} />
          <meshStandardMaterial color="#1A2233" metalness={0.88} roughness={0.22} />
          <Edges threshold={15} color="#F59E0B" />
        </mesh>

        {/* Internal 4-column golden fiber-optic array */}
        {[
          [-0.36, -0.36],
          [0.36, -0.36],
          [-0.36, 0.36],
          [0.36, 0.36],
        ].map(([fx, fz], idx) => (
          <mesh key={`fiber-${idx}`} position={[fx, 1.6, fz]}>
            <cylinderGeometry args={[0.045, 0.045, 2.15, 12]} />
            <meshBasicMaterial color={columnGold} toneMapped={false} />
          </mesh>
        ))}

        {/* Suspended rotating golden reactor prism */}
        <mesh ref={reactorCrystalRef} position={[0, 1.6, 0]}>
          <octahedronGeometry args={[0.56, 0]} />
          <meshBasicMaterial color={heroCoreGold} toneMapped={false} />
        </mesh>

        {/* Inner vertical warm-gold energy shaft */}
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[0.68, 2.12, 0.68]} />
          <meshBasicMaterial
            color={heroCoreGold}
            transparent
            opacity={0.72}
            toneMapped={false}
          />
        </mesh>

        {/* Internal rotating gyroscopic containment ring */}
        <mesh ref={reactorRingRef} position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.56, 0.022, 12, 36]} />
          <meshBasicMaterial color={heroCoreGold} toneMapped={false} />
        </mesh>

        {/* Reflective smoked-glass curtain atrium */}
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[1.38, 2.22, 1.38]} />
          <meshStandardMaterial
            color="#243146"
            metalness={0.92}
            roughness={0.1}
            transparent
            opacity={0.32}
          />
          <Edges threshold={15} color="#FBBF24" />
        </mesh>

        {/* 4 Heavy brushed-titanium corner exoskeleton columns */}
        {[
          [-0.68, -0.68],
          [0.68, -0.68],
          [-0.68, 0.68],
          [0.68, 0.68],
        ].map(([cx, cz], idx) => (
          <mesh key={`mullion-${idx}`} position={[cx, 1.6, cz]}>
            <boxGeometry args={[0.18, 2.3, 0.18]} />
            <meshStandardMaterial color="#182030" metalness={0.88} roughness={0.22} />
            <Edges threshold={15} color="#92400E" />
          </mesh>
        ))}

        {/* Two-tier cantilevered titanium crown cap */}
        <mesh position={[0, 2.84, 0]}>
          <boxGeometry args={[1.72, 0.24, 1.72]} />
          <meshStandardMaterial color="#192233" metalness={0.88} roughness={0.22} />
          <Edges threshold={15} color="#F59E0B" />
        </mesh>
        <mesh position={[0, 3.04, 0]}>
          <boxGeometry args={[1.18, 0.16, 1.18]} />
          <meshStandardMaterial color="#202A3E" metalness={0.88} roughness={0.2} />
          <Edges threshold={15} color="#FBBF24" />
        </mesh>
      </group>

      {/* =====================================================================
          2. AI AGENT HUB SKYSCRAPER DISTRICT & SATELLITE PODS (360° Lit)
          ===================================================================== */}
      {AGENT_HUB_TOWERS.map((spec, idx) => (
        <TitaniumTower key={`tower-${idx}`} spec={spec} />
      ))}

      {AUX_MICRO_PODS.map(([px, py, pz], idx) => (
        <group key={`pod-${idx}`} position={[px, py, pz]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.5, 0.6, 0.5]} />
            <meshStandardMaterial color="#182030" metalness={0.84} roughness={0.28} />
            <Edges threshold={15} color="#64748B" />
          </mesh>
          {/* 4-sided status wrap band + top light */}
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.515, 0.045, 0.515]} />
            <meshBasicMaterial color={healthyGold} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.61, 0]}>
            <boxGeometry args={[0.3, 0.03, 0.3]} />
            <meshBasicMaterial color={healthyGold} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Compact Floating Label: AI AGENT HUB */}
      <Html
        portal={portalRef}
        position={[-2.75, 3.85, -2.15]}
        center
        zIndexRange={[10, 0]}
      >
        <button
          type="button"
          onClick={() => onSelectBlueprint?.('dotnet-aot')}
          className="group pointer-events-auto cursor-pointer select-none flex flex-col items-center opacity-100 transition-opacity duration-200 focus:outline-none"
        >
          <div className="px-2 py-0.5 rounded bg-[#0C1018]/80 border border-amber-400/35 shadow-[0_4px_14px_rgba(0,0,0,0.75)] backdrop-blur-md transition group-hover:border-amber-400/80">
            <span className="text-[9px] font-bold tracking-[0.14em] text-slate-100 whitespace-nowrap leading-none">
              AI AGENT HUB
            </span>
          </div>
          <div className="w-px h-3 bg-gradient-to-b from-amber-400/55 to-transparent" />
        </button>
      </Html>

      {/* =====================================================================
          3. API GATEWAY MONUMENTAL ZIGGURAT PAVILION ([3.8, 0, -3.6]) — 4-Sided Symmetry
          ===================================================================== */}
      <group position={[3.8, 0, -3.6]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[3.28, 0.24, 3.28]} />
          <meshStandardMaterial color="#131926" metalness={0.86} roughness={0.26} />
          <Edges threshold={15} color="#B45309" />
        </mesh>

        {/* 360° Perimeter amber telemetry beacons along ALL 4 sides of lower plinth */}
        {[-1.1, -0.55, 0, 0.55, 1.1].map((bPos, idx) => (
          <group key={`gw-beacon-${idx}`}>
            <mesh position={[bPos, 0.14, 1.65]}>
              <boxGeometry args={[0.16, 0.05, 0.04]} />
              <meshBasicMaterial color={gatewayGold} toneMapped={false} />
            </mesh>
            <mesh position={[bPos, 0.14, -1.65]}>
              <boxGeometry args={[0.16, 0.05, 0.04]} />
              <meshBasicMaterial color={gatewayGold} toneMapped={false} />
            </mesh>
            <mesh position={[-1.65, 0.14, bPos]}>
              <boxGeometry args={[0.04, 0.05, 0.16]} />
              <meshBasicMaterial color={gatewayGold} toneMapped={false} />
            </mesh>
            <mesh position={[1.65, 0.14, bPos]}>
              <boxGeometry args={[0.04, 0.05, 0.16]} />
              <meshBasicMaterial color={gatewayGold} toneMapped={false} />
            </mesh>
          </group>
        ))}

        {/* Secondary stepped titanium terrace */}
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[2.65, 0.2, 2.65]} />
          <meshStandardMaterial color="#1A2233" metalness={0.88} roughness={0.22} />
          <Edges threshold={15} color="#F59E0B" />
        </mesh>

        {/* Illuminated warm-gold gateway matrix chamber */}
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[1.98, 0.54, 1.98]} />
          <meshBasicMaterial color={gatewayGold} toneMapped={false} />
        </mesh>

        {/* Finely spaced titanium colonnade louvers around ALL 4 SIDES (+Z, -Z, -X, +X) */}
        {[-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((offset, idx) => (
          <group key={`louver-${idx}`}>
            <mesh position={[offset, 0.72, 1.01]}>
              <boxGeometry args={[0.085, 0.56, 0.075]} />
              <meshStandardMaterial color="#151C2A" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[offset, 0.72, -1.01]}>
              <boxGeometry args={[0.085, 0.56, 0.075]} />
              <meshStandardMaterial color="#151C2A" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[-1.01, 0.72, offset]}>
              <boxGeometry args={[0.075, 0.56, 0.085]} />
              <meshStandardMaterial color="#151C2A" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[1.01, 0.72, offset]}>
              <boxGeometry args={[0.075, 0.56, 0.085]} />
              <meshStandardMaterial color="#151C2A" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Cantilevered dark titanium gateway roof + rooftop array */}
        <mesh position={[0, 1.12, 0]}>
          <boxGeometry args={[2.38, 0.26, 2.38]} />
          <meshStandardMaterial color="#192233" metalness={0.88} roughness={0.22} />
          <Edges threshold={15} color="#FBBF24" />
        </mesh>
        <mesh position={[0, 1.31, 0]}>
          <boxGeometry args={[1.55, 0.12, 1.55]} />
          <meshStandardMaterial color="#202A3E" metalness={0.88} roughness={0.2} />
          <Edges threshold={15} color="#D97706" />
        </mesh>

        <Html
          portal={portalRef}
          position={[0, 1.95, -0.15]}
          center
          zIndexRange={[10, 0]}
        >
          <button
            type="button"
            onClick={() => onSelectBlueprint?.('dotnet-aot')}
            className="group pointer-events-auto cursor-pointer select-none flex flex-col items-center opacity-100 transition-opacity duration-200 focus:outline-none"
          >
            <div className="px-2 py-0.5 rounded bg-[#0C1018]/80 border border-amber-400/35 shadow-[0_4px_14px_rgba(0,0,0,0.75)] backdrop-blur-md transition group-hover:border-amber-400/80">
              <span className="text-[9px] font-bold tracking-[0.14em] text-slate-100 whitespace-nowrap leading-none">
                API GATEWAY
              </span>
            </div>
            <div className="w-px h-2.5 bg-gradient-to-b from-amber-400/55 to-transparent" />
          </button>
        </Html>
      </group>

      {/* =====================================================================
          4. WORKER CLUSTER (2x2 Titanium Compute Blade Pods at [6.8, 0, 0.2])
          ===================================================================== */}
      <group position={[6.8, 0, 0.2]}>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[2.16, 2.28, 0.08, 48]} />
          <meshStandardMaterial color="#111622" metalness={0.86} roughness={0.26} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[1.92, 1.98, 0.04, 48]} />
          <meshStandardMaterial color="#192131" metalness={0.88} roughness={0.22} />
        </mesh>

        <mesh position={[0, 0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 0.96, 48]} />
          <meshBasicMaterial color={healthyGold} transparent opacity={0.45} toneMapped={false} />
        </mesh>

        {padClamps.map((c, idx) => (
          <mesh key={`clamp-${idx}`} position={[c.x, 0.12, c.z]} rotation={[0, c.rot, 0]}>
            <boxGeometry args={[0.22, 0.12, 0.14]} />
            <meshStandardMaterial color="#222C40" metalness={0.88} roughness={0.22} />
          </mesh>
        ))}

        {WORKER_OFFSETS.map(([wx, wz], idx) => (
          <group key={`worker-pod-${idx}`} position={[wx, 0.11, wz]}>
            <mesh position={[0, 0.28, 0]}>
              <boxGeometry args={[0.8, 0.56, 0.8]} />
              <meshStandardMaterial color="#1A2334" metalness={0.88} roughness={0.22} />
              <Edges threshold={15} color="#D97706" />
            </mesh>
            {/* 4-sided glowing blade status band around each worker pod */}
            <mesh position={[0, 0.34, 0]}>
              <boxGeometry args={[0.82, 0.04, 0.82]} />
              <meshBasicMaterial color={healthyGold} transparent opacity={0.7} toneMapped={false} />
            </mesh>
            <mesh
              ref={(el) => {
                workerStripRefs.current[idx] = el;
              }}
              position={[0, 0.57, 0]}
            >
              <boxGeometry args={[0.56, 0.05, 0.56]} />
              <meshBasicMaterial color={healthyGold} toneMapped={false} />
            </mesh>
          </group>
        ))}

        {/* Compact WORKER CLUSTER label offset front-left of pad */}
        <Html
          portal={portalRef}
          position={[-1.55, 0.22, 1.85]}
          center
          zIndexRange={[10, 0]}
        >
          <button
            type="button"
            onClick={() => onSelectBlueprint?.('webhook-dlq')}
            className="pointer-events-auto cursor-pointer select-none px-1.5 py-0.5 rounded bg-[#0A0E15]/80 border border-slate-500/40 backdrop-blur-md opacity-100 hover:border-amber-400/65 transition"
          >
            <span className="text-[8px] font-semibold tracking-[0.13em] text-slate-300 whitespace-nowrap leading-none">
              WORKER CLUSTER
            </span>
          </button>
        </Html>
      </group>

      {/* =====================================================================
          5. DLQ RECOVERY CALLOUT LABEL (offset below/right of cyan spiral at [9.6, 0, 3.2])
          ===================================================================== */}
      <Html
        portal={portalRef}
        position={[9.15, 0.08, 6.25]}
        center
        zIndexRange={[10, 0]}
      >
        <button
          type="button"
          onClick={() => onSelectBlueprint?.('webhook-dlq')}
          className="group pointer-events-auto cursor-pointer select-none flex flex-col items-start px-2 py-1 rounded bg-[#07131A]/80 border-l-2 border-cyan-400 border-t border-r border-b border-t-cyan-400/20 border-r-cyan-400/20 border-b-cyan-400/20 shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-md opacity-100 hover:border-cyan-300 transition"
        >
          <span className="text-[8.5px] font-bold tracking-[0.12em] text-cyan-200 whitespace-nowrap leading-tight">
            DLQ (DEAD-LETTER QUEUE)
          </span>
          <span className="text-[8px] font-semibold tracking-[0.14em] text-cyan-400 whitespace-nowrap leading-tight">
            RECOVERY
          </span>
        </button>
      </Html>
    </group>
  );
}

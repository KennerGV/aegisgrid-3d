import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MutableRefObject, RefObject } from 'react';
import type { TelemetryFrame, VaultBlueprintId } from '../types/telemetry';

interface OpaPolicyShieldProps {
  telemetryRef: MutableRefObject<TelemetryFrame>;
  portalRef: RefObject<HTMLElement>;
  mcpAttackActive: boolean;
  onSelectBlueprint?: (id: VaultBlueprintId) => void;
}

const SHIELD_X = -5.8;
const SHIELD_Z_CENTER = 0.2;
const SHIELD_WIDTH = 9.6;
const SHIELD_HEIGHT = 2.35;

const ATTACK_SHARD_COUNT = 72;
const SPARK_COUNT = 140;

const SHIELD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHIELD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uAttack;

  varying vec2 vUv;

  // Procedural hexagonal distance field
  float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, normalize(vec2(1.0, 1.7320508)));
    return max(c, p.x);
  }

  float hexGrid(vec2 uv, float scale) {
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(uv * scale, r) - h;
    vec2 b = mod(uv * scale - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    float d = 0.5 - hexDist(gv);
    return smoothstep(0.06, 0.012, d);
  }

  void main() {
    // Aspect-corrected coordinates (width 9.6, height 2.35)
    vec2 metricUv = vec2(vUv.x * 9.6, vUv.y * 2.35);
    float hex = hexGrid(metricUv, 2.8);

    // Subtle vertical scanline sweep
    float scan = smoothstep(0.32, 0.0, abs(fract(vUv.y - uTime * 0.28) - 0.5)) * 0.28;

    // Bright edge framing at top, bottom, left, right
    float borderBottom = smoothstep(0.14, 0.0, vUv.y) * 0.65;
    float borderTop = smoothstep(0.9, 1.0, vUv.y) * 0.55;
    float borderSides = (smoothstep(0.04, 0.0, vUv.x) + smoothstep(0.96, 1.0, vUv.x)) * 0.55;

    // Dual concentric shockwave ripples at impact epicenters during MCP attack
    vec2 hit1 = vec2(3.35, 1.05);
    vec2 hit2 = vec2(6.35, 0.95);
    float d1 = length(metricUv - hit1);
    float d2 = length(metricUv - hit2);

    float wave1 = sin(d1 * 8.5 - uTime * 14.0) * 0.5 + 0.5;
    float ripple1 = exp(-d1 * 1.15) * pow(wave1, 3.0) * uAttack * 1.85;

    float wave2 = sin(d2 * 8.5 - uTime * 15.5 + 1.4) * 0.5 + 0.5;
    float ripple2 = exp(-d2 * 1.1) * pow(wave2, 3.0) * uAttack * 1.85;

    float totalRipples = ripple1 + ripple2;

    vec3 baseGold = vec3(1.9, 1.18, 0.2);
    vec3 flareAmber = vec3(3.4, 1.85, 0.35);
    vec3 col = mix(baseGold, flareAmber, clamp(totalRipples + uAttack * 0.35, 0.0, 1.0));

    float alpha = 0.09 + hex * (0.24 + uAttack * 0.28) + scan + borderBottom + borderTop + borderSides + totalRipples * 0.65;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
  }
`;

interface AttackShard {
  progress: number;
  speed: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotSpeed: number;
}

interface DeflectionSpark {
  age: number;
  life: number;
  originY: number;
  originZ: number;
  vx: number;
  vy: number;
  vz: number;
}

export function OpaPolicyShield({
  telemetryRef,
  portalRef,
  mcpAttackActive,
  onSelectBlueprint,
}: OpaPolicyShieldProps) {
  const shieldMatRef = useRef<THREE.ShaderMaterial>(null);
  const impactFlash1Ref = useRef<THREE.Mesh>(null);
  const impactFlash2Ref = useRef<THREE.Mesh>(null);
  const attackMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparkMeshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const shieldUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAttack: { value: 0 },
    }),
    []
  );

  const { shards, sparks, horizontalRails, emitterBases } = useMemo(() => {
    const sList: AttackShard[] = [];
    for (let i = 0; i < ATTACK_SHARD_COUNT; i++) {
      const clusterZ = i % 2 === 0 ? -1.45 : 1.55;
      sList.push({
        progress: Math.random(),
        speed: 0.68 + Math.random() * 0.58,
        y: 0.42 + Math.random() * 1.5,
        z: clusterZ + (Math.random() - 0.5) * 2.35,
        scaleX: 0.44 + Math.random() * 0.38,
        scaleY: 0.2 + Math.random() * 0.22,
        scaleZ: 0.07 + Math.random() * 0.08,
        rotSpeed: (Math.random() - 0.5) * 1.8,
      });
    }

    const spList: DeflectionSpark[] = [];
    for (let i = 0; i < SPARK_COUNT; i++) {
      const clusterZ = i % 2 === 0 ? -1.45 : 1.55;
      spList.push({
        age: Math.random(),
        life: 0.4 + Math.random() * 0.48,
        originY: 0.98 + (Math.random() - 0.5) * 0.85,
        originZ: clusterZ + (Math.random() - 0.5) * 1.15,
        vx: -(1.9 + Math.random() * 4.1),
        vy: (Math.random() - 0.26) * 4.5,
        vz: (Math.random() - 0.5) * 4.8,
      });
    }

    const hRails: number[] = [];
    const railSteps = 7;
    for (let r = 0; r <= railSteps; r++) {
      hRails.push((r / railSteps) * SHIELD_HEIGHT);
    }

    const emitters: number[] = [-4.8, -2.4, 0, 2.4, 4.8];

    return { shards: sList, sparks: spList, horizontalRails: hRails, emitterBases: emitters };
  }, []);

  const goldRailHdr = useMemo(() => new THREE.Color(2.45, 1.62, 0.34), []);
  const goldFrameHdr = useMemo(() => new THREE.Color(3.15, 2.05, 0.48), []);
  const crimsonHdr = useMemo(() => new THREE.Color(2.65, 0.24, 0.22), []);
  const sparkHdr = useMemo(() => new THREE.Color(3.5, 2.15, 0.42), []);

  const attackIntensityRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const liveAttack = telemetryRef.current.mcpAttackActive;

    const targetIntensity = liveAttack ? 1.0 : 0.0;
    attackIntensityRef.current = THREE.MathUtils.lerp(
      attackIntensityRef.current,
      targetIntensity,
      dt * 4.8
    );
    const intensity = attackIntensityRef.current;

    const sm = shieldMatRef.current;
    if (sm && sm.uniforms.uTime && sm.uniforms.uAttack) {
      sm.uniforms.uTime.value = t;
      sm.uniforms.uAttack.value = intensity;
    }

    if (impactFlash1Ref.current) {
      const f1 = intensity * (0.78 + Math.sin(t * 20.0) * 0.24);
      impactFlash1Ref.current.scale.setScalar(Math.max(0.001, f1));
    }
    if (impactFlash2Ref.current) {
      const f2 = intensity * (0.78 + Math.cos(t * 24.0) * 0.24);
      impactFlash2Ref.current.scale.setScalar(Math.max(0.001, f2));
    }

    // 1. Crimson MCP Attack Shards InstancedMesh
    const aMesh = attackMeshRef.current;
    if (aMesh) {
      for (let i = 0; i < ATTACK_SHARD_COUNT; i++) {
        const s = shards[i]!;
        if (intensity < 0.03) {
          dummy.position.set(0, -50, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          aMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        s.progress += dt * s.speed;
        if (s.progress >= 1.0) {
          s.progress %= 1.0;
        }

        const x = THREE.MathUtils.lerp(-14.8, SHIELD_X - 0.14, s.progress);
        const fadeIn = Math.min(1, s.progress * 4.5);
        const impactCrunch = s.progress > 0.94 ? (1 - s.progress) / 0.06 : 1;
        const vis = intensity * fadeIn * impactCrunch;

        dummy.position.set(x, s.y, SHIELD_Z_CENTER + s.z);
        dummy.rotation.set(t * s.rotSpeed * 0.25, 0, (1 - s.progress) * 0.08);
        dummy.scale.set(s.scaleX * vis, s.scaleY * vis, s.scaleZ * vis);
        dummy.updateMatrix();
        aMesh.setMatrixAt(i, dummy.matrix);
      }
      aMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Deflection Sparks InstancedMesh bursting off the gold barrier
    const spMesh = sparkMeshRef.current;
    if (spMesh) {
      for (let i = 0; i < SPARK_COUNT; i++) {
        const sp = sparks[i]!;
        if (intensity < 0.04) {
          dummy.position.set(0, -50, 0);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          spMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        sp.age += dt;
        if (sp.age >= sp.life) {
          sp.age = 0;
        }

        const u = sp.age / sp.life;
        const px = SHIELD_X - 0.06 + sp.vx * sp.age * 0.68;
        const py = Math.max(0.04, sp.originY + sp.vy * sp.age * 0.68 - 3.2 * sp.age * sp.age);
        const pz = SHIELD_Z_CENTER + sp.originZ + sp.vz * sp.age * 0.68;

        const fade = (1 - u) * intensity;
        dummy.position.set(px, py, pz);
        dummy.rotation.set(0, Math.atan2(sp.vz, sp.vx), Math.atan2(sp.vy, -sp.vx));
        dummy.scale.set(0.24 * fade, 0.032 * fade, 0.032 * fade);
        dummy.updateMatrix();
        spMesh.setMatrixAt(i, dummy.matrix);
      }
      spMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Left Perimeter Gold Hexagonal Laser Wall */}
      <group position={[SHIELD_X, 0, SHIELD_Z_CENTER]}>
        {/* Heavy dark-titanium emitter rail anchored into obsidian floor */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.38, 0.1, SHIELD_WIDTH + 0.5]} />
          <meshStandardMaterial color="#111622" metalness={0.92} roughness={0.22} />
          <Edges threshold={15} color="#B45309" />
        </mesh>

        {/* Glowing laser aperture slot */}
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[0.14, 0.04, SHIELD_WIDTH + 0.2]} />
          <meshBasicMaterial color={goldFrameHdr} toneMapped={false} />
        </mesh>

        {/* Ground projector stanchions along the wall */}
        {emitterBases.map((zPos, idx) => (
          <mesh key={`emitter-${idx}`} position={[0, 0.12, zPos]}>
            <boxGeometry args={[0.52, 0.18, 0.28]} />
            <meshStandardMaterial color="#182030" metalness={0.92} roughness={0.2} />
            <Edges threshold={15} color="#D97706" />
          </mesh>
        ))}

        {/* Top perimeter emitter beam */}
        <mesh position={[0, SHIELD_HEIGHT, 0]}>
          <boxGeometry args={[0.09, 0.07, SHIELD_WIDTH + 0.22]} />
          <meshBasicMaterial color={goldFrameHdr} toneMapped={false} />
        </mesh>

        {/* Heavy end-cap titanium & gold pylons */}
        {[-SHIELD_WIDTH / 2, SHIELD_WIDTH / 2].map((zEnd, idx) => (
          <group key={`pylon-${idx}`} position={[0, SHIELD_HEIGHT / 2, zEnd]}>
            <mesh>
              <boxGeometry args={[0.24, SHIELD_HEIGHT + 0.16, 0.24]} />
              <meshStandardMaterial color="#141B28" metalness={0.92} roughness={0.2} />
              <Edges threshold={15} color="#F59E0B" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.1, SHIELD_HEIGHT + 0.04, 0.1]} />
              <meshBasicMaterial color={goldFrameHdr} toneMapped={false} />
            </mesh>
          </group>
        ))}

        {/* Horizontal laser filaments */}
        {horizontalRails.map((ry, idx) => (
          <mesh key={`h-rail-${idx}`} position={[0, ry, 0]}>
            <boxGeometry args={[0.024, 0.016, SHIELD_WIDTH]} />
            <meshBasicMaterial
              color={goldRailHdr}
              transparent
              opacity={idx === 0 || idx === horizontalRails.length - 1 ? 0.95 : 0.52}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Custom GLSL Hexagonal Force-Lattice + Shockwave Ripple Plane */}
        <mesh position={[0, SHIELD_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[SHIELD_WIDTH, SHIELD_HEIGHT]} />
          <shaderMaterial
            key="opa-shield-shader-v3"
            ref={shieldMatRef}
            vertexShader={SHIELD_VERT}
            fragmentShader={SHIELD_FRAG}
            uniforms={shieldUniforms}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* Impact epicenters flaring during MCP attack */}
        <mesh
          ref={impactFlash1Ref}
          position={[-0.04, 1.05, -1.45]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={0.001}
        >
          <circleGeometry args={[0.75, 28]} />
          <meshBasicMaterial
            color={sparkHdr}
            transparent
            opacity={0.88}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <mesh
          ref={impactFlash2Ref}
          position={[-0.04, 0.95, 1.55]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={0.001}
        >
          <circleGeometry args={[0.85, 28]} />
          <meshBasicMaterial
            color={sparkHdr}
            transparent
            opacity={0.88}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* Compact Floating Shield Banner: bound directly to mcpAttackActive */}
        <Html
          portal={portalRef}
          position={[0, SHIELD_HEIGHT + 0.58, -0.85]}
          center
          zIndexRange={[10, 0]}
        >
          <button
            type="button"
            onClick={() => onSelectBlueprint?.('opa-mcp')}
            className={`pointer-events-auto cursor-pointer select-none px-2.5 py-1 rounded backdrop-blur-md opacity-100 transition-all duration-200 text-left shadow-[0_6px_18px_rgba(0,0,0,0.8)] ${
              mcpAttackActive
                ? 'bg-[#261207]/88 border border-amber-400/90 shadow-[0_0_18px_rgba(245,158,11,0.4)]'
                : 'bg-[#12100C]/80 border border-amber-500/40 hover:border-amber-400/80'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                  mcpAttackActive ? 'bg-red-500 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span
                className={`text-[9px] font-extrabold tracking-[0.14em] leading-none ${
                  mcpAttackActive ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {mcpAttackActive ? 'BLOCKED' : 'GUARDED'}
              </span>
            </div>
            <div className="text-[8px] font-bold tracking-[0.13em] text-amber-100/95 whitespace-nowrap mt-0.5 leading-tight">
              OPA POLICY GATE ACTIVE
            </div>
          </button>
        </Html>
      </group>

      {/* InstancedMesh: Incoming Crimson MCP Attack Shards (#EF4444) */}
      <instancedMesh
        ref={attackMeshRef}
        args={[undefined, undefined, ATTACK_SHARD_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={crimsonHdr} toneMapped={false} />
      </instancedMesh>

      {/* InstancedMesh: Golden Deflection Sparks */}
      <instancedMesh
        ref={sparkMeshRef}
        args={[undefined, undefined, SPARK_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={sparkHdr} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MutableRefObject, RefObject } from 'react';
import type { CircuitState, TelemetryFrame, VaultBlueprintId } from '../types/telemetry';

interface CircuitBreakerDomeProps {
  telemetryRef: MutableRefObject<TelemetryFrame>;
  portalRef: RefObject<HTMLElement>;
  circuitState: CircuitState;
  onSelectBlueprint?: (id: VaultBlueprintId) => void;
}

const DOME_POS: [number, number, number] = [6.8, 0.08, 0.2];
const DOME_RADIUS = 2.12;

const DOME_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const DOME_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uActivation;
  uniform vec3 uColorCore;
  uniform vec3 uColorRim;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

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
    return smoothstep(0.08, 0.015, d);
  }

  void main() {
    float ndotv = abs(dot(normalize(vNormalW), normalize(vViewDir)));
    float fresnel = pow(1.0 - clamp(ndotv, 0.0, 1.0), 1.75);
    float normY = clamp(vLocalPos.y / 2.12, 0.0, 1.0);
    float baseGlow = smoothstep(0.62, 0.0, normY) * 0.65;

    // Safe spherical hex coordinates (avoids atan(0,0) NaN on Windows D3D11 ANGLE)
    float safeX = abs(vLocalPos.x) < 0.0001 ? 0.0001 : vLocalPos.x;
    float az = atan(vLocalPos.z, safeX);
    float el = acos(normY);
    float hex = hexGrid(vec2(az * 1.8, el * 2.5), 4.0);

    // Downward cascading containment wave
    float cascade = smoothstep(0.3, 0.0, abs(fract(el * 1.5 - uTime * 0.5) - 0.5)) * 0.38;

    vec3 col = mix(uColorCore, uColorRim, clamp(fresnel * 1.25 + baseGlow + hex * 0.4, 0.0, 1.0));
    float alpha = (0.24 + fresnel * 0.72 + baseGlow * 0.48 + hex * 0.28 + cascade * 0.24) * uActivation;

    gl_FragColor = vec4(col * (1.35 + fresnel * 1.05), clamp(alpha, 0.0, 0.96));
  }
`;

export function CircuitBreakerDome({
  telemetryRef,
  portalRef,
  circuitState,
  onSelectBlueprint,
}: CircuitBreakerDomeProps) {
  const domeGroupRef = useRef<THREE.Group>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const wireMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const baseRingMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const initialUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivation: { value: 0 },
      uColorCore: { value: new THREE.Color('#EA580C') },
      uColorRim: { value: new THREE.Color(2.85, 1.48, 0.24) },
    }),
    []
  );

  const amberRimHdr = useMemo(() => new THREE.Color(2.85, 1.48, 0.24), []);
  const probeRimHdr = useMemo(() => new THREE.Color(1.9, 2.05, 0.45), []);
  const dormantRingColor = useMemo(() => new THREE.Color(0.65, 0.48, 0.18), []);
  const activeRingHdr = useMemo(() => new THREE.Color(3.1, 1.55, 0.24), []);

  const activationRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const state = telemetryRef.current.circuitState;

    const targetActivation = state === 'OPEN' ? 1.0 : state === 'HALF_OPEN' ? 0.68 : 0.0;
    activationRef.current = THREE.MathUtils.lerp(activationRef.current, targetActivation, dt * 5.5);
    const act = activationRef.current;

    // Update live ShaderMaterial instance uniforms directly (HMR & re-render safe)
    const mat = shaderMatRef.current;
    if (mat && mat.uniforms.uTime && mat.uniforms.uActivation && mat.uniforms.uColorRim) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uActivation.value = act;
      (mat.uniforms.uColorRim.value as THREE.Color).lerp(
        state === 'HALF_OPEN' ? probeRimHdr : amberRimHdr,
        0.14
      );
    }

    if (domeGroupRef.current) {
      const scaleY = Math.max(0.02, act);
      const scaleXZ = 0.88 + act * 0.12;
      domeGroupRef.current.scale.set(scaleXZ, scaleY, scaleXZ);
      domeGroupRef.current.visible = act > 0.015;
    }

    if (wireMatRef.current) {
      wireMatRef.current.opacity = act * (0.18 + Math.sin(t * 4.2) * 0.04);
    }

    if (baseRingMatRef.current) {
      baseRingMatRef.current.color.lerp(
        act > 0.25 ? activeRingHdr : dormantRingColor,
        0.15
      );
    }
  });

  const badgeStyles =
    circuitState === 'OPEN'
      ? {
          box: 'bg-[#281306]/88 border-amber-500/85 shadow-[0_0_18px_rgba(245,158,11,0.35)]',
          sub: 'OPEN (AMBER)',
          subColor: 'text-amber-400',
        }
      : circuitState === 'HALF_OPEN'
        ? {
            box: 'bg-[#221D08]/85 border-yellow-400/75',
            sub: 'HALF-OPEN (PROBE)',
            subColor: 'text-yellow-300',
          }
        : {
            box: 'bg-[#0D131D]/80 border-slate-600/45 hover:border-amber-400/60',
            sub: 'CLOSED (NOMINAL)',
            subColor: 'text-emerald-400',
          };

  return (
    <group position={DOME_POS}>
      {/* Persistent perimeter containment ring around the Worker Cluster */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <ringGeometry args={[DOME_RADIUS - 0.07, DOME_RADIUS + 0.05, 64]} />
        <meshBasicMaterial
          ref={baseRingMatRef}
          color={dormantRingColor}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Semitransparent Amber Hexagonal Energy Hemisphere + Geodesic Shell */}
      <group ref={domeGroupRef} visible={false}>
        <mesh renderOrder={4}>
          <sphereGeometry args={[DOME_RADIUS, 56, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <shaderMaterial
            key="cb-dome-shader-v3"
            ref={shaderMatRef}
            vertexShader={DOME_VERTEX_SHADER}
            fragmentShader={DOME_FRAGMENT_SHADER}
            uniforms={initialUniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* Crisp geodesic energy ribs guaranteeing unmistakable dome silhouette from 360° */}
        <mesh renderOrder={5}>
          <sphereGeometry args={[DOME_RADIUS * 1.004, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial
            ref={wireMatRef}
            color={amberRimHdr}
            wireframe
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Compact Floating Callout: CIRCUIT BREAKER */}
      <Html
        portal={portalRef}
        position={[0.65, 2.55, -1.25]}
        center
        zIndexRange={[10, 0]}
      >
        <button
          type="button"
          onClick={() => onSelectBlueprint?.('webhook-dlq')}
          className={`pointer-events-auto cursor-pointer select-none px-2 py-1 rounded border backdrop-blur-md opacity-100 transition-all duration-200 text-left ${badgeStyles.box}`}
        >
          <div className="text-[8.5px] font-bold tracking-[0.13em] text-amber-100 whitespace-nowrap leading-tight">
            CIRCUIT BREAKER
          </div>
          <div className={`text-[8px] font-extrabold tracking-[0.13em] whitespace-nowrap leading-tight ${badgeStyles.subColor}`}>
            {badgeStyles.sub}
          </div>
        </button>
      </Html>
    </group>
  );
}

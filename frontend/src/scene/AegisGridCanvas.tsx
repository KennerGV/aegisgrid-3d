import { useEffect, useRef } from 'react';
import type { ComponentRef, MutableRefObject, RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Environment,
  Grid,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
} from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { TelemetryFrame, VaultBlueprintId } from '../types/telemetry';
import { TopologyNodes } from './TopologyNodes';
import { OpaPolicyShield } from './OpaPolicyShield';
import { CircuitBreakerDome } from './CircuitBreakerDome';
import { DlqSpiralRing } from './DlqSpiralRing';
import { PacketStreams } from './PacketStreams';

interface AegisGridCanvasProps {
  frame: TelemetryFrame;
  telemetryRef: MutableRefObject<TelemetryFrame>;
  autoRotate: boolean;
  cameraResetTick: number;
  onSelectBlueprint: (id: VaultBlueprintId) => void;
}

const HERO_CAMERA_POS: [number, number, number] = [-16.6, 13.2, 16.6];
const HERO_CAMERA_TARGET: [number, number, number] = [1.85, 0.45, -0.15];

function CameraRig({
  autoRotate,
  cameraResetTick,
}: {
  autoRotate: boolean;
  cameraResetTick: number;
}) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    if (cameraResetTick === 0) return;
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    ctrl.object.position.set(...HERO_CAMERA_POS);
    ctrl.target.set(...HERO_CAMERA_TARGET);
    ctrl.update();
  }, [cameraResetTick]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={HERO_CAMERA_TARGET}
      enableDamping
      dampingFactor={0.055}
      rotateSpeed={0.62}
      panSpeed={0.65}
      zoomSpeed={0.78}
      minDistance={11}
      maxDistance={38}
      minPolarAngle={Math.PI * 0.16}
      maxPolarAngle={Math.PI * 0.43}
      autoRotate={autoRotate}
      autoRotateSpeed={0.38}
    />
  );
}

export function AegisGridCanvas({
  frame,
  telemetryRef,
  autoRotate,
  cameraResetTick,
  onSelectBlueprint,
}: AegisGridCanvasProps) {
  // Persistent DOM portal container so @react-three/drei <Html> roots never remount synchronously
  const htmlPortalRef = useRef<HTMLDivElement>(null);
  const portalTarget = htmlPortalRef as unknown as RefObject<HTMLElement>;

  return (
    <div className="absolute inset-0 w-full h-full bg-[#07090D]">
      {/* Persistent overlay portal for 3D <Html> topology callouts */}
      <div
        ref={htmlPortalRef}
        className="pointer-events-none absolute inset-0 overflow-hidden z-10"
      />

      <Canvas
        dpr={[1, 1.5]}
        camera={{
          position: HERO_CAMERA_POS,
          fov: 28.5,
          near: 0.5,
          far: 110,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        <color attach="background" args={['#07090D']} />
        <fog attach="fog" args={['#07090D', 27, 60]} />

        {/* Single-frame baked 360° Studio HDRI Environment (brushed titanium reflections from all angles) */}
        <Environment frames={1} resolution={256}>
          <color attach="background" args={['#0B1018']} />
          <Lightformer
            intensity={2.8}
            color="#94A3B8"
            position={[0, 12, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[26, 26, 1]}
          />
          <Lightformer
            intensity={3.0}
            color="#F59E0B"
            position={[-14, 5, 2]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[18, 5, 1]}
          />
          <Lightformer
            intensity={2.8}
            color="#CBD5E1"
            position={[-8, 8, -14]}
            rotation={[0.3, 0.4, 0]}
            scale={[22, 6, 1]}
          />
          <Lightformer
            intensity={2.6}
            color="#CBD5E1"
            position={[10, 8, 14]}
            rotation={[-0.3, Math.PI + 0.4, 0]}
            scale={[22, 6, 1]}
          />
          <Lightformer
            intensity={2.4}
            color="#06B6D4"
            position={[16, 4, 6]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[18, 5, 1]}
          />
        </Environment>

        {/* Balanced 360° Key, Rim & Fill Studio Lights */}
        <ambientLight intensity={0.45} color="#CBD5E1" />
        <hemisphereLight args={['#475569', '#090C14', 0.9]} />
        <directionalLight position={[-14, 24, -12]} intensity={1.7} color="#E2E8F0" />
        <directionalLight position={[14, 18, 14]} intensity={1.15} color="#FDE68A" />
        <directionalLight position={[12, 16, -14]} intensity={1.0} color="#CBD5E1" />

        {/* Dynamic subsystem accent lights */}
        <pointLight position={[0, 3.4, 0.2]} intensity={8.5} distance={12} color="#F59E0B" />
        <pointLight position={[3.8, 2.2, -3.6]} intensity={5.2} distance={9} color="#FBBF24" />
        <pointLight
          position={[-5.8, 1.5, 0.2]}
          intensity={frame.mcpAttackActive ? 14.0 : 5.0}
          distance={11}
          color={frame.mcpAttackActive ? '#F97316' : '#F59E0B'}
        />
        <pointLight
          position={[6.8, 2.2, 0.2]}
          intensity={frame.circuitState === 'OPEN' ? 12.0 : 3.2}
          distance={10}
          color="#F59E0B"
        />
        <pointLight
          position={[9.6, 1.4, 3.2]}
          intensity={frame.replayActive ? 12.5 : 5.8}
          distance={10}
          color="#06B6D4"
        />

        {/* Satin-Reflective Dark Obsidian Architectural Floor (#080A0F) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.015, 0]}>
          <planeGeometry args={[96, 96]} />
          <MeshReflectorMaterial
            blur={[340, 96]}
            resolution={512}
            mixBlur={1}
            mixStrength={1.55}
            roughness={0.64}
            depthScale={0.85}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.35}
            color="#090C12"
            metalness={0.68}
            mirror={0.38}
          />
        </mesh>

        {/* Precision Dual-Scale Obsidian Tile Grid */}
        <Grid
          position={[1.5, 0.004, 0]}
          args={[88, 88]}
          cellSize={1.4}
          cellThickness={0.6}
          cellColor="#141A26"
          sectionSize={5.6}
          sectionThickness={1.15}
          sectionColor="#222C3F"
          fadeDistance={44}
          fadeStrength={1.65}
          infiniteGrid
        />

        {/* Core 3D Subsystems */}
        <TopologyNodes
          telemetryRef={telemetryRef}
          portalRef={portalTarget}
          onSelectBlueprint={onSelectBlueprint}
        />

        <OpaPolicyShield
          telemetryRef={telemetryRef}
          portalRef={portalTarget}
          mcpAttackActive={frame.mcpAttackActive}
          onSelectBlueprint={onSelectBlueprint}
        />

        <CircuitBreakerDome
          telemetryRef={telemetryRef}
          portalRef={portalTarget}
          circuitState={frame.circuitState}
          onSelectBlueprint={onSelectBlueprint}
        />

        <DlqSpiralRing telemetryRef={telemetryRef} />

        <PacketStreams telemetryRef={telemetryRef} />

        <CameraRig autoRotate={autoRotate} cameraResetTick={cameraResetTick} />

        {/* Selective HDR Bloom (only HDR emissive elements > 1.06 bloom) */}
        <EffectComposer multisampling={0}>
          <Bloom
            mipmapBlur
            luminanceThreshold={1.06}
            luminanceSmoothing={0.2}
            intensity={1.22}
            radius={0.68}
          />
        </EffectComposer>
      </Canvas>

      {/* Subtle cinematic optical vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 52% 46%, rgba(7,9,13,0) 50%, rgba(4,6,10,0.78) 100%)',
        }}
      />
    </div>
  );
}

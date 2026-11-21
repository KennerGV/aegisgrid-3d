import { useCallback, useState } from 'react';
import { useTelemetryStream } from './hooks/useTelemetryStream';
import { AegisGridCanvas } from './scene/AegisGridCanvas';
import { ControlHud } from './hud/ControlHud';
import { VaultInspectorModal } from './hud/VaultInspectorModal';
import type { VaultBlueprintId } from './types/telemetry';

export default function App() {
  const {
    frame,
    telemetryRef,
    mode,
    sparkline,
    toggleMcpAttack,
    toggleInjectFailure,
    triggerReplayDlq,
  } = useTelemetryStream();

  const [autoRotate, setAutoRotate] = useState(false);
  const [cameraResetTick, setCameraResetTick] = useState(0);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<VaultBlueprintId | null>(null);

  const handleSelectBlueprint = useCallback((id: VaultBlueprintId) => {
    setSelectedBlueprint(id);
    setVaultModalOpen(true);
  }, []);

  const handleOpenModalFromBadge = useCallback(() => {
    setSelectedBlueprint(null);
    setVaultModalOpen(true);
  }, []);

  const handleResetCamera = useCallback(() => {
    setCameraResetTick((c) => c + 1);
    setAutoRotate(false);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0A0C10] select-none">
      <AegisGridCanvas
        frame={frame}
        telemetryRef={telemetryRef}
        autoRotate={autoRotate}
        cameraResetTick={cameraResetTick}
        onSelectBlueprint={handleSelectBlueprint}
      />

      <ControlHud
        frame={frame}
        mode={mode}
        sparkline={sparkline}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((v) => !v)}
        onResetCamera={handleResetCamera}
        onToggleMcpAttack={toggleMcpAttack}
        onToggleInjectFailure={toggleInjectFailure}
        onReplayDlq={triggerReplayDlq}
        onOpenVaultModal={handleOpenModalFromBadge}
      />

      <VaultInspectorModal
        open={vaultModalOpen}
        activeId={selectedBlueprint}
        onClose={() => setVaultModalOpen(false)}
      />
    </main>
  );
}

import { memo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { Group } from 'three';
import type { InstrumentConfig } from '../types/world';
import { GlbModel } from './GlbModel';

interface TaikoProps {
  /** instruments.json에서 불러온 악기 설정 데이터 */
  instrument: InstrumentConfig;
  /** 플레이어가 이 북의 상호작용 반경 안에 들어와 있는지 여부 */
  isNearby: boolean;
  /** 3D 북을 직접 클릭/탭했을 때 연주 모드로 진입하는 콜백 */
  onSelect: (instrument: InstrumentConfig) => void;
  /** 타격 시 3D 북이 통통 울리도록 세기(0 ~ 1)를 전달하는 공유 ref */
  hitPulseRef: MutableRefObject<number>;
}

/**
 * GLB 파일이 아직 없을 때 표시하는 임시 나가도 다이코 도형 모델
 */
function PlaceholderTaikoMesh() {
  return (
    <group>
      {/* 나무 받침대 (왼쪽/오른쪽 다리) */}
      <mesh position={[-0.42, 0.32, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.14, 0.7, 0.72]} />
        <meshStandardMaterial color="#6e472b" roughness={0.85} />
      </mesh>
      <mesh position={[0.42, 0.32, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.14, 0.7, 0.72]} />
        <meshStandardMaterial color="#6e472b" roughness={0.85} />
      </mesh>

      {/* 타이코 본체 */}
      <group position={[0, 0.88, 0]} rotation={[Math.PI / 2 - 0.2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.56, 0.56, 0.72, 24]} />
          <meshStandardMaterial color="#b93b2d" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.365, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.02, 24]} />
          <meshStandardMaterial color="#f5ead4" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.365, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.02, 24]} />
          <meshStandardMaterial color="#f5ead4" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.355, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.53, 0.04, 10, 24]} />
          <meshStandardMaterial color="#4a2c1d" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * 타이코(나가도 다이코) 3D 모델 컴포넌트
 * - public/models/instruments/inst_taiko_nagado.glb가 준비되면 자동으로 Blender GLB로 교체되며,
 *   없을 때는 임시 도형 모델(PlaceholderTaikoMesh)을 표시합니다.
 * - React.memo로 감싸 무관한 UI 상태가 바뀔 때 불필요한 재렌더링을 막습니다.
 */
export const Taiko = memo(function Taiko({
  instrument,
  isNearby,
  onSelect,
  hitPulseRef,
}: TaikoProps) {
  const [x, y, z] = instrument.position;
  const drumBodyRef = useRef<Group>(null);

  // 매 프레임마다 타격 울림(hitPulseRef)을 자연스럽게 감쇠시키며 북 전체에 탄력 반동 적용
  useFrame((_, rawDelta) => {
    if (!drumBodyRef.current) return;
    const delta = Math.min(rawDelta, 0.05);

    if (hitPulseRef.current > 0.001) {
      hitPulseRef.current = Math.max(0, hitPulseRef.current - delta * 6.5);
    }

    const scale = 1 + hitPulseRef.current * 0.09;
    drumBodyRef.current.scale.set(scale, scale, scale);
  });

  const handleDrumClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(instrument);
  };

  return (
    <group name={instrument.id} position={[x, y, z]} onClick={handleDrumClick}>
      {/* 가벼운 블롭 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.05, 24]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* 상호작용 가능 범위를 보여주는 바닥 원형 링 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[instrument.interactRadius - 0.07, instrument.interactRadius, 36]} />
        <meshBasicMaterial
          color={isNearby ? '#ffe066' : '#fff8dc'}
          transparent
          opacity={isNearby ? 0.85 : 0.42}
        />
      </mesh>

      {/* 타격 시 통통 울리는 3D 모델 (GLB 있으면 자동 로드, 없으면 임시 모델) */}
      <group ref={drumBodyRef}>
        <GlbModel
          url={instrument.modelPath}
          scale={instrument.scale ?? 1}
          fallback={<PlaceholderTaikoMesh />}
        />
      </group>
    </group>
  );
});

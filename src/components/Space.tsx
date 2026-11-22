import { memo, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Obstacle, SpaceConfig } from '../types/world';
import type { EffectiveWorldAtmosphere } from '../utils/themeResolver';
import { GlbModel } from './GlbModel';

interface SpaceProps {
  /** spaces.json에서 불러온 현재 공간 설정 데이터 */
  space: SpaceConfig;
  /** 기본 배경 테마(잔디 공원·연습실·눈오는 들판 등) 및 시즌 테마가 합산된 분위기 설정 */
  atmosphere: EffectiveWorldAtmosphere;
  /** 사용자가 잔디 바닥을 클릭했을 때 호출되는 콜백 함수 */
  onGroundClick: (point: [number, number]) => void;
}

/** 장식용 임시 꽃의 고정 위치 목록 */
const DECORATIVE_FLOWERS: Array<{ x: number; z: number; color: string }> = [
  { x: -4.2, z: -3.8, color: '#ff8fab' },
  { x: -3.7, z: -4.3, color: '#ffd166' },
  { x: 4.4, z: -3.5, color: '#ffffff' },
  { x: 4.9, z: -2.9, color: '#ff8fab' },
  { x: -4.8, z: 3.2, color: '#ffd166' },
  { x: -4.1, z: 3.9, color: '#ffffff' },
  { x: 4.6, z: 3.4, color: '#ffffff' },
  { x: 3.9, z: 4.1, color: '#ff8fab' },
  { x: 0.4, z: -6.8, color: '#ffd166' },
  { x: -0.6, z: 6.7, color: '#ff8fab' },
];

/** 임시 저폴리 나무 한 그루 컴포넌트 */
function PlaceholderTree({ obstacle }: { obstacle: Obstacle }) {
  return (
    <group position={[obstacle.x, 0, obstacle.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[obstacle.radius * 1.15, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.32} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.8, 8]} />
        <meshStandardMaterial color="#8d5b3c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <dodecahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial color="#58a55c" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.15, 1.85, -0.05]}>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#72bf6a" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

/** 장식용 임시 꽃 한 송이 컴포넌트 */
function PlaceholderFlower({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
        <meshStandardMaterial color="#4f9a53" />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <dodecahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/**
 * 잔디 공원 3D 공간을 그리는 컴포넌트
 * - public/models/spaces/space_park_grass.glb 파일이 준비되면 자동으로 Blender 공원 모델로 교체됩니다.
 * - GLB 모델로 교체되더라도 바닥 y = 0에 투명 클릭 평면을 유지해 PC 바닥 클릭 이동이 그대로 동작합니다.
 * - React.memo로 감싸 UI 상태 변경 시 불필요한 재렌더링을 막습니다.
 */
export const Space = memo(function Space({
  space,
  atmosphere,
  onGroundClick,
}: SpaceProps) {
  const { walkableBounds, obstacles } = space;

  // useMemo: space.obstacles가 바뀌지 않는 한 나무 목록 필터링을 매번 다시 수행하지 않음
  const treeObstacles = useMemo(
    () => obstacles.filter((obstacle) => obstacle.id.startsWith('tree_')),
    [obstacles]
  );

  /**
   * 바닥 클릭 시 3D 교차점의 (x, z) 좌표를 상위로 전달하는 핸들러
   * - 모바일 터치(pointerType === 'touch')는 플로팅 조이스틱이 담당하므로 제외합니다.
   */
  const handleGroundPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.nativeEvent.pointerType === 'touch') return;
    event.stopPropagation();
    onGroundClick([event.point.x, event.point.z]);
  };

  // GLB가 아직 없을 때 표시할 임시 원형/사각형 광장 (배경 테마별 바닥색·실내/야외 장식 반영)
  const placeholderPark = (
    <group>
      {/* 공원 바깥을 감싸는 넓은 들판/실내 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={atmosphere.outerGroundColor} roughness={0.95} />
      </mesh>

      {walkableBounds.shape === 'circle' ? (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[walkableBounds.centerX, 0, walkableBounds.centerZ]}
          >
            <circleGeometry args={[walkableBounds.radius, 64]} />
            <meshStandardMaterial color={atmosphere.groundColor} roughness={0.92} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[walkableBounds.centerX, -0.02, walkableBounds.centerZ]}
          >
            <circleGeometry args={[walkableBounds.radius + 0.55, 64]} />
            <meshStandardMaterial color={atmosphere.borderColor} roughness={0.92} />
          </mesh>
        </>
      ) : (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              (walkableBounds.minX + walkableBounds.maxX) / 2,
              0,
              (walkableBounds.minZ + walkableBounds.maxZ) / 2,
            ]}
          >
            <planeGeometry
              args={[
                walkableBounds.maxX - walkableBounds.minX,
                walkableBounds.maxZ - walkableBounds.minZ,
              ]}
            />
            <meshStandardMaterial color={atmosphere.groundColor} roughness={0.92} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              (walkableBounds.minX + walkableBounds.maxX) / 2,
              -0.02,
              (walkableBounds.minZ + walkableBounds.maxZ) / 2,
            ]}
          >
            <planeGeometry
              args={[
                walkableBounds.maxX - walkableBounds.minX + 0.6,
                walkableBounds.maxZ - walkableBounds.minZ + 0.6,
              ]}
            />
            <meshStandardMaterial color={atmosphere.borderColor} roughness={0.92} />
          </mesh>
        </>
      )}

      {/* 야외 배경(잔디 공원·눈오는 들판·노을)에서는 나무와 꽃을 표시하고, 실내 연습실에서는 깔끔하게 숨김 */}
      {atmosphere.showOutdoorDecor &&
        treeObstacles.map((tree) => (
          <PlaceholderTree key={tree.id} obstacle={tree} />
        ))}

      {atmosphere.showOutdoorDecor &&
        DECORATIVE_FLOWERS.map((flower, index) => (
          <PlaceholderFlower
            key={index}
            x={flower.x}
            z={flower.z}
            color={flower.color}
          />
        ))}
    </group>
  );

  return (
    <group name={space.id}>
      {/* 실제 Blender 공간 GLB (있으면 자동 로드) 또는 임시 잔디 공원 */}
      <GlbModel url={space.modelPath} fallback={placeholderPark} />

      {/* 어떤 GLB 모델로 교체되더라도 PC 바닥 클릭 이동이 안정적으로 잡히는 투명 바닥 클릭 판 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        onPointerDown={handleGroundPointerDown}
      >
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
});

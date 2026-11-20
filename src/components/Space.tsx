import type { Obstacle, SpaceConfig } from '../types/world';

interface SpaceProps {
  /** spaces.json에서 불러온 현재 공간 설정 데이터 */
  space: SpaceConfig;
}

/**
 * 장식용 임시 꽃의 고정 위치 목록
 * - 이동을 막지 않는 가벼운 소품으로, 광장에 따뜻한 분위기를 더해줍니다.
 */
const DECORATIVE_FLOWERS: Array<{ x: number; z: number; color: string }> = [
  { x: -3.0, z: -2.4, color: '#ff8fab' },
  { x: -2.6, z: -2.8, color: '#ffd166' },
  { x: 3.2, z: -2.2, color: '#ffffff' },
  { x: 3.6, z: -1.8, color: '#ff8fab' },
  { x: -3.5, z: 2.0, color: '#ffd166' },
  { x: 3.4, z: 2.3, color: '#ffffff' },
  { x: 2.9, z: 2.8, color: '#ff8fab' },
];

/**
 * 임시 저폴리 나무 한 그루를 그리는 보조 컴포넌트
 * - 나중에 Blender GLB 에셋으로 교체할 자리입니다.
 * @param obstacle - spaces.json에 정의된 나무 장애물 좌표 및 반지름
 */
function PlaceholderTree({ obstacle }: { obstacle: Obstacle }) {
  return (
    <group position={[obstacle.x, 0, obstacle.z]}>
      {/* 가벼운 블롭 그림자 (실시간 3D 그림자 대신 반투명 원판으로 성능 확보) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[obstacle.radius * 1.15, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.32} />
      </mesh>

      {/* 나무 기둥 (원점 바닥 기준 y = 0에서 위로 0.8m) */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.8, 8]} />
        <meshStandardMaterial color="#8d5b3c" roughness={0.9} />
      </mesh>

      {/* 나무 잎사귀 아래층 */}
      <mesh position={[0, 1.25, 0]}>
        <dodecahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial color="#58a55c" roughness={0.85} flatShading />
      </mesh>

      {/* 나무 잎사귀 위층 */}
      <mesh position={[0.15, 1.85, -0.05]}>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#72bf6a" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

/**
 * 장식용 임시 꽃 한 송이를 그리는 보조 컴포넌트
 */
function PlaceholderFlower({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      {/* 짧은 초록 줄기 */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
        <meshStandardMaterial color="#4f9a53" />
      </mesh>
      {/* 꽃잎 */}
      <mesh position={[0, 0.18, 0]}>
        <dodecahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/**
 * 잔디 공원 3D 공간을 그리는 컴포넌트
 * - spaces.json의 walkableBounds(이동 가능 경계)와 obstacles(나무 등) 데이터를 읽어 화면을 구성합니다.
 * @param props.space - 현재 공간 설정 객체
 */
export function Space({ space }: SpaceProps) {
  const { walkableBounds, obstacles } = space;

  // 이동 가능한 잔디 광장의 가로(width), 세로(depth) 크기 계산
  const plazaWidth = walkableBounds.maxX - walkableBounds.minX;
  const plazaDepth = walkableBounds.maxZ - walkableBounds.minZ;
  const plazaCenterX = (walkableBounds.minX + walkableBounds.maxX) / 2;
  const plazaCenterZ = (walkableBounds.minZ + walkableBounds.maxZ) / 2;

  // 장애물 중 id가 'tree_'로 시작하는 항목만 추려 나무로 배치
  const treeObstacles = obstacles.filter((obstacle) => obstacle.id.startsWith('tree_'));

  return (
    <group name={space.id}>
      {/* 공원 바깥을 감싸는 넓은 들판 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#87c976" roughness={0.95} />
      </mesh>

      {/* 이동 가능한 잔디 광장 영역 (살짝 밝은 연두색으로 경계를 자연스럽게 표시) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[plazaCenterX, 0, plazaCenterZ]}
      >
        <planeGeometry args={[plazaWidth, plazaDepth]} />
        <meshStandardMaterial color="#9ad983" roughness={0.95} />
      </mesh>

      {/* 광장 가장자리 흙길 테두리 느낌 (바깥 테두리선) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[plazaCenterX, -0.02, plazaCenterZ]}
      >
        <planeGeometry args={[plazaWidth + 0.6, plazaDepth + 0.6]} />
        <meshStandardMaterial color="#d9c69e" roughness={0.95} />
      </mesh>

      {/* spaces.json에 정의된 나무 배치 */}
      {treeObstacles.map((tree) => (
        <PlaceholderTree key={tree.id} obstacle={tree} />
      ))}

      {/* 공원 분위기를 살려주는 작은 꽃 소품 배치 */}
      {DECORATIVE_FLOWERS.map((flower, index) => (
        <PlaceholderFlower
          key={index}
          x={flower.x}
          z={flower.z}
          color={flower.color}
        />
      ))}
    </group>
  );
}

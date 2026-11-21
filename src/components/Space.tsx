import type { ThreeEvent } from '@react-three/fiber';
import type { Obstacle, SpaceConfig } from '../types/world';

interface SpaceProps {
  /** spaces.json에서 불러온 현재 공간 설정 데이터 */
  space: SpaceConfig;
  /** 사용자가 잔디 바닥을 클릭/터치했을 때 호출되는 콜백 함수 */
  onGroundClick: (point: [number, number]) => void;
}

/**
 * 장식용 임시 꽃의 고정 위치 목록
 * - 1.5배 넓어진 원형 잔디 광장 가장자리 곳곳에 소박하게 배치해 따뜻한 공원 분위기를 살립니다.
 */
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
 * - spaces.json의 walkableBounds(원형 또는 사각형 이동 경계)와 obstacles(나무 등)를 읽어 화면을 구성합니다.
 * - PC 마우스 클릭 좌표를 받아 플레이어 이동 목적지로 전달합니다.
 * @param props.space - 현재 공간 설정 객체
 * @param props.onGroundClick - 바닥 클릭 시 [x, z] 좌표를 넘기는 콜백
 */
export function Space({ space, onGroundClick }: SpaceProps) {
  const { walkableBounds, obstacles } = space;

  // 장애물 중 id가 'tree_'로 시작하는 항목만 추려 나무로 배치
  const treeObstacles = obstacles.filter((obstacle) => obstacle.id.startsWith('tree_'));

  /**
   * 바닥 메시 클릭 시 3D 교차점의 (x, z) 좌표를 상위로 전달하는 핸들러
   * - 모바일 터치(pointerType === 'touch')는 플로팅 조이스틱이 담당하므로 바닥 이동을 실행하지 않습니다.
   */
  const handleGroundPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.nativeEvent.pointerType === 'touch') return;

    // 뒤쪽 메시로 클릭 이벤트가 중복 전달되지 않도록 막음
    event.stopPropagation();
    onGroundClick([event.point.x, event.point.z]);
  };

  return (
    <group name={space.id}>
      {/* 공원 바깥을 감싸는 넓은 들판 바닥 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        onPointerDown={handleGroundPointerDown}
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#87c976" roughness={0.95} />
      </mesh>

      {/* spaces.json의 walkableBounds 모양에 따라 원형 또는 사각형 잔디 광장 렌더링 */}
      {walkableBounds.shape === 'circle' ? (
        <>
          {/* 이동 가능한 원형 잔디 광장 영역 */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[walkableBounds.centerX, 0, walkableBounds.centerZ]}
            onPointerDown={handleGroundPointerDown}
          >
            <circleGeometry args={[walkableBounds.radius, 64]} />
            <meshStandardMaterial color="#9ad983" roughness={0.95} />
          </mesh>

          {/* 원형 광장 바깥쪽 흙길 산책로 테두리 */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[walkableBounds.centerX, -0.02, walkableBounds.centerZ]}
            onPointerDown={handleGroundPointerDown}
          >
            <circleGeometry args={[walkableBounds.radius + 0.55, 64]} />
            <meshStandardMaterial color="#d9c69e" roughness={0.95} />
          </mesh>
        </>
      ) : (
        <>
          {/* 추후 사각형 공간(실내 연습실 등)을 위한 사각형 바닥 */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              (walkableBounds.minX + walkableBounds.maxX) / 2,
              0,
              (walkableBounds.minZ + walkableBounds.maxZ) / 2,
            ]}
            onPointerDown={handleGroundPointerDown}
          >
            <planeGeometry
              args={[
                walkableBounds.maxX - walkableBounds.minX,
                walkableBounds.maxZ - walkableBounds.minZ,
              ]}
            />
            <meshStandardMaterial color="#9ad983" roughness={0.95} />
          </mesh>

          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              (walkableBounds.minX + walkableBounds.maxX) / 2,
              -0.02,
              (walkableBounds.minZ + walkableBounds.maxZ) / 2,
            ]}
            onPointerDown={handleGroundPointerDown}
          >
            <planeGeometry
              args={[
                walkableBounds.maxX - walkableBounds.minX + 0.6,
                walkableBounds.maxZ - walkableBounds.minZ + 0.6,
              ]}
            />
            <meshStandardMaterial color="#d9c69e" roughness={0.95} />
          </mesh>
        </>
      )}

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

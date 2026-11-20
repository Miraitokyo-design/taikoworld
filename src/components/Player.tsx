import type { PlayerState } from '../types/world';

interface PlayerProps {
  /** 플레이어의 위치·회전·행동을 담은 단일 상태 객체 */
  playerState: PlayerState;
}

/**
 * 임시 게스트 캐릭터 3D 컴포넌트
 * - 원점(Origin)이 바닥(y = 0)에 오도록 배치해, 추후 Blender 캐릭터 GLB로 바로 교체할 수 있습니다.
 * @param props.playerState - 현재 플레이어 상태 객체
 */
export function Player({ playerState }: PlayerProps) {
  const [x, y, z] = playerState.position;

  return (
    <group
      name="guest_player"
      position={[x, y, z]}
      rotation={[0, playerState.rotationY, 0]}
    >
      {/* 가벼운 블롭 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* 왼발 / 오른발 */}
      <mesh position={[-0.12, 0.1, 0]}>
        <boxGeometry args={[0.14, 0.2, 0.18]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.1, 0]}>
        <boxGeometry args={[0.14, 0.2, 0.18]} />
        <meshStandardMaterial color="#3a3a4a" roughness={0.8} />
      </mesh>

      {/* 몸통 (하피 느낌의 파란 상의) */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.56, 12]} />
        <meshStandardMaterial color="#3b7dd8" roughness={0.75} />
      </mesh>

      {/* 허리띠(오비) 포인트 */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.255, 0.265, 0.1, 12]} />
        <meshStandardMaterial color="#f6c445" roughness={0.7} />
      </mesh>

      {/* 머리 */}
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color="#ffe0bd" roughness={0.75} />
      </mesh>

      {/* 머리띠(하치마키) */}
      <mesh position={[0, 1.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.245, 0.035, 8, 20]} />
        <meshStandardMaterial color="#e04f3e" roughness={0.7} />
      </mesh>

      {/* 앞 방향을 쉽게 알아볼 수 있는 두 눈 (+Z 방향이 정면) */}
      <mesh position={[-0.09, 0.98, 0.23]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshBasicMaterial color="#2b2623" />
      </mesh>
      <mesh position={[0.09, 0.98, 0.23]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshBasicMaterial color="#2b2623" />
      </mesh>
    </group>
  );
}

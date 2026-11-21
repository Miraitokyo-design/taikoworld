import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { MemberParts } from '../types/content';
import type { PlayerAction } from '../types/world';

interface CharacterProps {
  /** 모듈식 캐릭터 파츠(머리 스타일, 의상, 하피 색상) */
  parts: MemberParts;
  /** 현재 행동 상태('idle' | 'walk' | 'play')를 60fps로 읽어오는 ref */
  actionRef: MutableRefObject<PlayerAction>;
}

/**
 * 머리 파츠(head) 종류에 따라 교체되는 장식/헤어 보조 컴포넌트
 * - 나중에 Blender에서 제작한 파츠 GLB로 그대로 교체할 수 있는 구조입니다.
 */
function CharacterHeadPart({ head, color }: { head: string; color: string }) {
  switch (head) {
    case 'head_b':
      // 상투(만두머리) + 리본 스타일
      return (
        <group>
          <mesh position={[0, 1.24, -0.02]}>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color="#352a24" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.15, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.11, 0.026, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </group>
      );

    case 'head_c':
      // 동그란 모자(캡) 스타일
      return (
        <group>
          <mesh position={[0, 1.13, 0]}>
            <cylinderGeometry args={[0.21, 0.25, 0.14, 14]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.07, 0.17]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[0.28, 0.04, 0.18]} />
            <meshStandardMaterial color="#3d352e" roughness={0.8} />
          </mesh>
        </group>
      );

    case 'head_d':
      // 뾰족 헤어 + 이마 밴드 스타일
      return (
        <group>
          <mesh position={[0, 1.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.245, 0.03, 8, 20]} />
            <meshStandardMaterial color="#f6c445" roughness={0.7} />
          </mesh>
          <mesh position={[-0.08, 1.24, 0]} rotation={[0, 0, 0.28]}>
            <coneGeometry args={[0.09, 0.2, 6]} />
            <meshStandardMaterial color="#2f2a28" roughness={0.85} />
          </mesh>
          <mesh position={[0.08, 1.25, -0.02]} rotation={[0, 0, -0.25]}>
            <coneGeometry args={[0.09, 0.22, 6]} />
            <meshStandardMaterial color="#2f2a28" roughness={0.85} />
          </mesh>
        </group>
      );

    case 'head_a':
    default:
      // 전통 타이코 머리띠(하치마키) 스타일
      return (
        <mesh position={[0, 1.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.245, 0.035, 8, 20]} />
          <meshStandardMaterial color="#e04f3e" roughness={0.7} />
        </mesh>
      );
  }
}

/**
 * 플레이어와 NPC가 함께 사용하는 모듈식 3D 캐릭터 컴포넌트
 * - 공통 뼈대(발, 하피 몸통, 양팔, 머리, 블롭 그림자) 위에 parts(머리·색상)를 조합합니다.
 * - 공통 애니메이션(idle, walk, play)을 useFrame에서 직접 구동하며,
 *   원점(Origin)이 바닥(y = 0)에 있어 추후 Blender 캐릭터 GLB로 바로 교체할 수 있습니다.
 */
export function Character({ parts, actionRef }: CharacterProps) {
  const bodyGroupRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const bachiLeftRef = useRef<Group>(null);
  const bachiRightRef = useRef<Group>(null);

  // 각 캐릭터마다 독립적으로 흐르는 애니메이션 시간 위상
  const animPhaseRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const action = actionRef.current;

    if (!bodyGroupRef.current || !leftArmRef.current || !rightArmRef.current) return;

    if (action === 'walk') {
      // 걷기(walk): 통통 뛰는 발걸음 + 좌우 살짝 흔들림 + 양팔 교차 스윙
      animPhaseRef.current += delta * 13;
      const phase = animPhaseRef.current;
      bodyGroupRef.current.position.y = Math.abs(Math.sin(phase)) * 0.09;
      bodyGroupRef.current.rotation.z = Math.sin(phase) * 0.06;
      leftArmRef.current.rotation.x = Math.sin(phase) * 0.55;
      rightArmRef.current.rotation.x = -Math.sin(phase) * 0.55;
    } else if (action === 'play') {
      // 연주(play): 양팔에 북채(바치)를 들고 리듬에 맞춰 위아래로 힘차게 두드리는 동작
      animPhaseRef.current += delta * 8.8;
      const phase = animPhaseRef.current;
      bodyGroupRef.current.position.y = Math.abs(Math.sin(phase)) * 0.04;
      bodyGroupRef.current.rotation.z *= 0.82;
      leftArmRef.current.rotation.x = -0.85 + Math.sin(phase) * 0.65;
      rightArmRef.current.rotation.x = -0.85 - Math.sin(phase) * 0.65;
    } else {
      // 대기(idle): 부드러운 숨쉬기 움직임과 자연스러운 차렷 자세 복귀
      animPhaseRef.current += delta * 2.4;
      bodyGroupRef.current.position.y =
        bodyGroupRef.current.position.y * 0.82 +
        Math.sin(animPhaseRef.current) * 0.008;
      bodyGroupRef.current.rotation.z *= 0.82;
      leftArmRef.current.rotation.x *= 0.82;
      rightArmRef.current.rotation.x *= 0.82;
    }

    // 연주('play') 중일 때만 양손의 나무 북채(바치)를 표시
    const showBachi = action === 'play';
    if (bachiLeftRef.current) bachiLeftRef.current.visible = showBachi;
    if (bachiRightRef.current) bachiRightRef.current.visible = showBachi;
  });

  return (
    <group>
      {/* 가벼운 블롭 그림자 (바닥에 고정) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshBasicMaterial color="#3c6e47" transparent opacity={0.35} />
      </mesh>

      {/* 공통 애니메이션이 적용되는 캐릭터 본체 그룹 */}
      <group ref={bodyGroupRef}>
        {/* 왼발 / 오른발 */}
        <mesh position={[-0.12, 0.1, 0]}>
          <boxGeometry args={[0.14, 0.2, 0.18]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.8} />
        </mesh>
        <mesh position={[0.12, 0.1, 0]}>
          <boxGeometry args={[0.14, 0.2, 0.18]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.8} />
        </mesh>

        {/* 몸통 (멤버별 색상이 적용되는 하피 의상) */}
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.56, 12]} />
          <meshStandardMaterial color={parts.color} roughness={0.75} />
        </mesh>

        {/* 허리띠(오비) 포인트 */}
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.255, 0.265, 0.1, 12]} />
          <meshStandardMaterial color="#f6c445" roughness={0.7} />
        </mesh>

        {/* 왼팔 + 연주용 나무 북채(바치) */}
        <group ref={leftArmRef} position={[-0.28, 0.65, 0]}>
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.065, 0.06, 0.3, 8]} />
            <meshStandardMaterial color={parts.color} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshStandardMaterial color="#ffe0bd" roughness={0.75} />
          </mesh>
          <group ref={bachiLeftRef} visible={false} position={[0, -0.3, 0.14]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.026, 0.36, 6]} />
              <meshStandardMaterial color="#e8c891" roughness={0.7} />
            </mesh>
          </group>
        </group>

        {/* 오른팔 + 연주용 나무 북채(바치) */}
        <group ref={rightArmRef} position={[0.28, 0.65, 0]}>
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.065, 0.06, 0.3, 8]} />
            <meshStandardMaterial color={parts.color} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshStandardMaterial color="#ffe0bd" roughness={0.75} />
          </mesh>
          <group ref={bachiRightRef} visible={false} position={[0, -0.3, 0.14]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.026, 0.36, 6]} />
              <meshStandardMaterial color="#e8c891" roughness={0.7} />
            </mesh>
          </group>
        </group>

        {/* 머리 */}
        <mesh position={[0, 0.98, 0]}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#ffe0bd" roughness={0.75} />
        </mesh>

        {/* 교체 가능한 머리 파츠(머리띠 / 상투 / 모자 / 뾰족 헤어) */}
        <CharacterHeadPart head={parts.head} color={parts.color} />

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
    </group>
  );
}

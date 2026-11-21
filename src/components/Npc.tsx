import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import type { MemberConfig } from '../types/content';
import type { PlayerAction, PlayerState, SpaceConfig, Vec3 } from '../types/world';
import { getDistance2D } from '../systems/collision';
import {
  createInitialNpcRuntime,
  stepNpcStateMachine,
} from '../systems/npcStateMachine';
import { audioManager } from '../systems/audioManager';
import { Character } from './Character';

interface NpcProps {
  /** members.json에서 불러온 서클 멤버 데이터 */
  member: MemberConfig;
  /** 시작 상태 분산을 위한 멤버 순번 */
  memberIndex: number;
  /** spaces.json에서 이 멤버의 route 키에 해당하는 이동 경로 */
  route: Vec3[];
  /** 2D 경계·장애물 충돌 보정에 사용하는 공간 설정 */
  space: SpaceConfig;
  /** 플레이어 현재 위치 확인용 단일 상태 ref */
  playerStateRef: MutableRefObject<PlayerState>;
  /** 입장 완료 여부 (입장 후에만 배경 소리 및 추임새 연출 활성화) */
  hasEntered: boolean;
  /** 탐색 화면이 활성화되어 NPC 상호작용(! 말풍선)을 표시할 수 있는지 여부 */
  isInteractionActive: boolean;
  /** 가까워진 상태에서 NPC 또는 근처를 눌렀을 때 프로필 카드를 여는 콜백 */
  onSelect: (member: MemberConfig) => void;
}

/** 플레이어가 NPC에 가까워졌다고 판정하는 거리 (m) */
const NPC_INTERACT_RADIUS = 2.2;

/** 머리 위로 잠깐 떠올랐다 사라지는 추임새 텍스트 상태 타입 */
interface KakegoeBubble {
  id: number;
  text: string;
}

/**
 * 공원 안에서 자동으로 걷고, 쉬고, 타이코 연습을 하는 NPC 멤버 컴포넌트
 * - 플레이어가 가까이 다가가면 머리 위에 [!] 말풍선이 뜨며, 그때 NPC나 주변을 누르면 프로필 카드가 열립니다.
 * - 행동 중 한 번씩 말풍선 없이 추임새 문자(それ！ / はっ / ちょいさ〜！)만 머리 위로 떠오릅니다.
 */
export function Npc({
  member,
  memberIndex,
  route,
  space,
  playerStateRef,
  hasEntered,
  isInteractionActive,
  onSelect,
}: NpcProps) {
  const rootGroupRef = useRef<Group>(null);
  const playRingRef = useRef<Mesh>(null);

  // NPC 상태머신 런타임 객체와 Character에 넘길 행동 상태 ref
  const runtimeRef = useRef(createInitialNpcRuntime(route, memberIndex));
  const actionRef = useRef<PlayerAction>(runtimeRef.current.state);

  // 플레이어 근접 여부 (값이 바뀔 때만 React 상태를 갱신해 성능 절약)
  const isNearRef = useRef(false);
  const [isPlayerNear, setIsPlayerNear] = useState(false);

  // 현재 머리 위로 떠오르고 있는 추임새 텍스트 (없으면 null)
  const [floatingKakegoe, setFloatingKakegoe] = useState<KakegoeBubble | null>(null);
  const kakegoeIdRef = useRef(0);
  const kakegoeTimerRef = useRef<number | null>(null);

  // 언마운트 시 커서 및 타이머 정리
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
      if (kakegoeTimerRef.current !== null) {
        window.clearTimeout(kakegoeTimerRef.current);
      }
    };
  }, []);

  // 모달이 열리거나 연주 모드에 들어가면 호버 커서 복원
  useEffect(() => {
    if (!isInteractionActive) {
      document.body.style.cursor = 'auto';
    }
  }, [isInteractionActive]);

  // useFrame: 매 프레임 상태머신·플레이어 거리 체크·3D 위치/회전 업데이트
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const runtime = runtimeRef.current;

    const { hitBeat, kakegoe } = stepNpcStateMachine(runtime, route, space, delta);

    // Character 공통 애니메이션이 현재 상태를 즉시 따라가도록 동기화
    actionRef.current = runtime.state;

    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(
        runtime.position[0],
        runtime.position[1],
        runtime.position[2]
      );
      rootGroupRef.current.rotation.y = runtime.rotationY;
    }

    // 플레이어와의 2D 거리를 비교해 가까워졌을 때만 [!] 말풍선 활성화
    const [px, , pz] = playerStateRef.current.position;
    const distToPlayer = getDistance2D(
      px,
      pz,
      runtime.position[0],
      runtime.position[2]
    );
    const nextNear = isInteractionActive && distToPlayer <= NPC_INTERACT_RADIUS;
    if (nextNear !== isNearRef.current) {
      isNearRef.current = nextNear;
      setIsPlayerNear(nextNear);
      if (!nextNear) {
        document.body.style.cursor = 'auto';
      }
    }

    // 연주('play') 중일 때 바닥에 은은한 리듬 링이 퍼지듯 반짝여 멀리서도 구분 가능
    if (playRingRef.current) {
      const isPlaying = runtime.state === 'play';
      playRingRef.current.visible = isPlaying;
      if (isPlaying) {
        const pulse = 1 + Math.sin(clock.getElapsedTime() * 8) * 0.14;
        playRingRef.current.scale.set(pulse, pulse, 1);
      }
    }

    // 입장 후 NPC가 박자를 칠 때마다 은은한 배경 북소리 재생 (연주 모드에서는 자동 덕킹)
    if (hitBeat && hasEntered) {
      audioManager.playNpcPracticeBeat(hitBeat);
    }

    // 행동 중 추임새 이벤트가 발생하면 말풍선 없이 문자만 1.35초간 머리 위로 띄움
    if (kakegoe && isInteractionActive) {
      const nextId = ++kakegoeIdRef.current;
      setFloatingKakegoe({ id: nextId, text: kakegoe });

      if (kakegoeTimerRef.current !== null) {
        window.clearTimeout(kakegoeTimerRef.current);
      }
      kakegoeTimerRef.current = window.setTimeout(() => {
        setFloatingKakegoe((current) => (current?.id === nextId ? null : current));
      }, 1350);
    }
  });

  /**
   * 플레이어가 가까이 와서 [!] 말풍선이 떠 있을 때 NPC 또는 근처 영역을 짧게 클릭/탭하면 프로필 열기
   * - 모바일에서 조이스틱 드래그를 끝낸 직후 오작동하지 않도록 이동 거리(event.delta <= 8px)를 함께 확인합니다.
   */
  const handleNearbyInteractClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isPlayerNear || !isInteractionActive) return;
    if (event.delta > 8) return;
    event.stopPropagation();
    onSelect(member);
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!isPlayerNear || !isInteractionActive) return;
    event.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
  };

  const [initX, initY, initZ] = runtimeRef.current.position;

  return (
    <group
      ref={rootGroupRef}
      name={`npc_${member.id}`}
      position={[initX, initY, initZ]}
      rotation={[0, runtimeRef.current.rotationY, 0]}
      onClick={handleNearbyInteractClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* 가까워졌을 때 NPC 주변을 넉넉하게 눌러도 프로필이 열리도록 감싸는 투명 클릭 영역 */}
      {isPlayerNear && isInteractionActive && (
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 1.6, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* 플레이어가 가까워졌을 때 발밑에도 은은한 흰색 상호작용 링 표시 */}
      {isPlayerNear && isInteractionActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[0.62, 0.72, 24]} />
          <meshBasicMaterial color="#fff8d6" transparent opacity={0.85} />
        </mesh>
      )}

      {/* 연주 연습 중일 때만 발밑에 은은하게 빛나는 컬러 리듬 링 */}
      <mesh
        ref={playRingRef}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      >
        <ringGeometry args={[0.45, 0.56, 24]} />
        <meshBasicMaterial color={member.parts.color} transparent opacity={0.65} />
      </mesh>

      {/* 공통 모듈식 캐릭터 (members.json 파츠 적용) */}
      <Character parts={member.parts} actionRef={actionRef} />

      {/* 플레이어가 가까워지면 머리 위에 뜨는 [!] 말풍선 (말풍선 자체를 눌러도 정보 열림) */}
      {isPlayerNear && isInteractionActive && (
        <Html
          position={[0, 1.78, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            className="npc-alert-bubble"
            data-ui-interactive="true"
            aria-label={`${member.nickname} 프로필 보기`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(member);
            }}
          >
            !
          </button>
        </Html>
      )}

      {/* 행동 중 한 번씩 말풍선 없이 문자만 머리 위로 떠오르는 추임새 연출 */}
      {floatingKakegoe && isInteractionActive && (
        <Html
          position={[0, isPlayerNear ? 2.28 : 1.75, 0]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div key={floatingKakegoe.id} className="npc-kakegoe-text">
            {floatingKakegoe.text}
          </div>
        </Html>
      )}
    </group>
  );
}

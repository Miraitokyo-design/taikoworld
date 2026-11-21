import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import type { MemberConfig } from '../types/content';
import type { PlayerAction, Vec3 } from '../types/world';
import { Character } from './Character';

interface NpcProps {
  /** members.json에서 불러온 서클 멤버 데이터 */
  member: MemberConfig;
  /** 초기 3D 스폰 좌표 */
  initialPosition: Vec3;
  /** 초기 Y축 회전 각도 */
  initialRotationY: number;
  /** NpcGroup이 매 프레임 위치/회전을 갱신할 루트 그룹 ref 등록 콜백 */
  registerGroupRef: (group: Group | null) => void;
  /** NpcGroup이 합주 리듬 링을 제어할 메시 ref 등록 콜백 */
  registerPlayRingRef: (mesh: Mesh | null) => void;
  /** Character 애니메이션에 전달되는 현재 행동 상태 ref */
  actionRef: MutableRefObject<PlayerAction>;
  /** 플레이어가 이 NPC에 가까이 와서 [!] 말풍선이 떠 있는지 여부 */
  isPlayerNear: boolean;
  /** 탐색 화면이 활성화되어 상호작용 UI를 표시할 수 있는지 여부 */
  isInteractionActive: boolean;
  /** 현재 머리 위로 떠오르고 있는 추임새 텍스트 (없으면 null) */
  floatingKakegoe: { id: number; text: string } | null;
  /** 가까워진 상태에서 NPC 또는 근처를 눌렀을 때 프로필 카드를 여는 콜백 */
  onSelect: (member: MemberConfig) => void;
}

/**
 * 개별 NPC 1명의 3D 외형, 근접 [!] 말풍선, 추임새 텍스트를 그리는 컴포넌트
 * - 실제 이동과 3인 합주 상태머신 계산은 상위 NpcGroup에서 통합 실행합니다.
 */
export function Npc({
  member,
  initialPosition,
  initialRotationY,
  registerGroupRef,
  registerPlayRingRef,
  actionRef,
  isPlayerNear,
  isInteractionActive,
  floatingKakegoe,
  onSelect,
}: NpcProps) {
  // 모달이 열리거나 연주 모드에 들어가면 호버 커서 복원
  useEffect(() => {
    if (!isInteractionActive || !isPlayerNear) {
      document.body.style.cursor = 'auto';
    }
  }, [isInteractionActive, isPlayerNear]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  /**
   * 플레이어가 가까이 와서 [!] 말풍선이 떠 있을 때 NPC 또는 근처 영역을 짧게 클릭/탭하면 프로필 열기
   * - 모바일에서 조이스틱 드래그를 끝낸 직후 오작동하지 않도록 이동 거리(event.delta <= 8px)를 확인합니다.
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

  return (
    <group
      ref={registerGroupRef}
      name={`npc_${member.id}`}
      position={initialPosition}
      rotation={[0, initialRotationY, 0]}
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

      {/* 플레이어가 가까워졌을 때 발밑에 은은한 흰색 상호작용 링 표시 */}
      {isPlayerNear && isInteractionActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[0.62, 0.72, 24]} />
          <meshBasicMaterial color="#fff8d6" transparent opacity={0.85} />
        </mesh>
      )}

      {/* 3인 합주('play') 중일 때만 발밑에 빛나는 멤버 컬러 리듬 링 */}
      <mesh
        ref={registerPlayRingRef}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      >
        <ringGeometry args={[0.45, 0.56, 24]} />
        <meshBasicMaterial color={member.parts.color} transparent opacity={0.68} />
      </mesh>

      {/* 공통 모듈식 캐릭터 (members.json 파츠 적용) */}
      <Character parts={member.parts} actionRef={actionRef} />

      {/* 플레이어가 가까워지면 머리 위에 뜨는 [!] 말풍선 (PC에서는 E 단축키 안내 배지 동시 표시) */}
      {isPlayerNear && isInteractionActive && (
        <Html
          position={[0, 1.82, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            className="npc-alert-bubble"
            data-ui-interactive="true"
            aria-label={`${member.nickname} 프로필 보기 (단축키 E)`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(member);
            }}
          >
            <span>!</span>
            <span className="npc-alert-key">E</span>
          </button>
        </Html>
      )}

      {/* 행동 중 한 번씩 말풍선 없이 문자만 머리 위로 떠오르는 추임새 연출 */}
      {floatingKakegoe && isInteractionActive && (
        <Html
          position={[0, isPlayerNear ? 2.34 : 1.78, 0]}
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

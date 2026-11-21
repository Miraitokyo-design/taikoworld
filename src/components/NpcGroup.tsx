import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { MemberConfig, SongConfig, TaikoTrackDefinition } from '../types/content';
import type { PlayerAction, PlayerState, SpaceConfig } from '../types/world';
import { getDistance2D } from '../systems/collision';
import { createNpcGroupState, stepNpcGroup } from '../systems/npcStateMachine';
import { audioManager } from '../systems/audioManager';
import { Npc } from './Npc';

interface NpcGroupProps {
  /** members.json에서 불러온 전체 서클 NPC 멤버 목록 (향후 15~20명 확장 대응) */
  members: MemberConfig[];
  /** songs.json에서 불러온 멀티 레이어 타이코 곡 목록 */
  songs: SongConfig[];
  /** taikoTracks.json 악기별 음원 매핑 맵 */
  tracksById: Record<string, TaikoTrackDefinition>;
  /** 현재 공간 설정 (2D 경계 및 장애물 충돌 계산용) */
  space: SpaceConfig;
  /** 플레이어 현재 위치 확인용 단일 상태 ref */
  playerStateRef: MutableRefObject<PlayerState>;
  /** 입장 완료 여부 (입장 후에만 합주 배경 북소리 출력) */
  hasEntered: boolean;
  /** 탐색 화면이 활성화되어 NPC 상호작용(! 말풍선)을 표시할 수 있는지 여부 */
  isInteractionActive: boolean;
  /** 플레이어에게 가장 가까운 근접 NPC가 바뀔 때 App에 알리는 콜백 (PC E 키 연동용) */
  onNearbyMemberChange: (member: MemberConfig | null) => void;
  /** 가까워진 NPC를 클릭/탭했을 때 프로필 카드를 여는 콜백 */
  onSelectMember: (member: MemberConfig) => void;
}

/** 플레이어가 NPC에 가까워졌다고 판정하는 거리 (m) */
const NPC_INTERACT_RADIUS = 2.2;

/**
 * 공원의 모든 NPC 멤버들을 하나의 루프에서 통합 관리하는 컴포넌트
 * - 정해진 주기 없이 랜덤으로 산책하다가, 공통 연주 가능 곡이 있는 3명 이상이 바로 옆에 모이면
 *   같은 방향을 바라보며 songs.json 악보에 맞춰 함께 합주합니다.
 * - 15~20명으로 늘어나도 단일 useFrame 루프로 가볍게 동작합니다.
 */
export function NpcGroup({
  members,
  songs,
  tracksById,
  space,
  playerStateRef,
  hasEntered,
  isInteractionActive,
  onNearbyMemberChange,
  onSelectMember,
}: NpcGroupProps) {
  // 전체 NPC 그룹 런타임 상태 + 합주 상태 (단일 useRef로 60fps 관리)
  const groupStateRef = useRef(createNpcGroupState(members, space));

  // 각 NPC의 3D 그룹·리듬 링·애니메이션 action ref 배열
  const groupRefs = useRef<Array<Group | null>>([]);
  const playRingRefs = useRef<Array<Mesh | null>>([]);
  const actionRefs = useRef<Array<MutableRefObject<PlayerAction>>>(
    members.map((_, idx) => ({
      current: groupStateRef.current.npcs[idx]?.state ?? 'idle',
    }))
  );

  // 현재 [!] 말풍선이 떠 있는 가장 가까운 NPC ID
  const lastNearbyIdRef = useRef<string | null>(null);
  const [nearbyMemberId, setNearbyMemberId] = useState<string | null>(null);

  // 멤버별 머리 위 추임새 텍스트 상태 맵
  const [kakegoeMap, setKakegoeMap] = useState<
    Record<string, { id: number; text: string } | null>
  >({});
  const kakegoeSeqRef = useRef(0);
  const kakegoeTimersRef = useRef<Record<string, number>>({});

  // 언마운트 시 남아 있는 추임새 타이머 전부 정리
  useEffect(() => {
    const timers = kakegoeTimersRef.current;
    return () => {
      for (const timerId of Object.values(timers)) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  // 탐색 모드가 비활성화되면 근접 상태도 깔끔하게 초기화
  useEffect(() => {
    if (!isInteractionActive && lastNearbyIdRef.current !== null) {
      lastNearbyIdRef.current = null;
      setNearbyMemberId(null);
      onNearbyMemberChange(null);
    }
  }, [isInteractionActive, onNearbyMemberChange]);

  // useFrame: 1개의 통합 루프로 모든 NPC 랜덤 배회·근접 공통곡 합주·플레이어 근접 감지 처리
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const { npcs, ensemble } = groupStateRef.current;

    const { ensembleStep, kakegoeEvents } = stepNpcGroup(
      npcs,
      ensemble,
      songs,
      space,
      delta
    );

    const [px, , pz] = playerStateRef.current.position;
    let closestMember: MemberConfig | null = null;
    let closestDistance = Infinity;
    const ringPulse = 1 + Math.sin(clock.getElapsedTime() * 8) * 0.14;

    // 1) 각 NPC의 3D 변환·행동·리듬 링 반영 및 플레이어와의 최단 거리 계산
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const groupObj = groupRefs.current[i];
      if (groupObj) {
        groupObj.position.set(npc.position[0], npc.position[1], npc.position[2]);
        groupObj.rotation.y = npc.rotationY;
      }

      if (actionRefs.current[i]) {
        actionRefs.current[i].current = npc.state;
      }

      const ringObj = playRingRefs.current[i];
      if (ringObj) {
        const isPlaying = npc.state === 'play';
        ringObj.visible = isPlaying;
        if (isPlaying) {
          ringObj.scale.set(ringPulse, ringPulse, 1);
        }
      }

      if (isInteractionActive) {
        const dist = getDistance2D(px, pz, npc.position[0], npc.position[2]);
        if (dist <= NPC_INTERACT_RADIUS && dist < closestDistance) {
          closestDistance = dist;
          closestMember = members[i];
        }
      }
    }

    // 2) 가장 가까운 근접 NPC가 바뀌었을 때만 상태 및 상위 콜백 갱신
    const nextNearbyId = closestMember ? closestMember.id : null;
    if (nextNearbyId !== lastNearbyIdRef.current) {
      lastNearbyIdRef.current = nextNearbyId;
      setNearbyMemberId(nextNearbyId);
      onNearbyMemberChange(closestMember);
    }

    // 3) 3인 이상 공통곡 합주 중 멀티 레이어 악보의 음표와 다이나믹 볼륨을 그대로 재생
    if (ensembleStep && hasEntered) {
      for (const item of ensembleStep.notes) {
        const trackDef = tracksById[item.instrumentId];
        audioManager.playTrackNote(item.instrumentId, item.note, {
          soundUrl: trackDef?.audioFiles?.[item.note],
          isNpc: true,
          volume: item.volume,
        });
      }
    }

    // 4) 발생한 추임새 이벤트를 각 NPC 머리 위 텍스트로 1.35초간 표시
    if (kakegoeEvents.length > 0 && isInteractionActive) {
      for (const evt of kakegoeEvents) {
        const nextId = ++kakegoeSeqRef.current;
        setKakegoeMap((prev) => ({
          ...prev,
          [evt.memberId]: { id: nextId, text: evt.text },
        }));

        const prevTimer = kakegoeTimersRef.current[evt.memberId];
        if (prevTimer !== undefined) {
          window.clearTimeout(prevTimer);
        }

        kakegoeTimersRef.current[evt.memberId] = window.setTimeout(() => {
          setKakegoeMap((prev) =>
            prev[evt.memberId]?.id === nextId ? { ...prev, [evt.memberId]: null } : prev
          );
        }, 1350);
      }
    }
  });

  return (
    <group name="npc_group">
      {members.map((member, index) => {
        const runtime = groupStateRef.current.npcs[index];
        return (
          <Npc
            key={member.id}
            member={member}
            initialPosition={[...runtime.position]}
            initialRotationY={runtime.rotationY}
            registerGroupRef={(group) => {
              groupRefs.current[index] = group;
            }}
            registerPlayRingRef={(mesh) => {
              playRingRefs.current[index] = mesh;
            }}
            actionRef={actionRefs.current[index]}
            isPlayerNear={nearbyMemberId === member.id}
            isInteractionActive={isInteractionActive}
            floatingKakegoe={kakegoeMap[member.id] ?? null}
            onSelect={onSelectMember}
          />
        );
      })}
    </group>
  );
}

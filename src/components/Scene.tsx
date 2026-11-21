import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { MemberConfig, SongConfig, TaikoTrackDefinition } from '../types/content';
import type { InstrumentConfig, MoveVector, PlayerState, SpaceConfig } from '../types/world';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import { resolvePlayerPosition } from '../systems/collision';
import { Space } from './Space';
import { Taiko } from './Taiko';
import { Player } from './Player';
import { NpcGroup } from './NpcGroup';
import { DestinationMarker } from './DestinationMarker';

interface SceneProps {
  /** 현재 표시할 공간 설정 */
  space: SpaceConfig;
  /** 공간에 배치할 악기 목록 */
  instruments: InstrumentConfig[];
  /** 공간에서 활동할 서클 NPC 멤버 목록 */
  members: MemberConfig[];
  /** NPC 합주에서 사용할 타이코 곡 & 악보 목록 */
  songs: SongConfig[];
  /** taikoTracks.json 기반 악기별 사운드/색상 맵 */
  tracksById: Record<string, TaikoTrackDefinition>;
  /** 플레이어의 위치·방향·행동을 담은 단일 상태 ref */
  playerStateRef: MutableRefObject<PlayerState>;
  /** 모바일 플로팅 조이스틱 방향 벡터 ref */
  joystickVectorRef: MutableRefObject<MoveVector>;
  /** 입장 완료 여부 (입장 전에는 이동 및 배경 소리 차단) */
  hasEntered: boolean;
  /** 캘린더·서클 소개·프로필 등 모달이 열려 있는지 여부 (열려 있으면 이동/클릭 일시 정지) */
  isModalOpen: boolean;
  /** 현재 연주 중인 악기 (없으면 null) */
  activeInstrument: InstrumentConfig | null;
  /** 플레이어가 가까이 다가가 있는 악기 (링 강조 표시용) */
  nearbyInstrument: InstrumentConfig | null;
  /** 근처 악기 변경 시 상위에 알리는 콜백 */
  onNearbyInstrumentChange: (instrument: InstrumentConfig | null) => void;
  /** 가장 가까운 근접 NPC가 바뀔 때 상위에 알리는 콜백 (PC E 키 연동용) */
  onNearbyMemberChange: (member: MemberConfig | null) => void;
  /** 북을 직접 클릭해 연주 모드로 들어갈 때 호출되는 콜백 */
  onSelectInstrument: (instrument: InstrumentConfig) => void;
  /** 3D 공간에서 NPC를 클릭/터치했을 때 프로필 카드를 여는 콜백 */
  onSelectMember: (member: MemberConfig) => void;
  /** 북 타격 시 3D 북을 살짝 울리게 하는 공유 ref */
  taikoHitPulseRef: MutableRefObject<number>;
}

/**
 * 3D 월드 전체 장면(배경, 조명, 공간, 악기, NPC 멤버, 플레이어, 클릭 목적지 표시)을 조립하는 컴포넌트
 */
export function Scene({
  space,
  instruments,
  members,
  songs,
  tracksById,
  playerStateRef,
  joystickVectorRef,
  hasEntered,
  isModalOpen,
  activeInstrument,
  nearbyInstrument,
  onNearbyInstrumentChange,
  onNearbyMemberChange,
  onSelectInstrument,
  onSelectMember,
  taikoHitPulseRef,
}: SceneProps) {
  // PC 키보드(WASD / 방향키) 입력 상태 추적
  const pressedKeysRef = useKeyboardInput();

  // PC 바닥 클릭으로 지정된 목적지 상태 (DestinationMarker 표시용)
  const [targetPoint, setTargetPoint] = useState<[number, number] | null>(null);

  const canMove = hasEntered && !isModalOpen && activeInstrument === null;

  // useCallback: 불필요한 함수 재생성을 막기 위해 콜백을 기억하는 Hook
  const handleGroundClick = useCallback(
    (rawPoint: [number, number]) => {
      if (!canMove) return;
      // 장애물 안이나 광장 바깥을 클릭해도 이동 가능한 가장 가까운 지점으로 보정
      const safePoint = resolvePlayerPosition(rawPoint[0], rawPoint[1], space);
      setTargetPoint([safePoint.x, safePoint.z]);
    },
    [space, canMove]
  );

  const handleClearTarget = useCallback(() => {
    setTargetPoint(null);
  }, []);

  const handleSelectInstrument = useCallback(
    (instrument: InstrumentConfig) => {
      if (!hasEntered || isModalOpen) return;
      setTargetPoint(null);
      onSelectInstrument(instrument);
    },
    [hasEntered, isModalOpen, onSelectInstrument]
  );

  const handleSelectMember = useCallback(
    (member: MemberConfig) => {
      if (!hasEntered || isModalOpen || activeInstrument !== null) return;
      setTargetPoint(null);
      onSelectMember(member);
    },
    [hasEntered, isModalOpen, activeInstrument, onSelectMember]
  );

  return (
    <>
      {/* 맑고 따뜻한 낮 하늘색 배경과 부드러운 원거리 안개 (넓어진 원형 광장에 맞춰 시야 거리 확장) */}
      <color attach="background" args={['#cde9f6']} />
      <fog attach="fog" args={['#cde9f6', 22, 46]} />

      {/* 하늘(위)과 잔디(아래)에서 은은하게 퍼지는 반구 조명 */}
      <hemisphereLight args={['#fffdf5', '#76b569', 1.1]} />

      {/* 따뜻한 햇살 느낌의 주 조명 */}
      <directionalLight position={[6, 12, 8]} intensity={1.35} color="#fff6e0" />

      {/* 잔디 공원 공간 (PC 바닥 클릭 이벤트 연결) */}
      <Space space={space} onGroundClick={handleGroundClick} />

      {/* 바닥 클릭 시 목적지를 알려주는 반짝이는 링 (연주 모드에서는 숨김) */}
      <DestinationMarker target={canMove ? targetPoint : null} />

      {/* instruments.json에 등록된 모든 타이코 배치 */}
      {instruments.map((instrument) => (
        <Taiko
          key={instrument.id}
          instrument={instrument}
          isNearby={nearbyInstrument?.id === instrument.id}
          onSelect={handleSelectInstrument}
          hitPulseRef={taikoHitPulseRef}
        />
      ))}

      {/* members.json 기반 서클 NPC 그룹 (랜덤 산책 + 바로 옆 3인 공통곡 합주 + [!] 말풍선 + 추임새) */}
      <NpcGroup
        members={members}
        songs={songs}
        tracksById={tracksById}
        space={space}
        playerStateRef={playerStateRef}
        hasEntered={hasEntered}
        isInteractionActive={canMove}
        onNearbyMemberChange={onNearbyMemberChange}
        onSelectMember={handleSelectMember}
      />

      {/* 게스트 플레이어 캐릭터 (이동 + 2D 충돌 + 악기 근접 감지 + 카메라 제어) */}
      <Player
        playerStateRef={playerStateRef}
        space={space}
        instruments={instruments}
        activeInstrument={activeInstrument}
        canMove={canMove}
        targetPoint={targetPoint}
        onClearTarget={handleClearTarget}
        onNearbyInstrumentChange={onNearbyInstrumentChange}
        pressedKeysRef={pressedKeysRef}
        joystickVectorRef={joystickVectorRef}
      />
    </>
  );
}

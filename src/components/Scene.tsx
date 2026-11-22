import { useCallback, useMemo, useState } from 'react';
import type { MutableRefObject } from 'react';
import type {
  CharacterAppearance,
  MemberConfig,
  SongConfig,
  TaikoTrackDefinition,
} from '../types/content';
import type {
  GroupHideoutConfig,
  InstrumentConfig,
  MoveVector,
  NearbyEnsembleInfo,
  PlayerState,
  SpaceConfig,
} from '../types/world';
import type { EffectiveWorldAtmosphere } from '../utils/themeResolver';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import { resolvePlayerPosition } from '../systems/collision';
import { Space } from './Space';
import { Taiko } from './Taiko';
import { Player } from './Player';
import { NpcGroup } from './NpcGroup';
import { GroupHideout } from './GroupHideout';
import { DestinationMarker } from './DestinationMarker';
import { ThemeProps } from './ThemeProps';
import { ThemeWeather } from './ThemeWeather';

interface SceneProps {
  /** 현재 표시할 공간 설정 (시즌 소품 장애물 포함) */
  space: SpaceConfig;
  /** 기본 배경 테마와 운영자 시즌 테마가 통합된 최종 3D 분위기 설정 */
  atmosphere: EffectiveWorldAtmosphere;
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
  /** 게스트 플레이어의 5-레이어 모듈식 외형 설정 */
  playerAppearance: CharacterAppearance;
  /** 모바일 플로팅 조이스틱 방향 벡터 ref */
  joystickVectorRef: MutableRefObject<MoveVector>;
  /** 입장 완료 여부 (입장 전에는 이동 및 배경 소리 차단) */
  hasEntered: boolean;
  /** 캘린더·서클 소개·프로필 등 모달이 열려 있는지 여부 (열려 있으면 이동/클릭 일시 정지) */
  isModalOpen: boolean;
  /** 캐릭터 꾸미기 모드 활성화 여부 */
  isCustomizing: boolean;
  /** 꾸미기 프리뷰 중 캐릭터 좌/우 회전 각도(라디안) */
  customizeRotationOffset: number;
  /** 꾸미기 프리뷰 중 연주('play') 포즈 테스트 여부 */
  isCustomizePlaying: boolean;
  /** 플레이어가 현재 함께 참가 중인 NPC 합주 정보 (미참가 시 null) */
  joinedEnsemble: NearbyEnsembleInfo | null;
  /** 합주 참가 중 플레이어 머리 위에 띄울 추임새 텍스트 */
  playerKakegoe: { id: number; text: string } | null;
  /** 현재 연주 중인 악기 (없으면 null) */
  activeInstrument: InstrumentConfig | null;
  /** 플레이어가 가까이 다가가 있는 악기 (링 강조 표시용) */
  nearbyInstrument: InstrumentConfig | null;
  /** 플레이어가 가까이 다가가 있는 지역 단체 아지트 ([! E] 말풍선 표시용) */
  nearbyHideout: GroupHideoutConfig | null;
  /** 근처 악기 변경 시 상위에 알리는 콜백 */
  onNearbyInstrumentChange: (instrument: InstrumentConfig | null) => void;
  /** 가장 가까운 근접 NPC가 바뀔 때 상위에 알리는 콜백 (PC E 키 연동용) */
  onNearbyMemberChange: (member: MemberConfig | null) => void;
  /** 근처 진행 중인 NPC 합주 상태가 바뀔 때 상위에 알리는 콜백 (E 합주 참가 연동용) */
  onNearbyEnsembleChange: (info: NearbyEnsembleInfo | null) => void;
  /** 합주 참가 중 이동 입력으로 자연스럽게 나갈 때 호출되는 콜백 */
  onLeaveEnsemble: () => void;
  /** 근처 지역 단체 아지트가 바뀔 때 상위에 알리는 콜백 (PC E 키 연동용) */
  onNearbyHideoutChange: (hideout: GroupHideoutConfig | null) => void;
  /** 북을 직접 클릭해 연주 모드로 들어갈 때 호출되는 콜백 */
  onSelectInstrument: (instrument: InstrumentConfig) => void;
  /** 3D 공간에서 NPC를 클릭/터치했을 때 프로필 카드를 여는 콜백 */
  onSelectMember: (member: MemberConfig) => void;
  /** 3D 공간에서 지역 단체 아지트를 클릭/터치했을 때 단체 소개를 여는 콜백 */
  onSelectHideout: (hideout: GroupHideoutConfig) => void;
  /** 북 타격 시 3D 북을 살짝 울리게 하는 공유 ref */
  taikoHitPulseRef: MutableRefObject<number>;
}

/**
 * 3D 월드 전체 장면(배경, 조명, 공간, 악기, NPC 멤버, 플레이어, 클릭 목적지 표시)을 조립하는 컴포넌트
 */
export function Scene({
  space,
  atmosphere,
  instruments,
  members,
  songs,
  tracksById,
  playerStateRef,
  playerAppearance,
  joystickVectorRef,
  hasEntered,
  isModalOpen,
  isCustomizing,
  customizeRotationOffset,
  isCustomizePlaying,
  joinedEnsemble,
  playerKakegoe,
  activeInstrument,
  nearbyInstrument,
  nearbyHideout,
  onNearbyInstrumentChange,
  onNearbyMemberChange,
  onNearbyEnsembleChange,
  onLeaveEnsemble,
  onNearbyHideoutChange,
  onSelectInstrument,
  onSelectMember,
  onSelectHideout,
  taikoHitPulseRef,
}: SceneProps) {
  // PC 키보드(WASD / 방향키) 입력 상태 추적
  const pressedKeysRef = useKeyboardInput();

  // PC 바닥 클릭으로 지정된 목적지 상태 (DestinationMarker 표시용)
  const [targetPoint, setTargetPoint] = useState<[number, number] | null>(null);

  const canMove = hasEntered && !isModalOpen && activeInstrument === null;

  // 구글 시트에서 멤버가 추가/삭제되어 목록 ID가 바뀌면 NpcGroup의 런타임 배열을 안전하게 새로 초기화
  const membersKey = useMemo(
    () => members.map((member) => member.id).join('|'),
    [members]
  );

  // useCallback: 불필요한 함수 재생성을 막기 위해 콜백을 기억하는 Hook
  const handleGroundClick = useCallback(
    (rawPoint: [number, number]) => {
      if (!canMove) return;
      if (joinedEnsemble) {
        onLeaveEnsemble();
      }
      // 장애물 안이나 광장 바깥을 클릭해도 이동 가능한 가장 가까운 지점으로 보정
      const safePoint = resolvePlayerPosition(rawPoint[0], rawPoint[1], space);
      setTargetPoint([safePoint.x, safePoint.z]);
    },
    [space, canMove, joinedEnsemble, onLeaveEnsemble]
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

  const handleSelectHideout = useCallback(
    (hideout: GroupHideoutConfig) => {
      if (!hasEntered || isModalOpen || activeInstrument !== null) return;
      setTargetPoint(null);
      onSelectHideout(hideout);
    },
    [hasEntered, isModalOpen, activeInstrument, onSelectHideout]
  );

  return (
    <>
      {/* 기본 배경 테마(잔디 공원·연습실·눈오는 들판 등) 및 운영자 시즌 테마에 따른 하늘색과 안개 */}
      <color attach="background" args={[atmosphere.skyColor]} />
      <fog attach="fog" args={[atmosphere.skyColor, 22, 46]} />

      {/* 하늘(위)과 바닥(아래)에서 은은하게 퍼지는 반구 조명 */}
      <hemisphereLight
        args={[atmosphere.ambientSkyColor, atmosphere.ambientGroundColor, 1.1]}
      />

      {/* 배경/시즌별 햇살 및 조명 */}
      <directionalLight
        position={[6, 12, 8]}
        intensity={atmosphere.sunIntensity}
        color={atmosphere.sunColor}
      />

      {/* 반대편 그림자가 너무 어둡게 죽지 않도록 도와주는 은은한 보조 조명 (Blender PBR GLB 대비) */}
      <directionalLight position={[-7, 6, -6]} intensity={0.45} color="#d9ecff" />

      {/* 잔디 공원/연습실/설원 등 기본 공간 (PC 바닥 클릭 이벤트 연결) */}
      <Space space={space} atmosphere={atmosphere} onGroundClick={handleGroundClick} />

      {/* 운영자 일괄 시즌 · 이벤트 3D 소품 (크리스마스 트리, 졸업·입학 아치, 오봉 야구라 등) */}
      <ThemeProps theme={atmosphere.seasonTheme} />

      {/* 경량 날씨 파티클 (눈, 벚꽃잎, 반딧불이, 여름 햇살) */}
      <ThemeWeather weather={atmosphere.weather} />

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

      {/* spaces.json에 등록된 지역 타이코 단체 아지트(큐브) 배치 */}
      {(space.hideouts ?? []).map((hideout) => (
        <GroupHideout
          key={hideout.id}
          hideout={hideout}
          isPlayerNear={nearbyHideout?.id === hideout.id}
          isInteractionActive={canMove}
          onSelect={handleSelectHideout}
        />
      ))}

      {/* members.json 또는 구글 시트 기반 서클 NPC 그룹 (랜덤 산책 + 바로 옆 3인 이상 공통곡 합주 + [!] 말풍선 + 추임새) */}
      <NpcGroup
        key={membersKey}
        members={members}
        songs={songs}
        tracksById={tracksById}
        space={space}
        playerStateRef={playerStateRef}
        hasEntered={hasEntered}
        isInteractionActive={canMove}
        isPlayerJoinedEnsemble={joinedEnsemble !== null}
        onNearbyMemberChange={onNearbyMemberChange}
        onNearbyEnsembleChange={onNearbyEnsembleChange}
        onSelectMember={handleSelectMember}
      />

      {/* 게스트 플레이어 캐릭터 (이동 + 2D 충돌 + 악기 근접 감지 + 합주 참가 + 카메라 제어) */}
      <Player
        playerStateRef={playerStateRef}
        appearance={playerAppearance}
        space={space}
        instruments={instruments}
        activeInstrument={activeInstrument}
        canMove={canMove}
        isCustomizing={isCustomizing}
        customizeRotationOffset={customizeRotationOffset}
        isCustomizePlaying={isCustomizePlaying}
        joinedEnsemble={joinedEnsemble}
        onLeaveEnsemble={onLeaveEnsemble}
        playerKakegoe={playerKakegoe}
        targetPoint={targetPoint}
        onClearTarget={handleClearTarget}
        onNearbyInstrumentChange={onNearbyInstrumentChange}
        onNearbyHideoutChange={onNearbyHideoutChange}
        pressedKeysRef={pressedKeysRef}
        joystickVectorRef={joystickVectorRef}
      />
    </>
  );
}

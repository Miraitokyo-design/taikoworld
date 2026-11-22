import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import spacesData from './data/spaces.json';
import instrumentsData from './data/instruments.json';
import scheduleData from './data/schedule.json';
import circleData from './data/circle.json';
import membersData from './data/members.json';
import songsData from './data/songs.json';
import taikoTracksData from './data/taikoTracks.json';
import taikoGuideData from './data/taikoGuide.json';
import themesData from './data/themes.json';
import worldEnvironmentsData from './data/worldEnvironments.json';
import type {
  GroupHideoutConfig,
  InstrumentConfig,
  MoveVector,
  NearbyEnsembleInfo,
  PlayerState,
  SpaceConfig,
} from './types/world';
import type {
  CharacterAppearance,
  CircleInfo,
  MemberConfig,
  ScheduleEvent,
  SeasonThemeCatalog,
  SongConfig,
  TaikoGuideData,
  TaikoTrackDefinition,
  WorldEnvironmentConfig,
} from './types/content';
import { audioManager } from './systems/audioManager';
import type { TaikoHitType } from './systems/audioManager';
import { TAIKO_KAKEGOE_PHRASES } from './systems/npcStateMachine';
import { getNextUpcomingEvent } from './utils/scheduleUtils';
import { loadCustomSongs, saveCustomSongs } from './utils/customSongsStorage';
import {
  loadOrCreateGuestAppearance,
  saveGuestAppearance,
} from './utils/characterAppearance';
import {
  buildSpaceWithThemeObstacles,
  composeWorldAtmosphere,
  resolveDeployedSeasonTheme,
} from './utils/themeResolver';
import { useScheduleEvents } from './hooks/useScheduleEvents';
import { useMembers } from './hooks/useMembers';
import { Scene } from './components/Scene';
import { VirtualJoystick } from './components/ui/VirtualJoystick';
import { LandingOverlay } from './components/ui/LandingOverlay';
import { TaikoPlayOverlay } from './components/ui/TaikoPlayOverlay';
import { ScheduleBanner } from './components/ui/ScheduleBanner';
import { SoundControl } from './components/ui/SoundControl';

// React.lazy(지연 로딩): 입장 직후에는 안 보이는 무거운 모달들을 별도 청크로 분리해
// 모바일 첫 로딩 속도를 높이고, 사용자가 모달을 열 때만 필요한 코드를 불러옵니다.
const ScheduleCalendarModal = lazy(() =>
  import('./components/ui/ScheduleCalendarModal').then((m) => ({
    default: m.ScheduleCalendarModal,
  }))
);
const CircleInfoModal = lazy(() =>
  import('./components/ui/CircleInfoModal').then((m) => ({
    default: m.CircleInfoModal,
  }))
);
const MemberProfileModal = lazy(() =>
  import('./components/ui/MemberProfileModal').then((m) => ({
    default: m.MemberProfileModal,
  }))
);
const MemberDirectoryModal = lazy(() =>
  import('./components/ui/MemberDirectoryModal').then((m) => ({
    default: m.MemberDirectoryModal,
  }))
);
const SongBookModal = lazy(() =>
  import('./components/ui/SongBookModal').then((m) => ({
    default: m.SongBookModal,
  }))
);
const TaikoGuideModal = lazy(() =>
  import('./components/ui/TaikoGuideModal').then((m) => ({
    default: m.TaikoGuideModal,
  }))
);
const MenuModal = lazy(() =>
  import('./components/ui/MenuModal').then((m) => ({
    default: m.MenuModal,
  }))
);
const CharacterCustomizerPanel = lazy(() =>
  import('./components/ui/CharacterCustomizerPanel').then((m) => ({
    default: m.CharacterCustomizerPanel,
  }))
);

// JSON 배열은 TypeScript가 일반 number[]로 추론하므로, 엄격한 타입으로 안전하게 연결
const spaces = spacesData as unknown as SpaceConfig[];
const instruments = instrumentsData as unknown as InstrumentConfig[];
const fallbackScheduleEvents = scheduleData as ScheduleEvent[];
const circleInfo = circleData as CircleInfo;
const fallbackMembers = membersData as MemberConfig[];
const songs = songsData as SongConfig[];
const taikoTracks = taikoTracksData as unknown as TaikoTrackDefinition[];
const taikoGuide = taikoGuideData as TaikoGuideData;
const seasonCatalog = themesData as unknown as SeasonThemeCatalog;
const worldEnvironments = worldEnvironmentsData as WorldEnvironmentConfig[];

/** 사용자가 선택한 기본 배경 테마를 브라우저에 기억하는 키 */
const ENV_STORAGE_KEY = 'taikoworld_world_env_v1';

/** 저장된 기본 배경 테마 ID를 안전하게 복원하는 보조 함수 */
function loadSavedEnvironmentId(): string {
  try {
    const saved = window.localStorage.getItem(ENV_STORAGE_KEY);
    if (saved && worldEnvironments.some((env) => env.id === saved)) {
      return saved;
    }
  } catch {
    // 저장소 접근 불가 환경은 기본값 사용
  }
  return worldEnvironments[0].id;
}

// 악기 ID로 트랙 정보(이름·색상·음원 경로)를 즉시 조회하는 맵 생성
const tracksById: Record<string, TaikoTrackDefinition> = Object.fromEntries(
  taikoTracks.map((track) => [track.id, track])
);

/**
 * Taiko World 최상위 앱 컴포넌트
 * - 입장 화면, 3D 잔디 공원 탐색(지역 단체 아지트 큐브 + 6명 NPC 근접 합주),
 *   메뉴바, 세분화 소리 설정(직접 연주 vs NPC 합주 + 팝업 시 자동 덕킹),
 *   멀티 레이어 악보/직접 작곡, 지역 단체 소개 모달을 통합 관리합니다.
 */
export function App() {
  // MVP 1차 공간: 첫 번째 공간(잔디 공원)을 기본으로 불러옴
  const baseSpace = spaces[0];

  // 운영자 일괄 배포 시즌 테마 (themes.json의 activeOverride 또는 날짜 범위로 모든 사용자에게 일괄 적용)
  const deployedSeasonTheme = useMemo(
    () => resolveDeployedSeasonTheme(seasonCatalog),
    []
  );

  // 사용자가 메뉴에서 변경할 수 있는 기본 배경 테마 (잔디 공원, 연습실, 눈오는 들판, 노을 광장)
  const [selectedEnvId, setSelectedEnvId] = useState<string>(() =>
    loadSavedEnvironmentId()
  );
  const selectedEnvironment = useMemo(
    () =>
      worldEnvironments.find((env) => env.id === selectedEnvId) ??
      worldEnvironments[0],
    [selectedEnvId]
  );

  // 기본 배경 테마와 운영자 일괄 시즌 테마를 합친 최종 3D 분위기 설정
  const worldAtmosphere = useMemo(
    () => composeWorldAtmosphere(selectedEnvironment, deployedSeasonTheme),
    [selectedEnvironment, deployedSeasonTheme]
  );

  // 활성 시즌 소품(트리, 아치, 야구라 등)의 2D 원형 장애물을 공간에 자동 합산
  const currentSpace = useMemo(
    () => buildSpaceWithThemeObstacles(baseSpace, deployedSeasonTheme),
    [baseSpace, deployedSeasonTheme]
  );

  // 구글 스프레드시트(VITE_SCHEDULE_CSV_URL)가 설정되어 있으면 실시간 일정을, 없으면 기본 JSON 일정을 사용
  const { events: scheduleEvents } = useScheduleEvents(fallbackScheduleEvents);

  // 구글 스프레드시트(VITE_MEMBERS_CSV_URL)가 설정되어 있으면 실시간 멤버 목록을, 없으면 기본 JSON 멤버를 사용
  const { members } = useMembers(fallbackMembers, songs);

  // 오늘 날짜 기준으로 가장 가까운 예정 연주 1건 계산
  const nextUpcomingEvent = useMemo(
    () => getNextUpcomingEvent(scheduleEvents),
    [scheduleEvents]
  );

  // 브라우저 localStorage에 저장된 사용자 작곡 곡 목록 상태
  const [customSongs, setCustomSongs] = useState<SongConfig[]>(() => loadCustomSongs());

  // 게스트 캐릭터 외형 상태: 첫 방문이면 랜덤 생성 후 자동 저장, 재방문이면 기존 캐릭터 복원
  const [playerAppearance, setPlayerAppearance] = useState<CharacterAppearance>(() =>
    loadOrCreateGuestAppearance()
  );

  // 캐릭터 꾸미기 모드 상태 (열림 여부, 3D 회전 각도, 연주 포즈 테스트)
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customizeRotationOffset, setCustomizeRotationOffset] = useState(0);
  const [isCustomizePlaying, setIsCustomizePlaying] = useState(false);

  // 화면 진입 및 세분화 소리·볼륨 설정 상태 (직접 연주 소리 / NPC 합주 소리 개별 제어)
  const [hasEntered, setHasEntered] = useState(false);
  const [isPlayerSoundOn, setIsPlayerSoundOn] = useState(true);
  const [isNpcSoundOn, setIsNpcSoundOn] = useState(true);
  const [playerVolume, setPlayerVolume] = useState(0.9);
  const [npcVolume, setNpcVolume] = useState(0.85);
  const [isSoundPopoverOpen, setIsSoundPopoverOpen] = useState(false);

  // 3D 근접 상호작용 대상 상태 (북 / NPC / 지역 단체 아지트 / 진행 중인 NPC 합주)
  const [nearbyInstrument, setNearbyInstrument] = useState<InstrumentConfig | null>(null);
  const [nearbyMember, setNearbyMember] = useState<MemberConfig | null>(null);
  const [nearbyHideout, setNearbyHideout] = useState<GroupHideoutConfig | null>(null);
  const [nearbyEnsemble, setNearbyEnsemble] = useState<NearbyEnsembleInfo | null>(null);
  const [isJoinedEnsemble, setIsJoinedEnsemble] = useState(false);
  const [playerKakegoe, setPlayerKakegoe] = useState<{ id: number; text: string } | null>(
    null
  );
  const playerKakegoeSeqRef = useRef(0);
  const playerKakegoeTimerRef = useRef<number | null>(null);
  const [activeInstrument, setActiveInstrument] = useState<InstrumentConfig | null>(null);

  // 모달 열림 상태
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isMemberDirectoryOpen, setIsMemberDirectoryOpen] = useState(false);
  const [isSongBookOpen, setIsSongBookOpen] = useState(false);
  const [isTaikoGuideOpen, setIsTaikoGuideOpen] = useState(false);
  const [isCircleOpen, setIsCircleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberConfig | null>(null);

  // 메뉴 진입 여부 및 지역 단체 아지트 진입 시 초기 탭/강조 단체 상태
  const [openedFromMenu, setOpenedFromMenu] = useState(false);
  const [guideInitialTab, setGuideInitialTab] = useState<'types' | 'groups'>('types');
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);
  const [guideOpenedFromHideout, setGuideOpenedFromHideout] = useState(false);

  // 플레이어 상태 단일 객체 (60fps 이동을 위해 useRef 관리)
  const playerStateRef = useRef<PlayerState>({
    position: [...currentSpace.spawnPoint],
    rotationY: Math.PI,
    action: 'idle',
  });

  const joystickVectorRef = useRef<MoveVector>({ x: 0, z: 0 });
  const taikoHitPulseRef = useRef(0);

  /** 사용자가 직접 작곡한 곡을 저장(신규 추가 또는 덮어쓰기)하는 핸들러 */
  const handleSaveCustomSong = useCallback((savedSong: SongConfig) => {
    setCustomSongs((prev) => {
      const exists = prev.some((item) => item.id === savedSong.id);
      const next = exists
        ? prev.map((item) => (item.id === savedSong.id ? savedSong : item))
        : [...prev, savedSong];
      saveCustomSongs(next);
      return next;
    });
  }, []);

  /** 저장된 사용자 작곡 곡을 삭제하는 핸들러 */
  const handleDeleteCustomSong = useCallback((songId: string) => {
    setCustomSongs((prev) => {
      const next = prev.filter((item) => item.id !== songId);
      saveCustomSongs(next);
      return next;
    });
  }, []);

  /** 게스트 캐릭터 외형 변경 시 3D 화면에 즉시 반영하고 localStorage에 자동 저장하는 핸들러 */
  const handleChangePlayerAppearance = useCallback((next: CharacterAppearance) => {
    setPlayerAppearance(next);
    saveGuestAppearance(next);
  }, []);

  /** 꾸미기 프리뷰 중 캐릭터를 좌/우로 회전하거나 정면(0)으로 되돌리는 핸들러 */
  const handleRotateCustomizePreview = useCallback((deltaRadians: number | 'reset') => {
    if (deltaRadians === 'reset') {
      setCustomizeRotationOffset(0);
      return;
    }
    setCustomizeRotationOffset((prev) => prev + deltaRadians);
  }, []);

  /** 열려 있는 모든 정보 모달 및 팝오버를 한 번에 닫는 보조 함수 */
  const closeAllModals = useCallback(() => {
    setIsSoundPopoverOpen(false);
    setIsMenuOpen(false);
    setIsScheduleOpen(false);
    setIsMemberDirectoryOpen(false);
    setIsSongBookOpen(false);
    setIsTaikoGuideOpen(false);
    setIsCircleOpen(false);
    setIsCustomizing(false);
    setIsCustomizePlaying(false);
    setIsJoinedEnsemble(false);
    setSelectedMember(null);
    setOpenedFromMenu(false);
    setGuideOpenedFromHideout(false);
    setHighlightedGroupId(null);
  }, []);

  /** 메뉴에서 진입한 하위 모달에서 [← 메뉴] 버튼을 눌렀을 때 메뉴바로 되돌아가는 함수 */
  const handleBackToMenu = useCallback(() => {
    closeAllModals();
    setIsMenuOpen(true);
  }, [closeAllModals]);

  /** NPC 클릭/E키 시 프로필 카드를 여는 안정화된 콜백 (NpcGroup 불필요 재렌더링 방지) */
  const handleSelectMember = useCallback(
    (member: MemberConfig) => {
      closeAllModals();
      setSelectedMember(member);
    },
    [closeAllModals]
  );

  /** 지역 단체 아지트(큐브)에 접근해 클릭 또는 E 키로 해당 지역 단체 소개를 여는 핸들러 */
  const handleOpenHideoutGuide = useCallback(
    (hideout: GroupHideoutConfig) => {
      closeAllModals();
      setGuideInitialTab('groups');
      setHighlightedGroupId(hideout.groupId);
      setGuideOpenedFromHideout(true);
      setIsTaikoGuideOpen(true);
    },
    [closeAllModals]
  );

  /** [타이코 월드 입장] 버튼 클릭 핸들러 */
  const handleEnterWorld = useCallback(async () => {
    await audioManager.unlock();
    for (const inst of instruments) {
      void audioManager.preloadTaikoSounds(inst.sounds);
    }
    const trackSoundUrls = taikoTracks.flatMap((track) =>
      track.audioFiles ? Object.values(track.audioFiles) : []
    );
    void audioManager.preloadSoundUrls(trackSoundUrls);
    setHasEntered(true);
  }, []);

  /** 기본 배경 테마 변경 핸들러 (잔디 공원·연습실·눈오는 들판 등, localStorage 저장) */
  const handleSelectEnvironment = useCallback((envId: string) => {
    setSelectedEnvId(envId);
    try {
      window.localStorage.setItem(ENV_STORAGE_KEY, envId);
    } catch {
      // 무시
    }
  }, []);

  /** 직접 연주 소리 ON/OFF 토글 핸들러 */
  const handleTogglePlayerSound = useCallback(() => {
    setIsPlayerSoundOn((prev) => {
      const next = !prev;
      if (next && playerVolume === 0) {
        setPlayerVolume(0.9);
        audioManager.setPlayerVolume(0.9);
      }
      audioManager.setPlayerSoundEnabled(next);
      return next;
    });
  }, [playerVolume]);

  /** 직접 연주 볼륨 슬라이더 변경 핸들러 (0.0 ~ 1.0) */
  const handleChangePlayerVolume = useCallback((volume: number) => {
    setPlayerVolume(volume);
    audioManager.setPlayerVolume(volume);
    if (volume > 0) {
      setIsPlayerSoundOn(true);
      audioManager.setPlayerSoundEnabled(true);
    } else {
      setIsPlayerSoundOn(false);
      audioManager.setPlayerSoundEnabled(false);
    }
  }, []);

  /** NPC 합주 배경 소리 ON/OFF 토글 핸들러 */
  const handleToggleNpcSound = useCallback(() => {
    setIsNpcSoundOn((prev) => {
      const next = !prev;
      if (next && npcVolume === 0) {
        setNpcVolume(0.85);
        audioManager.setNpcVolume(0.85);
      }
      audioManager.setNpcSoundEnabled(next);
      return next;
    });
  }, [npcVolume]);

  /** NPC 합주 배경 볼륨 슬라이더 변경 핸들러 (0.0 ~ 1.0) */
  const handleChangeNpcVolume = useCallback((volume: number) => {
    setNpcVolume(volume);
    audioManager.setNpcVolume(volume);
    if (volume > 0) {
      setIsNpcSoundOn(true);
      audioManager.setNpcSoundEnabled(true);
    } else {
      setIsNpcSoundOn(false);
      audioManager.setNpcSoundEnabled(false);
    }
  }, []);

  /** 타이코 연주 모드 진입 핸들러 */
  const handleEnterPlayMode = useCallback(
    (instrument: InstrumentConfig) => {
      void audioManager.unlock();
      closeAllModals();
      setActiveInstrument(instrument);
    },
    [closeAllModals]
  );

  /** 타이코 연주 모드 종료([월드로 돌아가기]) 핸들러 */
  const handleExitPlayMode = useCallback(() => {
    setActiveInstrument(null);
  }, []);

  /** 북 중앙(돈) 또는 테두리(카) 타격 시 오디오 재생 + 3D 북 울림 반응 실행 */
  const handleTaikoHit = useCallback(
    (hitType: TaikoHitType) => {
      if (!activeInstrument) return;
      const soundUrl =
        hitType === 'don' ? activeInstrument.sounds.don : activeInstrument.sounds.ka;
      audioManager.playTaikoHit(hitType, soundUrl);
      taikoHitPulseRef.current = hitType === 'don' ? 1 : 0.45;
    },
    [activeInstrument]
  );

  /** NPC 합주에 사용자가 함께 참가할 때 현재 장비 중인 악기의 주음/보조음을 즉시 울리는 핸들러 */
  const handleEnsembleJamHit = useCallback(
    (slot: 'primary' | 'secondary') => {
      void audioManager.unlock();
      const equipped = playerAppearance.equippedInstrument;
      const trackId =
        equipped !== 'none' && equipped !== 'uchiwa' && tracksById[equipped]
          ? equipped
          : 'shaku_4';
      const trackDef = tracksById[trackId];
      const notes = trackDef?.notes ?? ['どん', 'かっ'];
      const note =
        slot === 'primary'
          ? notes[0] ?? 'どん'
          : notes[notes.length - 1] ?? notes[0] ?? 'かっ';
      audioManager.playTrackNote(trackId, note, {
        soundUrl: trackDef?.audioFiles?.[note],
        isNpc: false,
        volume: 0.95,
      });
    },
    [playerAppearance.equippedInstrument]
  );

  /** 합주 참가 중 플레이어 머리 위로 신나는 추임새(それ！ / はっ / ちょいさ〜！)를 띄우는 핸들러 */
  const handlePlayerKakegoe = useCallback(() => {
    const nextId = ++playerKakegoeSeqRef.current;
    const text =
      TAIKO_KAKEGOE_PHRASES[
        Math.floor(Math.random() * TAIKO_KAKEGOE_PHRASES.length)
      ];
    setPlayerKakegoe({ id: nextId, text });
    if (playerKakegoeTimerRef.current !== null) {
      window.clearTimeout(playerKakegoeTimerRef.current);
    }
    playerKakegoeTimerRef.current = window.setTimeout(() => {
      setPlayerKakegoe((prev) => (prev?.id === nextId ? null : prev));
    }, 1350);
  }, []);

  /** 합주 참가 해제 핸들러 */
  const handleLeaveEnsemble = useCallback(() => {
    setIsJoinedEnsemble(false);
  }, []);

  // NPC 합주가 끝나면 사용자 합주 참가 상태도 자동으로 해제
  useEffect(() => {
    if (!nearbyEnsemble && isJoinedEnsemble) {
      setIsJoinedEnsemble(false);
    }
  }, [nearbyEnsemble, isJoinedEnsemble]);

  // 언마운트 시 플레이어 추임새 타이머 정리
  useEffect(() => {
    return () => {
      if (playerKakegoeTimerRef.current !== null) {
        window.clearTimeout(playerKakegoeTimerRef.current);
      }
    };
  }, []);

  const [spawnX, , spawnZ] = currentSpace.spawnPoint;
  const isModalOpen =
    isMenuOpen ||
    isScheduleOpen ||
    isMemberDirectoryOpen ||
    isSongBookOpen ||
    isTaikoGuideOpen ||
    isCircleOpen ||
    isCustomizing ||
    selectedMember !== null;
  const isExploring = hasEntered && activeInstrument === null;
  const showWorldHud = isExploring && !isCustomizing;
  const activeJoinedEnsemble =
    isExploring && !isModalOpen && isJoinedEnsemble ? nearbyEnsemble : null;

  // 메뉴·팝업 창이 열려 있거나 중앙 북 단독 연주 모드일 때만 NPC 배경 볼륨 덕킹 (합주 참가 중에는 그대로!)
  useEffect(() => {
    const shouldDuckNpc = isModalOpen || isSoundPopoverOpen || activeInstrument !== null;
    audioManager.setNpcDucking(shouldDuckNpc);
  }, [isModalOpen, isSoundPopoverOpen, activeInstrument]);

  // PC 단축키(탐색 모드 + 합주 참가 모드):
  // - 합주 참가 중: E/ESC 나가기, F/J 강타, D/K 테두리/보조음, Space 추임새!
  // - 합주 근처 미참가: E로 합주 참가!
  // - 일반 탐색: 북 근처 Space 연주, NPC/아지트 근처 E 정보 열기
  useEffect(() => {
    if (!isExploring || isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (activeJoinedEnsemble) {
        if (event.code === 'KeyE' || event.code === 'Escape') {
          event.preventDefault();
          setIsJoinedEnsemble(false);
        } else if (event.code === 'KeyF' || event.code === 'KeyJ') {
          event.preventDefault();
          handleEnsembleJamHit('primary');
        } else if (event.code === 'KeyD' || event.code === 'KeyK') {
          event.preventDefault();
          handleEnsembleJamHit('secondary');
        } else if (event.code === 'Space') {
          event.preventDefault();
          handlePlayerKakegoe();
        }
        return;
      }

      if (event.code === 'Space' && nearbyInstrument) {
        event.preventDefault();
        handleEnterPlayMode(nearbyInstrument);
      } else if (event.code === 'KeyE') {
        if (nearbyEnsemble) {
          event.preventDefault();
          setIsJoinedEnsemble(true);
          handlePlayerKakegoe();
        } else if (nearbyMember) {
          event.preventDefault();
          closeAllModals();
          setSelectedMember(nearbyMember);
        } else if (nearbyHideout) {
          event.preventDefault();
          handleOpenHideoutGuide(nearbyHideout);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isExploring,
    isModalOpen,
    activeJoinedEnsemble,
    nearbyEnsemble,
    nearbyInstrument,
    nearbyMember,
    nearbyHideout,
    handleEnterPlayMode,
    handleEnsembleJamHit,
    handlePlayerKakegoe,
    handleOpenHideoutGuide,
    closeAllModals,
  ]);

  return (
    <>
      {/* 3D 그래픽을 그리는 캔버스: 모바일 성능 예산에 따라 픽셀 배율(dpr)을 최대 2로 제한 */}
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{
          position: [spawnX, 8.2, spawnZ + 9.2],
          fov: 40,
          near: 0.1,
          far: 100,
        }}
      >
        <Scene
          space={currentSpace}
          atmosphere={worldAtmosphere}
          instruments={instruments}
          members={members}
          songs={songs}
          tracksById={tracksById}
          playerStateRef={playerStateRef}
          playerAppearance={playerAppearance}
          joystickVectorRef={joystickVectorRef}
          hasEntered={hasEntered}
          isModalOpen={isModalOpen}
          isCustomizing={isCustomizing}
          customizeRotationOffset={customizeRotationOffset}
          isCustomizePlaying={isCustomizePlaying}
          joinedEnsemble={activeJoinedEnsemble}
          playerKakegoe={playerKakegoe}
          activeInstrument={activeInstrument}
          nearbyInstrument={nearbyInstrument}
          nearbyHideout={nearbyHideout}
          onNearbyInstrumentChange={setNearbyInstrument}
          onNearbyMemberChange={setNearbyMember}
          onNearbyEnsembleChange={setNearbyEnsemble}
          onLeaveEnsemble={handleLeaveEnsemble}
          onNearbyHideoutChange={setNearbyHideout}
          onSelectInstrument={handleEnterPlayMode}
          onSelectMember={handleSelectMember}
          onSelectHideout={handleOpenHideoutGuide}
          taikoHitPulseRef={taikoHitPulseRef}
        />
      </Canvas>

      {/* 모바일 플로팅 가상 조이스틱 (탐색 중이고 모달이 닫혀 있을 때만 활성화) */}
      <VirtualJoystick
        joystickVectorRef={joystickVectorRef}
        disabled={!isExploring || isModalOpen}
      />

      {/* 입장 전 화면 (첫 터치 시 오디오 활성화) */}
      {!hasEntered && <LandingOverlay onEnter={handleEnterWorld} />}

      {/* 탐색 모드 상단 좌측 [☰ 메뉴] 버튼 */}
      {showWorldHud && (
        <button
          type="button"
          className="menu-toggle-btn"
          onClick={() => {
            closeAllModals();
            setIsMenuOpen(true);
          }}
          aria-label="메뉴 열기"
        >
          <span aria-hidden="true">☰</span>
          <span className="menu-toggle-label">메뉴</span>
        </button>
      )}

      {/* 탐색 모드 상단 정중앙 최단 연주 일정 배너 */}
      {showWorldHud && (
        <div className="schedule-banner-wrap">
          <ScheduleBanner
            nextEvent={nextUpcomingEvent}
            onOpenCalendar={() => {
              closeAllModals();
              setIsScheduleOpen(true);
            }}
          />
        </div>
      )}

      {/* 입장 후 상시 HUD: 우측 상단 세분화 소리·볼륨 설정(직접 연주 vs NPC 합주) */}
      {hasEntered && (
        <SoundControl
          isPlayerSoundOn={isPlayerSoundOn}
          isNpcSoundOn={isNpcSoundOn}
          playerVolume={playerVolume}
          npcVolume={npcVolume}
          isOpen={isSoundPopoverOpen}
          onToggleOpen={() => setIsSoundPopoverOpen((prev) => !prev)}
          onClose={() => setIsSoundPopoverOpen(false)}
          onTogglePlayerSound={handleTogglePlayerSound}
          onToggleNpcSound={handleToggleNpcSound}
          onChangePlayerVolume={handleChangePlayerVolume}
          onChangeNpcVolume={handleChangeNpcVolume}
        />
      )}

      {/* 합주 참가 중 전용 하단 미니 즉석 연주 바 (강타 / 테두리 / 추임새 / 나가기) */}
      {activeJoinedEnsemble && (
        <div className="ensemble-jam-bar" data-ui-interactive="true">
          <div className="ensemble-jam-title">
            🎵 「{activeJoinedEnsemble.songTitle.split(' (')[0]}」 함께 합주 중!
          </div>
          <div className="ensemble-jam-actions">
            <button
              type="button"
              className="ensemble-jam-btn ensemble-jam-btn--primary"
              onPointerDown={(e) => {
                e.stopPropagation();
                handleEnsembleJamHit('primary');
              }}
            >
              <span>🥁 강타</span>
              <span className="key-cap">F/J</span>
            </button>
            <button
              type="button"
              className="ensemble-jam-btn ensemble-jam-btn--secondary"
              onPointerDown={(e) => {
                e.stopPropagation();
                handleEnsembleJamHit('secondary');
              }}
            >
              <span>🥢 테두리</span>
              <span className="key-cap">D/K</span>
            </button>
            <button
              type="button"
              className="ensemble-jam-btn ensemble-jam-btn--kakegoe"
              onClick={() => handlePlayerKakegoe()}
            >
              <span>📣 추임새</span>
              <span className="key-cap">Space</span>
            </button>
            <button
              type="button"
              className="ensemble-jam-btn ensemble-jam-btn--exit"
              onClick={handleLeaveEnsemble}
            >
              <span>나가기</span>
              <span className="key-cap key-cap--dark">E</span>
            </button>
          </div>
        </div>
      )}

      {/* 합주 중인 NPC 옆에 다가갔을 때 표시되는 [🥁 합주 참가하기 (E)] 버튼 */}
      {isExploring && !isModalOpen && !activeJoinedEnsemble && nearbyEnsemble && (
        <button
          type="button"
          className="ensemble-join-btn"
          data-ui-interactive="true"
          onClick={() => {
            setIsJoinedEnsemble(true);
            handlePlayerKakegoe();
          }}
        >
          <span>
            🥁 「{nearbyEnsemble.songTitle.split(' (')[0]}」 합주 참가하기
          </span>
          <span className="key-cap">E</span>
        </button>
      )}

      {/* 탐색 모드에서 북 근처에 다가가면 표시되는 [연주하기] 버튼 (PC: Space) */}
      {isExploring &&
        !isModalOpen &&
        !activeJoinedEnsemble &&
        !nearbyEnsemble &&
        nearbyInstrument && (
          <button
            type="button"
            className="play-prompt-btn"
            onClick={() => handleEnterPlayMode(nearbyInstrument)}
          >
            <span>🥁 {nearbyInstrument.name} 연주하기</span>
            <span className="key-cap">Space</span>
          </button>
        )}

      {/* 타이코 연주 모드 전용 오버레이 */}
      {hasEntered && activeInstrument && (
        <TaikoPlayOverlay
          instrument={activeInstrument}
          onHit={handleTaikoHit}
          onExit={handleExitPlayMode}
        />
      )}

      {/* 지연 로딩되는 정보 모달 그룹 (필요할 때만 청크 다운로드) */}
      <Suspense fallback={null}>
        {/* 통합 메뉴바 모달 */}
        {hasEntered && isMenuOpen && (
          <MenuModal
            nextEvent={nextUpcomingEvent}
            songCount={songs.length + customSongs.length}
            environments={worldEnvironments}
            selectedEnvironmentId={selectedEnvId}
            deployedSeasonTheme={deployedSeasonTheme}
            onSelectEnvironment={handleSelectEnvironment}
            isPlayerSoundOn={isPlayerSoundOn}
            isNpcSoundOn={isNpcSoundOn}
            playerVolume={playerVolume}
            npcVolume={npcVolume}
            onOpenSchedule={() => {
              closeAllModals();
              setOpenedFromMenu(true);
              setIsScheduleOpen(true);
            }}
            onOpenMembers={() => {
              closeAllModals();
              setOpenedFromMenu(true);
              setIsMemberDirectoryOpen(true);
            }}
            onOpenSongs={() => {
              closeAllModals();
              setOpenedFromMenu(true);
              setIsSongBookOpen(true);
            }}
            onOpenTaikoGuide={() => {
              closeAllModals();
              setOpenedFromMenu(true);
              setGuideInitialTab('types');
              setIsTaikoGuideOpen(true);
            }}
            onOpenCircle={() => {
              closeAllModals();
              setOpenedFromMenu(true);
              setIsCircleOpen(true);
            }}
            onTogglePlayerSound={handleTogglePlayerSound}
            onToggleNpcSound={handleToggleNpcSound}
            onChangePlayerVolume={handleChangePlayerVolume}
            onChangeNpcVolume={handleChangeNpcVolume}
            onClose={() => setIsMenuOpen(false)}
          />
        )}

        {/* 상세 월간 연주 일정 캘린더 모달 */}
        {hasEntered && isScheduleOpen && (
          <ScheduleCalendarModal
            events={scheduleEvents}
            nextEvent={nextUpcomingEvent}
            onBackToMenu={openedFromMenu ? handleBackToMenu : undefined}
            onClose={closeAllModals}
          />
        )}

        {/* 전체 서클 멤버 도감 모달 */}
        {hasEntered && isMemberDirectoryOpen && (
          <MemberDirectoryModal
            members={members}
            onSelectMember={(member) => {
              setIsMemberDirectoryOpen(false);
              setSelectedMember(member);
            }}
            onBackToMenu={openedFromMenu ? handleBackToMenu : undefined}
            onClose={closeAllModals}
          />
        )}

        {/* 멀티 레이어 타이코 곡 정보 & 직접 작곡 모달 */}
        {hasEntered && isSongBookOpen && (
          <SongBookModal
            builtInSongs={songs}
            customSongs={customSongs}
            allTracks={taikoTracks}
            tracksById={tracksById}
            members={members}
            onSaveCustomSong={handleSaveCustomSong}
            onDeleteCustomSong={handleDeleteCustomSong}
            onBackToMenu={openedFromMenu ? handleBackToMenu : undefined}
            onClose={closeAllModals}
          />
        )}

        {/* 타이코 종류 & 지역 타이코 단체 소개 모달 (아지트에서 진입 시 E로 닫기 지원) */}
        {hasEntered && isTaikoGuideOpen && (
          <TaikoGuideModal
            guide={taikoGuide}
            tracksById={tracksById}
            initialTab={guideInitialTab}
            highlightedGroupId={highlightedGroupId}
            allowKeyEClose={guideOpenedFromHideout}
            onBackToMenu={openedFromMenu ? handleBackToMenu : undefined}
            onClose={closeAllModals}
          />
        )}

        {/* 서클 소개 & 대학교 홈페이지 · 인스타그램 QR 모달 */}
        {hasEntered && isCircleOpen && (
          <CircleInfoModal
            circle={circleInfo}
            onBackToMenu={openedFromMenu ? handleBackToMenu : undefined}
            onClose={closeAllModals}
          />
        )}

        {/* NPC 멤버 프로필 카드 모달 (E/ESC로 닫기 가능) */}
        {hasEntered && selectedMember && (
          <MemberProfileModal
            member={selectedMember}
            songs={songs}
            onClose={() => setSelectedMember(null)}
          />
        )}

        {/* 캐릭터 꾸미기 패널 (3D 클로즈업 프리뷰 + 실시간 저장 + 시트용 얼굴코드 복사) */}
        {hasEntered && isCustomizing && (
          <CharacterCustomizerPanel
            appearance={playerAppearance}
            onChangeAppearance={handleChangePlayerAppearance}
            isPreviewPlaying={isCustomizePlaying}
            onTogglePreviewPlay={() => setIsCustomizePlaying((prev) => !prev)}
            onRotatePreview={handleRotateCustomizePreview}
            onClose={() => {
              setIsCustomizing(false);
              setIsCustomizePlaying(false);
            }}
          />
        )}
      </Suspense>

      {/* 탐색 모드 하단 좌측 공간 안내 배지 & 하단 우측 [🎨 꾸미기] · [💬 서클/문의] 버튼 */}
      {showWorldHud && (
        <>
          <div className="space-badge">
            <span>
              {selectedEnvironment.emoji} {selectedEnvironment.name}
              {deployedSeasonTheme.id !== 'default'
                ? ` · ${deployedSeasonTheme.emoji} ${deployedSeasonTheme.name}`
                : ''}
            </span>
            <span className="space-badge-hint">
              모바일: 화면 터치 조이스틱 · PC: WASD · E(멤버·아지트) · Space(연주)
            </span>
          </div>

          <div className="bottom-right-actions">
            <button
              type="button"
              className="customize-open-btn"
              onClick={() => {
                closeAllModals();
                setCustomizeRotationOffset(0);
                setIsCustomizePlaying(false);
                setIsCustomizing(true);
              }}
            >
              🎨 꾸미기
            </button>

            <button
              type="button"
              className="circle-info-btn"
              onClick={() => {
                closeAllModals();
                setIsCircleOpen(true);
              }}
            >
              💬 서클/문의
            </button>
          </div>
        </>
      )}
    </>
  );
}

export default App;

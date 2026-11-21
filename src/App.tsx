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
import type {
  GroupHideoutConfig,
  InstrumentConfig,
  MoveVector,
  PlayerState,
  SpaceConfig,
} from './types/world';
import type {
  CircleInfo,
  MemberConfig,
  ScheduleEvent,
  SongConfig,
  TaikoGuideData,
  TaikoTrackDefinition,
} from './types/content';
import { audioManager } from './systems/audioManager';
import type { TaikoHitType } from './systems/audioManager';
import { getNextUpcomingEvent } from './utils/scheduleUtils';
import { loadCustomSongs, saveCustomSongs } from './utils/customSongsStorage';
import { useScheduleEvents } from './hooks/useScheduleEvents';
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

// JSON 배열은 TypeScript가 일반 number[]로 추론하므로, 엄격한 타입으로 안전하게 연결
const spaces = spacesData as unknown as SpaceConfig[];
const instruments = instrumentsData as unknown as InstrumentConfig[];
const fallbackScheduleEvents = scheduleData as ScheduleEvent[];
const circleInfo = circleData as CircleInfo;
const members = membersData as MemberConfig[];
const songs = songsData as SongConfig[];
const taikoTracks = taikoTracksData as unknown as TaikoTrackDefinition[];
const taikoGuide = taikoGuideData as TaikoGuideData;

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
  const currentSpace = spaces[0];

  // 구글 스프레드시트(VITE_SCHEDULE_CSV_URL)가 설정되어 있으면 실시간 일정을, 없으면 기본 JSON 일정을 사용
  const { events: scheduleEvents } = useScheduleEvents(fallbackScheduleEvents);

  // 오늘 날짜 기준으로 가장 가까운 예정 연주 1건 계산
  const nextUpcomingEvent = useMemo(
    () => getNextUpcomingEvent(scheduleEvents),
    [scheduleEvents]
  );

  // 브라우저 localStorage에 저장된 사용자 작곡 곡 목록 상태
  const [customSongs, setCustomSongs] = useState<SongConfig[]>(() => loadCustomSongs());

  // 화면 진입 및 세분화 소리 설정 상태 (직접 연주 소리 / NPC 합주 소리 개별 제어)
  const [hasEntered, setHasEntered] = useState(false);
  const [isPlayerSoundOn, setIsPlayerSoundOn] = useState(true);
  const [isNpcSoundOn, setIsNpcSoundOn] = useState(true);
  const [isSoundPopoverOpen, setIsSoundPopoverOpen] = useState(false);

  // 3D 근접 상호작용 대상 상태 (북 / NPC / 지역 단체 아지트)
  const [nearbyInstrument, setNearbyInstrument] = useState<InstrumentConfig | null>(null);
  const [nearbyMember, setNearbyMember] = useState<MemberConfig | null>(null);
  const [nearbyHideout, setNearbyHideout] = useState<GroupHideoutConfig | null>(null);
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

  /** 열려 있는 모든 정보 모달 및 팝오버를 한 번에 닫는 보조 함수 */
  const closeAllModals = useCallback(() => {
    setIsSoundPopoverOpen(false);
    setIsMenuOpen(false);
    setIsScheduleOpen(false);
    setIsMemberDirectoryOpen(false);
    setIsSongBookOpen(false);
    setIsTaikoGuideOpen(false);
    setIsCircleOpen(false);
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

  /** 직접 연주 소리 ON/OFF 토글 핸들러 */
  const handleTogglePlayerSound = useCallback(() => {
    setIsPlayerSoundOn((prev) => {
      const next = !prev;
      audioManager.setPlayerSoundEnabled(next);
      return next;
    });
  }, []);

  /** NPC 합주 배경 소리 ON/OFF 토글 핸들러 */
  const handleToggleNpcSound = useCallback(() => {
    setIsNpcSoundOn((prev) => {
      const next = !prev;
      audioManager.setNpcSoundEnabled(next);
      return next;
    });
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

  const [spawnX, , spawnZ] = currentSpace.spawnPoint;
  const isModalOpen =
    isMenuOpen ||
    isScheduleOpen ||
    isMemberDirectoryOpen ||
    isSongBookOpen ||
    isTaikoGuideOpen ||
    isCircleOpen ||
    selectedMember !== null;
  const isExploring = hasEntered && activeInstrument === null;

  // 메뉴·팝업 창이 열려 있거나 북 연주 모드 중일 때 배경 NPC 합주 소리를 자동으로 줄임(덕킹)
  useEffect(() => {
    const shouldDuckNpc = isModalOpen || isSoundPopoverOpen || activeInstrument !== null;
    audioManager.setNpcDucking(shouldDuckNpc);
  }, [isModalOpen, isSoundPopoverOpen, activeInstrument]);

  // PC 단축키(탐색 모드):
  // - 북 근처에서는 Space로 연주 모드 진입
  // - NPC 또는 지역 단체 아지트 근처([!] 말풍선 표시 중)에서는 E로 해당 정보 창 열기
  useEffect(() => {
    if (!isExploring || isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.code === 'Space' && nearbyInstrument) {
        event.preventDefault();
        handleEnterPlayMode(nearbyInstrument);
      } else if (event.code === 'KeyE') {
        if (nearbyMember) {
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
    nearbyInstrument,
    nearbyMember,
    nearbyHideout,
    handleEnterPlayMode,
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
          instruments={instruments}
          members={members}
          songs={songs}
          tracksById={tracksById}
          playerStateRef={playerStateRef}
          joystickVectorRef={joystickVectorRef}
          hasEntered={hasEntered}
          isModalOpen={isModalOpen}
          activeInstrument={activeInstrument}
          nearbyInstrument={nearbyInstrument}
          nearbyHideout={nearbyHideout}
          onNearbyInstrumentChange={setNearbyInstrument}
          onNearbyMemberChange={setNearbyMember}
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
      {isExploring && (
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
      {isExploring && (
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

      {/* 입장 후 상시 HUD: 우측 상단 세분화 소리 설정(직접 연주 vs NPC 합주) */}
      {hasEntered && (
        <SoundControl
          isPlayerSoundOn={isPlayerSoundOn}
          isNpcSoundOn={isNpcSoundOn}
          isOpen={isSoundPopoverOpen}
          onToggleOpen={() => setIsSoundPopoverOpen((prev) => !prev)}
          onClose={() => setIsSoundPopoverOpen(false)}
          onTogglePlayerSound={handleTogglePlayerSound}
          onToggleNpcSound={handleToggleNpcSound}
        />
      )}

      {/* 탐색 모드에서 북 근처에 다가가면 표시되는 [연주하기] 버튼 (PC: Space) */}
      {isExploring && !isModalOpen && nearbyInstrument && (
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
            memberCount={members.length}
            songCount={songs.length + customSongs.length}
            isPlayerSoundOn={isPlayerSoundOn}
            isNpcSoundOn={isNpcSoundOn}
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
      </Suspense>

      {/* 탐색 모드 하단 좌측 공간 안내 배지 & 하단 우측 [서클/문의] 버튼 */}
      {isExploring && (
        <>
          <div className="space-badge">
            <span>🌿 {currentSpace.name}</span>
            <span className="space-badge-hint">
              모바일: 화면 터치 조이스틱 · PC: WASD · E(멤버·아지트) · Space(연주)
            </span>
          </div>

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
        </>
      )}
    </>
  );
}

export default App;

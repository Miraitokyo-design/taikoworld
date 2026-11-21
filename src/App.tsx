import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import spacesData from './data/spaces.json';
import instrumentsData from './data/instruments.json';
import scheduleData from './data/schedule.json';
import circleData from './data/circle.json';
import membersData from './data/members.json';
import songsData from './data/songs.json';
import taikoTracksData from './data/taikoTracks.json';
import taikoGuideData from './data/taikoGuide.json';
import type { InstrumentConfig, MoveVector, PlayerState, SpaceConfig } from './types/world';
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
import { ScheduleCalendarModal } from './components/ui/ScheduleCalendarModal';
import { CircleInfoModal } from './components/ui/CircleInfoModal';
import { MemberProfileModal } from './components/ui/MemberProfileModal';
import { MemberDirectoryModal } from './components/ui/MemberDirectoryModal';
import { SongBookModal } from './components/ui/SongBookModal';
import { TaikoGuideModal } from './components/ui/TaikoGuideModal';
import { MenuModal } from './components/ui/MenuModal';

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
 * - 입장 화면(오디오 활성화), 3D 잔디 공원 탐색, 메뉴바(되돌아가기 지원), 상단 연주 일정 배너·캘린더,
 *   멤버 도감·프로필 카드, 멀티 레이어 악보 플레이어, 타이코 종류/역사 안내, 서클/문의 모달을 연결합니다.
 */
export function App() {
  // MVP 1차 공간: 첫 번째 공간(잔디 공원)을 기본으로 불러옴
  const currentSpace = spaces[0];

  // 구글 스프레드시트(VITE_SCHEDULE_CSV_URL)가 설정되어 있으면 실시간 일정을, 없으면 기본 JSON 일정을 사용
  const { events: scheduleEvents } = useScheduleEvents(fallbackScheduleEvents);

  // 오늘 날짜 기준으로 가장 가까운 예정 연주 1건 계산 (배너, 메뉴, 캘린더 초기 월 표시에 사용)
  const nextUpcomingEvent = useMemo(
    () => getNextUpcomingEvent(scheduleEvents),
    [scheduleEvents]
  );

  // 브라우저 localStorage에 저장된 사용자 작곡 곡 목록 상태
  const [customSongs, setCustomSongs] = useState<SongConfig[]>(() => loadCustomSongs());

  // React useState: 화면 전환 및 모달 열림 상태 관리
  const [hasEntered, setHasEntered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nearbyInstrument, setNearbyInstrument] = useState<InstrumentConfig | null>(null);
  const [nearbyMember, setNearbyMember] = useState<MemberConfig | null>(null);
  const [activeInstrument, setActiveInstrument] = useState<InstrumentConfig | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isMemberDirectoryOpen, setIsMemberDirectoryOpen] = useState(false);
  const [isSongBookOpen, setIsSongBookOpen] = useState(false);
  const [isTaikoGuideOpen, setIsTaikoGuideOpen] = useState(false);
  const [isCircleOpen, setIsCircleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberConfig | null>(null);

  // 메뉴바에서 진입한 모달인지 기록해 [← 메뉴] 되돌아가기 버튼 표시 여부를 결정
  const [openedFromMenu, setOpenedFromMenu] = useState(false);

  // 플레이어 상태 단일 객체: 매 프레임 업데이트되어도 React 전체가 다시 그려지지 않게 useRef로 관리
  const playerStateRef = useRef<PlayerState>({
    position: [...currentSpace.spawnPoint],
    // 북이 있는 뒤쪽(-Z)을 바라보도록 180도(Math.PI) 회전
    rotationY: Math.PI,
    action: 'idle',
  });

  // 모바일 플로팅 조이스틱 방향 벡터 및 3D 북 타격 울림 공유 ref
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

  /** 열려 있는 모든 정보 모달을 한 번에 닫는 보조 함수 */
  const closeAllModals = useCallback(() => {
    setIsMenuOpen(false);
    setIsScheduleOpen(false);
    setIsMemberDirectoryOpen(false);
    setIsSongBookOpen(false);
    setIsTaikoGuideOpen(false);
    setIsCircleOpen(false);
    setSelectedMember(null);
    setOpenedFromMenu(false);
  }, []);

  /** 메뉴에서 진입한 하위 모달에서 [← 메뉴] 버튼을 눌렀을 때 메뉴바로 되돌아가는 함수 */
  const handleBackToMenu = useCallback(() => {
    closeAllModals();
    setIsMenuOpen(true);
  }, [closeAllModals]);

  /**
   * [타이코 월드 입장] 버튼 클릭 핸들러
   * - 첫 터치 순간 브라우저 오디오 컨텍스트를 활성화하고, 악기/트랙 사운드 사전 로딩을 시도합니다.
   */
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

  /**
   * 상시 HUD 및 메뉴 [소리 켜기/끄기] 토글 핸들러
   */
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      audioManager.setMuted(nextMuted);
      return nextMuted;
    });
  }, []);

  /**
   * 타이코 연주 모드 진입 핸들러
   * - 열려 있던 모달을 모두 닫고, NPC 합주 배경 볼륨을 낮추는 덕킹을 켠 뒤 연주 UI를 표시합니다.
   */
  const handleEnterPlayMode = useCallback(
    (instrument: InstrumentConfig) => {
      void audioManager.unlock();
      closeAllModals();
      audioManager.setNpcDucking(true);
      setActiveInstrument(instrument);
    },
    [closeAllModals]
  );

  /**
   * 타이코 연주 모드 종료([월드로 돌아가기]) 핸들러
   */
  const handleExitPlayMode = useCallback(() => {
    audioManager.setNpcDucking(false);
    setActiveInstrument(null);
  }, []);

  /**
   * 북 중앙(돈) 또는 테두리(카) 타격 시 오디오 재생 + 3D 북 울림 반응 실행
   */
  const handleTaikoHit = useCallback(
    (hitType: TaikoHitType) => {
      if (!activeInstrument) return;
      const soundUrl =
        hitType === 'don' ? activeInstrument.sounds.don : activeInstrument.sounds.ka;
      audioManager.playTaikoHit(hitType, soundUrl);

      // 3D 공간의 북 모델도 타격 세기에 맞춰 살짝 통통 울리도록 자극 전달
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

  // PC 단축키(탐색 모드):
  // - 북 근처에서는 Space로 연주 모드 진입
  // - NPC 근처([!] 말풍선 표시 중)에서는 E로 해당 멤버 프로필 카드 열기
  useEffect(() => {
    if (!isExploring || isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.code === 'Space' && nearbyInstrument) {
        event.preventDefault();
        handleEnterPlayMode(nearbyInstrument);
      } else if (event.code === 'KeyE' && nearbyMember) {
        event.preventDefault();
        closeAllModals();
        setSelectedMember(nearbyMember);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isExploring,
    isModalOpen,
    nearbyInstrument,
    nearbyMember,
    handleEnterPlayMode,
    closeAllModals,
  ]);

  return (
    <>
      {/* 3D 그래픽을 그리는 캔버스: 모바일 성능 예산에 따라 픽셀 배율(dpr)을 최대 2로 제한 */}
      <Canvas
        dpr={[1, 2]}
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
          onNearbyInstrumentChange={setNearbyInstrument}
          onNearbyMemberChange={setNearbyMember}
          onSelectInstrument={handleEnterPlayMode}
          onSelectMember={(member) => {
            closeAllModals();
            setSelectedMember(member);
          }}
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

      {/* 탐색 모드 상단 정중앙 최단 연주 일정 배너 (터치 시 상세 캘린더 열림) */}
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

      {/* 입장 후 상시 HUD: 우측 상단 음소거 토글 버튼 */}
      {hasEntered && (
        <button
          type="button"
          className="mute-toggle-btn"
          onClick={handleToggleMute}
          aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
        >
          <span aria-hidden="true">{isMuted ? '🔇' : '🔊'}</span>
          <span className="mute-toggle-label">{isMuted ? '꺼짐' : '소리'}</span>
        </button>
      )}

      {/* 탐색 모드에서 북 근처에 다가가면 표시되는 [연주하기] 버튼 (PC: Space 바로도 진입 가능) */}
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

      {/* 타이코 연주 모드 전용 오버레이 (돈/카 타격 패드 + 키보드 단축키) */}
      {hasEntered && activeInstrument && (
        <TaikoPlayOverlay
          instrument={activeInstrument}
          onHit={handleTaikoHit}
          onExit={handleExitPlayMode}
        />
      )}

      {/* 통합 메뉴바 모달 */}
      {hasEntered && isMenuOpen && (
        <MenuModal
          nextEvent={nextUpcomingEvent}
          memberCount={members.length}
          songCount={songs.length + customSongs.length}
          isMuted={isMuted}
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
            setIsTaikoGuideOpen(true);
          }}
          onOpenCircle={() => {
            closeAllModals();
            setOpenedFromMenu(true);
            setIsCircleOpen(true);
          }}
          onToggleMute={handleToggleMute}
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

      {/* 전체 서클 멤버 도감 모달 (메뉴 -> 멤버 정보) */}
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

      {/* 멀티 레이어 타이코 곡 정보 & 직접 작곡 모달 (메뉴 -> 곡 정보) */}
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

      {/* 타이코의 종류와 역사 안내 모달 (메뉴 -> 타이코의 종류와 역사) */}
      {hasEntered && isTaikoGuideOpen && (
        <TaikoGuideModal
          guide={taikoGuide}
          tracksById={tracksById}
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

      {/* NPC 멤버 클릭 또는 E 키로 열리는 미니 프로필 카드 모달 (E/ESC로 닫기 가능) */}
      {hasEntered && selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          songs={songs}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* 탐색 모드 하단 좌측 공간 안내 배지 & 하단 우측 [서클/문의] 버튼 */}
      {isExploring && (
        <>
          <div className="space-badge">
            <span>🌿 {currentSpace.name}</span>
            <span className="space-badge-hint">
              모바일: 화면 터치 조이스틱 · PC: WASD · E(멤버) · Space(연주)
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

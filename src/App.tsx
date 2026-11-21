import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import spacesData from './data/spaces.json';
import instrumentsData from './data/instruments.json';
import scheduleData from './data/schedule.json';
import circleData from './data/circle.json';
import membersData from './data/members.json';
import type { InstrumentConfig, MoveVector, PlayerState, SpaceConfig } from './types/world';
import type { CircleInfo, MemberConfig, ScheduleEvent } from './types/content';
import { audioManager } from './systems/audioManager';
import type { TaikoHitType } from './systems/audioManager';
import { getNextUpcomingEvent } from './utils/scheduleUtils';
import { useScheduleEvents } from './hooks/useScheduleEvents';
import { Scene } from './components/Scene';
import { VirtualJoystick } from './components/ui/VirtualJoystick';
import { LandingOverlay } from './components/ui/LandingOverlay';
import { TaikoPlayOverlay } from './components/ui/TaikoPlayOverlay';
import { ScheduleBanner } from './components/ui/ScheduleBanner';
import { ScheduleCalendarModal } from './components/ui/ScheduleCalendarModal';
import { CircleInfoModal } from './components/ui/CircleInfoModal';
import { MemberProfileModal } from './components/ui/MemberProfileModal';

// JSON 배열은 TypeScript가 일반 number[]로 추론하므로, 엄격한 3D 좌표 튜플 타입([x, y, z])으로 안전하게 연결
const spaces = spacesData as unknown as SpaceConfig[];
const instruments = instrumentsData as unknown as InstrumentConfig[];
const fallbackScheduleEvents = scheduleData as ScheduleEvent[];
const circleInfo = circleData as CircleInfo;
const members = membersData as MemberConfig[];

/**
 * Taiko World 최상위 앱 컴포넌트
 * - 입장 화면(오디오 활성화), 3D 잔디 공원 탐색, 상단 연주 일정 배너·캘린더,
 *   서클 소개/문의 모달, 타이코 연주 모드를 연결합니다.
 * - 플레이어 상태(위치·방향·행동)와 조이스틱 입력은 60fps 성능을 위해 useRef로 관리합니다.
 */
export function App() {
  // MVP 1차 공간: 첫 번째 공간(잔디 공원)을 기본으로 불러옴
  const currentSpace = spaces[0];

  // 구글 스프레드시트(VITE_SCHEDULE_CSV_URL)가 설정되어 있으면 실시간 일정을, 없으면 기본 JSON 일정을 사용
  const { events: scheduleEvents } = useScheduleEvents(fallbackScheduleEvents);

  // 오늘 날짜 기준으로 가장 가까운 예정 연주 1건 계산 (배너 및 캘린더 초기 월 표시에 사용)
  const nextUpcomingEvent = useMemo(
    () => getNextUpcomingEvent(scheduleEvents),
    [scheduleEvents]
  );

  // React useState: 화면 전환(입장 여부, 음소거, 근처 악기, 연주 모드, 모달 열림) 상태 관리
  const [hasEntered, setHasEntered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nearbyInstrument, setNearbyInstrument] = useState<InstrumentConfig | null>(null);
  const [activeInstrument, setActiveInstrument] = useState<InstrumentConfig | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isCircleOpen, setIsCircleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberConfig | null>(null);

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

  /**
   * [타이코 월드 입장] 버튼 클릭 핸들러
   * - 첫 터치 순간 브라우저 오디오 컨텍스트를 활성화하고, 악기 사운드 사전 로딩을 시도합니다.
   */
  const handleEnterWorld = useCallback(async () => {
    await audioManager.unlock();
    // 추후 실제 .mp3 녹음 파일이 추가되면 입장 직후 메모리에 미리 디코딩
    for (const inst of instruments) {
      void audioManager.preloadTaikoSounds(inst.sounds);
    }
    setHasEntered(true);
  }, []);

  /**
   * 상시 HUD [소리 켜기/끄기] 토글 핸들러
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
   * - 열려 있던 모달을 모두 닫고, NPC 배경 연주 볼륨을 낮추는 덕킹을 켠 뒤 연주 UI를 표시합니다.
   */
  const handleEnterPlayMode = useCallback((instrument: InstrumentConfig) => {
    void audioManager.unlock();
    setIsScheduleOpen(false);
    setIsCircleOpen(false);
    setSelectedMember(null);
    audioManager.setNpcDucking(true);
    setActiveInstrument(instrument);
  }, []);

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
  const isModalOpen = isScheduleOpen || isCircleOpen || selectedMember !== null;
  const isExploring = hasEntered && activeInstrument === null;

  // 북 근처에 있을 때 PC에서 Space 바를 눌러 바로 연주 모드로 진입할 수 있게 키보드 이벤트 연결
  useEffect(() => {
    if (!isExploring || isModalOpen || !nearbyInstrument) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      handleEnterPlayMode(nearbyInstrument);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExploring, isModalOpen, nearbyInstrument, handleEnterPlayMode]);

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
          playerStateRef={playerStateRef}
          joystickVectorRef={joystickVectorRef}
          hasEntered={hasEntered}
          isModalOpen={isModalOpen}
          activeInstrument={activeInstrument}
          nearbyInstrument={nearbyInstrument}
          onNearbyInstrumentChange={setNearbyInstrument}
          onSelectInstrument={handleEnterPlayMode}
          onSelectMember={(member) => {
            setIsScheduleOpen(false);
            setIsCircleOpen(false);
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

      {/* 탐색 모드 상단 정중앙 최단 연주 일정 배너 (터치 시 상세 캘린더 열림) */}
      {isExploring && (
        <div className="schedule-banner-wrap">
          <ScheduleBanner
            nextEvent={nextUpcomingEvent}
            onOpenCalendar={() => {
              setIsCircleOpen(false);
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

      {/* 상세 월간 연주 일정 캘린더 모달 */}
      {hasEntered && isScheduleOpen && (
        <ScheduleCalendarModal
          events={scheduleEvents}
          nextEvent={nextUpcomingEvent}
          onClose={() => setIsScheduleOpen(false)}
        />
      )}

      {/* 서클 소개 & 체험·가입 문의 링크 모달 */}
      {hasEntered && isCircleOpen && (
        <CircleInfoModal
          circle={circleInfo}
          onClose={() => setIsCircleOpen(false)}
        />
      )}

      {/* NPC 멤버 클릭 시 열리는 미니 프로필 카드 모달 */}
      {hasEntered && selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* 탐색 모드 하단 좌측 공간 안내 배지 & 하단 우측 [서클/문의] 버튼 */}
      {isExploring && (
        <>
          <div className="space-badge">
            <span>🌿 {currentSpace.name}</span>
            <span className="space-badge-hint">
              모바일: 화면 터치 조이스틱 · PC: WASD/클릭
            </span>
          </div>

          <button
            type="button"
            className="circle-info-btn"
            onClick={() => {
              setIsScheduleOpen(false);
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

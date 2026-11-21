import { useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import spacesData from './data/spaces.json';
import instrumentsData from './data/instruments.json';
import type { InstrumentConfig, MoveVector, PlayerState, SpaceConfig } from './types/world';
import { audioManager } from './systems/audioManager';
import type { TaikoHitType } from './systems/audioManager';
import { Scene } from './components/Scene';
import { VirtualJoystick } from './components/ui/VirtualJoystick';
import { LandingOverlay } from './components/ui/LandingOverlay';
import { TaikoPlayOverlay } from './components/ui/TaikoPlayOverlay';

// JSON 배열은 TypeScript가 일반 number[]로 추론하므로, 엄격한 3D 좌표 튜플 타입([x, y, z])으로 안전하게 연결
const spaces = spacesData as unknown as SpaceConfig[];
const instruments = instrumentsData as unknown as InstrumentConfig[];

/**
 * Taiko World 최상위 앱 컴포넌트
 * - 입장 화면(오디오 활성화), 3D 잔디 공원 탐색, 타이코 연주 모드, 상시 음소거 HUD를 연결합니다.
 * - 플레이어 상태(위치·방향·행동)와 조이스틱 입력은 60fps 성능을 위해 useRef로 관리합니다.
 */
export function App() {
  // MVP 1차 공간: 첫 번째 공간(잔디 공원)을 기본으로 불러옴
  const currentSpace = spaces[0];

  // React useState: 화면 전환(입장 여부, 음소거, 근처 악기, 연주 모드)처럼 UI를 바꿔야 하는 상태 관리
  const [hasEntered, setHasEntered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nearbyInstrument, setNearbyInstrument] = useState<InstrumentConfig | null>(null);
  const [activeInstrument, setActiveInstrument] = useState<InstrumentConfig | null>(null);

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
   * - NPC 배경 연주 볼륨을 낮추는 덕킹을 켜고 연주 UI를 표시합니다.
   */
  const handleEnterPlayMode = useCallback((instrument: InstrumentConfig) => {
    void audioManager.unlock();
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
  const isExploring = hasEntered && activeInstrument === null;

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
          playerStateRef={playerStateRef}
          joystickVectorRef={joystickVectorRef}
          hasEntered={hasEntered}
          activeInstrument={activeInstrument}
          nearbyInstrument={nearbyInstrument}
          onNearbyInstrumentChange={setNearbyInstrument}
          onSelectInstrument={handleEnterPlayMode}
          taikoHitPulseRef={taikoHitPulseRef}
        />
      </Canvas>

      {/* 모바일 플로팅 가상 조이스틱 (탐색 모드일 때만 활성화) */}
      <VirtualJoystick
        joystickVectorRef={joystickVectorRef}
        disabled={!isExploring}
      />

      {/* 입장 전 화면 (첫 터치 시 오디오 활성화) */}
      {!hasEntered && <LandingOverlay onEnter={handleEnterWorld} />}

      {/* 입장 후 상시 HUD: 우측 상단 음소거 토글 버튼 */}
      {hasEntered && (
        <button
          type="button"
          className="mute-toggle-btn"
          onClick={handleToggleMute}
          aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
        >
          {isMuted ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'}
        </button>
      )}

      {/* 탐색 모드에서 북 근처에 다가가면 표시되는 [연주하기] 버튼 */}
      {isExploring && nearbyInstrument && (
        <button
          type="button"
          className="play-prompt-btn"
          onClick={() => handleEnterPlayMode(nearbyInstrument)}
        >
          🥁 {nearbyInstrument.name} 연주하기
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

      {/* 탐색 모드일 때만 하단 공간 안내 배지 표시 */}
      {isExploring && (
        <div className="space-badge">
          <span>🌿 {currentSpace.name}</span>
          <span className="space-badge-hint">
            모바일: 화면 터치 조이스틱 · PC: WASD/클릭
          </span>
        </div>
      )}
    </>
  );
}

export default App;

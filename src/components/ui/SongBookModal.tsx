import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type {
  MemberConfig,
  SongConfig,
  SongLayer,
  TaikoTrackDefinition,
  TrackInstrumentId,
} from '../../types/content';
import { audioManager } from '../../systems/audioManager';
import {
  getSongStepNotes,
  getStepDurationSeconds,
  isRestToken,
} from '../../utils/songScoreUtils';

interface SongBookModalProps {
  /** songs.json 기본 수록곡 목록 */
  builtInSongs: SongConfig[];
  /** 브라우저에 저장된 사용자 작곡 곡 목록 */
  customSongs: SongConfig[];
  /** taikoTracks.json에서 불러온 전체 악기 트랙 목록 */
  allTracks: TaikoTrackDefinition[];
  /** 악기 ID -> 트랙 정의 빠른 조회 맵 */
  tracksById: Record<string, TaikoTrackDefinition>;
  /** 각 곡을 연주할 수 있는 멤버 표시용 전체 멤버 목록 */
  members: MemberConfig[];
  /** 사용자가 직접 작곡한 곡을 저장할 때 호출되는 콜백 */
  onSaveCustomSong: (song: SongConfig) => void;
  /** 저장된 사용자 작곡 곡을 삭제할 때 호출되는 콜백 */
  onDeleteCustomSong: (songId: string) => void;
  /** 메뉴로 돌아가기 콜백 (메뉴에서 진입했을 때 표시) */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/** 타임라인 한 칸(스텝)의 가로 폭(px) — 재생 바 이동 및 자동 스크롤 계산 기준 */
const STEP_CELL_WIDTH_PX = 40;
/** 한 마디당 기본 스텝 수 (4/4박자 8분음표 = 8칸) */
const STEPS_PER_MEASURE = 8;

/**
 * 지정 길이의 빈 쉼표('-') 배열을 만드는 도우미 함수
 */
function createEmptySteps(length: number): string[] {
  return Array.from({ length }, () => '-');
}

/**
 * 마디 수 변경 시 기존 레이어의 음표를 보존하면서 길이를 늘리거나 줄이는 도우미 함수
 */
function resizeSteps(steps: string[], nextLength: number): string[] {
  if (steps.length === nextLength) return [...steps];
  if (steps.length > nextLength) return steps.slice(0, nextLength);
  return [...steps, ...createEmptySteps(nextLength - steps.length)];
}

/**
 * 직접 작곡 모드 시작 시 기본으로 제공하는 3레이어(締め · 尺4 · 沖) 초기 초안 생성 함수
 */
function createInitialDraftSong(): SongConfig {
  return {
    id: `custom_${Date.now()}`,
    title: '나의 타이코 곡',
    subtitle: '직접 작곡한 멀티 레이어 악보',
    bpm: 116,
    difficulty: '입문',
    minPlayers: 3,
    stepsPerMeasure: STEPS_PER_MEASURE,
    totalSteps: 32,
    description: '직접 레이어를 쌓아 만든 나만의 타이코 합주곡입니다.',
    layers: [
      {
        instrumentId: 'shime',
        steps: [
          'う', 'さ', 'う', 'さ', 'う', 'さ', 'う', 'さ',
          ...createEmptySteps(24),
        ],
      },
      {
        instrumentId: 'shaku_4',
        steps: [
          'う', '-', 'さ', 'う', 'かっ', '-', '-', '-',
          ...createEmptySteps(24),
        ],
      },
      {
        instrumentId: 'oki',
        steps: [
          'どん', '-', '-', '-', 'どん', '-', 'かっ', '-',
          ...createEmptySteps(24),
        ],
      },
    ],
  };
}

/**
 * 메뉴바의 [곡 정보 · 레이어 악보 / 직접 작곡]에서 열리는 통합 악보 & 작곡 스튜디오 모달 컴포넌트
 * - '수록곡 악보' 모드: 곡별 참여 악기 레이어만 표시하고, 재생 바 자동 스크롤로 합주를 감상합니다.
 * - '직접 작곡하기' 모드: 악기 레이어를 자유롭게 추가/삭제하고, 칸을 클릭해 음표를 찍으며 실시간 재생·저장·JSON 복사가 가능합니다.
 */
export function SongBookModal({
  builtInSongs,
  customSongs,
  allTracks,
  tracksById,
  members,
  onSaveCustomSong,
  onDeleteCustomSong,
  onBackToMenu,
  onClose,
}: SongBookModalProps) {
  const allSongs = useMemo(
    () => [...builtInSongs, ...customSongs],
    [builtInSongs, customSongs]
  );
  const customSongIdSet = useMemo(
    () => new Set(customSongs.map((song) => song.id)),
    [customSongs]
  );

  // 'view': 수록곡 감상 모드 / 'compose': 직접 작곡 모드
  const [mode, setMode] = useState<'view' | 'compose'>('view');
  const [selectedSongId, setSelectedSongId] = useState<string>(allSongs[0]?.id ?? '');
  const [draftSong, setDraftSong] = useState<SongConfig>(() => createInitialDraftSong());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [mutedLayers, setMutedLayers] = useState<Set<string>>(() => new Set());

  const timerRef = useRef<number | null>(null);
  const stepCursorRef = useRef(0);
  const mutedLayersRef = useRef<Set<string>>(mutedLayers);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const statusTimerRef = useRef<number | null>(null);

  // 현재 화면에 표시·재생할 대상 곡 (감상 모드면 선택된 곡, 작곡 모드면 작성 중인 draftSong)
  const activeSong = useMemo(() => {
    if (mode === 'compose') return draftSong;
    return allSongs.find((song) => song.id === selectedSongId) ?? allSongs[0] ?? null;
  }, [mode, draftSong, allSongs, selectedSongId]);

  // 재생 중 음표를 실시간으로 수정해도 즉시 소리에 반영되도록 최신 곡을 ref로 동기화
  const activeSongRef = useRef<SongConfig | null>(activeSong);
  useEffect(() => {
    activeSongRef.current = activeSong;
  }, [activeSong]);

  useEffect(() => {
    mutedLayersRef.current = mutedLayers;
  }, [mutedLayers]);

  // 현재 선택한 곡을 연주할 수 있는 서클 멤버 목록 (수록곡 감상 모드용)
  const capableMembers = useMemo(() => {
    if (!activeSong || mode === 'compose') return [];
    return members.filter((member) => member.playableSongs.includes(activeSong.id));
  }, [members, activeSong, mode]);

  /** 안내 토스트 메시지를 2.4초간 표시하는 보조 함수 */
  const showToast = useCallback((message: string) => {
    setStatusMessage(message);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2400);
  }, []);

  /** 재생 중인 악보 타이머를 안전하게 멈추는 함수 */
  const stopPlayback = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    audioManager.setNpcDucking(false);
  }, []);

  /**
   * 재생 바가 이동함에 따라 타임라인 가로 스크롤을 자동으로 따라가게 만드는 효과
   * - 현재 재생 칸이 화면 왼쪽에서 약 35% 위치에 오도록 부드럽게 넘겨줍니다.
   */
  useEffect(() => {
    if (currentStepIndex < 0 || !timelineScrollRef.current) return;
    const container = timelineScrollRef.current;
    const playheadX = currentStepIndex * STEP_CELL_WIDTH_PX;
    const targetScrollLeft = Math.max(0, playheadX - container.clientWidth * 0.35);

    container.scrollTo({
      left: targetScrollLeft,
      behavior: currentStepIndex === 0 ? 'auto' : 'smooth',
    });
  }, [currentStepIndex]);

  /** 현재 곡(감상곡 또는 작곡 중인 곡)을 BPM에 맞춰 재생하는 함수 */
  const startPlayback = useCallback(async () => {
    const songAtStart = activeSongRef.current;
    if (!songAtStart || songAtStart.totalSteps <= 0) return;

    stopPlayback();
    await audioManager.unlock();
    audioManager.setNpcDucking(true);

    const playStep = (index: number) => {
      const latestSong = activeSongRef.current;
      if (!latestSong) return;

      setCurrentStepIndex(index);
      const activeNotes = getSongStepNotes(latestSong, index, mutedLayersRef.current);

      for (const item of activeNotes) {
        const trackDef = tracksById[item.instrumentId];
        audioManager.playTrackNote(item.instrumentId, item.note, {
          soundUrl: trackDef?.audioFiles?.[item.note],
          isNpc: false,
        });
      }
    };

    setIsPlaying(true);
    stepCursorRef.current = 0;
    playStep(0);

    const intervalMs = Math.round(getStepDurationSeconds(songAtStart.bpm) * 1000);
    timerRef.current = window.setInterval(() => {
      const latestSong = activeSongRef.current;
      if (!latestSong) {
        stopPlayback();
        return;
      }

      const nextIndex = stepCursorRef.current + 1;
      if (nextIndex >= latestSong.totalSteps) {
        stopPlayback();
        return;
      }
      stepCursorRef.current = nextIndex;
      playStep(nextIndex);
    }, intervalMs);
  }, [stopPlayback, tracksById]);

  // ESC 키 닫기 (입력창 포커스 중에는 제외하지 않고 안전하게 닫기) 및 언마운트 시 정리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        stopPlayback();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopPlayback();
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, [onClose, stopPlayback]);

  /** 수록곡 감상 <-> 직접 작곡 모드 전환 */
  const handleSwitchMode = (nextMode: 'view' | 'compose') => {
    stopPlayback();
    setMutedLayers(new Set());
    setMode(nextMode);
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  };

  /** 수록곡 탭 전환 */
  const handleSelectSong = (songId: string) => {
    stopPlayback();
    setMutedLayers(new Set());
    setSelectedSongId(songId);
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  };

  /** 현재 보고 있는 수록곡을 복사해 작곡 모드로 바로 편곡 시작 */
  const handleEditCopyInComposer = () => {
    if (!activeSong) return;
    stopPlayback();
    setDraftSong({
      ...activeSong,
      id: `custom_${Date.now()}`,
      title: customSongIdSet.has(activeSong.id)
        ? activeSong.title
        : `${activeSong.title.split(' (')[0]} (편곡)`,
      layers: activeSong.layers.map((layer) => ({
        instrumentId: layer.instrumentId,
        steps: [...layer.steps],
      })),
    });
    setMode('compose');
    showToast('악보를 작곡 화면으로 불러왔어요!');
  };

  /** 개별 악기 레이어 음소거 토글 */
  const handleToggleLayerMute = (instrumentId: string) => {
    setMutedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(instrumentId)) {
        next.delete(instrumentId);
      } else {
        next.add(instrumentId);
      }
      return next;
    });
  };

  /** 작곡 모드: 마디 수 변경 (2마디=16칸 / 4마디=32칸 / 6마디=48칸) */
  const handleChangeMeasureCount = (measureCount: number) => {
    stopPlayback();
    const nextTotalSteps = measureCount * STEPS_PER_MEASURE;
    setDraftSong((prev) => ({
      ...prev,
      totalSteps: nextTotalSteps,
      layers: prev.layers.map((layer) => ({
        ...layer,
        steps: resizeSteps(layer.steps, nextTotalSteps),
      })),
    }));
  };

  /** 작곡 모드: 악기 레이어 추가 또는 삭제 토글 */
  const handleToggleTrackLayer = (instrumentId: TrackInstrumentId) => {
    setDraftSong((prev) => {
      const exists = prev.layers.some((layer) => layer.instrumentId === instrumentId);
      if (exists) {
        if (prev.layers.length <= 1) {
          showToast('최소 1개의 악기 레이어는 남겨두어야 해요.');
          return prev;
        }
        return {
          ...prev,
          layers: prev.layers.filter((layer) => layer.instrumentId !== instrumentId),
        };
      }

      const nextLayer: SongLayer = {
        instrumentId,
        steps: createEmptySteps(prev.totalSteps),
      };
      // taikoTracks.json 정의 순서(피리 -> 시메 -> 샤쿠 -> 오키 -> 차파)를 유지해 보기 좋게 정렬
      const trackOrder = new Map(allTracks.map((t, idx) => [t.id, idx]));
      const nextLayers = [...prev.layers, nextLayer].sort(
        (a, b) =>
          (trackOrder.get(a.instrumentId) ?? 99) -
          (trackOrder.get(b.instrumentId) ?? 99)
      );
      return { ...prev, layers: nextLayers };
    });
  };

  /**
   * 타임라인 음표 칸 클릭 핸들러
   * - 감상 모드: 음표가 있는 칸을 누르면 해당 악기 소리를 단독으로 미리듣기
   * - 작곡 모드: 해당 악기의 허용 음표 목록을 순서대로 순환(· -> 음1 -> 음2 -> ... -> ·)하며 즉시 소리 재생!
   */
  const handleStepCellClick = (instrumentId: TrackInstrumentId, stepIdx: number) => {
    const trackDef = tracksById[instrumentId];

    if (mode === 'view') {
      const layer = activeSong?.layers.find((l) => l.instrumentId === instrumentId);
      const token = layer?.steps[stepIdx] ?? '-';
      if (isRestToken(token)) return;
      audioManager.playTrackNote(instrumentId, token.trim(), {
        soundUrl: trackDef?.audioFiles?.[token.trim()],
        isNpc: false,
      });
      return;
    }

    // 작곡 모드: 해당 악기의 기본 음 목록(예: 尺 = ["う", "さ", "かっ"])을 순서대로 순환
    const palette = trackDef?.notes ?? ['どん', 'かっ'];
    let nextNote = '-';

    setDraftSong((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => {
        if (layer.instrumentId !== instrumentId) return layer;
        const currentToken = layer.steps[stepIdx] ?? '-';
        const currentIdx = palette.indexOf(currentToken);
        nextNote =
          currentIdx === -1
            ? palette[0]
            : currentIdx + 1 < palette.length
            ? palette[currentIdx + 1]
            : '-';

        const nextSteps = [...layer.steps];
        nextSteps[stepIdx] = nextNote;
        return { ...layer, steps: nextSteps };
      }),
    }));

    // 새로 찍은 음표 소리를 즉시 들려줘 직관적인 작곡 피드백 제공
    if (nextNote !== '-') {
      audioManager.playTrackNote(instrumentId, nextNote, {
        soundUrl: trackDef?.audioFiles?.[nextNote],
        isNpc: false,
      });
    }
  };

  /** 작곡 모드: 우클릭 시 해당 칸의 음표를 한 번에 지우기('-') */
  const handleStepCellContextMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    instrumentId: TrackInstrumentId,
    stepIdx: number
  ) => {
    if (mode !== 'compose') return;
    event.preventDefault();

    setDraftSong((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => {
        if (layer.instrumentId !== instrumentId) return layer;
        const nextSteps = [...layer.steps];
        nextSteps[stepIdx] = '-';
        return { ...layer, steps: nextSteps };
      }),
    }));
  };

  /** 작곡 모드: 모든 레이어의 음표를 쉼표('-')로 깨끗하게 비우기 */
  const handleClearAllNotes = () => {
    stopPlayback();
    setDraftSong((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => ({
        ...layer,
        steps: createEmptySteps(prev.totalSteps),
      })),
    }));
    showToast('모든 음표를 비웠습니다.');
  };

  /** 작곡 모드: 브라우저(localStorage)에 저장하고 수록곡 목록에 바로 추가 */
  const handleSaveDraft = () => {
    stopPlayback();
    const trimmedTitle = draftSong.title.trim() || '나의 타이코 곡';
    const savedSong: SongConfig = {
      ...draftSong,
      id: draftSong.id.startsWith('custom_') ? draftSong.id : `custom_${Date.now()}`,
      title: trimmedTitle,
      layers: draftSong.layers.map((l) => ({
        instrumentId: l.instrumentId,
        steps: [...l.steps],
      })),
    };

    onSaveCustomSong(savedSong);
    setSelectedSongId(savedSong.id);
    setMode('view');
    showToast(`"${trimmedTitle}" 곡을 저장했어요!`);
  };

  /** 작곡 모드: 완성한 곡을 songs.json에 바로 붙여 넣을 수 있는 JSON 형식으로 복사 */
  const handleCopyJson = async () => {
    const trimmedTitle = draftSong.title.trim() || '나의 타이코 곡';
    const exportSong: SongConfig = {
      ...draftSong,
      title: trimmedTitle,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportSong, null, 2));
      showToast('songs.json에 넣을 수 있는 JSON을 복사했어요!');
    } catch {
      showToast('클립보드 복사를 지원하지 않는 브라우저입니다.');
    }
  };

  /** 저장된 사용자 작곡 곡 삭제 */
  const handleDeleteCurrentCustomSong = () => {
    if (!activeSong || !customSongIdSet.has(activeSong.id)) return;
    stopPlayback();
    onDeleteCustomSong(activeSong.id);
    setSelectedSongId(builtInSongs[0]?.id ?? '');
    showToast('저장된 커스텀 곡을 삭제했습니다.');
  };

  const handleClose = () => {
    stopPlayback();
    onClose();
  };

  const handleBack = () => {
    stopPlayback();
    onBackToMenu?.();
  };

  if (!activeSong) return null;

  const totalWidthPx = activeSong.totalSteps * STEP_CELL_WIDTH_PX;
  const stepIndices = Array.from({ length: activeSong.totalSteps }, (_, i) => i);
  const currentMeasureCount = Math.round(activeSong.totalSteps / STEPS_PER_MEASURE);
  const isCustomViewing = mode === 'view' && customSongIdSet.has(activeSong.id);

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="타이코 곡 정보 및 직접 작곡"
    >
      <div
        className="modal-card songbook-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div>
            <div className="modal-kicker">🎵 멀티 레이어 타이코 스튜디오</div>
            <h2 className="modal-title">곡 정보 · 레이어 악보</h2>
          </div>
          <div className="modal-header-actions">
            {onBackToMenu && (
              <button
                type="button"
                className="modal-back-btn"
                onClick={handleBack}
              >
                ← 메뉴
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleClose}
              aria-label="곡 정보 창 닫기"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 상단 모드 전환 탭: 수록곡 악보 vs 직접 작곡하기 */}
        <div className="song-mode-tabs">
          <button
            type="button"
            className={`song-mode-btn ${mode === 'view' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('view')}
          >
            📚 수록곡 악보 ({allSongs.length})
          </button>
          <button
            type="button"
            className={`song-mode-btn ${mode === 'compose' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('compose')}
          >
            ✨ 직접 작곡하기
          </button>
        </div>

        {/* 상태 피드백 토스트 */}
        {statusMessage && <div className="composer-toast">{statusMessage}</div>}

        {/* A) 수록곡 감상 모드 상단 영역 */}
        {mode === 'view' ? (
          <>
            <div className="song-tabs">
              {allSongs.map((song) => {
                const isCustom = customSongIdSet.has(song.id);
                return (
                  <button
                    key={song.id}
                    type="button"
                    className={`song-tab-btn ${
                      song.id === activeSong.id ? 'is-active' : ''
                    }`}
                    onClick={() => handleSelectSong(song.id)}
                  >
                    {isCustom ? '⭐ ' : ''}
                    {song.title.split(' (')[0]}
                  </button>
                );
              })}
            </div>

            <div className="song-info-box">
              <div className="song-info-top">
                <div>
                  <div className="song-info-title">{activeSong.title}</div>
                  <div className="song-info-subtitle">{activeSong.subtitle}</div>
                </div>
                <span className="song-difficulty-badge">
                  {isCustomViewing ? '내 작곡' : activeSong.difficulty}
                </span>
              </div>

              <p className="song-info-desc">{activeSong.description}</p>

              <div className="song-meta-row">
                <span>⏱️ BPM {activeSong.bpm}</span>
                <span>🎚️ 참여 악기 {activeSong.layers.length}종</span>
                <span>📏 {currentMeasureCount}마디</span>
              </div>

              {capableMembers.length > 0 && (
                <div className="song-players-row">
                  <span className="song-players-label">연주 가능 멤버</span>
                  <div className="song-players-chips">
                    {capableMembers.map((member) => (
                      <span
                        key={member.id}
                        className="song-player-chip"
                        style={{ borderColor: member.parts.color }}
                      >
                        <span
                          className="song-player-dot"
                          style={{ backgroundColor: member.parts.color }}
                        />
                        {member.nickname}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="song-view-actions">
                <button
                  type="button"
                  className="song-sub-btn"
                  onClick={handleEditCopyInComposer}
                >
                  ✏️ 이 곡을 작곡 화면에서 편곡하기
                </button>
                {isCustomViewing && (
                  <button
                    type="button"
                    className="song-sub-btn is-danger"
                    onClick={handleDeleteCurrentCustomSong}
                  >
                    🗑️ 삭제
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* B) 직접 작곡하기 모드 상단 툴바 */
          <div className="composer-panel">
            <div className="composer-row">
              <label className="composer-field composer-field--title">
                <span className="composer-label">곡 제목</span>
                <input
                  type="text"
                  className="composer-input"
                  value={draftSong.title}
                  maxLength={28}
                  placeholder="예: 여름 축제 리듬"
                  onChange={(event) =>
                    setDraftSong((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>

              <label className="composer-field composer-field--bpm">
                <span className="composer-label">BPM ({draftSong.bpm})</span>
                <input
                  type="range"
                  min={70}
                  max={160}
                  step={2}
                  value={draftSong.bpm}
                  onChange={(event) => {
                    stopPlayback();
                    setDraftSong((prev) => ({
                      ...prev,
                      bpm: Number(event.target.value),
                    }));
                  }}
                />
              </label>
            </div>

            {/* 마디 길이 선택 */}
            <div className="composer-inline-row">
              <span className="composer-label">마디 길이</span>
              <div className="composer-measure-btns">
                {[2, 4, 6].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`composer-chip-btn ${
                      currentMeasureCount === count ? 'is-active' : ''
                    }`}
                    onClick={() => handleChangeMeasureCount(count)}
                  >
                    {count}마디
                  </button>
                ))}
              </div>
            </div>

            {/* 참여 악기 레이어 추가 / 제거 선택 */}
            <div className="composer-tracks-row">
              <span className="composer-label">
                악기 레이어 선택 (눌러서 추가 · 제거)
              </span>
              <div className="composer-track-chips">
                {allTracks.map((track) => {
                  const isIncluded = draftSong.layers.some(
                    (l) => l.instrumentId === track.id
                  );
                  return (
                    <button
                      key={track.id}
                      type="button"
                      className={`composer-track-chip ${isIncluded ? 'is-included' : ''}`}
                      style={
                        isIncluded
                          ? { backgroundColor: track.color, borderColor: track.color }
                          : { borderColor: track.color }
                      }
                      onClick={() => handleToggleTrackLayer(track.id)}
                    >
                      {isIncluded ? '✓ ' : '+ '}
                      {track.shortName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 재생 / 정지 + (작곡 모드 시) 저장 / JSON 복사 / 비우기 컨트롤 */}
        <div className="song-controls-bar">
          <button
            type="button"
            className={`song-play-btn ${isPlaying ? 'is-playing' : ''}`}
            onClick={() => {
              if (isPlaying) {
                stopPlayback();
              } else {
                void startPlayback();
              }
            }}
          >
            {isPlaying
              ? '⏹ 연주 정지'
              : mode === 'compose'
              ? '▶ 내 곡 연주 듣기'
              : '▶ 레이어 악보 연주 듣기'}
          </button>

          {mode === 'compose' && (
            <div className="composer-action-btns">
              <button
                type="button"
                className="composer-action-btn is-primary"
                onClick={handleSaveDraft}
              >
                💾 내 곡 저장
              </button>
              <button
                type="button"
                className="composer-action-btn"
                onClick={() => void handleCopyJson()}
              >
                📋 JSON 복사
              </button>
              <button
                type="button"
                className="composer-action-btn"
                onClick={handleClearAllNotes}
              >
                🗑️ 비우기
              </button>
            </div>
          )}
        </div>

        {/* 좌우로 긴 멀티 레이어 타임라인 악보 (재생 바 이동 + 자동 가로 스크롤) */}
        <div className="layer-score-section">
          <div className="layer-score-header-row">
            <span className="song-score-heading">
              {mode === 'compose'
                ? '칸을 클릭해 음표를 찍으세요! (반복 클릭으로 음 변경 · PC 우클릭으로 지우기)'
                : '레이어 악보 (좌우 스크롤 · 음표 탭 시 단독 미리듣기)'}
            </span>
          </div>

          <div className="layer-timeline-wrapper">
            {/* 좌측 고정 악기 트랙 헤더 열 */}
            <div className="layer-track-labels">
              <div className="layer-ruler-corner">마디</div>
              {activeSong.layers.map((layer) => {
                const track = tracksById[layer.instrumentId];
                const isLayerMuted = mutedLayers.has(layer.instrumentId);

                return (
                  <div
                    key={layer.instrumentId}
                    className={`layer-track-label ${isLayerMuted ? 'is-muted' : ''}`}
                    title={track?.summary}
                  >
                    <span
                      className="layer-track-bar"
                      style={{ backgroundColor: track?.color ?? '#8c7b6b' }}
                    />
                    <span className="layer-track-name">
                      {track?.shortName ?? layer.instrumentId}
                    </span>
                    <button
                      type="button"
                      className="layer-mute-btn"
                      onClick={() => handleToggleLayerMute(layer.instrumentId)}
                      aria-label={`${track?.shortName ?? layer.instrumentId} ${
                        isLayerMuted ? '소리 켜기' : '음소거'
                      }`}
                    >
                      {isLayerMuted ? '🔇' : '🔊'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 우측 가로 스크롤 타임라인 (재생 시 바가 이동하며 자동 스크롤됨) */}
            <div ref={timelineScrollRef} className="layer-timeline-scroll">
              <div
                className="layer-timeline-inner"
                style={{ width: `${totalWidthPx}px` }}
              >
                {/* 움직이는 세로 재생 바 (Playhead) */}
                {currentStepIndex >= 0 && (
                  <div
                    className="layer-playhead-bar"
                    style={{
                      transform: `translateX(${currentStepIndex * STEP_CELL_WIDTH_PX}px)`,
                      width: `${STEP_CELL_WIDTH_PX}px`,
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* 상단 마디 / 박자 눈금자 */}
                <div className="layer-ruler-row">
                  {stepIndices.map((stepIdx) => {
                    const isMeasureStart = stepIdx % activeSong.stepsPerMeasure === 0;
                    const measureNumber =
                      Math.floor(stepIdx / activeSong.stepsPerMeasure) + 1;
                    const beatInMeasure =
                      Math.floor((stepIdx % activeSong.stepsPerMeasure) / 2) + 1;
                    const isMainBeat = stepIdx % 2 === 0;

                    return (
                      <div
                        key={`ruler-${stepIdx}`}
                        className={`layer-ruler-cell ${
                          isMeasureStart ? 'is-measure-start' : ''
                        } ${stepIdx === currentStepIndex ? 'is-current' : ''}`}
                      >
                        {isMeasureStart
                          ? `${measureNumber}마디`
                          : isMainBeat
                          ? `${beatInMeasure}`
                          : '·'}
                      </div>
                    );
                  })}
                </div>

                {/* 각 참여 악기별 음표 트랙 행 */}
                {activeSong.layers.map((layer) => {
                  const track = tracksById[layer.instrumentId];
                  const trackColor = track?.color ?? '#8c7b6b';
                  const isLayerMuted = mutedLayers.has(layer.instrumentId);

                  return (
                    <div
                      key={`track-${layer.instrumentId}`}
                      className={`layer-steps-row ${isLayerMuted ? 'is-muted' : ''}`}
                    >
                      {stepIndices.map((stepIdx) => {
                        const token = layer.steps[stepIdx] ?? '-';
                        const isRest = isRestToken(token);
                        const isMeasureStart =
                          stepIdx % activeSong.stepsPerMeasure === 0;
                        const isCurrent = stepIdx === currentStepIndex;

                        return (
                          <button
                            key={`${layer.instrumentId}-${stepIdx}`}
                            type="button"
                            disabled={mode === 'view' && isRest}
                            className={[
                              'layer-step-cell',
                              isRest ? 'is-rest' : 'has-note',
                              mode === 'compose' ? 'is-editable' : '',
                              isMeasureStart ? 'is-measure-start' : '',
                              isCurrent && !isRest ? 'is-hitting' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() =>
                              handleStepCellClick(layer.instrumentId, stepIdx)
                            }
                            onContextMenu={(event) =>
                              handleStepCellContextMenu(
                                event,
                                layer.instrumentId,
                                stepIdx
                              )
                            }
                          >
                            {isRest ? (
                              <span className="layer-rest-dot">·</span>
                            ) : (
                              <span
                                className="layer-note-chip"
                                style={{ backgroundColor: trackColor }}
                              >
                                {token}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="song-score-legend">
            尺(う·さ·かっ) · 沖(どん·かっ) · 締め(う·さ) · 笛(レ·ミ·ソ·ラ) · チャッパ(チャン·チッ)
          </p>
        </div>
      </div>
    </div>
  );
}

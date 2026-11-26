import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type {
  MemberConfig,
  NoteDynamic,
  SongConfig,
  SongLayer,
  TaikoTrackDefinition,
  TrackInstrumentId,
} from '../../types/content';
import { useI18n } from '../../i18n/I18nContext';
import { audioManager } from '../../systems/audioManager';
import { getTaikoGroupById } from '../../utils/characterAppearance';
import {
  computeStepDynamicGain,
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

/** 작곡 시 타임라인 칸을 클릭했을 때 적용할 편집 도구 종류 */
type ComposeTool = 'note' | NoteDynamic;

/** 타임라인 한 칸(스텝)의 가로 폭(px) — 재생 바 이동 및 자동 스크롤 계산 기준 */
const STEP_CELL_WIDTH_PX = 40;
/** 한 마디당 기본 스텝 수 (4/4박자 8분음표 = 8칸) */
const STEPS_PER_MEASURE = 8;

/** 다이나믹 종류별 악보 표시 기호 맵 */
const DYNAMIC_BADGE_LABELS: Record<NoteDynamic, string> = {
  normal: '',
  strong: 'f',
  weak: 'p',
  cresc: '<',
  decresc: '>',
};

/** 작곡 표현(다이나믹) 도구 ID 목록 */
const COMPOSE_TOOL_IDS: readonly ComposeTool[] = [
  'note',
  'strong',
  'weak',
  'cresc',
  'decresc',
  'normal',
];

/** 지정 길이의 빈 쉼표('-') 배열 생성 */
function createEmptySteps(length: number): string[] {
  return Array.from({ length }, () => '-');
}

/** 지정 길이의 기본 다이나믹('normal') 배열 생성 */
function createEmptyDynamics(length: number): NoteDynamic[] {
  return Array.from({ length }, () => 'normal');
}

/** 마디 수 변경 시 기존 배열 길이를 보존하며 조절 */
function resizeArray<T>(items: T[] | undefined, nextLength: number, fillValue: T): T[] {
  const source = items ?? [];
  if (source.length === nextLength) return [...source];
  if (source.length > nextLength) return source.slice(0, nextLength);
  return [...source, ...Array.from({ length: nextLength - source.length }, () => fillValue)];
}

/** 직접 작곡 모드 시작 시 기본으로 제공하는 3레이어(締め · 尺4 · 沖) 초기 초안 */
function createInitialDraftSong(t: (path: string) => string): SongConfig {
  return {
    id: `custom_${Date.now()}`,
    title: t('songBook.draftTitleDefault'),
    subtitle: t('songBook.draftSubtitleDefault'),
    bpm: 116,
    difficulty: '입문',
    minPlayers: 3,
    stepsPerMeasure: STEPS_PER_MEASURE,
    totalSteps: 32,
    description: t('songBook.draftDescDefault'),
    layers: [
      {
        instrumentId: 'shime',
        volume: 0.8,
        steps: [
          'う', 'さ', 'う', 'さ', 'う', 'さ', 'う', 'さ',
          ...createEmptySteps(24),
        ],
        dynamics: [
          'cresc', 'cresc', 'cresc', 'cresc', 'cresc', 'cresc', 'cresc', 'cresc',
          ...createEmptyDynamics(24),
        ],
      },
      {
        instrumentId: 'shaku_4',
        volume: 0.85,
        steps: [
          'う', '-', 'さ', 'う', 'かっ', '-', '-', '-',
          ...createEmptySteps(24),
        ],
        dynamics: [
          'normal', 'normal', 'normal', 'normal', 'strong', 'normal', 'normal', 'normal',
          ...createEmptyDynamics(24),
        ],
      },
      {
        instrumentId: 'oki',
        volume: 0.95,
        steps: [
          'どん', '-', '-', '-', 'どん', '-', 'かっ', '-',
          ...createEmptySteps(24),
        ],
        dynamics: [
          'strong', 'normal', 'normal', 'normal', 'normal', 'normal', 'weak', 'normal',
          ...createEmptyDynamics(24),
        ],
      },
    ],
  };
}

/**
 * 메뉴바의 [곡 정보 · 레이어 악보 / 직접 작곡]에서 열리는 통합 악보 & 작곡 스튜디오 모달 컴포넌트
 * - 각 악기 레이어별로 볼륨 슬라이더와 음소거를 조절할 수 있습니다.
 * - 작곡 모드에서는 음표 찍기뿐 아니라 강하게(f), 약하게(p), 점점 크게(<), 점점 작게(>) 표현을 찍어
 *   실제 재생 소리에 즉시 반영할 수 있습니다.
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
  const { t } = useI18n();

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
  const [draftSong, setDraftSong] = useState<SongConfig>(() =>
    createInitialDraftSong(t)
  );
  const [composeTool, setComposeTool] = useState<ComposeTool>('note');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 감상 모드에서 임시로 조절한 레이어별 볼륨 덮어쓰기 맵 (곡 변경 시 초기화)
  const [viewVolumeOverrides, setViewVolumeOverrides] = useState<Record<string, number>>(
    {}
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [mutedLayers, setMutedLayers] = useState<Set<string>>(() => new Set());

  const timerRef = useRef<number | null>(null);
  const stepCursorRef = useRef(0);
  const mutedLayersRef = useRef<Set<string>>(mutedLayers);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const statusTimerRef = useRef<number | null>(null);

  // 감상 모드의 임시 레이어 볼륨 조절까지 합쳐진 최종 현재 곡 객체
  const activeSong = useMemo(() => {
    if (mode === 'compose') return draftSong;
    const base = allSongs.find((song) => song.id === selectedSongId) ?? allSongs[0] ?? null;
    if (!base) return null;
    return {
      ...base,
      layers: base.layers.map((layer) => ({
        ...layer,
        volume:
          viewVolumeOverrides[layer.instrumentId] !== undefined
            ? viewVolumeOverrides[layer.instrumentId]
            : layer.volume ?? 0.85,
      })),
    };
  }, [mode, draftSong, allSongs, selectedSongId, viewVolumeOverrides]);

  // 재생 중 볼륨·음표·강약을 실시간으로 바꿔도 즉시 소리에 반영되도록 ref 동기화
  const activeSongRef = useRef<SongConfig | null>(activeSong);
  useEffect(() => {
    activeSongRef.current = activeSong;
  }, [activeSong]);

  useEffect(() => {
    mutedLayersRef.current = mutedLayers;
  }, [mutedLayers]);

  // 현재 선택한 곡을 연주할 수 있는 서클 멤버 목록
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
  }, []);

  /** 재생 바가 이동할 때마다 가로 타임라인이 부드럽게 자동 스크롤되도록 추적 */
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

  /** 현재 곡을 BPM, 레이어 볼륨, 다이나믹(강약·점점 크게/작게)에 맞춰 재생하는 함수 */
  const startPlayback = useCallback(async () => {
    const songAtStart = activeSongRef.current;
    if (!songAtStart || songAtStart.totalSteps <= 0) return;

    stopPlayback();
    await audioManager.unlock();

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
          volume: item.volume,
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
    setViewVolumeOverrides({});
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
        : `${activeSong.title.split(' (')[0]} (${t('songBook.arrangeSuffix')})`,
      layers: activeSong.layers.map((layer) => ({
        instrumentId: layer.instrumentId,
        volume: layer.volume ?? 0.85,
        steps: [...layer.steps],
        dynamics: resizeArray(layer.dynamics, activeSong.totalSteps, 'normal'),
      })),
    });
    setComposeTool('note');
    setMode('compose');
    showToast(t('songBook.toastLoadedToComposer'));
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

  /** 개별 악기 레이어 볼륨(0 ~ 1) 슬라이더 변경 핸들러 */
  const handleLayerVolumeChange = (instrumentId: string, nextVolume: number) => {
    if (mode === 'compose') {
      setDraftSong((prev) => ({
        ...prev,
        layers: prev.layers.map((layer) =>
          layer.instrumentId === instrumentId ? { ...layer, volume: nextVolume } : layer
        ),
      }));
    } else {
      setViewVolumeOverrides((prev) => ({
        ...prev,
        [instrumentId]: nextVolume,
      }));
    }
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
        steps: resizeArray(layer.steps, nextTotalSteps, '-'),
        dynamics: resizeArray(layer.dynamics, nextTotalSteps, 'normal'),
      })),
    }));
  };

  /** 작곡 모드: 악기 레이어 추가 또는 삭제 토글 */
  const handleToggleTrackLayer = (instrumentId: TrackInstrumentId) => {
    setDraftSong((prev) => {
      const exists = prev.layers.some((layer) => layer.instrumentId === instrumentId);
      if (exists) {
        if (prev.layers.length <= 1) {
          showToast(t('songBook.toastMinOneLayer'));
          return prev;
        }
        return {
          ...prev,
          layers: prev.layers.filter((layer) => layer.instrumentId !== instrumentId),
        };
      }

      const nextLayer: SongLayer = {
        instrumentId,
        volume: 0.85,
        steps: createEmptySteps(prev.totalSteps),
        dynamics: createEmptyDynamics(prev.totalSteps),
      };
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
   * - 감상 모드: 음표가 있는 칸을 누르면 해당 악기의 다이나믹 볼륨으로 단독 미리듣기
   * - 작곡 모드:
   *   - 'note' 도구: 허용 음표를 순서대로 순환(· -> 음1 -> 음2 -> ... -> ·)하며 즉시 소리 재생
   *   - 다이나믹 도구(strong/weak/cresc/decresc/normal): 해당 칸의 강약 표현을 토글하고 변경된 강약으로 소리 확인
   */
  const handleStepCellClick = (instrumentId: TrackInstrumentId, stepIdx: number) => {
    const trackDef = tracksById[instrumentId];

    if (mode === 'view') {
      const layer = activeSong?.layers.find((l) => l.instrumentId === instrumentId);
      const token = layer?.steps[stepIdx] ?? '-';
      if (isRestToken(token)) return;
      const gain = (layer?.volume ?? 0.85) * computeStepDynamicGain(layer?.dynamics, stepIdx);
      audioManager.playTrackNote(instrumentId, token.trim(), {
        soundUrl: trackDef?.audioFiles?.[token.trim()],
        isNpc: false,
        volume: gain,
      });
      return;
    }

    // 작곡 모드 — 1) 강약 표현 도구 선택 상태
    if (composeTool !== 'note') {
      let previewToken = '-';
      let previewVolume = 0.85;

      setDraftSong((prev) => ({
        ...prev,
        layers: prev.layers.map((layer) => {
          if (layer.instrumentId !== instrumentId) return layer;
          const nextDynamics = resizeArray(layer.dynamics, prev.totalSteps, 'normal');
          const currentDyn = nextDynamics[stepIdx];
          // 이미 같은 다이나믹이 찍혀 있으면 'normal'로 해제, 아니면 선택한 다이나믹 적용
          nextDynamics[stepIdx] = currentDyn === composeTool ? 'normal' : composeTool;

          previewToken = layer.steps[stepIdx] ?? '-';
          previewVolume =
            (layer.volume ?? 0.85) * computeStepDynamicGain(nextDynamics, stepIdx);

          return { ...layer, dynamics: nextDynamics };
        }),
      }));

      if (!isRestToken(previewToken)) {
        audioManager.playTrackNote(instrumentId, previewToken.trim(), {
          soundUrl: trackDef?.audioFiles?.[previewToken.trim()],
          isNpc: false,
          volume: previewVolume,
        });
      }
      return;
    }

    // 작곡 모드 — 2) 음표 찍기 도구 선택 상태
    const palette = trackDef?.notes ?? ['どん', 'かっ'];
    let nextNote = '-';
    let previewVolume = 0.85;

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
        previewVolume =
          (layer.volume ?? 0.85) * computeStepDynamicGain(layer.dynamics, stepIdx);

        return { ...layer, steps: nextSteps };
      }),
    }));

    if (nextNote !== '-') {
      audioManager.playTrackNote(instrumentId, nextNote, {
        soundUrl: trackDef?.audioFiles?.[nextNote],
        isNpc: false,
        volume: previewVolume,
      });
    }
  };

  /** 작곡 모드: 우클릭 시 해당 칸의 음표와 다이나믹을 한 번에 초기화 */
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
        const nextDynamics = resizeArray(layer.dynamics, prev.totalSteps, 'normal');
        nextSteps[stepIdx] = '-';
        nextDynamics[stepIdx] = 'normal';
        return { ...layer, steps: nextSteps, dynamics: nextDynamics };
      }),
    }));
  };

  /** 작곡 모드: 모든 레이어의 음표와 다이나믹을 깨끗하게 비우기 */
  const handleClearAllNotes = () => {
    stopPlayback();
    setDraftSong((prev) => ({
      ...prev,
      layers: prev.layers.map((layer) => ({
        ...layer,
        steps: createEmptySteps(prev.totalSteps),
        dynamics: createEmptyDynamics(prev.totalSteps),
      })),
    }));
    showToast(t('songBook.toastCleared'));
  };

  /** 작곡 모드: 브라우저(localStorage)에 저장하고 수록곡 목록에 바로 추가 */
  const handleSaveDraft = () => {
    stopPlayback();
    const trimmedTitle = draftSong.title.trim() || t('songBook.draftTitleDefault');
    const savedSong: SongConfig = {
      ...draftSong,
      id: draftSong.id.startsWith('custom_') ? draftSong.id : `custom_${Date.now()}`,
      title: trimmedTitle,
      minPlayers: Math.max(3, draftSong.minPlayers),
      layers: draftSong.layers.map((l) => ({
        instrumentId: l.instrumentId,
        volume: l.volume ?? 0.85,
        steps: [...l.steps],
        dynamics: resizeArray(l.dynamics, draftSong.totalSteps, 'normal'),
      })),
    };

    onSaveCustomSong(savedSong);
    setSelectedSongId(savedSong.id);
    setViewVolumeOverrides({});
    setMode('view');
    showToast(t('songBook.toastSaved', { title: trimmedTitle }));
  };

  /** [📤 내 곡 내보내기] — 추후 파일/공유 내보내기 기능 구현 예정 안내 */
  const handleExportPlaceholder = () => {
    showToast(t('songBook.toastExportComing'));
  };

  /** 저장된 사용자 작곡 곡 삭제 */
  const handleDeleteCurrentCustomSong = () => {
    if (!activeSong || !customSongIdSet.has(activeSong.id)) return;
    stopPlayback();
    onDeleteCustomSong(activeSong.id);
    setSelectedSongId(builtInSongs[0]?.id ?? '');
    showToast(t('songBook.toastDeleted'));
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
      aria-label={t('songBook.dialogAria')}
    >
      <div
        className="modal-card songbook-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div>
            <div className="modal-kicker">{t('songBook.kicker')}</div>
            <h2 className="modal-title">{t('songBook.title')}</h2>
          </div>
          <div className="modal-header-actions">
            {onBackToMenu && (
              <button
                type="button"
                className="modal-back-btn"
                onClick={handleBack}
              >
                {t('common.backToMenu')}
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleClose}
              aria-label={t('songBook.closeAria')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 상단 모드 전환 탭 */}
        <div className="song-mode-tabs">
          <button
            type="button"
            className={`song-mode-btn ${mode === 'view' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('view')}
          >
            {t('songBook.tabView', { count: allSongs.length })}
          </button>
          <button
            type="button"
            className={`song-mode-btn ${mode === 'compose' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('compose')}
          >
            {t('songBook.tabCompose')}
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
                  {isCustomViewing
                    ? t('songBook.customBadge')
                    : t(`songBook.difficulty.${activeSong.difficulty}`)}
                </span>
              </div>

              <p className="song-info-desc">{activeSong.description}</p>

              <div className="song-meta-row">
                <span>⏱️ BPM {activeSong.bpm}</span>
                <span>
                  {t('songBook.metaLayers', { count: activeSong.layers.length })}
                </span>
                <span>
                  {t('songBook.metaMinPlayers', {
                    count: Math.max(3, activeSong.minPlayers),
                  })}
                </span>
              </div>

              {capableMembers.length > 0 && (
                <div className="song-players-row">
                  <span className="song-players-label">
                    {t('songBook.capableMembers')}
                  </span>
                  <div className="song-players-chips">
                    {capableMembers.map((member) => {
                      const group = getTaikoGroupById(member.appearance.groupId);
                      return (
                        <span
                          key={member.id}
                          className="song-player-chip"
                          style={{ borderColor: group.happiColor }}
                        >
                          <span
                            className="song-player-dot"
                            style={{ backgroundColor: group.happiColor }}
                          />
                          {member.nickname}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="song-view-actions">
                <button
                  type="button"
                  className="song-sub-btn"
                  onClick={handleEditCopyInComposer}
                >
                  {t('songBook.arrangeBtn')}
                </button>
                {isCustomViewing && (
                  <button
                    type="button"
                    className="song-sub-btn is-danger"
                    onClick={handleDeleteCurrentCustomSong}
                  >
                    {t('songBook.deleteBtn')}
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
                <span className="composer-label">
                  {t('songBook.composerSongTitleLabel')}
                </span>
                <input
                  type="text"
                  className="composer-input"
                  value={draftSong.title}
                  maxLength={28}
                  placeholder={t('songBook.composerSongTitlePlaceholder')}
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

            {/* 마디 길이 & 최소 합주 인원 설정 (항상 3명 이상) */}
            <div className="composer-settings-grid">
              <div className="composer-inline-row">
                <span className="composer-label">
                  {t('songBook.composerMeasuresLabel')}
                </span>
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
                      {t('songBook.composerMeasureChip', { count })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="composer-inline-row">
                <span className="composer-label">
                  {t('songBook.composerMinPlayersLabel')}
                </span>
                <div className="composer-measure-btns">
                  {[3, 4, 5, 6].map((minCount) => (
                    <button
                      key={minCount}
                      type="button"
                      className={`composer-chip-btn ${
                        draftSong.minPlayers === minCount ? 'is-active' : ''
                      }`}
                      onClick={() =>
                        setDraftSong((prev) => ({ ...prev, minPlayers: minCount }))
                      }
                    >
                      {t('songBook.composerMinPlayersChip', { count: minCount })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 참여 악기 레이어 추가 / 제거 선택 */}
            <div className="composer-tracks-row">
              <span className="composer-label">
                {t('songBook.composerTracksLabel')}
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

            {/* 표현(다이나믹) 도구 선택 바 */}
            <div className="composer-tracks-row">
              <span className="composer-label">
                {t('songBook.composerBrushLabel')}
              </span>
              <div className="composer-brush-bar">
                {COMPOSE_TOOL_IDS.map((toolId) => (
                  <button
                    key={toolId}
                    type="button"
                    className={`composer-brush-btn ${
                      composeTool === toolId ? 'is-active' : ''
                    }`}
                    onClick={() => setComposeTool(toolId)}
                  >
                    {t(`songBook.tools.${toolId}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 재생 / 정지 + 저장 / 내보내기 / 비우기 컨트롤 */}
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
              ? t('songBook.btnStop')
              : mode === 'compose'
              ? t('songBook.btnPlayCustom')
              : t('songBook.btnPlayView')}
          </button>

          {mode === 'compose' && (
            <div className="composer-action-btns">
              <button
                type="button"
                className="composer-action-btn is-primary"
                onClick={handleSaveDraft}
              >
                {t('songBook.btnSave')}
              </button>
              <button
                type="button"
                className="composer-action-btn"
                onClick={handleExportPlaceholder}
              >
                {t('songBook.btnExport')}
              </button>
              <button
                type="button"
                className="composer-action-btn"
                onClick={handleClearAllNotes}
              >
                {t('songBook.btnClear')}
              </button>
            </div>
          )}
        </div>

        {/* 좌우로 긴 멀티 레이어 타임라인 악보 */}
        <div className="layer-score-section">
          <div className="layer-score-header-row">
            <span className="song-score-heading">
              {mode === 'compose'
                ? t('songBook.scoreHeadingCompose')
                : t('songBook.scoreHeadingView')}
            </span>
          </div>

          <div className="layer-timeline-wrapper">
            <div className="layer-track-labels">
              <div className="layer-ruler-corner">{t('songBook.rulerCorner')}</div>
              {activeSong.layers.map((layer) => {
                const track = tracksById[layer.instrumentId];
                const isLayerMuted = mutedLayers.has(layer.instrumentId);
                const layerVolume = layer.volume ?? 0.85;

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
                    <div className="layer-track-control-col">
                      <div className="layer-track-top-row">
                        <span className="layer-track-name">
                          {track?.shortName ?? layer.instrumentId}
                        </span>
                        <button
                          type="button"
                          className="layer-mute-btn"
                          onClick={() => handleToggleLayerMute(layer.instrumentId)}
                          aria-label={`${track?.shortName ?? layer.instrumentId} ${
                            isLayerMuted ? t('songBook.unmute') : t('songBook.mute')
                          }`}
                        >
                          {isLayerMuted ? '🔇' : '🔊'}
                        </button>
                      </div>
                      <input
                        type="range"
                        className="layer-volume-slider"
                        min={0}
                        max={1}
                        step={0.05}
                        value={layerVolume}
                        aria-label={`${track?.shortName ?? layer.instrumentId} ${t('songBook.volumeAria')}`}
                        onChange={(event) =>
                          handleLayerVolumeChange(
                            layer.instrumentId,
                            Number(event.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div ref={timelineScrollRef} className="layer-timeline-scroll">
              <div
                className="layer-timeline-inner"
                style={{ width: `${totalWidthPx}px` }}
              >
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
                          ? t('songBook.measureCell', { num: measureNumber })
                          : isMainBeat
                          ? `${beatInMeasure}`
                          : '·'}
                      </div>
                    );
                  })}
                </div>

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
                        const dyn: NoteDynamic = layer.dynamics?.[stepIdx] ?? 'normal';
                        const dynLabel = DYNAMIC_BADGE_LABELS[dyn];
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
                              dyn !== 'normal' ? `dyn-${dyn}` : '',
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
                              <span className="layer-rest-dot">
                                {dynLabel || '·'}
                              </span>
                            ) : (
                              <span
                                className={`layer-note-chip ${
                                  dyn === 'weak'
                                    ? 'is-weak'
                                    : dyn === 'strong'
                                    ? 'is-strong'
                                    : ''
                                }`}
                                style={{ backgroundColor: trackColor }}
                              >
                                {token}
                              </span>
                            )}
                            {!isRest && dynLabel && (
                              <span
                                className={`layer-dynamic-badge layer-dynamic-badge--${dyn}`}
                                aria-hidden="true"
                              >
                                {dynLabel}
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

          <p className="song-score-legend">{t('songBook.scoreLegend')}</p>
        </div>
      </div>
    </div>
  );
}

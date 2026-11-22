import { useEffect, useState } from 'react';
import type {
  CharacterAppearance,
  CharacterFaceConfig,
  CharacterHairStyle,
  EquippedInstrumentId,
  FaceEyeStyle,
  FaceMouthStyle,
  FaceNoseStyle,
} from '../../types/content';
import {
  TAIKO_GROUPS,
  createRandomAppearance,
  getTaikoGroupById,
} from '../../utils/characterAppearance';
import { serializeFaceCode } from '../../utils/memberSheetLoader';

interface CharacterCustomizerPanelProps {
  /** 현재 게스트 캐릭터의 5-레이어 외형 설정 */
  appearance: CharacterAppearance;
  /** 외형 변경 시 즉시 3D 반영 및 localStorage 자동 저장을 수행하는 콜백 */
  onChangeAppearance: (next: CharacterAppearance) => void;
  /** 프리뷰에서 연주('play') 포즈 테스트 중인지 여부 */
  isPreviewPlaying: boolean;
  /** 프리뷰 연주 포즈 토글 콜백 */
  onTogglePreviewPlay: () => void;
  /** 프리뷰 캐릭터를 좌/우로 회전하거나 정면으로 되돌리는 콜백 */
  onRotatePreview: (deltaRadians: number | 'reset') => void;
  /** 꾸미기 패널 닫기 콜백 */
  onClose: () => void;
}

type CustomizerTab = 'group' | 'face' | 'hair' | 'instrument';

/** 헤어 선택 버튼용 한국어 라벨 목록 */
const HAIR_CHOICES: Array<{ id: CharacterHairStyle; label: string; emoji: string }> = [
  { id: 'hair_hachimaki', label: '머리띠', emoji: '🎀' },
  { id: 'hair_bun', label: '만두머리', emoji: '🍡' },
  { id: 'hair_bob', label: '단발', emoji: '💇' },
  { id: 'hair_spiky', label: '뾰족헤어', emoji: '⚡' },
  { id: 'hair_cap', label: '모자', emoji: '🧢' },
  { id: 'hair_none', label: '없음', emoji: '✨' },
];

/** 장비 타이코 선택 버튼용 한국어 라벨 목록 */
const INSTRUMENT_CHOICES: Array<{
  id: EquippedInstrumentId;
  label: string;
  desc: string;
}> = [
  { id: 'shaku_2', label: '尺(2)', desc: '소형 어깨북' },
  { id: 'shaku_4', label: '尺(4)', desc: '중형 어깨북' },
  { id: 'shaku_6', label: '尺(6)', desc: '대형 어깨북' },
  { id: 'oki', label: '沖', desc: '웅장한 큰 어깨북' },
  { id: 'shime', label: '締め', desc: '리드 시메다이코' },
  { id: 'fue', label: '笛', desc: '대나무 피리' },
  { id: 'chappa', label: 'チャッパ', desc: '미니 심벌즈' },
  { id: 'none', label: '없음', desc: '맨손 산책' },
];

const EYE_CHOICES: Array<{ id: FaceEyeStyle; label: string }> = [
  { id: 'round', label: '동그란 눈' },
  { id: 'sparkle', label: '반짝 눈' },
  { id: 'happy', label: '웃는 눈' },
  { id: 'sleepy', label: '나른한 눈' },
];

const NOSE_CHOICES: Array<{ id: FaceNoseStyle; label: string }> = [
  { id: 'rabbit', label: '토끼 코' },
  { id: 'dot', label: '동그란 코' },
  { id: 'triangle', label: '삼각 코' },
];

const MOUTH_CHOICES: Array<{ id: FaceMouthStyle; label: string }> = [
  { id: 'smile', label: '미소' },
  { id: 'cat', label: '고양이·토끼 입' },
  { id: 'grin', label: '활짝 웃기' },
  { id: 'calm', label: '잔잔한 입' },
];

/**
 * 화면 하단 [🎨 꾸미기] 버튼을 눌렀을 때 열리는 실시간 3D 캐릭터 커스터마이징 패널 컴포넌트
 * - 카메라가 내 캐릭터를 가까이 클로즈업한 상태에서 단체(종족+법피), 2D 얼굴(눈·코·입 크기/위치),
 *   헤어, 좋아하는 타이코를 실시간으로 바꾸며 모든 변경은 localStorage에 자동 저장됩니다.
 * - [📋 시트용 얼굴코드 복사] 기능으로 3D로 꾸민 얼굴을 구글 시트 멤버 탭에 바로 붙여넣을 수 있습니다.
 */
export function CharacterCustomizerPanel({
  appearance,
  onChangeAppearance,
  isPreviewPlaying,
  onTogglePreviewPlay,
  onRotatePreview,
  onClose,
}: CharacterCustomizerPanelProps) {
  // useState: 현재 선택된 탭과 얼굴코드 복사 완료 안내 토스트 관리
  const [activeTab, setActiveTab] = useState<CustomizerTab>('group');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const currentGroup = getTaikoGroupById(appearance.groupId);

  // ESC 키로 꾸미기 종료
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  /** 얼굴 세부 설정(눈·코·입 모양/크기/위치)의 일부만 깔끔하게 업데이트하는 보조 함수 */
  const updateFace = (patch: Partial<CharacterFaceConfig>) => {
    onChangeAppearance({
      ...appearance,
      face: {
        ...appearance.face,
        ...patch,
      },
    });
  };

  /** 랜덤 외형 생성 버튼 핸들러 */
  const handleRandomize = () => {
    onChangeAppearance(createRandomAppearance());
  };

  /**
   * 현재 3D로 맞춰 둔 얼굴 설정을 구글 시트 `멤버` 탭의 `M열(얼굴코드)`에 바로 붙여넣을 수 있게 복사
   */
  const handleCopyFaceCode = async () => {
    const faceCode = serializeFaceCode(appearance.face);
    try {
      await navigator.clipboard.writeText(faceCode);
      setCopyFeedback('✅ 복사 완료! 구글 시트 [얼굴코드] 칸에 붙여넣어 보세요.');
    } catch {
      // 클립보드 API가 제한된 환경에서는 프롬프트로 직접 복사할 수 있게 폴백
      window.prompt('아래 얼굴코드를 복사해 구글 시트 [얼굴코드] 칸에 붙여넣으세요:', faceCode);
      setCopyFeedback('📋 얼굴코드를 표시했습니다.');
    }
    window.setTimeout(() => setCopyFeedback(null), 2600);
  };

  return (
    <div
      className="customizer-overlay"
      data-ui-interactive="true"
      role="dialog"
      aria-label="캐릭터 꾸미기"
    >
      {/* 3D 캐릭터 회전 & 연주 포즈 테스트용 작은 플로팅 컨트롤 */}
      <div className="customizer-preview-controls">
        <button
          type="button"
          className="customizer-preview-btn"
          onClick={() => onRotatePreview(-Math.PI / 4)}
          aria-label="캐릭터 왼쪽으로 돌리기"
        >
          ↺ 회전
        </button>
        <button
          type="button"
          className="customizer-preview-btn"
          onClick={() => onRotatePreview('reset')}
          aria-label="캐릭터 정면 보기"
        >
          정면
        </button>
        <button
          type="button"
          className="customizer-preview-btn"
          onClick={() => onRotatePreview(Math.PI / 4)}
          aria-label="캐릭터 오른쪽으로 돌리기"
        >
          회전 ↻
        </button>
        <button
          type="button"
          className={`customizer-preview-btn ${isPreviewPlaying ? 'is-active' : ''}`}
          onClick={onTogglePreviewPlay}
        >
          {isPreviewPlaying ? '⏸ 기본 자세' : '🥁 연주 포즈'}
        </button>
      </div>

      {/* 실제 꾸미기 드로어 (PC: 우측 플로팅 카드 / 모바일: 하단 시트) */}
      <aside className="customizer-drawer">
        {/* 상단 헤더 */}
        <div className="customizer-header">
          <div>
            <div className="customizer-kicker">
              {currentGroup.species === 'rabbit' ? '🐰' : '🐢'} {currentGroup.name} · 자동 저장
            </div>
            <h2 className="customizer-title">🎨 캐릭터 꾸미기</h2>
          </div>

          <div className="customizer-header-actions">
            <button
              type="button"
              className="customizer-random-btn"
              onClick={handleRandomize}
              title="랜덤으로 꾸미기"
            >
              🎲 랜덤
            </button>
            <button
              type="button"
              className="customizer-done-btn"
              onClick={onClose}
            >
              완료
            </button>
          </div>
        </div>

        {/* 4개 카테고리 탭 */}
        <div className="customizer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'group'}
            className={`customizer-tab-btn ${activeTab === 'group' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            🏮 단체
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'face'}
            className={`customizer-tab-btn ${activeTab === 'face' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('face')}
          >
            😊 얼굴
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hair'}
            className={`customizer-tab-btn ${activeTab === 'hair' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('hair')}
          >
            🎀 헤어
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'instrument'}
            className={`customizer-tab-btn ${activeTab === 'instrument' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('instrument')}
          >
            🥁 타이코
          </button>
        </div>

        {/* 탭별 상세 선택 영역 */}
        <div className="customizer-body">
          {/* 1) 단체 · 종족 · 法被 탭 */}
          {activeTab === 'group' && (
            <div className="customizer-section">
              <p className="customizer-hint">
                단체를 선택하면 해당 단체의 <strong>동물 캐릭터</strong>와{' '}
                <strong>공통 法被(하피)</strong>가 함께 적용됩니다.
              </p>
              <div className="customizer-group-list">
                {TAIKO_GROUPS.map((group) => {
                  const isSelected = appearance.groupId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={`customizer-group-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() =>
                        onChangeAppearance({
                          ...appearance,
                          groupId: group.id,
                        })
                      }
                    >
                      <span
                        className="customizer-group-swatch"
                        style={{
                          backgroundColor: group.happiColor,
                          borderColor: group.happiBorderColor,
                        }}
                      >
                        {group.species === 'rabbit' ? '🐰' : '🐢'}
                      </span>
                      <span className="customizer-group-info">
                        <span className="customizer-group-name">
                          {group.name}
                          <span className="customizer-species-tag">
                            {group.speciesLabel}
                          </span>
                        </span>
                        <span className="customizer-group-sub">
                          {group.affiliation} · 공통 法被
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2) 2D CanvasTexture 얼굴 커스터마이징 탭 */}
          {activeTab === 'face' && (
            <div className="customizer-section">
              {/* 눈 모양 + 슬라이더 */}
              <div className="customizer-block">
                <div className="customizer-label">👀 눈 모양</div>
                <div className="customizer-chip-grid">
                  {EYE_CHOICES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`customizer-chip ${appearance.face.eyes === opt.id ? 'is-selected' : ''}`}
                      onClick={() => updateFace({ eyes: opt.id })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="customizer-sliders">
                  <label className="customizer-slider-row">
                    <span>눈 크기</span>
                    <input
                      type="range"
                      min={0.75}
                      max={1.3}
                      step={0.05}
                      value={appearance.face.eyeScale}
                      onChange={(e) => updateFace({ eyeScale: Number(e.target.value) })}
                    />
                  </label>
                  <label className="customizer-slider-row">
                    <span>눈 높이</span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={appearance.face.eyeY}
                      onChange={(e) => updateFace({ eyeY: Number(e.target.value) })}
                    />
                  </label>
                  <label className="customizer-slider-row">
                    <span>눈 간격</span>
                    <input
                      type="range"
                      min={-8}
                      max={8}
                      step={1}
                      value={appearance.face.eyeSpacing}
                      onChange={(e) => updateFace({ eyeSpacing: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>

              {/* 코 모양 + 슬라이더 */}
              <div className="customizer-block">
                <div className="customizer-label">👃 코 모양</div>
                <div className="customizer-chip-grid customizer-chip-grid--3">
                  {NOSE_CHOICES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`customizer-chip ${appearance.face.nose === opt.id ? 'is-selected' : ''}`}
                      onClick={() => updateFace({ nose: opt.id })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="customizer-sliders">
                  <label className="customizer-slider-row">
                    <span>코 크기</span>
                    <input
                      type="range"
                      min={0.75}
                      max={1.3}
                      step={0.05}
                      value={appearance.face.noseScale}
                      onChange={(e) => updateFace({ noseScale: Number(e.target.value) })}
                    />
                  </label>
                  <label className="customizer-slider-row">
                    <span>코 높이</span>
                    <input
                      type="range"
                      min={-10}
                      max={10}
                      step={1}
                      value={appearance.face.noseY}
                      onChange={(e) => updateFace({ noseY: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>

              {/* 입 모양 + 슬라이더 + 볼터치 */}
              <div className="customizer-block">
                <div className="customizer-label">👄 입 모양 & 볼터치</div>
                <div className="customizer-chip-grid">
                  {MOUTH_CHOICES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`customizer-chip ${appearance.face.mouth === opt.id ? 'is-selected' : ''}`}
                      onClick={() => updateFace({ mouth: opt.id })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="customizer-sliders">
                  <label className="customizer-slider-row">
                    <span>입 크기</span>
                    <input
                      type="range"
                      min={0.75}
                      max={1.3}
                      step={0.05}
                      value={appearance.face.mouthScale}
                      onChange={(e) => updateFace({ mouthScale: Number(e.target.value) })}
                    />
                  </label>
                  <label className="customizer-slider-row">
                    <span>입 높이</span>
                    <input
                      type="range"
                      min={-10}
                      max={10}
                      step={1}
                      value={appearance.face.mouthY}
                      onChange={(e) => updateFace({ mouthY: Number(e.target.value) })}
                    />
                  </label>
                </div>

                <label className="customizer-toggle-row">
                  <span>🌸 분홍 볼터치 표시</span>
                  <input
                    type="checkbox"
                    checked={appearance.face.blush}
                    onChange={(e) => updateFace({ blush: e.target.checked })}
                  />
                </label>
              </div>

              {/* 구글 시트 NPC 등록용 얼굴코드 원클릭 복사 */}
              <div className="customizer-sheet-helper">
                <button
                  type="button"
                  className="customizer-copy-btn"
                  onClick={() => void handleCopyFaceCode()}
                >
                  📋 시트용 얼굴코드 복사 (NPC 등록용)
                </button>
                {copyFeedback && (
                  <div className="customizer-copy-feedback">{copyFeedback}</div>
                )}
              </div>
            </div>
          )}

          {/* 3) 헤어 / 머리 장식 탭 */}
          {activeTab === 'hair' && (
            <div className="customizer-section">
              <p className="customizer-hint">
                토끼 귀와 겹치지 않도록 호환 설계된 헤어·장식을 골라보세요.
              </p>
              <div className="customizer-chip-grid">
                {HAIR_CHOICES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`customizer-chip customizer-chip--tall ${
                      appearance.hair === opt.id ? 'is-selected' : ''
                    }`}
                    onClick={() =>
                      onChangeAppearance({
                        ...appearance,
                        hair: opt.id,
                      })
                    }
                  >
                    <span className="customizer-chip-emoji">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4) 장비 타이코 / 악기 탭 */}
          {activeTab === 'instrument' && (
            <div className="customizer-section">
              <p className="customizer-hint">
                마음에 드는 타이코나 피리를 몸에 장비하고 잔디 공원을 돌아다녀 보세요!
              </p>
              <div className="customizer-chip-grid">
                {INSTRUMENT_CHOICES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`customizer-chip customizer-chip--instrument ${
                      appearance.equippedInstrument === opt.id ? 'is-selected' : ''
                    }`}
                    onClick={() =>
                      onChangeAppearance({
                        ...appearance,
                        equippedInstrument: opt.id,
                      })
                    }
                  >
                    <span className="customizer-inst-name">{opt.label}</span>
                    <span className="customizer-inst-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

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
import { useI18n } from '../../i18n/I18nContext';
import { localizeGroup } from '../../i18n/localizeData';
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

const HAIR_OPTIONS: Array<{ id: CharacterHairStyle; emoji: string }> = [
  { id: 'hair_hachimaki', emoji: '🎀' },
  { id: 'hair_bun', emoji: '🍡' },
  { id: 'hair_bob', emoji: '💇' },
  { id: 'hair_spiky', emoji: '⚡' },
  { id: 'hair_cap', emoji: '🧢' },
  { id: 'hair_none', emoji: '✨' },
];

const INSTRUMENT_IDS: readonly EquippedInstrumentId[] = [
  'shaku_2',
  'shaku_4',
  'shaku_5',
  'shaku_6',
  'oki',
  'eisa',
  'katsugi',
  'shime',
  'hira',
  'chu',
  'odaiko',
  'taru',
  'paranku',
  'fue',
  'chappa',
  'jangara',
  'chiki',
  'suzu',
  'uchiwa',
  'none',
];

const EYE_IDS: readonly FaceEyeStyle[] = ['round', 'sparkle', 'happy', 'sleepy'];
const NOSE_IDS: readonly FaceNoseStyle[] = ['rabbit', 'dot', 'triangle'];
const MOUTH_IDS: readonly FaceMouthStyle[] = ['smile', 'cat', 'grin', 'calm'];

/**
 * 화면 하단 [🎨 꾸미기] 버튼을 눌렀을 때 열리는 실시간 3D 캐릭터 커스터마이징 패널 컴포넌트
 */
export function CharacterCustomizerPanel({
  appearance,
  onChangeAppearance,
  isPreviewPlaying,
  onTogglePreviewPlay,
  onRotatePreview,
  onClose,
}: CharacterCustomizerPanelProps) {
  const { lang, t } = useI18n();
  const [activeTab, setActiveTab] = useState<CustomizerTab>('group');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const currentGroup = localizeGroup(getTaikoGroupById(appearance.groupId), lang);

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

  const updateFace = (patch: Partial<CharacterFaceConfig>) => {
    onChangeAppearance({
      ...appearance,
      face: {
        ...appearance.face,
        ...patch,
      },
    });
  };

  const handleRandomize = () => {
    onChangeAppearance(createRandomAppearance());
  };

  const handleCopyFaceCode = async () => {
    const faceCode = serializeFaceCode(appearance.face);
    try {
      await navigator.clipboard.writeText(faceCode);
      setCopyFeedback(t('customizer.copySuccess'));
    } catch {
      window.prompt(t('customizer.copyPrompt'), faceCode);
      setCopyFeedback(t('customizer.copyShown'));
    }
    window.setTimeout(() => setCopyFeedback(null), 2600);
  };

  return (
    <div
      className="customizer-overlay"
      data-ui-interactive="true"
      role="dialog"
      aria-label={t('customizer.dialogAria')}
    >
      {/* 3D 캐릭터 회전 & 연주 포즈 테스트용 작은 플로팅 컨트롤 */}
      <div className="customizer-preview-controls">
        <button
          type="button"
          className="customizer-preview-btn"
          onClick={() => onRotatePreview(-Math.PI / 4)}
        >
          {t('customizer.rotateLeft')}
        </button>
        <button
          type="button"
          className="customizer-preview-btn"
          onClick={() => onRotatePreview('reset')}
        >
          {t('customizer.rotateReset')}
        </button>
        <button
          type="button"
          className="customizer-preview-btn"
          onClick={() => onRotatePreview(Math.PI / 4)}
        >
          {t('customizer.rotateRight')}
        </button>
        <button
          type="button"
          className={`customizer-preview-btn ${isPreviewPlaying ? 'is-active' : ''}`}
          onClick={onTogglePreviewPlay}
        >
          {isPreviewPlaying ? t('customizer.poseBasic') : t('customizer.posePlay')}
        </button>
      </div>

      {/* 실제 꾸미기 드로어 */}
      <aside className="customizer-drawer">
        <div className="customizer-header">
          <div>
            <div className="customizer-kicker">
              {currentGroup.species === 'rabbit' ? '🐰' : '🐢'} {currentGroup.name} ·{' '}
              {t('customizer.autoSaveSuffix')}
            </div>
            <h2 className="customizer-title">{t('customizer.title')}</h2>
          </div>

          <div className="customizer-header-actions">
            <button
              type="button"
              className="customizer-random-btn"
              onClick={handleRandomize}
              title={t('customizer.randomTitle')}
            >
              {t('customizer.randomBtn')}
            </button>
            <button
              type="button"
              className="customizer-done-btn"
              onClick={onClose}
            >
              {t('customizer.doneBtn')}
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
            {t('customizer.tabGroup')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'face'}
            className={`customizer-tab-btn ${activeTab === 'face' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('face')}
          >
            {t('customizer.tabFace')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hair'}
            className={`customizer-tab-btn ${activeTab === 'hair' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('hair')}
          >
            {t('customizer.tabHair')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'instrument'}
            className={`customizer-tab-btn ${activeTab === 'instrument' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('instrument')}
          >
            {t('customizer.tabInstrument')}
          </button>
        </div>

        {/* 탭별 상세 선택 영역 */}
        <div className="customizer-body">
          {/* 1) 단체 · 종족 · 法被 탭 */}
          {activeTab === 'group' && (
            <div className="customizer-section">
              <p className="customizer-hint">{t('customizer.groupHint')}</p>
              <div className="customizer-group-list">
                {TAIKO_GROUPS.map((rawGroup) => {
                  const group = localizeGroup(rawGroup, lang);
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
                          {group.affiliation} · {t('customizer.commonHappi')}
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
              <div className="customizer-block">
                <div className="customizer-label">{t('customizer.eyesLabel')}</div>
                <div className="customizer-chip-grid">
                  {EYE_IDS.map((eyeId) => (
                    <button
                      key={eyeId}
                      type="button"
                      className={`customizer-chip ${appearance.face.eyes === eyeId ? 'is-selected' : ''}`}
                      onClick={() => updateFace({ eyes: eyeId })}
                    >
                      {t(`customizer.eyes.${eyeId}`)}
                    </button>
                  ))}
                </div>
                <div className="customizer-sliders">
                  <label className="customizer-slider-row">
                    <span>{t('customizer.eyeScale')}</span>
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
                    <span>{t('customizer.eyeY')}</span>
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
                    <span>{t('customizer.eyeSpacing')}</span>
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

              <div className="customizer-block">
                <div className="customizer-label">{t('customizer.noseLabel')}</div>
                <div className="customizer-chip-grid customizer-chip-grid--3">
                  {NOSE_IDS.map((noseId) => (
                    <button
                      key={noseId}
                      type="button"
                      className={`customizer-chip ${appearance.face.nose === noseId ? 'is-selected' : ''}`}
                      onClick={() => updateFace({ nose: noseId })}
                    >
                      {t(`customizer.nose.${noseId}`)}
                    </button>
                  ))}
                </div>
                <div className="customizer-sliders">
                  <label className="customizer-slider-row">
                    <span>{t('customizer.noseScale')}</span>
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
                    <span>{t('customizer.noseY')}</span>
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

              <div className="customizer-block">
                <div className="customizer-label">{t('customizer.mouthLabel')}</div>
                <div className="customizer-chip-grid">
                  {MOUTH_IDS.map((mouthId) => (
                    <button
                      key={mouthId}
                      type="button"
                      className={`customizer-chip ${appearance.face.mouth === mouthId ? 'is-selected' : ''}`}
                      onClick={() => updateFace({ mouth: mouthId })}
                    >
                      {t(`customizer.mouth.${mouthId}`)}
                    </button>
                  ))}
                </div>
                <div className="customizer-sliders">
                  <label className="customizer-slider-row">
                    <span>{t('customizer.mouthScale')}</span>
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
                    <span>{t('customizer.mouthY')}</span>
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
                  <span>{t('customizer.blushToggle')}</span>
                  <input
                    type="checkbox"
                    checked={appearance.face.blush}
                    onChange={(e) => updateFace({ blush: e.target.checked })}
                  />
                </label>
              </div>

              <div className="customizer-sheet-helper">
                <button
                  type="button"
                  className="customizer-copy-btn"
                  onClick={() => void handleCopyFaceCode()}
                >
                  {t('customizer.copyFaceCodeBtn')}
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
              <p className="customizer-hint">{t('customizer.hairHint')}</p>
              <div className="customizer-chip-grid">
                {HAIR_OPTIONS.map((opt) => (
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
                    <span>{t(`customizer.hair.${opt.id}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4) 장비 타이코 / 악기 탭 */}
          {activeTab === 'instrument' && (
            <div className="customizer-section">
              <p className="customizer-hint">{t('customizer.instrumentHint')}</p>
              <div className="customizer-chip-grid">
                {INSTRUMENT_IDS.map((instId) => (
                  <button
                    key={instId}
                    type="button"
                    className={`customizer-chip customizer-chip--instrument ${
                      appearance.equippedInstrument === instId ? 'is-selected' : ''
                    }`}
                    onClick={() =>
                      onChangeAppearance({
                        ...appearance,
                        equippedInstrument: instId,
                      })
                    }
                  >
                    <span className="customizer-inst-name">
                      {t(`customizer.instruments.${instId}.label`)}
                    </span>
                    <span className="customizer-inst-desc">
                      {t(`customizer.instruments.${instId}.desc`)}
                    </span>
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

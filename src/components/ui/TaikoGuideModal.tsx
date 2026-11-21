import { useEffect, useState } from 'react';
import type { TaikoGuideData, TaikoTrackDefinition } from '../../types/content';
import { audioManager } from '../../systems/audioManager';

interface TaikoGuideModalProps {
  /** taikoGuide.json에서 불러온 타이코 종류·지역 단체 소개 데이터 */
  guide: TaikoGuideData;
  /** 소리 미리듣기에 사용할 악기 음원 맵 */
  tracksById: Record<string, TaikoTrackDefinition>;
  /** 처음 열릴 때 기본으로 보여줄 탭 ('types' | 'groups') */
  initialTab?: 'types' | 'groups';
  /** 아지트에서 진입했을 때 강조 표시할 특정 지역 단체 ID */
  highlightedGroupId?: string | null;
  /** E 키로도 닫기를 허용할지 여부 (3D 아지트에서 E로 열었을 때 바로 E로 닫기 지원) */
  allowKeyEClose?: boolean;
  /** 메뉴로 돌아가기 콜백 (메뉴에서 진입했을 때만 버튼 표시) */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * [타이코 종류 · 지역 단체 소개] 안내 모달 컴포넌트
 * - 메뉴에서 열거나, 3D 월드의 지역 단체 아지트(転太鼓舞·鶴亀太鼓 큐브)에 다가가 E/클릭으로 열 수 있습니다.
 * - 아지트에서 열었을 때는 바로 '지역 타이코 단체' 탭이 선택되며 E 키로 열고 닫을 수 있습니다.
 */
export function TaikoGuideModal({
  guide,
  tracksById,
  initialTab = 'types',
  highlightedGroupId = null,
  allowKeyEClose = false,
  onBackToMenu,
  onClose,
}: TaikoGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'types' | 'groups'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, highlightedGroupId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Escape' || (allowKeyEClose && event.code === 'KeyE')) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, allowKeyEClose]);

  /** 안내 카드에서 해당 악기의 대표 소리를 1회 들려주는 핸들러 */
  const handlePlaySample = (trackId: string, sampleNote: string) => {
    const trackDef = tracksById[trackId];
    audioManager.playTrackNote(trackId, sampleNote, {
      soundUrl: trackDef?.audioFiles?.[sampleNote],
      isNpc: false,
      volume: 1,
    });
  };

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="타이코 종류 및 지역 타이코 단체 소개"
    >
      <div
        className="modal-card guide-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">📖 타이코 &amp; 지역 서클</div>
            <h2 className="modal-title">타이코 종류 · 지역 단체</h2>
          </div>
          <div className="modal-header-actions">
            {onBackToMenu && (
              <button
                type="button"
                className="modal-back-btn"
                onClick={onBackToMenu}
              >
                ← 메뉴
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="타이코 안내 창 닫기"
            >
              ✕
            </button>
          </div>
        </div>

        <p className="guide-intro">{guide.intro}</p>

        {/* 타이코 종류 / 지역 타이코 단체 전환 탭 */}
        <div className="guide-tabs">
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'types' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('types')}
          >
            🥁 타이코의 종류
          </button>
          <button
            type="button"
            className={`guide-tab-btn ${activeTab === 'groups' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            🏮 지역 타이코 단체
          </button>
        </div>

        {/* 탭 1: 타이코의 종류 */}
        {activeTab === 'types' ? (
          <div className="guide-list">
            {guide.instruments.map((item) => {
              const trackColor = item.trackId
                ? tracksById[item.trackId]?.color ?? '#8c7b6b'
                : '#8c7b6b';

              return (
                <div
                  key={item.id}
                  className="guide-instrument-card"
                  style={{ borderLeftColor: trackColor }}
                >
                  <div className="guide-instrument-top">
                    <div>
                      <span className="guide-instrument-name">{item.name}</span>
                      <span className="guide-instrument-reading">{item.reading}</span>
                    </div>

                    {item.trackId && item.sampleNote && (
                      <button
                        type="button"
                        className="guide-sample-btn"
                        onClick={() => handlePlaySample(item.trackId!, item.sampleNote!)}
                      >
                        🔊 소리 듣기
                      </button>
                    )}
                  </div>

                  <div className="guide-instrument-tags">
                    <span className="guide-tag">자세: {item.posture}</span>
                    <span className="guide-tag">{item.soundsLabel}</span>
                  </div>

                  <div className="guide-instrument-role">🎯 {item.role}</div>
                  <p className="guide-instrument-desc">{item.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          /* 탭 2: 지역 타이코 단체 소개 (転太鼓舞, 鶴亀太鼓 등) */
          <div className="guide-groups-list">
            {guide.localGroups.map((group) => {
              const isHighlighted = highlightedGroupId === group.id;
              return (
                <div
                  key={group.id}
                  className={`guide-group-card ${isHighlighted ? 'is-highlighted' : ''}`}
                >
                  <div className="guide-group-top-row">
                    <span className="guide-group-affiliation">{group.affiliation}</span>
                    {isHighlighted && (
                      <span className="guide-group-here-badge">📍 지금 보고 있는 아지트</span>
                    )}
                  </div>
                  <div className="guide-group-title-row">
                    <span className="guide-group-name">{group.name}</span>
                    <span className="guide-group-reading">{group.reading}</span>
                  </div>
                  <div className="guide-group-tagline">{group.tagline}</div>
                  <p className="guide-group-desc">{group.description}</p>
                  <div className="guide-group-tags">
                    {group.tags.map((tag) => (
                      <span key={tag} className="guide-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="guide-edit-notice">{guide.editNotice}</p>

        {allowKeyEClose && (
          <div className="modal-key-hint">
            <span className="key-cap key-cap--dark">E</span> 또는{' '}
            <span className="key-cap key-cap--dark">ESC</span> 키로 닫기
          </div>
        )}
      </div>
    </div>
  );
}

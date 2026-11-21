import { useEffect, useState } from 'react';
import type { TaikoGuideData, TaikoTrackDefinition } from '../../types/content';
import { audioManager } from '../../systems/audioManager';

interface TaikoGuideModalProps {
  /** taikoGuide.json에서 불러온 타이코 종류·지역 단체 소개 데이터 */
  guide: TaikoGuideData;
  /** 소리 미리듣기에 사용할 악기 음원 맵 */
  tracksById: Record<string, TaikoTrackDefinition>;
  /** 메뉴로 돌아가기 콜백 (메뉴에서 진입했을 때만 버튼 표시) */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 메뉴바의 [타이코 종류 · 지역 단체 소개]에서 열리는 안내 모달 컴포넌트
 * - '타이코의 종류' 탭: 尺(2,4,6), 沖, 締め, 笛, チャッパ(및 추후 추가될 서서 치는 북) 설명 + 소리 듣기
 * - '지역 타이코 단체' 탭: 転太鼓舞(조형대학), 鶴亀太鼓(기술대학) 등 지역 타이코 서클 소개
 */
export function TaikoGuideModal({
  guide,
  tracksById,
  onBackToMenu,
  onClose,
}: TaikoGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'types' | 'groups'>('types');

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

  /** 안내 카드에서 해당 악기의 대표 소리를 1회 들려주는 핸들러 */
  const handlePlaySample = (trackId: string, sampleNote: string) => {
    const trackDef = tracksById[trackId];
    audioManager.playTrackNote(trackId, sampleNote, {
      soundUrl: trackDef?.audioFiles?.[sampleNote],
      isNpc: false,
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
            {guide.localGroups.map((group) => (
              <div key={group.id} className="guide-group-card">
                <div className="guide-group-affiliation">{group.affiliation}</div>
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
            ))}
          </div>
        )}

        <p className="guide-edit-notice">{guide.editNotice}</p>
      </div>
    </div>
  );
}

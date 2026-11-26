import { useEffect, useState } from 'react';
import type { CircleInfo, CircleLink } from '../../types/content';
import { useI18n } from '../../i18n/I18nContext';

interface CircleInfoModalProps {
  /** 현재 언어로 변환된 서클 소개 및 문의 링크 데이터 */
  circle: CircleInfo;
  /** 메뉴로 돌아가기 콜백 (메뉴에서 진입했을 때 표시) */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

function getLinkIcon(type: CircleLink['type']): string {
  switch (type) {
    case 'instagram':
      return '📸';
    case 'university':
      return '🎓';
    case 'chat':
      return '💬';
    case 'youtube':
      return '▶️';
    default:
      return '🔗';
  }
}

function isSafeExternalUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

/**
 * HUD [서클/문의] 버튼을 눌렀을 때 열리는 서클 소개 & 링크·QR 모달 컴포넌트
 */
export function CircleInfoModal({
  circle,
  onBackToMenu,
  onClose,
}: CircleInfoModalProps) {
  const { t } = useI18n();
  const [instaQrFailed, setInstaQrFailed] = useState(false);
  const [siteQrFailed, setSiteQrFailed] = useState(false);

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

  const safeLinks = circle.links.filter((link) => isSafeExternalUrl(link.url));

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${circle.name} ${t('circle.dialogAriaSuffix')}`}
    >
      <div
        className="modal-card circle-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">{t('circle.kicker')}</div>
            <h2 className="modal-title">{circle.name}</h2>
          </div>
          <div className="modal-header-actions">
            {onBackToMenu && (
              <button
                type="button"
                className="modal-back-btn"
                onClick={onBackToMenu}
              >
                {t('common.backToMenu')}
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label={t('circle.closeAria')}
            >
              ✕
            </button>
          </div>
        </div>

        <p className="circle-tagline">{circle.tagline}</p>

        <div className="circle-desc-box">
          <p className="circle-desc-text">{circle.description}</p>
        </div>

        <div className="circle-practice-box">
          <span className="circle-practice-label">{t('circle.practiceLabel')}</span>
          <span className="circle-practice-value">{circle.practiceInfo}</span>
        </div>

        {/* 인스타그램 QR코드 & 이 사이트(Taiko World) QR코드 나란히 배치 */}
        {(circle.instagramQr || circle.siteQr) && (
          <div className="circle-qr-row">
            {circle.instagramQr && (
              <div className="circle-qr-card">
                <div className="circle-qr-box">
                  {!instaQrFailed ? (
                    <img
                      src={circle.instagramQr.imagePath}
                      alt={t('circle.instaQrAlt')}
                      className="circle-qr-image"
                      onError={() => setInstaQrFailed(true)}
                    />
                  ) : (
                    <div className="circle-qr-placeholder">
                      <span className="circle-qr-placeholder-icon" aria-hidden="true">
                        📸
                      </span>
                      <span className="circle-qr-placeholder-title">
                        {t('circle.instaQrFallback')}
                      </span>
                      <span className="circle-qr-placeholder-hint">
                        public/images/instagram-qr.png
                      </span>
                    </div>
                  )}
                </div>
                <p className="circle-qr-caption">{circle.instagramQr.caption}</p>
              </div>
            )}

            {circle.siteQr && (
              <div className="circle-qr-card">
                <div className="circle-qr-box">
                  {!siteQrFailed ? (
                    <img
                      src={circle.siteQr.imagePath}
                      alt={t('circle.siteQrAlt')}
                      className="circle-qr-image"
                      onError={() => setSiteQrFailed(true)}
                    />
                  ) : (
                    <div className="circle-qr-placeholder">
                      <span className="circle-qr-placeholder-icon" aria-hidden="true">
                        🌐
                      </span>
                      <span className="circle-qr-placeholder-title">
                        {t('circle.siteQrFallback')}
                      </span>
                      <span className="circle-qr-placeholder-hint">
                        public/images/site-qr.png
                      </span>
                    </div>
                  )}
                </div>
                <p className="circle-qr-caption">{circle.siteQr.caption}</p>
              </div>
            )}
          </div>
        )}

        {/* 외부 링크 버튼 목록 */}
        <div className="circle-links-section">
          <div className="circle-links-heading">{t('circle.linksHeading')}</div>
          <div className="circle-links-list">
            {safeLinks.map((link) => (
              <a
                key={`${link.type}-${link.label}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`circle-link-btn circle-link-btn--${link.type}`}
              >
                <span className="circle-link-left">
                  <span aria-hidden="true">{getLinkIcon(link.type)}</span>
                  <span>{link.label}</span>
                </span>
                <span className="circle-link-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { CircleInfo, CircleLink } from '../../types/content';

interface CircleInfoModalProps {
  /** circle.json에서 불러온 서클 소개 및 문의 링크 데이터 */
  circle: CircleInfo;
  /** 메뉴로 돌아가기 콜백 (메뉴에서 진입했을 때 표시) */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 링크 종류(type)에 맞는 아이콘 이모지를 반환하는 보조 함수
 */
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

/**
 * 외부 링크 주소가 안전한 http/https 프로토콜인지 검증하는 보안 보조 함수
 * - 잘못된 데이터나 javascript: 같은 위험한 링크(XSS)가 실행되지 않도록 막아줍니다.
 * @param url - 검사할 URL 문자열
 * @returns 안전한 웹 주소면 true
 */
function isSafeExternalUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

/**
 * HUD [서클/문의] 버튼을 눌렀을 때 열리는 서클 소개 & 링크·인스타그램 QR 모달 컴포넌트
 * - circle.json 데이터를 그대로 읽어 표시하므로, 링크나 QR 이미지 경로가 바뀌어도 JSON만 수정하면 됩니다.
 * @param props.circle - 서클 정보 객체
 * @param props.onClose - 모달 닫기 핸들러
 */
export function CircleInfoModal({
  circle,
  onBackToMenu,
  onClose,
}: CircleInfoModalProps) {
  // QR코드 이미지 파일이 아직 public/images/에 없을 때 깔끔한 안내 박스를 띄우기 위한 상태
  const [qrLoadFailed, setQrLoadFailed] = useState(false);

  // ESC 키로 모달 닫기 지원
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

  // 안전한 https/http 링크만 표시
  const safeLinks = circle.links.filter((link) => isSafeExternalUrl(link.url));

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${circle.name} 서클 소개 및 문의`}
    >
      <div
        className="modal-card circle-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div>
            <div className="modal-kicker">🥁 타이코 서클 소개</div>
            <h2 className="modal-title">{circle.name}</h2>
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
              aria-label="서클 소개 창 닫기"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 서클 한 줄 슬로건 */}
        <p className="circle-tagline">{circle.tagline}</p>

        {/* 서클 상세 소개 박스 */}
        <div className="circle-desc-box">
          <p className="circle-desc-text">{circle.description}</p>
        </div>

        {/* 정기 연습 안내 */}
        <div className="circle-practice-box">
          <span className="circle-practice-label">🗓️ 정기 연습</span>
          <span className="circle-practice-value">{circle.practiceInfo}</span>
        </div>

        {/* 인스타그램 QR코드를 넣을 수 있는 정사각형 네모박스 영역 */}
        {circle.instagramQr && (
          <div className="circle-qr-section">
            <div className="circle-qr-box">
              {!qrLoadFailed ? (
                <img
                  src={circle.instagramQr.imagePath}
                  alt="P.Taiko 인스타그램 QR코드"
                  className="circle-qr-image"
                  onError={() => setQrLoadFailed(true)}
                />
              ) : (
                <div className="circle-qr-placeholder">
                  <span className="circle-qr-placeholder-icon" aria-hidden="true">
                    📸
                  </span>
                  <span className="circle-qr-placeholder-title">인스타그램 QR</span>
                  <span className="circle-qr-placeholder-hint">
                    public/images/instagram-qr.png
                  </span>
                </div>
              )}
            </div>
            <p className="circle-qr-caption">{circle.instagramQr.caption}</p>
          </div>
        )}

        {/* 외부 링크 버튼 목록 (인스타그램 / 대학교 홈페이지 등) */}
        <div className="circle-links-section">
          <div className="circle-links-heading">소식 보기 · 바로가기</div>
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

import type { SiteTextsConfig } from '../../types/content';

interface LandingOverlayProps {
  /** siteTexts.json에서 불러온 입장 화면 문구 설정 */
  texts: SiteTextsConfig['landing'];
  /** 사용자가 [타이코 월드 입장] 버튼을 눌렀을 때 실행되는 콜백 */
  onEnter: () => void;
}

/**
 * 첫 방문 시 표시되는 입장 화면(Landing) 컴포넌트
 * - iOS/모바일 브라우저는 사용자의 첫 터치(클릭) 없이는 소리를 낼 수 없으므로,
 *   입장 버튼을 누르는 순간 오디오 시스템을 안전하게 활성화하기 위해 필요합니다.
 * - 표시되는 문구는 src/data/siteTexts.json의 landing 항목에서 바로 수정할 수 있습니다.
 */
export function LandingOverlay({ texts, onEnter }: LandingOverlayProps) {
  return (
    <div className="landing-overlay" data-ui-interactive="true">
      <div className="landing-card">
        <div className="landing-badge">{texts.badge}</div>
        <h1 className="landing-title">{texts.title}</h1>
        <p className="landing-desc">
          {texts.descriptionLine1}
          <br />
          {texts.descriptionLine2}
        </p>

        {/* 이 버튼 클릭이 브라우저 오디오를 켜는 첫 사용자 동작이 됩니다 */}
        <button type="button" className="landing-enter-btn" onClick={onEnter}>
          {texts.enterButton}
        </button>

        <p className="landing-audio-note">{texts.audioNote}</p>
      </div>
    </div>
  );
}

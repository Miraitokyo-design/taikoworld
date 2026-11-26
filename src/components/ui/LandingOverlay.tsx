import { useI18n } from '../../i18n/I18nContext';

interface LandingOverlayProps {
  /** 사용자가 [입장] 버튼을 눌렀을 때 실행되는 콜백 */
  onEnter: () => void;
}

/**
 * 첫 방문 시 표시되는 입장 화면(Landing) 컴포넌트
 * - 기본 언어는 일본어(ja)이며, 우측 상단 알약 버튼으로 입장 전에도 한국어/일본어 전환이 가능합니다.
 * - 입장 버튼을 누르는 순간 브라우저 오디오 시스템이 안전하게 활성화됩니다.
 */
export function LandingOverlay({ onEnter }: LandingOverlayProps) {
  const { lang, setLang, t, languages } = useI18n();

  return (
    <div className="landing-overlay" data-ui-interactive="true">
      <div className="landing-card">
        {/* 언어 빠른 전환 스위치 (기본 日本語 / 한국어 전환 가능) */}
        <div className="landing-lang-row" role="group" aria-label="Language switch">
          {languages.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`landing-lang-pill ${lang === option.id ? 'is-active' : ''}`}
              onClick={() => setLang(option.id)}
            >
              {option.flag} {option.nativeLabel}
            </button>
          ))}
        </div>

        <div className="landing-badge">{t('landing.badge')}</div>
        <h1 className="landing-title">{t('landing.title')}</h1>
        <p className="landing-desc">
          {t('landing.descriptionLine1')}
          <br />
          {t('landing.descriptionLine2')}
        </p>

        {/* 이 버튼 클릭이 브라우저 오디오를 켜는 첫 사용자 동작이 됩니다 */}
        <button type="button" className="landing-enter-btn" onClick={onEnter}>
          {t('landing.enterButton')}
        </button>

        <p className="landing-audio-note">{t('landing.audioNote')}</p>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import type { MemberConfig } from '../../types/content';
import { useI18n } from '../../i18n/I18nContext';
import { getTaikoGroupById } from '../../utils/characterAppearance';
import { MemberAvatar } from './MemberProfileModal';

interface MemberDirectoryModalProps {
  /** members.json 또는 구글 시트에서 불러온 전체 서클 멤버 목록 */
  members: MemberConfig[];
  /** 캐릭터 일러스트 카드를 선택했을 때 상세 프로필 카드를 여는 콜백 */
  onSelectMember: (member: MemberConfig) => void;
  /** 메뉴로 돌아가기 콜백 */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 메뉴바의 [멤버 정보]에서 열리는 컴팩트 캐릭터 일러스트 도감 모달 컴포넌트
 */
export function MemberDirectoryModal({
  members,
  onSelectMember,
  onBackToMenu,
  onClose,
}: MemberDirectoryModalProps) {
  const { t } = useI18n();

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

  return (
    <div
      className="modal-backdrop"
      data-ui-interactive="true"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('members.directoryAria')}
    >
      <div
        className="modal-card directory-modal-card directory-modal-card--grid"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">{t('members.directoryKicker')}</div>
            <h2 className="modal-title">{t('members.directoryTitle')}</h2>
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
              aria-label={t('members.directoryCloseAria')}
            >
              ✕
            </button>
          </div>
        </div>

        <p className="directory-subtitle">{t('members.directorySubtitle')}</p>

        {/* 한 화면에 최대한 많은 멤버를 한눈에 보여주는 일러스트 중심 컴팩트 그리드 */}
        <div className="directory-grid">
          {members.map((member) => {
            const group = getTaikoGroupById(member.appearance.groupId);
            return (
              <button
                key={member.id}
                type="button"
                className="directory-card-btn"
                onClick={() => onSelectMember(member)}
                aria-label={`${member.nickname} (${group.name})`}
              >
                <div className="directory-card-avatar">
                  <MemberAvatar member={member} size="small" />
                </div>
                <span className="directory-card-name">{member.nickname}</span>
                <span
                  className="directory-card-group"
                  style={{ backgroundColor: group.happiColor }}
                >
                  {group.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

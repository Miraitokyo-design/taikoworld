import { useEffect } from 'react';
import type { MemberConfig } from '../../types/content';
import { MemberAvatar } from './MemberProfileModal';

interface MemberDirectoryModalProps {
  /** members.json에서 불러온 전체 서클 멤버 목록 */
  members: MemberConfig[];
  /** 목록에서 멤버를 선택했을 때 해당 멤버의 상세 프로필 카드를 여는 콜백 */
  onSelectMember: (member: MemberConfig) => void;
  /** 메뉴로 돌아가기 콜백 */
  onBackToMenu?: () => void;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

/**
 * 메뉴바의 [멤버 정보]에서 열리는 전체 서클 멤버 도감 모달 컴포넌트
 * - 공원을 일일이 찾아다니지 않아도 모든 멤버를 한눈에 둘러보고,
 *   원하는 멤버를 누르면 바로 상세 미니 프로필 카드로 이동할 수 있습니다.
 */
export function MemberDirectoryModal({
  members,
  onSelectMember,
  onBackToMenu,
  onClose,
}: MemberDirectoryModalProps) {
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
      aria-label="P.Taiko 멤버 정보 목록"
    >
      <div
        className="modal-card directory-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">👥 P.Taiko 멤버 도감</div>
            <h2 className="modal-title">서클 멤버 ({members.length}명)</h2>
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
              aria-label="멤버 도감 닫기"
            >
              ✕
            </button>
          </div>
        </div>

        <p className="directory-subtitle">
          궁금한 멤버를 눌러 상세 프로필과 한마디를 확인해 보세요!
        </p>

        <div className="directory-list">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              className="directory-item-btn"
              onClick={() => onSelectMember(member)}
            >
              <MemberAvatar member={member} size="small" />
              <div className="directory-item-info">
                <div className="directory-item-top">
                  <span className="directory-item-name">{member.nickname}</span>
                  <span
                    className="directory-item-role"
                    style={{ backgroundColor: member.parts.color }}
                  >
                    {member.role}
                  </span>
                </div>
                <div className="directory-item-meta">
                  {member.profile.experience}
                  {member.profile.status ? ` / ${member.profile.status}` : ''}
                </div>
              </div>
              <span className="directory-item-arrow" aria-hidden="true">
                ▸
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { MemberConfig, SongConfig } from '../types/content';
import { loadMembersFromSheet } from '../utils/memberSheetLoader';
import type { MembersSource } from '../utils/memberSheetLoader';

/**
 * 서클 멤버(NPC) 목록을 관리하는 커스텀 React Hook
 * - 초기 렌더링에서는 기본 내장 데이터(members.json)를 즉시 보여줘 화면 지연을 없애고,
 *   환경변수(VITE_MEMBERS_CSV_URL)가 설정되어 있으면 백그라운드에서 구글 시트 최신 멤버를 불러와 교체합니다.
 * @param fallbackMembers - 기본 members.json 멤버 배열
 * @param songs - 시트의 연주 가능 곡 제목/ID 매칭용 곡 배열
 * @returns { members, source } 최신 멤버 배열과 출처('local' | 'sheet')
 */
export function useMembers(
  fallbackMembers: MemberConfig[],
  songs: SongConfig[]
): {
  members: MemberConfig[];
  source: MembersSource;
} {
  // useState: 기본 멤버로 먼저 월드를 그린 뒤, 구글 시트 응답이 도착하면 최신 멤버로 갱신
  const [members, setMembers] = useState<MemberConfig[]>(fallbackMembers);
  const [source, setSource] = useState<MembersSource>('local');

  // useEffect: 앱 최초 마운트 시 1회 구글 시트 멤버 탭 CSV를 비동기로 조회
  useEffect(() => {
    let isCancelled = false;
    const csvUrl = import.meta.env.VITE_MEMBERS_CSV_URL;

    async function fetchLatestMembers() {
      const result = await loadMembersFromSheet(csvUrl, fallbackMembers, songs);
      if (isCancelled) return;
      setMembers(result.members);
      setSource(result.source);
    }

    void fetchLatestMembers();

    return () => {
      isCancelled = true;
    };
  }, [fallbackMembers, songs]);

  return { members, source };
}

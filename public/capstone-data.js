// 캡스톤 디자인 대시보드 내용
// 이 파일만 고치면 메인 화면의 내용이 바뀝니다. 진행률과 D-day는 자동으로 계산됩니다.
// 아래 값은 모두 예시입니다. 실제 내용으로 바꾼 뒤 isSample을 false로 바꾸세요.
window.CAPSTONE_DATA = {
  isSample: true,

  title: '캡스톤 디자인 과제명',
  summary: '과제의 목표를 한두 문장으로 적어 주세요.',
  advisor: '(이름 입력)',
  startDate: '2026-09-01',
  finalDate: '2026-12-11', // 최종 발표일 (D-day 기준)

  // 단계별 진행: done = 끝낸 작업 수, total = 전체 작업 수
  stages: [
    { name: '주제 선정', done: 3, total: 3 },
    { name: '요구사항 분석', done: 4, total: 4 },
    { name: '설계', done: 4, total: 5 },
    { name: '구현', done: 3, total: 8 },
    { name: '시험·평가', done: 0, total: 4 },
    { name: '최종 보고', done: 0, total: 3 },
  ],

  // 주요 일정: 끝난 일정은 done을 true로 바꾸세요. 날짜가 지나도 false면 "지연"으로 표시됩니다.
  milestones: [
    { date: '2026-09-18', name: '주제 확정', done: true },
    { date: '2026-10-16', name: '중간 점검 1차', done: true },
    { date: '2026-11-13', name: '중간 점검 2차', done: false },
    { date: '2026-11-27', name: '시제품 시연', done: false },
    { date: '2026-12-11', name: '최종 발표', done: false },
  ],

  // 이번 주 할 일
  tasks: [
    { name: '할 일 1', owner: '팀원 A', due: '2026-11-09', done: true },
    { name: '할 일 2', owner: '팀원 B', due: '2026-11-11', done: false },
    { name: '할 일 3', owner: '팀원 C', due: '2026-11-13', done: false },
  ],

  // 팀 구성
  team: [
    { name: '팀원 A', role: '팀장 · 일정 관리' },
    { name: '팀원 B', role: '설계' },
    { name: '팀원 C', role: '구현' },
    { name: '팀원 D', role: '시험 · 문서' },
  ],
};

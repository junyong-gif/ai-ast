// 메인 화면의 캡스톤 디자인 대시보드. 내용은 capstone-data.js에서 읽는다.
(function () {
  const DAY = 24 * 60 * 60 * 1000;

  function daysFromToday(dateText) {
    const [year, month, day] = dateText.split('-').map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((new Date(year, month - 1, day) - today) / DAY);
  }

  function formatDday(days) {
    if (days === 0) return 'D-Day';
    return days > 0 ? `D-${days}` : `D+${-days}`;
  }

  function formatShortDate(dateText) {
    const [, month, day] = dateText.split('-').map(Number);
    return `${month}월 ${day}일`;
  }

  function percent(done, total) {
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  function getMilestoneStatus(milestone) {
    if (milestone.done) return { key: 'done', label: '완료', mark: '✓' };
    if (daysFromToday(milestone.date) < 0) return { key: 'late', label: '지연', mark: '!' };
    return { key: 'planned', label: '예정', mark: '○' };
  }

  function Tile({ label, value, note }) {
    return (
      <div className="cap-tile">
        <p className="cap-tile-label">{label}</p>
        <p className="cap-tile-value">{value}</p>
        <p className="cap-tile-note">{note}</p>
      </div>
    );
  }

  function Stage({ stage }) {
    const value = percent(stage.done, stage.total);
    return (
      <li className="cap-stage" title={`${stage.name}: 작업 ${stage.total}개 중 ${stage.done}개 완료`}>
        <div className="cap-stage-text">
          <span>{stage.name}</span>
          <span className="cap-stage-value">
            <strong>{value}%</strong> {stage.done}/{stage.total}
          </span>
        </div>
        <div
          className="cap-bar"
          role="progressbar"
          aria-label={`${stage.name} 진행률`}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={value}
        >
          <span style={{ width: `${value}%` }} />
        </div>
      </li>
    );
  }

  function Milestone({ milestone }) {
    const status = getMilestoneStatus(milestone);
    return (
      <li className="cap-row">
        <span className="cap-date">{formatShortDate(milestone.date)}</span>
        <span className="cap-row-name">{milestone.name}</span>
        <span className={`cap-status ${status.key}`}>
          <span aria-hidden="true">{status.mark}</span> {status.label}
        </span>
      </li>
    );
  }

  function Task({ task }) {
    return (
      <li className="cap-row">
        <span className={`cap-check${task.done ? ' done' : ''}`} aria-hidden="true">
          {task.done ? '✓' : ''}
        </span>
        <span className={`cap-row-name${task.done ? ' finished' : ''}`}>
          {task.name}
          <span className="sr-only">{task.done ? ' (완료)' : ' (진행 중)'}</span>
        </span>
        <span className="cap-row-meta">{task.owner} · {formatShortDate(task.due)}</span>
      </li>
    );
  }

  function CapstoneDashboard() {
    const data = window.CAPSTONE_DATA;
    const done = data.stages.reduce((sum, stage) => sum + stage.done, 0);
    const total = data.stages.reduce((sum, stage) => sum + stage.total, 0);
    const nextMilestone = data.milestones.find(
      (milestone) => !milestone.done && daysFromToday(milestone.date) >= 0
    );
    const lateCount = data.milestones.filter(
      (milestone) => getMilestoneStatus(milestone).key === 'late'
    ).length;

    return (
      <main className="capstone">
        <header className="cap-header">
          <div>
            <p className="cap-eyebrow">캡스톤 디자인 대시보드</p>
            <h1>{data.title}</h1>
            <p className="cap-summary">{data.summary}</p>
            <p className="cap-meta">
              {formatShortDate(data.startDate)} ~ {formatShortDate(data.finalDate)} · 지도 {data.advisor}
            </p>
          </div>
          {data.isSample && (
            <p className="cap-sample">예시 데이터입니다. capstone-data.js에서 실제 내용으로 바꿔 주세요.</p>
          )}
        </header>

        <section className="cap-tiles" aria-label="핵심 지표">
          <Tile label="전체 진행률" value={`${percent(done, total)}%`} note={`작업 ${total}개 중 ${done}개 완료`} />
          <Tile label="최종 발표까지" value={formatDday(daysFromToday(data.finalDate))} note={formatShortDate(data.finalDate)} />
          <Tile
            label="다음 일정"
            value={nextMilestone ? formatDday(daysFromToday(nextMilestone.date)) : '없음'}
            note={nextMilestone ? nextMilestone.name : '남은 일정이 없습니다'}
          />
          <Tile label="지연 일정" value={`${lateCount}건`} note={lateCount > 0 ? '일정을 확인해 주세요' : '지연 없음'} />
        </section>

        <div className="cap-grid">
          <section className="cap-card">
            <h2>단계별 진행률</h2>
            <ul className="cap-list">
              {data.stages.map((stage) => <Stage key={stage.name} stage={stage} />)}
            </ul>
          </section>

          <section className="cap-card">
            <h2>주요 일정</h2>
            <ul className="cap-list">
              {data.milestones.map((milestone) => (
                <Milestone key={`${milestone.date}-${milestone.name}`} milestone={milestone} />
              ))}
            </ul>
          </section>

          <section className="cap-card">
            <h2>이번 주 할 일</h2>
            <ul className="cap-list">
              {data.tasks.map((task) => <Task key={task.name} task={task} />)}
            </ul>
          </section>

          <section className="cap-card">
            <h2>팀 구성</h2>
            <ul className="cap-list">
              {data.team.map((member) => (
                <li className="cap-row" key={member.name}>
                  <span className="cap-row-name">{member.name}</span>
                  <span className="cap-row-meta">{member.role}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    );
  }

  window.CapstoneDashboard = CapstoneDashboard;
})();

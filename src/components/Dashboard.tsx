import { useMemo } from 'react';
import type { CompanyStats, Agent, Task } from '../types';

interface DashboardProps {
  stats: CompanyStats | null;
  agents: Agent[];
  tasks: Task[];
  companyName: string;
}

function useNow() {
  const now = new Date();
  const date = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const time = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date, time };
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  inbox: { label: '수신함', color: 'bg-slate-500' },
  planned: { label: '계획됨', color: 'bg-blue-500' },
  in_progress: { label: '진행 중', color: 'bg-amber-500' },
  review: { label: '검토 중', color: 'bg-purple-500' },
  done: { label: '완료', color: 'bg-emerald-500' },
  cancelled: { label: '취소됨', color: 'bg-red-500' },
};

const RANK_ICONS = ['👑', '🥈', '🥉'];

const DEPT_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
];

// Circular SVG progress ring
function CircularProgress({ value }: { value: number }) {
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
      <circle
        stroke="#334155"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="url(#progressGradient)"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Dashboard({ stats, agents, tasks, companyName }: DashboardProps) {
  const { date, time } = useNow();

  const totalTasks = stats?.tasks?.total ?? tasks.length;
  const completedTasks = stats?.tasks?.done ?? tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks =
    stats?.tasks?.in_progress ?? tasks.filter((t) => t.status === 'in_progress').length;
  const activeAgents =
    stats?.agents?.working ?? agents.filter((a) => a.status === 'working').length;
  const totalAgents = stats?.agents?.total ?? agents.length;
  const completionRate =
    stats?.tasks?.completion_rate ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

  // Department performance data
  const deptData = useMemo(() => {
    if (stats?.tasks_by_department && stats.tasks_by_department.length > 0) {
      return stats.tasks_by_department.map((d, i) => ({
        id: d.id,
        name: d.name,
        icon: d.icon ?? '🏢',
        done: d.done_tasks,
        total: d.total_tasks,
        color: DEPT_COLORS[i % DEPT_COLORS.length],
      }));
    }
    // Build from agents + tasks when stats.departments unavailable
    const deptMap = new Map<
      string,
      { name: string; icon: string; done: number; total: number }
    >();
    for (const agent of agents) {
      if (!agent.department_id) continue;
      if (!deptMap.has(agent.department_id)) {
        deptMap.set(agent.department_id, {
          name: agent.department?.name_ko ?? agent.department?.name ?? agent.department_id,
          icon: agent.department?.icon ?? '🏢',
          done: 0,
          total: 0,
        });
      }
    }
    for (const task of tasks) {
      if (!task.department_id) continue;
      const entry = deptMap.get(task.department_id);
      if (!entry) continue;
      entry.total++;
      if (task.status === 'done') entry.done++;
    }
    return Array.from(deptMap.entries()).map(([id, v], i) => ({
      id,
      ...v,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));
  }, [stats, agents, tasks]);

  // Top agents leaderboard
  const topAgents = useMemo(() => {
    if (stats?.top_agents && stats.top_agents.length > 0) {
      return stats.top_agents.slice(0, 5).map((ta) => {
        const agent = agents.find((a) => a.id === ta.id);
        return {
          id: ta.id,
          name: agent?.name_ko ?? agent?.name ?? ta.name,
          avatar: ta.avatar_emoji ?? agent?.avatar_emoji ?? '🤖',
          department: agent?.department?.name_ko ?? agent?.department?.name ?? '',
          tasksDone: ta.stats_tasks_done,
          xp: ta.stats_xp,
        };
      });
    }
    return [...agents]
      .sort((a, b) => b.stats_xp - a.stats_xp)
      .slice(0, 5)
      .map((agent) => ({
        id: agent.id,
        name: agent.name_ko ?? agent.name,
        avatar: agent.avatar_emoji,
        department: agent.department?.name_ko ?? agent.department?.name ?? '',
        tasksDone: agent.stats_tasks_done,
        xp: agent.stats_xp,
      }));
  }, [stats, agents]);

  const maxXp = topAgents.length > 0 ? Math.max(...topAgents.map((a) => a.xp), 1) : 1;

  // Recent activity feed
  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => b.updated_at - a.updated_at)
        .slice(0, 5),
    [tasks]
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/60 via-slate-800/80 to-purple-900/60 border border-slate-700/50 backdrop-blur-sm p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              🏢 {companyName} <span className="text-indigo-400">Dashboard</span>
            </h1>
            <p className="mt-1 text-slate-400 text-sm">{date}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-800/70 border border-slate-700/50 backdrop-blur-sm text-right">
              <p className="text-2xl font-mono font-semibold text-indigo-300">{time}</p>
              <p className="text-xs text-slate-500 mt-0.5">현재 시각</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm p-5 flex flex-col gap-3 hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">총 업무</span>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-4xl font-bold text-slate-100">{totalTasks.toLocaleString()}</p>
          <p className="text-xs text-slate-500">전체 태스크 수</p>
        </div>

        {/* Completion Rate */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm p-5 flex flex-col gap-3 hover:border-violet-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">완료율</span>
            <CircularProgress value={completionRate} />
          </div>
          <p className="text-4xl font-bold text-violet-400">{completionRate}%</p>
          <p className="text-xs text-slate-500">{completedTasks} / {totalTasks} 완료</p>
        </div>

        {/* Active Agents */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm p-5 flex flex-col gap-3 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">활동 에이전트</span>
            <span className="text-2xl">🤖</span>
          </div>
          <p className="text-4xl font-bold text-emerald-400">{activeAgents}</p>
          <p className="text-xs text-slate-500">/ {totalAgents} 총 에이전트</p>
        </div>

        {/* In Progress */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm p-5 flex flex-col gap-3 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">진행 중</span>
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-4xl font-bold text-amber-400">{inProgressTasks}</p>
          <p className="text-xs text-slate-500">현재 실행 중인 태스크</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <span>🏗️</span>
            <span>부서별 성과</span>
          </h2>
          {deptData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">데이터 없음</p>
          ) : (
            <div className="space-y-4">
              {deptData.map((dept) => {
                const ratio = dept.total > 0 ? (dept.done / dept.total) * 100 : 0;
                return (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-300 font-medium">
                        <span>{dept.icon}</span>
                        <span>{dept.name}</span>
                      </span>
                      <span className="text-slate-500 text-xs">
                        {dept.done}/{dept.total} 완료
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${dept.color} rounded-full transition-all duration-700`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-slate-500">{Math.round(ratio)}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Agents Leaderboard */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <span>🏆</span>
            <span>에이전트 리더보드</span>
          </h2>
          {topAgents.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">에이전트 없음</p>
          ) : (
            <div className="space-y-3">
              {topAgents.map((agent, index) => (
                <div
                  key={agent.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    index === 0
                      ? 'bg-amber-900/20 border-amber-500/30'
                      : index === 1
                      ? 'bg-slate-700/30 border-slate-600/40'
                      : index === 2
                      ? 'bg-orange-900/10 border-orange-700/30'
                      : 'bg-slate-700/20 border-slate-700/30'
                  }`}
                >
                  <div className="w-7 text-center text-lg leading-none">
                    {RANK_ICONS[index] ?? <span className="text-slate-500 text-sm font-bold">#{index + 1}</span>}
                  </div>
                  <div className="text-2xl">{agent.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-200 truncate">{agent.name}</span>
                      <span className="text-xs text-indigo-400 font-mono whitespace-nowrap">{agent.xp.toLocaleString()} XP</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 truncate">{agent.department}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{agent.tasksDone}개 완료</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          index === 0
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                            : index === 1
                            ? 'bg-gradient-to-r from-slate-300 to-slate-200'
                            : index === 2
                            ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${(agent.xp / maxXp) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm p-6">
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
          <span>📡</span>
          <span>최근 활동</span>
        </h2>
        {recentTasks.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">최근 활동 없음</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map((task) => {
              const statusInfo = STATUS_LABELS[task.status] ?? { label: task.status, color: 'bg-slate-600' };
              const assignedAgent = task.assigned_agent ?? agents.find((a) => a.id === task.assigned_agent_id);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-slate-700/30 border border-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="text-xl">{assignedAgent?.avatar_emoji ?? '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {assignedAgent ? (assignedAgent.name_ko ?? assignedAgent.name) : '미배정'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {timeAgo(task.updated_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

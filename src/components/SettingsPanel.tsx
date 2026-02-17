import { useState, useEffect } from "react";
import type { CompanySettings, CliStatusMap, CliProvider } from "../types";

interface SettingsPanelProps {
  settings: CompanySettings;
  cliStatus: CliStatusMap | null;
  onSave: (settings: CompanySettings) => void;
  onRefreshCli: () => void;
}

const CLI_INFO: Record<string, { label: string; icon: string }> = {
  claude: { label: "Claude Code", icon: "🟣" },
  codex: { label: "Codex CLI", icon: "🟢" },
  gemini: { label: "Gemini CLI", icon: "🔵" },
  opencode: { label: "OpenCode", icon: "⚪" },
  copilot: { label: "GitHub Copilot", icon: "⚫" },
  antigravity: { label: "Antigravity", icon: "🟡" },
};

export default function SettingsPanel({
  settings,
  cliStatus,
  onSave,
  onRefreshCli,
}: SettingsPanelProps) {
  const [form, setForm] = useState<CompanySettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function handleSave() {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        ⚙️ 설정
      </h2>

      {/* Company Info */}
      <section className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          회사 정보
        </h3>

        <div>
          <label className="block text-xs text-slate-400 mb-1">회사명</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) =>
              setForm({ ...form, companyName: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">CEO 이름</label>
          <input
            type="text"
            value={form.ceoName}
            onChange={(e) =>
              setForm({ ...form, ceoName: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300">자동 배정</label>
          <button
            onClick={() =>
              setForm({ ...form, autoAssign: !form.autoAssign })
            }
            className={`w-10 h-5 rounded-full transition-colors relative ${
              form.autoAssign ? "bg-blue-500" : "bg-slate-600"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
                form.autoAssign ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            기본 CLI 프로바이더
          </label>
          <select
            value={form.defaultProvider}
            onChange={(e) =>
              setForm({
                ...form,
                defaultProvider: e.target.value as CliProvider,
              })
            }
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="claude">Claude Code</option>
            <option value="codex">Codex CLI</option>
            <option value="gemini">Gemini CLI</option>
            <option value="opencode">OpenCode</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">언어</label>
          <select
            value={form.language}
            onChange={(e) =>
              setForm({
                ...form,
                language: e.target.value as "ko" | "en",
              })
            }
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </div>
      </section>

      {/* CLI Status */}
      <section className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            CLI 도구 상태
          </h3>
          <button
            onClick={onRefreshCli}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            🔄 새로고침
          </button>
        </div>

        {cliStatus ? (
          <div className="space-y-2">
            {Object.entries(cliStatus).map(([provider, status]) => {
              const info = CLI_INFO[provider];
              return (
                <div
                  key={provider}
                  className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3"
                >
                  <span className="text-lg">{info?.icon ?? "❓"}</span>
                  <div className="flex-1">
                    <div className="text-sm text-white">
                      {info?.label ?? provider}
                    </div>
                    <div className="text-xs text-slate-500">
                      {status.version ?? "미설치"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        status.installed
                          ? "bg-green-500/20 text-green-400"
                          : "bg-slate-600/50 text-slate-400"
                      }`}
                    >
                      {status.installed ? "설치됨" : "미설치"}
                    </span>
                    {status.installed && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          status.authenticated
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {status.authenticated ? "인증됨" : "미인증"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 text-sm">
            로딩 중...
          </div>
        )}
      </section>

      {/* Save */}
      <div className="flex justify-end gap-3">
        {saved && (
          <span className="text-green-400 text-sm self-center">
            ✅ 저장 완료
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          저장
        </button>
      </div>
    </div>
  );
}

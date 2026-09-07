import { useState } from "react";
import { TraderDailySnapshotWidget } from "./components/TraderDailySnapshotWidget";

interface AgentResult {
  agent: string;
  content: string;
  meta?: Record<string, unknown>;
}
interface RunResponse {
  results: AgentResult[];
  summary: string;
}

export default function App() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"widget" | "agents">("widget");

  async function runAgents() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      {/* NAVBAR */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold font-mono text-cyan-400">ArrowFin Trading Platform</h1>
          <p className="text-xs font-mono text-slate-400">Technical Assessment: Trader Daily Snapshot & Multi-Agent Pipeline</p>
        </div>
        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab("widget")}
            className={`px-4 py-1.5 rounded transition ${activeTab === "widget" ? "bg-cyan-900 text-cyan-200 font-bold" : "text-slate-400 hover:text-slate-200"}`}
          >
            Trader Snapshot Widget
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`px-4 py-1.5 rounded transition ${activeTab === "agents" ? "bg-cyan-900 text-cyan-200 font-bold" : "text-slate-400 hover:text-slate-200"}`}
          >
            LangChain Multi-Agent Pipeline
          </button>
        </div>
      </header>

      {/* TAB CONTENT */}
      <main className="max-w-6xl mx-auto">
        {activeTab === "widget" ? (
          <TraderDailySnapshotWidget />
        ) : (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
            <h2 className="text-xl font-bold font-mono text-slate-100">LangChain Parallel Execution Pipeline</h2>
            <p className="text-xs font-mono text-slate-400">
              Dispatches prompt across 3 parallel agents: Backend Architect, Frontend Engineer, Security Specialist.
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the parallel agents something (e.g. audit tenant boundary enforcement in snapshot controller...)"
              rows={4}
              className="w-full bg-slate-950 text-slate-200 font-mono text-sm border border-slate-700 rounded-lg p-3 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={runAgents}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold rounded transition disabled:opacity-50"
            >
              {loading ? "Executing Parallel Agents..." : "Run Multi-Agent Pipeline"}
            </button>
            {error && <p className="text-rose-400 font-mono text-xs">{error}</p>}
            {data && (
              <div className="space-y-6 mt-6 pt-6 border-t border-slate-800">
                <div>
                  <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Aggregated System Summary
                  </h3>
                  <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-xs rounded-lg border border-slate-800 whitespace-pre-wrap">
                    {data.summary}
                  </pre>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Isolated Agent Output PRs
                  </h3>
                  {data.results.map((r) => (
                    <div key={r.agent} className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <h4 className="font-mono text-cyan-400 font-bold text-sm uppercase">{r.agent} AGENT DELIVERABLE</h4>
                      <pre className="mt-2 font-mono text-xs text-slate-300 whitespace-pre-wrap">{r.content}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

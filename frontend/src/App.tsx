import { useState } from "react";

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

  async function run() {
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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>AI Boilerplate</h1>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask the parallel agents something (e.g. review this code...)"
        rows={5}
        style={{ width: "100%", fontFamily: "monospace" }}
      />
      <button onClick={run} disabled={loading || !input.trim()}>
        {loading ? "Running..." : "Run agents"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {data && (
        <div>
          <h2>Summary</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{data.summary}</pre>
          <h2>Per-agent results</h2>
          {data.results.map((r) => (
            <section key={r.agent} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
              <h3>{r.agent}</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{r.content}</pre>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

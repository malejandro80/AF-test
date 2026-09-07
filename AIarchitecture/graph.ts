import { StateGraph, END, Annotation } from "@langchain/langgraph";
import {
  frontAgent,
  backAgent,
  securityAgent,
  AgentResult,
} from "agents";

const GraphState = Annotation.Root({
  input: Annotation<string>({
    reducer: (_, b) => b,
  }),
  results: Annotation<AgentResult[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
});

function orchestrator(state: typeof GraphState.State) {
  return { input: state.input.trim() };
}

async function runFront(state: typeof GraphState.State) {
  const r = await frontAgent.invoke(state.input);
  return { results: [r] };
}

async function runBack(state: typeof GraphState.State) {
  const r = await backAgent.invoke(state.input);
  return { results: [r] };
}

async function runSecurity(state: typeof GraphState.State) {
  const r = await securityAgent.invoke(state.input);
  return { results: [r] };
}

function aggregator(state: typeof GraphState.State) {
  const parts = state.results.map(
    (r) => `## ${r.agent}\n${r.content}`
  );
  return { summary: parts.join("\n\n---\n\n") };
}

const builder = new StateGraph(GraphState)
  .addNode("orchestrator", orchestrator)
  .addNode("front", runFront)
  .addNode("back", runBack)
  .addNode("security", runSecurity)
  .addNode("aggregator", aggregator)
  .addEdge("__start__", "orchestrator")
  .addEdge("orchestrator", "front")
  .addEdge("orchestrator", "back")
  .addEdge("orchestrator", "security")
  .addEdge("front", "aggregator")
  .addEdge("back", "aggregator")
  .addEdge("security", "aggregator")
  .addEdge("aggregator", END);

export const app = builder.compile();

export async function invokeGraph(
  input: string
): Promise<{ results: AgentResult[]; summary: string }> {
  const final = await app.invoke({ input });
  return { results: final.results, summary: final.summary };
}

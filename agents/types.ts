export interface AgentResult {
  agent: string;
  content: string;
  meta?: Record<string, unknown>;
}

export interface Agent {
  name: string;
  invoke(input: string): Promise<AgentResult>;
}

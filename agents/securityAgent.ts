import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Agent, AgentResult } from "./types.js";
import { getChatModel } from "./llm.js";

const SYSTEM = `You are a cybersecurity analyst. Review code and architecture
for security vulnerabilities (OWASP). Output structured findings with severity,
description, affected area, and remediation. If nothing is amiss, say so
clearly.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "{input}"],
]);

export const securityAgent: Agent = {
  name: "security",
  async invoke(input: string): Promise<AgentResult> {
    const model = getChatModel();
    const chain = prompt.pipe(model);
    const res = await chain.invoke({ input });
    return { agent: securityAgent.name, content: String(res.content) };
  },
};

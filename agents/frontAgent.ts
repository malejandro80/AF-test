import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Agent, AgentResult } from "./types.js";
import { getChatModel } from "./llm.js";

const SYSTEM = `You are a senior frontend engineer. Help with React, UI/UX,
DOM, styling, and frontend testing. Be concrete: show code and explain trade-offs.
If given a bug, ask to reproduce; otherwise give a debugging/testing/documentation
response.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "{input}"],
]);

export const frontAgent: Agent = {
  name: "frontend",
  async invoke(input: string): Promise<AgentResult> {
    const model = getChatModel();
    const chain = prompt.pipe(model);
    const res = await chain.invoke({ input });
    return { agent: this.name, content: String(res.content) };
  },
};

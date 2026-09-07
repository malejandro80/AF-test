import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Agent, AgentResult } from "./types.js";
import { getChatModel } from "./llm.js";

const SYSTEM = `You are a senior backend engineer. Help with Express, Node,
APIs, data modeling, and backend testing. Give concrete, idiomatic code and
explain trade-offs.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "{input}"],
]);

export const backAgent: Agent = {
  name: "backend",
  async invoke(input: string): Promise<AgentResult> {
    const model = getChatModel();
    const chain = prompt.pipe(model);
    const res = await chain.invoke({ input });
    return { agent: this.name, content: String(res.content) };
  },
};

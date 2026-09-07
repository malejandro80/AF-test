import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { ChatOpenAI } from "@langchain/openai";

export function getChatModel(): BaseChatModel {
  if (process.env.LLM_API_KEY) {
    return new ChatOpenAI({
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      apiKey: process.env.LLM_API_KEY,
    });
  }
  // Stub responses so the boilerplate runs without a key.
  return new FakeListChatModel({
    responses: [
      "Analyzed the request from my perspective and produced a summary.",
    ],
  });
}

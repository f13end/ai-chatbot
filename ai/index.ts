import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { customMiddleware } from "./custom-middleware";

export const customModel = wrapLanguageModel({
  model: openai("gpt-4o-gpt-4o-mini-2024-07-18"),
  middleware: customMiddleware,
});

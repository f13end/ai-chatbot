import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { customMiddleware } from "./custom-middleware";

export const customModel = wrapLanguageModel({
  model: openai("llama-3.1-sonar-small-128k-online"),
  middleware: customMiddleware,
});

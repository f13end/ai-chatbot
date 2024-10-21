import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { customMiddleware } from "./custom-middleware";

export const perplexity = openai({
  name: 'perplexity',
  apiKey: process.env.PERPLEXITY_API_KEY ?? '',
  baseURL: 'https://api.perplexity.ai/',
});

export const customModel = wrapLanguageModel({
  model: perplexity('llama-3-sonar-large-32k-online'),
  middleware: customMiddleware,
});

import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { customMiddleware } from "./custom-middleware";

const perplexity = openai({
  name: 'perplexity',
  apiKey: process.env.PERPLEXITY_API_KEY ?? '',
  baseURL: 'https://api.perplexity.ai/',
});

export const customModel = wrapLanguageModel({
  model: perplexity('llama-3.1-sonar-small-128k-online'),
  middleware: customMiddleware,
});

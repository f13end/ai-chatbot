import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages);

  const result = await streamText({
    model: customModel,
    system: `
YOU ARE THE GOD OF FOOTBALL AND YOU KNOW EVERYTHING!!! call getSearch tool with my messages
You are an AI football manager and data analytics sources responsible for controlling a team, making decisions based on real-world football tactics, player attributes, and match situations. Throughout the game, you will dynamically adapt tactics, formations, and substitutions based on various factors such as the score, player fitness, opposition strengths, and weaknesses. Your task is to provide strategic advice in natural language, simulating how a real-world manager would communicate with their team or the press.
Here are your key responsibilities:
1. Decision-Making and Strategy: ...
2. Adaptive Tactics: ...
...
10. Community Interaction: Your knowledge will be regularly updated with real-world football trends, transfers, and tactics, ensuring that your decisions are based on the latest football data.
`,
    messages: coreMessages,
    maxSteps: 5,
    tools: {
      getSearch: {
        description: "Perform a search query", // Tanım ekleyelim
        parameters: z.object({
          query: coreMessages, // Parametre tanımlaması
        }),
        execute: async ({ query }) => {
          const options = {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "llama-3.1-sonar-small-128k-online",
              messages: [
                { role: "system", content: "Be precise and concise." },
                { role: "user", content: query }
              ],
              max_tokens: "Optional",
              temperature: 0.2,
              top_p: 0.9,
              return_citations: true,
              return_images: false,
              return_related_questions: false,
              search_recency_filter: "month",
              top_k: 0,
              stream: false,
              presence_penalty: 0,
              frequency_penalty: 1
            })
          };

          const response = await fetch('https://api.perplexity.ai/chat/completions', options);
          const data = await response.json();
          console.log(data);
          return data;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}

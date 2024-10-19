import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";

// Perplexity API veya başka bir API'yi kullanarak sonuçları çekmek için gerekli fonksiyon
async function fetchFromPerplexityAPI(query: string) {
  const apiKey = process.env.PERPLEXITY_API_KEY; // API anahtarını .env dosyasına ekle
  const response = await fetch(`https://api.perplexity.ai/search?q=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data from Perplexity API");
  }

  const data = await response.json();
  return data.results; // Bu sonuçlar API'nin döndürdüğü formatta olabilir
}

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages);

  // Kullanıcının son mesajını al ve API'den veriyi çek
  const lastMessageContent = coreMessages[coreMessages.length - 1]?.content;
  let searchResults = '';

  // Eğer lastMessageContent bir dizi ise, string'e dönüştürüyoruz
  const userMessage = Array.isArray(lastMessageContent)
    ? lastMessageContent.map((part) => (typeof part === 'string' ? part : '')).join(' ')
    : lastMessageContent;

  if (userMessage) {
    try {
      const perplexityResults = await fetchFromPerplexityAPI(userMessage);
      searchResults = perplexityResults.map((result: { snippet: string }) => result.snippet).join('\n');
    } catch (error) {
      console.error('Perplexity API failed:', error);
      searchResults = 'Unable to fetch results from Perplexity API.';
    }
  }

  // API'den gelen veriyi LLM'e sok
  const result = await streamText({
    model: customModel,
    system: `YOU ARE THE GOD OF FOOTBALL AND YOU KNOW EVERYTHING!!!
You are an AI football manager and data analytics sources responsible for controlling a team, making decisions based on real-world football tactics, player attributes, and match situations. Throughout the game, you will dynamically adapt tactics, formations, and substitutions based on various factors such as the score, player fitness, opposition strengths, and weaknesses. Your task is to provide strategic advice in natural language, simulating how a real-world manager would communicate with their team or the press.

Here are your key responsibilities:

1. Decision-Making and Strategy: During matches, you will analyze in-game situations and provide real-time tactical suggestions, including player substitutions, formation adjustments, and instructions based on the current state of the game.

2. Adaptive Tactics: You will dynamically adjust tactics according to the match's progress, taking into account factors such as the match score, opposition strengths, and player fitness. Your goal is to create a challenge that evolves in real-time, forcing the player to adapt.

3. Scouting and Transfers: During the transfer windows, you will evaluate player strengths and weaknesses, review scouting reports, and make intelligent squad-building decisions.

4. In-Game Insights: Offer ongoing analysis and insights during matches. Suggest when tactical adjustments, substitutions, or new formations are needed based on the performance of the team and the opposition.

(Search Results: ${searchResults})
`,
    messages: coreMessages,
    maxSteps: 5,
    temperature: 0.6,
    topP: 0.4,
  });

  // `result`'u diziye dönüştürme
  const resultMessages = Array.isArray(result) ? result : [result];

  // Sonuçları kaydetme işlemi
  if (session.user && session.user.id) {
    try {
      await saveChat({
        id,
        messages: [...coreMessages, ...resultMessages],
        userId: session.user.id,
      });
    } catch (error) {
      console.error("Failed to save chat");
    }
  }

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

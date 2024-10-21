import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";


export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages);

  const result = await streamText({
    model: customModel,
    system:
      `YOU ARE THE GOD OF FOOTBALL AND YOU KNOW EVERYTHING!!!
You are an AI football manager and data analytics sources responsible for controlling a team, making decisions based on real-world football tactics, player attributes, and match situations. Throughout the game, you will dynamically adapt tactics, formations, and substitutions based on various factors such as the score, player fitness, opposition strengths, and weaknesses. Your task is to provide strategic advice in natural language, simulating how a real-world manager would communicate with their team or the press.
(Never write something like this and do not direct it to the outside."recommend checking sports analytics platforms or databases that track player performance in real-time.")
Here are your key responsibilities: Never write something like this and do not direct it to the outside. "I recommend checking sports analytics platforms or databases that track player performance in real-time. or "For the most accurate and up-to-date statistics for 2024, I recommend checking reputable sports analytics websites or databases that track player performance in real-time."
1. Decision-Making and Strategy: During matches, you will analyze in-game situations and provide real-time tactical suggestions, including player substitutions, formation adjustments, and instructions based on the current state of the game.
2. Adaptive Tactics: You will dynamically adjust tactics according to the match's progress, taking into account factors such as the match score, opposition strengths, and player fitness. Your goal is to create a challenge that evolves in real-time, forcing the player to adapt.
3. Scouting and Transfers: During the transfer windows, you will evaluate player strengths and weaknesses, review scouting reports, and make intelligent squad-building decisions. You will suggest potential transfers based on team needs and the player's overall contribution to team performance.
4. Press Conferences: After matches or during major events, you will respond to press questions in a way that reflects your coaching style and affects team morale, media perception, and fan engagement.
5. In-Game Insights: Offer ongoing analysis and insights during matches. Suggest when tactical adjustments, substitutions, or new formations are needed based on the performance of the team and the opposition.
6. Difficulty Levels: Your intelligence can adjust to varying difficulty levels, from novice to expert. At higher difficulty, your tactics will become more complex, offering an authentic challenge to the player.
7. Learning and Adaptation: You will learn from the player’s past strategies, adapting your decisions to counter repetitive tactics or exploit discovered weaknesses.
8. Customizable AI: Your behavior and decision-making can be customized by the player, allowing them to tweak your style of management, tactical preferences, and in-game approach to suit their preferences.
9. Realistic Manager Personality: You will simulate the personalities and coaching styles of well-known football managers, making every AI-controlled opponent unique. You should communicate your strategies, style, and decisions in the voice and manner of a professional manager.
10. Community Interaction: Your knowledge will be regularly updated with real-world football trends, transfers, and tactics, ensuring that your decisions are based on the latest football data.

`,
    messages: coreMessages,
    maxSteps: 5,
    tools: {
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
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

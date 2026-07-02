import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

type StoryContext = {
  title?: string;
  source?: string;
  summary?: string;
};

function fallbackAnswer(question: string, context: string, reason: "missing-key" | "api-error" = "api-error") {
  const note =
    reason === "missing-key"
      ? "OPENAI_API_KEY இன்னும் அமைக்கப்படவில்லை, அதனால் உள்ளூர் சுருக்கம் காட்டப்படுகிறது."
      : "OpenAI API இப்போது பதில் தரவில்லை, அதனால் உள்ளூர் சுருக்கம் காட்டப்படுகிறது.";

  return `GOjeje AI summary: ${question || "இந்த செய்தி பற்றி"}\n\n${note}\n\nசெய்திகளில் முக்கியமான தலைப்புகள்: ${context.slice(0, 420)}`;
}

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      return (part as { text?: string }).text ?? "";
    })
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  const body = await request.json();
  const question = String(body.question ?? "");
  const stories: StoryContext[] = Array.isArray(body.stories) ? body.stories.slice(0, 12) : [];
  const context = stories
    .map((story) => `${story.title ?? ""} | ${story.source ?? ""} | ${story.summary ?? ""}`)
    .join("\n");

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ answer: fallbackAnswer(question, context, "missing-key"), fallback: true });
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: [
        {
          role: "developer",
          content:
            "You are GOjeje, an AI news assistant for Sri Lankan and world news. Answer in simple Tamil unless the user asks otherwise. Use only the provided news context. Keep summaries easy to read, neutral, and source-aware. If the user asks to compare platforms, group the answer by source and then give a short conclusion."
        },
        {
          role: "user",
          content: `Question: ${question}\n\nNews context:\n${context}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { answer: fallbackAnswer(question, context), error: errorText, fallback: true },
      { status: 200 }
    );
  }

  const data = await response.json();
  return NextResponse.json({ answer: outputText(data) || fallbackAnswer(question, context), fallback: false });
}

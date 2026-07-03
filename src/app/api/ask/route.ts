import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

type StoryContext = {
  title?: string;
  source?: string;
  summary?: string;
  category?: string;
  language?: string;
  publishedAt?: string;
  url?: string;
};

function fallbackAnswer(question: string, context: string, reason: "missing-key" | "api-error" = "api-error") {
  const note =
    reason === "missing-key"
      ? "OPENAI_API_KEY இன்னும் அமைக்கப்படவில்லை, அதனால் உள்ளூர் சுருக்கம் காட்டப்படுகிறது."
      : "OpenAI API இப்போது பதில் தரவில்லை, அதனால் உள்ளூர் சுருக்கம் காட்டப்படுகிறது.";

  const readableContext = context
    .replace(/Published UTC:[^|]+ \| /g, "")
    .replace(/Published Sri Lanka time:/g, "இலங்கை நேரம்:");

  return cleanAnswer(`GOjeje AI summary: ${question || "இந்த செய்தி பற்றி"}\n\n${note}\n\n${readableContext.slice(0, 360)}`);
}

function cleanAnswer(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^[-•]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function sriLankaTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ta-LK", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function textFromHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOriginalArticleText(url?: string) {
  if (!url || url === "#") return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "GOjejeBot/1.0 (+https://gojeje.news)",
        accept: "text/html"
      }
    });
    if (!response.ok) return "";
    return textFromHtml(await response.text()).slice(0, 2400);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const question = String(body.question ?? "");
  const stories: StoryContext[] = Array.isArray(body.stories) ? body.stories.slice(0, 24) : [];
  const originalArticle = stories[0]?.url ? await fetchOriginalArticleText(stories[0].url) : "";
  const context = stories
    .map((story) => {
      const time = story.publishedAt ? new Date(story.publishedAt).toISOString() : "";
      const slTime = sriLankaTime(story.publishedAt);
      return [
        `Title: ${story.title ?? ""}`,
        `Source: ${story.source ?? ""}`,
        `Category: ${story.category ?? ""}`,
        `Language: ${story.language ?? ""}`,
        `Published UTC: ${time}`,
        `Published Sri Lanka time: ${slTime}`,
        `Link: ${story.url ?? ""}`,
        `Summary: ${story.summary ?? ""}`
      ].join(" | ");
    })
    .join("\n");
  const fullContext = originalArticle ? `Original article text:\n${originalArticle}\n\nLive news context:\n${context}` : context;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ answer: fallbackAnswer(question, fullContext, "missing-key"), fallback: true });
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
            "You are GOjeje, an AI news assistant for Sri Lankan and world news. Answer in simple Tamil unless the user asks otherwise. For a single news summary, write only 2-3 short clean sentences. Do not use markdown, asterisks, headings, or bullet symbols. Use original article text when available, otherwise use the provided live news context with source, category, published time, and links. Always treat and describe published times as Sri Lanka time using the 'Published Sri Lanka time' field; do not mention raw UTC, UK time, GMT, or foreign source time. If the user asks to compare platforms, compare by source and end with one short conclusion. Do not invent facts outside the provided context."
        },
        {
          role: "user",
          content: `Question: ${question}\n\nNews context:\n${fullContext}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { answer: fallbackAnswer(question, fullContext), error: errorText, fallback: true },
      { status: 200 }
    );
  }

  const data = await response.json();
  return NextResponse.json({ answer: cleanAnswer(outputText(data) || fallbackAnswer(question, fullContext)), fallback: false });
}

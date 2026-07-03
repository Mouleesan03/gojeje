import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CachedAudio = {
  audio: Uint8Array;
  contentType: string;
  createdAt: number;
};

const openAiSpeechUrl = "https://api.openai.com/v1/audio/speech";
const maxTextLength = 1800;
const cacheTtlMs = 24 * 60 * 60 * 1000;
const maxCachedItems = 120;

const globalForTts = globalThis as typeof globalThis & {
  gojejeOpenAiTtsCache?: Map<string, CachedAudio>;
};

const ttsCache = globalForTts.gojejeOpenAiTtsCache ?? new Map<string, CachedAudio>();
globalForTts.gojejeOpenAiTtsCache = ttsCache;

function cleanText(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxTextLength);
}

function cacheKey(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function responseBody(audio: Uint8Array) {
  return audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
}

function evictExpiredCache() {
  const now = Date.now();
  for (const [key, item] of ttsCache) {
    if (now - item.createdAt > cacheTtlMs) ttsCache.delete(key);
  }

  while (ttsCache.size > maxCachedItems) {
    const oldestKey = ttsCache.keys().next().value;
    if (!oldestKey) break;
    ttsCache.delete(oldestKey);
  }
}

async function synthesizeWithOpenAi(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const response = await fetch(openAiSpeechUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || "marin",
      input: text,
      instructions: "Speak this Tamil news summary naturally and clearly for Tamil listeners in India and Sri Lanka.",
      response_format: "mp3"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText || "OpenAI text-to-speech failed." }, { status: 502 });
  }

  return {
    audio: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/mpeg"
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = cleanText(String(body.text ?? ""));

    if (!text) {
      return NextResponse.json({ error: "Summary text is required." }, { status: 400 });
    }

    evictExpiredCache();
    const key = cacheKey(text);
    const cached = ttsCache.get(key);
    if (cached) {
      return new NextResponse(responseBody(cached.audio), {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=86400",
          "X-GOJEJE-TTS-Cache": "hit"
        }
      });
    }

    const synthesized = await synthesizeWithOpenAi(text);
    if (synthesized instanceof NextResponse) return synthesized;

    ttsCache.set(key, { ...synthesized, createdAt: Date.now() });

    return new NextResponse(responseBody(synthesized.audio), {
      headers: {
        "Content-Type": synthesized.contentType,
        "Cache-Control": "public, max-age=86400",
        "X-GOJEJE-TTS-Cache": "miss"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tamil audio generation failed." },
      { status: 500 }
    );
  }
}

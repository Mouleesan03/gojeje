import { NextResponse } from "next/server";

type ManualStory = {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  language: "Tamil" | "English" | "Sinhala";
  publishedAt: string;
  url: string;
  image: string;
  tone: string;
  placement: "post" | "story" | "both";
  manual: boolean;
  mediaType: "news" | "image" | "video";
  videoUrl: string;
};

type SupabaseManualStory = {
  id: string;
  title: string;
  summary: string | null;
  source: string | null;
  category: string | null;
  language: "Tamil" | "English" | "Sinhala";
  published_at: string;
  url: string | null;
  image: string | null;
  tone: string | null;
  placement: "post" | "story" | "both";
  media_type: "news" | "image" | "video";
  video_url: string | null;
};

const tableName = "manual_stories";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

function toStory(row: SupabaseManualStory): ManualStory {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    source: row.source ?? "GOjeje",
    category: row.category ?? "Sri Lanka",
    language: row.language,
    publishedAt: row.published_at,
    url: row.url ?? "#",
    image: row.image ?? "",
    tone: row.tone ?? "city",
    placement: row.placement,
    manual: true,
    mediaType: row.media_type,
    videoUrl: row.video_url ?? ""
  };
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T) {
  return choices.includes(value as T) ? (value as T) : fallback;
}

function toSupabaseRow(body: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    title: cleanString(body.title),
    summary: cleanString(body.summary, "GOjeje manual update."),
    source: cleanString(body.source, "GOjeje"),
    category: cleanString(body.category, "Sri Lanka"),
    language: cleanChoice(body.language, ["Tamil", "English", "Sinhala"] as const, "Tamil"),
    published_at: new Date().toISOString(),
    url: cleanString(body.url, "#") || "#",
    image: cleanString(body.image),
    tone: cleanString(body.tone, "city") || "city",
    placement: cleanChoice(body.placement, ["post", "story", "both"] as const, "both"),
    media_type: cleanChoice(body.mediaType, ["news", "image", "video"] as const, "news"),
    video_url: cleanString(body.videoUrl)
  };
}

export async function GET() {
  const config = supabaseConfig();
  if (!config) return NextResponse.json({ stories: [], configured: false });

  const response = await fetch(`${config.url}/rest/v1/${tableName}?select=*&order=published_at.desc&limit=80`, {
    cache: "no-store",
    headers: headers(config.key)
  });

  if (!response.ok) {
    return NextResponse.json({ stories: [], configured: true, error: await response.text() }, { status: 200 });
  }

  const rows = (await response.json()) as SupabaseManualStory[];
  return NextResponse.json({ stories: rows.map(toStory), configured: true });
}

export async function POST(request: Request) {
  const config = supabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const body = (await request.json()) as Record<string, unknown>;
  const row = toSupabaseRow(body);
  if (!row.title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const response = await fetch(`${config.url}/rest/v1/${tableName}`, {
    method: "POST",
    headers: {
      ...headers(config.key),
      Prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: 500 });
  }

  const rows = (await response.json()) as SupabaseManualStory[];
  return NextResponse.json({ story: toStory(rows[0]) });
}

export async function DELETE(request: Request) {
  const config = supabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const response = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(config.key)
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

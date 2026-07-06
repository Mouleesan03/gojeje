import { NextResponse } from "next/server";

const defaultBucket = "manual-media";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_MEDIA_BUCKET || defaultBucket;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key, bucket };
}

function safeFileName(value: string) {
  const extension = value.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const base = value
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "upload";
  return `${base}.${extension}`;
}

export async function POST(request: Request) {
  const config = supabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind") === "video" ? "videos" : "images";
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });

  const maxSize = kind === "videos" ? 80 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maxSize) return NextResponse.json({ error: kind === "videos" ? "Video must be under 80MB." : "Image must be under 8MB." }, { status: 400 });

  const path = `${kind}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const uploadUrl = `${config.url}/storage/v1/object/${config.bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: file
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: 500 });
  }

  return NextResponse.json({
    url: `${config.url}/storage/v1/object/public/${config.bucket}/${path}`
  });
}

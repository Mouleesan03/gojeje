"use client";

import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";

type Story = {
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
};

const navItems = [
  { id: "Top", label: "Home", icon: "/icons/home.svg" },
  { id: "Sri Lanka", label: "Lanka", icon: "/icons/news.svg" },
  { id: "World", label: "World", icon: "/icons/world.svg" },
  { id: "Stories", label: "Stories", icon: "/icons/stories.svg" },
  { id: "AI", label: "AI", icon: "/icons/ai.svg" }
];
const quickSearches = [
  { id: "Latest", label: "Latest" },
  { id: "Must Know", label: "Must Know" },
  { id: "Sri Lanka", label: "Lanka" },
  { id: "World", label: "World" },
  { id: "BBC Tamil", label: "BBC Tamil" },
  { id: "TamilWin", label: "TamilWin" },
  { id: "Lankasri", label: "Lankasri" },
  { id: "News First", label: "News First" }
];

const toneClass: Record<string, string> = {
  fuel: "tone-fuel",
  weather: "tone-weather",
  market: "tone-market",
  alert: "tone-alert",
  city: "tone-city"
};

const importantWindow = 60 * 60 * 1000;
const oneHourWindow = 60 * 60 * 1000;
const feedWindow = 8 * oneHourWindow;
const categoryWindow = 8 * oneHourWindow;
const storyWindow = oneHourWindow;

type LanguageFilter = "All" | "Tamil" | "English" | "Sinhala";

const languageLabels: Record<LanguageFilter, string> = {
  All: "All",
  Tamil: "TA",
  Sinhala: "SI",
  English: "EN"
};

const defaultQuestions: Record<LanguageFilter, string> = {
  All: "Give me the most important news updates from the last 8 hours.",
  Tamil: "கடந்த 8 மணி நேரத்தில் முக்கியமான தமிழ் செய்திகள் என்ன?",
  English: "Give me the important English news updates from the last 8 hours.",
  Sinhala: "Give me the important Sinhala Sri Lankan news updates from the last 8 hours."
};

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function shortText(text: string, length = 150) {
  if (!text) return "GOjeje இந்த செய்தியை வாசிக்க எளிதான சுருக்கமாக காட்டுகிறது.";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function NewsImage({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="dummy-thumb" aria-label="No thumbnail">
        <img src="/icons/image-square.svg" alt="" aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setFailed(true)} />;
}

function isWithinWindow(story: Story, windowMs: number) {
  const time = new Date(story.publishedAt).getTime();
  if (Number.isNaN(time)) return false;
  const age = Date.now() - time;
  return age >= 0 && age <= windowMs;
}

function isRecentStory(story: Story) {
  return isWithinWindow(story, feedWindow);
}

function isTopWindowStory(story: Story) {
  return isWithinWindow(story, importantWindow);
}

function isCategoryWindowStory(story: Story) {
  return isWithinWindow(story, categoryWindow);
}

function isStoryWindowStory(story: Story) {
  return isWithinWindow(story, storyWindow);
}

function isBreakingStory(story: Story) {
  const category = story.category.toLowerCase();
  return /\bbreaking\b|பிரேக்கிங்/.test(category);
}

function isSriLankaStory(story: Story) {
  const text = `${story.category} ${story.source} ${story.title} ${story.summary}`.toLowerCase();
  const sriLankaTerms =
    /sri lanka|srilanka|colombo|jaffna|kandy|galle|matara|batticaloa|trincomalee|vavuniya|mannar|kilinochchi|mullaitivu|ampara|kurunegala|anuradhapura|polonnaruwa|badulla|hambantota|ratnapura|gampaha|kalutara|puttalam|matale|monaragala|kegalle|negombo|nuwara eliya|இலங்கை|கொழும்பு|யாழ்|கண்டி|காலி|மாத்தறை|மட்டக்களப்பு|திருகோணமலை|வவுனியா|மன்னார்|கிளிநொச்சி|முல்லைத்தீவு|அம்பாறை|குருநாகல்|அனுராதபுரம்|பொலன்னறுவை|பதுளை|ஹம்பாந்தோட்டை|இரத்தினபுரி|கம்பஹா|களுத்துறை|புத்தளம்/.test(text);
  if (sriLankaTerms) return true;

  const trustedLocalSource = /news first|ada derana|newswire|daily mirror|economynext|tamil guardian/i.test(story.source);
  return trustedLocalSource && !/world|india|sports|entertainment/i.test(story.category);
}

function isWorldStory(story: Story) {
  return !isSriLankaStory(story) || /world|india|bbc|guardian|al jazeera|hindu|express/i.test(`${story.category} ${story.source}`);
}

function diversifyStories(items: Story[], limit: number) {
  const chosen: Story[] = [];
  const seenSources = new Set<string>();
  const seenCategories = new Set<string>();

  for (const story of items) {
    if (chosen.length >= limit) break;
    if (seenSources.has(story.source) && seenCategories.has(story.category)) continue;
    chosen.push(story);
    seenSources.add(story.source);
    seenCategories.add(story.category);
  }

  for (const story of items) {
    if (chosen.length >= limit) break;
    if (!chosen.some((item) => item.id === story.id)) chosen.push(story);
  }

  return chosen;
}

function relatedScore(base: Story, candidate: Story) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3);
  const baseWords = new Set(normalize(`${base.title} ${base.summary}`));
  const candidateWords = new Set(normalize(`${candidate.title} ${candidate.summary}`));
  const overlap = [...baseWords].filter((word) => candidateWords.has(word)).length;
  const wordScore = baseWords.size ? overlap / Math.max(1, Math.min(baseWords.size, candidateWords.size)) : 0;
  const sourceScore = base.source === candidate.source ? 0.25 : 0;
  const categoryScore = base.category === candidate.category ? 0.2 : 0;
  const languageScore = base.language === candidate.language ? 0.1 : 0;
  return Math.min(1, wordScore * 0.65 + sourceScore + categoryScore + languageScore);
}

function cleanAiLine(line: string) {
  return line
    .replace(/\*\*/g, "")
    .replace(/^\s*[-•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "gojeje-news"
  );
}

function storyFileName(story: Story) {
  const stamp = Number.isNaN(new Date(story.publishedAt).getTime())
    ? Date.now().toString()
    : new Date(story.publishedAt).toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `${safeFileName(`${story.source}-${story.language}-${story.category}`)}-${stamp}-gojeje.jpg`;
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = testLine;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => context.fillText(index === maxLines - 1 && words.join(" ").length > item.length ? `${item}...` : item, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;
  const sourceWidth = imageRatio > boxRatio ? image.height * boxRatio : image.width;
  const sourceHeight = imageRatio > boxRatio ? image.height : image.width / boxRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawDummyCardImage(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#b51616");
  gradient.addColorStop(0.48, "#641414");
  gradient.addColorStop(1, "#171719");
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(x, y, width, height, 28);
  context.fill();

  const glow = context.createRadialGradient(x + width * 0.22, y + height * 0.18, 0, x + width * 0.22, y + height * 0.18, width * 0.62);
  glow.addColorStop(0, "rgba(226, 38, 38, 0.24)");
  glow.addColorStop(1, "rgba(226, 38, 38, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.roundRect(x, y, width, height, 28);
  context.fill();

  const iconSize = Math.min(width, height) * 0.28;
  const iconX = x + width / 2 - iconSize / 2;
  const iconY = y + height / 2 - iconSize / 2;
  context.strokeStyle = "rgba(217, 208, 208, 0.78)";
  context.lineWidth = Math.max(8, iconSize * 0.06);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.roundRect(iconX, iconY, iconSize, iconSize, iconSize * 0.12);
  context.stroke();
  context.beginPath();
  context.arc(iconX + iconSize * 0.7, iconY + iconSize * 0.3, iconSize * 0.11, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(iconX + iconSize * 0.13, iconY + iconSize * 0.78);
  context.lineTo(iconX + iconSize * 0.39, iconY + iconSize * 0.55);
  context.lineTo(iconX + iconSize * 0.57, iconY + iconSize * 0.7);
  context.lineTo(iconX + iconSize * 0.72, iconY + iconSize * 0.58);
  context.lineTo(iconX + iconSize * 0.88, iconY + iconSize * 0.74);
  context.stroke();
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [popularStories, setPopularStories] = useState<Story[]>([]);
  const [activeNav, setActiveNav] = useState("Top");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [answer, setAnswer] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [latestPage, setLatestPage] = useState(0);
  const [recentTopic, setRecentTopic] = useState("Latest");
  const [selectedAiAnswer, setSelectedAiAnswer] = useState("");
  const [selectedAiLoading, setSelectedAiLoading] = useState(false);
  const [summaryListening, setSummaryListening] = useState(false);
  const [summaryAudioLoading, setSummaryAudioLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bootLoading, setBootLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [live, setLive] = useState(false);
  const summaryAudioRef = useRef<HTMLAudioElement | null>(null);
  const summaryAudioUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch(`/api/news?ts=${Date.now()}`, { cache: "no-store" });
        const data = await response.json();
        setStories(data.stories ?? []);
        setPopularStories(data.popularStories ?? []);
        setLive(Boolean(data.live));
      } finally {
        setLoading(false);
        setBootLoading(false);
      }
    }
    loadNews();
    const interval = window.setInterval(loadNews, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setQuestion("");
    setAnswer("");
  }, [languageFilter]);

  useEffect(() => {
    setLatestPage(0);
  }, [activeNav, languageFilter, query, recentTopic]);

  useEffect(() => {
    stopSummaryAudio();
    setSummaryListening(false);
    setSummaryAudioLoading(false);
  }, [selectedAiAnswer, selectedStory?.id]);

  useEffect(() => {
    return () => {
      stopSummaryAudio();
      summaryAudioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      summaryAudioUrlsRef.current.clear();
    };
  }, []);

  const languageScopedAllStories = useMemo(() => {
    return stories.filter((story) => languageFilter === "All" || story.language === languageFilter);
  }, [languageFilter, stories]);
  const recentStories = useMemo(() => {
    return languageScopedAllStories.filter(isRecentStory);
  }, [languageScopedAllStories]);
  const languageScopedStories = useMemo(() => {
    return recentStories;
  }, [recentStories]);
  const storyWindowStories = useMemo(() => languageScopedAllStories.filter(isStoryWindowStory), [languageScopedAllStories]);
  const categoryWindowStories = useMemo(() => languageScopedAllStories.filter(isCategoryWindowStory), [languageScopedAllStories]);
  const tamilStories = useMemo(() => storyWindowStories.filter((story) => story.language === "Tamil"), [storyWindowStories]);
  const webStories = useMemo(() => {
    const popularSources = ["BBC Tamil", "TamilWin", "Lankasri", "BBC News", "Al Jazeera", "News First"];
    const popular = storyWindowStories.filter((story) => popularSources.includes(story.source) || story.tone === "alert" || isTopWindowStory(story) || isSriLankaStory(story));
    return (popular.length ? popular : tamilStories.length ? tamilStories : storyWindowStories).slice(0, 100);
  }, [storyWindowStories, tamilStories]);

  const filteredStories = useMemo(() => {
    const search = query.trim().toLowerCase();
    const baseStories = activeNav === "Sri Lanka" || activeNav === "World" ? categoryWindowStories : languageScopedStories;
    return baseStories.filter((story) => {
      const navMatch =
        activeNav === "Top" ||
        activeNav === "Stories" ||
        activeNav === "AI" ||
        (activeNav === "Sri Lanka" && isSriLankaStory(story)) ||
        (activeNav === "World" && isWorldStory(story)) ||
        [story.category, story.source, story.title, story.summary].join(" ").toLowerCase().includes(activeNav.toLowerCase());
      const searchMatch = !search || [story.title, story.summary, story.source, story.category, story.language].join(" ").toLowerCase().includes(search);
      return navMatch && searchMatch;
    });
  }, [activeNav, categoryWindowStories, languageScopedStories, query]);

  const searchResults = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return [];
    return languageScopedStories
      .filter((story) => [story.title, story.summary, story.source, story.category, story.language].join(" ").toLowerCase().includes(search))
      .slice(0, 24);
  }, [languageScopedStories, query]);

  const languageScopedPopularStories = useMemo(() => {
    return popularStories.filter((story) => languageFilter === "All" || story.language === languageFilter);
  }, [languageFilter, popularStories]);
  const popularCarouselStories = useMemo(() => {
    const ranked = languageScopedPopularStories.length ? languageScopedPopularStories : languageScopedStories;
    return ranked.slice(0, 5);
  }, [languageScopedPopularStories, languageScopedStories]);
  const leadCarouselStories = useMemo(() => diversifyStories(languageScopedStories.filter(isTopWindowStory), 5), [languageScopedStories]);
  const isCategoryFeed = activeNav === "Sri Lanka" || activeNav === "World";
  const topicFilteredStories = useMemo(() => {
    if (isCategoryFeed) return filteredStories;
    if (recentTopic === "Latest") return filteredStories;
    if (recentTopic === "Must Know") return filteredStories.filter((story) => story.tone === "alert" || isTopWindowStory(story) || isSriLankaStory(story)).slice(0, 100);
    if (recentTopic === "Sri Lanka") return filteredStories.filter(isSriLankaStory);
    if (recentTopic === "World") return filteredStories.filter(isWorldStory);
    return filteredStories.filter((story) => [story.source, story.category, story.title, story.summary].join(" ").toLowerCase().includes(recentTopic.toLowerCase()));
  }, [filteredStories, isCategoryFeed, recentTopic]);
  const latestStories = topicFilteredStories.filter((story) => !leadCarouselStories.some((leadStory) => leadStory.id === story.id)).slice(0, 100);
  const feedStories = isCategoryFeed ? filteredStories.slice(0, 100) : latestStories;
  const latestPageSize = 15;
  const latestPageCount = Math.max(1, Math.ceil(feedStories.length / latestPageSize));
  const paginatedLatestStories = feedStories.slice(latestPage * latestPageSize, latestPage * latestPageSize + latestPageSize);
  const breakingStories = useMemo(() => {
    return languageScopedStories.filter(isBreakingStory).slice(0, 3);
  }, [languageScopedStories]);
  const importantStories = useMemo(() => diversifyStories(languageScopedStories.filter(isTopWindowStory), 5), [languageScopedStories]);
  const aiSuggestions = useMemo(() => {
    const topStories = importantStories;
    if (topStories.length) {
      return topStories.map((story) => ({
        label: shortText(story.title, languageFilter === "Tamil" ? 42 : 54),
        prompt:
          languageFilter === "Tamil"
            ? `இந்த செய்தியை எளிதாக சுருக்கவும்: ${story.title}`
            : `Summarize this news clearly: ${story.title}`
      }));
    }
    return [
      { label: languageFilter === "Tamil" ? "இன்றைய முக்கிய செய்திகள்" : "Top news now", prompt: defaultQuestions[languageFilter] },
      {
        label: languageFilter === "Tamil" ? "ஆதாரங்களை ஒப்பிடு" : "Compare sources",
        prompt: languageFilter === "Tamil" ? "முக்கிய செய்திகளில் ஊடகங்கள் எப்படி வேறுபடுகின்றன?" : "Compare how sources are reporting the top stories."
      }
    ];
  }, [importantStories, languageFilter]);
  const sourceCounts = useMemo(() => {
    return [...new Set(languageScopedStories.map((story) => story.source))]
      .map((source) => ({ source, count: languageScopedStories.filter((story) => story.source === source).length }))
      .sort((a, b) => b.count - a.count);
  }, [languageScopedStories]);
  const relatedStories = useMemo(() => {
    if (!selectedStory) return [];
    const best = languageScopedStories
      .filter((story) => story.id !== selectedStory.id)
      .map((story) => ({ story, score: relatedScore(selectedStory, story) }))
      .sort((a, b) => b.score - a.score)[0];
    return best && best.score >= 0.8 ? [best.story] : [];
  }, [languageScopedStories, selectedStory]);

  async function askPrompt(prompt: string, story?: Story) {
    if (!prompt.trim()) return;
    setAsking(true);
    setAnswer("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, stories: story ? [story, ...languageScopedStories] : languageScopedStories })
      });
      const data = await response.json();
      setAnswer(data.answer ?? "GOjeje AI இப்போது பதில் தர முடியவில்லை.");
    } finally {
      setAsking(false);
    }
  }

  async function askA7(event?: FormEvent<HTMLFormElement>, story?: Story) {
    event?.preventDefault();
    const prompt = story
      ? `இந்த செய்தியை எளிதாக சுருக்கவும்: ${story.title}`
        : compareMode
        ? `${question}\n\nCompare different news platforms and summarize the difference.`
        : question;
    await askPrompt(prompt, story);
  }

  async function summarizeStory(story: Story) {
    setStoryIndex(null);
    setSelectedStory(story);
    setSelectedAiAnswer("");
    setSelectedAiLoading(true);

    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: `இந்த செய்தியை 3 குறுகிய வாக்கியங்களில், நட்சத்திர குறிகள் இல்லாமல், சுத்தமாக சுருக்கவும்: ${story.title}`,
        stories: [story, ...languageScopedStories]
      })
    });
    const data = await response.json();
    setSelectedAiAnswer(data.answer ?? "GOjeje AI இப்போது இந்த செய்தியை சுருக்க முடியவில்லை.");
    setSelectedAiLoading(false);
  }

  function stopSummaryAudio() {
    const audio = summaryAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    summaryAudioRef.current = null;
  }

  function selectedSummaryAudioKey() {
    return `${selectedStory?.id ?? "summary"}:${selectedAiAnswer}`;
  }

  async function getSummaryAudioUrl() {
    const cacheKey = selectedSummaryAudioKey();
    const cachedUrl = summaryAudioUrlsRef.current.get(cacheKey);
    if (cachedUrl) return cachedUrl;

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selectedAiAnswer })
    });

    if (!response.ok) throw new Error("Tamil audio is unavailable right now.");

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    summaryAudioUrlsRef.current.set(cacheKey, audioUrl);
    return audioUrl;
  }

  async function toggleSummaryListen() {
    if (!selectedAiAnswer.trim() || summaryAudioLoading) return;

    if (summaryListening) {
      stopSummaryAudio();
      setSummaryListening(false);
      return;
    }

    setSummaryAudioLoading(true);
    try {
      const audioUrl = await getSummaryAudioUrl();
      stopSummaryAudio();
      const audio = new Audio(audioUrl);
      summaryAudioRef.current = audio;
      audio.onended = () => {
        summaryAudioRef.current = null;
        setSummaryListening(false);
      };
      audio.onerror = () => {
        summaryAudioRef.current = null;
        setSummaryListening(false);
      };
      await audio.play();
      setSummaryListening(true);
    } catch {
      setSummaryListening(false);
    } finally {
      setSummaryAudioLoading(false);
    }
  }

  function openStory(index: number) {
    setStoryIndex(index);
  }

  function moveStory(direction: "previous" | "next") {
    setStoryIndex((current) => {
      if (current === null) return current;
      return direction === "previous" ? Math.max(0, current - 1) : Math.min(webStories.length - 1, current + 1);
    });
  }

  function handleStoryViewerTap(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const direction = event.clientX < rect.left + rect.width / 2 ? "previous" : "next";
    moveStory(direction);
  }

  function chooseNav(id: string) {
    setActiveNav(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSummary(story: Story) {
    setStoryIndex(null);
    setSelectedStory(story);
    setSelectedAiAnswer("");
    setSelectedAiLoading(false);
  }

  function openStorySummary(event: MouseEvent<HTMLButtonElement>, story: Story) {
    event.stopPropagation();
    setSelectedStory(story);
    setSelectedAiAnswer("");
    setSelectedAiLoading(false);
    setStoryIndex(null);
  }

  async function createStoryCard(story: Story) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");

    context.fillStyle = "#f5f5f5";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.roundRect(70, 70, 940, 1210, 34);
    context.fill();

    context.fillStyle = "#bb1919";
    context.fillRect(70, 70, 940, 14);

    try {
      const logo = await loadImage("/gojeje.png");
      context.drawImage(logo, 92, 110, 260, 86);
    } catch {
      context.fillStyle = "#bb1919";
      context.font = "700 54px Inter, Arial, sans-serif";
      context.fillText("GOjeje", 92, 168);
    }

    context.fillStyle = "#f4f4f4";
    context.beginPath();
    context.roundRect(92, 235, 360, 54, 27);
    context.fill();
    context.fillStyle = "#555";
    context.font = "700 28px Inter, Arial, sans-serif";
    context.fillText(`${story.source} · ${relativeTime(story.publishedAt)} ago`, 118, 271);

    context.save();
    context.beginPath();
    context.roundRect(92, 318, 896, 390, 28);
    context.clip();
    if (story.image) {
      try {
        const storyImage = await loadImage(story.image);
        drawCoverImage(context, storyImage, 92, 318, 896, 390);
      } catch {
        drawDummyCardImage(context, 92, 318, 896, 390);
      }
    } else {
      drawDummyCardImage(context, 92, 318, 896, 390);
    }
    context.restore();

    context.fillStyle = "#141414";
    context.font = "700 46px Inter, Noto Sans Tamil, Noto Sans Sinhala, Arial, sans-serif";
    const nextY = wrapCanvasText(context, story.title, 92, 790, 860, 60, 4);

    context.fillStyle = "#606060";
    context.font = "400 32px Inter, Noto Sans Tamil, Noto Sans Sinhala, Arial, sans-serif";
    wrapCanvasText(context, shortText(story.summary, 170), 92, Math.min(nextY + 36, 1088), 860, 44, 3);

    context.fillStyle = "#bb1919";
    context.font = "700 28px Inter, Arial, sans-serif";
    context.fillText("NEWS. FAST. FIRST.", 92, 1190);
    context.fillStyle = "#606060";
    context.font = "500 24px Inter, Arial, sans-serif";
    context.fillText("Generated by GOjeje AI news platform", 92, 1232);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create JPG"))), "image/jpeg", 0.92);
    });
  }

  async function downloadStoryCard(story: Story) {
    const blob = await createStoryCard(story);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = storyFileName(story);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function shareStoryCard(story: Story) {
    const blob = await createStoryCard(story);
    const file = new File([blob], storyFileName(story), { type: "image/jpeg" });
    const shareData = {
      title: story.title,
      text: `${story.title}\n${story.source} · ${relativeTime(story.publishedAt)} ago · GOjeje`,
      url: story.url && story.url !== "#" ? story.url : window.location.href
    };

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ ...shareData, files: [file] });
      return;
    }

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await downloadStoryCard(story);
  }

  const activeStory = storyIndex === null ? null : webStories[storyIndex];
  const answerLeadStory = selectedStory ?? importantStories[0] ?? languageScopedStories[0] ?? null;
  const visibleAnswerLines = answer.split(/\n+/).map(cleanAiLine).filter(Boolean).slice(0, 3);

  const aiPanel = (
    <aside className="ai-panel ai-panel-main">
      <div className="panel-header">
        <span>GOjeje AI</span>
        <b><i /> {live ? "Live · 1 min" : "Connecting"}</b>
      </div>
      <h1>Ask the news</h1>
      <p className="ai-intro">Search across platforms, compare sources, and get a simple answer.</p>

      {!answer && !asking && (
        <div className="ai-suggestions ai-news-suggestions" aria-label="Important news prompts">
          {aiSuggestions.slice(0, 3).map((item) => (
            <button type="button" key={item.prompt} onClick={() => setQuestion(item.prompt)}>
              <span>Ask</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {asking ? (
        <section className="ai-answer-card ai-loading-card" aria-live="polite">
          <span>GOjeje is reading</span>
          <div className="thinking-row">
            <i />
            <i />
            <i />
          </div>
          <p>Checking recent stories from multiple platforms...</p>
        </section>
      ) : answer ? (
        <section className="ai-answer-card readable-ai-answer">
          <div className="ai-answer-head">
            <span>AI response</span>
            {answerLeadStory && (
              <div className="ai-answer-meta" aria-label="Answer context">
                <b>{answerLeadStory.source}</b>
                <em>{relativeTime(answerLeadStory.publishedAt)} ago</em>
              </div>
            )}
          </div>
          {visibleAnswerLines.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </section>
      ) : (
        <section className="ai-empty-card">
          <span>Recent intelligence</span>
          <p>{languageScopedStories.length ? `${languageScopedStories.length} updates from the last 8 hours.` : "Waiting for recent updates."}</p>
        </section>
      )}

      <div className="ai-mode-row">
        <button type="button" className={compareMode ? "active" : ""} onClick={() => setCompareMode(!compareMode)}>
          {compareMode ? "Compare sources" : "Simple answer"}
        </button>
        <span>{languageFilter === "All" ? "All languages" : languageFilter}</span>
      </div>

      <form className="ai-form" onSubmit={(event) => askA7(event)}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={defaultQuestions[languageFilter]}
          rows={2}
        />
        <button type="submit" disabled={asking} aria-label="Ask GOjeje AI">
          {asking ? <span className="send-loader" /> : "Ask"}
        </button>
      </form>
    </aside>
  );

  return (
    <main className="site-shell">
      {bootLoading && (
        <div className="site-preloader" role="status" aria-live="polite">
          <div>
            <img src="/gojeje.png" alt="GOjeje" />
            <span>
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}
      <header className="site-header">
        <a className="brand logo-brand" href="#top" aria-label="GOjeje home">
          <img src="/gojeje.png" alt="GOjeje" />
        </a>
        <form
          className="header-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) setQuestion(query.trim());
            setSearchOpen(Boolean(query.trim()));
          }}
        >
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(Boolean(event.target.value.trim()));
            }}
            onFocus={() => setSearchOpen(Boolean(query.trim()))}
            placeholder="Search news"
          />
        </form>
        <label className="language-dropdown" data-language={languageFilter} title={`Language: ${languageFilter}`}>
          <span className="language-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M3.5 12h17" />
              <path d="M12 3a13.6 13.6 0 0 1 0 18" />
              <path d="M12 3a13.6 13.6 0 0 0 0 18" />
            </svg>
          </span>
          <span className="language-code">{languageLabels[languageFilter]}</span>
          <select
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value as LanguageFilter)}
            aria-label="Language filter"
          >
            <option value="All">All languages</option>
            <option value="Tamil">Tamil only</option>
            <option value="Sinhala">Sinhala only</option>
            <option value="English">English only</option>
          </select>
        </label>
      </header>

      {breakingStories.length > 0 && (
        <section className="breaking-strip" aria-label="Breaking news">
          <strong>Breaking</strong>
          <div>
            {breakingStories.map((story) => (
            <button type="button" key={story.id} onClick={() => openSummary(story)}>
                <span>{story.source}</span>
                {story.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {searchOpen && query.trim() && (
        <section className="search-overlay" aria-label="Search results">
          <div className="search-panel">
            <button className="search-close" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">×</button>
            <div className="section-heading">
              <div>
                <p className="eyebrow">AI search</p>
                <h2>{searchResults.length} results</h2>
              </div>
            </div>
            <form
              className="search-panel-search"
              onSubmit={async (event) => {
                event.preventDefault();
                const prompt = query.trim();
                if (!prompt) return;
                setQuestion(prompt);
                setSearchOpen(false);
                setActiveNav("AI");
                await askPrompt(prompt);
              }}
            >
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all news platforms" />
              <button type="submit">Ask AI</button>
            </form>
            <div className="search-result-list">
              {searchResults.length ? searchResults.map((story) => (
                <button type="button" key={story.id} onClick={() => {
                  setSearchOpen(false);
                  openSummary(story);
                }}>
                  <span>{story.source} · {story.category} · {relativeTime(story.publishedAt)} ago</span>
                  {story.title}
                </button>
              )) : <p>No recent results. Try another keyword or source name.</p>}
            </div>
          </div>
        </section>
      )}

      {activeNav === "AI" ? (
        <section className="ai-page">
          {aiPanel}
          <aside className="important-board">
            <p className="eyebrow">Important</p>
            <h2>Ask about these updates</h2>
            {importantStories.map((story) => (
              <button type="button" key={story.id} onClick={() => setQuestion(`Explain this news clearly: ${story.title}`)}>
                <span>{story.source} · {relativeTime(story.publishedAt)} ago</span>
                {story.title}
              </button>
            ))}
          </aside>
        </section>
      ) : activeNav === "Stories" ? (
        <section className="stories-page" id="stories">
                <div className="story-rail story-rail-large">
            {webStories.length ? webStories.map((story, index) => (
              <button className="web-story-card" type="button" key={story.id} onClick={() => openStory(index)}>
                <div className={`story-media ${toneClass[story.tone] ?? "tone-city"}`}>
                  <NewsImage src={story.image} />
                  <span>{story.source}</span>
                </div>
                <h3>{story.title}</h3>
                <small>{relativeTime(story.publishedAt)} ago</small>
              </button>
            )) : <div className="lead-empty">{loading ? "Loading stories..." : "No recent stories."}</div>}
          </div>
        </section>
      ) : (
        <>
          {!isCategoryFeed && (
            <>
              <section className="news-layout go-news-layout" id="top">
                {leadCarouselStories.length ? (
                  <div className="popular-carousel">
                    {leadCarouselStories.map((story) => (
                      <article className="lead-card popular-lead-card" key={story.id} onClick={() => openSummary(story)}>
                        <div className={`lead-image ${toneClass[story.tone] ?? "tone-city"}`}>
                          <NewsImage src={story.image} />
                        </div>
                        <div className="lead-body">
                          <div className="meta-row">
                            <span className="source-chip">{story.source}</span>
                            <span className="badge">{story.category}</span>
                            <span className="language-chip">{story.language}</span>
                            <span className="time-chip">{relativeTime(story.publishedAt)} ago</span>
                          </div>
                          <h2>{story.title}</h2>
                          <div className="card-actions">
                            <button type="button" onClick={(event) => {
                              event.stopPropagation();
                              openSummary(story);
                            }}>Read</button>
                            <button type="button" className="summary-action" onClick={(event) => {
                              event.stopPropagation();
                              summarizeStory(story);
                            }}>
                              <img src="/icons/summary.svg" alt="" aria-hidden="true" />
                              Summary
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <article className="lead-card popular-lead-card">
                    <div className="lead-empty">{loading ? "Loading live news..." : "No stories found."}</div>
                  </article>
                )}
              </section>
            </>
          )}

          <section className="content-section">
            <div className="section-heading feed-heading">
              <h2>{isCategoryFeed ? `${activeNav} News` : "Recent Feed"}</h2>
              {!isCategoryFeed && (
                <div className="quick-chips">
                  {quickSearches.map((chip) => (
                    <button type="button" key={chip.id} className={recentTopic === chip.id ? "active" : ""} onClick={() => setRecentTopic(chip.id)}>{chip.label}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="article-grid">
              {paginatedLatestStories.length ? paginatedLatestStories.map((story) => (
                <article className="article-card" key={story.id} onClick={() => openSummary(story)}>
                  <div className={`article-thumb ${toneClass[story.tone] ?? "tone-city"}`}>
                    <NewsImage src={story.image} />
                  </div>
                  <div>
                    <h3>{story.title}</h3>
                    <div className="meta-row">
                      <span className="source-chip">{story.source}</span>
                      <span className="badge">{story.category}</span>
                      <span className="time-chip">{relativeTime(story.publishedAt)} ago</span>
                    </div>
                  </div>
                </article>
              )) : <div className="feed-empty">{loading ? "Loading recent news..." : "No matching recent news right now."}</div>}
            </div>
            {feedStories.length > latestPageSize && (
              <div className="pagination-row">
                <button type="button" onClick={() => setLatestPage((page) => Math.max(0, page - 1))} disabled={latestPage === 0}>
                  Previous
                </button>
                <span>Page {latestPage + 1} of {latestPageCount}</span>
                <button type="button" onClick={() => setLatestPage((page) => Math.min(latestPageCount - 1, page + 1))} disabled={latestPage >= latestPageCount - 1}>
                  Next
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <nav className="mobile-glass-nav" aria-label="Mobile sections">
        {navItems.map((item) => (
          <button key={item.id} type="button" className={activeNav === item.id ? "active" : ""} onClick={() => chooseNav(item.id)}>
            <img src={item.icon} alt="" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>

      {selectedStory && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <article className="read-modal">
            <button className="close-button" type="button" onClick={() => setSelectedStory(null)} aria-label="Close">×</button>
            <div className={`modal-image ${toneClass[selectedStory.tone] ?? "tone-city"}`}>
              <NewsImage src={selectedStory.image} />
            </div>
            <h2>{selectedStory.title}</h2>
            <p>{shortText(selectedStory.summary, 420)}</p>
            <div className="meta-row">
              <span className="badge">{selectedStory.category}</span>
              <span className="source-chip">{selectedStory.source}</span>
              <span className="language-chip">{selectedStory.language}</span>
              <span className="time-chip">{relativeTime(selectedStory.publishedAt)} ago</span>
            </div>
            <div className="card-actions">
              <button type="button" className="summary-action" onClick={() => summarizeStory(selectedStory)} disabled={selectedAiLoading}>
                <img src="/icons/summary.svg" alt="" aria-hidden="true" />
                {selectedAiLoading ? "Summarising..." : "Summary"}
              </button>
              <button className="icon-action" type="button" onClick={() => shareStoryCard(selectedStory)} aria-label="Share news card" title="Share">
                <img src="/icons/share.svg" alt="" aria-hidden="true" />
              </button>
              <button className="icon-action" type="button" onClick={() => downloadStoryCard(selectedStory)} aria-label="Download news card as JPG" title="Download">
                <img src="/icons/download.svg" alt="" aria-hidden="true" />
              </button>
              {selectedStory.url && selectedStory.url !== "#" ? (
                <a className="source-action" href={selectedStory.url} target="_blank" rel="noreferrer" aria-label="Source" title="Source" data-label="Source">
                  <img src="/icons/source.svg" alt="" aria-hidden="true" />
                </a>
              ) : null}
            </div>
            {(selectedAiLoading || selectedAiAnswer) && (
              <section className={`inline-ai-summary ${selectedAiLoading ? "summary-loading" : ""}`}>
                <div className="inline-ai-summary-head">
                  <span>GOjeje AI summary</span>
                  {!selectedAiLoading && selectedAiAnswer ? (
                    <button type="button" className="listen-summary" onClick={toggleSummaryListen} aria-pressed={summaryListening} disabled={summaryAudioLoading}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
                        <path d="M16 8.5a5 5 0 0 1 0 7" />
                        <path d="M18.5 6a8 8 0 0 1 0 12" />
                      </svg>
                      {summaryListening ? "Stop" : summaryAudioLoading ? "Loading..." : "Listen"}
                    </button>
                  ) : null}
                </div>
                {selectedAiLoading ? (
                  <div className="summary-loader">
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  <p>{selectedAiAnswer}</p>
                )}
              </section>
            )}
            {relatedStories.length > 0 && (
              <section className="related-summaries">
                <h3>More summary news</h3>
                {relatedStories.map((story) => (
                  <button type="button" key={story.id} onClick={() => openSummary(story)}>
                    <span>{story.source} · {relativeTime(story.publishedAt)} ago</span>
                    {story.title}
                  </button>
                ))}
              </section>
            )}
          </article>
        </div>
      )}

      {activeStory && (
        <div className="story-viewer" role="dialog" aria-modal="true">
          <button className="viewer-close" type="button" onClick={() => setStoryIndex(null)} aria-label="Close">×</button>
          <div className="progress-strip">
            {webStories.map((story, index) => (
              <span key={story.id} className={index <= (storyIndex ?? 0) ? "filled" : ""} />
            ))}
          </div>
          <button className="viewer-hit left" type="button" aria-label="Previous story" onClick={() => moveStory("previous")} />
          <article className={`viewer-card ${activeStory.title.length + activeStory.summary.length > 210 ? "viewer-card-long" : ""}`} onClick={handleStoryViewerTap}>
            <div className={`viewer-image ${toneClass[activeStory.tone] ?? "tone-city"}`}>
              <NewsImage src={activeStory.image} />
            </div>
            <div className="viewer-copy">
              <span>{activeStory.source}</span>
              <h2>{activeStory.title}</h2>
              <p>{shortText(activeStory.summary, 230)}</p>
              <div className="viewer-actions">
                <button type="button" onClick={(event) => openStorySummary(event, activeStory)}>Read</button>
                <button type="button" className="summary-action" onClick={(event) => {
                  event.stopPropagation();
                  summarizeStory(activeStory);
                }}>
                  <img src="/icons/summary.svg" alt="" aria-hidden="true" />
                  Summary
                </button>
                <button className="icon-action" type="button" onClick={(event) => {
                  event.stopPropagation();
                  shareStoryCard(activeStory);
                }} aria-label="Share story card" title="Share">
                  <img src="/icons/share.svg" alt="" aria-hidden="true" />
                </button>
                <button className="icon-action" type="button" onClick={(event) => {
                  event.stopPropagation();
                  downloadStoryCard(activeStory);
                }} aria-label="Download story card as JPG" title="Download">
                  <img src="/icons/download.svg" alt="" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
          <button className="viewer-hit right" type="button" aria-label="Next story" onClick={() => moveStory("next")} />
        </div>
      )}
    </main>
  );
}

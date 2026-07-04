import { NextResponse } from "next/server";

type EspnCompetitor = {
  homeAway?: string;
  score?: string;
  team?: {
    abbreviation?: string;
    displayName?: string;
    shortDisplayName?: string;
    logo?: string;
  };
};

type EspnEvent = {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: {
      type?: {
        state?: string;
        shortDetail?: string;
        detail?: string;
        description?: string;
      };
    };
  }>;
};

function teamName(team?: EspnCompetitor["team"]) {
  return team?.shortDisplayName || team?.abbreviation || team?.displayName || "TBD";
}

export async function GET() {
  try {
    const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard", {
      cache: "no-store",
      headers: {
        "user-agent": "GOjejeScores/1.0"
      }
    });

    if (!response.ok) throw new Error(`Scores failed with ${response.status}`);
    const data = await response.json();
    const events = (Array.isArray(data.events) ? data.events : []) as EspnEvent[];

    const matches = events.slice(0, 10).map((event) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      const home = competitors.find((item) => item.homeAway === "home") ?? competitors[0];
      const away = competitors.find((item) => item.homeAway === "away") ?? competitors[1];
      const status = competition?.status?.type;

      return {
        id: event.id ?? `${event.shortName}-${event.date}`,
        title: event.shortName || event.name || "World Cup match",
        date: event.date ?? "",
        state: status?.state ?? "pre",
        status: status?.shortDetail || status?.detail || status?.description || "Fixture",
        home: {
          name: teamName(home?.team),
          score: home?.score ?? ""
        },
        away: {
          name: teamName(away?.team),
          score: away?.score ?? ""
        }
      };
    });

    return NextResponse.json({
      live: matches.some((match) => match.state === "in"),
      updatedAt: new Date().toISOString(),
      matches
    });
  } catch (error) {
    return NextResponse.json({
      live: false,
      updatedAt: new Date().toISOString(),
      matches: [],
      error: error instanceof Error ? error.message : "Scores unavailable"
    });
  }
}

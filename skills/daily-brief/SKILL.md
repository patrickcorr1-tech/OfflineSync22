---
name: daily-brief
description: Morning briefing skill to prepare a concise daily summary (weather, calendar, top headlines, and top task). Use when asked for a morning brief, daily summary, or start‑of‑day overview.
---

# Daily Brief

## Overview
Prepare a short, scannable morning brief: weather, calendar, headlines, and a single top task.

## Workflow

### Step 1 — Time & location
- Use the user’s timezone and preferred location if known.
- If missing, ask once and store it in USER.md.

### Step 2 — Weather
- Use the weather skill for current conditions + today’s high/low.
- Keep it to 1–2 lines.

### Step 3 — Calendar (if available)
- Summarize next 24–48 hours: events, start times, locations.
- If no calendar access, omit this section.

### Step 4 — Headlines
- Provide 3–5 top headlines with source + link.
- Prefer reputable sources (BBC/Reuters/etc.).

### Step 5 — Top Task
- Ask for the #1 priority if not already known.
- If known, surface it as “Top task today: …”

## Output format (example)
Morning briefing — Tue 9 Jan 2026

Weather (City): 🌤  7°C (H: 10°C / L: 3°C)

Calendar:
- 09:30 — Standup (Zoom)
- 14:00 — Client call

Top headlines:
1) Title — Source (link)
2) Title — Source (link)
3) Title — Source (link)

Top task: Finish quarterly report

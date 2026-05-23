# LaunchAgent — Execution Plan (revised May 23, 2026)

*Cerebral Valley × Google I/O Hackathon · Shack15, SF · 8–10 hour build*

---

## 0. What's locked in vs. what's changed

**Locked in:**
- Core insight stands: demand discovery is the novel layer. "Reverse the marketing pipeline."
- Gemini 3.5 Flash is the headline model (problem statement requires it).
- Parallel agent swarm is the moat — and it's also what wins the $5K Managed Agents prize.
- React frontend, Vercel deploy, no Streamlit.

**Changed from original plan:**
- **Auto-distribution → "Launchpad"** with deep-link pre-filled compose windows. Eliminates X API paywall, Reddit AI-spam ban risk, LinkedIn API gatekeeping. Saves ~3 hours of OAuth. Same demo punch (post goes live on stage).
- **Discovery uses the Managed Agents API**, not custom scraping. One sandbox per platform = real parallel agents.
- **Veo and Speech moved to stretch-only.** Skip unless ahead at hour 6.
- **Reddit OAuth used for read-only search**, not posting. (Optional — Algolia HN + GitHub + Dev.to APIs alone give enough signal for the demo.)

---

## 1. Critical Google AI Studio / Gemini 3.5 facts (as of I/O 2026)

### Gemini 3.5 Flash
- Model ID: `gemini-3.5-flash` (GA stable since May 20, 2026)
- Context: 1M input / 65K output tokens
- Multimodal in (text/image/video/audio/PDF), text out
- Pricing: ~$1.50 / 1M input, $9.00 / 1M output
- **Do NOT pass** `temperature`, `top_p`, `top_k` — Google explicitly deprecated these for 3.x
- Use `thinking_level` (minimal | low | medium | high), NOT `thinking_budget`
- For agentic workloads, the **Interactions API** is the new primitive; `generateContent` still works but won't get new features

### Managed Agents API (the $5K prize target)
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/interactions`
- Required headers: `x-goog-api-key: $GEMINI_API_KEY`, `Api-Revision: 2026-05-20`
- Base agent: `antigravity-preview-05-2026`
- Each call = fresh isolated Linux sandbox (Antigravity harness, Python + bash + web + file I/O)
- Sandbox TTL: 7 days, renewed on each interaction
- **Parallel calls = parallel sandboxes** — this is the architectural unlock
- Network egress requires allowlist on agent config; for base `antigravity-preview-05-2026` it's open by default for public endpoints
- Multi-turn: pass `previous_interaction_id` to resume same sandbox

### Image / Video / Audio models
- **Image**: `gemini-2.5-flash-image` (Nano Banana 2) — fast, good for social cards. Use this.
- **Video**: Veo 3.1 family — high latency, fragile in demo. Stretch only.
- **Speech**: TTS works but adds 30s+ per generation. Stretch only.
- All accessible via the same Gemini API key.

### What AI Studio "Build" mode actually gets you
- Type a description → AI Studio generates a working React/Next.js app skeleton in ~60s
- One-click deploy to Cloud Run
- Project state export → continue in Antigravity if you want IDE
- Good for **hour 0–1 scaffolding only**. Drop to your own code after.

### Antigravity desktop vs CLI vs SDK vs API — what to use when
- **Desktop app**: use for the scaffolding + initial UI build in hour 0–1 if you want voice-driven dev
- **CLI (`agy`)**: use for orchestrating parallel agents in your dev loop (not in production)
- **Managed Agents API**: this is what your deployed web app calls at runtime — the only one that matters for the demo
- **SDK**: skip, too heavy for a 10-hour build

---

## 2. Architecture (revised)

```
                                ┌─────────────────────────────────────┐
                                │  React UI (Vercel)                  │
                                │  - input box + run button           │
                                │  - 3-phase progress visual          │
                                │  - live agent trace sidebar         │
                                │  - demand-map list                  │
                                │  - Launchpad with per-platform cards│
                                └──────────────┬──────────────────────┘
                                               │ SSE stream
                              ┌────────────────▼────────────────┐
                              │  Backend: Node/Vercel function  │
                              │  Orchestrator                   │
                              └────────────────┬────────────────┘
                                               │
              ┌────────────────┬───────────────┼───────────────┬────────────────┐
              │                │               │               │                │
              ▼                ▼               ▼               ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Reddit   │    │ HN       │    │ GitHub   │    │ Dev.to   │    │ Stack    │
        │ Discovery│    │ Discovery│    │ Issues   │    │ Discovery│    │ Overflow │
        │ Agent    │    │ Agent    │    │ Agent    │    │ Agent    │    │ Agent    │
        │(Managed) │    │(Managed) │    │(Managed) │    │(Managed) │    │(Managed) │
        └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘
              │               │                │               │               │
              └───────────────┴────────────────┼───────────────┴───────────────┘
                                               │
                                  ┌────────────▼─────────────┐
                                  │  Aggregator (Flash)      │
                                  │  rank, dedupe → demand_map│
                                  └────────────┬─────────────┘
                                               │
                                  ┌────────────▼─────────────┐
                                  │  Strategy Agent (Flash)  │
                                  │  channel ranking + plan  │
                                  └────────────┬─────────────┘
                                               │
              ┌────────────────┬───────────────┼───────────────┬────────────────┐
              ▼                ▼               ▼               ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Reddit   │    │ HN       │    │ X/Twitter│    │ LinkedIn │    │ Image    │
        │ Copy     │    │ Copy     │    │ Copy     │    │ Copy     │    │ (Nano    │
        │ (Flash)  │    │ (Flash)  │    │ (Flash)  │    │ (Flash)  │    │ Banana 2)│
        └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘
              │               │                │               │               │
              └───────────────┴────────────────┼───────────────┴───────────────┘
                                               │
                                  ┌────────────▼─────────────┐
                                  │  Launchpad UI            │
                                  │  - card per platform     │
                                  │  - prefilled deep links  │
                                  │  - "Launch" buttons      │
                                  └──────────────────────────┘
```

**Agent count for the prize:**
- 5 discovery agents (parallel Managed Agents API calls)
- 1 aggregator (Flash, gen-content)
- 1 strategy agent (Flash, gen-content)
- 4–5 content agents (parallel Flash calls)
- 1 image agent (Nano Banana 2)
- **Total: 12–13 agents with clear specialization** ✓ hits the multi-agent narrative

---

## 3. Hour-by-hour build plan

### H0 → H1 — Setup & first signal
- [ ] Get Gemini API key from AI Studio (`aistudio.google.com` → "Get API key")
- [ ] Test the Interactions API with curl:
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Api-Revision: 2026-05-20" \
    -d '{"agent":"antigravity-preview-05-2026","input":"Fetch hn.algolia.com/api/v1/search?query=figma+to+react and return the top 3 stories as JSON.","environment":"remote"}'
  ```
- [ ] If that works → you have the core primitive. Everything else is plumbing.
- [ ] `npm create vite@latest launchagent -- --template react-ts`
- [ ] Push to GitHub (public, hackathon rule), deploy to Vercel, confirm public URL works
- [ ] Stub UI: input box + "Launch" button + empty 3-phase progress strip

### H1 → H3 — Demand discovery (the moat)
- [ ] Backend route `/api/discover` accepts `{productDescription}`, returns SSE stream
- [ ] Fan out 5 parallel Managed Agents API calls (use `Promise.all` in Node):
  - Reddit agent (uses public `.json` endpoints, no auth needed for search)
  - HN agent (uses `hn.algolia.com/api/v1/search`, no auth, completely open)
  - GitHub Issues agent (uses GitHub search API, public, no auth for low volume)
  - Dev.to agent (uses dev.to API, free)
  - Stack Overflow agent (uses SO API, free, no auth for read)
- [ ] Stream each agent's findings to the UI as they arrive (don't wait for all 5)
- [ ] UI: live-updating "demand map" list with thread title, snippet, engagement, source
- [ ] **Test with 3 product descriptions** — tune until you get good, real-looking results:
  1. "An open-source tool that converts Figma designs to production React code"
  2. "A CLI that auto-generates database migrations from Pydantic models"
  3. "A self-hosted alternative to Calendly with custom availability rules"

### H3 → H5 — Strategy + content
- [ ] Aggregator: single Flash call, dedupe + rank threads by `recency × engagement × keyword_match`
- [ ] Strategy agent: Flash with the demand map → JSON output with channel ranking, tone notes per platform, optimal post type per channel
- [ ] Content agents: 4 parallel Flash calls (Reddit, HN, X, LinkedIn) — each takes the demand map + strategy + ONE specific discovered thread it's writing in response to
  - **Critical**: each post must quote or paraphrase the actual language from the thread. That's the differentiator vs Jasper/Buffer.
- [ ] Image agent: one Nano Banana 2 call for a social card

### H5 → H7 — Launchpad UI
- [ ] Launchpad screen: 4 cards (Reddit, X, HN, LinkedIn) + image card
- [ ] Each card: drafted post text (editable textarea) + platform-specific preview + "Launch" button
- [ ] Launch buttons generate deep links:
  - Reddit: `https://www.reddit.com/r/{sub}/submit?title={encodeURIComponent(title)}&text={encodeURIComponent(body)}&selftext=true`
  - X: `https://twitter.com/intent/tweet?text={encodeURIComponent(text)}`
  - HN: `https://news.ycombinator.com/submitlink?u={encodeURIComponent(url)}&t={encodeURIComponent(title)}`
  - LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url={encodeURIComponent(url)}`
  - Dev.to: actual API call works (free, just needs API key from dev.to/settings/account) — do this one as a true "Post live now" button
- [ ] Agent trace sidebar: left rail showing each agent's status (running / done / output preview)

### H7 → H9 — Polish + deploy
- [ ] End-to-end run, three different product inputs, fix what breaks
- [ ] Loading shimmer states, agent badge animations when they "fire"
- [ ] Make sure the demand map looks visually impressive — that's the wow moment
- [ ] Re-deploy to Vercel, **test from a different device + a different network**

### H9 → H10 — Submission
- [ ] Record 1-minute demo video (Loom or QuickTime). Script in Section 6 below.
- [ ] Make sure README has: setup, env vars, demo link, video link
- [ ] Submit per hackathon form

---

## 4. Agent prompts (paste directly into Managed Agents API)

### 4a. Reddit Discovery Agent

```
You are a demand intelligence agent specialized in Reddit.

PRODUCT: {productDescription}

TASK: Find 5-10 Reddit threads from the last 180 days where people are explicitly asking for, complaining about the lack of, or describing the need for the product above.

INSTRUCTIONS:
1. Use Python + requests to query Reddit's public JSON search endpoint:
   https://www.reddit.com/search.json?q=QUERY&sort=relevance&t=year&limit=25
   Set User-Agent: "LaunchAgent/0.1 by /u/demouser"
2. Generate 3-4 search queries that capture different framings of the user need (e.g., "tool that does X", "how do you Y", "looking for Z alternative")
3. For each thread that matches, extract:
   - thread_url (permalink, full https://reddit.com/...)
   - subreddit
   - title
   - body_snippet (first 300 chars of selftext)
   - num_comments
   - score (upvotes)
   - created_utc (ISO 8601)
   - verbatim_phrases: 1-3 short verbatim phrases from the post showing how the user articulates the need (these will be used to write reply copy in the user's own language)
4. EXCLUDE: promotional posts, posts where the author is shipping their own competing product, posts older than 180 days
5. Return a JSON object: {"platform": "reddit", "threads": [...]}

Stop after 10 results or 90 seconds, whichever comes first. Return JSON only, no preamble.
```

### 4b. Hacker News Discovery Agent

```
You are a demand intelligence agent specialized in Hacker News.

PRODUCT: {productDescription}

TASK: Find 5-10 HN stories and comment threads from the last 12 months where people are asking for or describing the need for the product above.

INSTRUCTIONS:
1. Use Python + requests to query the Algolia HN search API (no auth required):
   https://hn.algolia.com/api/v1/search?query=QUERY&tags=story&numericFilters=created_at_i>UNIXTIME
   Also try tags=comment for relevant discussion threads.
2. Generate 3-4 search queries.
3. For each match, extract:
   - story_url: https://news.ycombinator.com/item?id={objectID}
   - title (or comment text snippet for comments)
   - points
   - num_comments
   - created_at
   - verbatim_phrases: short phrases showing how the user describes the need
4. Return JSON: {"platform": "hackernews", "threads": [...]}

Stop after 10 results or 90 seconds. JSON only.
```

### 4c. GitHub Issues Discovery Agent

```
You are a demand intelligence agent specialized in GitHub.

PRODUCT: {productDescription}

TASK: Find 5-10 open GitHub issues or discussions across popular repos where the issue describes a need the above product would solve.

INSTRUCTIONS:
1. Use Python + requests with the GitHub search API (no auth needed for low volume):
   https://api.github.com/search/issues?q=QUERY+is:issue+is:open&sort=reactions&order=desc
2. Generate 3-4 search queries.
3. For each match: html_url, repo full_name, title, body_snippet, reactions_total, comments, created_at, verbatim_phrases.
4. Return JSON: {"platform": "github", "threads": [...]}

Stop after 10 results or 90 seconds. JSON only.
```

### 4d. Dev.to Discovery Agent

```
You are a demand intelligence agent specialized in Dev.to.

PRODUCT: {productDescription}

TASK: Find 5-10 Dev.to articles and discussions where developers describe needing the above product.

INSTRUCTIONS:
1. Use the Dev.to public API: https://dev.to/api/articles?tag=TAG&top=30 and https://dev.to/search?q=QUERY (the search page can be parsed as HTML if no JSON endpoint)
2. Generate 3-4 search queries.
3. Extract: url, title, body_snippet, public_reactions_count, comments_count, published_at, verbatim_phrases.
4. Return JSON: {"platform": "devto", "threads": [...]}

Stop after 10 results or 90 seconds. JSON only.
```

### 4e. Stack Overflow Discovery Agent

```
You are a demand intelligence agent specialized in Stack Overflow.

PRODUCT: {productDescription}

TASK: Find 5-10 Stack Overflow questions where the asker would benefit directly from the above product.

INSTRUCTIONS:
1. Use the Stack Exchange API (no auth for read): https://api.stackexchange.com/2.3/search/advanced?q=QUERY&site=stackoverflow&sort=relevance&order=desc&pagesize=25
2. Generate 3-4 search queries.
3. Extract: link, title, body_snippet (need to make a second call to /questions/{id} for body, or skip body), score, answer_count, view_count, creation_date, verbatim_phrases (from title if body is skipped).
4. Return JSON: {"platform": "stackoverflow", "threads": [...]}

Stop after 10 results or 90 seconds. JSON only.
```

### 4f. Aggregator (Flash, generateContent)

```
SYSTEM: You are a demand intelligence analyst.

INPUT: An array of discovery results from 5 platforms, each containing threads with engagement metrics and verbatim user phrases.

TASK:
1. Deduplicate threads that reference the same conversation across platforms.
2. Score each thread: recency_score (0-1, last 30 days = 1.0, linear decay to 180 days = 0.1) × engagement_score (log-normalized upvotes+comments+reactions) × intent_score (0-1, how explicitly the user is asking for this product).
3. Return the top 20 threads sorted by composite score, plus a summary:
   - total_threads_found: int
   - platforms_with_demand: ranked list of {platform, demand_density_score, top_thread_url}
   - common_phrases: 5-10 phrases that appear across multiple threads (user vocabulary)
   - peak_recency: most recent thread date

OUTPUT: JSON only. No preamble.
```

### 4g. Strategy Agent (Flash, generateContent)

```
SYSTEM: You are a launch strategist for a developer-tools company.

INPUT: A demand map (output from the Aggregator) for a specific product.

TASK: Generate a launch plan with:
1. channel_ranking: ordered list of platforms with rationale (1-2 sentences each)
2. tone_per_platform: dict mapping platform → 1 sentence describing the voice (e.g., Reddit r/programming = "no marketing language, lead with technical detail, link to GitHub")
3. timing_recommendation: which channel to post first, second, third based on community activity patterns
4. engagement_strategy_per_channel: for each top channel, decide "reply to existing thread" or "create original post". Specify the target thread URL for replies.

OUTPUT: JSON only.
```

### 4h. Content Agent (Reddit, Flash — one of four parallel)

```
SYSTEM: You are a Reddit-native developer writing a post that does NOT sound like marketing.

INPUT:
- PRODUCT: {productDescription}
- TARGET_THREAD: {redditThreadObject}
- USER_PHRASES: array of verbatim phrases from the demand map
- TONE: {strategy.tone_per_platform.reddit}

TASK: Write a Reddit post or reply (decide which based on target_thread) that:
1. Uses the user's own vocabulary (cite 1-2 phrases verbatim or near-verbatim)
2. Mentions the product as a specific solution, with a link
3. Includes one concrete technical detail (not generic marketing)
4. Is under 200 words
5. Does NOT use the words: "revolutionize", "game-changer", "powerful", "leverage", "AI-powered"
6. Sounds like a real human developer

OUTPUT:
{
  "subreddit": "r/...",
  "post_type": "submission" | "comment",
  "target_url": "https://reddit.com/...",
  "title": "..." (only if post_type=submission),
  "body": "..."
}
```

(Mirror the above pattern for X, HN, LinkedIn content agents — same shape, different tone constraints.)

---

## 5. Starter scaffold prompt for AI Studio Build / Antigravity

Paste this into AI Studio's "Build" mode or Antigravity desktop:

```
Build a Next.js 14 app called "LaunchAgent" with the following:

PAGE STRUCTURE:
- Single-page app at /
- Hero section: title "LaunchAgent", tagline "Find where demand is. Launch there.", a large input textarea labeled "Describe your product in one sentence", and a button "Find Demand"
- After button click, show a 3-phase progress strip: "1. Discovering Demand", "2. Building Strategy", "3. Drafting Launch Assets". Each phase has a status badge (idle/running/done).
- Below the progress strip, a 2-column layout:
  - Left rail (300px): "Agent Trace" — list of agents with status icons and animated dots when running. Agents to show: Reddit, HN, GitHub, Dev.to, StackOverflow, Aggregator, Strategy, Reddit Writer, X Writer, HN Writer, LinkedIn Writer, Image
  - Main area: tabbed view with three tabs corresponding to the three phases
    - Tab 1 "Demand Map": list of discovered threads as cards (platform badge, title, snippet, engagement count, "view source" link). Cards stream in as they arrive.
    - Tab 2 "Strategy": cards showing channel ranking, tone per platform, recommended order
    - Tab 3 "Launchpad": 5 cards (Reddit, X, HN, LinkedIn, Image). Each shows the drafted content in an editable textarea + a primary "Launch on {platform}" button that opens the platform's compose URL with content pre-filled. The Image card shows the generated social card image with a "Download" button.

TECHNICAL:
- API route /api/discover that accepts POST {productDescription} and returns Server-Sent Events
- The route fans out 5 parallel fetches to Google's Managed Agents API (https://generativelanguage.googleapis.com/v1beta/interactions) using the antigravity-preview-05-2026 agent, environment "remote", with platform-specific input prompts (these will be provided separately)
- After all 5 return, makes a single Flash call (gemini-3.5-flash via generateContent) to aggregate
- Then another Flash call for strategy
- Then 4 parallel Flash calls for content + 1 Nano Banana 2 (gemini-2.5-flash-image) call for the social card
- All progress streamed via SSE so the UI updates live

STYLING:
- Dark theme, near-black background, electric green accent (#00FF88), generous whitespace
- Use shadcn/ui components, Inter font
- Animated dots and pulses on running agents

ENV VARS:
- GEMINI_API_KEY

Skip authentication. Skip persistence. This is a demo app.
```

---

## 6. Demo script (revised, 60 seconds for submission video; 3 minutes for live)

### 60-second submission video

(0:00–0:08)
> "Every AI marketing tool creates content. None of them know where your customers actually are. LaunchAgent reverses the pipeline."

(0:08–0:20)
[Show input being typed]
> "I type one sentence about a product. Twelve Gemini 3.5 Flash agents fan out across Reddit, Hacker News, GitHub, Dev.to, and Stack Overflow — in parallel — to find conversations where people are *already asking* for this exact thing."

(0:20–0:35)
[Demand map populates live]
> "Thirty real threads in 40 seconds. Each one with verbatim quotes of how the user describes the need."

(0:35–0:50)
[Cut to Launchpad]
> "Now four content agents draft platform-perfect posts using those exact phrases. The Reddit post sounds like Reddit. The HN comment quotes the specific thread."

(0:50–0:60)
[Click Launch → Reddit opens with everything filled → click Post]
> "And it goes live. Building is solved. Now distribution is too."

### Live demo Q&A — judge questions

**"How is this different from Jasper / Buffer / Common Room?"**
> "Those tools create content for channels you pick. LaunchAgent finds where demand already exists, in real time, then writes for those specific conversations. The discovery layer with 5 parallel agents — that's the part that's new."

**"Isn't this just web scraping plus an LLM?"**
> "If it were, I wouldn't need the Managed Agents API. Each discovery agent runs in its own Linux sandbox with full Python and web access. It composes search queries, handles pagination, filters spam, extracts verbatim user vocabulary, and structures it — all autonomously. Five of those run in parallel. That's not a scraper, that's an agent swarm."

**"Why Gemini 3.5 Flash specifically?"**
> "Twelve agents in parallel. Flash is the only frontier-quality model where the latency × cost makes that feasible. With slower models the demand pass alone would take ten minutes. And the agentic harness in 3.5 — the Antigravity sandbox — is what makes the discovery agents actually capable of multi-step web work."

**"What about spam? Aren't you flooding platforms with AI content?"**
> "We don't auto-post. The Launchpad opens each platform's compose window with the post pre-filled — the human reviews and posts. The content uses the *user's own words* from the source thread, so it adds context instead of noise. It's what a good founder would do manually. We just compress three weeks into three minutes."

**"What's the business model?"**
> "Seat-based for founders, usage-based for agencies. The data moat is the demand-map history — over time you learn which platforms convert which categories of products. That's the long-term defensibility."

---

## 7. Fallback ladder (in order of pain)

1. **If Veo / Speech are slow** → already dropped. Don't even start them.
2. **If one discovery agent fails** → orchestrator continues with the other 4. UI shows the failed one as "skipped" — actually reads as resilient.
3. **If a discovery agent returns garbage** → aggregator filters out malformed JSON, demand map still useful.
4. **If Managed Agents API is rate-limited / down** → fall back to direct Flash calls with `web_search` tool enabled. You lose the "12 agents in parallel sandboxes" story but keep the demo working. **Test this fallback at hour 6.**
5. **If Nano Banana 2 image generation fails** → skip the image card, demo still works.
6. **If Vercel deploy breaks at H9** → run locally + use ngrok / cloudflared tunnel for the public link. Have this tested ahead of time.
7. **If Reddit deep link doesn't autofill on stage** (some browsers block) → have a backup tab pre-opened with the Reddit compose URL, paste the body.

---

## 8. Pre-flight checklist (do these before H1 ends)

- [ ] `GEMINI_API_KEY` set in Vercel env vars + local `.env`
- [ ] Verify Managed Agents API works with a curl test (Section 1)
- [ ] Verify `gemini-3.5-flash` direct call works (the fallback path)
- [ ] Verify `gemini-2.5-flash-image` (Nano Banana 2) works for one image
- [ ] Public GitHub repo created (hackathon rule)
- [ ] Vercel project linked, first deploy successful, public URL noted
- [ ] Dev.to API key obtained from `dev.to/settings/account` (only "real" auto-post)
- [ ] At least 1 personal Reddit account warmed up for the demo (don't need OAuth, just need to be logged in in the demo browser)
- [ ] 3 product descriptions tested manually with one discovery agent — confirm you're getting *real* threads, not noise

---

## 9. Submission requirements (don't forget)

- [ ] Public GitHub repo with README
- [ ] 1-minute demo video (Loom or YouTube unlisted)
- [ ] Accessible demo link (Vercel URL)
- [ ] Submission form filled with: project name, description, team (solo), repo URL, video URL, demo URL
- [ ] README must include: setup steps, env vars, how to run locally
- [ ] Demo must highlight ONLY features built during the hackathon (you're solo, fresh repo, this is automatic — just don't claim pre-existing work)

---

## 10. Positioning notes for judges

- **Lead with the demand discovery moat**, not the content generation. Content gen is commodity by 2026. Discovery isn't.
- **Frame as "first end-to-end autonomous version"**, not "never built before." Existing tools (Common Room, Mutiny, Userled) do parts of this with humans in the loop. LaunchAgent's claim is full autonomy + parallel agents + minutes instead of weeks.
- **Show the parallel agent trace prominently.** The $5K managed-agents prize judges will be looking specifically for evidence of real multi-agent orchestration. Make the sidebar pop.
- **The "human-in-the-loop on the post button" framing** is both honest and a stronger answer than auto-posting would be. Lean into it.

---

*Good luck. Ship something.*

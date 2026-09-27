# Unfold — How It Works

Ask how something works → get its **flow diagram**, top to bottom. Break any step down into its own sub-flow.

## 1. Keys

| Key | Owner | Stored | Needed? |
|---|---|---|---|
| AI key (Anthropic / OpenAI / Gemini / OpenRouter / Groq) | Visitor | Browser `localStorage` → `unfold:settings` | Yes |
| `TAVILY_API_KEY` | You | `.env.local` | Optional — only for "Web sources" |

The server never stores the AI key. Each request sends it in headers.

---

## 2. App gate

```
open app
  │
  ├─ browser has AI key + model? no → Onboarding (Connect your AI)
  │
  └─ yes → App (sidebar + pages)
```

`components/key-gate.tsx`

---

## 3. Connecting a key

```
paste key ──► detect provider from prefix       lib/providers.ts
                sk-ant- → Anthropic
                sk-or-  → OpenRouter
                gsk_    → Groq
                AIza    → Gemini
                sk-     → OpenAI
   │
Connect ──► POST /api/keys/verify               app/api/keys/verify/route.ts
               └─ list models from provider     lib/ai/provider-models.ts
   │
pick model ──► save { provider, apiKey, model }
```

---

## 4. Asking a question

```
Home: "How does X work?"  [Web sources on/off]
   │
   ▼
create canvas { status: "pending", useSearch }    lib/create-canvas.ts
   │
/canvas/[id] ──► startInitialResearch()           lib/research-runner.ts
   │              (keeps running if you leave the page)
   ▼
POST /api/research (mode: "initial")  ──► NDJSON stream
   {type:"stage"}  → progress UI
   {type:"result"} → buildInitialFlow() → dagre top-to-bottom layout
   {type:"error"}  → retry screen
```

Status drives the page: `pending` → progress · `error` → retry · `ready` → canvas.

---

## 5. Server workflow (LangGraph)

`app/api/research/route.ts` → `lib/ai/graph.ts`

```
START
  │
  ├── useSearch? ──yes──► planner (3 queries) ──► search (Tavily) ──┐
  │                                                                 │
  └── no ───────────────────────────────────────────────────────────┤
                                                                    ▼
                                         generate ── LLM draws the flow:
                                                     steps + links (what passes between)
                                                                    │
                                                                    ▼
                                         validate ── links point at real steps
                                                     no duplicate titles
                                                     drop disconnected steps
                                                     sources → retrieved URLs only
                                                                    │
                                         too few connected steps? ──► generate (max 2 tries)
                                                                    ▼
                                                                   END
```

Prompt rules (`lib/ai/prompts.ts`): steps must *do* something in the flow — no definitions, history or pros/cons.

---

## 6. Flow output

```
ResearchResult {
  title, summary,
  steps: [{ key, title, kind, summary, details, keyPoints, sources }],
  links: [{ from, to, label }]        ← label = what flows ("query", "if valid")
}
```

| kind | meaning |
|---|---|
| input | where the flow starts |
| process | does/transforms something |
| decision | picks a path (branches) |
| store | DB, cache, index, memory |
| external | outside service, API, user |
| output | final result |

Loops (retry, agent loop) = a link back to an earlier step.

---

## 7. Breaking a step down

```
"Break down" on a step
   │
POST /api/research (mode: "expand")
   focus: step + what it receives / hands off
   existingTitles: avoid repeats
   │
buildSubflow()                                    lib/layout.ts
   sub-steps laid out top-to-bottom inside a group box
   box placed right of the step, nudged off overlaps
   dashed link: step ──► box
   │
"Collapse" on the box → removes it (and nested breakdowns)
```

---

## 8. LLM calls (any provider)

```
invokeStructured()                                lib/ai/structured.ts
  ├─ native structured output (JSON schema / tool calling)
  ├─ auth / rate-limit / 404 / 5xx → throw
  └─ fallback: "JSON only" prompt → parse → zod validate
```

---

## 9. Canvas & saving

```
React Flow (steps + groups + edges)               components/canvas/research-canvas.tsx
  ├─ drag / break down / collapse → autosave (600ms) → localStorage "unfold:canvases"
  ├─ Tidy layout → re-run dagre on main flow, re-seat groups
  ├─ select step → panel: receives / hands off / how it works / key points / sources
  └─ Ctrl/⌘+S save · F fit · +/- zoom · Esc close
```

Old concept-map canvases (no `version: 2`) show a "Regenerate as a flow" prompt.

---

## 10. File map

```
app/
  page.tsx                  home (prompt, web toggle, examples)
  canvas/[id]/page.tsx      workspace states
  api/research/route.ts     streaming endpoint
  api/keys/verify/route.ts  key check + model list
  api/config/route.ts       is Tavily configured?
components/canvas/
  nodes.tsx                 StepCard, GroupBox
  relation-edge.tsx         arrows, labels, dashed breakdown links
  detail-panel.tsx          step details
lib/
  ai/          graph, prompts, model, structured, search, errors, provider-models
  layout.ts    dagre layout, sub-flow placement, tidy
  kinds.ts     step kind → icon/colour
  types.ts     StepNode, GroupNode, ResearchEdge, ResearchCanvas
```

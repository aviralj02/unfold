<p align="center">
  <img src="app/icon.svg" width="72" height="72" alt="Unfold logo">
</p>

<h1 align="center">Unfold</h1>

<p align="center"><strong>Ask how something works. Get the flow.</strong></p>

Unfold turns questions like _"How does LangChain work?"_ or _"How does Kubernetes schedule a pod?"_ into an interactive flow diagram. Each step is a stage or component, each arrow is labelled with what passes along it, and the whole thing reads top to bottom. Click any step to see what it receives, what it hands off and how it works. You can also break a step down into its own sub-flow.

It runs on your own AI key: no account and no sign-up.

![A LangChain flow in Unfold, with the Retriever step broken down into its own sub-flow](docs/screenshots/flow.png)

---

## Why

Chat assistants explain systems as long paragraphs. You read about the retriever, then the prompt, then the model, and have to rebuild the order and the connections in your head.

Unfold gives you that picture directly:

- **Order:** where the flow starts, what runs next, and where it ends.
- **Connections:** what data or control passes between steps (`query`, `embeddings`, `if tool call`).
- **Structure:** branches for decisions, arrows back for loops such as retries and agent cycles.
- **Depth on demand:** the top level stays readable. Break down only the steps you care about.

## Features

|                         |                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flow diagrams**       | Steps are typed as Start, Step, Decision, Store, External or Result, laid out top to bottom with labelled arrows.                            |
| **Break down any step** | Generates what happens inside a step as a boxed sub-flow beside it. Breakdowns can be nested and collapsed.                                  |
| **Step details**        | What the step receives and hands off (click to jump to that step), how it works, and key points.                                             |
| **Bring your own AI**   | Works with Anthropic, OpenAI, Gemini, OpenRouter or Groq. Paste a key, and Unfold detects the provider and lists the models the key can use. |
| **Saved locally**       | Canvases autosave in the browser. You can rename, delete and reopen them, and research keeps running if you leave the page.                  |
| **Canvas tools**        | Pan, zoom, fit to view, minimap, drag to rearrange, and **Tidy layout** to reset the arrangement.                                            |

---

## Quick start

**Requirements:** Node.js 20.9 or later, and an API key from any supported provider.

```bash
git clone https://github.com/aviralj02/unfold
cd unfold
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste your AI key and pick a model, then ask _"How does \_\_\_ work?"_

### Environment variables

Both are optional. Copy `.env.example` to `.env.local` to set them.

| Variable               | Purpose                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Your public URL, used for canonical links, the social preview image and the sitemap. It's read at **build** time. |
| `TAVILY_API_KEY`       | Adds a **Web sources** toggle that searches the web first and cites sources on each step.                         |

---

## Supported providers

Unfold detects the provider from the key prefix. You can also pick it manually.

| Provider   | Key looks like | Notes                                    |
| ---------- | -------------- | ---------------------------------------- |
| Anthropic  | `sk-ant-…`     | Defaults to Claude Opus 5 when available |
| OpenAI     | `sk-…`         | Chat models only                         |
| Gemini     | `AIza…`        | Google AI Studio key                     |
| OpenRouter | `sk-or-…`      | Any text model; type to search the list  |
| Groq       | `gsk_…`        | Fast open-weight models                  |

**Your key stays in your browser.** It's kept in `localStorage`, sent with each request to the Unfold server, and forwarded directly to the provider. The server never logs or stores it.

---

## How it works

```
Question ──► POST /api/research ──► LangGraph workflow ──► streamed NDJSON ──► React Flow canvas
                                     │
                                     ├─ generate   LLM draws steps + labelled links
                                     └─ validate   links must hit real steps,
                                                   disconnected steps dropped,
                                                   one retry if the flow falls apart
```

- **Works across providers:** each provider's native structured output is tried first (JSON schema or tool calling). Models without it fall back to JSON-only prompting, validated with Zod.
- **Breakdowns** reuse the same workflow, with the step's inputs and outputs as context.
- **Layout** is computed with [dagre](https://github.com/dagrejs/dagre) and runs top to bottom. Sub-flows are placed beside their parent step without overlapping anything.

See **[FLOW.md](FLOW.md)** for the full walkthrough: every stage, data shape and file.

---

## Tips

- **Phrase it as a process:** _"How does X work?"_, _"What happens when…"_ and _"Walk me through…"_ give the best flows.
- **Break down the step you're curious about** instead of asking a broader question.
- **Tidy layout** re-arranges the canvas after you've dragged things around.

| Shortcut     | Action                  |
| ------------ | ----------------------- |
| `Ctrl/⌘ + S` | Save now                |
| `F`          | Fit to view             |
| `+` / `-`    | Zoom                    |
| `Esc`        | Close the details panel |

---

## Tech stack

| Layer       | Choice                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework   | [Next.js 16](https://nextjs.org) (App Router, TypeScript)                                                                                        |
| UI          | [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Framer Motion](https://motion.dev), [Lucide](https://lucide.dev) |
| Canvas      | [React Flow](https://reactflow.dev) + [dagre](https://github.com/dagrejs/dagre)                                                                  |
| AI          | [LangChain.js](https://js.langchain.com) + [LangGraph.js](https://langchain-ai.github.io/langgraphjs/)                                           |
| Persistence | Browser `localStorage`                                                                                                                           |

## Project structure

```
app/
  page.tsx                   Home: prompt, examples, recent canvases
  canvas/[id]/               Workspace: progress, error, or canvas
  api/research/route.ts      Streaming research endpoint
  api/keys/verify/route.ts   Key check and model list
  icon.svg, opengraph-image.tsx, apple-icon.tsx, manifest.ts, robots.ts, sitemap.ts
components/
  key-gate.tsx, key-form.tsx Onboarding and settings (bring your own key)
  app-sidebar.tsx            Canvas list, rename and delete
  canvas/                    Step cards, sub-flow groups, arrow edges, detail panel, controls
  workspace/                 Header, progress, error states
lib/
  ai/                        LangGraph workflow, prompts, model factory, structured output
  layout.ts                  dagre layout, sub-flow placement, tidy
  providers.ts               Provider list and key detection
  site.ts                    Name, description and URL for metadata
  storage.ts                 localStorage stores for settings and canvases
```

## Scripts

| Command         | What it does                       |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the dev server on port 3000  |
| `npm run build` | Production build (type-checks too) |
| `npm run start` | Serve the production build         |
| `npm run lint`  | ESLint                             |

## Deploying

Unfold is a standard Next.js app and runs anywhere Next.js does, including Vercel and Netlify.

- **Serve over HTTPS.** Users' AI keys travel in request headers.
- **Allow requests of up to 2 minutes.** `/api/research` streams for up to about 2 minutes.
- **Set `NEXT_PUBLIC_SITE_URL` before building** so social previews and the sitemap point at your domain. On Vercel, the production URL is picked up automatically.

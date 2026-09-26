/** Tells the client which optional keys the server already provides. */
export function GET() {
  return Response.json({ serverSearch: Boolean(process.env.TAVILY_API_KEY) });
}

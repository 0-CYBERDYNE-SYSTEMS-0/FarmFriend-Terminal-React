type Args = {
  objective?: string;
};

function extractUrls(text: string): string[] {
  const urls: string[] = [];
  const re = /\bhttps?:\/\/[^\s)]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    urls.push(m[0]);
  }
  return [...new Set(urls)];
}

function stripHtml(html: string): { title?: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : undefined;

  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return { title, text: s };
}

export async function browseWebTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const objective = typeof args?.objective === "string" ? args.objective.trim() : "";
  if (!objective) throw new Error("browse_web: missing args.objective");

  const urls = extractUrls(objective);
  if (!urls.length) {
    return JSON.stringify(
      {
        ok: false,
        note:
          "browse_web in this TS build is a lightweight fetcher (no real browser automation yet). Include a URL in the objective, or use tavily_search/perplexity_search for discovery.",
        objective
      },
      null,
      2
    );
  }

  const pages: any[] = [];
  for (const url of urls.slice(0, 3)) {
    const res = await fetch(url, {
      method: "GET",
      headers: { "user-agent": "ff-terminal-ts/0.0.0" },
      signal
    });
    const contentType = res.headers.get("content-type") || "";
    const body = await res.text().catch(() => "");
    if (!res.ok) {
      pages.push({ url, ok: false, status: res.status, error: body.slice(0, 500) || res.statusText });
      continue;
    }

    if (contentType.toLowerCase().includes("text/html")) {
      const { title, text } = stripHtml(body);
      pages.push({ url, ok: true, content_type: contentType, title, text: text.slice(0, 5000) });
    } else {
      pages.push({ url, ok: true, content_type: contentType, text: body.slice(0, 5000) });
    }
  }

  return JSON.stringify(
    {
      ok: true,
      objective,
      pages
    },
    null,
    2
  );
}

import {
  navigateAndExtractContent,
  closeBrowser,
  shouldKeepBrowserAlive,
  getBrowserConfig
} from "../../browser/playwrightBrowser.js";

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
          "browse_web requires a URL in the objective. Include a URL like https://example.com in your objective string.",
        objective
      },
      null,
      2
    );
  }

  const pages: any[] = [];

  try {
    // Navigate to up to 3 URLs
    for (const url of urls.slice(0, 3)) {
      if (signal.aborted) {
        throw new Error("browse_web: aborted");
      }

      try {
        const result = await navigateAndExtractContent(url, {
          timeout: 30000,
          signal
        });

        pages.push({
          url,
          ok: true,
          title: result.title,
          text: result.text.slice(0, 8000), // Increased from 5000 for better content extraction
          content_type: "text/html",
          method: "playwright_chromium"
        });
      } catch (error: any) {
        pages.push({
          url,
          ok: false,
          error: error.message || String(error)
        });
      }
    }

    const browserConfig = await getBrowserConfig();
    const browserMode = browserConfig.headless ? "headless_chromium" : "visual_chromium";
    const note = browserConfig.headless
      ? "Using Playwright in headless Chromium mode."
      : "Using Playwright with visual Chromium browser. Browser window positioned on right half of screen for UX visibility.";

    return JSON.stringify(
      {
        ok: true,
        objective,
        pages,
        browser_mode: browserMode,
        note
      },
      null,
      2
    );
  } catch (error: any) {
    return JSON.stringify(
      {
        ok: false,
        objective,
        error: error.message || String(error),
        pages
      },
      null,
      2
    );
  } finally {
    const keepAlive = await shouldKeepBrowserAlive();
    if (!keepAlive) {
      await closeBrowser().catch(() => {});
    }
  }
}

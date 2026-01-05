import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import { loadConfig } from "../config/loadConfig.js";

export interface BrowserConfig {
  headless: boolean;
  windowSize: { width: number; height: number };
  disableSecurity: boolean;
  useProfile: boolean;
  cdpUrl: string | null;
}

let globalBrowser: Browser | null = null;
let globalContext: BrowserContext | null = null;
let globalPage: Page | null = null;

export async function getBrowserConfig(): Promise<BrowserConfig> {
  const config = await loadConfig();

  return {
    headless: typeof config.browser_headless === 'boolean' ? config.browser_headless : false,
    windowSize: (config.browser_window_size && typeof config.browser_window_size === 'object' && 'width' in config.browser_window_size && 'height' in config.browser_window_size) ? config.browser_window_size as { width: number; height: number } : { width: 800, height: 900 },
    disableSecurity: typeof config.browser_disable_security === 'boolean' ? config.browser_disable_security : true,
    useProfile: typeof config.browser_use_chrome_profile === 'boolean' ? config.browser_use_chrome_profile : false,
    cdpUrl: (typeof config.browser_cdp_url === 'string' ? config.browser_cdp_url : null)
  };
}

export async function shouldKeepBrowserAlive(): Promise<boolean> {
  const config = await loadConfig();
  return typeof config.browser_keep_alive === 'boolean' ? config.browser_keep_alive : true;
}

export async function getScreenDimensions(): Promise<{ width: number; height: number }> {
  // macOS-specific: get screen dimensions
  // Fallback to reasonable defaults
  return { width: 1920, height: 1080 };
}

export async function launchBrowser(): Promise<Browser> {
  if (globalBrowser) {
    return globalBrowser;
  }

  const browserConfig = await getBrowserConfig();

  const launchOptions: any = {
    headless: browserConfig.headless,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
    ]
  };

  if (browserConfig.disableSecurity) {
    launchOptions.args.push(
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    );
  }

  globalBrowser = await chromium.launch(launchOptions);
  return globalBrowser;
}

export async function getOrCreatePage(): Promise<Page> {
  if (globalPage && !globalPage.isClosed()) {
    return globalPage;
  }

  const browser = await launchBrowser();
  const browserConfig = await getBrowserConfig();

  if (!globalContext) {
    globalContext = await browser.newContext({
      viewport: browserConfig.windowSize,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });
  }

  globalPage = await globalContext.newPage();

  // Position window for half-screen view (visual UX)
  if (!browserConfig.headless) {
    await positionWindowHalfScreen(globalPage, browserConfig.windowSize);
  }

  return globalPage;
}

async function positionWindowHalfScreen(page: Page, windowSize: { width: number; height: number }): Promise<void> {
  try {
    // Use CDP (Chrome DevTools Protocol) to position the window
    const cdpSession = await page.context().newCDPSession(page);

    // Get screen dimensions
    const screenDimensions = await getScreenDimensions();

    // Position on right half of screen
    const x = Math.floor(screenDimensions.width / 2);
    const y = 0;
    const width = Math.floor(screenDimensions.width / 2);
    const height = screenDimensions.height;

    // Set window bounds
    await cdpSession.send('Browser.setWindowBounds', {
      windowId: 1, // Main window
      bounds: {
        left: x,
        top: y,
        width: width,
        height: height
      }
    });

    await cdpSession.detach();
  } catch (error) {
    // Fallback: Window positioning might not work in all environments
    console.warn('Could not position browser window:', error);
  }
}

export async function closeBrowser(): Promise<void> {
  if (globalPage) {
    await globalPage.close().catch(() => {});
    globalPage = null;
  }
  if (globalContext) {
    await globalContext.close().catch(() => {});
    globalContext = null;
  }
  if (globalBrowser) {
    await globalBrowser.close().catch(() => {});
    globalBrowser = null;
  }
}

export async function navigateAndExtractContent(url: string, options?: {
  waitForSelector?: string;
  timeout?: number;
  signal?: AbortSignal;
}): Promise<{ title: string; text: string; html: string }> {
  const page = await getOrCreatePage();

  if (options?.signal?.aborted) {
    throw new Error("browse_web: aborted");
  }

  const signal = options?.signal;
  let abortHandler: (() => void) | null = null;
  const abortPromise = signal
    ? new Promise<never>((_, reject) => {
        abortHandler = () => {
          closeBrowser().catch(() => {});
          reject(new Error("browse_web: aborted"));
        };
        signal.addEventListener("abort", abortHandler, { once: true });
      })
    : null;

  try {
    const gotoPromise = page.goto(url, {
      waitUntil: 'networkidle',
      timeout: options?.timeout || 30000
    });
    if (abortPromise) {
      await Promise.race([gotoPromise, abortPromise]);
    } else {
      await gotoPromise;
    }

    if (signal?.aborted) {
      throw new Error("browse_web: aborted");
    }

    // Wait for specific selector if provided
    if (options?.waitForSelector) {
      const waitPromise = page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      if (abortPromise) {
        await Promise.race([waitPromise, abortPromise]).catch(() => {});
      } else {
        await waitPromise.catch(() => {});
      }
    }

    if (signal?.aborted) {
      throw new Error("browse_web: aborted");
    }

    // Extract content
    const titlePromise = page.title();
    const htmlPromise = page.content();
    const title = abortPromise ? await Promise.race([titlePromise, abortPromise]) : await titlePromise;
    const html = abortPromise ? await Promise.race([htmlPromise, abortPromise]) : await htmlPromise;

    // Extract visible text (better than HTML stripping)
    const evalPromise = page.evaluate(() => {
      // Remove script, style, and hidden elements
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style, [hidden], [aria-hidden="true"]').forEach(el => el.remove());
      return clone.innerText || clone.textContent || '';
    });
    const text = abortPromise ? await Promise.race([evalPromise, abortPromise]) : await evalPromise;

    return {
      title,
      text: text.trim(),
      html
    };
  } finally {
    if (abortHandler && signal) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
}

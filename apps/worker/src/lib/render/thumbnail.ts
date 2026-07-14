import { Data, Effect } from 'effect';
import { type Browser, type Page, chromium } from 'playwright';

export { getVariantPixelSize } from '@shared/render/constants';

const RENDER_PAGE_TIMEOUT_MS = 10_000;
const RENDER_PAGE_ERROR_SNIPPET_LENGTH = 1_500;

export class RenderError extends Data.TaggedError('RenderError')<{
    readonly message: string;
    readonly cause?: unknown;
}> {}

function causeMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

const tryRender = <A>(run: () => Promise<A>) =>
    Effect.tryPromise({
        try: run,
        catch: (cause) => new RenderError({ message: causeMessage(cause), cause }),
    });

export const launchBrowser: Effect.Effect<Browser, RenderError> = tryRender(() => chromium.launch({ headless: true }));

export interface ScreenshotOptions {
    /** URL path to navigate to (e.g. `/site/slug/devices/render/id`) */
    renderPath: string;
    origin: string;
    /** Initial viewport used only to load and measure the render target. */
    width?: number;
    height?: number;
    /** CSS selector to wait for before screenshotting. Defaults to `[data-rendered]`. */
    waitForSelector?: string;
    /** CSS selector to screenshot instead of the full page. */
    screenshotSelector?: string;
}

const pageSnippet = (page: Page) =>
    tryRender(() => page.content()).pipe(
        Effect.map((text) => text.slice(0, RENDER_PAGE_ERROR_SNIPPET_LENGTH)),
        Effect.catch(() => Effect.succeed('')),
    );

/**
 * Generate a screenshot by navigating Playwright to a render page.
 * Authenticates with a WorkOS M2M access token via Authorization header.
 * Single rendering function for all screenshot needs (devices, frames, templates).
 */
export function generateScreenshot(
    options: ScreenshotOptions & { browser: Browser; accessToken: string },
): Effect.Effect<ArrayBuffer, RenderError> {
    const { renderPath, width, height, origin, waitForSelector = '[data-rendered]', screenshotSelector } = options;
    const viewport = width && height ? { width, height } : undefined;

    return Effect.scoped(
        Effect.gen(function* () {
            const context = yield* Effect.acquireRelease(
                tryRender(() =>
                    options.browser.newContext({
                        ...(viewport ? { viewport } : {}),
                        extraHTTPHeaders: {
                            authorization: `Bearer ${options.accessToken}`,
                        },
                    }),
                ),
                (ctx) => Effect.tryPromise(() => ctx.close()).pipe(Effect.ignore),
            );

            const page = yield* tryRender(() => context.newPage());
            yield* Effect.sync(() => {
                page.setDefaultTimeout(RENDER_PAGE_TIMEOUT_MS);
                page.setDefaultNavigationTimeout(RENDER_PAGE_TIMEOUT_MS);
            });

            const response = yield* tryRender(() =>
                page.goto(`${origin}${renderPath}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: RENDER_PAGE_TIMEOUT_MS,
                }),
            );

            if (!response?.ok()) {
                const snippet = yield* pageSnippet(page);
                return yield* new RenderError({
                    message: `Render page failed: ${response?.status() ?? 'no-response'} ${response?.statusText() ?? ''} ${snippet}`,
                });
            }

            yield* tryRender(() => page.waitForSelector(waitForSelector, { timeout: RENDER_PAGE_TIMEOUT_MS })).pipe(
                Effect.catch(() =>
                    pageSnippet(page).pipe(
                        Effect.flatMap((snippet) =>
                            Effect.fail(
                                new RenderError({
                                    message: `Render marker '${waitForSelector}' not found on ${renderPath}: ${snippet}`,
                                }),
                            ),
                        ),
                    ),
                ),
            );

            if (screenshotSelector) {
                const target = yield* tryRender(() =>
                    page.waitForSelector(screenshotSelector, { timeout: RENDER_PAGE_TIMEOUT_MS }),
                );
                const box = yield* tryRender(() =>
                    target.evaluate((el) => {
                        const rect = el.getBoundingClientRect();
                        return {
                            width: Math.ceil(Math.max(rect.width, el.scrollWidth)),
                            height: Math.ceil(Math.max(rect.height, el.scrollHeight)),
                        };
                    }),
                );

                if (box.width <= 0 || box.height <= 0) {
                    return yield* new RenderError({
                        message: `Screenshot target '${screenshotSelector}' has no renderable size on ${renderPath}`,
                    });
                }

                yield* tryRender(() => page.setViewportSize({ width: box.width, height: box.height }));
                const png = yield* tryRender(() => target.screenshot({ type: 'png' }));
                return Uint8Array.from(png).buffer;
            }

            const png = yield* tryRender(() => page.screenshot({ type: 'png' }));
            return Uint8Array.from(png).buffer;
        }),
    );
}

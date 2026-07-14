import { withLoggedSpan } from '@workspace/observability';
import { AppClient, type AppRequestError } from '@worker/app-client';
import { generateScreenshot, launchBrowser, type RenderError, type ScreenshotOptions } from '@/lib/render/thumbnail';
import { Context, Effect, Layer, Semaphore } from 'effect';
import type { Browser } from 'playwright';

export class Renderer extends Context.Service<
    Renderer,
    {
        readonly screenshot: (options: ScreenshotOptions) => Effect.Effect<ArrayBuffer, RenderError | AppRequestError>;
    }
>()('Renderer') {}

export const RendererLive = Layer.effect(
    Renderer,
    Effect.gen(function* () {
        const appClient = yield* AppClient;
        let browser: Browser | null = null;
        const launchLock = yield* Semaphore.make(1);

        // Lazy launch with relaunch-on-crash: a disconnected Chromium must not poison all future renders.
        // The single browser is shared by all renders; the lock only serializes the check-and-launch so
        // concurrent jobs racing a crashed browser can't each spawn their own Chromium.
        const getBrowser = launchLock.withPermits(1)(
            Effect.suspend(() => {
                if (browser?.isConnected()) return Effect.succeed(browser);
                return launchBrowser.pipe(
                    Effect.map((instance) => {
                        browser = instance;
                        return instance;
                    }),
                    withLoggedSpan('render.browser-launch'),
                );
            }),
        );

        yield* Effect.addFinalizer(() =>
            Effect.suspend(() => {
                const instance = browser;
                browser = null;
                if (!instance) return Effect.void;
                return Effect.tryPromise(() => instance.close()).pipe(Effect.ignore);
            }),
        );

        return {
            screenshot: (options: ScreenshotOptions) =>
                Effect.all([getBrowser, appClient.getAccessToken]).pipe(
                    Effect.flatMap(([instance, accessToken]) =>
                        generateScreenshot({ ...options, browser: instance, accessToken }),
                    ),
                    withLoggedSpan('render.screenshot', { 'render.path': options.renderPath }),
                ),
        };
    }),
);

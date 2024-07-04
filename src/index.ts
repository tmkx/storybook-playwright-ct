/// <reference types="react" />
import path from 'node:path';
import type {
  Fixtures,
  Locator,
  Page,
  BrowserContextOptions,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  PlaywrightTestConfig,
  BrowserContext,
} from '@playwright/test';
import { test as baseTest, expect, devices, defineConfig as originalDefineConfig } from '@playwright/test';
import type { Channel } from '@storybook/channels';
import type { Args, ComposedStoryFn } from '@storybook/types';

let boundCallbacksForMount: Function[] = [];

declare global {
  let __STORYBOOK_ADDONS_CHANNEL__: Channel;
}

interface ExtendedFixture {
  mount(element: React.JSX.Element | React.ReactElement): Promise<Locator>;
  mount<TArgs extends Args>(composedStory: ComposedStoryFn<any, TArgs>, args?: TArgs): Promise<Locator>;
}

const fixtures: Fixtures<
  PlaywrightTestArgs & PlaywrightTestOptions & ExtendedFixture,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions & { _ctWorker: { context: BrowserContext | undefined; hash: string } },
  {
    _contextFactory: (options?: BrowserContextOptions) => Promise<BrowserContext>;
    _contextReuseMode: string;
  }
> = {
  _contextReuseMode: 'when-possible',

  serviceWorkers: 'block',

  _ctWorker: [{ context: undefined, hash: '' }, { scope: 'worker' }],

  page: async ({ page }, use) => {
    await (page as any)._wrapApiCall(async () => {
      await page.exposeFunction('__ct_dispatch', (ordinal: number, args: any[]) => {
        boundCallbacksForMount[ordinal](...args);
      });
    }, true);
    await use(page);
  },

  mount: async ({ page }, use, info) => {
    // @ts-expect-error ts overrides
    await use(async (composedStory, args) => {
      const storyId = composedStory as unknown as string;
      boundCallbacksForMount = [];
      if (args) wrapFunctions(args, page, boundCallbacksForMount);

      if (typeof storyId !== 'string') throw new Error(`Unexpected story id: ${storyId}`);

      const config = (info as any)._configInternal.config as PlaywrightTestConfig;
      if (!config.webServer) throw new Error('webServer config is missing');
      const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
      const url = server.url || `http://localhost:${server.port}`;

      await page.goto(new URL('iframe.html', url).toString());

      await page.evaluate(
        async ({ storyId, args }) => {
          const channel = __STORYBOOK_ADDONS_CHANNEL__;
          /**
           * Perform a function that updates the story store and wait for the story to render
           * or error
           */
          const waitForStoryRender = async (updateFn: () => void) =>
            new Promise<void>((resolve, reject) => {
              channel.once('storyRendered', () => resolve());
              channel.once('storyUnchanged', () => resolve());
              channel.once('storyErrored', (error) => reject(error));
              channel.once('storyThrewException', (error) => reject(error));
              channel.once('playFunctionThrewException', (error) => reject(error));
              channel.once('storyMissing', (id) => id === storyId && reject(new Error(`Missing story ${id}`)));
              updateFn();
            });

          const unwrapFunctions = (object: any) => {
            for (const [key, value] of Object.entries(object)) {
              if (typeof value === 'string' && (value as string).startsWith('__pw_func_')) {
                const ordinal = Number(value.substring('__pw_func_'.length));
                object[key] = (...args: any[]) => {
                  (window as any).__ct_dispatch(ordinal, args);
                };
              } else if (typeof value === 'object' && value) {
                unwrapFunctions(value);
              }
            }
          };

          await waitForStoryRender(() => channel.emit('setCurrentStory', { storyId, viewMode: 'story' }));
          if (args) {
            unwrapFunctions(args);
            const updatedArgs = args;
            await waitForStoryRender(() => {
              channel.emit('updateStoryArgs', {
                storyId,
                updatedArgs,
              });
            });
          }
        },
        { storyId, args }
      );
      return page.locator('#storybook-root');
    });
  },
};

function wrapFunctions(object: any, page: Page, callbacks: Function[]) {
  for (const [key, value] of Object.entries(object)) {
    const type = typeof value;
    if (type === 'function') {
      const functionName = `__pw_func_${callbacks.length}`;
      callbacks.push(value as Function);
      object[key] = functionName;
    } else if (type === 'object' && value) {
      wrapFunctions(value, page, callbacks);
    }
  }
}

const defineConfig: typeof originalDefineConfig = (config: PlaywrightTestConfig) => {
  const original = originalDefineConfig({
    globalSetup: path.join(__dirname, 'global-setup.js'),
    ...config,
  });

  // @ts-expect-error
  const pwTestConfig = original['@playwright/test'];
  return {
    ...original,
    '@playwright/test': {
      ...pwTestConfig,
      babelPlugins: [...(pwTestConfig?.babelPlugins || []), [path.join(__dirname, 'ct-test-plugin.js')]],
    },
  };
};

// @ts-expect-error WTH
const test = baseTest.extend(fixtures);

export { test, expect, devices, defineConfig };

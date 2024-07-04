## Get Started

> Requirements: Storybook v8

```ts
// playwright-ct.config.ts
import { defineConfig } from 'storybook-playwright-ct';

export default defineConfig({
  testMatch: '**/*.stories.spec.{ts,tsx}',
  webServer: {
    command: 'npm run storybook',
    url: 'http://localhost:6006/',
    reuseExistingServer: true,
  },
});
```

```ts
// stories/Button.stories.spec.ts
import { composeStories } from '@storybook/react';
import { expect, test } from 'storybook-playwright-ct';
import * as stories from './Button.stories';

const { Primary } = composeStories(stories);

test('A', async ({ mount }) => {
  const component = await mount(Primary);

  await expect(component).toHaveScreenshot();
});
```

```json
{
  "scripts": {
    "test:ct": "playwright test --config playwright-ct.config.ts"
  }
}
```

## Credits

- Playwright CT: https://playwright.dev/docs/test-components
- Prior art: https://github.com/storybookjs/playwright-ct

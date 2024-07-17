## Get Started

> [!IMPORTANT]  
> Requirements:
> **`storybook`** v8

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
// stories/Button.stories.spec.tsx
import { composeStories } from '@storybook/react';
import { expect, test } from 'storybook-playwright-ct';
import * as stories from './Button.stories';

const { Primary } = composeStories(stories);

test('Screenshot', async ({ mount }) => {
  const component = await mount(<Primary />);

  await expect(component).toHaveScreenshot();
});

test('Event callback', async ({ mount }) => {
  let eventType;
  const component = await mount(<Primary onClick={(ev) => (eventType = ev.type)} />);

  await component.click();
  await expect(eventType).toBe('click');
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

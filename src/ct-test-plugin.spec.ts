import babel from '@babel/core';
import { it, expect, vi } from 'vitest';
import plugin from './ct-test-plugin';

vi.mock('./global-setup', () => ({
  lookupTitle: () => 'lookup-title',
}));

function transformCode(input: string): babel.BabelFileResult | null {
  return babel.transform(input, { filename: '/e2e/stories.spec.tsx', plugins: [plugin] });
}

it('should remove stories imports', () => {
  expect(
    transformCode(`
      import { test, expect } from '../src/ct';
      import * as PageStories from '../src/stories/Page.stories';
    `)?.code
  ).toMatchInlineSnapshot(`"import { test, expect } from '../src/ct';"`);
});

it('should remove portable stories declarations', () => {
  expect(
    transformCode(`
      import { composeStory, composeStories } from '@storybook/react';
      import { test, expect } from '../src/ct';
      import * as stories from '../src/stories/Page.stories';
      import Meta, { Dashed as DashedStory } from '../src/stories/Page.stories';

      const { Primary, Secondary } = composeStories(stories);
      const portableStories = composeStories(stories);
      const Dashed = composeStory(DashedStory, Meta);
    `)?.code
  ).toMatchInlineSnapshot(`
      "import { composeStory, composeStories } from '@storybook/react';
      import { test, expect } from '../src/ct';"
    `);
});

it('should transform simple component', () => {
  expect(
    transformCode(`
      import { composeStory, composeStories } from '@storybook/react';
      import { test, expect } from '../src/ct';
      import * as stories from '../src/stories/Page.stories';

      const { Primary, Secondary } = composeStories(stories);

      test('login', async ({ mount }) => {
        const component = await mount(Primary);
        const login = await component.getByRole('button');
      });
    `)?.code
  ).toMatchInlineSnapshot(`
      "import { composeStory, composeStories } from '@storybook/react';
      import { test, expect } from '../src/ct';
      test('login', async ({
        mount
      }) => {
        const component = await mount({
          id: "lookup-title--primary"
        });
        const login = await component.getByRole('button');
      });"
    `);
});

it('should transform renamed component', () => {
  expect(
    transformCode(`
      import { composeStory, composeStories } from '@storybook/react';
      import { test, expect } from '../src/ct';
      import * as stories from '../src/stories/Page.stories';

      const { Primary: NewPrimary, Secondary } = composeStories(stories);

      test('login', async ({ mount }) => {
        const component = await mount(NewPrimary);
        const login = await component.getByRole('button');
      });
    `)?.code
  ).toMatchInlineSnapshot(`
      "import { composeStory, composeStories } from '@storybook/react';
      import { test, expect } from '../src/ct';
      test('login', async ({
        mount
      }) => {
        const component = await mount({
          id: "lookup-title--primary"
        });
        const login = await component.getByRole('button');
      });"
    `);
});

// it('story export', () => {
//   const input = dedent`
//       import { test, expect } from '../src/ct';
//       import { LoggedOut } from '../src/stories/Page.stories';

//       test('login', async ({ mount }) => {
//         const page = await mount(LoggedOut);
//         const login = await page.getByRole('button', { name: 'Log in' });
//       });
//     `;
//   const result = babel.transform(input, { plugins: [plugin] });
//   expect(result?.code).toMatchInlineSnapshot(`
//     "import { test, expect } from '../src/ct';
//     ;
//     test('login', async ({
//       mount
//     }) => {
//       const page = await mount(\\"lookup-title--logged-out\\");
//       const login = await page.getByRole('button', {
//         name: 'Log in'
//       });
//     });"
//   `);
// });

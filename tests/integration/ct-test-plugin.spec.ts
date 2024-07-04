/// <reference lib="ES2021.String" />
import path from 'node:path';
import { expect, it } from 'vitest';

require.cache[path.resolve(__dirname, '../../node_modules/storybook-playwright-ct/dist/global-setup.js')] = {
  exports: {
    lookupTitle: (filename: string) => filename,
  },
} as NodeModule;

const playwrightPkg = path.dirname(require.resolve('playwright', { paths: [require.resolve('@playwright/test')] }));
// babelTransform(originalCode, filename, isTypeScript, !!moduleUrl, pluginsPrologue, pluginsEpilogue)
const { babelTransform } = require(`${playwrightPkg}/lib/transform/babelBundle`);

function transformCode(input: string): string | undefined {
  const { code } = babelTransform(
    input,
    '/tests/index.spec.tsx',
    true,
    false,
    [[path.resolve(__dirname, '../../node_modules/storybook-playwright-ct/dist/ct-test-plugin.js')]],
    []
  ) as babel.BabelFileResult;
  return code?.slice(0, code.indexOf('\n//# sourceMappingURL')).replaceAll(playwrightPkg, 'playwright');
}

it('should transform portable stories', () => {
  expect(
    transformCode(`
      import { composeStories } from '@storybook/react';
      import { expect, test } from 'storybook-playwright-ct';
      import * as stories from '../../stories/Button.stories';

      const { Primary, Secondary } = composeStories(stories);

      test('Simplest usage', async ({ mount }) => {
        const component = await mount(Primary);
      });
    `)
  ).toMatchInlineSnapshot(`
    ""use strict";

    var _react = require("@storybook/react");
    var _storybookPlaywrightCt = require("storybook-playwright-ct");
    (0, _storybookPlaywrightCt.test)('Simplest usage', async ({
      mount
    }) => {
      const component = await mount("stories-button-stories--primary");
    });"
  `);
});

it('should transform jsx', () => {
  expect(
    transformCode(`
      import { composeStories } from '@storybook/react';
      import { expect, test } from 'storybook-playwright-ct';
      import * as stories from '../../stories/Button.stories';

      const { Primary, Secondary } = composeStories(stories);

      test('JSX', async ({ mount }) => {
        const component = await mount(<Primary backgroundColor="lightblue" disabled min={0} />);
      });
    `)
  ).toMatchInlineSnapshot(`
    ""use strict";

    var _react = require("@storybook/react");
    var _storybookPlaywrightCt = require("storybook-playwright-ct");
    (0, _storybookPlaywrightCt.test)('JSX', async ({
      mount
    }) => {
      const component = await mount("stories-button-stories--primary", {
        backgroundColor: "lightblue",
        disabled: true,
        min: 0
      });
    });"
  `);
});

it('should transform jsx with spread', () => {
  expect(
    transformCode(`
      import { composeStories } from '@storybook/react';
      import { expect, test } from 'storybook-playwright-ct';
      import * as stories from '../../stories/Button.stories';

      const { Primary, Secondary } = composeStories(stories);
      const props = { size: 'large' };

      test('JSX', async ({ mount }) => {
        const component = await mount(<Primary backgroundColor="lightblue" {...props} />);
      });
    `)
  ).toMatchInlineSnapshot(`
    ""use strict";

    var _react = require("@storybook/react");
    var _storybookPlaywrightCt = require("storybook-playwright-ct");
    const props = {
      size: 'large'
    };
    (0, _storybookPlaywrightCt.test)('JSX', async ({
      mount
    }) => {
      const component = await mount("stories-button-stories--primary", {
        backgroundColor: "lightblue",
        ...props
      });
    });"
  `);
});

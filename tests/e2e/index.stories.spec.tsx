import React from 'react';
import { composeStories } from '@storybook/react';
import { expect, test } from '../../node_modules/storybook-playwright-ct/dist';
import * as stories from '../../stories/Button.stories';

const { Primary, Secondary, Large } = composeStories(stories);

test('Simplest usage', async ({ mount }) => {
  const component = await mount(Primary);

  await expect(component.innerHTML()).resolves.toBe(
    '<button type="button" class="storybook-button storybook-button--medium storybook-button--primary">Button</button>'
  );
});

test('Pass serializable args', async ({ mount }) => {
  const component = await mount(Primary, {
    primary: false,
    label: 'Hello',
    size: 'small',
  });

  await expect(component.innerHTML()).resolves.toBe(
    '<button type="button" class="storybook-button storybook-button--small storybook-button--secondary">Hello</button>'
  );
});

test('Pass callbacks', async ({ mount }) => {
  let called = false;
  const component = await mount(Secondary, {
    onClick: () => {
      called = true;
    },
  });

  expect(called).toBeFalsy();
  await component.click();
  expect(called).toBeTruthy();
});

test('JSX', async ({ mount }) => {
  let called = false;
  const component = await mount(
    <Large
      backgroundColor="lightblue"
      onClick={() => {
        called = true;
      }}
    />
  );

  await expect(component.locator(':first-child')).toHaveJSProperty('style.backgroundColor', 'lightblue');

  expect(called).toBeFalsy();
  await component.click();
  expect(called).toBeTruthy();
});

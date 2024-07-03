import path from 'node:path';
import type { PlaywrightTestConfig } from '@playwright/test';
import type { IndexEntry, StoryIndex } from '@storybook/types';

let indexEntries: IndexEntry[] = [];

export const lookupTitle = (filename: string) => {
  const relativePath = `./${path.relative(process.cwd(), filename)}`;
  const entry = indexEntries.find((entry) => entry.importPath.startsWith(relativePath));
  if (!entry) {
    throw new Error(`Could not find title for ${relativePath} in ${indexEntries.map((entry) => entry.importPath)}`);
  }
  return entry.title;
};

// Set up the path => title index
const setup = async (config: PlaywrightTestConfig) => {
  const webServerUrl = Array.isArray(config.webServer) ? config.webServer[0].url : config.webServer?.url;
  const url = new URL('index.json', webServerUrl).toString();
  // console.log('Fetching...', url);
  const index = (await fetch(url).then((res) => res.json())) as StoryIndex;
  const visited = new Set<string>();
  indexEntries = Object.values(index.entries).filter(({ importPath }) =>
    visited.has(importPath) ? false : (visited.add(importPath), true)
  );
};

export default setup;

import { resolve, dirname } from 'node:path';
import type { PluginObj, PluginPass } from '@babel/core';
import type * as BabelTypes from '@babel/types';
import { storyNameFromExport, toId } from '@storybook/csf';
import { lookupTitle } from './global-setup';

const STORIES_REGEX = /\.(story|stories)(\..*)?$/;
const PORTABLE_FN_REGEX = /^compose(Story|Stories)$/;

interface StoryImport {
  exportName?: string;
  path: string;
}

interface PortableStory {
  import: StoryImport;
  storyName?: string;
}

interface CustomState extends PluginPass {
  storyImports?: Record<string, StoryImport>;
  portableStories?: Record<string, PortableStory>;
}

const findImport = (storyImports: Record<string, StoryImport>, name: string): StoryImport => {
  const storyImport = storyImports[name];
  if (!storyImport) {
    throw new Error(`Could not find story import for ${name}`);
  }
  return storyImports[name];
};

export default function (babelContext: { types: typeof BabelTypes }): PluginObj<CustomState> {
  const { types: t } = babelContext;
  return {
    visitor: {
      Program: {
        enter(_path, state) {
          state.storyImports = {};
          state.portableStories = {};
        },
      },
      ImportDeclaration: {
        enter(path, state) {
          if (t.isStringLiteral(path.node.source) && STORIES_REGEX.test(path.node.source.value)) {
            path.node.specifiers.forEach((specifier) => {
              const storyImport: StoryImport = { path: path.node.source.value };
              if (t.isImportSpecifier(specifier)) {
                const { imported } = specifier;
                storyImport.exportName = t.isIdentifier(imported) ? imported.name : imported.value;
              }
              state.storyImports![specifier.local.name] = storyImport;
            });
            path.remove();
          }
        },
      },
      VariableDeclaration: {
        enter(path, state) {
          for (const { id, init } of path.node.declarations) {
            if (!t.isCallExpression(init) || !t.isIdentifier(init.callee) || !PORTABLE_FN_REGEX.test(init.callee.name))
              continue;
            const csfExports = init.arguments[0];
            if (!t.isIdentifier(csfExports)) continue;
            const storyImport = state.storyImports![csfExports.name];
            if (!storyImport) continue;

            if (t.isIdentifier(id)) {
              state.portableStories![id.name] = {
                import: storyImport,
              };
            } else if (t.isObjectPattern(id)) {
              id.properties.forEach((property) => {
                if (t.isObjectProperty(property) && t.isIdentifier(property.key) && t.isIdentifier(property.value)) {
                  state.portableStories![property.value.name] = {
                    import: storyImport,
                    storyName: property.key.name,
                  };
                }
              });
            } else {
              continue;
            }
            path.remove();
          }
        },
      },
      CallExpression: {
        enter(path, state) {
          if (
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === 'mount' &&
            path.node.arguments.length >= 1 &&
            !t.isStringLiteral(path.node.arguments[0])
          ) {
            const arg0 = path.node.arguments[0];
            let exportName;
            let importPath;
            if (t.isIdentifier(arg0)) {
              const storyImport = findImport(state.storyImports!, arg0.name);
              ({ exportName, path: importPath } = storyImport);
            } else if (t.isMemberExpression(arg0) && t.isIdentifier(arg0.object) && t.isIdentifier(arg0.property)) {
              exportName = arg0.property.name;
              const storyImport = findImport(state.storyImports!, arg0.object.name);
              importPath = storyImport.path;
            }
            if (exportName && importPath && state.filename) {
              const storyPath = resolve(dirname(state.filename), importPath);
              const title = lookupTitle(storyPath);
              path.node.arguments[0] = t.stringLiteral(toId(title, storyNameFromExport(exportName)));
            } else {
              throw new Error(`Could not find story import for ${arg0}`);
            }
          }
        },
      },
    },
  };
}

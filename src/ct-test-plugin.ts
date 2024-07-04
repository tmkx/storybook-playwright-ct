import { resolve, dirname } from 'node:path';
import type { PluginObj, PluginPass } from '@babel/core';
import type * as BabelCore from '@babel/core';
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
  storyName: string;
}

interface CustomState extends PluginPass {
  storyImports?: Record<string, StoryImport>;
  portableStories?: Record<string, PortableStory>;
}

export default function (babelContext: typeof BabelCore): PluginObj<CustomState> {
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
            for (const specifier of path.node.specifiers) {
              const storyImport: StoryImport = { path: path.node.source.value };
              if (t.isImportSpecifier(specifier)) {
                const { imported } = specifier;
                storyImport.exportName = t.isIdentifier(imported) ? imported.name : imported.value;
              }
              state.storyImports![specifier.local.name] = storyImport;
            }
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
              // const portableStories = composeStories(stories)
              state.portableStories![id.name] = {
                import: storyImport,
                storyName: id.name,
              };
            } else if (t.isObjectPattern(id)) {
              // const { Primary } = composeStories(stories)
              for (const property of id.properties) {
                if (t.isObjectProperty(property) && t.isIdentifier(property.key) && t.isIdentifier(property.value)) {
                  state.portableStories![property.value.name] = {
                    import: storyImport,
                    storyName: property.key.name,
                  };
                }
              }
            } else {
              continue;
            }
            path.remove();
          }
        },
      },
      CallExpression: {
        enter(path, state) {
          if (!state.filename) throw new Error(`filename is undefined`);
          if (
            !t.isIdentifier(path.node.callee) ||
            path.node.callee.name !== 'mount' ||
            path.node.arguments.length === 0
          )
            return;

          const componentArg = path.node.arguments[0];

          let portableStoryName!: string;
          let storyName: string | undefined;
          if (t.isIdentifier(componentArg)) {
            // mount(Primary)
            portableStoryName = componentArg.name;
          } else if (
            t.isMemberExpression(componentArg) &&
            t.isIdentifier(componentArg.object) &&
            t.isIdentifier(componentArg.property)
          ) {
            // mount(portableStories.Primary)
            portableStoryName = componentArg.object.name;
            storyName = componentArg.property.name;
          } else if (t.isJSXElement(componentArg) && t.isJSXIdentifier(componentArg.openingElement.name)) {
            // mount(<Primary />)
            portableStoryName = componentArg.openingElement.name.name;
            path.node.arguments[1] = jsxAttributesToObject(babelContext, componentArg);
          } else return;

          const portableStory = state.portableStories![portableStoryName];
          if (!portableStory) throw new Error(`Could not find story import for ${portableStoryName}`);
          const {
            import: { path: importPath, exportName },
            storyName: defaultStoryName,
          } = portableStory;

          const storyPath = resolve(dirname(state.filename), importPath);
          const title = lookupTitle(storyPath);

          path.node.arguments[0] = t.stringLiteral(
            toId(title, storyNameFromExport(exportName ?? storyName ?? defaultStoryName))
          );
        },
      },
    },
  };
}

function jsxAttributesToObject(
  { types: t }: typeof BabelCore,
  jsxElement: BabelCore.types.JSXElement
): BabelCore.types.Expression {
  return t.objectExpression([
    ...jsxElement.openingElement.attributes
      .map((attr) => {
        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
          // <JSX type="button" />
          if (t.isExpression(attr.value)) return t.objectProperty(t.identifier(attr.name.name), attr.value);
          // <JSX min={0} />
          else if (t.isJSXExpressionContainer(attr.value) && !t.isJSXEmptyExpression(attr.value.expression))
            return t.objectProperty(t.identifier(attr.name.name), attr.value.expression);
          // <JSX disabled />
          else if (!attr.value) return t.objectProperty(t.identifier(attr.name.name), t.booleanLiteral(true));
        } else if (t.isJSXSpreadAttribute(attr)) {
          // <JSX {...props} />
          return t.spreadElement(attr.argument);
        }
        return null;
      })
      .filter((v): v is Exclude<typeof v, null> => !!v),
  ]);
}

import { createRequire } from 'node:module';

// Use the same JSX parser as R15, without changing the miniprogram sources.
const ts = createRequire(new URL('../../miniprogram/package.json', import.meta.url))('typescript');
const controlTags = new Set(['input', 'select', 'textarea', 'button', 'MenuSelect', 'Select']);

export function scanLabelControls(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse label audit source: ${file}`);
  const fields = [], wrappers = [];
  function visit(node) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(source);
      if (tag === 'label' || tag === 'ControlField') {
        const controls = [];
        function find(child) {
          if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) {
            const name = child.tagName.getText(source);
            if (controlTags.has(name)) controls.push({
              tag: name,
              type: child.attributes.properties.find(attr => attr.name?.getText(source) === 'type')?.initializer?.text,
            });
          }
          ts.forEachChild(child, find);
        }
        node.children.forEach(find);
        const row = { file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, controls };
        if (tag === 'ControlField') fields.push(row);
        else if (controls.length) wrappers.push(row);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { fields, wrappers };
}

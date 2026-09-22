import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEpsFontSubsetNames, preserveEpsTextBoundaries } from '../src/eps.js';

function font(name, id, { glyph = 'uni03B1', hex = '00010000' } = {}) {
  return `%%BeginResource: font ${name}
11 dict begin
/FontType 42 def
/FontName /${name} def
/PaintType 0 def
/FontMatrix [ 1 0 0 1 0 0 ] def
/FontBBox [ 0 0 0 0 ] def
/Encoding 256 array def
0 1 255 { Encoding exch /.notdef put } for
Encoding 1 /${glyph} put
/CharStrings 2 dict dup begin
/.notdef 0 def
/${glyph} 1 def
end readonly def
/sfnts [
<${hex}>
] def
/${id} currentdict end definefont pop
%%EndResource
`;
}
const wrap = resources => `%!PS-Adobe-3.0 EPSF-3.0
%%Creator: cairo 1.16.0 (https://cairographics.org)
%%Title: 中文图稿
%%BoundingBox: 0 0 100 100
%%BeginSetup
${resources}%%EndSetup
10 20 moveto
showpage
%%Trailer
%%EOF
`;
const normalize = normalizeEpsFontSubsetNames;

const textEps = body => `%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: cairo 1.16.0\n%%BeginProlog\n/BT { } bind def\n/ET { } bind def\n%%EndProlog\n%%Page: 1 1\n${body}\nshowpage\n%%Trailer\n%%EOF\n`;
test('text boundaries mark separate Cairo text blocks without painting or changing their bytes', () => {
  for (const newline of ['\n', '\r\n']) {
    const original = textEps('BT\n(Measurement) Tj\nET\nBT\n(Temperature) Tj\nET').replaceAll('\n', newline);
    const result = preserveEpsTextBoundaries(original);
    assert.equal(result.textBlocks, 2);
    assert.equal(result.eps.split('[ /TuyanLabel /BMC pdfmark').length - 1, 2);
    assert.equal(result.eps.split('[ /EMC pdfmark').length - 1, 2);
    const restored = result.eps.replaceAll(`/pdfmark where {pop} { /pdfmark {cleartomark} bind def } ifelse${newline}`, '').replaceAll(`[ /TuyanLabel /BMC pdfmark${newline}`, '').replaceAll(`[ /EMC pdfmark${newline}`, '');
    assert.equal(restored, original);
    assert.throws(() => preserveEpsTextBoundaries(result.eps), { code: 'FIGURE_EPS_TEXT_BOUNDARY_INVALID' });
  }
  const noText = textEps('0 0 moveto 10 10 lineto stroke');
  assert.deepEqual(preserveEpsTextBoundaries(noText), { eps: noText, textBlocks: 0 });
  assert.equal(preserveEpsTextBoundaries(textEps('BT\n(pdfmark TuyanLabel BT ET) Tj\nET')).textBlocks, 1);
  const image = 'cairo_image\nBT\nET\n~>\nBT\n(Label)Tj\nET';
  const imageResult = preserveEpsTextBoundaries(textEps(image));
  assert.equal(imageResult.textBlocks, 1);
  assert.ok(imageResult.eps.includes('cairo_image\nBT\nET\n~>'));
});

test('text boundary state machine rejects nested, unclosed, mismatched and out-of-page operators', () => {
  for (const body of ['BT\nBT\nET\nET', 'BT', 'ET', 'BT\nshowpage\nET', 'showpage\nBT\nET', 'BT ET', '/BT { } def\nBT\nET', 'cairo_image\nBT\nET', 'cairo_image\n~>extra', 'BT\ncairo_image\n~>\nET']) {
    assert.throws(() => preserveEpsTextBoundaries(textEps(body)), { code: 'FIGURE_EPS_TEXT_BOUNDARY_INVALID' });
  }
  for (const original of [null, '', textEps('BT\nET').replace('cairo', 'other'), textEps('BT\nET').replace('%%EndProlog', ''), textEps('BT\nET').replace('%%Page: 1 1', '%%Page: 1 1\n%%Page: 2 2'), textEps('BT\nET').replace('%%EOF', ''), textEps('BT\nET').replace('/BT { } bind def', '/BT { paint } bind def')]) {
    assert.throws(() => preserveEpsTextBoundaries(original), { code: 'FIGURE_EPS_TEXT_BOUNDARY_INVALID' });
  }
});

test('different Type42 subsets with the same name receive unique standard subset identities', () => {
  const input = wrap(font('LiberationSans', 'f-0-0') + font('LiberationSans', 'f-0-1', { glyph: 'uni03B2', hex: '00010002' }));
  const result = normalize(input);
  assert.deepEqual(result.renamedFonts, [
    { resourceName: 'f-0-0', oldName: 'LiberationSans', newName: 'AAAAAA+LiberationSans' },
    { resourceName: 'f-0-1', oldName: 'LiberationSans', newName: 'AAAAAB+LiberationSans' },
  ]);
  const restored = result.renamedFonts.reduce((text, item) => text.replace(`/FontName /${item.newName} def`, `/FontName /${item.oldName} def`), result.eps);
  assert.equal(restored, input, 'All bytes except the declared FontName tokens must survive');
  assert.deepEqual(normalize(result.eps), { eps: result.eps, renamedFonts: [] });
  assert.deepEqual(normalize(input), result, 'Names must be deterministic');
});

test('unique resources and documents without text remain byte-for-byte unchanged', () => {
  for (const input of [wrap(''), wrap(font('LiberationSans', 'f-0-0') + font('WenQuanYiMicroHei', 'f-1-0'))]) {
    assert.deepEqual(normalize(input), { eps: input, renamedFonts: [] });
  }
});

test('new identities avoid every existing name, including resources appearing later', () => {
  const input = wrap(font('LiberationSans', 'f-0-0') + font('LiberationSans', 'f-0-1') + font('AAAAAA+LiberationSans', 'f-0-2'));
  const result = normalize(input);
  assert.deepEqual(result.renamedFonts.map(item => item.newName), ['AAAAAB+LiberationSans', 'AAAAAC+LiberationSans']);
  assert.equal(result.eps.match(/\/FontName \/AAAAAA\+LiberationSans def/g).length, 1);
  assert.deepEqual(normalize(result.eps), { eps: result.eps, renamedFonts: [] });
});

test('duplicate already prefixed identities keep the original font family', () => {
  const result = normalize(wrap(font('ABCDEF+LiberationSans', 'f-0-0') + font('ABCDEF+LiberationSans', 'f-0-1')));
  assert.deepEqual(result.renamedFonts.map(item => item.newName), ['AAAAAA+LiberationSans', 'AAAAAB+LiberationSans']);
  assert.equal(normalize(result.eps).renamedFonts.length, 0);
});

test('CRLF and multichunk hexadecimal sfnts bytes are preserved', () => {
  const input = wrap(font('LiberationSans', 'f-0-0', { hex: '0001>\n<0203' }) + font('LiberationSans', 'f-0-1')).replaceAll('\n', '\r\n');
  const result = normalize(input);
  assert.ok(result.eps.includes('<0001>\r\n<0203>'));
  assert.equal(result.eps.replace(/\/FontName \/[A-Z]{6}\+LiberationSans def/g, '/FontName /LiberationSans def'), input);
});

test('non-EPS and missing Cairo provenance fail closed', () => {
  for (const input of [null, 1, '<svg/>', '%!PS\n%%EOF\n', wrap('').replace('%%Creator: cairo', '%%Creator: other'), wrap('').replace('%%EOF', '')]) {
    assert.throws(() => normalize(input), { code: 'FIGURE_EPS_FONT_SUBSET_INVALID' });
  }
});

test('malformed or unsupported font resources fail closed instead of broad text replacement', () => {
  const original = wrap(font('LiberationSans', 'f-0-0'));
  const invalid = [
    original.replace('/FontType 42 def', '/FontType 3 def'),
    original.replace('/FontType 42 def', '/FontType 1 def'),
    original.replace('/FontName /LiberationSans def', '/FontName /Unsafe(name) def'),
    original.replace('/FontName /LiberationSans def', '/FontName /LiberationSans def\n/FontName /Other def'),
    original.replace('%%EndResource\n', ''),
    original.replace('11 dict begin', '%%BeginResource: font Other\n11 dict begin'),
    original.replace('<00010000>', '<nothex>'),
    original.replace('<00010000>', '<000>'),
    original.replace('Encoding 1 /uni03B1 put', 'Encoding 256 /uni03B1 put'),
    original.replace('Encoding 1 /uni03B1 put', 'Encoding 1 /uni03B1 put\nEncoding 1 /uni03B1 put'),
    original.replace('Encoding 1 /uni03B1 put', 'Encoding 1 /missing put'),
    original.replace('/CharStrings 2 dict', '/CharStrings 3 dict'),
    original.replace('] def', '] def\n(evil) run'),
    original.replace('%%BeginResource: font LiberationSans', '%%BeginResource: font'),
    original.replace('%%BeginResource: font LiberationSans', '%%BeginResource: procset Other'),
    original.replace('%%EndSetup', '/FontName /Outside def\n%%EndSetup'),
    wrap(font('LiberationSans', 'f-0-0') + font('LiberationSans', 'f-0-0')),
  ];
  for (const input of invalid) assert.throws(() => normalize(input), { code: 'FIGURE_EPS_FONT_SUBSET_INVALID' });
});

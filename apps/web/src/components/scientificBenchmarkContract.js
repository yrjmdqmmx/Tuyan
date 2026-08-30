const generationAxes = Object.freeze([
  'scientific_faithfulness', 'structural_topology', 'text_symbol_accuracy', 'quantitative_accuracy',
  'instruction_adherence', 'readability_visual_hierarchy', 'information_density', 'publication_aesthetics',
])

const editAxes = (first) => Object.freeze([
  first, 'instruction_adherence', 'readability_visual_hierarchy', 'publication_aesthetics',
  'edit_target_accuracy', 'non_target_preservation',
].filter((axis, index, all) => all.indexOf(axis) === index))

export const SCIENTIFIC_WEB_CONTRACT = Object.freeze({
  identity: Object.freeze({
    suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2', evaluationEpoch: 'codex-scientific-2026-09-v1',
    reviewProtocol: 'codex-independent-double-review-v2', presentationVersion: 'scientific-leaderboard-v2',
  }),
  axes: Object.freeze([
    ...generationAxes, 'edit_target_accuracy', 'non_target_preservation',
  ]),
  suiteId: 'pb-scientific-figure-v2',
  suiteHash: '127b032a63fc0ffa0a0c540c65064842d5f17cc482ae0de3ef030af2dff3660a',
  cases: Object.freeze([
    Object.freeze({ id: 'scientific-gen-01-method-flow', kind: 'generation', manifestHash: '7b6f99a44979ee780eaf3f1d963406aa3d69308730ecb5a9a4bb4c2f22b7134e', applicableAxes: generationAxes }),
    Object.freeze({ id: 'scientific-gen-02-biological-pathway', kind: 'generation', manifestHash: '06caf64becd08f55d1d1895c04d793d8d8b56f6bf4bae03373c76b1fabcc90ee', applicableAxes: generationAxes }),
    Object.freeze({ id: 'scientific-gen-03-model-architecture', kind: 'generation', manifestHash: 'a81b89fc20982e757af9bef99049bf165e1bcc8d7562c524355848f7c9ed390d', applicableAxes: generationAxes }),
    Object.freeze({ id: 'scientific-gen-04-quantitative-panels', kind: 'generation', manifestHash: 'c2f8c6e185e69204de47d1f6a2ab14e2be22e1d684957060db085abebe75993d', applicableAxes: generationAxes }),
    Object.freeze({ id: 'scientific-gen-05-math-bilingual', kind: 'generation', manifestHash: '1e116c51daee39af8160e3826ef9d3240741e9c16c7897e8c7aaab1b9e0cd435', applicableAxes: generationAxes }),
    Object.freeze({ id: 'scientific-gen-06-controls-negative-constraints', kind: 'generation', manifestHash: '0cdfe34be61e35d653cb248dd3c4629cec437d64acb47f1704826ae7d763e47e', applicableAxes: generationAxes }),
    Object.freeze({ id: 'scientific-edit-01-text-label', kind: 'edit', manifestHash: 'c498b55f45cff01610a8cbad2e069095ca8f369f922f48c2df91798065c09c0a', applicableAxes: editAxes('text_symbol_accuracy'), sourceHash: '484ca42fba92295797cf8875ac8c2a8e80edf242bc9710e6b9fb23aa1b24a0f3', region: '01-text-label' }),
    Object.freeze({ id: 'scientific-edit-02-node-arrow', kind: 'edit', manifestHash: '638df9e8e7f40a27871e82a5585097c631a8ed986203f9cb6435482c48abf16f', applicableAxes: editAxes('structural_topology'), sourceHash: '484ca42fba92295797cf8875ac8c2a8e80edf242bc9710e6b9fb23aa1b24a0f3', region: '02-node-arrow' }),
    Object.freeze({ id: 'scientific-edit-03-color-legend-callout', kind: 'edit', manifestHash: '2ee66bb919e25139ec21bc3d8167cea71ababa5b9cbd56a9eb0637b152e814fb', applicableAxes: editAxes('publication_aesthetics'), sourceHash: '484ca42fba92295797cf8875ac8c2a8e80edf242bc9710e6b9fb23aa1b24a0f3', region: '03-color-legend-callout' }),
  ]),
})

export const SCIENTIFIC_CASE_BY_ID = new Map(SCIENTIFIC_WEB_CONTRACT.cases.map((item) => [item.id, item]))

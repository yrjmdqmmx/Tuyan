import { FIGURE_TYPES, FIGURE_GROUPS, TAXONOMY_VERSION, ANALYSIS_METHODS, LEGACY_CATEGORIES, figureContract } from '../../figure-taxonomy/src/index.js';
import { CATEGORY_CATALOG } from './catalog.js';

export const FIGURE_TAXONOMY = {
  version: TAXONOMY_VERSION,
  sourceLocale: 'zh-CN',
  groups: FIGURE_GROUPS,
  types: FIGURE_TYPES,
  analysisMethods: ANALYSIS_METHODS,
  legacyAliases: LEGACY_CATEGORIES,
  contracts: Object.fromEntries(FIGURE_TYPES.map(type => [type.id, {
    ...figureContract({ figureTypeId: type.id }),
    availableVariants: type.variants, support: type.support, numericFields: type.numericFields,
    analysisMethods: ANALYSIS_METHODS.filter(method => method.typeId === type.id),
  }])),
  capabilityBoundary: 'A type definition or catalog variant is not proof that the current Agent can render or validate it. Check local capabilities and retain unsupported details.',
};

export function localizedFigureContract(id, locale) {
  const source = FIGURE_TAXONOMY.contracts[id];
  if (!source) return { version: TAXONOMY_VERSION, status: 'legacy_unspecified', id, kind: 'data', requirements: ['Choose a concrete quantitative type locally; never invent missing data.'] };
  if (locale === 'zh-CN') return source;
  return {
    version: TAXONOMY_VERSION, id, kind: source.kind,
    definition: CATEGORY_CATALOG['en-US'][id].description,
    reviewRequirements: CATEGORY_CATALOG['en-US'][id].requiredChecks,
    numericFields: source.numericFields,
    evidencePolicy: source.evidencePolicy,
    sourceLocale: 'zh-CN',
    translationBoundary: 'English task summary. canonicalSource retains every authored type-specific constraint, variant, analysis requirement and limitation; translate it locally without weakening its meaning.',
    canonicalSource: source,
  };
}

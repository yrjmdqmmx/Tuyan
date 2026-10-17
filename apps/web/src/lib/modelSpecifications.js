// Generated from packages/types/src/model-specifications.ts
const support = (value) => value === true ? 'supported' : value === false ? 'unsupported' : 'unknown';
const tokenLimit = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
/** Only the served route's capabilities describe Tuyan support, never a name or official modality list. */
export function modelSpecificationSummary(model, profile, role) {
    const caps = model?.capabilities || {};
    const roles = Array.isArray(model?.roles) ? model.roles : null;
    const routeFacts = model?.specificationsByRole?.[role || ''] || model?.specifications;
    const facts = routeFacts?.version === 1 ? routeFacts : undefined;
    const text = roles ? role ? role === 'main' || role === 'vision' : roles.includes('main') || roles.includes('vision') : undefined;
    const imageOutput = !roles ? undefined : !roles.includes('image') || (role && role !== 'image') ? false : caps.imageGeneration === true || caps.imageEditing === true ? true : caps.imageGeneration === false && caps.imageEditing === false ? false : undefined;
    const manufacturer = facts?.manufacturer;
    const channelContext = tokenLimit(facts?.contextWindowTokens);
    const channelInput = tokenLimit(facts?.maxInputTokens);
    // Show input as input, never infer a combined context or inherit manufacturer limits into the route.
    const reference = manufacturer?.identity === 'matched' ? manufacturer : undefined;
    const referenceContext = tokenLimit(reference?.contextWindowTokens);
    const referenceInput = tokenLimit(reference?.maxInputTokens);
    const tokenSummary = channelContext ? { kind: 'context', value: channelContext, origin: 'channel', approximate: facts?.contextWindowApproximate }
        : channelInput ? { kind: 'input', value: channelInput, origin: 'channel', approximate: false }
            : referenceContext ? { kind: 'context', value: referenceContext, origin: 'manufacturer', approximate: reference?.contextWindowApproximate }
                : referenceInput ? { kind: 'input', value: referenceInput, origin: 'manufacturer', approximate: false } : undefined;
    return {
        input: { text: support(roles ? roles.length > 0 : undefined), image: support(caps.referenceImages), audio: 'unsupported', video: 'unsupported' },
        output: { text: support(text), image: support(imageOutput), audio: 'unsupported', video: 'unsupported' },
        reasoning: facts?.reasoning || (profile?.status === 'supported' ? 'supported' : 'unknown'),
        contextApplicable: !roles || text,
        contextWindowTokens: tokenLimit(facts?.contextWindowTokens),
        maxInputTokens: tokenLimit(facts?.maxInputTokens),
        maxOutputTokens: tokenLimit(facts?.maxOutputTokens),
        tokenSummary,
        manufacturer,
        facts,
    };
}
export function formatModelTokens(value) {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value >= 1_000_000 ? value / 1_000_000 : value >= 1_000 ? value / 1_000 : value)}${value >= 1_000_000 ? 'M' : value >= 1_000 ? 'K' : ''} tokens`;
}

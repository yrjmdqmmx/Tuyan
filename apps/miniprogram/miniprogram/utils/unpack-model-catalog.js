"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unpackModelCatalog = unpackModelCatalog;
// Decode only the generated local catalog. Never memoize decoded containers:
// each model must own its arrays/objects, as it did in the original JSON data.
function unpackModelCatalog(data) {
    function expand(index) {
        const node = data.nodes[index];
        if (!Array.isArray(node))
            return node;
        if (node[0] === 1)
            return node.slice(1).map(expand);
        const result = {};
        for (let i = 1; i < node.length; i += 2)
            result[expand(node[i])] = expand(node[i + 1]);
        return result;
    }
    return expand(data.root);
}

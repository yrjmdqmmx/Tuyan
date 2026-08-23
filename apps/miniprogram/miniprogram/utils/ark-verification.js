"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArkVerification = getArkVerification;
exports.setArkProbeResults = setArkProbeResults;
exports.clearArkVerification = clearArkVerification;
const model_routing_1 = require("./model-routing");
const verification = {};
function getArkVerification() { return { ...verification }; }
function setArkProbeResults(results) {
    for (const result of results) {
        if ((result.role === 'main' || result.role === 'image' || result.role === 'vision') && result.modelId) {
            verification[(0, model_routing_1.arkVerificationKey)({ role: result.role, modelId: result.modelId })] = result.state === 'verified' ? 'verified' : 'failed';
        }
    }
}
function clearArkVerification() { for (const key of Object.keys(verification))
    delete verification[key]; }

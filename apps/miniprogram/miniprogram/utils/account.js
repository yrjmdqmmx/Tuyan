"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_CLEAR_STORAGE_KEYS = void 0;
exports.buildDeleteAccountPayload = buildDeleteAccountPayload;
exports.validateDeleteAccountInput = validateDeleteAccountInput;
exports.clearAccountClientState = clearAccountClientState;
exports.ACCOUNT_CLEAR_STORAGE_KEYS = [
    'paperbanana_auth_cookie',
    'paperbanana_mini_jobs',
    'paperbanana_mini_draft',
];
function buildDeleteAccountPayload(email, password) {
    return { email: email.trim(), password };
}
function validateDeleteAccountInput(input) {
    if (input.email.trim().toLocaleLowerCase() !== input.currentEmail.trim().toLocaleLowerCase())
        return '请输入当前账号邮箱。';
    if (!input.password)
        return '请输入当前密码。';
    if (!input.confirmed)
        return '请完成二次确认。';
    return '';
}
function clearAccountClientState(removeStorage, clearMemorySecrets) {
    for (const key of exports.ACCOUNT_CLEAR_STORAGE_KEYS)
        removeStorage(key);
    clearMemorySecrets();
}

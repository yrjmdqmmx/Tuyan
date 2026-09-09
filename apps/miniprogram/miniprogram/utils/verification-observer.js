"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVerificationObserver = createVerificationObserver;
// The caller holds the observation token only in its query closure, never in setData/Storage.
function createVerificationObserver(options) {
    const now = options.now || Date.now;
    const deadline = now() + 3600000;
    const schedule = options.schedule || ((callback) => setInterval(callback, 10000));
    const cancel = options.cancel || ((id) => clearInterval(id));
    let timer;
    let active = false;
    let ended = false;
    let busy = false;
    let epoch = 0;
    function pause() { active = false; epoch++; if (timer !== undefined)
        cancel(timer); timer = undefined; }
    function stop() { pause(); ended = true; }
    async function refresh() {
        if (!active || ended || busy)
            return;
        if (now() >= deadline) {
            stop();
            options.onStatus('expired');
            return;
        }
        const generation = epoch;
        busy = true;
        try {
            const status = await options.query();
            if (!active || ended || generation !== epoch)
                return;
            if (status !== 'pending' && status !== 'verified')
                throw new Error('Invalid observation status');
            if (status === 'verified')
                stop();
            options.onStatus(status);
        }
        catch {
            if (active && !ended && generation === epoch)
                options.onStatus('unavailable');
        }
        finally {
            busy = false;
        }
    }
    async function resume() {
        if (ended)
            return;
        active = true;
        if (timer === undefined)
            timer = schedule(() => { void refresh(); });
        await refresh();
    }
    return { pause, stop, refresh, resume };
}

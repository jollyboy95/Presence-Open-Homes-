// Uses only observed, visible Snug controls. No APIs or application internals.
(() => {
    const preferences = __PREFERENCES__;
    const key = '__presenceFilters'; // Isolated WebKit content world, not Snug's window.
    const path = '/teams/presencepm/viewings/mobile';
    if (location.origin !== 'https://app.snug.com' || location.pathname !== path) return;
    if (window[key]) return; // Once per document: leave later manual choices alone.
    const state = window[key] = { timer: null };
    const report = status => window.webkit?.messageHandlers.presenceFilters.postMessage(status);
    if (!preferences.mine && !preferences.today) return;
    let attempts = 0, opened = false, clickedMe = false, datePhase = 0, stableTicks = 0;
    let originalManager = null, finished = false;
    const visible = e => !!e && e.getClientRects().length > 0;
    const text = e => e.textContent.trim();
    let lastContentChange = performance.now();
    const contentObserver = new MutationObserver(() => { lastContentChange = performance.now(); });
    contentObserver.observe(document.getElementById('app-scrollable-container') || document.body,
        { childList: true, characterData: true, subtree: true });
    const finish = status => {
        if (finished) return;
        finished = true;
        clearInterval(state.timer);
        contentObserver.disconnect();
        document.removeEventListener('pointerdown', manual, true);
        document.removeEventListener('keydown', manual, true);
        report(status);
    };
    const manual = event => {
        if (event.isTrusted && event.target.closest('select, input, textarea, [contenteditable="true"], .textButton')) {
            finish('manual');
        }
    };
    document.addEventListener('pointerdown', manual, true);
    document.addEventListener('keydown', manual, true);
    report('applying');
    const step = () => {
        if (location.origin !== 'https://app.snug.com' || location.pathname !== path) return finish('manual');
        if (++attempts > 80) return finish('unavailable');
        // A viewing/check-in form must never be touched.
        if (document.querySelector('textarea, input[type="email"], input[type="password"]')) return finish('manual');
        const toggles = [...document.querySelectorAll('[data-testid="mobile-viewings-filter-toggle"]')].filter(visible);
        const managers = [...document.querySelectorAll('select[id="select-manager-dropdown"]')].filter(e => {
            const row = e.closest('.display-flex.align-items-center');
            return visible(e) && row && row.querySelectorAll('select').length === 1 &&
                [...row.querySelectorAll('span.textButton')].filter(e => /^(Me|All)$/.test(text(e))).length === 1;
        });
        const dates = [...document.querySelectorAll('select')].filter(e => visible(e) &&
            [...e.options].some(o => text(o) === 'Today only') &&
            [...e.options].some(o => text(o) === 'Select a date'));
        if (managers.length !== 1 || dates.length !== 1) {
            if (!opened && managers.length === 0 && dates.length === 0 && toggles.length === 1) {
                opened = true;
                toggles[0].click();
            }
            return;
        }
        const manager = managers[0], date = dates[0];
        if (manager.disabled || date.disabled) return;
        const me = [...manager.closest('.display-flex.align-items-center').querySelectorAll('span.textButton')]
            .find(e => /^(Me|All)$/.test(text(e)));
        if (preferences.mine) {
            if (!clickedMe && text(me) === 'Me') {
                originalManager = manager.value;
                clickedMe = true;
                me.click();
                return;
            }
            if (text(me) !== 'All' || !manager.selectedOptions.length ||
                text(manager.selectedOptions[0]) === 'All' ||
                (clickedMe && manager.value === originalManager)) return;
        }
        if (preferences.today) {
            const today = [...date.options].filter(o => text(o) === 'Today only' && !o.disabled);
            const all = [...date.options].filter(o => text(o) === 'All' && !o.disabled);
            if (today.length !== 1 || all.length !== 1) return finish('unavailable');
            // Me can update the list asynchronously. Let that render settle first.
            if (performance.now() - lastContentChange < 1000) return;
            const select = value => {
                Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(date, value);
                date.dispatchEvent(new Event('input', { bubbles: true }));
                date.dispatchEvent(new Event('change', { bubbles: true }));
                lastContentChange = performance.now();
            };
            // Replay the user-verified All -> Today transition once, even when the
            // dropdown already says Today but Snug's result list is stale.
            if (datePhase === 0) { datePhase = 1; select(all[0].value); return; }
            if (datePhase === 1) { datePhase = 2; select(today[0].value); return; }
            if (date.value !== today[0].value) return;
            // A selected dropdown alone did not prove filtering on the iPhone.
            // Refuse success while any visible date heading is for another day.
            const now = new Date();
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const walker = document.createTreeWalker(document.getElementById('app-scrollable-container') || document.body, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                const heading = node.textContent.trim().match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \((\d{1,2}) ([A-Za-z]{3})\)$/);
                if (heading && visible(node.parentElement) &&
                    (+heading[1] !== now.getDate() || heading[2] !== months[now.getMonth()])) {
                    stableTicks = 0;
                    return;
                }
            }
            if (++stableTicks < 3) return;
        }
        if (opened && toggles.length === 1) toggles[0].click();
        finish('applied');
    };
    state.timer = setInterval(step, 250);
    step();
})();

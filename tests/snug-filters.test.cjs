const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const source = fs.readFileSync('PresenceOpenHomes/SnugFilters.js', 'utf8');
const panel = `<div class="display-flex align-items-center"><div><select id="select-manager-dropdown"><option value="all">All</option><option value="fixture-user">Test inspector</option></select></div><span class="textButton">Me</span></div>
<select id="select-manager-dropdown"><option>All</option></select>
<select data-date><option value="all">All</option><option value="today">Today only</option><option value="custom">Select a date</option></select>`;
function fixture({ mine = true, today = true, url = 'https://app.snug.com/teams/presencepm/viewings/mobile', broken = false } = {}) {
    const dom = new JSDOM('<div data-testid="mobile-viewings-filter-toggle"></div><section></section>', { url, runScripts: 'outside-only' });
    const w = dom.window, doc = w.document, messages = [];
    let tick, opens = 0, clicks = 0, changes = 0, clock = 0;
    Object.defineProperty(w.performance, "now", { value: () => clock });
    w.Element.prototype.getClientRects = function () { return [{}]; };
    w.setInterval = fn => { tick = fn; return 1; };
    w.clearInterval = () => { tick = null; };
    w.webkit = { messageHandlers: { presenceFilters: { postMessage: s => messages.push(s) } } };
    doc.querySelector('[data-testid]').onclick = () => {
        opens++;
        if (opens > 1) return;
        doc.querySelector('section').innerHTML = broken ? '<select><option>Unknown</option></select>' : panel;
        const me = doc.querySelector('.textButton');
        if (me) me.onclick = () => {
            clicks++;
            const manager = doc.querySelector('select');
            manager.value = 'fixture-user';
            me.textContent = 'All';
        };
        const date = doc.querySelector('[data-date]');
        if (date) date.addEventListener('change', event => {
            assert.equal(event.bubbles, true);
            changes++;
        });
    };
    const run = () => w.eval(source.replace('__PREFERENCES__', JSON.stringify({ mine, today })));
    const advance = (count = 30) => { for (let i = 0; i < count && tick; i++) { clock += 250; tick(); } };
    return { w, doc, messages, run, advance, counts: () => ({ opens, clicks, changes }) };
}
test('opens observed panel, selects current account and Today, verifies, then collapses', () => {
    const f = fixture(); f.run(); f.advance();
    assert.deepEqual(f.messages, ['applying', 'applied']);
    assert.equal(f.doc.querySelector('select').value, 'fixture-user');
    assert.equal(f.doc.querySelector('[data-date]').value, 'today');
    assert.deepEqual(f.counts(), { opens: 2, clicks: 1, changes: 2 });
    f.doc.querySelector('[data-date]').value = 'custom';
    f.run(); f.advance();
    assert.equal(f.doc.querySelector('[data-date]').value, 'custom', 'later manual filters are left alone');
});
test('Today only does not select an inspector', () => {
    const f = fixture({ mine: false }); f.run(); f.advance();
    assert.equal(f.doc.querySelector('select').value, 'all');
    assert.equal(f.counts().clicks, 0);
    assert.equal(f.messages.at(-1), 'applied');
});
test('Me only leaves date unchanged', () => {
    const f = fixture({ today: false }); f.run(); f.advance();
    assert.equal(f.doc.querySelector('[data-date]').value, 'all');
    assert.equal(f.counts().changes, 0);
});
test('both disabled causes no DOM actions', () => {
    const f = fixture({ mine: false, today: false }); f.run(); f.advance();
    assert.deepEqual(f.counts(), { opens: 0, clicks: 0, changes: 0 });
});
test('login, detail pages and other origins are untouched', () => {
    for (const url of ['https://app.snug.com/join', 'https://app.snug.com/teams/presencepm/viewings/mobile/fixture', 'https://example.com/teams/presencepm/viewings/mobile']) {
        const f = fixture({ url }); f.run(); f.advance();
        assert.deepEqual(f.messages, []);
        assert.equal(f.counts().opens, 0);
    }
});
test('changed controls time out without selecting unrelated dropdowns', () => {
    const f = fixture({ broken: true }); f.run(); f.advance(90);
    assert.equal(f.messages.at(-1), 'unavailable');
    assert.equal(f.counts().clicks, 0);
});
test('navigation away stops pending automation', () => {
    const f = fixture(); f.run(); f.w.history.pushState({}, '', '/join'); f.advance();
    assert.equal(f.messages.at(-1), 'manual');
    assert.equal(f.counts().clicks, 0);
});
test('does not touch email or check-in forms on the list route', () => {
    const f = fixture(); f.doc.body.insertAdjacentHTML('beforeend', '<input type="email">'); f.run(); f.advance();
    assert.equal(f.counts().opens, 0);
    assert.equal(f.messages.at(-1), 'manual');
});
test('ambiguous duplicate date controls fail without changing filters', () => {
    const f = fixture(); f.run();
    f.doc.querySelector('section').insertAdjacentHTML('beforeend', f.doc.querySelector('[data-date]').outerHTML);
    f.advance(90);
    assert.equal(f.messages.at(-1), 'unavailable');
    assert.equal(f.counts().changes, 0);
    assert.equal(f.counts().clicks, 0);
});

test('replays All then Today even when dropdown already says Today', () => {
    const f = fixture(); f.run();
    f.doc.querySelector('[data-date]').value = 'today';
    const transitions = [];
    f.doc.querySelector('[data-date]').addEventListener('change', e => transitions.push(e.target.value));
    f.advance();
    assert.deepEqual(transitions, ['all', 'today']);
    assert.equal(f.messages.at(-1), 'applied');
});
test('selected Today with a stale future result heading is not reported as success', () => {
    const f = fixture(); f.run();
    const tomorrow = new f.w.Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const heading = tomorrow.toLocaleDateString('en-AU', { weekday: 'long' }) + ' (' + tomorrow.getDate() + ' ' + tomorrow.toLocaleDateString('en-AU', { month: 'short' }) + ')';
    f.doc.body.insertAdjacentHTML('beforeend', '<h2>' + heading + '</h2>');
    f.advance(90);
    assert.equal(f.doc.querySelector('[data-date]').value, 'today');
    assert.equal(f.messages.at(-1), 'unavailable');
});

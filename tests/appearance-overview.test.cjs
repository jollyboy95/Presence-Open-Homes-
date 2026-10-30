const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const vm = require('node:vm');
const appearance = fs.readFileSync('PresenceOpenHomes/SnugAppearance.js','utf8');
const overview = fs.readFileSync('PresenceOpenHomes/SnugOverview.js','utf8');
test('dark mode changes neutral surfaces, preserves photos and coloured controls, and restores original styles', () => {
    const dom = new JSDOM('<style>.card{background:rgb(255,255,255);color:rgb(30,30,30)} .action{background:rgb(0,160,80);color:white}</style><div class="card">Details</div><button class="action">Open</button><img src="photo.png"><div id="photo" style="background-image:url(photo.png)"></div>', {url:'https://app.snug.com/teams/presencepm/viewings/mobile',runScripts:'outside-only',pretendToBeVisual:true});
    const w=dom.window, d=w.document;
    w.eval(appearance.replace('__DARK__','true'));
    assert.equal(d.querySelector('.card').hasAttribute('data-presence-surface'),true);
    assert.equal(d.querySelector('.card').hasAttribute('data-presence-ink'),true);
    assert.equal(d.querySelector('.action').hasAttribute('data-presence-surface'),false);
    assert.equal(d.querySelector('img').attributes.length,1);
    assert.match(w.getComputedStyle(d.querySelector('#photo')).backgroundImage,/photo.png/);
    assert.equal(d.querySelector('#photo').hasAttribute('data-presence-surface'),false);
    w.eval(appearance.replace('__DARK__','false'));
    assert.equal(d.querySelectorAll('[data-presence-surface],[data-presence-ink],[data-presence-border]').length,0);
    assert.equal(w.getComputedStyle(d.querySelector('.card')).backgroundColor,'rgb(255, 255, 255)');
    dom.window.close();
});
test('dark appearance covers new page content after SPA navigation', async () => {
    const dom=new JSDOM('<body></body>',{url:'https://app.snug.com/join',runScripts:'outside-only',pretendToBeVisual:true});
    const w=dom.window;
    w.eval(appearance.replace('__DARK__','true'));
    w.document.body.insertAdjacentHTML('beforeend','<div style="background-color:rgb(250,250,250)">New page</div>');
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(w.document.querySelector('div').hasAttribute('data-presence-surface'),true);
    w.eval(appearance.replace('__DARK__','true'));
    assert.equal(w.document.head.querySelectorAll('style').length,1,'no duplicate theme observers/styles');
    w.close();
});
test('theme never changes external pages',()=>{
    const dom=new JSDOM('<body></body>',{url:'https://example.com',runScripts:'outside-only'});
    dom.window.eval(appearance.replace('__DARK__','true'));
    assert.equal(dom.window.document.querySelector('style'),null);
    dom.window.close();
});
function overviewRun(url, enabled=true) {
    const context={URL,window:{},location:{href:url,replace(target){this.target=target;}}};
    vm.runInNewContext(overview.replace('__LIVE__',String(enabled)),context);
    return context;
}
test('Overview uses observed Live page URL and preserves other filters',()=>{
    const c=overviewRun('https://app.snug.com/teams/presencepm/overview?search=fixture');
    const result=new URL(c.location.target);
    assert.equal(result.searchParams.get('listingStatus'),'live');
    assert.equal(result.searchParams.get('search'),'fixture');
});
test('Overview honours explicit listing filters and disabled preference',()=>{
    assert.equal(overviewRun('https://app.snug.com/teams/presencepm/overview?listingStatus=leased').location.target,undefined);
    assert.equal(overviewRun('https://app.snug.com/teams/presencepm/overview',false).location.target,undefined);
});
test('Overview does not navigate other origins, inspection pages or repeat within a document',()=>{
    for(const url of ['https://example.com/teams/presencepm/overview','https://app.snug.com/teams/presencepm/viewings/mobile']) assert.equal(overviewRun(url).location.target,undefined);
    const c=overviewRun('https://app.snug.com/teams/presencepm/overview');
    delete c.location.target;
    vm.runInNewContext(overview.replace('__LIVE__','true'),c);
    assert.equal(c.location.target,undefined);
});

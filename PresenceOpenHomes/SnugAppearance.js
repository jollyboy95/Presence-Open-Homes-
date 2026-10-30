// Recolour neutral UI surfaces only. Never invert or filter photos, logos or video.
(() => {
    if (location.origin !== 'https://app.snug.com') return;
    const enabled = __DARK__;
    const key = '__presenceAppearance';
    if (!enabled) { window[key]?.stop(); delete window[key]; return; }
    if (window[key]) return;
    const marked = new Set();
    const names = ['data-presence-surface', 'data-presence-ink', 'data-presence-border'];
    const style = document.createElement('style');
    style.textContent = `
        html { color-scheme: dark; background: #000 !important; }
        body { background: #000 !important; }
        [data-presence-surface] { background-color: #111 !important; }
        [data-presence-ink] { color: #eee !important; }
        [data-presence-border] { border-color: #444 !important; }
        input, select, textarea { color-scheme: dark; -webkit-text-fill-color: currentColor; }
        input::placeholder, textarea::placeholder { color: #aaa !important; opacity: 1; }
        input:focus-visible, select:focus-visible, button:focus-visible, a:focus-visible {
            outline: 2px solid #8abaff !important; outline-offset: 2px;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
    const neutral = value => {
        const match = value.match(/^rgba?\(([^)]+)\)$/);
        if (!match) return null;
        const channels = match[1].split(',').map(Number);
        if (channels.length === 4 && channels[3] < 0.9) return null;
        const rgb = channels.slice(0, 3);
        return Math.max(...rgb) - Math.min(...rgb) < 25 ? (rgb[0]+rgb[1]+rgb[2])/3 : null;
    };
    const paint = element => {
        if (!(element instanceof HTMLElement) || ['IMG','VIDEO','CANVAS','IFRAME','STYLE','SCRIPT'].includes(element.tagName)) return;
        names.forEach(name => element.removeAttribute(name));
        const css = getComputedStyle(element);
        const surface = neutral(css.backgroundColor), ink = neutral(css.color), border = neutral(css.borderTopColor);
        // Preserve colourful badges/buttons and all background images.
        if (surface !== null && surface > 170 && (!css.backgroundImage || css.backgroundImage === 'none')) element.setAttribute(names[0], '');
        if (ink !== null && ink < 180) element.setAttribute(names[1], '');
        if (border !== null && border > 140) element.setAttribute(names[2], '');
        if (names.some(name => element.hasAttribute(name))) marked.add(element);
    };
    const scan = root => {
        paint(root);
        root.querySelectorAll('*').forEach(paint);
    };
    scan(document.documentElement);
    let frame = null;
    const pending = new Set();
    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') pending.add(record.target);
            else for (const node of record.addedNodes) if (node instanceof HTMLElement && node !== style) pending.add(node);
        }
        if (pending.size && frame === null) frame = requestAnimationFrame(() => {
            frame = null;
            for (const node of pending) if (node.isConnected) scan(node);
            pending.clear();
            for (const node of marked) if (!node.isConnected) marked.delete(node);
        });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class','style'] });
    window[key] = { stop() {
        observer.disconnect();
        if (frame !== null) cancelAnimationFrame(frame);
        style.remove();
        for (const node of marked) names.forEach(name => node.removeAttribute(name));
        marked.clear(); pending.clear();
    }};
})();

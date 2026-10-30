// URL observed after using Overview > Filter > Property > Live > Apply Filter.
// This is a normal web page URL, not a private API endpoint.
(() => {
    const url = new URL(location.href);
    if (url.origin !== 'https://app.snug.com' || url.pathname !== '/teams/presencepm/overview') return;
    if (!__LIVE__ || window.__presenceOverview) return;
    window.__presenceOverview = true;
    // Honour explicit links/manual listing filters. Never clear other query parameters.
    if (url.searchParams.has('listingStatus')) return;
    url.searchParams.set('listingStatus', 'live');
    location.replace(url.href);
})();

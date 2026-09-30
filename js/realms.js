/* Realm definitions are DATA, not code — an agent reshapes the cosmology by
   editing data/realms.json and re-running tools/build-realms.mjs.

   Load order matters: js/realms.data.js (generated, works on file://) is the
   baseline; the XHR against data/realms.json is a live refresh when served
   over http, so editing the JSON shows up without a rebuild. */
(function (global) {
  'use strict';

  /* Last-resort fallback. Every id here must be unique — a duplicated id makes
     two cards share one realm's memories, which reads as a bug that isn't. */
  var fallback = [
    { id: 'asgard', name: 'Asgard', sphere: 'consolidated truth', title: 'The high seat of the gods', kind: 'epistemic', color: '#f2d98d', glow: 'rgba(242,217,141,.55)', deep: 'Load-bearing knowledge.' },
    { id: 'midgard', name: 'Midgard', sphere: 'working memory', title: 'The middle realm of the living', kind: 'episodic', color: '#8fd6b4', glow: 'rgba(143,214,180,.5)', deep: 'What the agent is doing now.' },
    { id: 'vanahelm', name: 'Vanaheim', sphere: 'generative space', title: 'The realm of the breath', kind: 'synthetic', color: '#f0a5c0', glow: 'rgba(240,165,192,.45)', deep: 'Hypotheses not yet grounded.' },
    { id: 'helheim', name: 'Helheim', sphere: 'failure record', title: 'The realm of the dead', kind: 'reflective', color: '#b9a6e8', glow: 'rgba(185,166,232,.45)', deep: 'Errors and contradictions.' }
  ];

  function valid(list) {
    if (!list || !list.length) return false;
    var seen = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      if (!list[i] || !list[i].id) return false;
      if (seen[list[i].id]) return false;   /* duplicate id => reject the set */
      seen[list[i].id] = true;
    }
    return true;
  }

  function load(url, done) {
    /* baseline: the generated bundle, always present */
    var base = (global.YGGDRASIL_REALMS_DATA && global.YGGDRASIL_REALMS_DATA.realms) || fallback;
    if (!valid(base)) base = fallback;
    done(base);

    /* live refresh when served (XHR to a relative file fails on file://) */
    if (!global.XMLHttpRequest) return;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = function () {
        if (xhr.status && xhr.status >= 400) return;
        var data;
        try { data = JSON.parse(xhr.responseText); } catch (e) { return; }
        if (valid(data.realms)) done(data.realms);
      };
      xhr.send();
    } catch (e) { /* file:// — the generated bundle already answered */ }
  }

  global.YggdrasilRealms = { load: load, fallback: fallback, valid: valid };
})(window);

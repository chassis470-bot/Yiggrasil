/* Render: draws the tree, the three realms as root-tiers, and the leaf motes
   that are individual bindings. Pure DOM + canvas; no dependencies. */
(function (global) {
  'use strict';

  var tree = new global.Yggdrasil.Tree();
  var realms = [];
  var seed = 20260930;

  /* deterministic pseudo-random so the tree looks the same every load */
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  function seedMemories() {
    /* These are real bindings about how this system works — the tree
       demonstrating itself. */
    tree.remember('yggdrasil', 'is', 'spatial memory for ai agents', 'asgard',
      'Memories live as bindings on a tree. The tree is the address space; the binding is the payload.');
    tree.remember('recall', 'strengthens', 'a binding', 'asgard',
      'Every recall adds strength. A binding strong enough ascends from Midgard to Asgard on its own.');
    tree.remember('helheim', 'exists because', 'forgetting failures is worse than keeping them', 'asgard',
      'Drop the error record and the agent repeats the error with more confidence.');
    tree.remember('Yggdrasil', 'is_built_for', 'an agent that forgets', 'midgard',
      'The interface is spatial because recall in agents is associative. Space is the association.');
    tree.remember('realm', 'is_decided_by', 'epistemology not importance', 'midgard',
      'Asgard = true. Midgard = working. Vanaheim = possible. Helheim = what failed.');
    tree.remember('working_memory', 'must', 'age fast', 'midgard',
      'Stale working state masquerading as settled truth is the most common agent bug.');
    tree.remember('user', 'is', 'Alistair', 'midgard', 'Owner. Prefers raw output, short replies.');
    tree.remember('binding', 'should_be', 'small and single-fact', 'midgard',
      'One claim per binding. A binding that needs "and" is two bindings.');

    tree.remember('association', 'is', 'how recall actually works', 'vanahelm',
      'Hypothesis: agents recall by proximity, not by query. If true, a tree beats a table.');
    tree.remember('consolidation', 'might_be', 're-derivation not repetition', 'vanahelm',
      'Unproven. Would explain why spaced recall beats massed recall in the data.');
    tree.remember('contradiction', 'could_be', 'a search heuristic', 'vanahelm',
      'If two bindings clash, the interesting thing is where they diverge, not which wins.');

    tree.remember('contradiction', 'is_a', 'signal not noise', 'helheim',
      'Two bindings that disagree are a discovery. Helheim holds both so the clash stays visible.');
    tree.remember('first_attempt', 'failed because', 'no realm for near-misses', 'helheim',
      'The first design only had true and working. Contradictions had nowhere to go, so they were dropped.');
    tree.remember('screenshot', 'failed because', 'game blocks synthetic input', 'helheim',
      'Rendering worked; clicking did not. Some surfaces refuse automation entirely.');
    tree.remember('realm_load', 'failed because', 'XHR is blocked on file://', 'helheim',
      'data/realms.json silently fell back on open. Fixed by generating js/realms.data.js at build time.');
  }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* ---------- realm cards ---------- */

  function buildRealmGrid() {
    var grid = document.getElementById('realmGrid');
    grid.innerHTML = '';
    realms.forEach(function (realm, i) {
      var card = el('article', 'realm');
      card.style.setProperty('--realm', realm.color);
      card.style.setProperty('--glow', realm.glow);
      card.style.setProperty('--tilt', (i * 4 - 4) + 'deg');
      card.setAttribute('tabindex', '0');

      card.appendChild(el('h2', 'realm-name', realm.name));
      card.appendChild(el('p', 'realm-title', realm.title || realm.sphere));

      var meter = el('div', 'meter');
      var fill = el('i');
      meter.appendChild(fill);
      card.appendChild(meter);

      var stat = el('p', 'realm-stat', '');
      card.appendChild(stat);

      var list = el('ul', 'leaves');
      card.appendChild(list);

      function open() { openAltar(realm, card); }

      card.addEventListener('click', open);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });

      grid.appendChild(card);
    });
  }

  function paint() {
    var cards = document.querySelectorAll('.realm');
    realms.forEach(function (realm, i) {
      var card = cards[i];
      if (!card) return;
      var leaves = tree.byRealm(realm.id);
      var total = Math.max(1, tree.stats().total);
      card.querySelector('.meter i').style.width =
        Math.round((leaves.length / total) * 100) + '%';

      var avg = leaves.length
        ? leaves.reduce(function (s, b) { return s + b.strength; }, 0) / leaves.length
        : 0;
      card.querySelector('.realm-stat').textContent =
        leaves.length + (leaves.length === 1 ? ' memory' : ' memories') +
        ' · strength ' + avg.toFixed(2);

      var ul = card.querySelector('.leaves');
      ul.innerHTML = '';
      leaves.slice(0, 6).forEach(function (b) {
        var li = el('li', 'leaf');
        li.textContent = b.predicate + ' ' + b.object;
        li.title = b.subject + ' ' + b.predicate + ' ' + b.object +
                   '  (str ' + b.strength.toFixed(2) + ', recalled ' + b.recalls + '×)';
        ul.appendChild(li);
      });
    });
    document.getElementById('echoCount').textContent = tree.stats().total;
  }

  /* ---------- the altar (detail view) ---------- */

  function openAltar(realm, card) {
    var altar = document.getElementById('altar');
    document.getElementById('altarName').textContent = realm.name;
    document.getElementById('altarSphere').textContent = realm.sphere || '';
    document.getElementById('altarKind').textContent = realm.kind || '—';
    document.getElementById('altarDeep').textContent = realm.deep || '—';

    var leaves = tree.byRealm(realm.id);
    var avg = leaves.length
      ? leaves.reduce(function (s, b) { return s + b.strength; }, 0) / leaves.length
      : 0;
    document.getElementById('altarStrength').textContent = avg.toFixed(2);

    var pre = document.getElementById('altarBinding');
    pre.textContent = leaves.map(function (b) {
      return b.subject + '  ' + b.predicate + '  ' + b.object;
    }).join('\n') || '(no bindings held here yet)';

    /* recall the realm — touching it strengthens its memories, which is the
       whole point: an agent that revisits Asgard consolidates it. */
    leaves.forEach(function (b) { tree.recall(b.id); });
    tree.save();

    document.getElementById('altarEcho').textContent =
      leaves.length + ' binding' + (leaves.length === 1 ? '' : 's') + ' recalled';

    altar.hidden = false;
    altar.classList.add('open');
    document.body.classList.add('veiled');
    if (card) card.focus();
    paint();
  }

  function closeAltar() {
    var altar = document.getElementById('altar');
    altar.classList.remove('open');
    altar.hidden = true;
    document.body.classList.remove('veiled');
  }

  /* ---------- canvas: the tree itself ---------- */

  function drawCanopy() {
    var cv = document.getElementById('canopy');
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    var c = cv.getContext('2d');
    c.scale(dpr, dpr);

    var baseX = w / 2, baseY = h * 0.94;

    function branch(x, y, angle, len, width, depth, color) {
      if (depth > 9 || len < 6) return;
      var x2 = x + Math.cos(angle) * len;
      var y2 = y + Math.sin(angle) * len;

      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(angle - 0.2) * len * 0.55,
                         y + Math.sin(angle - 0.2) * len * 0.55, x2, y2);
      c.lineWidth = width;
      c.strokeStyle = color;
      c.shadowBlur = 14;
      c.shadowColor = color;
      c.stroke();
      c.shadowBlur = 0;

      if (depth === 1) {
        /* a realm tier — the three rings the tree passes through */
        c.beginPath();
        c.arc(x2, y2, 13, 0, Math.PI * 2);
        c.fillStyle = color;
        c.globalAlpha = 0.22;
        c.fill();
        c.globalAlpha = 1;
      }

      var splits = depth < 3 ? 2 : 2;
      for (var i = 0; i < splits; i++) {
        var spread = 0.42 + rnd() * 0.30;
        var dir = i === 0 ? -spread : spread;
        branch(x2, y2, angle + dir,
               len * (0.68 + rnd() * 0.14),
               Math.max(0.6, width * 0.68), depth + 1, color);
      }
    }

    var grad = c.createLinearGradient(0, baseY, 0, 0);
    grad.addColorStop(0, 'rgba(150,190,175,.42)');
    grad.addColorStop(0.6, 'rgba(180,205,225,.24)');
    grad.addColorStop(1, 'rgba(220,230,255,.05)');

    branch(baseX, baseY, -Math.PI / 2, h * 0.20, 13, 0, grad);

    /* roots fanning into the dark below */
    for (var i = 0; i < 5; i++) {
      var a = Math.PI * (0.62 + i * 0.19);
      c.beginPath();
      c.moveTo(baseX, baseY);
      c.quadraticCurveTo(baseX + Math.cos(a) * 90, baseY + Math.sin(a) * 40,
                         baseX + Math.cos(a) * 170, h);
      c.lineWidth = Math.max(1, 5 - i);
      c.strokeStyle = 'rgba(120,150,145,.20)';
      c.stroke();
    }
  }

  /* ---------- drifting motes ---------- */

  function spawnMotes(n) {
    var host = document.getElementById('motes');
    for (var i = 0; i < n; i++) {
      var m = el('span', 'mote');
      m.style.left = (rnd() * 100) + '%';
      m.style.animationDelay = (-rnd() * 22) + 's';
      m.style.animationDuration = (14 + rnd() * 16) + 's';
      m.style.opacity = 0.15 + rnd() * 0.5;
      m.style.setProperty('--s', (2 + rnd() * 3) + 'px');
      host.appendChild(m);
    }
  }

  function clock() {
    var d = new Date();
    document.getElementById('clock').textContent =
      d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }

  function boot() {
    global.YggdrasilRealms.load('data/realms.json', function (loaded) {
      realms = loaded;
      tree.restore();
      seedMemories();
      buildRealmGrid();
      paint();
    });

    drawCanopy();
    spawnMotes(26);

    document.getElementById('altarClose').addEventListener('click', closeAltar);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAltar();
    });

    global.addEventListener('resize', drawCanopy);
    clock();
    global.setInterval(clock, 1000);

    /* expose for agents / cron tooling */
    global.yggdrasil = {
      tree: tree, realms: function () { return realms; },
      paint: paint, save: function () { tree.save(); paint(); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})(window);

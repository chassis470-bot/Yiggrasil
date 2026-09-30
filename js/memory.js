/* Yggdrasil — spatial memory for AI agents.
   Memory is modelled as bindings (subject -> predicate -> object), which is the
   shape an agent can actually recall. The tree decides WHERE a binding lives;
   the binding itself is the thing that comes back on recall. */
(function (global) {
  'use strict';

  var REALMS = { asgard: 0, midgard: 1, helheim: 2 };

  function now() { return Date.now(); }

  /* ---------- bindings ---------- */

  function Binding(subject, predicate, object, realm, deep) {
    this.id = (subject + '/' + predicate + '/' + object).toLowerCase().replace(/\s+/g, '_');
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.realm = realm || 'midgard';
    this.deep = deep || '';
    this.strength = 0.5;
    this.recalls = 0;
    this.created = now();
    this.touched = this.created;
  }

  Binding.prototype.recall = function () {
    this.recalls += 1;
    this.strength = Math.min(1, this.strength + 0.12);
    this.touched = now();
    if (this.strength >= 0.85 && this.realm === 'midgard') this.ascend();
    return this;
  };

  Binding.prototype.ascend = function () {
    this.realm = 'asgard';
    this.deep = this.deep || 'Consolidated by repeated recall.';
    return this;
  };

  Binding.prototype.descend = function () {
    this.realm = 'helheim';
    return this;
  };

  Binding.prototype.echo = function () {
    var age = (now() - this.touched) / 1000;
    return this.strength * Math.max(0, 1 - age / 3600) + this.recalls * 0.02;
  };

  /* ---------- the tree ---------- */

  function Tree() {
    this.bindings = Object.create(null);
    this.order = [];
    this.version = 0;
    this._dirty = true;
  }

  Tree.prototype.remember = function (s, p, o, realm, deep) {
    var b = new Binding(s, p, o, realm, deep);
    var existing = this.bindings[b.id];
    if (existing) {
      existing.deep = deep || existing.deep;
      existing.touched = now();
      return existing;
    }
    this.bindings[b.id] = b;
    this.order.push(b.id);
    this._dirty = true;
    return b;
  };

  Tree.prototype.recall = function (id) {
    var b = this.bindings[id];
    if (!b) return null;
    b.recall();
    this._dirty = true;
    return b;
  };

  Tree.prototype.byRealm = function (realm) {
    var out = [];
    for (var i = 0; i < this.order.length; i++) {
      var b = this.bindings[this.order[i]];
      if (b && b.realm === realm) out.push(b);
    }
    return out;
  };

  Tree.prototype.stats = function () {
    var s = { total: this.order.length, asgard: 0, midgard: 0, helheim: 0, strength: 0 };
    for (var i = 0; i < this.order.length; i++) {
      var b = this.bindings[this.order[i]];
      if (!b) continue;
      s[b.realm]++;
      s.strength += b.strength;
    }
    s.avg = s.total ? s.strength / s.total : 0;
    return s;
  };

  /* ---------- persistence: the tree survives the tab ---------- */

  Tree.prototype.toJSON = function () {
    return {
      schema: 'yggdrasil/tree.v1',
      version: ++this.version,
      saved: now(),
      bindings: this.order.map(function (id) { return this.bindings[id]; }, this)
    };
  };

  Tree.prototype.load = function (data) {
    if (!data || !data.bindings) return this;
    this.bindings = Object.create(null);
    this.order = [];
    for (var i = 0; i < data.bindings.length; i++) {
      var d = data.bindings[i];
      var b = new Binding(d.subject, d.predicate, d.object, d.realm, d.deep);
      b.strength = d.strength || 0.5;
      b.recalls = d.recalls || 0;
      b.created = d.created || now();
      b.touched = d.touched || b.created;
      this.bindings[b.id] = b;
      this.order.push(b.id);
    }
    this._dirty = true;
    return this;
  };

  Tree.prototype.save = function () {
    try {
      global.localStorage.setItem('yggdrasil.tree', JSON.stringify(this.toJSON()));
      return true;
    } catch (e) { return false; }
  };

  Tree.prototype.restore = function () {
    try {
      var raw = global.localStorage.getItem('yggdrasil.tree');
      return raw ? this.load(JSON.parse(raw)) : this;
    } catch (e) { return this; }
  };

  global.Yggdrasil = { Tree: Tree, Binding: Binding, REALMS: REALMS };
})(window);

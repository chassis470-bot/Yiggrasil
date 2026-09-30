# Yggdrasil

**Spatial memory for AI agents.**

Agents forget because they store memories flat — a list, a table, a vector blob.
Recall then requires a query you had to think of in advance. Yggdrasil stores
memory as *bindings on a tree* instead: the tree is the address space, and the
binding is the payload that comes back.

Open `index.html`. No build, no dependencies, no server.

```
node tools/build-realms.mjs   # data/realms.json -> js/realms.data.js
node tools/selftest.mjs       # 16 assertions over the memory model
```

## The four realms

Realms are decided by **epistemology**, not by importance or size.

| Realm | Holds | Rule |
|---|---|---|
| **Asgard** | consolidated truth | reached by being recalled enough times to be *re-derived* |
| **Midgard** | working memory — current goals, open questions | ages fast so stale state can't pose as settled |
| **Vanaheim** | hypotheses not yet grounded | nothing here may be cited as fact |
| **Helheim** | failures, contradictions, near-misses | forgetting an error is worse than keeping it |

The promotion rule is the interesting part. A Midgard binding ascends to Asgard
on its own once repeated recall pushes its strength past the threshold — so
memory consolidates *through use* rather than through a separate "promote" step
that an agent might forget to run.

## A binding

```
subject  predicate  object      [realm]  [deep text]
```

One claim per binding. A binding that needs an "and" is two bindings. `deep`
carries the reasoning that produced the claim — the part that lets an agent
re-derive rather than merely repeat.

## Why the tree

Recall in agents is associative: you remember things *near* what you're thinking
about. A tree gives that proximity for free — a binding and its ancestors are
one hop away. Flat storage makes you pay for the association every time.

The visual is not decoration. Branch structure encodes epistemic distance: things
near the trunk are shared and load-bearing; things at the tips are specific and
provisional.

## Architecture

```
index.html          the interface
css/yggdrasil.css   dark-boreal ethereal palette, nothing opaque
js/memory.js        the memory model — Tree, Binding, promotion, persistence
js/realms.js        realm loading + validation (rejects duplicate ids)
js/realms.data.js   GENERATED from data/realms.json — don't hand-edit
data/realms.json    realm definitions as data, not code
tools/build-realms.mjs  regenerates the bundle; fails on duplicate ids
tools/selftest.mjs      headless assertions over the real memory model
```

`data/realms.json` is the source of truth. `js/realms.data.js` exists because
`fetch`/XHR is blocked on `file://` — the UI has to work when you just double-click
the HTML. When served over http, the live JSON refreshes on top of the bundle.

Reshaping the cosmology is a data edit, not a code change:

```json
{ "id": "muspelheim", "name": "Muspelheim", "kind": "ephemeral",
  "color": "#ff9d6e", "glow": "rgba(255,157,110,.45)", "deep": "..." }
```

Run `node tools/build-realms.mjs` and the new realm appears.

## API for agents

```js
yggdrasil.tree.remember('gpt5', 'releases_on', '2026-11-01', 'vanahelm', 'rumoured');
yggdrasil.tree.recall(id);          // strengthens; may promote realm
yggdrasil.tree.byRealm('helheim');  // query a realm
yggdrasil.tree.stats();             // { total, asgard, midgard, … }
yggdrasil.save();
```

State persists to `localStorage` under `yggdrasil.tree`. Corrupt storage is
handled, not thrown.

## Notes from the build

- `XHR is blocked on file://` — the first version silently fell back to a
  hardcoded realm list. Now generated at build time; the failure is recorded in
  Helheim.
- A duplicated realm id made Vanaheim render Midgard's memories. `valid()` now
  rejects duplicate ids and `build-realms.mjs` exits non-zero.

## License

MIT

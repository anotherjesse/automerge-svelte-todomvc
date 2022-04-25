# svelte-todomvc

**[svelte-todomvc.surge.sh](http://svelte-todomvc.surge.sh/)**

[TodoMVC](http://todomvc.com/) implemented in [Svelte](https://github.com/sveltejs/svelte). The entire app weighs 3.5kb zipped.

## TODO - multi-player

- [ ] BIG picture: merge automatically any "others" that have changes
- [ ] only update/save my doc when "others" has changes (noop when no changes)
- [ ] loop - how to watch files and merge only when changes?
- [ ] ask the name on a new device only (when not loaded before - use IDB?)
- [ ] no way to create a new todo project on disk
- [ ] update automerge WASM
- [ ] investigate js bindings

### OLD STUFF

## TODO

- [x] move automerge to a store
- [x] fix complete/description/delete
- [?] can automerge wasm init when needed (in the store?)
- [?] re-add filesystem stuff to automerge store
- [ ] the new/open/save popup nightmare
- [x] switch back to typescript: store.js -> store.ts
- [x] re-create project to have a modern svelte/rollup/... setup


## collab story:

- [ ] user 1 creates a new document, puts it in their dropbox
- [ ] user 1 shares a "dropbox direct link" with user 2
- [ ] user 2 opens the document via link
- [ ] user 2 can refresh changes from dropbox as user 1 makes changes
- [ ] user 2 has changes, makes a local version (in their dropbox)
- [ ] user 2 can share their direct link with user 1, enabling collaboration?

## TODO Better!
- [ ] initing automerge in the store, multiple stores results in "actor" failure for the first store
- [ ] should index be used for updates to items - it seems brittle?
- [?] automerge store vs app specific logic (see store.js - add vs clearClompleted)
- [ ] when making multiple changes is there a way to include them as a single atomic/batch change?
- [ ] automerge doc changes currently change the entire array - I think svelte would prefer if we only updated the changed items for efficiency/not-re-rendering every component
- [ ] need a shared worker for the app? (how pvh originally did it to only have 1 writer)

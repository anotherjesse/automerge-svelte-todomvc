# svelte-todomvc

**[svelte-todomvc.surge.sh](http://svelte-todomvc.surge.sh/)**

[TodoMVC](http://todomvc.com/) implemented in [Svelte](https://github.com/sveltejs/svelte). The entire app weighs 3.5kb zipped.

## TODO

- [x] move automerge to a store
- [x] fix complete/description/delete
- [ ] can automerge wasm init when needed (in the store?)
- [ ] re-add filesystem stuff to automerge store
- [ ] the new/open/save popup nightmare
- [x] switch back to typescript: store.js -> store.ts
- [x] re-create project to have a modern svelte/rollup/... setup

## TODO Better!
- [ ] should index be used for updates to items - it seems brittle?
- [ ] automerge store vs app specific logic (see store.js - add vs clearClompleted)
- [ ] when making multiple changes is there a way to include them as a single atomic change?
- [ ] automerge doc chagnes currently change the entire store - I think svelte would prefer if we only updated the changed items for efficiency/not-re-rendering every component
- [ ] need a shared worker for the app? (how pvh originally did it to only have 1 writer)

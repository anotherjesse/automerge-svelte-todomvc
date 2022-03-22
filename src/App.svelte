<script>
  import * as idb from 'idb-keyval'
  import Todo from './Todo.svelte'
  import { createAppStore } from './app-store'

  import {
    loadFileDialog,
    saveFileDialog,
    openFolderDialog,
  } from './automerge-store'

  let filenames = []
  let stores = []

  const newMemoryStore = () => {
    const store = createAppStore()
    store.fileName = 'in-memory'
    stores = [...stores, store]
  }

  const newFileStore = async () => {
    const file = await saveFileDialog()
    if (file) {
      idb.set(file.name, file)
      updateFilenames()
      const store = createAppStore()
      store.fileName = file.name
      store.newSaveFile(file)
      stores = [...stores, store]
    }
  }

  const loadFileStore = async () => {
    const file = await loadFileDialog()
    if (file) {
      idb.set(file.name, file)
      updateFilenames()
      const store = createAppStore()
      store.fileName = file.name
      store.loadAndSaveToFile(file)
      stores = [...stores, store]
    }
  }

  const loadStoredFileStore = async (filename) => {
    const file = await idb.get(filename)
    if (file) {
      const store = createAppStore()
      store.fileName = file.name
      store.loadAndSaveToFile(file)
      stores = [...stores, store]
    }
  }

  const openFolder = async () => {
    const handle = await openFolderDialog()
    if (!handle) return

    const files = {}

    for await (const entry of handle.values()) {
      // filenames look like "todo-name.mrg"
      // use regex to extract the name
      const match = entry.name.match(/^todo.(.+)\.mrg$/)
      if (match && entry.kind === 'file') {
        files[match[1]] = entry
      }
    }

    console.log(files)
    const name = window.prompt('who are you?')
    console.log({ name })
    const file = files[name]

    if (!file) return

    console.log(file)
    const store = createAppStore()
    store.fileName = file.name
    store.files = files
    store.loadAndSaveToFile(file)
    stores = [...stores, store]
  }

  const closeStore = (store) => {
    stores = stores.filter((s) => s !== store)
  }

  function updateFilenames() {
    idb.keys().then((keys) => (filenames = keys))
  }

  const mergeIcloud = (store) => {
    const url = window.prompt('url plz?')

    if (url) {
      store.merge_icloud(url)
    }
  }

  updateFilenames()
</script>

<h1>amt</h1>
<nav>
  <!-- <button on:click={newMemoryStore}>New Memory</button>
  <button on:click={loadFileStore}>Load File</button>
  <button on:click={newFileStore}>New File</button> -->
  <button on:click={openFolder}>Open Folder</button>
</nav>

{#if filenames.length > 0}
  <nav>
    recent files:
    {#each filenames as filename}
      <button on:click={() => loadStoredFileStore(filename)}>{filename}</button>
    {/each}
    <em
      on:click={() => {
        idb.clear()
        updateFilenames()
      }}>clear</em
    >
  </nav>
{/if}

{#each stores as store, idx}
  <h2>
    {store.fileName}
    <button on:click={() => closeStore(store)}>Close File</button>

    {#if store.files}
      {#each Object.entries(store.files) as [name, file]}
        {#if store.fileName !== file.name}
          <button on:click={() => store.merge_file(file)}>
            merge {name}
          </button>
        {/if}
      {/each}
    {:else}
      <button on:click={() => mergeIcloud(store)}>Merge icloud remote</button>
    {/if}
  </h2>

  <Todo {store} />
  <br />
{/each}

<style>
  nav {
    text-align: center;
  }
</style>

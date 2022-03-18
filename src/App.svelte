<script>
  import * as idb from 'idb-keyval'
  import { createAppStore } from './app-store'
  import { loadFileDialog, saveFileDialog } from './automerge-store'

  import Todo from './Todo.svelte'

  let stores = []
  let filenames = []

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

  const closeStore = (store) => {
    stores = stores.filter((s) => s !== store)
  }

  function updateFilenames() {
    idb.keys().then((keys) => (filenames = keys))
  }

  updateFilenames()
</script>

<h1>amt</h1>
<nav>
  <button on:click={newMemoryStore}>New Memory</button>
  <button on:click={loadFileStore}>Load File</button>
  <button on:click={newFileStore}>New File</button>
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
  </h2>

  <Todo {store} />
  <br />
{/each}

<style>
  nav {
    text-align: center;
  }
</style>

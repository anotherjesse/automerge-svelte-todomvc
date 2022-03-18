<script>
  import { createAppStore } from './app-store'
  import { loadFileDialog, saveFileDialog } from './automerge-store'

  import Todo from './Todo.svelte'

  let stores = []

  const newMemoryStore = () => {
    const store = createAppStore()
    console.log(store)
    store.fileName = 'in-memory'
    stores = [...stores, store]
  }

  const newFileStore = async () => {
    const file = await saveFileDialog()
    if (file) {
      const store = createAppStore()
      store.fileName = file.name
      store.newSaveFile(file)
      stores = [...stores, store]
    }
  }

  const loadFileStore = async () => {
    const file = await loadFileDialog()
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
</script>

<h1>amt</h1>
<nav>
  <button on:click={newMemoryStore}>New Memory</button>
  <button on:click={loadFileStore}>Load File</button>
  <button on:click={newFileStore}>New File</button>
</nav>

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

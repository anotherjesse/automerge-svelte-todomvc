<script>
  import * as idb from 'idb-keyval'
  import Todo from './Todo.svelte'
  import { createAppStore } from './app-store'
  import { ensurePermissions } from './automerge-store'

  import {
    loadFileDialog,
    saveFileDialog,
    openFolderDialog,
  } from './automerge-store'

  let filenames = []
  let stores = []

  const getAutomergeFiles = async (handle) => {
    const files = {}
    for await (const entry of handle.values()) {
      // filenames look like "todo-name.mrg"
      // use regex to extract the name
      const match = entry.name.match(/^todo.(.+)\.mrg$/)
      if (match && entry.kind === 'file') {
        files[match[1]] = entry
      }
    }

    return files
  }

  const loadStoredFileStore = async (filename) => {
    const name = filename.match(/^todo.(.+)\.mrg$/)[1]

    const handle = await idb.get(filename)

    if (handle && (await ensurePermissions(handle))) {
      const files = await getAutomergeFiles(handle)
      console.log(files)
      const file = files[name]

      const store = createAppStore(handle, files, file)
      stores = [...stores, store]
    }
  }

  const openFolder = async () => {
    const handle = await openFolderDialog()
    if (!handle) return

    const files = await getAutomergeFiles(handle)

    if (Object.keys(files).length === 0) {
      console.log('No automerge files found in the selected folder')
      return
    }

    const name = window.prompt('who are you?')
    const file = files[name]

    if (!file) {
      console.log('could not find user of name', name)
      console.log('existing users:', Object.keys(files))
      return
    }

    const store = createAppStore(handle, files, file)
    stores = [...stores, store]

    idb.set(file.name, handle)
    updateFilenames()
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
      <button on:click={() => store.merge_all()}> merge all </button>
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

<script>
  import * as idb from 'idb-keyval'
  import Todo from './Todo.svelte'
  import {
    loadAppStoreExistingDevice,
    loadAppStoreNewDevice,
  } from './app-store'
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
      const file = files[name]

      const store = await loadAppStoreExistingDevice(handle, files, file)
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
    const safe_name = name.replace(/[^a-zA-Z0-9]/g, '').toLocaleLowerCase()
    const file = files[safe_name]

    if (files[safe_name]) {
      console.log('there is already an existing device named:', safe_name)
      return
    }

    const store = await loadAppStoreNewDevice(handle, files, safe_name)
    stores = [...stores, store]

    idb.set(store.file.name, handle)
    updateFilenames()
  }

  const closeStore = (store) => {
    // stopping watcher should happen by the store itself
    store.stop_watcher()
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
  </h2>

  <Todo {store} />
  <br />
{/each}

<style>
  nav {
    text-align: center;
  }
</style>

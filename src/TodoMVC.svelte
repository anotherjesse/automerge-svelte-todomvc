<script lang="ts">
  import { createAutomergeStore } from './store.js'

  const store = createAutomergeStore()
  let currentFilter: string = 'all'
  let editing: number = null

  const updateView = () => {
    currentFilter = 'all'
    if (window.location.hash === '#/active') {
      currentFilter = 'active'
    } else if (window.location.hash === '#/completed') {
      currentFilter = 'completed'
    }
  }

  window.addEventListener('hashchange', updateView)
  updateView()

  function createNew(event: KeyboardEvent & { target: HTMLInputElement }) {
    if (event.key === 'Enter') {
      store.add({
        id: uuid(),
        description: event.target.value,
        completed: false,
      })
      event.target.value = ''
    }
  }

  function handleEdit(event: KeyboardEvent & { target: HTMLInputElement }) {
    if (event.key === 'Enter') event.target.blur()
    else if (event.key === 'Escape') editing = null
  }

  function updateDescription(event: Event & { target: HTMLInputElement }) {
    // only updateDescription if editing is still set
    if (editing != null) {
      store.updateItemField(editing, 'description', event.target.value)
      editing = null
    }
  }

  function setCompleted(
    event: Event & { target: HTMLInputElement },
    index: number
  ) {
    store.updateItemField(index, 'completed', event.target.checked)
  }

  function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }
    )
  }

  // FIXME(ja): this is a hack to get the store to work with the existing logic
  $: items = $store

  $: filtered =
    currentFilter === 'all'
      ? items
      : currentFilter === 'completed'
      ? items.filter((item) => item.completed)
      : items.filter((item) => !item.completed)

  $: numActive = items.filter((item) => !item.completed).length

  $: numCompleted = items.filter((item) => item.completed).length
</script>

<header class="header">
  <h1>todo</h1>
  <input
    class="new-todo"
    on:keydown={createNew}
    placeholder="What needs to be done?"
    autofocus
  />
</header>

{#if items.length > 0}
  <section class="main">
    <input
      id="toggle-all"
      class="toggle-all"
      type="checkbox"
      on:change={store.toggleAll}
      checked={numCompleted === items.length}
    />
    <label for="toggle-all">Mark all as complete</label>

    <ul class="todo-list">
      {#each filtered as item, index (item.id)}
        <li
          class="{item.completed ? 'completed' : ''} {editing === index
            ? 'editing'
            : ''}"
        >
          <div class="view">
            <input
              class="toggle"
              type="checkbox"
              checked={item.completed}
              on:change={(evt) => setCompleted(evt, index)}
            />
            <label on:dblclick={() => (editing = index)}
              >{item.description}</label
            >
            <button on:click={() => store.remove(index)} class="destroy" />
          </div>

          {#if editing === index}
            <input
              value={item.description}
              id="edit"
              class="edit"
              on:keydown={handleEdit}
              on:blur={updateDescription}
              autofocus
            />
          {/if}
        </li>
      {/each}
    </ul>

    <footer class="footer">
      <span class="todo-count">
        <strong>{numActive}</strong>
        {numActive === 1 ? 'item' : 'items'} left
      </span>

      <ul class="filters">
        <li>
          <a class={currentFilter === 'all' ? 'selected' : ''} href="#/">All</a>
        </li>
        <li>
          <a
            class={currentFilter === 'active' ? 'selected' : ''}
            href="#/active">Active</a
          >
        </li>
        <li>
          <a
            class={currentFilter === 'completed' ? 'selected' : ''}
            href="#/completed">Completed</a
          >
        </li>
      </ul>

      {#if numCompleted}
        <button class="clear-completed" on:click={store.clearCompleted}>
          Clear completed
        </button>
      {/if}
    </footer>
  </section>
{/if}

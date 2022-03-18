<script lang="ts">
  export let store

  let currentFilter: string = 'all'
  let editing: number = null

  function createNew(event: KeyboardEvent & { target: HTMLInputElement }) {
    if (event.key === 'Enter') {
      store.addTodo(event.target.value)
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
      store.updateTodo(editing, 'description', event.target.value)
      editing = null
    }
  }

  function setCompleted(
    event: Event & { target: HTMLInputElement },
    index: number
  ) {
    store.updateTodo(index, 'completed', event.target.checked)
  }

  // FIXME(ja): this is a hack to get the store to work with the existing logic
  $: items = $store

  $: filtered =
    currentFilter === 'all'
      ? items
      : currentFilter === 'completed'
      ? items.filter((item) => item.completed)
      : items.filter((item) => !item.completed)

  $: numActive = $store.filter((item) => !item.completed).length

  $: numCompleted = $store.filter((item) => item.completed).length
</script>

<div id="todoapp">
  <header class="header">
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
              <button
                on:click={() => store.deleteTodo(index)}
                class="destroy"
              />
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
          <li>{currentFilter}!</li>
          <li>
            <button
              on:click={() => (currentFilter = 'all')}
              class:selected={currentFilter === 'all'}>All</button
            >
          </li>
          <li>
            <button
              class:selected={currentFilter === 'active'}
              on:click={() => (currentFilter = 'active')}>Active</button
            >
          </li>
          <li>
            <button
              on:click={() => (currentFilter = 'completed')}
              class:selected={currentFilter === 'completed'}>Completed</button
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
</div>

<style>
  #todoapp {
    background: white;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
  }
</style>

import TodoMVC from './TodoMVC.svelte';

import init from "automerge-wasm-pack"

init("/index_bg.wasm").then(() => {
	window.todomvc = new TodoMVC({
		target: document.querySelector('.todoapp')
	})
})

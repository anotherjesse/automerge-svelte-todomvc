import * as IDB from 'idb-keyval'
import * as Automerge from 'automerge-wasm-pack'
import { writable } from 'svelte/store';



// as a first pass the automerge document is not exposed to consumer of the store
// rather, whenever the automerge document is updated, we then update the store
// manually....
// FIXME(ja): it should probably not work that way ?

export const createAutomergeStore = () => {
    const { subscribe, set, update } = writable([]);

    const doc = Automerge.create()
    const ROOT = '_root'
    doc.set_object(ROOT, 'items', [])
    const itemsRef = doc.value(ROOT, 'items')[1]

    const add = (item) => {
        doc.push_object(itemsRef, item)
        updateStore();
    }

    const remove = (index) => {
        doc.del(itemsRef, index)
        updateStore()
    }

    const updateItemField = (index, key, value) => {
        let theItem = doc.value(itemsRef, index)[1]
        doc.set(theItem, key, value)
        updateStore()
    }

    // FIXME(ja): some of these things are not like the others.
    // calls like "add" and "remove" are pretty generic - and could be in an
    // automerge store, whereas clearCompleted is app specific - and be at a higher
    // level that wraps or uses the automerge store.
    const clearCompleted = () => {
        let changed = false;

        for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
            const theItemRef = doc.value(itemsRef, i)[1]
            const completed = doc.value(theItemRef, 'completed')[1]
            if (completed) {
                doc.del(itemsRef, i)
                changed = true;
            }
        }

        if (changed) {
            updateStore();
        }
    }


    // this actually updates the value of the store for svelte consumers
    // it should be called after any updates of automerge document
    const updateStore = () => {
        let items = [];
        for (let i = 0; i < doc.length(itemsRef); i++) {
            let theItemRef = doc.value(itemsRef, i)[1]
            let obj = {}

            doc.keys(theItemRef).forEach((k) => {
                obj[k] = doc.value(theItemRef, k)[1]
            })
            items.push(obj)
        }
        set(items)
    }

    const toggleAll = () => {
        for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
            const theItemRef = doc.value(itemsRef, i)[1]
            const completed = doc.value(theItemRef, 'completed')[1]
            doc.set(theItemRef, 'completed', !completed)
        }

        updateStore();
    }
    return {
        subscribe,
        add,
        remove,
        updateItemField,
        clearCompleted,
        toggleAll
    };
}


// let save = async (doc, fileHandle) => {
//     const writable = await fileHandle.createWritable()
//     await writable.write(doc.save())
//     await writable.close()
// }

// let load = async () => {
//     fileHandle = await IDB.get('file')
// }

// load()

// $: try {
//     if (fileHandle) {
//         save(doc, fileHandle)
//     }
// } catch (err) {
//     // noop
// }

// const options = {
//     mode: 'readwrite',
//     suggestedName: 'todo.mrg',
//     types: [
//         {
//             description: 'Automerge Files',
//             accept: {
//                 'application/octet-stream': ['.mrg'],
//             },
//         },
//     ],
// }

// async function newFileHandle() {
//     fileHandle = await window.showSaveFilePicker(options)
//     await IDB.set('file', fileHandle)

//     doc = Automerge.create()
//     doc.set_object(ROOT, 'items', [])
// }

// async function saveFileHandle() {
//     fileHandle = await window.showSaveFilePicker(options)
//     await IDB.set('file', fileHandle)
// }

// async function loadFileHandle(handle) {
//     if (!handle) {
//         ;[fileHandle] = await window.showOpenFilePicker(options)
//         await IDB.set('file', fileHandle)
//     } else {
//         if (
//             !(
//                 (await fileHandle.queryPermission(options)) === 'granted' ||
//                 (await fileHandle.requestPermission(options)) === 'granted'
//             )
//         ) {
//             return
//         }
//     }

//     const file = await fileHandle.getFile()
//     const contents = await file.arrayBuffer()

//     doc = Automerge.loadDoc(new Uint8Array(contents))
// }
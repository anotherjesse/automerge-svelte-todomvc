import * as IDB from 'idb-keyval'
import * as Automerge from 'automerge-wasm-pack'
import init from "automerge-wasm-pack"
import { writable } from 'svelte/store';

// as a first pass the automerge document is not exposed to consumer of the store
// rather, whenever the automerge document is updated, we then update the store
// manually....
// FIXME(ja): it should probably not work that way ?



type StoreItem = {
    [key: string]: string | number | boolean
} // FIXME(ja): this is the automerge store type, not our app's store type!

export const createAutomergeStore = () => {
    const { subscribe, set, update } = writable([] as Array<StoreItem>);

    let doc: Automerge.Automerge = null;
    let itemsRef: string = null;
    const ROOT = '_root';

    // FIXME(ja): issues with this approach:
    // - each automerge store (might) have its own automerge wasm instance?
    // - is there a way for this to become async? / expose better UX flow when automerge 
    // - doesn't initialize (instead of throwing when trying to mutate)

    init("/index_bg.wasm").then(() => {
        doc = Automerge.create()
        doc.set_object(ROOT, 'items', [])
        itemsRef = <string>doc.value(ROOT, 'items')[1];
    });

    const add = (item: StoreItem) => {
        if (doc === null) {
            throw Error('automerge store not initialized')
        }
        doc.push_object(itemsRef, item)
        updateStore();
    }


    const remove = (index: number) => {
        if (doc === null) {
            throw Error('automerge store not initialized')
        }

        doc.del(itemsRef, index)
        updateStore()
    }

    const updateItemField = (index: number, key: string, value: boolean | string | number) => {
        if (doc === null) {
            throw Error('automerge store not initialized')
        }
        let theItem: string = <string>doc.value(itemsRef, index)[1]
        doc.set(theItem, key, value)
        updateStore()
    }

    // FIXME(ja): some of these things are not like the others.
    // calls like "add" and "remove" are pretty generic - and could be in an
    // automerge store, whereas clearCompleted is app specific - and be at a higher
    // level that wraps or uses the automerge store.
    const clearCompleted = () => {
        if (doc === null) {
            throw Error('automerge store not initialized')
        }

        let changed = false;

        for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
            const theItemRef: string = <string>doc.value(itemsRef, i)[1]
            const completed: boolean = <boolean>doc.value(theItemRef, 'completed')[1]
            if (completed) {
                doc.del(itemsRef, i)
                changed = true;
            }
        }

        if (changed) {
            updateStore();
        }
    }

    const toggleAll = () => {
        if (doc === null) {
            throw Error('automerge store not initialized')
        }

        for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
            const theItemRef: string = <string>doc.value(itemsRef, i)[1]
            const completed: boolean = <boolean>doc.value(theItemRef, 'completed')[1]
            doc.set(theItemRef, 'completed', !completed)
        }

        updateStore();
    }

    // this actually updates the value of the store for svelte consumers
    // it should be called after any updates of automerge document
    const updateStore = () => {
        let items: Array<StoreItem> = [];
        for (let i = 0; i < doc.length(itemsRef); i++) {
            let theItemRef: string = <string>doc.value(itemsRef, i)[1]
            let obj = {}

            doc.keys(theItemRef).forEach((k) => {
                obj[k] = doc.value(theItemRef, k)[1]
            })
            items.push(obj)
        }
        set(items)
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
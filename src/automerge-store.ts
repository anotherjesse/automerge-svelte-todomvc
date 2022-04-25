import * as IDB from 'idb-keyval'
import * as Automerge from 'automerge-wasm-pack'
import init from "automerge-wasm-pack"
import { writable } from 'svelte/store';

// as a first pass the automerge document is not exposed to consumer of the store
// rather, whenever the automerge document is updated, we then update the store
// manually....
// FIXME(ja): it should probably not work that way ?


const fileOptions = {
    mode: 'readwrite' as FileSystemPermissionMode,
    suggestedName: 'todo.mrg',
    types: [
        {
            description: 'Automerge Files',
            accept: {
                'application/octet-stream': ['.mrg'],
            },
        },
    ],
}

const directoryOptions = {
    mode: 'readwrite' as FileSystemPermissionMode,
    id: 'amtodo',
}


init("/index_bg.wasm").then(() => console.log('automerge ready?'))

type StoreItem = {
    [key: string]: string | number | boolean
} // FIXME(ja): this is the automerge store type, not our app's store type!

export const loadFileDialog = async (): Promise<FileSystemFileHandle> => {
    const [handle] = await window.showOpenFilePicker(fileOptions)
    if ((await handle.queryPermission(fileOptions)) === 'granted' ||
        (await handle.requestPermission(fileOptions)) === 'granted') {
        return handle;
    }
}

export const saveFileDialog = async (): Promise<FileSystemFileHandle> => {
    const handle = await window.showSaveFilePicker(fileOptions)
    if ((await handle.queryPermission(fileOptions)) === 'granted' ||
        (await handle.requestPermission(fileOptions)) === 'granted') {
        return handle;
    }
}

export const openFolderDialog = async (): Promise<FileSystemDirectoryHandle> => {
    const handle = await window.showDirectoryPicker(fileOptions)
    if ((await handle.queryPermission(fileOptions)) === 'granted' ||
        (await handle.requestPermission(fileOptions)) === 'granted') {
        return handle;
    }
}


// FIXME(ja): there is no good place to hook the save handler...
// it should be able to happen after batch updates / any mutations


export const automerge_store = () => {

    let fileHandle: FileSystemFileHandle = null;
    const ROOT = '_root';

    // FIXME(ja): issues with this approach:
    // - each automerge store (might) have its own automerge wasm instance?
    // - is there a way for this to become async? / expose better UX flow when automerge 
    // - doesn't initialize (instead of throwing when trying to mutate)

    let doc = Automerge.create()
    doc.set_object(ROOT, 'items', [])

    const { subscribe, set, update } = writable(doc);


    // FIXME(ja): I incorrectly designed this, assuming that doc was an
    // immutable object, and that whenever a change happened you would
    // get a new value that you need to save ... not so ... 
    // This design is probably a dead end..
    const addItem = (item: StoreItem) =>
        update(doc => {
            if (doc === null) {
                throw Error('automerge store not initialized')
            }
            let itemsRef = <string>doc.value(ROOT, 'items')[1];
            doc.push_object(itemsRef, item)
            setTimeout(save, 100); // this is bad
            return doc
        })

    const removeItem = (index: number) =>
        update(doc => {
            if (doc === null) {
                throw Error('automerge store not initialized')
            }

            let itemsRef = <string>doc.value(ROOT, 'items')[1];
            doc.del(itemsRef, index)
            setTimeout(save, 100); // this is bad
            return doc
        })

    const updateItemField = (index: number, key: string, value: boolean | string | number) =>
        update(doc => {
            if (doc === null) {
                throw Error('automerge store not initialized')
            }

            let itemsRef = <string>doc.value(ROOT, 'items')[1];
            let theItem: string = <string>doc.value(itemsRef, index)[1]
            doc.set(theItem, key, value)
            setTimeout(save, 100); // this is bad
            return doc
        })

    const save = async () => {
        if (fileHandle) {
            // fixme(ja): add a limiter to prevent multiple saves
            console.log('saving to file', fileHandle.name)
            const writable = await fileHandle.createWritable()

            // FIXME(ja): using update to get a reference to the (mutable) doc,
            // seems to point to this being a bad pattern.  I think we need
            // a custom store instead of shoving doc into a writable store.

            const reallySave = async (data) => {
                await writable.write(data)
                await writable.close()
            }

            update(doc => {
                const data = doc.save()

                // I don't think update can be async, so we need this move async
                // to a helper function :-/
                reallySave(data);

                return doc
            })
        }
    }

    const load = async () => {
        if (fileHandle) {
            const file = await fileHandle.getFile()
            const contents = await file.arrayBuffer()
            const data = new Uint8Array(contents)

            console.log('loading', data)
            const doc = Automerge.loadDoc(data)

            set(doc)
        }
    }

    const merge_file = async (handle: FileSystemFileHandle) => {
        const file = await handle.getFile()
        const contents = await file.arrayBuffer()
        const data = new Uint8Array(contents)

        console.log('loading', data)
        const remoteDoc = Automerge.loadDoc(data)

        update(doc => {
            doc.merge(remoteDoc);
            return doc
        })
        setTimeout(save, 100); // this is bad
    }

    const closeFile = () => {
        console.log('forgetting about the file')
        fileHandle = null;
    }

    const setFile = (handle: FileSystemFileHandle) => {
        fileHandle = handle
    }

    const loadAndSaveToFile = async (handle: FileSystemFileHandle) => {
        if ((await handle.queryPermission(fileOptions)) === 'granted' ||
            (await handle.requestPermission(fileOptions)) === 'granted') {

            setFile(handle);
            load()
        }
    }

    const newSaveFile = async (handle: FileSystemFileHandle) => {
        if ((await handle.queryPermission(fileOptions)) === 'granted' ||
            (await handle.requestPermission(fileOptions)) === 'granted') {
            setFile(handle);
            save();
        }
    }

    return {
        subscribe,
        addItem,
        update,
        removeItem,
        updateItemField,
        loadAndSaveToFile,
        newSaveFile,
        closeFile,
        merge_file
    };
}

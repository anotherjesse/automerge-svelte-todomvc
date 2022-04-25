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


init("/bindgen_bg.wasm").then(() => console.log('automerge ready?'))

type StoreItem = {
    [key: string]: string | number | boolean
} // FIXME(ja): this is the automerge store type, not our app's store type!

export const loadFileDialog = async (): Promise<FileSystemFileHandle> => {
    const [handle] = await window.showOpenFilePicker(fileOptions)
    return (await ensurePermissions(handle)) && handle;
}

export const saveFileDialog = async (): Promise<FileSystemFileHandle> => {
    const handle = await window.showSaveFilePicker(fileOptions)
    return (await ensurePermissions(handle)) && handle;
}

export const openFolderDialog = async (): Promise<FileSystemDirectoryHandle> => {
    const handle = await window.showDirectoryPicker(fileOptions)
    return (await ensurePermissions(handle)) && handle;
}

export const ensurePermissions = async (handle: FileSystemFileHandle | FileSystemDirectoryHandle): Promise<boolean> => {
    if ((await handle.queryPermission(fileOptions)) === 'granted' ||
        (await handle.requestPermission(fileOptions)) === 'granted') {
        return true
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
    doc.putObject(ROOT, 'items', []);

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
            let itemsRef = <string>doc.get(ROOT, 'items')[1];
            doc.pushObject(itemsRef, item)
            setTimeout(save, 100); // this is bad
            return doc
        })

    const removeItem = (index: number) =>
        update(doc => {
            if (doc === null) {
                throw Error('automerge store not initialized')
            }

            let itemsRef = <string>doc.get(ROOT, 'items')[1];
            doc.delete(itemsRef, index)
            setTimeout(save, 100); // this is bad
            return doc
        })

    const updateItemField = (index: number, key: string, value: boolean | string | number) =>
        update(doc => {
            if (doc === null) {
                throw Error('automerge store not initialized')
            }

            let itemsRef = <string>doc.get(ROOT, 'items')[1];
            let theItem: string = <string>doc.get(itemsRef, index)[1]
            doc.put(theItem, key, value)
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

            const reallySave = async (data: Uint8Array) => {
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

            const doc = Automerge.load(data)

            console.log("heads", file.name, doc.getHeads())

            set(doc)
        }
    }

    const merge_file = async (handle: FileSystemFileHandle) => {
        const file = await handle.getFile()
        const contents = await file.arrayBuffer()
        const data = new Uint8Array(contents)

        update(doc => {
            const origHeads = doc.getHeads()

            doc.loadIncremental(data)

            const newHeads = doc.getHeads()

            console.log('merged', origHeads, newHeads)
            // only update if anythign changes
            if (JSON.stringify(origHeads) !== JSON.stringify(newHeads)) {
                setTimeout(save, 100); // this is bad
            }
            return doc
        })
    }

    const merge_all = async (files: FileSystemFileHandle[]) => {

        // this is a bad pattern - loading everythign and then merging
        // a sideeffect of the horrible decision I made with how the automerge
        // svelte store is implemented.

        const datas = [];
        for (let file of files) {
            const handle = await file.getFile()
            const contents = await handle.arrayBuffer()
            const data = new Uint8Array(contents)

            datas.push(data)
        }

        update(doc => {

            const origHeads = doc.getHeads()

            for (let data of datas) {
                doc.loadIncremental(data)
            }

            const newHeads = doc.getHeads()
            console.log('merged', origHeads, newHeads)
            // only update if anythign changes
            if (JSON.stringify(origHeads) !== JSON.stringify(newHeads)) {
                setTimeout(save, 100); // this is bad
            }

            return doc
        })
    }

    const closeFile = () => {
        console.log('forgetting about the file')
        fileHandle = null;
    }

    const setFile = (handle: FileSystemFileHandle) => {
        fileHandle = handle
    }

    const loadAndSaveToFile = async (handle: FileSystemFileHandle) => {
        if (await (ensurePermissions(handle))) {
            setFile(handle);
            load()
        }
    }

    const newSaveFile = async (handle: FileSystemFileHandle) => {
        if (await (ensurePermissions(handle))) {
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
        merge_file,
        merge_all,
        ensurePermissions,
    };
}

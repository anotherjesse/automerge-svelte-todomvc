import { derived } from 'svelte/store';
import { automerge_store } from './automerge-store'


const ROOT = '_root';

type StoreItem = {
    [key: string]: string | number | boolean
} // FIXME(ja): this is the automerge store type, not our app's store type!

// FIXME(ja): why have a uuid if we don't use it?
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

export const createAppStore = (handle, files, file) => {
    const am_store = automerge_store();

    const app_store = derived(am_store, doc => {
        let items: Array<StoreItem> = [];
        if (doc) {

            let itemsRef = <string>doc.get(ROOT, 'items')[1];

            for (let i = 0; i < doc.length(itemsRef); i++) {
                let theItemRef: string = <string>doc.get(itemsRef, i)[1]
                let obj = {}

                doc.keys(theItemRef).forEach((k) => {
                    obj[k] = doc.get(theItemRef, k)[1]
                })
                items.push(obj)
            }
        }
        return items;
    })

    const others = Object.values(files).filter(f => f !== file);
    am_store.loadAndSaveToFile(file)

    // fixme(ja): this interval runs forever - even when the store is closed
    // plus it should be a singleton
    const merge_timestamp = {}
    const check_others = async () => {
        // let's assume the sizes only increase...

        for (var file of others) {
            // FIXME(ja): IMPORTANT - there is a timing issue here.
            // we should ensure that the file size we read is the size that we expect
            // because chrome writes in a destructive way, we can end up seeing partial files or 
            // files after the merge has completed.
            const f = (await file.getFile())

            const size = f.size;

            if (size > 0) {
                const last_modified = f.lastModified;

                if (!(file.name in merge_timestamp) || last_modified !== merge_timestamp[file.name]) {
                    const info = await am_store.merge_file(file)
                    merge_timestamp[file.name] = info.lastModified;
                }
            }
        }
    }

    let watcher

    return {
        ...app_store,
        files,
        file,
        fileName: file.name,
        newSaveFile: am_store.newSaveFile,
        closeFile: am_store.closeFile,
        merge_file: am_store.merge_file,
        merge_others: () => am_store.merge_all(others),
        watcher: () => {
            if (watcher) {
                clearInterval(watcher)
                watcher = null;
            } else {
                watcher = setInterval(check_others, 1000)
            }
        },
        addTodo: (description: string) =>
            am_store.addItem({
                id: uuid(),
                description,
                completed: false
            }),
        deleteTodo: (index: number) =>
            am_store.removeItem(index),
        updateTodo: (index: number, key: string, value: boolean | string | number) =>
            am_store.updateItemField(index, key, value),
        clearCompleted: () =>
            am_store.update(doc => {
                const itemsRef = <string>doc.get(ROOT, 'items')[1];

                for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
                    const theItemRef: string = <string>doc.get(itemsRef, i)[1]
                    const completed: boolean = <boolean>doc.get(theItemRef, 'completed')[1]
                    if (completed) {
                        doc.delete(itemsRef, i)
                    }
                }

                // FIXME(ja): this isn't saving?

                // FIXME(ja): copilot recommends just setting to a new array? this would work, but isn't semantic
                // let newItems = items.filter(item => !item.completed)
                // doc.set_object(ROOT, 'items', newItems)
                // FIXME(ja): this seems to suggest that we need to ensure
                // that the interface given to the app developer doesn't result
                // in a lot of meaningless churn in automerge history.. 
                // that automerge changes should be semantic?
                return doc
            }),
        toggleAll: () => am_store.update(doc => {
            const itemsRef = <string>doc.get(ROOT, 'items')[1];

            for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
                const theItemRef: string = <string>doc.get(itemsRef, i)[1]
                const completed: boolean = <boolean>doc.get(theItemRef, 'completed')[1]
                // FIXME(ja): how does one do batch updates (as far as history goes)?
                doc.put(theItemRef, 'completed', !completed)
            }

            return doc;
        })
    };
}

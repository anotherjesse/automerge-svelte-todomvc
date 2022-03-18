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

export const createAppStore = () => {
    const am_store = automerge_store();

    const app_store = derived(am_store, doc => {
        let items: Array<StoreItem> = [];
        if (doc) {
            let itemsRef = <string>doc.value(ROOT, 'items')[1];

            for (let i = 0; i < doc.length(itemsRef); i++) {
                let theItemRef: string = <string>doc.value(itemsRef, i)[1]
                let obj = {}

                doc.keys(theItemRef).forEach((k) => {
                    obj[k] = doc.value(theItemRef, k)[1]
                })
                items.push(obj)
            }
        }
        return items;
    })

    return {
        ...app_store,
        loadAndSaveToFile: am_store.loadAndSaveToFile,
        newSaveFile: am_store.newSaveFile,
        closeFile: am_store.closeFile,
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
                const itemsRef = <string>doc.value(ROOT, 'items')[1];

                for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
                    const theItemRef: string = <string>doc.value(itemsRef, i)[1]
                    const completed: boolean = <boolean>doc.value(theItemRef, 'completed')[1]
                    if (completed) {
                        doc.del(itemsRef, i)
                    }
                }

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
            const itemsRef = <string>doc.value(ROOT, 'items')[1];

            for (let i = doc.length(itemsRef) - 1; i >= 0; i--) {
                const theItemRef: string = <string>doc.value(itemsRef, i)[1]
                const completed: boolean = <boolean>doc.value(theItemRef, 'completed')[1]
                // FIXME(ja): how does one do batch updates (as far as history goes)?
                doc.set(theItemRef, 'completed', !completed)
            }

            return doc;
        })
    };
}

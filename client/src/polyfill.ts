import 'promise-polyfill/src/polyfill';

let promise;

export async function installPolyfills() {
    if(promise) {
        return promise;
    }
    
    const promises = [];
    if (!Array.from) {
        await import(
            /* webpackChunkName: "corejs" */
            'core-js/shim'
        );
    }

    //load fetch polyfill if needed
    if (!('fetch' in window)) {
        promises.push(import(
            /* webpackChunkName: "fetch" */
            'whatwg-fetch/fetch.js'
        ));
    }

    //load fetch polyfill if needed
    if (!('fetch' in window)) {
        promises.push(import(
            /* webpackChunkName: "fetch" */
            'whatwg-fetch/fetch.js'
        ));
    }   

    //load custom elements polyfill
    if (!('customElements' in window)) {
        promises.push(import(
            /* webpackChunkName: "custom-elements" */
            '@webcomponents/custom-elements/custom-elements.min.js'
        ));
    } else {
        promises.push(import(
            /* webpackChunkName: "custom-elements-adapter" */
            '@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js'
        ));
    }

    //add custom events polyfill if needed
    (function () {
        if (typeof (window as any).CustomEvent === "function") return false; //If not IE

        function CustomEvent(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }

        CustomEvent.prototype = (window as any).Event.prototype;

        (window as any).Event = CustomEvent;
    })();

    return Promise.all(promises);
}
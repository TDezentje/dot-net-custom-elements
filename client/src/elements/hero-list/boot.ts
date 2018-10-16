import { installPolyfills } from "polyfill";

installPolyfills().then(() => {
    require('./hero-list.element').HeroListElement;
});
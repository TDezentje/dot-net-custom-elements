export interface ICustomElementOptions {
    selector: string,
    css?: string,
    requires?: any[]
}

export function CustomElement(props: ICustomElementOptions) {
    return function (target) {
        target.selector = props.selector;
        target.whenDefined = window.customElements.whenDefined(props.selector);

        if(props.css) {
            target.prototype.css = (props.css as any);
        }

        let promises = [];
        if (props.requires) {
            for (let requirement of props.requires) {
                promises.push(requirement.whenDefined);
            }
        }

        Promise.all(promises).then(() => {
            window.customElements.define(props.selector, target);
        });

        return target;
    }
}



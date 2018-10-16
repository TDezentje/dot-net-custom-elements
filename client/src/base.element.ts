enum ElementState {
    Initializing = 1,
    Initialized = 2
}

export abstract class BaseElement extends HTMLElement {
    private _props: Partial<this>;

    private slots: any[];
    private elementState: ElementState;
    private propertiesToBind: string[];
    private customAttributes: string[];
    protected css: { [key: string]: string; };

    // Properties used for the TSX language

    public class: string;
    public ref: string;

    // End
    
    public connect?() : void;
    public disconnect?() : void;
    public render?() : any;

    constructor() {
        super();

        if (this.propertiesToBind) {
            for (let property of this.propertiesToBind) {
                this[property] = this[property].bind(this);
            }
        }
    }

    public connectedCallback () {
        if (this.elementState === ElementState.Initialized) {
            if (this.connect) {
                this.connect();
            }
            return;
        }

        this.elementState = ElementState.Initializing;

        const appendChildren = (children) => {
            for (let child of children) {
                if (typeof (child) === 'string') {
                    this.appendChild(document.createTextNode(child));
                } else if (Array.isArray(child)) {
                    appendChildren(child);
                } else if (child) {
                    this.appendChild(child);
                }
            }
        }

        const processChildren = (children) => {
            if (!children) {
                return;
            } else if (!Array.isArray(children)) {
                children = [children];
            }

            let child;
            while ((child = this.firstChild)) {
                this.removeChild(this.firstChild);
            }

            appendChildren(children);
        }

        if (!this.hasAttribute('ssr')) {
            if (this.render && this.children.length === 0) {
                processChildren(this.render());
            }

            const slotsToFill = Array.from(this.querySelectorAll('slot'));
            for(const slotToFill of slotsToFill) {
                const slot = this.slots.find(s => s.id === slotToFill.id);
                
                const fragment = document.createDocumentFragment();
                let child;
                while((child = slot.firstChild)) {
                    slot.removeChild(child);
                    fragment.appendChild(child);
                }

                slotToFill.parentElement.replaceChild(fragment, slotToFill);
            }

            delete this.slots;
        } else {
            if(this.customAttributes) {
                // Get data from custom attributes
                for(const attribute of this.customAttributes) {
                    if(this.hasAttribute(attribute)) {
                        this[attribute] = JSON.parse(this.getAttribute(attribute));
                    }
                }
            }

            const references: any[] = Array.from(this.querySelectorAll('[ref]'));
            const elId = this.getAttribute('element-id');

            for (const reference of references) {
                const value = reference.getAttribute('ref').split('.');

                if (elId === value[0]) {
                    this[value[1]] = reference;
                }
            }
        }

        if (this.connect) {
            this.connect();
        }

        this.elementState = ElementState.Initialized;
    }

    public disconnectedCallback = function () {
        if (this.disconnect && this._elementState === ElementState.Initialized) {
            this.disconnect();
        }
    }
}
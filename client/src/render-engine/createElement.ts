function convertToHTML(string) {
    const div = document.createElement('div');
    div.innerHTML = string;
    return div.children;
}

export function createElement(element: any, attributes: any, ...children: any[]) {
    const childElements = [];

    const addChildrenToChildElements = (children) => {
        for (let child of children) {
            if (typeof (child) === 'string' || typeof (child) === 'number') {
                childElements.push(document.createTextNode(<string>child));
            } else if (Array.isArray(child)) {
                addChildrenToChildElements(child);
            } else if (child && child.isRaw) {
                addChildrenToChildElements(convertToHTML(child.content));
            } else if (child) {
                childElements.push(child);
            }
        }
    };

    let el;
    if (typeof (element) === 'string') {
        el = document.createElement(element);

        for (let attr in attributes) {
            let val = attributes[attr];
    
            if (attr === 'ref') {
                attributes[attr](el);
            } else if (val && typeof (attributes[attr]) === 'boolean') {
                el.setAttribute(attr, '');
            } else if (val) {
                if (attr === 'value' && element === 'input') {
                    el.value = val;
                } else {    
                    el.setAttribute(attr, val);
                }
            }
        }

        addChildrenToChildElements(children);

        for (let child of childElements) {
            el.appendChild(child);
        }
    } else {
        el = new element();

        for (let attr in attributes) {
            let val = attributes[attr];
    
            if (attr === 'ref') {
                attributes[attr](el);
            } else if(attr === 'class' || attr === 'id'){
                el.setAttribute(attr, val);
            } else {
                el[attr] = val;
            }
        }

        el.slots = children;
    }

    return el;
};
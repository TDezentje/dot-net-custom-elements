declare namespace JSX {
    type Element = HTMLElement;
    interface ElementAttributesProperty {
        _props: Partial<this>;
    }
}
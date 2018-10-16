import { CustomElement } from 'decorators/custom-element.decorator';
import { createElement } from 'render-engine';
import { BaseElement } from 'base.element';

@CustomElement({
    selector: 'tom-panel'
})
export class PanelElement extends BaseElement {
    public header: string;

    public render() {
        return [
            <div>
                {this.header}
            </div>,
            <div>
                <slot id="content" />
            </div>
        ];
    }
}
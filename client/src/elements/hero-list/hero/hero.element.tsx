import { CustomElement } from 'decorators/custom-element.decorator';
import { createElement } from 'render-engine';
import { BaseElement } from 'base.element';
import { Hero } from './hero';

@CustomElement({
    selector: 'tom-hero'
})
export class HeroElement extends BaseElement {
    public index: number;
    public hero: Hero;
    
    public render() {
        return <span>
            {this.index}: { this.hero.name }
        </span>;
    }
}
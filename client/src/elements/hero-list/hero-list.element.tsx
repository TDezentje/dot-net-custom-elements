import { CustomElement } from 'decorators/custom-element.decorator';
import { createElement, map } from 'render-engine';

import { BaseElement } from 'base.element';
import { HeroElement } from './hero/hero.element';
import { Hero } from './hero/hero';
import { Bind } from 'decorators/bind.decorator';
import { CustomAttribute } from 'decorators/custom-attribute.decorator';
import { PanelElement } from '../panel/panel.element';

@CustomElement({
    selector: 'tom-hero-list',
    css: './hero-list.scss'
})
export class HeroListElement extends BaseElement {
    private heroContainer: HTMLElement;
    private addHeroButton: HTMLButtonElement;
    private extraHeroes = ['Silver surfer', 'Spiderman', 'Dr. Strange'];

    @CustomAttribute()
    public heroes: Hero[];

    public render() {
        return [
            <PanelElement header="List of heroes">
                <slot id="content">
                    <div ref={this.heroContainer} class={this.css['heroContainer']}>
                    {
                        map(this.heroes, (hero, i) => 
                            <HeroElement hero={hero} index={i + 1} class={this.css['row']}></HeroElement>)
                    }
                    </div>
                    <button ref={this.addHeroButton}>Add hero</button>
                </slot>
            </PanelElement>
        ]
    }

    public connect() {
        this.addHeroButton.addEventListener('click', this.onAddHeroButtonClick);
    }

    @Bind()
    private onAddHeroButtonClick() {
        const hero = new Hero();
        hero.name = this.extraHeroes[Math.floor(Math.random() * this.extraHeroes.length)];

        this.heroContainer.appendChild(<HeroElement hero={hero} index={this.heroContainer.children.length + 1} class={this.css['row']}></HeroElement>);
    } 
}
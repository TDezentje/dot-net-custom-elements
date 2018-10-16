import * as fs from 'fs';
import * as path from 'path';
import {
    ArrayLiteralExpression,
    ArrayTypeNode,
    ArrowFunction,
    BinaryExpression,
    Block,
    CallExpression,
    ClassDeclaration,
    ConditionalExpression,
    Decorator,
    EnumDeclaration,
    EnumMember,
    Expression,
    Identifier,
    JsxAttribute,
    JsxAttributes,
    JsxChild,
    JsxElement,
    JsxSelfClosingElement,
    MethodDeclaration,
    NodeArray,
    ObjectLiteralExpression,
    PrefixUnaryExpression,
    PropertyAccessExpression,
    PropertyAssignment,
    PropertyDeclaration,
    ReturnStatement,
    SourceFile,
    StringLiteral,
    SyntaxKind,
    TransformationContext,
    TransformerFactory,
    TypeNode,
    visitEachChild,
    visitNode,
    Visitor,
    Program,
    TypeChecker,
    SymbolFlags,
    TemplateExpression,
    TemplateHead,
    ElementAccessExpression,
    JsxExpression,
} from 'typescript';

let config: { outputDir: string, namespace: string };
let typeChecker: TypeChecker;

function capitalize(text: string) {
    return text.substr(0, 1).toUpperCase() + text.substr(1);
}

function parseType(type: TypeNode, name: string = '') {
    const typeMap = {
        number: 'decimal',
        boolean: 'bool',
        Date: 'DateTime',
        string: 'string',
    }

    if (!type) {
        throw new Error(`Propery "${name}" needs a type`);
    }

    let prefix = '';
    let postfix = '';

    if (type.kind === SyntaxKind.ArrayType) {
        type = (type as ArrayTypeNode).elementType;

        prefix = 'IEnumerable<';
        postfix = '>';
    }

    let text = type.getText();

    if (typeMap[text]) {
        text = typeMap[text]
    } else {
        const typeDeclaration = typeChecker.getTypeAtLocation(type).symbol.valueDeclaration;
        if(typeDeclaration.kind === SyntaxKind.ClassDeclaration) {
            const model = new Model(typeDeclaration as ClassDeclaration);
            model.writeToFile();
        } else if(typeDeclaration.kind === SyntaxKind.EnumDeclaration) {
            const enumeration = new Enumeration(typeDeclaration as EnumDeclaration);
            enumeration.writeToFile();
        }
    }
    
    return `${prefix}${text}${postfix}`;
}

class Model {
    private name: string;

    constructor(protected node: ClassDeclaration) {
        this.name = node.name.getText();
    }

    protected propertiesToString() {
        return this.node.members.map((member: PropertyDeclaration) => {
            if (member.kind !== SyntaxKind.PropertyDeclaration || !member.modifiers.some(m => m.kind === SyntaxKind.PublicKeyword)) {
                return '';
            } else {
                return `public ${parseType(member.type, member.name.getText())} ${capitalize(member.name.getText())};`
            }
        }).join('');
    }

    public writeToFile() {
        fs.writeFileSync(path.resolve(config.outputDir, 'Models', `${this.name}.cs`),
            `using System;
            using System.Collections.Generic;

            namespace ${config.namespace}.Models
            {
                public class ${this.name}
                {${ this.propertiesToString()}
                }
            }`);
    }
}

class Enumeration {
    private name: string;

    constructor(private node: EnumDeclaration) {
        this.name = node.name.getText();
    }

    public writeToFile() {
        fs.writeFileSync(path.resolve(config.outputDir, 'Models', `${this.node.name.getText()}.cs`),
            `namespace ${config.namespace}.Models
            {
                public enum ${this.name} 
                {
                    ${ this.node.members.map((member: EnumMember) => 
                        `${capitalize(member.getText())}, `
                    ).join('')}
                }
            }`);
    }
}

class CustomElement {
    private name: string;
    private functionsToRender: string[] = [];

    constructor(private node: ClassDeclaration) {
        this.name = node.name.getText();
    }

    private get selector() {
        const decorator = this.node.decorators.find((d: Decorator) => (d.expression as CallExpression).expression.getText() === 'CustomElement');

        return ((((decorator.expression as CallExpression)
            .arguments[0] as ObjectLiteralExpression)
            .properties.find(p => p.name.getText() === 'selector') as PropertyAssignment)
            .initializer as StringLiteral).text;

    }

    public writeToFile() {
        const renderMethod = this.node.members.find(m => m.kind === SyntaxKind.MethodDeclaration && m.name.getText() === 'render') as MethodDeclaration;

        if(renderMethod) {
            this.functionsToRender.push(this.renderRenderMethod(renderMethod));
        }

        fs.writeFileSync(path.resolve(config.outputDir, `${this.node.name.getText()}.cs`),
            `using System;
            using System.Collections;
            using System.Collections.Generic;
            using Elements.Models;
            using Elements.Css;

            namespace ${config.namespace}
            {
                public class ${this.name} : CustomElement
                {
                    protected override string Selector { get { return "${this.selector}"; } }
                    ${ this.renderCssName()}
                    ${ this.renderCustomAttributes()}
                    ${ this.propertiesToString()}
                    ${ this.renderConstructor()}
                    ${ this.functionsToRender.join(' ')}
                }
            }`);
    }

    private renderCssName() {
        const decorator = this.node.decorators.find((d: Decorator) => (d.expression as CallExpression).expression.getText() === 'CustomElement');

        const css = (((decorator.expression as CallExpression)
            .arguments[0] as ObjectLiteralExpression)
            .properties.find(p => p.name.getText() === 'css') as PropertyAssignment);
        
        if(!css) {
            return '';
        } else {
            const cssPath = (css.initializer as StringLiteral).text;
            const pathParts = cssPath.split('/');
            let fileName = pathParts[pathParts.length-1];
            fileName = fileName.split('.')[0];

            return `protected override Hashtable Css { get { return CssModules.${fileName.split('-').map(capitalize).join('')}; } }`;
        }
    }

    private getPublicProperties() {
        return this.node.members
            .filter(m => m.kind === SyntaxKind.PropertyDeclaration && 
                m.modifiers.some(m => m.kind === SyntaxKind.PublicKeyword));
    }

    private renderCustomAttributes() {
        const attributes = this.getPublicProperties().filter(p => p.decorators && 
            p.decorators.some((d: Decorator) => (d.expression as CallExpression).expression.getText() === 'CustomAttribute'))
            .map(p => `"${p.name.getText()}"`);

        return `protected override string[] CustomAttributes { get { return new string[] {${attributes.join(',')} }; } }`;
    }

    private renderConstructor() {
        return `public ${this.name}(): base() {
            ${this.getPublicProperties()
                .filter(m => (m as PropertyDeclaration).initializer)
                .map((m: PropertyDeclaration) => `${capitalize(m.name.getText())} = ${this.renderExpression(m.initializer)};`).join(' ')}
        }`;
    }

    private propertiesToString() {
        return this.getPublicProperties().map((member: PropertyDeclaration) => {
            const name = member.name.getText();
            const type = parseType(member.type, name);

            return `
                public ${type} ${capitalize(name)}
                {
                    get { return (${type})attributes["${name}"]; }
                    set { attributes["${name}"] = value; }
                }`;
        }).join('');
    }

    private renderRenderMethod(renderMethod: MethodDeclaration) {
        let body = '';
        const name = renderMethod.name.getText();

        if (((renderMethod as MethodDeclaration).body as Block).statements.length !== 1) {
            body = `throw new Exception("${name} method should return immediately");`;
        } else {
            const returnStatement = ((renderMethod as MethodDeclaration).body as Block).statements[0] as ReturnStatement;

            if ((
                returnStatement.expression.kind !== SyntaxKind.ArrayLiteralExpression &&
                returnStatement.expression.kind !== SyntaxKind.JsxElement &&
                returnStatement.expression.kind !== SyntaxKind.JsxSelfClosingElement
            ) || (
                    returnStatement.expression.kind === SyntaxKind.ArrayLiteralExpression &&
                    (returnStatement.expression as ArrayLiteralExpression).elements.some(el => el.kind !== SyntaxKind.JsxElement && el.kind !== SyntaxKind.JsxSelfClosingElement)
                )) {
                body = `throw new Exception("${name} method should return either JSX or an array of JSX");`;
            } else {
                let elements: Expression[] | NodeArray<Expression>;

                if (returnStatement.expression.kind === SyntaxKind.JsxElement || returnStatement.expression.kind === SyntaxKind.JsxSelfClosingElement) {
                    elements = [returnStatement.expression];
                } else {
                    elements = (returnStatement.expression as ArrayLiteralExpression).elements;
                }

                body = `return new List<object> {
                    ${(elements as any).map(this.renderJsxElement.bind(this)).join(',')}
                };`;
            }
        }

        if(name === 'render') {
            return `public override IEnumerable<object> Render() { ${body} }`;
        } else {
            return `private IEnumerable<object> ${capitalize(name)}(${renderMethod.parameters.map(p => 
                `${p.type ? `${parseType(p.type)} ` : ''}${p.name.getText()}`).join(', ')
            }) { ${body} }`;
        }
    }

    private renderJsxElement(node: JsxSelfClosingElement | JsxElement) {
        let elementName: string;
        let attributes: JsxAttributes;
        let children: NodeArray<JsxChild>;

        if (node.kind === SyntaxKind.JsxSelfClosingElement) {
            let element = node as JsxSelfClosingElement;
            attributes = element.attributes;
            elementName = element.tagName.getText();
        } else {
            let element = node as JsxElement;
            attributes = element.openingElement.attributes;
            elementName = element.openingElement.tagName.getText();
            children = element.children;
        }

        return `CreateElement(
            ${elementName[0].toUpperCase() === elementName[0] ? `new ${elementName}()` : `"${elementName}"`},
            ${ attributes.properties.length === 0 ? 'null' :
                `new Hashtable {${attributes.properties.map(this.renderAttribute.bind(this)).join(',')} }`
            }
            ${children && children.length > 0 ? `, ${children.map(this.renderJsxChild.bind(this)).join(', ')}` : ''}
        )`;
    }

    private renderJsxChild(node: JsxChild) {
        if(node.kind === SyntaxKind.JsxText) {
            return `@"${node.getText()}"`;
        } else if (node.kind === SyntaxKind.JsxExpression) {
            return this.renderExpression(node.expression);
        } else if (node.kind === SyntaxKind.JsxElement || node.kind === SyntaxKind.JsxSelfClosingElement) {
            return this.renderJsxElement(node);
        } else {
            throw new Error(`JsxChild not implemented: ${node.getText()}`);
        }
    }

    private renderAttribute(attribute: JsxAttribute) {
        let initializer = 'true';

        if(attribute.name.getText() === 'ref') {
            const exp = attribute.initializer as JsxExpression;
            initializer = `"${(exp.expression as PropertyAccessExpression).name.getText()}"`;
        } else if (attribute.initializer && attribute.initializer.kind === SyntaxKind.StringLiteral) {
            initializer = `"${attribute.initializer.text}"`;
        } else if (attribute.initializer && attribute.initializer.kind === SyntaxKind.JsxExpression) {
            initializer = this.renderExpression(attribute.initializer.expression);
        } else if (attribute.initializer) {
            throw new Error(`Attribute initializer not implemented: ${attribute.getText()}`);
        }

        return `{ "${ attribute.name.getText()}", ${initializer} }`;
    }

    private renderExpression(expression: Expression) {
        if (expression.kind === SyntaxKind.ThisKeyword) {
            return 'this';

        } else if (expression.kind === SyntaxKind.NumericLiteral) {
            return expression.getText();

        } else if (expression.kind === SyntaxKind.StringLiteral || expression.kind === SyntaxKind.NoSubstitutionTemplateLiteral) {
            return `"${(expression as StringLiteral).text}"`;

        } else if (expression.kind === SyntaxKind.Identifier) {
            const symbol = typeChecker.getSymbolAtLocation(expression);
            let name = expression.getText();

            if(symbol && symbol.flags !== SymbolFlags.FunctionScopedVariable && symbol.flags !== SymbolFlags.BlockScopedVariable) {
                name = capitalize(name);
            }
 
            return name;

        } else if (expression.kind === SyntaxKind.JsxElement) {
            return this.renderJsxElement(expression as JsxElement);

        } else if (expression.kind === SyntaxKind.PropertyAccessExpression) {
            let exp = expression as PropertyAccessExpression;

            if(exp.expression.kind === SyntaxKind.ThisKeyword && exp.name.kind === SyntaxKind.Identifier) {
                const symbol = typeChecker.getSymbolAtLocation(exp.name);
                if(symbol && symbol.valueDeclaration && symbol.valueDeclaration.kind === SyntaxKind.MethodDeclaration) {
                    this.functionsToRender.push(this.renderRenderMethod(symbol.valueDeclaration as MethodDeclaration));
                }
            }
            

            return `${this.renderExpression(exp.expression)}.${this.renderExpression(exp.name)}`;

        } else if (expression.kind === SyntaxKind.PrefixUnaryExpression) {
            let exp = expression as PrefixUnaryExpression;
            return `IsFalsy(${this.renderExpression(exp.operand)})`;

        } else if (expression.kind === SyntaxKind.BinaryExpression) {
            let exp = expression as BinaryExpression;
            let operator = exp.operatorToken.getText();

            if (operator === '===') {
                operator = '==';
            } else if (operator === '!==') {
                operator = '!=';
            }

            return `${this.renderExpression(exp.left)} ${operator} ${this.renderExpression(exp.right)}`;

        } else if (expression.kind === SyntaxKind.ConditionalExpression) {
            let exp = expression as ConditionalExpression;
            return `${this.renderExpression(exp.condition)} ? ${this.renderExpression(exp.whenTrue)} : ${this.renderExpression(exp.whenFalse)}`;

        } else if (expression.kind === SyntaxKind.CallExpression) {
            let exp = expression as CallExpression;
            return `${this.renderExpression(exp.expression)}(${exp.arguments.map(this.renderExpression.bind(this)).join(', ')})`;

        } else if (expression.kind === SyntaxKind.ArrowFunction) {
            let exp = expression as ArrowFunction;
            return `(${exp.parameters.map(p => `${p.type ? `${parseType(p.type)} ` : ''}${p.name.getText()}`).join(', ')}) => ${this.renderExpression(exp.body as any)}`;

        } else if(expression.kind === SyntaxKind.TemplateExpression) {
            let exp = expression as TemplateExpression;
            return `$@"${(exp.head as TemplateHead).text}${exp.templateSpans.map(span => `{(${this.renderExpression(span.expression)})}${span.literal.text}`).join('')}"`;
        } else if(expression.kind === SyntaxKind.ElementAccessExpression) {
            let exp = expression as ElementAccessExpression;
            return `${this.renderExpression(exp.expression)}[${this.renderExpression(exp.argumentExpression)}]`
        } else {
            throw new Error(`Structure not implemented for C#: ${expression.getText()}`)
        }
    }
}

export function createTransformer(options: { outputDir: string, namespace: string, program: Program }) {
    let {
        outputDir,
        namespace,
        program
    } = options;

    if (!outputDir) {
        throw new Error('outputDir is not set');
    }

    if (!namespace) {
        throw new Error('namespace is not set');
    }

    if (!program) {
        throw new Error('program is not set');
    }

    config = {
        outputDir: outputDir,
        namespace: namespace
    };

    typeChecker = program.getTypeChecker();

    if(!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
        fs.mkdirSync(path.resolve(outputDir, 'Models'));
    }

    const transformer: TransformerFactory<SourceFile> = (context: TransformationContext) => {
        const visitor: Visitor = (node) => {

            // Search for class decorations
            if (node.kind === SyntaxKind.ClassDeclaration) {
                const classNode = (node as ClassDeclaration);
                const decorators = classNode.decorators;

                if (decorators &&
                    decorators.some((d: Decorator) => (d.expression as CallExpression).expression.getText() === 'CustomElement')) {
                    const element = new CustomElement(classNode);
                    element.writeToFile();
                }
                return node;
            }

            return visitEachChild(node, visitor, context);
        }

        return (source: SourceFile) => {
            return visitNode(source, visitor);
        }
    };

    return transformer;
};
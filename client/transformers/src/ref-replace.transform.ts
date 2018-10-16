import { SyntaxKind, TransformerFactory, TransformationContext, Visitor, SourceFile, visitNode, visitEachChild, JsxAttribute, createArrowFunction, createParameter, createToken, createIdentifier, createBinary, Expression } from 'typescript';

const transformer: TransformerFactory<SourceFile> = (context: TransformationContext) => {
    const visitor: Visitor = (node) => {
        if (node.kind === SyntaxKind.PropertyAccessExpression &&
            node.parent.kind === SyntaxKind.JsxExpression &&
            node.parent.parent.kind === SyntaxKind.JsxAttribute &&
            (node.parent.parent as JsxAttribute).name.getText() === 'ref') {

            return createArrowFunction([], [], [
                createParameter([], [], null, createIdentifier('val'))
            ], null, createToken(SyntaxKind.EqualsGreaterThanToken),
            createBinary(node as Expression, createToken(SyntaxKind.EqualsToken), createIdentifier('val')));
        }

        return visitEachChild(node, visitor, context);
    }

    return (node) => visitNode(node, visitor);
};

export { transformer };
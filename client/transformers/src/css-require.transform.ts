import * as ts from 'typescript';
import { ObjectLiteralExpression, SyntaxKind, CallExpression, Identifier, StringLiteral, TransformerFactory, TransformationContext, Visitor, SourceFile, PropertyAssignment } from 'typescript';

const transformer: TransformerFactory<SourceFile> = (context: TransformationContext) => {
    const visitor: Visitor = (node) => {
        if (node.parent &&
            node.kind === SyntaxKind.StringLiteral &&
            node.parent.kind === SyntaxKind.PropertyAssignment &&
            (node.parent as PropertyAssignment).name.getText() === 'css' &&
            node.parent.parent.kind === SyntaxKind.ObjectLiteralExpression &&
            node.parent.parent.parent.kind === SyntaxKind.CallExpression &&
            (node.parent.parent.parent as CallExpression).expression.kind === SyntaxKind.Identifier &&
            ((node.parent.parent.parent as CallExpression).expression as Identifier).text === 'CustomElement') {
                
            return ts.createCall(ts.createIdentifier('require'), [], [
                node as StringLiteral
            ]);
        }

        return ts.visitEachChild(node, visitor, context);
    }

    return (node) => ts.visitNode(node, visitor);
};

export { transformer };
import {
    SyntaxKind, ComputedPropertyName, FromClause, LetClause, WhereClause,
    OrderbyClause, OrderbyComparator, GroupClause, JoinClause, QueryExpression,
    ParenthesizedExpression, Elision, SpreadElement, ArrayLiteral, PropertyDefinition,
    ShorthandPropertyDefinition, ObjectLiteral, NewExpression, CallExpression,
    PropertyAccessExpression, ElementAccessExpression, PrefixUnaryExpression,
    PostfixUnaryExpression, BinaryExpression, ConditionalExpression, SelectClause,
    TextLiteral, Node, ArrowFunction,
    CommaListExpression, BindingElement, BindingRestElement,
    ObjectBindingPattern, ArrayBindingPattern, BindingProperty, AssignmentExpressionOrHigher,
    BindingRestProperty, ShorthandBindingProperty, ObjectAssignmentPattern, AssignmentProperty,
    ShorthandAssignmentProperty, ArrayAssignmentPattern, AssignmentElement, AssignmentRestElement,
    AssignmentExpression, AssignmentRestProperty, SequenceBinding, ThisExpression, NullLiteral,
    BooleanLiteral, Identifier, Block, LetStatement, ExpressionStatement, ReturnStatement,
} from "./syntax";
import { assertNever } from "./utils";
import { Token } from "./tokens";

const indents: string[] = ["", "  "];

function getIndent(depth: number): string {
    if (depth < indents.length) return indents[depth];
    return indents[depth] = getIndent(depth - 1) + indents[1];
}

export class Emitter {
    private _text = "";
    private _spacePending = false;
    private _indentDepth = 0;
    private _newlinePending = false;

    emit(node: Node) {
        this._text = "";
        this._spacePending = false;
        this._indentDepth = 0;
        this._newlinePending = false;
        this.emitNode(node);
        return this.toString();
    }

    toString() {
        return this._text;
    }

    private indent() {
        this._indentDepth++;
    }

    private dedent() {
        this._indentDepth--;
    }

    private writeSpace() {
        this._spacePending = true;
    }

    private writeLine() {
        this._newlinePending = true;
    }

    private write(text: string) {
        if (text) {
            if (this._newlinePending) {
                this._newlinePending = false;
                this._spacePending = false;
                if (this._text) this._text += "\n";
                if (this._indentDepth) this._text += getIndent(this._indentDepth);
            }
            if (this._spacePending) {
                this._spacePending = false;
                if (this._text) this._text += " ";
            }
            this._text += text;
        }
    }

    private writeNode(node: Node | undefined) {
        if (node) this.emitNode(node);
    }

    private writeNodeList(nodes: ReadonlyArray<Node>, separator: Token.Punctuation, multiLine = false) {
        this.indent();
        let first = true;
        for (const node of nodes) {
            if (first) {
                first = false;
            }
            else {
                this.writeToken(separator);
                if (multiLine) {
                    this.writeLine();
                }
                else {
                    this.writeSpace();
                }
            }
            this.writeNode(node);
        }
        this.dedent();
    }

    private writeToken(kind: Token.SourceToken) {
        let leadingSpace = false;
        let trailingSpace = false;
        if (Token.isKeyword(kind)) {
            const ch = this._text.length > 0 ? this._text.charAt(this._text.length - 1) : undefined;
            leadingSpace = ch !== undefined && ch !== "(" && ch !== "[";
            trailingSpace = true;
        }
        else if (Token.isPunctuation(kind)) {
            const requestSpace =
                kind !== Token.OpenBracketToken &&
                kind !== Token.CloseBracketToken &&
                kind !== Token.OpenParenToken &&
                kind !== Token.CloseParenToken &&
                kind !== Token.DotToken &&
                kind !== Token.DotDotDotToken &&
                kind !== Token.ExclamationToken &&
                kind !== Token.TildeToken &&
                kind !== Token.CommaToken;
            leadingSpace = requestSpace &&
                kind !== Token.OpenBraceToken &&
                kind !== Token.ColonToken;
            trailingSpace = requestSpace &&
                kind !== Token.CloseBraceToken;
        }

        if (leadingSpace) this.writeSpace();
        this.write(Token.tokenToString(kind));
        if (trailingSpace) this.writeSpace();
    }

    private emitNode(node: Node) {
        switch (node.kind) {
            // Literals
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NumberLiteral:
            case SyntaxKind.RegularExpressionLiteral:
                return this.emitTextLiteral(node);

            // Names
            case SyntaxKind.Identifier: return this.emitIdentifier(node);
            case SyntaxKind.ComputedPropertyName: return this.emitComputedPropertyName(node);

            // Query body clauses
            case SyntaxKind.FromClause: return this.emitFromClause(node);
            case SyntaxKind.LetClause: return this.emitLetClause(node);
            case SyntaxKind.WhereClause: return this.emitWhereClause(node);
            case SyntaxKind.OrderbyClause: return this.emitOrderbyClause(node);
            case SyntaxKind.OrderbyComparator: return this.emitOrderbyComparator(node);
            case SyntaxKind.GroupClause: return this.emitGroupClause(node);
            case SyntaxKind.JoinClause: return this.emitJoinClause(node);
            case SyntaxKind.SelectClause: return this.emitSelectClause(node);
            case SyntaxKind.SequenceBinding: return this.emitSequenceBinding(node);

            // Expressions
            case SyntaxKind.ThisExpression: return this.emitThisExpression(node);
            case SyntaxKind.NullLiteral: return this.emitNullLiteral(node);
            case SyntaxKind.BooleanLiteral: return this.emitBooleanLiteral(node);
            case SyntaxKind.ArrowFunction: return this.emitArrowFunction(node);
            case SyntaxKind.PrefixUnaryExpression: return this.emitPrefixUnaryExpression(node);
            case SyntaxKind.PostfixUnaryExpression: return this.emitPostfixUnaryExpression(node);
            case SyntaxKind.ParenthesizedExpression: return this.emitParenthesizedExpression(node);
            case SyntaxKind.CallExpression: return this.emitCallExpression(node);
            case SyntaxKind.NewExpression: return this.emitNewExpression(node);
            case SyntaxKind.PropertyAccessExpression: return this.emitPropertyAccessExpression(node);
            case SyntaxKind.ElementAccessExpression: return this.emitElementAccessExpression(node);
            case SyntaxKind.ObjectLiteral: return this.emitObjectLiteral(node);
            case SyntaxKind.ArrayLiteral: return this.emitArrayLiteral(node);
            case SyntaxKind.Elision: return this.emitElision(node);
            case SyntaxKind.SpreadElement: return this.emitSpreadElement(node);
            case SyntaxKind.BinaryExpression: return this.emitBinaryExpression(node);
            case SyntaxKind.ConditionalExpression: return this.emitConditionalExpression(node);
            case SyntaxKind.QueryExpression: return this.emitQueryExpression(node);
            case SyntaxKind.AssignmentExpression: return this.emitAssignmentExpression(node);
            case SyntaxKind.CommaListExpression: return this.emitCommaListExpression(node);

            // Declarations
            case SyntaxKind.BindingElement: return this.emitBindingElement(node);
            case SyntaxKind.BindingRestElement: return this.emitBindingRestElement(node);
            case SyntaxKind.PropertyDefinition: return this.emitPropertyDefinition(node);
            case SyntaxKind.ShorthandPropertyDefinition: return this.emitShorthandPropertyDefinition(node);

            // Patterns
            case SyntaxKind.ObjectBindingPattern: return this.emitObjectBindingPattern(node);
            case SyntaxKind.BindingRestProperty: return this.emitBindingRestProperty(node);
            case SyntaxKind.BindingProperty: return this.emitBindingProperty(node);
            case SyntaxKind.ShorthandBindingProperty: return this.emitShorthandBindingProperty(node);
            case SyntaxKind.ObjectAssignmentPattern: return this.emitObjectAssignmentPattern(node);
            case SyntaxKind.AssignmentProperty: return this.emitAssignmentProperty(node);
            case SyntaxKind.AssignmentRestProperty: return this.emitAssignmentRestProperty(node);
            case SyntaxKind.ShorthandAssignmentProperty: return this.emitShorthandAssignmentProperty(node);
            case SyntaxKind.ArrayBindingPattern: return this.emitArrayBindingPattern(node);
            case SyntaxKind.ArrayAssignmentPattern: return this.emitArrayAssignmentPattern(node);
            case SyntaxKind.AssignmentElement: return this.emitAssignmentElement(node);
            case SyntaxKind.AssignmentRestElement: return this.emitAssignmentRestElement(node);

            // Statements
            case SyntaxKind.Block: return this.emitBlock(node);
            case SyntaxKind.LetStatement: return this.emitLetStatement(node);
            case SyntaxKind.ExpressionStatement: return this.emitExpressionStatement(node);
            case SyntaxKind.ReturnStatement: return this.emitReturnStatement(node);

            // Cover Grammars
            case SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList:
            case SyntaxKind.CoverInitializedName:
            case SyntaxKind.CoverElementAccessExpressionAndQueryExpressionHead:
            case SyntaxKind.CoverBinaryExpressionAndQueryExpressionHead:
                throw new Error("Not supported");

            default:
                return assertNever(node);
        }
    }

    // Literals

    private emitTextLiteral(node: TextLiteral): void {
        this.write(node.text);
    }

    // Keywords
    // Punctuation
    // Selectors

    // private emitToken(node: Token): void {
    //     if (isKeywordKind(node.kind)) {
    //         this.writeKeyword(node.kind);
    //     }
    //     else if (node.kind !== SyntaxKind.EndOfFileToken) {
    //         this.writePunctuation(node.kind);
    //     }
    // }

    // Names

    private emitIdentifier(node: Identifier): void {
        this.write(node.text);
    }

    private emitComputedPropertyName(node: ComputedPropertyName): void {
        this.writeToken(Token.OpenBracketToken);
        this.writeNode(node.expression);
        this.writeToken(Token.CloseBracketToken);
    }

    // Query Clauses

    private emitSequenceBinding(node: SequenceBinding): void {
        if (node.await) this.writeToken(Token.AwaitKeyword);
        this.writeNode(node.name);
        this.writeToken(Token.InKeyword);
        this.writeNode(node.expression);
    }

    private emitFromClause(node: FromClause): void {
        this.writeNode(node.outerClause);
        this.writeToken(Token.FromKeyword);
        this.writeNode(node.sequenceBinding);
        this.writeLine();
    }

    private emitLetClause(node: LetClause): void {
        this.writeNode(node.outerClause);
        this.writeToken(Token.LetKeyword);
        this.writeNode(node.name);
        this.writeToken(Token.EqualsToken);
        this.writeNode(node.expression);
        this.writeLine();
    }

    private emitWhereClause(node: WhereClause): void {
        this.writeNode(node.outerClause);
        this.writeToken(Token.WhereKeyword);
        this.writeNode(node.expression);
        this.writeLine();
    }

    private emitOrderbyClause(node: OrderbyClause): void {
        this.writeNode(node.outerClause);
        this.writeToken(Token.OrderbyKeyword);
        this.writeNodeList(node.comparators, Token.CommaToken, true);
        this.writeLine();
    }

    private emitOrderbyComparator(node: OrderbyComparator): void {
        this.writeNode(node.expression);
        if (node.direction !== undefined) this.writeToken(node.direction);
        if (node.usingExpression) {
            this.writeToken(Token.UsingKeyword);
            this.writeNode(node.usingExpression);
        }
    }

    private emitGroupClause(node: GroupClause): void {
        this.writeNode(node.outerClause);
        this.writeToken(Token.GroupKeyword);
        this.writeNode(node.elementSelector);
        this.writeToken(Token.ByKeyword);
        this.writeNode(node.keySelector);
        if (node.into) {
            this.writeToken(Token.IntoKeyword);
            this.writeNode(node.into);
        }
        this.writeLine();
    }

    private emitJoinClause(node: JoinClause): void {
        this.writeNode(node.outerClause);
        this.writeToken(Token.JoinKeyword);
        this.writeNode(node.sequenceBinding);
        this.writeToken(Token.OnKeyword);
        this.writeNode(node.outerKeySelector);
        this.writeToken(Token.EqualsKeyword);
        this.writeNode(node.keySelector);
        if (node.into) {
            this.writeToken(Token.IntoKeyword);
            this.writeNode(node.into);
        }
        this.writeLine();
    }

    private emitSelectClause(node: SelectClause): void {
        this.writeNode(node.outerClause);
        this.writeToken(Token.SelectKeyword);
        this.writeNode(node.expression);
        if (node.into) {
            this.writeToken(Token.IntoKeyword);
            this.writeNode(node.into);
        }
        this.writeLine();
    }

    // Expressions

    private emitThisExpression(_node: ThisExpression): void {
        this.writeToken(Token.ThisKeyword);
    }

    private emitNullLiteral(_node: NullLiteral): void {
        this.writeToken(Token.NullKeyword);
    }

    private emitBooleanLiteral(node: BooleanLiteral): void {
        this.writeToken(node.value ? Token.TrueKeyword : Token.FalseKeyword);
    }

    private emitArrowFunction(node: ArrowFunction): void {
        if (node.async) this.writeToken(Token.AsyncKeyword);
        if (!node.async && node.parameterList.length === 1 && node.parameterList[0].name.kind === SyntaxKind.Identifier && !node.parameterList[0].initializer) {
            this.writeNode(node.parameterList[0]);
        }
        else {
            this.writeToken(Token.OpenParenToken);
            this.writeNodeList(node.parameterList, Token.CommaToken);
            this.writeToken(Token.CloseParenToken);
        }
        this.writeToken(Token.EqualsGreaterThanToken);
        this.writeNode(node.body);
    }

    private emitPrefixUnaryExpression(node: PrefixUnaryExpression): void {
        this.writeToken(node.operator);
        this.writeNode(node.expression);
    }

    private emitPostfixUnaryExpression(node: PostfixUnaryExpression): void {
        this.writeNode(node.expression);
        this.writeToken(node.operator);
    }

    private emitParenthesizedExpression(node: ParenthesizedExpression): void {
        this.writeToken(Token.OpenParenToken);
        this.writeNode(node.expression);
        this.writeToken(Token.CloseParenToken);
    }

    private emitCallExpression(node: CallExpression): void {
        this.writeNode(node.expression);
        this.writeToken(Token.OpenParenToken);
        this.writeNodeList(node.argumentList, Token.CommaToken);
        this.writeToken(Token.CloseParenToken);
    }

    private emitNewExpression(node: NewExpression): void {
        this.writeToken(Token.NewKeyword);
        this.writeNode(node.expression);
        if (node.argumentList) {
            this.writeToken(Token.OpenParenToken);
            this.writeNodeList(node.argumentList, Token.CommaToken);
            this.writeToken(Token.CloseParenToken);
        }
    }

    private emitPropertyAccessExpression(node: PropertyAccessExpression): void {
        this.writeNode(node.expression);
        this.writeToken(Token.DotToken);
        this.writeNode(node.name);
    }

    private emitElementAccessExpression(node: ElementAccessExpression): void {
        this.writeNode(node.expression);
        this.writeToken(Token.OpenBracketToken);
        this.writeNode(node.argumentExpression);
        this.writeToken(Token.CloseBracketToken);
    }

    private emitObjectLiteral(node: ObjectLiteral): void {
        this.writeToken(Token.OpenBraceToken);
        this.writeNodeList(node.properties, Token.CommaToken, node.properties.length > 4);
        this.writeToken(Token.CloseBraceToken);
    }

    private emitArrayLiteral(node: ArrayLiteral): void {
        this.writeToken(Token.OpenBracketToken);
        this.writeNodeList(node.elements, Token.CommaToken);
        this.writeToken(Token.CloseBracketToken);
    }

    private emitElision(_node: Elision): void {
        this.writeSpace();
    }

    private emitSpreadElement(node: SpreadElement): void {
        this.writeToken(Token.DotDotDotToken);
        this.writeNode(node.expression);
    }

    private emitBinaryExpression(node: BinaryExpression): void {
        this.writeNode(node.left);
        this.writeToken(node.operator);
        this.writeNode(node.right);
    }

    private emitConditionalExpression(node: ConditionalExpression): void {
        this.writeNode(node.condition);
        this.writeToken(Token.QuestionToken);
        this.writeNode(node.whenTrue);
        this.writeSpace();
        this.writeToken(Token.ColonToken);
        this.writeNode(node.whenFalse);
    }

    private emitQueryExpression(node: QueryExpression): void {
        this.writeNode(node.query);
    }

    private emitAssignmentExpression(node: AssignmentExpression): void {
        this.writeNode(node.left);
        this.writeToken(node.operator);
        this.writeNode(node.right);
    }

    private emitCommaListExpression(node: CommaListExpression): void {
        this.writeNodeList(node.expressions, Token.CommaToken);
    }

    // Declarations

    private emitBindingElement(node: BindingElement): void {
        this.writeNode(node.name);
        this.emitInitializer(node.initializer);
    }

    private emitBindingRestElement(node: BindingRestElement): void {
        this.writeToken(Token.DotDotDotToken);
        this.writeNode(node.name);
    }

    private emitPropertyDefinition(node: PropertyDefinition): void {
        this.writeNode(node.name);
        this.writeToken(Token.ColonToken);
        this.writeNode(node.initializer);
    }

    private emitShorthandPropertyDefinition(node: ShorthandPropertyDefinition): void {
        this.writeNode(node.name);
    }

    // Patterns

    private emitObjectBindingPattern(node: ObjectBindingPattern): void {
        this.writeToken(Token.OpenBraceToken);
        this.emitCommaDelimitedListWithRest(node.properties, node.rest);
        this.writeToken(Token.CloseBraceToken);
    }

    private emitBindingRestProperty(node: BindingRestProperty): void {
        this.writeToken(Token.DotDotDotToken);
        this.writeNode(node.name);
    }

    private emitBindingProperty(node: BindingProperty): void {
        this.writeNode(node.propertyName);
        this.writeToken(Token.ColonToken);
        this.writeSpace();
        this.writeNode(node.bindingElement);
    }

    private emitShorthandBindingProperty(node: ShorthandBindingProperty): void {
        this.writeNode(node.name);
        this.emitInitializer(node.initializer);
    }

    private emitObjectAssignmentPattern(node: ObjectAssignmentPattern): void {
        this.writeToken(Token.OpenBraceToken);
        this.emitCommaDelimitedListWithRest(node.properties, node.rest);
        this.writeToken(Token.CloseBraceToken);
    }

    private emitAssignmentProperty(node: AssignmentProperty): void {
        this.writeNode(node.propertyName);
        this.writeToken(Token.ColonToken);
        this.writeSpace();
        this.writeNode(node.assignmentElement);
    }

    private emitAssignmentRestProperty(node: AssignmentRestProperty): void {
        this.writeToken(Token.DotDotDotToken);
        this.writeNode(node.expression);
    }

    private emitShorthandAssignmentProperty(node: ShorthandAssignmentProperty): void {
        this.writeNode(node.name);
        this.emitInitializer(node.initializer);
    }

    private emitArrayBindingPattern(node: ArrayBindingPattern): void {
        this.writeToken(Token.OpenBracketToken);
        this.emitCommaDelimitedListWithRest(node.elements, node.rest);
        this.writeToken(Token.CloseBracketToken);
    }

    private emitArrayAssignmentPattern(node: ArrayAssignmentPattern): void {
        this.writeToken(Token.OpenBracketToken);
        this.emitCommaDelimitedListWithRest(node.elements, node.rest);
        this.writeToken(Token.CloseBracketToken);
    }

    private emitAssignmentElement(node: AssignmentElement): void {
        this.writeNode(node.target);
        this.emitInitializer(node.initializer);
    }

    private emitAssignmentRestElement(node: AssignmentRestElement): void {
        this.writeToken(Token.DotDotDotToken);
        this.writeNode(node.target);
    }

    private emitCommaDelimitedListWithRest<T extends Node>(nodeList: ReadonlyArray<T>, rest: Node | undefined): void {
        this.writeNodeList(nodeList, Token.CommaToken);
        if (nodeList.length > 0 && rest) this.writeToken(Token.CommaToken);
        this.writeNode(rest);
    }

    private emitInitializer(node: AssignmentExpressionOrHigher | undefined) {
        if (node) {
            this.writeToken(Token.EqualsToken);
            this.writeNode(node);
        }
    }

    // Statements

    private emitBlock(node: Block) {
        this.writeToken(Token.OpenBraceToken);
        this.indent();
        for (const statement of node.statements) {
            this.writeLine();
            this.writeNode(statement);
        }
        this.dedent();
        this.writeLine();
        this.writeToken(Token.CloseBraceToken);
    }

    private emitLetStatement(node: LetStatement) {
        this.writeToken(Token.LetKeyword);
        this.writeNodeList(node.variables, Token.CommaToken, false);
        this.writeToken(Token.SemicolonToken);
    }

    private emitExpressionStatement(node: ExpressionStatement) {
        this.writeNode(node.expression);
        this.writeToken(Token.SemicolonToken);
    }

    private emitReturnStatement(node: ReturnStatement) {
        this.writeToken(Token.ReturnKeyword);
        this.writeNode(node.expression);
        this.writeToken(Token.SemicolonToken);
    }
}
import { TokenKind, Identifier, SyntaxKind, ComputedPropertyName, FromClause, LetClause, WhereClause, OrderbyClause, OrderbyComparator, GroupClause, JoinClause, QueryExpression, ParenthesizedExpression, Elision, SpreadElement, ArrayLiteral, PropertyAssignment, ShorthandPropertyAssignment, ObjectLiteral, NewExpression, CallExpression, PropertyAccessExpression, ElementAccessExpression, PrefixUnaryExpression, PostfixUnaryExpression, BinaryExpression, ConditionalExpression, SelectClause, Token, TextLiteral, Node, KeywordKind, PunctuationKind, isKeywordKind, ArrowFunction, CommaListExpression, isAxisSelectorKind } from "./types";
import { tokenToString } from "./scanner";

const indents: string[] = ["", "  "];

function getIndent(depth: number): string {
    if (depth < indents.length) return indents[depth];
    return indents[depth] = getIndent(depth - 1) + indents[1];
}

class StringWriter {
    private _text = "";
    private _spacePending = false;
    private _indentDepth = 0;
    private _newlinePending = false;
    indent() {
        this._indentDepth++;
    }
    dedent() {
        this._indentDepth--;
    }
    writeSpace() {
        this._spacePending = true;
    }
    writeLine() {
        this._newlinePending = true;
    }
    write(text: string) {
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
    writeNode(node: Node | undefined) {
        if (node) emitNode(this, node);
    }
    writeNodeList(nodes: ReadonlyArray<Node>, separator: PunctuationKind, multiLine = false) {
        this.indent();
        let first = true;
        for (const node of nodes) {
            if (first) {
                first = false;
            }
            else {
                this.writePunctuation(separator);
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
    writeKeyword(kind: KeywordKind) {
        this.writeToken(kind, true, true);
    }
    writePunctuation(kind: PunctuationKind) {
        const requestSpace =
            kind !== SyntaxKind.OpenBracketToken &&
            kind !== SyntaxKind.CloseBracketToken &&
            kind !== SyntaxKind.OpenParenToken &&
            kind !== SyntaxKind.CloseParenToken &&
            kind !== SyntaxKind.DotToken &&
            kind !== SyntaxKind.DotDotDotToken &&
            kind !== SyntaxKind.ExclamationToken &&
            kind !== SyntaxKind.TildeToken &&
            kind !== SyntaxKind.CommaToken;
        const leadingSpace = requestSpace &&
            kind !== SyntaxKind.OpenBraceToken &&
            kind !== SyntaxKind.ColonToken;
        const trailingSpace = requestSpace &&
            kind !== SyntaxKind.CloseBraceToken;
        this.writeToken(kind, leadingSpace, trailingSpace);
    }
    writeToken(kind: TokenKind, leadingSpace: boolean, trailingSpace: boolean) {
        if (leadingSpace) this.writeSpace();
        this.write(tokenToString(kind));
        if (trailingSpace) this.writeSpace();
    }
    toString() {
        return this._text;
    }
}

function emitNode(writer: StringWriter, node: Node) {
    switch (node.kind) {
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumberLiteral:
        case SyntaxKind.RegularExpressionLiteral: return emitTextLiteral(writer, node);
        case SyntaxKind.Identifier: return emitIdentifier(writer, node);
        case SyntaxKind.ComputedPropertyName: return emitComputedPropertyName(writer, node);
        case SyntaxKind.FromClause: return emitFromClause(writer, node);
        case SyntaxKind.LetClause: return emitLetClause(writer, node);
        case SyntaxKind.WhereClause: return emitWhereClause(writer, node);
        case SyntaxKind.OrderbyClause: return emitOrderbyClause(writer, node);
        case SyntaxKind.OrderbyComparator: return emitOrderbyComparator(writer, node);
        case SyntaxKind.GroupClause: return emitGroupClause(writer, node);
        case SyntaxKind.JoinClause: return emitJoinClause(writer, node);
        case SyntaxKind.SelectClause: return emitSelectClause(writer, node);
        case SyntaxKind.QueryExpression: return emitQueryExpression(writer, node);
        case SyntaxKind.ParenthesizedExpression: return emitParenthesizedExpression(writer, node);
        case SyntaxKind.Elision: return emitElision(writer, node);
        case SyntaxKind.SpreadElement: return emitSpreadElement(writer, node);
        case SyntaxKind.ArrayLiteral: return emitArrayLiteral(writer, node);
        case SyntaxKind.PropertyAssignment: return emitPropertyAssignment(writer, node);
        case SyntaxKind.ShorthandPropertyAssignment: return emitShorthandPropertyAssignment(writer, node);
        case SyntaxKind.ObjectLiteral: return emitObjectLiteral(writer, node);
        case SyntaxKind.NewExpression: return emitNewExpression(writer, node);
        case SyntaxKind.CallExpression: return emitCallExpression(writer, node);
        case SyntaxKind.PropertyAccessExpression: return emitPropertyAccessExpression(writer, node);
        case SyntaxKind.ElementAccessExpression: return emitElementAccessExpression(writer, node);
        case SyntaxKind.PrefixUnaryExpression: return emitPrefixUnaryExpression(writer, node);
        case SyntaxKind.PostfixUnaryExpression: return emitPostfixUnaryExpression(writer, node);
        case SyntaxKind.BinaryExpression: return emitBinaryExpression(writer, node);
        case SyntaxKind.ConditionalExpression: return emitConditionalExpression(writer, node);
        case SyntaxKind.ArrowFunction: return emitArrowFunction(writer, node);
        case SyntaxKind.CommaListExpression: return emitCommaListExpression(writer, node);
        default: return emitToken(writer, node);
    }
}

function emitToken(writer: StringWriter, node: Token): void {
    if (isKeywordKind(node.kind)) {
        writer.writeKeyword(node.kind);
    }
    else if (isAxisSelectorKind(node.kind)) {
        writer.writeToken(node.kind, true, false);
    }
    else if (node.kind !== SyntaxKind.EndOfFileToken) {
        writer.writePunctuation(node.kind);
    }
}

function emitTextLiteral(writer: StringWriter, node: TextLiteral): void {
    writer.write(node.text);
}

function emitIdentifier(writer: StringWriter, node: Identifier): void {
    writer.write(node.text);
}

function emitComputedPropertyName(writer: StringWriter, node: ComputedPropertyName): void {
    writer.writePunctuation(SyntaxKind.OpenBracketToken);
    writer.writeNode(node.expression);
    writer.writePunctuation(SyntaxKind.CloseBracketToken);
}

function emitFromClause(writer: StringWriter, node: FromClause): void {
    writer.writeNode(node.outerClause);
    writer.writeKeyword(SyntaxKind.FromKeyword);
    writer.writeNode(node.awaitKeyword);
    writer.writeNode(node.name);
    writer.writeKeyword(SyntaxKind.InKeyword);
    writer.writeNode(node.axisSelectorToken);
    writer.writeNode(node.expression);
    writer.writeLine();
}

function emitLetClause(writer: StringWriter, node: LetClause): void {
    writer.writeNode(node.outerClause);
    writer.writeKeyword(SyntaxKind.LetKeyword);
    writer.writeNode(node.name);
    writer.writePunctuation(SyntaxKind.EqualsToken);
    writer.writeNode(node.expression);
    writer.writeLine();
}

function emitWhereClause(writer: StringWriter, node: WhereClause): void {
    writer.writeNode(node.outerClause);
    writer.writeKeyword(SyntaxKind.WhereKeyword);
    writer.writeNode(node.expression);
    writer.writeLine();
}

function emitOrderbyClause(writer: StringWriter, node: OrderbyClause): void {
    writer.writeNode(node.outerClause);
    writer.writeKeyword(SyntaxKind.OrderbyKeyword);
    writer.writeNodeList(node.comparators, SyntaxKind.CommaToken, true);
    writer.writeLine();
}

function emitOrderbyComparator(writer: StringWriter, node: OrderbyComparator): void {
    writer.writeNode(node.expression);
    writer.writeNode(node.directionToken);
    if (node.usingExpression) {
        writer.writeKeyword(SyntaxKind.UsingKeyword);
        writer.writeNode(node.usingExpression);
    }
}

function emitGroupClause(writer: StringWriter, node: GroupClause): void {
    writer.writeNode(node.outerClause);
    writer.writeKeyword(SyntaxKind.GroupKeyword);
    writer.writeNode(node.elementSelector);
    writer.writeKeyword(SyntaxKind.ByKeyword);
    writer.writeNode(node.keySelector);
    if (node.intoName) {
        writer.writeKeyword(SyntaxKind.IntoKeyword);
        writer.writeNode(node.intoName);
    }
    writer.writeLine();
}

function emitJoinClause(writer: StringWriter, node: JoinClause): void {
    writer.writeNode(node.outerClause);
    writer.writeKeyword(SyntaxKind.JoinKeyword);
    writer.writeNode(node.awaitKeyword);
    writer.writeNode(node.name);
    writer.writeKeyword(SyntaxKind.InKeyword);
    writer.writeNode(node.axisSelectorToken);
    writer.writeNode(node.expression);
    writer.writeKeyword(SyntaxKind.OnKeyword);
    writer.writeNode(node.outerSelector);
    writer.writeKeyword(SyntaxKind.EqualsKeyword);
    writer.writeNode(node.innerSelector);
    if (node.intoName) {
        writer.writeKeyword(SyntaxKind.IntoKeyword);
        writer.writeNode(node.intoName);
    }
    writer.writeLine();
}

function emitSelectClause(writer: StringWriter, node: SelectClause): void {
    writer.writeNode(node.outerClause);
    writer.writeKeyword(SyntaxKind.SelectKeyword);
    writer.writeNode(node.axisSelectorToken);
    writer.writeNode(node.expression);
    if (node.intoName) {
        writer.writeKeyword(SyntaxKind.IntoKeyword);
        writer.writeNode(node.intoName);
    }
    writer.writeLine();
}

function emitQueryExpression(writer: StringWriter, node: QueryExpression): void {
    writer.writeNode(node.query);
}

function emitParenthesizedExpression(writer: StringWriter, node: ParenthesizedExpression): void {
    writer.writePunctuation(SyntaxKind.OpenParenToken);
    writer.writeNode(node.expression);
    writer.writePunctuation(SyntaxKind.CloseParenToken);
}

function emitElision(writer: StringWriter, _node: Elision): void {
    writer.writeSpace();
}

function emitSpreadElement(writer: StringWriter, node: SpreadElement): void {
    writer.writePunctuation(SyntaxKind.DotDotDotToken);
    writer.writeNode(node.expression);
}

function emitArrayLiteral(writer: StringWriter, node: ArrayLiteral): void {
    writer.writePunctuation(SyntaxKind.OpenBracketToken);
    writer.writeNodeList(node.elements, SyntaxKind.CommaToken);
    writer.writePunctuation(SyntaxKind.CloseBracketToken);
}

function emitPropertyAssignment(writer: StringWriter, node: PropertyAssignment): void {
    writer.writeNode(node.name);
    writer.writePunctuation(SyntaxKind.ColonToken);
    writer.writeNode(node.initializer);
}

function emitShorthandPropertyAssignment(writer: StringWriter, node: ShorthandPropertyAssignment): void {
    writer.writeNode(node.name);
}

function emitObjectLiteral(writer: StringWriter, node: ObjectLiteral): void {
    writer.writePunctuation(SyntaxKind.OpenBraceToken);
    writer.writeNodeList(node.properties, SyntaxKind.CommaToken, node.properties.length > 4);
    writer.writePunctuation(SyntaxKind.CloseBraceToken);
}

function emitNewExpression(writer: StringWriter, node: NewExpression): void {
    writer.writeKeyword(SyntaxKind.NewKeyword);
    writer.writeNode(node.expression);
    if (node.argumentList) {
        writer.writePunctuation(SyntaxKind.OpenParenToken);
        writer.writeNodeList(node.argumentList, SyntaxKind.CommaToken);
        writer.writePunctuation(SyntaxKind.CloseParenToken);
    }
}

function emitCallExpression(writer: StringWriter, node: CallExpression): void {
    writer.writeNode(node.expression);
    writer.writePunctuation(SyntaxKind.OpenParenToken);
    writer.writeNodeList(node.argumentList, SyntaxKind.CommaToken);
    writer.writePunctuation(SyntaxKind.CloseParenToken);
}

function emitPropertyAccessExpression(writer: StringWriter, node: PropertyAccessExpression): void {
    writer.writeNode(node.expression);
    writer.writePunctuation(SyntaxKind.DotToken);
    writer.writeNode(node.name);
}

function emitElementAccessExpression(writer: StringWriter, node: ElementAccessExpression): void {
    writer.writeNode(node.expression);
    writer.writePunctuation(SyntaxKind.OpenBracketToken);
    writer.writeNode(node.argumentExpression);
    writer.writePunctuation(SyntaxKind.CloseBracketToken);
}

function emitPrefixUnaryExpression(writer: StringWriter, node: PrefixUnaryExpression): void {
    writer.writeNode(node.operatorToken);
    writer.writeNode(node.expression);
}

function emitPostfixUnaryExpression(writer: StringWriter, node: PostfixUnaryExpression): void {
    writer.writeNode(node.expression);
    writer.writeNode(node.operatorToken);
}

function emitBinaryExpression(writer: StringWriter, node: BinaryExpression): void {
    writer.writeNode(node.left);
    writer.writeNode(node.operatorToken);
    writer.writeNode(node.right);
}

function emitConditionalExpression(writer: StringWriter, node: ConditionalExpression): void {
    writer.writeNode(node.condition);
    writer.writePunctuation(SyntaxKind.QuestionToken);
    writer.writeNode(node.whenTrue);
    writer.writeSpace();
    writer.writePunctuation(SyntaxKind.ColonToken);
    writer.writeNode(node.whenFalse);
}

function emitArrowFunction(writer: StringWriter, node: ArrowFunction): void {
    writer.writeNode(node.asyncKeyword);
    if (node.parameterList.length === 1 && !node.asyncKeyword) {
        writer.writeNode(node.parameterList[0]);
    }
    else {
        writer.writePunctuation(SyntaxKind.OpenParenToken);
        writer.writeNodeList(node.parameterList, SyntaxKind.CommaToken);
        writer.writePunctuation(SyntaxKind.CloseParenToken);
    }
    writer.writePunctuation(SyntaxKind.EqualsGreaterThanToken);
    writer.writeNode(node.body);
}

function emitCommaListExpression(writer: StringWriter, node: CommaListExpression): void {
    writer.writeNodeList(node.expressions, SyntaxKind.CommaToken);
}

/** @internal */
export function nodeToString(node: Node) {
    const writer = new StringWriter();
    emitNode(writer, node);
    return writer.toString();
}
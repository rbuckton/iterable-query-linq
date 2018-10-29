import { SyntaxKind, TokenKind, TokenNode, Clause, FromClause, LetClause, WhereClause, OrderbyClause, OrderbyComparator, GroupClause, JoinClause, Identifier, Expression, PrefixUnaryExpression, ParenthesizedExpression, ArrayLiteral, ObjectLiteral, NewExpression, PropertyAccessExpression, ElementAccessExpression, Elision, SpreadElement, PropertyAssignment, ShorthandPropertyAssignment, MemberName, ComputedPropertyName, isKeywordKind, QueryExpression, PrefixUnaryOperatorKind, isPostfixUnaryOperatorKind, UnaryExpressionOrHigher, LeftHandSideExpressionOrHigher, PrimaryExpression, isTextLiteralKind, MemberExpressionOrHigher, TextLiteralKind, TextLiteralNode, ArrayLiteralElement, ObjectLiteralElement, getBinaryOperatorPrecedence, BinaryPrecedence, Argument, BinaryOperatorKind, SelectClause, AssignmentExpressionOrHigher, Node, isAxisSelectorKind, Syntax, getPos, getEnd, AxisSelector } from "./types";
import { Scanner, tokenToString } from "./scanner";
import { createFromClause, createLetClause, createWhereClause, createOrderbyClause, createOrderbyComparator, createGroupClause, createJoinClause, createQueryExpression, createSelectClause, Expr, createTextRange } from "./factory";
import { RecoverableSyntaxError, UnrecoverableSyntaxError } from "./errors";

/** @internal */
export class Parser {
    private _scanner: Scanner;
    private _async: boolean;

    constructor(text: string, async = false) {
        this._scanner = new Scanner(text);
        this._async = async;
    }

    parse() {
        this._scanner.reset();
        this._scanner.scan();
        const expression = this.parseExpression();
        this.expectToken(SyntaxKind.EndOfFileToken);
        return expression;
    }

    private finishNode<T extends Syntax>(node: T, pos: number, end = this._scanner.startPos()) {
        node[Syntax.location] = createTextRange(pos, end);
        return node;
    }

    private token() {
        return this._scanner.token();
    }

    private nextToken() {
        return this._scanner.scan();
    }

    private pos() {
        return this._scanner.tokenPos();
    }

    private errorAtPosEnd(message: string, pos: number, end: number, recoverable = false): never {
        const LinqSyntaxError = recoverable ? RecoverableSyntaxError : UnrecoverableSyntaxError;
        throw new LinqSyntaxError(message, { text: this._scanner.text(), pos, end });
    }

    private errorAtToken(message: string, recoverable = this.token() === SyntaxKind.EndOfFileToken): never {
        return this.errorAtPosEnd(message, this._scanner.tokenPos(), this._scanner.textPos(), recoverable);
    }

    private errorAtNode(message: string, node: Node, recoverable?: boolean) {
        return this.errorAtPosEnd(message, getPos(node), getEnd(node), recoverable);
    }

    private expectToken(kind: TokenKind) {
        if (this.token() !== kind) {
            this.errorAtToken(`'${tokenToString(kind)}' expected.`, /*recoverable*/ true);
        }
        this.nextToken();
    }

    private optionalToken(kind: TokenKind) {
        if (this.token() === kind) {
            this.nextToken();
            return true;
        }
        return false;
    }

    private listElement<T>(value: T, endToken: SyntaxKind): T {
        if (this.token() !== endToken) this.expectToken(SyntaxKind.CommaToken);
        return value;
    }

    private parseToken<Kind extends TokenKind>(kind: Kind): TokenNode<Kind> {
        const pos = this.pos();
        this.expectToken(kind);
        return this.finishNode(Expr.token(kind), pos);
    }

    private parseOptionalToken<Kind extends TokenKind>(kind: Kind): TokenNode<Kind> | undefined {
        return this.token() === kind ? this.parseToken(kind) : undefined;
    }

    private parseLiteral<Kind extends TextLiteralKind>(kind: Kind): TextLiteralNode<Kind> {
        const token = this.token();
        if (!isTextLiteralKind(token)) {
            const kindString = 
                kind === SyntaxKind.StringLiteral ? "string" : 
                kind === SyntaxKind.NumberLiteral ? "number" :
                "regex";
            this.errorAtToken(`${kindString} expected.`);
        }
        const pos = this.pos();
        const text = this._scanner.tokenText();
        const flags = this._scanner.tokenFlags();
        this.nextToken();
        return this.finishNode(Expr.literal(kind, text, flags), pos);
    }

    private parseBindingIdentifier(): Identifier {
        return this.parseIdentifier(/*allowKeywords*/ false);
    }

    private parseIdentifierReference(): Identifier {
        return this.parseIdentifier(/*allowKeywords*/ false);
    }

    private parseIdentifierName(): Identifier {
        return this.parseIdentifier(/*allowKeywords*/ true);
    }

    private parseIdentifier(allowKeywords: boolean): Identifier {
        if (this.token() !== SyntaxKind.Identifier && !(allowKeywords && isKeywordKind(this.token()))) {
            return this.errorAtToken("Identifier expected.");
        }
        const pos = this.pos();
        const text = this._scanner.tokenText();
        this.nextToken();
        return this.finishNode(Expr.id(text), pos);
    }

    private parseComputedPropertyName(): ComputedPropertyName {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBracketToken);
        const expression = this.parseExpression();
        this.expectToken(SyntaxKind.CloseBracketToken);
        return this.finishNode(Expr.computedName(expression), pos);
    }

    private parseMemberName(): MemberName {
        const token = this.token();
        switch (token) {
            case SyntaxKind.StringLiteral: return this.parseLiteral(token);
            case SyntaxKind.NumberLiteral: return this.parseLiteral(token);
            case SyntaxKind.Identifier: return this.parseIdentifierName();
            case SyntaxKind.OpenBracketToken: return this.parseComputedPropertyName();
            default: return this.errorAtToken(`string, number, identifier or '[' expected.`);
        }
    }

    private tryParseAwaitKeyword() {
        const awaitKeyword = this.parseOptionalToken(SyntaxKind.AwaitKeyword);
        if (awaitKeyword && !this._async) return this.errorAtNode(`'await' not support in a synchronous 'linq' block.`, awaitKeyword, false);
        return awaitKeyword;
    }

    private parseFromClause(outerClause: Clause | undefined): FromClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.FromKeyword);
        const awaitKeyword = this.tryParseAwaitKeyword();
        const name = this.parseBindingIdentifier();
        this.expectToken(SyntaxKind.InKeyword);
        const selectorToken = this.tryParseAxisSelector();
        return this.finishNode(createFromClause(outerClause, awaitKeyword, name, selectorToken, this.parseAssignmentExpressionOrHigher()), pos);
    }

    private parseLetClause(outerClause: Clause): LetClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.LetKeyword);
        const name = this.parseBindingIdentifier();
        this.expectToken(SyntaxKind.EqualsToken);
        return this.finishNode(createLetClause(outerClause, name, this.parseAssignmentExpressionOrHigher()), pos);
    }

    private parseWhereClause(outerClause: Clause): WhereClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.WhereKeyword);
        return this.finishNode(createWhereClause(outerClause, this.parseAssignmentExpressionOrHigher()), pos);
    }

    private parseOrderbyClause(outerClause: Clause): OrderbyClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OrderbyKeyword);
        const comparators: OrderbyComparator[] = [];
        do comparators.push(this.parseOrderbyComparator());
        while (this.optionalToken(SyntaxKind.CommaToken));
        return this.finishNode(createOrderbyClause(outerClause, comparators), pos);
    }

    private parseOrderbyComparator(): OrderbyComparator {
        const pos = this.pos();
        const expression = this.parseAssignmentExpressionOrHigher();
        const directionToken =
            this.parseOptionalToken(SyntaxKind.AscendingKeyword) ||
            this.parseOptionalToken(SyntaxKind.DescendingKeyword);
        const usingExpression = this.optionalToken(SyntaxKind.UsingKeyword) ? this.parseAssignmentExpressionOrHigher() : undefined;
        return this.finishNode(createOrderbyComparator(expression, directionToken, usingExpression), pos);
    }

    private parseGroupClause(outerClause: Clause): GroupClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.GroupKeyword);
        const elementSelector = this.parseAssignmentExpressionOrHigher();
        this.expectToken(SyntaxKind.ByKeyword);
        const keySelector = this.parseAssignmentExpressionOrHigher();
        const intoName = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier() : undefined;
        return this.finishNode(createGroupClause(outerClause, elementSelector, keySelector, intoName), pos);
    }

    private parseJoinClause(outerClause: Clause): JoinClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.JoinKeyword);
        const awaitKeyword = this.tryParseAwaitKeyword();
        const name = this.parseBindingIdentifier();
        this.expectToken(SyntaxKind.InKeyword);
        const selectorToken = this.tryParseAxisSelector();
        const expression = this.parseAssignmentExpressionOrHigher();
        this.expectToken(SyntaxKind.OnKeyword);
        const outerSelector = this.parseAssignmentExpressionOrHigher();
        this.expectToken(SyntaxKind.EqualsKeyword);
        const innerSelector = this.parseAssignmentExpressionOrHigher();
        const intoName = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier() : undefined;
        return this.finishNode(createJoinClause(outerClause, awaitKeyword, name, selectorToken, expression, outerSelector, innerSelector, intoName), pos);
    }

    private tryParseAxisSelector(): AxisSelector | undefined {
        const token = this.token();
        if (isAxisSelectorKind(token)) {
            return this.parseToken(token);
        }
    }

    private parseSelectClause(outerClause: Clause): SelectClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.SelectKeyword);
        const selectorToken = this.tryParseAxisSelector();
        const expression = this.parseAssignmentExpressionOrHigher();
        const intoName = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier() : undefined;
        return this.finishNode(createSelectClause(outerClause, selectorToken, expression, intoName), pos);
    }

    private parseClause(outerClause: Clause): Clause {
        switch (this.token()) {
            case SyntaxKind.FromKeyword: return this.parseFromClause(outerClause);
            case SyntaxKind.LetKeyword: return this.parseLetClause(outerClause);
            case SyntaxKind.WhereKeyword: return this.parseWhereClause(outerClause);
            case SyntaxKind.OrderbyKeyword: return this.parseOrderbyClause(outerClause);
            case SyntaxKind.GroupKeyword: return this.parseGroupClause(outerClause);
            case SyntaxKind.JoinKeyword: return this.parseJoinClause(outerClause);
            case SyntaxKind.SelectKeyword: return this.parseSelectClause(outerClause);
            default: return this.errorAtToken(`'from', 'let', 'where', 'orderby', 'group', 'join', or 'select' expected.`);
        }
    }

    private parseQueryExpression(): QueryExpression {
        const pos = this.pos();
        let outerClause: Clause = this.parseFromClause(/*outerClause*/ undefined);
        while (isStartOfClause(this.token())) {
            outerClause = this.parseClause(outerClause);
        }
        if (outerClause.kind !== SyntaxKind.SelectClause &&
            outerClause.kind !== SyntaxKind.GroupClause ||
            outerClause.intoName) {
            return this.errorAtToken("A query must end with either a 'select' or 'group' clause.");
        }
        return this.finishNode(createQueryExpression(outerClause), pos);
    }

    private parseParenthesizedExpression(): ParenthesizedExpression {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenParenToken);
        const expression = this.parseExpression();
        this.expectToken(SyntaxKind.CloseParenToken);
        return this.finishNode(Expr.paren(expression), pos);
    }

    private parseElision(): Elision {
        const pos = this.pos();
        return this.finishNode(Expr.elision(), pos);
    }

    private parseSpreadElement(): SpreadElement {
        const pos = this.pos();
        this.expectToken(SyntaxKind.DotDotDotToken);
        return this.finishNode(Expr.spread(this.parseLeftHandSideExpressionOrHigher()), pos);
    }

    private parseArrayLiteralElement(): ArrayLiteralElement {
        switch (this.token()) {
            case SyntaxKind.CommaToken: return this.parseElision();
            case SyntaxKind.DotDotDotToken: return this.parseSpreadElement();
            default: return this.parseAssignmentExpressionOrHigher();
        }
    }

    private parseArrayLiteral(): ArrayLiteral {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBracketToken);
        const elements: ArrayLiteralElement[] = [];
        while (this.token() !== SyntaxKind.CloseBracketToken) {
            elements.push(this.listElement(this.parseArrayLiteralElement(), SyntaxKind.CloseBracketToken));
        }
        this.expectToken(SyntaxKind.CloseBracketToken);
        return this.finishNode(Expr.array(elements), pos);
    }

    private parsePropertyAssignment(): PropertyAssignment | ShorthandPropertyAssignment {
        const pos = this.pos();
        const name = this.parseMemberName();
        if (name.kind === SyntaxKind.Identifier && !this.optionalToken(SyntaxKind.ColonToken)) {
            return this.finishNode(Expr.shorthandPropertyAssign(name), pos);
        }
        return this.finishNode(Expr.propertyAssign(name, this.parseAssignmentExpressionOrHigher()), pos);
    }

    private parseObjectLiteralElement(): ObjectLiteralElement {
        switch (this.token()) {
            case SyntaxKind.DotDotDotToken: return this.parseSpreadElement();
            case SyntaxKind.Identifier:
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NumberLiteral:
            case SyntaxKind.OpenBracketToken: return this.parsePropertyAssignment();
            default: return this.errorAtToken(`string, number, identifier, '[', or '...' expected.`);
        }
    }

    private parseObjectLiteral(): ObjectLiteral {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBraceToken);
        const properties: ObjectLiteralElement[] = [];
        while (this.token() !== SyntaxKind.CloseBraceToken) {
            properties.push(this.listElement(this.parseObjectLiteralElement(), SyntaxKind.CloseBraceToken));
        }
        this.expectToken(SyntaxKind.CloseBraceToken);
        return this.finishNode(Expr.object(properties), pos);
    }

    private parseArgument() {
        switch (this.token()) {
            case SyntaxKind.DotDotDotToken: return this.parseSpreadElement();
            default: return this.parseAssignmentExpressionOrHigher();
        }
    }

    private parseArgumentList(): ReadonlyArray<Argument> {
        const argumentList: Argument[] = [];
        this.expectToken(SyntaxKind.OpenParenToken);
        while (this.token() !== SyntaxKind.CloseParenToken) {
            argumentList.push(this.listElement(this.parseArgument(), SyntaxKind.CloseParenToken));
        }
        this.expectToken(SyntaxKind.CloseParenToken);
        return argumentList;
    }

    private parseNewExpression(): NewExpression {
        const pos = this.pos();
        this.expectToken(SyntaxKind.NewKeyword);
        const expression = this.parseMemberExpressionRest(this.parsePrimaryExpression());
        const argumentList = this.token() === SyntaxKind.OpenParenToken ? this.parseArgumentList() : undefined;
        return this.finishNode(Expr.new(expression, argumentList), pos);
    }

    private parsePrimaryExpression(): PrimaryExpression {
        const token = this.token();
        switch (token) {
            case SyntaxKind.NumberLiteral: return this.parseLiteral(token);
            case SyntaxKind.StringLiteral: return this.parseLiteral(token);
            case SyntaxKind.NullKeyword: return this.parseToken(token);
            case SyntaxKind.TrueKeyword: return this.parseToken(token);
            case SyntaxKind.FalseKeyword: return this.parseToken(token);
            case SyntaxKind.OpenParenToken: return this.parseParenthesizedExpression();
            case SyntaxKind.OpenBracketToken: return this.parseArrayLiteral();
            case SyntaxKind.OpenBraceToken: return this.parseObjectLiteral();
            case SyntaxKind.NewKeyword: return this.parseNewExpression();
            case SyntaxKind.Identifier: return this.parseIdentifierReference();
            case SyntaxKind.SlashToken:
            case SyntaxKind.SlashEqualsToken:
                if (this._scanner.rescanSlash() === SyntaxKind.RegularExpressionLiteral) {
                    return this.parseLiteral(SyntaxKind.RegularExpressionLiteral);
                }
                // falls through
            default: return this.errorAtToken(`Expression expected.`);
        }
    }

    private parsePropertyAccessExpressionRest(expression: LeftHandSideExpressionOrHigher): PropertyAccessExpression {
        const pos = getPos(expression);
        return this.finishNode(Expr.propertyAccess(expression, this.parseIdentifierName()), pos);
    }

    private parseElementAccessExpressionRest(expression: LeftHandSideExpressionOrHigher): ElementAccessExpression {
        const pos = getPos(expression);
        const argumentExpression = this.parseExpression();
        this.expectToken(SyntaxKind.CloseBracketToken);
        return this.finishNode(Expr.elementAccess(expression, argumentExpression), pos);
    }

    private parseMemberExpressionRest(expression: LeftHandSideExpressionOrHigher): MemberExpressionOrHigher {
        while (true) {
            if (this.optionalToken(SyntaxKind.DotToken)) {
                expression = this.parsePropertyAccessExpressionRest(expression);
            }
            else if (this.optionalToken(SyntaxKind.OpenBracketToken)) {
                expression = this.parseElementAccessExpressionRest(expression);
            }
            else {
                return expression as MemberExpressionOrHigher;
            }
        }
    }

    private parseMemberExpressionOrHigher(): MemberExpressionOrHigher {
        return this.parseMemberExpressionRest(this.parsePrimaryExpression());
    }

    private parseCallExpressionRest(expression: LeftHandSideExpressionOrHigher): LeftHandSideExpressionOrHigher {
        while (true) {
            expression = this.parseMemberExpressionRest(expression);
            if (this.token() === SyntaxKind.OpenParenToken) {
                expression = this.finishNode(Expr.call(expression, this.parseArgumentList()), getPos(expression));
                continue;
            }
            return expression;
        }
    }

    private parseLeftHandSideExpressionOrHigher(): LeftHandSideExpressionOrHigher {
        return this.parseCallExpressionRest(this.parseMemberExpressionOrHigher());
    }

    private parsePrefixUnaryExpression(kind: PrefixUnaryOperatorKind): PrefixUnaryExpression {
        const operatorToken = this.parseToken(kind);
        if (kind === SyntaxKind.AwaitKeyword && !this._async) return this.errorAtNode(`'await' not support in a synchronous 'linq' block.`, operatorToken, false);
        const expression = this.parseUnaryExpressionOrHigher();
        return this.finishNode(Expr.prefix(operatorToken, expression), getPos(operatorToken));
    }

    private parsePostfixUnaryExpressionRest(expression: LeftHandSideExpressionOrHigher): UnaryExpressionOrHigher {
        const token = this.token();
        if (isPostfixUnaryOperatorKind(token)) {
            return this.finishNode(Expr.postfix(expression, this.parseToken(token)), getPos(expression));
        }
        return expression;
    }

    private parseUnaryExpressionOrHigher(): UnaryExpressionOrHigher {
        const token = this.token();
        switch (token) {
            case SyntaxKind.PlusToken:
            case SyntaxKind.MinusToken:
            case SyntaxKind.TildeToken:
            case SyntaxKind.ExclamationToken:
            case SyntaxKind.TypeofKeyword:
            case SyntaxKind.DeleteKeyword:
            case SyntaxKind.VoidKeyword:
            case SyntaxKind.AwaitKeyword:
                return this.parsePrefixUnaryExpression(token);
            default:
                return this.parsePostfixUnaryExpressionRest(this.parseLeftHandSideExpressionOrHigher());
        }
    }

    private parseBinaryExpressionRest(precedence: BinaryPrecedence, left: AssignmentExpressionOrHigher): AssignmentExpressionOrHigher {
        while (true) {
            const token = this.token();
            const newPrecedence = getBinaryOperatorPrecedence(token);
            if (!(token === SyntaxKind.AsteriskAsteriskToken ? newPrecedence >= precedence : newPrecedence > precedence)) break;
            left = this.finishNode(Expr.binary(left, this.parseToken(token as BinaryOperatorKind), this.parseBinaryExpressionOrHigher(newPrecedence)), getPos(left));
        }
        return left;
    }

    private parseBinaryExpressionOrHigher(precedence: BinaryPrecedence): AssignmentExpressionOrHigher {
        return this.parseBinaryExpressionRest(precedence, this.parseUnaryExpressionOrHigher());
    }

    private parseConditionalExpressionRest(condition: AssignmentExpressionOrHigher): AssignmentExpressionOrHigher {
        this.expectToken(SyntaxKind.QuestionToken);
        const whenTrue = this.parseExpression();
        this.expectToken(SyntaxKind.ColonToken);
        return this.finishNode(Expr.conditional(condition, whenTrue, this.parseExpression()), getPos(condition));
    }


    private parseParameterList(): ReadonlyArray<Identifier> {
        const parameters: Identifier[] = [];
        this.expectToken(SyntaxKind.OpenParenToken);
        while (this.token() !== SyntaxKind.CloseParenToken) {
            parameters.push(this.listElement(this.parseBindingIdentifier(), SyntaxKind.CloseParenToken));
        }
        this.expectToken(SyntaxKind.CloseParenToken);
        return parameters;
    }

    private parseAsyncArrowFunction() {
        const pos = this.pos();
        const asyncKeyword = this.parseToken(SyntaxKind.AsyncKeyword);
        const parameters = this.parseParameterList();
        this.expectToken(SyntaxKind.EqualsGreaterThanToken);
        return this.finishNode(Expr.arrow(asyncKeyword, parameters, this.parseAssignmentExpressionOrHigher()), pos);
    }

    private parseArrowFunctionRest(head: AssignmentExpressionOrHigher) {
        let parameters: Identifier[] | undefined;
        if (head.kind === SyntaxKind.Identifier) {
            parameters = [head];
        }
        else {
            if (head.kind !== SyntaxKind.ParenthesizedExpression) {
                return this.errorAtNode(`Identifier or '(' expected.`, head);
            }
            if (head.expression.kind === SyntaxKind.Identifier) {
                parameters = [head.expression];
            }
            else if (head.expression.kind !== SyntaxKind.CommaListExpression) {
                return this.errorAtNode(`Identifier expected.`, head.expression);
            }
            else {
                parameters = [];
                for (const parameter of head.expression.expressions) {
                    if (parameter.kind !== SyntaxKind.Identifier) {
                        return this.errorAtNode(`Identifier expected.`, parameter);
                    }
                    parameters.push(parameter);
                }
            }
        }
        this.expectToken(SyntaxKind.EqualsGreaterThanToken);
        return this.finishNode(Expr.arrow(undefined, parameters, this.parseAssignmentExpressionOrHigher()), getPos(head));
    }

    private parseAssignmentExpressionOrHigher(): AssignmentExpressionOrHigher {
        if (this.token() === SyntaxKind.FromKeyword) {
            return this.parseQueryExpression();
        }
        if (this.token() === SyntaxKind.AsyncKeyword) {
            return this.parseAsyncArrowFunction();
        }
        const expression = this.parseBinaryExpressionOrHigher(BinaryPrecedence.AssignmentExpression);
        switch (this.token()) {
            case SyntaxKind.QuestionToken: return this.parseConditionalExpressionRest(expression);
            case SyntaxKind.EqualsGreaterThanToken: return this.parseArrowFunctionRest(expression);
            default: return expression;
        }
    }

    private parseExpression(): Expression {
        const left = this.parseAssignmentExpressionOrHigher();
        if (this.optionalToken(SyntaxKind.CommaToken)) {
            const expressions = [left];
            do {
                expressions.push(this.parseAssignmentExpressionOrHigher());
            }
            while (this.optionalToken(SyntaxKind.CommaToken));
            return this.finishNode(Expr.comma(expressions), getPos(left));
        }
        return left;
    }
}

function isStartOfClause(token: SyntaxKind) {
    switch (token) {
        case SyntaxKind.FromKeyword:
        case SyntaxKind.LetKeyword:
        case SyntaxKind.WhereKeyword:
        case SyntaxKind.OrderbyKeyword:
        case SyntaxKind.GroupKeyword:
        case SyntaxKind.JoinKeyword:
        case SyntaxKind.SelectKeyword:
            return true;
        default:
            return false;
    }
}
import { SyntaxKind, TokenKind, TokenNode, Clause, FromClause, LetClause, WhereClause, OrderbyClause, OrderbyComparator, GroupClause, JoinClause, Identifier, Expression, PrefixUnaryExpression, ParenthesizedExpression, ArrayLiteral, ObjectLiteral, NewExpression, PropertyAccessExpression, ElementAccessExpression, Elision, SpreadElement, PropertyAssignment, ShorthandPropertyAssignment, MemberName, ComputedPropertyName, isKeywordKind, QueryExpression, PrefixUnaryOperatorKind, isPostfixUnaryOperatorKind, UnaryExpressionOrHigher, LeftHandSideExpressionOrHigher, PrimaryExpression, isTextLiteralKind, MemberExpressionOrHigher, TextLiteralKind, TextLiteralNode, ArrayLiteralElement, ObjectLiteralElement, getBinaryOperatorPrecedence, BinaryPrecedence, Argument, BinaryOperatorKind, SelectClause, AssignmentExpressionOrHigher, Node, isSelectorKind } from "./types";
import { Scanner, tokenToString } from "./scanner";
import { createFromClause, createLetClause, createWhereClause, createOrderbyClause, createOrderbyComparator, createGroupClause, createJoinClause, createQueryExpression, createSelectClause, Expr, createSelector } from "./factory";
import { RecoverableSyntaxError, UnrecoverableSyntaxError } from "./errors";

/** @internal */
export class Parser {
    private _scanner: Scanner;

    constructor(text: string) {
        this._scanner = new Scanner(text);
    }

    parse() {
        this._scanner.reset();
        this._scanner.scan();
        const expression = this.parseExpression();
        this.expectToken(SyntaxKind.EndOfFileToken);
        return expression;
    }

    private token() {
        return this._scanner.token();
    }

    private nextToken() {
        return this._scanner.scan();
    }

    private expectToken(kind: TokenKind) {
        if (this.token() !== kind) {
            throw new RecoverableSyntaxError(`'${tokenToString(kind)}' expected.`, {
                text: this._scanner.tokenText(),
                pos: this._scanner.tokenPos(),
                end: this._scanner.textPos()
            });
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
        this.expectToken(kind);
        return Expr.token(kind);
    }

    private parseOptionalToken<Kind extends TokenKind>(kind: Kind): TokenNode<Kind> | undefined {
        return this.token() === kind ? this.parseToken(kind) : undefined;
    }

    private parseLiteral<Kind extends TextLiteralKind>(kind: Kind): TextLiteralNode<Kind> {
        const token = this.token();
        if (!isTextLiteralKind(token)) throw new Error();
        const text = this._scanner.tokenText();
        const flags = this._scanner.tokenFlags();
        this.nextToken();
        return Expr.literal(kind, text, flags);
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
            throw new UnrecoverableSyntaxError("Identifier expected.");
        }
        const text = this._scanner.tokenText();
        this.nextToken();
        return Expr.id(text);
    }

    private parseComputedPropertyName(): ComputedPropertyName {
        this.expectToken(SyntaxKind.OpenBracketToken);
        const expression = this.parseExpression();
        this.expectToken(SyntaxKind.CloseBracketToken);
        return Expr.computedName(expression);
    }

    private parseMemberName(): MemberName {
        const token = this.token();
        switch (token) {
            case SyntaxKind.StringLiteral: return this.parseLiteral(token);
            case SyntaxKind.NumberLiteral: return this.parseLiteral(token);
            case SyntaxKind.Identifier: return this.parseIdentifierName();
            case SyntaxKind.OpenBracketToken: return this.parseComputedPropertyName();
            default: throw new Error();
        }
    }

    private parseFromClause(outerClause: Clause | undefined): FromClause {
        this.expectToken(SyntaxKind.FromKeyword);
        const name = this.parseBindingIdentifier();
        this.expectToken(SyntaxKind.InKeyword);
        const selectorToken = this.tryParseSelector();
        return createFromClause(outerClause, name, selectorToken, this.parseAssignmentExpressionOrHigher());
    }

    private parseLetClause(outerClause: Clause): LetClause {
        this.expectToken(SyntaxKind.LetKeyword);
        const name = this.parseBindingIdentifier();
        this.expectToken(SyntaxKind.EqualsToken);
        return createLetClause(outerClause, name, this.parseAssignmentExpressionOrHigher());
    }

    private parseWhereClause(outerClause: Clause): WhereClause {
        this.expectToken(SyntaxKind.WhereKeyword);
        return createWhereClause(outerClause, this.parseAssignmentExpressionOrHigher());
    }

    private parseOrderbyClause(outerClause: Clause): OrderbyClause {
        this.expectToken(SyntaxKind.OrderbyKeyword);
        const comparators: OrderbyComparator[] = [];
        do comparators.push(this.parseOrderbyComparator());
        while (this.optionalToken(SyntaxKind.CommaToken));
        return createOrderbyClause(outerClause, comparators);
    }

    private parseOrderbyComparator(): OrderbyComparator {
        const expression = this.parseAssignmentExpressionOrHigher();
        const directionToken =
            this.parseOptionalToken(SyntaxKind.AscendingKeyword) ||
            this.parseOptionalToken(SyntaxKind.DescendingKeyword);
        const usingExpression = this.optionalToken(SyntaxKind.UsingKeyword) ? this.parseAssignmentExpressionOrHigher() : undefined;
        return createOrderbyComparator(expression, directionToken, usingExpression);
    }

    private parseGroupClause(outerClause: Clause): GroupClause {
        this.expectToken(SyntaxKind.GroupKeyword);
        const elementSelector = this.parseAssignmentExpressionOrHigher();
        this.expectToken(SyntaxKind.ByKeyword);
        const keySelector = this.parseAssignmentExpressionOrHigher();
        const intoName = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier() : undefined;
        return createGroupClause(outerClause, elementSelector, keySelector, intoName);
    }

    private parseJoinClause(outerClause: Clause): JoinClause {
        this.expectToken(SyntaxKind.JoinKeyword);
        const name = this.parseBindingIdentifier();
        this.expectToken(SyntaxKind.InKeyword);
        const selectorToken = this.tryParseSelector();
        const expression = this.parseAssignmentExpressionOrHigher();
        this.expectToken(SyntaxKind.OnKeyword);
        const outerSelector = this.parseAssignmentExpressionOrHigher();
        this.expectToken(SyntaxKind.EqualsKeyword);
        const innerSelector = this.parseAssignmentExpressionOrHigher();
        const intoName = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier() : undefined;
        return createJoinClause(outerClause, name, selectorToken, expression, outerSelector, innerSelector, intoName);
    }

    private tryParseSelector() {
        const token = this.token();
        if (isSelectorKind(token)) {
            this.nextToken();
            return createSelector(token);
        }
    }

    private parseSelectClause(outerClause: Clause): SelectClause {
        this.expectToken(SyntaxKind.SelectKeyword);
        const selectorToken = this.tryParseSelector();
        const expression = this.parseAssignmentExpressionOrHigher();
        const intoName = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier() : undefined;
        return createSelectClause(outerClause, selectorToken, expression, intoName);
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
            default: throw new Error();
        }
    }

    private parseQueryExpression(): QueryExpression {
        let outerClause: Clause = this.parseFromClause(/*outerClause*/ undefined);
        while (isStartOfClause(this.token())) {
            outerClause = this.parseClause(outerClause);
        }
        if (outerClause.kind !== SyntaxKind.SelectClause &&
            outerClause.kind !== SyntaxKind.GroupClause ||
            outerClause.intoName) throw new Error();
        return createQueryExpression(outerClause);
    }

    private parseParenthesizedExpression(): ParenthesizedExpression {
        this.expectToken(SyntaxKind.OpenParenToken);
        const expression = this.parseExpression();
        this.expectToken(SyntaxKind.CloseParenToken);
        return Expr.paren(expression);
    }

    private parseElision(): Elision {
        return Expr.elision();
    }

    private parseSpreadElement(): SpreadElement {
        this.expectToken(SyntaxKind.DotDotDotToken);
        return Expr.spread(this.parseLeftHandSideExpressionOrHigher());
    }

    private parseArrayLiteralElement(): ArrayLiteralElement {
        switch (this.token()) {
            case SyntaxKind.CommaToken: return this.parseElision();
            case SyntaxKind.DotDotDotToken: return this.parseSpreadElement();
            default: return this.parseAssignmentExpressionOrHigher();
        }
    }

    private parseArrayLiteral(): ArrayLiteral {
        this.expectToken(SyntaxKind.OpenBracketToken);
        const elements: ArrayLiteralElement[] = [];
        while (this.token() !== SyntaxKind.CloseBracketToken) {
            elements.push(this.listElement(this.parseArrayLiteralElement(), SyntaxKind.CloseBracketToken));
        }
        this.expectToken(SyntaxKind.CloseBracketToken);
        return Expr.array(elements);
    }

    private parsePropertyAssignment(): PropertyAssignment | ShorthandPropertyAssignment {
        const name = this.parseMemberName();
        if (name.kind === SyntaxKind.Identifier && !this.optionalToken(SyntaxKind.ColonToken)) {
            return Expr.shorthandPropertyAssign(name);
        }
        return Expr.propertyAssign(name, this.parseAssignmentExpressionOrHigher());
    }

    private parseObjectLiteralElement(): ObjectLiteralElement {
        switch (this.token()) {
            case SyntaxKind.DotDotDotToken: return this.parseSpreadElement();
            case SyntaxKind.Identifier:
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NumberLiteral:
            case SyntaxKind.OpenBracketToken: return this.parsePropertyAssignment();
            default: throw new Error();
        }
    }

    private parseObjectLiteral(): ObjectLiteral {
        this.expectToken(SyntaxKind.OpenBraceToken);
        const properties: ObjectLiteralElement[] = [];
        while (this.token() !== SyntaxKind.CloseBraceToken) {
            properties.push(this.listElement(this.parseObjectLiteralElement(), SyntaxKind.CloseBraceToken));
        }
        this.expectToken(SyntaxKind.CloseBraceToken);
        return Expr.object(properties);
    }

    private parseArgument() {
        const token = this.token();
        switch (token) {
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
        this.expectToken(SyntaxKind.NewKeyword);
        const expression = this.parseMemberExpressionRest(this.parsePrimaryExpression());
        const argumentList = this.token() === SyntaxKind.OpenParenToken ? this.parseArgumentList() : undefined;
        return Expr.new(expression, argumentList);
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
            default: throw new Error();
        }
    }

    private parsePropertyAccessExpressionRest(expression: LeftHandSideExpressionOrHigher): PropertyAccessExpression {
        return Expr.propertyAccess(expression, this.parseIdentifierName());
    }

    private parseElementAccessExpressionRest(expression: LeftHandSideExpressionOrHigher): ElementAccessExpression {
        const argumentExpression = this.parseExpression();
        this.expectToken(SyntaxKind.CloseBracketToken);
        return Expr.elementAccess(expression, argumentExpression);
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
                expression = Expr.call(expression, this.parseArgumentList());
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
        const expression = this.parseUnaryExpressionOrHigher();
        return Expr.prefix(operatorToken, expression);
    }

    private parsePostfixUnaryExpressionRest(expression: LeftHandSideExpressionOrHigher): UnaryExpressionOrHigher {
        const token = this.token();
        if (isPostfixUnaryOperatorKind(token)) {
            return Expr.postfix(expression, this.parseToken(token));
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
            left = Expr.binary(left, this.parseToken(token as BinaryOperatorKind), this.parseBinaryExpressionOrHigher(newPrecedence));
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
        return Expr.conditional(condition, whenTrue, this.parseExpression());
    }

    private parseArrowFunctionRest(head: AssignmentExpressionOrHigher) {
        let parameters: ReadonlyArray<Identifier> | undefined;
        if (head.kind === SyntaxKind.Identifier) {
            parameters = [head];
        }
        else if (head.kind === SyntaxKind.ParenthesizedExpression &&
            head.expression.kind === SyntaxKind.CommaListExpression &&
            head.expression.expressions.every(isIdentifier)) {
            parameters = head.expression.expressions as ReadonlyArray<Identifier>;
        }
        if (parameters === undefined) throw new Error();
        this.expectToken(SyntaxKind.EqualsGreaterThanToken);
        return Expr.arrow(parameters, this.parseAssignmentExpressionOrHigher());
    }

    private parseAssignmentExpressionOrHigher(): AssignmentExpressionOrHigher {
        if (this.token() === SyntaxKind.FromKeyword) {
            return this.parseQueryExpression();
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
            return Expr.comma(expressions);
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

function isIdentifier(node: Node): node is Identifier {
    return node.kind === SyntaxKind.Identifier;
}
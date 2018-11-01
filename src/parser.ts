import { SyntaxKind, TokenKind, TokenNode, QueryBodyClause, FromClause, LetClause, WhereClause,
    OrderbyClause, OrderbyComparator, GroupClause, JoinClause, Identifier, Expression,
    ArrayLiteral, ObjectLiteral, NewExpression, PropertyAccessExpression,
    ElementAccessExpression, Elision, SpreadElement, PropertyDefinition,
    ShorthandPropertyDefinition, PropertyName, ComputedPropertyName, isKeywordKind,
    QueryExpression, PrefixUnaryOperatorKind, isPostfixUnaryOperatorKind, UnaryExpressionOrHigher,
    LeftHandSideExpressionOrHigher, PrimaryExpression, isTextLiteralKind, MemberExpressionOrHigher,
    TextLiteralKind, TextLiteralNode, ArrayLiteralElement, ObjectLiteralElement, Argument,
    BinaryOperatorKind, SelectClause, AssignmentExpressionOrHigher, Node,
    isHierarchyAxisKeywordKind, Syntax, getPos, getEnd, BindingElement, BindingRestElement,
    BindingName, ObjectBindingPattern, ArrayBindingPattern, ArrayBindingPatternElement,
    CoverParenthesizedExpressionAndArrowParameterList, isLeftHandSideExpressionOrHigher,
    CoverInitializedName, BindingIdentifier, IdentifierReference, 
    ObjectBindingPatternElement, BindingRestProperty, BindingProperty, ShorthandBindingProperty,
    ObjectAssignmentPattern, ArrayAssignmentPattern, ObjectAssignmentPatternElement,
    AssignmentRestProperty, ShorthandAssignmentProperty, AssignmentProperty, AssignmentElement,
    ArrayAssignmentPatternElement, AssignmentRestElement, isAssignmentOperatorKind,
    AssignmentOperatorKind, AssignmentExpression, BinaryExpressionOrHigher,
    CommaListExpression, PrefixUnaryExpression, Parameter, SequenceBinding,
    HierarchyAxisKeyword, isECMAScriptReservedWordKind,
} from "./types";
import { Scanner, tokenToString } from "./scanner";
import { Expr, createTextRange, ExprUpdate } from "./factory";
import { RecoverableSyntaxError, UnrecoverableSyntaxError } from "./errors";
import { BinaryPrecedence, getBinaryOperatorPrecedence, assertNever, assertFail } from "./utils";
import { visitList } from "./visitor";

/** @internal */
export class Parser {
    private _scanner!: Scanner;
    private _async!: boolean;
    private _refined = new Set<Syntax>();

    constructor() {
        this.refineExpression = this.refineExpression.bind(this);
        this.refineAssignmentExpressionOrHigher = this.refineAssignmentExpressionOrHigher.bind(this);
        this.refineArgument = this.refineArgument.bind(this);
        this.refineArrayBindingPatternElement = this.refineArrayBindingPatternElement.bind(this);
        this.refineObjectBindingPatternElement = this.refineObjectBindingPatternElement.bind(this);
    }

    parse(text: string, async = false) {
        this._scanner = new Scanner(text);
        this._scanner.scan();
        this._async = async;
        // treat as inside expression statement
        if (this.token() === SyntaxKind.OpenBraceToken) return this.errorAtToken("Unexpected token.");
        const expression = this.parseAndRefineExpression(/*In*/ true, /*Await*/ this._async);
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

    private errorAtPos(message: string, pos: number, recoverable?: boolean): never {
        const end = this._scanner.speculate(() => {
            this._scanner.setTextPos(pos);
            this._scanner.scan();
            pos = this._scanner.tokenPos();
            return this._scanner.startPos();
        }, true);
        return this.errorAtPosEnd(message, pos, end, recoverable);
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
        // Tokens cannot be further refined
        return this.finishRefine(this.finishNode(Expr.token(kind), pos));
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
        // Text literals cannot be further refined
        return this.finishRefine(this.finishNode(Expr.literal(kind, text, flags), pos));
    }

    private parseBindingIdentifier(Await: boolean): BindingIdentifier {
        return this.parseIdentifier(/*allowReservedWords*/ false, !Await);
    }

    private parseIdentifierReference(Await: boolean): IdentifierReference {
        return this.parseIdentifier(/*allowReservedWords*/ false, !Await);
    }

    private parseIdentifierName(): IdentifierReference {
        return this.parseIdentifier(/*allowReservedWords*/ true, /*allowAwait*/ true);
    }

    private parseIdentifier(allowReservedWords: boolean, allowAwait: boolean): Identifier {
        if (!mayBeIdentifier(this.token(), allowReservedWords, allowAwait)) {
            return this.errorAtToken("Identifier expected.");
        }
        const pos = this.pos();
        const text = this._scanner.tokenText();
        this.nextToken();
        // Identifier cannot be further refined
        return this.finishRefine(this.finishNode(Expr.identifier(text), pos));
    }

    private parseComputedPropertyName(Await: boolean): ComputedPropertyName {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBracketToken);
        const expression = this.parseAndRefineExpression(/*In*/ true, Await);
        this.expectToken(SyntaxKind.CloseBracketToken);
        // ComputedPropertyName cannot be further refined
        return this.finishRefine(this.finishNode(Expr.computedPropertyName(expression), pos));
    }

    private parsePropertyName(Await: boolean): PropertyName {
        const token = this.token();
        switch (token) {
            case SyntaxKind.StringLiteral: return this.parseLiteral(token);
            case SyntaxKind.NumberLiteral: return this.parseLiteral(token);
            case SyntaxKind.Identifier: return this.parseIdentifierName();
            case SyntaxKind.OpenBracketToken: return this.parseComputedPropertyName(Await);
            default: return this.errorAtToken(`string, number, identifier or '[' expected.`);
        }
    }

    private tryParseHierarchyAxisKeyword(): HierarchyAxisKeyword | undefined {
        const token = this.token();
        if (isHierarchyAxisKeywordKind(token)) {
            return this.parseToken(token);
        }
    }

    // SequenceBinding[Await] :
    //     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] 
    //     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
    //     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] 
    //     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
    private parseSequenceBinding(Await: boolean): SequenceBinding {
        const pos = this.pos();
        const awaitKeyword = Await ? this.parseOptionalToken(SyntaxKind.AwaitKeyword) : undefined;
        const name = this.parseBindingIdentifier(Await);
        this.expectToken(SyntaxKind.InKeyword);
        const hierarchyAxisKeyword = this.tryParseHierarchyAxisKeyword();
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        let withHierarchy: AssignmentExpressionOrHigher | undefined;
        if (this.optionalToken(SyntaxKind.WithKeyword)) {
            this.expectToken(SyntaxKind.HierarchyKeyword);
            withHierarchy = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        }
        // SequenceBinding cannot be further refined
        return this.finishRefine(this.finishNode(Expr.sequenceBinding(awaitKeyword, name, hierarchyAxisKeyword, expression, withHierarchy), pos));
    }

    // FromClause[Await] :
    //     `from` SequenceBinding[?Await]
    private parseFromClause(Await: boolean, outerClause: QueryBodyClause | undefined): FromClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.FromKeyword);
        const sequenceBinding = this.parseSequenceBinding(Await);
        // FromClause cannot be further refined
        return this.finishRefine(this.finishNode(Expr.fromClause(outerClause, sequenceBinding), pos));
    }

    // LetClause[Await] :
    //     `let` BindingIdentifier[?Await] `=` AssignmentExpression[+In, ?Await]
    private parseLetClause(Await: boolean, outerClause: QueryBodyClause): LetClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.LetKeyword);
        const name = this.parseBindingIdentifier(Await);
        this.expectToken(SyntaxKind.EqualsToken);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        // LetClause cannot be further refined
        return this.finishRefine(this.finishNode(Expr.letClause(outerClause, name, expression), pos));
    }

    // WhereClause[Await] :
    //     `where` AssignmentExpression[+In, ?Await]
    private parseWhereClause(Await: boolean, outerClause: QueryBodyClause): WhereClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.WhereKeyword);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        // WhereClause cannot be further refined
        return this.finishRefine(this.finishNode(Expr.whereClause(outerClause, expression), pos));
    }

    // OrderbyClause[Await] :
    //     `orderby` OrderbyComparatorList[?Await]
    private parseOrderbyClause(Await: boolean, outerClause: QueryBodyClause): OrderbyClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OrderbyKeyword);
        const comparators: OrderbyComparator[] = [];
        do comparators.push(this.parseOrderbyComparator(Await));
        while (this.optionalToken(SyntaxKind.CommaToken));
        // OrderbyClause cannot be further refined
        return this.finishRefine(this.finishNode(Expr.orderbyClause(outerClause, comparators), pos));
    }

    // OrderbyComparatorList[Await] :
    //     OrderbyComparator[?Await]
    //     OrderbyComparatorList[?Await] `,` OrderbyComparator[?Await]
    //
    // DirectionKeyword :
    //     `ascending`
    //     `descending`
    // 
    // OrderbyComparator[Await] :
    //     AssignmentExpression[+In, ?Await] DirectionKeyword?
    //     AssignmentExpression[+In, ?Await] DirectionKeyword? `using` AssignmentExpression[+In, ?Await]
    private parseOrderbyComparator(Await: boolean): OrderbyComparator {
        const pos = this.pos();
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const directionToken =
            this.parseOptionalToken(SyntaxKind.AscendingKeyword) ||
            this.parseOptionalToken(SyntaxKind.DescendingKeyword);
        const usingExpression = this.optionalToken(SyntaxKind.UsingKeyword) ? this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await) : undefined;
        // OrderbyComparator cannot be further refined
        return this.finishRefine(this.finishNode(Expr.orderbyComparator(expression, directionToken, usingExpression), pos));
    }

    // GroupClause[Await] :
    //     `group` AssignmentExpression[+In, ?Await] `by` AssignmentExpression[+In, ?Await]
    private parseGroupClause(Await: boolean, outerClause: QueryBodyClause): GroupClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.GroupKeyword);
        const elementSelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        this.expectToken(SyntaxKind.ByKeyword);
        const keySelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const into = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier(Await) : undefined;
        // GroupClause cannot be further refined
        return this.finishRefine(this.finishNode(Expr.groupClause(outerClause, elementSelector, keySelector, into), pos));
    }

    // JoinClause[Await] :
    //     `join` SequenceBinding[?Await] `in` SequenceSource[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await]
    //     `join` SequenceBinding[?Await] `in` SequenceSource[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await] `into` BindingIdentifier[?Await]
    private parseJoinClause(Await: boolean, outerClause: QueryBodyClause): JoinClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.JoinKeyword);
        const sequenceBinding = this.parseSequenceBinding(Await);
        this.expectToken(SyntaxKind.OnKeyword);
        const outerKeySelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        this.expectToken(SyntaxKind.EqualsKeyword);
        const keySelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const into = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier(Await) : undefined;
        // JoinClause cannot be further refined
        return this.finishRefine(this.finishNode(Expr.joinClause(outerClause, sequenceBinding, outerKeySelector, keySelector, into), pos));
    }

    // SelectClause[Await] :
    //     `select` AssignmentExpression[+In, ?Await]
    private parseSelectClause(Await: boolean, outerClause: QueryBodyClause): SelectClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.SelectKeyword);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const into = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier(Await) : undefined;
        // SelectClause cannot be further refined
        return this.finishRefine(this.finishNode(Expr.selectClause(outerClause, expression, into), pos));
    }

    // QueryBodyClause[Await] :
    //     FromClause[Await]
    //     LetClause[Await]
    //     WhereClause[Await]
    //     JoinClause[Await]
    //     OrderbyClause[Await]
    //
    // QueryBodyClauses[Await] :
    //     QueryBodyClause[?Await]
    //     QueryBodyClauses[?Await] QueryBodyClause[?Await]
    // 
    // SelectOrGroupClause[Await] :
    //     SelectClause[?Await]
    //     GroupClause[?Await]
    private parseQueryBodyClause(Await: boolean, outerClause: QueryBodyClause): QueryBodyClause {
        switch (this.token()) {
            case SyntaxKind.FromKeyword: return this.parseFromClause(Await, outerClause);
            case SyntaxKind.LetKeyword: return this.parseLetClause(Await, outerClause);
            case SyntaxKind.WhereKeyword: return this.parseWhereClause(Await, outerClause);
            case SyntaxKind.OrderbyKeyword: return this.parseOrderbyClause(Await, outerClause);
            case SyntaxKind.GroupKeyword: return this.parseGroupClause(Await, outerClause);
            case SyntaxKind.JoinKeyword: return this.parseJoinClause(Await, outerClause);
            case SyntaxKind.SelectKeyword: return this.parseSelectClause(Await, outerClause);
            default: return this.errorAtToken(`'from', 'let', 'where', 'orderby', 'group', 'join', or 'select' expected.`);
        }
    }

    // QueryExpression[Await] :
    //     FromClause[?Await] QueryBody[Await]
    //
    // QueryBody[Await] :
    //     QueryBodyClauses[?Await]? SelectOrGroupClause[?Await] QueryContinuation[?Await]?
    //
    // QueryContinuation[Await] :
    //     `into` BindingIdentifier[+In, ?Await] QueryBody[?Await]
    private parseQueryExpression(Await: boolean): QueryExpression {
        const pos = this.pos();
        let outerClause: QueryBodyClause = this.parseFromClause(Await, /*outerClause*/ undefined);
        while (isStartOfClause(this.token())) {
            outerClause = this.parseQueryBodyClause(Await, outerClause);
        }
        if (outerClause.kind !== SyntaxKind.SelectClause &&
            outerClause.kind !== SyntaxKind.GroupClause ||
            outerClause.into) {
            return this.errorAtToken("A query must end with either a 'select' or 'group' clause.");
        }
        // QueryExpression cannot be further refined
        return this.finishRefine(this.finishNode(Expr.query(outerClause), pos));
    }

    private parseCoverParenthesizedExpressionAndArrowParameterList(Await: boolean): CoverParenthesizedExpressionAndArrowParameterList {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenParenToken);
        const expression =
            this.token() !== SyntaxKind.CloseParenToken &&
            this.token() !== SyntaxKind.DotDotDotToken ? this.parseExpression(/*In*/ true, Await) : undefined;
        const commaToken = expression ? this.parseOptionalToken(SyntaxKind.CommaToken) : undefined;
        const dotDotDotToken = !expression || commaToken ? this.parseOptionalToken(SyntaxKind.DotDotDotToken) : undefined;
        const name = dotDotDotToken ? this.parseBindingName(Await) : undefined;
        const closeParenToken = this.parseToken(SyntaxKind.CloseParenToken);
        // CoverParenthesizedExpressionAndArrowParameterList can be further refined
        return this.finishNode(createCoverParenthesizedExpressionAndArrowParameterList(expression, commaToken, dotDotDotToken, name, closeParenToken), pos);
    }

    private parseElision(): Elision {
        const pos = this.pos();
        // Elision cannot be further refined
        return this.finishRefine(this.finishNode(Expr.elision(), pos));
    }

    private parseAndRefineSpreadElement(Await: boolean): SpreadElement {
        return this.refineSpreadElement(this.parseSpreadElement(Await));
    }

    private parseSpreadElement(Await: boolean): SpreadElement {
        const pos = this.pos();
        this.expectToken(SyntaxKind.DotDotDotToken);
        // SpreadElement can be further refined
        return this.finishNode(Expr.spreadElement(this.parseLeftHandSideExpressionOrHigher(Await)), pos);
    }

    private parseArrayLiteralElement(Await: boolean): ArrayLiteralElement {
        switch (this.token()) {
            case SyntaxKind.CommaToken: return this.parseElision();
            case SyntaxKind.DotDotDotToken: return this.parseSpreadElement(Await);
            default: return this.parseAssignmentExpressionOrHigher(/*In*/ true, Await);
        }
    }

    private parseArrayLiteral(Await: boolean): ArrayLiteral {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBracketToken);
        const elements: ArrayLiteralElement[] = [];
        while (this.token() !== SyntaxKind.CloseBracketToken) {
            elements.push(this.listElement(this.parseArrayLiteralElement(Await), SyntaxKind.CloseBracketToken));
        }
        this.expectToken(SyntaxKind.CloseBracketToken);
        // ArrayLiteral can be further refined
        return this.finishNode(Expr.arrayLiteral(elements), pos);
    }

    private parsePropertyDefinition(Await: boolean): PropertyDefinition | ShorthandPropertyDefinition | CoverInitializedName {
        const pos = this.pos();
        const name = this.parsePropertyName(Await);
        if (this.optionalToken(SyntaxKind.ColonToken)) {
            // PropertyDefinition can be further refined
            return this.finishNode(Expr.propertyDefinition(name, this.parseAssignmentExpressionOrHigher(/*In*/ true, Await)), pos);
        }
        if (name.kind !== SyntaxKind.Identifier) return this.errorAtToken(`Unexpected token.`);
        const initializer = this.parseInitializer(Await);
        if (initializer) {
            // CoverInitializedName can be further refined
            return this.finishNode(createCoverInitializedName(name, initializer), pos);
        }
        // ShorthandPropertyDefinition can be further refined
        return this.finishNode(Expr.shorthandPropertyDefinition(name), pos);
    }

    private parseObjectLiteralElement(Await: boolean): ObjectLiteralElement {
        switch (this.token()) {
            case SyntaxKind.DotDotDotToken: return this.parseSpreadElement(Await);
            case SyntaxKind.Identifier:
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NumberLiteral:
            case SyntaxKind.OpenBracketToken: return this.parsePropertyDefinition(Await);
            default: return this.errorAtToken(`string, number, identifier, '[', or '...' expected.`);
        }
    }

    private parseObjectLiteral(Await: boolean): ObjectLiteral {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBraceToken);
        const properties: ObjectLiteralElement[] = [];
        while (this.token() !== SyntaxKind.CloseBraceToken) {
            properties.push(this.listElement(this.parseObjectLiteralElement(Await), SyntaxKind.CloseBraceToken));
        }
        this.expectToken(SyntaxKind.CloseBraceToken);
        // ObjectLiteral can be further refined
        return this.finishNode(Expr.objectLiteral(properties), pos);
    }

    private parseArgument(Await: boolean) {
        switch (this.token()) {
            case SyntaxKind.DotDotDotToken: return this.parseAndRefineSpreadElement(Await);
            default: return this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        }
    }

    private parseArgumentList(Await: boolean): ReadonlyArray<Argument> {
        const argumentList: Argument[] = [];
        this.expectToken(SyntaxKind.OpenParenToken);
        while (this.token() !== SyntaxKind.CloseParenToken) {
            argumentList.push(this.listElement(this.parseArgument(Await), SyntaxKind.CloseParenToken));
        }
        this.expectToken(SyntaxKind.CloseParenToken);
        return argumentList;
    }

    private parseNewExpression(Await: boolean): NewExpression {
        const pos = this.pos();
        this.expectToken(SyntaxKind.NewKeyword);
        const expression = this.parseMemberExpressionRest(Await, this.parseAndRefinePrimaryExpression(Await));
        const argumentList = this.token() === SyntaxKind.OpenParenToken ? this.parseArgumentList(Await) : undefined;
        // NewExpression cannot be further refined
        return this.finishRefine(this.finishNode(Expr.new(expression, argumentList), pos));
    }

    private parseAndRefinePrimaryExpression(Await: boolean): PrimaryExpression {
        return this.refinePrimaryExpression(this.parsePrimaryExpression(Await));
    }

    private parsePrimaryExpression(Await: boolean): PrimaryExpression {
        const token = this._scanner.rescanSlash();
        switch (token) {
            case SyntaxKind.NumberLiteral: return this.parseLiteral(token);
            case SyntaxKind.StringLiteral: return this.parseLiteral(token);
            case SyntaxKind.RegularExpressionLiteral: return this.parseLiteral(SyntaxKind.RegularExpressionLiteral);
            case SyntaxKind.NullKeyword: return this.parseToken(token);
            case SyntaxKind.TrueKeyword: return this.parseToken(token);
            case SyntaxKind.FalseKeyword: return this.parseToken(token);
            case SyntaxKind.OpenParenToken: return this.parseCoverParenthesizedExpressionAndArrowParameterList(Await);
            case SyntaxKind.OpenBracketToken: return this.parseArrayLiteral(Await);
            case SyntaxKind.OpenBraceToken: return this.parseObjectLiteral(Await);
            case SyntaxKind.NewKeyword: return this.parseNewExpression(Await);
            case SyntaxKind.Identifier: return this.parseIdentifierReference(Await);
            default: return this.errorAtToken(`Expression expected.`);
        }
    }

    private parsePropertyAccessExpressionRest(expression: LeftHandSideExpressionOrHigher): PropertyAccessExpression {
        const pos = getPos(expression);
        // PropertyAccessExpression cannot be further refined
        return this.finishRefine(this.finishNode(Expr.property(this.refineLeftHandSideExpressionOrHigher(expression), this.parseIdentifierName()), pos));
    }

    private parseElementAccessExpressionRest(Await: boolean, expression: LeftHandSideExpressionOrHigher): ElementAccessExpression {
        const pos = getPos(expression);
        const argumentExpression = this.parseAndRefineExpression(/*In*/ true, Await);
        this.expectToken(SyntaxKind.CloseBracketToken);
        // ElementAccessExpression cannot be further refined
        return this.finishRefine(this.finishNode(Expr.index(this.refineLeftHandSideExpressionOrHigher(expression), argumentExpression), pos));
    }

    private parseMemberExpressionRest(Await: boolean, expression: LeftHandSideExpressionOrHigher): MemberExpressionOrHigher {
        while (true) {
            if (this.optionalToken(SyntaxKind.DotToken)) {
                expression = this.parsePropertyAccessExpressionRest(expression);
            }
            else if (this.optionalToken(SyntaxKind.OpenBracketToken)) {
                expression = this.parseElementAccessExpressionRest(Await, expression);
            }
            else {
                return expression as MemberExpressionOrHigher;
            }
        }
    }

    private parseMemberExpressionOrHigher(Await: boolean): MemberExpressionOrHigher {
        return this.parseMemberExpressionRest(Await, this.parsePrimaryExpression(Await));
    }

    private parseCallExpressionRest(Await: boolean, expression: LeftHandSideExpressionOrHigher): LeftHandSideExpressionOrHigher {
        while (true) {
            expression = this.parseMemberExpressionRest(Await, expression);
            if (this.token() === SyntaxKind.OpenParenToken) {
                // CallExpression cannot be further refined
                expression = this.finishRefine(this.finishNode(Expr.call(this.refineLeftHandSideExpressionOrHigher(expression), this.parseArgumentList(Await)), getPos(expression)));
                continue;
            }
            return expression;
        }
    }

    private parseLeftHandSideExpressionOrHigher(Await: boolean): LeftHandSideExpressionOrHigher {
        return this.parseCallExpressionRest(Await, this.parseMemberExpressionOrHigher(Await));
    }

    private parsePrefixUnaryExpression(Await: boolean, kind: PrefixUnaryOperatorKind): PrefixUnaryExpression {
        const operatorToken = this.parseToken(kind);
        if (kind === SyntaxKind.AwaitKeyword && !this._async) return this.errorAtNode(`'await' not supported in a synchronous 'linq' block.`, operatorToken, false);
        // PrefixUnaryExpression cannot be further refined
        return this.finishRefine(this.finishNode(Expr.prefixUnary(operatorToken, this.parseAndRefineUnaryExpressionOrHigher(Await)), getPos(operatorToken)));
    }

    private parsePostfixUnaryExpressionRest(expression: LeftHandSideExpressionOrHigher): UnaryExpressionOrHigher {
        const token = this.token();
        if (isPostfixUnaryOperatorKind(token)) {
            // PostixUnaryExpression cannot be further refined
            return this.finishRefine(this.finishNode(Expr.postfixUnary(this.refineLeftHandSideExpressionOrHigher(expression), this.parseToken(token)), getPos(expression)));
        }
        return expression;
    }

    private parseAndRefineUnaryExpressionOrHigher(Await: boolean) {
        return this.refineUnaryExpressionOrHigher(this.parseUnaryExpressionOrHigher(Await));
    }

    private parseUnaryExpressionOrHigher(Await: boolean): UnaryExpressionOrHigher {
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
                return this.parsePrefixUnaryExpression(Await, token);
            default:
                return this.parsePostfixUnaryExpressionRest(this.parseLeftHandSideExpressionOrHigher(Await));
        }
    }

    private parseBinaryExpressionRest(In: boolean, Await: boolean, precedence: BinaryPrecedence, left: BinaryExpressionOrHigher): BinaryExpressionOrHigher {
        while (true) {
            const token = this.token();
            const newPrecedence = getBinaryOperatorPrecedence(token);
            if (!(token === SyntaxKind.AsteriskAsteriskToken ? newPrecedence >= precedence : newPrecedence > precedence)) break;
            if (token === SyntaxKind.InKeyword && !In) break;
            // BinaryExpression cannot be further refined
            left = this.finishRefine(this.finishNode(Expr.binary(
                this.refineBinaryExpressionOrHigher(left),
                this.parseToken(token as BinaryOperatorKind),
                this.parseAndRefineBinaryExpressionOrHigher(newPrecedence >= BinaryPrecedence.ShiftExpression || In, Await, newPrecedence)), getPos(left)));
        }
        return left;
    }

    private parseAndRefineBinaryExpressionOrHigher(In: boolean, Await: boolean, precedence: BinaryPrecedence) {
        return this.refineBinaryExpressionOrHigher(this.parseBinaryExpressionOrHigher(In, Await, precedence));
    }

    private parseBinaryExpressionOrHigher(In: boolean, Await: boolean, precedence: BinaryPrecedence): BinaryExpressionOrHigher {
        return this.parseBinaryExpressionRest(In, Await, precedence, this.parseUnaryExpressionOrHigher(Await));
    }

    private parseConditionalExpressionRest(In: boolean, Await: boolean, expression: BinaryExpressionOrHigher): AssignmentExpressionOrHigher {
        if (!this.optionalToken(SyntaxKind.QuestionToken)) return expression;
        this.expectToken(SyntaxKind.QuestionToken);
        const whenTrue = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        this.expectToken(SyntaxKind.ColonToken);
        // ConditionalExpression cannot be further refined
        return this.finishRefine(this.finishNode(Expr.conditional(this.refineBinaryExpressionOrHigher(expression), whenTrue, this.parseAndRefineAssignmentExpressionOrHigher(In, Await)), getPos(expression)));
    }

    private parseBindingProperty(Await: boolean): BindingProperty | ShorthandBindingProperty {
        const pos = this.pos();
        const name = this.parsePropertyName(Await);
        if (this.optionalToken(SyntaxKind.ColonToken)) {
            const bindingElement = this.parseBindingElement(Await);
            // BindingProperty cannot be further refined
            return this.finishRefine(this.finishNode(Expr.bindingProperty(name, bindingElement), pos));
        }
        if (name.kind !== SyntaxKind.Identifier) {
            return this.errorAtNode(`Identifier or binding pattern expected.`, name, false);
        }
        const initializer = this.parseInitializer(Await);
        // ShorthandBindingProperty cannot be further refined
        return this.finishRefine(this.finishNode(Expr.shorthandBindingProperty(name, initializer), pos));
    }

    private parseBindingRestProperty(Await: boolean): BindingRestProperty {
        const pos = this.pos();
        this.expectToken(SyntaxKind.DotDotDotToken);
        const name = this.parseBindingIdentifier(Await);
        // BindingRestProperty cannot be further refined
        return this.finishRefine(this.finishNode(Expr.bindingRestProperty(name), pos));
    }

    private parseObjectBindingPattern(Await: boolean): ObjectBindingPattern {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBraceToken);
        const properties: ObjectBindingPatternElement[] = [];
        let rest: BindingRestProperty | undefined;
        while (this.token() !== SyntaxKind.CloseBraceToken) {
            if (rest) return this.errorAtToken(`Unexpected token.`);
            switch (this.token()) {
                case SyntaxKind.DotDotDotToken:
                    rest = this.parseBindingRestProperty(Await);
                    continue;
                default:
                    properties.push(this.listElement(this.parseBindingProperty(Await), SyntaxKind.CloseBraceToken));
                    continue;
            }
        }
        this.expectToken(SyntaxKind.CloseBraceToken);
        // ObjectBindingPattern cannot be further refined
        return this.finishRefine(this.finishNode(Expr.objectBindingPattern(properties, rest), pos));
    }

    private parseBindingRestElement(Await: boolean): BindingRestElement {
        const pos = this.pos();
        this.expectToken(SyntaxKind.DotDotDotToken);
        const name = this.parseBindingName(Await);
        // BindingRestElement cannot be further refined
        return this.finishRefine(this.finishNode(Expr.bindingRestElement(name), pos));
    }

    private parseBindingElement(Await: boolean): BindingElement {
        const pos = this.pos();
        const name = this.parseBindingName(Await);
        const initializer = this.parseInitializer(Await);
        // BindingElement cannot be further refined
        return this.finishRefine(this.finishNode(Expr.bindingElement(name, initializer), pos));
    }

    private parseArrayBindingPattern(Await: boolean): ArrayBindingPattern {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBracketToken);
        const elements: ArrayBindingPatternElement[] = [];
        let rest: BindingRestElement | undefined;
        while (this.token() !== SyntaxKind.CloseBracketToken) {
            if (rest) return this.errorAtToken(`Unexpected token.`);
            switch (this.token()) {
                case SyntaxKind.DotDotDotToken:
                    rest = this.parseBindingRestElement(Await);
                    continue;
                case SyntaxKind.CommaToken:
                    elements.push(this.listElement(this.parseElision(), SyntaxKind.CloseBracketToken));
                    continue;
                default:
                    elements.push(this.listElement(this.parseBindingElement(Await), SyntaxKind.CloseBracketToken));
                    continue;
            }
        }
        this.expectToken(SyntaxKind.CloseBracketToken);
        // ArrayBindingPattern cannot be further refined
        return this.finishRefine(this.finishNode(Expr.arrayBindingPattern(elements, rest), pos));
    }

    private parseBindingName(Await: boolean): BindingName {
        switch (this.token()) {
            case SyntaxKind.OpenBraceToken: return this.parseObjectBindingPattern(Await);
            case SyntaxKind.OpenBracketToken: return this.parseArrayBindingPattern(Await);
            default: return this.parseBindingIdentifier(Await);
        }
    }

    private parseInitializer(Await: boolean) {
        // Initializer cannot be further refined
        return this.optionalToken(SyntaxKind.EqualsToken) ? this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await) : undefined;;
    }

    private parseParameterList(Await: boolean): { parameters: ReadonlyArray<BindingElement>, rest: BindingRestElement | undefined } {
        this.expectToken(SyntaxKind.OpenParenToken);
        const parameters: BindingElement[] = [];
        let rest: BindingRestElement | undefined;
        while (this.token() !== SyntaxKind.CloseParenToken) {
            if (rest) return this.errorAtToken(`Unexpected token.`);
            switch (this.token()) {
                case SyntaxKind.DotDotDotToken:
                    rest = this.parseBindingRestElement(Await);
                    continue;
                default:
                    parameters.push(this.listElement(this.parseBindingElement(Await), SyntaxKind.CloseParenToken));
                    continue;
            }
        }
        this.expectToken(SyntaxKind.CloseParenToken);
        return { parameters, rest };
    }

    private parseAsyncArrowFunction(In: boolean, Await: boolean) {
        const pos = this.pos();
        const asyncKeyword = this.parseToken(SyntaxKind.AsyncKeyword);
        const { parameters, rest } = this.parseParameterList(Await);
        this.expectToken(SyntaxKind.EqualsGreaterThanToken);
        // AsyncArrowFunction cannot be further refined
        return this.finishRefine(this.finishNode(Expr.arrow(asyncKeyword, parameters, rest, this.parseAssignmentExpressionOrHigher(In, /*Await*/ true)), pos));
    }

    private parseArrowFunctionRest(In: boolean, head: AssignmentExpressionOrHigher) {
        const { parameters, rest } = this.refineArrowFunctionHead(head);
        this.expectToken(SyntaxKind.EqualsGreaterThanToken);
        if (this.token() === SyntaxKind.OpenBraceToken) return this.errorAtToken(`Expression expected.`);
        // ArrowFunction cannot be further refined
        return this.finishRefine(this.finishNode(Expr.arrow(undefined, parameters, rest, this.parseAssignmentExpressionOrHigher(In, /*Await*/ false)), getPos(head)));
    }

    private parseAndRefineAssignmentExpressionOrHigher(In: boolean, Await: boolean) {
        return this.refineAssignmentExpressionOrHigher(this.parseAssignmentExpressionOrHigher(In, Await));
    }

    private parseAssignmentExpressionOrHigher(In: boolean, Await: boolean): AssignmentExpressionOrHigher {
        if (this.token() === SyntaxKind.FromKeyword) return this.parseQueryExpression(Await);
        if (this.token() === SyntaxKind.AsyncKeyword) return this.parseAsyncArrowFunction(In, Await);
        const expression = this.parseBinaryExpressionOrHigher(In, Await, BinaryPrecedence.None);
        if (this.token() === SyntaxKind.EqualsGreaterThanToken) return this.parseArrowFunctionRest(In, expression);
        if (isLeftHandSideExpressionOrHigher(expression) && isAssignmentOperatorKind(this.token())) {
            const pos = getPos(expression);
            // AssignmentExpression can be further refined
            return this.finishNode(
                Expr.assign(
                    expression, // do not refine
                    this.parseToken(this.token() as AssignmentOperatorKind),
                    this.parseAndRefineAssignmentExpressionOrHigher(In, Await)),
                pos);
        }
        return this.parseConditionalExpressionRest(In, Await, expression);
    }

    private parseAndRefineExpression(In: boolean, Await: boolean): Expression {
        return this.refineExpression(this.parseExpression(In, Await));
    }

    private parseExpression(In: boolean, Await: boolean): Expression {
        const left = this.parseAssignmentExpressionOrHigher(In, Await);
        if (this.optionalToken(SyntaxKind.CommaToken)) {
            const expressions = [left];
            do {
                expressions.push(this.parseAssignmentExpressionOrHigher(In, Await));
            }
            while (this.optionalToken(SyntaxKind.CommaToken));
            // CommaListExpression can be further refined
            return this.finishNode(Expr.comma(expressions), getPos(left));
        }
        return left;
    }

    private refinePrimaryExpression(node: PrimaryExpression): PrimaryExpression {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.ObjectLiteral ? this.refineObjectLiteral(node) :
            node.kind === SyntaxKind.ArrayLiteral ? this.refineArrayLiteral(node) :
            node.kind === SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList ? this.refineParenthesizedExpression(node) :
            assertFail("PrimaryExpression should already be refined.");
    }

    private refineMemberExpressionOrHigher(node: MemberExpressionOrHigher) {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.PropertyAccessExpression ? assertFail("PropertyAccessExpression should already be refined.") :
            node.kind === SyntaxKind.ElementAccessExpression ? assertFail("ElementAccessExpression should already be refined.") :
            node.kind === SyntaxKind.NewExpression ? assertFail("NewExpression should already be refined.") :
            this.refinePrimaryExpression(node);
    }

    private refineLeftHandSideExpressionOrHigher(node: LeftHandSideExpressionOrHigher) {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.ObjectAssignmentPattern ? assertFail("ObjectAssignmentPattern should already be refined.") :
            node.kind === SyntaxKind.ArrayAssignmentPattern ? assertFail("ArrayAssignmentPattern should already be refined.") :
            node.kind === SyntaxKind.CallExpression ? assertFail("CallExpression should already be refined.") :
            this.refineMemberExpressionOrHigher(node);
    }

    private refineUnaryExpressionOrHigher(node: UnaryExpressionOrHigher) {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.PrefixUnaryExpression ? assertFail("PrefixUnaryExpression should already be refined.") :
            node.kind === SyntaxKind.PostfixUnaryExpression ? assertFail("PostfixUnaryExpression should already be refined.") :
            this.refineLeftHandSideExpressionOrHigher(node);
    }

    private refineBinaryExpressionOrHigher(node: BinaryExpressionOrHigher) {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.BinaryExpression ? assertFail("BinaryExpression should already be refined.") :
            this.refineUnaryExpressionOrHigher(node);
    }

    private refineAssignmentExpressionOrHigher(node: AssignmentExpressionOrHigher) {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.AssignmentExpression ? this.refineAssignmentExpression(node) :
            node.kind === SyntaxKind.ConditionalExpression ? assertFail("ConditionalExpression should already be refined.") :
            node.kind === SyntaxKind.QueryExpression ? assertFail("QueryExpression should already be refined.") :
            node.kind === SyntaxKind.ArrowFunction ? assertFail("ArrowFunction should already be refined.") :
            this.refineBinaryExpressionOrHigher(node);
    }

    private refineExpression(node: Expression) {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.CommaListExpression ? this.refineCommaListExpression(node) :
            this.refineAssignmentExpressionOrHigher(node)
    }

    private refineObjectLiteral(node: ObjectLiteral) {
        for (const property of node.properties) {
            if (property.kind === SyntaxKind.CoverInitializedName) {
                return this.errorAtPos(`Unexpected token.`, getEnd(property.name));
            }
        }
        return node;
    }

    private refineArrayLiteral(node: ArrayLiteral): ArrayLiteral {
        return node;
    }

    private refineParenthesizedExpression(node: CoverParenthesizedExpressionAndArrowParameterList) {
        if (!node.expression || node.commaToken || node.dotDotDotToken || node.name) {
            const lastToken = node.commaToken || node.dotDotDotToken || node.name || node.closeParenToken;
            return this.errorAtNode(`Unexpected token.`, lastToken);
        }
        return this.finishRefine(this.finishNode(Expr.paren(this.refineExpression(node.expression)), getPos(node), getEnd(node)));
    }

    private refineSpreadElement(node: SpreadElement): SpreadElement {
        return this.finishRefine(ExprUpdate.spreadElement(node, this.refineAssignmentExpressionOrHigher(node.expression)));
    }

    private refineArgument(node: Argument): Argument {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.SpreadElement ? this.refineSpreadElement(node) :
            this.refineAssignmentExpressionOrHigher(node);
    }

    private refineCommaListExpression(node: CommaListExpression) {
        return this.finishRefine(ExprUpdate.comma(node, visitList(node.expressions, this.refineAssignmentExpressionOrHigher)));
    }

    private refineAssignmentRestProperty(node: SpreadElement): AssignmentRestProperty {
        return this.finishNode(Expr.assignmentRestProperty(this.refineIdentifier(node.expression)), getPos(node), getEnd(node));
    }

    private refineAssignmentProperty(node: PropertyDefinition): AssignmentProperty {
        const assignmentElement = this.refineAssignmentElement(node.initializer);
        return this.finishNode(Expr.assignmentProperty(node.name, assignmentElement), getPos(node), getEnd(node));
    }

    private refineShorthandAssignmentProperty(node: ShorthandPropertyDefinition | CoverInitializedName): ShorthandAssignmentProperty {
        switch (node.kind) {
            case SyntaxKind.ShorthandPropertyDefinition: {
                return this.finishNode(Expr.shorthandAssignmentProperty(node.name, undefined), getPos(node), getEnd(node));
            }
            case SyntaxKind.CoverInitializedName: {
                return this.finishNode(Expr.shorthandAssignmentProperty(node.name, node.initializer), getPos(node), getEnd(node));
            }
        }
    }

    private refineObjectAssignmentPattern(node: ObjectLiteral): ObjectAssignmentPattern {
        const properties: ObjectAssignmentPatternElement[] = [];
        let rest: AssignmentRestProperty | undefined;
        for (const property of node.properties) {
            switch (property.kind) {
                case SyntaxKind.SpreadElement:
                    if (rest) return this.errorAtPos(`Unexpected token.`, getPos(property));
                    rest = this.refineAssignmentRestProperty(property);
                    continue;
                case SyntaxKind.PropertyDefinition:
                    properties.push(this.refineAssignmentProperty(property));
                    continue;
                case SyntaxKind.ShorthandPropertyDefinition:
                case SyntaxKind.CoverInitializedName:
                    properties.push(this.refineShorthandAssignmentProperty(property));
                    continue;
                default:
                    return assertNever(property);
            }
        }
        return this.finishNode(Expr.objectAssignmentPattern(properties, rest), getPos(node), getEnd(node));
    }

    private refineAssignmentElement(node: AssignmentExpressionOrHigher): AssignmentElement {
        if (isCompoundAssignment(node)) return this.errorAtPos(`Unexpected token.`, getPos(node.operatorToken));
        if (isSimpleAssignment(node)) {
            const target = this.refineAssignmentTarget(node.left);
            const initializer = node.right;
            return this.finishNode(Expr.assignmentElement(target, initializer), getPos(node), getEnd(node));
        }
        const target = this.refineAssignmentTarget(node);
        return this.finishNode(Expr.assignmentElement(target, undefined), getPos(node), getEnd(node));
    }

    private refineAssignmentRestElement(node: SpreadElement): AssignmentRestElement {
        return this.finishNode(Expr.assignmentRestElement(this.refineAssignmentTarget(node.expression)), getPos(node), getEnd(node));
    }

    private refineArrayAssignmentPattern(node: ArrayLiteral): ArrayAssignmentPattern {
        const elements: ArrayAssignmentPatternElement[] = [];
        let rest: AssignmentRestElement | undefined;
        for (const element of node.elements) {
            if (rest) return this.errorAtPos(`Unexpected token.`, getPos(element));
            switch (element.kind) {
                case SyntaxKind.Elision:
                    elements.push(element);
                    continue;
                case SyntaxKind.SpreadElement:
                    rest = this.refineAssignmentRestElement(element);
                    continue;
                default:
                    elements.push(this.refineAssignmentElement(element));
                    continue;
            }
        }
        return this.finishNode(Expr.arrayAssignmentPattern(elements, rest), getPos(node), getEnd(node));
    }

    private refineAssignmentTarget(node: AssignmentExpressionOrHigher): LeftHandSideExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.ObjectLiteral: return this.refineObjectAssignmentPattern(node);
            case SyntaxKind.ArrayLiteral: return this.refineArrayAssignmentPattern(node);
            default:
                if (isLeftHandSideExpressionOrHigher(node)) return this.refineLeftHandSideExpressionOrHigher(node);
                return this.errorAtNode(`Invalid left-hand side in assignment.`, node);
        }
    }

    private refineSimpleAssignment(node: SimpleAssignmentExpression) {
        const left = this.refineAssignmentTarget(node.left);
        return this.finishNode(Expr.assign(left, node.operatorToken, node.right), getPos(node), getEnd(node));
    }

    private refineAssignmentExpression(node: AssignmentExpression) {
        if (isSimpleAssignment(node)) return this.refineSimpleAssignment(node);
        const left = this.refineLeftHandSideExpressionOrHigher(node.left);
        return node.left !== left
            ? this.finishNode(Expr.assign(left, node.operatorToken, node.right), getPos(node))
            : node;
    }

    private refineIdentifier(node: AssignmentExpressionOrHigher): Identifier {
        if (node.kind !== SyntaxKind.Identifier) return this.errorAtPos(`Unexpected token.`, getPos(node));
        return node;
    }

    private refineBindingRestProperty(node: SpreadElement | BindingRestProperty): BindingRestProperty {
        if (node.kind === SyntaxKind.BindingRestProperty) {
            return this.finishRefine(node);
        }
        return this.finishRefine(this.finishNode(Expr.bindingRestProperty(this.refineIdentifier(node.expression)), getPos(node), getEnd(node)));
    }

    private refineComputedPropertyName(node: ComputedPropertyName): ComputedPropertyName {
        return this.finishRefine(ExprUpdate.computedPropertyName(node, this.refineExpression(node.expression)));
    }

    private refinePropertyName(node: PropertyName): PropertyName {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.ComputedPropertyName ? this.refineComputedPropertyName(node) :
            this.finishRefine(node);
    }

    private refineBindingProperty(node: PropertyDefinition | BindingProperty): BindingProperty {
        if (node.kind === SyntaxKind.BindingProperty) {
            return this.finishRefine(ExprUpdate.bindingProperty(node, this.refinePropertyName(node.propertyName), this.refineBindingElement(node.bindingElement)));
        }
        return this.finishRefine(this.finishNode(Expr.bindingProperty(node.name, this.refineBindingElement(node.initializer)), getPos(node), getEnd(node)));
    }

    private refineShorthandBindingProperty(node: ShorthandPropertyDefinition | CoverInitializedName | ShorthandBindingProperty): ShorthandBindingProperty {
        switch (node.kind) {
            case SyntaxKind.ShorthandBindingProperty: {
                return this.finishRefine(ExprUpdate.shorthandBindingProperty(node, node.name, node.initializer && this.refineAssignmentExpressionOrHigher(node.initializer)));
            }
            case SyntaxKind.ShorthandPropertyDefinition: {
                return this.finishRefine(this.finishNode(Expr.shorthandBindingProperty(node.name, undefined), getPos(node), getEnd(node)));
            }
            case SyntaxKind.CoverInitializedName: {
                return this.finishRefine(this.finishNode(Expr.shorthandBindingProperty(node.name, this.refineAssignmentExpressionOrHigher(node.initializer)), getPos(node), getEnd(node)));
            }
        }
    }

    private refineObjectBindingPatternElement(node: ObjectBindingPatternElement): ObjectBindingPatternElement {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.BindingProperty ? this.refineBindingProperty(node) :
            this.refineShorthandBindingProperty(node);
    }

    private refineObjectBindingPattern(node: ObjectLiteral | ObjectBindingPattern): ObjectBindingPattern {
        if (node.kind === SyntaxKind.ObjectBindingPattern) {
            return this.finishRefine(ExprUpdate.objectBindingPattern(node, visitList(node.properties, this.refineObjectBindingPatternElement), node.rest && this.refineBindingRestProperty(node.rest)));
        }
        const properties: ObjectBindingPatternElement[] = [];
        let rest: BindingRestProperty | undefined;
        for (const property of node.properties) {
            switch (property.kind) {
                case SyntaxKind.SpreadElement:
                    if (rest) return this.errorAtPos(`Unexpected token.`, getPos(property));
                    rest = this.refineBindingRestProperty(property);
                    continue;
                case SyntaxKind.PropertyDefinition:
                    properties.push(this.refineBindingProperty(property));
                    continue;
                case SyntaxKind.ShorthandPropertyDefinition:
                case SyntaxKind.CoverInitializedName:
                    properties.push(this.refineShorthandBindingProperty(property));
                    continue;
                default:
                    return assertNever(property);
            }
        }
        return this.finishNode(Expr.objectBindingPattern(properties, rest), getPos(node), getEnd(node));
    }

    private refineBindingRestElement(node: SpreadElement | BindingRestElement): BindingRestElement {
        if (node.kind === SyntaxKind.BindingRestElement) {
            return this.finishRefine(ExprUpdate.bindingRestElement(node, this.refineBindingName(node.name)));
        }
        return this.finishRefine(this.finishNode(Expr.bindingRestElement(this.refineBindingName(node.expression)), getPos(node), getEnd(node)));
    }

    private refineBindingElement(node: AssignmentExpressionOrHigher | BindingElement): BindingElement {
        if (node.kind === SyntaxKind.BindingElement) {
            return this.finishRefine(ExprUpdate.bindingElement(node, this.refineBindingName(node.name), node.initializer && this.refineAssignmentExpressionOrHigher(node.initializer)));
        }
        if (isCompoundAssignment(node)) return this.errorAtPos(`Unexpected token.`, getPos(node.operatorToken));
        if (isSimpleAssignment(node)) {
            const name = this.refineBindingName(node.left);
            const initializer = node.right;
            return this.finishRefine(this.finishNode(Expr.bindingElement(name, initializer), getPos(node), getEnd(node)));
        }
        return this.finishRefine(this.finishNode(Expr.bindingElement(this.refineBindingName(node)), getPos(node), getEnd(node)));
    }

    private refineArrayBindingPatternElement(node: ArrayBindingPatternElement): ArrayBindingPatternElement {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.Elision ? node :
            this.refineBindingElement(node);
    }

    private refineArrayBindingPattern(node: ArrayLiteral | ArrayBindingPattern): ArrayBindingPattern {
        if (node.kind === SyntaxKind.ArrayBindingPattern) {
            return this.finishRefine(ExprUpdate.arrayBindingPattern(node, visitList(node.elements, this.refineArrayBindingPatternElement), node.rest && this.refineBindingRestElement(node.rest)));
        }

        const elements: ArrayBindingPatternElement[] = [];
        let rest: BindingRestElement | undefined;
        for (const element of node.elements) {
            if (rest) return this.errorAtPos(`Unexpected token.`, getPos(element));
            switch (element.kind) {
                case SyntaxKind.Elision:
                    elements.push(element);
                    continue;
                case SyntaxKind.SpreadElement:
                    rest = this.refineBindingRestElement(element);
                    continue;
                default:
                    elements.push(this.refineBindingElement(element));
                    continue;
            }
        }
        return this.finishRefine(this.finishNode(Expr.arrayBindingPattern(elements, rest), getPos(node), getEnd(node)));
    }

    private refineBindingName(node: AssignmentExpressionOrHigher | BindingName): BindingName {
        switch (node.kind) {
            case SyntaxKind.Identifier: return node;
            case SyntaxKind.ObjectLiteral: return this.refineObjectBindingPattern(node);
            case SyntaxKind.ArrayLiteral: return this.refineArrayBindingPattern(node);
            case SyntaxKind.ObjectBindingPattern: return this.refineObjectBindingPattern(node);
            case SyntaxKind.ArrayBindingPattern: return this.refineArrayBindingPattern(node);
            default: return this.errorAtPos(`Unexpected token.`, getPos(node));
        }
    }

    private refineArrowFunctionHead(head: AssignmentExpressionOrHigher): { parameters: ReadonlyArray<Parameter>, rest: BindingRestElement | undefined } {
        const parameters: Parameter[] = [];
        let rest: BindingRestElement | undefined;
        if (head.kind === SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList) {
            if (head.expression) {
                if (head.expression.kind === SyntaxKind.CommaListExpression) {
                    for (const expression of head.expression.expressions) {
                        parameters.push(this.refineBindingElement(expression));
                    }
                }
                else {
                    parameters.push(this.refineBindingElement(head.expression));
                }
            }
            if (head.dotDotDotToken && head.name) {
                rest = this.finishNode(Expr.rest(head.name), getPos(head.dotDotDotToken!), getEnd(head.name!));
            }
        }
        else if (head.kind === SyntaxKind.Identifier) {
            parameters.push(this.finishNode(Expr.var(head), getPos(head), getEnd(head)));
        }
        else {
            return this.errorAtPos(`Unexpected token.`, getPos(head));
        }
        return { parameters, rest };
    }

    private isRefined(node: Node) {
        return this._refined.has(node);
    }

    private finishRefine<T extends Syntax>(node: T): T {
        this._refined.add(node);
        return node;
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

function createCoverParenthesizedExpressionAndArrowParameterList(expression: Expression | undefined, commaToken: TokenNode<SyntaxKind.CommaToken> | undefined, dotDotDotToken: TokenNode<SyntaxKind.DotDotDotToken> | undefined, name: BindingName | undefined, closeParenToken: TokenNode<SyntaxKind.CloseParenToken>): CoverParenthesizedExpressionAndArrowParameterList {
    return { kind: SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList, expression, commaToken, dotDotDotToken, name, closeParenToken, [Syntax.location]: createTextRange(0, 0) };
}

function createCoverInitializedName(name: Identifier, initializer: AssignmentExpressionOrHigher): CoverInitializedName {
    return { kind: SyntaxKind.CoverInitializedName, name, initializer, [Syntax.location]: createTextRange(0, 0) };
}

interface SimpleAssignmentExpression extends AssignmentExpression {
    operatorToken: TokenNode<SyntaxKind.EqualsToken>;
}

interface CompoundAssignmentExpression extends AssignmentExpression {
    operatorToken: TokenNode<Exclude<AssignmentOperatorKind, SyntaxKind.EqualsToken>>;
}

function isSimpleAssignment(node: Node): node is SimpleAssignmentExpression {
    return node.kind === SyntaxKind.AssignmentExpression
        && node.operatorToken.kind === SyntaxKind.EqualsToken;
}

function isCompoundAssignment(node: Node): node is CompoundAssignmentExpression {
    return node.kind === SyntaxKind.AssignmentExpression
        && node.operatorToken.kind !== SyntaxKind.EqualsToken;
}

function mayBeIdentifier(token: SyntaxKind, allowReservedWords: boolean, allowAwait: boolean) {
    if (token === SyntaxKind.Identifier) return true;
    if (token === SyntaxKind.AwaitKeyword) return allowAwait || allowReservedWords;
    if (isECMAScriptReservedWordKind(token)) return allowReservedWords;
    if (isKeywordKind(token)) return true;
    return false;
}
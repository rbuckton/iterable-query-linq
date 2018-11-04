import { SyntaxKind, Token, QueryBodyClause, FromClause, LetClause, WhereClause,
    OrderbyClause, OrderbyComparator, GroupClause, JoinClause, Expression,
    ArrayLiteral, ObjectLiteral, NewExpression, PropertyAccessExpression,
    ElementAccessExpression, Elision, SpreadElement, PropertyDefinition,
    ShorthandPropertyDefinition, PropertyName, ComputedPropertyName, isKeyword,
    QueryExpression, PrefixUnaryOperator, isPostfixUnaryOperator, UnaryExpressionOrHigher,
    LeftHandSideExpressionOrHigher, PrimaryExpression, isTextLiteralKind, MemberExpressionOrHigher,
    TextLiteralKind, TextLiteralNode, ArrayLiteralElement, ObjectLiteralElement, Argument,
    BinaryOperator, SelectClause, AssignmentExpressionOrHigher, Node,
    isHierarchyAxisKeywordKind, BindingElement, BindingRestElement,
    BindingName, ObjectBindingPattern, ArrayBindingPattern, ArrayBindingPatternElement,
    CoverParenthesizedExpressionAndArrowParameterList, isLeftHandSideExpressionOrHigher,
    CoverInitializedName, BindingIdentifier, IdentifierReference, 
    ObjectBindingPatternElement, BindingRestProperty, BindingProperty, ShorthandBindingProperty,
    ObjectAssignmentPattern, ArrayAssignmentPattern, ObjectAssignmentPatternElement,
    AssignmentRestProperty, ShorthandAssignmentProperty, AssignmentProperty, AssignmentElement,
    ArrayAssignmentPatternElement, AssignmentRestElement, isAssignmentOperator,
    AssignmentOperator, AssignmentExpression, BinaryExpressionOrHigher,
    CommaListExpression, PrefixUnaryExpression, Parameter, SequenceBinding,
    isECMAScriptReservedWord, IdentifierName,
    Syntax, createTextRange, HierarchyAxisKeywordKind, ThisExpression, NullLiteral, BooleanLiteral,
    SyntaxUpdate
} from "./types";
import { Scanner, tokenToString } from "./scanner";
import { RecoverableSyntaxError, UnrecoverableSyntaxError } from "./errors";
import { BinaryPrecedence, getBinaryOperatorPrecedence, assertNever, assertFail, visitList } from "./utils";

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
        if (this.token() !== SyntaxKind.EndOfFileToken) return this.errorAtToken("Unexpected token.");
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

    private errorAtNode(message: string, node: Syntax, recoverable?: boolean) {
        return this.errorAtPosEnd(message, Syntax.pos(node), Syntax.end(node), recoverable);
    }

    private readToken<Kind extends Token>(kind: Kind): Kind {
        this.expectToken(kind);
        return kind;
    }

    private expectToken(kind: Token) {
        if (this.token() !== kind) {
            this.errorAtToken(`'${tokenToString(kind)}' expected.`, /*recoverable*/ true);
        }
        this.nextToken();
    }

    private optionalToken(kind: Token) {
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
        return this.finishRefine(this.finishNode(Syntax.Literal(kind, text, flags), pos));
    }

    private parseBindingIdentifier(Await: boolean): BindingIdentifier {
        return this.parseIdentifier(/*allowReservedWords*/ false, !Await, Syntax.BindingIdentifier);
    }

    private parseIdentifierReference(Await: boolean): IdentifierReference {
        return this.parseIdentifier(/*allowReservedWords*/ false, !Await, Syntax.IdentifierReference);
    }

    private parseIdentifierName(): IdentifierName {
        return this.parseIdentifier(/*allowReservedWords*/ true, /*allowAwait*/ true, Syntax.IdentifierName);
    }

    private parseIdentifier<T extends BindingIdentifier | IdentifierReference | IdentifierName>(allowReservedWords: boolean, allowAwait: boolean, factory: (text: string) => T): T {
        if (!mayBeIdentifier(this.token(), allowReservedWords, allowAwait)) {
            return this.errorAtToken("Identifier expected.");
        }
        const pos = this.pos();
        const text = this._scanner.tokenText();
        this.nextToken();
        // Identifier cannot be further refined
        return this.finishRefine(this.finishNode(factory(text), pos));
    }

    private parseComputedPropertyName(Await: boolean): ComputedPropertyName {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenBracketToken);
        const expression = this.parseAndRefineExpression(/*In*/ true, Await);
        this.expectToken(SyntaxKind.CloseBracketToken);
        // ComputedPropertyName cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.ComputedPropertyName(expression), pos));
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

    private tryParseHierarchyAxisKeyword(): HierarchyAxisKeywordKind | undefined {
        const token = this.token();
        if (isHierarchyAxisKeywordKind(token)) {
            return this.readToken(token);
        }
    }

    // SequenceBinding[Await] :
    //     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] 
    //     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
    //     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] 
    //     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
    private parseSequenceBinding(Await: boolean): SequenceBinding {
        const pos = this.pos();
        const awaitKeyword = Await ? this.optionalToken(SyntaxKind.AwaitKeyword) : false;
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
        return this.finishRefine(this.finishNode(Syntax.SequenceBinding(awaitKeyword, name, hierarchyAxisKeyword, expression, withHierarchy), pos));
    }

    // FromClause[Await] :
    //     `from` SequenceBinding[?Await]
    private parseFromClause(Await: boolean, outerClause: QueryBodyClause | undefined): FromClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.FromKeyword);
        const sequenceBinding = this.parseSequenceBinding(Await);
        // FromClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.FromClause(outerClause, sequenceBinding), pos));
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
        return this.finishRefine(this.finishNode(Syntax.LetClause(outerClause, name, expression), pos));
    }

    // WhereClause[Await] :
    //     `where` AssignmentExpression[+In, ?Await]
    private parseWhereClause(Await: boolean, outerClause: QueryBodyClause): WhereClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.WhereKeyword);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        // WhereClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.WhereClause(outerClause, expression), pos));
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
        return this.finishRefine(this.finishNode(Syntax.OrderbyClause(outerClause, comparators), pos));
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
        const direction =
            this.optionalToken(SyntaxKind.AscendingKeyword) ? SyntaxKind.AscendingKeyword :
            this.optionalToken(SyntaxKind.DescendingKeyword) ? SyntaxKind.DescendingKeyword :
            undefined;
        const usingExpression = this.optionalToken(SyntaxKind.UsingKeyword) ? this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await) : undefined;
        // OrderbyComparator cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.OrderbyComparator(expression, direction, usingExpression), pos));
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
        return this.finishRefine(this.finishNode(Syntax.GroupClause(outerClause, elementSelector, keySelector, into), pos));
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
        return this.finishRefine(this.finishNode(Syntax.JoinClause(outerClause, sequenceBinding, outerKeySelector, keySelector, into), pos));
    }

    // SelectClause[Await] :
    //     `select` AssignmentExpression[+In, ?Await]
    private parseSelectClause(Await: boolean, outerClause: QueryBodyClause): SelectClause {
        const pos = this.pos();
        this.expectToken(SyntaxKind.SelectKeyword);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const into = this.optionalToken(SyntaxKind.IntoKeyword) ? this.parseBindingIdentifier(Await) : undefined;
        // SelectClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.SelectClause(outerClause, expression, into), pos));
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
        return this.finishRefine(this.finishNode(Syntax.Query(outerClause), pos));
    }

    private parseCoverParenthesizedExpressionAndArrowParameterList(Await: boolean): CoverParenthesizedExpressionAndArrowParameterList {
        const pos = this.pos();
        this.expectToken(SyntaxKind.OpenParenToken);
        const expression =
            this.token() !== SyntaxKind.CloseParenToken &&
            this.token() !== SyntaxKind.DotDotDotToken ? this.parseExpression(/*In*/ true, Await) : undefined;
        const rest = (!expression || this.optionalToken(SyntaxKind.CommaToken)) && this.token() === SyntaxKind.DotDotDotToken 
            ? this.parseBindingRestElement(Await) 
            : undefined;
        this.expectToken(SyntaxKind.CloseParenToken);
        // CoverParenthesizedExpressionAndArrowParameterList can be further refined
        return this.finishNode(createCoverParenthesizedExpressionAndArrowParameterList(expression, rest), pos);
    }

    private parseElision(): Elision {
        const pos = this.pos();
        // Elision cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Elision(), pos));
    }

    private parseAndRefineSpreadElement(Await: boolean): SpreadElement {
        return this.refineSpreadElement(this.parseSpreadElement(Await));
    }

    private parseSpreadElement(Await: boolean): SpreadElement {
        const pos = this.pos();
        this.expectToken(SyntaxKind.DotDotDotToken);
        // SpreadElement can be further refined
        return this.finishNode(Syntax.SpreadElement(this.parseLeftHandSideExpressionOrHigher(Await)), pos);
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
        return this.finishNode(Syntax.ArrayLiteral(elements), pos);
    }

    private parsePropertyDefinition(Await: boolean): PropertyDefinition | ShorthandPropertyDefinition | CoverInitializedName {
        const pos = this.pos();
        const name = this.parsePropertyName(Await);
        if (this.optionalToken(SyntaxKind.ColonToken)) {
            // PropertyDefinition can be further refined
            return this.finishNode(Syntax.PropertyDefinition(name, this.parseAssignmentExpressionOrHigher(/*In*/ true, Await)), pos);
        }
        if (name.kind !== SyntaxKind.IdentifierName) return this.errorAtToken(`Unexpected token.`);
        const initializer = this.parseInitializer(Await);
        if (initializer) {
            // CoverInitializedName can be further refined
            return this.finishNode(createCoverInitializedName(this.refineIdentifierReference(name), initializer), pos);
        }
        // ShorthandPropertyDefinition can be further refined
        return this.finishNode(Syntax.ShorthandPropertyDefinition(this.refineIdentifierReference(name)), pos);
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
        return this.finishNode(Syntax.ObjectLiteral(properties), pos);
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
        return this.finishRefine(this.finishNode(Syntax.New(expression, argumentList), pos));
    }

    private parseThisExpression(): ThisExpression {
        const pos = this.pos();
        this.expectToken(SyntaxKind.ThisKeyword);
        return this.finishRefine(this.finishNode(Syntax.This(), pos));
    }

    private parseNullLiteral(): NullLiteral {
        const pos = this.pos();
        this.expectToken(SyntaxKind.NullKeyword);
        return this.finishRefine(this.finishNode(Syntax.Null(), pos));
    }

    private parseBooleanLiteral(kind: SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword): BooleanLiteral {
        const pos = this.pos();
        this.expectToken(kind);
        return this.finishRefine(this.finishNode(Syntax.Boolean(kind === SyntaxKind.TrueKeyword), pos));
    }

    private parseAndRefinePrimaryExpression(Await: boolean): PrimaryExpression {
        return this.refinePrimaryExpression(this.parsePrimaryExpression(Await));
    }

    private parsePrimaryExpression(Await: boolean): PrimaryExpression {
        const token = this._scanner.rescanSlash();
        switch (token) {
            case SyntaxKind.ThisKeyword: return this.parseThisExpression();
            case SyntaxKind.NumberLiteral: return this.parseLiteral(token);
            case SyntaxKind.StringLiteral: return this.parseLiteral(token);
            case SyntaxKind.RegularExpressionLiteral: return this.parseLiteral(SyntaxKind.RegularExpressionLiteral);
            case SyntaxKind.NullKeyword: return this.parseNullLiteral();
            case SyntaxKind.TrueKeyword: 
            case SyntaxKind.FalseKeyword: return this.parseBooleanLiteral(token);
            case SyntaxKind.OpenParenToken: return this.parseCoverParenthesizedExpressionAndArrowParameterList(Await);
            case SyntaxKind.OpenBracketToken: return this.parseArrayLiteral(Await);
            case SyntaxKind.OpenBraceToken: return this.parseObjectLiteral(Await);
            case SyntaxKind.NewKeyword: return this.parseNewExpression(Await);
            case SyntaxKind.Identifier: return this.parseIdentifierReference(Await);
            default: return this.errorAtToken(`Expression expected.`);
        }
    }

    private parsePropertyAccessExpressionRest(expression: LeftHandSideExpressionOrHigher): PropertyAccessExpression {
        const pos = Syntax.pos(expression);
        // PropertyAccessExpression cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Property(this.refineLeftHandSideExpressionOrHigher(expression), this.parseIdentifierName()), pos));
    }

    private parseElementAccessExpressionRest(Await: boolean, expression: LeftHandSideExpressionOrHigher): ElementAccessExpression {
        const pos = Syntax.pos(expression);
        const argumentExpression = this.parseAndRefineExpression(/*In*/ true, Await);
        this.expectToken(SyntaxKind.CloseBracketToken);
        // ElementAccessExpression cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Index(this.refineLeftHandSideExpressionOrHigher(expression), argumentExpression), pos));
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
                expression = this.finishRefine(this.finishNode(Syntax.Call(this.refineLeftHandSideExpressionOrHigher(expression), this.parseArgumentList(Await)), Syntax.pos(expression)));
                continue;
            }
            return expression;
        }
    }

    private parseLeftHandSideExpressionOrHigher(Await: boolean): LeftHandSideExpressionOrHigher {
        return this.parseCallExpressionRest(Await, this.parseMemberExpressionOrHigher(Await));
    }

    private parsePrefixUnaryExpression(Await: boolean, kind: PrefixUnaryOperator): PrefixUnaryExpression {
        if (kind === SyntaxKind.AwaitKeyword && !this._async) return this.errorAtToken(`'await' not supported in a synchronous 'linq' block.`, false);
        const pos = this.pos();
        // PrefixUnaryExpression cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.PrefixUnary(this.readToken(kind), this.parseAndRefineUnaryExpressionOrHigher(Await)), pos));
    }

    private parsePostfixUnaryExpressionRest(expression: LeftHandSideExpressionOrHigher): UnaryExpressionOrHigher {
        const token = this.token();
        if (isPostfixUnaryOperator(token)) {
            // PostixUnaryExpression cannot be further refined
            return this.finishRefine(this.finishNode(Syntax.PostfixUnary(this.refineLeftHandSideExpressionOrHigher(expression), this.readToken(token)), Syntax.pos(expression)));
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
            left = this.finishRefine(this.finishNode(Syntax.Binary(
                this.refineBinaryExpressionOrHigher(left),
                this.readToken(token as BinaryOperator),
                this.parseAndRefineBinaryExpressionOrHigher(newPrecedence >= BinaryPrecedence.ShiftExpression || In, Await, newPrecedence)), Syntax.pos(left)));
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
        return this.finishRefine(this.finishNode(Syntax.Conditional(this.refineBinaryExpressionOrHigher(expression), whenTrue, this.parseAndRefineAssignmentExpressionOrHigher(In, Await)), Syntax.pos(expression)));
    }

    private parseBindingProperty(Await: boolean): BindingProperty | ShorthandBindingProperty {
        const pos = this.pos();
        const name = this.parsePropertyName(Await);
        if (this.optionalToken(SyntaxKind.ColonToken)) {
            const bindingElement = this.parseBindingElement(Await);
            // BindingProperty cannot be further refined
            return this.finishRefine(this.finishNode(Syntax.BindingProperty(name, bindingElement), pos));
        }
        if (name.kind !== SyntaxKind.IdentifierName) {
            return this.errorAtNode(`Identifier or binding pattern expected.`, name, false);
        }
        const initializer = this.parseInitializer(Await);
        // ShorthandBindingProperty cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.ShorthandBindingProperty(this.refineBindingIdentifier(name), initializer), pos));
    }

    private parseBindingRestProperty(Await: boolean): BindingRestProperty {
        const pos = this.pos();
        this.expectToken(SyntaxKind.DotDotDotToken);
        const name = this.parseBindingIdentifier(Await);
        // BindingRestProperty cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.BindingRestProperty(name), pos));
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
        return this.finishRefine(this.finishNode(Syntax.ObjectBindingPattern(properties, rest), pos));
    }

    private parseBindingRestElement(Await: boolean): BindingRestElement {
        const pos = this.pos();
        this.expectToken(SyntaxKind.DotDotDotToken);
        const name = this.parseBindingName(Await);
        // BindingRestElement cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.BindingRestElement(name), pos));
    }

    private parseBindingElement(Await: boolean): BindingElement {
        const pos = this.pos();
        const name = this.parseBindingName(Await);
        const initializer = this.parseInitializer(Await);
        // BindingElement cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.BindingElement(name, initializer), pos));
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
        return this.finishRefine(this.finishNode(Syntax.ArrayBindingPattern(elements, rest), pos));
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
        this.expectToken(SyntaxKind.AsyncKeyword);
        const { parameters, rest } = this.parseParameterList(Await);
        this.expectToken(SyntaxKind.EqualsGreaterThanToken);
        // AsyncArrowFunction cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Arrow(true, parameters, rest, this.parseAssignmentExpressionOrHigher(In, /*Await*/ true)), pos));
    }

    private parseArrowFunctionRest(In: boolean, head: AssignmentExpressionOrHigher) {
        const { parameters, rest } = this.refineArrowFunctionHead(head);
        this.expectToken(SyntaxKind.EqualsGreaterThanToken);
        if (this.token() === SyntaxKind.OpenBraceToken) return this.errorAtToken(`Expression expected.`);
        // ArrowFunction cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Arrow(false, parameters, rest, this.parseAssignmentExpressionOrHigher(In, /*Await*/ false)), Syntax.pos(head)));
    }

    private parseAndRefineAssignmentExpressionOrHigher(In: boolean, Await: boolean) {
        return this.refineAssignmentExpressionOrHigher(this.parseAssignmentExpressionOrHigher(In, Await));
    }

    private parseAssignmentExpressionOrHigher(In: boolean, Await: boolean): AssignmentExpressionOrHigher {
        if (this.token() === SyntaxKind.FromKeyword) return this.parseQueryExpression(Await);
        if (this.token() === SyntaxKind.AsyncKeyword) return this.parseAsyncArrowFunction(In, Await);
        const expression = this.parseBinaryExpressionOrHigher(In, Await, BinaryPrecedence.None);
        if (this.token() === SyntaxKind.EqualsGreaterThanToken) return this.parseArrowFunctionRest(In, expression);
        if (isLeftHandSideExpressionOrHigher(expression) && isAssignmentOperator(this.token())) {
            const pos = Syntax.pos(expression);
            // AssignmentExpression can be further refined
            return this.finishNode(
                Syntax.Assign(
                    expression, // do not refine
                    this.readToken(this.token() as AssignmentOperator),
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
            return this.finishNode(Syntax.CommaList(expressions), Syntax.pos(left));
        }
        return left;
    }

    private refineIdentifierReference(node: IdentifierName) {
        return this.finishRefine(this.finishNode(Syntax.IdentifierReference(node.text), Syntax.pos(node), Syntax.end(node)));
    }

    private refineBindingIdentifier(node: IdentifierName | Expression) {
        if (node.kind === SyntaxKind.IdentifierName || node.kind === SyntaxKind.IdentifierReference) {
            return this.finishRefine(this.finishNode(Syntax.BindingIdentifier(node.text), Syntax.pos(node), Syntax.end(node)));
        }
        return this.errorAtPos(`Unexpected token.`, Syntax.pos(node));
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
                return this.errorAtPos(`Unexpected token.`, Syntax.end(property.name));
            }
        }
        return node;
    }

    private refineArrayLiteral(node: ArrayLiteral): ArrayLiteral {
        return node;
    }

    private refineParenthesizedExpression(node: CoverParenthesizedExpressionAndArrowParameterList) {
        if (node.rest) return this.errorAtPos(`Unexpected token.`, Syntax.pos(node.rest));
        if (!node.expression) return this.errorAtPos(`Expression expected.`, Syntax.end(node));
        return this.finishRefine(this.finishNode(Syntax.Paren(this.refineExpression(node.expression)), Syntax.pos(node), Syntax.end(node)));
    }

    private refineSpreadElement(node: SpreadElement): SpreadElement {
        return this.finishRefine(SyntaxUpdate.SpreadElement(node, this.refineAssignmentExpressionOrHigher(node.expression)));
    }

    private refineArgument(node: Argument): Argument {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.SpreadElement ? this.refineSpreadElement(node) :
            this.refineAssignmentExpressionOrHigher(node);
    }

    private refineCommaListExpression(node: CommaListExpression) {
        return this.finishRefine(SyntaxUpdate.Comma(node, visitList(node.expressions, this.refineAssignmentExpressionOrHigher)));
    }

    private refineAssignmentRestProperty(node: SpreadElement): AssignmentRestProperty {
        return this.finishNode(Syntax.AssignmentRestProperty(node.expression), Syntax.pos(node), Syntax.end(node));
    }

    private refineAssignmentProperty(node: PropertyDefinition): AssignmentProperty {
        const assignmentElement = this.refineAssignmentElement(node.initializer);
        return this.finishNode(Syntax.AssignmentProperty(node.name, assignmentElement), Syntax.pos(node), Syntax.end(node));
    }

    private refineShorthandAssignmentProperty(node: ShorthandPropertyDefinition | CoverInitializedName): ShorthandAssignmentProperty {
        switch (node.kind) {
            case SyntaxKind.ShorthandPropertyDefinition: {
                return this.finishNode(Syntax.ShorthandAssignmentProperty(node.name, undefined), Syntax.pos(node), Syntax.end(node));
            }
            case SyntaxKind.CoverInitializedName: {
                return this.finishNode(Syntax.ShorthandAssignmentProperty(node.name, node.initializer), Syntax.pos(node), Syntax.end(node));
            }
        }
    }

    private refineObjectAssignmentPattern(node: ObjectLiteral): ObjectAssignmentPattern {
        const properties: ObjectAssignmentPatternElement[] = [];
        let rest: AssignmentRestProperty | undefined;
        for (const property of node.properties) {
            switch (property.kind) {
                case SyntaxKind.SpreadElement:
                    if (rest) return this.errorAtPos(`Unexpected token.`, Syntax.pos(property));
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
        return this.finishNode(Syntax.ObjectAssignmentPattern(properties, rest), Syntax.pos(node), Syntax.end(node));
    }

    private refineAssignmentElement(node: AssignmentExpressionOrHigher): AssignmentElement {
        if (isCompoundAssignment(node)) return this.errorAtPos(`Unexpected token.`, Syntax.end(node.left));
        if (isSimpleAssignment(node)) {
            const target = this.refineAssignmentTarget(node.left);
            const initializer = node.right;
            return this.finishNode(Syntax.AssignmentElement(target, initializer), Syntax.pos(node), Syntax.end(node));
        }
        const target = this.refineAssignmentTarget(node);
        return this.finishNode(Syntax.AssignmentElement(target, undefined), Syntax.pos(node), Syntax.end(node));
    }

    private refineAssignmentRestElement(node: SpreadElement): AssignmentRestElement {
        return this.finishNode(Syntax.AssignmentRestElement(this.refineAssignmentTarget(node.expression)), Syntax.pos(node), Syntax.end(node));
    }

    private refineArrayAssignmentPattern(node: ArrayLiteral): ArrayAssignmentPattern {
        const elements: ArrayAssignmentPatternElement[] = [];
        let rest: AssignmentRestElement | undefined;
        for (const element of node.elements) {
            if (rest) return this.errorAtPos(`Unexpected token.`, Syntax.pos(element));
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
        return this.finishNode(Syntax.ArrayAssignmentPattern(elements, rest), Syntax.pos(node), Syntax.end(node));
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
        return this.finishNode(Syntax.Assign(left, node.operator, node.right), Syntax.pos(node), Syntax.end(node));
    }

    private refineAssignmentExpression(node: AssignmentExpression) {
        if (isSimpleAssignment(node)) return this.refineSimpleAssignment(node);
        const left = this.refineLeftHandSideExpressionOrHigher(node.left);
        return node.left !== left
            ? this.finishNode(Syntax.Assign(left, node.operator, node.right), Syntax.pos(node))
            : node;
    }

    // private refineIdentifier(node: AssignmentExpressionOrHigher): Identifier {
    //     if (node.kind !== SyntaxKind.Identifier) return this.errorAtPos(`Unexpected token.`, Syntax.pos(node));
    //     return node;
    // }

    private refineBindingRestProperty(node: SpreadElement | BindingRestProperty): BindingRestProperty {
        if (node.kind === SyntaxKind.BindingRestProperty) {
            return this.finishRefine(node);
        }
        return this.finishRefine(this.finishNode(Syntax.BindingRestProperty(this.refineBindingIdentifier(node.expression)), Syntax.pos(node), Syntax.end(node)));
    }

    private refineComputedPropertyName(node: ComputedPropertyName): ComputedPropertyName {
        return this.finishRefine(SyntaxUpdate.ComputedPropertyName(node, this.refineExpression(node.expression)));
    }

    private refinePropertyName(node: PropertyName): PropertyName {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.ComputedPropertyName ? this.refineComputedPropertyName(node) :
            this.finishRefine(node);
    }

    private refineBindingProperty(node: PropertyDefinition | BindingProperty): BindingProperty {
        if (node.kind === SyntaxKind.BindingProperty) {
            return this.finishRefine(SyntaxUpdate.BindingProperty(node, this.refinePropertyName(node.propertyName), this.refineBindingElement(node.bindingElement)));
        }
        return this.finishRefine(this.finishNode(Syntax.BindingProperty(node.name, this.refineBindingElement(node.initializer)), Syntax.pos(node), Syntax.end(node)));
    }

    private refineShorthandBindingProperty(node: ShorthandPropertyDefinition | CoverInitializedName | ShorthandBindingProperty): ShorthandBindingProperty {
        switch (node.kind) {
            case SyntaxKind.ShorthandBindingProperty: {
                return this.finishRefine(SyntaxUpdate.ShorthandBindingProperty(node, node.name, node.initializer && this.refineAssignmentExpressionOrHigher(node.initializer)));
            }
            case SyntaxKind.ShorthandPropertyDefinition: {
                return this.finishRefine(this.finishNode(Syntax.ShorthandBindingProperty(this.refineBindingIdentifier(node.name), undefined), Syntax.pos(node), Syntax.end(node)));
            }
            case SyntaxKind.CoverInitializedName: {
                return this.finishRefine(this.finishNode(Syntax.ShorthandBindingProperty(this.refineBindingIdentifier(node.name), this.refineAssignmentExpressionOrHigher(node.initializer)), Syntax.pos(node), Syntax.end(node)));
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
            return this.finishRefine(SyntaxUpdate.ObjectBindingPattern(node, visitList(node.properties, this.refineObjectBindingPatternElement), node.rest && this.refineBindingRestProperty(node.rest)));
        }
        const properties: ObjectBindingPatternElement[] = [];
        let rest: BindingRestProperty | undefined;
        for (const property of node.properties) {
            switch (property.kind) {
                case SyntaxKind.SpreadElement:
                    if (rest) return this.errorAtPos(`Unexpected token.`, Syntax.pos(property));
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
        return this.finishNode(Syntax.ObjectBindingPattern(properties, rest), Syntax.pos(node), Syntax.end(node));
    }

    private refineBindingRestElement(node: SpreadElement | BindingRestElement): BindingRestElement {
        if (node.kind === SyntaxKind.BindingRestElement) {
            return this.finishRefine(SyntaxUpdate.BindingRestElement(node, this.refineBindingName(node.name)));
        }
        return this.finishRefine(this.finishNode(Syntax.BindingRestElement(this.refineBindingName(node.expression)), Syntax.pos(node), Syntax.end(node)));
    }

    private refineBindingElement(node: AssignmentExpressionOrHigher | BindingElement): BindingElement {
        if (node.kind === SyntaxKind.BindingElement) {
            return this.finishRefine(SyntaxUpdate.BindingElement(node, this.refineBindingName(node.name), node.initializer && this.refineAssignmentExpressionOrHigher(node.initializer)));
        }
        if (isCompoundAssignment(node)) return this.errorAtPos(`Unexpected token.`, Syntax.end(node.left));
        if (isSimpleAssignment(node)) {
            const name = this.refineBindingName(node.left);
            const initializer = node.right;
            return this.finishRefine(this.finishNode(Syntax.BindingElement(name, initializer), Syntax.pos(node), Syntax.end(node)));
        }
        return this.finishRefine(this.finishNode(Syntax.BindingElement(this.refineBindingName(node)), Syntax.pos(node), Syntax.end(node)));
    }

    private refineArrayBindingPatternElement(node: ArrayBindingPatternElement): ArrayBindingPatternElement {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.Elision ? node :
            this.refineBindingElement(node);
    }

    private refineArrayBindingPattern(node: ArrayLiteral | ArrayBindingPattern): ArrayBindingPattern {
        if (node.kind === SyntaxKind.ArrayBindingPattern) {
            return this.finishRefine(SyntaxUpdate.ArrayBindingPattern(node, visitList(node.elements, this.refineArrayBindingPatternElement), node.rest && this.refineBindingRestElement(node.rest)));
        }

        const elements: ArrayBindingPatternElement[] = [];
        let rest: BindingRestElement | undefined;
        for (const element of node.elements) {
            if (rest) return this.errorAtPos(`Unexpected token.`, Syntax.pos(element));
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
        return this.finishRefine(this.finishNode(Syntax.ArrayBindingPattern(elements, rest), Syntax.pos(node), Syntax.end(node)));
    }

    private refineBindingName(node: AssignmentExpressionOrHigher | BindingName): BindingName {
        switch (node.kind) {
            case SyntaxKind.IdentifierReference: return this.refineBindingIdentifier(node);
            case SyntaxKind.ObjectLiteral: return this.refineObjectBindingPattern(node);
            case SyntaxKind.ArrayLiteral: return this.refineArrayBindingPattern(node);
            case SyntaxKind.ObjectBindingPattern: return this.refineObjectBindingPattern(node);
            case SyntaxKind.ArrayBindingPattern: return this.refineArrayBindingPattern(node);
            default: return this.errorAtPos(`Unexpected token.`, Syntax.pos(node));
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
            rest = head.rest;
        }
        else if (head.kind === SyntaxKind.IdentifierReference) {
            parameters.push(this.finishNode(Syntax.Param(this.refineBindingIdentifier(head)), Syntax.pos(head), Syntax.end(head)));
        }
        else {
            return this.errorAtPos(`Unexpected token.`, Syntax.pos(head));
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

function createCoverParenthesizedExpressionAndArrowParameterList(expression: Expression | undefined, rest: BindingRestElement | undefined): CoverParenthesizedExpressionAndArrowParameterList {
    return { kind: SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList, expression, rest, [Syntax.location]: createTextRange(0, 0) };
}

function createCoverInitializedName(name: IdentifierReference, initializer: AssignmentExpressionOrHigher): CoverInitializedName {
    return { kind: SyntaxKind.CoverInitializedName, name, initializer, [Syntax.location]: createTextRange(0, 0) };
}

interface SimpleAssignmentExpression extends AssignmentExpression {
    operator: SyntaxKind.EqualsToken;
}

interface CompoundAssignmentExpression extends AssignmentExpression {
    operator: Exclude<AssignmentOperator, SyntaxKind.EqualsToken>;
}

function isSimpleAssignment(node: Node): node is SimpleAssignmentExpression {
    return node.kind === SyntaxKind.AssignmentExpression
        && node.operator === SyntaxKind.EqualsToken;
}

function isCompoundAssignment(node: Node): node is CompoundAssignmentExpression {
    return node.kind === SyntaxKind.AssignmentExpression
        && node.operator !== SyntaxKind.EqualsToken;
}

function mayBeIdentifier(token: SyntaxKind, allowReservedWords: boolean, allowAwait: boolean) {
    if (token === SyntaxKind.Identifier) return true;
    if (token === SyntaxKind.AwaitKeyword) return allowAwait || allowReservedWords;
    if (isECMAScriptReservedWord(token)) return allowReservedWords;
    if (isKeyword(token)) return true;
    return false;
}
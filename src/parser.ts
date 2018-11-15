import { SyntaxKind, QueryBodyClause, FromClause, LetClause, WhereClause,
    OrderbyClause, OrderbyComparator, GroupClause, JoinClause, Expression,
    ArrayLiteral, ObjectLiteral, NewExpression, PropertyAccessExpression,
    Elision, SpreadElement, PropertyDefinition,
    ShorthandPropertyDefinition, PropertyName, ComputedPropertyName, 
    QueryExpression, UnaryExpressionOrHigher,
    LeftHandSideExpressionOrHigher, PrimaryExpression, MemberExpressionOrHigher,
    ArrayLiteralElement, ObjectLiteralElement, Argument,
    SelectClause, AssignmentExpressionOrHigher, Node,
    BindingElement, BindingRestElement,
    BindingName, ObjectBindingPattern, ArrayBindingPattern, ArrayBindingPatternElement,
    CoverParenthesizedExpressionAndArrowParameterList, isLeftHandSideExpressionOrHigher,
    CoverInitializedName, BindingIdentifier, IdentifierReference, 
    ObjectBindingPatternElement, BindingRestProperty, BindingProperty, ShorthandBindingProperty,
    ObjectAssignmentPattern, ArrayAssignmentPattern, ObjectAssignmentPatternElement,
    AssignmentRestProperty, ShorthandAssignmentProperty, AssignmentProperty, AssignmentElement,
    ArrayAssignmentPatternElement, AssignmentRestElement, 
    AssignmentExpression, BinaryExpressionOrHigher,
    CommaListExpression, PrefixUnaryExpression, Parameter, SequenceBinding,
    IdentifierName,
    Syntax, createTextRange, ThisExpression, NullLiteral, BooleanLiteral,
    SyntaxUpdate,
    TextLiteral,
    StringLiteral,
    NumberLiteral,
    RegularExpressionLiteral,
    Identifier,
    CoverElementAccessExpressionAndQueryExpressionHead,
    CoverBinaryExpressionAndQueryExpressionHead,
    BinaryExpression,
    isBinaryExpressionOrHigher
} from "./syntax";
import { 
    Token, TokenFlags, 
} from "./tokens";
import { Scanner } from "./scanner";
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
        if (this.token() === Token.OpenBraceToken) return this.errorAtToken("Unexpected token.");
        const expression = this.parseAndRefineExpression(/*In*/ true, /*Await*/ this._async);
        if (this.token() !== Token.EndOfFileToken) return this.errorAtToken("Unexpected token.");
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

    private errorAtToken(message: string, recoverable = this.token() === Token.EndOfFileToken): never {
        return this.errorAtPosEnd(message, this._scanner.tokenPos(), this._scanner.textPos(), recoverable);
    }

    private errorAtNode(message: string, node: Syntax, recoverable?: boolean) {
        return this.errorAtPosEnd(message, Syntax.pos(node), Syntax.end(node), recoverable);
    }

    private readToken<Kind extends Token.SourceToken>(kind: Kind): Kind {
        this.expectToken(kind);
        return kind;
    }

    private expectToken(kind: Token.SourceToken) {
        if (this.token() !== kind) {
            this.errorAtToken(`'${Token.tokenToString(kind)}' expected.`, /*recoverable*/ true);
        }
        this.nextToken();
    }

    private optionalToken(kind: Token.SourceToken) {
        if (this.token() === kind) {
            this.nextToken();
            return true;
        }
        return false;
    }

    private listElement<T>(value: T, endToken: Token): T {
        if (this.token() !== endToken) this.expectToken(Token.CommaToken);
        return value;
    }

    private parseStringLiteral(): StringLiteral {
        return this.parseLiteral(Token.StringLiteral, "string", Syntax.String);
    }

    private parseNumberLiteral(): NumberLiteral {
        return this.parseLiteral(Token.NumberLiteral, "number", Syntax.Number);
    }

    private parseRegularExpressionLiteral(): RegularExpressionLiteral {
        return this.parseLiteral(Token.RegularExpressionLiteral, "regular expression", Syntax.RegularExpression);
    }

    private parseLiteral<T extends TextLiteral>(token: Token.TextLiteral, kind: string, factory: (text: string, flags: TokenFlags) => T) {
        if (this.token() !== token) return this.errorAtToken(`${kind} expected.`);
        const pos = this.pos();
        const text = this._scanner.tokenText();
        const flags = this._scanner.tokenFlags();
        this.nextToken();
        // Text literals cannot be further refined
        return this.finishRefine(this.finishNode(factory(text, flags), pos));
    }

    private parseBindingIdentifier(Await: boolean): BindingIdentifier {
        return this.parseIdentifier(/*allowReservedWords*/ false, !Await);
    }

    private parseIdentifierReference(Await: boolean): IdentifierReference {
        return this.parseIdentifier(/*allowReservedWords*/ false, !Await);
    }

    private parseIdentifierName(): IdentifierName {
        return this.parseIdentifier(/*allowReservedWords*/ true, /*allowAwait*/ true);
    }

    private parseIdentifier(allowReservedWords: boolean, allowAwait: boolean): Identifier {
        if (!mayBeIdentifier(this.token(), allowReservedWords, allowAwait)) {
            return this.errorAtToken("Identifier expected.");
        }
        const pos = this.pos();
        const text = this._scanner.tokenText();
        const originalKeywordKind = this.token() !== Token.Identifier ? this.token() as Token.Keyword : undefined;
        this.nextToken();
        // Identifier cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Identifier(text, originalKeywordKind), pos));
    }

    private parseComputedPropertyName(Await: boolean): ComputedPropertyName {
        const pos = this.pos();
        this.expectToken(Token.OpenBracketToken);
        const expression = this.parseAndRefineExpression(/*In*/ true, Await);
        this.expectToken(Token.CloseBracketToken);
        // ComputedPropertyName cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.ComputedPropertyName(expression), pos));
    }

    private parsePropertyName(Await: boolean): PropertyName {
        const token = this.token();
        switch (token) {
            case Token.StringLiteral: return this.parseStringLiteral();
            case Token.NumberLiteral: return this.parseNumberLiteral();
            case Token.Identifier: return this.parseIdentifierName();
            case Token.OpenBracketToken: return this.parseComputedPropertyName(Await);
            default: return this.errorAtToken(`string, number, identifier or '[' expected.`);
        }
    }

    // SequenceBinding[Await] :
    //     BindingName[?Await] `in` AssignmentExpression[+In, ?Await] 
    //     [+Await] `await` BindingName[+Await] `in` AssignmentExpression[+In, ?Await] 
    private parseSequenceBinding(Await: boolean): SequenceBinding {
        const pos = this.pos();
        const awaitKeyword = Await ? this.optionalToken(Token.AwaitKeyword) : false;
        const name = this.parseBindingName(Await);
        this.expectToken(Token.InKeyword);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        // SequenceBinding cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.SequenceBinding(awaitKeyword, name, expression), pos));
    }

    // FromClause[Await] :
    //     `from` SequenceBinding[?Await]
    private parseFromClause(Await: boolean, outerClause: QueryBodyClause | undefined): FromClause {
        const pos = this.pos();
        this.expectToken(Token.FromKeyword);
        const sequenceBinding = this.parseSequenceBinding(Await);
        // FromClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.FromClause(outerClause, sequenceBinding), pos));
    }

    // LetClause[Await] :
    //     `let` BindingName[?Await] `=` AssignmentExpression[+In, ?Await]
    private parseLetClause(Await: boolean, outerClause: QueryBodyClause): LetClause {
        const pos = this.pos();
        this.expectToken(Token.LetKeyword);
        const name = this.parseBindingName(Await);
        this.expectToken(Token.EqualsToken);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        // LetClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.LetClause(outerClause, name, expression), pos));
    }

    // WhereClause[Await] :
    //     `where` AssignmentExpression[+In, ?Await]
    private parseWhereClause(Await: boolean, outerClause: QueryBodyClause): WhereClause {
        const pos = this.pos();
        this.expectToken(Token.WhereKeyword);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        // WhereClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.WhereClause(outerClause, expression), pos));
    }

    // OrderbyClause[Await] :
    //     `orderby` OrderbyComparatorList[?Await]
    private parseOrderbyClause(Await: boolean, outerClause: QueryBodyClause): OrderbyClause {
        const pos = this.pos();
        this.expectToken(Token.OrderbyKeyword);
        const comparators: OrderbyComparator[] = [];
        do comparators.push(this.parseOrderbyComparator(Await));
        while (this.optionalToken(Token.CommaToken));
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
            this.optionalToken(Token.AscendingKeyword) ? Token.AscendingKeyword :
            this.optionalToken(Token.DescendingKeyword) ? Token.DescendingKeyword :
            undefined;
        const usingExpression = this.optionalToken(Token.UsingKeyword) ? this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await) : undefined;
        // OrderbyComparator cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.OrderbyComparator(expression, direction, usingExpression), pos));
    }

    // GroupClause[Await] :
    //     `group` AssignmentExpression[+In, ?Await] `by` AssignmentExpression[+In, ?Await]
    private parseGroupClause(Await: boolean, outerClause: QueryBodyClause): GroupClause {
        const pos = this.pos();
        this.expectToken(Token.GroupKeyword);
        const elementSelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        this.expectToken(Token.ByKeyword);
        const keySelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const into = this.optionalToken(Token.IntoKeyword) ? this.parseBindingName(Await) : undefined;
        // GroupClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.GroupClause(outerClause, elementSelector, keySelector, into), pos));
    }

    // JoinClause[Await] :
    //     `join` SequenceBinding[?Await] `in` SequenceSource[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await]
    //     `join` SequenceBinding[?Await] `in` SequenceSource[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await] `into` BindingIdentifier[?Await]
    private parseJoinClause(Await: boolean, outerClause: QueryBodyClause): JoinClause {
        const pos = this.pos();
        this.expectToken(Token.JoinKeyword);
        const sequenceBinding = this.parseSequenceBinding(Await);
        this.expectToken(Token.OnKeyword);
        const outerKeySelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        this.expectToken(Token.EqualsKeyword);
        const keySelector = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const into = this.optionalToken(Token.IntoKeyword) ? this.parseBindingName(Await) : undefined;
        // JoinClause cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.JoinClause(outerClause, sequenceBinding, outerKeySelector, keySelector, into), pos));
    }

    // SelectClause[Await] :
    //     `select` AssignmentExpression[+In, ?Await]
    private parseSelectClause(Await: boolean, outerClause: QueryBodyClause): SelectClause {
        const pos = this.pos();
        this.expectToken(Token.SelectKeyword);
        const expression = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        const into = this.optionalToken(Token.IntoKeyword) ? this.parseBindingName(Await) : undefined;
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
            case Token.FromKeyword: return this.parseFromClause(Await, outerClause);
            case Token.LetKeyword: return this.parseLetClause(Await, outerClause);
            case Token.WhereKeyword: return this.parseWhereClause(Await, outerClause);
            case Token.OrderbyKeyword: return this.parseOrderbyClause(Await, outerClause);
            case Token.GroupKeyword: return this.parseGroupClause(Await, outerClause);
            case Token.JoinKeyword: return this.parseJoinClause(Await, outerClause);
            case Token.SelectKeyword: return this.parseSelectClause(Await, outerClause);
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
    private parseQueryExpressionRest(Await: boolean, head: CoverBinaryExpressionAndQueryExpressionHead): QueryExpression {
        const pos = Syntax.pos(head);
        if (head.left.expression.kind !== SyntaxKind.Identifier || head.left.expression.originalKeyword !== Token.FromKeyword) return assertFail();

        // refine and parse the rest of the `FromClause`.
        const awaitKeyword = head.left.await;
        const name = this.refineBindingName(head.left.argument);
        const expression = this.refineAssignmentExpressionOrHigher(head.right);
        const sequenceBinding = this.finishRefine(this.finishNode(Syntax.SequenceBinding(awaitKeyword, name, expression), Syntax.end(head.left.expression)));
        const fromClause = this.finishRefine(this.finishNode(Syntax.FromClause(undefined, sequenceBinding), pos));
        
        let outerClause: QueryBodyClause = fromClause;
        while (isStartOfClause(this.token())) {
            outerClause = this.parseQueryBodyClause(Await, outerClause);
            if ((outerClause.kind === SyntaxKind.SelectClause || outerClause.kind === SyntaxKind.GroupClause) && !outerClause.into) break;
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
        this.expectToken(Token.OpenParenToken);
        const expression =
            this.token() !== Token.CloseParenToken &&
            this.token() !== Token.DotDotDotToken ? this.parseExpression(/*In*/ true, Await) : undefined;
        const rest = (!expression || this.optionalToken(Token.CommaToken)) && this.token() === Token.DotDotDotToken 
            ? this.parseBindingRestElement(Await) 
            : undefined;
        this.expectToken(Token.CloseParenToken);
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
        this.expectToken(Token.DotDotDotToken);
        // SpreadElement can be further refined
        return this.finishNode(Syntax.SpreadElement(this.parseLeftHandSideExpressionOrHigher(Await)), pos);
    }

    private parseArrayLiteralElement(Await: boolean): ArrayLiteralElement {
        switch (this.token()) {
            case Token.CommaToken: return this.parseElision();
            case Token.DotDotDotToken: return this.parseSpreadElement(Await);
            default:
                // ArrayLiteralElement can be further refined.
                return this.parseAssignmentExpressionOrHigher(/*In*/ true, Await);
        }
    }

    private parseArrayLiteral(Await: boolean): ArrayLiteral {
        const pos = this.pos();
        this.expectToken(Token.OpenBracketToken);
        const elements: ArrayLiteralElement[] = [];
        while (this.token() !== Token.CloseBracketToken) {
            elements.push(this.listElement(this.parseArrayLiteralElement(Await), Token.CloseBracketToken));
        }
        this.expectToken(Token.CloseBracketToken);
        // ArrayLiteral can be further refined
        return this.finishNode(Syntax.ArrayLiteral(elements), pos);
    }

    private parsePropertyDefinition(Await: boolean): PropertyDefinition | ShorthandPropertyDefinition | CoverInitializedName {
        const pos = this.pos();
        const name = this.parsePropertyName(Await);
        if (this.optionalToken(Token.ColonToken)) {
            // PropertyDefinition can be further refined
            return this.finishNode(Syntax.PropertyDefinition(name, this.parseAssignmentExpressionOrHigher(/*In*/ true, Await)), pos);
        }
        if (name.kind !== SyntaxKind.Identifier) return this.errorAtToken(`Unexpected token.`);
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
            case Token.DotDotDotToken: return this.parseSpreadElement(Await);
            case Token.Identifier:
            case Token.StringLiteral:
            case Token.NumberLiteral:
            case Token.OpenBracketToken: return this.parsePropertyDefinition(Await);
            default: return this.errorAtToken(`string, number, identifier, '[', or '...' expected.`);
        }
    }

    private parseObjectLiteral(Await: boolean): ObjectLiteral {
        const pos = this.pos();
        this.expectToken(Token.OpenBraceToken);
        const properties: ObjectLiteralElement[] = [];
        while (this.token() !== Token.CloseBraceToken) {
            properties.push(this.listElement(this.parseObjectLiteralElement(Await), Token.CloseBraceToken));
        }
        this.expectToken(Token.CloseBraceToken);
        // ObjectLiteral can be further refined
        return this.finishNode(Syntax.ObjectLiteral(properties), pos);
    }

    private parseArgument(Await: boolean) {
        switch (this.token()) {
            case Token.DotDotDotToken: return this.parseAndRefineSpreadElement(Await);
            default: return this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        }
    }

    private parseArgumentList(Await: boolean): ReadonlyArray<Argument> {
        const argumentList: Argument[] = [];
        this.expectToken(Token.OpenParenToken);
        while (this.token() !== Token.CloseParenToken) {
            argumentList.push(this.listElement(this.parseArgument(Await), Token.CloseParenToken));
        }
        this.expectToken(Token.CloseParenToken);
        return argumentList;
    }

    private parseNewExpression(Await: boolean): NewExpression {
        const pos = this.pos();
        this.expectToken(Token.NewKeyword);
        const expression = this.parseMemberExpressionRest(Await, this.parseAndRefinePrimaryExpression(Await));
        const argumentList = this.token() === Token.OpenParenToken ? this.parseArgumentList(Await) : undefined;
        // NewExpression cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.New(expression, argumentList), pos));
    }

    private parseThisExpression(): ThisExpression {
        const pos = this.pos();
        this.expectToken(Token.ThisKeyword);
        return this.finishRefine(this.finishNode(Syntax.This(), pos));
    }

    private parseNullLiteral(): NullLiteral {
        const pos = this.pos();
        this.expectToken(Token.NullKeyword);
        return this.finishRefine(this.finishNode(Syntax.Null(), pos));
    }

    private parseBooleanLiteral(kind: Token.TrueKeyword | Token.FalseKeyword): BooleanLiteral {
        const pos = this.pos();
        this.expectToken(kind);
        return this.finishRefine(this.finishNode(Syntax.Boolean(kind === Token.TrueKeyword), pos));
    }

    private parseAndRefinePrimaryExpression(Await: boolean): PrimaryExpression {
        return this.refinePrimaryExpression(this.parsePrimaryExpression(Await));
    }

    private parsePrimaryExpression(Await: boolean): PrimaryExpression {
        const token = this._scanner.rescanSlash();
        switch (token) {
            case Token.ThisKeyword: return this.parseThisExpression();
            case Token.StringLiteral: return this.parseStringLiteral();
            case Token.NumberLiteral: return this.parseNumberLiteral();
            case Token.RegularExpressionLiteral: return this.parseRegularExpressionLiteral();
            case Token.NullKeyword: return this.parseNullLiteral();
            case Token.TrueKeyword: 
            case Token.FalseKeyword: return this.parseBooleanLiteral(token);
            case Token.OpenParenToken: return this.parseCoverParenthesizedExpressionAndArrowParameterList(Await);
            case Token.OpenBracketToken: return this.parseArrayLiteral(Await);
            case Token.OpenBraceToken: return this.parseObjectLiteral(Await);
            case Token.NewKeyword: return this.parseNewExpression(Await);
            case Token.FromKeyword:
            case Token.Identifier: return this.parseIdentifierReference(Await);
            default: return this.errorAtToken(`Expression expected.`);
        }
    }

    private parsePropertyAccessExpressionRest(expression: LeftHandSideExpressionOrHigher): PropertyAccessExpression {
        const pos = Syntax.pos(expression);
        this.expectToken(Token.DotToken);
        // PropertyAccessExpression cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Property(this.refineLeftHandSideExpressionOrHigher(expression), this.parseIdentifierName()), pos));
    }

    private parseCoverElementAccessExpressionAndQueryExpressionHeadArgument(Await: boolean) {
        switch (this.token()) {
            case Token.OpenBraceToken: return this.parseObjectBindingPattern(Await);
            case Token.OpenBracketToken: return this.parseArrayLiteral(Await);
            case Token.AwaitKeyword:
            case Token.YieldKeyword:
            case Token.FromKeyword:
            case Token.Identifier: return this.parseBindingIdentifier(Await);
            default: return this.errorAtToken(`Unexpected token.`);
        }
    }

    private parseCoverElementAccessExpressionAndQueryExpressionHead(Await: boolean, expression: LeftHandSideExpressionOrHigher): CoverElementAccessExpressionAndQueryExpressionHead {
        const pos = Syntax.pos(expression);
        const awaitKeyword = Await && this.optionalToken(Token.AwaitKeyword);
        let argument: ArrayLiteral | BindingName;
        if (awaitKeyword) {
            // this _must_ be a from-clause head
            argument = this.parseBindingName(Await);
        }
        else {
            argument = this.parseCoverElementAccessExpressionAndQueryExpressionHeadArgument(Await);
        }
        // CoverElementAccessExpressionAndQueryExpressionHead can be further refined.
        return this.finishNode(createCoverElementAccessExpressionAndQueryExpressionHead(expression, awaitKeyword, argument), pos);
    }

    // private parseElementAccessExpressionRest(Await: boolean, expression: LeftHandSideExpressionOrHigher): ElementAccessExpression {
    //     if (expression.kind === SyntaxKind.Identifier && expression.originalKeywordKind === Token.FromKeyword) {
                
    //     }

    //     const pos = Syntax.pos(expression);
    //     const argumentExpression = this.parseAndRefineExpression(/*In*/ true, Await);
    //     this.expectToken(Token.CloseBracketToken);
    //     // ElementAccessExpression cannot be further refined
    //     return this.finishRefine(this.finishNode(Syntax.Index(this.refineLeftHandSideExpressionOrHigher(expression), argumentExpression), pos));
    // }

    private parseMemberExpressionRest(Await: boolean, expression: LeftHandSideExpressionOrHigher): MemberExpressionOrHigher {
        while (true) {
            switch (this.token()) {
                case Token.DotToken:
                    expression = this.parsePropertyAccessExpressionRest(expression);
                    continue;
                case Token.AwaitKeyword:
                    if (!Await) return expression as MemberExpressionOrHigher;
                    // falls through
                case Token.OpenBracketToken:
                case Token.OpenBraceToken:
                case Token.Identifier:
                    expression = this.parseCoverElementAccessExpressionAndQueryExpressionHead(Await, expression);
                    continue;
                default:
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
            if (this.token() === Token.OpenParenToken) {
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

    private parsePrefixUnaryExpression(Await: boolean, kind: Token.PrefixUnaryOperator): PrefixUnaryExpression {
        if (kind === Token.AwaitKeyword && !this._async) return this.errorAtToken(`'await' not supported in a synchronous 'linq' block.`, false);
        const pos = this.pos();
        // PrefixUnaryExpression cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.PrefixUnary(this.readToken(kind), this.parseAndRefineUnaryExpressionOrHigher(Await)), pos));
    }

    private parsePostfixUnaryExpressionRest(expression: LeftHandSideExpressionOrHigher): UnaryExpressionOrHigher {
        const token = this.token();
        if (Token.isPostfixUnaryOperator(token)) {
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
            case Token.PlusToken:
            case Token.MinusToken:
            case Token.TildeToken:
            case Token.ExclamationToken:
            case Token.TypeofKeyword:
            case Token.DeleteKeyword:
            case Token.VoidKeyword:
            case Token.AwaitKeyword:
                return this.parsePrefixUnaryExpression(Await, token);
            default:
                return this.parsePostfixUnaryExpressionRest(this.parseLeftHandSideExpressionOrHigher(Await));
        }
    }

    private parseBinaryExpressionRest(In: boolean, Await: boolean, precedence: BinaryPrecedence, left: BinaryExpressionOrHigher): BinaryExpressionOrHigher {
        while (true) {
            const token = this.token();
            const newPrecedence = getBinaryOperatorPrecedence(token);
            if (!(token === Token.AsteriskAsteriskToken ? newPrecedence >= precedence : newPrecedence > precedence)) break;
            if (token === Token.InKeyword) {
                if (!In) break;
                if (left.kind === SyntaxKind.CoverElementAccessExpressionAndQueryExpressionHead &&
                    left.expression.kind === SyntaxKind.Identifier &&
                    left.expression.originalKeyword === Token.FromKeyword) {
                    this.expectToken(Token.InKeyword);
                    left = this.finishNode(createCoverBinaryExpressionAndQueryExpressionHead(
                        left,
                        this.parseAndRefineAssignmentExpressionOrHigher(In, Await)), Syntax.pos(left));
                    continue;
                }
            }
            // BinaryExpression cannot be further refined
            left = this.finishRefine(this.finishNode(Syntax.Binary(
                this.refineBinaryExpressionOrHigher(left),
                this.readToken(token as Token.BinaryOperator),
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
        if (!this.optionalToken(Token.QuestionToken)) return expression;
        this.expectToken(Token.QuestionToken);
        const whenTrue = this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await);
        this.expectToken(Token.ColonToken);
        // ConditionalExpression cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Conditional(this.refineBinaryExpressionOrHigher(expression), whenTrue, this.parseAndRefineAssignmentExpressionOrHigher(In, Await)), Syntax.pos(expression)));
    }

    private parseBindingProperty(Await: boolean): BindingProperty | ShorthandBindingProperty {
        const pos = this.pos();
        const name = this.parsePropertyName(Await);
        if (this.optionalToken(Token.ColonToken)) {
            const bindingElement = this.parseBindingElement(Await);
            // BindingProperty cannot be further refined
            return this.finishRefine(this.finishNode(Syntax.BindingProperty(name, bindingElement), pos));
        }
        if (name.kind !== SyntaxKind.Identifier) {
            return this.errorAtNode(`Identifier or binding pattern expected.`, name, false);
        }
        const initializer = this.parseInitializer(Await);
        // ShorthandBindingProperty cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.ShorthandBindingProperty(this.refineBindingIdentifier(name), initializer), pos));
    }

    private parseBindingRestProperty(Await: boolean): BindingRestProperty {
        const pos = this.pos();
        this.expectToken(Token.DotDotDotToken);
        const name = this.parseBindingIdentifier(Await);
        // BindingRestProperty cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.BindingRestProperty(name), pos));
    }

    private parseObjectBindingPattern(Await: boolean): ObjectBindingPattern {
        const pos = this.pos();
        this.expectToken(Token.OpenBraceToken);
        const properties: ObjectBindingPatternElement[] = [];
        let rest: BindingRestProperty | undefined;
        while (this.token() !== Token.CloseBraceToken) {
            if (rest) return this.errorAtToken(`Unexpected token.`);
            switch (this.token()) {
                case Token.DotDotDotToken:
                    rest = this.parseBindingRestProperty(Await);
                    continue;
                default:
                    properties.push(this.listElement(this.parseBindingProperty(Await), Token.CloseBraceToken));
                    continue;
            }
        }
        this.expectToken(Token.CloseBraceToken);
        // ObjectBindingPattern cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.ObjectBindingPattern(properties, rest), pos));
    }

    private parseBindingRestElement(Await: boolean): BindingRestElement {
        const pos = this.pos();
        this.expectToken(Token.DotDotDotToken);
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
        this.expectToken(Token.OpenBracketToken);
        const elements: ArrayBindingPatternElement[] = [];
        let rest: BindingRestElement | undefined;
        while (this.token() !== Token.CloseBracketToken) {
            if (rest) return this.errorAtToken(`Unexpected token.`);
            switch (this.token()) {
                case Token.DotDotDotToken:
                    rest = this.parseBindingRestElement(Await);
                    continue;
                case Token.CommaToken:
                    elements.push(this.listElement(this.parseElision(), Token.CloseBracketToken));
                    continue;
                default:
                    elements.push(this.listElement(this.parseBindingElement(Await), Token.CloseBracketToken));
                    continue;
            }
        }
        this.expectToken(Token.CloseBracketToken);
        // ArrayBindingPattern cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.ArrayBindingPattern(elements, rest), pos));
    }

    private parseBindingName(Await: boolean): BindingName {
        switch (this.token()) {
            case Token.OpenBraceToken: return this.parseObjectBindingPattern(Await);
            case Token.OpenBracketToken: return this.parseArrayBindingPattern(Await);
            default: return this.parseBindingIdentifier(Await);
        }
    }

    private parseInitializer(Await: boolean) {
        // Initializer cannot be further refined
        return this.optionalToken(Token.EqualsToken) ? this.parseAndRefineAssignmentExpressionOrHigher(/*In*/ true, Await) : undefined;;
    }

    private parseParameterList(Await: boolean): { parameters: ReadonlyArray<BindingElement>, rest: BindingRestElement | undefined } {
        this.expectToken(Token.OpenParenToken);
        const parameters: BindingElement[] = [];
        let rest: BindingRestElement | undefined;
        while (this.token() !== Token.CloseParenToken) {
            if (rest) return this.errorAtToken(`Unexpected token.`);
            switch (this.token()) {
                case Token.DotDotDotToken:
                    rest = this.parseBindingRestElement(Await);
                    continue;
                default:
                    parameters.push(this.listElement(this.parseBindingElement(Await), Token.CloseParenToken));
                    continue;
            }
        }
        this.expectToken(Token.CloseParenToken);
        return { parameters, rest };
    }

    private parseAsyncArrowFunction(In: boolean, Await: boolean) {
        const pos = this.pos();
        this.expectToken(Token.AsyncKeyword);
        const { parameters, rest } = this.parseParameterList(Await);
        this.expectToken(Token.EqualsGreaterThanToken);
        // AsyncArrowFunction cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Arrow(true, parameters, rest, this.parseAndRefineAssignmentExpressionOrHigher(In, /*Await*/ true)), pos));
    }

    private parseArrowFunctionRest(In: boolean, head: AssignmentExpressionOrHigher) {
        const { parameters, rest } = this.refineArrowFunctionHead(head);
        this.expectToken(Token.EqualsGreaterThanToken);
        if (this.token() === Token.OpenBraceToken) return this.errorAtToken(`Expression expected.`);
        // ArrowFunction cannot be further refined
        return this.finishRefine(this.finishNode(Syntax.Arrow(false, parameters, rest, this.parseAndRefineAssignmentExpressionOrHigher(In, /*Await*/ false)), Syntax.pos(head)));
    }

    private parseAndRefineAssignmentExpressionOrHigher(In: boolean, Await: boolean) {
        return this.refineAssignmentExpressionOrHigher(this.parseAssignmentExpressionOrHigher(In, Await));
    }

    private parseAssignmentExpressionOrHigher(In: boolean, Await: boolean): AssignmentExpressionOrHigher {
        if (this.token() === Token.AsyncKeyword) return this.parseAsyncArrowFunction(In, Await);
        const expression = this.parseBinaryExpressionOrHigher(In, Await, BinaryPrecedence.None);
        if (this.token() === Token.EqualsGreaterThanToken) return this.parseArrowFunctionRest(In, expression);
        if (expression.kind === SyntaxKind.CoverBinaryExpressionAndQueryExpressionHead &&
            expression.left.expression.kind === SyntaxKind.Identifier &&
            expression.left.expression.originalKeyword === Token.FromKeyword) {
            if (this.token() === Token.FromKeyword ||
                this.token() === Token.LetKeyword ||
                this.token() === Token.WhereKeyword ||
                this.token() === Token.OrderbyKeyword ||
                this.token() === Token.GroupKeyword ||
                this.token() === Token.JoinKeyword ||
                this.token() === Token.SelectKeyword) {
                return this.parseQueryExpressionRest(Await, expression);
            }
        }
        if (isLeftHandSideExpressionOrHigher(expression) && Token.isAssignmentOperator(this.token())) {
            const pos = Syntax.pos(expression);
            // AssignmentExpression can be further refined
            return this.finishNode(
                Syntax.Assign(
                    expression, // do not refine
                    this.readToken(this.token() as Token.AssignmentOperator),
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
        if (this.optionalToken(Token.CommaToken)) {
            const expressions = [left];
            do {
                expressions.push(this.parseAssignmentExpressionOrHigher(In, Await));
            }
            while (this.optionalToken(Token.CommaToken));
            // CommaListExpression can be further refined
            return this.finishNode(Syntax.CommaList(expressions), Syntax.pos(left));
        }
        return left;
    }

    private refineIdentifierReference(node: IdentifierName) {
        return this.finishRefine(this.finishNode(Syntax.Identifier(node.text), Syntax.pos(node), Syntax.end(node)));
    }

    private refineBindingIdentifier(node: IdentifierName | Expression) {
        if (node.kind === SyntaxKind.Identifier) {
            return this.finishRefine(node);
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

    private refineMemberExpressionOrHigher(node: MemberExpressionOrHigher): MemberExpressionOrHigher {
        return this.isRefined(node) ? node :
            node.kind === SyntaxKind.PropertyAccessExpression ? assertFail("PropertyAccessExpression should already be refined.") :
            node.kind === SyntaxKind.ElementAccessExpression ? assertFail("ElementAccessExpression should already be refined.") :
            node.kind === SyntaxKind.NewExpression ? assertFail("NewExpression should already be refined.") :
            node.kind === SyntaxKind.CoverElementAccessExpressionAndQueryExpressionHead ? this.refineElementAccessExpression(node) :
            this.refinePrimaryExpression(node);
    }

    private refineLeftHandSideExpressionOrHigher(node: LeftHandSideExpressionOrHigher): LeftHandSideExpressionOrHigher {
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
            node.kind === SyntaxKind.CoverBinaryExpressionAndQueryExpressionHead ? this.refineBinaryExpression(node) :
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

    private refineElementAccessExpression(node: CoverElementAccessExpressionAndQueryExpressionHead) {
        const expression = this.refineLeftHandSideExpressionOrHigher(node.expression);
        if (node.await) return this.errorAtPos(`Unexpected token.`, Syntax.end(expression));
        if (node.argument.kind !== SyntaxKind.ArrayLiteral) return this.errorAtPos(`Unexpected token.`, Syntax.pos(node.argument));
        if (node.argument.elements.length === 0) return this.errorAtPos(`Expression expected.`, Syntax.end(node.argument));
        const element = node.argument.elements[0];
        if (element.kind === SyntaxKind.Elision || element.kind === SyntaxKind.SpreadElement) return this.errorAtPos(`Expression expected.`, Syntax.pos(element));
        const argumentExpression = this.refineAssignmentExpressionOrHigher(element);
        if (node.argument.elements.length > 1) return this.errorAtPos(`Unexpected token.`, Syntax.end(element));
        return this.finishRefine(this.finishNode(Syntax.Index(expression, argumentExpression), Syntax.pos(node), Syntax.end(node)));
    }

    private refineBinaryExpression(node: CoverBinaryExpressionAndQueryExpressionHead): BinaryExpression {
        const left = this.refineBinaryExpressionOrHigher(node.left);
        if (!isBinaryExpressionOrHigher(node.right)) {
            // TODO: rebalance the AST
            return this.errorAtNode(`ShiftExpression expected`, node.right);
        }
        const right = this.refineBinaryExpressionOrHigher(node.right);
        if (right.kind === SyntaxKind.BinaryExpression && getBinaryOperatorPrecedence(right.operator) < BinaryPrecedence.RelationalExpression) {
            // TODO: rebalance the AST
            return this.errorAtNode(`ShiftExpression expected`, node.right);
        }
        return this.finishRefine(this.finishNode(Syntax.Binary(left, Token.InKeyword, right), Syntax.pos(node), Syntax.end(node)));
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
    //     if (node.kind !== TokenKind.Identifier) return this.errorAtPos(`Unexpected token.`, Syntax.pos(node));
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
            case SyntaxKind.Identifier: return this.refineBindingIdentifier(node);
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
        else if (head.kind === SyntaxKind.Identifier) {
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

function isStartOfClause(token: Token) {
    switch (token) {
        case Token.FromKeyword:
        case Token.LetKeyword:
        case Token.WhereKeyword:
        case Token.OrderbyKeyword:
        case Token.GroupKeyword:
        case Token.JoinKeyword:
        case Token.SelectKeyword:
            return true;
        default:
            return false;
    }
}

function createCoverParenthesizedExpressionAndArrowParameterList(expression: Expression | undefined, rest: BindingRestElement | undefined): CoverParenthesizedExpressionAndArrowParameterList {
    return { kind: SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList, expression, rest, [Syntax.location]: createTextRange(0, 0) };
}

function createCoverElementAccessExpressionAndQueryExpressionHead(expression: LeftHandSideExpressionOrHigher, await: boolean, argument: ArrayLiteral | BindingName): CoverElementAccessExpressionAndQueryExpressionHead {
    return { kind: SyntaxKind.CoverElementAccessExpressionAndQueryExpressionHead, expression, await, argument, [Syntax.location]: createTextRange(0, 0) };
}

function createCoverBinaryExpressionAndQueryExpressionHead(left: CoverElementAccessExpressionAndQueryExpressionHead, right: AssignmentExpressionOrHigher): CoverBinaryExpressionAndQueryExpressionHead {
    return { kind: SyntaxKind.CoverBinaryExpressionAndQueryExpressionHead, left, right, [Syntax.location]: createTextRange(0, 0) };
}

function createCoverInitializedName(name: IdentifierReference, initializer: AssignmentExpressionOrHigher): CoverInitializedName {
    return { kind: SyntaxKind.CoverInitializedName, name, initializer, [Syntax.location]: createTextRange(0, 0) };
}

interface SimpleAssignmentExpression extends AssignmentExpression {
    operator: Token.EqualsToken;
}

interface CompoundAssignmentExpression extends AssignmentExpression {
    operator: Exclude<Token.AssignmentOperator, Token.EqualsToken>;
}

function isSimpleAssignment(node: Node): node is SimpleAssignmentExpression {
    return node.kind === SyntaxKind.AssignmentExpression
        && node.operator === Token.EqualsToken;
}

function isCompoundAssignment(node: Node): node is CompoundAssignmentExpression {
    return node.kind === SyntaxKind.AssignmentExpression
        && node.operator !== Token.EqualsToken;
}

function mayBeIdentifier(token: Token, allowReservedWords: boolean, allowAwait: boolean) {
    if (token === Token.Identifier) return true;
    if (token === Token.AwaitKeyword) return allowAwait || allowReservedWords;
    if (Token.isECMAScriptReservedWord(token)) return allowReservedWords;
    if (Token.isKeyword(token)) return true;
    return false;
}
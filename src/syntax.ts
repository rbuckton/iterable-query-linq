import { BinaryPrecedence, getBinaryOperatorPrecedence, visitList } from "./utils";
import { TokenFlags, Token } from "./tokens";

export enum SyntaxKind {
    Unknown,

    // Literals
    StringLiteral,
    NumberLiteral,
    RegularExpressionLiteral,
    NullLiteral,
    BooleanLiteral,

    // Names
    Identifier,
    ComputedPropertyName,

    // Query body clauses
    QueryBody,
    FromClause,
    JoinClause,
    LetClause,
    WhereClause,
    OrderbyClause,
    OrderbyComparator,
    GroupClause,
    SelectClause,
    QueryContinuation,

    // Expressions
    ThisExpression,
    ArrowFunction,
    PrefixUnaryExpression,
    PostfixUnaryExpression,
    ParenthesizedExpression,
    CallExpression,
    NewExpression,
    PropertyAccessExpression,
    ElementAccessExpression,
    ObjectLiteral,
    ArrayLiteral,
    Elision,
    SpreadElement,
    BinaryExpression,
    AssignmentExpression,
    ConditionalExpression,
    QueryExpression,
    CommaListExpression,

    // Declarations
    PropertyDefinition,
    ShorthandPropertyDefinition,

    // Patterns
    ObjectBindingPattern,
    BindingRestProperty,
    BindingProperty,
    ShorthandBindingProperty,
    ObjectAssignmentPattern,
    AssignmentRestProperty,
    AssignmentProperty,
    ShorthandAssignmentProperty,
    ArrayBindingPattern,
    BindingElement,
    BindingRestElement,
    ArrayAssignmentPattern,
    AssignmentElement,
    AssignmentRestElement,

    // Statements
    Block,
    LetStatement,
    ExpressionStatement,
    ReturnStatement,

    // Cover grammars
    CoverParenthesizedExpressionAndArrowParameterList,
    CoverInitializedName,
    CoverElementAccessExpressionAndQueryExpressionHead
}

export interface TextRange {
    readonly pos: number;
    readonly end: number;
}

export interface Syntax {
    [Syntax.location]: TextRange;
}

const noTextRange: TextRange = { pos: 0, end: 0 };

export function createTextRange(pos: number, end: number): TextRange {
    return pos === 0 && end === 0 ? noTextRange : { pos, end };
}

export namespace Syntax {
    export const location = Symbol("Syntax.location");
    export function This(): ThisExpression {
        return { kind: SyntaxKind.ThisExpression, [Syntax.location]: noTextRange };
    }
    export function Null(): NullLiteral {
        return { kind: SyntaxKind.NullLiteral, [Syntax.location]: noTextRange };
    }
    export function Boolean(value: boolean): BooleanLiteral {
        return { kind: SyntaxKind.BooleanLiteral, value, [Syntax.location]: noTextRange };
    }
    export function String(text: string): StringLiteral {
        return { kind: SyntaxKind.StringLiteral, text, flags: TokenFlags.None, [Syntax.location]: noTextRange }
    }
    export function Number(text: string, flags = TokenFlags.None): NumberLiteral {
        return { kind: SyntaxKind.NumberLiteral, text, flags, [Syntax.location]: noTextRange }
    }
    export function RegularExpression(text: string): RegularExpressionLiteral {
        return { kind: SyntaxKind.RegularExpressionLiteral, text, flags: TokenFlags.None, [Syntax.location]: noTextRange }
    }
    export function Identifier(text: string, originalKeyword?: Token.Keyword): Identifier {
        return { kind: SyntaxKind.Identifier, text, originalKeyword, [Syntax.location]: noTextRange };
    }
    export function ComputedPropertyName(expression: Expression): ComputedPropertyName {
        return { kind: SyntaxKind.ComputedPropertyName, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function Paren(expression: Expression): ParenthesizedExpression {
        return { kind: SyntaxKind.ParenthesizedExpression, expression, [Syntax.location]: noTextRange };
    }
    export function PropertyDefinition(name: PropertyName | string, initializer: Expression): PropertyDefinition {
        name = possiblyIdentifierName(name);
        return { kind: SyntaxKind.PropertyDefinition, name, initializer: toAssignmentExpressionOrHigher(initializer), [Syntax.location]: noTextRange };
    }
    export function ShorthandPropertyDefinition(name: IdentifierReference | string): ShorthandPropertyDefinition {
        name = possiblyIdentifierReference(name);
        return { kind: SyntaxKind.ShorthandPropertyDefinition, name, [Syntax.location]: noTextRange };
    }
    export function ObjectLiteral(properties: ReadonlyArray<ObjectLiteralElement>): ObjectLiteral {
        return { kind: SyntaxKind.ObjectLiteral, properties, [Syntax.location]: noTextRange };
    }
    export function AssignmentRestProperty(expression: Expression): AssignmentRestProperty {
        return { kind: SyntaxKind.AssignmentRestProperty, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function AssignmentProperty(propertyName: PropertyName | string, assignmentElement: AssignmentElement): AssignmentProperty {
        propertyName = possiblyIdentifierName(propertyName);
        return { kind: SyntaxKind.AssignmentProperty, propertyName, assignmentElement, [Syntax.location]: noTextRange };
    }
    export function ShorthandAssignmentProperty(name: IdentifierReference | string, initializer: Expression | undefined): ShorthandAssignmentProperty {
        name = possiblyIdentifierReference(name);
        return { kind: SyntaxKind.ShorthandAssignmentProperty, name, initializer: initializer && toAssignmentExpressionOrHigher(initializer), [Syntax.location]: noTextRange };
    }
    export function ObjectAssignmentPattern(properties: ReadonlyArray<ObjectAssignmentPatternElement>, rest: AssignmentRestProperty | undefined): ObjectAssignmentPattern {
        return { kind: SyntaxKind.ObjectAssignmentPattern, properties, rest, [Syntax.location]: noTextRange };
    }
    export function BindingRestProperty(name: BindingIdentifier | string): BindingRestProperty {
        name = possiblyBindingIdentifier(name);
        return { kind: SyntaxKind.BindingRestProperty, name, [Syntax.location]: noTextRange };
    }
    export function BindingProperty(propertyName: PropertyName | string, bindingElement: BindingElement): BindingProperty {
        propertyName = possiblyIdentifierName(propertyName);
        return { kind: SyntaxKind.BindingProperty, propertyName, bindingElement, [Syntax.location]: noTextRange };
    }
    export function ShorthandBindingProperty(name: BindingIdentifier | string, initializer: Expression | undefined): ShorthandBindingProperty {
        name = possiblyBindingIdentifier(name);
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.ShorthandBindingProperty, name, initializer, [Syntax.location]: noTextRange };
    }
    export function ObjectBindingPattern(properties: ReadonlyArray<ObjectBindingPatternElement>, rest: BindingRestProperty | undefined): ObjectBindingPattern {
        return { kind: SyntaxKind.ObjectBindingPattern, properties, rest, [Syntax.location]: noTextRange };
    }
    export function Elision(): Elision {
        return { kind: SyntaxKind.Elision, [Syntax.location]: noTextRange };
    }
    export function SpreadElement(expression: Expression): SpreadElement {
        return { kind: SyntaxKind.SpreadElement, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function ArrayLiteral(elements: ReadonlyArray<ArrayLiteralElement | Expression>): ArrayLiteral {
        return { kind: SyntaxKind.ArrayLiteral, elements: visitList(elements, toArrayLiteralElement), [Syntax.location]: noTextRange };
    }
    export function AssignmentRestElement(target: DestructuringAssignmentTarget): AssignmentRestElement {
        return { kind: SyntaxKind.AssignmentRestElement, target, [Syntax.location]: noTextRange };
    }
    export function AssignmentElement(target: DestructuringAssignmentTarget, initializer: Expression | undefined): AssignmentElement {
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.AssignmentElement, target, initializer, [Syntax.location]: noTextRange };
    }
    export function ArrayAssignmentPattern(elements: ReadonlyArray<ArrayAssignmentPatternElement>, rest: AssignmentRestElement | undefined): ArrayAssignmentPattern {
        return { kind: SyntaxKind.ArrayAssignmentPattern, elements, rest, [Syntax.location]: noTextRange };
    }
    export function BindingElement(name: BindingName | string, initializer?: Expression): BindingElement {
        name = possiblyBindingIdentifier(name);
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.BindingElement, name, initializer, [Syntax.location]: noTextRange };
    }
    export function BindingRestElement(name: BindingName | string): BindingRestElement {
        name = possiblyBindingIdentifier(name);
        return { kind: SyntaxKind.BindingRestElement, name, [Syntax.location]: noTextRange };
    }
    export function ArrayBindingPattern(elements: ReadonlyArray<ArrayBindingPatternElement>, rest: BindingRestElement | undefined): ArrayBindingPattern {
        return { kind: SyntaxKind.ArrayBindingPattern, elements, rest, [Syntax.location]: noTextRange };
    }
    export function New(expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression> | undefined): NewExpression {
        expression = toMemberExpressionOrHigher(possiblyIdentifierReference(expression));
        return { kind: SyntaxKind.NewExpression, expression, argumentList: argumentList && visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
    }
    export function Call(expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression>): CallExpression {
        expression = toLeftHandSideExpressionOrHigher(possiblyIdentifierReference(expression));
        return { kind: SyntaxKind.CallExpression, expression, argumentList: visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
    }
    export function Property(expression: Expression, name: IdentifierName | string): PropertyAccessExpression {
        return { kind: SyntaxKind.PropertyAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), name: possiblyIdentifierName(name), [Syntax.location]: noTextRange };
    }
    export function Index(expression: Expression, argumentExpression: Expression): ElementAccessExpression {
        return { kind: SyntaxKind.ElementAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), argumentExpression, [Syntax.location]: noTextRange };
    }
    export function PrefixUnary(operator: Token.PrefixUnaryOperator, expression: Expression): PrefixUnaryExpression {
        return { kind: SyntaxKind.PrefixUnaryExpression, operator, expression: toUnaryExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function PostfixUnary(expression: Expression, operator: Token.PostfixUnaryOperator): PostfixUnaryExpression {
        return { kind: SyntaxKind.PostfixUnaryExpression, expression: toLeftHandSideExpressionOrHigher(expression), operator, [Syntax.location]: noTextRange };
    }
    export function Binary(left: Expression, operator: Token.BinaryOperator, right: Expression): BinaryExpression {
        const precedence = getBinaryOperatorPrecedence(operator);
        return { kind: SyntaxKind.BinaryExpression, left: toBinaryExpressionOrHigher(left, precedence), operator, right: toBinaryExpressionOrHigher(right, precedence + 1), [Syntax.location]: noTextRange };
    }
    export function Assign(left: LeftHandSideExpressionOrHigher, operator: Token.AssignmentOperator, right: Expression): AssignmentExpression {
        return { kind: SyntaxKind.AssignmentExpression, left, operator, right: toAssignmentExpressionOrHigher(right), [Syntax.location]: noTextRange };
    }
    export function Conditional(condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression {
        return { kind: SyntaxKind.ConditionalExpression, condition: toBinaryExpressionOrHigher(condition, BinaryPrecedence.LogicalORExpression), whenTrue: toAssignmentExpressionOrHigher(whenTrue), whenFalse: toAssignmentExpressionOrHigher(whenFalse), [Syntax.location]: noTextRange };
    }
    export function Arrow(async: boolean, parameterList: ReadonlyArray<BindingElement | BindingName | string>, rest: BindingRestElement | undefined, body: Expression | Statement): ArrowFunction {
        return { kind: SyntaxKind.ArrowFunction, async, parameterList: visitList(parameterList, toParameter), rest, body: toArrowBody(body), [Syntax.location]: noTextRange };
    }
    export function CommaList(expressions: ReadonlyArray<Expression>): CommaListExpression {
        return { kind: SyntaxKind.CommaListExpression, expressions: visitList(expressions, toAssignmentExpressionOrHigher), [Syntax.location]: noTextRange };
    }
    export function Var(name: BindingName | string, initializer?: Expression): BindingElement {
        return Syntax.BindingElement(name, initializer);
    }
    export function Param(name: BindingName | string, initializer?: Expression): BindingElement {
        return Syntax.BindingElement(name, initializer);
    }
    export function Rest(name: BindingName | string): BindingRestElement {
        return Syntax.BindingRestElement(name);
    }
    export function Query(fromClause: FromClause, queryBody: QueryBody): QueryExpression {
        return { kind: SyntaxKind.QueryExpression, fromClause, queryBody, [Syntax.location]: noTextRange };
    }
    export function QueryBody(queryBodyClauses: ReadonlyArray<QueryBodyClause>, selectOrGroupClause: SelectOrGroupClause, queryContinuation: QueryContinuation | undefined): QueryBody {
        return { kind: SyntaxKind.QueryBody, queryBodyClauses, selectOrGroupClause, queryContinuation, [Syntax.location]: noTextRange };
    }
    export function QueryContinuation(name: RangeBinding, queryBody: QueryBody): QueryContinuation {
        return { kind: SyntaxKind.QueryContinuation, name, queryBody, [Syntax.location]: noTextRange };
    }
    export function FromClause(await: boolean, name: RangeBinding | string, expression: Expression): FromClause {
        name = possiblyBindingIdentifier(name);
        return { kind: SyntaxKind.FromClause, await, name, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function JoinClause(await: boolean, name: RangeBinding | string, expression: Expression, outerKeySelector: Expression, keySelector: Expression, into: BindingName | undefined): JoinClause {
        name = possiblyBindingIdentifier(name);
        return { kind: SyntaxKind.JoinClause, await, name, expression: toAssignmentExpressionOrHigher(expression), outerKeySelector: toAssignmentExpressionOrHigher(outerKeySelector), keySelector: toAssignmentExpressionOrHigher(keySelector), into, [Syntax.location]: noTextRange };
    }
    export function LetClause(name: RangeBinding, expression: Expression): LetClause {
        return { kind: SyntaxKind.LetClause, name, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function WhereClause(expression: Expression): WhereClause {
        return { kind: SyntaxKind.WhereClause, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function OrderbyClause(comparators: ReadonlyArray<OrderbyComparator>): OrderbyClause {
        return { kind: SyntaxKind.OrderbyClause, comparators, [Syntax.location]: noTextRange };
    }
    export function OrderbyComparator(expression: Expression, direction: Token.DirectionKeyword | undefined): OrderbyComparator {
        return { kind: SyntaxKind.OrderbyComparator, expression: toAssignmentExpressionOrHigher(expression), direction, [Syntax.location]: noTextRange };
    }
    export function GroupClause(elementSelector: Expression, keySelector: Expression): GroupClause {
        return { kind: SyntaxKind.GroupClause, elementSelector: toAssignmentExpressionOrHigher(elementSelector), keySelector: toAssignmentExpressionOrHigher(keySelector), [Syntax.location]: noTextRange };
    }
    export function SelectClause(expression: Expression): SelectClause {
        return { kind: SyntaxKind.SelectClause, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function Block(statements: ReadonlyArray<Statement | Expression>): Block {
        return { kind: SyntaxKind.Block, statements: visitList(statements, toStatement), [Syntax.location]: noTextRange };
    }
    export function Let(variables: ReadonlyArray<BindingElement>): LetStatement {
        return { kind: SyntaxKind.LetStatement, variables, [Syntax.location]: noTextRange };
    }
    export function ExpressionStatement(expression: Expression): ExpressionStatement {
        if (expression.kind === SyntaxKind.ObjectLiteral) expression = Paren(expression);
        return { kind: SyntaxKind.ExpressionStatement, expression, [Syntax.location]: noTextRange };
    }
    export function Return(expression: Expression | undefined): ReturnStatement {
        return { kind: SyntaxKind.ReturnStatement, expression, [Syntax.location]: noTextRange };
    }

    function toStatement(node: Statement | Expression): Statement {
        return isStatement(node) ? node : ExpressionStatement(node);
    }

    function leftMost(node: Expression | AssignmentPattern): Expression | AssignmentPattern {
        switch (node.kind) {
            case SyntaxKind.PropertyAccessExpression:
            case SyntaxKind.ElementAccessExpression:
            case SyntaxKind.CallExpression:
                return leftMost(node.expression);
            case SyntaxKind.BinaryExpression:
                return leftMost(node.left);
            case SyntaxKind.PostfixUnaryExpression:
                return leftMost(node.expression);
            case SyntaxKind.ConditionalExpression:
                return leftMost(node.condition);
            default:
                return node;
        }
    }

    function toParameter(parameter: BindingElement | BindingName | string) {
        if (typeof parameter === "string") parameter = Syntax.Identifier(parameter);
        if (isBindingName(parameter)) parameter = Syntax.Param(parameter);
        return parameter;
    }

    function toArrowBody(body: Expression | Statement): AssignmentExpressionOrHigher | Block {
        return body.kind === SyntaxKind.Block ? body :
            isStatement(body) ? Block([body]) :
            leftMost(body).kind === SyntaxKind.ObjectLiteral ? Paren(body) :
            toAssignmentExpressionOrHigher(body);
    }

    function possiblyIdentifierName<T extends Node>(name: T | string): T | IdentifierName {
        return typeof name === "string" ? Syntax.Identifier(name) : name;
    }

    function possiblyIdentifierReference<T extends Node>(name: T | string): T | IdentifierReference {
        return typeof name === "string" ? Syntax.Identifier(name) : name;
    }

    function possiblyBindingIdentifier<T extends Node>(name: T | string): T | BindingIdentifier {
        return typeof name === "string" ? Syntax.Identifier(name) : name;
    }

    function toBinaryExpressionOrHigher(node: Expression, precedence: BinaryPrecedence): BinaryExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.BinaryExpression:
                return getBinaryOperatorPrecedence(node.operator) >= precedence ? node : Syntax.Paren(node);
            default:
                return toUnaryExpressionOrHigher(node);
        }
    }

    function toUnaryExpressionOrHigher(node: Expression) {
        return isUnaryExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toMemberExpressionOrHigher(node: Expression) {
        return isMemberExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toLeftHandSideExpressionOrHigher(node: Expression) {
        return isLeftHandSideExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toAssignmentExpressionOrHigher(node: Expression) {
        return isAssignmentExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toArrayLiteralElement(node: Expression | Elision | SpreadElement): ArrayLiteralElement {
        switch (node.kind) {
            case SyntaxKind.Elision: return node;
            case SyntaxKind.SpreadElement: return node;
            default: return toAssignmentExpressionOrHigher(node);
        }
    }

    function toArgument(node: Expression | SpreadElement): Argument {
        switch (node.kind) {
            case SyntaxKind.SpreadElement: return node;
            default: return toAssignmentExpressionOrHigher(node);
        }
    }

    export function pos(node: Syntax) {
        return node[Syntax.location].pos;
    }

    export function end(node: Syntax) {
        return node[Syntax.location].end;
    }
}

export namespace SyntaxUpdate {
    export function ComputedPropertyName(node: ComputedPropertyName, expression: Expression): ComputedPropertyName {
        return node.expression !== expression ? assignLocation(Syntax.ComputedPropertyName(expression), node) : node;
    }
    export function Paren(node: ParenthesizedExpression, expression: Expression): ParenthesizedExpression {
        return node.expression !== expression ? assignLocation(Syntax.Paren(expression), node) : node;
    }
    export function PropertyDefinition(node: PropertyDefinition, name: PropertyName | string, initializer: Expression): PropertyDefinition {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.PropertyDefinition(name, initializer), node) : node;
    }
    export function ShorthandPropertyDefinition(node: ShorthandPropertyDefinition, name: IdentifierReference | string): ShorthandPropertyDefinition {
        return node.name !== name ? assignLocation(Syntax.ShorthandPropertyDefinition(name), node) : node;
    }
    export function ObjectLiteral(node: ObjectLiteral, properties: ReadonlyArray<ObjectLiteralElement>): ObjectLiteral {
        return node.properties !== properties ? assignLocation(Syntax.ObjectLiteral(properties), node) : node;
    }
    export function AssignmentRestProperty(node: AssignmentRestProperty, expression: Expression): AssignmentRestProperty {
        return node.expression !== expression ? assignLocation(Syntax.AssignmentRestProperty(expression), node) : node;
    }
    export function AssignmentProperty(node: AssignmentProperty, propertyName: PropertyName | string, assignmentElement: AssignmentElement): AssignmentProperty {
        return node.propertyName !== propertyName || node.assignmentElement !== assignmentElement ? assignLocation(Syntax.AssignmentProperty(propertyName, assignmentElement), node) : node;
    }
    export function ShorthandAssignmentProperty(node: ShorthandAssignmentProperty, name: IdentifierReference | string, initializer: Expression | undefined): ShorthandAssignmentProperty {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.ShorthandAssignmentProperty(name, initializer), node) : node;
    }
    export function ObjectAssignmentPattern(node: ObjectAssignmentPattern, properties: ReadonlyArray<ObjectAssignmentPatternElement>, rest: AssignmentRestProperty | undefined): ObjectAssignmentPattern {
        return node.properties !== properties || node.rest !== rest ? assignLocation(Syntax.ObjectAssignmentPattern(properties, rest), node) : node;
    }
    export function BindingRestProperty(node: BindingRestProperty, name: BindingIdentifier | string): BindingRestProperty {
        return node.name !== name ? assignLocation(Syntax.BindingRestProperty(name), node) : node;
    }
    export function BindingProperty(node: BindingProperty, propertyName: PropertyName | string, bindingElement: BindingElement): BindingProperty {
        return node.propertyName !== propertyName || node.bindingElement !== bindingElement ? assignLocation(Syntax.BindingProperty(propertyName, bindingElement), node) : node;
    }
    export function ShorthandBindingProperty(node: ShorthandBindingProperty, name: BindingIdentifier | string, initializer: Expression | undefined): ShorthandBindingProperty {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.ShorthandBindingProperty(name, initializer), node) : node;
    }
    export function ObjectBindingPattern(node: ObjectBindingPattern, properties: ReadonlyArray<ObjectBindingPatternElement>, rest: BindingRestProperty | undefined): ObjectBindingPattern {
        return node.properties !== properties || node.rest !== rest ? assignLocation(Syntax.ObjectBindingPattern(properties, rest), node) : node;
    }
    export function SpreadElement(node: SpreadElement, expression: Expression): SpreadElement {
        return node.expression !== expression ? assignLocation(Syntax.SpreadElement(expression), node) : node;
    }
    export function ArrayLiteral(node: ArrayLiteral, elements: ReadonlyArray<ArrayLiteralElement | Expression>): ArrayLiteral {
        return node.elements !== elements ? assignLocation(Syntax.ArrayLiteral(elements), node) : node;
    }
    export function AssignmentRestElement(node: AssignmentRestElement, target: DestructuringAssignmentTarget): AssignmentRestElement {
        return node.target !== target ? assignLocation(Syntax.AssignmentRestElement(target), node) : node;
    }
    export function AssignmentElement(node: AssignmentElement, target: DestructuringAssignmentTarget, initializer: Expression | undefined): AssignmentElement {
        return node.target !== target || node.initializer !== initializer ? assignLocation(Syntax.AssignmentElement(target, initializer), node) : node;
    }
    export function ArrayAssignmentPattern(node: ArrayAssignmentPattern, elements: ReadonlyArray<ArrayAssignmentPatternElement>, rest: AssignmentRestElement | undefined): ArrayAssignmentPattern {
        return node.elements !== elements || node.rest !== rest ? assignLocation(Syntax.ArrayAssignmentPattern(elements, rest), node) : node;
    }
    export function BindingElement(node: BindingElement, name: BindingName | string, initializer?: Expression): BindingElement {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.BindingElement(name, initializer), node) : node;
    }
    export function BindingRestElement(node: BindingRestElement, name: BindingName | string): BindingRestElement {
        return node.name !== name ? assignLocation(Syntax.BindingRestElement(name), node) : node;
    }
    export function ArrayBindingPattern(node: ArrayBindingPattern, elements: ReadonlyArray<ArrayBindingPatternElement>, rest: BindingRestElement | undefined): ArrayBindingPattern {
        return node.elements !== elements || node.rest !== rest ? assignLocation(Syntax.ArrayBindingPattern(elements, rest), node) : node;
    }
    export function New(node: NewExpression, expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression> | undefined): NewExpression {
        return node.expression !== expression || node.argumentList !== argumentList ? assignLocation(Syntax.New(expression, argumentList), node) : node;
    }
    export function Call(node: CallExpression, expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression>): CallExpression {
        return node.expression !== expression || node.argumentList !== argumentList ? assignLocation(Syntax.Call(expression, argumentList), node) : node;
    }
    export function Property(node: PropertyAccessExpression, expression: Expression): PropertyAccessExpression {
        return node.expression !== expression ? assignLocation(Syntax.Property(expression, node.name), node) : node;
    }
    export function Index(node: ElementAccessExpression, expression: Expression, argumentExpression: Expression): ElementAccessExpression {
        return node.expression !== expression || node.argumentExpression !== argumentExpression ? assignLocation(Syntax.Index(expression, argumentExpression), node) : node;
    }
    export function PrefixUnary(node: PrefixUnaryExpression, expression: Expression): PrefixUnaryExpression {
        return node.expression !== expression ? assignLocation(Syntax.PrefixUnary(node.operator, expression), node) : node;
    }
    export function PostfixUnary(node: PostfixUnaryExpression, expression: Expression): PostfixUnaryExpression {
        return node.expression !== expression ? assignLocation(Syntax.PostfixUnary(expression, node.operator), node) : node;
    }
    export function Binary(node: BinaryExpression, left: Expression, right: Expression): BinaryExpression {
        return node.left !== left || node.right !== right ? assignLocation(Syntax.Binary(left, node.operator, right), node) : node;
    }
    export function Assign(node: AssignmentExpression, left: LeftHandSideExpressionOrHigher, right: Expression): AssignmentExpression {
        return node.left !== left || node.right !== right ? assignLocation(Syntax.Assign(left, node.operator, right), node) : node;
    }
    export function Conditional(node: ConditionalExpression, condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression {
        return node.condition !== condition || node.whenTrue !== whenTrue || node.whenFalse !== whenFalse ? assignLocation(Syntax.Conditional(condition, whenTrue, whenFalse), node) : node;
    }
    export function Arrow(node: ArrowFunction, parameterList: ReadonlyArray<Parameter | BindingIdentifier | string>, rest: BindingRestElement | undefined, body: Expression | Statement): ArrowFunction {
        return node.parameterList !== parameterList || node.rest !== rest || node.body !== body ? assignLocation(Syntax.Arrow(node.async, parameterList, rest, body), node) : node;
    }
    export function Comma(node: CommaListExpression, expressions: ReadonlyArray<Expression>): CommaListExpression {
        return node.expressions !== expressions ? assignLocation(Syntax.CommaList(expressions), node) : node;
    }
    export function Query(node: QueryExpression, fromClause: FromClause, queryBody: QueryBody): QueryExpression {
        return node.fromClause !== fromClause || node.queryBody !== queryBody ? assignLocation(Syntax.Query(fromClause, queryBody), node) : node;
    }
    export function QueryBody(node: QueryBody, queryBodyClauses: ReadonlyArray<QueryBodyClause>, selectOrGroupClause: SelectOrGroupClause, queryContinuation: QueryContinuation | undefined): QueryBody {
        return node.queryBodyClauses !== queryBodyClauses || node.selectOrGroupClause !== node.selectOrGroupClause || node.queryContinuation !== queryContinuation ? assignLocation(Syntax.QueryBody(queryBodyClauses, selectOrGroupClause, queryContinuation), node) : node;
    }
    export function QueryContinuation(node: QueryContinuation, name: RangeBinding, queryBody: QueryBody): QueryContinuation {
        return node.name !== name || node.queryBody !== queryBody ? assignLocation(Syntax.QueryContinuation(name, queryBody), node) : node;
    }
    export function FromClause(node: FromClause, name: BindingName | string, expression: Expression): FromClause {
        return node.name !== name || node.expression !== expression ? assignLocation(Syntax.FromClause(node.await, name, expression), node) : node;
    }
    export function JoinClause(node: JoinClause, name: BindingName | string, expression: Expression, outerKeySelector: Expression, keySelector: Expression, into: BindingName | undefined): JoinClause {
        return node.name !== name || node.expression !== expression || node.outerKeySelector !== outerKeySelector || node.keySelector !== keySelector || node.into !== into ? assignLocation(Syntax.JoinClause(node.await, name, expression, outerKeySelector, keySelector, into), node) : node;
    }
    export function LetClause(node: LetClause, name: BindingName, expression: Expression): LetClause {
        return node.name !== name || node.expression !== expression ? assignLocation(Syntax.LetClause(name, expression), node) : node;
    }
    export function WhereClause(node: WhereClause, expression: Expression): WhereClause {
        return node.expression !== expression ? assignLocation(Syntax.WhereClause(expression), node) : node;
    }
    export function OrderbyClause(node: OrderbyClause, comparators: OrderbyClause["comparators"]): OrderbyClause {
        return node.comparators !== comparators ? assignLocation(Syntax.OrderbyClause(comparators), node) : node;
    }
    export function OrderbyComparator(node: OrderbyComparator, expression: Expression): OrderbyComparator {
        return node.expression !== expression ? assignLocation(Syntax.OrderbyComparator(expression, node.direction), node) : node;
    }
    export function GroupClause(node: GroupClause, elementSelector: Expression, keySelector: Expression): GroupClause {
        return node.elementSelector !== elementSelector || node.keySelector !== keySelector ? assignLocation(Syntax.GroupClause(elementSelector, keySelector), node) : node;
    }
    export function SelectClause(node: SelectClause, expression: Expression): SelectClause {
        return node.expression !== expression ? assignLocation(Syntax.SelectClause(expression), node) : node;
    }
    export function Block(node: Block, statements: ReadonlyArray<Statement | Expression>): Block {
        return node.statements !== statements ? assignLocation(Syntax.Block(statements), node) : node;
    }
    export function Let(node: LetStatement, variables: ReadonlyArray<BindingElement>): LetStatement {
        return node.variables !== variables ? assignLocation(Syntax.Let(variables), node) : node;
    }
    export function ExpressionStatement(node: ExpressionStatement, expression: Expression): ExpressionStatement {
        return node.expression !== expression ? assignLocation(Syntax.ExpressionStatement(expression), node) : node;
    }
    export function Return(node: ReturnStatement, expression: Expression | undefined): ReturnStatement {
        return node.expression !== expression ? assignLocation(Syntax.Return(expression), node) : node;
    }
    export function assignLocation<T extends Node>(node: T, source: Syntax): T {
        node[Syntax.location] = source[Syntax.location];
        return node;
    }
}

export interface Identifier extends Syntax {
    readonly kind: SyntaxKind.Identifier;
    readonly text: string;
    readonly originalKeyword: Token.Keyword | undefined;
}

export type IdentifierName = Identifier;
export type BindingIdentifier = Identifier;
export type IdentifierReference = Identifier;

export function isIdentifier(node: Node): node is Identifier {
    switch (node.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.Identifier:
        case SyntaxKind.Identifier:
            return true;
        default:
            return false;
    }
}

export interface ComputedPropertyName extends Syntax {
    readonly kind: SyntaxKind.ComputedPropertyName;
    readonly expression: AssignmentExpressionOrHigher;
}

export interface TextLiteralNode<Kind extends SyntaxKind.StringLiteral | SyntaxKind.NumberLiteral | SyntaxKind.RegularExpressionLiteral> extends Syntax {
    readonly kind: Kind;
    readonly text: string;
    readonly flags: TokenFlags;
}

export type StringLiteral = TextLiteralNode<SyntaxKind.StringLiteral>;

export type NumberLiteral = TextLiteralNode<SyntaxKind.NumberLiteral>;

export type RegularExpressionLiteral = TextLiteralNode<SyntaxKind.RegularExpressionLiteral>;

export type TextLiteral =
    | StringLiteral
    | NumberLiteral
    | RegularExpressionLiteral;

export interface NullLiteral extends Syntax {
    readonly kind: SyntaxKind.NullLiteral;
}

export interface BooleanLiteral extends Syntax {
    readonly kind: SyntaxKind.BooleanLiteral;
    readonly value: boolean;
}

export type Literal =
    | TextLiteral
    | NullLiteral
    | BooleanLiteral;

export type PropertyName =
    | IdentifierName
    | StringLiteral
    | NumberLiteral
    | ComputedPropertyName;

export function isPropertyName(node: Node): node is PropertyName {
    switch (node.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumberLiteral:
        case SyntaxKind.ComputedPropertyName:
            return true;
        default:
            return false;
    }
}

export interface ThisExpression extends Syntax {
    readonly kind: SyntaxKind.ThisExpression;
}

export type BindingName =
    | BindingIdentifier
    | BindingPattern;

export function isBindingName(node: Node): node is BindingName {
    switch (node.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.ObjectBindingPattern:
        case SyntaxKind.ArrayBindingPattern:
            return true;
        default:
            return false;
    }
}

export interface SpreadElement extends Syntax {
    readonly kind: SyntaxKind.SpreadElement;
    readonly expression: AssignmentExpressionOrHigher;
}

export interface Elision extends Syntax {
    readonly kind: SyntaxKind.Elision;
}

export type MethodDefinition = never;

// PropertyDefinition :
//     IdentifierReference
//     CoverInitializedName
//     PropertyName `:` AssignmentExpression
//     MethodDefinition
//     `...` AssignmentExpression
export type ObjectLiteralElement =
    | ShorthandPropertyDefinition
    | CoverInitializedName
    | PropertyDefinition
    | MethodDefinition
    | SpreadElement;

// PropertyDefinition: PropertyName `:` AssignmentExpression
export interface PropertyDefinition extends Syntax {
    readonly kind: SyntaxKind.PropertyDefinition;
    readonly name: PropertyName;
    readonly initializer: AssignmentExpressionOrHigher;
}

// PropertyDefinition: IdentifierReference
export interface ShorthandPropertyDefinition extends Syntax {
    readonly kind: SyntaxKind.ShorthandPropertyDefinition;
    readonly name: IdentifierReference;
}

// CoverInitializedName : IdentifierReference Initializer
export interface CoverInitializedName extends Syntax {
    readonly kind: SyntaxKind.CoverInitializedName;
    readonly name: IdentifierReference;
    readonly initializer: AssignmentExpressionOrHigher;
}

// ObjectLiteral:
//     `{` `}`
//     `{` PropertyDefinitionList `,`? `}`
export interface ObjectLiteral extends Syntax {
    readonly kind: SyntaxKind.ObjectLiteral;
    readonly properties: ReadonlyArray<ObjectLiteralElement>;
}

export type ObjectAssignmentPatternElement = ShorthandAssignmentProperty | AssignmentProperty;

// AssignmentRestProperty: `...` DestructuringAssignmentTarget
export interface AssignmentRestProperty extends Syntax {
    readonly kind: SyntaxKind.AssignmentRestProperty;
    readonly expression: DestructuringAssignmentTarget;
}

// AssignmentProperty: PropertyName `:` AssignmentElement
export interface AssignmentProperty extends Syntax {
    readonly kind: SyntaxKind.AssignmentProperty;
    readonly propertyName: PropertyName;
    readonly assignmentElement: AssignmentElement;
}

// AssignmentProperty: IdentifierReference Initializer?
export interface ShorthandAssignmentProperty extends Syntax {
    readonly kind: SyntaxKind.ShorthandAssignmentProperty;
    readonly name: IdentifierReference;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ObjectAssignmentPattern :
//     `{` `}`
//     `{` AssignmentRestProperty `}`
//     `{` AssignmentPropertyList `}`
//     `{` AssignmentPropertyList `,` AssignmentRestProperty? `}`
export interface ObjectAssignmentPattern extends Syntax {
    readonly kind: SyntaxKind.ObjectAssignmentPattern;
    readonly properties: ReadonlyArray<ObjectAssignmentPatternElement>;
    readonly rest: AssignmentRestProperty | undefined;
}

// BindingRestProperty: `...` BindingIdentifier
export interface BindingRestProperty extends Syntax {
    readonly kind: SyntaxKind.BindingRestProperty;
    readonly name: BindingIdentifier;
}

// BindingProperty :
//     SingleNameBinding
//     PropertyName `:` BindingElement
export type ObjectBindingPatternElement = ShorthandBindingProperty | BindingProperty;

// BindingProperty: PropertyName `:` BindingElement
export interface BindingProperty extends Syntax {
    readonly kind: SyntaxKind.BindingProperty;
    readonly propertyName: PropertyName;
    readonly bindingElement: BindingElement;
}

// BindingProperty: SingleNameBinding
export interface ShorthandBindingProperty extends Syntax {
    readonly kind: SyntaxKind.ShorthandBindingProperty;
    readonly name: BindingIdentifier;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ObjectBindingPattern :
//     `{` `}`
//     `{` BindingRestProperty `}`
//     `{` BindingPropertyList `}`
//     `{` BindingPropertyList `,` BindingRestProperty? `}`
export interface ObjectBindingPattern extends Syntax {
    readonly kind: SyntaxKind.ObjectBindingPattern;
    readonly properties: ReadonlyArray<ObjectBindingPatternElement>;
    readonly rest: BindingRestProperty | undefined;
}

// ElementList :
//     Elision? AssignmentExpression
//     Elision? SpreadElement
//     ElementList `,` Elision? AssignmentExpression
//     ElementList `,` Elision? SpreadElement
export type ArrayLiteralElement = AssignmentExpressionOrHigher | SpreadElement | Elision;

// ArrayLiteral :
//     `[` Elision? `]`
//     `[` ElementList `]`
//     `[` ElementList `,` Elision? `]`
export interface ArrayLiteral extends Syntax {
    readonly kind: SyntaxKind.ArrayLiteral;
    readonly elements: ReadonlyArray<ArrayLiteralElement>;
}

// BindingElementList :
//     BindingElisionElement
//     BindingElementList `,` BindingElisionElement
export type ArrayBindingPatternElement = BindingElement | Elision;

// BindingRestElement: `...` BindingName
export interface BindingRestElement extends Syntax {
    readonly kind: SyntaxKind.BindingRestElement;
    readonly name: BindingName;
}

// BindingElement: BindingName Initializer?
export interface BindingElement extends Syntax {
    readonly kind: SyntaxKind.BindingElement;
    readonly name: BindingName;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ArrayBindingPattern :
//     `[` Elision? BindingRestElement? `]`
//     `[` BindingElementList `]`
//     `[` BindingElementList `,` Elision? BindingRestElement? `]`
export interface ArrayBindingPattern extends Syntax {
    readonly kind: SyntaxKind.ArrayBindingPattern;
    readonly elements: ReadonlyArray<ArrayBindingPatternElement>;
    readonly rest: BindingRestElement | undefined;
}

// AssignmentElementList :
//     AssignmentElisionElement
//     AssignmentElementList `,` AssignmentElisionElement
export type ArrayAssignmentPatternElement = AssignmentElement | Elision;

// AssignmentRestElement: `...` DestructuringAssignmentTarget
export interface AssignmentRestElement extends Syntax {
    readonly kind: SyntaxKind.AssignmentRestElement;
    readonly target: DestructuringAssignmentTarget;
}

// AssignmentElement: DestructuringAssignmentTarget Initializer?
export interface AssignmentElement extends Syntax {
    readonly kind: SyntaxKind.AssignmentElement;
    readonly target: DestructuringAssignmentTarget;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ArrayAssignmentPattern :
//     `[` Elision? AssignmentRestElement? `]`
//     `[` AssignmentElementList `]`
//     `[` AssignmentElementList `,` Elision? AssignmentRestElement? `]`
export interface ArrayAssignmentPattern extends Syntax {
    readonly kind: SyntaxKind.ArrayAssignmentPattern;
    readonly elements: ReadonlyArray<ArrayAssignmentPatternElement>;
    readonly rest: AssignmentRestElement | undefined;
}

export type BindingPattern = ObjectBindingPattern | ArrayBindingPattern;
export type AssignmentPattern = ObjectAssignmentPattern | ArrayAssignmentPattern;

export interface ParenthesizedExpression extends Syntax {
    readonly kind: SyntaxKind.ParenthesizedExpression;
    readonly expression: Expression;
}

export type PrimaryExpression =
    | ThisExpression
    | IdentifierReference
    | Literal
    | ArrayLiteral
    | ObjectLiteral
    | ParenthesizedExpression
    | RegularExpressionLiteral
    | NewExpression
    | CoverParenthesizedExpressionAndArrowParameterList;

export function isPrimaryExpression(node: Node): node is PrimaryExpression {
    switch (node.kind) {
        case SyntaxKind.ThisExpression:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumberLiteral:
        case SyntaxKind.RegularExpressionLiteral:
        case SyntaxKind.NullLiteral:
        case SyntaxKind.BooleanLiteral:
        case SyntaxKind.Identifier:
        case SyntaxKind.ArrayLiteral:
        case SyntaxKind.ObjectLiteral:
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.NewExpression:
            return true;
        default:
            return false;
    }
}

export interface PropertyAccessExpression extends Syntax {
    readonly kind: SyntaxKind.PropertyAccessExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly name: IdentifierName;
}

export interface ElementAccessExpression extends Syntax {
    readonly kind: SyntaxKind.ElementAccessExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly argumentExpression: Expression;
}

export type Argument =
    | AssignmentExpressionOrHigher
    | SpreadElement;

export interface NewExpression extends Syntax {
    readonly kind: SyntaxKind.NewExpression;
    readonly expression: MemberExpressionOrHigher;
    readonly argumentList: ReadonlyArray<Argument> | undefined;
}

export type MemberExpressionOrHigher =
    | PrimaryExpression
    | PropertyAccessExpression
    | ElementAccessExpression
    | NewExpression
    | CoverElementAccessExpressionAndQueryExpressionHead;

export function isMemberExpressionOrHigher(node: Node): node is MemberExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.PropertyAccessExpression:
        case SyntaxKind.ElementAccessExpression:
        case SyntaxKind.NewExpression:
        case SyntaxKind.CoverElementAccessExpressionAndQueryExpressionHead:
            return true;
        default:
            return isPrimaryExpression(node);
    }
}

export interface CallExpression extends Syntax {
    readonly kind: SyntaxKind.CallExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly argumentList: ReadonlyArray<Argument>;
}

export type LeftHandSideExpressionOrHigher =
    | MemberExpressionOrHigher
    | CallExpression
    | AssignmentPattern;

export function isLeftHandSideExpressionOrHigher(node: Node): node is LeftHandSideExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.CallExpression:
        case SyntaxKind.ObjectAssignmentPattern:
        case SyntaxKind.ArrayAssignmentPattern:
            return true;
        default:
            return isMemberExpressionOrHigher(node);
    }
}

export interface PrefixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PrefixUnaryExpression;
    readonly operator: Token.PrefixUnaryOperator;
    readonly expression: UnaryExpressionOrHigher;
}

export interface PostfixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PostfixUnaryExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly operator: Token.PostfixUnaryOperator;
}

export type UnaryExpressionOrHigher =
    | PrefixUnaryExpression
    | PostfixUnaryExpression
    | LeftHandSideExpressionOrHigher;

export function isUnaryExpressionOrHigher(node: Node): node is UnaryExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.PrefixUnaryExpression:
        case SyntaxKind.PostfixUnaryExpression:
            return true;
        default:
            return isLeftHandSideExpressionOrHigher(node);
    }
}

export interface BinaryExpression extends Syntax {
    readonly kind: SyntaxKind.BinaryExpression;
    readonly left: BinaryExpressionOrHigher;
    readonly operator: Token.BinaryOperator;
    readonly right: BinaryExpressionOrHigher;
}

export interface ConditionalExpression extends Syntax {
    readonly kind: SyntaxKind.ConditionalExpression;
    readonly condition: BinaryExpressionOrHigher;
    readonly whenTrue: AssignmentExpressionOrHigher;
    readonly whenFalse: AssignmentExpressionOrHigher;
}

//  RangeBinding :
//      BindingIdentifier[~Yield, ~Await]
//      BindingPattern[~Yield, ~Await]
export type RangeBinding =
    | BindingIdentifier
    | BindingPattern;

//  QueryExpression :
//      FromClause QueryBody
export interface QueryExpression extends Syntax {
    readonly kind: SyntaxKind.QueryExpression;
    readonly fromClause: FromClause;
    readonly queryBody: QueryBody;
}

//  QueryBody :
//      QueryBodyClauses? SelectOrGroupClause QueryContinuation?
export interface QueryBody extends Syntax {
    readonly kind: SyntaxKind.QueryBody;
    readonly queryBodyClauses: ReadonlyArray<QueryBodyClause>;
    readonly selectOrGroupClause: SelectOrGroupClause;
    readonly queryContinuation: QueryContinuation | undefined;
}

//  QueryBodyClauses :
//      QueryBodyClause
//      QueryBodyClauses QueryBodyClause
//
//  QueryBodyClause :
//      FromClause
//      JoinClause
//      LetClause
//      WhereClause
//      OrderbyClause
export type QueryBodyClause =
    | FromClause
    | JoinClause
    | LetClause
    | WhereClause
    | OrderbyClause;

export function isQueryBodyClause(node: Node): node is QueryBodyClause {
    switch (node.kind) {
        case SyntaxKind.FromClause:
        case SyntaxKind.JoinClause:
        case SyntaxKind.LetClause:
        case SyntaxKind.WhereClause:
        case SyntaxKind.OrderbyClause:
            return true;
        default:
            return false;
    }
}

//  SelectOrGroupClause :
//      SelectClause
//      GroupClause
export type SelectOrGroupClause =
    | GroupClause
    | SelectClause;

export function isSelectOrGroupClause(node: Node): node is SelectOrGroupClause {
    switch (node.kind) {
        case SyntaxKind.SelectClause:
        case SyntaxKind.GroupClause:
            return true;
        default:
            return false;
    }
}

//  CoverElementAccessExpressionAndQueryExpressionHead[Yield, Await] :
//      MemberExpression[?Yield, ?Await] ArrayLiteral[?Yield, ?Await]
//      MemberExpression[?Yield, ?Await] [no LineTerminator here] ObjectBindingPattern[~Yield, ~Await]
//      MemberExpression[?Yield, ?Await] [no LineTerminator here] BindingIdentifier[~Yield, ~Await]
//      MemberExpression[?Yield, ?Await] [no LineTerminator here] `await` RangeBinding
export interface CoverElementAccessExpressionAndQueryExpressionHead extends Syntax {
    readonly kind: SyntaxKind.CoverElementAccessExpressionAndQueryExpressionHead;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly await: boolean;
    readonly argument: ArrayLiteral | RangeBinding;
}

//  FromClause :
//      `from` `await`? RangeBinding `of` AssignmentExpression[+In, ~Yield, ~Await]
//      CoverElementAccessExpressionAndQueryExpressionHead[~Yield, ~Await] `of` AssignmentExpression[+In, ~Yield, ~Await]
export interface FromClause extends Syntax {
    readonly kind: SyntaxKind.FromClause;
    readonly await: boolean;
    readonly name: RangeBinding;
    readonly expression: AssignmentExpressionOrHigher;
}

//  JoinClause :
//     `join` `await`? RangeBinding `of` AssignmentExpression[+In, ~Yield, ~Await] `on` AssignmentExpression[+In, ~Yield, ~Await] `equals` AssignmentExpression[+In, ~Yield, ~Await]
//     `join` `await`? RangeBinding `of` AssignmentExpression[+In, ~Yield, ~Await] `on` AssignmentExpression[+In, ~Yield, ~Await] `equals` AssignmentExpression[+In, ~Yield, ~Await] `into` RangeBinding
export interface JoinClause extends Syntax {
    readonly kind: SyntaxKind.JoinClause;
    readonly await: boolean;
    readonly name: RangeBinding;
    readonly expression: AssignmentExpressionOrHigher;
    readonly outerKeySelector: AssignmentExpressionOrHigher;
    readonly keySelector: AssignmentExpressionOrHigher;
    readonly into: RangeBinding | undefined;
}

//  LetClause :
//      `let` RangeBinding `=` AssignmentExpression[+In, ~Yield, ~Await]
export interface LetClause extends Syntax {
    readonly kind: SyntaxKind.LetClause;
    readonly name: RangeBinding;
    readonly expression: AssignmentExpressionOrHigher;
}

//  WhereClause :
//      `where` AssignmentExpression[+In, ~Yield, ~Await]
export interface WhereClause extends Syntax {
    readonly kind: SyntaxKind.WhereClause;
    readonly expression: AssignmentExpressionOrHigher;
}

//  OrderbyClause :
//      `orderby` OrderbyComparatorList
export interface OrderbyClause extends Syntax {
    readonly kind: SyntaxKind.OrderbyClause;
    readonly comparators: ReadonlyArray<OrderbyComparator>;
}

//  OrderbyComparatorList :
//      OrderbyComparator
//      OrderbyComparatorList `,` OrderbyComparator
//
//  OrderbyComparator :
//      AssignmentExpression[+In, ~Yield, ~Await] `ascending`?
//      AssignmentExpression[+In, ~Yield, ~Await] `descending`
export interface OrderbyComparator extends Syntax {
    readonly kind: SyntaxKind.OrderbyComparator;
    readonly expression: AssignmentExpressionOrHigher;
    readonly direction: Token.DirectionKeyword | undefined;
}

//  GroupClause :
//      `group` AssignmentExpression[+In, ~Yield, ~Await] `by` AssignmentExpression[+In, ~Yield, ~Await]
export interface GroupClause extends Syntax {
    readonly kind: SyntaxKind.GroupClause;
    readonly elementSelector: AssignmentExpressionOrHigher;
    readonly keySelector: AssignmentExpressionOrHigher;
}

//  SelectClause :
//      `select` AssignmentExpression[+In, ~Yield, ~Await]
export interface SelectClause extends Syntax {
    readonly kind: SyntaxKind.SelectClause;
    readonly expression: AssignmentExpressionOrHigher;
}

//  QueryContinuation :
//      `into` RangeBinding QueryBody
export interface QueryContinuation extends Syntax {
    readonly kind: SyntaxKind.QueryContinuation;
    readonly name: RangeBinding;
    readonly queryBody: QueryBody;
}

export type Parameter = BindingElement;

export interface ArrowFunction extends Syntax {
    readonly kind: SyntaxKind.ArrowFunction;
    readonly async: boolean;
    readonly parameterList: ReadonlyArray<BindingElement>;
    readonly rest: BindingRestElement | undefined;
    readonly body: AssignmentExpressionOrHigher | Block;
}

export type BinaryExpressionOrHigher =
    | UnaryExpressionOrHigher
    | BinaryExpression;

export function isBinaryExpressionOrHigher(node: Node): node is BinaryExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.BinaryExpression:
            return true;
        default:
            return isUnaryExpressionOrHigher(node);
    }
}

export interface AssignmentExpression extends Syntax {
    readonly kind: SyntaxKind.AssignmentExpression;
    readonly left: LeftHandSideExpressionOrHigher;
    readonly operator: Token.AssignmentOperator;
    readonly right: AssignmentExpressionOrHigher;
}

export type AssignmentExpressionOrHigher =
    | BinaryExpressionOrHigher
    | ConditionalExpression
    | QueryExpression
    | ArrowFunction
    | AssignmentExpression;

export type DestructuringAssignmentTarget = AssignmentExpressionOrHigher;

export function isAssignmentExpressionOrHigher(node: Node): node is AssignmentExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.AssignmentExpression:
        case SyntaxKind.QueryExpression:
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.ConditionalExpression:
            return true;
        default:
            return isBinaryExpressionOrHigher(node);
    }
}

export interface CommaListExpression extends Syntax {
    readonly kind: SyntaxKind.CommaListExpression;
    readonly expressions: ReadonlyArray<AssignmentExpressionOrHigher>;
}

export type Expression =
    | AssignmentExpressionOrHigher
    | CommaListExpression;

export function isExpression(node: Node): node is Expression {
    switch (node.kind) {
        case SyntaxKind.CommaListExpression:
            return true;
        default:
            return isAssignmentExpressionOrHigher(node);
    }
}

export interface CoverParenthesizedExpressionAndArrowParameterList extends Syntax {
    readonly kind: SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList;
    readonly expression: Expression | undefined;
    readonly rest: BindingRestElement | undefined;
}

export interface Block extends Syntax {
    readonly kind: SyntaxKind.Block;
    readonly statements: ReadonlyArray<Statement>;
}

export interface LetStatement extends Syntax {
    readonly kind: SyntaxKind.LetStatement;
    readonly variables: ReadonlyArray<BindingElement>;
}

export interface ExpressionStatement extends Syntax {
    readonly kind: SyntaxKind.ExpressionStatement;
    readonly expression: Expression;
}

export interface ReturnStatement extends Syntax {
    readonly kind: SyntaxKind.ReturnStatement;
    readonly expression: Expression | undefined;
}

// Expressions that are actually statements.
export type Statement =
    | Block
    | LetStatement
    | ExpressionStatement
    | ReturnStatement;

export function isStatement(node: Node): node is Statement {
    switch (node.kind) {
        case SyntaxKind.Block:
        case SyntaxKind.LetStatement:
        case SyntaxKind.ExpressionStatement:
        case SyntaxKind.ReturnStatement:
            return true;
        default:
            return false;
    }
}

export type Node =
    // Literals
    | StringLiteral
    | NumberLiteral
    | RegularExpressionLiteral

    // Names
    | IdentifierName
    | IdentifierReference
    | BindingIdentifier
    | ComputedPropertyName

    // Clauses
    | FromClause
    | LetClause
    | WhereClause
    | OrderbyClause
    | OrderbyComparator
    | GroupClause
    | JoinClause
    | SelectClause
    | QueryBody
    | QueryContinuation

    // Expressions
    | ThisExpression
    | NullLiteral
    | BooleanLiteral
    | ArrowFunction
    | PrefixUnaryExpression
    | PostfixUnaryExpression
    | ParenthesizedExpression
    | CallExpression
    | NewExpression
    | PropertyAccessExpression
    | ElementAccessExpression
    | ObjectLiteral
    | ArrayLiteral
    | Elision
    | SpreadElement
    | BinaryExpression
    | ConditionalExpression
    | QueryExpression
    | AssignmentExpression
    | CommaListExpression

    // Declarations
    | BindingElement
    | BindingRestElement
    | PropertyDefinition
    | ShorthandPropertyDefinition

    // Patterns
    | ObjectBindingPattern
    | BindingRestProperty
    | BindingProperty
    | ShorthandBindingProperty
    | ObjectAssignmentPattern
    | AssignmentRestProperty
    | AssignmentProperty
    | ShorthandAssignmentProperty
    | ArrayBindingPattern
    | ArrayAssignmentPattern
    | AssignmentElement
    | AssignmentRestElement

    // Statements
    | Block
    | LetStatement
    | ExpressionStatement
    | ReturnStatement

    // Cover Grammars
    | CoverParenthesizedExpressionAndArrowParameterList
    | CoverInitializedName
    | CoverElementAccessExpressionAndQueryExpressionHead
    ;
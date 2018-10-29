import { TokenNode, TokenKind, TextLiteralKind, TokenFlags, TextLiteralNode, Identifier, SyntaxKind, ComputedPropertyName, FromClause, LetClause, WhereClause, OrderbyClause, OrderbyComparator, GroupClause, JoinClause, QueryExpression, ParenthesizedExpression, Elision, SpreadElement, ArrayLiteral, PropertyAssignment, ShorthandPropertyAssignment, ObjectLiteral, NewExpression, CallExpression, PropertyAccessExpression, ElementAccessExpression, PrefixUnaryExpression, PostfixUnaryExpression, BinaryExpression, ConditionalExpression, SelectClause, Expression, isLeftHandSideExpressionOrHigher, ArrayLiteralElement, Argument, isMemberExpressionOrHigher, isAssignmentExpressionOrHigher, isUnaryExpressionOrHigher, BinaryPrecedence, getBinaryOperatorPrecedence, ArrowFunction, CommaListExpression, AssignmentExpressionOrHigher, TextRange, Syntax } from "./types";
import { visitList } from "./visitor";

const noTextRange = createTextRange(0, 0);

/** @internal */
export function createTextRange(pos: number, end: number): TextRange {
    return { pos, end };
}

/** @internal */
export function createToken<Kind extends TokenKind>(kind: Kind): TokenNode<Kind> {
    return { kind, [Syntax.location]: noTextRange };
}

/** @internal */
export function createTextLiteral<Kind extends TextLiteralKind>(kind: Kind, text: string, flags: TokenFlags): TextLiteralNode<Kind> {
    return { kind, text, flags, [Syntax.location]: noTextRange };
}

/** @internal */
export function createIdentifier(text: string): Identifier {
    return { kind: SyntaxKind.Identifier, text, [Syntax.location]: noTextRange };
}

/** @internal */
export function createComputedPropertyName(expression: Expression): ComputedPropertyName {
    return { kind: SyntaxKind.ComputedPropertyName, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
}

/** @internal */
export function createFromClause(outerClause: FromClause["outerClause"], awaitKeyword: FromClause["awaitKeyword"], name: FromClause["name"], axisSelectorToken: FromClause["axisSelectorToken"], expression: Expression): FromClause {
    return { kind: SyntaxKind.FromClause, outerClause, awaitKeyword, name, axisSelectorToken, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
}

/** @internal */
export function createLetClause(outerClause: LetClause["outerClause"], name: LetClause["name"], expression: Expression): LetClause {
    return { kind: SyntaxKind.LetClause, outerClause, name, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
}

/** @internal */
export function createWhereClause(outerClause: WhereClause["outerClause"], expression: Expression): WhereClause {
    return { kind: SyntaxKind.WhereClause, outerClause, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
}

/** @internal */
export function createOrderbyClause(outerClause: OrderbyClause["outerClause"], comparators: OrderbyClause["comparators"]): OrderbyClause {
    return { kind: SyntaxKind.OrderbyClause, outerClause, comparators, [Syntax.location]: noTextRange };
}

/** @internal */
export function createOrderbyComparator(expression: Expression, directionToken: OrderbyComparator["directionToken"], usingExpression: Expression | undefined): OrderbyComparator {
    return { kind: SyntaxKind.OrderbyComparator, expression: toAssignmentExpressionOrHigher(expression), directionToken, usingExpression: usingExpression && toAssignmentExpressionOrHigher(usingExpression), [Syntax.location]: noTextRange };
}

/** @internal */
export function createGroupClause(outerClause: GroupClause["outerClause"], elementSelector: Expression, keySelector: Expression, intoName: GroupClause["intoName"]): GroupClause {
    return { kind: SyntaxKind.GroupClause, outerClause, elementSelector: toAssignmentExpressionOrHigher(elementSelector), keySelector: toAssignmentExpressionOrHigher(keySelector), intoName, [Syntax.location]: noTextRange };
}

/** @internal */
export function createJoinClause(outerClause: JoinClause["outerClause"], awaitKeyword: JoinClause["awaitKeyword"], name: JoinClause["name"], axisSelectorToken: JoinClause["axisSelectorToken"], expression: Expression, outerSelector: Expression, innerSelector: Expression, intoName: JoinClause["intoName"]): JoinClause {
    return { kind: SyntaxKind.JoinClause, outerClause, awaitKeyword, name, axisSelectorToken, expression: toAssignmentExpressionOrHigher(expression), outerSelector: toAssignmentExpressionOrHigher(outerSelector), innerSelector: toAssignmentExpressionOrHigher(innerSelector), intoName, [Syntax.location]: noTextRange };
}

/** @internal */
export function createSelectClause(outerClause: SelectClause["outerClause"], axisSelectorToken: SelectClause["axisSelectorToken"], expression: Expression, intoName: SelectClause["intoName"]): SelectClause {
    return { kind: SyntaxKind.SelectClause, outerClause, axisSelectorToken, expression: toAssignmentExpressionOrHigher(expression), intoName, [Syntax.location]: noTextRange };
}

/** @internal */
export function createQueryExpression(query: QueryExpression["query"]): QueryExpression {
    return { kind: SyntaxKind.QueryExpression, query, [Syntax.location]: noTextRange };
}

/** @internal */
export function createParenthesizedExpression(expression: Expression): ParenthesizedExpression {
    return { kind: SyntaxKind.ParenthesizedExpression, expression, [Syntax.location]: noTextRange };
}

/** @internal */
export function createElision(): Elision {
    return { kind: SyntaxKind.Elision, [Syntax.location]: noTextRange };
}

/** @internal */
export function createSpreadElement(expression: Expression): SpreadElement {
    return { kind: SyntaxKind.SpreadElement, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
}

/** @internal */
export function createArrayLiteral(elements: ReadonlyArray<Expression | Elision | SpreadElement>): ArrayLiteral {
    return { kind: SyntaxKind.ArrayLiteral, elements: visitList(elements, toArrayLiteralElement), [Syntax.location]: noTextRange };
}

/** @internal */
export function createPropertyAssignment(name: PropertyAssignment["name"], initializer: Expression): PropertyAssignment {
    return { kind: SyntaxKind.PropertyAssignment, name, initializer: toAssignmentExpressionOrHigher(initializer), [Syntax.location]: noTextRange };
}

/** @internal */
export function createShorthandPropertyAssignment(name: ShorthandPropertyAssignment["name"]): ShorthandPropertyAssignment {
    return { kind: SyntaxKind.ShorthandPropertyAssignment, name, [Syntax.location]: noTextRange };
}

/** @internal */
export function createObjectLiteral(properties: ObjectLiteral["properties"]): ObjectLiteral {
    return { kind: SyntaxKind.ObjectLiteral, properties, [Syntax.location]: noTextRange };
}

/** @internal */
export function createNewExpression(expression: Expression, argumentList: ReadonlyArray<Expression | SpreadElement> | undefined): NewExpression {
    return { kind: SyntaxKind.NewExpression, expression: toMemberExpressionOrHigher(expression), argumentList: visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
}

/** @internal */
export function createCallExpression(expression: Expression | string, argumentList: ReadonlyArray<Expression | SpreadElement>): CallExpression {
    if (typeof expression === "string") expression = Expr.id(expression);
    return { kind: SyntaxKind.CallExpression, expression: toLeftHandSideExpressionOrHigher(expression), argumentList: visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
}

/** @internal */
export function createPropertyAccessExpression(expression: Expression, name: PropertyAccessExpression["name"] | string): PropertyAccessExpression {
    return { kind: SyntaxKind.PropertyAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), name: toIdentifier(name), [Syntax.location]: noTextRange };
}

/** @internal */
export function createElementAccessExpression(expression: Expression, argumentExpression: ElementAccessExpression["argumentExpression"]): ElementAccessExpression {
    return { kind: SyntaxKind.ElementAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), argumentExpression, [Syntax.location]: noTextRange };
}

/** @internal */
export function createPrefixUnaryExpression(operatorToken: PrefixUnaryExpression["operatorToken"], expression: Expression): PrefixUnaryExpression {
    return { kind: SyntaxKind.PrefixUnaryExpression, operatorToken, expression: toUnaryExpressionOrHigher(expression), [Syntax.location]: noTextRange };
}

/** @internal */
export function createPostfixUnaryExpression(expression: Expression, operatorToken: PostfixUnaryExpression["operatorToken"]): PostfixUnaryExpression {
    return { kind: SyntaxKind.PostfixUnaryExpression, expression: toLeftHandSideExpressionOrHigher(expression), operatorToken, [Syntax.location]: noTextRange };
}

/** @internal */
export function createBinaryExpression(left: Expression, operatorToken: BinaryExpression["operatorToken"], right: Expression): BinaryExpression {
    const precedence = getBinaryOperatorPrecedence(operatorToken.kind);
    return { kind: SyntaxKind.BinaryExpression, left: toPrecedenceOrHigher(left, precedence), operatorToken, right: toPrecedenceOrHigher(right, precedence + 1), [Syntax.location]: noTextRange };
}

/** @internal */
export function createConditionalExpression(condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression {
    return { kind: SyntaxKind.ConditionalExpression, condition: toPrecedenceOrHigher(condition, BinaryPrecedence.LogicalORExpression), whenTrue: toAssignmentExpressionOrHigher(whenTrue), whenFalse: toAssignmentExpressionOrHigher(whenFalse), [Syntax.location]: noTextRange };
}

/** @internal */
export function createArrowFunction(asyncKeyword: ArrowFunction["asyncKeyword"], parameterList: ReadonlyArray<Identifier>, body: Expression): ArrowFunction {
    return { kind: SyntaxKind.ArrowFunction, asyncKeyword, parameterList, body: toArrowBody(body), [Syntax.location]: noTextRange };
}

/** @internal */
export function createCommaListExpression(expressions: ReadonlyArray<Expression>): CommaListExpression {
    return { kind: SyntaxKind.CommaListExpression, expressions: visitList(expressions, toAssignmentExpressionOrHigher), [Syntax.location]: noTextRange };
}

function leftMost(node: Expression): Expression {
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

function toArrowBody(body: Expression) {
    return leftMost(body).kind === SyntaxKind.ObjectLiteral ? createParenthesizedExpression(body) :
        toAssignmentExpressionOrHigher(body);
}

function toIdentifier(name: Identifier | string): Identifier {
    return typeof name === "string" ? Expr.id(name) : name;
}

function toPrecedenceOrHigher(node: Expression, precedence: BinaryPrecedence): AssignmentExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.ConditionalExpression:
        case SyntaxKind.QueryExpression:
            return BinaryPrecedence.AssignmentExpression >= precedence ? node : createParenthesizedExpression(node);
        case SyntaxKind.BinaryExpression:
            return getBinaryOperatorPrecedence(node.kind) >= precedence ? node : createParenthesizedExpression(node);
        default:
            return toUnaryExpressionOrHigher(node);
    }
}

function toUnaryExpressionOrHigher(node: Expression) {
    return isUnaryExpressionOrHigher(node) ? node : createParenthesizedExpression(node);
}

function toMemberExpressionOrHigher(node: Expression) {
    return isMemberExpressionOrHigher(node) ? node : createParenthesizedExpression(node);
}

function toLeftHandSideExpressionOrHigher(node: Expression) {
    return isLeftHandSideExpressionOrHigher(node) ? node : createParenthesizedExpression(node);
}

function toAssignmentExpressionOrHigher(node: Expression) {
    return isAssignmentExpressionOrHigher(node) ? node : createParenthesizedExpression(node);
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

/** @internal */
export const Expr = Object.freeze({
    token: createToken,
    literal: createTextLiteral,
    id: createIdentifier,
    computedName: createComputedPropertyName,
    paren: createParenthesizedExpression,
    elision: createElision,
    spread: createSpreadElement,
    array: createArrayLiteral,
    propertyAssign: createPropertyAssignment,
    shorthandPropertyAssign: createShorthandPropertyAssignment,
    object: createObjectLiteral,
    new: createNewExpression,
    call: createCallExpression,
    propertyAccess: createPropertyAccessExpression,
    elementAccess: createElementAccessExpression,
    prefix: createPrefixUnaryExpression,
    postfix: createPostfixUnaryExpression,
    binary: createBinaryExpression,
    conditional: createConditionalExpression,
    arrow: createArrowFunction,
    comma: createCommaListExpression
});
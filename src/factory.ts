import { 
    TextRange, TokenKind, TokenNode, Syntax, TextLiteralKind, TokenFlags, TextLiteralNode, 
    Identifier, SyntaxKind, Expression, ComputedPropertyName, ParenthesizedExpression, 
    PropertyName, PropertyDefinition, ShorthandPropertyDefinition, ObjectLiteralElement, 
    ObjectLiteral, AssignmentRestProperty, AssignmentElement, AssignmentProperty, 
    IdentifierReference, AssignmentExpressionOrHigher, ShorthandAssignmentProperty, 
    ObjectAssignmentPatternElement, ObjectAssignmentPattern, BindingIdentifier, 
    BindingRestProperty, BindingElement, BindingProperty, ShorthandBindingProperty, 
    ObjectBindingPatternElement, ObjectBindingPattern, Elision, SpreadElement, 
    ArrayLiteralElement, ArrayLiteral, DestructuringAssignmentTarget, AssignmentRestElement, 
    ArrayAssignmentPatternElement, ArrayAssignmentPattern, BindingName, BindingRestElement, 
    ArrayBindingPatternElement, ArrayBindingPattern, Argument, NewExpression, CallExpression, 
    PropertyAccessExpression, ElementAccessExpression, PrefixUnaryOperator, 
    PrefixUnaryExpression, PostfixUnaryOperator, PostfixUnaryExpression, BinaryOperator, 
    BinaryExpression, ConditionalExpression, AsyncKeyword, Parameter, ArrowFunction, 
    CommaListExpression, QueryBodyClause, FromClause, LetClause, WhereClause, 
    OrderbyClause, OrderbyComparator, GroupClause, JoinClause, SelectClause, QueryExpression, 
    Node, isUnaryExpressionOrHigher, isMemberExpressionOrHigher, 
    isLeftHandSideExpressionOrHigher, isAssignmentExpressionOrHigher, AssignmentPattern, 
    AssignmentExpression, AssignmentOperator, LeftHandSideExpressionOrHigher, 
    BinaryExpressionOrHigher, AwaitKeyword, SelectOrGroupClause, SequenceBinding, HierarchyAxisKeyword
} from "./types";
import { visitList } from "./visitor";
import { getBinaryOperatorPrecedence, BinaryPrecedence, assertFail } from "./utils";

const noTextRange: TextRange = { pos: 0, end: 0 };

/** @internal */
export function createTextRange(pos: number, end: number): TextRange {
    return pos === 0 && end === 0 ? noTextRange : { pos, end };
}

/** @internal */
export const Expr = Object.freeze({
    token<Kind extends TokenKind>(kind: Kind): TokenNode<Kind> {
        return { kind, [Syntax.location]: noTextRange };
    },
    literal<Kind extends TextLiteralKind>(kind: Kind, text: string, flags: TokenFlags): TextLiteralNode<Kind> {
        return { kind, text, flags, [Syntax.location]: noTextRange };
    },
    identifier(text: string): Identifier {
        return { kind: SyntaxKind.Identifier, text, [Syntax.location]: noTextRange };
    },
    computedPropertyName(expression: Expression): ComputedPropertyName {
        return { kind: SyntaxKind.ComputedPropertyName, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    },
    paren(expression: Expression): ParenthesizedExpression {
        return { kind: SyntaxKind.ParenthesizedExpression, expression, [Syntax.location]: noTextRange };
    },
    propertyDefinition(name: PropertyName | string, initializer: Expression): PropertyDefinition {
        name = possiblyIdentifier(name);
        return { kind: SyntaxKind.PropertyDefinition, name, initializer: toAssignmentExpressionOrHigher(initializer), [Syntax.location]: noTextRange };
    },
    shorthandPropertyDefinition(name: Identifier | string): ShorthandPropertyDefinition {
        name = possiblyIdentifier(name);
        return { kind: SyntaxKind.ShorthandPropertyDefinition, name, [Syntax.location]: noTextRange };
    },
    objectLiteral(properties: ReadonlyArray<ObjectLiteralElement>): ObjectLiteral {
        return { kind: SyntaxKind.ObjectLiteral, properties, [Syntax.location]: noTextRange };
    },
    assignmentRestProperty(expression: Expression): AssignmentRestProperty {
        return { kind: SyntaxKind.AssignmentRestProperty, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    },
    assignmentProperty(propertyName: PropertyName | string, assignmentElement: AssignmentElement): AssignmentProperty {
        propertyName = possiblyIdentifier(propertyName);
        return { kind: SyntaxKind.AssignmentProperty, propertyName, assignmentElement, [Syntax.location]: noTextRange };
    },
    shorthandAssignmentProperty(name: IdentifierReference | string, initializer: AssignmentExpressionOrHigher | undefined): ShorthandAssignmentProperty {
        name = possiblyIdentifier(name);
        return { kind: SyntaxKind.ShorthandAssignmentProperty, name, initializer, [Syntax.location]: noTextRange };
    },
    objectAssignmentPattern(properties: ReadonlyArray<ObjectAssignmentPatternElement>, rest: AssignmentRestProperty | undefined): ObjectAssignmentPattern {
        return { kind: SyntaxKind.ObjectAssignmentPattern, properties, rest, [Syntax.location]: noTextRange };
    },
    bindingRestProperty(name: BindingIdentifier | string): BindingRestProperty {
        name = possiblyIdentifier(name);
        return { kind: SyntaxKind.BindingRestProperty, name, [Syntax.location]: noTextRange };
    },
    bindingProperty(propertyName: PropertyName | string, bindingElement: BindingElement): BindingProperty {
        propertyName = possiblyIdentifier(propertyName);
        return { kind: SyntaxKind.BindingProperty, propertyName, bindingElement, [Syntax.location]: noTextRange };
    },
    shorthandBindingProperty(name: BindingIdentifier | string, initializer: Expression | undefined): ShorthandBindingProperty {
        name = possiblyIdentifier(name);
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.ShorthandBindingProperty, name, initializer, [Syntax.location]: noTextRange };
    },
    objectBindingPattern(properties: ReadonlyArray<ObjectBindingPatternElement>, rest: BindingRestProperty | undefined): ObjectBindingPattern {
        return { kind: SyntaxKind.ObjectBindingPattern, properties, rest, [Syntax.location]: noTextRange };
    },
    elision(): Elision {
        return { kind: SyntaxKind.Elision, [Syntax.location]: noTextRange };
    },
    spreadElement(expression: Expression): SpreadElement {
        return { kind: SyntaxKind.SpreadElement, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    },
    arrayLiteral(elements: ReadonlyArray<ArrayLiteralElement | Expression>): ArrayLiteral {
        return { kind: SyntaxKind.ArrayLiteral, elements: visitList(elements, toArrayLiteralElement), [Syntax.location]: noTextRange };
    },
    assignmentRestElement(target: DestructuringAssignmentTarget): AssignmentRestElement {
        return { kind: SyntaxKind.AssignmentRestElement, target, [Syntax.location]: noTextRange };
    },
    assignmentElement(target: DestructuringAssignmentTarget, initializer: Expression | undefined): AssignmentElement {
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.AssignmentElement, target, initializer, [Syntax.location]: noTextRange };
    },
    arrayAssignmentPattern(elements: ReadonlyArray<ArrayAssignmentPatternElement>, rest: AssignmentRestElement | undefined): ArrayAssignmentPattern {
        return { kind: SyntaxKind.ArrayAssignmentPattern, elements, rest, [Syntax.location]: noTextRange };
    },
    bindingElement(name: BindingName | string, initializer?: Expression): BindingElement {
        name = possiblyIdentifier(name);
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.BindingElement, name, initializer, [Syntax.location]: noTextRange };
    },
    bindingRestElement(name: BindingName | string): BindingRestElement {
        name = possiblyIdentifier(name);
        return { kind: SyntaxKind.BindingRestElement, name, [Syntax.location]: noTextRange };
    },
    arrayBindingPattern(elements: ReadonlyArray<ArrayBindingPatternElement>, rest: BindingRestElement | undefined): ArrayBindingPattern {
        return { kind: SyntaxKind.ArrayBindingPattern, elements, rest, [Syntax.location]: noTextRange };
    },
    new(expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression> | undefined): NewExpression {
        expression = toMemberExpressionOrHigher(possiblyIdentifier(expression));
        return { kind: SyntaxKind.NewExpression, expression, argumentList: argumentList && visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
    },
    call(expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression>): CallExpression {
        expression = toLeftHandSideExpressionOrHigher(possiblyIdentifier(expression));
        return { kind: SyntaxKind.CallExpression, expression, argumentList: visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
    },
    property(expression: Expression, name: Identifier | string): PropertyAccessExpression {
        return { kind: SyntaxKind.PropertyAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), name: possiblyIdentifier(name), [Syntax.location]: noTextRange };
    },
    index(expression: Expression, argumentExpression: Expression): ElementAccessExpression {
        return { kind: SyntaxKind.ElementAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), argumentExpression, [Syntax.location]: noTextRange };
    },
    prefixUnary(operatorToken: PrefixUnaryOperator, expression: Expression): PrefixUnaryExpression {
        return { kind: SyntaxKind.PrefixUnaryExpression, operatorToken, expression: toUnaryExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    },
    postfixUnary(expression: Expression, operatorToken: PostfixUnaryOperator): PostfixUnaryExpression {
        return { kind: SyntaxKind.PostfixUnaryExpression, expression: toLeftHandSideExpressionOrHigher(expression), operatorToken, [Syntax.location]: noTextRange };
    },
    binary(left: Expression, operatorToken: BinaryOperator, right: Expression): BinaryExpression {
        const precedence = getBinaryOperatorPrecedence(operatorToken.kind);
        return { kind: SyntaxKind.BinaryExpression, left: toBinaryExpressionOrHigher(left, precedence), operatorToken, right: toBinaryExpressionOrHigher(right, precedence + 1), [Syntax.location]: noTextRange };
    },
    assign(left: LeftHandSideExpressionOrHigher, operatorToken: AssignmentOperator, right: Expression): AssignmentExpression {
        return { kind: SyntaxKind.AssignmentExpression, left, operatorToken, right: toAssignmentExpressionOrHigher(right), [Syntax.location]: noTextRange };
    },
    conditional(condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression {
        return { kind: SyntaxKind.ConditionalExpression, condition: toBinaryExpressionOrHigher(condition, BinaryPrecedence.LogicalORExpression), whenTrue: toAssignmentExpressionOrHigher(whenTrue), whenFalse: toAssignmentExpressionOrHigher(whenFalse), [Syntax.location]: noTextRange };
    },
    arrow(asyncKeyword: AsyncKeyword | undefined, parameterList: ReadonlyArray<BindingElement | Identifier | string>, rest: BindingRestElement | undefined, body: Expression): ArrowFunction {
        return { kind: SyntaxKind.ArrowFunction, asyncKeyword, parameterList: visitList(parameterList, toParameter), rest, body: toArrowBody(body), [Syntax.location]: noTextRange };
    },
    comma(expressions: ReadonlyArray<Expression>): CommaListExpression {
        return { kind: SyntaxKind.CommaListExpression, expressions: visitList(expressions, toAssignmentExpressionOrHigher), [Syntax.location]: noTextRange };
    },
    var(name: BindingName | string, initializer?: Expression): BindingElement {
        return Expr.bindingElement(name, initializer);
    },
    param(name: BindingName | string, initializer?: Expression): BindingElement {
        return Expr.bindingElement(name, initializer);
    },
    rest(name: BindingName | string): BindingRestElement {
        return Expr.bindingRestElement(name);
    },
    sequenceBinding(awaitKeyword: AwaitKeyword | undefined, name: BindingIdentifier | string, hierarchyAxisKeyword: HierarchyAxisKeyword | undefined, expression: Expression, withHierarchy: Expression | undefined): SequenceBinding {
        name = possiblyIdentifier(name);
        return { kind: SyntaxKind.SequenceBinding, awaitKeyword, name, hierarchyAxisKeyword, expression: toAssignmentExpressionOrHigher(expression), withHierarchy: withHierarchy && toAssignmentExpressionOrHigher(withHierarchy), [Syntax.location]: noTextRange };
    },
    fromClause(outerClause: QueryBodyClause | undefined, sequenceBinding: SequenceBinding): FromClause {
        return { kind: SyntaxKind.FromClause, outerClause, sequenceBinding, [Syntax.location]: noTextRange };
    },
    letClause(outerClause: QueryBodyClause, name: Identifier, expression: Expression): LetClause {
        return { kind: SyntaxKind.LetClause, outerClause, name, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    },
    whereClause(outerClause: QueryBodyClause, expression: Expression): WhereClause {
        return { kind: SyntaxKind.WhereClause, outerClause, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    },
    orderbyClause(outerClause: QueryBodyClause, comparators: OrderbyClause["comparators"]): OrderbyClause {
        return { kind: SyntaxKind.OrderbyClause, outerClause, comparators, [Syntax.location]: noTextRange };
    },
    orderbyComparator(expression: Expression, directionToken: OrderbyComparator["directionToken"], usingExpression: Expression | undefined): OrderbyComparator {
        return { kind: SyntaxKind.OrderbyComparator, expression: toAssignmentExpressionOrHigher(expression), directionToken, usingExpression: usingExpression && toAssignmentExpressionOrHigher(usingExpression), [Syntax.location]: noTextRange };
    },
    groupClause(outerClause: QueryBodyClause, elementSelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): GroupClause {
        return { kind: SyntaxKind.GroupClause, outerClause, elementSelector: toAssignmentExpressionOrHigher(elementSelector), keySelector: toAssignmentExpressionOrHigher(keySelector), into, [Syntax.location]: noTextRange };
    },
    joinClause(outerClause: QueryBodyClause, sequenceBinding: SequenceBinding, outerKeySelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): JoinClause {
        return { kind: SyntaxKind.JoinClause, outerClause, sequenceBinding, outerKeySelector: toAssignmentExpressionOrHigher(outerKeySelector), keySelector: toAssignmentExpressionOrHigher(keySelector), into, [Syntax.location]: noTextRange };
    },
    selectClause(outerClause: QueryBodyClause, expression: Expression, into: BindingIdentifier | undefined): SelectClause {
        return { kind: SyntaxKind.SelectClause, outerClause, expression: toAssignmentExpressionOrHigher(expression), into, [Syntax.location]: noTextRange };
    },
    query(query: SelectOrGroupClause): QueryExpression {
        if (query.kind !== SyntaxKind.SelectClause && 
            query.kind !== SyntaxKind.GroupClause ||
            query.into) return assertFail("A query must end with either a 'select' or 'group' clause.");
        return { kind: SyntaxKind.QueryExpression, query, [Syntax.location]: noTextRange };
    }
});

function copyLocation<T extends Node>(node: T, source: Syntax): T {
    node[Syntax.location] = source[Syntax.location];
    return node;
}

export const ExprUpdate = Object.freeze({
    computedPropertyName(node: ComputedPropertyName, expression: Expression): ComputedPropertyName {
        return node.expression !== expression  ? copyLocation(Expr.computedPropertyName(expression), node) : node;
    },
    paren(node: ParenthesizedExpression, expression: Expression): ParenthesizedExpression {
        return node.expression !== expression ? copyLocation(Expr.paren(expression), node) : node;
    },
    propertyDefinition(node: PropertyDefinition, name: PropertyName | string, initializer: Expression): PropertyDefinition {
        return node.name !== name || node.initializer !== initializer ? copyLocation(Expr.propertyDefinition(name, initializer), node) : node;
    },
    shorthandPropertyDefinition(node: ShorthandPropertyDefinition, name: Identifier | string): ShorthandPropertyDefinition {
        return node.name !== name ? copyLocation(Expr.shorthandPropertyDefinition(name), node) : node;
    },
    objectLiteral(node: ObjectLiteral, properties: ReadonlyArray<ObjectLiteralElement>): ObjectLiteral {
        return node.properties !== properties ? copyLocation(Expr.objectLiteral(properties), node) : node;
    },
    assignmentRestProperty(node: AssignmentRestProperty, expression: Expression): AssignmentRestProperty {
        return node.expression !== expression ? copyLocation(Expr.assignmentRestProperty(expression), node) : node;
    },
    assignmentProperty(node: AssignmentProperty, propertyName: PropertyName | string, assignmentElement: AssignmentElement): AssignmentProperty {
        return node.propertyName !== propertyName || node.assignmentElement !== assignmentElement ? copyLocation(Expr.assignmentProperty(propertyName, assignmentElement), node): node;
    },
    shorthandAssignmentProperty(node: ShorthandAssignmentProperty, name: IdentifierReference | string, initializer: AssignmentExpressionOrHigher | undefined): ShorthandAssignmentProperty {
        return node.name !== name || node.initializer !== initializer ? copyLocation(Expr.shorthandAssignmentProperty(name, initializer), node): node;
    },
    objectAssignmentPattern(node: ObjectAssignmentPattern, properties: ReadonlyArray<ObjectAssignmentPatternElement>, rest: AssignmentRestProperty | undefined): ObjectAssignmentPattern {
        return node.properties !== properties || node.rest !== rest ? copyLocation(Expr.objectAssignmentPattern(properties, rest), node): node;
    },
    bindingRestProperty(node: BindingRestProperty, name: BindingIdentifier | string): BindingRestProperty {
        return node.name !== name ? copyLocation(Expr.bindingRestProperty(name), node): node;
    },
    bindingProperty(node: BindingProperty, propertyName: PropertyName | string, bindingElement: BindingElement): BindingProperty {
        return node.propertyName !== propertyName || node.bindingElement !== bindingElement ? copyLocation(Expr.bindingProperty(propertyName, bindingElement), node): node;
    },
    shorthandBindingProperty(node: ShorthandBindingProperty, name: BindingIdentifier | string, initializer: Expression | undefined): ShorthandBindingProperty {
        return node.name !== name || node.initializer !== initializer ? copyLocation(Expr.shorthandBindingProperty(name, initializer), node): node;
    },
    objectBindingPattern(node: ObjectBindingPattern, properties: ReadonlyArray<ObjectBindingPatternElement>, rest: BindingRestProperty | undefined): ObjectBindingPattern {
        return node.properties !== properties || node.rest !== rest ? copyLocation(Expr.objectBindingPattern(properties, rest), node): node;
    },
    spreadElement(node: SpreadElement, expression: Expression): SpreadElement {
        return node.expression !== expression ? copyLocation(Expr.spreadElement(expression), node): node;
    },
    arrayLiteral(node: ArrayLiteral, elements: ReadonlyArray<ArrayLiteralElement | Expression>): ArrayLiteral {
        return node.elements !== elements ? copyLocation(Expr.arrayLiteral(elements), node): node;
    },
    assignmentRestElement(node: AssignmentRestElement, target: DestructuringAssignmentTarget): AssignmentRestElement {
        return node.target !== target ? copyLocation(Expr.assignmentRestElement(target), node): node;
    },
    assignmentElement(node: AssignmentElement, target: DestructuringAssignmentTarget, initializer: Expression | undefined): AssignmentElement {
        return node.target !== target || node.initializer !== initializer ? copyLocation(Expr.assignmentElement(target, initializer), node): node;
    },
    arrayAssignmentPattern(node: ArrayAssignmentPattern, elements: ReadonlyArray<ArrayAssignmentPatternElement>, rest: AssignmentRestElement | undefined): ArrayAssignmentPattern {
        return node.elements !== elements || node.rest !== rest ? copyLocation(Expr.arrayAssignmentPattern(elements, rest), node): node;
    },
    bindingElement(node: BindingElement, name: BindingName | string, initializer?: Expression): BindingElement {
        return node.name !== name || node.initializer !== initializer ? copyLocation(Expr.bindingElement(name, initializer), node): node;
    },
    bindingRestElement(node: BindingRestElement, name: BindingName | string): BindingRestElement {
        return node.name !== name ? copyLocation(Expr.bindingRestElement(name), node): node;
    },
    arrayBindingPattern(node: ArrayBindingPattern, elements: ReadonlyArray<ArrayBindingPatternElement>, rest: BindingRestElement | undefined): ArrayBindingPattern {
        return node.elements !== elements || node.rest !== rest ? copyLocation(Expr.arrayBindingPattern(elements, rest), node): node;
    },
    new(node: NewExpression, expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression> | undefined): NewExpression {
        return node.expression !== expression || node.argumentList !== argumentList ? copyLocation(Expr.new(expression, argumentList), node): node;
    },
    call(node: CallExpression, expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression>): CallExpression {
        return node.expression !== expression || node.argumentList !== argumentList ? copyLocation(Expr.call(expression, argumentList), node): node;
    },
    property(node: PropertyAccessExpression, expression: Expression, name: Identifier | string): PropertyAccessExpression {
        return node.expression !== expression || node.name !== name ? copyLocation(Expr.property(expression, name), node): node;
    },
    index(node: ElementAccessExpression, expression: Expression, argumentExpression: Expression): ElementAccessExpression {
        return node.expression !== expression || node.argumentExpression !== argumentExpression ? copyLocation(Expr.index(expression, argumentExpression), node): node;
    },
    prefixUnary(node: PrefixUnaryExpression, operatorToken: PrefixUnaryOperator, expression: Expression): PrefixUnaryExpression {
        if (node.operatorToken.kind !== operatorToken.kind) return assertFail("Cannot change operator kind");
        return node.operatorToken !== operatorToken || node.expression !== expression ? copyLocation(Expr.prefixUnary(operatorToken, expression), node): node;
    },
    postfixUnary(node: PostfixUnaryExpression, expression: Expression, operatorToken: PostfixUnaryOperator): PostfixUnaryExpression {
        if (node.operatorToken.kind !== operatorToken.kind) return assertFail("Cannot change operator kind");
        return node.expression !== expression || node.operatorToken !== operatorToken ? copyLocation(Expr.postfixUnary(expression, operatorToken), node): node;
    },
    binary(node: BinaryExpression, left: Expression, operatorToken: BinaryOperator, right: Expression): BinaryExpression {
        if (node.operatorToken.kind !== operatorToken.kind) return assertFail("Cannot change operator kind");
        return node.left !== left || node.operatorToken !== operatorToken || node.right !== right ? copyLocation(Expr.binary(left, operatorToken, right), node): node;
    },
    assign(node: AssignmentExpression, left: LeftHandSideExpressionOrHigher, operatorToken: AssignmentOperator, right: Expression): AssignmentExpression {
        if (node.operatorToken.kind !== operatorToken.kind) return assertFail("Cannot change operator kind");
        return node.left !== left || node.operatorToken !== operatorToken || node.right !== right ? copyLocation(Expr.assign(left, operatorToken, right), node): node;
    },
    conditional(node: ConditionalExpression, condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression {
        return node.condition !== condition || node.whenTrue !== whenTrue || node.whenFalse !== whenFalse ? copyLocation(Expr.conditional(condition, whenTrue, whenFalse), node): node;
    },
    arrow(node: ArrowFunction, asyncKeyword: AsyncKeyword | undefined, parameterList: ReadonlyArray<Parameter | Identifier | string>, rest: BindingRestElement | undefined, body: Expression): ArrowFunction {
        return node.asyncKeyword !== asyncKeyword || node.parameterList !== parameterList || node.rest !== rest || node.body !== body ? copyLocation(Expr.arrow(asyncKeyword, parameterList, rest, body), node): node;
    },
    comma(node: CommaListExpression, expressions: ReadonlyArray<Expression>): CommaListExpression {
        return node.expressions !== expressions ? copyLocation(Expr.comma(expressions), node): node;
    },
    sequenceBinding(node: SequenceBinding, awaitKeyword: AwaitKeyword | undefined, name: BindingIdentifier | string, hierarchyAxisKeyword: HierarchyAxisKeyword | undefined, expression: Expression, withHierarchy: Expression | undefined): SequenceBinding {
        return node.awaitKeyword !== awaitKeyword || node.name !== name || node.hierarchyAxisKeyword !== hierarchyAxisKeyword || node.expression !== expression || node.withHierarchy !== withHierarchy ? copyLocation(Expr.sequenceBinding(awaitKeyword, name, hierarchyAxisKeyword, expression, withHierarchy), node) : node;
    },
    fromClause(node: FromClause, outerClause: QueryBodyClause | undefined, sequenceBinding: SequenceBinding): FromClause {
        return node.outerClause !== outerClause || node.sequenceBinding !== sequenceBinding ? copyLocation(Expr.fromClause(outerClause, sequenceBinding), node): node;
    },
    letClause(node: LetClause, outerClause: QueryBodyClause, name: Identifier, expression: Expression): LetClause {
        return node.outerClause !== outerClause || node.name !== name || node.expression !== expression ? copyLocation(Expr.letClause(outerClause, name, expression), node): node;
    },
    whereClause(node: WhereClause, outerClause: QueryBodyClause, expression: Expression): WhereClause {
        return node.outerClause !== outerClause || node.expression !== expression ? copyLocation(Expr.whereClause(outerClause, expression), node): node;
    },
    orderbyClause(node: OrderbyClause, outerClause: QueryBodyClause, comparators: OrderbyClause["comparators"]): OrderbyClause {
        return node.outerClause !== outerClause || node.comparators !== comparators ? copyLocation(Expr.orderbyClause(outerClause, comparators), node): node;
    },
    orderbyComparator(node: OrderbyComparator, expression: Expression, directionToken: OrderbyComparator["directionToken"], usingExpression: Expression | undefined): OrderbyComparator {
        return node.expression !== expression || node.directionToken !== directionToken || node.usingExpression !== usingExpression ? copyLocation(Expr.orderbyComparator(expression, directionToken, usingExpression), node): node;
    },
    groupClause(node: GroupClause, outerClause: QueryBodyClause, elementSelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): GroupClause {
        return node.outerClause !== outerClause || node.elementSelector !== elementSelector || node.keySelector !== keySelector || node.into !== into ? copyLocation(Expr.groupClause(outerClause, elementSelector, keySelector, into), node): node;
    },
    joinClause(node: JoinClause, outerClause: QueryBodyClause, sequenceBinding: SequenceBinding, outerKeySelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): JoinClause {
        return node.outerClause !== outerClause || node.sequenceBinding !== sequenceBinding || node.outerKeySelector !== outerKeySelector || node.keySelector !== keySelector || node.into !== into ? copyLocation(Expr.joinClause(outerClause, sequenceBinding, outerKeySelector, keySelector, into), node): node;
    },
    selectClause(node: SelectClause, outerClause: QueryBodyClause, expression: Expression, into: BindingIdentifier | undefined): SelectClause {
        return node.outerClause !== outerClause || node.expression !== expression || node.into !== into ? copyLocation(Expr.selectClause(outerClause, expression, into), node): node;
    },
    query(node: QueryExpression, query: GroupClause | SelectClause): QueryExpression {
        return node.query !== query ? copyLocation(Expr.query(query), node): node;
    },
});

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

function toParameter(parameter: BindingElement | Identifier | string) {
    if (typeof parameter === "string") parameter = Expr.identifier(parameter);
    if (parameter.kind === SyntaxKind.Identifier) parameter = Expr.var(parameter);
    return parameter;
}

function toArrowBody(body: Expression) {
    return leftMost(body).kind === SyntaxKind.ObjectLiteral ? Expr.paren(body) :
        toAssignmentExpressionOrHigher(body);
}

function possiblyIdentifier<T extends Node>(name: T | string): T | Identifier {
    return typeof name === "string" ? Expr.identifier(name) : name;
}

function toBinaryExpressionOrHigher(node: Expression, precedence: BinaryPrecedence): BinaryExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.BinaryExpression:
            return getBinaryOperatorPrecedence(node.kind) >= precedence ? node : Expr.paren(node);
        default:
            return toUnaryExpressionOrHigher(node);
    }
}

function toUnaryExpressionOrHigher(node: Expression) {
    return isUnaryExpressionOrHigher(node) ? node : Expr.paren(node);
}

function toMemberExpressionOrHigher(node: Expression) {
    return isMemberExpressionOrHigher(node) ? node : Expr.paren(node);
}

function toLeftHandSideExpressionOrHigher(node: Expression) {
    return isLeftHandSideExpressionOrHigher(node) ? node : Expr.paren(node);
}

function toAssignmentExpressionOrHigher(node: Expression) {
    return isAssignmentExpressionOrHigher(node) ? node : Expr.paren(node);
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

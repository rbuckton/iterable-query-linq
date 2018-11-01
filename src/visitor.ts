import {
    FromClause, LetClause, WhereClause, OrderbyClause, GroupClause, JoinClause, SelectClause,
    QueryBodyClause, SyntaxKind, QueryExpression, BinaryExpression, ConditionalExpression,
    PrefixUnaryExpression, PostfixUnaryExpression, ArrowFunction, PropertyAccessExpression,
    ElementAccessExpression, ObjectLiteral, ArrayLiteral, PropertyDefinition, ObjectLiteralElement,
    SpreadElement, ArrayLiteralElement, PropertyName, ComputedPropertyName, Identifier,
    CommaListExpression, ParenthesizedExpression, NewExpression, CallExpression, Argument,
    ShorthandPropertyDefinition, Syntax, Expression, AssignmentExpressionOrHigher,
    BinaryExpressionOrHigher, UnaryExpressionOrHigher, LeftHandSideExpressionOrHigher,
    MemberExpressionOrHigher, PrimaryExpression, ObjectAssignmentPatternElement,
    ObjectBindingPatternElement, ArrayBindingPatternElement, ArrayAssignmentPatternElement,
    BindingName, BindingPattern, Keyword, Punctuation, OrderbyComparator, SelectOrGroupClause, 
    ThisExpression, BooleanLiteral, NullLiteral, StringLiteral, NumberLiteral, 
    RegularExpressionLiteral, isKeyword, KeywordKind, PunctuationKind, TokenNode, 
    AssignmentExpression, Parameter, TokenKind, Elision, ObjectAssignmentPattern, 
    ArrayAssignmentPattern, ObjectBindingPattern, BindingRestProperty, BindingProperty, 
    ShorthandBindingProperty, AssignmentRestProperty, AssignmentProperty, 
    ShorthandAssignmentProperty, ArrayBindingPattern, BindingElement, BindingRestElement, 
    AssignmentElement, AssignmentRestElement, SequenceBinding
} from "./types";
import { ExprUpdate } from "./factory";
import { assertFail, assertNever } from "./utils";

/** @internal */
export function visitList<T, U>(list: ReadonlyArray<T>, visitor: (element: T) => U): ReadonlyArray<U>;
export function visitList<T, U, This>(list: ReadonlyArray<T>, visitor: (this: This, element: T) => U, thisArgument: This): ReadonlyArray<U>;
export function visitList<T>(list: ReadonlyArray<T>, visitor: (element: T) => T, thisArgument?: any): ReadonlyArray<T> {
    let result: T[] | undefined;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const visited = thisArgument ? visitor.call(thisArgument, item) : visitor(item);
        if (result) {
            result.push(visited);
        }
        else if (visited !== item) {
            result = list.slice(0, i);
            result.push(visited);
        }
    }
    return result || list;
}

/** @internal */
export abstract class ExpressionVisitor {
    // Aggregates

    protected visitPrimaryExpression(node: PrimaryExpression): PrimaryExpression {
        switch (node.kind) {
            case SyntaxKind.ThisKeyword: return this.visitThisExpression(node);
            case SyntaxKind.Identifier: return this.visitIdentifierReference(node);
            case SyntaxKind.ObjectLiteral: return this.visitObjectLiteral(node);
            case SyntaxKind.ArrayLiteral: return this.visitArrayLiteral(node);
            case SyntaxKind.ParenthesizedExpression: return this.visitParenthesizedExpression(node);
            case SyntaxKind.NewExpression: return this.visitNewExpression(node);
            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword: return this.visitBooleanLiteral(node);
            case SyntaxKind.NullKeyword: return this.visitNullLiteral(node);
            case SyntaxKind.StringLiteral: return this.visitStringLiteral(node);
            case SyntaxKind.NumberLiteral: return this.visitNumberLiteral(node);
            case SyntaxKind.RegularExpressionLiteral: return this.visitRegularExpressionLiteral(node);
            case SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList: return assertFail("Should not exist outside of parse.");
            default: return assertNever(node);
        }
    }

    protected visitMemberExpressionOrHigher(node: MemberExpressionOrHigher): MemberExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.PropertyAccessExpression: return this.visitPropertyAccessExpression(node);
            case SyntaxKind.ElementAccessExpression: return this.visitElementAccessExpression(node);
            default: return this.visitPrimaryExpression(node);
        }
    }

    protected visitLeftHandSideExpressionOrHigher(node: LeftHandSideExpressionOrHigher): LeftHandSideExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.CallExpression: return this.visitCallExpression(node);
            case SyntaxKind.ObjectAssignmentPattern: return this.visitObjectAssignmentPattern(node);
            case SyntaxKind.ArrayAssignmentPattern: return this.visitArrayAssignmentPattern(node);
            default: return this.visitMemberExpressionOrHigher(node);
        }
    }

    protected visitUnaryExpressionOrHigher(node: UnaryExpressionOrHigher): UnaryExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.PrefixUnaryExpression: return this.visitPrefixUnaryExpression(node);
            case SyntaxKind.PostfixUnaryExpression: return this.visitPostfixUnaryExpression(node);
            default: return this.visitLeftHandSideExpressionOrHigher(node);
        }
    }

    protected visitBinaryExpressionOrHigher(node: BinaryExpressionOrHigher): BinaryExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.BinaryExpression: return this.visitBinaryExpression(node);
            default: return this.visitUnaryExpressionOrHigher(node);
        }
    }

    protected visitAssignmentExpressionOrHigher(node: AssignmentExpressionOrHigher): AssignmentExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.ArrowFunction: return this.visitArrowFunction(node);
            case SyntaxKind.AssignmentExpression: return this.visitAssignmentExpression(node);
            case SyntaxKind.ConditionalExpression: return this.visitConditionalExpression(node);
            case SyntaxKind.QueryExpression: return this.visitQueryExpression(node);
            default: return this.visitBinaryExpressionOrHigher(node);
        }
    }

    protected visitExpression(node: Expression): Expression {
        switch (node.kind) {
            case SyntaxKind.CommaListExpression: return this.visitCommaListExpression(node);
            default: return this.visitAssignmentExpressionOrHigher(node);
        }
    }

    protected visitQueryBodyClause(node: QueryBodyClause): QueryBodyClause {
        switch (node.kind) {
            case SyntaxKind.FromClause: return this.visitFromClause(node);
            case SyntaxKind.LetClause: return this.visitLetClause(node);
            case SyntaxKind.WhereClause: return this.visitWhereClause(node);
            case SyntaxKind.OrderbyClause: return this.visitOrderbyClause(node);
            case SyntaxKind.GroupClause: return this.visitGroupClause(node);
            case SyntaxKind.JoinClause: return this.visitJoinClause(node);
            case SyntaxKind.SelectClause: return this.visitSelectClause(node);
        }
    }

    protected visitOrderByComparators(nodes: ReadonlyArray<OrderbyComparator>): ReadonlyArray<OrderbyComparator> {
        return visitList(nodes, this.visitOrderbyComparator, this);
    }

    protected visitTerminalClause(node: SelectOrGroupClause): SelectOrGroupClause {
        const clause = this.visitQueryBodyClause(node);
        if (clause.kind !== SyntaxKind.SelectClause && 
            clause.kind !== SyntaxKind.GroupClause ||
            clause.into) return assertFail("A query must end with either a 'select' or 'group' clause.");
        return clause;
    }

    protected visitCommaListExpressionElements(nodes: ReadonlyArray<AssignmentExpressionOrHigher>): ReadonlyArray<AssignmentExpressionOrHigher> {
        return visitList(nodes, this.visitAssignmentExpressionOrHigher, this);
    }

    protected visitObjectLiteralElements(nodes: ReadonlyArray<ObjectLiteralElement>): ReadonlyArray<ObjectLiteralElement> {
        return visitList(nodes, this.visitObjectLiteralElement, this);
    }

    protected visitObjectLiteralElement(node: ObjectLiteralElement): ObjectLiteralElement {
        switch (node.kind) {
            case SyntaxKind.PropertyDefinition: return this.visitPropertyDefinition(node);
            case SyntaxKind.ShorthandPropertyDefinition: return this.visitShorthandPropertyDefinition(node);
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
            case SyntaxKind.CoverInitializedName: return assertFail("Should not exist outside of parse.");
            default: return assertNever(node);
        }
    }

    protected visitObjectAssignmentPatternElements(nodes: ReadonlyArray<ObjectAssignmentPatternElement>): ReadonlyArray<ObjectAssignmentPatternElement> {
        return visitList(nodes, this.visitObjectAssignmentPatternElement, this);
    }

    protected visitObjectAssignmentPatternElement(node: ObjectAssignmentPatternElement): ObjectAssignmentPatternElement {
        switch (node.kind) {
            case SyntaxKind.AssignmentProperty: return this.visitAssignmentProperty(node);
            case SyntaxKind.ShorthandAssignmentProperty: return this.visitShorthandAssignmentProperty(node);
            default: return assertNever(node);
        }
    }

    protected visitObjectBindingPatternElements(nodes: ReadonlyArray<ObjectBindingPatternElement>): ReadonlyArray<ObjectBindingPatternElement> {
        return visitList(nodes, this.visitObjectBindingPatternElement, this);
    }

    protected visitObjectBindingPatternElement(node: ObjectBindingPatternElement): ObjectBindingPatternElement {
        switch (node.kind) {
            case SyntaxKind.BindingProperty: return this.visitBindingProperty(node);
            case SyntaxKind.ShorthandBindingProperty: return this.visitShorthandBindingProperty(node);
            default: return assertNever(node);
        }
    }

    protected visitArrayLiteralElements(nodes: ReadonlyArray<ArrayLiteralElement>): ReadonlyArray<ArrayLiteralElement> {
        return visitList(nodes, this.visitArrayLiteralElement, this);
    }

    protected visitArrayLiteralElement(node: ArrayLiteralElement): ArrayLiteralElement {
        switch (node.kind) {
            case SyntaxKind.Elision: return this.visitElision(node);
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
            default: return this.visitAssignmentExpressionOrHigher(node);
        }
    }

    protected visitArrayBindingPatternElements(nodes: ReadonlyArray<ArrayBindingPatternElement>): ReadonlyArray<ArrayBindingPatternElement> {
        return visitList(nodes, this.visitArrayBindingPatternElement, this);
    }

    protected visitArrayBindingPatternElement(node: ArrayBindingPatternElement): ArrayBindingPatternElement {
        switch (node.kind) {
            case SyntaxKind.Elision: return this.visitElision(node);
            case SyntaxKind.BindingElement: return this.visitBindingElement(node);
            default: return assertNever(node);
        }
    }

    protected visitArrayAssignmentPatternElements(nodes: ReadonlyArray<ArrayAssignmentPatternElement>): ReadonlyArray<ArrayAssignmentPatternElement> {
        return visitList(nodes, this.visitArrayAssignmentPatternElement, this);
    }

    protected visitArrayAssignmentPatternElement(node: ArrayAssignmentPatternElement): ArrayAssignmentPatternElement {
        switch (node.kind) {
            case SyntaxKind.Elision: return this.visitElision(node);
            case SyntaxKind.AssignmentElement: return this.visitAssignmentElement(node);
            default: return assertNever(node);
        }
    }

    protected visitPropertyName(node: PropertyName): PropertyName {
        switch (node.kind) {
            case SyntaxKind.Identifier: return this.visitBindingIdentifier(node);
            case SyntaxKind.StringLiteral: return this.visitStringLiteral(node);
            case SyntaxKind.NumberLiteral: return this.visitNumberLiteral(node);
            case SyntaxKind.ComputedPropertyName: return this.visitComputedPropertyName(node);
            default: return assertNever(node);
        }
    }

    protected visitBindingPattern(node: BindingPattern): BindingPattern {
        switch (node.kind) {
            case SyntaxKind.ObjectBindingPattern: return this.visitObjectBindingPattern(node);
            case SyntaxKind.ArrayBindingPattern: return this.visitArrayBindingPattern(node);
            default: return assertNever(node);
        }
    }

    protected visitBindingName(node: BindingName): BindingName {
        switch (node.kind) {
            case SyntaxKind.Identifier: return this.visitBindingIdentifier(node);
            case SyntaxKind.ObjectBindingPattern:
            case SyntaxKind.ArrayBindingPattern:
                return this.visitBindingPattern(node);
        }
    }

    protected visitArguments(nodes: ReadonlyArray<Argument>): ReadonlyArray<Argument> {
        return visitList(nodes, this.visitArgument, this);
    }

    protected visitArgument(node: Argument): Argument {
        switch (node.kind) {
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
            default: return this.visitAssignmentExpressionOrHigher(node);
        }
    }

    protected visitParameters(nodes: ReadonlyArray<Parameter>): ReadonlyArray<Parameter> {
        return visitList(nodes, this.visitParameter, this);
    }

    protected visitOperator<Kind extends KeywordKind | PunctuationKind>(node: TokenNode<Kind>): TokenNode<Kind>;
    protected visitOperator(node: Keyword | Punctuation): Keyword | Punctuation {
        return isKeyword(node) ? this.visitKeyword(node) : this.visitPunctuation(node);
    }

    protected visitToken<Kind extends TokenKind>(node: TokenNode<Kind>): TokenNode<Kind> {
        return node;
    }

    protected visitExtensionNode<T extends Syntax>(_node: T): T {
        return assertFail("Not implemented.");
    }

    // Keywords

    protected visitKeyword<Kind extends KeywordKind>(node: TokenNode<Kind>): TokenNode<Kind> {
        return this.visitToken(node);
    }

    // Punctuation

    protected visitPunctuation<Kind extends PunctuationKind>(node: TokenNode<Kind>): TokenNode<Kind> {
        return this.visitToken(node);
    }

    // Names

    protected visitBindingIdentifier(node: Identifier): Identifier {
        return this.visitIdentifier(node);
    }

    protected visitIdentifierReference(node: Identifier): Identifier {
        return this.visitIdentifier(node);
    }

    protected visitIdentifierName(node: Identifier): Identifier {
        return this.visitIdentifier(node);
    }

    protected visitIdentifier(node: Identifier): Identifier {
        return node;
    }

    protected visitComputedPropertyName(node: ComputedPropertyName): ComputedPropertyName {
        return ExprUpdate.computedPropertyName(node,
            this.visitExpression(node.expression));
    }

    // Clauses

    protected visitSequenceBinding(node: SequenceBinding): SequenceBinding {
        return ExprUpdate.sequenceBinding(node,
            node.awaitKeyword && this.visitKeyword(node.awaitKeyword),
            this.visitBindingIdentifier(node.name),
            node.hierarchyAxisKeyword && this.visitKeyword(node.hierarchyAxisKeyword),
            this.visitAssignmentExpressionOrHigher(node.expression),
            node.withHierarchy && this.visitAssignmentExpressionOrHigher(node.withHierarchy));
    }
    
    protected visitFromClause(node: FromClause): FromClause {
        return ExprUpdate.fromClause(node,
            node.outerClause && this.visitQueryBodyClause(node.outerClause),
            this.visitSequenceBinding(node.sequenceBinding));
    }

    protected visitLetClause(node: LetClause): LetClause {
        return ExprUpdate.letClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitBindingIdentifier(node.name),
            this.visitAssignmentExpressionOrHigher(node.expression));
    }

    protected visitWhereClause(node: WhereClause): WhereClause {
        return ExprUpdate.whereClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitAssignmentExpressionOrHigher(node.expression));
    }

    protected visitOrderbyClause(node: OrderbyClause): OrderbyClause {
        return ExprUpdate.orderbyClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitOrderByComparators(node.comparators));
    }

    protected visitOrderbyComparator(node: OrderbyComparator): OrderbyComparator {
        return ExprUpdate.orderbyComparator(node,
            this.visitAssignmentExpressionOrHigher(node.expression),
            node.directionToken && this.visitToken(node.directionToken),
            node.usingExpression && this.visitAssignmentExpressionOrHigher(node.usingExpression));
    }

    protected visitGroupClause(node: GroupClause): GroupClause {
        return ExprUpdate.groupClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitAssignmentExpressionOrHigher(node.elementSelector),
            this.visitAssignmentExpressionOrHigher(node.keySelector),
            node.into && this.visitBindingIdentifier(node.into));
    }

    protected visitJoinClause(node: JoinClause): JoinClause {
        return ExprUpdate.joinClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitSequenceBinding(node.sequenceBinding),
            this.visitAssignmentExpressionOrHigher(node.outerKeySelector),
            this.visitAssignmentExpressionOrHigher(node.keySelector),
            node.into && this.visitBindingIdentifier(node.into));
    }

    protected visitSelectClause(node: SelectClause): SelectClause {
        return ExprUpdate.selectClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitAssignmentExpressionOrHigher(node.expression),
            node.into && this.visitBindingIdentifier(node.into));
    }

    // Expressions - PrimaryExpression

    protected visitThisExpression(node: ThisExpression): ThisExpression {
        return this.visitKeyword(node);
    }

    protected visitObjectLiteral(node: ObjectLiteral): ObjectLiteral {
        return ExprUpdate.objectLiteral(node, 
            this.visitObjectLiteralElements(node.properties));
    }

    protected visitArrayLiteral(node: ArrayLiteral): ArrayLiteral {
        return ExprUpdate.arrayLiteral(node,
            this.visitArrayLiteralElements(node.elements));
    }

    protected visitParenthesizedExpression(node: ParenthesizedExpression): ParenthesizedExpression {
        return ExprUpdate.paren(node, this.visitExpression(node.expression));
    }

    protected visitNewExpression(node: NewExpression): NewExpression {
        return ExprUpdate.new(node,
            this.visitMemberExpressionOrHigher(node.expression),
            node.argumentList && this.visitArguments(node.argumentList));
    }

    protected visitBooleanLiteral(node: BooleanLiteral): BooleanLiteral {
        return this.visitKeyword(node);
    }

    protected visitNullLiteral(node: NullLiteral): NullLiteral {
        return this.visitKeyword(node);
    }

    protected visitStringLiteral(node: StringLiteral): StringLiteral {
        return node;
    }

    protected visitNumberLiteral(node: NumberLiteral): NumberLiteral {
        return node;
    }

    protected visitRegularExpressionLiteral(node: RegularExpressionLiteral): RegularExpressionLiteral {
        return node;
    }

    // Expressions - MemberExpression

    protected visitPropertyAccessExpression(node: PropertyAccessExpression): PropertyAccessExpression {
        return ExprUpdate.property(node,
            this.visitLeftHandSideExpressionOrHigher(node.expression),
            this.visitIdentifierName(node.name));
    }

    protected visitElementAccessExpression(node: ElementAccessExpression): ElementAccessExpression {
        return ExprUpdate.index(node,
            this.visitLeftHandSideExpressionOrHigher(node.expression),
            this.visitExpression(node.argumentExpression));
    }

    // Expressions - LeftHandSideExpression

    protected visitCallExpression(node: CallExpression): CallExpression {
        return ExprUpdate.call(node,
            this.visitLeftHandSideExpressionOrHigher(node.expression),
            this.visitArguments(node.argumentList));
    }

    protected visitObjectAssignmentPattern(node: ObjectAssignmentPattern): ObjectAssignmentPattern {
        return ExprUpdate.objectAssignmentPattern(node,
            this.visitObjectAssignmentPatternElements(node.properties),
            node.rest && this.visitAssignmentRestProperty(node.rest));
    }

    protected visitArrayAssignmentPattern(node: ArrayAssignmentPattern): ArrayAssignmentPattern {
        return ExprUpdate.arrayAssignmentPattern(node,
            this.visitArrayAssignmentPatternElements(node.elements),
            node.rest && this.visitAssignmentRestElement(node.rest));
    }

    // Expressions - UnaryExpression

    protected visitPrefixUnaryExpression(node: PrefixUnaryExpression): PrefixUnaryExpression {
        return ExprUpdate.prefixUnary(node,
            this.visitOperator(node.operatorToken),
            this.visitUnaryExpressionOrHigher(node.expression));
    }

    protected visitPostfixUnaryExpression(node: PostfixUnaryExpression): PostfixUnaryExpression {
        return ExprUpdate.postfixUnary(node,
            this.visitLeftHandSideExpressionOrHigher(node.expression),
            this.visitOperator(node.operatorToken));
    }

    // Expressions - BinaryExpression

    protected visitBinaryExpression(node: BinaryExpression): BinaryExpression {
        return ExprUpdate.binary(node,
            this.visitBinaryExpressionOrHigher(node.left),
            this.visitOperator(node.operatorToken),
            this.visitBinaryExpressionOrHigher(node.right));
    }

    // Expressions - AssignmentExpression

    protected visitConditionalExpression(node: ConditionalExpression): ConditionalExpression {
        return ExprUpdate.conditional(node,
            this.visitBinaryExpressionOrHigher(node.condition),
            this.visitAssignmentExpressionOrHigher(node.whenTrue),
            this.visitAssignmentExpressionOrHigher(node.whenFalse));
    }

    protected visitArrowFunction(node: ArrowFunction): ArrowFunction {
        return ExprUpdate.arrow(node,
            node.asyncKeyword && this.visitKeyword(node.asyncKeyword),
            this.visitParameters(node.parameterList),
            node.rest && this.visitBindingRestElement(node.rest),
            this.visitAssignmentExpressionOrHigher(node.body));
    }

    protected visitQueryExpression(node: QueryExpression): QueryExpression {
        return ExprUpdate.query(node,
            this.visitTerminalClause(node.query));
    }

    protected visitAssignmentExpression(node: AssignmentExpression): AssignmentExpression {
        return ExprUpdate.assign(node,
            this.visitLeftHandSideExpressionOrHigher(node.left),
            this.visitOperator(node.operatorToken),
            this.visitAssignmentExpressionOrHigher(node.right));
    }

    // Expressions - Expression

    protected visitCommaListExpression(node: CommaListExpression): CommaListExpression {
        return ExprUpdate.comma(node,
            this.visitCommaListExpressionElements(node.expressions));
    }

    // Elements

    protected visitElision(node: Elision): Elision {
        return node;
    }

    protected visitSpreadElement(node: SpreadElement): SpreadElement {
        return ExprUpdate.spreadElement(node,
            this.visitAssignmentExpressionOrHigher(node.expression));
    }

    // Declarations

    protected visitPropertyDefinition(node: PropertyDefinition): PropertyDefinition {
        return ExprUpdate.propertyDefinition(node,
            this.visitPropertyName(node.name),
            this.visitAssignmentExpressionOrHigher(node.initializer));
    }

    protected visitShorthandPropertyDefinition(node: ShorthandPropertyDefinition): ShorthandPropertyDefinition {
        return ExprUpdate.shorthandPropertyDefinition(node,
            this.visitIdentifierReference(node.name));
    }

    protected visitParameter(node: Parameter): Parameter {
        return this.visitBindingElement(node);
    }

    // Patterns

    protected visitObjectBindingPattern(node: ObjectBindingPattern): ObjectBindingPattern {
        return ExprUpdate.objectBindingPattern(node,
            this.visitObjectBindingPatternElements(node.properties),
            node.rest && this.visitBindingRestProperty(node.rest));
    }

    protected visitBindingRestProperty(node: BindingRestProperty): BindingRestProperty {
        return ExprUpdate.bindingRestProperty(node,
            this.visitBindingIdentifier(node.name));
    }

    protected visitBindingProperty(node: BindingProperty): BindingProperty {
        return ExprUpdate.bindingProperty(node,
            this.visitPropertyName(node.propertyName),
            this.visitBindingElement(node.bindingElement));
    }

    protected visitShorthandBindingProperty(node: ShorthandBindingProperty): ShorthandBindingProperty {
        return ExprUpdate.shorthandBindingProperty(node,
            this.visitBindingIdentifier(node.name),
            node.initializer && this.visitAssignmentExpressionOrHigher(node.initializer));
    }

    protected visitAssignmentRestProperty(node: AssignmentRestProperty): AssignmentRestProperty {
        return ExprUpdate.assignmentRestProperty(node,
            this.visitAssignmentExpressionOrHigher(node.expression));
    }

    protected visitAssignmentProperty(node: AssignmentProperty): AssignmentProperty {
        return ExprUpdate.assignmentProperty(node,
            this.visitPropertyName(node.propertyName),
            this.visitAssignmentElement(node.assignmentElement));
    }

    protected visitShorthandAssignmentProperty(node: ShorthandAssignmentProperty): ShorthandAssignmentProperty {
        return ExprUpdate.shorthandAssignmentProperty(node,
            this.visitIdentifierReference(node.name),
            node.initializer && this.visitAssignmentExpressionOrHigher(node.initializer));
    }

    protected visitArrayBindingPattern(node: ArrayBindingPattern): ArrayBindingPattern {
        return ExprUpdate.arrayBindingPattern(node,
            this.visitArrayBindingPatternElements(node.elements),
            node.rest && this.visitBindingRestElement(node.rest));
    }

    protected visitBindingElement(node: BindingElement): BindingElement {
        return ExprUpdate.bindingElement(node,
            this.visitBindingName(node.name),
            node.initializer && this.visitAssignmentExpressionOrHigher(node.initializer));
    }

    protected visitBindingRestElement(node: BindingRestElement): BindingRestElement {
        return ExprUpdate.bindingRestElement(node,
            this.visitBindingName(node.name));
    }

    protected visitAssignmentElement(node: AssignmentElement): AssignmentElement {
        return ExprUpdate.assignmentElement(node,
            this.visitAssignmentExpressionOrHigher(node.target),
            node.initializer && this.visitAssignmentExpressionOrHigher(node.initializer));
    }

    protected visitAssignmentRestElement(node: AssignmentRestElement): AssignmentRestElement {
        return ExprUpdate.assignmentRestElement(node,
            this.visitAssignmentExpressionOrHigher(node.target));
    }
}

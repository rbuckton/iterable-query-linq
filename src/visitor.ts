import {
    FromClause, LetClause, WhereClause, OrderbyClause, GroupClause, JoinClause, SelectClause,
    QueryBodyClause, SyntaxKind, QueryExpression, BinaryExpression, ConditionalExpression,
    PrefixUnaryExpression, PostfixUnaryExpression, ArrowFunction, PropertyAccessExpression,
    ElementAccessExpression, ObjectLiteral, ArrayLiteral, PropertyDefinition, ObjectLiteralElement,
    SpreadElement, ArrayLiteralElement, PropertyName, ComputedPropertyName, 
    CommaListExpression, ParenthesizedExpression, NewExpression, CallExpression, Argument,
    ShorthandPropertyDefinition, 
    SyntaxUpdate,
    Expression, 
    ObjectAssignmentPatternElement,
    ObjectBindingPatternElement, ArrayBindingPatternElement, ArrayAssignmentPatternElement,
    BindingName, OrderbyComparator,
    ThisExpression, BooleanLiteral, NullLiteral, StringLiteral, NumberLiteral,
    RegularExpressionLiteral,
    AssignmentExpression, Parameter, Elision, ObjectAssignmentPattern,
    ArrayAssignmentPattern, ObjectBindingPattern, BindingRestProperty, BindingProperty,
    ShorthandBindingProperty, AssignmentRestProperty, AssignmentProperty,
    ShorthandAssignmentProperty, ArrayBindingPattern, BindingElement, BindingRestElement,
    AssignmentElement, AssignmentRestElement, SequenceBinding, IdentifierReference, 
    isAssignmentExpressionOrHigher, isLeftHandSideExpressionOrHigher, Node,
} from "./types";
import { assertFail, assertNever, visitList } from "./utils";

export abstract class ExpressionVisitor {
    static visitList<T extends Node, U>(list: ReadonlyArray<T>, visitor: (element: T) => U): ReadonlyArray<U>;
    static visitList<T extends Node, U>(list: ReadonlyArray<T> | undefined, visitor: (element: T) => U): ReadonlyArray<U> | undefined;
    static visitList<T extends Node, U, This>(list: ReadonlyArray<T>, visitor: (this: This, element: T) => U, thisArgument: This): ReadonlyArray<U>;
    static visitList<T extends Node, U, This>(list: ReadonlyArray<T> | undefined, visitor: (this: This, element: T) => U, thisArgument: This): ReadonlyArray<U> | undefined;
    static visitList<T extends Node>(list: ReadonlyArray<T> | undefined, visitor: (element: T) => T, thisArgument?: any): ReadonlyArray<T> | undefined {
        return visitList(list, visitor, thisArgument);
    }

    visit(node: Expression): Expression {
        switch (node.kind) {
            // Literals
            case SyntaxKind.StringLiteral: return this.visitStringLiteral(node);
            case SyntaxKind.NumberLiteral: return this.visitNumberLiteral(node);
            case SyntaxKind.RegularExpressionLiteral: return this.visitRegularExpressionLiteral(node);
            case SyntaxKind.NullLiteral: return this.visitNullLiteral(node);
            case SyntaxKind.BooleanLiteral: return this.visitBooleanLiteral(node);

            // Expressions
            case SyntaxKind.IdentifierReference: return this.visitIdentifierReference(node);
            case SyntaxKind.ThisExpression: return this.visitThisExpression(node);
            case SyntaxKind.ArrowFunction: return this.visitArrowFunction(node);
            case SyntaxKind.PrefixUnaryExpression: return this.visitPrefixUnaryExpression(node);
            case SyntaxKind.PostfixUnaryExpression: return this.visitPostfixUnaryExpression(node);
            case SyntaxKind.ParenthesizedExpression: return this.visitParenthesizedExpression(node);
            case SyntaxKind.CallExpression: return this.visitCallExpression(node);
            case SyntaxKind.NewExpression: return this.visitNewExpression(node);
            case SyntaxKind.PropertyAccessExpression: return this.visitPropertyAccessExpression(node);
            case SyntaxKind.ElementAccessExpression: return this.visitElementAccessExpression(node);
            case SyntaxKind.ObjectLiteral: return this.visitObjectLiteral(node);
            case SyntaxKind.ArrayLiteral: return this.visitArrayLiteral(node);
            case SyntaxKind.BinaryExpression: return this.visitBinaryExpression(node);
            case SyntaxKind.AssignmentExpression: return this.visitAssignmentExpression(node);
            case SyntaxKind.ConditionalExpression: return this.visitConditionalExpression(node);
            case SyntaxKind.QueryExpression: return this.visitQueryExpression(node);
            case SyntaxKind.CommaListExpression: return this.visitCommaListExpression(node);

            // Patterns
            case SyntaxKind.ObjectAssignmentPattern: return this.visitObjectAssignmentPattern(node);
            case SyntaxKind.ArrayAssignmentPattern: return this.visitArrayAssignmentPattern(node);

            // Cover Grammars
            case SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList:
            // case SyntaxKind.CoverInitializedName:
                throw new Error("Not supported");
            
            default: return assertNever(node);
        }
    }

    // Names

    protected visitComputedPropertyName(node: ComputedPropertyName): ComputedPropertyName {
        return SyntaxUpdate.ComputedPropertyName(node,
            this.visit(node.expression));
    }

    // Clauses

    protected visitSequenceBinding(node: SequenceBinding): SequenceBinding {
        return SyntaxUpdate.SequenceBinding(node,
            node.name,
            this.visit(node.expression),
            node.withHierarchy && this.visit(node.withHierarchy));
    }

    protected visitQueryBodyClause(node: QueryBodyClause): QueryBodyClause;
    protected visitQueryBodyClause(node: QueryBodyClause | undefined): QueryBodyClause | undefined;
    protected visitQueryBodyClause(node: QueryBodyClause | undefined): QueryBodyClause | undefined {
        if (node === undefined) return undefined;
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

    protected visitFromClause(node: FromClause): FromClause {
        return SyntaxUpdate.FromClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitSequenceBinding(node.sequenceBinding));
    }

    protected visitLetClause(node: LetClause): LetClause {
        return SyntaxUpdate.LetClause(node,
            this.visitQueryBodyClause(node.outerClause),
            node.name,
            this.visit(node.expression));
    }

    protected visitWhereClause(node: WhereClause): WhereClause {
        return SyntaxUpdate.WhereClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visit(node.expression));
    }

    protected visitOrderbyClause(node: OrderbyClause): OrderbyClause {
        return SyntaxUpdate.OrderbyClause(node,
            this.visitQueryBodyClause(node.outerClause),
            visitList(node.comparators, this.visitOrderbyComparator, this));
    }

    protected visitOrderbyComparator(node: OrderbyComparator): OrderbyComparator {
        return SyntaxUpdate.OrderbyComparator(node,
            this.visit(node.expression),
            node.usingExpression && this.visit(node.usingExpression));
    }

    protected visitGroupClause(node: GroupClause): GroupClause {
        return SyntaxUpdate.GroupClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visit(node.elementSelector),
            this.visit(node.keySelector),
            node.into);
    }

    protected visitJoinClause(node: JoinClause): JoinClause {
        return SyntaxUpdate.JoinClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visitSequenceBinding(node.sequenceBinding),
            this.visit(node.outerKeySelector),
            this.visit(node.keySelector),
            node.into);
    }

    protected visitSelectClause(node: SelectClause): SelectClause {
        return SyntaxUpdate.SelectClause(node,
            this.visitQueryBodyClause(node.outerClause),
            this.visit(node.expression),
            node.into);
    }

    // Expressions - PrimaryExpression

    protected visitIdentifierReference(node: IdentifierReference): Expression {
        return node;
    }

    protected visitThisExpression(node: ThisExpression): Expression {
        return node;
    }

    protected visitBooleanLiteral(node: BooleanLiteral): Expression {
        return node;
    }

    protected visitNullLiteral(node: NullLiteral): Expression {
        return node;
    }

    protected visitStringLiteral(node: StringLiteral): Expression {
        return node;
    }

    protected visitNumberLiteral(node: NumberLiteral): Expression {
        return node;
    }

    protected visitRegularExpressionLiteral(node: RegularExpressionLiteral): Expression {
        return node;
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

    protected visitObjectLiteral(node: ObjectLiteral): Expression {
        return SyntaxUpdate.ObjectLiteral(node,
            visitList(node.properties, this.visitObjectLiteralElement, this));
    }

    protected visitArrayLiteralElement(node: ArrayLiteralElement): ArrayLiteralElement | Expression {
        switch (node.kind) {
            case SyntaxKind.Elision: return this.visitElision(node);
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
            default: return this.visit(node);
        }
    }

    protected visitArrayLiteral(node: ArrayLiteral): Expression {
        return SyntaxUpdate.ArrayLiteral(node,
            visitList(node.elements, this.visitArrayLiteralElement, this));
    }

    protected visitParenthesizedExpression(node: ParenthesizedExpression): Expression {
        return SyntaxUpdate.Paren(node, this.visit(node.expression));
    }

    protected visitArgument(node: Argument): Argument | Expression {
        switch (node.kind) {
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
            default: return this.visit(node);
        }
    }

    protected visitNewExpression(node: NewExpression): Expression {
        return SyntaxUpdate.New(node,
            this.visit(node.expression),
            visitList(node.argumentList, this.visitArgument, this));
    }

    // Expressions - MemberExpression

    protected visitPropertyAccessExpression(node: PropertyAccessExpression): Expression {
        return SyntaxUpdate.Property(node,
            this.visit(node.expression));
    }

    protected visitElementAccessExpression(node: ElementAccessExpression): Expression {
        return SyntaxUpdate.Index(node,
            this.visit(node.expression),
            this.visit(node.argumentExpression));
    }

    // Expressions - LeftHandSideExpression

    protected visitCallExpression(node: CallExpression): Expression {
        return SyntaxUpdate.Call(node,
            this.visit(node.expression),
            visitList(node.argumentList, this.visitArgument, this));
    }

    protected visitObjectAssignmentPatternElement(node: ObjectAssignmentPatternElement): ObjectAssignmentPatternElement {
        switch (node.kind) {
            case SyntaxKind.AssignmentProperty: return this.visitAssignmentProperty(node);
            case SyntaxKind.ShorthandAssignmentProperty: return this.visitShorthandAssignmentProperty(node);
            default: return assertNever(node);
        }
    }

    protected visitObjectAssignmentPattern(node: ObjectAssignmentPattern): Expression {
        return SyntaxUpdate.ObjectAssignmentPattern(node,
            visitList(node.properties, this.visitObjectAssignmentPatternElement, this),
            this.visitAssignmentRestProperty(node.rest));
    }

    protected visitArrayAssignmentPatternElement(node: ArrayAssignmentPatternElement): ArrayAssignmentPatternElement {
        switch (node.kind) {
            case SyntaxKind.Elision: return this.visitElision(node);
            case SyntaxKind.AssignmentElement: return this.visitAssignmentElement(node);
            default: return assertNever(node);
        }
    }

    protected visitArrayAssignmentPattern(node: ArrayAssignmentPattern): Expression {
        return SyntaxUpdate.ArrayAssignmentPattern(node,
            visitList(node.elements, this.visitArrayAssignmentPatternElement, this),
            this.visitAssignmentRestElement(node.rest));
    }

    // Expressions - UnaryExpression

    protected visitPrefixUnaryExpression(node: PrefixUnaryExpression): Expression {
        return SyntaxUpdate.PrefixUnary(node,
            this.visit(node.expression));
    }

    protected visitPostfixUnaryExpression(node: PostfixUnaryExpression): Expression {
        return SyntaxUpdate.PostfixUnary(node,
            this.visit(node.expression));
    }

    // Expressions - BinaryExpression

    protected visitBinaryExpression(node: BinaryExpression): Expression {
        return SyntaxUpdate.Binary(node,
            this.visit(node.left),
            this.visit(node.right));
    }

    // Expressions - AssignmentExpression

    protected visitConditionalExpression(node: ConditionalExpression): Expression {
        return SyntaxUpdate.Conditional(node,
            this.visit(node.condition),
            this.visit(node.whenTrue),
            this.visit(node.whenFalse));
    }

    protected visitArrowFunction(node: ArrowFunction): Expression {
        return SyntaxUpdate.Arrow(node,
            visitList(node.parameterList, this.visitParameter, this),
            this.visitBindingRestElement(node.rest),
            this.visit(node.body));
    }

    protected visitQueryExpression(node: QueryExpression): Expression {
        const clause = this.visitQueryBodyClause(node.query);
        if (clause.kind !== SyntaxKind.SelectClause &&
            clause.kind !== SyntaxKind.GroupClause ||
            clause.into) return assertFail("A query must end with either a 'select' or 'group' clause.");
        return SyntaxUpdate.Query(node, clause);
    }

    protected visitAssignmentExpression(node: AssignmentExpression): Expression {
        const left = this.visit(node.left);
        if (!isLeftHandSideExpressionOrHigher(left)) throw new Error("Invalid assignment target");
        return SyntaxUpdate.Assign(node, left, this.visit(node.right));
    }

    // Expressions - Expression

    protected visitCommaListExpression(node: CommaListExpression): Expression {
        return SyntaxUpdate.Comma(node, visitList(node.expressions, this.visit, this));
    }

    // Elements

    protected visitElision(node: Elision): Elision {
        return node;
    }

    protected visitSpreadElement(node: SpreadElement): SpreadElement {
        return SyntaxUpdate.SpreadElement(node, this.visit(node.expression));
    }

    // Declarations

    protected visitPropertyName(node: PropertyName): PropertyName {
        switch (node.kind) {
            case SyntaxKind.IdentifierName: return node;
            case SyntaxKind.StringLiteral: return node;
            case SyntaxKind.NumberLiteral: return node;
            case SyntaxKind.ComputedPropertyName: return this.visitComputedPropertyName(node);
            default: return assertNever(node);
        }
    }

    protected visitPropertyDefinition(node: PropertyDefinition): PropertyDefinition {
        return SyntaxUpdate.PropertyDefinition(node,
            this.visitPropertyName(node.name),
            this.visit(node.initializer));
    }

    protected visitShorthandPropertyDefinition(node: ShorthandPropertyDefinition): ShorthandPropertyDefinition {
        return SyntaxUpdate.ShorthandPropertyDefinition(node, node.name);
    }

    protected visitParameter(node: Parameter): Parameter {
        return this.visitBindingElement(node);
    }

    // Patterns

    protected visitObjectBindingPatternElement(node: ObjectBindingPatternElement): ObjectBindingPatternElement {
        switch (node.kind) {
            case SyntaxKind.BindingProperty: return this.visitBindingProperty(node);
            case SyntaxKind.ShorthandBindingProperty: return this.visitShorthandBindingProperty(node);
            default: return assertNever(node);
        }
    }

    protected visitObjectBindingPattern(node: ObjectBindingPattern): ObjectBindingPattern {
        return SyntaxUpdate.ObjectBindingPattern(node,
            visitList(node.properties, this.visitObjectBindingPatternElement, this),
            this.visitBindingRestProperty(node.rest));
    }

    protected visitBindingRestProperty(node: BindingRestProperty | undefined): BindingRestProperty | undefined {
        return node;
    }

    protected visitBindingProperty(node: BindingProperty): BindingProperty {
        return SyntaxUpdate.BindingProperty(node,
            this.visitPropertyName(node.propertyName),
            this.visitBindingElement(node.bindingElement));
    }

    protected visitShorthandBindingProperty(node: ShorthandBindingProperty): ShorthandBindingProperty {
        return SyntaxUpdate.ShorthandBindingProperty(node, node.name, node.initializer && this.visit(node.initializer));
    }

    protected visitAssignmentRestProperty(node: AssignmentRestProperty | undefined): AssignmentRestProperty | undefined {
        return node && SyntaxUpdate.AssignmentRestProperty(node, this.visit(node.expression));
    }

    protected visitAssignmentProperty(node: AssignmentProperty): AssignmentProperty {
        return SyntaxUpdate.AssignmentProperty(node,
            this.visitPropertyName(node.propertyName),
            this.visitAssignmentElement(node.assignmentElement));
    }

    protected visitShorthandAssignmentProperty(node: ShorthandAssignmentProperty): ShorthandAssignmentProperty {
        return SyntaxUpdate.ShorthandAssignmentProperty(node, node.name, node.initializer && this.visit(node.initializer));
    }

    protected visitArrayBindingPatternElement(node: ArrayBindingPatternElement): ArrayBindingPatternElement {
        switch (node.kind) {
            case SyntaxKind.Elision: return this.visitElision(node);
            case SyntaxKind.BindingElement: return this.visitBindingElement(node);
            default: return assertNever(node);
        }
    }

    protected visitArrayBindingPattern(node: ArrayBindingPattern): ArrayBindingPattern {
        return SyntaxUpdate.ArrayBindingPattern(node,
            visitList(node.elements, this.visitArrayBindingPatternElement, this),
            this.visitBindingRestElement(node.rest));
    }

    protected visitBindingName(node: BindingName): BindingName {
        switch (node.kind) {
            case SyntaxKind.BindingIdentifier: return node;
            case SyntaxKind.ObjectBindingPattern: return this.visitObjectBindingPattern(node);
            case SyntaxKind.ArrayBindingPattern: return this.visitArrayBindingPattern(node);
            default: return assertNever(node);
        }
    }

    protected visitBindingElement(node: BindingElement): BindingElement {
        return SyntaxUpdate.BindingElement(node, this.visitBindingName(node.name), node.initializer && this.visit(node.initializer));
    }

    protected visitBindingRestElement(node: BindingRestElement | undefined): BindingRestElement | undefined {
        return node && SyntaxUpdate.BindingRestElement(node, this.visitBindingName(node.name));
    }

    protected visitAssignmentElement(node: AssignmentElement): AssignmentElement {
        const target = this.visit(node.target);
        if (!isAssignmentExpressionOrHigher(target)) throw new Error("Invalid assignment target");
        return SyntaxUpdate.AssignmentElement(node, target, node.initializer && this.visit(node.initializer));
    }

    protected visitAssignmentRestElement(node: AssignmentRestElement | undefined): AssignmentRestElement | undefined {
        if (!node) return undefined;
        const target = this.visit(node.target);
        if (!isAssignmentExpressionOrHigher(target)) throw new Error("Invalid assignment target");
        return SyntaxUpdate.AssignmentRestElement(node, target);
    }
}

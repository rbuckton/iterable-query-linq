import { FromClause, LetClause, WhereClause, OrderbyClause, GroupClause, JoinClause, SelectClause, Clause, SyntaxKind, Expression, QueryExpression, BinaryExpression, ConditionalExpression, PrefixUnaryExpression, PostfixUnaryExpression, ArrowFunction, PropertyAccessExpression, ElementAccessExpression, ObjectLiteral, ArrayLiteral, PropertyAssignment, ObjectLiteralElement, SpreadElement, ArrayLiteralElement, MemberName, ComputedPropertyName, Identifier, OrderbyComparator, CommaListExpression, ParenthesizedExpression, NewExpression, CallExpression, Argument, ShorthandPropertyAssignment, Selector } from "./types";
import { Expr } from "./factory";
import { visitList } from "./visitor";

/*
    > from user in users
    > select user

    from(users)
        .select(user => user)

    > from user in users
    > let name = user.name
    > select name

    from(users)
        .select(user => ({ user, name: user.name }))
        .select(context => context.name)

    > from user1 in users
    > from user2 in users
    > select { user1, user2 }

    from(users)
        .selectMany(user1 => users, (user1, user2) => ({ user1, user2 }))

    > from user1 in users
    > from user2 in users
    > select { user1, user2 } into users3
    > select users3

    from(users)
        .selectMany(user1 => users, (user1, user2) => ({ user1, user2 }))
        .select(users3 => users3)

    > from user in users
    > where user.name === "Bob"
    > select user

    from(users)
        .where(user => user.name === "Bob")

    > from user in users
    > where user.name === "Bob"
    > select user.id

    from(users)
        .where(user => user.name === "Bob")
        .select(user => user.id)

    > from user in users
    > group user by user.Name

    from(users)
        .groupBy(user => user.name);

    > from user in users
    > group user by user.Name into g
    > where g.key === "Bob"
    > select g

    from(users)
        .groupBy(user => user.name)
        .where(g => g.key === "Bob")

    // an `into` subclause starts a new context (no names are preserved)
    // a query must end with a `select` or `group` without an `into`

    > from node in ancestor::documentNodes
    > select node;

    from(documentNodes)
        .ancestors();

    > from node in documentNodes
    > where node.name === "div"
    > select descendants::node

    from(documentNodes)
        .where(node => node.name === "div")
        .descendants();

    > from node in documentNodes
    > where node.name === "div"
    > select descendants::node into descendant
    > where descendant.name === "a"
    > select descendant;

    from(documentNodes)
        .where(node => node.name === "div")
        .descendants()
        .where(descendant => descendant.name === "a");
*/

function isMultiple(bindings: Identifier | ReadonlyArray<Identifier>): bindings is ReadonlyArray<Identifier> {
    return Array.isArray(bindings);
}

function bindName(name: Identifier, bindings: Identifier | ReadonlyArray<Identifier>): ReadonlyArray<Identifier> {
    return isMultiple(bindings) ? [...bindings, name] : [bindings, name];
}

function bindingArgument(bindings: Identifier | ReadonlyArray<Identifier>) {
    return isMultiple(bindings) ? Expr.id("$context") : bindings;
}

function bindingsObject(bindings: Identifier | ReadonlyArray<Identifier>, name: Identifier, expression?: Expression) {
    const contextArgument = bindingArgument(bindings);
    const properties: ObjectLiteralElement[] = isMultiple(bindings)
        ? bindings.map(binding =>
            Expr.propertyAssign(binding, Expr.propertyAccess(contextArgument, binding)))
        : [Expr.shorthandPropertyAssign(bindings)];
    properties.push(expression && expression !== name
        ? Expr.propertyAssign(name, expression)
        : Expr.shorthandPropertyAssign(name));
    return Expr.object(properties);
}

function fn(name: string) {
    return Expr.propertyAccess(Expr.id("$fn"), name);
}

interface QueryContext {
    bindings: Identifier | ReadonlyArray<Identifier>;
    expression: Expression;
}

/** @internal */
export class Visitor {
    private _context: QueryContext | undefined;

    visit(node: Expression): Expression {
        return this.visitExpression(node);
    }

    private visitFromClause(node: FromClause): QueryContext {
        const context = node.outerClause && this.visitClause(node.outerClause);
        if (context) {
            const bindings = bindName(node.name, context.bindings);
            const expression = Expr.call(
                fn("selectMany"),
                [
                    context.expression,
                    Expr.arrow([bindingArgument(context.bindings)], withTraversal(this.visitExpressionWithContext(node.expression, context), node.selectorToken)),
                    Expr.arrow([bindingArgument(context.bindings), node.name], bindingsObject(context.bindings, node.name))
                ]
            )
            return { bindings, expression };
        }
        const bindings = node.name;
        const expression = withTraversal(this.visitExpression(node.expression), node.selectorToken);
        return { bindings, expression };
    }

    private visitLetClause(node: LetClause): QueryContext {
        const context = this.visitClause(node.outerClause);
        const bindings = bindName(node.name, context.bindings);
        const expression = Expr.call(
            fn("select"),
            [
                context.expression,
                Expr.arrow([bindingArgument(context.bindings)], bindingsObject(context.bindings, node.name, this.visitExpressionWithContext(node.expression, context)))
            ]
        );
        return { bindings, expression };
    }

    private visitWhereClause(node: WhereClause): QueryContext {
        const context = this.visitClause(node.outerClause);
        const bindings = context.bindings;
        const expression = Expr.call(
            fn("where"),
            [
                context.expression,
                Expr.arrow([bindingArgument(context.bindings)], this.visitExpressionWithContext(node.expression, context))
            ]
        );
        return { bindings, expression };
    }

    private visitOrderbyClause(node: OrderbyClause): QueryContext {
        const context = this.visitClause(node.outerClause);
        const bindings = context.bindings;
        let expression = context.expression;
        let first = true;
        for (const comparator of node.comparators) {
            expression = Expr.call(
                fn(`${first ? "order" : "then"}By${isDescending(comparator) ? "Descending": ""}`),
                [
                    expression,
                    Expr.arrow([bindingArgument(context.bindings)], this.visitExpressionWithContext(comparator.expression, context)),
                    ...(comparator.usingExpression ? [this.visitExpression(comparator.usingExpression) ] : [])
                ]
            );
            first = false;
        }
        return { bindings, expression };

        function isDescending(comparator: OrderbyComparator) {
            return comparator.directionToken !== undefined
                && comparator.directionToken.kind === SyntaxKind.DescendingKeyword;
        }
    }

    private visitGroupClause(node: GroupClause): QueryContext {
        const context = this.visitClause(node.outerClause);
        const bindings = node.intoName ? node.intoName : context.bindings;
        const expression = Expr.call(
            fn("groupBy"),
            [
                context.expression,
                Expr.arrow([bindingArgument(context.bindings)], this.visitExpressionWithContext(node.keySelector, context)),
                Expr.arrow([bindingArgument(context.bindings)], this.visitExpressionWithContext(node.elementSelector, context))
            ]
        )
        return { bindings, expression };
    }

    private visitJoinClause(node: JoinClause): QueryContext {
        const context = this.visitClause(node.outerClause);
        const bindings = bindName(node.intoName || node.name, context.bindings);
        const expression = Expr.call(
            fn(node.intoName ? "groupJoin" : "join"),
            [
                context.expression,
                withTraversal(this.visitExpressionWithContext(node.expression, context), node.selectorToken),
                Expr.arrow([bindingArgument(context.bindings)], this.visitExpressionWithContext(node.outerSelector, context)),
                Expr.arrow([node.name], this.visitExpressionWithContext(node.innerSelector, context)),
                Expr.arrow([bindingArgument(context.bindings), node.intoName || node.name], bindingsObject(context.bindings, node.intoName || node.name))
            ]
        );
        return { bindings, expression };
    }

    private visitSelectClause(node: SelectClause): QueryContext {
        const context = this.visitClause(node.outerClause);
        const contextArgument = bindingArgument(context.bindings);
        const selectorExpression = withTraversal(this.visitExpressionWithContext(node.expression, context), node.selectorToken);
        if (sameReference(contextArgument, selectorExpression)) return context;
        const bindings = node.intoName ? node.intoName : context.bindings;
        const expression = Expr.call(
            fn("select"),
            [
                context.expression,
                Expr.arrow([contextArgument], selectorExpression)
            ]
        );
        return { bindings, expression };
    }

    private visitClause(node: Clause) {
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

    private visitQueryExpression(node: QueryExpression) {
        return this.visitClause(node.query).expression;
    }

    private visitBinaryExpression(node: BinaryExpression) {
        const left = this.visitExpression(node.left);
        const right = this.visitExpression(node.right);
        return node.left !== left || node.right !== right
            ? Expr.binary(left, node.operatorToken, right)
            : node;
    }

    private visitConditionalExpression(node: ConditionalExpression) {
        const condition = this.visitExpression(node.condition);
        const whenTrue = this.visitExpression(node.whenTrue);
        const whenFalse = this.visitExpression(node.whenFalse);
        return node.condition !== condition || node.whenTrue !== whenTrue || node.whenFalse !== whenFalse
            ? Expr.conditional(condition, whenTrue, whenFalse)
            : node;
    }

    private visitArrowFunction(node: ArrowFunction) {
        const body = this.visitExpression(node.body);
        return node.body !== body
            ? Expr.arrow(node.parameterList, body)
            : node;
    }

    private visitPrefixUnaryExpression(node: PrefixUnaryExpression) {
        const expression = this.visitExpression(node.expression);
        return node.expression !== expression
            ? Expr.prefix(node.operatorToken, expression)
            : node;
    }

    private visitPostfixUnaryExpression(node: PostfixUnaryExpression) {
        const expression = this.visitExpression(node.expression);
        return node.expression !== expression
            ? Expr.postfix(expression, node.operatorToken)
            : node;
    }

    private visitPropertyAccessExpression(node: PropertyAccessExpression) {
        const expression = this.visitExpression(node.expression);
        return node.expression !== expression
            ? Expr.propertyAccess(expression, node.name)
            : node;
    }

    private visitElementAccessExpression(node: ElementAccessExpression) {
        const expression = this.visitExpression(node.expression);
        const argumentExpression = this.visitExpression(node.argumentExpression);
        return node.expression !== expression || node.argumentExpression !== argumentExpression
            ? Expr.elementAccess(expression, argumentExpression)
            : node;
    }

    private visitSpreadElement(node: SpreadElement) {
        const expression = this.visitExpression(node.expression);
        return node.expression !== expression
            ? Expr.spread(expression)
            : node;
    }

    private visitComputedPropertyName(node: ComputedPropertyName) {
        const expression = this.visitExpression(node.expression);
        return node.expression !== expression
            ? Expr.computedName(expression)
            : node;
    }

    private visitMemberName(node: MemberName) {
        switch (node.kind) {
            case SyntaxKind.ComputedPropertyName: return this.visitComputedPropertyName(node);
        }
        return node;
    }

    private visitPropertyAssignment(node: PropertyAssignment) {
        const name = this.visitMemberName(node.name);
        const initializer = this.visitExpression(node.initializer);
        return node.name !== name || node.initializer !== initializer
            ? Expr.propertyAssign(name, initializer)
            : node;
    }

    private visitShorthandPropertyAssignment(node: ShorthandPropertyAssignment) {
        const name = this.visitIdentifierReference(node.name);
        return node.name !== name
            ? Expr.propertyAssign(node.name, name)
            : node;
    }

    private visitObjectLiteralElement(node: ObjectLiteralElement) {
        switch (node.kind) {
            case SyntaxKind.PropertyAssignment: return this.visitPropertyAssignment(node);
            case SyntaxKind.ShorthandPropertyAssignment: return this.visitShorthandPropertyAssignment(node);
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
        }
    }

    private visitObjectLiteral(node: ObjectLiteral) {
        const properties = visitList(node.properties, node => this.visitObjectLiteralElement(node));
        return node.properties !== properties
            ? Expr.object(properties)
            : node;
    }

    private visitArrayLiteralElement(node: ArrayLiteralElement) {
        switch (node.kind) {
            case SyntaxKind.Elision: return node;
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
            default: return this.visitExpression(node);
        }
    }

    private visitArrayLiteral(node: ArrayLiteral) {
        const elements = visitList(node.elements, node => this.visitArrayLiteralElement(node));
        return node.elements !== elements
            ? Expr.array(elements)
            : node;
    }

    private visitIdentifierReference(node: Identifier) {
        if (this._context) {
            if (isMultiple(this._context.bindings) && this._context.bindings.some(binding => sameReference(binding, node))) {
                return Expr.propertyAccess(Expr.id("$context"), node);
            }
        }
        return node;
    }

    private visitCommaListExpression(node: CommaListExpression) {
        const expressions = visitList(node.expressions, node => this.visitExpression(node));
        return node.expressions !== expressions
            ? Expr.comma(expressions)
            : node;
    }

    private visitParenthesizedExpression(node: ParenthesizedExpression) {
        const expression = this.visitExpression(node.expression);
        return expression !== node.expression
            ? Expr.paren(expression)
            : node;
    }

    private visitArgument(node: Argument) {
        switch (node.kind) {
            case SyntaxKind.SpreadElement: return this.visitSpreadElement(node);
            default: return this.visitExpression(node);
        }
    }

    private visitCallExpression(node: CallExpression) {
        const expression = this.visitExpression(node.expression);
        const argumentList = visitList(node.argumentList, node => this.visitArgument(node));
        return node.expression !== expression || node.argumentList !== argumentList
            ? Expr.call(expression, argumentList)
            : node;
    }

    private visitNewExpression(node: NewExpression) {
        const expression = this.visitExpression(node.expression);
        const argumentList = visitList(node.argumentList, node => this.visitArgument(node));
        return node.expression !== expression || node.argumentList !== argumentList
            ? Expr.new(expression, argumentList)
            : node;
    }

    private visitExpression(node: Expression): Expression {
        switch (node.kind) {
            case SyntaxKind.CommaListExpression: return this.visitCommaListExpression(node);
            case SyntaxKind.ParenthesizedExpression: return this.visitParenthesizedExpression(node);
            case SyntaxKind.QueryExpression: return this.visitQueryExpression(node);
            case SyntaxKind.ConditionalExpression: return this.visitConditionalExpression(node);
            case SyntaxKind.ArrowFunction: return this.visitArrowFunction(node);
            case SyntaxKind.BinaryExpression: return this.visitBinaryExpression(node) as Expression;
            case SyntaxKind.PrefixUnaryExpression: return this.visitPrefixUnaryExpression(node);
            case SyntaxKind.PostfixUnaryExpression: return this.visitPostfixUnaryExpression(node);
            case SyntaxKind.PropertyAccessExpression: return this.visitPropertyAccessExpression(node);
            case SyntaxKind.ElementAccessExpression: return this.visitElementAccessExpression(node);
            case SyntaxKind.ObjectLiteral: return this.visitObjectLiteral(node);
            case SyntaxKind.ArrayLiteral: return this.visitArrayLiteral(node);
            case SyntaxKind.CallExpression: return this.visitCallExpression(node);
            case SyntaxKind.NewExpression: return this.visitNewExpression(node);
            case SyntaxKind.Identifier: return this.visitIdentifierReference(node);
        }
        return node;
    }

    private visitExpressionWithContext(node: Expression, context: QueryContext): Expression {
        const savedContext = this._context;
        this._context = context;
        const result = this.visitExpression(node);
        this._context = savedContext;
        return result;
    }
}

function sameReference(left: Expression, right: Expression) {
    return left === right
        || (left.kind === SyntaxKind.Identifier && right.kind === SyntaxKind.Identifier && left.text === right.text);
}

function withTraversal(expression: Expression, selectorToken: Selector | undefined) {
    if (selectorToken) {
        return Expr.call(
            fn(getAxis(selectorToken)),
            [expression]
        )
    }
    return expression;
}

function getAxis(selectorToken: Selector) {
    switch (selectorToken.kind) {
        case SyntaxKind.RootSelector: return "root";
        case SyntaxKind.ParentSelector: return "parents";
        case SyntaxKind.ChildSelector: return "children";
        case SyntaxKind.AncestorSelector: return "ancestors";
        case SyntaxKind.AncestorOrSelfSelector: return "ancestorsAndSelf";
        case SyntaxKind.DescendantSelector: return "descendants";
        case SyntaxKind.DescendantOrSelfSelector: return "descendantsAndSelf";
        case SyntaxKind.SelfSelector: return "self";
        case SyntaxKind.SiblingSelector: return "siblings";
        case SyntaxKind.SiblingOrSelfSelector: return "siblingsAndSelf";
    }
}
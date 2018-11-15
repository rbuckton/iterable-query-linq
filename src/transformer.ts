import {
    FromClause, LetClause, WhereClause, OrderbyClause, GroupClause, JoinClause, SelectClause,
    QueryBodyClause, SyntaxKind, Expression, QueryExpression, ObjectLiteralElement,
    OrderbyComparator,
    SequenceBinding, Argument, BindingIdentifier,
    ObjectBindingPatternElement,
    Syntax,
    BindingName,
    ArrayBindingPatternElement,
    BindingRestProperty,
    BindingRestElement,
    ArrowFunction,
} from "./syntax";
import { ExpressionVisitor } from "./visitor";
import { OrderedHierarchyQuery } from "iterable-query/dist/lib";
import { assertFail, assertNever } from "./utils";
import { Token } from "./tokens";

class UnboundQuery {
    readonly expression: Expression;
    readonly async: boolean;

    constructor(expression: Expression, async: boolean) {
        this.expression = expression;
        this.async = async;
    }

    static from(expression: Expression, async: boolean): UnboundQuery {
        expression = async ? asAsyncQuery(expression) : asQuery(expression);
        return new UnboundQuery(expression, async);
    }

    select(projection: ArrowFunction): UnboundQuery {
        const expression = callQueryMethod(this.expression, "select", [projection]);
        return new UnboundQuery(expression, this.async);
    }

    selectMany(projection: ArrowFunction, resultSelector: ArrowFunction): UnboundQuery {
        const expression = callQueryMethod(this.expression, "selectMany", [projection, resultSelector]);
        return new UnboundQuery(expression, this.async);
    }

    groupBy(keySelector: ArrowFunction, elementSelector: ArrowFunction): UnboundQuery {
        const expression = callQueryMethod(this.expression, "groupBy", [keySelector, elementSelector]);
        return new UnboundQuery(expression, this.async);
    }

    into(name: BindingName | undefined): BoundQuery {
        if (!name) return this.setBindings([]);
        const bindings = getBoundNames(name);
        return name.kind !== SyntaxKind.Identifier 
            ? this.select(Syntax.Arrow(false, [name], undefined, getBindingsExpression(bindings))).setBindings(bindings)
            : this.setBindings(bindings);
    }

    setBindings(bindings: ReadonlyArray<BindingIdentifier>): BoundQuery {
        return new BoundQuery(bindings, this.expression, this.async);
    }
}

class BoundQuery extends UnboundQuery {
    readonly bindings: ReadonlyArray<BindingIdentifier>;

    constructor(bindings: ReadonlyArray<BindingIdentifier>, expression: Expression, async: boolean) {
        super(expression, async);
        this.bindings = bindings;
    }

    where(predicate: ArrowFunction): BoundQuery {
        const expression = callQueryMethod(this.expression, "where", [predicate]);
        return new BoundQuery(this.bindings, expression, this.async);
    }

    orderBy(keySelector: ArrowFunction, using?: Expression): BoundQuery {
        return this._applyOrder("orderBy", keySelector, using);
    }

    orderByDescending(keySelector: ArrowFunction, using?: Expression): BoundQuery {
        return this._applyOrder("orderByDescending", keySelector, using);
    }

    thenBy(keySelector: ArrowFunction, using?: Expression): BoundQuery {
        return this._applyOrder("thenBy", keySelector, using);
    }

    thenByDescending(keySelector: ArrowFunction, using?: Expression): BoundQuery {
        return this._applyOrder("thenByDescending", keySelector, using);
    }

    private _applyOrder(methodName: "orderBy" | "orderByDescending" | "thenBy" | "thenByDescending", keySelector: ArrowFunction, using?: Expression): BoundQuery {
        const expression = callQueryMethod(this.expression, methodName, using ? [keySelector, using] : [keySelector]);
        return new BoundQuery(this.bindings, expression, this.async);
    }

    crossJoin(inner: BoundQuery): BoundQuery {
        const q = !this.async && inner.async ? this.toAsyncQuery() : this;
        return q
            .selectMany(
                Syntax.Arrow(false, [getBindingsParameter(this.bindings)], undefined, inner.expression),
                Syntax.Arrow(false, [getBindingsParameter(this.bindings), getBindingsParameter(inner.bindings)], undefined, getBindingsExpression([...this.bindings, ...inner.bindings]))
            )
            .setBindings([...this.bindings, ...inner.bindings]);
    }

    join(inner: BoundQuery, outerKeySelector: ArrowFunction, innerKeySelector: ArrowFunction, resultSelector: ArrowFunction): UnboundQuery {
        return this._applyJoin("join", inner, outerKeySelector, innerKeySelector, resultSelector);
    }

    groupJoin(inner: BoundQuery, outerKeySelector: ArrowFunction, innerKeySelector: ArrowFunction, resultSelector: ArrowFunction): UnboundQuery {
        return this._applyJoin("groupJoin", inner, outerKeySelector, innerKeySelector, resultSelector);
    }

    private _applyJoin(methodName: "join" | "groupJoin", inner: BoundQuery, outerKeySelector: ArrowFunction, innerKeySelector: ArrowFunction, resultSelector: ArrowFunction) {
        const q = !this.async && inner.async ? this.toAsyncQuery() : this;
        const expression = callQueryMethod(q.expression, methodName, [
            inner.expression,
            outerKeySelector,
            innerKeySelector,
            resultSelector
        ]);
        return new UnboundQuery(expression, q.async);
    }

    toAsyncQuery() {
        if (this.async) return this;
        const expression = asAsyncQuery(this.expression);
        return new BoundQuery(this.bindings, expression, true);
    }
}

/** @internal */
export class Transformer extends ExpressionVisitor {
    // These nodes must be transformed, never visited directly
    protected visitFromClause(): never { return assertFail("Not supported"); }
    protected visitLetClause(): never { return assertFail("Not supported"); }
    protected visitWhereClause(): never { return assertFail("Not supported"); }
    protected visitOrderbyClause(): never { return assertFail("Not supported"); }
    protected visitGroupClause(): never { return assertFail("Not supported"); }
    protected visitJoinClause(): never { return assertFail("Not supported"); }
    protected visitSelectClause(): never { return assertFail("Not supported"); }
    protected visitQueryBodyClause(): never { return assertFail("Not supported"); }
    protected visitSequenceBinding(): never { return assertFail("Not supported"); }

    // QueryExpression[Await] :
    //     FromClause[?Await] QueryBody[Await]
    //
    // QueryBody[Await] :
    //     QueryBodyClauses[?Await]? SelectOrGroupClause[?Await] QueryContinuation[?Await]?
    //
    // QueryContinuation[Await] :
    //     `into` BindingIdentifier[+In, ?Await] QueryBody[?Await]
    protected visitQueryExpression(node: QueryExpression): Expression {
        return this.transformQueryBodyClause(node.query).expression;
    }

    private transformSequenceBinding(node: SequenceBinding): BoundQuery {
        let q = BoundQuery.from(this.visit(node.expression), node.await);
        return q.into(this.visitBindingName(node.name));
    }

    // FromClause[Await] :
    //     `from` SequenceBinding[?Await] `in` SequenceSource[?Await]
    //
    //  > from b in a
    //  > select b
    //
    //  $iq.from(a)
    //     .select(b => b)
    //
    //  > from b in a
    //  > from d in c
    //  > select { b, d }
    //
    //  $iq.from(a)
    //     .selectMany(b => $iq.from(c), (b, d) => ({b, d}))
    //
    //  > from b in childof a with hierarchy h
    //  > select b
    //
    //  $iq.from(a)
    //      .toHierarchy(h)
    //      .children()
    //      .select(b => b)
    //
    //  > from await b in a
    //  > select b
    //
    //  $iq.fromAsync(a)
    //      .select(b => b)
    //
    //  > from { b = 0 } in a
    //  > where b > 0
    //  > select b
    //
    //  $iq.from(a)
    //      .select(({ b = 0 }) => b)
    //      .where(b => b > 0)
    //      .select(b => b)
    //
    private transformFromClause(node: FromClause): BoundQuery {
        const q = this.transformSequenceBinding(node.sequenceBinding);
        return node.outerClause ? this.transformQueryBodyClause(node.outerClause).crossJoin(q) : q;
    }

    // LetClause[Await] :
    //     `let` BindingIdentifier[?Await] `=` AssignmentExpression[+In, ?Await]
    //
    //  > from b in a
    //  > let c = b
    //  > select c
    //
    //  $iq.from(a)
    //      .select(b => ({ b, c: b }))
    //      .select(({ b, c }) => c)
    //
    private transformLetClause(node: LetClause): BoundQuery {
        const bindings = getBoundNames(node.name);
        const q = this.transformQueryBodyClause(node.outerClause);
        return q
            .select(
                Syntax.Arrow(q.async, [getBindingsParameter(q.bindings)], undefined, Syntax.Block([
                    Syntax.Let([Syntax.Var(this.visitBindingName(node.name), this.visit(node.expression))]),
                    Syntax.Return(getBindingsExpression([...q.bindings, ...bindings]))
                ])))
            .setBindings([...q.bindings, ...bindings]);
    }

    // WhereClause[Await] :
    //     `where` AssignmentExpression[+In, ?Await]
    //
    //  > from b in a
    //  > where b > 0
    //  > select b
    //
    //  $iq.from(a)
    //      .where(b => b > 0)
    //      .select(b => b)
    //
    private transformWhereClause(node: WhereClause): BoundQuery {
        const q = this.transformQueryBodyClause(node.outerClause);
        return q.where(Syntax.Arrow(false, [getBindingsParameter(q.bindings)], undefined, this.visit(node.expression)));
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
    //
    //  > from b in a
    //  > orderby b.x
    //  > select b
    //
    //  $iq.from(a)
    //      .orderBy(b => b.x)
    //      .select(b => b)
    //
    //  > from b in a
    //  > orderby b.x descending
    //  > select b
    //
    //  $iq.from(a)
    //      .orderByDescending(b => b.x)
    //      .select(b => b)
    //
    //  > from b in a
    //  > orderby b.x, b.y
    //  > select b
    //
    //  $iq.from(a)
    //      .orderBy(b => b.x)
    //      .thenBy(b => b.y)
    //      .select(b => b)
    //
    //  > from b in a
    //  > orderby b using f
    //  > select b
    //
    //  $iq.from(a)
    //      .orderBy(b => b, f)
    //      .select(b => b)
    //
    private transformOrderbyClause(node: OrderbyClause): BoundQuery {
        let q = this.transformQueryBodyClause(node.outerClause);
        let first = true;
        for (const comparator of node.comparators) {
            const methodName = first
                ? isDescending(comparator) ? "orderByDescending" : "orderBy"
                : isDescending(comparator) ? "thenByDescending" : "thenBy";
            q = q[methodName](
                Syntax.Arrow(q.async, [getBindingsParameter(q.bindings)], undefined, this.visit(comparator.expression)),
                comparator.usingExpression && this.visit(comparator.usingExpression));
        }
        return q;
    }

    // GroupClause[Await] :
    //     `group` AssignmentExpression[+In, ?Await] `by` AssignmentExpression[+In, ?Await]
    //
    //  > from b in a
    //  > group b by b.x
    //
    //  $iq.from(a)
    //      .groupBy(b => b.x, b => b)
    //
    //  > from b in a
    //  > group b by b.x into c
    //  > select c
    //
    //  $iq.from(a)
    //      .groupBy(b => b.x, b => b)
    //      .select(c => c)
    //
    private transformGroupClause(node: GroupClause): BoundQuery {
        const q = this.transformQueryBodyClause(node.outerClause);
        return q
            .groupBy(
                Syntax.Arrow(false, [getBindingsParameter(q.bindings)], undefined, this.visit(node.keySelector)),
                Syntax.Arrow(q.async, [getBindingsParameter(q.bindings)], undefined, this.visit(node.elementSelector)))
            .into(node.into);
    }

    // JoinClause[Await] :
    //     `join` SequenceBinding[?Await] `in` SequenceSource[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await]
    //     `join` SequenceBinding[?Await] `in` SequenceSource[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await] `into` BindingIdentifier[?Await]
    //
    //  > from b in a
    //  > join d in c on b.x equals d.x
    //  > select { b, d }
    //
    //  $iq.from(a)
    //      .join(c, b => b.x, d => d.x, (b, d) => ({ b, d }))
    //      .select(({ b, d }) => ({ b, d }))
    //
    //  > from b in a
    //  > join d in c on b.x equals d.x into e
    //  > select { b, e }
    //
    //  $iq.from(a)
    //      .groupJoin(c, b => b.x, d => d.x, (b, e) => ({ b, e }))
    //      .select(({ b, e }) => ({ b, e }))
    //
    //  > from b in a
    //  > join d in childof c with hierarchy h on b.x equals d.x
    //  > select { b, d }
    //
    //  $iq.from(a)
    //      .join($iq.from(c).toHierarchy(h).children(), b => b.x, d => d.x, (b, d) => ({ b, d }))
    //      .select(({ b, d }) => ({ b, d }))
    //
    private transformJoinClause(node: JoinClause): BoundQuery {
        const inner = this.transformSequenceBinding(node.sequenceBinding);
        const bindings = node.into ? getBoundNames(node.into) : inner.bindings;
        const methodName = node.into ? "groupJoin" : "join";
        const q = this.transformQueryBodyClause(node.outerClause);
        return q[methodName](
                inner,
                Syntax.Arrow(false, [getBindingsParameter(q.bindings)], undefined, this.visit(node.outerKeySelector)),
                Syntax.Arrow(false, [getBindingsParameter(inner.bindings)], undefined, this.visit(node.keySelector)),
                Syntax.Arrow(q.async || inner.async, [getBindingsParameter(q.bindings), node.into ? this.visitBindingName(node.into) : getBindingsParameter(bindings)], undefined, getBindingsExpression([...q.bindings, ...bindings])))
            .setBindings([...q.bindings, ...bindings]);
    }

    // SelectClause[Await] :
    //     `select` AssignmentExpression[+In, ?Await]
    //
    //  > from b in a
    //  > select b
    //
    //  $iq.from(a)
    //      .select(b => b)
    //
    //  > from b in a
    //  > select b into c
    //  > select c
    //
    //  $iq.from(a)
    //      .select(b => b)
    //      .select(c => c)
    //
    private transformSelectClause(node: SelectClause): BoundQuery {
        const q = this.transformQueryBodyClause(node.outerClause);
        return q
            .select(Syntax.Arrow(q.async, [getBindingsParameter(q.bindings)], undefined, this.visit(node.expression)))
            .into(node.into);
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
    private transformQueryBodyClause(node: QueryBodyClause): BoundQuery {
        switch (node.kind) {
            case SyntaxKind.FromClause: return this.transformFromClause(node);
            case SyntaxKind.LetClause: return this.transformLetClause(node);
            case SyntaxKind.WhereClause: return this.transformWhereClause(node);
            case SyntaxKind.OrderbyClause: return this.transformOrderbyClause(node);
            case SyntaxKind.GroupClause: return this.transformGroupClause(node);
            case SyntaxKind.JoinClause: return this.transformJoinClause(node);
            case SyntaxKind.SelectClause: return this.transformSelectClause(node);
        }
    }
}

// function sameReference(left: Expression | Identifier, right: Expression | Identifier) {
//     return left === right
//         || (isIdentifier(left) && isIdentifier(right) && left.text === right.text);
// }

function asQuery(expression: Expression) {
    return Syntax.Call(Syntax.Property(Syntax.Identifier("$iq"), "from"), [expression]);
}

function asAsyncQuery(expression: Expression) {
    return Syntax.Call(Syntax.Property(Syntax.Identifier("$iq"), "fromAsync"), [expression]);
}

function callQueryMethod(expression: Expression, method: Extract<keyof OrderedHierarchyQuery<any>, string>, argumentList: ReadonlyArray<Argument | Expression>) {
    return Syntax.Call(Syntax.Property(expression, method), argumentList);
}

function isDescending(comparator: OrderbyComparator) {
    return comparator.direction === Token.DescendingKeyword;
}

function getBoundNames(name: BindingName) {
    const boundNames: BindingIdentifier[] = [];
    visit(name);
    return boundNames;

    function visit(node: BindingName | ObjectBindingPatternElement | BindingRestProperty | ArrayBindingPatternElement | BindingRestElement | undefined): void {
        if (!node) return;
        switch (node.kind) {
            case SyntaxKind.Identifier:
                return void boundNames.push(node);
            case SyntaxKind.ObjectBindingPattern:
                return node.properties.forEach(visit), visit(node.rest);
            case SyntaxKind.ArrayBindingPattern:
                return node.elements.forEach(visit), visit(node.rest);
            case SyntaxKind.BindingRestProperty:
                return visit(node.name);
            case SyntaxKind.BindingProperty:
                return visit(node.bindingElement);
            case SyntaxKind.ShorthandBindingProperty:
                return visit(node.name);
            case SyntaxKind.BindingRestElement:
                return visit(node.name);
            case SyntaxKind.BindingElement:
                return visit(node.name);
            case SyntaxKind.Elision:
                return;
            default:
                return assertNever(node);
        }
    }
}

function getBindingsParameter(bindings: ReadonlyArray<BindingIdentifier>) {
    if (bindings.length === 1) return Syntax.BindingElement(bindings[0]);
    const properties: ObjectBindingPatternElement[] = [];
    for (const binding of bindings) {
        properties.push(Syntax.ShorthandBindingProperty(binding, undefined));
    }
    return Syntax.BindingElement(Syntax.ObjectBindingPattern(properties, undefined));
}

function getBindingsExpression(bindings: ReadonlyArray<BindingIdentifier>) {
    if (bindings.length === 1) return bindings[0];
    const properties: ObjectLiteralElement[] = [];
    for (const binding of bindings) {
        properties.push(Syntax.ShorthandPropertyDefinition(binding));
    }
    return Syntax.ObjectLiteral(properties);
}
import {
    FromClause, LetClause, WhereClause, OrderbyClause, GroupClause, JoinClause, SelectClause,
    QueryBodyClause, SyntaxKind, Expression, QueryExpression, ObjectLiteralElement,
    OrderbyComparator,
    Argument, BindingIdentifier,
    ObjectBindingPatternElement,
    Syntax,
    BindingName,
    ArrayBindingPatternElement,
    BindingRestProperty,
    BindingRestElement,
    ArrowFunction,
    QueryBody,
    SelectOrGroupClause,
    QueryContinuation,
} from "./syntax";
import { ExpressionVisitor } from "./visitor";
import { OrderedHierarchyQuery } from "iterable-query";
import { assertFail, assertNever } from "./utils";
import { Token } from "./tokens";

abstract class BaseRange {
    readonly expression: Expression;
    readonly async: boolean;

    constructor(expression: Expression, async: boolean) {
        this.expression = expression;
        this.async = async;
    }

    select(projection: ArrowFunction): UnboundRange {
        const expression = callQueryMethod(this.expression, "select", [projection]);
        return new UnboundRange(expression, this.async);
    }

    selectMany(projection: ArrowFunction, resultSelector: ArrowFunction): UnboundRange {
        const expression = callQueryMethod(this.expression, "selectMany", [projection, resultSelector]);
        return new UnboundRange(expression, this.async);
    }

    groupBy(keySelector: ArrowFunction, elementSelector: ArrowFunction): UnboundRange {
        const expression = callQueryMethod(this.expression, "groupBy", [keySelector, elementSelector]);
        return new UnboundRange(expression, this.async);
    }
}

class UnboundRange extends BaseRange {
    static from(expression: Expression, async: boolean): UnboundRange {
        expression = async ? asAsyncQuery(expression) : asQuery(expression);
        return new UnboundRange(expression, async);
    }

    into(name: BindingName | undefined): BoundRange {
        if (!name) return this.setBindings([]);
        const bindings = getBoundNames(name);
        return name.kind !== SyntaxKind.Identifier
            ? this.select(Syntax.Arrow(false, [name], undefined, getBindingsExpression(bindings))).setBindings(bindings)
            : this.setBindings(bindings);
    }

    setBindings(bindings: ReadonlyArray<BindingIdentifier>): BoundRange {
        return new BoundRange(bindings, this.expression, this.async);
    }
}

class BoundRange extends BaseRange {
    readonly bindings: ReadonlyArray<BindingIdentifier>;

    constructor(bindings: ReadonlyArray<BindingIdentifier>, expression: Expression, async: boolean) {
        super(expression, async);
        this.bindings = bindings;
    }

    where(predicate: ArrowFunction): BoundRange {
        const expression = callQueryMethod(this.expression, "where", [predicate]);
        return new BoundRange(this.bindings, expression, this.async);
    }

    orderBy(keySelector: ArrowFunction): BoundRange {
        return this._applyOrder("orderBy", keySelector);
    }

    orderByDescending(keySelector: ArrowFunction): BoundRange {
        return this._applyOrder("orderByDescending", keySelector);
    }

    thenBy(keySelector: ArrowFunction): BoundRange {
        return this._applyOrder("thenBy", keySelector);
    }

    thenByDescending(keySelector: ArrowFunction): BoundRange {
        return this._applyOrder("thenByDescending", keySelector);
    }

    private _applyOrder(methodName: "orderBy" | "orderByDescending" | "thenBy" | "thenByDescending", keySelector: ArrowFunction): BoundRange {
        const expression = callQueryMethod(this.expression, methodName, [keySelector]);
        return new BoundRange(this.bindings, expression, this.async);
    }

    crossJoin(inner: BoundRange): BoundRange {
        const q = !this.async && inner.async ? this.toAsyncQuery() : this;
        return q
            .selectMany(
                Syntax.Arrow(false, [getBindingsParameter(this.bindings)], undefined, inner.expression),
                Syntax.Arrow(false, [getBindingsParameter(this.bindings), getBindingsParameter(inner.bindings)], undefined, getBindingsExpression([...this.bindings, ...inner.bindings]))
            )
            .setBindings([...this.bindings, ...inner.bindings]);
    }

    join(inner: BoundRange, outerKeySelector: ArrowFunction, innerKeySelector: ArrowFunction, resultSelector: ArrowFunction): UnboundRange {
        return this._applyJoin("join", inner, outerKeySelector, innerKeySelector, resultSelector);
    }

    groupJoin(inner: BoundRange, outerKeySelector: ArrowFunction, innerKeySelector: ArrowFunction, resultSelector: ArrowFunction): UnboundRange {
        return this._applyJoin("groupJoin", inner, outerKeySelector, innerKeySelector, resultSelector);
    }

    private _applyJoin(methodName: "join" | "groupJoin", inner: BoundRange, outerKeySelector: ArrowFunction, innerKeySelector: ArrowFunction, resultSelector: ArrowFunction) {
        const q = !this.async && inner.async ? this.toAsyncQuery() : this;
        const expression = callQueryMethod(q.expression, methodName, [
            inner.expression,
            outerKeySelector,
            innerKeySelector,
            resultSelector
        ]);
        return new UnboundRange(expression, q.async);
    }

    toAsyncQuery() {
        if (this.async) return this;
        const expression = asAsyncQuery(this.expression);
        return new BoundRange(this.bindings, expression, true);
    }
}

/** @internal */
export class Transformer extends ExpressionVisitor {
    // These nodes must be transformed, never visited directly
    protected visitQueryBody(): never { return assertFail("Not supported"); }
    protected visitQueryBodyClause(): never { return assertFail("Not supported"); }
    protected visitFromClause(): never { return assertFail("Not supported"); }
    protected visitLetClause(): never { return assertFail("Not supported"); }
    protected visitWhereClause(): never { return assertFail("Not supported"); }
    protected visitOrderbyClause(): never { return assertFail("Not supported"); }
    protected visitJoinClause(): never { return assertFail("Not supported"); }
    protected visitSelectOrGroupClause(): never { return assertFail("Not supported"); }
    protected visitSelectClause(): never { return assertFail("Not supported"); }
    protected visitGroupClause(): never { return assertFail("Not supported"); }
    protected visitQueryContinuation(): never { return assertFail("Not supported"); }

    //  QueryExpression :
    //      FromClause QueryBody
    protected visitQueryExpression(node: QueryExpression): Expression {
        const boundQuery = this.transformSequenceBinding(node.fromClause);
        return this.transformQueryBody(boundQuery, node.queryBody).expression;
    }

    //  QueryBody :
    //      QueryBodyClauses? SelectOrGroupClause QueryContinuation?
    private transformQueryBody(boundQuery: BoundRange, node: QueryBody): UnboundRange {
        for (const clause of node.queryBodyClauses) {
            boundQuery = this.transformQueryBodyClause(boundQuery, clause);
        }
        const unboundQuery = this.transformSelectOrGroupClause(boundQuery, node.selectOrGroupClause);
        return node.queryContinuation ? this.transformQueryContinuation(unboundQuery, node.queryContinuation) : unboundQuery;
    }

    //  QueryBodyClauses :
    //      QueryBodyClause
    //      QueryBodyClauses QueryBodyClause
    //
    //  QueryBodyClause :
    //      FromClause
    //      LetClause
    //      WhereClause
    //      JoinClause
    //      OrderbyClause
    private transformQueryBodyClause(boundQuery: BoundRange, node: QueryBodyClause): BoundRange {
        switch (node.kind) {
            case SyntaxKind.FromClause: return this.transformFromClause(boundQuery, node);
            case SyntaxKind.LetClause: return this.transformLetClause(boundQuery, node);
            case SyntaxKind.WhereClause: return this.transformWhereClause(boundQuery, node);
            case SyntaxKind.OrderbyClause: return this.transformOrderbyClause(boundQuery, node);
            case SyntaxKind.JoinClause: return this.transformJoinClause(boundQuery, node);
            default: return assertNever(node);
        }
    }

    //  SelectOrGroupClause :
    //      SelectClause
    //      GroupClause
    private transformSelectOrGroupClause(boundQuery: BoundRange, node: SelectOrGroupClause): UnboundRange {
        switch (node.kind) {
            case SyntaxKind.GroupClause: return this.transformGroupClause(boundQuery, node);
            case SyntaxKind.SelectClause: return this.transformSelectClause(boundQuery, node);
            default: return assertNever(node);
        }
    }

    //  QueryContinuation :
    //      `into` RangeBinding QueryBody
    private transformQueryContinuation(unboundQuery: UnboundRange, node: QueryContinuation): UnboundRange {
        const boundQuery = unboundQuery.into(this.visitBindingName(node.name));
        return this.transformQueryBody(boundQuery, node.queryBody);
    }

    private transformSequenceBinding(node: FromClause | JoinClause) {
        return UnboundRange
            .from(this.visit(node.expression), node.await)
            .into(this.visitBindingName(node.name));
    }

    //  FromClause :
    //      `from` `await`? RangeBinding `of` AssignmentExpression[+In, ~Yield, ~Await]
    //
    //  > from b of a
    //  > select b
    //
    //  $iq.from(a)
    //     .select(b => b)
    //
    //  > from b of a
    //  > from d of c
    //  > select { b, d }
    //
    //  $iq.from(a)
    //     .selectMany(b => $iq.from(c), (b, d) => ({b, d}))
    //
    //  > from await b of a
    //  > select b
    //
    //  $iq.fromAsync(a)
    //      .select(b => b)
    //
    //  > from { b = 0 } of a
    //  > where b > 0
    //  > select b
    //
    //  $iq.from(a)
    //      .select(({ b = 0 }) => b)
    //      .where(b => b > 0)
    //      .select(b => b)
    //
    private transformFromClause(outer: BoundRange, node: FromClause): BoundRange {
        const inner = this.transformSequenceBinding(node);
        return outer.crossJoin(inner);
    }

    //  JoinClause :
    //     `join` `await`? RangeBinding `of` AssignmentExpression[+In, ~Yield, ~Await] `on` AssignmentExpression[+In, ~Yield, ~Await] `equals` AssignmentExpression[+In, ~Yield, ~Await]
    //     `join` `await`? RangeBinding `of` AssignmentExpression[+In, ~Yield, ~Await] `on` AssignmentExpression[+In, ~Yield, ~Await] `equals` AssignmentExpression[+In, ~Yield, ~Await] `into` RangeBinding
    //
    //  > from b of a
    //  > join d of c on b.x equals d.x
    //  > select { b, d }
    //
    //  $iq.from(a)
    //      .join(c, b => b.x, d => d.x, (b, d) => ({ b, d }))
    //      .select(({ b, d }) => ({ b, d }))
    //
    //  > from b of a
    //  > join d of c on b.x equals d.x into e
    //  > select { b, e }
    //
    //  $iq.from(a)
    //      .groupJoin(c, b => b.x, d => d.x, (b, e) => ({ b, e }))
    //      .select(({ b, e }) => ({ b, e }))
    //
    //  > from b of a
    //  > join d of childof c with hierarchy h on b.x equals d.x
    //  > select { b, d }
    //
    //  $iq.from(a)
    //      .join($iq.from(c).toHierarchy(h).children(), b => b.x, d => d.x, (b, d) => ({ b, d }))
    //      .select(({ b, d }) => ({ b, d }))
    //
    private transformJoinClause(outer: BoundRange, node: JoinClause): BoundRange {
        const inner = this.transformSequenceBinding(node);
        const bindings = node.into ? getBoundNames(node.into) : inner.bindings;
        const methodName = node.into ? "groupJoin" : "join";
        return outer[methodName](
                inner,
                Syntax.Arrow(false, [getBindingsParameter(outer.bindings)], undefined, this.visit(node.outerKeySelector)),
                Syntax.Arrow(false, [getBindingsParameter(inner.bindings)], undefined, this.visit(node.keySelector)),
                Syntax.Arrow(outer.async || inner.async, [getBindingsParameter(outer.bindings), node.into ? this.visitBindingName(node.into) : getBindingsParameter(bindings)], undefined, getBindingsExpression([...outer.bindings, ...bindings])))
            .setBindings([...outer.bindings, ...bindings]);
    }

    //  LetClause :
    //      `let` RangeBinding `=` AssignmentExpression[+In, ~Yield, ~Await]
    //
    //  > from b of a
    //  > let c = b
    //  > select c
    //
    //  $iq.from(a)
    //      .select(b => ({ b, c: b }))
    //      .select(({ b, c }) => c)
    //
    private transformLetClause(outer: BoundRange, node: LetClause): BoundRange {
        const bindings = getBoundNames(node.name);
        return outer
            .select(
                Syntax.Arrow(outer.async, [getBindingsParameter(outer.bindings)], undefined, Syntax.Block([
                    Syntax.Let([Syntax.Var(this.visitBindingName(node.name), this.visit(node.expression))]),
                    Syntax.Return(getBindingsExpression([...outer.bindings, ...bindings]))
                ])))
            .setBindings([...outer.bindings, ...bindings]);
    }

    //  WhereClause :
    //      `where` AssignmentExpression[+In, ~Yield, ~Await]
    //
    //  > from b of a
    //  > where b > 0
    //  > select b
    //
    //  $iq.from(a)
    //      .where(b => b > 0)
    //      .select(b => b)
    //
    private transformWhereClause(outer: BoundRange, node: WhereClause): BoundRange {
        return outer.where(Syntax.Arrow(false, [getBindingsParameter(outer.bindings)], undefined, this.visit(node.expression)));
    }

    //  OrderbyClause :
    //      `orderby` OrderbyComparatorList
    //
    // OrderbyComparatorList[Await] :
    //     OrderbyComparator[?Await]
    //     OrderbyComparatorList[?Await] `,` OrderbyComparator[?Await]
    //
    //  OrderbyComparatorList :
    //      OrderbyComparator
    //      OrderbyComparatorList `,` OrderbyComparator
    //
    //  OrderbyUsingClause :
    //      `using` AssignmentExpression[+In, ~Yield, ~Await]
    //
    //  OrderbyComparator :
    //      AssignmentExpression[+In, ~Yield, ~Await] `ascending`? OrderbyUsingClause?
    //      AssignmentExpression[+In, ~Yield, ~Await] `descending` OrderbyUsingClause?
    //
    //  > from b of a
    //  > orderby b.x
    //  > select b
    //
    //  $iq.from(a)
    //      .orderBy(b => b.x)
    //      .select(b => b)
    //
    //  > from b of a
    //  > orderby b.x descending
    //  > select b
    //
    //  $iq.from(a)
    //      .orderByDescending(b => b.x)
    //      .select(b => b)
    //
    //  > from b of a
    //  > orderby b.x, b.y
    //  > select b
    //
    //  $iq.from(a)
    //      .orderBy(b => b.x)
    //      .thenBy(b => b.y)
    //      .select(b => b)
    //
    //  > from b of a
    //  > orderby b using f
    //  > select b
    //
    //  $iq.from(a)
    //      .orderBy(b => b, f)
    //      .select(b => b)
    //
    private transformOrderbyClause(outer: BoundRange, node: OrderbyClause): BoundRange {
        let first = true;
        for (const comparator of node.comparators) {
            const methodName = first
                ? isDescending(comparator) ? "orderByDescending" : "orderBy"
                : isDescending(comparator) ? "thenByDescending" : "thenBy";
            outer = outer[methodName](
                Syntax.Arrow(outer.async, [getBindingsParameter(outer.bindings)], undefined, this.visit(comparator.expression)));
        }
        return outer;
    }

    //  GroupClause :
    //      `group` AssignmentExpression[+In, ~Yield, ~Await] `by` AssignmentExpression[+In, ~Yield, ~Await]
    //
    //  > from b of a
    //  > group b by b.x
    //
    //  $iq.from(a)
    //      .groupBy(b => b.x, b => b)
    //
    //  > from b of a
    //  > group b by b.x into c
    //  > select c
    //
    //  $iq.from(a)
    //      .groupBy(b => b.x, b => b)
    //      .select(c => c)
    //
    private transformGroupClause(outer: BoundRange, node: GroupClause): UnboundRange {
        return outer
            .groupBy(
                Syntax.Arrow(false, [getBindingsParameter(outer.bindings)], undefined, this.visit(node.keySelector)),
                Syntax.Arrow(outer.async, [getBindingsParameter(outer.bindings)], undefined, this.visit(node.elementSelector)));
    }

    //  SelectClause :
    //      `select` AssignmentExpression[+In, ~Yield, ~Await]
    //
    //  > from b of a
    //  > select b
    //
    //  $iq.from(a)
    //      .select(b => b)
    //
    //  > from b of a
    //  > select b into c
    //  > select c
    //
    //  $iq.from(a)
    //      .select(b => b)
    //      .select(c => c)
    //
    private transformSelectClause(outer: BoundRange, node: SelectClause): UnboundRange {
        return outer
            .select(Syntax.Arrow(outer.async, [getBindingsParameter(outer.bindings)], undefined, this.visit(node.expression)));
    }
}

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
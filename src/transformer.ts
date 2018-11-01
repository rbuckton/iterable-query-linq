import {
    FromClause, LetClause, WhereClause, OrderbyClause, GroupClause, JoinClause, SelectClause,
    QueryBodyClause, SyntaxKind, Expression, QueryExpression, ObjectLiteralElement,
    OrderbyComparator, AssignmentExpressionOrHigher, MemberExpressionOrHigher,
    HierarchyAxisKeyword, SequenceBinding, Argument, BindingIdentifier,
    ObjectBindingPatternElement, BindingElement,
} from "./types";
import { Expr } from "./factory";
import { ExpressionVisitor } from "./visitor";
import { OrderedHierarchyQuery } from "iterable-query/dist/lib";
import { assertFail } from "./utils";

class Scope {
    readonly bindings: ReadonlyArray<BindingIdentifier>;
    readonly outerScope: Scope | undefined;
    private _boundNames: Map<string, BindingIdentifier> | undefined;

    constructor(bindings: ReadonlyArray<BindingIdentifier>, outerScope?: Scope) {
        this.bindings = bindings;
        this.outerScope = outerScope;
    }

    get boundNames(): ReadonlyMap<string, BindingIdentifier> {
        if (!this._boundNames) {
            this._boundNames = new Map<string, BindingIdentifier>();
            for (const binding of this.bindings) {
                this._boundNames.set(binding.text, binding);
            }
        }
        return this._boundNames;
    }

    protected resolveLocalName(name: string): MemberExpressionOrHigher | undefined {
        return this.boundNames.get(name);
    }

    resolveName(name: string): MemberExpressionOrHigher {
        const boundName = this.resolveLocalName(name) || this.outerScope && this.outerScope.resolveName(name);
        if (!boundName) throw new Error(`'${name}' not found`);
        return boundName;
    }

    createScope(bindings: ReadonlyArray<BindingIdentifier>) {
        return new Scope(bindings, this);
    }
}

abstract class QueryBuilderBase {
    readonly bindings: ReadonlyArray<BindingIdentifier>;
    readonly async: boolean;
    constructor(bindings: ReadonlyArray<BindingIdentifier>, async: boolean) {
        if (bindings.length === 0) throw new Error();
        this.bindings = bindings;
        this.async = async;
    }

    createBindingsExpression(localName?: BindingIdentifier, initializer?: AssignmentExpressionOrHigher): AssignmentExpressionOrHigher {
        if (this.bindings.length === 1) return this.bindings[0];
        const properties: ObjectLiteralElement[] = [];
        this.writeBindings(properties, localName);
        if (localName) {
            const binding = initializer && !sameReference(localName, initializer)
                ? Expr.propertyDefinition(localName, initializer)
                : Expr.shorthandPropertyDefinition(localName);
            properties.push(binding);
        }
        return Expr.objectLiteral(properties);
    }

    protected writeBindings(properties: ObjectLiteralElement[], localName?: BindingIdentifier): void {
        for (const binding of this.bindings) {
            if (localName && sameReference(binding, localName)) continue;
            properties.push(Expr.shorthandPropertyDefinition(binding));
        }
    }

    finishContext(expression: AssignmentExpressionOrHigher) {
        return new QueryContext(this.bindings, expression, this.async);
    }
}

class StartQuery extends QueryBuilderBase {
    readonly name: BindingIdentifier;
    constructor(name: BindingIdentifier, async: boolean) {
        super([name], async);
        this.name = name;
    }
}

class AddLocal extends QueryBuilderBase {
    readonly name: BindingIdentifier;

    constructor(sourceContext: QueryContext, name: BindingIdentifier) {
        super([...sourceContext.bindings, name], sourceContext.async);
        this.name = name;
    }
}

class CopyQuery extends QueryBuilderBase {
    constructor(sourceContext: QueryContext) {
        super(sourceContext.bindings, sourceContext.async);
    }
}

class JoinQuery extends QueryBuilderBase {
    readonly outerContext: QueryContext;
    readonly innerContext: QueryBuilderBase;
    constructor(outerContext: QueryContext, innerContext: QueryBuilderBase) {
        super([...outerContext.bindings, ...innerContext.bindings], outerContext.async || innerContext.async);
        this.outerContext = outerContext;
        this.innerContext = innerContext;
    }
}

class QueryContext extends Scope {
    readonly expression: AssignmentExpressionOrHigher;
    readonly async: boolean;
    private _parameter?: BindingElement;

    constructor(bindings: ReadonlyArray<BindingIdentifier>, expression: AssignmentExpressionOrHigher, async: boolean) {
        super(bindings);
        this.expression = expression;
        this.async = async;
    }

    get parameter() {
        if (!this._parameter) {
            if (this.bindings.length > 1) {
                const properties: ObjectBindingPatternElement[] = [];
                for(const binding of this.bindings) {
                    properties.push(Expr.shorthandBindingProperty(binding, undefined));
                }
                return this._parameter = Expr.bindingElement(Expr.objectBindingPattern(properties, undefined));
            }
            return this._parameter = Expr.bindingElement(this.bindings[0]);
        }
        return this._parameter;
    }
}

/** @internal */
export class Transformer extends ExpressionVisitor {
    visit(node: Expression): Expression {
        return this.visitExpression(node);
    }

    protected visitAssignmentExpressionOrHigher(node: AssignmentExpressionOrHigher): AssignmentExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.QueryExpression: return this.transformQueryExpression(node);
            default: return super.visitAssignmentExpressionOrHigher(node);
        }
    }

    // These nodes must be transformed, never visited directly
    protected visitFromClause(): never { return assertFail("Not supported"); }
    protected visitLetClause(): never { return assertFail("Not supported"); }
    protected visitWhereClause(): never { return assertFail("Not supported"); }
    protected visitOrderbyClause(): never { return assertFail("Not supported"); }
    protected visitGroupClause(): never { return assertFail("Not supported"); }
    protected visitJoinClause(): never { return assertFail("Not supported"); }
    protected visitSelectClause(): never { return assertFail("Not supported"); }
    protected visitSequenceBinding(): never { return assertFail("Not supported"); }
    protected visitQueryBodyClause(): never { return assertFail("Not supported"); }
    protected visitQueryExpression(): never { return assertFail("Not supported"); }

    private bindSequence(binding: SequenceBinding, ensureQuery: boolean) {
        let expression = this.visitAssignmentExpressionOrHigher(binding.expression);
        if (ensureQuery || binding.withHierarchy || binding.hierarchyAxisKeyword) {
            expression = binding.awaitKeyword ? asAsyncQuery(expression) : asQuery(expression);
            expression = binding.withHierarchy ? callQueryMethod(expression, "toHierarchy", [this.visitAssignmentExpressionOrHigher(binding.withHierarchy)]) : expression;
            expression = binding.hierarchyAxisKeyword ? callQueryMethod(expression, getAxis(binding.hierarchyAxisKeyword), []) : expression;
        }
        return expression;
    }

    private bindOuterSource(context: QueryContext, binding: SequenceBinding | undefined) {
        let expression = context.expression;
        if (binding && binding.awaitKeyword && !context.async) expression = asAsyncQuery(expression);
        return expression;
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
    private transformFromClause(node: FromClause): QueryContext {
        const context = node.outerClause && this.transformQueryBodyClause(node.outerClause);
        let fromBuilder: QueryBuilderBase = new StartQuery(node.sequenceBinding.name, !!node.sequenceBinding.awaitKeyword);
        let expression: AssignmentExpressionOrHigher = this.bindSequence(node.sequenceBinding, !node.outerClause);
        if (context) {
            const asyncKeyword = node.sequenceBinding.awaitKeyword ? Expr.token(SyntaxKind.AsyncKeyword) : undefined;
            fromBuilder = new JoinQuery(context, fromBuilder);
            expression = callQueryMethod(this.bindOuterSource(context, node.sequenceBinding), "selectMany", [
                Expr.arrow(undefined, [context.parameter], undefined, expression),
                Expr.arrow(asyncKeyword, [context.parameter, node.sequenceBinding.name], undefined, fromBuilder.createBindingsExpression())
            ]);
        }
        return fromBuilder.finishContext(expression);
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
    private transformLetClause(node: LetClause): QueryContext {
        const context = this.transformQueryBodyClause(node.outerClause);
        const letBuilder = new AddLocal(context, node.name);
        const asyncKeyword = context.async ? Expr.token(SyntaxKind.AsyncKeyword) : undefined;
        const expression = callQueryMethod(context.expression, "select", [
            Expr.arrow(asyncKeyword, [context.parameter], undefined, letBuilder.createBindingsExpression(node.name, this.visitAssignmentExpressionOrHigher(node.expression)))
        ]);
        return letBuilder.finishContext(expression);
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
    private transformWhereClause(node: WhereClause): QueryContext {
        const context = this.transformQueryBodyClause(node.outerClause);
        const whereBuilder = new CopyQuery(context);
        const asyncKeyword = context.async ? Expr.token(SyntaxKind.AsyncKeyword) : undefined;
        const expression = callQueryMethod(context.expression, "where", [
            Expr.arrow(asyncKeyword, [context.parameter], undefined, this.visitAssignmentExpressionOrHigher(node.expression))
        ]);
        return whereBuilder.finishContext(expression);
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
    private transformOrderbyClause(node: OrderbyClause): QueryContext {
        const context = this.transformQueryBodyClause(node.outerClause);
        const orderbyBuilder = new CopyQuery(context);
        let expression = context.expression;
        let first = true;
        for (const comparator of node.comparators) {
            const methodName = first
                ? isDescending(comparator) ? "orderByDescending" : "orderBy"
                : isDescending(comparator) ? "thenByDescending" : "thenBy";
            const argumentList: Argument[] = [
                Expr.arrow(undefined, [context.parameter], undefined, this.visitAssignmentExpressionOrHigher(comparator.expression))
            ];
            if (comparator.usingExpression) {
                argumentList.push(this.visitAssignmentExpressionOrHigher(comparator.usingExpression));
            }
            expression = callQueryMethod(expression, methodName, argumentList);
            first = false;
        }
        return orderbyBuilder.finishContext(expression);
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
    private transformGroupClause(node: GroupClause): QueryContext {
        const context = this.transformQueryBodyClause(node.outerClause);
        const groupBuilder = node.into
            ? new StartQuery(node.into, context.async)
            : new CopyQuery(context);
        const asyncKeyword = context.async ? Expr.token(SyntaxKind.AsyncKeyword) : undefined;
        const expression: AssignmentExpressionOrHigher = callQueryMethod(context.expression, "groupBy", [
            Expr.arrow(undefined, [context.parameter], undefined, this.visitAssignmentExpressionOrHigher(node.keySelector)),
            Expr.arrow(asyncKeyword, [context.parameter], undefined, this.visitAssignmentExpressionOrHigher(node.elementSelector))
        ]);
        return groupBuilder.finishContext(expression);
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
    private transformJoinClause(node: JoinClause): QueryContext {
        const context = this.transformQueryBodyClause(node.outerClause);
        const joinBuilder = new JoinQuery(context, new StartQuery(node.into || node.sequenceBinding.name, !!node.sequenceBinding.awaitKeyword));
        const asyncKeyword = node.sequenceBinding.awaitKeyword ? Expr.token(SyntaxKind.AsyncKeyword) : undefined;
        const expression = callQueryMethod(this.bindOuterSource(context, node.sequenceBinding), node.into ? "groupJoin" : "join", [
            this.bindSequence(node.sequenceBinding, false),
            Expr.arrow(undefined, [context.parameter], undefined, this.visitAssignmentExpressionOrHigher(node.outerKeySelector)),
            Expr.arrow(undefined, [node.sequenceBinding.name], undefined, this.visitAssignmentExpressionOrHigher(node.keySelector)),
            Expr.arrow(asyncKeyword, [context.parameter, node.into || node.sequenceBinding.name], undefined, joinBuilder.createBindingsExpression())
        ]);
        return joinBuilder.finishContext(expression);
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
    private transformSelectClause(node: SelectClause): QueryContext {
        const context = this.transformQueryBodyClause(node.outerClause);
        const selectBuilder = node.into
            ? new StartQuery(node.into, context.async)
            : new CopyQuery(context);
        const expression = callQueryMethod(context.expression, "select", [
            Expr.arrow(context.async ? Expr.token(SyntaxKind.AsyncKeyword) : undefined, [context.parameter], undefined, this.visitAssignmentExpressionOrHigher(node.expression))
        ]);
        return selectBuilder.finishContext(expression);
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
    private transformQueryBodyClause(node: QueryBodyClause) {
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

    // QueryExpression[Await] :
    //     FromClause[?Await] QueryBody[Await]
    //
    // QueryBody[Await] :
    //     QueryBodyClauses[?Await]? SelectOrGroupClause[?Await] QueryContinuation[?Await]?
    //
    // QueryContinuation[Await] :
    //     `into` BindingIdentifier[+In, ?Await] QueryBody[?Await]
    private transformQueryExpression(node: QueryExpression) {
        return this.transformQueryBodyClause(node.query).expression;
    }
}

function sameReference(left: Expression, right: Expression) {
    return left === right
        || (left.kind === SyntaxKind.Identifier && right.kind === SyntaxKind.Identifier && left.text === right.text);
}

function asQuery(expression: AssignmentExpressionOrHigher) {
    return Expr.call(Expr.property(Expr.identifier("$iq"), "from"), [expression]);
}

function asAsyncQuery(expression: AssignmentExpressionOrHigher) {
    return Expr.call(Expr.property(Expr.identifier("$iq"), "fromAsync"), [expression]);
}

function callQueryMethod(expression: AssignmentExpressionOrHigher, method: Extract<keyof OrderedHierarchyQuery<any>, string>, argumentList: ReadonlyArray<Argument>) {
    return Expr.call(Expr.property(expression, method), argumentList);
}

function getAxis(hierarchyAxisKeyword: HierarchyAxisKeyword) {
    switch (hierarchyAxisKeyword.kind) {
        case SyntaxKind.RootofKeyword: return "root";
        case SyntaxKind.ParentofKeyword: return "parents";
        case SyntaxKind.ChildrenofKeyword: return "children";
        case SyntaxKind.AncestorsofKeyword: return "ancestors";
        case SyntaxKind.AncestorsorselfofKeyword: return "ancestorsAndSelf";
        case SyntaxKind.DescendantsofKeyword: return "descendants";
        case SyntaxKind.DescendantsorselfofKeyword: return "descendantsAndSelf";
        case SyntaxKind.SelfofKeyword: return "self";
        case SyntaxKind.SiblingsofKeyword: return "siblings";
        case SyntaxKind.SiblingsorselfofKeyword: return "siblingsAndSelf";
    }
}

function isDescending(comparator: OrderbyComparator) {
    return comparator.directionToken !== undefined
        && comparator.directionToken.kind === SyntaxKind.DescendingKeyword;
}
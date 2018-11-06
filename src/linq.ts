import * as vm from "vm";
import * as iq from "iterable-query";
import { Parser } from "./parser";
import { Transformer } from "./transformer";
import { Emitter } from "./emitter";
import { Query, AsyncQuery, from, fromAsync } from "iterable-query";
import { Expression } from "./syntax";
import { isIdentifierPart } from "./scanner";

export function linq<T = any>(array: TemplateStringsArray, ...args: any[]): Query<T> {
    let text = array[0];
    for (let i = 0; i < args.length; i++) {
        if (isIdentifierPart(text.charAt(text.length - 1))) text += " ";
        text += `$arguments[${i}]` + array[i + 1];
    }
    return parseAndExecuteQuery(text, { $arguments: args });
}

export namespace linq {
    export function async<T = any>(array: TemplateStringsArray, ...args: any[]): AsyncQuery<T> {
        let text = array[0];
        for (let i = 0; i < args.length; i++) {
            text += `($arguments[${i}])` + array[i + 1];
        }
        return parseAndExecuteAsyncQuery(text, { $arguments: args });
    }
}

function parseAndExecuteQueryWorker(sourceText: string, context: vm.Context = {}, async: boolean): CompilationResult {
    const expression = new Parser().parse(sourceText, async);
    const compiled = new Transformer().visit(expression);
    const output = new Emitter().emit(compiled);
    const compiledText = `$iq => ${output}`;
    if (!vm.isContext(context)) vm.createContext(context);
    const compiledWrapper = vm.runInContext(compiledText, context);
    return { async, sourceText, compiledText, expression, thunk: () => compiledWrapper(iq) };
}

export function parseAndExecuteQuery<T = any>(sourceText: string, context: vm.Context = {}): Query<T> {
    const result = parseAndExecuteQueryWorker(sourceText, context, false);
    return addCompilationResult(from(new CompilationThunkIterable(parseAndExecuteQueryWorker(sourceText, context, false))), result);
}

export function parseAndExecuteAsyncQuery<T = any>(sourceText: string, context: vm.Context = {}): AsyncQuery<T> {
    const result = parseAndExecuteQueryWorker(sourceText, context, true);
    return addCompilationResult(fromAsync(new CompilationThunkAsyncIterable(result)), result);
}

function isIterable(value: any): value is Iterable<any> {
    return typeof value === "object"
        && value !== null
        && Symbol.iterator in value;
}

function isAsyncIterable(value: any): value is AsyncIterable<any> {
    return typeof value === "object"
        && value !== null
        && Symbol.asyncIterator in value;
}

const weakCompilationResult = new WeakMap<Query<any> | AsyncQuery<any>, CompilationResult>();

class CompilationThunkIterable implements Iterable<any> {
    readonly expression: Expression;
    private _thunk: () => any;
    private _sourceText: string;
    private _compiledText: string;

    constructor({ thunk, expression, sourceText, compiledText }: CompilationResult) {
        this._thunk = thunk;
        this.expression = expression;
        this._sourceText = sourceText;
        this._compiledText = compiledText;
    }

    *[Symbol.iterator](): Iterator<any> {
        const thunk = this._thunk();
        const result = thunk;
        if (isIterable(result)) {
            yield* result;
        }
        else {
            yield result;
        }
    }

    toString(debug = false) {
        return debug ? this._compiledText : this._sourceText;
    }
}

class CompilationThunkAsyncIterable implements AsyncIterable<any> {
    readonly expression: Expression;
    private _thunk: () => any;
    private _sourceText: string;
    private _compiledText: string;

    constructor({ thunk, expression, sourceText, compiledText }: CompilationResult) {
        this._thunk = thunk;
        this.expression = expression;
        this._sourceText = sourceText;
        this._compiledText = compiledText;
    }

    async *[Symbol.asyncIterator](): AsyncIterator<any> {
        const thunk = this._thunk();
        const result = thunk;
        if (isAsyncIterable(result) || isIterable(result)) {
            yield* result;
        }
        else {
            yield result;
        }
    }

    toString(debug = false) {
        return debug ? this._compiledText : this._sourceText;
    }
}

/** @internal */
export interface CompilationResult {
    readonly async: boolean;
    readonly sourceText: string;
    readonly compiledText: string;
    readonly expression: Expression;
    readonly thunk: () => any;
}

function addCompilationResult<T extends Query<any> | AsyncQuery<any>>(value: T, result: CompilationResult): T {
    weakCompilationResult.set(value, result);
    return value;
}

/** @internal */
export function getCompilationResult(value: Query<any> | AsyncQuery<any>): CompilationResult | undefined {
    return weakCompilationResult.get(value);
}
import * as vm from "vm";
import * as iq from "iterable-query";
import { Parser } from "./parser";
import { Transformer } from "./transformer";
import { Emitter } from "./emitter";
import { toArrayAsync } from "iterable-query/fn";

export function linq<T = any>(array: TemplateStringsArray, ...args: any[]): CompiledIterable<T> {
    let text = array[0];
    for (let i = 0; i < args.length; i++) {
        text += `($arguments[${i}])` + array[i + 1];
    }
    return parseAndExecuteQuery(text, { $arguments: args });
}

export namespace linq {
    export function async<T = any>(array: TemplateStringsArray, ...args: any[]): CompiledAsyncIterable<T> {
        let text = array[0];
        for (let i = 0; i < args.length; i++) {
            text += `($arguments[${i}])` + array[i + 1];
        }
        return parseAndExecuteAsyncQuery(text, { $arguments: args });
    }
}

function parseAndExecuteQueryWorker(text: string, context: vm.Context = {}, async: boolean) {
    const source = new Parser().parse(text, async);
    const compiled = new Transformer().visit(source);
    const output = new Emitter().emit(compiled);
    const wrapped = `$iq => ${output}`;
    if (!vm.isContext(context)) vm.createContext(context);
    const compiledWrapper = vm.runInContext(wrapped, context);
    return {
        wrapped,
        result: async
            ? compiledWrapper(iq)
            : compiledWrapper(iq)
    };
}

export function parseAndExecuteQuery<T = any>(text: string, context: vm.Context = {}): CompiledIterable<T> {
    const { wrapped, result } = parseAndExecuteQueryWorker(text, context, false);
    return new _CompiledIterable(isIterable(result) ? result : [result], text, wrapped);
}

export function parseAndExecuteAsyncQuery<T = any>(text: string, context: vm.Context = {}): CompiledAsyncIterable<T> {
    const { wrapped, result } = parseAndExecuteQueryWorker(text, context, true);
    return new _CompiledAsyncIterable(isAsyncIterable(result) || isIterable(result) ? result : [result], text, wrapped);
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

export interface CompiledIterable<T> extends Iterable<T> {
    toArray(): T[];
    toString(debug?: boolean): string;
}

export interface CompiledAsyncIterable<T> extends AsyncIterable<T> {
    toArray(): Promise<T[]>;
    toString(debug?: boolean): string;
}

class _CompiledIterable implements Iterable<any> {
    private _source: Iterable<any>;
    private _sourceText: string;
    private _compiledText: string;

    constructor(source: Iterable<any>, sourceText: string, compiledText: string) {
        this._source = source;
        this._sourceText = sourceText;
        this._compiledText = compiledText;
    }

    *[Symbol.iterator](): Iterator<any> {
        yield* this._source;
    }

    toArray() {
        return Array.from(this);
    }

    toString(debug = false) {
        return debug ? this._compiledText : this._sourceText;
    }
}

class _CompiledAsyncIterable implements AsyncIterable<any> {
    private _source: AsyncIterable<any> | Iterable<any>;
    private _sourceText: string;
    private _compiledText: string;

    constructor(source: AsyncIterable<any> | Iterable<any>, sourceText: string, compiledText: string) {
        this._source = source;
        this._sourceText = sourceText;
        this._compiledText = compiledText;
    }

    async *[Symbol.asyncIterator](): AsyncIterator<any> {
        yield* this._source;
    }

    toArray() {
        return toArrayAsync(this);
    }

    toString(debug = false) {
        return debug ? this._compiledText : this._sourceText;
    }
}
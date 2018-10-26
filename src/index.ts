import * as fn from "iterable-query/fn";
import * as vm from "vm";
import { Parser } from "./parser";
import { Visitor } from "./transformer";
import { nodeToString } from "./emitter";
import { SyntaxKind } from "./types";
import { isIdentifierReference } from "./scanner";

export function linq<T = any>(array: TemplateStringsArray, ...args: any[]): CompiledIterable<T> {
    let text = array[0];
    for (let i = 0; i < args.length; i++) {
        text += ` $arguments[${i}] ` + array[i + 1];
    }
    return parseAndExecuteQuery(text, args);
}

export function parseAndExecuteQuery<T = any>(text: string, context: Record<string, any> = {}): CompiledIterable<T> {
    console.log(text);
    const source = new Parser(text).parse();
    if (source.kind !== SyntaxKind.QueryExpression) throw new Error("Invalid query");
    const compiled = new Visitor().visit(source);
    const result = nodeToString(compiled);
    let init = "";
    for (const key in context) {
        if (isIdentifierReference(key)) {
            init += `let ${key} = $arguments.${key};\n`;
        }
    }
    const wrapped = init
        ? `($fn, $arguments) => {\n${init}return ${result};\n}`
        : `($fn, $arguments) => ${result}`;
    const compiledWrapper = vm.runInThisContext(wrapped);
    return new _CompiledIterable(compiledWrapper(fn, context), text, wrapped);
}

export interface CompiledIterable<T> extends Iterable<T> {
    toArray(): T[];
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

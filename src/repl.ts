import * as vm from "vm";
import { start, Recoverable } from "repl";
import { parseAndExecuteAsyncQuery } from "./linq";
import { RecoverableSyntaxError } from "./errors";
import { toArrayAsync, takeAsync } from "iterable-query/fn";

export interface LinqReplOptions {
    prompt?: string;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
    terminal?: boolean;
    useColors?: boolean;
    limit?: number;
    writer?: (value: any[]) => any;
}

export function startLinqRepl(context: vm.Context, options: LinqReplOptions = {}) {
    let { limit = 50 } = options;
    const replOptions = {
        prompt: options.prompt || `> `,
        input: options.input,
        output: options.output,
        terminal: options.terminal,
        useColors: options.useColors,
        writer: options.writer,
        eval: onEval
    };
    const repl = start(replOptions);
    return repl;

    function onEval(code: string, _evalContext: any, _file: string, cb: (error: Error | null, result?: any) => void) {
        onEvalAsync(code).then(
            value => cb(null, value), 
            err => cb(err));
    }

    async function onEvalAsync(code: string) {
        try {
            const result = parseAndExecuteAsyncQuery(code.trim(), context);
            return toArrayAsync(takeAsync(result, limit));
        }
        catch (e) {
            if (e instanceof RecoverableSyntaxError) {
                throw new Recoverable(e);
            }
            else {
                throw e;
            }
        }
    }
}
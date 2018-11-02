import * as fs from "fs";
import { start, Recoverable, ReplOptions } from "repl";
import { parseAndExecuteAsyncQuery, parseAndExecuteQuery } from "./linq";
import { RecoverableSyntaxError } from "./errors";
import { toArrayAsync, takeAsync, take, toArray } from "iterable-query/fn";
import { fromAsync, from } from "iterable-query/dist/lib";
import { EOL } from "os";

export interface LinqReplOptions {
    prompt?: string;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
    terminal?: boolean;
    useColors?: boolean;
    limit?: number;
    async?: boolean;
    writer?: (value: Iterable<any>) => any;
}

export interface AsyncLinqReplOptions {
    prompt?: string;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
    terminal?: boolean;
    useColors?: boolean;
    limit?: number;
    async: true;
    writer?: (value: AsyncIterable<any>) => any;
}


export function startLinqRepl(context: Record<string, any>, options: LinqReplOptions | AsyncLinqReplOptions = {}) {
    options = { ...options };
    let { limit, async = false } = options;
    const replOptions: ReplOptions = {
        prompt: options.prompt || `> `,
        input: options.input,
        output: options.output,
        terminal: options.terminal,
        useColors: options.useColors,
        writer: options.writer,
        ignoreUndefined: true,
        eval: onEval
    };
    const repl = start(replOptions);
    repl.defineCommand("top", { help: "Sets the limit to the number of results returned", action: onTop });
    repl.defineCommand("limit", { help: "Sets the limit to the number of results returned", action: onTop });
    repl.defineCommand("exec", { help: "Loads the specified file and executes the query", action: onExec });
    repl.on("reset", resetContext);
    resetContext(repl.context);
    return repl;

    function resetContext(replContext: any) {
        for (const key of Object.keys(context)) {
            Object.defineProperty(replContext, key, Object.getOwnPropertyDescriptor(context, key)!);
        }
    }

    function onEval(code: string, context: any, _file: string, cb: (error: Error | null, result?: any) => void) {
        onEvalAsync(code, context).then(
            value => cb(null, value),
            err => cb(err));
    }

    function onExec(file: string) {
        file = file.trim();
        const code = fs.readFileSync(file.trim(), "utf8");
        (repl as any).eval(code, repl.context, file, finish);
        function finish(e: Error | null, ret: any) {
            if (e) {
                repl.emit("error", e);
            }
            else {
                (repl as any).clearBufferedCommand();
                repl.outputStream.write((repl as any).writer(ret) + "\n");
                repl.displayPrompt();
            }
        }
    }

    function onTop(text: string) {
        (repl as any).clearBufferedCommand();
        if (text) {
            const count = parseInt(text);
            if (count > 0) limit = count;
        }
        else {
            repl.outputStream.write(limit + EOL + EOL);
        }
        repl.displayPrompt();
    }

    async function onEvalAsync(code: string, context: any) {
        code = code.trim();
        if (!code) {
            (repl as any).clearBufferedCommand();
            repl.displayPrompt();
            return;
        }
        try {
            if (async) {
                let result: AsyncIterable<any> = parseAndExecuteAsyncQuery(code, context);
                if (limit) result = takeAsync(result, limit);
                return replOptions.writer ? fromAsync(result) : await toArrayAsync(result);
            }
            else {
                let result: Iterable<any> = parseAndExecuteQuery(code, context);
                if (limit) result = take(result, limit);
                return replOptions.writer ? from(result) : toArray(result);
            }
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
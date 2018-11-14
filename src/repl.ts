import * as fs from "fs";
import * as vm from "vm";
import { start, Recoverable, ReplOptions } from "repl";
import { Query, AsyncQuery } from "iterable-query";
import { EOL } from "os";
import { parseAndExecuteAsyncQuery, parseAndExecuteQuery } from "./linq";
import { RecoverableSyntaxError } from "./errors";

export interface LinqReplOptions {
    prompt?: string;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
    terminal?: boolean;
    useColors?: boolean;
    limit?: number;
    async?: boolean;
}

export interface SyncLinqReplOptions {
    async?: false;
    writer?: (value: Query<any>) => any;
}

export interface AsyncLinqReplOptions {
    async: true;
    writer?: (value: AsyncQuery<any>) => any;
}

export function startLinqRepl(context: Record<string, any>, options: LinqReplOptions & (SyncLinqReplOptions | AsyncLinqReplOptions) = {}) {
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
    repl.defineCommand("limit", { help: "Sets the limit to the number of results returned", action: onLimit });
    repl.defineCommand("exec", { help: "Loads the specified file and executes the query", action: onExec });
    repl.on("reset", resetContext);
    resetContext(repl.context);
    return repl;

    function resetContext(replContext: vm.Context) {
        Object.defineProperties(replContext, Object.getOwnPropertyDescriptors(context));
    }

    function onEval(code: string, context: vm.Context, _file: string, cb: (error: Error | null, result: any) => void) {
        onEvalAsync(code, context).then(
            value => cb(null, value),
            err => cb(err, null));
    }

    async function onEvalAsync(code: string, context: vm.Context) {
        code = code.trim();
        if (!code) {
            repl.clearBufferedCommand();
            repl.displayPrompt();
            return;
        }
        try {
            if (async) {
                let result = parseAndExecuteAsyncQuery(code, context);
                if (limit) result = result.take(limit);
                return replOptions.writer ? result : await result.toArray();
            }
            else {
                let result = parseAndExecuteQuery(code, context);
                if (limit) result = result.take(limit);
                return replOptions.writer ? result : result.toArray();
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

    function onExec(file: string) {
        file = file.trim();
        const code = fs.readFileSync(file, "utf8");
        (repl as any).eval(code, repl.context, file, finish);
        function finish(e: Error | null, ret: any) {
            if (e) {
                repl.emit("error", e);
            }
            else {
                repl.clearBufferedCommand();
                repl.outputStream.write((repl as any).writer(ret) + "\n");
                repl.displayPrompt();
            }
        }
    }

    function onLimit(text: string) {
        repl.clearBufferedCommand();
        if (text) {
            const count = parseInt(text);
            if (count > 0) limit = count;
        }
        else {
            repl.outputStream.write(limit + EOL + EOL);
        }
        repl.displayPrompt();
    }
}
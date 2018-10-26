/** @internal */
export class LinqSyntaxError extends SyntaxError {
    readonly data?: { readonly file?: string, readonly text: string, readonly pos: number, readonly end: number };

    private _lineStarts?: ReadonlyArray<number>;

    constructor(message?: string, data?: { file?: string, text: string, pos: number, end: number }) {
        const lineStarts = data && getLineStarts(data.text);
        super(addContext(message, data, lineStarts));
        this.data = data;
        this._lineStarts = lineStarts;
    }

    toString() {
        let text = super.toString();
        if (this.data) {
            const lineStarts = this._lineStarts || getLineStarts(this.data.text);
            const lines = splitLines(this.data.text);
            const start = lineAndCharacter(lineStarts, this.data.pos);
            const end = lineAndCharacter(lineStarts, this.data.end);
            for (let i = end.line; i >= start.line; i--) {
                const line = lines[i];
                lines.splice(i + 1, 0, makeSquiggly(line,
                    i === start.line ? start.character : 0,
                    i === end.line ? end.character : line.length));
            }
            text += "\n\n" + lines.join("\n");
        }
        return text;
    }
}

/** @internal */
export class RecoverableSyntaxError extends LinqSyntaxError {
    recoverable = true;
}

/** @internal */
export class UnrecoverableSyntaxError extends LinqSyntaxError {
    recoverable = false;
}

function addContext(message: string = "", data?: { file?: string, text: string, pos: number, end: number }, lineStarts?: ReadonlyArray<number>) {
    if (!data) return message;
    if (!lineStarts) lineStarts = getLineStarts(data.text);
    const start = lineAndCharacter(lineStarts, data.pos);
    if (message) message += "\n  ";
    message += `at ${data.file || "#anonymous"}:${start.line + 1}:${start.character + 1}`;
    return message;
}

function makeSquiggly(line: string, pos: number, end: number) {
    const squigglyLen = Math.max(1, end - pos);
    const leadingLen = pos === line.length ? pos - 1 : pos;
    const trailingLen = Math.max(0, line.length - squigglyLen - leadingLen);
    const squiggly =
        repeat(" ", leadingLen) +
        repeat("~", squigglyLen) +
        repeat(" ", trailingLen);
    return squiggly;
}

function repeat(ch: string, count: number) {
    let text = "";
    while (count > 0) {
        text += ch;
        count--;
    }
    return text;
}

function splitLines(text: string) {
    return text.split(/\r?\n/g);
}

function getLineStarts(text: string): number[] {
    const result: number[] = new Array();
    let pos = 0;
    let lineStart = 0;
    while (pos < text.length) {
       const ch = text.charAt(pos);
       pos++;
       switch (ch) {
            case "\r":
                if (text.charAt(pos) === "\n") pos++;
            case "\n":
                result.push(lineStart);
                lineStart = pos;
                break;
        }
    }
    result.push(lineStart);
    return result;
}

function lineAndCharacter(lineStarts: ReadonlyArray<number>, position: number) {
    let lineNumber = binarySearch(lineStarts, position);
    if (lineNumber < 0) {
        lineNumber = ~lineNumber - 1;
    }
    return {
        line: lineNumber,
        character: position - lineStarts[lineNumber]
    };
}

function binarySearch<T>(array: ReadonlyArray<T>, value: T): number {
    if (!array || array.length === 0) {
        return -1;
    }

    let low = 0;
    let high = array.length - 1;
    while (low <= high) {
        const middle = low + ((high - low) >> 1);
        const midValue = array[middle];
        if (midValue < value) low = middle + 1;
        else if (midValue > value) high = middle - 1;
        else return middle;
    }
    return ~low;
}


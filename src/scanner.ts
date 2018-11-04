import { SyntaxKind, TokenFlags, Token } from "./types";
import { RecoverableSyntaxError } from "./errors";

const keywordPattern = String.raw`\b(?:a(?:ncestors(?:orself)?of|s(?:cending|ync)|wait)|b(?:reak|y)|c(?:a(?:se|tch)|hildrenof|lass|on(?:st|tinue))|d(?:e(?:bugger|fault|lete|scend(?:ants(?:orself)?of|ing))|o)|e(?:lse|num|quals|x(?:port|tends))|f(?:alse|inally|or|rom|unction)|group|hierarchy|i(?:f|mp(?:lements|ort)|n(?:|stanceof|t(?:erface|o))?)|join|let|n(?:ew|ull)|o(?:f|n|rderby)|p(?:a(?:rentof|ckage)|r(?:ivate|otected)|ublic)|r(?:eturn|ootof)|s(?:el(?:ect|fof)|iblings(?:orself)?of|tatic|uper|witch)|t(?:h(?:is|row)|r(?:ue|y)|ypeof)|using|v(?:ar|oid)|w(?:h(?:ere|ile)|ith)|yield)\b`;
const keywordIndex = 1;
const operatorPattern = String.raw`[{}()\[\],~?:]|\.(?:\.\.)?|<{1,2}=?|>{1,3}=?|=(?:={1,2}|>)?|!={0,2}|\+[+=]?|-[-=]?|\*{1,2}=?|\/=?|%=?|&[&=]?|\|[|=]?|\^=?`;
const operatorIndex = 2;
const stringPattern = String.raw`'(?:[^']|\\')+'?|"(?:[^"]|\\")+"?`;
const stringIndex = 3;
const decimalDigitsPattern = String.raw`0|[1-9]\d*(?:\.\d*)?|\.\d+`;
const decimalDigitsIndex = 4;
const hexDigitsPattern = String.raw`0x[0-9a-fA-F]+`;
const hexDigitsIndex = 5;
const octalDigitsPattern = String.raw`0o[0-7]+`;
const octalDigitsIndex = 6;
const binaryDigitsPattern = String.raw`0b[01]+`;
const binaryDigitsIndex = 7;
const identifierPattern = String.raw`[a-zA-Z_$][a-zA-Z_$\d]*`;
const identifierIndex = 8;
const whitespacePattern = String.raw`[\s\r\n]+`;
const whitespaceIndex = 9;
const unrecognizedPattern = String.raw`.`;
const unrecognizedIndex = 10;
const tokensPattern = String.raw`(${keywordPattern})|(${operatorPattern})|(${stringPattern})|(${decimalDigitsPattern})|(${hexDigitsPattern})|(${octalDigitsPattern})|(${binaryDigitsPattern})|(${identifierPattern})|(${whitespacePattern})|(${unrecognizedPattern})`;
const tokensRegExp = new RegExp(tokensPattern, "g");
const regExpRegExp = /\/((?:[^\/]|\\\/)+(\/[a-zA-Z]*)?)?/g;
const stringRegExp = /'(?:[^']|\\')+'|"(?:[^"]|\\")+"/;

const stringToTokenMap: Record<string, Token> = {
    "ancestorsof": SyntaxKind.AncestorsofKeyword,
    "ancestorsorselfof": SyntaxKind.AncestorsorselfofKeyword,
    "ascending": SyntaxKind.AscendingKeyword,
    "async": SyntaxKind.AsyncKeyword,
    "await": SyntaxKind.AwaitKeyword,
    "break": SyntaxKind.BreakKeyword,
    "by": SyntaxKind.ByKeyword,
    "case": SyntaxKind.CaseKeyword,
    "catch": SyntaxKind.CatchKeyword,
    "childrenof": SyntaxKind.ChildrenofKeyword,
    "class": SyntaxKind.ClassKeyword,
    "const": SyntaxKind.ConstKeyword,
    "continue": SyntaxKind.ContinueKeyword,
    "debugger": SyntaxKind.DebuggerKeyword,
    "default": SyntaxKind.DefaultKeyword,
    "delete": SyntaxKind.DeleteKeyword,
    "descendantsof": SyntaxKind.DescendantsofKeyword,
    "descendantsorselfof": SyntaxKind.DescendantsorselfofKeyword,
    "descending": SyntaxKind.DescendingKeyword,
    "do": SyntaxKind.DoKeyword,
    "else": SyntaxKind.ElseKeyword,
    "enum": SyntaxKind.EnumKeyword,
    "equals": SyntaxKind.EqualsKeyword,
    "export": SyntaxKind.ExportKeyword,
    "extends": SyntaxKind.ExtendsKeyword,
    "false": SyntaxKind.FalseKeyword,
    "finally": SyntaxKind.FinallyKeyword,
    "for": SyntaxKind.ForKeyword,
    "from": SyntaxKind.FromKeyword,
    "function": SyntaxKind.FunctionKeyword,
    "group": SyntaxKind.GroupKeyword,
    "hierarchy": SyntaxKind.HierarchyKeyword,
    "if": SyntaxKind.IfKeyword,
    "implements": SyntaxKind.ImplementsKeyword,
    "import": SyntaxKind.ImportKeyword,
    "in": SyntaxKind.InKeyword,
    "instanceof": SyntaxKind.InstanceofKeyword,
    "interface": SyntaxKind.InterfaceKeyword,
    "into": SyntaxKind.IntoKeyword,
    "join": SyntaxKind.JoinKeyword,
    "let": SyntaxKind.LetKeyword,
    "new": SyntaxKind.NewKeyword,
    "null": SyntaxKind.NullKeyword,
    "of": SyntaxKind.OfKeyword,
    "on": SyntaxKind.OnKeyword,
    "orderby": SyntaxKind.OrderbyKeyword,
    "package": SyntaxKind.PackageKeyword,
    "parentof": SyntaxKind.ParentofKeyword,
    "private": SyntaxKind.PrivateKeyword,
    "protected": SyntaxKind.ProtectedKeyword,
    "public": SyntaxKind.PublicKeyword,
    "return": SyntaxKind.ReturnKeyword,
    "rootof": SyntaxKind.RootofKeyword,
    "select": SyntaxKind.SelectKeyword,
    "selfof": SyntaxKind.SelfofKeyword,
    "siblingsof": SyntaxKind.SiblingsofKeyword,
    "siblingsorselfof": SyntaxKind.SiblingsorselfofKeyword,
    "static": SyntaxKind.StaticKeyword,
    "super": SyntaxKind.SuperKeyword,
    "switch": SyntaxKind.SwitchKeyword,
    "this": SyntaxKind.ThisKeyword,
    "throw": SyntaxKind.ThrowKeyword,
    "true": SyntaxKind.TrueKeyword,
    "try": SyntaxKind.TryKeyword,
    "typeof": SyntaxKind.TypeofKeyword,
    "using": SyntaxKind.UsingKeyword,
    "var": SyntaxKind.VarKeyword,
    "void": SyntaxKind.VoidKeyword,
    "where": SyntaxKind.WhereKeyword,
    "while": SyntaxKind.WhileKeyword,
    "with": SyntaxKind.WithKeyword,
    "yield": SyntaxKind.YieldKeyword,
    "{": SyntaxKind.OpenBraceToken,
    "}": SyntaxKind.CloseBraceToken,
    "(": SyntaxKind.OpenParenToken,
    ")": SyntaxKind.CloseParenToken,
    "[": SyntaxKind.OpenBracketToken,
    "]": SyntaxKind.CloseBracketToken,
    ".": SyntaxKind.DotToken,
    "...": SyntaxKind.DotDotDotToken,
    ",": SyntaxKind.CommaToken,
    "<": SyntaxKind.LessThanToken,
    "<=": SyntaxKind.LessThanEqualsToken,
    "<<": SyntaxKind.LessThanLessThanToken,
    "<<=": SyntaxKind.LessThanLessThanEqualsToken,
    ">": SyntaxKind.GreaterThanToken,
    ">=": SyntaxKind.GreaterThanEqualsToken,
    ">>": SyntaxKind.GreaterThanGreaterThanToken,
    ">>=": SyntaxKind.GreaterThanGreaterThanEqualsToken,
    ">>>": SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
    ">>>=": SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    "=": SyntaxKind.EqualsToken,
    "==": SyntaxKind.EqualsEqualsToken,
    "===": SyntaxKind.EqualsEqualsEqualsToken,
    "=>": SyntaxKind.EqualsGreaterThanToken,
    "!": SyntaxKind.ExclamationToken,
    "!=": SyntaxKind.ExclamationEqualsToken,
    "!==": SyntaxKind.ExclamationEqualsEqualsToken,
    "+": SyntaxKind.PlusToken,
    "+=": SyntaxKind.PlusEqualsToken,
    "++": SyntaxKind.PlusPlusToken,
    "-": SyntaxKind.MinusToken,
    "-=": SyntaxKind.MinusEqualsToken,
    "--": SyntaxKind.MinusMinusToken,
    "*": SyntaxKind.AsteriskToken,
    "*=": SyntaxKind.AsteriskEqualsToken,
    "**": SyntaxKind.AsteriskAsteriskToken,
    "**=": SyntaxKind.AsteriskAsteriskEqualsToken,
    "/": SyntaxKind.SlashToken,
    "/=": SyntaxKind.SlashEqualsToken,
    "%": SyntaxKind.PercentToken,
    "%=": SyntaxKind.PercentEqualsToken,
    "&": SyntaxKind.AmpersandToken,
    "&=": SyntaxKind.AmpersandEqualsToken,
    "&&": SyntaxKind.AmpersandAmpersandToken,
    "|": SyntaxKind.BarToken,
    "|=": SyntaxKind.BarEqualsToken,
    "||": SyntaxKind.BarBarToken,
    "^": SyntaxKind.CaretToken,
    "^=": SyntaxKind.CaretEqualsToken,
    "~": SyntaxKind.TildeToken,
    "?": SyntaxKind.QuestionToken,
    ":": SyntaxKind.ColonToken,
};

const tokenToStringMap: string[] = [];
for (const token in stringToTokenMap) {
    tokenToStringMap[stringToTokenMap[token]] = token;
}

/** @internal */
export function stringToToken(text: string): Token | undefined {
    return stringToTokenMap[text];
}

/** @internal */
export function tokenToString(kind: Token) {
    return tokenToStringMap[kind];
}

/** @internal */
export class Scanner {
    private _text: string;
    private _tokenizer: RegExp;
    private _regExpTokenizer: RegExp;
    private _pos = 0;
    private _startPos = 0;
    private _token = SyntaxKind.Unknown;
    private _tokenPos = 0;
    private _tokenFlags = TokenFlags.None;

    constructor(text: string) {
        this._text = text;
        this._tokenizer = new RegExp(tokensRegExp, "g");
        this._regExpTokenizer = new RegExp(regExpRegExp, "g");
    }

    text() { return this._text; }
    startPos() { return this._startPos; }
    textPos() { return this._pos; }
    token() { return this._token; }
    tokenPos() { return this._tokenPos; }
    tokenText() { return this._text.slice(this._tokenPos, this._pos); }
    tokenFlags() { return this._tokenFlags; }
    setTextPos(pos: number) {
        this._pos = pos;
        this._startPos = 0;
        this._token = SyntaxKind.Unknown;
        this._tokenPos = 0;
        this._tokenFlags = TokenFlags.None;
    }

    reset() {
        this._pos = 0;
        this._startPos = 0;
        this._token = SyntaxKind.Unknown;
        this._tokenPos = 0;
        this._tokenFlags = TokenFlags.None;
        this._tokenizer.lastIndex = 0;
    }

    scan() {
        this._startPos = this._pos;
        this._tokenFlags = TokenFlags.None;
        while (true) {
            this._tokenPos = this._pos;
            if (this._pos >= this._text.length) return this._token = SyntaxKind.EndOfFileToken;
            this._tokenizer.lastIndex = this._pos;
            const match = this._tokenizer.exec(this._text)!;
            this._pos = this._tokenizer.lastIndex === -1 ? this._text.length : this._tokenizer.lastIndex;
            if (match[whitespaceIndex]) continue;
            if (match[keywordIndex]) return this._token = stringToTokenMap[match[keywordIndex]];
            if (match[operatorIndex]) return this._token = stringToTokenMap[match[operatorIndex]];
            if (match[stringIndex]) {
                if (!stringRegExp.test(match[stringIndex])) {
                    throw new RecoverableSyntaxError(`Unterminated string literal.`, {
                        text: this._text,
                        pos: this._tokenPos,
                        end: this._pos
                    });
                }
                return this._token = SyntaxKind.StringLiteral;
            }
            if (match[decimalDigitsIndex]) return this._token = SyntaxKind.NumberLiteral;
            if (match[hexDigitsIndex]) return this._tokenFlags |= TokenFlags.Hexadecimal, this._token = SyntaxKind.NumberLiteral;
            if (match[octalDigitsIndex]) return this._tokenFlags |= TokenFlags.Octal, this._token = SyntaxKind.NumberLiteral;
            if (match[binaryDigitsIndex]) return this._tokenFlags |= TokenFlags.Binary, this._token = SyntaxKind.NumberLiteral;
            if (match[identifierIndex]) return this._token = SyntaxKind.Identifier;
            throw new RecoverableSyntaxError(`Unrecognized token '${match[unrecognizedIndex]}'`, {
                text: this._text,
                pos: this._tokenPos,
                end: this._pos
            });
        }
    }

    speculate<T>(callback: () => T, lookahead: boolean): T {
        const savedPos = this._pos;
        const savedStartPos = this._startPos;
        const savedToken = this._token;
        const savedTokenPos = this._tokenPos;
        const savedTokenFlags = this._tokenFlags;
        let result: T | undefined;
        try {
            result = callback();
        }
        finally {
            if (lookahead || !result) {
                this._pos = savedPos;
                this._startPos = savedStartPos;
                this._token = savedToken;
                this._tokenPos = savedTokenPos;
                this._tokenFlags = savedTokenFlags;
            }
        }
        return result;
    }

    rescanSlash(): SyntaxKind {
        if (this._token === SyntaxKind.SlashToken || this._token === SyntaxKind.SlashEqualsToken) {
            this._regExpTokenizer.lastIndex = this._tokenPos;
            const match = this._regExpTokenizer.exec(this._text);
            if (match && match[1]) {
                this._pos = this._regExpTokenizer.lastIndex === -1 ? this._text.length : this._regExpTokenizer.lastIndex;
                if (!match[2]) {
                    throw new RecoverableSyntaxError(`Unterminated regular expression literal.`, {
                        text: this._text,
                        pos: this._tokenPos,
                        end: this._pos
                    });
            }
                return this._token = SyntaxKind.RegularExpressionLiteral;
            }
        }
        return this._token;
    }
}

/** @internal */
export function isIdentifierStart(ch: string) {
    return ch >= "a" && ch <= "z"
        || ch >= "A" && ch <= "Z"
        || ch === "_"
        || ch === "$";
}

/** @internal */
export function isIdentifierPart(ch: string) {
    return ch >= "a" && ch <= "z"
        || ch >= "A" && ch <= "Z"
        || ch >= "0" && ch <= "9"
        || ch === "_"
        || ch === "$";
}

/** @internal */
export function isIdentifier(text: string) {
    if (text.length === 0) return false;
    if (!isIdentifierStart(text.charAt(0))) return false;
    for (let i = 1; i < text.length; i++) {
        if (!isIdentifierPart(text.charAt(i))) return false;
    }
    return true;
}
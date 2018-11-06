export enum Token {
    Unknown,
    EndOfFileToken,

    Identifier,

    // Literals
    StringLiteral,
    NumberLiteral,
    RegularExpressionLiteral,

    // Keywords
    // ECMAScript reserved words
    BreakKeyword,
    CaseKeyword,
    CatchKeyword,
    ClassKeyword,
    ConstKeyword,
    ContinueKeyword,
    DebuggerKeyword,
    DefaultKeyword,
    DeleteKeyword,
    DoKeyword,
    ElseKeyword,
    EnumKeyword,
    ExportKeyword,
    ExtendsKeyword,
    FalseKeyword,
    FinallyKeyword,
    ForKeyword,
    FunctionKeyword,
    IfKeyword,
    ImportKeyword,
    InKeyword,
    InstanceofKeyword,
    NewKeyword,
    NullKeyword,
    ReturnKeyword,
    SuperKeyword,
    SwitchKeyword,
    ThisKeyword,
    ThrowKeyword,
    TrueKeyword,
    TryKeyword,
    TypeofKeyword,
    VarKeyword,
    VoidKeyword,
    WhileKeyword,
    WithKeyword,

    // ECMAScript strict mode reserved words
    ImplementsKeyword,
    InterfaceKeyword,
    LetKeyword,
    PackageKeyword,
    PrivateKeyword,
    ProtectedKeyword,
    PublicKeyword,
    StaticKeyword,
    YieldKeyword,

    // ECMAScript contextual keywords
    AsyncKeyword,
    AwaitKeyword,
    FromKeyword,
    OfKeyword,

    // Query keywords
    AscendingKeyword,
    ByKeyword,
    DescendingKeyword,
    EqualsKeyword,
    GroupKeyword,
    HierarchyKeyword,               // `hierarchy`
    IntoKeyword,
    JoinKeyword,
    OnKeyword,
    OrderbyKeyword,
    SelectKeyword,
    UsingKeyword,
    WhereKeyword,

    // Query hierarchy keywords
    AncestorsofKeyword,             // `ancestorof`
    AncestorsorselfofKeyword,       // `ancestororselfof`
    ChildrenofKeyword,              // `childof`
    DescendantsofKeyword,           // `descendantof`
    DescendantsorselfofKeyword,     // `descendantorselfof`
    ParentofKeyword,                // `parentof`
    RootofKeyword,                  // `rootof`
    SelfofKeyword,                  // `selfof`
    SiblingsofKeyword,              // `siblingof`
    SiblingsorselfofKeyword,        // `siblingorselfof`

    // Punctuation
    OpenBraceToken,
    CloseBraceToken,
    OpenParenToken,
    CloseParenToken,
    OpenBracketToken,
    CloseBracketToken,
    DotToken,
    DotDotDotToken,
    SemicolonToken,
    CommaToken,
    LessThanToken,
    LessThanEqualsToken,
    LessThanLessThanToken,
    LessThanLessThanEqualsToken,
    GreaterThanToken,
    GreaterThanEqualsToken,
    GreaterThanGreaterThanToken,
    GreaterThanGreaterThanEqualsToken,
    GreaterThanGreaterThanGreaterThanToken,
    GreaterThanGreaterThanGreaterThanEqualsToken,
    EqualsToken,
    EqualsEqualsToken,
    EqualsEqualsEqualsToken,
    EqualsGreaterThanToken,
    ExclamationToken,
    ExclamationEqualsToken,
    ExclamationEqualsEqualsToken,
    PlusToken,
    PlusEqualsToken,
    PlusPlusToken,
    MinusToken,
    MinusEqualsToken,
    MinusMinusToken,
    AsteriskToken,
    AsteriskEqualsToken,
    AsteriskAsteriskToken,
    AsteriskAsteriskEqualsToken,
    SlashToken,
    SlashEqualsToken,
    PercentToken,
    PercentEqualsToken,
    AmpersandToken,
    AmpersandEqualsToken,
    AmpersandAmpersandToken,
    BarToken,
    BarEqualsToken,
    BarBarToken,
    CaretToken,
    CaretEqualsToken,
    TildeToken,
    QuestionToken,
    ColonToken,
}

export namespace Token {
    export type ECMAScriptReservedWord =
        | Token.AwaitKeyword
        | Token.BreakKeyword
        | Token.CaseKeyword
        | Token.CatchKeyword
        | Token.ClassKeyword
        | Token.ConstKeyword
        | Token.ContinueKeyword
        | Token.DebuggerKeyword
        | Token.DefaultKeyword
        | Token.DeleteKeyword
        | Token.DoKeyword
        | Token.ElseKeyword
        | Token.EnumKeyword
        | Token.ExportKeyword
        | Token.ExtendsKeyword
        | Token.FalseKeyword
        | Token.FinallyKeyword
        | Token.ForKeyword
        | Token.FunctionKeyword
        | Token.IfKeyword
        | Token.ImplementsKeyword
        | Token.ImportKeyword
        | Token.InKeyword
        | Token.InterfaceKeyword
        | Token.InstanceofKeyword
        | Token.LetKeyword
        | Token.NewKeyword
        | Token.NullKeyword
        | Token.PackageKeyword
        | Token.PrivateKeyword
        | Token.ProtectedKeyword
        | Token.PublicKeyword
        | Token.ReturnKeyword
        | Token.StaticKeyword
        | Token.SuperKeyword
        | Token.SwitchKeyword
        | Token.ThisKeyword
        | Token.ThrowKeyword
        | Token.TrueKeyword
        | Token.TryKeyword
        | Token.TypeofKeyword
        | Token.VarKeyword
        | Token.VoidKeyword
        | Token.WhileKeyword
        | Token.WithKeyword
        | Token.YieldKeyword;

    export function isECMAScriptReservedWord(token: Token): token is ECMAScriptReservedWord {
        switch (token) {
            case Token.AwaitKeyword:
            case Token.BreakKeyword:
            case Token.CaseKeyword:
            case Token.CatchKeyword:
            case Token.ClassKeyword:
            case Token.ConstKeyword:
            case Token.ContinueKeyword:
            case Token.DebuggerKeyword:
            case Token.DefaultKeyword:
            case Token.DeleteKeyword:
            case Token.DoKeyword:
            case Token.ElseKeyword:
            case Token.EnumKeyword:
            case Token.ExportKeyword:
            case Token.ExtendsKeyword:
            case Token.FalseKeyword:
            case Token.FinallyKeyword:
            case Token.ForKeyword:
            case Token.FunctionKeyword:
            case Token.IfKeyword:
            case Token.ImportKeyword:
            case Token.InKeyword:
            case Token.InstanceofKeyword:
            case Token.NewKeyword:
            case Token.NullKeyword:
            case Token.ReturnKeyword:
            case Token.SuperKeyword:
            case Token.SwitchKeyword:
            case Token.ThisKeyword:
            case Token.ThrowKeyword:
            case Token.TrueKeyword:
            case Token.TryKeyword:
            case Token.TypeofKeyword:
            case Token.VarKeyword:
            case Token.VoidKeyword:
            case Token.WhileKeyword:
            case Token.WithKeyword:
            case Token.ImplementsKeyword:
            case Token.InterfaceKeyword:
            case Token.LetKeyword:
            case Token.PackageKeyword:
            case Token.PrivateKeyword:
            case Token.ProtectedKeyword:
            case Token.PublicKeyword:
            case Token.StaticKeyword:
            case Token.YieldKeyword:
                return true;
            default:
                return tokenIsNot<ECMAScriptReservedWord>(token);
        }
    }

    export type ECMAScriptContextualKeyword =
        | Token.AsyncKeyword
        | Token.FromKeyword
        | Token.OfKeyword;

    export function isECMAScriptContextualKeyword(token: Token): token is ECMAScriptContextualKeyword {
        switch (token) {
            case Token.AsyncKeyword:
            case Token.FromKeyword:
            case Token.OfKeyword:
                return true;
            default:
                return tokenIsNot<ECMAScriptContextualKeyword>(token);
        }
    }

    export type DirectionKeyword =
        | Token.AscendingKeyword
        | Token.DescendingKeyword;

    export function isDirectionKeyword(token: Token): token is DirectionKeyword {
        switch (token) {
            case Token.AscendingKeyword:
            case Token.DescendingKeyword:
                return true;
            default:
                return tokenIsNot<DirectionKeyword>(token);
        }
    }

    export type QueryKeyword =
        | Token.ByKeyword
        | Token.EqualsKeyword
        | Token.FromKeyword
        | Token.GroupKeyword
        | Token.InKeyword
        | Token.IntoKeyword
        | Token.JoinKeyword
        | Token.LetKeyword
        | Token.OnKeyword
        | Token.OrderbyKeyword
        | Token.SelectKeyword
        | Token.UsingKeyword
        | Token.WhereKeyword
        | Token.HierarchyKeyword;

    export function isQueryKeyword(token: Token): token is QueryKeyword {
        switch (token) {
            case Token.ByKeyword:
            case Token.EqualsKeyword:
            case Token.FromKeyword:
            case Token.GroupKeyword:
            case Token.InKeyword:
            case Token.IntoKeyword:
            case Token.JoinKeyword:
            case Token.LetKeyword:
            case Token.OnKeyword:
            case Token.OrderbyKeyword:
            case Token.SelectKeyword:
            case Token.UsingKeyword:
            case Token.WhereKeyword:
            case Token.HierarchyKeyword:
                return true;
            default:
                return tokenIsNot<QueryKeyword>(token);
        }
    }

    // HierarchyAxisKeyword :
    //     `rootof`
    //     `parentof`
    //     `selfof`
    //     `childrenof`
    //     `ancestorsof`
    //     `ancestorsorselfof`
    //     `descendantsof`
    //     `descendantsorselfof`
    //     `siblingsof`
    //     `siblingsorselfof`
    export type HierarchyAxisKeyword =
        | Token.RootofKeyword
        | Token.ParentofKeyword
        | Token.ChildrenofKeyword
        | Token.AncestorsofKeyword
        | Token.AncestorsorselfofKeyword
        | Token.DescendantsofKeyword
        | Token.DescendantsorselfofKeyword
        | Token.SelfofKeyword
        | Token.SiblingsofKeyword
        | Token.SiblingsorselfofKeyword;

    export function isHierarchyAxisKeyword(token: Token): token is HierarchyAxisKeyword {
        switch (token) {
            case Token.RootofKeyword:
            case Token.ParentofKeyword:
            case Token.ChildrenofKeyword:
            case Token.AncestorsofKeyword:
            case Token.AncestorsorselfofKeyword:
            case Token.DescendantsofKeyword:
            case Token.DescendantsorselfofKeyword:
            case Token.SelfofKeyword:
            case Token.SiblingsofKeyword:
            case Token.SiblingsorselfofKeyword:
                return true;
            default:
                return tokenIsNot<HierarchyAxisKeyword>(token);
        }
    }

    export type Keyword =
        | ECMAScriptReservedWord
        | ECMAScriptContextualKeyword
        | QueryKeyword
        | DirectionKeyword
        | HierarchyAxisKeyword;

    export function isKeyword(token: Token): token is Keyword {
        return isECMAScriptReservedWord(token)
            || isECMAScriptContextualKeyword(token)
            || isQueryKeyword(token)
            || isDirectionKeyword(token)
            || isHierarchyAxisKeyword(token)
            || tokenIsNot<Keyword>(token);
    }

    export type SimpleAssignmentOperator =
        | Token.EqualsToken;

    export function isSimpleAssignmentOperator(token: Token): token is SimpleAssignmentOperator {
        switch (token) {
            case Token.EqualsToken:
                return true;
            default:
                return tokenIsNot<SimpleAssignmentOperator>(token);
        }
    }

    export type CompoundAssignmentOperator =
        | Token.PlusEqualsToken
        | Token.MinusEqualsToken
        | Token.AsteriskEqualsToken
        | Token.AsteriskAsteriskEqualsToken
        | Token.SlashEqualsToken
        | Token.PercentEqualsToken
        | Token.LessThanLessThanEqualsToken
        | Token.GreaterThanGreaterThanEqualsToken
        | Token.GreaterThanGreaterThanGreaterThanEqualsToken
        | Token.AmpersandEqualsToken
        | Token.BarEqualsToken
        | Token.CaretEqualsToken;

    export function isCompoundAssignmentOperator(token: Token): token is AssignmentOperator {
        switch (token) {
            case Token.PlusEqualsToken:
            case Token.MinusEqualsToken:
            case Token.AsteriskEqualsToken:
            case Token.AsteriskAsteriskEqualsToken:
            case Token.SlashEqualsToken:
            case Token.PercentEqualsToken:
            case Token.LessThanLessThanEqualsToken:
            case Token.GreaterThanGreaterThanEqualsToken:
            case Token.GreaterThanGreaterThanGreaterThanEqualsToken:
            case Token.AmpersandEqualsToken:
            case Token.BarEqualsToken:
            case Token.CaretEqualsToken:
                return true;
            default:
                return tokenIsNot<CompoundAssignmentOperator>(token);
        }
    }

    export type AssignmentOperator =
        | SimpleAssignmentOperator
        | CompoundAssignmentOperator;

    export function isAssignmentOperator(token: Token): token is AssignmentOperator {
        return isSimpleAssignmentOperator(token)
            || isCompoundAssignmentOperator(token)
            || tokenIsNot<AssignmentOperator>(token);
    }

    export type BinaryOperator =
        | Token.AmpersandToken
        | Token.AmpersandAmpersandToken
        | Token.BarToken
        | Token.BarBarToken
        | Token.AsteriskToken
        | Token.AsteriskAsteriskToken
        | Token.EqualsEqualsToken
        | Token.EqualsEqualsEqualsToken
        | Token.ExclamationEqualsToken
        | Token.ExclamationEqualsEqualsToken
        | Token.GreaterThanToken
        | Token.GreaterThanGreaterThanToken
        | Token.GreaterThanGreaterThanGreaterThanToken
        | Token.GreaterThanEqualsToken
        | Token.LessThanToken
        | Token.LessThanLessThanToken
        | Token.LessThanEqualsToken
        | Token.MinusToken
        | Token.PlusToken
        | Token.CaretToken
        | Token.PercentToken
        | Token.SlashToken
        | Token.InstanceofKeyword
        | Token.InKeyword;

    export function isBinaryOperator(token: Token): token is BinaryOperator {
        switch (token) {
            case Token.LessThanToken:
            case Token.LessThanEqualsToken:
            case Token.LessThanLessThanToken:
            case Token.GreaterThanToken:
            case Token.GreaterThanEqualsToken:
            case Token.GreaterThanGreaterThanToken:
            case Token.GreaterThanGreaterThanGreaterThanToken:
            case Token.EqualsEqualsToken:
            case Token.EqualsEqualsEqualsToken:
            case Token.ExclamationEqualsToken:
            case Token.ExclamationEqualsEqualsToken:
            case Token.PlusToken:
            case Token.MinusToken:
            case Token.AsteriskToken:
            case Token.AsteriskAsteriskToken:
            case Token.SlashToken:
            case Token.PercentToken:
            case Token.AmpersandToken:
            case Token.AmpersandAmpersandToken:
            case Token.BarToken:
            case Token.BarBarToken:
            case Token.CaretToken:
            case Token.InstanceofKeyword:
            case Token.InKeyword:
                return true;
            default:
                return tokenIsNot<BinaryOperator>(token);
        }
    }

    export type PrefixUnaryOperator =
        | Token.PlusToken
        | Token.PlusPlusToken
        | Token.MinusToken
        | Token.MinusMinusToken
        | Token.ExclamationToken
        | Token.TildeToken
        | Token.TypeofKeyword
        | Token.VoidKeyword
        | Token.AwaitKeyword
        | Token.DeleteKeyword;

    export function isPrefixUnaryOperator(token: Token): token is PrefixUnaryOperator {
        switch (token) {
            case Token.PlusToken:
            case Token.PlusPlusToken:
            case Token.MinusToken:
            case Token.MinusMinusToken:
            case Token.ExclamationToken:
            case Token.TildeToken:
            case Token.TypeofKeyword:
            case Token.VoidKeyword:
            case Token.DeleteKeyword:
            case Token.AwaitKeyword:
                return true;
            default:
                return tokenIsNot<PrefixUnaryOperator>(token);
        }
    }

    export type PostfixUnaryOperator =
        | Token.PlusPlusToken
        | Token.MinusMinusToken;

    export function isPostfixUnaryOperator(token: Token): token is PostfixUnaryOperator {
        switch (token) {
            case Token.PlusPlusToken:
            case Token.MinusMinusToken:
                return true;
            default:
                return tokenIsNot<PostfixUnaryOperator>(token);
        }
    }

    export type Punctuation =
        | Token.OpenBraceToken
        | Token.CloseBraceToken
        | Token.OpenParenToken
        | Token.CloseParenToken
        | Token.OpenBracketToken
        | Token.CloseBracketToken
        | Token.DotToken
        | Token.DotDotDotToken
        | Token.SemicolonToken
        | Token.CommaToken
        | Token.LessThanToken
        | Token.LessThanEqualsToken
        | Token.LessThanLessThanToken
        | Token.LessThanLessThanEqualsToken
        | Token.GreaterThanToken
        | Token.GreaterThanEqualsToken
        | Token.GreaterThanGreaterThanToken
        | Token.GreaterThanGreaterThanEqualsToken
        | Token.GreaterThanGreaterThanGreaterThanToken
        | Token.GreaterThanGreaterThanGreaterThanEqualsToken
        | Token.EqualsToken
        | Token.EqualsEqualsToken
        | Token.EqualsEqualsEqualsToken
        | Token.EqualsGreaterThanToken
        | Token.ExclamationToken
        | Token.ExclamationEqualsToken
        | Token.ExclamationEqualsEqualsToken
        | Token.PlusToken
        | Token.PlusEqualsToken
        | Token.PlusPlusToken
        | Token.MinusToken
        | Token.MinusEqualsToken
        | Token.MinusMinusToken
        | Token.AsteriskToken
        | Token.AsteriskEqualsToken
        | Token.AsteriskAsteriskToken
        | Token.AsteriskAsteriskEqualsToken
        | Token.SlashToken
        | Token.SlashEqualsToken
        | Token.PercentToken
        | Token.PercentEqualsToken
        | Token.AmpersandToken
        | Token.AmpersandEqualsToken
        | Token.AmpersandAmpersandToken
        | Token.BarToken
        | Token.BarEqualsToken
        | Token.BarBarToken
        | Token.CaretToken
        | Token.CaretEqualsToken
        | Token.TildeToken
        | Token.QuestionToken
        | Token.ColonToken;

    export function isPunctuation(token: Token): token is Punctuation {
        switch (token) {
            case Token.OpenBraceToken:
            case Token.CloseBraceToken:
            case Token.OpenParenToken:
            case Token.CloseParenToken:
            case Token.OpenBracketToken:
            case Token.CloseBracketToken:
            case Token.DotToken:
            case Token.DotDotDotToken:
            case Token.CommaToken:
            case Token.SemicolonToken:
            case Token.LessThanToken:
            case Token.LessThanEqualsToken:
            case Token.LessThanLessThanToken:
            case Token.LessThanLessThanEqualsToken:
            case Token.GreaterThanToken:
            case Token.GreaterThanEqualsToken:
            case Token.GreaterThanGreaterThanToken:
            case Token.GreaterThanGreaterThanEqualsToken:
            case Token.GreaterThanGreaterThanGreaterThanToken:
            case Token.GreaterThanGreaterThanGreaterThanEqualsToken:
            case Token.EqualsToken:
            case Token.EqualsEqualsToken:
            case Token.EqualsEqualsEqualsToken:
            case Token.EqualsGreaterThanToken:
            case Token.ExclamationToken:
            case Token.ExclamationEqualsToken:
            case Token.ExclamationEqualsEqualsToken:
            case Token.PlusToken:
            case Token.PlusEqualsToken:
            case Token.PlusPlusToken:
            case Token.MinusToken:
            case Token.MinusEqualsToken:
            case Token.MinusMinusToken:
            case Token.AsteriskToken:
            case Token.AsteriskEqualsToken:
            case Token.AsteriskAsteriskToken:
            case Token.AsteriskAsteriskEqualsToken:
            case Token.SlashToken:
            case Token.SlashEqualsToken:
            case Token.PercentToken:
            case Token.PercentEqualsToken:
            case Token.AmpersandToken:
            case Token.AmpersandEqualsToken:
            case Token.AmpersandAmpersandToken:
            case Token.BarToken:
            case Token.BarEqualsToken:
            case Token.BarBarToken:
            case Token.CaretToken:
            case Token.CaretEqualsToken:
            case Token.TildeToken:
            case Token.QuestionToken:
            case Token.ColonToken:
                return true;
            default:
                return tokenIsNot<Punctuation>(token);
        }
    }

    export type TextLiteral =
        | Token.StringLiteral
        | Token.NumberLiteral
        | Token.RegularExpressionLiteral;

    export type SourceToken =
        | Keyword
        | Punctuation;

    export function isSourceToken(token: Token): token is SourceToken {
        return isKeyword(token)
            || isPunctuation(token)
            || tokenIsNot<SourceToken>(token);
    }

    export type OtherToken =
        | Token.EndOfFileToken
        | Token.Identifier
        | TextLiteral;

    export function isOtherToken(token: Token): token is OtherToken {
        return !isSourceToken(token)
            || tokenIsNot<OtherToken>(token);
    }

    const stringToSourceTokenMap: Record<string, SourceToken> = {
        "ancestorsof": Token.AncestorsofKeyword,
        "ancestorsorselfof": Token.AncestorsorselfofKeyword,
        "ascending": Token.AscendingKeyword,
        "async": Token.AsyncKeyword,
        "await": Token.AwaitKeyword,
        "break": Token.BreakKeyword,
        "by": Token.ByKeyword,
        "case": Token.CaseKeyword,
        "catch": Token.CatchKeyword,
        "childrenof": Token.ChildrenofKeyword,
        "class": Token.ClassKeyword,
        "const": Token.ConstKeyword,
        "continue": Token.ContinueKeyword,
        "debugger": Token.DebuggerKeyword,
        "default": Token.DefaultKeyword,
        "delete": Token.DeleteKeyword,
        "descendantsof": Token.DescendantsofKeyword,
        "descendantsorselfof": Token.DescendantsorselfofKeyword,
        "descending": Token.DescendingKeyword,
        "do": Token.DoKeyword,
        "else": Token.ElseKeyword,
        "enum": Token.EnumKeyword,
        "equals": Token.EqualsKeyword,
        "export": Token.ExportKeyword,
        "extends": Token.ExtendsKeyword,
        "false": Token.FalseKeyword,
        "finally": Token.FinallyKeyword,
        "for": Token.ForKeyword,
        "from": Token.FromKeyword,
        "function": Token.FunctionKeyword,
        "group": Token.GroupKeyword,
        "hierarchy": Token.HierarchyKeyword,
        "if": Token.IfKeyword,
        "implements": Token.ImplementsKeyword,
        "import": Token.ImportKeyword,
        "in": Token.InKeyword,
        "instanceof": Token.InstanceofKeyword,
        "interface": Token.InterfaceKeyword,
        "into": Token.IntoKeyword,
        "join": Token.JoinKeyword,
        "let": Token.LetKeyword,
        "new": Token.NewKeyword,
        "null": Token.NullKeyword,
        "of": Token.OfKeyword,
        "on": Token.OnKeyword,
        "orderby": Token.OrderbyKeyword,
        "package": Token.PackageKeyword,
        "parentof": Token.ParentofKeyword,
        "private": Token.PrivateKeyword,
        "protected": Token.ProtectedKeyword,
        "public": Token.PublicKeyword,
        "return": Token.ReturnKeyword,
        "rootof": Token.RootofKeyword,
        "select": Token.SelectKeyword,
        "selfof": Token.SelfofKeyword,
        "siblingsof": Token.SiblingsofKeyword,
        "siblingsorselfof": Token.SiblingsorselfofKeyword,
        "static": Token.StaticKeyword,
        "super": Token.SuperKeyword,
        "switch": Token.SwitchKeyword,
        "this": Token.ThisKeyword,
        "throw": Token.ThrowKeyword,
        "true": Token.TrueKeyword,
        "try": Token.TryKeyword,
        "typeof": Token.TypeofKeyword,
        "using": Token.UsingKeyword,
        "var": Token.VarKeyword,
        "void": Token.VoidKeyword,
        "where": Token.WhereKeyword,
        "while": Token.WhileKeyword,
        "with": Token.WithKeyword,
        "yield": Token.YieldKeyword,
        "{": Token.OpenBraceToken,
        "}": Token.CloseBraceToken,
        "(": Token.OpenParenToken,
        ")": Token.CloseParenToken,
        "[": Token.OpenBracketToken,
        "]": Token.CloseBracketToken,
        ".": Token.DotToken,
        "...": Token.DotDotDotToken,
        ";": Token.SemicolonToken,
        ",": Token.CommaToken,
        "<": Token.LessThanToken,
        "<=": Token.LessThanEqualsToken,
        "<<": Token.LessThanLessThanToken,
        "<<=": Token.LessThanLessThanEqualsToken,
        ">": Token.GreaterThanToken,
        ">=": Token.GreaterThanEqualsToken,
        ">>": Token.GreaterThanGreaterThanToken,
        ">>=": Token.GreaterThanGreaterThanEqualsToken,
        ">>>": Token.GreaterThanGreaterThanGreaterThanToken,
        ">>>=": Token.GreaterThanGreaterThanGreaterThanEqualsToken,
        "=": Token.EqualsToken,
        "==": Token.EqualsEqualsToken,
        "===": Token.EqualsEqualsEqualsToken,
        "=>": Token.EqualsGreaterThanToken,
        "!": Token.ExclamationToken,
        "!=": Token.ExclamationEqualsToken,
        "!==": Token.ExclamationEqualsEqualsToken,
        "+": Token.PlusToken,
        "+=": Token.PlusEqualsToken,
        "++": Token.PlusPlusToken,
        "-": Token.MinusToken,
        "-=": Token.MinusEqualsToken,
        "--": Token.MinusMinusToken,
        "*": Token.AsteriskToken,
        "*=": Token.AsteriskEqualsToken,
        "**": Token.AsteriskAsteriskToken,
        "**=": Token.AsteriskAsteriskEqualsToken,
        "/": Token.SlashToken,
        "/=": Token.SlashEqualsToken,
        "%": Token.PercentToken,
        "%=": Token.PercentEqualsToken,
        "&": Token.AmpersandToken,
        "&=": Token.AmpersandEqualsToken,
        "&&": Token.AmpersandAmpersandToken,
        "|": Token.BarToken,
        "|=": Token.BarEqualsToken,
        "||": Token.BarBarToken,
        "^": Token.CaretToken,
        "^=": Token.CaretEqualsToken,
        "~": Token.TildeToken,
        "?": Token.QuestionToken,
        ":": Token.ColonToken,
    }
    
    const sourceTokenToStringMap = {} as Record<SourceToken, string>;
    for (const token in stringToSourceTokenMap) sourceTokenToStringMap[stringToSourceTokenMap[token]] = token;

    const hasOwn: (object: any, key: PropertyKey) => boolean = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

    export function stringToToken(text: string): SourceToken {
        if (!hasOwn(stringToSourceTokenMap, text)) throw new Error();
        return stringToSourceTokenMap[text];
    }
    
    export function tokenToString(token: SourceToken): string {
        if (!hasOwn(sourceTokenToStringMap, token)) throw new Error();
        return sourceTokenToStringMap[token]!;
    }
}

export const enum TokenFlags {
    None,
    Hexadecimal = 1 << 0,
    Octal = 1 << 1,
    Binary = 1 << 2
}

// type-only assertion
function tokenIsNot<T extends Token>(_: Exclude<Token, T>) { return false; }
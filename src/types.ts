/** @internal */
export const enum SyntaxKind {
    Unknown,
    EndOfFileToken,

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
    IntoKeyword,
    JoinKeyword,
    OnKeyword,
    OrderbyKeyword,
    SelectKeyword,
    UsingKeyword,
    WhereKeyword,

    // Punctuation
    OpenBraceToken,
    CloseBraceToken,
    OpenParenToken,
    CloseParenToken,
    OpenBracketToken,
    CloseBracketToken,
    DotToken,
    DotDotDotToken,
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

    // Selectors
    RootAxisSelector, // root::
    ParentAxisSelector, // parent::
    ChildAxisSelector, // child::
    AncestorAxisSelector, // ancestor::
    AncestorOrSelfAxisSelector, // ancestor-or-self::
    DescendantAxisSelector, // descendant::
    DescendantOrSelfAxisSelector, // descendant-or-self::
    SelfAxisSelector, // self::
    SiblingAxisSelector, // sibling::
    SiblingOrSelfAxisSelector, // sibling-or-self::

    // Names
    Identifier,
    ComputedPropertyName,

    // Clauses
    FromClause,
    LetClause,
    WhereClause,
    OrderbyClause,
    OrderbyComparator,
    GroupClause,
    JoinClause,
    SelectClause,

    // Expressions
    ArrowFunction,
    PrefixUnaryExpression,
    PostfixUnaryExpression,
    ParenthesizedExpression,
    CallExpression,
    NewExpression,
    PropertyAccessExpression,
    ElementAccessExpression,
    ObjectLiteral,
    PropertyAssignment,
    ShorthandPropertyAssignment,
    ArrayLiteral,
    Elision,
    SpreadElement,
    BinaryExpression,
    ConditionalExpression,
    QueryExpression,
    CommaListExpression,
}

/** @internal */
export type TextLiteralKind =
    | SyntaxKind.StringLiteral
    | SyntaxKind.NumberLiteral
    | SyntaxKind.RegularExpressionLiteral;

/** @internal */
export function isTextLiteralKind(kind: SyntaxKind): kind is TextLiteralKind {
    switch (kind) {
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumberLiteral:
        case SyntaxKind.RegularExpressionLiteral:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type KeywordLiteralKind =
    | SyntaxKind.NullKeyword
    | SyntaxKind.TrueKeyword
    | SyntaxKind.FalseKeyword;

/** @internal */
export function isKeywordLiteralKind(kind: SyntaxKind): kind is KeywordLiteralKind {
    switch (kind) {
        case SyntaxKind.NullKeyword:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type LiteralKind =
    | TextLiteralKind
    | KeywordLiteralKind;

/** @internal */
export function isLiteralKind(kind: SyntaxKind): kind is LiteralKind {
    return isTextLiteralKind(kind)
        || isKeywordLiteralKind(kind);
}

/** @internal */
export type ECMAScriptReservedWordKind =
    | SyntaxKind.BreakKeyword
    | SyntaxKind.CaseKeyword
    | SyntaxKind.CatchKeyword
    | SyntaxKind.ClassKeyword
    | SyntaxKind.ConstKeyword
    | SyntaxKind.ContinueKeyword
    | SyntaxKind.DebuggerKeyword
    | SyntaxKind.DefaultKeyword
    | SyntaxKind.DeleteKeyword
    | SyntaxKind.DoKeyword
    | SyntaxKind.ElseKeyword
    | SyntaxKind.EnumKeyword
    | SyntaxKind.ExportKeyword
    | SyntaxKind.ExtendsKeyword
    | SyntaxKind.FalseKeyword
    | SyntaxKind.FinallyKeyword
    | SyntaxKind.ForKeyword
    | SyntaxKind.FunctionKeyword
    | SyntaxKind.IfKeyword
    | SyntaxKind.ImportKeyword
    | SyntaxKind.InKeyword
    | SyntaxKind.InstanceofKeyword
    | SyntaxKind.NewKeyword
    | SyntaxKind.NullKeyword
    | SyntaxKind.ReturnKeyword
    | SyntaxKind.SuperKeyword
    | SyntaxKind.SwitchKeyword
    | SyntaxKind.ThisKeyword
    | SyntaxKind.ThrowKeyword
    | SyntaxKind.TrueKeyword
    | SyntaxKind.TryKeyword
    | SyntaxKind.TypeofKeyword
    | SyntaxKind.VarKeyword
    | SyntaxKind.VoidKeyword
    | SyntaxKind.WhileKeyword
    | SyntaxKind.WithKeyword;

/** @internal */
export function isECMAScriptReservedWordKind(kind: SyntaxKind): kind is ECMAScriptReservedWordKind {
    switch (kind) {
        case SyntaxKind.BreakKeyword:
        case SyntaxKind.CaseKeyword:
        case SyntaxKind.CatchKeyword:
        case SyntaxKind.ClassKeyword:
        case SyntaxKind.ConstKeyword:
        case SyntaxKind.ContinueKeyword:
        case SyntaxKind.DebuggerKeyword:
        case SyntaxKind.DefaultKeyword:
        case SyntaxKind.DeleteKeyword:
        case SyntaxKind.DoKeyword:
        case SyntaxKind.ElseKeyword:
        case SyntaxKind.EnumKeyword:
        case SyntaxKind.ExportKeyword:
        case SyntaxKind.ExtendsKeyword:
        case SyntaxKind.FalseKeyword:
        case SyntaxKind.FinallyKeyword:
        case SyntaxKind.ForKeyword:
        case SyntaxKind.FunctionKeyword:
        case SyntaxKind.IfKeyword:
        case SyntaxKind.ImportKeyword:
        case SyntaxKind.InKeyword:
        case SyntaxKind.InstanceofKeyword:
        case SyntaxKind.NewKeyword:
        case SyntaxKind.NullKeyword:
        case SyntaxKind.ReturnKeyword:
        case SyntaxKind.SuperKeyword:
        case SyntaxKind.SwitchKeyword:
        case SyntaxKind.ThisKeyword:
        case SyntaxKind.ThrowKeyword:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.TryKeyword:
        case SyntaxKind.TypeofKeyword:
        case SyntaxKind.VarKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.WhileKeyword:
        case SyntaxKind.WithKeyword:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type ECMAScriptStrictModeReservedWordKind =
    | SyntaxKind.ImplementsKeyword
    | SyntaxKind.InterfaceKeyword
    | SyntaxKind.LetKeyword
    | SyntaxKind.PackageKeyword
    | SyntaxKind.PrivateKeyword
    | SyntaxKind.ProtectedKeyword
    | SyntaxKind.PublicKeyword
    | SyntaxKind.StaticKeyword
    | SyntaxKind.YieldKeyword;

/** @internal */
export function isECMAScriptStrictModeReservedWordKind(kind: SyntaxKind): kind is ECMAScriptStrictModeReservedWordKind {
    switch (kind) {
        case SyntaxKind.ImplementsKeyword:
        case SyntaxKind.InterfaceKeyword:
        case SyntaxKind.LetKeyword:
        case SyntaxKind.PackageKeyword:
        case SyntaxKind.PrivateKeyword:
        case SyntaxKind.ProtectedKeyword:
        case SyntaxKind.PublicKeyword:
        case SyntaxKind.StaticKeyword:
        case SyntaxKind.YieldKeyword:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type ECMAScriptContextualKeywordKind =
    | SyntaxKind.AsyncKeyword
    | SyntaxKind.AwaitKeyword
    | SyntaxKind.FromKeyword
    | SyntaxKind.OfKeyword;

/** @internal */
export function isECMAScriptContextualKeywordKind(kind: SyntaxKind): kind is ECMAScriptContextualKeywordKind {
    switch (kind) {
        case SyntaxKind.AsyncKeyword:
        case SyntaxKind.AwaitKeyword:
        case SyntaxKind.FromKeyword:
        case SyntaxKind.OfKeyword:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type QueryKeywordKind =
    | SyntaxKind.AscendingKeyword
    | SyntaxKind.ByKeyword
    | SyntaxKind.DescendingKeyword
    | SyntaxKind.EqualsKeyword
    | SyntaxKind.FromKeyword
    | SyntaxKind.GroupKeyword
    | SyntaxKind.InKeyword
    | SyntaxKind.IntoKeyword
    | SyntaxKind.JoinKeyword
    | SyntaxKind.LetKeyword
    | SyntaxKind.OnKeyword
    | SyntaxKind.OrderbyKeyword
    | SyntaxKind.SelectKeyword
    | SyntaxKind.UsingKeyword
    | SyntaxKind.WhereKeyword;

/** @internal */
export function isQueryKeywordKind(kind: SyntaxKind): kind is QueryKeywordKind {
    switch (kind) {
        case SyntaxKind.AscendingKeyword:
        case SyntaxKind.ByKeyword:
        case SyntaxKind.DescendingKeyword:
        case SyntaxKind.EqualsKeyword:
        case SyntaxKind.FromKeyword:
        case SyntaxKind.GroupKeyword:
        case SyntaxKind.InKeyword:
        case SyntaxKind.IntoKeyword:
        case SyntaxKind.JoinKeyword:
        case SyntaxKind.LetKeyword:
        case SyntaxKind.OnKeyword:
        case SyntaxKind.OrderbyKeyword:
        case SyntaxKind.SelectKeyword:
        case SyntaxKind.UsingKeyword:
        case SyntaxKind.WhereKeyword:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type KeywordKind =
    | ECMAScriptReservedWordKind
    | ECMAScriptStrictModeReservedWordKind
    | ECMAScriptContextualKeywordKind
    | QueryKeywordKind;

/** @internal */
export function isKeywordKind(kind: SyntaxKind): kind is KeywordKind {
    return isECMAScriptReservedWordKind(kind)
        || isECMAScriptStrictModeReservedWordKind(kind)
        || isECMAScriptContextualKeywordKind(kind)
        || isQueryKeywordKind(kind);
}

/** @internal */
export type AssignmentOperatorKind =
    | SyntaxKind.EqualsToken
    | SyntaxKind.PlusEqualsToken
    | SyntaxKind.MinusEqualsToken
    | SyntaxKind.AsteriskEqualsToken
    | SyntaxKind.AsteriskAsteriskEqualsToken
    | SyntaxKind.SlashEqualsToken
    | SyntaxKind.PercentEqualsToken
    | SyntaxKind.LessThanLessThanEqualsToken
    | SyntaxKind.GreaterThanGreaterThanEqualsToken
    | SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken
    | SyntaxKind.AmpersandEqualsToken
    | SyntaxKind.BarEqualsToken
    | SyntaxKind.CaretEqualsToken;

/** @internal */
export function isAssignmentOperatorKind(kind: SyntaxKind): kind is AssignmentOperatorKind {
    switch (kind) {
        case SyntaxKind.EqualsToken:
        case SyntaxKind.PlusEqualsToken:
        case SyntaxKind.MinusEqualsToken:
        case SyntaxKind.AsteriskEqualsToken:
        case SyntaxKind.AsteriskAsteriskEqualsToken:
        case SyntaxKind.SlashEqualsToken:
        case SyntaxKind.PercentEqualsToken:
        case SyntaxKind.LessThanLessThanEqualsToken:
        case SyntaxKind.GreaterThanGreaterThanEqualsToken:
        case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
        case SyntaxKind.AmpersandEqualsToken:
        case SyntaxKind.BarEqualsToken:
        case SyntaxKind.CaretEqualsToken:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type BinaryOperatorKind =
    | SyntaxKind.AmpersandToken
    | SyntaxKind.AmpersandAmpersandToken
    | SyntaxKind.BarToken
    | SyntaxKind.BarBarToken
    | SyntaxKind.AsteriskToken
    | SyntaxKind.AsteriskAsteriskToken
    | SyntaxKind.EqualsEqualsToken
    | SyntaxKind.EqualsEqualsEqualsToken
    | SyntaxKind.ExclamationEqualsToken
    | SyntaxKind.ExclamationEqualsEqualsToken
    | SyntaxKind.GreaterThanToken
    | SyntaxKind.GreaterThanGreaterThanToken
    | SyntaxKind.GreaterThanGreaterThanGreaterThanToken
    | SyntaxKind.GreaterThanEqualsToken
    | SyntaxKind.LessThanToken
    | SyntaxKind.LessThanLessThanToken
    | SyntaxKind.LessThanEqualsToken
    | SyntaxKind.MinusToken
    | SyntaxKind.PlusToken
    | SyntaxKind.CaretToken
    | SyntaxKind.PercentToken
    | SyntaxKind.SlashToken
    | SyntaxKind.InstanceofKeyword
    | SyntaxKind.InKeyword
    | AssignmentOperatorKind;

/** @internal */
export function isBinaryOperatorKind(kind: SyntaxKind): kind is BinaryOperatorKind {
    switch (kind) {
        case SyntaxKind.LessThanToken:
        case SyntaxKind.LessThanEqualsToken:
        case SyntaxKind.LessThanLessThanToken:
        case SyntaxKind.GreaterThanToken:
        case SyntaxKind.GreaterThanEqualsToken:
        case SyntaxKind.GreaterThanGreaterThanToken:
        case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
        case SyntaxKind.EqualsEqualsToken:
        case SyntaxKind.EqualsEqualsEqualsToken:
        case SyntaxKind.ExclamationEqualsToken:
        case SyntaxKind.ExclamationEqualsEqualsToken:
        case SyntaxKind.PlusToken:
        case SyntaxKind.MinusToken:
        case SyntaxKind.AsteriskToken:
        case SyntaxKind.AsteriskAsteriskToken:
        case SyntaxKind.SlashToken:
        case SyntaxKind.PercentToken:
        case SyntaxKind.AmpersandToken:
        case SyntaxKind.AmpersandAmpersandToken:
        case SyntaxKind.BarToken:
        case SyntaxKind.BarBarToken:
        case SyntaxKind.CaretToken:
        case SyntaxKind.InstanceofKeyword:
        case SyntaxKind.InKeyword:
            return true;
        default:
            return isAssignmentOperatorKind(kind);
    }
}

/** @internal */
export type PrefixUnaryOperatorKind =
    | SyntaxKind.PlusToken
    | SyntaxKind.PlusPlusToken
    | SyntaxKind.MinusToken
    | SyntaxKind.MinusMinusToken
    | SyntaxKind.ExclamationToken
    | SyntaxKind.TildeToken
    | SyntaxKind.TypeofKeyword
    | SyntaxKind.VoidKeyword
    | SyntaxKind.AwaitKeyword
    | SyntaxKind.DeleteKeyword;

/** @internal */
export function isPrefixUnaryOperatorKind(kind: SyntaxKind): kind is PrefixUnaryOperatorKind {
    switch (kind) {
        case SyntaxKind.PlusToken:
        case SyntaxKind.PlusPlusToken:
        case SyntaxKind.MinusToken:
        case SyntaxKind.MinusMinusToken:
        case SyntaxKind.ExclamationToken:
        case SyntaxKind.TildeToken:
        case SyntaxKind.TypeofKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.DeleteKeyword:
        case SyntaxKind.AwaitKeyword:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type PostfixUnaryOperatorKind =
    | SyntaxKind.PlusPlusToken
    | SyntaxKind.MinusMinusToken;

/** @internal */
export function isPostfixUnaryOperatorKind(kind: SyntaxKind): kind is PostfixUnaryOperatorKind {
    switch (kind) {
        case SyntaxKind.PlusPlusToken:
        case SyntaxKind.MinusMinusToken:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type PunctuationKind =
    | SyntaxKind.OpenBraceToken
    | SyntaxKind.CloseBraceToken
    | SyntaxKind.OpenParenToken
    | SyntaxKind.CloseParenToken
    | SyntaxKind.OpenBracketToken
    | SyntaxKind.CloseBracketToken
    | SyntaxKind.DotToken
    | SyntaxKind.DotDotDotToken
    | Exclude<BinaryOperatorKind, KeywordKind>
    | Exclude<PrefixUnaryOperatorKind, KeywordKind>
    | PostfixUnaryOperatorKind
    | SyntaxKind.EqualsGreaterThanToken
    | SyntaxKind.QuestionToken
    | SyntaxKind.ColonToken
    | SyntaxKind.CommaToken;

/** @internal */
export function isPunctuationKind(kind: SyntaxKind): kind is PunctuationKind {
    switch (kind) {
        case SyntaxKind.OpenBraceToken:
        case SyntaxKind.CloseBraceToken:
        case SyntaxKind.OpenParenToken:
        case SyntaxKind.CloseParenToken:
        case SyntaxKind.OpenBracketToken:
        case SyntaxKind.CloseBracketToken:
        case SyntaxKind.DotToken:
        case SyntaxKind.DotDotDotToken:
        case SyntaxKind.QuestionToken:
        case SyntaxKind.ColonToken:
        case SyntaxKind.EqualsGreaterThanToken:
            return true;
        case SyntaxKind.InstanceofKeyword:
        case SyntaxKind.TypeofKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.DeleteKeyword:
            return false;
        default:
            return isBinaryOperatorKind(kind)
                || isPrefixUnaryOperatorKind(kind)
                || isPostfixUnaryOperatorKind(kind);
    }
}

/** @internal */
export type AxisSelectorKind =
    | SyntaxKind.RootAxisSelector
    | SyntaxKind.ParentAxisSelector
    | SyntaxKind.ChildAxisSelector
    | SyntaxKind.AncestorAxisSelector
    | SyntaxKind.AncestorOrSelfAxisSelector
    | SyntaxKind.DescendantAxisSelector
    | SyntaxKind.DescendantOrSelfAxisSelector
    | SyntaxKind.SelfAxisSelector
    | SyntaxKind.SiblingAxisSelector
    | SyntaxKind.SiblingOrSelfAxisSelector;

/** @internal */
export function isAxisSelectorKind(kind: SyntaxKind): kind is AxisSelectorKind {
    switch (kind) {
        case SyntaxKind.RootAxisSelector:
        case SyntaxKind.ParentAxisSelector:
        case SyntaxKind.ChildAxisSelector:
        case SyntaxKind.AncestorAxisSelector:
        case SyntaxKind.AncestorOrSelfAxisSelector:
        case SyntaxKind.DescendantAxisSelector:
        case SyntaxKind.DescendantOrSelfAxisSelector:
        case SyntaxKind.SelfAxisSelector:
        case SyntaxKind.SiblingAxisSelector:
        case SyntaxKind.SiblingOrSelfAxisSelector:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type TokenKind =
    | SyntaxKind.EndOfFileToken
    | KeywordKind
    | PunctuationKind
    | AxisSelectorKind;

/** @internal */
export function isTokenKind(kind: SyntaxKind): kind is TokenKind {
    switch (kind) {
        case SyntaxKind.EndOfFileToken:
            return true;
        case SyntaxKind.NullKeyword:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
        case SyntaxKind.ThisKeyword:
            return false;
        default:
            return isBinaryOperatorKind(kind)
                || isPrefixUnaryOperatorKind(kind)
                || isPostfixUnaryOperatorKind(kind);
    }
}

/** @internal */
export const enum TokenFlags {
    None,
    Hexadecimal = 1 << 0,
    Octal = 1 << 1,
    Binary = 1 << 2
}

/** @internal */
export interface TextRange {
    readonly pos: number;
    readonly end: number;
}

/** @internal */
export interface Syntax {
    [Syntax.location]: TextRange;
}

/** @internal */
export namespace Syntax {
    export const location = Symbol("Syntax.location");
}

/** @internal */
export function getPos(node: Node) {
    return node[Syntax.location].pos;
}

/** @internal */
export function getEnd(node: Node) {
    return node[Syntax.location].end;
}

/** @internal */
export interface TokenNode<Kind extends TokenKind> extends Syntax {
    readonly kind: Kind;
}

/** @internal */
export type Token = TokenNode<TokenKind>;

/** @internal */
export function isToken(node: Node): node is Token {
    return isTokenKind(node.kind);
}

/** @internal */
export interface Identifier extends Syntax {
    readonly kind: SyntaxKind.Identifier;
    readonly text: string;
}

/** @internal */
export interface ComputedPropertyName extends Syntax {
    readonly kind: SyntaxKind.ComputedPropertyName;
    readonly expression: AssignmentExpressionOrHigher;
}

/** @internal */
export interface TextLiteralNode<Kind extends TextLiteralKind> extends Syntax {
    readonly kind: Kind;
    readonly text: string;
    readonly flags: TokenFlags;
}

/** @internal */
export type StringLiteral = TextLiteralNode<SyntaxKind.StringLiteral>;

/** @internal */
export type NumberLiteral = TextLiteralNode<SyntaxKind.NumberLiteral>;

/** @internal */
export type RegularExpressionLiteral = TextLiteralNode<SyntaxKind.RegularExpressionLiteral>;

/** @internal */
export type TextLiteral =
    | StringLiteral
    | NumberLiteral
    | RegularExpressionLiteral;

/** @internal */
export function isTextLiteral(node: Node): node is TextLiteral {
    return isTextLiteralKind(node.kind);
}

/** @internal */
export type NullLiteral = TokenNode<SyntaxKind.NullKeyword>;

/** @internal */
export type BooleanLiteral = TokenNode<SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword>;

/** @internal */
export type KeywordLiteral =
    | NullLiteral
    | BooleanLiteral;

/** @internal */
export function isKeywordLiteral(node: Node): node is KeywordLiteral {
    return isKeywordLiteralKind(node.kind);
}

/** @internal */
export type Literal =
    | TextLiteral
    | KeywordLiteral;

/** @internal */
export function isLiteral(node: Node): node is Literal {
    return isLiteralKind(node.kind);
}

/** @internal */
export type AxisSelector = TokenNode<AxisSelectorKind>;

/** @internal */
export type MemberName =
    | Identifier
    | StringLiteral
    | NumberLiteral
    | ComputedPropertyName;

/** @internal */
export function isMemberName(node: Node): node is MemberName {
    switch (node.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumberLiteral:
        case SyntaxKind.ComputedPropertyName:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type ThisExpression = TokenNode<SyntaxKind.ThisKeyword>;

/** @internal */
export interface SpreadElement extends Syntax {
    readonly kind: SyntaxKind.SpreadElement;
    readonly expression: AssignmentExpressionOrHigher;
}

/** @internal */
export interface PropertyAssignment extends Syntax {
    readonly kind: SyntaxKind.PropertyAssignment;
    readonly name: MemberName;
    readonly initializer: AssignmentExpressionOrHigher;
}

/** @internal */
export interface ShorthandPropertyAssignment extends Syntax {
    readonly kind: SyntaxKind.ShorthandPropertyAssignment;
    readonly name: Identifier;
}

/** @internal */
export type ObjectLiteralElement =
    | PropertyAssignment
    | ShorthandPropertyAssignment
    | SpreadElement;

/** @internal */
export function isObjecLiteralElement(node: Node): node is ObjectLiteralElement {
    switch (node.kind) {
        case SyntaxKind.PropertyAssignment:
        case SyntaxKind.ShorthandPropertyAssignment:
        case SyntaxKind.SpreadElement:
            return true;
        default:
            return false;
    }
}

/** @internal */
export interface ObjectLiteral extends Syntax {
    readonly kind: SyntaxKind.ObjectLiteral;
    readonly properties: ReadonlyArray<ObjectLiteralElement>;
}

/** @internal */
export interface Elision extends Syntax {
    readonly kind: SyntaxKind.Elision;
}

/** @internal */
export type ArrayLiteralElement =
    | AssignmentExpressionOrHigher
    | Elision
    | SpreadElement;

/** @internal */
export function isArrayLiteralElement(node: Node): node is ArrayLiteralElement {
    switch (node.kind) {
        case SyntaxKind.Elision:
        case SyntaxKind.SpreadElement:
            return true;
        default:
            return isExpression(node);
    }
}

/** @internal */
export interface ArrayLiteral extends Syntax {
    readonly kind: SyntaxKind.ArrayLiteral;
    readonly elements: ReadonlyArray<ArrayLiteralElement>;
}

/** @internal */
export interface ParenthesizedExpression extends Syntax {
    readonly kind: SyntaxKind.ParenthesizedExpression;
    readonly expression: Expression;
}

/** @internal */
export type PrimaryExpression =
    | ThisExpression
    | Identifier
    | Literal
    | ArrayLiteral
    | ObjectLiteral
    | ParenthesizedExpression
    | RegularExpressionLiteral
    | NewExpression;

/** @internal */
export function isPrimaryExpression(node: Node): node is PrimaryExpression {
    switch (node.kind) {
        case SyntaxKind.ThisKeyword:
        case SyntaxKind.Identifier:
        case SyntaxKind.ArrayLiteral:
        case SyntaxKind.ObjectLiteral:
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.NewExpression:
            return true;
        default:
            return isLiteral(node);
    }
}

/** @internal */
export interface PropertyAccessExpression extends Syntax {
    readonly kind: SyntaxKind.PropertyAccessExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly name: Identifier;
}

/** @internal */
export interface ElementAccessExpression extends Syntax {
    readonly kind: SyntaxKind.ElementAccessExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly argumentExpression: Expression;
}

/** @internal */
export type Argument =
    | AssignmentExpressionOrHigher
    | SpreadElement;

/** @internal */
export interface NewExpression extends Syntax {
    readonly kind: SyntaxKind.NewExpression;
    readonly expression: MemberExpressionOrHigher;
    readonly argumentList: ReadonlyArray<Argument> | undefined;
}

/** @internal */
export type MemberExpressionOrHigher =
    | PrimaryExpression
    | PropertyAccessExpression
    | ElementAccessExpression
    | NewExpression;

/** @internal */
export function isMemberExpressionOrHigher(node: Node): node is MemberExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.PropertyAccessExpression:
        case SyntaxKind.ElementAccessExpression:
        case SyntaxKind.NewExpression:
            return true;
        default:
            return isPrimaryExpression(node);
    }
}

/** @internal */
export interface CallExpression extends Syntax {
    readonly kind: SyntaxKind.CallExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly argumentList: ReadonlyArray<Argument>;
}

/** @internal */
export type LeftHandSideExpressionOrHigher =
    | MemberExpressionOrHigher
    | CallExpression;

/** @internal */
export function isLeftHandSideExpressionOrHigher(node: Node): node is LeftHandSideExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.CallExpression:
            return true;
        default:
            return isMemberExpressionOrHigher(node);
    }
}

/** @internal */
export interface PrefixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PrefixUnaryExpression;
    readonly operatorToken: TokenNode<PrefixUnaryOperatorKind>;
    readonly expression: UnaryExpressionOrHigher;
}

/** @internal */
export interface PostfixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PostfixUnaryExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly operatorToken: TokenNode<PrefixUnaryOperatorKind>;
}

/** @internal */
export type UnaryExpressionOrHigher =
    | PrefixUnaryExpression
    | PostfixUnaryExpression
    | LeftHandSideExpressionOrHigher;

/** @internal */
export function isUnaryExpressionOrHigher(node: Node): node is UnaryExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.PrefixUnaryExpression:
        case SyntaxKind.PostfixUnaryExpression:
            return true;
        default:
            return isLeftHandSideExpressionOrHigher(node);
    }
}

/** @internal */
export type EqualityOperatorKind =
    | SyntaxKind.EqualsEqualsToken
    | SyntaxKind.EqualsEqualsEqualsToken
    | SyntaxKind.ExclamationEqualsToken
    | SyntaxKind.ExclamationEqualsEqualsToken;

/** @internal */
export type RelationalOperatorKind =
    | SyntaxKind.LessThanToken
    | SyntaxKind.LessThanEqualsToken
    | SyntaxKind.GreaterThanToken
    | SyntaxKind.GreaterThanEqualsToken
    | SyntaxKind.InstanceofKeyword
    | SyntaxKind.InKeyword;

/** @internal */
export type ShiftOperatorKind =
    | SyntaxKind.LessThanLessThanToken
    | SyntaxKind.GreaterThanGreaterThanToken
    | SyntaxKind.GreaterThanGreaterThanGreaterThanToken;

/** @internal */
export type AdditiveOperatorKind =
    | SyntaxKind.PlusToken
    | SyntaxKind.MinusToken;

/** @internal */
export type MultiplicativeOperatorKind =
    | SyntaxKind.AsteriskToken
    | SyntaxKind.SlashToken
    | SyntaxKind.PercentToken
    | SyntaxKind.AsteriskAsteriskToken;

/** @internal */
export const enum BinaryPrecedence {
    Unknown = -1,
    AssignmentExpression,
    LogicalORExpression,
    LogicalANDExpression,
    BitwiseORExpression,
    BitwiseXORExpression,
    BitwiseANDExpression,
    EqualityExpression,
    RelationalExpression,
    ShiftExpression,
    AdditiveExpression,
    MultiplicitaveExpression,
    ExponentiationExpression
}

/** @internal */
export function getBinaryOperatorPrecedence(kind: SyntaxKind): BinaryPrecedence {
    switch (kind) {
        case SyntaxKind.EqualsToken:
        case SyntaxKind.PlusEqualsToken:
        case SyntaxKind.MinusEqualsToken:
        case SyntaxKind.AsteriskAsteriskEqualsToken:
        case SyntaxKind.AsteriskEqualsToken:
        case SyntaxKind.SlashEqualsToken:
        case SyntaxKind.PercentEqualsToken:
        case SyntaxKind.LessThanLessThanEqualsToken:
        case SyntaxKind.GreaterThanGreaterThanEqualsToken:
        case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
        case SyntaxKind.AmpersandEqualsToken:
        case SyntaxKind.CaretEqualsToken:
        case SyntaxKind.BarEqualsToken: return BinaryPrecedence.AssignmentExpression;
        case SyntaxKind.BarBarToken: return BinaryPrecedence.LogicalORExpression;
        case SyntaxKind.AmpersandAmpersandToken: return BinaryPrecedence.LogicalANDExpression;
        case SyntaxKind.BarToken: return BinaryPrecedence.BitwiseORExpression;
        case SyntaxKind.CaretToken: return BinaryPrecedence.BitwiseXORExpression;
        case SyntaxKind.AmpersandToken: return BinaryPrecedence.BitwiseANDExpression;
        case SyntaxKind.EqualsEqualsToken:
        case SyntaxKind.EqualsEqualsEqualsToken:
        case SyntaxKind.ExclamationEqualsToken:
        case SyntaxKind.ExclamationEqualsEqualsToken: return BinaryPrecedence.EqualityExpression;
        case SyntaxKind.LessThanToken:
        case SyntaxKind.LessThanEqualsToken:
        case SyntaxKind.GreaterThanToken:
        case SyntaxKind.GreaterThanEqualsToken:
        case SyntaxKind.InstanceofKeyword:
        case SyntaxKind.InKeyword: return BinaryPrecedence.RelationalExpression;
        case SyntaxKind.LessThanLessThanToken:
        case SyntaxKind.GreaterThanGreaterThanToken:
        case SyntaxKind.GreaterThanGreaterThanGreaterThanToken: return BinaryPrecedence.ShiftExpression;
        case SyntaxKind.PlusToken:
        case SyntaxKind.MinusToken: return BinaryPrecedence.AdditiveExpression;
        case SyntaxKind.AsteriskToken:
        case SyntaxKind.SlashToken:
        case SyntaxKind.PercentToken: return BinaryPrecedence.MultiplicitaveExpression;
        case SyntaxKind.AsteriskAsteriskToken: return BinaryPrecedence.ExponentiationExpression;
        default: return BinaryPrecedence.Unknown;
    }
}

/** @internal */
export interface BinaryExpression extends Syntax {
    readonly kind: SyntaxKind.BinaryExpression;
    readonly left: AssignmentExpressionOrHigher;
    readonly operatorToken: TokenNode<BinaryOperatorKind>;
    readonly right: AssignmentExpressionOrHigher;
}

/** @internal */
export interface ConditionalExpression extends Syntax {
    readonly kind: SyntaxKind.ConditionalExpression;
    readonly condition: Expression;
    readonly whenTrue: AssignmentExpressionOrHigher;
    readonly whenFalse: AssignmentExpressionOrHigher;
}

/** @internal */
export interface QueryExpression extends Syntax {
    readonly kind: SyntaxKind.QueryExpression;
    readonly query: SelectClause | GroupClause;
}

/** @internal */
export interface ArrowFunction extends Syntax {
    readonly kind: SyntaxKind.ArrowFunction;
    readonly asyncKeyword: TokenNode<SyntaxKind.AsyncKeyword> | undefined;
    readonly parameterList: ReadonlyArray<Identifier>;
    readonly body: AssignmentExpressionOrHigher;
}

/** @internal */
export type AssignmentExpressionOrHigher =
    | UnaryExpressionOrHigher
    | ConditionalExpression
    | QueryExpression
    | ArrowFunction
    | BinaryExpression;

/** @internal */
export function isAssignmentExpressionOrHigher(node: Node): node is AssignmentExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.BinaryExpression:
        case SyntaxKind.ConditionalExpression:
        case SyntaxKind.QueryExpression:
        case SyntaxKind.ArrowFunction:
            return true;
        default:
            return isUnaryExpressionOrHigher(node);
    }
}

/** @internal */
export interface CommaListExpression extends Syntax {
    readonly kind: SyntaxKind.CommaListExpression;
    readonly expressions: ReadonlyArray<AssignmentExpressionOrHigher>;
}

/** @internal */
export type Expression =
    | AssignmentExpressionOrHigher
    | CommaListExpression;

/** @internal */
export function isExpression(node: Node): node is Expression {
    switch (node.kind) {
        case SyntaxKind.CommaListExpression:
            return true;
        default:
            return isAssignmentExpressionOrHigher(node);
    }
}

/** @internal */
export interface FromClause extends Syntax {
    readonly kind: SyntaxKind.FromClause;
    readonly outerClause: Clause | undefined;
    readonly awaitKeyword: TokenNode<SyntaxKind.AwaitKeyword> | undefined;
    readonly name: Identifier;
    readonly axisSelectorToken: AxisSelector | undefined;
    readonly expression: AssignmentExpressionOrHigher;
}

/** @internal */
export interface LetClause extends Syntax {
    readonly kind: SyntaxKind.LetClause;
    readonly outerClause: Clause;
    readonly name: Identifier;
    readonly expression: AssignmentExpressionOrHigher;
}

/** @internal */
export interface WhereClause extends Syntax {
    readonly kind: SyntaxKind.WhereClause;
    readonly outerClause: Clause;
    readonly expression: AssignmentExpressionOrHigher;
}

/** @internal */
export interface OrderbyClause extends Syntax {
    readonly kind: SyntaxKind.OrderbyClause;
    readonly outerClause: Clause;
    readonly comparators: ReadonlyArray<OrderbyComparator>;
}

/** @internal */
export interface OrderbyComparator extends Syntax {
    readonly kind: SyntaxKind.OrderbyComparator;
    readonly expression: AssignmentExpressionOrHigher;
    readonly directionToken: TokenNode<SyntaxKind.AscendingKeyword> | TokenNode<SyntaxKind.DescendingKeyword> | undefined;
    readonly usingExpression: AssignmentExpressionOrHigher | undefined;
}

/** @internal */
export interface GroupClause extends Syntax {
    readonly kind: SyntaxKind.GroupClause;
    readonly outerClause: Clause;
    readonly elementSelector: AssignmentExpressionOrHigher;
    readonly keySelector: AssignmentExpressionOrHigher;
    readonly intoName: Identifier | undefined;
}

/** @internal */
export interface JoinClause extends Syntax {
    readonly kind: SyntaxKind.JoinClause;
    readonly outerClause: Clause;
    readonly awaitKeyword: TokenNode<SyntaxKind.AwaitKeyword> | undefined;
    readonly name: Identifier;
    readonly axisSelectorToken: AxisSelector | undefined;
    readonly expression: AssignmentExpressionOrHigher;
    readonly outerSelector: AssignmentExpressionOrHigher;
    readonly innerSelector: AssignmentExpressionOrHigher;
    readonly intoName: Identifier | undefined;
}

/** @internal */
export interface SelectClause extends Syntax {
    readonly kind: SyntaxKind.SelectClause;
    readonly outerClause: Clause;
    readonly axisSelectorToken: AxisSelector | undefined;
    readonly expression: AssignmentExpressionOrHigher;
    readonly intoName: Identifier | undefined;
}

/** @internal */
export type Clause =
    | FromClause
    | LetClause
    | WhereClause
    | OrderbyClause
    | GroupClause
    | JoinClause
    | SelectClause;

/** @internal */
export function isClause(node: Node): node is Clause {
    switch (node.kind) {
        case SyntaxKind.FromClause:
        case SyntaxKind.LetClause:
        case SyntaxKind.WhereClause:
        case SyntaxKind.OrderbyClause:
        case SyntaxKind.GroupClause:
        case SyntaxKind.JoinClause:
        case SyntaxKind.SelectClause:
            return true;
        default:
            return false;
    }
}

/** @internal */
export type Node =
    | Expression
    | Clause
    | Token
    | MemberName
    | ObjectLiteralElement
    | ArrayLiteralElement
    | OrderbyComparator;
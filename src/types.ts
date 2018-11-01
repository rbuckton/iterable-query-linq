export enum SyntaxKind {
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
    HierarchyKeyword,           // `hierarchy`
    IntoKeyword,
    JoinKeyword,
    OnKeyword,
    OrderbyKeyword,
    SelectKeyword,
    UsingKeyword,
    WhereKeyword,

    // Query hierarchy keywords
    AncestorsofKeyword,            // `ancestor`
    AncestorsorselfofKeyword,      // `ancestororself`
    ChildrenofKeyword,               // `child`
    DescendantsofKeyword,          // `descendant`
    DescendantsorselfofKeyword,    // `descendantorself`
    ParentofKeyword,              // `parent`
    RootofKeyword,                // `root`
    SelfofKeyword,                // `self`
    SiblingsofKeyword,             // `sibling`
    SiblingsorselfofKeyword,       // `siblingorself`

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

    // Names
    Identifier,
    ComputedPropertyName,

    // Query body clauses
    FromClause,
    LetClause,
    WhereClause,
    OrderbyClause,
    OrderbyComparator,
    GroupClause,
    JoinClause,
    SelectClause,
    SequenceBinding,

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
    ArrayLiteral,
    Elision,
    SpreadElement,
    BinaryExpression,
    AssignmentExpression,
    ConditionalExpression,
    QueryExpression,
    CommaListExpression,

    // Declarations
    PropertyDefinition,
    ShorthandPropertyDefinition,

    // Patterns
    ObjectBindingPattern,
    BindingRestProperty,
    BindingProperty,
    ShorthandBindingProperty,
    ObjectAssignmentPattern,
    AssignmentRestProperty,
    AssignmentProperty,
    ShorthandAssignmentProperty,
    ArrayBindingPattern,
    BindingElement,
    BindingRestElement,
    ArrayAssignmentPattern,
    AssignmentElement,
    AssignmentRestElement,

    // Cover grammars
    CoverParenthesizedExpressionAndArrowParameterList,
    CoverInitializedName
}

export type TextLiteralKind =
    | SyntaxKind.StringLiteral
    | SyntaxKind.NumberLiteral
    | SyntaxKind.RegularExpressionLiteral;

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

export type KeywordLiteralKind =
    | SyntaxKind.NullKeyword
    | SyntaxKind.TrueKeyword
    | SyntaxKind.FalseKeyword;

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

export type LiteralKind =
    | TextLiteralKind
    | KeywordLiteralKind;

export function isLiteralKind(kind: SyntaxKind): kind is LiteralKind {
    return isTextLiteralKind(kind)
        || isKeywordLiteralKind(kind);
}

export type ECMAScriptReservedWordKind =
    | SyntaxKind.AwaitKeyword
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
    | SyntaxKind.ImplementsKeyword
    | SyntaxKind.ImportKeyword
    | SyntaxKind.InKeyword
    | SyntaxKind.InterfaceKeyword
    | SyntaxKind.InstanceofKeyword
    | SyntaxKind.LetKeyword
    | SyntaxKind.NewKeyword
    | SyntaxKind.NullKeyword
    | SyntaxKind.PackageKeyword
    | SyntaxKind.PrivateKeyword
    | SyntaxKind.ProtectedKeyword
    | SyntaxKind.PublicKeyword
    | SyntaxKind.ReturnKeyword
    | SyntaxKind.StaticKeyword
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
    | SyntaxKind.WithKeyword
    | SyntaxKind.YieldKeyword;

export function isECMAScriptReservedWordKind(kind: SyntaxKind): kind is ECMAScriptReservedWordKind {
    switch (kind) {
        case SyntaxKind.AwaitKeyword:
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

export type ECMAScriptContextualKeywordKind =
    | SyntaxKind.AsyncKeyword
    | SyntaxKind.FromKeyword
    | SyntaxKind.OfKeyword;

export function isECMAScriptContextualKeywordKind(kind: SyntaxKind): kind is ECMAScriptContextualKeywordKind {
    switch (kind) {
        case SyntaxKind.AsyncKeyword:
        case SyntaxKind.FromKeyword:
        case SyntaxKind.OfKeyword:
            return true;
        default:
            return false;
    }
}

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
    | SyntaxKind.WhereKeyword
    | SyntaxKind.HierarchyKeyword;

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
        case SyntaxKind.HierarchyKeyword:
            return true;
        default:
            return false;
    }
}

export type HierarchyAxisKeywordKind =
    | SyntaxKind.RootofKeyword
    | SyntaxKind.ParentofKeyword
    | SyntaxKind.ChildrenofKeyword
    | SyntaxKind.AncestorsofKeyword
    | SyntaxKind.AncestorsorselfofKeyword
    | SyntaxKind.DescendantsofKeyword
    | SyntaxKind.DescendantsorselfofKeyword
    | SyntaxKind.SelfofKeyword
    | SyntaxKind.SiblingsofKeyword
    | SyntaxKind.SiblingsorselfofKeyword;

export function isHierarchyAxisKeywordKind(kind: SyntaxKind): kind is HierarchyAxisKeywordKind {
    switch (kind) {
        case SyntaxKind.RootofKeyword:
        case SyntaxKind.ParentofKeyword:
        case SyntaxKind.ChildrenofKeyword:
        case SyntaxKind.AncestorsofKeyword:
        case SyntaxKind.AncestorsorselfofKeyword:
        case SyntaxKind.DescendantsofKeyword:
        case SyntaxKind.DescendantsorselfofKeyword:
        case SyntaxKind.SelfofKeyword:
        case SyntaxKind.SiblingsofKeyword:
        case SyntaxKind.SiblingsorselfofKeyword:
            return true;
        default:
            return false;
    }
}

export type KeywordKind =
    | ECMAScriptReservedWordKind
    | ECMAScriptContextualKeywordKind
    | QueryKeywordKind
    | HierarchyAxisKeywordKind;

export function isKeywordKind(kind: SyntaxKind): kind is KeywordKind {
    return isECMAScriptReservedWordKind(kind)
        || isECMAScriptContextualKeywordKind(kind)
        || isQueryKeywordKind(kind)
        || isHierarchyAxisKeywordKind(kind);
}

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
    | SyntaxKind.InKeyword;

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
            return false;
    }
}

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

export type PostfixUnaryOperatorKind =
    | SyntaxKind.PlusPlusToken
    | SyntaxKind.MinusMinusToken;

export function isPostfixUnaryOperatorKind(kind: SyntaxKind): kind is PostfixUnaryOperatorKind {
    switch (kind) {
        case SyntaxKind.PlusPlusToken:
        case SyntaxKind.MinusMinusToken:
            return true;
        default:
            return false;
    }
}

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
    | AssignmentOperatorKind
    | PostfixUnaryOperatorKind
    | SyntaxKind.EqualsGreaterThanToken
    | SyntaxKind.QuestionToken
    | SyntaxKind.ColonToken
    | SyntaxKind.CommaToken;

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


export type TokenKind =
    | SyntaxKind.EndOfFileToken
    | KeywordKind
    | PunctuationKind;

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

export const enum TokenFlags {
    None,
    Hexadecimal = 1 << 0,
    Octal = 1 << 1,
    Binary = 1 << 2
}

export interface TextRange {
    readonly pos: number;
    readonly end: number;
}

export interface Syntax {
    [Syntax.location]: TextRange;
}

export namespace Syntax {
    export const location = Symbol("Syntax.location");
}

export function getPos(node: Node) {
    return node[Syntax.location].pos;
}

export function getEnd(node: Node) {
    return node[Syntax.location].end;
}

export interface TokenNode<Kind extends TokenKind> extends Syntax {
    readonly kind: Kind;
}

export type Token = TokenNode<TokenKind>;
export function isToken(node: Node): node is Token {
    return isTokenKind(node.kind);
}

export type Keyword = TokenNode<KeywordKind>;
export function isKeyword(node: Node): node is Keyword {
    return isKeywordKind(node.kind);
}

export type Punctuation = TokenNode<PunctuationKind>;
export function isPunctuation(node: Node): node is Punctuation {
    return isPunctuationKind(node.kind);
}

export type AsyncKeyword = TokenNode<SyntaxKind.AsyncKeyword>;
export type AwaitKeyword = TokenNode<SyntaxKind.AwaitKeyword>;
export type DotDotDotToken = TokenNode<SyntaxKind.DotDotDotToken>;

export type IdentifierReference = Identifier;
export type IdentifierName = Identifier;
export type BindingIdentifier = Identifier;

export interface Identifier extends Syntax {
    readonly kind: SyntaxKind.Identifier;
    readonly text: string;
}

export interface ComputedPropertyName extends Syntax {
    readonly kind: SyntaxKind.ComputedPropertyName;
    readonly expression: AssignmentExpressionOrHigher;
}

export interface TextLiteralNode<Kind extends TextLiteralKind> extends Syntax {
    readonly kind: Kind;
    readonly text: string;
    readonly flags: TokenFlags;
}

export type StringLiteral = TextLiteralNode<SyntaxKind.StringLiteral>;

export type NumberLiteral = TextLiteralNode<SyntaxKind.NumberLiteral>;

export type RegularExpressionLiteral = TextLiteralNode<SyntaxKind.RegularExpressionLiteral>;

export type TextLiteral =
    | StringLiteral
    | NumberLiteral
    | RegularExpressionLiteral;

export function isTextLiteral(node: Node): node is TextLiteral {
    return isTextLiteralKind(node.kind);
}

export type NullLiteral = TokenNode<SyntaxKind.NullKeyword>;
export type BooleanLiteral = TokenNode<SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword>;

export type KeywordLiteral =
    | NullLiteral
    | BooleanLiteral;

export function isKeywordLiteral(node: Node): node is KeywordLiteral {
    return isKeywordLiteralKind(node.kind);
}

export type Literal =
    | TextLiteral
    | KeywordLiteral;

export function isLiteral(node: Node): node is Literal {
    return isLiteralKind(node.kind);
}

export type PropertyName =
    | BindingIdentifier
    | StringLiteral
    | NumberLiteral
    | ComputedPropertyName;

export function isMemberName(node: Node): node is PropertyName {
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

export type ThisExpression = TokenNode<SyntaxKind.ThisKeyword>;

export type BindingName =
    | BindingIdentifier
    | BindingPattern;

export interface SpreadElement extends Syntax {
    readonly kind: SyntaxKind.SpreadElement;
    readonly expression: AssignmentExpressionOrHigher;
}

export interface Elision extends Syntax {
    readonly kind: SyntaxKind.Elision;
}

export type MethodDefinition = never;

// PropertyDefinition :
//     IdentifierReference
//     CoverInitializedName
//     PropertyName `:` AssignmentExpression
//     MethodDefinition
//     `...` AssignmentExpression
export type ObjectLiteralElement =
    | ShorthandPropertyDefinition
    | CoverInitializedName
    | PropertyDefinition
    | MethodDefinition
    | SpreadElement;

// PropertyDefinition: PropertyName `:` AssignmentExpression
export interface PropertyDefinition extends Syntax {
    readonly kind: SyntaxKind.PropertyDefinition;
    readonly name: PropertyName;
    readonly initializer: AssignmentExpressionOrHigher;
}

// PropertyDefinition: IdentifierReference
export interface ShorthandPropertyDefinition extends Syntax {
    readonly kind: SyntaxKind.ShorthandPropertyDefinition;
    readonly name: IdentifierReference;
}

// CoverInitializedName : IdentifierReference Initializer
export interface CoverInitializedName extends Syntax {
    readonly kind: SyntaxKind.CoverInitializedName;
    readonly name: IdentifierReference;
    readonly initializer: AssignmentExpressionOrHigher;
}

// ObjectLiteral:
//     `{` `}`
//     `{` PropertyDefinitionList `,`? `}`
export interface ObjectLiteral extends Syntax {
    readonly kind: SyntaxKind.ObjectLiteral;
    readonly properties: ReadonlyArray<ObjectLiteralElement>;
}

export type ObjectAssignmentPatternElement = ShorthandAssignmentProperty | AssignmentProperty;

// AssignmentRestProperty: `...` DestructuringAssignmentTarget
export interface AssignmentRestProperty extends Syntax {
    readonly kind: SyntaxKind.AssignmentRestProperty;
    readonly expression: DestructuringAssignmentTarget;
}

// AssignmentProperty: PropertyName `:` AssignmentElement
export interface AssignmentProperty extends Syntax {
    readonly kind: SyntaxKind.AssignmentProperty;
    readonly propertyName: PropertyName;
    readonly assignmentElement: AssignmentElement;
}

// AssignmentProperty: IdentifierReference Initializer?
export interface ShorthandAssignmentProperty extends Syntax {
    readonly kind: SyntaxKind.ShorthandAssignmentProperty;
    readonly name: IdentifierReference;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ObjectAssignmentPattern :
//     `{` `}`
//     `{` AssignmentRestProperty `}`
//     `{` AssignmentPropertyList `}`
//     `{` AssignmentPropertyList `,` AssignmentRestProperty? `}`
export interface ObjectAssignmentPattern extends Syntax {
    readonly kind: SyntaxKind.ObjectAssignmentPattern;
    readonly properties: ReadonlyArray<ObjectAssignmentPatternElement>;
    readonly rest: AssignmentRestProperty | undefined;
}

// BindingRestProperty: `...` BindingIdentifier
export interface BindingRestProperty extends Syntax {
    readonly kind: SyntaxKind.BindingRestProperty;
    readonly name: BindingIdentifier;
}

// BindingProperty :
//     SingleNameBinding
//     PropertyName `:` BindingElement
export type ObjectBindingPatternElement = ShorthandBindingProperty | BindingProperty;

// BindingProperty: PropertyName `:` BindingElement
export interface BindingProperty extends Syntax {
    readonly kind: SyntaxKind.BindingProperty;
    readonly propertyName: PropertyName;
    readonly bindingElement: BindingElement;
}

// BindingProperty: SingleNameBinding
export interface ShorthandBindingProperty extends Syntax {
    readonly kind: SyntaxKind.ShorthandBindingProperty;
    readonly name: BindingIdentifier;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ObjectBindingPattern :
//     `{` `}`
//     `{` BindingRestProperty `}`
//     `{` BindingPropertyList `}`
//     `{` BindingPropertyList `,` BindingRestProperty? `}`
export interface ObjectBindingPattern extends Syntax {
    readonly kind: SyntaxKind.ObjectBindingPattern;
    readonly properties: ReadonlyArray<ObjectBindingPatternElement>;
    readonly rest: BindingRestProperty | undefined;
}

// ElementList :
//     Elision? AssignmentExpression
//     Elision? SpreadElement
//     ElementList `,` Elision? AssignmentExpression
//     ElementList `,` Elision? SpreadElement
export type ArrayLiteralElement = AssignmentExpressionOrHigher | SpreadElement | Elision;

// ArrayLiteral :
//     `[` Elision? `]`
//     `[` ElementList `]`
//     `[` ElementList `,` Elision? `]`
export interface ArrayLiteral extends Syntax {
    readonly kind: SyntaxKind.ArrayLiteral;
    readonly elements: ReadonlyArray<ArrayLiteralElement>;
}

// BindingElementList :
//     BindingElisionElement
//     BindingElementList `,` BindingElisionElement
export type ArrayBindingPatternElement = BindingElement | Elision;

// BindingRestElement: `...` BindingName
export interface BindingRestElement extends Syntax {
    readonly kind: SyntaxKind.BindingRestElement;
    readonly name: BindingName;
}

// BindingElement: BindingName Initializer?
export interface BindingElement extends Syntax {
    readonly kind: SyntaxKind.BindingElement;
    readonly name: BindingName;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ArrayBindingPattern :
//     `[` Elision? BindingRestElement? `]`
//     `[` BindingElementList `]`
//     `[` BindingElementList `,` Elision? BindingRestElement? `]`
export interface ArrayBindingPattern extends Syntax {
    readonly kind: SyntaxKind.ArrayBindingPattern;
    readonly elements: ReadonlyArray<ArrayBindingPatternElement>;
    readonly rest: BindingRestElement | undefined;
}

// AssignmentElementList :
//     AssignmentElisionElement
//     AssignmentElementList `,` AssignmentElisionElement
export type ArrayAssignmentPatternElement = AssignmentElement | Elision;

// AssignmentRestElement: `...` DestructuringAssignmentTarget
export interface AssignmentRestElement extends Syntax {
    readonly kind: SyntaxKind.AssignmentRestElement;
    readonly target: DestructuringAssignmentTarget;
}

// AssignmentElement: DestructuringAssignmentTarget Initializer?
export interface AssignmentElement extends Syntax {
    readonly kind: SyntaxKind.AssignmentElement;
    readonly target: DestructuringAssignmentTarget;
    readonly initializer: AssignmentExpressionOrHigher | undefined;
}

// ArrayAssignmentPattern :
//     `[` Elision? AssignmentRestElement? `]`
//     `[` AssignmentElementList `]`
//     `[` AssignmentElementList `,` Elision? AssignmentRestElement? `]`
export interface ArrayAssignmentPattern extends Syntax {
    readonly kind: SyntaxKind.ArrayAssignmentPattern;
    readonly elements: ReadonlyArray<ArrayAssignmentPatternElement>;
    readonly rest: AssignmentRestElement | undefined;
}

export type BindingPattern = ObjectBindingPattern | ArrayBindingPattern;
export type AssignmentPattern = ObjectAssignmentPattern | ArrayAssignmentPattern;

export interface ParenthesizedExpression extends Syntax {
    readonly kind: SyntaxKind.ParenthesizedExpression;
    readonly expression: Expression;
}

export type PrimaryExpression =
    | ThisExpression
    | Identifier
    | Literal
    | ArrayLiteral
    | ObjectLiteral
    | ParenthesizedExpression
    | RegularExpressionLiteral
    | NewExpression
    | CoverParenthesizedExpressionAndArrowParameterList;

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

export interface PropertyAccessExpression extends Syntax {
    readonly kind: SyntaxKind.PropertyAccessExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly name: Identifier;
}

export interface ElementAccessExpression extends Syntax {
    readonly kind: SyntaxKind.ElementAccessExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly argumentExpression: Expression;
}

export type Argument =
    | AssignmentExpressionOrHigher
    | SpreadElement;

export interface NewExpression extends Syntax {
    readonly kind: SyntaxKind.NewExpression;
    readonly expression: MemberExpressionOrHigher;
    readonly argumentList: ReadonlyArray<Argument> | undefined;
}

export type MemberExpressionOrHigher =
    | PrimaryExpression
    | PropertyAccessExpression
    | ElementAccessExpression
    | NewExpression;

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

export interface CallExpression extends Syntax {
    readonly kind: SyntaxKind.CallExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly argumentList: ReadonlyArray<Argument>;
}

export type LeftHandSideExpressionOrHigher =
    | MemberExpressionOrHigher
    | CallExpression
    | AssignmentPattern;

export function isLeftHandSideExpressionOrHigher(node: Node): node is LeftHandSideExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.CallExpression:
        case SyntaxKind.ObjectAssignmentPattern:
        case SyntaxKind.ArrayAssignmentPattern:
            return true;
        default:
            return isMemberExpressionOrHigher(node);
    }
}

export type PrefixUnaryOperator = TokenNode<PrefixUnaryOperatorKind>;

export interface PrefixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PrefixUnaryExpression;
    readonly operatorToken: PrefixUnaryOperator;
    readonly expression: UnaryExpressionOrHigher;
}

export type PostfixUnaryOperator = TokenNode<PostfixUnaryOperatorKind>;

export interface PostfixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PostfixUnaryExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly operatorToken: PostfixUnaryOperator;
}

export type UnaryExpressionOrHigher =
    | PrefixUnaryExpression
    | PostfixUnaryExpression
    | LeftHandSideExpressionOrHigher;

export function isUnaryExpressionOrHigher(node: Node): node is UnaryExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.PrefixUnaryExpression:
        case SyntaxKind.PostfixUnaryExpression:
            return true;
        default:
            return isLeftHandSideExpressionOrHigher(node);
    }
}

export type BinaryOperator = TokenNode<BinaryOperatorKind>;

export interface BinaryExpression extends Syntax {
    readonly kind: SyntaxKind.BinaryExpression;
    readonly left: BinaryExpressionOrHigher;
    readonly operatorToken: BinaryOperator;
    readonly right: BinaryExpressionOrHigher;
}

export interface ConditionalExpression extends Syntax {
    readonly kind: SyntaxKind.ConditionalExpression;
    readonly condition: BinaryExpressionOrHigher;
    readonly whenTrue: AssignmentExpressionOrHigher;
    readonly whenFalse: AssignmentExpressionOrHigher;
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
export type HierarchyAxisKeyword = TokenNode<HierarchyAxisKeywordKind>;

export function isHierarchyAxisKeyword(node: Node): node is HierarchyAxisKeyword {
    return isHierarchyAxisKeywordKind(node.kind);
}

// SequenceBinding[Await] :
//     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] 
//     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
//     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] 
//     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
export interface SequenceBinding extends Syntax {
    readonly kind: SyntaxKind.SequenceBinding;
    readonly awaitKeyword: TokenNode<SyntaxKind.AwaitKeyword> | undefined;
    readonly name: BindingIdentifier;
    readonly hierarchyAxisKeyword: HierarchyAxisKeyword | undefined;
    readonly expression: AssignmentExpressionOrHigher;
    readonly withHierarchy: AssignmentExpressionOrHigher | undefined;
}

// FromClause[Await] :
//     `from` SequenceBinding[?Await]
export interface FromClause extends Syntax {
    readonly kind: SyntaxKind.FromClause;
    readonly outerClause: QueryBodyClause | undefined;
    readonly sequenceBinding: SequenceBinding;
}

// LetClause[Await] :
//     `let` BindingIdentifier[?Await] `=` AssignmentExpression[+In, ?Await]
export interface LetClause extends Syntax {
    readonly kind: SyntaxKind.LetClause;
    readonly outerClause: QueryBodyClause;
    readonly name: Identifier;
    readonly expression: AssignmentExpressionOrHigher;
}

// WhereClause[Await] :
//     `where` AssignmentExpression[+In, ?Await]
export interface WhereClause extends Syntax {
    readonly kind: SyntaxKind.WhereClause;
    readonly outerClause: QueryBodyClause;
    readonly expression: AssignmentExpressionOrHigher;
}

// OrderbyClause[Await] :
//     `orderby` OrderbyComparatorList[?Await]
export interface OrderbyClause extends Syntax {
    readonly kind: SyntaxKind.OrderbyClause;
    readonly outerClause: QueryBodyClause;
    readonly comparators: ReadonlyArray<OrderbyComparator>;
}

// OrderbyComparatorList[Await] :
//     OrderbyComparator[?Await]
//     OrderbyComparatorList[?Await] `,` OrderbyComparator[?Await]
//
// DirectionKeyword :
//     `ascending`
//     `descending`
// 
// OrderbyComparator[Await] :
//     AssignmentExpression[+In, ?Await] DirectionKeyword?
//     AssignmentExpression[+In, ?Await] DirectionKeyword? `using` AssignmentExpression[+In, ?Await]
export interface OrderbyComparator extends Syntax {
    readonly kind: SyntaxKind.OrderbyComparator;
    readonly expression: AssignmentExpressionOrHigher;
    readonly directionToken: TokenNode<SyntaxKind.AscendingKeyword | SyntaxKind.DescendingKeyword> | undefined;
    readonly usingExpression: AssignmentExpressionOrHigher | undefined;
}

// GroupClause[Await] :
//     `group` AssignmentExpression[+In, ?Await] `by` AssignmentExpression[+In, ?Await]
export interface GroupClause extends Syntax {
    readonly kind: SyntaxKind.GroupClause;
    readonly outerClause: QueryBodyClause;
    readonly elementSelector: AssignmentExpressionOrHigher;
    readonly keySelector: AssignmentExpressionOrHigher;
    readonly into: BindingIdentifier | undefined;
}

// JoinClause[Await] :
//     `join` SequenceBinding[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await]
//     `join` SequenceBinding[?Await] `on` AssignmentExpression[+In, ?Await] `equals` AssignmentExpression[+In, ?Await] `into` BindingIdentifier[?Await]
export interface JoinClause extends Syntax {
    readonly kind: SyntaxKind.JoinClause;
    readonly outerClause: QueryBodyClause;
    readonly sequenceBinding: SequenceBinding;
    readonly outerKeySelector: AssignmentExpressionOrHigher;
    readonly keySelector: AssignmentExpressionOrHigher;
    readonly into: BindingIdentifier | undefined;
}

// SelectClause[Await] :
//     `select` AssignmentExpression[+In, ?Await]
export interface SelectClause extends Syntax {
    readonly kind: SyntaxKind.SelectClause;
    readonly outerClause: QueryBodyClause;
    readonly expression: AssignmentExpressionOrHigher;
    readonly into: BindingIdentifier | undefined;
}

// QueryBodyClauses[Await] :
//     QueryBodyClause[?Await]
//     QueryBodyClauses[?Await] QueryBodyClause[?Await]
// 
// QueryBodyClause[Await] :
//     FromClause[Await]
//     LetClause[Await]
//     WhereClause[Await]
//     JoinClause[Await]
//     OrderbyClause[Await]
export type QueryBodyClause =
    | FromClause
    | LetClause
    | WhereClause
    | OrderbyClause
    | GroupClause
    | JoinClause
    | SelectClause;

// SelectOrGroupClause[Await] :
//     SelectClause[?Await]
//     GroupClause[?Await]
export type SelectOrGroupClause = 
    | GroupClause
    | SelectClause;

export function isQueryBodyClause(node: Node): node is QueryBodyClause {
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

// QueryExpression[Await] :
//     FromClause[?Await] QueryBody[Await]
//
// QueryBody[Await] :
//     QueryBodyClauses[?Await]? SelectOrGroupClause[?Await] QueryContinuation[?Await]?
//
// QueryContinuation[Await] :
//     `into` BindingIdentifier[+In, ?Await] QueryBody[?Await]
export interface QueryExpression extends Syntax {
    readonly kind: SyntaxKind.QueryExpression;
    readonly query: SelectOrGroupClause;
}

export type Parameter = BindingElement;

export interface ArrowFunction extends Syntax {
    readonly kind: SyntaxKind.ArrowFunction;
    readonly asyncKeyword: TokenNode<SyntaxKind.AsyncKeyword> | undefined;
    readonly parameterList: ReadonlyArray<BindingElement>;
    readonly rest: BindingRestElement | undefined;
    readonly body: AssignmentExpressionOrHigher;
}

export type BinaryExpressionOrHigher =
    | UnaryExpressionOrHigher
    | BinaryExpression;

export function isBinaryExpressionOrHigher(node: Node): node is BinaryExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.BinaryExpression:
            return true;
        default:
            return isUnaryExpressionOrHigher(node);
    }
}

export type AssignmentOperator = TokenNode<AssignmentOperatorKind>;

export interface AssignmentExpression extends Syntax {
    readonly kind: SyntaxKind.AssignmentExpression;
    readonly left: LeftHandSideExpressionOrHigher;
    readonly operatorToken: AssignmentOperator;
    readonly right: AssignmentExpressionOrHigher;
}

export type AssignmentExpressionOrHigher =
    | BinaryExpressionOrHigher
    | ConditionalExpression
    | QueryExpression
    | ArrowFunction
    | AssignmentExpression;

export type DestructuringAssignmentTarget = AssignmentExpressionOrHigher;

export function isAssignmentExpressionOrHigher(node: Node): node is AssignmentExpressionOrHigher {
    switch (node.kind) {
        case SyntaxKind.AssignmentExpression:
        case SyntaxKind.QueryExpression:
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.ConditionalExpression:
            return true;
        default:
            return isBinaryExpressionOrHigher(node);
    }
}

export interface CommaListExpression extends Syntax {
    readonly kind: SyntaxKind.CommaListExpression;
    readonly expressions: ReadonlyArray<AssignmentExpressionOrHigher>;
}

export type Expression =
    | AssignmentExpressionOrHigher
    | CommaListExpression;

export function isExpression(node: Node): node is Expression {
    switch (node.kind) {
        case SyntaxKind.CommaListExpression:
            return true;
        default:
            return isAssignmentExpressionOrHigher(node);
    }
}

export interface CoverParenthesizedExpressionAndArrowParameterList extends Syntax {
    readonly kind: SyntaxKind.CoverParenthesizedExpressionAndArrowParameterList;
    readonly expression: Expression | undefined;
    readonly commaToken: TokenNode<SyntaxKind.CommaToken> | undefined;
    readonly dotDotDotToken: TokenNode<SyntaxKind.DotDotDotToken> | undefined;
    readonly name: BindingName | undefined;
    readonly closeParenToken: TokenNode<SyntaxKind.CloseParenToken>;
}

export type Node =
    // Literals
    | StringLiteral
    | NumberLiteral
    | RegularExpressionLiteral

    // Keywords
    // Punctuation
    // Selectors
    | Token

    // Names
    | Identifier
    | ComputedPropertyName

    // Clauses
    | FromClause
    | LetClause
    | WhereClause
    | OrderbyClause
    | OrderbyComparator
    | GroupClause
    | JoinClause
    | SelectClause
    | SequenceBinding

    // Expressions
    | ArrowFunction
    | PrefixUnaryExpression
    | PostfixUnaryExpression
    | ParenthesizedExpression
    | CallExpression
    | NewExpression
    | PropertyAccessExpression
    | ElementAccessExpression
    | ObjectLiteral
    | ArrayLiteral
    | Elision
    | SpreadElement
    | BinaryExpression
    | ConditionalExpression
    | QueryExpression
    | AssignmentExpression
    | CommaListExpression

    // Declarations
    | BindingElement
    | BindingRestElement
    | PropertyDefinition
    | ShorthandPropertyDefinition

    // Patterns
    | ObjectBindingPattern
    | BindingRestProperty
    | BindingProperty
    | ShorthandBindingProperty
    | ObjectAssignmentPattern
    | AssignmentRestProperty
    | AssignmentProperty
    | ShorthandAssignmentProperty
    | ArrayBindingPattern
    | ArrayAssignmentPattern
    | AssignmentElement
    | AssignmentRestElement

    // Cover Grammars
    | CoverParenthesizedExpressionAndArrowParameterList
    | CoverInitializedName
    ;
import { BinaryPrecedence, getBinaryOperatorPrecedence, visitList, assertFail } from "./utils";

export enum SyntaxKind {
    Unknown,
    EndOfFileToken,

    Identifier,

    // Literals
    StringLiteral,
    NumberLiteral,
    RegularExpressionLiteral,
    NullLiteral,
    BooleanLiteral,

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
    IdentifierName,
    IdentifierReference,
    BindingIdentifier,
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
    ThisExpression,
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

export type ECMAScriptReservedWord =
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

export function isECMAScriptReservedWord(kind: SyntaxKind): kind is ECMAScriptReservedWord {
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

export type ECMAScriptContextualKeyword =
    | SyntaxKind.AsyncKeyword
    | SyntaxKind.FromKeyword
    | SyntaxKind.OfKeyword;

export function isECMAScriptContextualKeyword(kind: SyntaxKind): kind is ECMAScriptContextualKeyword {
    switch (kind) {
        case SyntaxKind.AsyncKeyword:
        case SyntaxKind.FromKeyword:
        case SyntaxKind.OfKeyword:
            return true;
        default:
            return false;
    }
}

export type QueryKeyword =
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

export function isQueryKeyword(kind: SyntaxKind): kind is QueryKeyword {
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

export type Keyword =
    | ECMAScriptReservedWord
    | ECMAScriptContextualKeyword
    | QueryKeyword
    | HierarchyAxisKeywordKind;

export function isKeyword(kind: SyntaxKind): kind is Keyword {
    return isECMAScriptReservedWord(kind)
        || isECMAScriptContextualKeyword(kind)
        || isQueryKeyword(kind)
        || isHierarchyAxisKeywordKind(kind);
}

export type AssignmentOperator =
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

export function isAssignmentOperator(kind: SyntaxKind): kind is AssignmentOperator {
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

export type BinaryOperator =
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

export function isBinaryOperator(kind: SyntaxKind): kind is BinaryOperator {
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

export type PrefixUnaryOperator =
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

export function isPrefixUnaryOperator(kind: SyntaxKind): kind is PrefixUnaryOperator {
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

export type PostfixUnaryOperator =
    | SyntaxKind.PlusPlusToken
    | SyntaxKind.MinusMinusToken;

export function isPostfixUnaryOperator(kind: SyntaxKind): kind is PostfixUnaryOperator {
    switch (kind) {
        case SyntaxKind.PlusPlusToken:
        case SyntaxKind.MinusMinusToken:
            return true;
        default:
            return false;
    }
}

export type Punctuation =
    | SyntaxKind.OpenBraceToken
    | SyntaxKind.CloseBraceToken
    | SyntaxKind.OpenParenToken
    | SyntaxKind.CloseParenToken
    | SyntaxKind.OpenBracketToken
    | SyntaxKind.CloseBracketToken
    | SyntaxKind.DotToken
    | SyntaxKind.DotDotDotToken
    | SyntaxKind.CommaToken
    | SyntaxKind.LessThanToken
    | SyntaxKind.LessThanEqualsToken
    | SyntaxKind.LessThanLessThanToken
    | SyntaxKind.LessThanLessThanEqualsToken
    | SyntaxKind.GreaterThanToken
    | SyntaxKind.GreaterThanEqualsToken
    | SyntaxKind.GreaterThanGreaterThanToken
    | SyntaxKind.GreaterThanGreaterThanEqualsToken
    | SyntaxKind.GreaterThanGreaterThanGreaterThanToken
    | SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken
    | SyntaxKind.EqualsToken
    | SyntaxKind.EqualsEqualsToken
    | SyntaxKind.EqualsEqualsEqualsToken
    | SyntaxKind.EqualsGreaterThanToken
    | SyntaxKind.ExclamationToken
    | SyntaxKind.ExclamationEqualsToken
    | SyntaxKind.ExclamationEqualsEqualsToken
    | SyntaxKind.PlusToken
    | SyntaxKind.PlusEqualsToken
    | SyntaxKind.PlusPlusToken
    | SyntaxKind.MinusToken
    | SyntaxKind.MinusEqualsToken
    | SyntaxKind.MinusMinusToken
    | SyntaxKind.AsteriskToken
    | SyntaxKind.AsteriskEqualsToken
    | SyntaxKind.AsteriskAsteriskToken
    | SyntaxKind.AsteriskAsteriskEqualsToken
    | SyntaxKind.SlashToken
    | SyntaxKind.SlashEqualsToken
    | SyntaxKind.PercentToken
    | SyntaxKind.PercentEqualsToken
    | SyntaxKind.AmpersandToken
    | SyntaxKind.AmpersandEqualsToken
    | SyntaxKind.AmpersandAmpersandToken
    | SyntaxKind.BarToken
    | SyntaxKind.BarEqualsToken
    | SyntaxKind.BarBarToken
    | SyntaxKind.CaretToken
    | SyntaxKind.CaretEqualsToken
    | SyntaxKind.TildeToken
    | SyntaxKind.QuestionToken
    | SyntaxKind.ColonToken;

export function isPunctuation(kind: SyntaxKind): kind is Punctuation {
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
            return isBinaryOperator(kind)
                || isPrefixUnaryOperator(kind)
                || isPostfixUnaryOperator(kind);
    }
}

export type Token = Keyword | Punctuation;

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

const noTextRange: TextRange = { pos: 0, end: 0 };

export function createTextRange(pos: number, end: number): TextRange {
    return pos === 0 && end === 0 ? noTextRange : { pos, end };
}

export namespace Syntax {
    export const location = Symbol("Syntax.location");
    export function This(): ThisExpression {
        return { kind: SyntaxKind.ThisExpression, [Syntax.location]: noTextRange };
    }
    export function Null(): NullLiteral {
        return { kind: SyntaxKind.NullLiteral, [Syntax.location]: noTextRange };
    }
    export function Boolean(value: boolean): BooleanLiteral {
        return { kind: SyntaxKind.BooleanLiteral, value, [Syntax.location]: noTextRange };
    }
    export function Literal<Kind extends TextLiteralKind>(kind: Kind, text: string, flags: TokenFlags): TextLiteralNode<Kind> {
        return { kind, text, flags, [Syntax.location]: noTextRange };
    }
    export function IdentifierName(text: string): IdentifierName;
    export function IdentifierName(text: BindingIdentifier): IdentifierName;
    export function IdentifierName(text: BindingIdentifier | string): IdentifierName {
        return { kind: SyntaxKind.IdentifierName, text: typeof text === "string" ? text : text.text, [Syntax.location]: typeof text === "string" ? noTextRange : text[Syntax.location] };
    }
    export function IdentifierReference(text: string): IdentifierReference;
    export function IdentifierReference(text: BindingIdentifier): IdentifierReference;
    export function IdentifierReference(text: BindingIdentifier | string): IdentifierReference {
        return { kind: SyntaxKind.IdentifierReference, text: typeof text === "string" ? text : text.text, [Syntax.location]: typeof text === "string" ? noTextRange : text[Syntax.location] };
    }
    export function BindingIdentifier(text: string): BindingIdentifier {
        return { kind: SyntaxKind.BindingIdentifier, text, [Syntax.location]: noTextRange };
    }
    export function ComputedPropertyName(expression: Expression): ComputedPropertyName {
        return { kind: SyntaxKind.ComputedPropertyName, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function Paren(expression: Expression): ParenthesizedExpression {
        return { kind: SyntaxKind.ParenthesizedExpression, expression, [Syntax.location]: noTextRange };
    }
    export function PropertyDefinition(name: PropertyName | string, initializer: Expression): PropertyDefinition {
        name = possiblyIdentifierName(name);
        return { kind: SyntaxKind.PropertyDefinition, name, initializer: toAssignmentExpressionOrHigher(initializer), [Syntax.location]: noTextRange };
    }
    export function ShorthandPropertyDefinition(name: IdentifierReference | string): ShorthandPropertyDefinition {
        name = possiblyIdentifierReference(name);
        return { kind: SyntaxKind.ShorthandPropertyDefinition, name, [Syntax.location]: noTextRange };
    }
    export function ObjectLiteral(properties: ReadonlyArray<ObjectLiteralElement>): ObjectLiteral {
        return { kind: SyntaxKind.ObjectLiteral, properties, [Syntax.location]: noTextRange };
    }
    export function AssignmentRestProperty(expression: Expression): AssignmentRestProperty {
        return { kind: SyntaxKind.AssignmentRestProperty, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function AssignmentProperty(propertyName: PropertyName | string, assignmentElement: AssignmentElement): AssignmentProperty {
        propertyName = possiblyIdentifierName(propertyName);
        return { kind: SyntaxKind.AssignmentProperty, propertyName, assignmentElement, [Syntax.location]: noTextRange };
    }
    export function ShorthandAssignmentProperty(name: IdentifierReference | string, initializer: Expression | undefined): ShorthandAssignmentProperty {
        name = possiblyIdentifierReference(name);
        return { kind: SyntaxKind.ShorthandAssignmentProperty, name, initializer: initializer && toAssignmentExpressionOrHigher(initializer), [Syntax.location]: noTextRange };
    }
    export function ObjectAssignmentPattern(properties: ReadonlyArray<ObjectAssignmentPatternElement>, rest: AssignmentRestProperty | undefined): ObjectAssignmentPattern {
        return { kind: SyntaxKind.ObjectAssignmentPattern, properties, rest, [Syntax.location]: noTextRange };
    }
    export function BindingRestProperty(name: BindingIdentifier | string): BindingRestProperty {
        name = possiblyBindingIdentifier(name);
        return { kind: SyntaxKind.BindingRestProperty, name, [Syntax.location]: noTextRange };
    }
    export function BindingProperty(propertyName: PropertyName | string, bindingElement: BindingElement): BindingProperty {
        propertyName = possiblyIdentifierName(propertyName);
        return { kind: SyntaxKind.BindingProperty, propertyName, bindingElement, [Syntax.location]: noTextRange };
    }
    export function ShorthandBindingProperty(name: BindingIdentifier | string, initializer: Expression | undefined): ShorthandBindingProperty {
        name = possiblyBindingIdentifier(name);
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.ShorthandBindingProperty, name, initializer, [Syntax.location]: noTextRange };
    }
    export function ObjectBindingPattern(properties: ReadonlyArray<ObjectBindingPatternElement>, rest: BindingRestProperty | undefined): ObjectBindingPattern {
        return { kind: SyntaxKind.ObjectBindingPattern, properties, rest, [Syntax.location]: noTextRange };
    }
    export function Elision(): Elision {
        return { kind: SyntaxKind.Elision, [Syntax.location]: noTextRange };
    }
    export function SpreadElement(expression: Expression): SpreadElement {
        return { kind: SyntaxKind.SpreadElement, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function ArrayLiteral(elements: ReadonlyArray<ArrayLiteralElement | Expression>): ArrayLiteral {
        return { kind: SyntaxKind.ArrayLiteral, elements: visitList(elements, toArrayLiteralElement), [Syntax.location]: noTextRange };
    }
    export function AssignmentRestElement(target: DestructuringAssignmentTarget): AssignmentRestElement {
        return { kind: SyntaxKind.AssignmentRestElement, target, [Syntax.location]: noTextRange };
    }
    export function AssignmentElement(target: DestructuringAssignmentTarget, initializer: Expression | undefined): AssignmentElement {
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.AssignmentElement, target, initializer, [Syntax.location]: noTextRange };
    }
    export function ArrayAssignmentPattern(elements: ReadonlyArray<ArrayAssignmentPatternElement>, rest: AssignmentRestElement | undefined): ArrayAssignmentPattern {
        return { kind: SyntaxKind.ArrayAssignmentPattern, elements, rest, [Syntax.location]: noTextRange };
    }
    export function BindingElement(name: BindingName | string, initializer?: Expression): BindingElement {
        name = possiblyBindingIdentifier(name);
        initializer = initializer && toAssignmentExpressionOrHigher(initializer);
        return { kind: SyntaxKind.BindingElement, name, initializer, [Syntax.location]: noTextRange };
    }
    export function BindingRestElement(name: BindingName | string): BindingRestElement {
        name = possiblyBindingIdentifier(name);
        return { kind: SyntaxKind.BindingRestElement, name, [Syntax.location]: noTextRange };
    }
    export function ArrayBindingPattern(elements: ReadonlyArray<ArrayBindingPatternElement>, rest: BindingRestElement | undefined): ArrayBindingPattern {
        return { kind: SyntaxKind.ArrayBindingPattern, elements, rest, [Syntax.location]: noTextRange };
    }
    export function New(expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression> | undefined): NewExpression {
        expression = toMemberExpressionOrHigher(possiblyIdentifierReference(expression));
        return { kind: SyntaxKind.NewExpression, expression, argumentList: argumentList && visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
    }
    export function Call(expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression>): CallExpression {
        expression = toLeftHandSideExpressionOrHigher(possiblyIdentifierReference(expression));
        return { kind: SyntaxKind.CallExpression, expression, argumentList: visitList(argumentList, toArgument), [Syntax.location]: noTextRange };
    }
    export function Property(expression: Expression, name: IdentifierName | string): PropertyAccessExpression {
        return { kind: SyntaxKind.PropertyAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), name: possiblyIdentifierName(name), [Syntax.location]: noTextRange };
    }
    export function Index(expression: Expression, argumentExpression: Expression): ElementAccessExpression {
        return { kind: SyntaxKind.ElementAccessExpression, expression: toLeftHandSideExpressionOrHigher(expression), argumentExpression, [Syntax.location]: noTextRange };
    }
    export function PrefixUnary(operator: PrefixUnaryOperator, expression: Expression): PrefixUnaryExpression {
        return { kind: SyntaxKind.PrefixUnaryExpression, operator, expression: toUnaryExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function PostfixUnary(expression: Expression, operator: PostfixUnaryOperator): PostfixUnaryExpression {
        return { kind: SyntaxKind.PostfixUnaryExpression, expression: toLeftHandSideExpressionOrHigher(expression), operator, [Syntax.location]: noTextRange };
    }
    export function Binary(left: Expression, operator: BinaryOperator, right: Expression): BinaryExpression {
        const precedence = getBinaryOperatorPrecedence(operator);
        return { kind: SyntaxKind.BinaryExpression, left: toBinaryExpressionOrHigher(left, precedence), operator, right: toBinaryExpressionOrHigher(right, precedence + 1), [Syntax.location]: noTextRange };
    }
    export function Assign(left: LeftHandSideExpressionOrHigher, operator: AssignmentOperator, right: Expression): AssignmentExpression {
        return { kind: SyntaxKind.AssignmentExpression, left, operator, right: toAssignmentExpressionOrHigher(right), [Syntax.location]: noTextRange };
    }
    export function Conditional(condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression {
        return { kind: SyntaxKind.ConditionalExpression, condition: toBinaryExpressionOrHigher(condition, BinaryPrecedence.LogicalORExpression), whenTrue: toAssignmentExpressionOrHigher(whenTrue), whenFalse: toAssignmentExpressionOrHigher(whenFalse), [Syntax.location]: noTextRange };
    }
    export function Arrow(async: boolean, parameterList: ReadonlyArray<BindingElement | BindingIdentifier | string>, rest: BindingRestElement | undefined, body: Expression): ArrowFunction {
        return { kind: SyntaxKind.ArrowFunction, async, parameterList: visitList(parameterList, toParameter), rest, body: toArrowBody(body), [Syntax.location]: noTextRange };
    }
    export function CommaList(expressions: ReadonlyArray<Expression>): CommaListExpression {
        return { kind: SyntaxKind.CommaListExpression, expressions: visitList(expressions, toAssignmentExpressionOrHigher), [Syntax.location]: noTextRange };
    }
    export function Var(name: BindingName | string, initializer?: Expression): BindingElement {
        return Syntax.BindingElement(name, initializer);
    }
    export function Param(name: BindingName | string, initializer?: Expression): BindingElement {
        return Syntax.BindingElement(name, initializer);
    }
    export function Rest(name: BindingName | string): BindingRestElement {
        return Syntax.BindingRestElement(name);
    }
    export function SequenceBinding(await: boolean, name: BindingIdentifier | string, hierarchyAxisKeyword: HierarchyAxisKeywordKind | undefined, expression: Expression, withHierarchy: Expression | undefined): SequenceBinding {
        name = possiblyBindingIdentifier(name);
        return { kind: SyntaxKind.SequenceBinding, await, name, hierarchyAxisKeyword, expression: toAssignmentExpressionOrHigher(expression), withHierarchy: withHierarchy && toAssignmentExpressionOrHigher(withHierarchy), [Syntax.location]: noTextRange };
    }
    export function FromClause(outerClause: QueryBodyClause | undefined, sequenceBinding: SequenceBinding): FromClause {
        return { kind: SyntaxKind.FromClause, outerClause, sequenceBinding, [Syntax.location]: noTextRange };
    }
    export function LetClause(outerClause: QueryBodyClause, name: BindingIdentifier, expression: Expression): LetClause {
        return { kind: SyntaxKind.LetClause, outerClause, name, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function WhereClause(outerClause: QueryBodyClause, expression: Expression): WhereClause {
        return { kind: SyntaxKind.WhereClause, outerClause, expression: toAssignmentExpressionOrHigher(expression), [Syntax.location]: noTextRange };
    }
    export function OrderbyClause(outerClause: QueryBodyClause, comparators: ReadonlyArray<OrderbyComparator>): OrderbyClause {
        return { kind: SyntaxKind.OrderbyClause, outerClause, comparators, [Syntax.location]: noTextRange };
    }
    export function OrderbyComparator(expression: Expression, direction: DirectionKeywordKind | undefined, usingExpression: Expression | undefined): OrderbyComparator {
        return { kind: SyntaxKind.OrderbyComparator, expression: toAssignmentExpressionOrHigher(expression), direction, usingExpression: usingExpression && toAssignmentExpressionOrHigher(usingExpression), [Syntax.location]: noTextRange };
    }
    export function GroupClause(outerClause: QueryBodyClause, elementSelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): GroupClause {
        return { kind: SyntaxKind.GroupClause, outerClause, elementSelector: toAssignmentExpressionOrHigher(elementSelector), keySelector: toAssignmentExpressionOrHigher(keySelector), into, [Syntax.location]: noTextRange };
    }
    export function JoinClause(outerClause: QueryBodyClause, sequenceBinding: SequenceBinding, outerKeySelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): JoinClause {
        return { kind: SyntaxKind.JoinClause, outerClause, sequenceBinding, outerKeySelector: toAssignmentExpressionOrHigher(outerKeySelector), keySelector: toAssignmentExpressionOrHigher(keySelector), into, [Syntax.location]: noTextRange };
    }
    export function SelectClause(outerClause: QueryBodyClause, expression: Expression, into: BindingIdentifier | undefined): SelectClause {
        return { kind: SyntaxKind.SelectClause, outerClause, expression: toAssignmentExpressionOrHigher(expression), into, [Syntax.location]: noTextRange };
    }
    export function Query(query: SelectOrGroupClause): QueryExpression {
        if (query.kind !== SyntaxKind.SelectClause &&
            query.kind !== SyntaxKind.GroupClause ||
            query.into) return assertFail("A query must end with either a 'select' or 'group' clause.");
        return { kind: SyntaxKind.QueryExpression, query, [Syntax.location]: noTextRange };
    }

    function leftMost(node: Expression | AssignmentPattern): Expression | AssignmentPattern {
        switch (node.kind) {
            case SyntaxKind.PropertyAccessExpression:
            case SyntaxKind.ElementAccessExpression:
            case SyntaxKind.CallExpression:
                return leftMost(node.expression);
            case SyntaxKind.BinaryExpression:
                return leftMost(node.left);
            case SyntaxKind.PostfixUnaryExpression:
                return leftMost(node.expression);
            case SyntaxKind.ConditionalExpression:
                return leftMost(node.condition);
            default:
                return node;
        }
    }

    function toParameter(parameter: BindingElement | BindingIdentifier | string) {
        if (typeof parameter === "string") parameter = Syntax.BindingIdentifier(parameter);
        if (parameter.kind === SyntaxKind.BindingIdentifier) parameter = Syntax.Param(parameter);
        return parameter;
    }

    function toArrowBody(body: Expression) {
        return leftMost(body).kind === SyntaxKind.ObjectLiteral ? Syntax.Paren(body) :
            toAssignmentExpressionOrHigher(body);
    }

    function possiblyIdentifierName<T extends Node>(name: T | string): T | IdentifierName {
        return typeof name === "string" ? Syntax.IdentifierName(name) : name;
    }

    function possiblyIdentifierReference<T extends Node>(name: T | string): T | IdentifierReference {
        return typeof name === "string" ? Syntax.IdentifierReference(name) : name;
    }

    function possiblyBindingIdentifier<T extends Node>(name: T | string): T | BindingIdentifier {
        return typeof name === "string" ? Syntax.BindingIdentifier(name) : name;
    }

    function toBinaryExpressionOrHigher(node: Expression, precedence: BinaryPrecedence): BinaryExpressionOrHigher {
        switch (node.kind) {
            case SyntaxKind.BinaryExpression:
                return getBinaryOperatorPrecedence(node.kind) >= precedence ? node : Syntax.Paren(node);
            default:
                return toUnaryExpressionOrHigher(node);
        }
    }

    function toUnaryExpressionOrHigher(node: Expression) {
        return isUnaryExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toMemberExpressionOrHigher(node: Expression) {
        return isMemberExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toLeftHandSideExpressionOrHigher(node: Expression) {
        return isLeftHandSideExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toAssignmentExpressionOrHigher(node: Expression) {
        return isAssignmentExpressionOrHigher(node) ? node : Syntax.Paren(node);
    }

    function toArrayLiteralElement(node: Expression | Elision | SpreadElement): ArrayLiteralElement {
        switch (node.kind) {
            case SyntaxKind.Elision: return node;
            case SyntaxKind.SpreadElement: return node;
            default: return toAssignmentExpressionOrHigher(node);
        }
    }

    function toArgument(node: Expression | SpreadElement): Argument {
        switch (node.kind) {
            case SyntaxKind.SpreadElement: return node;
            default: return toAssignmentExpressionOrHigher(node);
        }
    }

    export function pos(node: Syntax) {
        return node[Syntax.location].pos;
    }

    export function end(node: Syntax) {
        return node[Syntax.location].end;
    }
}

export namespace SyntaxUpdate {
    export function ComputedPropertyName(node: ComputedPropertyName, expression: Expression): ComputedPropertyName {
        return node.expression !== expression ? assignLocation(Syntax.ComputedPropertyName(expression), node) : node;
    }
    export function Paren(node: ParenthesizedExpression, expression: Expression): ParenthesizedExpression {
        return node.expression !== expression ? assignLocation(Syntax.Paren(expression), node) : node;
    }
    export function PropertyDefinition(node: PropertyDefinition, name: PropertyName | string, initializer: Expression): PropertyDefinition {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.PropertyDefinition(name, initializer), node) : node;
    }
    export function ShorthandPropertyDefinition(node: ShorthandPropertyDefinition, name: IdentifierReference | string): ShorthandPropertyDefinition {
        return node.name !== name ? assignLocation(Syntax.ShorthandPropertyDefinition(name), node) : node;
    }
    export function ObjectLiteral(node: ObjectLiteral, properties: ReadonlyArray<ObjectLiteralElement>): ObjectLiteral {
        return node.properties !== properties ? assignLocation(Syntax.ObjectLiteral(properties), node) : node;
    }
    export function AssignmentRestProperty(node: AssignmentRestProperty, expression: Expression): AssignmentRestProperty {
        return node.expression !== expression ? assignLocation(Syntax.AssignmentRestProperty(expression), node) : node;
    }
    export function AssignmentProperty(node: AssignmentProperty, propertyName: PropertyName | string, assignmentElement: AssignmentElement): AssignmentProperty {
        return node.propertyName !== propertyName || node.assignmentElement !== assignmentElement ? assignLocation(Syntax.AssignmentProperty(propertyName, assignmentElement), node) : node;
    }
    export function ShorthandAssignmentProperty(node: ShorthandAssignmentProperty, name: IdentifierReference | string, initializer: Expression | undefined): ShorthandAssignmentProperty {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.ShorthandAssignmentProperty(name, initializer), node) : node;
    }
    export function ObjectAssignmentPattern(node: ObjectAssignmentPattern, properties: ReadonlyArray<ObjectAssignmentPatternElement>, rest: AssignmentRestProperty | undefined): ObjectAssignmentPattern {
        return node.properties !== properties || node.rest !== rest ? assignLocation(Syntax.ObjectAssignmentPattern(properties, rest), node) : node;
    }
    export function BindingRestProperty(node: BindingRestProperty, name: BindingIdentifier | string): BindingRestProperty {
        return node.name !== name ? assignLocation(Syntax.BindingRestProperty(name), node) : node;
    }
    export function BindingProperty(node: BindingProperty, propertyName: PropertyName | string, bindingElement: BindingElement): BindingProperty {
        return node.propertyName !== propertyName || node.bindingElement !== bindingElement ? assignLocation(Syntax.BindingProperty(propertyName, bindingElement), node) : node;
    }
    export function ShorthandBindingProperty(node: ShorthandBindingProperty, name: BindingIdentifier | string, initializer: Expression | undefined): ShorthandBindingProperty {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.ShorthandBindingProperty(name, initializer), node) : node;
    }
    export function ObjectBindingPattern(node: ObjectBindingPattern, properties: ReadonlyArray<ObjectBindingPatternElement>, rest: BindingRestProperty | undefined): ObjectBindingPattern {
        return node.properties !== properties || node.rest !== rest ? assignLocation(Syntax.ObjectBindingPattern(properties, rest), node) : node;
    }
    export function SpreadElement(node: SpreadElement, expression: Expression): SpreadElement {
        return node.expression !== expression ? assignLocation(Syntax.SpreadElement(expression), node) : node;
    }
    export function ArrayLiteral(node: ArrayLiteral, elements: ReadonlyArray<ArrayLiteralElement | Expression>): ArrayLiteral {
        return node.elements !== elements ? assignLocation(Syntax.ArrayLiteral(elements), node) : node;
    }
    export function AssignmentRestElement(node: AssignmentRestElement, target: DestructuringAssignmentTarget): AssignmentRestElement {
        return node.target !== target ? assignLocation(Syntax.AssignmentRestElement(target), node) : node;
    }
    export function AssignmentElement(node: AssignmentElement, target: DestructuringAssignmentTarget, initializer: Expression | undefined): AssignmentElement {
        return node.target !== target || node.initializer !== initializer ? assignLocation(Syntax.AssignmentElement(target, initializer), node) : node;
    }
    export function ArrayAssignmentPattern(node: ArrayAssignmentPattern, elements: ReadonlyArray<ArrayAssignmentPatternElement>, rest: AssignmentRestElement | undefined): ArrayAssignmentPattern {
        return node.elements !== elements || node.rest !== rest ? assignLocation(Syntax.ArrayAssignmentPattern(elements, rest), node) : node;
    }
    export function BindingElement(node: BindingElement, name: BindingName | string, initializer?: Expression): BindingElement {
        return node.name !== name || node.initializer !== initializer ? assignLocation(Syntax.BindingElement(name, initializer), node) : node;
    }
    export function BindingRestElement(node: BindingRestElement, name: BindingName | string): BindingRestElement {
        return node.name !== name ? assignLocation(Syntax.BindingRestElement(name), node) : node;
    }
    export function ArrayBindingPattern(node: ArrayBindingPattern, elements: ReadonlyArray<ArrayBindingPatternElement>, rest: BindingRestElement | undefined): ArrayBindingPattern {
        return node.elements !== elements || node.rest !== rest ? assignLocation(Syntax.ArrayBindingPattern(elements, rest), node) : node;
    }
    export function New(node: NewExpression, expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression> | undefined): NewExpression {
        return node.expression !== expression || node.argumentList !== argumentList ? assignLocation(Syntax.New(expression, argumentList), node) : node;
    }
    export function Call(node: CallExpression, expression: Expression | string, argumentList: ReadonlyArray<Argument | Expression>): CallExpression {
        return node.expression !== expression || node.argumentList !== argumentList ? assignLocation(Syntax.Call(expression, argumentList), node) : node;
    }
    export function Property(node: PropertyAccessExpression, expression: Expression): PropertyAccessExpression {
        return node.expression !== expression ? assignLocation(Syntax.Property(expression, node.name), node) : node;
    }
    export function Index(node: ElementAccessExpression, expression: Expression, argumentExpression: Expression): ElementAccessExpression {
        return node.expression !== expression || node.argumentExpression !== argumentExpression ? assignLocation(Syntax.Index(expression, argumentExpression), node) : node;
    }
    export function PrefixUnary(node: PrefixUnaryExpression, expression: Expression): PrefixUnaryExpression {
        return node.expression !== expression ? assignLocation(Syntax.PrefixUnary(node.operator, expression), node) : node;
    }
    export function PostfixUnary(node: PostfixUnaryExpression, expression: Expression): PostfixUnaryExpression {
        return node.expression !== expression ? assignLocation(Syntax.PostfixUnary(expression, node.operator), node) : node;
    }
    export function Binary(node: BinaryExpression, left: Expression, right: Expression): BinaryExpression {
        return node.left !== left || node.right !== right ? assignLocation(Syntax.Binary(left, node.operator, right), node) : node;
    }
    export function Assign(node: AssignmentExpression, left: LeftHandSideExpressionOrHigher, right: Expression): AssignmentExpression {
        return node.left !== left || node.right !== right ? assignLocation(Syntax.Assign(left, node.operator, right), node) : node;
    }
    export function Conditional(node: ConditionalExpression, condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression {
        return node.condition !== condition || node.whenTrue !== whenTrue || node.whenFalse !== whenFalse ? assignLocation(Syntax.Conditional(condition, whenTrue, whenFalse), node) : node;
    }
    export function Arrow(node: ArrowFunction, parameterList: ReadonlyArray<Parameter | BindingIdentifier | string>, rest: BindingRestElement | undefined, body: Expression): ArrowFunction {
        return node.parameterList !== parameterList || node.rest !== rest || node.body !== body ? assignLocation(Syntax.Arrow(node.async, parameterList, rest, body), node) : node;
    }
    export function Comma(node: CommaListExpression, expressions: ReadonlyArray<Expression>): CommaListExpression {
        return node.expressions !== expressions ? assignLocation(Syntax.CommaList(expressions), node) : node;
    }
    export function SequenceBinding(node: SequenceBinding, name: BindingIdentifier | string, expression: Expression, withHierarchy: Expression | undefined): SequenceBinding {
        return node.name !== name || node.expression !== expression || node.withHierarchy !== withHierarchy ? assignLocation(Syntax.SequenceBinding(node.await, name, node.hierarchyAxisKeyword, expression, withHierarchy), node) : node;
    }
    export function FromClause(node: FromClause, outerClause: QueryBodyClause | undefined, sequenceBinding: SequenceBinding): FromClause {
        return node.outerClause !== outerClause || node.sequenceBinding !== sequenceBinding ? assignLocation(Syntax.FromClause(outerClause, sequenceBinding), node) : node;
    }
    export function LetClause(node: LetClause, outerClause: QueryBodyClause, name: BindingIdentifier, expression: Expression): LetClause {
        return node.outerClause !== outerClause || node.name !== name || node.expression !== expression ? assignLocation(Syntax.LetClause(outerClause, name, expression), node) : node;
    }
    export function WhereClause(node: WhereClause, outerClause: QueryBodyClause, expression: Expression): WhereClause {
        return node.outerClause !== outerClause || node.expression !== expression ? assignLocation(Syntax.WhereClause(outerClause, expression), node) : node;
    }
    export function OrderbyClause(node: OrderbyClause, outerClause: QueryBodyClause, comparators: OrderbyClause["comparators"]): OrderbyClause {
        return node.outerClause !== outerClause || node.comparators !== comparators ? assignLocation(Syntax.OrderbyClause(outerClause, comparators), node) : node;
    }
    export function OrderbyComparator(node: OrderbyComparator, expression: Expression, usingExpression: Expression | undefined): OrderbyComparator {
        return node.expression !== expression || node.usingExpression !== usingExpression ? assignLocation(Syntax.OrderbyComparator(expression, node.direction, usingExpression), node) : node;
    }
    export function GroupClause(node: GroupClause, outerClause: QueryBodyClause, elementSelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): GroupClause {
        return node.outerClause !== outerClause || node.elementSelector !== elementSelector || node.keySelector !== keySelector || node.into !== into ? assignLocation(Syntax.GroupClause(outerClause, elementSelector, keySelector, into), node) : node;
    }
    export function JoinClause(node: JoinClause, outerClause: QueryBodyClause, sequenceBinding: SequenceBinding, outerKeySelector: Expression, keySelector: Expression, into: BindingIdentifier | undefined): JoinClause {
        return node.outerClause !== outerClause || node.sequenceBinding !== sequenceBinding || node.outerKeySelector !== outerKeySelector || node.keySelector !== keySelector || node.into !== into ? assignLocation(Syntax.JoinClause(outerClause, sequenceBinding, outerKeySelector, keySelector, into), node) : node;
    }
    export function SelectClause(node: SelectClause, outerClause: QueryBodyClause, expression: Expression, into: BindingIdentifier | undefined): SelectClause {
        return node.outerClause !== outerClause || node.expression !== expression || node.into !== into ? assignLocation(Syntax.SelectClause(outerClause, expression, into), node) : node;
    }
    export function Query(node: QueryExpression, query: GroupClause | SelectClause): QueryExpression {
        return node.query !== query ? assignLocation(Syntax.Query(query), node) : node;
    }
    export function assignLocation<T extends Node>(node: T, source: Syntax): T {
        node[Syntax.location] = source[Syntax.location];
        return node;
    }
}

export interface IdentifierReference extends Syntax {
    readonly kind: SyntaxKind.IdentifierReference;
    readonly text: string;
}

export interface IdentifierName extends Syntax {
    readonly kind: SyntaxKind.IdentifierName;
    readonly text: string;
}

export interface BindingIdentifier extends Syntax {
    readonly kind: SyntaxKind.BindingIdentifier;
    readonly text: string;
}

export type Identifier =
    | BindingIdentifier
    | IdentifierReference
    | IdentifierName;

export function isIdentifier(node: Node): node is Identifier {
    switch (node.kind) {
        case SyntaxKind.BindingIdentifier:
        case SyntaxKind.IdentifierReference:
        case SyntaxKind.IdentifierName:
            return true;
        default:
            return false;
    }
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

export interface NullLiteral extends Syntax {
    readonly kind: SyntaxKind.NullLiteral;
}

export interface BooleanLiteral extends Syntax {
    readonly kind: SyntaxKind.BooleanLiteral;
    readonly value: boolean;
}

export type KeywordLiteral =
    | NullLiteral
    | BooleanLiteral;

export function isKeywordLiteral(node: Node): node is KeywordLiteral {
    switch (node.kind) {
        case SyntaxKind.NullLiteral:
        case SyntaxKind.BooleanLiteral:
            return true;
        default:
            return false;
    }
}

export type Literal =
    | TextLiteral
    | KeywordLiteral;

export function isLiteral(node: Node): node is Literal {
    return isTextLiteral(node)
        || isKeywordLiteral(node);
}

export type PropertyName =
    | IdentifierName
    | StringLiteral
    | NumberLiteral
    | ComputedPropertyName;

export function isPropertyName(node: Node): node is PropertyName {
    switch (node.kind) {
        case SyntaxKind.IdentifierName:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumberLiteral:
        case SyntaxKind.ComputedPropertyName:
            return true;
        default:
            return false;
    }
}

export interface ThisExpression extends Syntax {
    readonly kind: SyntaxKind.ThisExpression;
}

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
    | IdentifierReference
    | Literal
    | ArrayLiteral
    | ObjectLiteral
    | ParenthesizedExpression
    | RegularExpressionLiteral
    | NewExpression
    | CoverParenthesizedExpressionAndArrowParameterList;

export function isPrimaryExpression(node: Node): node is PrimaryExpression {
    switch (node.kind) {
        case SyntaxKind.ThisExpression:
        case SyntaxKind.IdentifierReference:
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
    readonly name: IdentifierName;
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

export interface PrefixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PrefixUnaryExpression;
    readonly operator: PrefixUnaryOperator;
    readonly expression: UnaryExpressionOrHigher;
}

export interface PostfixUnaryExpression extends Syntax {
    readonly kind: SyntaxKind.PostfixUnaryExpression;
    readonly expression: LeftHandSideExpressionOrHigher;
    readonly operator: PostfixUnaryOperator;
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

export interface BinaryExpression extends Syntax {
    readonly kind: SyntaxKind.BinaryExpression;
    readonly left: BinaryExpressionOrHigher;
    readonly operator: BinaryOperator;
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

// SequenceBinding[Await] :
//     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await]
//     BindingIdentifier[?Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
//     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await]
//     [+Await] `await` BindingIdentifier[+Await] `in` HierarchyAxisKeyword? AssignmentExpression[+In, ?Await] `with` `hierarchy` AssignmentExpression[+In, ?Await]
export interface SequenceBinding extends Syntax {
    readonly kind: SyntaxKind.SequenceBinding;
    readonly await: boolean;
    readonly name: BindingIdentifier;
    readonly hierarchyAxisKeyword: HierarchyAxisKeywordKind | undefined;
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
    readonly name: BindingIdentifier;
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

export type DirectionKeywordKind =
    | SyntaxKind.AscendingKeyword
    | SyntaxKind.DescendingKeyword;

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
    readonly direction: DirectionKeywordKind | undefined;
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
    readonly async: boolean;
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

export interface AssignmentExpression extends Syntax {
    readonly kind: SyntaxKind.AssignmentExpression;
    readonly left: LeftHandSideExpressionOrHigher;
    readonly operator: AssignmentOperator;
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
    readonly rest: BindingRestElement | undefined;
}

export type Node =
    // Literals
    | StringLiteral
    | NumberLiteral
    | RegularExpressionLiteral

    // Keywords
    // Punctuation
    // Selectors
    // | Token

    // Names
    | IdentifierName
    | IdentifierReference
    | BindingIdentifier
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
    | ThisExpression
    | NullLiteral
    | BooleanLiteral
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
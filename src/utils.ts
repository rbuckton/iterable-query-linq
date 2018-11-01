import { SyntaxKind } from "./types";

export const enum BinaryPrecedence {
    Unknown = -1,
    None,
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

export function getBinaryOperatorPrecedence(kind: SyntaxKind): BinaryPrecedence {
    switch (kind) {
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

export function assertNever(_value: never, message = "Assertion failed."): never {
    throw new Error(message);
}

export function assertFail(message = "Assertion failed."): never {
    throw new Error(message);
}
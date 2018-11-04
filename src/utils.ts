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

/** @internal */
export function visitList<T, U>(list: ReadonlyArray<T>, visitor: (element: T) => U): ReadonlyArray<U>;
/** @internal */
export function visitList<T, U>(list: ReadonlyArray<T> | undefined, visitor: (element: T) => U): ReadonlyArray<U> | undefined;
/** @internal */
export function visitList<T, U, This>(list: ReadonlyArray<T>, visitor: (this: This, element: T) => U, thisArgument: This): ReadonlyArray<U>;
/** @internal */
export function visitList<T, U, This>(list: ReadonlyArray<T> | undefined, visitor: (this: This, element: T) => U, thisArgument: This): ReadonlyArray<U> | undefined;
export function visitList<T>(list: ReadonlyArray<T> | undefined, visitor: (element: T) => T, thisArgument?: any): ReadonlyArray<T> | undefined {
    if (!list) return undefined;
    let result: T[] | undefined;
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const visited = thisArgument ? visitor.call(thisArgument, item) : visitor(item);
        if (result) {
            result.push(visited);
        }
        else if (visited !== item) {
            result = list.slice(0, i);
            result.push(visited);
        }
    }
    return result || list;
}
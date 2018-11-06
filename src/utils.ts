import { Token } from "./tokens";

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

export function getBinaryOperatorPrecedence(kind: Token): BinaryPrecedence {
    switch (kind) {
        case Token.BarBarToken: return BinaryPrecedence.LogicalORExpression;
        case Token.AmpersandAmpersandToken: return BinaryPrecedence.LogicalANDExpression;
        case Token.BarToken: return BinaryPrecedence.BitwiseORExpression;
        case Token.CaretToken: return BinaryPrecedence.BitwiseXORExpression;
        case Token.AmpersandToken: return BinaryPrecedence.BitwiseANDExpression;
        case Token.EqualsEqualsToken:
        case Token.EqualsEqualsEqualsToken:
        case Token.ExclamationEqualsToken:
        case Token.ExclamationEqualsEqualsToken: return BinaryPrecedence.EqualityExpression;
        case Token.LessThanToken:
        case Token.LessThanEqualsToken:
        case Token.GreaterThanToken:
        case Token.GreaterThanEqualsToken:
        case Token.InstanceofKeyword:
        case Token.InKeyword: return BinaryPrecedence.RelationalExpression;
        case Token.LessThanLessThanToken:
        case Token.GreaterThanGreaterThanToken:
        case Token.GreaterThanGreaterThanGreaterThanToken: return BinaryPrecedence.ShiftExpression;
        case Token.PlusToken:
        case Token.MinusToken: return BinaryPrecedence.AdditiveExpression;
        case Token.AsteriskToken:
        case Token.SlashToken:
        case Token.PercentToken: return BinaryPrecedence.MultiplicitaveExpression;
        case Token.AsteriskAsteriskToken: return BinaryPrecedence.ExponentiationExpression;
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
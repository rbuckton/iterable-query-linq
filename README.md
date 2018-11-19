LINQ-like syntax using tagged templates.

## Installation

```
npm install iterable-query-linq
```

## Usage

```ts
import { linq } from "iterable-query-linq";

const q = linq`
    from user of ${users}
    where user.name === "Alice"
    select user
`;
```

# Syntax

A query must begin with a `from` clause, may consist of zero or more other clauses, and must end with either a `group` clause or a `select` clause:

```ts
linq`
    from user of ${users}
    select user
`

linq`
    from user of ${users}
    where user.active
    group user by user.role
`
```

### Query Clauses

- [`from`](#from-clause)
- [`join`](#join-clause)
- [`join into`](#join-into-clause)
- [`let`](#let-clause)
- [`where`](#where-clause)
- [`orderby`](#orderby-clause)
- [`group`](#group-clause)
- [`group into`](#group-into-clause)
- [`select`](#select-clause)
- [`select into`](#select-into-clause)

## `from` Clause

The `from` clause is used to bind an identifier to each element in an expression:

#### Basic usage
```
from ID of SOURCE
```

### Cartesian Joins

Multiple `from` clauses can be chained together to form a cartesian join, resulting
in the cartesian product of the elements in each sequence.

### Async Iteration

If _source_ is an async iterable, you must indicate async iteration using the `await` modifier. Async iteration is only supported in a `linq.async` block.

#### Example
```ts
linq.async`
    from await symbol of ${asyncStockTicker}
    where symbol.name === "NASDAQ"
    select symbol.value
`
```

## `join` Clause

The `join` clause is used to define a one-to-one relationship between the elements two iterables. All joins
are performed using an "equijoin" comparing the strict equality of the keys
selected from the outer and inner iterables:

#### Basic usage
```
join INNER_ID of INNER_SOURCE on OUTER_KEY equals INNER_KEY
```

## `join into` Clause

The `join into` clause is similar to the `join` clause except that it creates a one-to-many relationship in the form of a group join:

#### Basic usage
```
join INNER_ID of INNER_SOURCE on OUTER_KEY equals INNER_KEY into ID
```

## `let` Clause

The `let` clause creates a variable binding that persists through the query body
and is used to capture per-element state:

#### Usage
```
let ID = EXPRESSION
```

#### Examples
```ts
linq`
    from user of ${users}
    let fullName = user.firstName + " " + user.lastName
    select { username: user.username, fullName }
`
```

## `where` Clause

The `where` clause filters the iterable, skipping items that do not match the supplied criteria:

#### Usage
```
where EXPRESSION
```

#### Examples
```ts
linq`
    from x of ${numbers}
    where x > 10 && x < 20
    select x
`
```

## `orderby` Clause

The `orderby` Clause is used to sort an iterable using one or more comparators:

#### Usage
```
orderby EXPRESSION [ascending|descending] [, ...]
```

#### Examples
```ts
linq`
    from user of ${users}
    orderby user.lastName, user.firstName
    select user
`
```

## `group` Clause

The `group` clause terminates a query and is used to group items with the same key:

#### Usage
```
group ELEMENT by KEY
```

#### Examples
```ts
linq`
    from user of ${users}
    group user by user.role
`
```

## `group into` Clause

The `group into` clause is similar to the `group` clause, except that it introduces
a new binding that can be used in a subsequent query body:

#### Usage
```
group ELEMENT by KEY into ID
```

#### Examples
```ts
linq`
    from user of ${users}
    group user by user.role into roleUsers
    orderby roleUsers.key
    select { role: roleUser.key, users: [...roleUsers] }
`
```

## `select` Clause

The `select` clause terminates a query and is used to select the resulting element
for each element in the source:

#### Usage
```
select EXPRESSION
```

#### Examples
```ts
linq`
    from user of ${users}
    select user.name
`
```

## `select into` Clause

The `select into` clause is similar to the `select` clause, except that it introduces
a new binding that can be used in a subsequent query body:

#### Usage
```
select EXPRESSION into ID
```

#### Examples
```ts
linq`
    from user of ${users}
    select user.name into name
    where name !== "Bob"
    select name
`
```

# API

You can run queries using the built-in API as well (requires NodeJS):

```ts
import { parseAndExecuteQuery, parseAndExecuteQueryAsync } from "iterable-query-linq";

...

const users = ...;
const q = parseAndExecuteQuery(`
    from user of users
    select user.name
`, { users });

...

const asyncUsers = ...;
const q = parseAndExecuteQueryAsync(`
    from await user of users
    select user.name
`, { users: asyncUsers });
```

# REPL

You can also start a NodeJS REPL that evaluates queries:

```ts
import { startLinqRepl } from "iterable-query-linq";

const users = ...;
startLinqRepl({ users });

// > from user of users
// ... select user.name
```
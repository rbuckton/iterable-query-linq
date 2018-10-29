LINQ-like syntax using tagged templates.

## Installation

```
npm install iterable-query-linq
```

## Usage

```ts
import { linq } from "iterable-query-linq";

const q = linq`
    from user in ${users}
    where user.name === "Alice"
    select user
`;
```
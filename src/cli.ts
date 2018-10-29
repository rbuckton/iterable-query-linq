import * as users from "./__test__/data/users";
import * as books from "./__test__/data/books";
import * as nodes from "./__test__/data/nodes";
import * as fn from "iterable-query/fn";
import * as util from "util";
import { startLinqRepl } from "./repl";
startLinqRepl({ 
    users: users.users, 
    roles: users.roles,
    books: fn.toHierarchy(books.books, books.bookHierarchy),
    nodes: fn.hierarchy(nodes.nodeA, nodes.nodeHierarchy),
}, { 
    writer: (value: any) => {
        if (Symbol.iterator in value && !Array.isArray(value)) {
            value = Array.from(value);
        }
        return util.inspect(value, { colors: true });
    }
});
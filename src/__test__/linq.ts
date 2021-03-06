import * as users from "./data/users";
import { linq } from "../";
import { expect } from "chai";
import { Query, AsyncQuery } from "iterable-query";
import { toArray, toArrayAsync } from "iterable-query/fn";
import { getCompilationResult } from "../linq";
// import * as books from "./data/books";
// import * as numbers from "./data/numbers";

describe("linq", () => {
    it("non-query", () => {
        const q = linq`${1}`;
        expect(q.toArray()).to.deep.equal([1]);
    });
    it("nested", () => {
        const q = linq`
            (
                from x of ${[1, 2, 3]}
                select x
            ).reverse()
        `;
        expect(q.toArray()).to.deep.equal([3, 2, 1]);
    });
    it("cross join", () => {
        const q = linq`
            from x of [1, 2]
            from s of ["a", "b"]
            select { x, s }
        `;
        expectSequence(q, [{ x: 1, s: "a" }, { x: 1, s: "b" }, { x: 2, s: "a" }, { x: 2, s: "b" }]);
    });
    it("select many", () => {
        const q = linq`
            from x of [[1, 2], ["a", "b"]]
            from y of x
            select { x, y }
        `;
        expectSequence(q, [{ x: [1, 2], y: 1 }, { x: [1, 2], y: 2 }, { x: ["a", "b"], y: "a" }, { x: ["a", "b"], y: "b" }]);
    });
    it("flatten group", () => {
        const q = linq`
            from x of [{ a: 1, b: 2 }, { a: 1, b: 3 }]
            group x by x.a into g
            from x of g
            select { k: g.key, b: x.b }
        `;
        expectSequence(q, [{ k: 1, b: 2 }, { k: 1, b: 3 }]);
    });
    it("from from", () => {
        const q = linq`
            from x of
                from y of [1, 2, 3]
                select y
            select x
        `;
        expectSequence(q, [1, 2, 3]);
    });

    describe("FromClause :", () => {
        it("`from` BindingIdentifier `of` AssignmentExpression", () => {
            const q = linq`
                from x of ${[1, 2, 3]}
                select x
            `;
            expectSequence(q, [1, 2, 3]);
        });
        it("`from` BindingPattern `of` AssignmentExpression", () => {
            const q = linq`
                from { x } of ${[{ x: 1 }, { x: 2 }, { x: 3 }]}
                select x
            `;
            expectSequence(q, [1, 2, 3]);
        });
        it("`from` `await` BindingIdentifier `of` AssignmentExpression", async () => {
            const q = linq.async`
                from await x of ${[1, Promise.resolve(2), 3]}
                select x
            `;
            expectSequenceAsync(q, [1, 2, 3]);
        });
    });

    describe("LetClause :", () => {
        it("Clause `let` BindingIdentifier `=` AssignmentExpression", () => {
            const q = linq`
                from x of [1, 2, 3]
                let y = x + 1
                select y
            `;
            expectSequence(q, [2, 3, 4]);
        });
        it("Clause `let` BindingName `=` AssignmentExpression", () => {
            const q = linq`
                from { x } of ${[{ x: 1 }, { x: 2 }, { x: 3 }]}
                let y = x + 1
                select y
            `;
            expectSequence(q, [2, 3, 4]);
        });
        it("[+Await] Clause `let` BindingIdentifier `=` AssignmentExpression", async () => {
            const q = linq.async`
                from await x of ${[1, Promise.resolve(2), 3]}
                let y = x + 1
                select y
            `;
            await expectSequenceAsync(q, [2, 3, 4]);
        });
    });

    describe("WhereClause :", () => {
        it("Clause `where` AssignmentExpression", () => {
            const q = linq`
                from x of ${[1, 2, 3]}
                where x % 2 === 1
                select x
            `;
            expectSequence(q, [1, 3]);
        });
        it("[+Await] Clause `where` AssignmentExpression", async () => {
            const q = linq.async`
                from x of ${[1, Promise.resolve(2), 3]}
                where x % 2 === 1
                select x
            `;
            await expectSequenceAsync(q, [1, 3]);
        });
    });

    describe("OrderbyClause :", () => {
        it("Clause `orderby` AssignmentExpression", () => {
            const q = linq`
                from x of ${[3, 1, 2]}
                orderby x
                select x
            `;
            expectSequence(q, [1, 2, 3]);
        });
        it("Clause `orderby` AssignmentExpression `ascending`", () => {
            const q = linq`
                from x of ${[3, 1, 2]}
                orderby x ascending
                select x
            `;
            expectSequence(q, [1, 2, 3]);
        });
        it("Clause `orderby` AssignmentExpression `descending`", () => {
            const q = linq`
                from x of ${[3, 1, 2]}
                orderby x descending
                select x
            `;
            expectSequence(q, [3, 2, 1]);
        });
        it("Clause `orderby` OrderbyComparator `,` OrderbyComparator", () => {
            const q = linq`
                from x of ${["ab", "ac", "aa", "ba"]}
                orderby x[0], x[1] descending
                select x
            `;
            expectSequence(q, ["ac", "ab", "aa", "ba"]);
        });
    });

    describe("GroupClause[Into] :", () => {
        it("[~Into] Clause `group` AssignmentExpression `by` AssignmentExpression", () => {
            const q = linq`
                from u of ${users.users}
                group u.name by u.role
            `;
            expectSequence(q, [
                { key: "admin", values: ["alice"] },
                { key: "user", values: ["bob", "dave"] }
            ], grouping => ({ key: grouping.key, values: [...grouping] }));
        });
        it("[+Into] Clause `group` AssignmentExpression `by` AssignmentExpression `into` BindingIdentifier", () => {
            const q = linq`
                from u of ${users.users}
                group u.name by u.role into names
                select { role: names.key, names: [...names] }
            `;
            expectSequence(q, [
                { role: "admin", names: ["alice"] },
                { role: "user", names: ["bob", "dave"] }
            ]);
        });
        it("[+Into] Clause `group` AssignmentExpression `by` AssignmentExpression `into` BindingPattern", () => {
            const q = linq`
                from u of ${users.users}
                group u.name by u.role into { key, values: [name, ...names] }
                select { role: key, first: name, rest: [...names] }
            `;
            expectSequence(q, [
                { role: "admin", first: "alice", rest: [] },
                { role: "user", first: "bob", rest: ["dave"] }
            ]);
        });
    });

    describe("JoinClause[Into] :", () => {
        it("Clause `join` BindingIdentifier `of` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", () => {
            const q = linq`
                from role of ${users.roles}
                join user of ${users.users} on role.name equals user.role
                select { role, user }
            `;
            expectSequence(q, [
                { role: users.adminRole, user: users.aliceUser },
                { role: users.userRole, user: users.bobUser },
                { role: users.userRole, user: users.daveUser }
            ]);
        });
        it("[+Into] Clause `join` SequenceBinding `of` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression `into` BindingIdentifier", () => {
            const q = linq`
                from role of ${users.roles}
                join user of ${users.users} on role.name equals user.role into users
                select { role, users: [...users] }
            `;
            expectSequence(q, [
                { role: users.adminRole, users: [users.aliceUser] },
                { role: users.userRole, users: [users.bobUser, users.daveUser] },
                { role: users.guestRole, users: [] }
            ]);
        });
        it("[+Into] Clause `join` SequenceBinding `of` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression `into` BindingPattern", () => {
            const q = linq`
                from role of ${users.roles}
                join user of ${users.users} on role.name equals user.role into [user, ...users]
                select { role, first: user, rest: [...users] }
            `;
            expectSequence(q, [
                { role: users.adminRole, first: users.aliceUser, rest: [] },
                { role: users.userRole, first: users.bobUser, rest: [users.daveUser] },
                { role: users.guestRole, first: undefined, rest: [] }
            ]);
        });
        it("Clause `join` `await` BindingIdentifier `of` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", async () => {
            const q = linq.async`
                from role of ${users.roles}
                join await user of ${users.users.map(x => Promise.resolve(x))} on role.name equals user.role
                select { role, user }
            `;
            await expectSequenceAsync(q, [
                { role: users.adminRole, user: users.aliceUser },
                { role: users.userRole, user: users.bobUser },
                { role: users.userRole, user: users.daveUser }
            ]);
        });
        it("[+Into] Clause `join` `await` SequenceBinding `of` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression `into` BindingIdentifier", async () => {
            const q = linq.async`
                from role of ${users.roles}
                join await user of ${users.users.map(x => Promise.resolve(x))} on role.name equals user.role into users
                select { role, users: [...users] }
            `;
            await expectSequenceAsync(q, [
                { role: users.adminRole, users: [users.aliceUser] },
                { role: users.userRole, users: [users.bobUser, users.daveUser] },
                { role: users.guestRole, users: [] }
            ]);
        });
    });

    describe("SelectClause[Into] :", () => {
        it("[~Into] Clause `select` AssignmentExpression", () => {
            const q = linq`
                from x of ${[1, 2, 3]}
                select x + 1
            `;
            expectSequence(q, [2, 3, 4]);
        });
        it("[+Into] Clause `select` AssignmentExpression `into` BindingIdentifier", () => {
            const q = linq`
                from x of ${[1, 2, 3]}
                select x + 1 into y
                select y
            `;
            expectSequence(q, [2, 3, 4]);
        });
        it("[+Into] Clause `select` AssignmentExpression `into` BindingPattern", () => {
            const q = linq`
                from x of ${[1, 2, 3]}
                select { y: x + 1 } into { y }
                select y
            `;
            expectSequence(q, [2, 3, 4]);
        });
    });
});

function expectSequence(actual: Query<any>, expected: any[], mapfn?: (value: any) => any) {
    try {
        expect(toArray(actual, mapfn!)).to.deep.equal(expected);
    }
    catch (e) {
        const result = getCompilationResult(actual);
        if (result) {
            e.message += `\n\nSource:\n${result.sourceText}\n\nTransformed:\n${result.compiledText}`;
        }
        throw e;
    }
}

async function expectSequenceAsync(actual: AsyncQuery<any>, expected: any[], mapfn?: (value: any) => any) {
    try {
        expect(await toArrayAsync(actual, mapfn!)).to.deep.equal(expected);
    }
    catch (e) {
        const result = getCompilationResult(actual);
        if (result) {
            e.message += `\n\nSource:\n${result.sourceText}\n\nTransformed:\n${result.compiledText}`;
        }
        throw e;
    }
}
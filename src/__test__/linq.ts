import { linq } from "../";
import { expect } from "chai";
import * as users from "./data/users";
import { CompiledIterable, CompiledAsyncIterable } from "../linq";
import * as nodes from "./data/nodes";
import { toHierarchy, toHierarchyAsync, toArray, toArrayAsync } from "iterable-query/fn";
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
                from x in ${[1, 2, 3]} 
                select x
            ).reverse()
        `;
        expect(q.toArray()).to.deep.equal([3, 2, 1]);
    });

    describe("FromClause :", () => {
        it("`from` BindingIdentifier `in` AssignmentExpression", () => {
            const q = linq`
                from x in ${[1, 2, 3]}
                select x
            `;
            expectSequence(q, [1, 2, 3]);
        });
        it("`from` BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression", () => {
            const q = linq`
                from x in ${nodes.nodes} with hierarchy ${nodes.nodeHierarchy}
                select x
            `;
            expectSequence(q, nodes.nodes);
        });
        it("`from` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression", () => {
            const q = linq`
                from x in childrenof ${toHierarchy([nodes.nodeA], nodes.nodeHierarchy)}
                select x
            `;
            expectSequence(q, nodes.nodeA.children!)
        });
        it("`from` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression", () => {
            const q = linq`
                from x in childrenof ${[nodes.nodeA]} with hierarchy ${nodes.nodeHierarchy}
                select x
            `;
            expectSequence(q, nodes.nodeA.children!);
        });
        it("`from` `await` BindingIdentifier `in` AssignmentExpression", async () => {
            const q = linq.async`
                from await x in ${[1, Promise.resolve(2), 3]}
                select x
            `;
            expectSequenceAsync(q, [1, 2, 3]);
        });
        it("`from` `await` BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression", async () => {
            const q = linq.async`
                from await x in ${nodes.nodes.map(x => Promise.resolve(x))} with hierarchy ${nodes.nodeHierarchy}
                select x
            `;
            await expectSequenceAsync(q, nodes.nodes);
        });
        it("`from` `await` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression", async () => {
            const q = linq.async`
                from await x in childrenof ${toHierarchyAsync([Promise.resolve(nodes.nodeA)], nodes.nodeHierarchy)}
                select x
            `;
            await expectSequenceAsync(q, nodes.nodeA.children!)
        });
        it("`from` `await` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression", async () => {
            const q = linq.async`
                from await x in childrenof ${[Promise.resolve(nodes.nodeA)]} with hierarchy ${nodes.nodeHierarchy}
                select x
            `;
            await expectSequenceAsync(q, nodes.nodeA.children!);
        });
    });

    describe("LetClause :", () => {
        it("Clause `let` BindingIdentifier `=` AssignmentExpression", () => {
            const q = linq`
                from x in [1, 2, 3]
                let y = x + 1
                select y
            `;
            expectSequence(q, [2, 3, 4]);
        });
        it("[+Await] Clause `let` BindingIdentifier `=` AssignmentExpression", async () => {
            const q = linq.async`
                from await x in ${[1, Promise.resolve(2), 3]}
                let y = x + 1
                select y
            `;
            await expectSequenceAsync(q, [2, 3, 4]);
        });
    });

    describe("WhereClause :", () => {
        it("Clause `where` AssignmentExpression", () => {
            const q = linq`
                from x in ${[1, 2, 3]}
                where x % 2 === 1
                select x
            `;
            expectSequence(q, [1, 3]);
        });
        it("[+Await] Clause `where` AssignmentExpression", async () => {
            const q = linq.async`
                from x in ${[1, Promise.resolve(2), 3]}
                where x % 2 === 1
                select x
            `;
            await expectSequenceAsync(q, [1, 3]);
        });
    });

    describe("OrderbyClause :", () => {
        it("Clause `orderby` AssignmentExpression", () => {
            const q = linq`
                from x in ${[3, 1, 2]}
                orderby x
                select x
            `;
            expectSequence(q, [1, 2, 3]);
        });
        it("Clause `orderby` AssignmentExpression `ascending`", () => {
            const q = linq`
                from x in ${[3, 1, 2]}
                orderby x ascending
                select x
            `;
            expectSequence(q, [1, 2, 3]);
        });
        it("Clause `orderby` AssignmentExpression `descending`", () => {
            const q = linq`
                from x in ${[3, 1, 2]}
                orderby x descending
                select x
            `;
            expectSequence(q, [3, 2, 1]);
        });
        it("Clause `orderby` AssignmentExpression `using` AssignmentExpression", () => {
            const q = linq`
                from x in ${[3, 1, 2]}
                orderby x using ${(a: number, b: number) => b - a}
                select x
            `;
            expectSequence(q, [3, 2, 1]);
        });
        it("Clause `orderby` OrderbyComparator `,` OrderbyComparator", () => {
            const q = linq`
                from x in ${["ab", "ac", "aa", "ba"]}
                orderby x[0], x[1] descending
                select x
            `;
            expectSequence(q, ["ac", "ab", "aa", "ba"]);
        });
    });

    describe("GroupClause[Into] :", () => {
        it("[~Into] Clause `group` AssignmentExpression `by` AssignmentExpression", () => {
            const q = linq`
                from u in ${users.users}
                group u.name by u.role
            `;
            expectSequence(q, [
                { key: "admin", values: ["alice"] },
                { key: "user", values: ["bob", "dave"] }
            ], grouping => ({ key: grouping.key, values: [...grouping] }));
        });
        it("[+Into] Clause `group` AssignmentExpression `by` AssignmentExpression `into` BindingIdentifier", () => {
            const q = linq`
                from u in ${users.users}
                group u.name by u.role into names
                select { role: names.key, names: [...names] }
            `;
            expectSequence(q, [
                { role: "admin", names: ["alice"] },
                { role: "user", names: ["bob", "dave"] }
            ]);
        });
    });

    describe("JoinClause[Into] :", () => {
        it("Clause `join` BindingIdentifier `in` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", () => {
            const q = linq`
                from role in ${users.roles}
                join user in ${users.users} on role.name equals user.role
                select { role, user }
            `;
            expectSequence(q, [
                { role: users.adminRole, user: users.aliceUser },
                { role: users.userRole, user: users.bobUser },
                { role: users.userRole, user: users.daveUser }
            ]);
        });
        it("Clause `join` BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", () => {
            const q = linq`
                from role in ${users.roles}
                join user in ${users.users} with hierarchy ${users.userHierarchy} on role.name equals user.role
                select { role, user }
            `;
            expectSequence(q, [
                { role: users.adminRole, user: users.aliceUser },
                { role: users.userRole, user: users.bobUser },
                { role: users.userRole, user: users.daveUser }
            ]);
        });
        it("Clause `join` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", () => {
            const q = linq`
                from role in ${users.roles}
                join user in parentof ${toHierarchy(users.users, users.userHierarchy)} on role.name equals user.role
                select { role, user }
            `;
            expectSequence(q, [
                { role: users.adminRole, user: users.aliceUser },
            ]);
        });
        it("Clause `join` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", () => {
            const q = linq`
                from role in ${users.roles}
                join user in parentof ${users.users} with hierarchy ${users.userHierarchy} on role.name equals user.role
                select { role, user }
            `;
            expectSequence(q, [
                { role: users.adminRole, user: users.aliceUser },
            ]);
        });
        it("[+Into] Clause `join` SequenceBinding `in` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression `into` BindingIdentifier", () => {
            const q = linq`
                from role in ${users.roles}
                join user in ${users.users} on role.name equals user.role into users
                select { role, users: [...users] }
            `;
            expectSequence(q, [
                { role: users.adminRole, users: [users.aliceUser] },
                { role: users.userRole, users: [users.bobUser, users.daveUser] },
                { role: users.guestRole, users: [] }
            ]);
        });
        it("Clause `join` `await` BindingIdentifier `in` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", async () => {
            const q = linq.async`
                from role in ${users.roles}
                join await user in ${users.users.map(x => Promise.resolve(x))} on role.name equals user.role
                select { role, user }
            `;
            await expectSequenceAsync(q, [
                { role: users.adminRole, user: users.aliceUser },
                { role: users.userRole, user: users.bobUser },
                { role: users.userRole, user: users.daveUser }
            ]);
        });
        it("Clause `join` `await` BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", async () => {
            const q = linq.async`
                from role in ${users.roles}
                join await user in ${users.users.map(x => Promise.resolve(x))} with hierarchy ${users.userHierarchy} on role.name equals user.role
                select { role, user }
            `;
            await expectSequenceAsync(q, [
                { role: users.adminRole, user: users.aliceUser },
                { role: users.userRole, user: users.bobUser },
                { role: users.userRole, user: users.daveUser }
            ]);
        });
        it("Clause `join` `await` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", async () => {
            const q = linq.async`
                from role in ${users.roles}
                join await user in parentof ${toHierarchyAsync(users.users.map(x => Promise.resolve(x)), users.userHierarchy)} on role.name equals user.role
                select { role, user }
            `;
            await expectSequenceAsync(q, [
                { role: users.adminRole, user: users.aliceUser },
            ]);
        });
        it("Clause `join` `await` HierarchyAxisKeyword BindingIdentifier `in` AssignmentExpression `with` `hierarchy` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression", async () => {
            const q = linq.async`
                from role in ${users.roles}
                join await user in parentof ${users.users.map(x => Promise.resolve(x))} with hierarchy ${users.userHierarchy} on role.name equals user.role
                select { role, user }
            `;
            await expectSequenceAsync(q, [
                { role: users.adminRole, user: users.aliceUser },
            ]);
        });
        it("[+Into] Clause `join` `await` SequenceBinding `in` AssignmentExpression `on` AssignmentExpression `equals` AssignmentExpression `into` BindingIdentifier", async () => {
            const q = linq.async`
                from role in ${users.roles}
                join await user in ${users.users.map(x => Promise.resolve(x))} on role.name equals user.role into users
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
                from x in ${[1, 2, 3]}
                select x + 1
            `;
            expectSequence(q, [2, 3, 4]);
        });
        it("[+Into] Clause `select` AssignmentExpression `into` BindingIdentifier", () => {
            const q = linq`
                from x in ${[1, 2, 3]}
                select x + 1 into y
                select y
            `;
            expectSequence(q, [2, 3, 4]);
        });
    });
});

function expectSequence(actual: CompiledIterable<any>, expected: any[], mapfn?: (value: any) => any) {
    try {
        expect(toArray(actual, mapfn!)).to.deep.equal(expected);
    }
    catch (e) {
        e.message += `\n\nSource:\n${actual.toString(false)}\n\nTransformed:\n${actual.toString(true)}`;
        throw e;
    }
}

async function expectSequenceAsync(actual: CompiledAsyncIterable<any>, expected: any[], mapfn?: (value: any) => any) {
    try {
        expect(await toArrayAsync(actual, mapfn!)).to.deep.equal(expected);
    }
    catch (e) {
        e.message += `\n\nSource:\n${actual.toString(false)}\n\nTransformed:\n${actual.toString(true)}`;
        throw e;
    }
}
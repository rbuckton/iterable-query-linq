import "source-map-support/register";
import { linq } from "../";
import { expect } from "chai";
import * as users from "./data/users";
// import * as nodes from "./data/nodes";
// import * as books from "./data/books";
// import * as numbers from "./data/numbers";

describe("linq", () => {
    it("non-query", () => {
        const q = linq`${1}`;
        expect(q.toArray()).to.deep.equal([1]);
    });
    it("simple", () => {
        const q = linq`
            from x in ${[1, 2, 3]}
            select x`;
        expect(q.toArray()).to.deep.equal([1, 2, 3]);
    });
    it("where", () => {
        const q = linq`
            from x in ${[1, 2, 3]}
            where x >= 2
            select x`;
        expect(q.toArray()).to.deep.equal([2, 3]);
    });
    it("orderby", () => {
        const q = linq`
            from x in ${[3, 1, 2]}
            orderby x
            select x
        `;
        expect(q.toArray()).to.deep.equal([1, 2, 3]);
    });
    it("orderby using", () => {
        const q = linq`
            from x in ${["a", "B", "b"]}
            orderby x using ${(a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())}
            select x`;
        expect(q.toArray()).to.deep.equal(["a", "B", "b"]);
    });
    it("group", () => {
        const q = linq`
            from u in ${users.users}
            group u.name by u.role into names
            select { role: names.key, names: [...names] }`;
        expect(q.toArray()).to.deep.equal([
            { role: "admin", names: ["alice"] },
            { role: "user", names: ["bob", "dave"] }
        ]);
    });
    it("joins", () => {
        const q = linq`
            from role in ${users.roles}
            join user in ${users.users} on role.name equals user.role
            select { role, user }
        `;
        expect(q.toArray()).to.deep.equal([
            { role: users.adminRole, user: users.aliceUser },
            { role: users.userRole, user: users.bobUser },
            { role: users.userRole, user: users.daveUser }
        ]);
    });
    it("group join", () => {
        const q = linq`
            from role in ${users.roles}
            join user in ${users.users} on role.name equals user.role into users
            select { role, users: [...users] }
        `;
        expect(q.toArray()).to.deep.equal([
            { role: users.adminRole, users: [users.aliceUser] },
            { role: users.userRole, users: [users.bobUser, users.daveUser] },
            { role: users.guestRole, users: [] }
        ]);
    });
});
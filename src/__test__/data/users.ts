import { HierarchyProvider } from "iterable-query/dist/lib";

export interface User { name: string, role: string, manager?: User, reports?: User[] }
export interface Role { name: string }

export const aliceUser: User = { name: "alice", role: "admin" };
export const bobUser: User = { name: "bob", role: "user" };
bobUser.manager = aliceUser;
aliceUser.reports = [bobUser];

export const daveUser: User = { name: "dave", role: "user" };
export const users: User[] = [aliceUser, bobUser, daveUser];

export const userHierarchy: HierarchyProvider<User> = {
    owns(_: User) {
        return true;
    },
    parent(user: User) {
        return user.manager;
    },
    children(node: User) {
        return node.reports || [];
    }
};

export const adminRole: Role = { name: "admin" };
export const userRole: Role = { name: "user" };
export const guestRole: Role = { name: "guest" };
export const roles: Role[] = [adminRole, userRole, guestRole];

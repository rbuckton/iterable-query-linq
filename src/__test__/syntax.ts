import { expect } from "chai";
import { Parser } from "../parser";
import { SyntaxKind, ParenthesizedExpression, AssignmentExpression, ArrowFunction, Identifier } from "../syntax";
import { UnrecoverableSyntaxError } from "../errors";
import { ExpressionVisitor } from "../visitor";

describe("syntax", () => {
    it("object literal", () => {
        const node = new Parser().parse(`
        ({
            a,
            b: 0,
            "c": 1,
            ["d"]: 2,
            3: "e"
        })`);
        expect(node.kind).to.equal(SyntaxKind.ParenthesizedExpression);
        expect((node as ParenthesizedExpression).expression.kind).to.equal(SyntaxKind.ObjectLiteral);
    });
    it("object literal fails refinement", () => {
        expect(() => new Parser().parse(`
        ({
            a = 1,
        })`)).to.throw(UnrecoverableSyntaxError);
    });
    it("object literal refined to assignment", () => {
        const node = new Parser().parse(`({ a = 1, b: c } = { })`);
        expect(node.kind).to.equal(SyntaxKind.ParenthesizedExpression);
        expect((node as ParenthesizedExpression).expression.kind).to.equal(SyntaxKind.AssignmentExpression);
        expect(((node as ParenthesizedExpression).expression as AssignmentExpression).left.kind).to.equal(SyntaxKind.ObjectAssignmentPattern);
    });
    it("parenthesized expression", () => {
        const node = new Parser().parse(`(a)`);
        expect(node.kind).to.equal(SyntaxKind.ParenthesizedExpression);
        expect((node as ParenthesizedExpression).expression.kind).to.equal(SyntaxKind.Identifier);
    });
    it("parenthesized expression refined to arrow", () => {
        const node = new Parser().parse(`({ a = 1 }) => a`);
        expect(node.kind).to.equal(SyntaxKind.ArrowFunction);
        expect((node as ArrowFunction).parameterList.length).to.equal(1);
        expect((node as ArrowFunction).parameterList[0].name.kind).to.equal(SyntaxKind.ObjectBindingPattern);
        expect((node as ArrowFunction).body.kind).to.equal(SyntaxKind.Identifier);
        expect(((node as ArrowFunction).body as Identifier).text).to.equal("a");
    });
    it("performs refinements in ArrowFunction bodies", () => {
        const node = new Parser().parse(`d => (a)`);
        const visitor = new class extends ExpressionVisitor {};
        expect(() => visitor.visit(node)).to.not.throw();
    })
});
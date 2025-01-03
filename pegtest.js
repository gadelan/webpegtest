// IIIII NN   NN TTTTTTT EEEEEEE RRRRRR  FFFFFFF   AAA    CCCCC  EEEEEEE 
//  III  NNN  NN   TTT   EE      RR   RR FF       AAAAA  CC    C EE      
//  III  NN N NN   TTT   EEEEE   RRRRRR  FFFF    AA   AA CC      EEEEE   
//  III  NN  NNN   TTT   EE      RR  RR  FF      AAAAAAA CC    C EE      
// IIIII NN   NN   TTT   EEEEEEE RR   RR FF      AA   AA  CCCCC  EEEEEEE 
export class LocatedError extends Error {
    from;
    to;
    grammarNode;
    /** grammarNode is null when from/to refers to the grammar. Otherwise, they point to the input. */
    constructor(message, from, to, grammarNode, options) {
        super(message, options);
        this.from = from;
        this.to = to;
        this.grammarNode = grammarNode;
    }
}
export function parseGrammar(grammarCode) {
    const parser = new GrammarParser();
    if (parser.parse(grammarCode)) {
        return parser.getGrammar();
    }
    return parser.getErrors();
}
export function parseInput(grammar, inputCode) {
    const interpreter = new Interpreter();
    if (interpreter.interpret(inputCode, grammar)) {
        return { root: interpreter.rootAST, memo: interpreter.memo, parsedToLocation: interpreter.cursor };
    }
    return { error: interpreter.error, memo: interpreter.memo };
}
// MM    MM IIIII  SSSSS   CCCCC  
// MMM  MMM  III  SS      CC    C 
// MM MM MM  III   SSSSS  CC      
// MM    MM  III       SS CC    C 
// MM    MM IIIII  SSSSS   CCCCC  
const AXIOM_RULE_NAME = "start";
const RESERVED_RULE_NAMES = ["WS", "EOF", "EPSILON"];
class InternalPrinter {
    output;
    constructor(output) {
        this.output = output;
    }
    print(s) {
        this.output.print(s);
    }
    printEscaping(s) {
        for (const char of s) {
            this.print(this.escapeChar(char));
        }
    }
    escapeChar(c) {
        switch (c) {
            case '\n': return "\\n";
            case '\r': return "\\t";
            case '\t': return "\\t";
            case '\\': return "\\\\";
            case '^': return "\\^";
            case '[': return "\\[";
            case ']': return "\\]";
            case '-': return "\\-";
            case '"': return '\\"';
        }
        return c;
    }
}
//   GGGG  RRRRRR    AAA   MM    MM MM    MM   AAA   RRRRRR  NN   NN  OOOOO  DDDDD   EEEEEEE  SSSSS  
//  GG  GG RR   RR  AAAAA  MMM  MMM MMM  MMM  AAAAA  RR   RR NNN  NN OO   OO DD  DD  EE      SS      
// GG      RRRRRR  AA   AA MM MM MM MM MM MM AA   AA RRRRRR  NN N NN OO   OO DD   DD EEEEE    SSSSS  
// GG   GG RR  RR  AAAAAAA MM    MM MM    MM AAAAAAA RR  RR  NN  NNN OO   OO DD   DD EE           SS 
//  GGGGGG RR   RR AA   AA MM    MM MM    MM AA   AA RR   RR NN   NN  OOOO0  DDDDDD  EEEEEEE  SSSSS  
// ===============================================================================================================
// ABSTRACT
// ===============================================================================================================
class GrammarNode {
    from;
    to;
    id;
    constructor(from, to, id) {
        this.from = from;
        this.to = to;
        this.id = id;
    }
    recursiveVisit(visitingFunction) {
        visitingFunction(this);
    }
    replaceSeparator(separator, toPosition) {
        return; // Fail by default
    }
}
class ChildGrammarNode extends GrammarNode {
    child;
    constructor(from, to, id, child) {
        super(from, to, id);
        this.child = child;
    }
    recursiveVisit(visitingFunction) {
        visitingFunction(this);
        this.child.recursiveVisit(visitingFunction);
    }
    getChildren() {
        return { children: [this.child] };
    }
}
class WithSeparatorGrammarNode extends GrammarNode {
    separator;
    constructor(from, to, id, separator) {
        super(from, to, id);
        this.separator = separator;
    }
    replaceSeparator(separator, toPosition) {
        this.separator = separator;
        this.to = toPosition;
        return this;
    }
    printSeparator(p, addSpace) {
        if (this.separator == null) {
            return;
        }
        p.print(addSpace ? " % " : "% ");
        this.separator.print(p);
    }
}
class ChildWithSeparatorGrammarNode extends WithSeparatorGrammarNode {
    child;
    constructor(from, to, id, child, separator) {
        super(from, to, id, separator);
        this.child = child;
    }
    recursiveVisit(visitingFunction) {
        visitingFunction(this);
        this.child.recursiveVisit(visitingFunction);
        if (this.separator != null) {
            this.separator.recursiveVisit(visitingFunction);
        }
    }
    getChildren() {
        return { children: [this.child], separator: this.separator };
    }
}
class ChildrenGrammarNode extends GrammarNode {
    children;
    constructor(from, to, id, children) {
        super(from, to, id);
        this.children = children;
    }
    recursiveVisit(visitingFunction) {
        visitingFunction(this);
        this.children.forEach(child => child.recursiveVisit(visitingFunction));
    }
    listPrint(p, separator) {
        p.print("(");
        this.children.forEach((c, x) => {
            if (x > 0) {
                p.print(separator);
            }
            c.print(p);
        });
        p.print(")");
    }
    getChildren() {
        return { children: this.children };
    }
}
class ChildrenWithSeparatorGrammarNode extends WithSeparatorGrammarNode {
    children;
    constructor(from, to, id, children, separator) {
        super(from, to, id, separator);
        this.children = children;
    }
    recursiveVisit(visitingFunction) {
        visitingFunction(this);
        this.children.forEach(child => child.recursiveVisit(visitingFunction));
        if (this.separator != null) {
            this.separator.recursiveVisit(visitingFunction);
        }
    }
    listPrint(p, separator) {
        p.print("(");
        this.children.forEach((c, x) => {
            if (x != 0) {
                p.print(separator);
            }
            c.print(p);
        });
        this.printSeparator(p, true);
        p.print(")");
    }
    getChildren() {
        return { children: this.children, separator: this.separator };
    }
}
// ===============================================================================================================
// CONCRETE
// ===============================================================================================================
class GNEOF extends GrammarNode {
    constructor() { super(-1, -1, "EOF"); }
    print(p) {
        p.print("EOF");
    }
    interpret(i) {
        if (i.atEOF()) {
            return i.createOKMemo(0, [], []);
        }
        return i.createErrorMemo("Not at EOF", []);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNEpsilon extends GrammarNode {
    constructor() { super(-1, -1, "Epsilon"); }
    print(p) {
        p.print("EPSILON");
    }
    interpret(i) {
        return i.createOKMemo(0, [], []);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNAnyCharNotEOF extends GrammarNode {
    constructor() { super(-1, -1, "AnyNotEOF"); }
    print(p) {
        p.print("ANY");
    }
    interpret(i) {
        if (!i.atEOF()) {
            ++i.cursor;
            return i.createOKMemo(1, [], []);
        }
        return i.createErrorMemo("EOF reached", []);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNWhiteSpace extends GrammarNode {
    constructor() { super(-1, -1, "WhiteSpace"); }
    print(p) {
        p.print("WS");
    }
    interpret(i) {
        if (i.atWS()) {
            ++i.cursor;
            return i.createOKMemo(1, [], []);
        }
        return i.createErrorMemo("No WS found.", []);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNError extends GrammarNode {
    constructor() { super(-1, -1, "Error"); }
    print(p) {
        p.print("ERROR");
    }
    interpret(i) {
        return i.createErrorMemo("Error grammar node", []);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNRuleUse extends GrammarNode {
    ruleName;
    constructor(from, to, idSuffix, ruleName) {
        super(from, to, `RuleUse '${ruleName}' ${idSuffix}`);
        this.ruleName = ruleName;
    }
    print(p) {
        p.print(this.ruleName);
    }
    interpret(i) {
        const rule = i.getRule(this.ruleName);
        if (rule == null) {
            return i.createErrorMemo(`Rule '${this.ruleName}' not found.`, []);
        }
        const from = i.cursor;
        i.guardAgainstLeftRecursion(this.ruleName, this.from, this.to);
        const result = i.interpretNode(rule);
        i.unguardAgainstLeftRecursion(this.ruleName);
        i.guardAgainstInfiniteLoops(this.from, this.to);
        if ("error" in result) {
            i.cursor = from;
            return i.createErrorMemo(`Rule '${this.ruleName}' failed. ${result.error}`, [result]);
        }
        return i.createOKMemo(i.cursor - from, result.astNodes, [result]);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNSet extends GrammarNode {
    negated;
    set;
    constructor(from, to, idSuffix, negated, set) {
        super(from, to, "Set " + idSuffix);
        this.negated = negated;
        this.set = set;
    }
    print(p) {
        if (this.negated) {
            p.print("[^");
        }
        else {
            p.print("[");
        }
        this.set.forEach(c => p.printEscaping(c));
        p.print("]");
    }
    interpret(i) {
        if (i.atEOF()) {
            return i.createErrorMemo("EOF reached", []);
        }
        const from = i.cursor;
        const char = i.readChar();
        const inSet = this.set.has(char) != this.negated;
        if (inSet) {
            i.leftRecurcursionNotPossible();
            if (i.showTerminals > 0) {
                const astNode = i.createTerminal(from, this);
                const memoInfo = i.createOKMemo(1, [astNode], []);
                astNode.memoInfo = memoInfo; // parseNode() will set grammarNode property later.
                return memoInfo;
            }
            return i.createOKMemo(1, [], []);
        }
        i.cursor = from;
        return i.createErrorMemo("Character not in set", []);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNString extends GrammarNode {
    terminals;
    constructor(from, to, idSuffix, terminals) {
        super(from, to, "String " + idSuffix);
        this.terminals = terminals;
    }
    print(p) {
        p.print('"');
        p.printEscaping(this.terminals);
        p.print('"');
    }
    interpret(i) {
        const from = i.cursor;
        for (const char of this.terminals) {
            if (char != i.readChar()) {
                i.cursor = from;
                return i.createErrorMemo(i.atEOF() ? "EOF reached" : `Mismatch of character ${char}`, []);
            }
        }
        i.leftRecurcursionNotPossible();
        if (i.showTerminals > 0) {
            const astNode = i.createTerminal(from, this);
            const memoInfo = i.createOKMemo(this.terminals.length, [astNode], []);
            astNode.memoInfo = memoInfo; // parseNode() will set grammarNode property later.
            return memoInfo;
        }
        return i.createOKMemo(this.terminals.length, [], []);
    }
    getChildren() {
        return { children: [] };
    }
}
class GNSequence extends ChildrenGrammarNode {
    constructor(from, to, idSuffix, children) {
        super(from, to, "Sequence " + idSuffix, children);
        if (children.length < 2) {
            throw new LocatedError("Invalid sequence children.", from, to, undefined);
        }
    }
    print(p) {
        this.listPrint(p, " ");
    }
    interpret(i) {
        const from = i.cursor;
        let count = 0;
        const memos = [];
        for (const child of this.children) {
            const result = i.interpretNode(child);
            memos.push(result);
            if ("error" in result) {
                const location = i.cursor;
                i.cursor = from;
                return i.createErrorMemo(`Sequence failed after parsing ${count} member(s). ${result.error}`, memos, location);
            }
            ++count;
        }
        return i.createOKMemo(i.cursor - from, memos, memos);
    }
}
class GNOrderedOptions extends ChildrenGrammarNode {
    constructor(from, to, idSuffix, children) {
        super(from, to, "Branch " + idSuffix, children);
        if (children.length < 2) {
            throw new LocatedError("Invalid ordered-options children.", from, to, undefined);
        }
    }
    print(p) {
        this.listPrint(p, " / ");
    }
    interpret(i) {
        const from = i.cursor;
        const oldCutting = i.cutting;
        i.cutting = false;
        const memos = [];
        for (const child of this.children) {
            const result = i.interpretNode(child);
            memos.push(result);
            if (!("error" in result)) {
                i.cutting = oldCutting;
                return i.createOKMemo(result.length, result.astNodes, memos);
            }
            i.cursor = from;
            if (i.cutting) {
                i.cutting = oldCutting;
                return i.createErrorMemo("All branches failed before cut.", memos);
            }
        }
        i.cursor = from;
        i.cutting = oldCutting;
        return i.createErrorMemo(`All branches failed.`, memos);
    }
}
class GNZeroOrMore extends ChildWithSeparatorGrammarNode {
    constructor(from, to, idSuffix, toRepeat, separator) {
        super(from, to, "ZeroOrMore " + idSuffix, toRepeat, separator);
    }
    print(p) {
        this.child.print(p);
        p.print("*");
        this.printSeparator(p, true);
    }
    interpret(i) {
        const from = i.cursor;
        const memos = [];
        for (;;) {
            const before = i.cursor;
            const result = i.interpretNode(this.child);
            if ("error" in result) {
                i.cursor = before;
                break;
            }
            memos.push(result);
            i.guardAgainstInfiniteLoops(this.from, this.to);
            const beforeSeparator = i.cursor;
            if (this.separator != null) {
                const result = i.interpretNode(this.separator);
                if ("error" in result) {
                    i.cursor = beforeSeparator;
                    break;
                }
                memos.push(result);
            }
        }
        return i.createOKMemo(i.cursor - from, memos, memos);
    }
}
class GNOneOrMore extends ChildWithSeparatorGrammarNode {
    constructor(from, to, idSuffix, toRepeat, separator) {
        super(from, to, "OneOrMore " + idSuffix, toRepeat, separator);
    }
    print(p) {
        this.child.print(p);
        p.print("+ ");
        this.printSeparator(p, false);
    }
    interpret(i) {
        const from = i.cursor;
        const firstResult = i.interpretNode(this.child);
        if ("error" in firstResult) {
            i.cursor = from;
            return i.createErrorMemo("Mandatory match failed", [firstResult]);
        }
        const memos = [firstResult];
        for (;;) {
            const before = i.cursor;
            const separatorResult = this.separator == null ? undefined : i.interpretNode(this.separator);
            if (separatorResult != null && "error" in separatorResult) {
                i.cursor = before;
                break;
            }
            const result = i.interpretNode(this.child);
            if ("error" in result) {
                i.cursor = before;
                break;
            }
            if (separatorResult != null) {
                memos.push(separatorResult);
            }
            memos.push(result);
            i.guardAgainstInfiniteLoops(this.from, this.to);
        }
        return i.createOKMemo(i.cursor - from, memos, memos);
    }
}
class GNZeroOrOne extends ChildGrammarNode {
    constructor(from, to, idSuffix, expression) {
        super(from, to, "ZeroOrOne " + idSuffix, expression);
    }
    print(p) {
        this.child.print(p);
        p.print("?");
    }
    interpret(i) {
        const from = i.cursor;
        const result = i.interpretNode(this.child);
        if ("error" in result) {
            i.cursor = from;
        }
        return i.createOKMemo(i.cursor - from, [result], [result]);
    }
}
class GNPredicate extends ChildGrammarNode {
    assert;
    constructor(from, to, idSuffix, assert, predicate) {
        super(from, to, (assert ? "And" : "Not") + "-predicate " + idSuffix, predicate);
        this.assert = assert;
    }
    print(p) {
        p.print(this.assert ? "&" : "!");
        this.child.print(p);
    }
    interpret(i) {
        const from = i.cursor;
        const result = i.interpretNode(this.child);
        const okResult = !("error" in result);
        i.cursor = from;
        if (okResult == this.assert) {
            return i.createOKMemo(0, [], [result]);
        }
        return i.createErrorMemo("Predicate failed", [result]);
    }
}
class GNTag extends ChildGrammarNode {
    tagName;
    constructor(from, to, idSuffix, tagName, taggedExpression) {
        super(from, to, `Tag '${tagName}' ` + idSuffix, taggedExpression);
        this.tagName = tagName;
    }
    print(p) {
        p.print(`<${this.tagName}>`);
        this.child.print(p);
        p.print(`</${this.tagName}>`);
    }
    interpret(i) {
        const from = i.cursor;
        const result = i.interpretNode(this.child);
        if ("error" in result) {
            i.cursor = from;
            return i.createErrorMemo("Tag expression failed", [result]);
        }
        const astNode = i.createNonTerminal(this.tagName, from, result.astNodes, this);
        const memoInfo = i.createOKMemo(i.cursor - from, [astNode], [result]);
        astNode.memoInfo = memoInfo; // parseNode() will set grammarNode property later.
        return memoInfo;
    }
}
class GNShowTerminals extends ChildGrammarNode {
    constructor(from, to, idSuffix, expression) {
        super(from, to, "Show " + idSuffix, expression);
    }
    print(p) {
        p.print(`{`);
        this.child.print(p);
        p.print(`}`);
    }
    interpret(i) {
        const from = i.cursor;
        ++i.showTerminals;
        const result = i.interpretNode(this.child);
        --i.showTerminals;
        if ("error" in result) {
            i.cursor = from;
            return i.createErrorMemo("Terminal expression failed", [result]);
        }
        return i.createOKMemo(i.cursor - from, result.astNodes, [result]);
    }
}
class GNCut extends ChildGrammarNode {
    constructor(from, to, idSuffix, expression) {
        super(from, to, "Cut " + idSuffix, expression);
    }
    print(p) {
        this.child.print(p);
        p.print(`,`);
    }
    interpret(i) {
        const from = i.cursor;
        const result = i.interpretNode(this.child);
        if ("error" in result) {
            i.cursor = from;
            return i.createErrorMemo("Cut inner expression failed", [result]);
        }
        i.cutting = true;
        return i.createOKMemo(i.cursor - from, result.astNodes, [result]);
    }
}
class GNPermutation extends ChildrenWithSeparatorGrammarNode {
    exhaustive;
    constructor(from, to, idSuffix, permutationArray, separator, exhaustive) {
        super(from, to, (exhaustive ? "Permutation " : "Options ") + idSuffix, permutationArray, separator);
        this.exhaustive = exhaustive;
    }
    print(p) {
        this.listPrint(p, this.exhaustive ? " ^ " : " . ");
    }
    interpret(i) {
        const from = i.cursor;
        const set = new Set(this.children);
        let productive = true;
        const memos = [];
        while (set.size > 0 && productive) {
            productive = false;
            if (this.separator != null && set.size < this.children.length) {
                const result = i.interpretNode(this.separator);
                if ("error" in result) {
                    break;
                }
                memos.push(result);
            }
            for (const option of this.children) {
                if (!set.has(option)) {
                    continue;
                }
                const result = i.interpretNode(option);
                if (!("error" in result)) {
                    set.delete(option);
                    productive = true;
                    memos.push(result);
                }
            }
        }
        if (productive || // Permutation
            (!this.exhaustive && set.size < this.children.length) // Option
        ) {
            return i.createOKMemo(i.cursor - from, memos, memos);
        }
        i.cursor = from;
        return i.createErrorMemo("Missing " + (this.exhaustive ? "permutation" : "optional") + " elements", memos);
    }
}
//   GGGG  RRRRRR    AAA   MM    MM MM    MM   AAA   RRRRRR  
//  GG  GG RR   RR  AAAAA  MMM  MMM MMM  MMM  AAAAA  RR   RR 
// GG      RRRRRR  AA   AA MM MM MM MM MM MM AA   AA RRRRRR  
// GG   GG RR  RR  AAAAAAA MM    MM MM    MM AAAAAAA RR  RR  
//  GGGGGG RR   RR AA   AA MM    MM MM    MM AA   AA RR   RR 
class Grammar {
    rules = new Map();
    error = new GNError();
    axiom = this.error;
    initializeAxiom() {
        const axiom = this.rules.get(AXIOM_RULE_NAME);
        if (axiom == null) {
            return false;
        }
        this.axiom = axiom;
        return true;
    }
    getAxiom() {
        return this.axiom == this.error ? null : this.axiom;
    }
    checkRules() {
        const result = [];
        const alreadyReported = new Set();
        this.rules.forEach((node, name) => {
            node.recursiveVisit(n => {
                if (n instanceof GNRuleUse
                    && !this.rules.has(n.ruleName)
                    && !specialRules.has(n.ruleName)
                    && !alreadyReported.has(n.ruleName)) {
                    alreadyReported.add(n.ruleName);
                    result.push(new LocatedError(`Rule '${n.ruleName}' is not defined.`, n.from, n.to, undefined));
                }
            });
        });
        return result;
    }
    setRule(name, nameLocation, exp) {
        if (this.rules.has(name)) {
            return new LocatedError(`Redefined rule '${name}'`, nameLocation, nameLocation + name.length, undefined);
        }
        this.rules.set(name, exp);
    }
    getRule(ruleName) {
        return this.rules.get(ruleName);
    }
    getRuleNames() {
        return [...this.rules.keys()];
    }
    print(p) {
        const internalPrinter = new InternalPrinter(p);
        this.rules.forEach((gn, name) => {
            p.print(`${name} = `);
            gn.print(internalPrinter);
            p.print(";\n");
        });
    }
}
//   GGGG  RRRRRR    AAA   MM    MM MM    MM   AAA   RRRRRR  
//  GG  GG RR   RR  AAAAA  MMM  MMM MMM  MMM  AAAAA  RR   RR 
// GG      RRRRRR  AA   AA MM MM MM MM MM MM AA   AA RRRRRR  
// GG   GG RR  RR  AAAAAAA MM    MM MM    MM AAAAAAA RR  RR  
//  GGGGGG RR   RR AA   AA MM    MM MM    MM AA   AA RR   RR 
// PPPPPP    AAA   RRRRRR   SSSSS  EEEEEEE RRRRRR            
// PP   PP  AAAAA  RR   RR SS      EE      RR   RR           
// PPPPPP  AA   AA RRRRRR   SSSSS  EEEEE   RRRRRR            
// PP      AAAAAAA RR  RR       SS EE      RR  RR            
// PP      AA   AA RR   RR  SSSSS  EEEEEEE RR   RR           
const specialRules = new Map([
    ["WS", new GNWhiteSpace()],
    ["EOF", new GNEOF()],
    ["ANY", new GNAnyCharNotEOF()],
    ["EPSILON", new GNEpsilon()],
    ["ERORR", new GNError()],
]);
function isWS(c) { return c != null && /\s/.test(c); }
function isAlpha(c) { return c != null && /[a-zA-Z_]/.test(c); }
function isAlphanum(c) { return c != null && /[0-9a-zA-Z_]/.test(c); }
function ruleModifierFromName(name) {
    switch (name) {
        case "infixing": return { pre: false, inf: true, suf: false };
        case "allfixing": return { pre: true, inf: true, suf: true };
        case "prefixing": return { pre: true, inf: true, suf: false };
        case "suffixing": return { pre: false, inf: true, suf: true };
        case "appending": return { pre: false, inf: false, suf: true };
        case "prepending": return { pre: true, inf: false, suf: false };
        case "surrounding": return { pre: true, inf: false, suf: true };
    }
    return undefined;
}
class GrammarParser {
    cursor = 0;
    grammar = new Grammar();
    code = "";
    errors = [];
    nodeCount = 0;
    constructor() { }
    getGrammar() { return this.grammar; }
    getErrors() { return this.errors; }
    uid() { return String(this.nodeCount++); }
    // axiom ::= rule*
    parse(code) {
        this.code = code;
        this.cursor = 0;
        this.errors.length = 0;
        this.grammar = new Grammar();
        this.skipWS();
        while (this.cursor < this.code.length) {
            this.parseRule(false, false, false, null);
            this.skipWS();
        }
        this.skipWS();
        if (this.cursor != this.code.length) {
            this.error("Garbage after last rule.");
        }
        if (!this.grammar.initializeAxiom()) {
            this.error(`Rule '${AXIOM_RULE_NAME}' is not defined.`);
        }
        this.errors.push(...this.grammar.checkRules());
        return this.errors.length == 0;
    }
    // rule ::= modifier modified_rules ";" / identifier (":=" | "=") expression ";"
    parseRule(pre, inf, suf, infix) {
        const from = this.cursor;
        const name = this.readIdentifier();
        if (name == null) {
            this.error("Expecting rule name.");
            this.skipToAfterSemicolon();
            return;
        }
        if (specialRules.has(name)) {
            this.error("Rule name is reserved.");
            this.skipToAfterSemicolon();
            return;
        }
        if (this.grammar.getRule(name) != null) {
            this.error("Rule name already used.");
            this.skipToAfterSemicolon();
            return;
        }
        // Check if is a block of modified rules
        const ruleModifier = ruleModifierFromName(name);
        if (ruleModifier != null) {
            if (infix != null) {
                this.error("Nesting a rule modifier.");
                this.skipToAfterSemicolon();
                return;
            }
            return this.parseModifiedRules(ruleModifier);
        }
        this.skipWS();
        let wrap;
        if (this.cursor < this.code.length && this.code[this.cursor] == ':') {
            if (!this.matchTerminals(":=", "Expecting := after rule name.")) {
                this.skipToAfterSemicolon();
                return;
            }
            wrap = true;
        }
        else {
            if (!this.matchTerminals("=", "Expecting = after rule name.")) {
                this.skipToAfterSemicolon();
                return;
            }
            wrap = false;
        }
        let exp = this.parseFullExpression(inf ? infix : null);
        if (exp == null) {
            this.skipToAfterSemicolon();
            return;
        }
        if (infix != null) {
            const seqArray = pre ? [infix, exp] : [exp];
            if (suf) {
                seqArray.push(infix);
            }
            if (seqArray.length == 1) {
                exp = seqArray[0];
            }
            else {
                exp = new GNSequence(exp.from, exp.to, this.uid(), seqArray);
            }
        }
        if (!this.matchTerminals(";", "Expecting rule terminator ;")) {
            this.skipToAfterSemicolon();
            return;
        }
        if (RESERVED_RULE_NAMES.includes(name)) {
            this.error(`Name ${name} is reserved.`);
            return;
        }
        this.grammar.setRule(name, from, wrap ? new GNTag(from, this.cursor, this.uid(), name, exp) : exp);
    }
    // modified_rules ::= identifier "do" rule* "done"
    parseModifiedRules({ pre, inf, suf }) {
        const from = this.cursor;
        const name = this.readIdentifier();
        if (name == null) {
            this.error("Expecting the inserted rule name.");
            this.skipAfterDone();
            return;
        }
        const ruleUse = new GNRuleUse(from, this.cursor, this.uid(), name);
        if (!this.matchTerminals("do", true)) {
            this.skipAfterDone();
            return;
        }
        while (this.cursor < this.code.length && !this.matchTerminals("done", false)) {
            this.parseRule(pre, inf, suf, ruleUse);
        }
    }
    // fullexpr ::= branch ("/" branch)*
    parseFullExpression(infix) {
        const begin = this.cursor;
        const branchArray = [];
        do {
            this.skipWS();
            if (!this.isStartOfElementExpression()) {
                break;
            }
            const branch = this.parseBranchExpression(infix);
            if (branch == null) {
                this.skipToOneOf("/;");
            }
            else {
                branchArray.push(branch);
            }
        } while (this.matchTerminals("/", false));
        if (branchArray.length == 0) {
            return null;
        }
        if (branchArray.length == 1) {
            return branchArray[0];
        }
        return new GNOrderedOptions(begin, this.cursor, this.uid(), branchArray);
    }
    // branch ::= element+
    parseBranchExpression(infix) {
        const from = this.cursor;
        const elem = this.parseElementExpression(infix);
        if (elem == null) {
            return;
        }
        this.skipWS();
        const seqArray = [elem];
        while (this.isStartOfElementExpression()) {
            if (infix != null) {
                seqArray.push(infix);
            }
            const elem = this.parseElementExpression(infix);
            if (elem == null) {
                return;
            }
            seqArray.push(elem);
            this.skipWS();
        }
        return seqArray.length == 1 ? seqArray[0] : new GNSequence(from, this.cursor, this.uid(), seqArray);
    }
    isStartOfElementExpression() {
        if (this.cursor >= this.code.length) {
            return false;
        }
        if (isAlpha(this.code[this.cursor])) {
            return true;
        }
        if (this.code[this.cursor] == "<") {
            if (this.cursor + 1 >= this.code.length) {
                return false;
            }
            return this.code[this.cursor + 1] != "/";
        }
        return '([{&!#"'.includes(this.code[this.cursor]);
    }
    // element ::= extended "%" extended
    parseElementExpression(infix) {
        let result = this.parseExtendedExpression(infix);
        if (result == null) {
            return;
        }
        if (!this.matchTerminals("%", false)) {
            return result;
        }
        const from = this.cursor;
        let right = this.parseExtendedExpression(infix);
        if (right == null) {
            return;
        }
        if (infix != null) {
            right = new GNSequence(from, this.cursor, this.uid(), [infix, right, infix]);
        }
        result = result.replaceSeparator(right, this.cursor);
        if (result == null) {
            this.error("Separator applied to invalid expression.");
            return;
        }
        return result;
    }
    readArrayOfPrefixExpressions(left, separator, infix) {
        const array = [left];
        while (this.cursor < this.code.length && this.code[this.cursor] == separator) {
            ++this.cursor;
            this.skipWS();
            const right = this.parsePrefixExpression(infix);
            if (right == null) {
                return;
            }
            this.skipWS();
            array.push(right);
        }
        return array;
    }
    // extended ::= pre (("^" / ".") pre)*
    parseExtendedExpression(infix) {
        const begin = this.cursor;
        const prefix = this.parsePrefixExpression(infix);
        if (prefix == null) {
            return;
        }
        let left = prefix;
        this.skipWS();
        if (this.cursor >= this.code.length) {
            return left;
        }
        switch (this.code[this.cursor]) {
            case '^': {
                const permutationArray = this.readArrayOfPrefixExpressions(left, '^', infix);
                if (permutationArray == null) {
                    return;
                }
                return new GNPermutation(begin, this.cursor, this.uid(), permutationArray, infix, true);
            }
            case '.': {
                const optionArray = this.readArrayOfPrefixExpressions(left, '.', infix);
                if (optionArray == null) {
                    return;
                }
                return new GNPermutation(begin, this.cursor, this.uid(), optionArray, infix, false);
            }
            default: return left;
        }
    }
    // pre ::= "&" pre / "!" pre / "#" pre / post
    parsePrefixExpression(infix) {
        const from = this.cursor;
        if (this.matchTerminals("&", false)) {
            const pre = this.parsePrefixExpression(infix);
            if (pre == null) {
                return;
            }
            return new GNPredicate(from, this.cursor, this.uid(), true, pre);
        }
        if (this.matchTerminals("!", false)) {
            const pre = this.parsePrefixExpression(infix);
            if (pre == null) {
                return;
            }
            return new GNPredicate(from, this.cursor, this.uid(), false, pre);
        }
        return this.parsePostfixExpression(infix);
    }
    // post ::= atom ("*" / "+" / "?" / ",")*
    parsePostfixExpression(infix) {
        const from = this.cursor;
        const primary = this.parsePrimaryExpression(infix);
        if (primary == null) {
            return;
        }
        let result = primary;
        for (;;) {
            if (this.matchTerminals("*", false)) {
                result = new GNZeroOrMore(from, this.cursor, this.uid(), result, infix ?? undefined);
            }
            else if (this.matchTerminals("+", false)) {
                result = new GNOneOrMore(from, this.cursor, this.uid(), result, infix ?? undefined);
            }
            else if (this.matchTerminals("?", false)) {
                result = new GNZeroOrOne(from, this.cursor, this.uid(), result);
            }
            else if (this.matchTerminals(",", false)) {
                result = new GNCut(from, this.cursor, this.uid(), result);
            }
            else {
                return result;
            }
        }
    }
    // atom ::= id / string / range / "(" fullexpr ")" / "{" fullexpr "}" / "<" id ">" fullexpr "</" id ">"
    parsePrimaryExpression(infix) {
        if (this.cursor < this.code.length) {
            switch (this.code[this.cursor]) {
                case '"': return this.parseString();
                case '[': return this.parseRange();
                case '(': return this.parseParentheses(infix);
                case '{': return this.parseShowTerminals(infix);
                case '<': return this.parseTaggedExpression(infix);
            }
            const from = this.cursor;
            const id = this.readIdentifier();
            if (id != null) {
                return new GNRuleUse(from, this.cursor, this.uid(), id);
            }
        }
        this.error("Expecting a primary expression.");
    }
    parseString() {
        const from = this.cursor;
        ++this.cursor; // Skip "
        let result = "";
        while (this.cursor < this.code.length) {
            const c = this.code[this.cursor];
            if (c == '"') {
                break;
            }
            if (c != '\\') {
                result += c;
                ++this.cursor;
                continue;
            }
            // Escaped string
            ++this.cursor;
            if (this.cursor >= this.code.length) {
                this.error("String reaches end of file.");
                return;
            }
            const escaped = this.readEscaped();
            if (escaped == null) {
                return;
            }
            result += escaped;
        }
        if (this.cursor >= this.code.length) {
            this.error("String reaches end of file.");
            return;
        }
        ++this.cursor; // Skip quote
        return new GNString(from, this.cursor, this.uid(), result);
    }
    readEscaped() {
        if (this.cursor >= this.code.length) {
            return undefined;
        }
        switch (this.code[this.cursor]) {
            case 'n':
                ++this.cursor;
                return "\n";
            case 'r':
                ++this.cursor;
                return "\r";
            case 't':
                ++this.cursor;
                return "\t";
            case '\\':
                ++this.cursor;
                return "\\";
            case '^':
                ++this.cursor;
                return "^";
            case '[':
                ++this.cursor;
                return "[";
            case ']':
                ++this.cursor;
                return "]";
            case '-':
                ++this.cursor;
                return "-";
            case '"':
                ++this.cursor;
                return '"';
        }
        return undefined;
    }
    parseRange() {
        const from = this.cursor;
        ++this.cursor; // Skip [
        if (this.cursor >= this.code.length) {
            return undefined;
        }
        const negated = this.code[this.cursor] == '^';
        if (negated) {
            ++this.cursor;
        }
        const set = new Set();
        if (!this.parseRangeElement(set)) {
            this.error("Expecting a range element.");
            return;
        }
        while (this.parseRangeElement(set))
            ;
        if (this.cursor >= this.code.length) {
            this.error("End of file reached inside a range");
            return;
        }
        this.matchTerminals("]", true);
        return new GNSet(from, this.cursor, this.uid(), negated, set);
    }
    rangeEscape(char) {
        if (char != '\\') {
            return char;
        }
        const escaped = this.readEscaped();
        if (escaped == null) {
            this.error("Unknown escape sequence.");
            return undefined;
        }
        return escaped;
    }
    parseRangeElement(set) {
        if (this.cursor >= this.code.length) {
            return false;
        }
        let first = this.code[this.cursor];
        if (first == ']') {
            return false;
        }
        ++this.cursor; // skip first
        first = this.rangeEscape(first);
        if (first == null) {
            return false;
        }
        if (this.cursor >= this.code.length) {
            this.error("Unexpected end of file in a range.");
            return false;
        }
        if (this.code[this.cursor] != '-') {
            set.add(first);
            return true;
        }
        ++this.cursor; // Skip -
        if (this.cursor >= this.code.length) {
            this.error("Unexpected end of file in a range.");
            return false;
        }
        let last = this.code[this.cursor];
        ++this.cursor;
        last = this.rangeEscape(last);
        if (last == null) {
            return false;
        }
        if (last.charCodeAt(0) < first.charCodeAt(0)) {
            this.error("Empty character interval.");
            return false;
        }
        for (let code = first.charCodeAt(0); code <= last.charCodeAt(0); ++code) {
            set.add(String.fromCharCode(code));
        }
        return true;
    }
    parseParentheses(infix) {
        ++this.cursor; // Skip (
        const expr = this.parseFullExpression(infix);
        if (expr == null) {
            return;
        }
        if (!this.matchTerminals(")", true)) {
            return;
        }
        return expr;
    }
    parseShowTerminals(infix) {
        const from = this.cursor;
        ++this.cursor; // Skip {
        const expr = this.parseFullExpression(infix);
        if (expr == null) {
            return;
        }
        if (!this.matchTerminals("}", true)) {
            return;
        }
        return new GNShowTerminals(from, this.cursor, this.uid(), expr);
    }
    parseTaggedExpression(infix) {
        const from = this.cursor;
        ++this.cursor; // Skip <
        const tag = this.readIdentifier();
        if (tag.length == 0) {
            this.error("Expecting a tag name.");
            return;
        }
        if (!this.matchTerminals(">", "Expecting closing >")) {
            return;
        }
        const expr = this.parseFullExpression(infix);
        if (expr == null) {
            return;
        }
        if (!this.matchTerminals("</", "Expecting </ after tagged expression")) {
            return;
        }
        if (!this.matchTerminals(tag, "Mismatched tag name")) {
            return;
        }
        if (!this.matchTerminals(">", "Expecting closing >")) {
            return;
        }
        return new GNTag(from, this.cursor, this.uid(), tag, expr);
    }
    readIdentifier() {
        this.skipWS();
        if (this.cursor >= this.code.length) {
            return undefined;
        }
        const start = this.cursor;
        if (!isAlpha(this.code[this.cursor])) {
            return undefined;
        }
        ++this.cursor;
        while (this.cursor < this.code.length && isAlphanum(this.code[this.cursor])) {
            ++this.cursor;
        }
        if (start == this.cursor) {
            return undefined;
        }
        return this.code.slice(start, this.cursor);
    }
    matchTerminals(terminals, reportError) {
        if (terminals.length == 0) {
            return this.error("INTERNAL: Invalid argument to Parser#matchTerminals()");
        }
        this.skipWS();
        if (this.code.length - this.cursor < terminals.length) {
            return false;
        }
        const from = this.cursor;
        for (let k = 0; k < terminals.length; ++k) {
            if (terminals[k] != this.code[this.cursor + k]) {
                this.cursor = from;
                if (reportError == true) {
                    return this.error(`Expected '${terminals}'`);
                }
                if (reportError == false) {
                    return false;
                }
                return this.error(reportError);
            }
        }
        this.cursor += terminals.length;
        return true;
    }
    skipToAfterSemicolon() {
        while (this.cursor < this.code.length) {
            if (this.code[this.cursor] == ';') {
                ++this.cursor;
                return;
            }
            ++this.cursor;
        }
    }
    skipAfterDone() {
        while (this.cursor < this.code.length) {
            if (this.code[this.cursor] != 'd') {
                ++this.cursor;
                continue;
            }
            if (this.matchTerminals("done", false)) {
                return;
            }
            ++this.cursor;
        }
    }
    skipToOneOf(set) {
        while (this.cursor < this.code.length) {
            if (set.includes(this.code[this.cursor])) {
                return;
            }
            ++this.cursor;
        }
    }
    skipWS() {
        for (;;) {
            while (this.cursor < this.code.length && isWS(this.code[this.cursor])) {
                ++this.cursor;
            }
            if (this.cursor < this.code.length && this.code[this.cursor] == '/') {
                if (!this.skipComments()) {
                    return;
                }
            }
            else {
                return;
            }
        }
    }
    skipComments() {
        // Skip single line comment
        if (this.code[this.cursor + 1] == '/') {
            this.cursor += 2;
            while (this.cursor < this.code.length && this.code[this.cursor] != '\n') {
                ++this.cursor;
            }
            return true;
        }
        // Skip block comment
        if (this.code[this.cursor + 1] == '*') {
            this.cursor += 2;
            while (this.cursor < this.code.length &&
                (this.code[this.cursor] != '*' || this.code[this.cursor + 1] != '/')) {
                ++this.cursor;
            }
            if (this.cursor >= this.code.length) {
                return false;
            }
            this.cursor += 2;
            return true;
        }
        // Not a comment
        return false;
    }
    error(description, at, length) {
        if (at == null) {
            at = this.cursor;
        }
        if (length == null) {
            length = 1;
        }
        this.errors.push(new LocatedError(description, at, at + length, undefined));
        return false;
    }
}
// IIIII NN   NN TTTTTTT EEEEEEE RRRRRR  PPPPPP  RRRRRR  EEEEEEE TTTTTTT EEEEEEE RRRRRR  
//  III  NNN  NN   TTT   EE      RR   RR PP   PP RR   RR EE        TTT   EE      RR   RR 
//  III  NN N NN   TTT   EEEEE   RRRRRR  PPPPPP  RRRRRR  EEEEE     TTT   EEEEE   RRRRRR  
//  III  NN  NNN   TTT   EE      RR  RR  PP      RR  RR  EE        TTT   EE      RR  RR  
// IIIII NN   NN   TTT   EEEEEEE RR   RR PP      RR   RR EEEEEEE   TTT   EEEEEEE RR   RR 
class Interpreter {
    rootAST = { from: -1, to: -1, name: "ERROR", children: undefined, grammarNode: specialRules.get("WS") };
    memo = new Map();
    grammar = new Grammar();
    error = new LocatedError("None", 0, 0, undefined);
    cursor = 0;
    code = "";
    cutting = false;
    showTerminals = 0;
    memoCount = 0;
    usedLeftRecursionRules = new Set();
    allowedLoopSteps = 10_000_000;
    interpret(code, grammar) {
        this.code = code;
        this.grammar = grammar;
        const axiom = grammar.getAxiom();
        if (axiom == null) {
            this.error = new LocatedError("Invalid grammar", 0, 0, undefined);
            return false;
        }
        this.guardAgainstLeftRecursion(AXIOM_RULE_NAME, axiom.from, axiom.to);
        try {
            const result = this.interpretNode(axiom);
            if ("error" in result) {
                this.error = new LocatedError(result.error, result.position, result.position + 1, result.grammarNode);
                return false;
            }
            this.rootAST = this.createNonTerminal("ROOT", 0, result.astNodes, axiom);
            this.rootAST.memoInfo = result;
            return true;
        }
        catch (e) {
            this.error = e instanceof LocatedError ? e : new LocatedError(String(e), 0, 0, undefined);
            return false;
        }
    }
    readChar() {
        return this.code[this.cursor++];
    }
    atEOF() {
        return this.cursor >= this.code.length;
    }
    atWS() {
        return this.cursor < this.code.length && isWS(this.code[this.cursor]);
    }
    guardAgainstLeftRecursion(ruleName, from, to) {
        if (this.usedLeftRecursionRules.has(ruleName)) {
            throw new LocatedError(`Left recursion detected in rules: ${this.getUsedLeftRecursionRuleNames().join(", ")}`, from, to, undefined);
        }
        this.usedLeftRecursionRules.add(ruleName);
        return false;
    }
    unguardAgainstLeftRecursion(ruleName) {
        this.usedLeftRecursionRules.delete(ruleName);
    }
    leftRecurcursionNotPossible() {
        this.usedLeftRecursionRules.clear();
    }
    guardAgainstInfiniteLoops(from, to) {
        if (--this.allowedLoopSteps <= 0) {
            throw new LocatedError("Loop count exceeded limit.", from, to, undefined);
        }
    }
    getUsedLeftRecursionRuleNames() {
        return [...this.usedLeftRecursionRules];
    }
    createNonTerminal(name, from, children, grammarNode) {
        return { from, to: this.cursor, name, children, grammarNode };
    }
    createTerminal(from, grammarNode) {
        return { from, to: this.cursor, children: [], grammarNode };
    }
    getRule(ruleName) {
        return this.grammar.getRule(ruleName) ?? specialRules.get(ruleName);
    }
    interpretNode(gNode) {
        // Memoization
        let memoAtCursor = this.memo.get(this.cursor);
        if (memoAtCursor != null) {
            const memoOfNode = memoAtCursor.get(gNode);
            if (memoOfNode !== undefined) {
                if ("error" in memoOfNode) {
                    return memoOfNode;
                }
                this.cursor += memoOfNode.length;
                return memoOfNode;
            }
        }
        else {
            memoAtCursor = new Map;
            this.memo.set(this.cursor, memoAtCursor);
        }
        // Interpretation
        const result = gNode.interpret(this);
        result.grammarNode = gNode;
        memoAtCursor.set(gNode, result);
        return result;
    }
    isASTNodeArray(astNodes) {
        return astNodes.length == 0 || !("id" in astNodes[0]);
    }
    createOKMemo(length, astNodes, children) {
        if (!this.isASTNodeArray(astNodes)) {
            astNodes = astNodes.flatMap(memoInfo => "astNodes" in memoInfo ? memoInfo.astNodes : []);
        }
        return { position: this.cursor - length, length, children, astNodes, id: this.memoCount++ };
    }
    createErrorMemo(error, children, position) {
        return { position: position ?? this.cursor, error, children, id: this.memoCount++ };
    }
}
//# sourceMappingURL=pegtest.js.map
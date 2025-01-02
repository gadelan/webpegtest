




// IIIII NN   NN TTTTTTT EEEEEEE RRRRRR  FFFFFFF   AAA    CCCCC  EEEEEEE 
//  III  NNN  NN   TTT   EE      RR   RR FF       AAAAA  CC    C EE      
//  III  NN N NN   TTT   EEEEE   RRRRRR  FFFF    AA   AA CC      EEEEE   
//  III  NN  NNN   TTT   EE      RR  RR  FF      AAAAAAA CC    C EE      
// IIIII NN   NN   TTT   EEEEEEE RR   RR FF      AA   AA  CCCCC  EEEEEEE 

export type ASTNode = {
    from: number
    to: number
    name?: string
    children: ASTNode[] | undefined
    memoInfo?: MemoInfo
    grammarNode: GrammarNodeIface
}

type IncompleteMemoInfoBase = {
    id: number
    children: MemoInfo[]
    position: number
}

type IncompleteMemoInfoOk = IncompleteMemoInfoBase & {
    length: number
    astNodes: ASTNode[]
    resultASTNode?: ASTNode
}

type IncompleteMemoInfoError = IncompleteMemoInfoBase & {
    error: string
}
type IncompleteMemoInfo = IncompleteMemoInfoOk | IncompleteMemoInfoError

export type MemoInfoOK = IncompleteMemoInfoOk & { grammarNode: GrammarNodeIface }
export type MemoInfoError = IncompleteMemoInfoError & { grammarNode: GrammarNodeIface }

export type MemoInfo = MemoInfoOK | MemoInfoError



export class LocatedError extends Error
{
    /** grammarNode is null when from/to refers to the grammar. Otherwise, they point to the input. */
    constructor(
        message: string,
        public from: number,
        public to: number,
        public grammarNode: GrammarNodeIface | undefined,
        options?: ErrorOptions
    ) {
        super(message, options)
    }
}

export type PrinterIface = {
    print(s: string): void
}

export type GrammarIface = {
    print(p: PrinterIface)
    getRule(ruleName: string): GrammarNodeIface | undefined
    getRuleNames(): string[]
}

export type ChildrenInfo = {
    children: GrammarNodeIface[]
    separator?: GrammarNodeIface
}

export type GrammarNodeIface = {
    id: string
    from: number
    to: number
    getChildren(): ChildrenInfo
}

export type MemoMaps = Map<number, Map<GrammarNodeIface, MemoInfo>>

export type InputResult = {
    root: ASTNode
    parsedToLocation: number
    memo: MemoMaps
} | {
    error: LocatedError
    memo: MemoMaps
}

export function parseGrammar(grammarCode: string): GrammarIface | LocatedError[]
{
    const parser = new GrammarParser()
    if(parser.parse(grammarCode)) {
        return parser.getGrammar()
    }
    return parser.getErrors()
}

export function parseInput(grammar: GrammarIface, inputCode: string): InputResult
{
    const interpreter = new Interpreter()
    if(interpreter.interpret(inputCode, grammar as Grammar)) {
        return {root: interpreter.rootAST, memo: interpreter.memo, parsedToLocation: interpreter.cursor }
    }
    return {error: interpreter.error, memo: interpreter.memo }
}


// MM    MM IIIII  SSSSS   CCCCC  
// MMM  MMM  III  SS      CC    C 
// MM MM MM  III   SSSSS  CC      
// MM    MM  III       SS CC    C 
// MM    MM IIIII  SSSSS   CCCCC  
                               


const AXIOM_RULE_NAME = "start"

const RESERVED_RULE_NAMES = ["WS", "EOF", "EPSILON"]


class InternalPrinter
{
    public constructor(private output: PrinterIface) {}

    public print(s: string): void
    {
        this.output.print(s)
    }

    public printEscaping(s: string): void
    {
        for(const char of s) {
            this.print(this.escapeChar(char))
        }
    }

    private escapeChar(c: string): string
    {
        switch(c) {
            case '\n':  return "\\n"
            case '\r':  return "\\t"
            case '\t':  return "\\t"
            case '\\': return "\\\\"
            case '^':  return "\\^"
            case '[':  return "\\["
            case ']':  return "\\]"
            case '-':  return "\\-"
            case '"':  return '\\"'
        }
        return c
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


abstract class GrammarNode implements GrammarNodeIface
{
    protected constructor(public readonly from: number, public readonly to: number, public readonly id: string) {
    }

    public abstract print(p: InternalPrinter): void
    public abstract interpret(i: Interpreter): IncompleteMemoInfo
    public abstract getChildren(): ChildrenInfo

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode)=> void) {
        visitingFunction(this)
    }

    public replaceSeparator(separator: GrammarNode, toPosition: number): GrammarNode | undefined {
        return // Fail by default
    }
}

abstract class ChildGrammarNode extends GrammarNode
{
    protected constructor(from: number, to: number, id: string, protected child: GrammarNode)
    {
        super(from, to, id)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode) => void): void {
        visitingFunction(this)
        this.child.recursiveVisit(visitingFunction)
    }

    public override getChildren(): ChildrenInfo {
        return {children: [this.child]};
    }
}

abstract class WithSeparatorGrammarNode extends GrammarNode
{
    protected constructor(
        from: number, to: number, id: string, protected separator?: GrammarNode
    ) {
        super(from, to, id)
    }

    public replaceSeparator(separator: GrammarNode, toPosition: number): GrammarNode | undefined {
        this.separator = separator
        ;(this as any).to = toPosition
        return this
    }

    protected printSeparator(p: InternalPrinter, addSpace: boolean) {
        if(this.separator == null) { return }
        p.print(addSpace ? " % " : "% ")
        this.separator.print(p)
    }
}

abstract class ChildWithSeparatorGrammarNode extends WithSeparatorGrammarNode
{
    protected constructor(
        from: number, to: number, id: string, protected child: GrammarNode, separator?: GrammarNode
    ) {
        super(from, to, id, separator)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode) => void): void {
        visitingFunction(this)
        this.child.recursiveVisit(visitingFunction)
        if(this.separator != null) {
            this.separator.recursiveVisit(visitingFunction)
        }
    }

    public override getChildren(): ChildrenInfo {
        return {children: [this.child], separator: this.separator };
    }
}

abstract class ChildrenGrammarNode extends GrammarNode
{
    public constructor(from: number, to: number, id: string, protected children: GrammarNode[]) {
        super(from, to, id)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode) => void): void {
        visitingFunction(this)
        this.children.forEach(child => child.recursiveVisit(visitingFunction))
    }

    protected listPrint(p: InternalPrinter, separator: string): void
    {
        p.print("(")
        this.children.forEach((c, x) => {
            if(x > 0) { p.print(separator) }
            c.print(p)
        })
        p.print(")")
    }

    public override getChildren(): ChildrenInfo {
        return {children: this.children}
    }
}

abstract class ChildrenWithSeparatorGrammarNode extends WithSeparatorGrammarNode
{
    public constructor(from: number, to: number, id: string, protected children: GrammarNode[], separator?: GrammarNode) {
        super(from, to, id, separator)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode) => void): void {
        visitingFunction(this)
        this.children.forEach(child => child.recursiveVisit(visitingFunction))
        if(this.separator != null) {
            this.separator.recursiveVisit(visitingFunction)
        }
    }

    protected listPrint(p: InternalPrinter, separator: string): void
    {
        p.print("(")
        this.children.forEach((c, x) => {
            if(x != 0) { p.print(separator) }
            c.print(p)
        })
        this.printSeparator(p, true)
        p.print(")")
    }

    public override getChildren(): ChildrenInfo {
        return {children: this.children, separator: this.separator };
    }
}

// ===============================================================================================================
// CONCRETE
// ===============================================================================================================


class GNEOF extends GrammarNode
{
    public constructor() { super(-1, -1, "EOF") }

    public print(p: InternalPrinter): void
    {
        p.print("EOF")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo {
        if(i.atEOF()) { return i.createOKMemo(0, [], []) }
        return i.createErrorMemo("Not at EOF", [])
    }
    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNEpsilon extends GrammarNode
{
    public constructor() { super(-1, -1, "Epsilon") }

    public print(p: InternalPrinter): void
    {
        p.print("EPSILON")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        return i.createOKMemo(0, [], [])
    }
    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNAnyCharNotEOF extends GrammarNode
{
    public constructor() { super(-1, -1, "AnyNotEOF") }

    public print(p: InternalPrinter): void
    {
        p.print("ANY")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        if(!i.atEOF()) {
            ++i.cursor
            return i.createOKMemo(1, [], [])
        }
        return i.createErrorMemo("EOF reached", [])
    }
    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNWhiteSpace extends GrammarNode
{
    public constructor() { super(-1, -1, "WhiteSpace") }

    public print(p: InternalPrinter): void
    {
        p.print("WS")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        if(i.atWS()) {
            ++i.cursor
            return i.createOKMemo(1, [], [])
        }
        return i.createErrorMemo("No WS found.", [])
    }
    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNError extends GrammarNode
{
    public constructor() { super(-1, -1, "Error") }

    public print(p: InternalPrinter): void
    {
        p.print("ERROR")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        return i.createErrorMemo("Error grammar node", [])
    }
    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNRuleUse extends GrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, public readonly ruleName: string) {
        super(from, to, `RuleUse '${ruleName}' ${idSuffix}`)
    }

    public print(p: InternalPrinter): void
    {
        p.print(this.ruleName)
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const rule = i.getRule(this.ruleName)
        if(rule == null) { return i.createErrorMemo(`Rule '${this.ruleName}' not found.`, []) }
        const from = i.cursor
        i.guardAgainstLeftRecursion(this.ruleName, this.from, this.to)
        const result = i.interpretNode(rule)
        i.unguardAgainstLeftRecursion(this.ruleName)
        i.guardAgainstInfiniteLoops(this.from, this.to)
        if("error" in result) {
            i.cursor = from
            return i.createErrorMemo(`Rule '${this.ruleName}' failed. ${result.error}`, [result])
        }
        return i.createOKMemo(i.cursor - from, result.astNodes, [result])
    }
    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNSet extends GrammarNode
{
    constructor(from: number, to: number, idSuffix: string, private negated: boolean, private set: Set<string>) {
        super(from, to, "Set " + idSuffix)
    }

    public print(p: InternalPrinter): void
    {
        if(this.negated) { p.print("[^") }
        else             { p.print("[")  }

        this.set.forEach(c => p.printEscaping(c))

        p.print("]")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        if(i.atEOF()) { return i.createErrorMemo("EOF reached", []) }
        const from = i.cursor
        const char = i.readChar()
        const inSet = this.set.has(char) != this.negated
        if(inSet) {
            i.leftRecurcursionNotPossible()
            if(i.showTerminals > 0) {
                const astNode = i.createTerminal(from, this)
                const memoInfo = i.createOKMemo(1, [astNode], [])
                astNode.memoInfo = memoInfo as MemoInfo // parseNode() will set grammarNode property later.
                return memoInfo
            }
            return i.createOKMemo(1, [], [])
    }
        i.cursor = from
        return i.createErrorMemo("Character not in set", [])
    }
    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNString extends GrammarNode
{
    constructor(from: number, to: number, idSuffix: string, private terminals: string) {
        super(from, to, "String " + idSuffix)
    }

    public print(p: InternalPrinter): void
    {
        p.print('"')
        p.printEscaping(this.terminals)
        p.print('"')
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        for(const char of this.terminals) {
            if(char != i.readChar()) {
                i.cursor = from
                return i.createErrorMemo(i.atEOF() ? "EOF reached" : `Mismatch of character ${char}`, [] )
            }
        }
        i.leftRecurcursionNotPossible()
        if(i.showTerminals > 0) {
            const astNode = i.createTerminal(from, this)
            const memoInfo = i.createOKMemo(this.terminals.length, [astNode], [])
            astNode.memoInfo = memoInfo as MemoInfo // parseNode() will set grammarNode property later.
            return memoInfo
        }
        return i.createOKMemo(this.terminals.length, [], [])
}

    public override getChildren(): ChildrenInfo {
        return {children: []}
    }
}

class GNSequence extends ChildrenGrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, children: GrammarNode[]) {
        super(from, to, "Sequence " + idSuffix, children)
        if(children.length < 2) { throw new LocatedError("Invalid sequence children.", from, to, undefined)}
    }

    public print(p: InternalPrinter): void
    {
        this.listPrint(p, " ")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        let count = 0
        const memos: MemoInfo[] = []
        for(const child of this.children) {
            const result = i.interpretNode(child)
            memos.push(result)
            if("error" in result) {
                const location = i.cursor
                i.cursor = from
                return i.createErrorMemo(
                    `Sequence failed after parsing ${count} member(s). ${result.error}`, memos, location
                )
            }
            ++count
        }
        return i.createOKMemo(i.cursor - from, memos, memos)
    }
}

class GNOrderedOptions extends ChildrenGrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, children: GrammarNode[]) {
        super(from, to, "Branch " + idSuffix, children)
        if(children.length < 2) { throw new LocatedError("Invalid ordered-options children.", from, to, undefined)}
    }

    public print(p: InternalPrinter): void
    {
        this.listPrint(p, " / ")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const oldCutting = i.cutting
        i.cutting = false
        const memos: MemoInfo[] = []
        for(const child of this.children) {
            const result = i.interpretNode(child)
            memos.push(result)
            if(!("error" in result)) {
                i.cutting = oldCutting
                return i.createOKMemo(result.length, result.astNodes, memos)
            }
            i.cursor = from
            if(i.cutting) {
                i.cutting = oldCutting
                return i.createErrorMemo("All branches failed before cut.", memos)
            }
        }
        i.cursor = from
        i.cutting = oldCutting
        return i.createErrorMemo(`All branches failed.`, memos)
    }
}

class GNZeroOrMore extends ChildWithSeparatorGrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, toRepeat: GrammarNode, separator?: GrammarNode) {
        super(from, to, "ZeroOrMore " + idSuffix, toRepeat, separator)
    }

    public print(p: InternalPrinter): void
    {
        this.child.print(p)
        p.print("*")
        this.printSeparator(p, true)
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const memos: MemoInfo[] = []
        for(;;){
            const before = i.cursor
            const result = i.interpretNode(this.child)
            if("error" in result) {
                i.cursor = before
                break
            }
            memos.push(result)
            i.guardAgainstInfiniteLoops(this.from, this.to)

            const beforeSeparator = i.cursor
            if(this.separator != null) {
                const result = i.interpretNode(this.separator)
                if("error" in result) { i.cursor = beforeSeparator; break }
                memos.push(result)
            }
        }
        return i.createOKMemo(i.cursor - from, memos, memos)
    }
}

class GNOneOrMore extends ChildWithSeparatorGrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, toRepeat: GrammarNode, separator?: GrammarNode) {
        super(from, to, "OneOrMore " + idSuffix, toRepeat, separator)
    }

    public print(p: InternalPrinter): void
    {
        this.child.print(p)
        p.print("+ ")
        this.printSeparator(p, false)
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const firstResult = i.interpretNode(this.child)
        if("error" in firstResult) {
            i.cursor = from
            return i.createErrorMemo("Mandatory match failed", [firstResult])
        }
        const memos: MemoInfo[] = [firstResult]
        for(;;){
            const before = i.cursor
            const separatorResult = this.separator == null ? undefined : i.interpretNode(this.separator)
            if(separatorResult != null && "error" in separatorResult) { i.cursor = before; break }
            const result = i.interpretNode(this.child)
            if("error" in result) { i.cursor = before; break }
            if(separatorResult != null) { memos.push(separatorResult) }
            memos.push(result)
            i.guardAgainstInfiniteLoops(this.from, this.to)
        }
        return i.createOKMemo(i.cursor - from, memos, memos)
    }
}

class GNZeroOrOne extends ChildGrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, expression: GrammarNode) {
        super(from, to, "ZeroOrOne " + idSuffix, expression)
    }

    public print(p: InternalPrinter): void
    {
        this.child.print(p)
        p.print("?")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const result = i.interpretNode(this.child)
        if("error" in result) { i.cursor = from }
        return i.createOKMemo(i.cursor - from, [result], [result])
    }
}

class GNPredicate extends ChildGrammarNode {
    public constructor(from: number, to: number, idSuffix: string, private assert: boolean, predicate: GrammarNode)
    {
        super(from, to, (assert ? "And" : "Not") + "-predicate "+ idSuffix, predicate)
    }

    public print(p: InternalPrinter): void
    {
        p.print(this.assert ? "&" : "!")
        this.child.print(p)
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const result = i.interpretNode(this.child)
        const okResult = !("error" in result)
        i.cursor = from
        if(okResult == this.assert) { return i.createOKMemo(0, [], [result]) }
        return i.createErrorMemo("Predicate failed", [result])
    }
}

class GNTag extends ChildGrammarNode {
    public constructor(
        from: number, to: number, idSuffix: string, private tagName: string, taggedExpression: GrammarNode
    ) {
        super(from, to, `Tag '${tagName}' ` + idSuffix, taggedExpression)
    }

    public print(p: InternalPrinter): void
    {
        p.print(`<${this.tagName}>`)
        this.child.print(p)
        p.print(`</${this.tagName}>`)
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const result = i.interpretNode(this.child)
        if("error" in result) {
            i.cursor = from
            return i.createErrorMemo("Tag expression failed", [result])
        }
        const astNode = i.createNonTerminal(this.tagName, from, result.astNodes, this)
        const memoInfo = i.createOKMemo(i.cursor - from, [astNode], [result])
        astNode.memoInfo = memoInfo as MemoInfo // parseNode() will set grammarNode property later.
        return memoInfo
    }
}

class GNShowTerminals extends ChildGrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, expression: GrammarNode) {
        super(from, to, "Show " + idSuffix, expression)
    }

    public print(p: InternalPrinter): void
    {
        p.print(`{`)
        this.child.print(p)
        p.print(`}`)
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        ++i.showTerminals
        const result = i.interpretNode(this.child)
        --i.showTerminals
        if("error" in result) {
            i.cursor = from
            return i.createErrorMemo("Terminal expression failed", [result])
        }
        return i.createOKMemo(i.cursor - from, result.astNodes, [result])
    }
}

class GNCut extends ChildGrammarNode
{
    public constructor(from: number, to: number, idSuffix: string, expression: GrammarNode) {
        super(from, to, "Cut " + idSuffix, expression)
    }

    public print(p: InternalPrinter): void
    {
        this.child.print(p)
        p.print(`,`)
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const result = i.interpretNode(this.child)
        if("error" in result) {
            i.cursor = from
            return i.createErrorMemo("Cut inner expression failed", [result])
        }
        i.cutting = true
        return i.createOKMemo(i.cursor - from, result.astNodes, [result])
    }
}

class GNPermutation extends ChildrenWithSeparatorGrammarNode
{
    public constructor(
        from: number, to: number, idSuffix: string,
        permutationArray: GrammarNode[],
        separator: GrammarNode | null,
        private exhaustive: boolean,
    ) {
        super(from, to,
            (exhaustive ? "Permutation " : "Options ") + idSuffix,
            permutationArray,
            separator
        )
    }

    public print(p: InternalPrinter): void
    {
        this.listPrint(p, this.exhaustive ? " ^ " : " . ")
    }

    public interpret(i: Interpreter): IncompleteMemoInfo
    {
        const from = i.cursor
        const set = new Set(this.children)
        let productive = true
        const memos: MemoInfo[] = []
        while(set.size > 0 && productive) {
            productive = false
            if(this.separator != null && set.size < this.children.length) {
                const result = i.interpretNode(this.separator)
                if("error" in result) { break; }
                memos.push(result)
            }
            for(const option of this.children) {
                if(!set.has(option)) { continue }
                const result = i.interpretNode(option)
                if(!("error" in result)) {
                    set.delete(option)
                    productive = true
                    memos.push(result)
                }
            }
        }
        if(
            productive || // Permutation
            (!this.exhaustive && set.size < this.children.length) // Option
        ) {
            return i.createOKMemo(i.cursor - from, memos, memos)
        }
        i.cursor = from
        return i.createErrorMemo("Missing " + (this.exhaustive ? "permutation" : "optional") + " elements", memos)
    }
}


//   GGGG  RRRRRR    AAA   MM    MM MM    MM   AAA   RRRRRR  
//  GG  GG RR   RR  AAAAA  MMM  MMM MMM  MMM  AAAAA  RR   RR 
// GG      RRRRRR  AA   AA MM MM MM MM MM MM AA   AA RRRRRR  
// GG   GG RR  RR  AAAAAAA MM    MM MM    MM AAAAAAA RR  RR  
//  GGGGGG RR   RR AA   AA MM    MM MM    MM AA   AA RR   RR 
                                                          

class Grammar implements GrammarIface
{
    private rules = new Map<string, GrammarNode>()
    private error = new GNError()
    private axiom = this.error

    public initializeAxiom(): boolean {
        const axiom = this.rules.get(AXIOM_RULE_NAME)
        if(axiom == null) { return false }
        this.axiom = axiom
        return true
    }

    public getAxiom(): GrammarNode | null {
        return this.axiom == this.error ? null : this.axiom
    }

    public checkRules(): LocatedError[] {
        const result: LocatedError[] = []
        const alreadyReported = new Set<string>()
        this.rules.forEach((node, name) => {
            node.recursiveVisit(n => {
                if(n instanceof GNRuleUse
                 && !this.rules.has(n.ruleName)
                 && !specialRules.has(n.ruleName)
                 && !alreadyReported.has(n.ruleName)
                ) {
                    alreadyReported.add(n.ruleName)
                    result.push(new LocatedError(`Rule '${n.ruleName}' is not defined.`, n.from, n.to, undefined))
                } 
            })
        })
        return result
    }

    public setRule(name: string, nameLocation: number, exp: GrammarNode): LocatedError | undefined {
        if(this.rules.has(name)) {
            return new LocatedError(`Redefined rule '${name}'`, nameLocation, nameLocation + name.length, undefined)
        }
        this.rules.set(name, exp)
    }

    public getRule(ruleName: string): GrammarNode | undefined {
        return this.rules.get(ruleName)
    }

    public getRuleNames(): string[] {
        return [...this.rules.keys()]
    }

    public print(p: PrinterIface) {
        const internalPrinter = new InternalPrinter(p)
        this.rules.forEach((gn, name) => {
            p.print(`${name} = `)
            gn.print(internalPrinter)
            p.print(";\n")
        })
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
])


function isWS(c: string | undefined): boolean { return c != null && /\s/.test(c); }
function isAlpha(c: string | undefined): boolean { return c != null && /[a-zA-Z_]/.test(c) }
function isAlphanum(c: string | undefined): boolean { return c != null && /[0-9a-zA-Z_]/.test(c) }

type RuleModifier   = { pre: boolean, inf: boolean, suf: boolean }

function ruleModifierFromName(name: string): RuleModifier | undefined
{
    switch(name) {
        case "infixing":    return { pre: false, inf: true,  suf: false }
        case "allfixing":   return { pre: true,  inf: true,  suf: true  }
        case "prefixing":   return { pre: true,  inf: true,  suf: false }
        case "suffixing":   return { pre: false, inf: true,  suf: true  }
        case "appending":   return { pre: false, inf: false, suf: true  }
        case "prepending":  return { pre: true,  inf: false, suf: false }
        case "surrounding": return { pre: true,  inf: false, suf: true  }
    }
    return undefined
}

class GrammarParser
{
    private cursor: number = 0
    private grammar = new Grammar()
    private code = ""
    private errors: LocatedError[] = []
    private nodeCount = 0

    public constructor() {}

    public getGrammar(): Grammar { return this.grammar }
    public getErrors(): LocatedError[] { return this.errors }

    private uid(): string { return String(this.nodeCount++) }



    // axiom ::= rule*
    public parse(code: string): boolean {
        this.code = code
        this.cursor = 0
        this.errors.length = 0
        this.grammar = new Grammar()
        this.skipWS()
        while(this.cursor < this.code.length) {
            this.parseRule(false, false, false, null)
            this.skipWS()
        }
        this.skipWS()
        if(this.cursor != this.code.length) { this.error("Garbage after last rule.") }
        if(!this.grammar.initializeAxiom()) { this.error(`Rule '${AXIOM_RULE_NAME}' is not defined.`) }
        this.errors.push(...this.grammar.checkRules())
        return this.errors.length == 0
    }

    // rule ::= modifier modified_rules ";" / identifier (":=" | "=") expression ";"
    private parseRule(pre: boolean, inf: boolean, suf: boolean, infix: GrammarNode | null): void {
        const from = this.cursor
        const name = this.readIdentifier()
        if(name == null) {
            this.error("Expecting rule name.");
            this.skipToAfterSemicolon();
            return
        }
        if(specialRules.has(name)) {
            this.error("Rule name is reserved.");
            this.skipToAfterSemicolon();
            return
        }
        if(this.grammar.getRule(name) != null) {
            this.error("Rule name already used.");
            this.skipToAfterSemicolon();
            return
        }

        // Check if is a block of modified rules
        const ruleModifier = ruleModifierFromName(name)
        if(ruleModifier != null) {
            if(infix != null) { this.error("Nesting a rule modifier."); this.skipToAfterSemicolon(); return }
            return this.parseModifiedRules(ruleModifier)
        }

        this.skipWS()
        let wrap: boolean
        if(this.cursor < this.code.length && this.code[this.cursor] == ':') {
            if(!this.matchTerminals(":=", "Expecting := after rule name.")) { this.skipToAfterSemicolon(); return }
            wrap = true
        } else {
            if(!this.matchTerminals("=", "Expecting = after rule name.")) { this.skipToAfterSemicolon(); return }
            wrap = false
        }

        let exp = this.parseFullExpression(inf ? infix : null)
        if(exp == null) { this.skipToAfterSemicolon(); return }
    
        if(infix != null) {
            const seqArray = pre ? [infix, exp] : [exp]
            if(suf) { seqArray.push(infix) }
            if(seqArray.length == 1) { exp = seqArray[0] }
            else { exp = new GNSequence(exp.from, exp.to, this.uid(), seqArray) }
        }

        if(!this.matchTerminals(";", "Expecting rule terminator ;")) { this.skipToAfterSemicolon(); return }

        if(RESERVED_RULE_NAMES.includes(name)) { this.error(`Name ${name} is reserved.`); return }

        this.grammar.setRule(name, from, wrap ? new GNTag(from, this.cursor, this.uid(), name, exp) : exp)
    }

    // modified_rules ::= identifier "do" rule* "done"
    private parseModifiedRules({pre, inf, suf}: RuleModifier): void
    {
        const from = this.cursor
        const name = this.readIdentifier()
        if(name == null) { this.error("Expecting the inserted rule name." ); this.skipAfterDone(); return }
        const ruleUse = new GNRuleUse(from, this.cursor, this.uid(), name)
        if(!this.matchTerminals("do", true)) { this.skipAfterDone(); return }
        while(this.cursor < this.code.length && !this.matchTerminals("done", false)) {
            this.parseRule(pre, inf, suf, ruleUse)
        }
    }

    // fullexpr ::= branch ("/" branch)*
    private parseFullExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const begin = this.cursor
        const branchArray: GrammarNode[] = []
        do {
            this.skipWS()
            if(!this.isStartOfElementExpression()) { break }
            const branch = this.parseBranchExpression(infix)
            if(branch == null) { this.skipToOneOf("/;") }
            else               { branchArray.push(branch) }
        } while(this.matchTerminals("/", false))

        if(branchArray.length == 0) { return null }
        if(branchArray.length == 1) { return branchArray[0] }
        return new GNOrderedOptions(begin, this.cursor, this.uid(), branchArray)
    }

    // branch ::= element+
    private parseBranchExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const from = this.cursor
        const elem = this.parseElementExpression(infix)
        if(elem == null) { return }
        this.skipWS()
        const seqArray = [elem]
        while(this.isStartOfElementExpression()) {
            if(infix != null) { seqArray.push(infix) }
            const elem = this.parseElementExpression(infix)
            if(elem == null) { return }
            seqArray.push(elem)
            this.skipWS()
        }

        return seqArray.length == 1 ? seqArray[0] : new GNSequence(from, this.cursor, this.uid(), seqArray)
    }

    private isStartOfElementExpression(): boolean {
        if(this.cursor >= this.code.length) { return false }
        if(isAlpha(this.code[this.cursor])) { return true }
        if(this.code[this.cursor] == "<") {
            if(this.cursor + 1 >= this.code.length) { return false }
            return this.code[this.cursor + 1] != "/"
        }
        return '([{&!#"'.includes(this.code[this.cursor])
    }

    // element ::= extended "%" extended
    private parseElementExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        let result = this.parseExtendedExpression(infix)
        if(result == null) { return }

        if(!this.matchTerminals("%", false)) {
            return result
        }

        const from = this.cursor
        let right = this.parseExtendedExpression(infix)
        if(right == null) { return }

        if(infix != null) {
            right = new GNSequence(from, this.cursor, this.uid(), [infix, right, infix])
        }

        result = result.replaceSeparator(right, this.cursor)
        if(result == null) { this.error("Separator applied to invalid expression."); return }
        return result
    }

    private readArrayOfPrefixExpressions(left: GrammarNode, separator: string, infix: GrammarNode | null)
    : GrammarNode[] | undefined
    {
        const array = [left]
        while(this.cursor < this.code.length && this.code[this.cursor] == separator) {
            ++this.cursor
            this.skipWS()
            const right = this.parsePrefixExpression(infix)
            if(right == null) { return }
            this.skipWS()
            array.push(right)
        }
        return array
    }

    // extended ::= pre (("^" / ".") pre)*
    private parseExtendedExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const begin = this.cursor
        const prefix = this.parsePrefixExpression(infix)
        if(prefix == null) { return }
        let left = prefix
        this.skipWS()
        if(this.cursor >= this.code.length) { return left }
        switch(this.code[this.cursor]) {
            case '^': {
                const permutationArray = this.readArrayOfPrefixExpressions(left, '^', infix)
                if(permutationArray == null) { return }
                return new GNPermutation(begin, this.cursor, this.uid(), permutationArray, infix, true)
            }
            case '.': {
                const optionArray = this.readArrayOfPrefixExpressions(left, '.', infix)
                if(optionArray == null) { return }
                return new GNPermutation(begin, this.cursor, this.uid(), optionArray, infix, false)
            }
            default: return left
        }
    }

    // pre ::= "&" pre / "!" pre / "#" pre / post
    protected parsePrefixExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const from = this.cursor
        if(this.matchTerminals("&", false)) {
            const pre = this.parsePrefixExpression(infix)
            if(pre == null) { return }
            return new GNPredicate(from, this.cursor, this.uid(), true, pre)
        }
        if(this.matchTerminals("!", false)) {
            const pre = this.parsePrefixExpression(infix)
            if(pre == null) { return }
            return new GNPredicate(from, this.cursor, this.uid(), false, pre)
        }

        return this.parsePostfixExpression(infix)
    }

    // post ::= atom ("*" / "+" / "?" / ",")*
    protected parsePostfixExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const from = this.cursor
        const primary = this.parsePrimaryExpression(infix)
        if(primary == null) { return }
        let result = primary
        for(;;) {
            if(this.matchTerminals("*", false)) {
                result = new GNZeroOrMore(from, this.cursor, this.uid(), result, infix ?? undefined)
            } else if(this.matchTerminals("+", false)) {
                result = new GNOneOrMore(from, this.cursor, this.uid(), result, infix ?? undefined)
            } else if(this.matchTerminals("?", false)) {
                result = new GNZeroOrOne(from, this.cursor, this.uid(), result)
            } else if(this.matchTerminals(",", false)) {
                result = new GNCut(from, this.cursor, this.uid(), result)
            } else {
                return result
            }
        }
    }

    // atom ::= id / string / range / "(" fullexpr ")" / "{" fullexpr "}" / "<" id ">" fullexpr "</" id ">"
    private parsePrimaryExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        if(this.cursor < this.code.length) {
            switch(this.code[this.cursor]) {
                case '"': return this.parseString()
                case '[': return this.parseRange()
                case '(': return this.parseParentheses(infix)
                case '{': return this.parseShowTerminals(infix)
                case '<': return this.parseTaggedExpression(infix)
            }
            
            const from = this.cursor
            const id = this.readIdentifier()
            if(id != null) { return new GNRuleUse(from, this.cursor, this.uid(), id) }
        }
  
        this.error("Expecting a primary expression.")
    }

    private parseString(): GrammarNode | undefined
    {
        const from = this.cursor
        ++this.cursor // Skip "
        let result = ""
        while(this.cursor < this.code.length) {
            const c = this.code[this.cursor]
            if(c == '"') { break }
            if(c != '\\') {
                result += c
                ++this.cursor
                continue
            }

            // Escaped string
            ++this.cursor
            if(this.cursor >= this.code.length) { this.error("String reaches end of file."); return }

            const escaped = this.readEscaped()
            if(escaped == null) { return }
            result += escaped
        }

        if(this.cursor >= this.code.length) { this.error("String reaches end of file."); return }

        ++this.cursor // Skip quote
        return new GNString(from, this.cursor, this.uid(), result)
    }

    private readEscaped(): string | undefined {
        if(this.cursor >= this.code.length) { return undefined }
        switch(this.code[this.cursor]) {
            case 'n':  ++this.cursor; return "\n"
            case 'r':  ++this.cursor; return "\r"
            case 't':  ++this.cursor; return "\t"
            case '\\': ++this.cursor; return "\\"
            case '^':  ++this.cursor; return "^"
            case '[':  ++this.cursor; return "["
            case ']':  ++this.cursor; return "]"
            case '-':  ++this.cursor; return "-"
            case '"':  ++this.cursor; return '"'
        }

        return undefined
    }

    private parseRange(): GrammarNode | undefined
    {
        const from = this.cursor
        ++this.cursor // Skip [
        if(this.cursor >= this.code.length) { return undefined }

        const negated = this.code[this.cursor] == '^'
        if(negated) { ++this.cursor }
        const set = new Set<string>()
        if(!this.parseRangeElement(set)) { this.error("Expecting a range element."); return }
        while(this.parseRangeElement(set));
        if(this.cursor >= this.code.length) { this.error("End of file reached inside a range"); return }
        this.matchTerminals("]", true)
        return new GNSet(from, this.cursor, this.uid(), negated, set)
    }

    private rangeEscape(char: string): string | undefined {
        if(char != '\\') { return char }
        const escaped = this.readEscaped()
        if(escaped == null) { this.error("Unknown escape sequence."); return undefined }
        return escaped
    }

    private parseRangeElement(set: Set<string>): boolean
    {
        if(this.cursor >= this.code.length) { return false }
        let first = this.code[this.cursor]
        if(first == ']') { return false }
        ++this.cursor // skip first
        first = this.rangeEscape(first)
        if(first == null) { return false }

        if(this.cursor >= this.code.length) { this.error("Unexpected end of file in a range."); return false}
        if(this.code[this.cursor] != '-') {
            set.add(first)
            return true
        }
        ++this.cursor // Skip -

        if(this.cursor >= this.code.length) { this.error("Unexpected end of file in a range."); return false}
        let last = this.code[this.cursor]
        ++this.cursor
        last = this.rangeEscape(last)
        if(last == null) { return false }

        if(last.charCodeAt(0) < first.charCodeAt(0)) {
            this.error("Empty character interval.")
            return false
        }

        for(let code = first.charCodeAt(0); code <= last.charCodeAt(0); ++code) {
            set.add(String.fromCharCode(code))
        }
        return true
    }

    private parseParentheses(infix: GrammarNode | null): GrammarNode | undefined
    {
        ++this.cursor // Skip (
        const expr = this.parseFullExpression(infix)
        if(expr == null) { return }
        if(!this.matchTerminals(")", true)) { return }
        return expr
    }

    private parseShowTerminals(infix: GrammarNode | null): GrammarNode | undefined
    {
        const from = this.cursor
        ++this.cursor // Skip {
        const expr = this.parseFullExpression(infix)
        if(expr == null) { return }
        if(!this.matchTerminals("}", true)) { return }
        return new GNShowTerminals(from, this.cursor, this.uid(), expr)
    }

    private parseTaggedExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const from = this.cursor
        ++this.cursor // Skip <
        const tag = this.readIdentifier()
        if(tag.length == 0) { this.error("Expecting a tag name."); return }
        if(!this.matchTerminals(">", "Expecting closing >")) { return }
        const expr = this.parseFullExpression(infix)
        if(expr == null) { return  }
        if(!this.matchTerminals("</", "Expecting </ after tagged expression")) { return }
        if(!this.matchTerminals(tag, "Mismatched tag name"))                   { return }
        if(!this.matchTerminals(">", "Expecting closing >"))                   { return }
        return new GNTag(from, this.cursor, this.uid(), tag, expr)
    }



    protected readIdentifier(): string | undefined {
        this.skipWS()
        if(this.cursor >= this.code.length) { return undefined }
        const start = this.cursor
        if(!isAlpha(this.code[this.cursor])) { return undefined }
        ++this.cursor
        while(this.cursor < this.code.length && isAlphanum(this.code[this.cursor])) {
            ++this.cursor
        }
        if(start == this.cursor) { return undefined }
        return this.code.slice(start, this.cursor)
    }

    protected matchTerminals(terminals: string, reportError: boolean | string): boolean {
        if(terminals.length == 0) { return this.error("INTERNAL: Invalid argument to Parser#matchTerminals()")}
        this.skipWS()
        if(this.code.length - this.cursor < terminals.length) { return false }
        const from = this.cursor
        for(let k = 0; k < terminals.length; ++k) {
            if(terminals[k] != this.code[this.cursor + k]) {
                this.cursor = from
                if(reportError == true)  { return this.error(`Expected '${terminals}'`) }
                if(reportError == false) { return false }
                return this.error(reportError)
            }
        }
        this.cursor += terminals.length
        return true
    }

    private skipToAfterSemicolon() {
        while(this.cursor < this.code.length) {
            if(this.code[this.cursor] == ';') { ++this.cursor; return }
            ++this.cursor
        }
    }

    private skipAfterDone() {
        while(this.cursor < this.code.length) {
            if(this.code[this.cursor] != 'd') { ++this.cursor; continue }
            if(this.matchTerminals("done", false)) { return }
            ++this.cursor
        }
    }

    private skipToOneOf(set: string) {
        while(this.cursor < this.code.length) {
            if(set.includes(this.code[this.cursor])) { return }
            ++this.cursor
        }
    }

    private skipWS() {
        for(;;){
            while(this.cursor < this.code.length && isWS(this.code[this.cursor])) { ++this.cursor }
            if(this.cursor < this.code.length && this.code[this.cursor] == '/') {
                if(!this.skipComments()) {
                    return
                }
            } else {
                return
            }
        }
    }

    private skipComments(): boolean {
        // Skip single line comment
        if(this.code[this.cursor + 1] == '/') {
            this.cursor += 2
            while(this.cursor < this.code.length && this.code[this.cursor] != '\n') { ++this.cursor }
            return true
        }

        // Skip block comment
        if(this.code[this.cursor + 1] == '*') {
            this.cursor += 2
            while(this.cursor < this.code.length &&
                (this.code[this.cursor] != '*' || this.code[this.cursor + 1] != '/'))
            {
                ++this.cursor
            }
            if(this.cursor >= this.code.length) { return false; }
            this.cursor += 2
            return true
        }

        // Not a comment
        return false
    }

    private error(description: string, at?: number, length?: number): false
    {
        if(at == null) { at = this. cursor }
        if(length == null) { length = 1 }
        this.errors.push( new LocatedError(description, at, at + length, undefined) )
        return false
    }
}



// IIIII NN   NN TTTTTTT EEEEEEE RRRRRR  PPPPPP  RRRRRR  EEEEEEE TTTTTTT EEEEEEE RRRRRR  
//  III  NNN  NN   TTT   EE      RR   RR PP   PP RR   RR EE        TTT   EE      RR   RR 
//  III  NN N NN   TTT   EEEEE   RRRRRR  PPPPPP  RRRRRR  EEEEE     TTT   EEEEE   RRRRRR  
//  III  NN  NNN   TTT   EE      RR  RR  PP      RR  RR  EE        TTT   EE      RR  RR  
// IIIII NN   NN   TTT   EEEEEEE RR   RR PP      RR   RR EEEEEEE   TTT   EEEEEEE RR   RR 




class Interpreter
{
    public rootAST: ASTNode = {from: -1, to: -1, name: "ERROR", children: undefined, grammarNode: specialRules.get("WS") }
    public memo = new Map<number, Map<GrammarNode, MemoInfo>>()
    private grammar = new Grammar()
    public error = new LocatedError("None", 0, 0, undefined)
    public cursor = 0
    private code = ""
    public cutting = false
    public showTerminals = 0
    private memoCount = 0
    private usedLeftRecursionRules = new Set<string>()
    private allowedLoopSteps = 10_000_000


    public interpret(code: string, grammar: Grammar): boolean
    {
        this.code = code
        this.grammar = grammar
        const axiom = grammar.getAxiom()
        if(axiom == null) {
            this.error = new LocatedError("Invalid grammar", 0, 0, undefined)
            return false
        }
        this.guardAgainstLeftRecursion(AXIOM_RULE_NAME, axiom.from, axiom.to)
        try {
            const result = this.interpretNode(axiom)
            if("error" in result) {
                this.error = new LocatedError(result.error, result.position, result.position + 1, result.grammarNode)
                return false
            }
            this.rootAST = this.createNonTerminal("ROOT", 0, result.astNodes, axiom)
            this.rootAST.memoInfo = result
            return true
        } catch(e) {
            this.error = e instanceof LocatedError ? e : new LocatedError(String(e), 0, 0, undefined)
            return false
        }
    }

    public readChar(): string | undefined {
        return this.code[this.cursor++]
    }

    public atEOF(): boolean
    {
        return this.cursor >= this.code.length
    }

    public atWS(): boolean
    {
        return this.cursor < this.code.length && isWS(this.code[this.cursor])
    }

    public guardAgainstLeftRecursion(ruleName: string, from: number, to: number): boolean
    {
        if(this.usedLeftRecursionRules.has(ruleName)) {
            throw new LocatedError(
                `Left recursion detected in rules: ${this.getUsedLeftRecursionRuleNames().join(", ")}`,
                from, to, undefined
            )
        }
        this.usedLeftRecursionRules.add(ruleName)
        return false
    }

    public unguardAgainstLeftRecursion(ruleName: string): void {
        this.usedLeftRecursionRules.delete(ruleName)
    }

    public leftRecurcursionNotPossible(): void {
        this.usedLeftRecursionRules.clear()
    }


    public guardAgainstInfiniteLoops(from: number, to: number): void {
        if(--this.allowedLoopSteps <= 0) {
            throw new LocatedError("Loop count exceeded limit.", from, to, undefined)
        }
    }


    public getUsedLeftRecursionRuleNames(): string[]
    {
        return [...this.usedLeftRecursionRules]
    }

    public createNonTerminal(name: string, from: number, children: ASTNode[], grammarNode: GrammarNode): ASTNode
    {
        return { from, to: this.cursor, name, children, grammarNode }
    }

    public createTerminal(from: number, grammarNode: GrammarNode): ASTNode
    {
        return { from, to: this.cursor, children:[], grammarNode }
    }

    public getRule(ruleName: string) {
        return this.grammar.getRule(ruleName) ?? specialRules.get(ruleName)
    }

    public interpretNode(gNode: GrammarNode): MemoInfo
    {
        // Memoization
        let memoAtCursor = this.memo.get(this.cursor)
        if(memoAtCursor != null) {
            const memoOfNode = memoAtCursor.get(gNode)
            if(memoOfNode !== undefined) {
                if("error" in memoOfNode) { return memoOfNode }
                this.cursor += memoOfNode.length
                return memoOfNode
            }
        } else {
            memoAtCursor = new Map<GrammarNode, MemoInfo>
            this.memo.set(this.cursor, memoAtCursor)
        }

        // Interpretation
        const result = gNode.interpret(this) as MemoInfo
        result.grammarNode = gNode
        memoAtCursor.set(gNode, result)
        return result
    }

    private isASTNodeArray(astNodes: ASTNode[] | MemoInfo[]): astNodes is ASTNode[] {
        return astNodes.length == 0 || !("id" in astNodes[0])
    }

    public createOKMemo(length: number, astNodes: ASTNode[] | MemoInfo[], children: MemoInfo[]): IncompleteMemoInfo
    {
        if(!this.isASTNodeArray(astNodes)) {
            astNodes = astNodes.flatMap(memoInfo => "astNodes" in memoInfo ? memoInfo.astNodes : [])
        }
        return { position: this.cursor - length, length, children, astNodes, id: this.memoCount++ }
    }

    public createErrorMemo(error: string, children: MemoInfo[], position?: number): IncompleteMemoInfo {
        return {position: position ?? this.cursor, error, children, id: this.memoCount++ }
    }
}

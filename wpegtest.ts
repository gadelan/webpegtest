




// IIIII NN   NN TTTTTTT EEEEEEE RRRRRR  FFFFFFF   AAA    CCCCC  EEEEEEE 
//  III  NNN  NN   TTT   EE      RR   RR FF       AAAAA  CC    C EE      
//  III  NN N NN   TTT   EEEEE   RRRRRR  FFFF    AA   AA CC      EEEEE   
//  III  NN  NNN   TTT   EE      RR  RR  FF      AAAAAAA CC    C EE      
// IIIII NN   NN   TTT   EEEEEEE RR   RR FF      AA   AA  CCCCC  EEEEEEE 

export type ASTNode = {
    from: number
    to: number
    name: string
    children: ASTNode[] | undefined
}

export type MemoInfo = {
    length: number
    astNodes: ASTNode[]
} | {
    error: string
    location: number
}

export type ParsingError = {
    location: number
    description: string
}

export type GrammarIface = {

}

export type GrammarNodeIface = {
    from: number
    to: number
}

export type MemoMaps = Map<number, Map<GrammarNodeIface, MemoInfo>>

export type InputResult = {
    root: ASTNode
    memo: MemoMaps
} | {
    error: ParsingError
    memo: MemoMaps
}

export function parseGrammar(grammarCode: string): GrammarIface | ParsingError[]
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
    if(interpreter.parse(inputCode, grammar as Grammar)) {
        return {root: interpreter.rootAST, memo: interpreter.memo }
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


abstract class Located
{
    protected constructor(public readonly from: number, public to: number) { }

}

class Printer
{
    private chunks: string[] = []
    public print(s: string): void
    {
        this.chunks.push(s)
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
        }
        return c
    }

    public dumpToConsole(): void
    {
        console.log(this.chunks.join(""))
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


abstract class GrammarNode extends Located implements GrammarNodeIface
{
    protected constructor(from: number, to: number) {
        super(from, to)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode)=> void) { visitingFunction(this) }
    public abstract print(p: Printer): void
    public abstract interpret(i: Interpreter): MemoInfo
}

abstract class ChildGrammarNode extends GrammarNode
{
    protected constructor(from: number, to: number, protected child: GrammarNode)
    {
        super(from, to)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode) => void): void {
        visitingFunction(this)
        this.child.recursiveVisit(visitingFunction)
    }
}
abstract class ChildWithOptionalGrammarNode extends GrammarNode
{
    protected constructor(from: number, to: number, protected child: GrammarNode, protected optional?: GrammarNode)
    {
        super(from, to)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode) => void): void {
        visitingFunction(this)
        this.child.recursiveVisit(visitingFunction)
        if(this.optional != null) {
            this.optional.recursiveVisit(visitingFunction)
        }
    }
}

abstract class ChildrenGrammarNode extends GrammarNode
{
    public constructor(from: number, to: number, protected children: GrammarNode[]) {
        super(from, to)
    }

    public recursiveVisit(visitingFunction: (visitedNode: GrammarNode) => void): void {
        visitingFunction(this)
        this.children.forEach(visitingFunction)
    }

    protected listPrint(p: Printer, separator: string): void
    {
        p.print("(")
        this.children.forEach((c, x) => {
            if(x != 0) { p.print(separator) }
            c.print(p)
        })
        p.print(")")
    }

}

// ===============================================================================================================
// CONCRETE
// ===============================================================================================================


class GNEOF extends GrammarNode
{
    public print(p: Printer): void
    {
        p.print("EOF")
    }

    public interpret(i: Interpreter): MemoInfo {
        if(i.atEOF()) { return {length: 0, astNodes: []} }
        return {error: "Not EOF", location: i.cursor}
    }
}

class GNEpsilon extends GrammarNode
{
    public constructor() { super(-1, -1) }

    public print(p: Printer): void
    {
        p.print("EPSILON")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        return {length: 0, astNodes: []}
    }
}

class GNAnyCharNotEOF extends GrammarNode
{
    public print(p: Printer): void
    {
        p.print("ANY")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        if(!i.atEOF()) { return {length: 1, astNodes: []} }
        return {error: "EOF reached", location: i.cursor}
    }
}

class GNWhiteSpace extends GrammarNode
{
    public print(p: Printer): void
    {
        p.print("WS")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        if(i.atWS()) { return {length: 1, astNodes: []} }
        return {error: "Not WS", location: i.cursor}
    }
}

class GNError extends GrammarNode
{
    public constructor() { super(-1, -1) }

    public print(p: Printer): void
    {
        p.print("ERROR")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        return {error: "Error grammar node", location: i.cursor}
    }
}

class GNRuleUse extends GrammarNode
{
    public constructor(from: number, to: number, public readonly ruleName: string) {
        super(from, to)
    }

    public print(p: Printer): void
    {
        p.print(this.ruleName)
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const rule = i.getRule(this.ruleName)
        if(rule == null) { return {error: `Rule '${this.ruleName}' not found.`, location: i.cursor}}
        const result = i.parseNode(rule)
        return "error" in result ?
            {error: `Rule '${this.ruleName} failed. ${result.error}`, location: result.location} : result
    }
}

class GNSet extends GrammarNode
{
    constructor(from: number, to: number, private negated: boolean, private set: Set<string>) {
        super(from, to)
    }

    public print(p: Printer): void
    {
        if(this.negated) { p.print("[^") }
        else             { p.print("[")  }

        this.set.forEach(c => p.printEscaping(c))

        p.print("]")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        if(i.atEOF()) { return {error: "EOF reached", location: i.cursor}}
        const from = i.cursor
        const char = i.readChar()
        if(this.set.has(char)) {
            return {length: 1, astNodes: i.createTerminalArray(char, from)}
        }
        return {error: "Character not in set", location: i.cursor}
    }
}

class GNString extends GrammarNode
{
    constructor(from: number, to: number, private terminals: string) {
        super(from, to)
    }

    public print(p: Printer): void
    {
        p.print('"')
        p.printEscaping(this.terminals)
        p.print('"')
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        for(const char of this.terminals) {
            if(char != i.readChar()) {
                return i.atEOF() ? {error: "EOF reached", location: i.cursor}
                    : {error: `Mismatch of character ${char}`, location: i.cursor}
            }
        }
        return {length: this.terminals.length, astNodes: i.createTerminalArray(this.terminals, from)}
    }

}

class GNConcat extends ChildrenGrammarNode
{
    public constructor(from: number, to: number, children: GrammarNode[]) {
        super(from, to, children)
        if(children.length < 2) { throw new Error("Invalid concatenation children.")}
    }

    public print(p: Printer): void
    {
        this.listPrint(p, " ")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        let count = 0
        const astNodes: ASTNode[] = []
        for(const child of this.children) {
            const result = i.parseNode(child)
            if("error" in result) {
                return {error: `Concatenation failed in index ${count}. ${result.error}`, location: result.location}
            }
            ++count
            astNodes.push(...result.astNodes)
        }
        return {length: from - i.cursor, astNodes}
    }
}

class GNBranch extends ChildrenGrammarNode
{
    public constructor(from: number, to: number, children: GrammarNode[]) {
        super(from, to, children)
        if(children.length < 2) { throw new Error("Invalid branching children.")}
    }

    public print(p: Printer): void
    {
        this.listPrint(p, " / ")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        let error = "There are no branches"
        let location = -1
        for(const child of this.children) {
            const result = i.parseNode(child)
            if(!("error" in result)) { return result }
            if(i.cutting) { return {error: "Cutting.", location: i.cursor} }
            i.cursor = from
            if(result.location > location) {
                error = result.error
                location = result.location
            }
        }
        return {error: `All branches failed. Most promising branch error: ${error}`, location}
    }
}

class GNZeroOrMore extends ChildWithOptionalGrammarNode
{
    public constructor(from: number, to: number, toRepeat: GrammarNode, optSeparator?: GrammarNode) {
        super(from, to, toRepeat, optSeparator)
    }

    public print(p: Printer): void
    {
        if(this.optional != null) {
            p.print("(")
            this.child.print(p)
            p.print(" %* ")
            this.optional.print(p)
            p.print(")")

        } else {
            this.child.print(p)
            p.print("*")
        }
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        const astNodes: ASTNode[] = []
        for(;;){
            const result = i.parseNode(this.child)
            if("error" in result) break
            astNodes.push(...result.astNodes)
        }
        return {length: i.cursor - from, astNodes}
    }
}

class GNOneOrMore extends ChildWithOptionalGrammarNode
{
    public constructor(from: number, to: number, toRepeat: GrammarNode, optSeparator?: GrammarNode) {
        super(from, to, toRepeat, optSeparator)
    }

    public print(p: Printer): void
    {
        if(this.optional != null) {
            p.print("(")
            this.child.print(p)
            p.print(" % ")
            this.optional.print(p)
            p.print(")")

        } else {
            this.child.print(p)
            p.print("+")
        }
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        const firstResult = i.parseNode(this.child)
        if("error" in firstResult) { return {error: "Mandatory match failed", location: i.cursor} }
        const astNodes = firstResult.astNodes
        for(;;){
            const result = i.parseNode(this.child)
            if("error" in result) break
            astNodes.push(...result.astNodes)
        }
        return {length: i.cursor - from, astNodes}
    }
}

class GNZeroOrOne extends ChildGrammarNode
{
    public constructor(from: number, to: number, expression: GrammarNode) {
        super(from, to, expression)
    }

    public print(p: Printer): void
    {
        this.child.print(p)
        p.print("?")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        const result = i.parseNode(this.child)
        return {length: i.cursor - from, astNodes: "error" in result ? [] : result.astNodes}
    }
}

class GNPredicate extends ChildGrammarNode {
    public constructor(from: number, to: number, private assert: boolean, predicate: GrammarNode)
    {
        super(from, to, predicate)
    }

    public print(p: Printer): void
    {
        p.print(this.assert ? "&" : "!")
        this.child.print(p)
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        const result = !("error" in i.parseNode(this.child))
        const pointOfFailure = i.cursor
        i.cursor = from
        return result == this.assert ? {length: 0, astNodes: []} : {error: "Predicate failed", location: pointOfFailure}
    }
}

class GNTag extends ChildGrammarNode {
    public constructor(from: number, to: number, private tagName: string, taggedExpression: GrammarNode) {
        super(from, to, taggedExpression)
    }

    public print(p: Printer): void
    {
        p.print(`<${this.tagName}>`)
        this.child.print(p)
        p.print(`</${this.tagName}>`)
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        const result = i.parseNode(this.child)
        return "error" in result ? {error: "Inner expression failed", location: i.cursor} :
            {length: i.cursor - from, astNodes: [i.createNonTerminal(this.tagName, from, result.astNodes)]}
    }
}

class GNShowTerminals extends ChildGrammarNode
{
    public constructor(from: number, to: number, expression: GrammarNode) {
        super(from, to, expression)
    }

    public print(p: Printer): void
    {
        p.print(`{`)
        this.child.print(p)
        p.print(`}`)
    }

    public interpret(i: Interpreter): MemoInfo
    {
        ++i.showTerminals
        const result = i.parseNode(this.child)
        --i.showTerminals
        return "error" in result ? {error: "Inner expression failed", location: i.cursor} : result
    }
}

class GNCut extends ChildGrammarNode
{
    public constructor(from: number, to: number, expression: GrammarNode) {
        super(from, to, expression)
    }

    public print(p: Printer): void
    {
        this.child.print(p)
        p.print(`,`)
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const result = i.parseNode(this.child)
        i.cutting = true
        return "error" in result ? {error: "Inner expression failed", location: i.cursor} : result
    }
}

class GNBarrier extends ChildGrammarNode {
    public constructor(from: number, to: number, expression: GrammarNode)
    {
        super(from, to, expression)
    }

    public print(p: Printer): void
    {
        p.print(`#`)
        this.child.print(p)
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const result = i.parseNode(this.child)
        i.cutting = false
        return "error" in result ? {error: "Inner expression failed", location: i.cursor} : result
    }
}

class GNPermutation extends ChildrenGrammarNode
{
    public constructor(from: number, to: number, permutationArray: GrammarNode[]) {
        super(from, to, permutationArray)
    }

    public print(p: Printer): void
    {
        this.listPrint(p, " ^ ")
    }

    public interpret(i: Interpreter): MemoInfo
    {
        const from = i.cursor
        const set = new Set(this.children)
        let productive = true
        const astNodes: ASTNode[] = []
        while(set.size > 0 && productive) {
            productive = false
            for(const option of this.children) {
                if(!set.has(option)) { continue }
                const result = i.parseNode(option)
                if(!("error" in result)) {
                    set.delete(option)
                    productive = true
                    astNodes.push(...result.astNodes)
                }
            }
        }
        return productive ? {length: i.cursor - from, astNodes} :
            {error: "Missing permutation elements", location: i.cursor}
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

    public checkRules(): Set<string> {
        const result = new Set<string>
        this.rules.forEach((node, name) => {
            node.recursiveVisit(n => {
                if(n instanceof GNRuleUse && !this.rules.has(n.ruleName)) {
                    result.add(n.ruleName)
                }
            })
        })
        return result
    }

    public optimizeNodes(): void {

    }

    public setRule(name: string, nameLocation: number, exp: GrammarNode): ParsingError | undefined {
        if(this.rules.has(name)) {
            return {location: nameLocation, description:`Redefined rule '${name}'`}
        }
        this.rules.set(name, exp)
    }

    public getRule(ruleName: string): GrammarNode | undefined {
        return this.rules.get(ruleName)
    }


    public print(p: Printer) {
        this.rules.forEach((gn, name) => {
            p.print(`${name} = `)
            gn.print(p)
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



function isWS(c: string | undefined): boolean { return c != null && /\s/.test(c); }
function isAlpha(c: string | undefined): boolean { return c != null && /[a-zA-Z_]/.test(c) }
function isAlphanum(c: string | undefined): boolean { return c != null && /[0-9a-zA-Z_]/.test(c) }

type RuleModifier   = { pre: boolean, inf: boolean, suf: boolean }

function ruleModifierFromName(name: string): RuleModifier | undefined
{
    switch(name) {
        case "infixing":    return { pre: false, inf: true,  suf: false }
        case "outfixing":   return { pre: true,  inf: true,  suf: true  }
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
    private errors: ParsingError[] = []

    public constructor() {}

    public getGrammar(): Grammar { return this.grammar }
    public getErrors(): ParsingError[] { return this.errors }



    // axiom ::= rule*
    public parse(code: string): boolean {
        this.code = code
        this.cursor = 0
        this.errors.length = 0
        this.grammar = new Grammar()
        while(this.cursor < this.code.length) {
            this.skipWS()
            this.parseRule(false, false, false, null, false)
        }
        this.skipWS()
        if(this.cursor != this.code.length) { return this.error("Garbage after last rule.") }
        if(!this.grammar.initializeAxiom()) { return this.error(`Rule '${AXIOM_RULE_NAME}' is missing.`) }
        const missingRules: Set<string> = this.grammar.checkRules()
        if(missingRules.size != 0) {
            return this.error("Missing rules: " + [...missingRules].map(r=>`'${r}'`).join(","))
        }
        this.grammar.optimizeNodes()
        return this.errors.length == 0
    }

    // rule ::= modifier modified_rules ";" / identifier (":=" | "=") expression ";"
    private parseRule(pre: boolean, inf: boolean, suf: boolean, infix: GrammarNode | null, nested: boolean): void {
        const from = this.cursor
        const name = this.readIdentifier()
        if(name == null) { this.error("Expecting rule name."); return }
        const ruleModifier = ruleModifierFromName(name)
        if(ruleModifier != null) {
            if(nested) { this.error("Nesting a rule modifier."); return }
            return this.parseModifiedRules(ruleModifier)
        }

        this.skipWS()
        let wrap: boolean
        if(this.code[this.cursor] == ':') {
            if(!this.matchTerminals(":=", "Expecting := after rule name.")) { return }
            wrap = true
        } else {
            if(!this.matchTerminals("=", "Expecting = after rule name.")) { return }
            wrap = false
        }

        let exp = this.parseFullExpression(inf ? infix : null)
        if(exp == null) { this.skipAfterSemicolon(); return }
    
        if(infix != null) {
            const concatArray = pre ? [infix, exp] : [exp]
            if(suf) { concatArray.push(infix) }
            exp = new GNConcat(exp.from, exp.to, concatArray)
        }

        if(!this.matchTerminals(";", "Expecting rule terminator ;")) { this.skipAfterSemicolon(); return }

        if(RESERVED_RULE_NAMES.includes(name)) { this.error(`Name ${name} is reserved.`); return }

        this.grammar.setRule(name, from, wrap ? new GNTag(from, this.cursor, name, exp) : exp)
    }

    // modified_rules ::= identifier "do" rule* "done"
    private parseModifiedRules({pre, inf, suf}: RuleModifier): void
    {
        const from = this.cursor
        const name = this.readIdentifier()
        if(name == null) { this.skipAfterDone(); this.error("Expecting the modifying rule name." ); return }
        const ruleUse = new GNRuleUse(from, this.cursor, name)
        if(!this.matchTerminals("do", true)) { this.skipAfterDone(); return }
        while(!this.matchTerminals("done", false)) {
            this.parseRule(pre, inf, suf, ruleUse, true)
        }
    }

    // fullexpr ::= branch ("/" branch)*
    private parseFullExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const begin = this.cursor
        const branchArray: GrammarNode[] = []
        do {
            this.skipWS()
            const branch = this.parseBranchExpression(infix)
            if(branch == null) { this.skipToOneOf("/;") }
            else               { branchArray.push(branch) }
        } while(this.matchTerminals("/", false))

        if(branchArray.length == 0) { return null }
        if(branchArray.length == 1) { return branchArray[0] }
        return new GNBranch(begin, this.cursor, branchArray)
    }

    // branch ::= element+
    private parseBranchExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const from = this.cursor
        const elem = this.parseElementExpression(infix)
        if(elem == null) { return }
        this.skipWS()
        const concatArray = [elem]
        while(this.isStartOfElementExpression()) {
            if(!(infix instanceof GNEpsilon)) { concatArray.push(infix) }
            const elem = this.parseElementExpression(infix)
            if(elem == null) { return }
            concatArray.push(elem)
            this.skipWS()
        }

        return concatArray.length == 1 ? concatArray[0] : new GNConcat(from, this.cursor, concatArray)
    }

    private isStartOfElementExpression(): boolean {
        const c = this.code[this.cursor]
        if(c == null) { return false }
        if(/[,\/;})]/.test(c)) { return false }
        // Avoid </ which is not a start of an element
        return this.code[this.cursor] != '<'.charCodeAt[0] || this.code[this.cursor + 1] != '/'.charCodeAt[0]
    }

    // element ::= extended ("%" extended)
    private parseElementExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const begin = this.cursor
        let result = this.parseExtendedExpression(infix)
        if(result == null) { return }

        while(this.matchTerminals("%", false)) {
            const from = this.cursor
            let right = this.parseExtendedExpression(infix)
            if(right == null) { return }

            if(!(infix instanceof GNEpsilon)) {
                right = new GNConcat(from, this.cursor, [infix, right, infix])
            }
    
            result = new GNOneOrMore(begin, this.cursor, result, right)
        }

        return result
    }

    private readArrayOfPrefixExpressions(left: GrammarNode, separator: string, infix: GrammarNode | null)
    : GrammarNode[] | undefined
    {
        const array = [left]
        while(this.code[this.cursor] == separator) {
            ++this.cursor
            this.skipWS()
            const right = this.parsePrefixExpression(infix)
            if(right == null) { return }
            this.skipWS()
            array.push(right)
        }
        return array
    }

    // extended ::= pre ( "^" pre / "." pre / "-" pre )*
    private parseExtendedExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const begin = this.cursor
        const prefix = this.parsePrefixExpression(infix)
        if(prefix == null) { return }
        let left = prefix
        this.skipWS()
        for(;;) {

            switch(this.code[this.cursor]) {
                case '^': {
                    const permutationArray = this.readArrayOfPrefixExpressions(left, '^', infix)
                    if(permutationArray == null) { return }
                    left = new GNPermutation(begin, this.cursor, permutationArray)
                    break
                }
                default: return left
            }
        }
    }

    // pre ::= "&" pre / "!" pre / "#" pre / post
    protected parsePrefixExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        const from = this.cursor
        if(this.matchTerminals("&", false)) {
            const pre = this.parsePrefixExpression(infix)
            if(pre == null) { return }
            return new GNPredicate(from, this.cursor, true, pre)
        }
        if(this.matchTerminals("!", false)) {
            const pre = this.parsePrefixExpression(infix)
            if(pre == null) { return }
            return new GNPredicate(from, this.cursor, false, pre)
        }
        if(this.matchTerminals("#", false)) {
            const pre = this.parsePrefixExpression(infix)
            if(pre == null) { return }
            return new GNBarrier(from, this.cursor, pre)
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
                result = new GNZeroOrMore(from, this.cursor, result)
            } else if(this.matchTerminals("+", false)) {
                result = new GNOneOrMore(from, this.cursor, result)
            } else if(this.matchTerminals("?", false)) {
                result = new GNZeroOrOne(from, this.cursor, result)
            } else if(this.matchTerminals(",", false)) {
                result = new GNCut(from, this.cursor, result)
            } else {
                return result
            }
        }
    }

    // atom ::= id / string / range / "(" fullexpr ")" / "{" fullexpr "}" / "<" id ">" fullexpr "</" id ">"
    private parsePrimaryExpression(infix: GrammarNode | null): GrammarNode | undefined
    {
        switch(this.code[this.cursor]) {
            case '"': return this.parseString()
            case '[': return this.parseRange()
            case '(': return this.parseParentheses(infix)
            case '{': return this.parseShowTerminals(infix)
            case '<': return this.parseTaggedExpression(infix)
        }
        
        const from = this.cursor
        const id = this.readIdentifier()
        if(id != null) { return new GNRuleUse(from, this.cursor, id) }
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
        this.skipWS()
        return new GNString(from, this.cursor, result)
    }

    private readEscaped(): string | undefined {
        switch(this.code[this.cursor]) {
            case 'n':  ++this.cursor; return "\n"
            case 'r':  ++this.cursor; return "\r"
            case 't':  ++this.cursor; return "\t"
            case '\\': ++this.cursor; return "\\"
            case '^':  ++this.cursor; return "^"
            case '[':  ++this.cursor; return "["
            case ']':  ++this.cursor; return "]"
            case '-':  ++this.cursor; return "-"
        }

        return undefined
    }

    private parseRange(): GrammarNode | undefined
    {
        const from = this.cursor
        ++this.cursor // Skip [

        const negated = this.code[this.cursor] == '^'
        if(negated) { ++this.cursor }
        const set = new Set<string>()
        if(!this.parseRangeElement(set)) { this.error("Expecting a range element."); return }
        while(this.parseRangeElement(set));
        if(this.cursor >= this.code.length) { this.error("End of file reached inside a range"); return }
        this.matchTerminals("]", true)
        return new GNSet(from, this.cursor, negated, set)
    }

    private parseRangeElement(set: Set<string>): boolean
    {
        if(this.cursor >= this.code.length) { return false }
        let first = this.code[this.cursor]
        if(first == ']') { return false }
        if(first == '\\') {
            ++this.cursor
            const escaped = this.readEscaped()
            if(escaped == null) { this.error("Unknown escape sequence."); return false }
            first = escaped
        }
        if(this.code[this.cursor] != '-') {
            set.add(first)
            return true
        }

        ++this.cursor // Skip -
        let last = this.code[this.cursor]
        if(last == '\\') {
            ++this.cursor
            const escaped = this.readEscaped()
            if(escaped == null) { this.error("Unknown escape sequence."); return false }
            last = escaped
        }

        if(last < first) {
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
        return new GNShowTerminals(from, this.cursor, expr)
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
        return new GNTag(from, this.cursor, tag, expr)
    }



    protected readIdentifier(): string | undefined {
        this.skipWS()
        const start = this.cursor
        if(!isAlpha(this.code[this.cursor])) { return undefined }
        ++this.cursor
        while(isAlphanum(this.code[this.cursor])) {
            ++this.cursor
        }
        return this.code.slice(start, this.cursor)
    }

    protected matchTerminals(terminals: string, reportError: boolean | string): boolean {
        if(terminals.length == 0) { return this.error("INTERNAL: Invalid argument to Parser#matchTerminals()")}
        this.skipWS()
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

    private skipAfterSemicolon() {
        while(this.cursor < this.code.length) {
            if(this.code[this.cursor] == ';') { ++this.cursor; return }
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
            while(isWS(this.code[this.cursor])) { ++this.cursor }
            if(this.code[this.cursor] == '/') {
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
            return true
        }

        // Not a comment
        return false
    }

    private error(description: string): false
    {
        this.errors.push({location: this.cursor, description})
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
    public rootAST: ASTNode = {from: -1, to: -1, name: "ERROR", children: undefined }
    public memo = new Map<number, Map<GrammarNode, MemoInfo>>()
    private grammar = new Grammar()
    public error: ParsingError = {description: "none", location: 0}
    public cursor = 0
    private code = ""
    public cutting = false
    public showTerminals = 0


    public parse(code: string, grammar: Grammar): boolean
    {
        this.code = code
        this.grammar = grammar
        const axiom = grammar.getAxiom()
        if(axiom == null) {
            this.error.description = "Invalid grammar"
            this.error.location = 0
            return false
        }
        const result = this.parseNode(axiom)
        if("error" in result) {
            this.error.description = result.error
            this.error.location = 0 // TODO
            return false
        }
        this.rootAST = this.createNonTerminal("ROOT", 0, result.astNodes)
        return true
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

    public createNonTerminal(name: string, from: number, children: ASTNode[]): ASTNode
    {
        return {from, to: this.cursor, name, children}
    }

    public createTerminalArray(name: string, from: number): ASTNode[]
    {
        return this.showTerminals > 0 ? [{from, to: this.cursor, name, children: undefined}] : []
    }

    public getRule(ruleName: string) {
        return this.grammar.getRule(ruleName)
    }

    public parseNode(gNode: GrammarNode): MemoInfo
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
        const result = gNode.interpret(this)
        memoAtCursor.set(gNode, result)
        return result
    }
}


// TTTTTTT EEEEEEE  SSSSS  TTTTTTT 
//   TTT   EE      SS        TTT   
//   TTT   EEEEE    SSSSS    TTT   
//   TTT   EE           SS   TTT   
//   TTT   EEEEEEE  SSSSS    TTT   


const p = new GrammarParser()

if(p.parse('start := "test" ;')) {
    const c = new Printer()
    p.getGrammar().print(c)
    c.dumpToConsole()
} else {
    console.log(p.getErrors().map(e => `${e.location}: ${e.description}`).join("\n"))
}


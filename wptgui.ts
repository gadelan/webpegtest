
import {
    ASTNode,
    GrammarIface,
    GrammarNodeIface,
    MemoInfo,
    MemoMaps,
    ParsingError,
    parseGrammar,
    parseInput
} from "./wpegtest.js"


const demo1grammar = `
//
// Welcome to WebPEGTest, a parsing expression grammar (PEG) interpreter.
//

// This is the grammar definition file. The window below this one holds the input file. First, we define a grammar here,
//  and then, we feed it an input to see how the grammar parses it. The results appear in the ouput and memo windows on
//  the right side.

/* Both line comments (with //) and block comments (like this one) are available here, in the grammar definition file */

// Grammars are a list of rules. Each rule is defined by a name, an equal sign and a PEG expression.
// The axiom is the rule the input will be parsed against. In WebPEGTest, the axiom is always named 'start'.
// Rules must be terminated with a semicolon.

start = "a" myRule "c";

// Quoted strings are required to appear in the input file. Unquoted identifiers are rule names. The expression of
//  the corresponding rule is used where a rule name is written. The above axiom states that text parseable by the rule
//  myRule must appear between "a" and "c" in the input. Let's define that rule.

myRule = "x" / "y";

// Rules may have branches separated by a slash. If a branch does not match the input, the next branch is tried. This
//  happens in order, from the left branch to the right one. This is a defining feature of PEGs and makes them
//  unambiguous. In myRule first an "x" is tried and, if not found, then a "y" is tried. In the case all branches fail,
//  the whole rule fails.

// When the parsing is successful, a ROOT node appears in the output window. So far we have no generated any child node
//  for that root. We will do that in the second demo.

// A PEG grammar stops when the axiom is parsed which may happen before reaching the end of file (EOF) of the input. In
//  that case, a warning message appears after the root node. You can try that now writing something after "ayc" in the
//  input file window.

// PEGs are implemented by WebPEGTest using a Packrat parser with memoization. The rightmost window shows the contents
//  of the memo (the remembered results of parsing expressions at different positions of the input). The outer boxes of
//  the memo are related to positions in the input file where a PEG expression was tested. You can click on them (where
//  is says "At 0", "At 1"...) to highlight that position in the input file window. Sometimes a position is not very
//  interesting and it clutters the memo view. You can hide the contents of a position by it clicking on the ⊖ and
//  show it again clicking on the ⊕.

// The axiom (rule named "start") is always the first one at position 0.

// Inside the box of positions, the result of all tried PEG expessions in that position is listed. Every try is either
//  a success or an error. When clicking on the result title, the expression on the grammar is highlighted, the
//  corresponding input is also shown and the just clicked memoized result is also marked. Every memoized result is
//  given a name composed of an M and a number. Some results depend on others which are listed and styled as hyperlinks.
//  When clicked, the corresponding memoized result, input section and grammar expression are highlighted.

// On the right side of the grammar window title, there are buttons to load and save the grammar as a file. Also the
//  demo buttons are there.

// On the right side of the input window title, there are buttons to load and sabe the input as a file.

// On the right side of the output window title a checkbox shows or hide the AST of the rule expressions. This is not
//  very useful, but shows the grammar is also parseable as a PEG. Clicking on the AST nodes, hillight the part
//  of the grammar that generated it.
`

const demo1input = `ayc`

const demo2grammar = `
//
// Predefined rules and escape sequences
//

// There are some predefined rules. All of them are named with capital lettes.
// WS      will match any whitespace character.
// EOF     will match the end of file.
// ANY     will match any character but the end of file.
// EPSILON will match nothing and always be successful.
// ERROR   will match nothing and always fail.

// Some escape sequences are available when using the quotation or ranges (see below).
// "\\n" will be the new line character.
// "\\r" will be the carry return character.
// "\\t" will be the horizontal tabulation character.
// "\\\\" will be the backslash character.
// "\\^" will be the caret character.
// "\\[" will be the open bracket character.
// "\\]" will be the close bracket character.
// "\\-" will be the hyphen/minus character.


//
//  Ranges
//

// To define a range of characters we use the square bracket expression. In this expression any character listed
//  between the brackets, may be matched. For instance, [0123456789ABCDEFabcdef] will macth an hexadecimal digit. To
//  abbreviate consecutive characters, a hyphen can be used [0-9A-Fa-f]. Unicode codepoints are used to calculate these
//  ranges so [A-f] will include all the capital letters, some symbols and the small letters up to the f.

alphanum = [a-zA-Z0-9] ;

// A range may start with a caret after the opening bracket to negate the range. So, [^abc] will match any character
//  but the letters a, b and c. End of file (EOF) is never matched by a range, even negated ones.


//
//  Output nodes
//

// So far we have not created any output except from the root node. There are three ways of adding nodes. The first one
//  is copying a part of the input. This is specified by curly brackets. Whenever a character is matched from the
//  input inside these brackets (even by inner rules), a new node is created. These nodes contain the matched input
//  literally and are called terminal nodes. 

literal = {alphanum alphanum alphanum} ;

// When showing terminal nodes on the output, contiguous ones are coalesced. You will have to click on the individual
//  characters to hilight the grammar, input and memo. If you click on the box of a coalesced terminal node, only
//  the input will be hilighted. Try clicking on the "<123" of taggedRule.

// The second method of adding a node to the output is using a tag expression. This will create a node with the name
//  of the tag. To tag an expression, surround it in an XML-like element. All nodes created by the expression inside
//  the tag will appeard as child nodes of the created tag node. In this demo, the node "oneOrMore" contains a child
//  tagged as "taggedRule" which has in turn three children a terminal "<abc" node, a "myTag" tagged node and a terminal
//  ">" node. The next rule tags the expression "literal" and names it "myTag".

pair = literal WS <myTag>literal</myTag> ;

// The third one abbreviates the tagging of a rule. Using a colon before the equal sign when defining a rule
//  automatically tags it with the rule name.

taggedRule := "<" pair ">" ;


//
//  Repetitions and options
//

// To repeat matching an expression one or more times, a postfix plus is used.

oneOrMore := taggedRule+ ;

// To repeat matching a expression zero or more times, a postfix asterisk is used.

zeroOrMore := taggedRule* ;

// To make the matching of an expression optional (zero or one times), a postfix questiong mark is used.

zeroOrOne := taggedRule? ;

// If you want to separate the repetitions with a separator, follow the expression by a percent symbol and
//  the separator.

separated := taggedRule+ % "," ;


//
//  Demo
//

// The axiom of this demo is:

start = "oom" oneOrMore "\\nzom" zeroOrMore "\\nzoo" zeroOrOne "\\nsep" separated ;

// Change the input file to check how this demo grammar works.
`

const demo2input = `oom<abc xyz>
zom
zoo
sep<123 PQR>,<g4g f5f>`

const demo3grammar = `
//
// Permutations
//

// Because of the deterministic nature of PEGs, it is very difficult to express permutations. To alleviate this,
//  permutation expressions are used. These are infix expressions with a caret as their operand.

myPermutation := "a" ^ "b" ^ "c";

// A weaker form of permutation expressions are optional-list expressions. Where permutation expression require all
//  of their elements to appear when matching the input, optional-list expression only require at least one. Optional-
//  list expressions are infix expressions with a dot as their operand.

myOptional := "p" . "q" . "r";

// Both permutation and optional-lists accept the separator operator %


//
// Modified rules
//

// Many times your grammar will ignore whitespaces because you are testing a whitespace insensitive language. This
//  would require to insert WS* between every pair of concatenated expressions, which is cumbersome. To ease this,
//  WebPEGTest allows rules to be modified inserting another rule use automatically in concatenations. This second rule
//  will be called the inserted rule. To modify a sequence of rules this way, write "infixing", the name of the
//  inserted rule, "do", the rules you want to modify and "done". You can write more than one rule between "do" and
//  "done".

skipWS = WS*;

infixing skipWS do
    whitespaceInsensitive := myPermutation "=>" myOptional;
done

// The above modified rule is exactly equal to
//  whitespaceInsensitive := myPermutation skipWS "=>" WS myOptional;

// There are several modification types depending on where to insert the inserted rule. The following table summarizes
//  them.

// Modification              How the rule  whitespaceInsensitive := myPermutation "=>" myOptional;  would be changed.
// ------------------------------------------------------------------------------------------------------------------
// infixing                  whitespaceInsensitive :=        myPermutation skipWS "=>" skipWS myOptional       ;
//
// allfixing                 whitespaceInsensitive := skipWS myPermutation skipWS "=>" skipWS myOptional skipWS;
// prefixing                 whitespaceInsensitive := skipWS myPermutation skipWS "=>" skipWS myOptional       ;
// suffixing                 whitespaceInsensitive :=        myPermutation skipWS "=>" skipWS myOptional skipWS;
//
// appending                 whitespaceInsensitive :=        myPermutation        "=>"        myOptional skipWS;
// prepending                whitespaceInsensitive := skipWS myPermutation        "=>"        myOptional       ;
// surrounding               whitespaceInsensitive := skipWS myPermutation        "=>"        myOptional skipWS;

// Note that these modifications also work inside repetitions and nested expressions. So a rule with expression "a"*
//  will be modified to  ("a"* % skipWS)   and   "a"+ % "b"   will be modified to  "a"+ % (skipWS "b" skipWS)
//  The separation operator will not do this. So, ("a" "b")* % "x" is the same as  "ab"* % "x"


//
//  Left recursion
//

// A rule recurs when it uses itself either directly or through other rules. When a rule recurs before matching any
//  character of an input, the PEG interpreter would loop forever. Since concatenation expressions are matched from
//  left to right, before here means on the left and this kind of grammars are said to have left recursion.
// 
// WebPEGTest does not detect grammars with left recursion, but does detect recursions while parsing an input. Trying to
//  recur will reject the rule. This means that even if a grammar has left recursion, as long as it is not used, it will
//  be accepted.

start := start "," whitespaceInsensitive / whitespaceInsensitive ;

// Recursive rules are better expressed using repetition operations.  In the above case,
// start := whitespaceInsensitive+ % ",";
`

const demo3input = `abc=>q,bca=>rp`




class TextAreaWithHilighting {
    private markStart?: number
    private markEnd?: number
    private delegatedHandler?: (this: GlobalEventHandlers, ev: Event) => any

    constructor(
        private textarea: HTMLTextAreaElement,
        private backdrop: HTMLDivElement,
        private hilights: HTMLDivElement
    ) {
        textarea.oninput = () => { this.applyHilights() }
        textarea.onscroll = () => {
            this.backdrop.scrollTop = this.textarea.scrollTop
            this.backdrop.scrollLeft = this.textarea.scrollLeft
        }
        const that = this
        this.textarea.oninput = function(this: GlobalEventHandlers, ev: Event) {
            that.hideHilight()
            if(that.delegatedHandler != null) {
                return that.delegatedHandler.apply(this, [ev])
            }
        }
    }

    private applyHilights(): void {
        const text = this.textarea.value
        let result: string
        if(this.markEnd == null || this.markStart == null
            || !Number.isFinite(this.markStart) || !Number.isFinite(this.markEnd)
            || this.markStart < 0 || this.markStart > text.length
        ) {
            result = text
        } else {
            const start = this.markStart > text.length ? text.length : this.markStart;
            const end = this.markEnd < start ? start : (this.markEnd > text.length ? text.length : this.markEnd );
            result = escapeHTML(text.slice(0, start)) + "<mark>" + escapeHTML(text.slice(start, end))
                + "</mark>" + escapeHTML(text.slice(end));
        }
        this.hilights.innerHTML = result.replace(/\n$/g, '\n\n')
    }

    public showHilight(start: number, end: number, useErrorColor: boolean) {
        this.markStart = start
        this.markEnd = end
        this.applyHilights()
        const mark = this.hilights.querySelector("mark")
        if(mark != null) {
            this.textarea.scrollTop = mark.offsetTop - this.textarea.offsetHeight / 2;
            if(useErrorColor) {
                mark.style.backgroundColor = "coral"
                mark.style.borderColor = "coral"
            }
        }
    }

    public hideHilight() {
        this.markStart = this.markEnd = undefined
        this.applyHilights()
    }

    public getText(): string {
        return this.textarea.value
    }

    public setText(text: string) {
        this.textarea.value = text
        this.hideHilight()
    }


    public setOnInput(handler: (this: GlobalEventHandlers, ev: Event) => any) {
        this.delegatedHandler = handler
    }

    public triggerOnInput() {
        if(this.delegatedHandler != null) {
            this.delegatedHandler.apply(null, [null])
        }
    }

}



function makeDivFoldable(div: HTMLDivElement): void {
    const knob = document.createElement("span")
    knob.textContent = "⊖"
    knob.classList.add("knob")
    knob.title = "Click to fold/unfold"
    knob.onclick = event => {
        div.childNodes.forEach(node => node instanceof HTMLDivElement ? node.classList.toggle("hide") : 0)
        knob.textContent = knob.textContent == "⊕" ? "⊖" : "⊕"
        event.preventDefault()
        event.stopImmediatePropagation()
    }
    div.prepend(knob)
}

function createSpanForMemoChild(memoInfo: MemoInfo, elements: UserInterfaceElements): HTMLSpanElement {
    const span = document.createElement("span")
    span.textContent = "m" + memoInfo.id
    span.classList.add("memolink")
    span.title = "Click to go to hilight. Double click to go."
    span.onclick = event => {
        elements.hilightMemoGrammarAndInput(memoInfo, false)
        event.preventDefault()
        event.stopImmediatePropagation()
    }
    span.ondblclick = event => {
        elements.hilightMemoGrammarAndInput(memoInfo, true)
        event.preventDefault()
        event.stopImmediatePropagation()
    }
    return span
}

function appendMemoChildren(parent: HTMLDivElement, children: MemoInfo[], elements: UserInterfaceElements) {
    if(children.length <= 0) { return }
    parent.append(document.createElement("br"))
    parent.append(" (")
    children.forEach((child, idx) => {
        if(idx > 0) { parent.append(", ") }
        parent.append(createSpanForMemoChild(child, elements))
    })
    parent.append(")")
}

function createMemoInfoDiv(
    node: GrammarNodeIface,
    info: MemoInfo,
    elements: UserInterfaceElements
): HTMLDivElement {
    const div = document.createElement("div")
    div.id = "m" + info.id
    div.classList.add("node")
    div.title = "Click to show in grammar and input."
    div.onclick = event => {
        elements.hilightMemoGrammarAndInput(info, true)
        event.preventDefault()
        event.stopImmediatePropagation()
    }
    if("length" in info) {
        div.textContent = `M${info.id} OK: ${node.id}`
        appendMemoChildren(div, info.children, elements)
        div.classList.add("ok")
    } else {
        div.textContent = `M${info.id} ERROR: ${node.id}`
        appendMemoChildren(div, info.children, elements)
        div.append(document.createElement("br"))
        div.append(info.error)
        div.classList.add("err")
    }


    return div
}

function showMemo(memo: MemoMaps, elements: UserInterfaceElements) {
    elements.clearMemos()
    memo.forEach((nodeMap, inputPos) => {
        const div = document.createElement("div")
        div.append("At " + inputPos)
        div.classList.add("node")
        div.title = "Click to show position in input"
        div.onclick = event => {
            elements.hilightInput(inputPos, inputPos + 1, false)
            event.stopImmediatePropagation()
            event.preventDefault()
        }
        makeDivFoldable(div)
        nodeMap.forEach((info, node) => {
            const infodiv = createMemoInfoDiv(node, info, elements)
            if(node.id.includes("Tag 'start'")) {
                div.querySelector("div").before(infodiv)
            } else {
                div.append(infodiv)
            }
        
        })

        elements.appendMemo(div)
    })
}

function showErrors(errors: ParsingError[], elements: UserInterfaceElements, errorInGrammar: boolean) {
    elements.clearOutput()
    if(errors.length == 0) {
        const errorDiv = document.createElement("div")
        errorDiv.textContent = "NO GRAMMAR"
        elements.appendOutput(errorDiv)
        return
    }
    errors.forEach(error => {
        const errorDiv = document.createElement("div")
        errorDiv.textContent = "ERROR: " + error.description
        errorDiv.classList.add("node")
        errorDiv.title = "Click to show location in input."
        errorDiv.onclick = () => {
            if(errorInGrammar) { elements.hilightGrammar(error.location, error.location + 1, true) }
            else               { elements.hilightInput  (error.location, error.location + 1, true) }
        }
        elements.appendOutput(errorDiv)
    })
}

function createSpanForGrammarASTNode(node: GrammarNodeIface): HTMLSpanElement {
    const span = document.createElement("span")
    span.textContent = node.id
    return span
}

function createGrammarASTElement(parent: HTMLDivElement, node: GrammarNodeIface, elements: UserInterfaceElements) {
    const div = document.createElement("div")
    div.classList.add("node")
    div.append(createSpanForGrammarASTNode(node))
    div.title = "Click to show in grammar."
    div.onclick = event => {
        elements.hilightGrammar(node.from, node.to, false)
        event.stopImmediatePropagation()
        event.preventDefault()
    }
    const {children, separator} = node.getChildren()
    if(children.length == 0 && separator == null) { parent.append(div); return }
    makeDivFoldable(div)
    children.forEach(child => { createGrammarASTElement(div, child, elements) })
    if(separator != null) {
        div.append("Separator:")
        createGrammarASTElement(div, separator, elements)
    }
    parent.append(div)
}

function showGrammarAST(grammar: GrammarIface, elements: UserInterfaceElements) {
    elements.clearGrammarAST()
    const titleDiv = document.createElement("div")
    titleDiv.classList.add("title")
    titleDiv.textContent = "Grammar AST:"
    elements.appendGrammarAST(titleDiv)
    grammar.getRuleNames().forEach(ruleName => {
        const axiom = grammar.getRule(ruleName)
        if(axiom == null) { return }
        const div = document.createElement("div")
        div.textContent = ruleName
        elements.appendGrammarAST(div)
        createGrammarASTElement(div, axiom, elements)
    })
}

function escapeTerminalAndQuoteInHTML(text: string) {
    const replaced = text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;")
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace("\t", "\\t")
        .replace("\r", "\\r")
    return replaced
}

function hilightASTNode(node: ASTNode, elements: UserInterfaceElements): void {
    if(node.memoInfo != null) {
        elements.hilightMemoGrammarAndInput(node.memoInfo, true)
    } else {
        elements.hilightGrammarAndInput(node.grammarNode.from, node.grammarNode.to, node.from, node.to)
    }    
}

function createSpanForASTNode(node: ASTNode, elements: UserInterfaceElements)
: HTMLSpanElement {
    const span = document.createElement("span")
    if(node.name != null) {
        span.textContent = node.name // Non-terminal
    } else {
        span.innerHTML = escapeTerminalAndQuoteInHTML(elements.getInputText().slice(node.from, node.to)) // Terminal
        span.classList.add("terminal")
        span.title = "Click to show in input."
        span.onclick = event => {
            hilightASTNode(node, elements)
            event.stopImmediatePropagation()
            event.preventDefault()
        }
    }
    return span
}

function concatenateTerminals(div: HTMLDivElement, node: ASTNode, from: number, elements: UserInterfaceElements): void {
    div.onclick = event => {
        elements.hilightInput(from, node.to, false)
        event.stopImmediatePropagation()
        event.preventDefault()
    }
    div.append(createSpanForASTNode(node, elements))
}

function createASTElement(node: ASTNode, elements: UserInterfaceElements): HTMLDivElement {
    const div = document.createElement("div")
    div.classList.add("node")
    div.append(createSpanForASTNode(node, elements))
    div.title = "Click to show in input."
    div.onclick = event => {
        hilightASTNode(node, elements)
        event.stopImmediatePropagation()
        event.preventDefault()
    }
    if(node.children == null || node.children.length == 0) { return div }
    makeDivFoldable(div)
    let lastChildAST: ASTNode | undefined = undefined
    let lastChildDiv: HTMLDivElement | undefined = undefined
    let lastFrom = 0
    node.children.forEach(child => {
        if(lastChildAST != null && !("name" in lastChildAST) && !("name" in child)) {
            concatenateTerminals(lastChildDiv, child, lastFrom, elements)
        } else {
            lastChildDiv = createASTElement(child, elements)
            lastFrom = child.from
            div.append(lastChildDiv)
        }
        lastChildAST = child
    })
    return div
}

function showAST(rootNode: ASTNode, elements: UserInterfaceElements) {
    elements.clearOutput()
    elements.appendOutput(createASTElement(rootNode, elements))
}

function showWarningDiv(elements: UserInterfaceElements, parsedToLocation: number) {
    const div = document.createElement("div")
    div.textContent = "Warning: end of input file not reached by parsing."
    div.classList.add("title")
    div.style.color = "red"
    div.title = "Click to go to first unparsed character."
    div.onclick = event => {
        elements.hilightInput(parsedToLocation, parsedToLocation + 1, false)
        event.stopImmediatePropagation()
        event.preventDefault()
    }
    elements.appendOutput(div)
}

function saveFile(filename: string, text: string): void {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function check<T>(selector: string, ctor: new () => T): T {
    const elem = document.querySelector(selector)
    if(elem == null) { throw new Error("Require HTML element not found.") }
    if(elem instanceof ctor) { return elem }
    throw new Error("Invalid type of required HTML element")
}

function escapeHTML(text: string): string
{
    return text
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}


class UserInterfaceElements {
    private grammarArea: TextAreaWithHilighting
    private inputArea: TextAreaWithHilighting
    private demoButtons: HTMLButtonElement[]
    private outputElem: HTMLDivElement
    private memoElem: HTMLDivElement
    private grammarASTCheck: HTMLInputElement
    private grammarAST: HTMLDivElement
    private memoScrollParent: HTMLDivElement

    public constructor() {
        this.outputElem = check( "#output", HTMLDivElement )
        this.memoElem = check( "#memo", HTMLDivElement )
        this.memoScrollParent = check ("#mparent", HTMLDivElement )

        this.grammarASTCheck = check( "#gast", HTMLInputElement )
        this.grammarAST = check( "#grammarast", HTMLDivElement )

        const grammarSaveAs = check( "#gsaveas", HTMLButtonElement )
        const grammarLoad = check( "#gload", HTMLButtonElement )
        const inputSaveAs = check( "#isaveas", HTMLButtonElement )
        const inputLoad = check( "#iload", HTMLButtonElement )

        this.demoButtons = [
            check( "#demo1", HTMLButtonElement ),
            check( "#demo2", HTMLButtonElement ),
            check( "#demo3", HTMLButtonElement ),
        ]
    
        this.grammarArea = new TextAreaWithHilighting(
            check( "#grammar", HTMLTextAreaElement ),
            check( "#grammarback", HTMLDivElement ),
            check( "#grammarhili", HTMLDivElement )
        )
    
        this.inputArea = new TextAreaWithHilighting(
            check( "#input", HTMLTextAreaElement ),
            check( "#inputback", HTMLDivElement ),
            check( "#inputhili", HTMLDivElement )
        )
    }

    public setInputChangeHandler(handler: (this: GlobalEventHandlers, ev: Event) => any) {
        this.inputArea.setOnInput(handler)
    }

    public setGrammarChangeHandler(handler: (this: GlobalEventHandlers, ev: Event) => any) {
        this.grammarArea.setOnInput(handler)
    }

    public setASTCheckChangeHandler(handler: (this: GlobalEventHandlers, ev: Event) => any) {
        this.grammarASTCheck.onchange = () => this.grammarAST.classList.toggle("hide")
    }
    public triggerInputChangeEvent() {
        this.inputArea.triggerOnInput()
    }
    public triggerGrammarChangeEvent() {
        this.grammarArea.triggerOnInput()
    }

    public initializeDemoButtons(...demoData: [grammar: string, input: string][]) {
        this.demoButtons.forEach((button, index) => {
            const data = demoData[index]
            if(data == null) { return }
            button.onclick = e => {
                this.grammarArea.setText(data[0]);
                this.inputArea.setText(data[1]);
                this.triggerGrammarChangeEvent()
            }
        })
    }
    public toggleGrammarASTVisibility(): void {
        this.grammarAST.classList.toggle("hide")
    }
    public getInputText(): string {
        return this.inputArea.getText()
    }
    public getGrammarText(): string {
        return this.grammarArea.getText()
    }
    public clearMemos(): void {
        this.memoElem.innerHTML = ""
    }
    public appendMemo(div: HTMLDivElement): void {
        this.memoElem.append(div)
    }
    public clearOutput(): void {
        this.outputElem.innerHTML = ""
    }
    public appendOutput(div: HTMLDivElement): void {
        this.outputElem.append(div)
    }
    public clearGrammarAST(): void {
        this.grammarAST.innerHTML = ""
    }
    public appendGrammarAST(div: HTMLDivElement): void {
        this.grammarAST.append(div)
    }

    public hilightInput(from: number, to: number, useErrorColor: boolean): void {
        this.inputArea.showHilight(from, to, useErrorColor)
        this.grammarArea.hideHilight()
        this.hideMemoHilight()
    }
    public hilightGrammar(from: number, to: number, useErrorColor: boolean): void {
        this.grammarArea.showHilight(from, to, useErrorColor)
        this.inputArea.hideHilight()
        this.hideMemoHilight()
    }

    public hilightGrammarAndInput(grammarFrom: number, grammarTo: number, inputFrom: number, inputTo: number): void {
        this.grammarArea.showHilight(grammarFrom, grammarTo, false)
        this.inputArea.showHilight(inputFrom, inputTo, false)
        this.hideMemoHilight()
    }

    private hideMemoHilight(): void {
        document.querySelectorAll(".ok").forEach(element => element.classList.remove("hili"))
        document.querySelectorAll(".err").forEach(element => element.classList.remove("hili"))
    }

    private addMemoHilight(id: number, scrollIntoView: boolean): void {
        const memo = document.querySelector("#m" + id)
        if(memo != null && memo instanceof HTMLElement) {
            if(scrollIntoView) {
                const memoRect = memo.getBoundingClientRect() 
                const parentRect = this.memoScrollParent.getBoundingClientRect()
    
                if(memoRect.top < parentRect.top)              { memo.scrollIntoView(true) }
                else if(memoRect.bottom >= parentRect.bottom ) { memo.scrollIntoView(false) }
            }
            memo.classList.add("hili")
        }
    }
    public hilightMemoGrammarAndInput(memo: MemoInfo, scrollIntoView: boolean): void {
        const error = "error" in memo
        this.grammarArea.showHilight(memo.grammarNode.from, memo.grammarNode.to, error)
        this.inputArea.showHilight(memo.position, memo.position + (memo["length"] ?? 0), error)
        this.hideMemoHilight()
        this.addMemoHilight(memo.id, scrollIntoView)
    }
    public hideHilights() {
        this.hideMemoHilight()
        this.grammarArea.hideHilight()
        this.inputArea.hideHilight()
    }

}


function run() {
    const elements = new UserInterfaceElements()

    let grammar: GrammarIface | ParsingError[] = []
    const se = showErrors

    elements.setInputChangeHandler(() => {
        elements.hideHilights()
        if(Array.isArray(grammar)) { return }
        const result = parseInput(grammar, elements.getInputText())
        showMemo(result.memo, elements)
        if("error" in result) {
            se([result.error], elements, false)
        } else {
            showAST(result.root, elements)
            const toLocation = result.parsedToLocation >= elements.getInputText().length ? -1 : result.parsedToLocation
            if(toLocation > 0) { showWarningDiv(elements, toLocation) }
        }
        showGrammarAST(grammar, elements)
    })

    elements.setASTCheckChangeHandler(() => elements.toggleGrammarASTVisibility())

    elements.setGrammarChangeHandler(ev => {
        elements.hideHilights()
        grammar = parseGrammar(elements.getGrammarText())
        if(Array.isArray(grammar)) {
            se(grammar, elements, true); 
            elements.clearMemos()
            return
        }
        elements.triggerInputChangeEvent()
    })

    // The textareas may have content if the browser page was reloaded. Parse and interpret it.
    elements.triggerGrammarChangeEvent() 

    elements.initializeDemoButtons([demo1grammar, demo1input], [demo2grammar, demo2input], [demo3grammar, demo3input])
}


try {
    run()
}
catch(e) {
    if(e instanceof Error) {
        window.alert(e.message)
    } else {
        window.alert(String(e))
    }
}



import { parseGrammar, parseInput } from "./pegtest.js";
const tutorial1grammar = `
//
// Welcome to WebPEGTest, a parsing expression grammar (PEG) interpreter.
//

// This is the grammar definition file. The window below this one contains the input file. First, we define a grammar
//  here, and then, we feed it an input to see how the grammar parses it. The results appear in the ouput and memo
//  windows on the right side.

/* Both line comments (with //) and block comments (like this one) are available here, in the grammar definition file */

// Grammars are a list of rules. Each rule is defined by a name, an equal sign and a PEG expression.
// The axiom is the rule the input will be parsed against. In WebPEGTest, the axiom is always named 'start'.
// Rules must be terminated with a semicolon.

start = "a" myRule "c";

// Quoted strings are required to appear in the input file. Unquoted identifiers are rule names. The expression of
//  the corresponding rule is used where a rule name is written. The above axiom states that text parseable by the rule
//  myRule must appear between "a" and "c" in the input.

// Rule names, quoted strings and ranges (introduced in the second tutorial) are atomic parsing expressions or atoms.

// Writing juxtaposed atoms forms a sequence expression. The above  "a" myRule "c"  is a sequence expression.
//   An ordered choice expression is a list of sequence expressions separated by slashes. Let's define myRule using
//   this kind of expression.

myRule = "x" / "y";

// In a ordered choice expression, if a sequence does not match the input, the next sequence is tried. This happens in
//  order, from the leftmost sequence to the rightmost one. This is a defining feature of PEGs and makes them
//  unambiguous. In myRule first "x" is tried and, if not found in the input, "y" is tried. In the case all sequences
//  fail, the whole rule fails.

// Ordered choice expressions can appear inside parentheses. For example, we could write the above two rules as one
//   start = "a" ("x" / "y") "b"

// When the parsing is successful, a ROOT node appears in the output window. So far we have not generated any child
//  node for that root. We will do that in the second tutorial.

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

// On the right side of the grammar window title, there are buttons to load and save the grammar as a file. Also, the
//  tutorial buttons are there.

// On the right side of the input window title, there are buttons to load and sabe the input as a file. Also, the demo
//  buttons are there.

// On the right side of the output window title a checkbox shows or hide the AST of the rule expressions. This is not
//  very useful, but shows the grammar is also parseable as a PEG. Clicking on the AST nodes, hillight the part
//  of the grammar that generated it.
`;
const tutorial1input = `ayc`;
const tutorial2grammar = `
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
// "\\"" will be the double quotation mark character.


//
//  Ranges
//

// To define a range of characters we use the square bracket expression. In this expression any character listed
//  between the brackets, may be matched. For instance, [0123456789ABCDEFabcdef] will macth an hexadecimal digit. To
//  abbreviate consecutive characters, a hyphen can be used [0-9A-Fa-f]. Unicode codepoints are used to calculate these
//  ranges so [A-f] will include all the capital letters, some symbols and the small letters up to the f.

alphanum = [a-zA-Z0-9] ;

// A range may start with a caret after the opening bracket to negate the range. So, [^abc] will match any character
//  but the letters a, b and c. End of file (EOF) is never matched by a range, even negated ones. Negated ranges are
//  not really needed in PEGs. They can be simulated using the not-predicate (see the third tutorial). However they are
//  included here for convenience.


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
//  the tag will appeard as child nodes of the created tag node. In this tutorial, the node "oneOrMore" contains a child
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

// It is possible to repeat an EPSILON rule, leading to an infinite loop. WebPEGTest has an internal iteration
//  counter which will stop too long repetitions.


//
// Predicates
//

// PEGs include two types of expressions to look ahead the input. The first one is the and-predicate which checks
//  the input matches an expression. And-predicates just check, they don't consume the input so the next expression
//  of the sequence will have to match it again. And-predicates are written using a prefix ampersand.

// The second one is the not-predicate which checks the input does not match an expression. Nothing is consumed
//  so the next expression of the sequence will have to match the input. Not-predicates are written using a prefix
//  exclamation mark.

predicates := &(ANY ANY "a") !(ANY "a") [abcd]+;

// In the above rule, the and-predicate checks there are three characters being the third one an "a". The not-predicate
//  checks there are not two characters being the second an "a". Finally we match the input to characters "a" to "d"
//  one or more times.

// This rule will not match "ccccc" because the third character is not "a".
// This rule will not match "aaaaa" because the second character is an "a".
// This rule will match "bcadab", "ddaa", "ababab" and "dcab".


//
//  Axiom
//

// The axiom of this tutorial is:

start = "oom" oneOrMore "\\nzom" zeroOrMore "\\nzoo" zeroOrOne "\\nsep" separated "\\npred" {predicates};

// Change the input file to see how this grammar works.
`;
const tutorial2input = `oom<abc xyz>
zom
zoo
sep<123 PQR>,<g4g f5f>
predcdab`;
const tutorial3grammar = `
//
// Permutations
//

// Because of the ordered nature of PEGs, it is very difficult to express permutations. To alleviate this,
//  permutation expressions are introduced. These are infix expressions with a caret as their operand.

myPermutation := "a" ^ "b" ^ "c";

// A weaker form of permutation expressions are optional-list expressions. Where permutation expression require all
//  of their elements to appear when matching the input, optional-list expression only require at least one. Optional-
//  list expressions are infix expressions with a dot as their operand.

myOptional := "p" . "q" . "r";

// Both permutation and optional-lists accept the separator operator %

// The permutation and optional-list operators are still eager and ordered. For instance, ("a" . "ab") "c"  fails
//  to match "abc" because it matches "a" to the first option of the list, but then cannot match "b" neither to "ab",
//  the second option, nor the next "c" of the sequence. On the other hand, ("ab" . "a") "c" is successful.



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
//  Cut
//

// While parsing an ordered choice expression and reaching a point when we know the other sequences won't be accepted
//  (or we don't want them to be accepted) the cut operation is used. When an ordered choice expression is cut, either
//  it finishes the current sequence expression or fails. It won't try any other sequences. To cut an ordered choice
//  expression, write a postfix comma.

cut := "[", whitespaceInsensitive "]" / "("  whitespaceInsensitive ")" / "()" / <never>"[]"</never> ;

// This rule will cut if it finds an opening square bracket, but not a round bracket. The last sequence will never
//  be reached. Cuts only affect the ordered choice expression they appear in.


//
// Operator precedence
//

// The operators used in PEG expressions have the following precedence.

// Top precedence. Atoms:   "strings"  ruleNames  [ranges]  (groups)
//     Postfix operators:   oneOrMore+  zeroOrMore*  zeroOrOne?  cut,
//      Prefix operators:   &andPredicate  !notPredicate
//             Separator:   repeat % separator
//             Sequences:   term1 term2
//       Ordered options:   opt1 / opt2


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

start := start "," cut / cut ;

// Recursive rules are better expressed using repetition operations.  In the above case,
// start := cut+ % ",";
`;
const tutorial3input = `[abc=>q],(bca=>rp),()`;
const demo1grammar = `
// PEGs are quite powerful. They can parse non-context-free languages.

start = &(ab "c") "a"+ bc EOF;
ab    = "a" ab? "b";
bc    = "b" bc? "c";
`;
const demo1input = "aaaabbbbcccc";
const demo2grammar = `
// PEGs are greedy. If they can match a character they will do it.

start = [ab]? [bc] [cd];

// This will not match "bc" because the "b" is consumed by "[ab]?" and there is no "b" left for "[bc].
// In other parsers featuring unordered options (like regular expressions), the "[ab]?" is skiped and "bc" is matched.
`;
const demo2input = "bc";
const demo3grammar = `
// The grammar describing PEGs is a PEG itself.

skipWS = (WS / comments)* ;
comments = "//" (!"\\n" ANY)* "\\n" / "/*" (!"*/" ANY)* "*/";
start = skipWS rule+ % skipWS skipWS EOF ;
infixing skipWS do
  rule := modifying / regular ;
  modifying = modificationType identifier "do" regular+ "done" ;
  regular = identifier ("=" / ":=") orderedOptions ";" ;
  orderedOptions = sequence !"/" / <orderedOptions>sequence+ % "/"</orderedOptions> ;
  sequence = separator !separator / <sequence>separator+</sequence>;
  separator = permutation !"%" / <separator>permutation ("%" permutation)?</separator> ;
  permutation = pre !("^" / ".") / <permutation>pre+ % "^"</permutation> / <optionals>pre+ % "."</optionals> ;
  pre = <andPredicate>"&" pre</andPredicate> / <notPredicate>"!" pre</notPredicate> / post ;
  post = atom !postfixOp / <postfix>atom {postfixOp*}</postfix>;
  atom = quotedString / <ruleUse>identifier</ruleUse> / range / "(" orderedOptions ")" / "{" orderedOptions "}" / tagged;
  tagged = "<" identifier ">" orderedOptions "</" identifier ">" ;
done
postfixOp = "+" / "*" / "?" / "," ;
quotedString := {"\\"" stringChar* "\\""} ;
stringChar = [^"\\\\] / escapedChar ;
identifier = {[a-zA-Z] [a-zA-Z0-9]*} ;
range := "[" "^"? rangeInterval* "]" ;
rangeInterval = rangeChar ("-" rangeChar)? ;
rangeChar = [^\\\\\\^\\-\\]] / escapedChar ; 
escapedChar = "\\\\" ("\\\\" / "n" / "\\"" / "^" / "-" / "[" / "]" / "t" / "r") ;
modificationType := "infixing" / "allfixing" / "prefixing" / "suffixing" / "appending" / "prepending" / "surrounding" ;
`;
const demo3input = demo3grammar;
class TextAreaWithHilighting {
    textarea;
    backdrop;
    hilights;
    markStart;
    markEnd;
    delegatedHandler;
    constructor(textarea, backdrop, hilights) {
        this.textarea = textarea;
        this.backdrop = backdrop;
        this.hilights = hilights;
        textarea.oninput = () => { this.applyHilights(); };
        textarea.onscroll = () => {
            this.backdrop.scrollTop = this.textarea.scrollTop;
            this.backdrop.scrollLeft = this.textarea.scrollLeft;
        };
        const that = this;
        this.textarea.oninput = function (ev) {
            that.hideHilight();
            if (that.delegatedHandler != null) {
                return that.delegatedHandler.apply(this, [ev]);
            }
        };
    }
    applyHilights() {
        const text = this.textarea.value;
        let result;
        if (this.markEnd == null || this.markStart == null
            || !Number.isFinite(this.markStart) || !Number.isFinite(this.markEnd)
            || this.markStart < 0 || this.markStart > text.length) {
            result = text;
        }
        else {
            const start = this.markStart > text.length ? text.length : this.markStart;
            const end = this.markEnd < start ? start : (this.markEnd > text.length ? text.length : this.markEnd);
            result = escapeHTML(text.slice(0, start)) + "<mark>" + escapeHTML(text.slice(start, end))
                + "</mark>" + escapeHTML(text.slice(end));
        }
        this.hilights.innerHTML = result.replace(/\n$/g, '\n\n');
    }
    showHilight(start, end, useErrorColor) {
        this.markStart = start;
        this.markEnd = end;
        this.applyHilights();
        const mark = this.hilights.querySelector("mark");
        if (mark != null) {
            this.textarea.scrollTop = mark.offsetTop - this.textarea.offsetHeight / 2;
            if (useErrorColor) {
                mark.style.backgroundColor = "coral";
                mark.style.borderColor = "coral";
            }
        }
    }
    hideHilight() {
        this.markStart = this.markEnd = undefined;
        this.applyHilights();
    }
    getText() {
        return this.textarea.value;
    }
    setText(text) {
        this.textarea.value = text;
        this.hideHilight();
    }
    setOnInput(handler) {
        this.delegatedHandler = handler;
    }
    triggerOnInput() {
        if (this.delegatedHandler != null) {
            this.delegatedHandler.apply(null, [null]);
        }
    }
}
function makeDivFoldable(div) {
    const knob = document.createElement("span");
    knob.textContent = "⊖";
    knob.classList.add("knob");
    knob.title = "Click to fold/unfold";
    knob.onclick = event => {
        div.childNodes.forEach(node => node instanceof HTMLDivElement ? node.classList.toggle("hide") : 0);
        knob.textContent = knob.textContent == "⊕" ? "⊖" : "⊕";
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    div.prepend(knob);
}
function createSpanForMemoChild(memoInfo, elements) {
    const span = document.createElement("span");
    span.textContent = "m" + memoInfo.id;
    span.classList.add("memolink");
    span.title = "Click to go to hilight. Double click to go.";
    span.onclick = event => {
        elements.hilightMemoGrammarAndInput(memoInfo, false);
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    span.ondblclick = event => {
        elements.hilightMemoGrammarAndInput(memoInfo, true);
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    return span;
}
function appendMemoChildren(parent, children, elements) {
    if (children.length <= 0) {
        return;
    }
    parent.append(document.createElement("br"));
    parent.append(" (");
    children.forEach((child, idx) => {
        if (idx > 0) {
            parent.append(", ");
        }
        parent.append(createSpanForMemoChild(child, elements));
    });
    parent.append(")");
}
function createMemoInfoDiv(node, info, elements) {
    const div = document.createElement("div");
    div.id = "m" + info.id;
    div.classList.add("node");
    div.title = "Click to show in grammar and input.";
    div.onclick = event => {
        elements.hilightMemoGrammarAndInput(info, true);
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    if ("length" in info) {
        div.textContent = `M${info.id} OK: ${node.id}`;
        appendMemoChildren(div, info.children, elements);
        div.classList.add("ok");
    }
    else {
        div.textContent = `M${info.id} ERROR: ${node.id}`;
        appendMemoChildren(div, info.children, elements);
        div.append(document.createElement("br"));
        div.append(info.error);
        div.classList.add("err");
    }
    return div;
}
function showMemo(memo, elements) {
    elements.clearMemos();
    memo.forEach((nodeMap, inputPos) => {
        const div = document.createElement("div");
        div.append("At " + inputPos);
        div.classList.add("node");
        div.title = "Click to show position in input";
        div.onclick = event => {
            elements.hilightInput(inputPos, inputPos + 1, false);
            event.stopImmediatePropagation();
            event.preventDefault();
        };
        makeDivFoldable(div);
        nodeMap.forEach((info, node) => {
            const infodiv = createMemoInfoDiv(node, info, elements);
            if (node.id.includes("Tag 'start'")) {
                div.querySelector("div").before(infodiv);
            }
            else {
                div.append(infodiv);
            }
        });
        elements.appendMemo(div);
    });
}
function showErrors(errors, elements) {
    elements.clearOutput();
    if (errors.length == 0) {
        const errorDiv = document.createElement("div");
        errorDiv.textContent = "NO GRAMMAR";
        elements.appendOutput(errorDiv);
        return;
    }
    errors.forEach(error => {
        const errorDiv = document.createElement("div");
        errorDiv.textContent = (error.grammarNode == null ? "GRAMMAR ERROR: " : "ERROR: ") + error.message;
        errorDiv.classList.add("node");
        errorDiv.title = "Click to show location in input.";
        errorDiv.onclick = () => {
            if (error.grammarNode == null) {
                elements.hilightGrammar(error.from, error.to, true);
            }
            else {
                elements.hilightGrammarAndInput(error.grammarNode.from, error.grammarNode.to, error.from, error.to, true);
            }
        };
        elements.appendOutput(errorDiv);
    });
}
function createSpanForGrammarASTNode(node) {
    const span = document.createElement("span");
    span.textContent = node.id;
    return span;
}
function createGrammarASTElement(parent, node, elements) {
    const div = document.createElement("div");
    div.classList.add("node");
    div.append(createSpanForGrammarASTNode(node));
    div.title = "Click to show in grammar.";
    div.onclick = event => {
        elements.hilightGrammar(node.from, node.to, false);
        event.stopImmediatePropagation();
        event.preventDefault();
    };
    const { children, separator } = node.getChildren();
    if (children.length == 0 && separator == null) {
        parent.append(div);
        return;
    }
    makeDivFoldable(div);
    children.forEach(child => { createGrammarASTElement(div, child, elements); });
    if (separator != null) {
        div.append("Separator:");
        createGrammarASTElement(div, separator, elements);
    }
    parent.append(div);
}
function showGrammarAST(grammar, elements) {
    elements.clearGrammarAST();
    const titleDiv = document.createElement("div");
    titleDiv.classList.add("title");
    titleDiv.textContent = "Grammar AST:";
    elements.appendGrammarAST(titleDiv);
    grammar.getRuleNames().forEach(ruleName => {
        const axiom = grammar.getRule(ruleName);
        if (axiom == null) {
            return;
        }
        const div = document.createElement("div");
        div.textContent = ruleName;
        elements.appendGrammarAST(div);
        createGrammarASTElement(div, axiom, elements);
    });
}
function escapeTerminalAndQuoteInHTML(text) {
    const replaced = text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;")
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace("\t", "\\t")
        .replace("\r", "\\r");
    return replaced;
}
function hilightASTNode(node, elements) {
    if (node.memoInfo != null) {
        elements.hilightMemoGrammarAndInput(node.memoInfo, true);
    }
    else {
        elements.hilightGrammarAndInput(node.grammarNode.from, node.grammarNode.to, node.from, node.to, false);
    }
}
function createSpanForASTNode(node, elements) {
    const span = document.createElement("span");
    if (node.name != null) {
        span.textContent = node.name; // Non-terminal
    }
    else {
        span.innerHTML = escapeTerminalAndQuoteInHTML(elements.getInputText().slice(node.from, node.to)); // Terminal
        span.classList.add("terminal");
        span.title = "Click to show in input.";
        span.onclick = event => {
            hilightASTNode(node, elements);
            event.stopImmediatePropagation();
            event.preventDefault();
        };
    }
    return span;
}
function concatenateTerminals(div, node, from, elements) {
    div.onclick = event => {
        elements.hilightInput(from, node.to, false);
        event.stopImmediatePropagation();
        event.preventDefault();
    };
    div.append(createSpanForASTNode(node, elements));
}
function createASTElement(node, elements) {
    const div = document.createElement("div");
    div.classList.add("node");
    div.append(createSpanForASTNode(node, elements));
    div.title = "Click to show in input.";
    div.onclick = event => {
        hilightASTNode(node, elements);
        event.stopImmediatePropagation();
        event.preventDefault();
    };
    if (node.children == null || node.children.length == 0) {
        return div;
    }
    makeDivFoldable(div);
    let lastChildAST = undefined;
    let lastChildDiv = undefined;
    let lastFrom = 0;
    node.children.forEach(child => {
        if (lastChildAST != null && !("name" in lastChildAST) && !("name" in child)) {
            concatenateTerminals(lastChildDiv, child, lastFrom, elements);
        }
        else {
            lastChildDiv = createASTElement(child, elements);
            lastFrom = child.from;
            div.append(lastChildDiv);
        }
        lastChildAST = child;
    });
    return div;
}
function showAST(rootNode, elements) {
    elements.clearOutput();
    elements.appendOutput(createASTElement(rootNode, elements));
}
function showWarningDiv(elements, parsedToLocation) {
    const div = document.createElement("div");
    div.textContent = "Warning: end of input file not reached by parsing.";
    div.classList.add("title");
    div.style.color = "red";
    div.title = "Click to go to first unparsed character.";
    div.onclick = event => {
        elements.hilightInput(parsedToLocation, parsedToLocation + 1, false);
        event.stopImmediatePropagation();
        event.preventDefault();
    };
    elements.appendOutput(div);
}
function saveFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
function check(selector, ctor) {
    const elem = document.querySelector(selector);
    if (elem == null) {
        throw new Error("Require HTML element not found.");
    }
    if (elem instanceof ctor) {
        return elem;
    }
    throw new Error("Invalid type of required HTML element");
}
function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
class UserInterfaceElements {
    grammarArea;
    inputArea;
    tutorialButtons;
    demoButtons;
    outputElem;
    memoElem;
    grammarASTCheck;
    grammarAST;
    memoScrollParent;
    constructor() {
        this.outputElem = check("#output", HTMLDivElement);
        this.memoElem = check("#memo", HTMLDivElement);
        this.memoScrollParent = check("#mparent", HTMLDivElement);
        this.grammarASTCheck = check("#gast", HTMLInputElement);
        this.grammarAST = check("#grammarast", HTMLDivElement);
        const grammarSaveAs = check("#gsaveas", HTMLButtonElement);
        const grammarLoad = check("#gload", HTMLButtonElement);
        const inputSaveAs = check("#isaveas", HTMLButtonElement);
        const inputLoad = check("#iload", HTMLButtonElement);
        this.tutorialButtons = [
            check("#tutorial1", HTMLButtonElement),
            check("#tutorial2", HTMLButtonElement),
            check("#tutorial3", HTMLButtonElement),
        ];
        this.demoButtons = [
            check("#demo1", HTMLButtonElement),
            check("#demo2", HTMLButtonElement),
            check("#demo3", HTMLButtonElement),
        ];
        this.grammarArea = new TextAreaWithHilighting(check("#grammar", HTMLTextAreaElement), check("#grammarback", HTMLDivElement), check("#grammarhili", HTMLDivElement));
        this.inputArea = new TextAreaWithHilighting(check("#input", HTMLTextAreaElement), check("#inputback", HTMLDivElement), check("#inputhili", HTMLDivElement));
    }
    setInputChangeHandler(handler) {
        this.inputArea.setOnInput(handler);
    }
    setGrammarChangeHandler(handler) {
        this.grammarArea.setOnInput(handler);
    }
    setASTCheckChangeHandler(handler) {
        this.grammarASTCheck.onchange = () => this.grammarAST.classList.toggle("hide");
    }
    triggerInputChangeEvent() {
        this.inputArea.triggerOnInput();
    }
    triggerGrammarChangeEvent() {
        this.grammarArea.triggerOnInput();
    }
    initializeTutorialButtons(...tutorialData) {
        this.tutorialButtons.forEach((button, index) => {
            const data = tutorialData[index];
            if (data == null) {
                return;
            }
            button.onclick = e => {
                this.grammarArea.setText(data[0]);
                this.inputArea.setText(data[1]);
                this.triggerGrammarChangeEvent();
            };
        });
    }
    initializeDemoButtons(...tutorialData) {
        this.demoButtons.forEach((button, index) => {
            const data = tutorialData[index];
            if (data == null) {
                return;
            }
            button.onclick = e => {
                this.grammarArea.setText(data[0]);
                this.inputArea.setText(data[1]);
                this.triggerGrammarChangeEvent();
            };
        });
    }
    toggleGrammarASTVisibility() {
        this.grammarAST.classList.toggle("hide");
    }
    getInputText() {
        return this.inputArea.getText();
    }
    getGrammarText() {
        return this.grammarArea.getText();
    }
    clearMemos() {
        this.memoElem.innerHTML = "";
    }
    appendMemo(div) {
        this.memoElem.append(div);
    }
    clearOutput() {
        this.outputElem.innerHTML = "";
    }
    appendOutput(div) {
        this.outputElem.append(div);
    }
    clearGrammarAST() {
        this.grammarAST.innerHTML = "";
    }
    appendGrammarAST(div) {
        this.grammarAST.append(div);
    }
    hilightInput(from, to, useErrorColor) {
        this.inputArea.showHilight(from, to, useErrorColor);
        this.grammarArea.hideHilight();
        this.hideMemoHilight();
    }
    hilightGrammar(from, to, useErrorColor) {
        this.grammarArea.showHilight(from, to, useErrorColor);
        this.inputArea.hideHilight();
        this.hideMemoHilight();
    }
    hilightGrammarAndInput(grammarFrom, grammarTo, inputFrom, inputTo, userErrorColor) {
        this.grammarArea.showHilight(grammarFrom, grammarTo, userErrorColor);
        this.inputArea.showHilight(inputFrom, inputTo, userErrorColor);
        this.hideMemoHilight();
    }
    hideMemoHilight() {
        document.querySelectorAll(".ok").forEach(element => element.classList.remove("hili"));
        document.querySelectorAll(".err").forEach(element => element.classList.remove("hili"));
    }
    addMemoHilight(id, scrollIntoView) {
        const memo = document.querySelector("#m" + id);
        if (memo != null && memo instanceof HTMLElement) {
            if (scrollIntoView) {
                const memoRect = memo.getBoundingClientRect();
                const parentRect = this.memoScrollParent.getBoundingClientRect();
                if (memoRect.top < parentRect.top) {
                    memo.scrollIntoView(true);
                }
                else if (memoRect.bottom >= parentRect.bottom) {
                    memo.scrollIntoView(false);
                }
            }
            memo.classList.add("hili");
        }
    }
    hilightMemoGrammarAndInput(memo, scrollIntoView) {
        const error = "error" in memo;
        this.grammarArea.showHilight(memo.grammarNode.from, memo.grammarNode.to, error);
        this.inputArea.showHilight(memo.position, memo.position + (memo["length"] ?? 0), error);
        this.hideMemoHilight();
        this.addMemoHilight(memo.id, scrollIntoView);
    }
    hideHilights() {
        this.hideMemoHilight();
        this.grammarArea.hideHilight();
        this.inputArea.hideHilight();
    }
}
function run() {
    const elements = new UserInterfaceElements();
    let grammar = [];
    const se = showErrors;
    elements.setInputChangeHandler(() => {
        elements.hideHilights();
        if (Array.isArray(grammar)) {
            return;
        }
        const result = parseInput(grammar, elements.getInputText());
        showMemo(result.memo, elements);
        if ("error" in result) {
            se([result.error], elements);
        }
        else {
            showAST(result.root, elements);
            const toLocation = result.parsedToLocation >= elements.getInputText().length ? -1 : result.parsedToLocation;
            if (toLocation > 0) {
                showWarningDiv(elements, toLocation);
            }
        }
        showGrammarAST(grammar, elements);
    });
    elements.setASTCheckChangeHandler(() => elements.toggleGrammarASTVisibility());
    elements.setGrammarChangeHandler(ev => {
        elements.hideHilights();
        grammar = parseGrammar(elements.getGrammarText());
        if (Array.isArray(grammar)) {
            se(grammar, elements);
            elements.clearMemos();
            return;
        }
        elements.triggerInputChangeEvent();
    });
    // The textareas may have content if the browser page was reloaded. Parse and interpret it.
    elements.triggerGrammarChangeEvent();
    elements.initializeTutorialButtons([tutorial1grammar, tutorial1input], [tutorial2grammar, tutorial2input], [tutorial3grammar, tutorial3input]);
    elements.initializeDemoButtons([demo1grammar, demo1input], [demo2grammar, demo2input], [demo3grammar, demo3input]);
}
try {
    run();
}
catch (e) {
    if (e instanceof Error) {
        window.alert(e.message);
    }
    else {
        window.alert(String(e));
    }
}
//# sourceMappingURL=wptgui.js.map
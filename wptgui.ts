
import {PrinterIface, parseGrammar} from "./wpegtest.js"





// TTTTTTT EEEEEEE  SSSSS  TTTTTTT 
//   TTT   EE      SS        TTT   
//   TTT   EEEEE    SSSSS    TTT   
//   TTT   EE           SS   TTT   
//   TTT   EEEEEEE  SSSSS    TTT   

class ConsolePrinter implements PrinterIface
{
    private chunks: string[] = []
    public print(s: string) { this.chunks.push(s) }

    public dumpToConsole() {
        console.log(this.chunks.join(""))
    }
}



const pg = parseGrammar('start := "test" ;')
if(Array.isArray(pg)) {
    console.log(pg.map(e => `${e.location}: ${e.description}`).join("\n"))
} else {
    const c = new ConsolePrinter()
    pg.print(c)
    c.dumpToConsole()
}



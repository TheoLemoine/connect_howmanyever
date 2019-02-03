// contains data structure, and all methods to check for a winner and to add pieces
class PuissModel 
{
    private neededCombo: number
    public model: number[][]

    // getters
    public rows : () => number = () => this.model.length
    public cols : () => number = () => this.model[0].length

    // called on change, this is an array of functions
    public onChange: (newPiece: coords, player: player) => void

    constructor(rows: number, cols: number, neededCombo: number) 
    {
        this.neededCombo = neededCombo
        this.model = new Array(rows)
        for(let i = 0; i < this.model.length; i++)
        {
            this.model[i] = new Array(cols)
        }
    }

    // add a piece to the model, at a specified column, return false if they were no place for the piece
    public async addPiece(col: number, player: player) : Promise<boolean>
    {
        if( this.model[0][col] === undefined )
        {
            let i = 0
            while(i+1 < this.rows() && this.model[i+1][col] == undefined) 
            {
                i++ 
            }
            
            this.model[i][col] = player.id
            await this.onChange({x: col, y: i} , player)
            return true
        }
        else
        {
            return false
        }
    }

    // check if a player has won the game, and if so, returns the id of the player,
    public checkWin() : number | undefined
    {
        let winner: number
        for(let i = 0; i < this.rows(); i++)
        {
            for(let j = 0; j < this.cols(); j++)
            {
                let piece: number = this.model[i][j]
                if(piece)
                {
                    winner = this.checkFrom({x: j, y: i}, piece)
                    if(winner)
                    {
                        return winner
                    }
                }
                
            }
        }

        if(this.isFull())
        {
            return -1
        }
        return undefined
    }

    // just check for a combo in the needed directions
    private checkFrom(coords: coords, id:number) : number | undefined
    {
        let vectors: coords[] = [
            {x: 0, y: 1},
            {x: 1, y: 1},
            {x: 1, y: 0},
            {x: 1, y:-1}
        ]

        let winner: number
        for (const vector of vectors) 
        {
            if(this.checkLineRecu(coords, vector, id, 1))
            {
                return id
            }
        }

        return undefined
    }
    
    // check for a combo in a given direction (the vector)
    // this is a recursive function
    private checkLineRecu(coords: coords, vector: coords, id: number, combo: number) : boolean
    {
        if( combo >= this.neededCombo )
        {
            return true
        }

        let nextCoords: coords = {
            x: coords.x + vector.x,
            y: coords.y + vector.y
        }

        if(this.model[nextCoords.y] && this.model[nextCoords.y][nextCoords.x])
        {
            let nextPoint: number = this.model[nextCoords.y][nextCoords.x]

            if( nextPoint === id )
            {
                return this.checkLineRecu(nextCoords, vector, id, combo + 1)
            }
            else
            {
                return false
            }
        }
        else
        {
            return false
        }
        
    }

    // just check if all the collumns are full, 
    // in witch case the game has ended, and no one can win anymore
    private isFull() : boolean 
    {
        let allTop = true
        for(let i = 0; i < this.cols(); i++)
        {
            if(this.model[0][i] == undefined)
            {
                allTop = false
            }
        }

        return allTop
    }

}

// draws model to svg, and keep it updated
class PuissDrawer 
{
    readonly svgNS = "http://www.w3.org/2000/svg"
    private svgRoot: SVGElement
    private defs: SVGDefsElement

    private pieces: SVGElement;
    private boxes: SVGElement;

    private oneFallingTime: number

    private caseSize: number
    readonly gridColor = '#2c3e50'
    readonly coinSize = 0.43

    // build a drawer, takes the size of the game, and the html table in witch to draw the game
    constructor(root: HTMLElement, rows: number, cols: number) 
    {
        this.oneFallingTime = 1 / rows

        this.caseSize = Math.min(window.innerHeight / (rows * 1.2) , window.innerWidth / (cols * 1.2) )  

        this.svgRoot = document.createElementNS(this.svgNS, "svg")
        this.svgRoot.setAttributeNS(null, 'width', (cols * this.caseSize).toString())
        this.svgRoot.setAttributeNS(null, 'height', (rows * this.caseSize).toString())
        root.innerHTML = ''
        root.appendChild(this.svgRoot)

        this.pieces = document.createElementNS(this.svgNS, 'g')
        this.svgRoot.appendChild(this.pieces)
        this.boxes = document.createElementNS(this.svgNS, 'g')
        this.svgRoot.appendChild(this.boxes)

        this.defs = document.createElementNS(this.svgNS, "defs")
        this.svgRoot.appendChild(this.defs)

        for(let i = 0; i < rows; i++)
        {
            for(let j = 0; j < cols; j++)
            {
                this.makeBox(j, i)
            }
        }
    }

    // just draw the new piece in the color of the player, called by the PuissModel onChange event but you can really plug it anywhere
    public async draw(addedPiece: coords, player: player): Promise<any>
    {
        return this.makeCoin(addedPiece.x, addedPiece.y, player.color)
    }

    public async makeCoin(x: number, y: number, fill: string) : Promise<any>
    {
        let fallingTime = this.oneFallingTime * y / 5

        let target: coords = {
            x: (x * this.caseSize) + this.caseSize / 2, 
            y: (y * this.caseSize) + this.caseSize / 2
        }

        let circle = this.makeCircle(
            target.x, 
            0, 
            this.caseSize * this.coinSize + 1, 
            fill)

        circle.style.transition = `all cubic-bezier(0.38, 0.07, 0.7, 0.18) ${fallingTime}s`
        circle = this.pieces.appendChild(circle) 

        circle.style.transform = `translateY(0px)`
        circle.style.webkitTransform = `translateY(0px)`

        setTimeout(() => {
            circle.style.transform = `translateY(${target.y}px)`
            circle.style.webkitTransform = `translateY(${target.y}px)`
        }, 100)

        return new Promise<any>((resolve) => {
            setTimeout(() => {
                resolve()
            }, fallingTime * 1000)
        })
    }

    public makeBox(x: number, y: number)
    {
        let id = `${x}-${y}`

        // creating a mask
        let mask = document.createElementNS(this.svgNS, "mask")
        mask.setAttribute('id', 'hole-'+ id)
        this.defs.appendChild(mask)

        // the mask
        // background
        let MaskSquare = this.makeSquare(
            (x * this.caseSize), 
            (y * this.caseSize), 
            this.caseSize + 1, 
            'white')
        mask.appendChild(MaskSquare)

        //hole
        let circle = this.makeCircle(
            (x * this.caseSize) + this.caseSize / 2, 
            (y * this.caseSize) + this.caseSize / 2, 
            this.caseSize * this.coinSize, 
            'black')
        mask.appendChild(circle)

        // the element masked
        let square = this.makeSquare(
            (x * this.caseSize), 
            (y * this.caseSize), 
            this.caseSize + 1, 
            this.gridColor)
        square.setAttributeNS(null, 'mask',`url(#hole-${id})`)
        square.setAttribute('id', 'coords-' + id)
        this.boxes.appendChild(square)
    }

    private makeCircle(x: number, y: number, r: number, c: string): SVGCircleElement
    {
        let circle = document.createElementNS(this.svgNS, "circle")

        circle.setAttributeNS(null, 'cx', x.toString())
        circle.setAttributeNS(null, 'cy', y.toString())
        circle.setAttributeNS(null, 'r', r.toString())
        circle.style.fill = c

        return circle as unknown as SVGCircleElement
    }

    private makeSquare(x: number, y: number, w: number, c: string): SVGRectElement 
    {
        let square = document.createElementNS(this.svgNS, "rect")

        square.setAttributeNS(null, 'x', x.toString())
        square.setAttributeNS(null, 'y', y.toString())
        square.setAttributeNS(null, 'width', w.toString())
        square.setAttributeNS(null, 'height', w.toString())
        square.style.fill = c

        return square as unknown as SVGRectElement
    }
}

// handle turns of players, RECURSIVELY AND ASYNCHRONUSLY, how cool is that.
class PuissHandler 
{
    private model: PuissModel
    private config: puissConfig

    constructor(config: puissConfig) 
    {
        config.root.innerHTML = ''
        config.display.innerText = `Creating the table, training AIs...`

        this.model = new PuissModel(config.dimentions.y, config.dimentions.x, config.combo)
        let drawer = new PuissDrawer(config.root, config.dimentions.y, config.dimentions.x)

        this.model.onChange = drawer.draw.bind(drawer)
        this.config = config

        this.bindR(this.config.players[0], 0)
    }

    private async bindR(inputGiver: player, turn: number)
    {
        let player = this.config.players[turn]
        
        this.config.display.innerHTML = `It's player ${player.id}'s turn ${this.colorToHtml(player.color)}`

        let col: number
        
        do
        {
            do
            {
                col = await inputGiver.play(this.model.model)
            }
            while(col < 0 || col >= this.model.cols())
        }
        while(!(await this.model.addPiece(col, player)))

        let winner = this.model.checkWin()
        if(winner !== undefined){
            if(winner === -1)
            {
                this.config.display.innerText = `No one can win anymore... congrats...`
                return
            } else {
                let playerWinner = this.config.players[winner - 1]
                this.config.display.innerHTML = `And the winner is... player ${winner} ${this.colorToHtml(playerWinner.color)}`
                return
            }
        }

        turn++
        if(turn == this.config.players.length){
            turn = 0
        }
        
        setTimeout(()=> {
            this.bindR(this.config.players[turn], turn)
        }, 0)
    }

    private colorToHtml(color: string)
    {
        return `<span style="color: ${color}">&nbsp;(${color})&nbsp;</span>`
    }
}

// sum' types
type puissConfig = { players: player[], dimentions: coords, root: HTMLTableElement, display: HTMLDivElement, combo: number }

interface player { color: string, id: number, play: (model: number[][]) => Promise<number> }
type coords = { x: number, y:number }

//-------------------------------------------------------------------------------------
//------ main part: defining players and setting up the game & players ----------------
//-------------------------------------------------------------------------------------

// here are some players/AI
// they return a promise for the number of the column played,
// so you migth wanna use Promise.resolve() for non asyc values

// the base for implementing players or AI, you must redefine the play function in a new class to implement a specific comportement
// by default, this one just uses alert prompts to get the value
class DefaultPlayer implements player
{
    public color: string
    public id: number

    constructor(color: string, id: number)
    {
        this.color = color
        this.id = id
    }

    public play(model: number[][]) : Promise<number>
    {
        return Promise.resolve(Number(prompt(`joueur ${this.id} (${this.color}) : quelle colone?`))-1)
    }
}

// a player input witch alows to play by clicking on the column
class MousePlayer extends DefaultPlayer
{
    public play() : Promise<number> 
    {
        return new Promise((resolve) => {

            let rects = document.querySelectorAll('rect[mask]')

            rects.forEach((elem) => {
                elem.addEventListener('click', function eventHandler() {
                    rects.forEach(elem => elem.removeEventListener('click', eventHandler))

                    let coord = elem.getAttribute('id').split('-')
                    elem.setAttributeNS(null, 'fill', 'orange')
                    resolve(parseInt(coord[1]))
                })
            })
        })
    }
}

// an AI that just give random values
class RandomBasicAI extends DefaultPlayer
{
    public play(model: number[][]) : Promise<number>
    {
        return Promise.resolve(this.randomBetween(0, model[0].length))
    }

    protected randomBetween(min, max) : number 
    {
        return Math.floor(Math.random()*(max-min+1)+min);
    }
}

// some AI, not great, a bit stupid, but he can sometimes win if you don't pay attention to it
class DumbAI extends RandomBasicAI
{

    private model: number[][]

    public play(model: number[][]) : Promise<number>
    {
        this.model = model

        let topPieces: coords[] = this.getTopPieces()
        let highter: coords
        let highterImportance: number = -1

        for (const piece of topPieces) 
        {
            let importance = this.lookAroundPiece(piece);

            if (importance > highterImportance)
            {
                highterImportance = importance
                highter = piece
            }
            else if (importance == highterImportance)
            {
                if(Math.random() > 0.5)
                {
                    highterImportance = importance
                    highter = piece
                }
            }
        }

        // if no piece is put on no place is has combo, chose a random
        if (highterImportance === 0) 
        {
            return Promise.resolve(this.randomBetween(0, model[0].length))
        }

        return Promise.resolve(highter.x)
    }

    getTopPieces() : coords[]
    {
        let pieces = new Array();
        for(let i = 0; i < this.model[0].length; i++)
        {
            let piece = this.getFirstAtCol(i)
            if(piece)
            {
                pieces.push(piece)
            }
        }
        return pieces
    }

    getFirstAtCol(col: number) : coords  | null
    {
        if( this.model[0][col] === undefined )
        {
            let i = 0
            while(i+1 < this.model.length && this.model[i+1][col] == undefined) 
            {
                i++ 
            }
            return {x: col, y: i}
        }
        else
        {
            return null
        }
    }

    lookAroundPiece(piece: coords) : number
    {
        let importance: number = 0
        
        let vectors: coords[] = [
            {x: 1, y: 1},
            {x: 1, y: 0},
            {x: 1, y:-1},
            {x: 0, y:-1},
            {x:-1, y:-1},
            {x:-1, y: 0},
            {x:-1, y: 1},
            {x: 0, y: 1}
        ]

        for (const vector of vectors) 
        {
            let pieceToCheck = {x: piece.x + vector.x, y: piece.y + vector.y}

            if(this.model[pieceToCheck.y] && this.model[pieceToCheck.y][pieceToCheck.x])
            {
                let player = this.model[pieceToCheck.y][pieceToCheck.x]
                let dirImportance = this.lookDirectionCombo(pieceToCheck, vector, 0, player)
                importance += dirImportance
                if(dirImportance > 1)
                {
                    // check the other way
                    importance += this.lookDirectionCombo(
                        {x: pieceToCheck.x - vector.x, y: pieceToCheck.y - vector.y},
                        {x: -1 * vector.x, y: -1 * vector.y}, 
                        1, 
                        player)
                }
            }
        }

        return importance
    } 

    // give the number of the combo in a given direction
    lookDirectionCombo(coords: coords, vector: coords, combo: number, player: number) : number
    {
        let nextCoords: coords = {
            x: coords.x + vector.x,
            y: coords.y + vector.y
        }

        if(this.model[nextCoords.y] && this.model[nextCoords.y][nextCoords.x])
        {
            let nextPoint: number = this.model[nextCoords.y][nextCoords.x]

            if( nextPoint === player )
            {
                return this.lookDirectionCombo(nextCoords, vector, combo + 1, player)
            }
        }
        
        return Math.pow(combo, 2)
    }
}

(function IFFE() {
    
    // to load and reload the game
    let game = new PuissHandler(getConfig())
    document.querySelector('.restart').addEventListener('click', () => {

        game = new PuissHandler(getConfig())
    })

    // now the config...
    // it all works on dependency injections
    // edit configuration with a form  
    function getConfig(): puissConfig 
    {
        let players: player[] = new Array()
        let id = 1
        document.querySelectorAll('.one-player:not(.hidden)').forEach(elem => {
            let color = (elem.querySelector('.player-color') as HTMLInputElement).value
            let type = (elem.querySelector('.player-type') as HTMLSelectElement).value

            let player: player
            switch (type) 
            {
                case 'randomAI':
                    player = new RandomBasicAI(color, id)
                    break
                
                case 'mousePlayer':
                    player = new MousePlayer(color, id)
                    break

                case 'dumbAI':
                    player = new DumbAI(color, id)
                    break

                case 'promptPlayer':
                default :
                    player = new DefaultPlayer(color, id)
                    break
            }
            players.push(player)
            id++
        })

        return {
            players: players,
            dimentions: {
                x: Number((document.querySelector('#cols') as HTMLInputElement).value),
                y: Number((document.querySelector('#rows') as HTMLInputElement).value)
            },
            // the rootis the table element in witch the grid will be drawn
            root: document.querySelector('#C4'),
            // you must also give the element in witch messages will be displayed
            display: document.querySelector('.displays'),
            // and finaly, the combo needed to win
            combo: Number((document.querySelector('#combo') as HTMLInputElement).value)
        }
    }

    // show the options menu
    let configPanel: HTMLElement = document.querySelector('#config')
    document.querySelector('.config').addEventListener('click', () => {
        configPanel.classList.toggle('shown')
    })

    // removing players
    document.querySelectorAll('.one-player .removePlayer').forEach(elem => {
        elem.addEventListener('click', function(e) {
            e.preventDefault()
            let player: HTMLElement = this.parentElement
            player.remove()
        })
    })

    // adding players
    let onePLayer: HTMLElement = document.querySelector('.one-player')
    let players: HTMLElement = document.querySelector('.players')

    document.querySelector('.plusPlayer').addEventListener('click', e => {
        e.preventDefault()

        // copying a node and removing hidden class
        onePLayer.classList.remove('hidden')
        let newPLayer = onePLayer.cloneNode(true)
        players.appendChild(newPLayer)
        onePLayer.classList.add('hidden')

        document.querySelector('.one-player:last-child .removePlayer').addEventListener('click', function(e) {
            e.preventDefault()
            let player: HTMLElement = this.parentElement
            player.remove()
        })
    })
})()
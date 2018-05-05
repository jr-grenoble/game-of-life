/*
 * MVC view for the eternal life game
 * The view has primitives to display state on a canvas.
 * It also keeps track of external events and user input.
 * It processes locally some user actions such as displaying or hiding the grid.
 */

// geometry considerations: we use strings instead of comments so that this is more prominent
void `  Here we describe how hexagonal and triangular grids map to the square grid.

    ￤﹍０﹍￤﹍１﹍￤﹍      Hexagonal cells intersect with natural square cells as per the diagram left.
    ￤／￣￣￤＼＿＿￤０      E.g, in square cell 0,0, there are 3 bits of hexagonal cells -1,-1 (top left), -1,0 (bottom left) and 0,0 (right).
    ￤＼＿＿￤／﹍﹍￤﹍      And in square cell 1,0, there are 3 bits of hexagonal cells 1,-1 (top), 0,0 (left) and 0,1 (bottom).
    ￤／￣￣￤＼＿＿￤１
    ￤＼＿＿￤／﹍﹍￤﹍      These rules apply for any column, i.e. depend only on whether the first square coordinate is even or odd.

      0   1
    ｜……｜……｜…    Triangular cells intersect with natural square cells as per the diagram left.
    ｜╲ ｜ ╱｜0    E.g., in square cell 0,0, the top right part belongs to triangle cell 0,-1, while the bottom right is in triangle 0,0.
    ｜…╲｜╱…｜…    And in square cell 1,2, the top left is in triangle 1,1, while the bottom right is in triangle 1,2.
    ｜ ╱｜╲ ｜1
    ｜╱…｜…╲｜…    These rules apply based on the parity of the square coordinates. For identifal parity (both odd or both even),
    ｜╲ ｜ ╱｜2    the rule described for 0,0 applies. For opposite parities, the rule described for 1,2 applies.
    ｜…╲｜╱…｜…
    `;


// ==| Private data and functions |============================================
// These objects are defined outside of the module main class,
// so that they cannot be accessed by external users
// ============================================================================

// usual shortcuts (replicated as needed in all modules)

// const log = ( ...args ) => console.log ( ...args ); // eslint-disable-line no-console
const ᒪｘᒧ = x => Math.floor ( parseInt ( x, 10 ) ); // eslint-disable-line no-restricted-properties
const ᒷᐧᒲ = ( ...args ) => Math.min ( ...args ); // eslint-disable-line no-restricted-properties
const ᒯᐧᒬ = ( ...args ) => Math.max ( ...args ); // eslint-disable-line no-restricted-properties
const ᒥｘᒧ = ( x, min = 0, max = min + 1 ) => min < max ? ᒷᐧᒲ ( ᒯᐧᒬ ( x, min ), max ) : ᒷᐧᒲ ( ᒯᐧᒬ ( x, max ), min );

const evenʔ̣ = n => ( n & 1 ) === 0; // eslint-disable-line no-bitwise
// const oddʔ̣ = n => ( n & 1 ) !== 0; // eslint-disable-line no-bitwise
// eslint-disable-next-line no-bitwise
const rem2 = n => n & 1; // Remainder of Euclidian division by 2
const rem3 = n => ( n % 3 + 3 ) % 3; // Remainder of Euclidian division by 3
// eslint-disable-next-line no-bitwise
const div2 = n => n >> 1; // Quotient of Euclidian division by 2
const div3 = n => ( n - rem3 ( n ) ) / 3; // Quotient of Euclidian division by 3

const ㄱnumberʔ̣ = n => Number.isNaN ( n ); // eslint-disable-line no-restricted-properties
const arrayʔ̣ = Array.isArray; // eslint-disable-line no-restricted-properties
// const assignꔛ = Object.assign; // eslint-disable-line no-restricted-properties
const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
const functionʔ̣ = f => typeof f === "function";
// const keysǃ = o => o.keys ? [ ...o.keys () ] : Object.keys ( o ); // eslint-disable-line no-restricted-properties
const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties
const valuesǃ = o => functionʔ̣ ( o.values ) ? [ ...o.values () ] : Object.values ( o ); // eslint-disable-line no-restricted-properties


function virtualⵢ () { throw TypeError ( "Invalid call to virtual function!" ); }

// ==| Configuration |=========================================================

import eternalｰconfig from "./eternalｰconfig.js";

const { effects, tiles, surroundings, key } = eternalｰconfig;

// don't store state in config defaults (state must be explicitly stored)
const defaults = {
    geometry: {
        width: null,
        height: null,
        maxw: 512,
        maxh: 512,
        top: effects.top, /* bounces */
        right: effects.left, /* reappears on left */
        bottom: effects.bottom, /* bounces */
        left: effects.right, /* reappears on right */
        },
    grid: { visible: true, color: "#e0e0e0", live: "#000000", tiling: tiles.square, scaling: { mode: "linear", step: .1 } },
    rules: { neighborhood: { vicinity: surroundings.moore, range: 1 }, born: [ 3 ], survive: [ 2, 3 ] },
    speed: { value: 0 },
    trail: { visible: true, color: "#bfffbf", alpha: 5 }, // most recent color, gradient goes to white by increasing alpha at each step
    zoom: { value: 0, shift: 2 },
    };

const config = new eternalｰconfig ( "view", defaults );


// ==| Neighborhood |==========================================================
// There are multiple ways of computing the number of neighbors, depending on
// tiling model, neighborhood definition, and range (distance) involved.
//
// The difference between Moore and Von Neumann vicinity rules is only relevant
// with square and triangular tiling. For hexagon tiling, Moore and Von Neumann
// are identical.
//
// In cartesian coordinates, we have the following definitions.
// Chebyshev distance (Moore neighborhood):
//      dc ((x0,y0), (x1,y1)) = max(|x1-x0|,|y1-y0|)
// Manhattan distance (Von Neumann neighborhood)
//      dm ((x0,y0), (x1,y1)) = sum(|x1-x0|,|y1-y0|)
// ============================================================================

// The following functions return arrays of indexes corresponding to neighborhoods.
// You then need to map/reduce these arrays to compute the number of neighbours.
// In fact, as the index parameter to these functions is itself a function taking
// x, y coordinates, you can directly pass a mapping function as the indexer.
//
//  Λ
// /!\  These functions can return indexes outside of the state grid !
// ￣    Depending on neighborhood rules (effects),
// one needs to map such indexes to real indexes.

const neighborhoods = {
    moore: {
        hexagon ( range, index, x, y ) {
                /*
                 * ⬡(x,y,i,j) allows to cover a third of the vicinity of ⬢(x,y)
                 *          ↙︎ j i ↘︎
                 *            ⬢             then we simply rotate the pattern
                 *               ⬡          clockwise to cover all 3 thirds
                 *            ⬡     ⬡
                 *         ⬡     ⬡     ⬡
                 *      ⬡     ⬡     ⬡
                 *         ⬡     ⬡
                 *            ⬡
                 */

                const precinct = [];
                const δ = evenʔ̣ ( x ) ? n => div2 ( n ) : n => div2 ( n ) + rem2 ( n );
                for ( let i = 1; i <= range; i++ ) for ( let j = 0; j <= range; j++ ) {
                    precinct.push ( index ( x + i - j, y + δ ( i + j ) ) );
                    precinct.push ( index ( x - i, y - j + δ ( i ) ) );
                    precinct.push ( index ( x + j, y - i + δ ( j ) ) );
                    }
                return precinct;
                },
        square ( range, index, x, y ) {
                /*
                 * ▫︎(x,y,i,j) allows to cover a quarter of the vicinity of ◾︎ (x,y):
                 * i →
                 * j ◾︎▫︎▫︎▫︎     then, we simply rotate the pattern clockwise
                 * ↓  ▫︎▫︎▫︎     to cover all 4 quadrants
                 *    ▫︎▫︎▫︎
                 *    ▫︎▫︎▫︎
                 */
                const precinct = [];
                for ( let i = 1; i <= range; i++ ) for ( let j = 0; j <= range; j++ ) {
                    precinct.push ( index ( x + i, y + j ) );
                    precinct.push ( index ( x - j, y + i ) );
                    precinct.push ( index ( x - i, y - j ) );
                    precinct.push ( index ( x + j, y - i ) );
                    }
                return precinct;
                },
        triangle ( range, index, x, y ) {
                /*
                 * ▷
                 *  ◁(x,y,i,j) allows to cover a third of the vicinity of ▶︎(x,y)
                 *                        ◁
                 *               ↗     ◁  ▷
                 *             i    ◁  ▷  ◁
                 *          j ▶︎  ◁  ▷  ◁  ▷     then we simply rotate the pattern
                 *          ↓    ▷  ◁  ▷  ◁     counter-clockwise to cover all 3 thirds
                 *               ◁  ▷  ◁  ▷
                 *               ▷  ◁  ▷
                 *               ◁  ▷
                 *               ▷
                 * To do that, we define functions to convert between grid coordinates and affine coordinates
                 * as well as rotation functions. We use affine coordinates where y points downwards and x
                 * points to the right. If the side of each triangle is equal to 2σ, we call ρ the third of its height.
                 * We have the relationship: σ = ρ√3. Our affine coordinates use ρ as the x unit and σ as the y unit.
                 */

                const s = 1 - 2 * rem2 ( x + y );
                const gridￚᗒｰxy = ( i, j ) => [ 3 * i + rem2 ( i + j ) * s, j ];
                const xyￚᗒｰgrid = ( x, y ) => [ div3 ( x - rem3 ( x ) * s ), y ];
                const rotｰ2πː3 = ( x, y ) => [ ( 3 * y - x ) / 2, -( x + y ) / 2 ];
                const rotⵜ2πː3 = ( x, y ) => [ -( 3 * y + x ) / 2, ( x - y ) / 2 ];
                const gridￚᗒｰrotｰ2πː3ￚᗒｰgrid = ( i, j ) => xyￚᗒｰgrid ( ...rotｰ2πː3 ( ...gridￚᗒｰxy ( i, j ) ) );
                const gridￚᗒｰrotⵜ2πː3ￚᗒｰgrid = ( i, j ) => xyￚᗒｰgrid ( ...rotⵜ2πː3 ( ...gridￚᗒｰxy ( i, j ) ) );
                // here, x and y are parameters of the enclosing triangle function
                const shiftｰindex = ( i, j ) => index ( x + i, y + j );
                const [ ⵜￜￚ, imin, imax ] = ( x + y ) % 2 === 0 ? [ x => x, 0, range ] : [ x => -x, -range, 0 ];

                const precinct = [];
                for ( let i = imin; i <= imax; i++ ) for ( let j = 1 - ⵜￜￚ ( i ); j <= 2 * range - ⵜￜￚ ( i ); j++ ) {
                    precinct.push ( shiftｰindex ( i, j ) );
                    precinct.push ( shiftｰindex ( ...gridￚᗒｰrotｰ2πː3ￚᗒｰgrid ( i, j ) ) );
                    precinct.push ( shiftｰindex ( ...gridￚᗒｰrotⵜ2πː3ￚᗒｰgrid ( i, j ) ) );
                    }
                return precinct;
                }
        },
    vonｰneumann: {
        // there's no difference between the Moore and Von Neumann neighborhoods for hexagonal tiling:
        hexagon ( range, index, x, y ) { return neighborhoods.moore.hexagon ( range, index, x, y ); },
        square ( range, index, x, y ) {
                /*
                 * ▫︎(x,y,i,j) allows to cover a quarter of the vicinity of ◾︎ (x,y):
                 * i →
                 * j ◾︎▫︎▫︎▫︎     then, we simply rotate the pattern clockwise
                 * ↓  ▫︎▫︎      to cover all 4 quadrants
                 *    ▫︎
                 */
                const precinct = [];
                for ( let i = 1; i <= range; i++ ) for ( let j = range - i; j >= 0; j-- ) {
                    precinct.push ( index ( x + i, y + j ) );
                    precinct.push ( index ( x - j, y + i ) );
                    precinct.push ( index ( x - i, y - j ) );
                    precinct.push ( index ( x + j, y - i ) );
                    }
                return precinct;
                },
        triangle ( range, index, x, y ) {
                const hash = pair => state.index ( ...pair ); // used to create a unique key for a pair of coordinates
                const precinct = {};    // this is where we will put the coordinates of the neighbors of (x,y)
                const adjacents = ( i, j ) => [ [ i, j - 1 ], [ i, j + 1 ], [ evenʔ̣ ( i + j ) ? i - 1 : i + 1, j ] ];
                const add = ( list, pair ) => {
                        const h = hash ( pair );
                        if ( h in list ) return false;
                        list [ hash ( pair ) ] = [ ...pair ]; // ensure each list item is unique (vs. adding pair directly)
                        return true;
                        };
                // To compute neighborhood, we use a bag of coordinates containing the latest additions to precinct
                // At each iteration, we only add adjacent cells to that bag into precinct (and a fresh instance of bag)
                // We start with the bag set to the central cell
                for ( let bag = { [ hash ( [ x, y ] ) ]: [ x, y ] }, r = 1; r <= range; r++ ) {
                    const border = valuesǃ ( bag ); // get coordinates added at last round
                    bag = {}; // empty our bag before adding new coordinates
                    border.forEach ( pair => adjacents ( ...pair ).forEach ( pair => { if ( add ( precinct, pair ) ) add ( bag, pair ); } ) );
                    }
                delete precinct [ hash ( [ x, y ] ) ]; // make sure the central cell is not included
                return valuesǃ ( precinct ).map ( pair => index ( ...pair ) );
                }
        }
    };


// ==| Game state |============================================================
class state {
    constructor ( game ) {
            propertiesꔛ ( this, {
                cells: {
                    value: new Uint8ClampedArray ( config.data.geometry.maxw * config.data.geometry.maxh )
                    },
                game: {
                    value: game
                    }
                } );
            }
    breed ( index ) { this.cells [ index ] = 1; }
    kill ( index ) { this.cells [ index ] = 0; }
    liveʔ̣ ( index ) { return this.cells [ index ] === 1; }

    static index ( x, y ) { return x * config.data.geometry.maxh + y; }
    index ( x, y ) { return state.index ( x, y ); }

    static get born () { return config.data.rules.born; }
    static get range () { return config.data.rules.neighborhood.range; }
    static get survive () { return config.data.rules.survive; }
    static get tiling () { return config.data.grid.tiling; }
    static get vicinity () { return key ( surroundings, config.data.rules.neighborhood.vicinity ); }

    get born () { return state.born; }
    get range () { return state.range; }
    get survive () { return state.survive; }
    get tiling () { return state.tiling; }
    get vicinity () { return state.vicinity; }

    static get height () { return config.data.geometry.height; }
    static get maxh () { return config.data.geometry.maxh; }
    static get maxw () { return config.data.geometry.maxw; }
    static get width () { return config.data.geometry.width; }

    get height () { return state.height; }
    get maxh () { return state.maxh; }
    get maxw () { return state.maxw; }
    get width () { return state.width; }

    static get bottom () { return config.data.geometry.bottom; }
    static get left () { return config.data.geometry.left; }
    static get right () { return config.data.geometry.right; }
    static get top () { return config.data.geometry.top; }

    get bottom () { return state.bottom; }
    get left () { return state.left; }
    get right () { return state.right; }
    get top () { return state.top; }

    randomize () { this.cells.forEach ( ( _, i, c ) => ( c [ i ] = Math.random () < 0.5 ? 0 : 1 ) ); return this; }

    get nextｰstate () {
            // first, retrieve global settings from state
            const {
                born,       // array of values indicating how many neighbors around an empty cell give birth to a new cell
                height,     // height (in number of cells) of the state grid
                range,      // neighborhood range (in number of cells around central cell)
                survive,    // array of values indicating how many neighbors around a live cell allow it to survive
                tiling,     // type of tiling (hexagon, square or triangle)
                vicinity,   // type of vicinity rule (moore or von-neumann)
                width,      // width (in number of cells) of the state grid
                } = this;
            const neighbors = neighborhoods [ vicinity ] [ tiling ];
            const neighborsⵌ = neighborhood => neighborhood.map ( i => this.liveʔ̣ ( i ) ).reduce ( ( i, j ) => i + j );
            const newｰstate = new state ( this.game );
            // we first handle inner part of the board, i.e. not exposed to edge effects
            const [ xmin, xmax ] = [ range, width - range ];
            const [ ymin, ymax ] = tiling === tiles.triangle ? [ 2 * range, height - 2 * range ] : [ range, height - range ];
            for (
                let x = xmin;
                x < xmax;
                x++
                ) for (
                    let y = ymin;
                    y < ymax;
                    y++
                    ) {
                    const index = state.index ( x, y );
                    const pop = neighborsⵌ ( neighbors ( range, state.index, x, y ) );
                    if ( this.liveʔ̣ ( index ) ) newｰstate [ survive.includes ( pop ) ? "breed" : "kill" ] ( index );
                    else if ( born.includes ( pop ) ) newｰstate.breed ( index );
                    }
            // then we handle the border special cases
            // TODO!!
            return newｰstate;
            }
    }


// ==| DOM elements |==========================================================

class elements { // standard elements record their `name` and DOM element (`elem`)
    constructor ( name ) { // name and elem are readonly, frozen, non enumerable properties
            propertyꔛ ( this, "name", { value: name } );
            propertyꔛ ( this, "elem", { value: document.getElementById ( name ) } );
            }
    }

class board extends elements { // board elements call click, dblclick and move when receiving corresponding events
    constructor ( name ) {
            super ( name );
            // double click must be declared before click so that it can be trapped. It generates a click too.
            this.elem.addEventListener ( "dblclick", event => this.dblclick ( event ), { passive: true } );
            this.elem.addEventListener ( "click", event => this.click ( event ), { passive: true } );
            this.elem.addEventListener ( "mousemove", event => this.move ( event ), { passive: true } );
            document.addEventListener ( "keydown", event => event.target === this.elem ? this.keydown ( event ) : null, { passive: true } );
            this.elem.addEventListener ( "keyup", event => this.keyup ( event ), { passive: true } );
            }
    click ( event ) { virtualⵢ ( event ); }
    dblclick ( event ) { virtualⵢ ( event ); }
    keydown ( event ) { log ( "kd" ); virtualⵢ ( event ); }
    keyup ( event ) { log ( "ku" ); virtualⵢ ( event ); }
    move ( event ) { virtualⵢ ( event ); }
    }

class button extends elements { // button elements call press when they are clicked
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "click", event => this.press ( event ), { passive: true } );
            }
    press ( event ) { virtualⵢ ( event ); }
    }

class canvas extends elements { // canvas elements do not handle any events
    constructor ( name, svg, game ) { // this.ctx is readonly, non configurable and non enumerable
            super ( name );
            this.game = game;
            // ==| Underlying grid |=======================================================
            this.svg = new elements ( svg );
            // ==| Context |===============================================================
            this.ctx = this.elem.getContext ( "2d" );
            this.pos = this.elem.getBoundingClientRect ();
            }
    set alpha ( alpha ) {
            this.ctx.save ();
            this.ctx.globalAlpha = alpha === 10 ? 1 : 1 - 2 ** -alpha / 2;
            this.ctx.globalCompositeOperation = "copy";
            this.ctx.drawImage ( this.elem, 0, 0 );
            this.ctx.restore ();
            }
    get height () { return this.ctx.canvas.clientHeight; }
    // get height () { return this.svg.elem.height.baseVal.value; }
    set height ( height ) {
            this.elem.setAttribute ( "height", `${ height }px` );
            this.svg.elem.setAttribute ( "height", `${ height }px` );
            }
    // set height ( height ) { this.svg.elem.setAttribute ( "height", `${ this.elem.height = height }px` ); }
    get width () { return this.ctx.canvas.clientWidth; }
    // get width () { return this.svg.elem.width.baseVal.value; }
    set width ( width ) {
            this.elem.setAttribute ( "width", `${ width }px` );
            this.svg.elem.setAttribute ( "width", `${ width }px` );
            }
    // set width ( width ) { this.svg.elem.setAttribute ( "width", `${ this.elem.width = width }px` ); }
    // ==| Cell drawing |===========================================================
    static drawｰhex ( x, y, ctx, w, h, pw ) {
            ctx.beginPath ();
            let px = 3 * x * w / 2 + pw;
            let py = ( 2 * y + x % 2 + 1 ) * h + pw;
            ctx.moveTo ( px, py );
            ctx.lineTo ( px += w / 2, py -= h );
            ctx.lineTo ( px += w - pw, py );
            ctx.lineTo ( px += w / 2, py += h );
            ctx.lineTo ( px -= w / 2, py += h - pw );
            ctx.lineTo ( px -= w, py );
            ctx.closePath ();
            ctx.fill ();
            }
    static drawｰsqr ( x, y, ctx, w, h, pw ) {
            ctx.fillRect ( x * w + pw, y * h + pw, w - pw, h - pw );
            }
    static drawｰtri ( x, y, ctx, w, h, pw ) {
            ctx.beginPath ();
            let px = 3 * x * w / 2 + pw;
            let py = ( 2 * y + x % 2 + 1 ) * h + pw;
            if ( ( x + y ) % 2 === 0 ) {
                ctx.moveTo ( px = x * w + pw, py = y * h / 2 + pw );
                ctx.lineTo ( px, py += h - pw );
                ctx.lineTo ( px += w - pw, py -= h / 2 );
                }
            else {
                ctx.moveTo ( px = x * w + pw, py = ( y + 1 ) * h / 2 + pw );
                ctx.lineTo ( px += w - pw, py -= h / 2 - pw );
                ctx.lineTo ( px, py += h );
                }
            ctx.closePath ();
            ctx.fill ();
            }
    // ==| Canvas drawing |=========================================================
    clear () { this.ctx.clearRect ( 0, 0, this.ctx.canvas.clientWidth, this.ctx.canvas.clientHeight ); }
    drawｰctx () {
            const { height, scale, tiling, width } = this.game.grid;
            const { ctx } = this;
            let w = width, h = height, pw = 1 / scale, cellθ = ( x, y ) => canvas.drawｰsqr ( x, y, ctx, w, h, pw );
            if ( tiling !== tiles.square ) {
                pw /= 2;
                switch ( tiling ) {
                    case tiles.hexagon:
                        w /= 3;
                        h /= 2;
                        cellθ = ( x, y ) => canvas.drawｰhex ( x, y, ctx, w, h, pw );
                        break;
                    case tiles.triangle:
                        w /= 2;
                        cellθ = ( x, y ) => canvas.drawｰtri ( x, y, ctx, w, h, pw );
                        break;
                    default: throw TypeError ( `Invalid game tiling type: ${ tiling }` );
                    }
                }
            return { ctx, w, h, pw, cellθ };
            }
    drawｰcell ( x, y, color ) {
            const { ctx, cellθ } = this.drawｰctx ();
            ctx.save ();
            ctx.fillStyle = color;
            ctx.strokeStyle = "transparent";
            cellθ ( x, y );
            ctx.restore ();
            }
    draw ( state, color ) {
            const { ctx, cellθ } = this.drawｰctx ();
            ctx.save ();
            ctx.fillStyle = color;
            ctx.strokeStyle = "transparent";
            for (
                let x = 0;
                x < state.width;
                x++
                ) for (
                    let y = 0;
                    y < state.height;
                    y++
                    ) if (
                        state.liveʔ̣ ( state.index ( x, y ) )
                        ) cellθ ( x, y );
            ctx.restore ();
            }
    }

class field extends elements {
    constructor ( name, content = "" ) {
            super ( name );
            this.content = content;
            }
    get content () { return this.elem.innerHTML; }
    set content ( content ) { this.elem.innerHTML = content; }
    }

class input extends elements { // input elements call change when their value changes
    constructor ( name, configｰdata = config.data [ name ], configｰname = "value" ) {
            super ( name );
            this.configｰdata = configｰdata;
            this.configｰname = configｰname;
            this.elem.addEventListener ( "change", event => { this.value = event.target.value; }, { passive: true } );
            }
    // allow initialization without calling this.change
    set init ( value ) {
            value = arrayʔ̣ ( value ) ? value : ㄱnumberʔ̣ ( +value ) ? value : +value;
            this.elem.value = this.configｰdata [ this.configｰname ] = value;
            }
    // call this.change when value is modified
    get value () { const s = this.elem.value, n = arrayʔ̣ ( s ) ? s : +s; return ㄱnumberʔ̣ ( n ) ? s : n; }
    set value ( value ) {
            // we must set config.data….value first, before calling virtual change !
            this.init = value;
            config.store ();
            this.change ( value );
            }
    change ( value ) { virtualⵢ ( value ); }
    }

class inputｰnumberｰlist extends input {
    get value () { return this.configｰdata [ this.configｰname ]; }
    set value ( value ) {
            const prevｰvalue = this.value;
            const validate = val => {
                    const { range, vicinity } = config.data.rules.neighborhood;
                    const max = vicinity === surroundings.moore ?
                        ( 2 * range + 1 ) ** 2 - 1 :
                        2 * range * ( range + 1 );
                    // normalize separator and only keep digits and - and ,
                    val = val.replace ( ";", "," ).replace ( /\s|[^0-9,-]/g, "" );
                    const result = [];
                    const chunks = val.split ( "," );
                    chunks.forEach ( chunk => {
                            const range = chunk.match ( /\d+/g );
                            if ( +range [ 0 ] > max ) range [ 0 ] = max;
                            if ( range.length === 1 ) range.push ( +range [ 0 ] );
                            else if ( +range [ 1 ] > max ) range [ 1 ] = max;
                            const [ i0, i1 ] = +range [ 0 ] < +range [ 1 ] ? [ 0, 1 ] : [ 1, 0 ];
                            for ( let i = +range [ i0 ]; i <= +range [ i1 ]; ++i ) result.push ( i );
                            } );
                    return [ ...new Set ( result ) ].sort ( ( a, b ) => a - b ); // sort numerically unique values
                    };
            if ( this.elem.checkValidity () ) try { super.value = validate ( value ); }
                catch ( e ) {
                    this.elem.value = `${ value }: ${ e }`;
                    }
            else this.elem.value = prevｰvalue;
            this.display ( this.configｰdata [ this.configｰname ] );
            }
    display ( value ) { // displays e.g. [ 2,4,5,6,9,11,12,13,15 ] as "2;4-6;9;11-13;15"
            const l = value.length - 1; // last index in value array
            // map [ 2,4,5,6,9,11,12,13,15 ] into array of strings (quote ommitted) [ "2,","4-","-","6,","9,","11-","-","13,","15," ]
            value = value.map ( ( v, i, a ) => i < l && a [ i + 1 ] - v === 1 ? `${ i > 0 && v - a [ i - 1 ] === 1 ? "" : v }-` : `${ v },` );
            this.elem.value = value.join ( "" ).   // concatenate all strings in value array
                replace ( /-+/g, "-" ). // replace multiple dashes by single dash
                slice ( 0, -1 );        // remove trailing ,
            }
    }

class modalｰbutton extends button { // modal buttons prepare to display a modal popup on top of a frosted window; everything remains hidden by default
    constructor ( name ) {
            super ( name );
            this.frosted = document.getElementById ( "frosted" );
            this.panes = this.frosted.querySelectorAll ( "#popup > div" );
            this.panes.forEach ( pane => { pane.style.visibility = "hidden"; } );
            this.cancel = document.getElementById ( "cancel" );
            this.cancel.addEventListener ( "click", ( /* event */ ) => {
                    this.panes.forEach ( pane => { pane.style.visibility = "hidden"; } );
                    this.frosted.style.visibility = "hidden";
                    } );
            }
    press ( /* event */ ) {
            this.frosted.style.visibility = "visible";
            }
    }

class radioｰbutton extends elements { // radio buttons call change when checked
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "change", event => { this.state = event.target.checked; }, { passive: true } );
            }
    // allow initialization without calling this.change
    set init ( state ) { this.elem.checked = state; }
    get state () { return this.elem.checked; }
    set state ( state ) { this.init = state; if ( this.state ) this.change (); }
    change () { virtualⵢ (); }
    }

class slider extends input { // slider elements do the same as regular input but they also display value in an adjacent field
    constructor ( name, configｰdata = config.data [ name ], configｰname = "value" ) {
            super ( name, configｰdata, configｰname );
            this.valueｰlabel = document.getElementById ( `${ name }-value` );
            }
    set init ( value ) {
            this.valueｰlabel.innerHTML = `${ value }`;
            super.init = value;
            }
    set value ( value ) {
            this.init = value;
            super.value = value;
            }
    }

class toggle extends elements { // checkbox elements call `hide` when unchecked and `show` when checked
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "click", event => { this.visible = event.target.checked; }, { passive: true } );
            }
    // allow initialization without calling this.change
    set init ( state ) { this.elem.checked = config.data [ this.name ].visible = state; }
    get visible () { return config.data [ this.name ].visible; }
    set visible ( state ) {
            // we must set config.data….visible first, before calling virtual hide or show !
            this.init = state;
            config.store ();
            if ( state ) this.show (); else this.hide ();
            }
    hide () { virtualⵢ (); }
    show () { virtualⵢ (); }
    }

// ==| Footer |================================================================
// The footer area provides ways to display status information in separate divs
// ============================================================================
const footer = new class extends elements {
    constructor () {
            super ( "footer" );
            this.divs = {};
            }
    add ( name ) {
            this.remove ( name ); // just in case name is already defined.
            const div = document.createElement ( "div" );
            div.id = name;
            this.divs [ name ] = div;
            return this.elem.appendChild ( div );
            }
    div ( name ) {
            return this.divs [ name ]; // returns undefined if name is unknown.
            }
    remove ( name ) {
            if ( name in this.divs ) {
                this.elem.removeChild ( this.divs [ name ] );
                delete this.divs [ name ];
                }
            }
    };

// ==| Logger |================================================================
const logger = footer.add ( "logger" );
logger.style.overflow = "auto";
logger.style.fontSize = "smaller";
logger.style.color = "#00ff00";
const log = ( ...args ) => {
        logger.innerHTML = `${ new Date ().toLocaleTimeString () } → ${ [ ...args ].
            map ( JSON.stringify ).
            map ( s => s.replace ( /^"(.*)"$/, "$1" ) ).
            join ( " " ) }<br />${ logger.innerHTML }`;
        };

// ==| Game |==================================================================
// The game shortcut exposes the following properties and methods
// width, height - represent the dimensions of the canvas (readonly)
// canvas, grid, trail, speed, zoom - represent the state of control knobs
// resize () => fetches the current game width and height,
//              then resizes and redraws the canvas.
// ============================================================================
const game = new class extends board {
    constructor () {
            super ( "game" );
            propertiesꔛ ( this, {
                // ==| Canvas |================================================================
                canvas: {
                    value: new canvas ( "canvas", "svg", this )
                    },
                // ==| Config dialog |=========================================================
                config: {
                    value: new class extends modalｰbutton {
                        constructor ( game ) {
                                super ( "config" );
                                this.game = game;
                                this.settings = document.getElementById ( "settings" );
                                // ==| Zoom |==================================================================
                                this.zoom = {
                                    factor: new class extends slider {
                                        constructor () { super ( "zoom" ); }
                                        change () {
                                                document.documentElement.style.setProperty ( "--pattern-scale", game.grid.scale );
                                                game.resize ();
                                                }
                                        },
                                    mode: new class extends input {
                                        constructor () { super ( "scaling-mode", config.data.grid.scaling, "mode" ); }
                                        change () { game.config.zoom.factor.change (); }
                                        },
                                    step: new class extends slider {
                                        constructor () { super ( "scaling-step", config.data.grid.scaling, "step" ); }
                                        change () { game.config.zoom.factor.change (); }
                                        },
                                    shift: new class extends slider {
                                        constructor () { super ( "scaling-shift", config.data.zoom, "shift" ); }
                                        change () { game.config.zoom.factor.change (); }
                                        },
                                    };
                                // ==| Colors |================================================================
                                this.colors = {
                                    grid: new class extends input {
                                        constructor () { super ( "grid-color", config.data.grid, "color" ); }
                                        change () { if ( game.grid.visible ) game.grid.show (); }
                                        },
                                    live: new class extends input {
                                        constructor () { super ( "live-color", config.data.grid, "live" ); }
                                        change () { game.redraw (); }
                                        },
                                    trail: new class extends input {
                                        constructor () { super ( "trail-color", config.data.trail, "color" ); }
                                        change () {
                                                document.documentElement.style.setProperty ( "--trail-color", this.value );
                                                if ( game.trail.visible ) game.trail.show ();
                                                }
                                        },
                                    alpha: new class extends slider {
                                        constructor () { super ( "alpha", config.data.trail, "alpha" ); }
                                        change () { game.redraw ( game.state ); }
                                        },
                                    };
                                this.effects = {
                                    top: new class extends input {
                                        constructor () { super ( "top-effect", config.data.geometry, "top" ); }
                                        change () { log ( `${ this.name }: ${ this.value }` ); }
                                        },
                                    right: new class extends input {
                                        constructor () { super ( "right-effect", config.data.geometry, "right" ); }
                                        change () { log ( `${ this.name }: ${ this.value }` ); }
                                        },
                                    bottom: new class extends input {
                                        constructor () { super ( "bottom-effect", config.data.geometry, "bottom" ); }
                                        change () { log ( `${ this.name }: ${ this.value }` ); }
                                        },
                                    left: new class extends input {
                                        constructor () { super ( "left-effect", config.data.geometry, "left" ); }
                                        change () { log ( `${ this.name }: ${ this.value }` ); }
                                        }
                                    };
                                this.neighborhood = {
                                    vicinity: new class extends input {
                                        constructor () {
                                                super ( "neighborhood", config.data.rules.neighborhood, "vicinity" );
                                                }
                                        change () {
                                                game.config.resize ();
                                                game.redraw ();
                                                }
                                        },
                                    range: new class extends slider {
                                        constructor () { super ( "range", config.data.rules.neighborhood, "range" ); }
                                        change ( value ) {
                                                document.documentElement.style.setProperty ( "--neighborhood-range", value );
                                                game.config.resize ();
                                                game.redraw ();
                                                }
                                        }
                                    };
                                this.canvas = new canvas ( "neighborhood-canvas", "neighborhood-svg", game );
                                this.born = new inputｰnumberｰlist ( "born", config.data.rules, "born" );
                                this.survive = new inputｰnumberｰlist ( "survive", config.data.rules, "survive" );
                                }
                        press ( event ) {
                                super.press ( event );
                                this.settings.style.visibility = "visible";
                                this.resize ();
                                }
                        // TODO ! Use canvas functions !
                        redraw () {
                                const { canvas } = this;
                                const { range, tiling, vicinity } = state;
                                const { live } = config.data.grid;
                                // const { height, width } = this.game.config.neighborhood.dims;
                                const trail = config.data.trail.color;
                                const center = [ range + 1, ( range + 1 ) * ( tiling === tiles.triangle ? 2 : 1 ) ];
                                canvas.clear ();
                                canvas.drawｰcell ( ...center, live );
                                neighborhoods [ vicinity ] [ tiling ] ( range, ( x, y ) => canvas.drawｰcell ( x, y, trail ), ...center );
                                }
                        resize () {
                                const { range } = config.data.rules.neighborhood; // neighborhood range
                                const { height, scale, tiling, width } = this.game.grid;
                                const h = 2 * range + 3; // number of cells per column in the neighborhood canvas
                                const w = tiles.square === tiling ? h : div2 ( h ); // number of cells per row
                                const pw = 1 / scale;
                                this.canvas.height = h * height + pw;
                                this.canvas.width = this.game.grid.adjustｰwidth ( w * width ) + pw;
                                this.redraw ();
                                }
                        } ( this )
                    },
                // ==| Grid |==================================================================
                grid: {
                    value: new class extends toggle {
                        constructor ( game ) {
                                super ( "grid" );
                                this.game = game;
                                // ==| Tiling |================================================================
                                this.tilingｰbuttons = {}; // note that tiling buttons appear in the config pane
                                const tiling = document.querySelectorAll ( "input[name='tiling']" );
                                tiling.forEach (
                                    option => {
                                            const name = option.value;
                                            // ==| Tile radio buttons |====================================================
                                            this.tilingｰbuttons [ name ] = new class extends radioｰbutton {
                                                constructor ( grid ) {
                                                        super ( name );
                                                        this.grid = grid;
                                                        const p = this.pattern = document.getElementById ( `${ name }-pattern` );
                                                        this.baseｰheight = p.height.baseVal.value;
                                                        this.baseｰwidth = p.width.baseVal.value;
                                                        }
                                                change () { this.grid.tiling = name; } // Uh ho … danger !
                                                } ( this );
                                            this.tilingｰbuttons [ name ].elem.checked = name === config.data.grid.tiling;
                                            }
                                    );
                                freezeꔛ ( this );
                                }
                        adjustｰwidth ( w ) { // adjust a width "w" to have be integer multiple of cell widths
                                switch ( this.tiling ) {
                                    case tiles.hexagon: w += 2 * this.width / 3; break;
                                    case tiles.square: break;
                                    case tiles.triangle: if ( ᒪｘᒧ ( 2 * ᒪｘᒧ ( w ) / this.width ) !== ᒪｘᒧ ( 2 * w / this.width ) ) w += this.width / 2; break;
                                    default: throw TypeError ( `Invalid game tiling type: ${ this.tiling }` );
                                    }
                                return w;
                                }
                        hide () { this.paint ( "transparent" ); }
                        show () { this.paint ( config.data.grid.color ); }
                        paint ( color ) { /* a valid CSS color, such as transparent or #e0e0e0 */
                                document.documentElement.style.setProperty ( "--pattern-color", color );
                                }
                        // base height and width of individual cells, in pixels
                        get height () { return this.tilingｰbuttons [ this.tiling ].baseｰheight * this.scale; }
                        get width () { return this.tilingｰbuttons [ this.tiling ].baseｰwidth * this.scale; }
                        get scale () {
                                const sc = config.data.grid.scaling;
                                const zm = config.data.zoom.value + config.data.zoom.shift;
                                switch ( sc.mode ) {
                                    case "linear": return 1 + sc.step * zm;
                                    case "geometric": return ( 1 + sc.step ) ** zm;
                                    default: throw TypeError ( `Invalid scaling mode: ${ sc.mode }` );
                                    }
                                }
                        // ==| Tiling |================================================================
                        get tiling () { return config.data.grid.tiling; }
                        set tiling ( tile ) {
                                document.documentElement.style.setProperty ( "--grid-fill", `url(#${ tile }-pattern)` );
                                config.data.grid.tiling = tile;
                                config.store ();
                                this.game.resize ();
                                this.game.config.resize ();
                                }
                        } ( this )
                    },
                // ==| Play |==================================================================
                play: {
                    value: new class extends button {
                        constructor ( game ) { super ( "play" ); this.game = game; }
                        press ( /* event */ ) {
                                // toggle play state and button label
                                if ( this.playing ) {
                                    window.cancelAnimationFrame ( this.playing );
                                    this.playing = null;
                                    this.elem.value = "play_arrow";
                                    }
                                else {
                                    const step = timestamp => {
                                            // ignore timestamp (milliseconds)
                                            void timestamp;
                                            this.game.redraw ( this.game.state.nextｰstate );
                                            this.playing = window.requestAnimationFrame ( step );
                                            };
                                    this.playing = window.requestAnimationFrame ( step );
                                    this.elem.value = "pause";
                                    }
                                }
                        } ( this )
                    },
                // ==| Speed |=================================================================
                speed: {
                    value: new class extends slider {
                        constructor ( game ) { super ( "speed" ); this.game = game; }
                        change () { log ( `sliding speed to ${ config.data.speed.value }` ); }
                        } ( this )
                    },
                // ==| Step |==================================================================
                step: {
                    value: new class extends button {
                        constructor ( game ) { super ( "step" ); this.game = game; }
                        press ( /* event */ ) {
                                // redraw and switch to new state
                                this.game.redraw ( this.game.state.nextｰstate );
                                }
                        } ( this )
                    },
                // ==| Trail |=================================================================
                trail: {
                    value: new class extends toggle {
                        constructor ( game ) { super ( "trail" ); this.game = game; }
                        hide () { this.game.redraw (); }
                        show () { this.game.redraw (); }
                        } ( this )
                    },
                // ==| Watch position |========================================================
                watch: {
                    value: new class extends elements {
                        constructor ( game ) {
                                super ( "position-watch" );
                                this.game = game;
                                this.canvas = new canvas ( "position-canvas", "position-svg", game );
                                // ==| Grid dimensions |=======================================================
                                const dim = new field ( "dimensions" );
                                // ==| Mouse position |========================================================
                                const pos = new field ( "position" );
                                propertiesꔛ ( this, {
                                    dimensions: {
                                        get () { return dim.content; },
                                        set ( content ) { dim.content = content; }
                                        },
                                    position: {
                                        get () { return pos.content; },
                                        set ( content ) { pos.content = content; }
                                        },
                                    }
                                    );
                                }
                        // When the mouse moves, we get notified about it and can display its position
                        move ( i, j ) {
                                this.dimensions = `${ this.game.width }, ${ this.game.height }`;
                                this.position = `${ i },${ j }`;
                                }
                        } ( this )
                    }
                }
                );
            this.ⴵ = { move: null, resize: null }; // timers for mouse move and resize throttling
            window.addEventListener ( "resize", event => this.resize ( event ), { passive: true } );
            this.resize ();
            const comments = footer.add ( "comments" );
            comments.innerHTML = "approximative hexagonal and triangular coordinates:<br />click leftmost / topmost vertex to toggle";
            this.state = new state ( this ); // we want to be able to change state, this must be writable
            this.playing = null;
            }
    // ==| Mouse events |===========================================================
    pos ( event ) { // return grid coordinates from where the event occurred
            const w = this.width;
            const h = this.height;
            let x = w * ( event.clientX - this.canvas.pos.left ) / this.canvas.width;
            let y = h * ( event.clientY - this.canvas.pos.top ) / this.canvas.height;
            // Compute coordinates of square grid corresponding to x,y:
            const [ i, j ] = [ ᒥｘᒧ ( ᒪｘᒧ ( x ), 0, w - 1 ), ᒥｘᒧ ( ᒪｘᒧ ( y ), 0, h - 1 ) ];
            // Refer to geometry consideration at the top of this file to understand how square tiles map to other type of tiles
            switch ( this.tiling ) {
                case tiles.hexagon:
                    // We bring x,y coordinates into the square cell i,j; i.e. (x,y) ∈ ⟦0,1⟧²
                    // and, as we only need 3x and 2y in our formulas, we scale them accordingly
                    [ x, y ] = [ 3 * ( x - i ), 2 * ( y - j ) ];
                    // For cells in even columns, we must test where we are in the leftost third
                    if ( evenʔ̣ ( i ) ) {
                        // if we are left of the diagonal going from middle left up to top left third,
                        // i.e. y < 1 - x, we are hexagonal cell in i-1,j-1:
                        if ( y < 1 - x ) return [ i - 1, j - 1 ];
                        // if we are left of the diagonal going from middle left down to bottom left third,
                        // i.e. y > 1 + x, we are in hexagonal cell i-1,j+1:
                        if ( y > x + 1 ) return [ i - 1, j + 1 ];
                        // otherwise we are in hexagonal cell i,j:
                        return [ i, j ];
                        }
                    // From here on, i is odd
                    // and we must test whether we are in the bottom right or not;
                    // if we are in the top half of square cell i,j (i.e. y < 1), we test whether we are left
                    // or right of the diagonal going from top left to the third of the horizontal middle line;
                    // if we are left (i.e. x < y), we are in hexagonal cell i-1,j, otherwise in i,j-1:
                    if ( y < 1 ) return y < x ? [ i, j - 1 ] : [ i - 1, j ];
                    // otherwise, y > 1 and we are in the bottom half of square cell i,j and we test whether we
                    // are left or right of the diagonal from bottom left to the third of the horizontal middle line;
                    // if we are left (i.e. y < 2 - x), we are in hexagonal cell i-1,j, otherwise in i,j:
                    if ( y < 2 - x ) return [ i - 1, j ];
                    return [ i, j ];
                case tiles.square:
                    // this is the nominal case
                    return [ i, j ];
                case tiles.triangle:
                    // we bring x,y coordinates into the square cell i,j; i.e. (x,y) ∈ ⟦0,1⟧²
                    [ x, y ] = [ x - i, y - j ];
                    // Depending on whether i and j are of the same parity, we test where x,y is with respect to the square diagonal:
                    // For i and j of the same parity, the diagonal goes from top left to bottom right,
                    // and if (x,y) is above it (i.e. x > y), it is in the triangle i,j-1 instead of i,j when below that diagonal.
                    // For i and j of opposite parities, the diagonal goes bottom left to top right
                    // and if (x,y) is above it (i.e. x + y < 1), we are in triangle i, j- 1 instead of i,j when below the diagonal.
                    return [ i, evenʔ̣ ( i + j ) ? y > x ? j : j - 1 : x + y > 1 ? j : j - 1 ];
                default:
                    throw TypeError ( `Invalid game tiling type: ${ this.tiling }` );
                }
            }
    click ( event ) { // toggle state of clicked cell
            const [ x, y ] = this.pos ( event );
            const index = this.state.index ( x, y );
            const color = this.state.liveʔ̣ ( index ) ?
                ( this.state.kill ( index ), config.data.trail.color ) :
                ( this.state.breed ( index ), config.data.grid.live );
            this.canvas.drawｰcell ( x, y, color );
            log ( `toggled ${ x },${ y }` );
            }
    dblclick ( event ) {
            log ( `dblclicked ${ event.clientX - this.canvas.pos.left },${ event.clientY - this.canvas.pos.top }` );
            }
    move ( event ) {
            if ( this.ⴵ.move ) return; // mouse move timer is running, let's wait till it pops
            // ok, timer has popped, let's reset another one;
            this.ⴵ.move = window.requestAnimationFrame ( () => {
                    this.ⴵ.move = null;
                    // note that the event here is the last one before animation was triggered (closure of move)
                    const [ x, y ] = this.pos ( event );
                    this.watch.move ( x, y );
                    } );
            }
    resize ( /* event */ ) {
            if ( this.ⴵ.resize ) return; // resize timer is running, let's wait till it pops
            this.ⴵ.resize = window.requestAnimationFrame ( () => {
                    this.ⴵ.resize = null;
                    const ᒪｘꓹｓᒧ = ( x, s ) => ᒪｘᒧ ( x / s ) * s; // flooring x to nearest multiple of s lower than x
                    const { height, scale, width } = this.grid;
                    const { canvas } = this;
                    const pw = 1 / scale; // pen width
                    // force the canvas to a small size to let CSS flex box resize other elements first
                    canvas.height = 1; canvas.width = 1;
                    // now get the dimensions of the enclosing fieldset, and compute canvas size based on these
                    const cs = window.getComputedStyle ( this.elem, null );
                    let h = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.height ) - ᒪｘᒧ ( cs.paddingTop ) - ᒪｘᒧ ( cs.paddingBottom ) - ᒪｘᒧ ( cs.marginTop ) - ᒪｘᒧ ( cs.marginBottom ), height );
                    let w = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.width ) - ᒪｘᒧ ( cs.paddingLeft ) - ᒪｘᒧ ( cs.paddingRight ), width );
                    h += pw;
                    w += pw;
                    w = this.grid.adjustｰwidth ( w );
                    this.config.resize ();
                    log ( `resizing canvas to ${ w }×${ h } pixels` );
                    window.requestAnimationFrame ( () => { // defer real resizing/redrawing of the canvas after the CSS flex box has redrawn boundaries
                            canvas.width = w;
                            canvas.height = h;
                            config.data.geometry.height = this.height;
                            config.data.geometry.width = this.width;
                            config.store ();
                            // fake mouse movement to force display of coordinates.
                            this.move ( { clientX: this.canvas.pos.left, clientY: this.canvas.pos.top } );
                            this.redraw ();
                            } );
                    } );
            }
    // ==| Accessors |==============================================================
    get tiling () { return this.grid.tiling; }
    // return height and width as a number of cells:
    get height () { return ᒪｘᒧ ( ( this.tiling === tiles.triangle ? 2 : 1 ) * this.canvas.height / this.grid.height ); }
    get width () { return ᒪｘᒧ ( ( this.tiling === tiles.square ? 1 : 2 ) * this.canvas.width / this.grid.width ); }
    // ==| Drawing |================================================================
    redraw ( newｰstate ) {
            // handle trail first if it is visible and we have a new state
            if ( newｰstate && config.data.trail.visible ) {
                // write previous canvas picture with greater alpha
                this.canvas.alpha = config.data.trail.alpha;
                // overwrite current state cells with trail colors
                this.canvas.draw ( this.state, config.data.trail.color );
                }
            else this.canvas.clear ();
            // then switch to new state if present
            this.state = newｰstate || this.state;
            // and finally paint (new) state cells in live colors
            this.canvas.draw ( this.state, config.data.grid.live );
            }
    };

export default class eternalｰview {
    /**
     * The eternalｰview is data-less. It operates on singleton objects (game, config, defaults…).
     * Hence, multiple instances present no issue (they share prototype anyway).
     */
    constructor () {
            // set values of control knobs
            game.grid.init = config.data.grid.visible;
            game.trail.init = config.data.trail.visible;
            game.speed.init = config.data.speed.value;

            game.config.zoom.mode.init = config.data.grid.scaling.mode;
            game.config.zoom.step.init = config.data.grid.scaling.step;
            game.config.zoom.shift.init = config.data.zoom.shift;

            game.config.colors.grid.init = config.data.grid.color;
            game.config.colors.live.init = config.data.grid.live;
            game.config.colors.trail.init = config.data.trail.color;
            game.config.colors.alpha.init = config.data.trail.alpha;

            game.config.effects.bottom.init = config.data.geometry.bottom;
            game.config.effects.left.init = config.data.geometry.left;
            game.config.effects.right.init = config.data.geometry.right;
            game.config.effects.top.init = config.data.geometry.top;

            game.config.neighborhood.vicinity.init = config.data.rules.neighborhood.vicinity;
            game.config.neighborhood.range.init = config.data.rules.neighborhood.range;

            game.config.born.display ( config.data.rules.born );
            game.config.survive.display ( config.data.rules.survive );

            game.state.randomize ();

            // setting tiling type and zoom forces resizing, thus redrawing
            game.grid.tiling = config.data.grid.tiling;
            game.config.zoom.factor.value = config.data.zoom.value;
            }
    get config () { return config; }
    get gridʔ̣ () { return game.grid.visible; }
    get trailʔ̣ () { return game.trail.visible; }
    get width () { return game.width; }
    get height () { return game.height; }

    set step ( fθ ) { game.step = fθ; }

    log ( ...args ) { log ( ...args ); }
    }

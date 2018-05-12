// ==| VIEW |==================================================================
//  * MVC view for eternal life game
//
// * MVC view for the eternal life game
// * The view has primitives to display state on a canvas.
// * It also keeps track of external events and user input.
// * It processes locally some user actions such as displaying or hiding the grid.

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

// Usual shortcuts (replicated as needed in all modules)
const ထ = Infinity; // eslint-disable-line no-restricted-syntax
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
const { bottom, left, right, top } = effects; // these are the effects we know about in this module
const { hexagon, square, triangle } = tiles; // these are the tessalations we know about in this module

// don't store state in config defaults (state must be explicitly stored)
const defaults = {
    geometry: {
        width: null,
        height: null,
        maxr: 3,
        maxh: 512,
        maxw: 512,
        top: effects.top, /* bounces */
        right: effects.left, /* reappears on left */
        bottom: effects.bottom, /* bounces */
        left: effects.right, /* reappears on right */
        },
    grid: { visible: true, color: "#e0e0e0", live: "#a30015", tiling: square, scaling: { mode: "linear", step: .1 } },
    rules: { neighborhood: { vicinity: surroundings.moore, range: 1 }, born: [ 3 ], survive: [ 2, 3 ] },
    speed: { value: 0, maxs: 2 },
    trail: { visible: true, color: "#ff80ff", alpha: 4 }, // most recent color, gradient goes to white by increasing alpha at each step
    zoom: { value: 0, shift: 0 },
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
    clear () { this.cells.fill ( 0 ); }
    kill ( index ) { this.cells [ index ] = 0; }
    liveʔ̣ ( index ) { return this.cells [ index ] === 1; }
    randomize () { this.cells.forEach ( ( _, i, c ) => ( c [ i ] = Math.random () < 0.5 ? 0 : 1 ) ); return this; }

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

    static get bottom () { return key ( effects, config.data.geometry.bottom ); }
    static get left () { return key ( effects, config.data.geometry.left ); }
    static get right () { return key ( effects, config.data.geometry.right ); }
    static get top () { return key ( effects, config.data.geometry.top ); }

    get bottom () { return state.bottom; }
    get left () { return state.left; }
    get right () { return state.right; }
    get top () { return state.top; }

    static resetｰcache () { state.cached = false; }


    // TODO !!
    // cache result of all neighborhood functions in a separate space so that they can return their result immediately;
    // have a current cache that voids in case of resize/config change…
    // change eternal config to separate generic storage from specific

    get nextｰstate () {
            const newｰstate = new state ( this.game ); // new state that we will return when done with computations
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
            const neighborsⵌ = neighborhood => neighborhood.map ( i => this.liveʔ̣ ( i ) ).reduce ( ( i, j ) => i + j ); // number of live neighbors
            const applyｰrule = ( cell, neighboringｰcells ) => {
                    const pop = neighborsⵌ ( neighboringｰcells );
                    if ( this.liveʔ̣ ( cell ) ) newｰstate [ survive.includes ( pop ) ? "breed" : "kill" ] ( cell );
                    else if ( born.includes ( pop ) ) newｰstate.breed ( cell );
                    };
            if ( state.cached ) try {
                for ( let x = 0; x < width; x++ ) for ( let y = 0; y < height; y++ ) {
                    const index = state.index ( x, y );
                    applyｰrule ( index, state.cache [ index ] );
                    }
                return newｰstate;
                }
                catch ( unused ) { void 0; }
            const neighbors = neighborhoods [ vicinity ] [ tiling ]; // function returning an array of neighbors
            // we delimit the board between the inner part where (x,y) ∈ [xmin,xmax[ × [ymin,ymax[ and cornercases and bordercases (special cases)
            const [ xmin, xmax ] = [ range, width - range ];
            const [ ymin, ymax ] = tiling === triangle ? [ 2 * range, height - 2 * range ] : [ range, height - range ];

            // TODO find proper commemt
            const pair = ( x, y ) => [ x, y ];
            const indexｰpair = ( [ x, y ] ) => state.index ( x, y );
            // TODO find proper commemt
            const mappings = {
                bottom: {
                    drop: ( [ x, y ] ) => y >= height ? [ x, +ထ ] : [ x, y ],
                    bottom: ( [ x, y ] ) => y >= height ? [ x, 2 * height - y - 1 ] : [ x, y ],
                    left: ( [ x, y ] ) => y >= height ? [ y - height, height - x - 1 ] : [ x, y ],
                    right: ( [ x, y ] ) => y >= height ? [ width + height - y - 1, x ] : [ x, y ],
                    top: ( [ x, y ] ) => y >= height ? [ x, y - height ] : [ x, y ]
                    },
                left: {
                    drop: ( [ x, y ] ) => x < 0 ? [ -ထ, y ] : [ x, y ],
                    bottom: ( [ x, y ] ) => x < 0 ? [ width - y - 1, width + x ] : [ x, y ],
                    left: ( [ x, y ] ) => x < 0 ? [ -x - 1, y ] : [ x, y ],
                    right: ( [ x, y ] ) => x < 0 ? [ width + x, y ] : [ x, y ],
                    top: ( [ x, y ] ) => x < 0 ? [ y, -x - 1 ] : [ x, y ]
                    },
                right: {
                    drop: ( [ x, y ] ) => x >= width ? [ +ထ, y ] : [ x, y ],
                    bottom: ( [ x, y ] ) => x >= width ? [ width - y - 1, width + height - x - 1 ] : [ x, y ],
                    left: ( [ x, y ] ) => x >= width ? [ x - width, y ] : [ x, y ],
                    right: ( [ x, y ] ) => x >= width ? [ 2 * width - x - 1, y ] : [ x, y ],
                    top: ( [ x, y ] ) => x >= width ? [ y, x - width ] : [ x, y ]
                    },
                top: {
                    drop: ( [ x, y ] ) => y < 0 ? [ x, -ထ ] : [ x, y ],
                    bottom: ( [ x, y ] ) => y < 0 ? [ x, height + y ] : [ x, y ],
                    left: ( [ x, y ] ) => y < 0 ? [ -y - 1, height - x - 1 ] : [ x, y ],
                    right: ( [ x, y ] ) => y < 0 ? [ width + y, x ] : [ x, y ],
                    top: ( [ x, y ] ) => y < 0 ? [ x, -y - 1 ] : [ x, y ]
                    }
                };
            // Given two mapping functions, mapｰadder produces one that maps a coordinate pair into the coordinate vector containing all mappings of that pair
            const convolution = ( f, g ) => ( [ x, y ] ) => f ( g ( [ x, y ] ) );
            // Given a side, mapper produces the mapping function that maps coordinate pairs according to geometry specifications
            const mapper = side => [ bottom, left, right, top ].
                filter ( border => config.data.geometry [ border ] === side ).
                reduce ( ( accum, border ) => convolution ( accum, mappings [ side ] [ border ] ), mappings [ side ].drop );
            // Given a side, remap transforms out of bounds coordinates into legit coordinates in line with geometry specifications
            const remap = side => coordinates => coordinates.reduce ( ( accum, coord ) => [ ...accum, mapper ( side ) ( coord ) ], [] );
            // Given a central point (x, y), applyｰrules counts the
            const applyｰrules = ( x, y ) => coordinates => {
                    const index = state.index ( x, y );
                    state.cache [ index ] = [ ...coordinates ];
                    applyｰrule ( index, coordinates );
                    };
            // let's handle the left border first, including top and bottom corners:
            for ( let x = 0; x < xmin; x++ ) {
                // let's handle the top left corner
                for ( let y = 0; y < ymin; y++ ) applyｰrules ( x, y ) ( remap ( left ) ( remap ( top ) ( neighbors ( range, pair, x, y ) ) ).map ( indexｰpair ) );
                // then let's do the left border except corners
                for ( let y = ymin; y < ymax; y++ ) applyｰrules ( x, y ) ( remap ( left ) ( neighbors ( range, pair, x, y ) ).map ( indexｰpair ) );
                // and let's do the bottom left corner
                for ( let y = ymax; y < height; y++ ) applyｰrules ( x, y ) ( remap ( left ) ( remap ( bottom ) ( neighbors ( range, pair, x, y ) ) ).map ( indexｰpair ) );
                }
            // let's now handle the middle section, including top and bottom borders:
            for ( let x = xmin; x < xmax; x++ ) {
                // first, let's handle the top central border:
                for ( let y = 0; y < ymin; y++ ) applyｰrules ( x, y ) ( remap ( top ) ( neighbors ( range, pair, x, y ) ).map ( indexｰpair ) );
                // then, let's handle the central section where (x,y) ∈ [xmin,xmax[ × [ymin,ymax[:
                for ( let y = ymin; y < ymax; y++ ) applyｰrules ( x, y ) ( neighbors ( range, state.index, x, y ) );
                // last, let's handle the bottom central border:
                for ( let y = ymax; y < height; y++ ) applyｰrules ( x, y ) ( remap ( bottom ) ( neighbors ( range, pair, x, y ) ).map ( indexｰpair ) );
                }
            // then we handle the right border special cases, including corners
            for ( let x = xmax; x < width; x++ ) {
                // let's handle the top right corner
                for ( let y = 0; y < ymin; y++ ) applyｰrules ( x, y ) ( remap ( right ) ( remap ( top ) ( neighbors ( range, pair, x, y ) ) ).map ( indexｰpair ) );
                // then let's do the right border except corners
                for ( let y = ymin; y < ymax; y++ ) applyｰrules ( x, y ) ( remap ( right ) ( neighbors ( range, pair, x, y ) ).map ( indexｰpair ) );
                // and let's do the bottom right corner
                for ( let y = ymax; y < height; y++ ) applyｰrules ( x, y ) ( remap ( right ) ( remap ( bottom ) ( neighbors ( range, pair, x, y ) ) ).map ( indexｰpair ) );
                }
            state.cached = true;
            return newｰstate;
            }
    }
// static class data members:
state.cached = false;
state.cache = new Array ( config.data.geometry.maxw * config.data.geometry.maxh );

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
    static drawｰhex ( x, y, ctx, w, h ) {
            ctx.beginPath ();
            let px = 3 * x * w / 2;
            let py = ( 2 * y + x % 2 + 1 ) * h;
            ctx.moveTo ( px, py );
            ctx.lineTo ( px += w / 2, py -= h );
            ctx.lineTo ( px += w, py );
            ctx.lineTo ( px += w / 2, py += h );
            ctx.lineTo ( px -= w / 2, py += h );
            ctx.lineTo ( px -= w, py );
            ctx.closePath ();
            ctx.fill ();
            ctx.stroke ();
            }
    static drawｰsqr ( x, y, ctx, w, h ) {
            const px = x * w;
            const py = y * h;
            ctx.fillRect ( px, py, w, h );
            ctx.strokeRect ( px, py, w, h );
            }
    static drawｰtri ( x, y, ctx, w, h ) {
            ctx.beginPath ();
            let px = 3 * x * w / 2;
            let py = ( 2 * y + x % 2 + 1 ) * h;
            if ( ( x + y ) % 2 === 0 ) {
                ctx.moveTo ( px = x * w, py = y * h / 2 );
                ctx.lineTo ( px, py += h );
                ctx.lineTo ( px += w, py -= h / 2 );
                }
            else {
                ctx.moveTo ( px = x * w, py = ( y + 1 ) * h / 2 );
                ctx.lineTo ( px += w, py -= h / 2 );
                ctx.lineTo ( px, py += h );
                }
            ctx.closePath ();
            ctx.fill ();
            ctx.stroke ();
            }
    // ==| Canvas drawing |=========================================================
    clear () { this.ctx.clearRect ( 0, 0, this.ctx.canvas.clientWidth, this.ctx.canvas.clientHeight ); }
    drawｰctx () {
            const { height, width } = this.game.grid; // scaled width and height of cells
            const { color: stroke, tiling, visible } = config.data.grid;
            const { ctx } = this;
            let w = width, h = height, cellθ = ( x, y ) => canvas.drawｰsqr ( x, y, ctx, w, h );
            if ( tiling !== square ) switch ( tiling ) {
                case hexagon:
                    w /= 3;
                    h /= 2;
                    cellθ = ( x, y ) => canvas.drawｰhex ( x, y, ctx, w, h );
                    break;
                case square:
                    cellθ = ( x, y ) => canvas.drawｰsqr ( x, y, ctx, w, h );
                    break;
                case triangle:
                    w /= 2;
                    cellθ = ( x, y ) => canvas.drawｰtri ( x, y, ctx, w, h );
                    break;
                default: throw TypeError ( `Invalid game tiling type: ${ tiling }` );
                }

            return { ctx, w, h, cellθ, stroke, visible };
            }
    drawｰcell ( x, y, color ) {
            const { ctx, cellθ, stroke, visible } = this.drawｰctx ();
            ctx.save ();
            ctx.fillStyle = color;
            ctx.strokeStyle = visible ? stroke : color;
            cellθ ( x, y );
            ctx.restore ();
            }
    draw ( state, color ) {
            const { ctx, cellθ, stroke, visible } = this.drawｰctx ();
            ctx.save ();
            ctx.fillStyle = color;
            ctx.strokeStyle = visible ? stroke : color;
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
                                        constructor ( game ) { super ( "zoom" ); this.game = game; }
                                        change () {
                                                document.documentElement.style.setProperty ( "--pattern-scale", this.game.grid.scale );
                                                this.game.resize ();
                                                }
                                        } ( this.game ),
                                    mode: new class extends input {
                                        constructor ( game ) { super ( "scaling-mode", config.data.grid.scaling, "mode" ); this.game = game; }
                                        change () { this.game.config.zoom.factor.change (); }
                                        } ( this.game ),
                                    step: new class extends slider {
                                        constructor ( game ) { super ( "scaling-step", config.data.grid.scaling, "step" ); this.game = game; }
                                        change () { this.game.config.zoom.factor.change (); }
                                        } ( this.game ),
                                    shift: new class extends slider {
                                        constructor () { super ( "scaling-shift", config.data.zoom, "shift" ); this.game = game; }
                                        change () { this.game.config.zoom.factor.change (); }
                                        } ( this.game ),
                                    };
                                // ==| Colors |================================================================
                                this.colors = {
                                    grid: new class extends input {
                                        constructor ( game ) { super ( "grid-color", config.data.grid, "color" ); this.game = game; }
                                        change () { if ( this.game.grid.visible ) this.game.grid.show (); }
                                        } ( this.game ),
                                    live: new class extends input {
                                        constructor ( game ) { super ( "live-color", config.data.grid, "live" ); this.game = game; }
                                        change () { this.game.redraw (); }
                                        } ( this.game ),
                                    trail: new class extends input {
                                        constructor ( game ) { super ( "trail-color", config.data.trail, "color" ); this.game = game; }
                                        change () {
                                                document.documentElement.style.setProperty ( "--trail-color", this.value );
                                                if ( this.game.trail.visible ) this.game.trail.show ();
                                                }
                                        } ( this.game ),
                                    alpha: new class extends slider {
                                        constructor ( game ) { super ( "alpha", config.data.trail, "alpha" ); this.game = game; }
                                        change () { this.game.redraw ( this.game.state ); }
                                        } ( this.game ),
                                    };
                                this.effects = {
                                    top: new class extends input {
                                        constructor ( game ) { super ( "top-effect", config.data.geometry, "top" ); this.game = game; }
                                        change () { state.resetｰcache (); }
                                        } ( this.game ),
                                    right: new class extends input {
                                        constructor () { super ( "right-effect", config.data.geometry, "right" ); this.game = game; }
                                        change () { state.resetｰcache (); }
                                        } ( this.game ),
                                    bottom: new class extends input {
                                        constructor () { super ( "bottom-effect", config.data.geometry, "bottom" ); this.game = game; }
                                        change () { state.resetｰcache (); }
                                        } ( this.game ),
                                    left: new class extends input {
                                        constructor () { super ( "left-effect", config.data.geometry, "left" ); this.game = game; }
                                        change () { state.resetｰcache (); }
                                        } ( this.game )
                                    };
                                this.neighborhood = {
                                    vicinity: new class extends input {
                                        constructor ( game ) {
                                                super ( "neighborhood", config.data.rules.neighborhood, "vicinity" );
                                                this.game = game;
                                                }
                                        change () {
                                                this.game.config.resize ();
                                                this.game.redraw ();
                                                }
                                        } ( this.game ),
                                    range: new class extends slider {
                                        constructor ( game ) {
                                                super ( "range", config.data.rules.neighborhood, "range" );
                                                this.game = game;
                                                if ( config.data.geometry.maxr !== +this.elem.max ) {
                                                    config.data.geometry.maxr = +this.elem.max;
                                                    config.store ();
                                                    }
                                                }
                                        change ( value ) {
                                                document.documentElement.style.setProperty ( "--neighborhood-range", value );
                                                game.config.resize ();
                                                game.redraw ();
                                                }
                                        } ( this.game )
                                    };
                                this.rules = {
                                    born: new class extends inputｰnumberｰlist {
                                        constructor ( game ) { super ( "born", config.data.rules, "born" ); this.game = game; }
                                        } ( this.game ),
                                    mutate: void 0,
                                    survive: new class extends inputｰnumberｰlist {
                                        constructor ( game ) { super ( "survive", config.data.rules, "survive" ); this.game = game; }
                                        } ( this.game )
                                    };
                                this.canvas = new canvas ( "neighborhood-canvas", "neighborhood-svg", game );
                                }
                        press ( event ) {
                                super.press ( event );
                                this.settings.style.visibility = "visible";
                                this.resize ();
                                }
                        redraw () {
                                const { canvas } = this;
                                const { range, tiling, vicinity } = state;
                                const { live } = config.data.grid;
                                const trail = config.data.trail.color;
                                const center = [ range + 1, ( range + 1 ) * ( tiling === triangle ? 2 : 1 ) ];
                                canvas.clear ();
                                canvas.drawｰcell ( ...center, live );
                                neighborhoods [ vicinity ] [ tiling ] ( range, ( x, y ) => canvas.drawｰcell ( x, y, trail ), ...center );
                                }
                        resize () {
                                const { range } = config.data.rules.neighborhood; // neighborhood range
                                const { height, scale, tiling, width } = this.game.grid;
                                const h = 2 * range + 3; // number of cells per column in the neighborhood canvas
                                const w = square === tiling ? h : div2 ( h ); // number of cells per row
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
                                    case hexagon: w += 2 * this.width / 3; break;
                                    case square: break;
                                    case triangle: if ( ᒪｘᒧ ( 2 * ᒪｘᒧ ( w ) / this.width ) !== ᒪｘᒧ ( 2 * w / this.width ) ) w += this.width / 2; break;
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
                        reset () {
                                this.steps = 0;
                                this.ticks = 0;
                                this.start = performance.now ();
                                }
                        press ( /* event */ ) {
                                // toggle play state and button label
                                if ( this.playing ) {
                                    window.cancelAnimationFrame ( this.playing );
                                    this.playing = null;
                                    this.elem.value = "play_arrow";
                                    }
                                else {
                                    this.reset ();
                                    const step = timestamp => {
                                            const elapsed = timestamp - this.start;
                                            const speed = 2 ** ( config.data.speed.maxs - config.data.speed.value );
                                            if ( this.ticks++ % speed === 0 ) {
                                                this.game.comments.innerHTML = `
                                                    ${ ( elapsed / 1000 ).toPrecision ( 3 ) } s elapsed (${ this.steps++ } steps)<br />
                                                    ${ ᒪｘᒧ ( elapsed / this.steps ) } ms per step`;
                                                this.game.redraw ( this.game.state.nextｰstate );
                                                }

                                            this.playing = window.requestAnimationFrame ( step );
                                            };
                                    this.playing = window.requestAnimationFrame ( step );
                                    this.elem.value = "pause";
                                    }
                                }
                        } ( this )
                    },
                // ==| Clear |=================================================================
                clear: {
                    value: new class extends button {
                        constructor ( game ) { super ( "clear" ); this.game = game; this.randomize = true; }
                        press () {
                                if ( ( this.randomize = ! this.randomize ) === true ) {
                                    this.game.state.randomize ();
                                    this.elem.title = "clear";
                                    this.elem.value = "stop";
                                    }
                                else {
                                    this.game.state.clear ();
                                    this.elem.title = "randomize";
                                    this.elem.value = "shuffle";
                                    }
                                this.game.redraw ();
                                }
                        } ( this )
                    },
                // ==| Speed |=================================================================
                speed: {
                    value: new class extends slider {
                        constructor ( game ) {
                                super ( "speed" ); this.game = game;
                                if ( config.data.speed.maxs !== +this.elem.max ) {
                                    config.data.speed.maxs = +this.elem.max;
                                    config.store ();
                                    }
                                }
                        change () { this.game.play.reset (); }
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
            this.comments = footer.add ( "comments" );
            this.comments.innerHTML = "approximative hexagonal and triangular coordinates:<br />click leftmost / topmost vertex to toggle";
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
                case hexagon:
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
                case square:
                    // this is the nominal case
                    return [ i, j ];
                case triangle:
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
            state.resetｰcache ();
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
    get height () { return ᒪｘᒧ ( ( this.tiling === triangle ? 2 : 1 ) * this.canvas.height / this.grid.height ); }
    get width () { return ᒪｘᒧ ( ( this.tiling === square ? 1 : 2 ) * this.canvas.width / this.grid.width ); }
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
            game.grid.visible = config.data.grid.visible;
            game.trail.visible = config.data.trail.visible;
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

            game.config.rules.born.display ( config.data.rules.born );
            game.config.rules.survive.display ( config.data.rules.survive );

            game.state.randomize ();

            // setting tiling type and zoom forces resizing, thus redrawing
            game.grid.tiling = config.data.grid.tiling;
            game.config.zoom.factor.value = config.data.zoom.value;
            }
    get config () { return config; }

    log ( ...args ) { log ( ...args ); }
    }

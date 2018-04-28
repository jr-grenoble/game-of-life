/*
 * MVC model for eternal life game
 *
 * The model records the current state of the game, as well as past state.
 * It can export and import such states.
 * It allows to go to the next state and reports the new state as a delta.
 * It can import a delta state and merge it with the current state.
 *
 * It accepts different sets of rules and it can transition to new rules on the fly.
 *
 */

// usual shortcuts and helper functions

// eslint-disable-next-line no-bitwise
const rem2 = n => n & 1; // Euclidian division by 2 remainder
const rem3 = n => ( n % 3 + 3 ) % 3; // Euclidian division by 3 remainder
// eslint-disable-next-line no-bitwise
const div2 = n => n >> 1; // Euclidian division by 2 quotient

// const log = ( ...args ) => console.log ( ...args ); // eslint-disable-line no-console
// const ᒪxᒧ = x => Math.floor ( parseInt ( x, 10 ) ); // eslint-disable-line no-restricted-properties
// const assignꔛ = Object.assign; // eslint-disable-line no-restricted-properties
// const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
// const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
// const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties

// ==| Configuration |=========================================================
import eternalｰconfig from "./eternalｰconfig.js";

// enumerated constants (e.g. drop, top, hexagon, square, moore, vonｰneumann…)
const { effects, tiles, surroundings } = eternalｰconfig;

// config and log come from the view via the controller
let log;

// current settings come attached to state via nextｰstate
let
    born,       // set of number of neighbors it takes for a dead cell to turn alive
    bottom,     // effect that happens at bottom edge
    height,     // actual height of the board (max y)
    index,      // index function (bound to state)
    left,       // effect that happens at left edge
    maxh,       // max height of the board (max max y)
    maxw,       // max width of the board (max max x)
    range,      // "radius" of neighborhood (if distance ≤ range, it is in the neighborhood)
    right,      // effect that happens at right edge
    survive,    // set of number of neighbors it takes for a live cell to stay alive
    tiling,     // type of tiling (hexagona, square…)
    top,        // effect that happens at top edge
    vicinity,   // type of neighborhood, Moore or Von Neumann
    width;      // actual width of the board (max x)

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
const neighborhood = {
    moore: {
        hexagon: ( state, x, y ) => {
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
                for ( let i = 1; i <= range; i++ ) for ( let j = 0; j <= range; j++ ) {
                    precinct.push ( index ( x + i - j, y + div2 ( i + j ) ) );
                    precinct.push ( index ( x - i, y - j + div2 ( i ) ) );
                    precinct.push ( index ( x + j, y - i + div2 ( j ) ) );
                    }
                return precinct;
                },
        square: ( state, x, y ) => {
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
        triangle: ( state, x, y ) => {
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
                const gridￚᗒｰxy = ( i, j ) => [ 3 * i + ( i + j ) % 2, j ];
                const xyￚᗒｰgrid = ( x, y ) => [ ( x - rem3 ( x ) ) / 3, y ];
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
        hexagon: ( state, x, y ) => neighborhood [ surroundings.moore ] [ tiles.hexagon ] ( state, x, y ),
        square: ( state, x, y ) => {
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
        triangle: ( state, x, y ) => x - y
        }
    };


export default class eternalｰmodel {
    constructor ( logger ) {
            log = logger;
            log ( "model initialized" );
            }
    static nextｰstate ( state, newｰstate ) {
            // first, retrieve global settings from state
            ( {
                vicinity, range, born, survive, tiling,
                maxh, maxw, height, width,
                bottom, left, right, top
                } = state );
            index = state.index.bind ( state );
            const neighbors = neighborhood [ vicinity ] [ tiling ];
            const popｰcount = neighborhood => neighborhood.map ( i => state.liveʔ̣ ( i ) ).reduce ( ( i, j ) => i + j );
            // we first handle inner part of the board, i.e. not exposed to edge effects
            const [ xmin, xmax ] = [ range, state.width - range ];
            const [ ymin, ymax ] = tiling === tiles.triangle ? [ 2 * range, state.height - 2 * range ] : [ range, state.height - range ];
            for (
                let x = xmin;
                x < xmax;
                x++
                ) for (
                    let y = ymin;
                    y < ymax;
                    y++
                    ) {
                    const index = index ( x, y );
                    const pop = popｰcount ( neighbors ( state, x, y ) );
                    if ( ! state.liveʔ̣ ( index ) && born.include ( pop ) ) newｰstate.breed ( index );
                    if ( ! survive.include ( pop ) ) newｰstate.kill ( index );
                    }
            // then we handle the border special cases
            return newｰstate;
            }
    }

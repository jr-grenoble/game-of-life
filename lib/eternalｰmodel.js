// ==| MODEL |=================================================================
//  * MVC model for eternal life game
//  *
//  * The model records the current state of the game, as well as new state.
//  * It can export and import such states.
//  * It allows to go to the next state and reports the new state as a delta.
//  * It can import a delta state and merge it with the current state.
//  *
//  * It accepts different sets of rules; it can run new rules on the fly.

// ==| Geometric considerations |==============================================
//
// Grid coordinates start in (0,0) with either a full hexagon with its
// top side horizontal, or a square with its top side horizontal, or an
// equilateral triangle with its left side vertical. For hexagonal and
// triangular tiles, this creates a parity phenomenon that we must take
// into account in computations below.
// (we use strings instead of comments so that this is more prominent)
//
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
    ｜╱…｜…╲｜…    These rules apply based on the parity of the square coordinates. For identical parity (both odd or both even),
    ｜╲ ｜ ╱｜2    the rule described for 0,0 applies. For opposite parities, the rule described for 1,2 applies.
    ｜…╲｜╱…｜…
    `;
// ============================================================================

// ==| Configuration |=========================================================

// We import enumerations from the eternalｰconfig
import eternalｰconfig from "./eternalｰconfig.js";
const { effects, tiles, surroundings, key } = eternalｰconfig;
const { bottom, left, right, top } = effects; // these are the effects we know about in this module
const { square, triangle } = tiles; // these are the tessalations we have to know about in this module

// We also import common utilities
const { coordｰutilities, functionalｰutilities, generalｰutilities, mathｰutilities } = eternalｰconfig;
// And here is what we use from these utilities
const { pairꘌʔ̣, pairｰᗒindex: hash, shiftｰpair } = coordｰutilities;
const { pipeǃ } = functionalｰutilities;
const { definedʔ̣, freezeꔛ, freezeｰtoｰcoreꔛ, valuesǃ } = generalｰutilities;
const { ထ, evenʔ̣, div2, rem2, div3, rem3, randomǃ } = mathｰutilities;

// ==| Globals |===============================================================
// We are in a module ⇒ we can use globals safely to avoid parameter passing.

// These globals are either initialized once by the model constructor,
// or they are re-initialized when the geometry changes.

const config = {}; // this contains configuration data shared with the view

// User modifiable configuration parameters:
//  • board dimensions (0 ≤ x < width, 0 ≤ y < height):
let height = 0;
let width = 0;
//  • board tesselation (cf. tiles above):
let tiling = square;
//  • rules, i.e. array of values corresponding to:
let born = [];       // number of neighbors to turn a dead cell alive
let mutate = [];     // number of neighbors to allow for a mutation
let survive = [];    // number of neighbors to keep a live cell alive
let probability = 0; // mutation probability
//  • type of neighborhood:
let range = 1;      // distance from cell where to count neighbors
let vicinity;   // distance type (Moore or Von Neumann)
//  • how board sides are attached to each other
let bottomｰflank, leftｰflank, rightｰflank, topｰflank;


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
// The _vicinity_ functions return arrays of coordinate pairs corresponding to
// the computed neighborhood or a point (x,y).
//  Λ
// /!\  These functions can return coordinates outside of the board !
// ￣    Depending on neighborhood rules (effects),
// one needs to map such coordinates to real indexes.
//
// This is what the _flank_ functions do. For a given flank, it maps
// out of board coordinates to other sides.
//
// Then, all of this information is stored in the neighborhood _cache_:
// for each valid board cell, the cache contains the list of neighbors to that cell.
// The cache also keeps track of the meaningful configuration parameters used
// to compute such neighborhood.
// When configuration changes, comparison with these cached parameters allows for
// minimal recomputing.

const neighborhood = { // why use a class, we only have a singleton object here

    vicinities: { // functions returning arrays of coordinate pairs for vicinity of (x,y)

        moore: { // in the Moore vicinity, cells that share a vertex are adjacent

            hexagon ( x, y ) {
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

                    const zone = [];

                    const δ = evenʔ̣ ( x ) ? n => div2 ( n ) : n => div2 ( n ) + rem2 ( n );

                    for ( let i = 1; i <= range; i++ ) for ( let j = 0; j <= range; j++ ) {
                        zone.push ( [ x + i - j, y + δ ( i + j ) ] );
                        zone.push ( [ x - i, y - j + δ ( i ) ] );
                        zone.push ( [ x + j, y - i + δ ( j ) ] );
                        }

                    return zone;
                    },

            square ( x, y ) {
                    /*
                     * ▫︎(x,y,i,j) allows to cover a quarter of the vicinity of ◾︎ (x,y):
                     * i →
                     * j ◾︎▫︎▫︎▫︎     then, we simply rotate the pattern clockwise
                     * ↓  ▫︎▫︎▫︎     to cover all 4 quadrants
                     *    ▫︎▫︎▫︎
                     *    ▫︎▫︎▫︎
                     */
                    const zone = [];

                    for ( let i = 1; i <= range; i++ ) for ( let j = 0; j <= range; j++ ) {
                        zone.push ( [ x + i, y + j ] );
                        zone.push ( [ x - j, y + i ] );
                        zone.push ( [ x - i, y - j ] );
                        zone.push ( [ x + j, y - i ] );
                        }

                    return zone;
                    },

            triangle ( x, y ) {
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
                     * We have the relationship: σ = ρ√3. Our affine coordinates use ρ as the x unit and σ as the y unit,
                     * hence we call these units ρσ.
                     */

                    // s (sign) is either 1 if x and y have the same parity or -1 otherwise
                    const s = 1 - 2 * rem2 ( x + y );

                    // Convert from grid coordinates to ρσ and back:
                    const gridￚᗒρσ = ( i, j ) => [ 3 * i + rem2 ( i + j ) * s, j ];
                    const ρσￚᗒgrid = ( x, y ) => [ div3 ( x - rem3 ( x ) * s ), y ];
                    // Rotate (in ρσ coordinates) by ±120º (i.e. ± 2π/3 ):
                    const rotｰ2πː3 = ( x, y ) => [ ( 3 * y - x ) / 2, -( x + y ) / 2 ];
                    const rotⵜ2πː3 = ( x, y ) => [ -( 3 * y + x ) / 2, ( x - y ) / 2 ];
                    // Combine coordinate conversion and rotations:
                    const gridￚᗒrotｰ2πː3ￚᗒgrid = ( i, j ) => ρσￚᗒgrid ( ...rotｰ2πː3 ( ...gridￚᗒρσ ( i, j ) ) );
                    const gridￚᗒrotⵜ2πː3ￚᗒgrid = ( i, j ) => ρσￚᗒgrid ( ...rotⵜ2πː3 ( ...gridￚᗒρσ ( i, j ) ) );

                    // Here, x and y are the parameters of the enclosing triangle function
                    const shiftｰindex = ( i, j ) => shiftｰpair ( x, y ) ( [ i, j ] );
                    const [ ⵜￜￚ, imin, imax ] = ( x + y ) % 2 === 0 ? [ x => x, 0, range ] : [ x => -x, -range, 0 ];

                    const zone = [];

                    for ( let i = imin; i <= imax; i++ ) for ( let j = 1 - ⵜￜￚ ( i ); j <= 2 * range - ⵜￜￚ ( i ); j++ ) {
                        zone.push ( shiftｰindex ( i, j ) );
                        zone.push ( shiftｰindex ( ...gridￚᗒrotｰ2πː3ￚᗒgrid ( i, j ) ) );
                        zone.push ( shiftｰindex ( ...gridￚᗒrotⵜ2πː3ￚᗒgrid ( i, j ) ) );
                        }

                    return zone;
                    }

            },

        vonｰneumann: { // in the Von Neumann vicinity, only cells that share a full edge are adjacent

            // there's no difference between the Moore and Von Neumann neighborhood for hexagonal tiling:
            hexagon ( x, y ) { return neighborhood.vicinities.vicinity.moore.hexagon ( x, y ); },

            square ( x, y ) {
                    /*
                     * ▫︎(x,y,i,j) allows to cover a quarter of the vicinity of ◾︎ (x,y):
                     * i →
                     * j ◾︎▫︎▫︎▫︎     then, we simply rotate the pattern clockwise
                     * ↓  ▫︎▫︎      to cover all 4 quadrants
                     *    ▫︎
                     */

                    const zone = [];

                    for ( let i = 1; i <= range; i++ ) for ( let j = range - i; j >= 0; j-- ) {
                        zone.push ( [ x + i, y + j ] );
                        zone.push ( [ x - j, y + i ] );
                        zone.push ( [ x - i, y - j ] );
                        zone.push ( [ x + j, y - i ] );
                        }

                    return zone;
                    },

            triangle ( x, y ) {
                    /*
                     * Our approach for Von Neumann triangles is different (just for fun).
                     *
                     * We start from a zone that is the center of the triangle and at each iteration we do 2 things:
                     *  • we add to our zone the triangles that flank the border of our previous iteration;
                     *  • we add the same flanking triangles to a bag that helps us keep track of the new border.
                     * The set of triangles that flank a given border triangle is easy to compute, however this set
                     * also includes triangles that were added in the previous round. To keep computation reasonably
                     * efficient, we do not add these to our border bag.
                     *
                     * We use plain objects as dictionaries, so that they behave as sets (no duplication);
                     * this requires that we hash triangle coordinates to have a unique key corresponding to a given
                     * pair of coordinates.
                     */

                    // The zone dictionary will contain coordinate pairs as values and the hash of these coordinates as keys:
                    const zone = {};
                    // Yield the array of triangles (identified by grid coordinates) that flank the one in (i,j)
                    const adjacentｰtriangles = ( [ i, j ] ) => [ [ i, j - 1 ], [ i, j + 1 ], [ evenʔ̣ ( i + j ) ? i - 1 : i + 1, j ] ];
                    // Add a coordinate pair to a dictionary only if it is not there already, and return true if added indeed
                    const add = ( list, pair ) => {
                            const h = hash ( pair );
                            if ( h in list ) return false;
                            list [ hash ( pair ) ] = [ ...pair ]; // ensure each list item is unique (vs. adding pair directly)
                            return true;
                            };

                    // To compute neighborhood, we use a bag of coordinates containing the latest additions to the zone.
                    // At each iteration, we only add adjacent cells to that bag into the zone (and into a fresh instance of bag).
                    // We start with the bag set to the central cell (that's our initial border).

                    for ( let bag = { [ hash ( [ x, y ] ) ]: [ x, y ] }, r = 1; r <= range; r++ ) {
                        const border = valuesǃ ( bag ); // get coordinates added at last round
                        bag = {}; // empty our bag before adding newly found adjacent coordinates
                        border.forEach ( pair => adjacentｰtriangles ( pair ).forEach ( pair => add ( zone, pair ) ? add ( bag, pair ) : void 0 ) );
                        }

                    delete zone [ hash ( [ x, y ] ) ]; // make sure the central cell is not included
                    return valuesǃ ( zone );
                    }

            },
        },

    flanks: { // functions mapping out of board coordinate pairs to legit coordinates on a mapped flank

        bottom: {
            drop: ( [ i, j ] ) => j >= height ? [ i, +ထ ] : [ i, j ], // disappear
            bottom: ( [ i, j ] ) => j >= height ? [ i, 2 * height - j - 1 ] : [ i, j ], // re-enter from bottom
            left: ( [ i, j ] ) => j >= height ? [ j - height, height - i - 1 ] : [ i, j ], // re-enter from left
            right: ( [ i, j ] ) => j >= height ? [ width + height - j - 1, i ] : [ i, j ], // re-enter from right
            top: ( [ i, j ] ) => j >= height ? [ i, j - height ] : [ i, j ] // flow through top
            },

        left: {
            drop: ( [ i, j ] ) => i < 0 ? [ -ထ, j ] : [ i, j ],
            bottom: ( [ i, j ] ) => i < 0 ? [ width - j - 1, width + i ] : [ i, j ],
            left: ( [ i, j ] ) => i < 0 ? [ -i - 1, j ] : [ i, j ],
            right: ( [ i, j ] ) => i < 0 ? [ width + i, j ] : [ i, j ],
            top: ( [ i, j ] ) => i < 0 ? [ j, -i - 1 ] : [ i, j ]
            },

        right: {
            drop: ( [ i, j ] ) => i >= width ? [ +ထ, j ] : [ i, j ],
            bottom: ( [ i, j ] ) => i >= width ? [ width - j - 1, width + height - i - 1 ] : [ i, j ],
            left: ( [ i, j ] ) => i >= width ? [ i - width, j ] : [ i, j ],
            right: ( [ i, j ] ) => i >= width ? [ 2 * width - i - 1, j ] : [ i, j ],
            top: ( [ i, j ] ) => i >= width ? [ j, i - width ] : [ i, j ]
            },

        top: {
            drop: ( [ i, j ] ) => j < 0 ? [ i, -ထ ] : [ i, j ],
            bottom: ( [ i, j ] ) => j < 0 ? [ i, height + j ] : [ i, j ],
            left: ( [ i, j ] ) => j < 0 ? [ -j - 1, height - i - 1 ] : [ i, j ],
            right: ( [ i, j ] ) => j < 0 ? [ width + j, i ] : [ i, j ],
            top: ( [ i, j ] ) => j < 0 ? [ i, -j - 1 ] : [ i, j ]
            },

        // Given a side, mapper produces the mapping function that maps coordinate pairs according to geometry specifications
        mapper: flank => [ bottom, left, right, top ].
            // find all sides that map to that flank:
            filter ( side => config.data.geometry [ side ] === flank ).
            // and create mapping function by piping each of the corresponding functions
            reduce ( ( accum, side ) => pipeǃ ( accum, neighborhood.flanks [ flank ] [ side ] ), pair => pair ),

        // Given a side, remap transforms out of bounds coordinates into legit coordinates in line with geometry specifications
        remap: side => coordinates => coordinates.reduce ( ( accum, coord ) => [ ...accum, neighborhood.flanks.mapper ( side ) ( coord ) ], [] ),

        },

    area () { // given the current range, tiling and vicinity, computes the area of the neighborhood excluding the central cell
            const cacheｰentry = neighborhood.cache.areas [ vicinity ] [ tiling ];
            if ( definedʔ̣ ( cacheｰentry [ range ] ) ) return cacheｰentry [ range ];
            return ( cacheｰentry [ range ] = neighborhood.vicinities [ vicinity ] [ tiling ] ( 0, 0 ).length );
            },

    cache: { // cached configuration and neighbors map
        areas: {
            // cache for the area function
            moore: {
                hexagon: [ 0 ],
                square: [ 0 ],
                triangle: [ 0 ]
                },
            vonｰneumann: {
                hexagon: [ 0 ],
                square: [ 0 ],
                triangle: [ 0 ]
                }
            },

        config: { // cached configuration, used to determine what to recompute
            // dimensions:
            height: undefined,
            width: undefined,
            // flanks:
            bottomｰflank: undefined,
            leftｰflank: undefined,
            rightｰflank: undefined,
            topｰflank: undefined,
            // neighborhood:
            range: undefined,
            tiling: undefined,
            vicinity: undefined,
            },

        // cached neighborhood: array of neighbor indexes for each board cell (also identified by its index)
        neighbors: {}, // contains key:value pairs where key is the index of a board cell and value is an array of neighboring indexes

        // store the coordinates (mapped to an index) of the neighbors of (x, y) in cache
        store: ( x, y, coordinates ) => { neighborhood.cache.neighbors [ hash ( [ x, y ] ) ] = [ ...coordinates ].map ( hash ); }

        // end of cache
        },

    // Initialize neighborhood (allocate the cache array once we know dimensions) and prevent some tampering
    init () {
            // Allocate cache memory
            neighborhood.cache.neighbors = {};

            // Prevent tampering with exported parts of the object
            freezeｰtoｰcoreꔛ ( neighborhood.vicinities );
            freezeｰtoｰcoreꔛ ( neighborhood.flanks );
            freezeꔛ ( neighborhood );
            },

    // The cache neighborhood computation has large cyclomatic complexity but isn't that complex
    // eslint-disable-next-line complexity
    compute () { // (re-)compute cached neighborhood
            //
            // Our cached neighborhood maps the board. We distinguish 9 regions in it:
            //        0            xmin       → x →      xmax         width
            //        ╏╍╍╍ range ╍╍╍╏ width - 2 × range   ╏╍╍╍ range ╍╍╍╏
            //     0  ╔═════════════╤═════════════════════╤═════════════╗ ╍┳╍
            //        ║   top       │          top        │    top      ║  ╏
            //        ║   left      │         middle      │   right     ║ range
            //        ║  corner     │         border      │   corner    ║  ╏
            //        ╟─────────────┼─────────────────────┼─────────────╢ ╍┻╍ ymin
            //        ║             │                     │             ║
            //     ↓  ║   middle    │                     │   middle    ║ height
            //     y  ║    left     │         center      │   right     ║   -
            //     ↓  ║   border    │                     │   border    ║  2 ×
            //        ║             │                     │             ║ range
            //        ║             │                     │             ║
            //        ╟─────────────┼─────────────────────┼─────────────╢ ╍┳╍ ymax
            //        ║  bottom     │         bottom      │   bottom    ║  ╏
            //        ║   left      │         middle      │   right     ║ range
            //        ║  corner     │         border      │   corner    ║  ╏
            // height ╚═════════════╧═════════════════════╧═════════════╝ ╍┻╍
            //
            // If neighborhood rules are changed, we must recompute everything in the cache;
            // i.e. if any of range, tiling or vicinity is changed.
            // However, if none of these is changed, but dimensions are changed (width of height)
            // we can focus our computation on the bottom and right side.
            // And if only flank mapping is changed, we can deal only with borders.
            //

            // Shortcut names:
            const { cache, flanks, vicinities } = neighborhood;
            const prevｰconfig = cache.config;
            const { remap } = flanks;

            // See above diagram for explanations; for triangular tiling, refer to the top of this file.
            const [ xmin, xmax ] = [ range, width - range ];
            const [ ymin, ymax ] = tiling === triangle ? [ 2 * range, height - 2 * range ] : [ range, height - range ];

            // Zone returns the array of neighbors (coordinate pairs) around a cell:
            const zone = vicinities [ vicinity ] [ tiling ];

            switch ( true ) { // we use a switch statement to start computation where needed (disguised goto)
                case // if neighborhood has changed, we must recompute everything
                    prevｰconfig.range !== range		||
                    prevｰconfig.tiling !== tiling	||
                    prevｰconfig.vicinity !== vicinity:

                    // just handle the central part, falling through will do the rest:
                    for ( let x = xmin; x < xmax; x++ ) for ( let y = ymin; y < ymax; y++ ) cache.store ( x, y, zone ( x, y ) );

                    // fall through to handle dimension and mapping changes (if dimensions haven't changed, for loops exit immediately)
                case // if height and/or width have changed, we extend the center (shrinking is taken care of in the next case)
                    prevｰconfig.height !== height	||
                    prevｰconfig.width !== width:

                    // just handle the part of the bottom right that intersects with the center, falling through will do the rest:
                    for ( // handle bottom part; this does something only if the new border is further down from the old one
                        let oldymax = tiling === triangle ?
                                prevｰconfig.height - 2 * prevｰconfig.range :
                                prevｰconfig.height - prevｰconfig.range,
                            x = xmin;
                        x < xmax;
                        x++
                        ) for ( let y = oldymax; y < ymax; y++ ) cache.store ( x, y, zone ( x, y ) );

                    for ( // handle right part; this does something only if the new border is to the right of the old one
                        let oldxmax = prevｰconfig.width - prevｰconfig.range,
                            y = ymin;
                        y < ymax;
                        y++
                        ) for ( let x = oldxmax; x < xmax; x++ ) cache.store ( x, y, zone ( x, y ) );

                    // fall through to handle flank mapping changes (always needed when dimensions change)
                case // if flank mapping functions have changed, we fix borders and corners
                    prevｰconfig.bottomｰflank !== bottomｰflank	||
                    prevｰconfig.leftｰflank !== leftｰflank		||
                    prevｰconfig.rightｰflank !== rightｰflank		||
                    prevｰconfig.topｰflank !== topｰflank:

                    // let's handle the left border first, including top and bottom corners:
                    for ( let x = 0; x < xmin; x++ ) {
                        // let's handle the top left corner
                        for ( let y = 0; y < ymin; y++ ) cache.store ( x, y, remap ( left ) ( remap ( top ) ( zone ( x, y ) ) ) );
                        // then let's do the left border except corners
                        for ( let y = ymin; y < ymax; y++ ) cache.store ( x, y, remap ( left ) ( zone ( x, y ) ) );
                        // and let's do the bottom left corner
                        for ( let y = ymax; y < height; y++ ) cache.store ( x, y, remap ( left ) ( remap ( bottom ) ( zone ( x, y ) ) ) );
                        }

                    // let's now handle the middle top and bottom borders:
                    for ( let x = xmin; x < xmax; x++ ) {
                        // first, let's handle the top central border:
                        for ( let y = 0; y < ymin; y++ ) cache.store ( x, y, remap ( top ) ( zone ( x, y ) ) );
                        // then, let's handle the bottom central border:
                        for ( let y = ymax; y < height; y++ ) cache.store ( x, y, remap ( bottom ) ( zone ( x, y ) ) );
                        }

                    // finally we handle the right border special cases, including corners
                    for ( let x = xmax; x < width; x++ ) {
                        // let's handle the top right corner
                        for ( let y = 0; y < ymin; y++ ) cache.store ( x, y, remap ( right ) ( remap ( top ) ( zone ( x, y ) ) ) );
                        // then let's do the right border except corners
                        for ( let y = ymin; y < ymax; y++ ) cache.store ( x, y, remap ( right ) ( zone ( x, y ) ) );
                        // and let's do the bottom right corner
                        for ( let y = ymax; y < height; y++ ) cache.store ( x, y, remap ( right ) ( remap ( bottom ) ( zone ( x, y ) ) ) );
                        }

                    // fall through
                default: // in all cases, cache the new configuration

                    cache.config = { height, width, bottomｰflank, leftｰflank, rightｰflank, topｰflank, range, tiling, vicinity };
                }
            // End of compute ()
            }
    // End of neighborhood
    };

// ==| Game state |============================================================
// Apart from a couple helper functions, state manipulation is handled by
// the burst function.
//
// When burst gets called, it saves the current state as elders state,
// then is crawls the whole elders board, getting neighborhood cells via the
// neighborhood cache and counting live neighbors in each cell neighborhood.
// It then apply game rules to map each elder cell into adult cells.
//
// While doing so, it also records created and deleted cell positions in
// specific sets (babies and stiffs) so that the view can focus on these
// and avoid redrawing the whole board.

const state = { // why use a class? we only have a singleton object here
    elders: {}, // former state vector, replaced when bursting
    adults: {}, // current state vector, computed by burst
    babies: {}, // newly born cells, only valid after a call to burst or shake
    stiffs: {}, // newly deceased cells, only valid after a call to burst or shake

    // Initialize both state vectors to 0 (all dead)
    init () { state.elders = {}; state.adults = {}; },

    // Save current state in elders state AND reinitialize babies and stiffs to empty lists
    save () { state.elders = state.adults; state.adults = {}; state.babies = {}; state.stiffs = {}; },

    // Manually insert a single cell into the current state, we don't save state just for that
    breed ( x, y ) {
            const index = hash ( [ x, y ] );
            state.babies [ index ] = state.adults [ index ] = [ x, y ];
            delete state.stiffs [ index ];
            },

    // Set the current state to all dead cells
    clear () { state.save (); },

    // Manually remove a single cell from the current state, we don't save state just for that
    choke  ( x, y ) {
            const index = hash ( [ x, y ] );
            delete state.adults [ index ];
            delete state.babies [ index ];
            state.stiffs [ index ] = [ x, y ];
            },

    // Move to next state, applying rules for birth and death
    burst () {
            state.save ();
            for (
                let { elders, adults, babies, stiffs } = state,
                    x = 0;
                x < width;
                x++
                ) for ( let y = 0; y < height; y++ ) {
                    const index = hash ( [ x, y ] );
                    // Compute number of neighbors around cell [ x, y ]
                    const neighborsⵌ = neighborhood.cache.neighbors [ index ].
                        filter ( i => elders [ i ] ).
                        length;
                    // And apply rules
                    if ( elders [ index ] ) survive.includes ( neighborsⵌ ) ?
                        adults [ index ] = [ x, y ] :
                        stiffs [ index ] = [ x, y ];
                    else born.includes ( neighborsⵌ ) ?
                        babies [ index ] = adults [ index ] = [ x, y ] :
                        void 0;
                    // Then, apply random mutation if warranted
                    if ( mutate.includes ( neighborsⵌ ) && randomǃ () < probability ) adults [ index ] ?
                        ( delete babies [ index ], delete adults [ index ], stiffs [ index ] = [ x, y ] ) :
                        ( delete stiffs [ index ], babies [ index ] = adults [ index ] = [ x, y ] );
                    }
            },

    // Fill current state with random values
    shake () {
            state.save ();

            for (
                let { elders, adults, babies } = state,
                    x = 0;
                x < width;
                x++
                ) for ( let y = 0; y < height; y++ ) {
                    const index = hash ( [ x, y ] );
                    // Give an equal chance of birth or death to each cell
                    if ( Math.random () < 0.5 ) {
                        adults [ index ] = [ x, y ];
                        if ( ! elders [ index ] ) babies [ index ] = [ x, y ];
                        }
                    }
            },

    // End of state object
    };


export default class eternalｰmodel { // we use a class to protect it from change
    // The MVC controller initializes the model with the current configuration

    constructor ( liveｰconfig ) {
            // In an ideal world, configuration mapping would be performed by the controller.
            // Here we share configuration structure directly with the view.
            config.data = liveｰconfig.data;

            // Make sure our state and neighborhood allocate their data structures.
            neighborhood.init ();
            state.init ();

            // And finally we can initialize the rest of the configuration data.
            this.channel = liveｰconfig.listen ( eternalｰmodel.reconfig );
            eternalｰmodel.reconfig ();
            }

    // When there's a change in configuration, the controller tells the model to reload it and recompute neighborhood
    static reconfig () {
            ( { height, width } = config.data.geometry );
            ( { bottom: bottomｰflank, left: leftｰflank, right: rightｰflank, top: topｰflank } = config.data.geometry );
            ( { tiling } = config.data.grid );
            ( { born, mutate, survive, probability } = config.data.rules );
            ( { range } = config.data.rules.neighborhood );
            vicinity = key ( surroundings, config.data.rules.neighborhood.vicinity );
            probability = 10 ** -probability;
            neighborhood.compute ();
            }

    // And here are the methods we are willing to export, all static and unobstrusive
    // First, state manipulation functions:
    //  • Test for a cell being alive, doesn't check whether x and y are valid.
    static aliveʔ̣ ( x, y ) { const cell = state.adults [ hash ( [ x, y ] ) ]; return cell && pairꘌʔ̣ ( cell, [ x, y ] ); }
    //  • Turn a cell alive, doesn't check whether x and y are valid.
    static breedǃ ( x, y ) { state.breed ( x, y ); }
    //  • Turn a cell dead, doesn't check whether x and y are valid.
    static chokeǃ ( x, y ) { state.choke ( x, y ); }
    //  • Clear the whole board
    static clearǃ () { state.clear (); }
    //  • Compute next state for the whole board,
    //    then apply burry ( x, y ) to each dead cell and nurse ( x, y ) to each newborn cell, in that order.
    //    Each function (burry, nurse) has property functions setup and close to bracket their call.
    static cycleǃ ( burry, nurse, raise = nurse ) {
            state.burst ();
            sweepǃ ( burry, nurse, raise );
            }
    //  • Randomize the whole board
    static shakeǃ () { state.shake (); }
    //  • Sweep through the whole board without changing state
    static sweepǃ ( burry, nurse, raise = nurse ) {
            const apply = care => population => {
                    care.setup ();
                    for ( const cell in population ) care ( ...population [ cell ] );
                    care.close ();
                    };
            apply ( raise ) ( state.adults );
            apply ( burry ) ( state.stiffs );
            apply ( nurse ) ( state.babies );
            nurse.close ();
            }

    // Second, neighborhood functions; we can safely return references within the neighborhood object,
    // as these are frozen.
    static get vicinities () { return neighborhood.vicinities; }
    static get flanks () { return neighborhood.flanks; }
    static area () { return neighborhood.area (); }
    }
const { sweepǃ } = eternalｰmodel;

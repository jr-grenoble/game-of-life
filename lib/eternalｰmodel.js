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

// We only import enumerations from the eternalｰconfig
import eternalｰconfig from "./eternalｰconfig.js";
const { effects, tiles, surroundings, key } = eternalｰconfig;
const { bottom, left, right, top } = effects; // these are the effects we know about in this module
const { hexagon, square, triangle } = tiles; // these are the tessalations we know about in this module
const { moore, vonｰneumann } = surroundings; // these are the distance types we know about in this module

// ==| Globals |===============================================================
// We are in a module ⇒ we can use globals safely to avoid parameter passing.

// These globals are either initialized once by the model constructor,
// or they are re-initialized when the geometry changes.

const config = {}; // this contains configuration data shared with the view

// Fixed configuration parameters (hard coded in HTML):
let maxr; // maximum neighborhood range, set at init time
let maxh; // maximum board height, set at init time
let maxw; // maximum board width, set at init time

// User modifiable configuration parameters:
//  • board dimensions (0 ≤ x < width, 0 ≤ y < height):
let height, width;
//  • board tesselation (cf. tiles above):
let tiling;
//  • rules, i.e. array of values corresponding to:
let born,       // number of neighbors to turn a dead cell alive
    survive;    // number of neighbors to keep a live cell alive
//  • type of neighborhood:
let range,      // distance from cell where to count neighbors
    vicinity;   // distance type (Moore or Von Neumann)
//  • how board sides are attached to each other
let bottomｰflank, leftｰflank, rightｰflank, topｰflank;


// ==| Utilities |=============================================================
// We place functions and constants within an object, to allow for folding.

const mathｰutilities = { // Mathematical constants and functions

    // MATH infinity - always use +ထ and -ထ
    // eslint-disable-next-line no-restricted-syntax
    ထ: Infinity,

    // MATH integer part of x
    // eslint-disable-next-line no-restricted-properties
    ᒪｘᒧ: x => Math.floor ( x ),

    // MATH minimum of a list of numbers
    // eslint-disable-next-line no-restricted-properties
    ᒷᐧᒲ: ( ...args ) => Math.min ( ...args ),

    // MATH maximum of a list of numbers
    // eslint-disable-next-line no-restricted-properties
    ᒯᐧᒬ: ( ...args ) => Math.max ( ...args ),

    // MATH clamp function, shaves x within [min,max]
    ᒥｘᒧ: ( x, min = 0, max = min + 1 ) => min < max ?
        ᒷᐧᒲ ( ᒯᐧᒬ ( x, min ), max ) :
        ᒷᐧᒲ ( ᒯᐧᒬ ( x, max ), min ),

    // MATH test for even
    // eslint-disable-next-line no-bitwise
    evenʔ̣: n => ( n & 1 ) === 0,

    // MATH test for odd
    // eslint-disable-next-line no-bitwise
    oddʔ̣: n => ( n & 1 ) !== 0,

    // MATH quotient of Euclidian division by 2
    // eslint-disable-next-line no-bitwise
    div2: n => n >> 1,

    // MATH remainder of Euclidian division by 2
    // eslint-disable-next-line no-bitwise
    rem2: n => n & 1,

    // MATH quotient of Euclidian division by 3
    div3: n => ( n - rem3 ( n ) ) / 3,

    // MATH remainder of Euclidian division by 3
    rem3: n => ( n % 3 + 3 ) % 3,

    // MATH quotient of Euclidian division by p
    div: p => n => ( n - rem ( p ) ( n ) ) / p,

    // MATH remainder of Euclidian division by p
    rem: p => n => ( n % p + p ) % p,

    // MATH euclidian division by p
    division: ( n, p ) => { const r = ( n % p + p ) % p; return [ ( n - r ) / p, r ]; }

    };

const coordｰutilities = { // Functions that manipulate coordinates

    // Turn x and y coordinates into a pair (array)
    pair: ( x, y ) => [ x, y ],

    // Turn an [x,y] coordinates pair into a unique hash index, suitable for sets
    pairｰᗒindex: ( [ x, y ] ) => x * maxh + y,

    // Unpack index into each coordinate separately
    indexｰᗒx: index => div ( maxh ) ( index ),
    indexｰᗒy: index => rem ( maxh ) ( index ),

    // Unpack index into a pair of coordinates
    indexｰᗒpair: index => division ( index, maxh ),

    // Shift a pair of coordinates by x and y
    shiftｰpair: ( x, y ) => ( [ i, j ] ) => [ x + i, y + j ],

    };

const generalｰutilities = { // Standard object manipulation functions

    // Compose functions, e.g. composeǃ ( e, f, g ) ( args ) is the same as g ( f ( e ( args ) ) )
    composeǃ: ( ...functions ) => args => functions.reduceRight ( ( arg, fn ) => fn ( arg ), args ),

    // Test whether an object is a function
    functionʔ̣: f => typeof f === "function",

    // Yield an array of the values contained in an object or array
    // eslint-disable-next-line no-restricted-properties
    valuesǃ: o => functionʔ̣ ( o.values ) ? [ ...o.values () ] : Object.values ( o ),

    };

// And here is what we use from these utilities
const { ထ, ᒷᐧᒲ, ᒯᐧᒬ, evenʔ̣, div2, rem2, div3, rem3, div, rem, division } = mathｰutilities;
const { pairｰᗒindex, shiftｰpair } = coordｰutilities;
const { composeǃ, functionʔ̣, valuesǃ } = generalｰutilities;


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

const neighborhood = {

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
            hexagon ( x, y ) { return neighborhood.vicinity.moore.hexagon ( x, y ); },

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

                    // Here's our hash function, used to create unique object keys for a pair of coordinates:
                    const hash = pair => pairｰᗒindex ( ...pair );
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
            },

        // Given a side, mapper produces the mapping function that maps coordinate pairs according to geometry specifications
        mapper: flank => [ bottom, left, right, top ].
            filter ( side => config.data.geometry [ side ] === flank ).
            reduce ( ( accum, side ) => composeǃ ( accum, neighborhood.flanks [ flank ] [ side ] ), neighborhood.flanks [ flank ].drop ),

        // Given a side, remap transforms out of bounds coordinates into legit coordinates in line with geometry specifications
        remap: side => coordinates => coordinates.reduce ( ( accum, coord ) => [ ...accum, neighborhood.flanks.mapper ( side ) ( coord ) ], [] ),

        },

    cache: { // cached configuration and neighbors map
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

        // cached neighborhood: array of neighbors for each board cell
        neighbors: null, // this is initialized at init time

        // store the coordinates (mapped to an index) of the neighbors of (x, y) in cache
        store: ( x, y, coordinates ) => { neighborhood.cache.neighbors [ pairｰᗒindex ( [ x, y ] ) ] = [ ...coordinates ].map ( pairｰᗒindex ); }
        },

    // eslint-disable-next-line complexity
    compute () { // (re-)compute cached neighborhood
            /*
             * Our cached neighborhood maps the board. We distinguish 9 regions in it:
             *        0            xmin       → x →      xmax         width
             *        ╏╍╍╍ range ╍╍╍╏ width - 2 × range   ╏╍╍╍ range ╍╍╍╏
             *     0  ╔═════════════╤═════════════════════╤═════════════╗ ╍┳╍
             *        ║   top       │          top        │    top      ║  ╏
             *        ║   left      │         middle      │   right     ║ range
             *        ║  corner     │         border      │   corner    ║  ╏
             *        ╟─────────────┼─────────────────────┼─────────────╢ ╍┻╍ ymin
             *        ║             │                     │             ║
             *     ↓  ║   middle    │                     │   middle    ║ height
             *     y  ║    left     │         center      │   right     ║   -
             *     ↓  ║   border    │                     │   border    ║  2 ×
             *        ║             │                     │             ║ range
             *        ║             │                     │             ║
             *        ╟─────────────┼─────────────────────┼─────────────╢ ╍┳╍ ymax
             *        ║  bottom     │         bottom      │   bottom    ║  ╏
             *        ║   left      │         middle      │   right     ║ range
             *        ║  corner     │         border      │   corner    ║  ╏
             * height ╚═════════════╧═════════════════════╧═════════════╝ ╍┻╍
             *
             * If neighborhood rules are changed, we must recompute everything in the cache;
             * i.e. if any of range, tiling or vicinity is changed.
             * However, if none of these is changed, but dimensions are changed (width of height)
             * we can focus our computation on the bottom and right side.
             * And if only flank mapping is changed, we can deal only with borders.
             *
             */

            // Shortcut names:
            const { cache, flanks, vicinities } = neighborhood;
            const { remap } = flanks;

            // See above diagram for explanations; for triangular tiling, refer to the top of this file.
            const [ xmin, xmax ] = [ range, width - range ];
            const [ ymin, ymax ] = tiling === triangle ? [ 2 * range, height - 2 * range ] : [ range, height - range ];

            // Zone returns the array of neighbors (coordinate pairs) around a cell:
            const zone = vicinities [ vicinity ] [ tiling ];

            switch ( true ) {
                case // if neighborhood has changed, we must recompute it all
                    cache.range !== range		||
                    cache.tiling !== tiling		||
                    cache.vicinity !== vicinity:

                    // just handle the central part, falling through will do the rest:
                    for ( let x = xmin; x < xmax; x++ ) for ( let y = ymin; y < ymax; y++ ) cache.store ( x, y, zone ( x, y ) );

                    // fall through
                case // if height and/or width have changed but neighborhood is the same, just extend or shrink
                    cache.height !== height		||
                    cache.width !== width:

                    // just handle the part of the bottom right that intersects with the center, falling through will do the rest:
                    for ( // handle bottom part
                        let oldymax = tiling === triangle ? cache.height - 2 * cache.range : cache.height - cache.range,
                            x = xmin;
                        x < xmax;
                        x++
                        ) for ( let y = oldymax; y < ymax; y++ ) cache.store ( x, y, zone ( x, y ) );

                    for ( // handle right part
                        let oldxmax = cache.width - cache.range,
                            y = ymin;
                        y < ymax;
                        y++
                        ) for ( let x = oldxmax; x < xmax; x++ ) cache.store ( x, y, zone ( x, y ) );

                    // fall through
                case // if only flank mapping functions have changed, we can focus on the borders and corners
                    cache.bottomｰflank !== bottomｰflank	||
                    cache.leftｰflank !== leftｰflank		||
                    cache.rightｰflank !== rightｰflank	||
                    cache.topｰflank !== topｰflank:

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
            }

    };


export default class eternalｰmodel {
    // The MVC controller initializes the model with the current configuration

    constructor ( liveｰconfig ) {
            // In an ideal world, configuration mapping would be performed by the controller.
            // Here we share configuration structure directly with the view.
            config.data = liveｰconfig.data;

            // Here we unpack configuration data that cannot change while running.
            ( { maxr, maxh, maxw } = config.data.geometry );
            neighborhood.cache.neighbors = new Array ( maxw * maxh );

            // And we initialize the rest of the configuration data.
            this.reconfig ();
            }

    // When there's a change in configuration, the controller tells the model to reload it and recompute neighborhoods

    reconfig () {
            ( { height, width } = config.data.geometry );
            ( { bottom: bottomｰflank, left: leftｰflank, right: rightｰflank, top: topｰflank } = config.data.geometry );
            ( { tiling } = config.data.grid );
            ( { born, survive } = config.data.rules );
            ( { range } = config.data.rules.neighborhood );
            vicinity = key ( surroundings, config.data.rules.neighborhood.vicinity );

            neighborhood.compute ();
            }
    }

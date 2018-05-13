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

// ==| Globals |===============================================================
// We are in a module ⇒ we can use globals safely to avoid parameter passing.

// These globals are either initialized once by the view constructor,
// or they are re-initialized by the controller.


let reconfig = () => void 0; // This callback function must be called each time the configuration changes
let neighborhoods = {};
let mappings = {}; void mappings;
let aliveʔ̣ = ( x, y ) => void x * y;
let breedǃ = ( x, y ) => void x * y;
let chokeǃ = ( x, y ) => void x * y;
let clearǃ = () => void 0;
let cycleǃ = ( burry, nurse ) => void burry + nurse;
let shakeǃ = () => void 0;

// ==| Private data and functions |============================================
// These objects are defined outside of the module main class,
// so that they cannot be accessed by external users
// ============================================================================

// Usual shortcuts (replicated as needed in all modules)
const ᒪｘᒧ = x => Math.floor ( parseInt ( x, 10 ) ); // eslint-disable-line no-restricted-properties
const ᒷᐧᒲ = ( ...args ) => Math.min ( ...args ); // eslint-disable-line no-restricted-properties
const ᒯᐧᒬ = ( ...args ) => Math.max ( ...args ); // eslint-disable-line no-restricted-properties
const ᒥｘᒧ = ( x, min = 0, max = min + 1 ) => min < max ? ᒷᐧᒲ ( ᒯᐧᒬ ( x, min ), max ) : ᒷᐧᒲ ( ᒯᐧᒬ ( x, max ), min );

const evenʔ̣ = n => ( n & 1 ) === 0; // eslint-disable-line no-bitwise
// const oddʔ̣ = n => ( n & 1 ) !== 0; // eslint-disable-line no-bitwise
// eslint-disable-next-line no-bitwise
const div2 = n => n >> 1; // Quotient of Euclidian division by 2

const ㄱnumberʔ̣ = n => Number.isNaN ( n ); // eslint-disable-line no-restricted-properties
const arrayʔ̣ = Array.isArray; // eslint-disable-line no-restricted-properties
// const assignꔛ = Object.assign; // eslint-disable-line no-restricted-properties
const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
// const keysǃ = o => o.keys ? [ ...o.keys () ] : Object.keys ( o ); // eslint-disable-line no-restricted-properties
const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties


function virtualⵢ () { throw TypeError ( "Invalid call to virtual function!" ); }

// ==| Configuration |=========================================================

import eternalｰconfig from "./eternalｰconfig.js";

const { effects, tiles, surroundings, key } = eternalｰconfig;
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
    // draw ( state, color ) {
    //         const { ctx, cellθ, stroke, visible } = this.drawｰctx ();
    //         ctx.save ();
    //         ctx.fillStyle = color;
    //         ctx.strokeStyle = visible ? stroke : color;
    //         for (
    //             let x = 0;
    //             x < state.width;
    //             x++
    //             ) for (
    //                 let y = 0;
    //                 y < state.height;
    //                 y++
    //                 ) if (
    //                     aliveʔ̣ ( x, y )
    //                     ) cellθ ( x, y );
    //         ctx.restore ();
    //         }
    draw ( color ) {
            const { ctx, cellθ, stroke, visible } = this.drawｰctx ();
            const draw = cellθ;
            draw.setup = () => { ctx.save (); ctx.fillStyle = color; ctx.strokeStyle = visible ? stroke : color; };
            draw.close = () => ctx.restore ();
            return draw;
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
                                        change () { this.game.redraw ( true ); }
                                        } ( this.game ),
                                    };
                                this.effects = {
                                    top: new class extends input {
                                        constructor ( game ) { super ( "top-effect", config.data.geometry, "top" ); this.game = game; }
                                        change () { reconfig (); }
                                        } ( this.game ),
                                    right: new class extends input {
                                        constructor () { super ( "right-effect", config.data.geometry, "right" ); this.game = game; }
                                        change () { reconfig (); }
                                        } ( this.game ),
                                    bottom: new class extends input {
                                        constructor () { super ( "bottom-effect", config.data.geometry, "bottom" ); this.game = game; }
                                        change () { reconfig (); }
                                        } ( this.game ),
                                    left: new class extends input {
                                        constructor () { super ( "left-effect", config.data.geometry, "left" ); this.game = game; }
                                        change () { reconfig (); }
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
                                const { range } = config.data.rules.neighborhood;
                                const vicinity = key ( surroundings, config.data.rules.neighborhood.vicinity );
                                const { live, tiling } = config.data.grid;
                                const trail = config.data.trail.color;
                                const center = [ range + 1, ( range + 1 ) * ( tiling === triangle ? 2 : 1 ) ];
                                canvas.clear ();
                                canvas.drawｰcell ( ...center, live );
                                neighborhoods [ vicinity ] [ tiling ] ( center ).map ( ( [ x, y ] ) => canvas.drawｰcell ( x, y, trail ) );
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
                                                this.game.redraw ( false );
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
                                    shakeǃ ();
                                    this.elem.title = "clear";
                                    this.elem.value = "stop";
                                    }
                                else {
                                    clearǃ ();
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
                                this.game.redraw ( false );
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
            const color = aliveʔ̣ ( x, y ) ?
                ( chokeǃ ( x, y ), config.data.trail.color ) :
                ( breedǃ ( x, y ), config.data.grid.live );
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
            reconfig ();
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
    redraw () {
            // handle trail first if it is visible
            // write previous canvas picture with greater alpha
            if ( config.data.trail.visible ) this.canvas.alpha = config.data.trail.alpha;
            else this.canvas.clear ();
            // overwrite current state cells with trail colors and paint (new) state cells in live colors
            cycleǃ ( this.canvas.draw ( config.data.trail.color ), this.canvas.draw ( config.data.grid.live ) );
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

            // setting tiling type and zoom forces resizing, thus redrawing
            // game.grid.tiling = config.data.grid.tiling;
            game.config.zoom.factor.value = config.data.zoom.value;
            }
    // Allow configuration to be passed to other modules
    get config () { return config; }
    // Register callback to be called whenever configuration changes
    set config ( callback ) { reconfig = callback; }

    // Import neighborhood computation functions into the view:
    set vicinities ( vicinities ) { neighborhoods = vicinities; }
    set flanks ( flanks ) { mappings = flanks; }

    // Import state manipulation functions into the view:
    set state ( functions ) { ( { aliveʔ̣, breedǃ, chokeǃ, clearǃ, cycleǃ, shakeǃ } = functions ); }

    log ( ...args ) { log ( ...args ); }
    }

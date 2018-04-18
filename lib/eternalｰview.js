/*
 * MVC view for the eternal life game
 * The view has primitives to display state on a canvas.
 * It also keeps track of external events and user input.
 * It processes locally some user actions such as displaying or hiding the grid.
 */

// ==| Private data and functions |============================================
// These objects are defined outside of the module main class,
// so that they cannot be accessed by external users
// ============================================================================

// usual shortcuts

// const log = ( ...args ) => console.log ( ...args ); // eslint-disable-line no-console
const ᒪｘᒧ = x => Math.floor ( parseInt ( x, 10 ) ); // eslint-disable-line no-restricted-properties
const ᒷᐧᒲ = ( ...args ) => Math.min ( ...args ); // eslint-disable-line no-restricted-properties
const ᒯᐧᒬ = ( ...args ) => Math.max ( ...args ); // eslint-disable-line no-restricted-properties
const ᒥｘᒧ = ( x, min = 0, max = min + 1 ) => min < max ? ᒷᐧᒲ ( ᒯᐧᒬ ( x, min ), max ) : ᒷᐧᒲ ( ᒯᐧᒬ ( x, max ), min );
const ㄱnumberʔ̣ = n => Number.isNaN ( n ); // eslint-disable-line no-restricted-properties
const assignꔛ = Object.assign; // eslint-disable-line no-restricted-properties
const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
// const keysǃ = o => o.keys ? [ ...o.keys () ] : Object.keys ( o ); // eslint-disable-line no-restricted-properties
const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties

function virtualⵢ () { throw TypeError ( "Invalid call to virtual function!" ); }

// ==| Configuration |=========================================================

import eternalｰconfig from "./eternalｰconfig.js";

const effects = freezeꔛ ( { drop: "drop", top: "top", right: "right", bottom: "bottom", left: "left" } );
const tiles = freezeꔛ ( { hexagon: "hexagon", square: "square", triangle: "triangle" } );

const defaults = {
    geometry: {
        width: null,
        height: null,
        top: effects.top, /* bounces */
        right: effects.left, /* reappears on left */
        bottom: effects.bottom, /* bounces */
        left: effects.right, /* reappears on right */
        },
    grid: { visible: true, color: "#e0e0e0", tiling: tiles.square, scaling: { mode: "linear", step: .1 } },
    rules: { neighbourhood: { mode: "Moore", range: 1 }, born: [ 3 ], survive: [ 2, 3 ] },
    speed: { value: 0 },
    trail: { visible: true, color: "#bfffbf" }, // most recent color, gradient goes to white
    zoom: { value: 0, shift: 2 },
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
            }
    dblclick ( event ) { virtualⵢ ( event ); }
    click ( event ) { virtualⵢ ( event ); }
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
    constructor ( name, svg ) { // this.ctx is readonly, non configurable and non enumerable
            super ( name );
            // ==| Underlying grid |=======================================================
            this.svg = new elements ( svg );
            // ==| Context |===============================================================
            this.ctx = this.elem.getContext ( "2d" );
            // ==| Image |=================================================================
            this.image = this.ctx.createImageData ( this.width, this.height );
            this.pos = this.elem.getBoundingClientRect ();
            freezeꔛ ( this );
            }
    get height () { return this.svg.elem.height.baseVal.value; }
    set height ( height ) { this.svg.elem.setAttribute ( "height", `${ this.elem.height = height }px` ); }
    get width () { return this.svg.elem.width.baseVal.value; }
    set width ( width ) { this.svg.elem.setAttribute ( "width", `${ this.elem.width = width }px` ); }
    get rgba () { assignꔛ ( this.image, this.ctx.getImageData ( 0, 0, this.width, this.height ) ); return this.image.data; }
    set rgba ( data ) { this.ctx.putImageData ( data, 0, 0 ); }
    }

class input extends elements { // input elements call change when their value changes
    constructor ( name, configｰdata = config.data [ name ], configｰname = "value" ) {
            super ( name );
            this.configｰdata = configｰdata;
            this.configｰname = configｰname;
            this.elem.addEventListener ( "change", event => { this.value = event.target.value; }, { passive: true } );
            }
    get value () { const s = this.elem.value, n = +s; return ㄱnumberʔ̣ ( n ) ? s : n; }
    set value ( value ) {
            value = ㄱnumberʔ̣ ( +value ) ? value : +value;
            // we must set config.data….value first, before calling virtual change !
            this.elem.value = this.configｰdata [ this.configｰname ] = value;
            config.store ();
            this.change ( value );
            }
    change ( value ) { virtualⵢ ( value ); }
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
    get state () { return this.elem.checked; }
    set state ( state ) {
            this.elem.checked = state;
            if ( this.state ) this.change ();
            }
    change () { virtualⵢ (); }
    }

class slider extends input { // slider elements do the same as regular input but they also display value in an adjacent field
    constructor ( name, configｰdata = config.data [ name ], configｰname = "value" ) {
            super ( name, configｰdata, configｰname );
            this.valueｰlabel = document.getElementById ( `${ name }-value` );
            }
    set value ( value ) {
            this.valueｰlabel.innerHTML = `${ value }`;
            super.value = value;
            }
    }

class toggle extends elements { // checkbox elements call `hide` when unchecked and `show` when checked
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "click", event => { this.visible = event.target.checked; }, { passive: true } );
            }
    get visible () { return config.data [ this.name ].visible; }
    set visible ( state ) {
            // we must set config.data….visible first, before calling virtual hide or show !
            this.elem.checked = config.data [ this.name ].visible = state;
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
                    value: new canvas ( "canvas", "svg" )
                    },
                // ==| Config dialog |=========================================================
                config: {
                    value: new class extends modalｰbutton {
                        constructor ( game ) {
                                super ( "config" );
                                this.settings = document.getElementById ( "settings" );
                                this.zoom = {
                                    mode: new class extends input {
                                        constructor () { super ( "scaling-mode", config.data.grid.scaling, "mode" ); }
                                        change () { game.zoom.change (); }
                                        },
                                    step: new class extends slider {
                                        constructor () { super ( "scaling-step", config.data.grid.scaling, "step" ); }
                                        change () { game.zoom.change (); }
                                        },
                                    shift: new class extends slider {
                                        constructor () { super ( "scaling-shift", config.data.zoom, "shift" ); }
                                        change () { game.zoom.change (); }
                                        },
                                    };
                                this.colors = {
                                    grid: new class extends input {
                                        constructor () { super ( "grid-color", config.data.grid, "color" ); }
                                        change () { if ( game.grid.visible ) game.grid.show (); }
                                        },
                                    trail: new class extends input {
                                        constructor () { super ( "trail-color", config.data.trail, "color" ); }
                                        change () {
                                                document.documentElement.style.setProperty ( "--trail-color", this.value );
                                                if ( game.trail.visible ) game.trail.show ();
                                                }
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
                                }
                        press ( event ) {
                                super.press ( event );
                                this.zoom.mode.value = config.data.grid.scaling.mode;
                                this.zoom.step.value = config.data.grid.scaling.step;
                                this.zoom.shift.value = config.data.zoom.shift;
                                this.colors.grid.value = config.data.grid.color;
                                this.colors.trail.value = config.data.trail.color;
                                this.settings.style.visibility = "visible";
                                }
                        } ( this )
                    },
                // ==| Rules dialog |==========================================================
                rules: {
                    value: new class extends modalｰbutton {
                        constructor ( game ) {
                                super ( "rules" );
                                this.canvas = new canvas ( "neighbourhood-canvas", "neighbourhood-svg" );
                                this.game = game;
                                this.rules = document.getElementById ( "life-rules" );
                                this.neighbourhood = {
                                    mode: new class extends input {
                                        constructor () {
                                                super ( "neighbourhood", config.data.rules.neighbourhood, "mode" );
                                                }
                                        change () {
                                                game.rules.redraw ();
                                                game.redraw ();
                                                }
                                        },
                                    range: new class extends slider {
                                        constructor () { super ( "range", config.data.rules.neighbourhood, "range" ); }
                                        change ( value ) {
                                                document.documentElement.style.setProperty ( "--neighbourhood-range", value );
                                                game.rules.redraw ();
                                                game.redraw ();
                                                }
                                        }
                                    };
                                }
                        press ( event ) {
                                super.press ( event );
                                this.neighbourhood.mode.value = config.data.rules.neighbourhood.mode;
                                this.neighbourhood.range.value = config.data.rules.neighbourhood.range;
                                this.redraw ();
                                this.rules.style.visibility = "visible";
                                }
                        redraw () {
                                const { ctx, height } = this.canvas;
                                ctx.clearRect ( 0, 0, 100, 100 );
                                const { grid } = this.game;
                                const { scale } = grid;
                                const p = height / 100 / scale; // pen width
                                const r = config.data.rules.neighbourhood.range;
                                const s = 2 * r + 2; // max index of squares per row in neighbourhood grid
                                const q = 100 / ( s + 1 ); // square side
                                ctx.fillStyle = "#fff"; // white
                                for ( let i = 0; i < s; i++ ) { // paint white cells around square edge
                                    ctx.fillRect ( i * q + p, p, q - p, q - p );
                                    ctx.fillRect ( i * q + p, s * q + p, q - p, q - 2 * p );
                                    ctx.fillRect ( p, i * q + p, q - p, q - p );
                                    ctx.fillRect ( s * q + p, i * q + p, q - 2 * p, q - p );
                                    }
                                ctx.fillRect ( s * q + p, s * q + p, q - 2 * p, q - 2 * p );
                                if ( config.data.rules.neighbourhood.mode !== "Von Neumann" ) return;
                                for ( let j = 1; j <= r; j++ ) for ( let i = 1 + r - j; i > 0; i-- ) {
                                    // paint white cells where Manhattan distance exceeds r
                                    ctx.fillRect ( i * q + p, j * q + p, q - p, q - p );
                                    ctx.fillRect ( ( s - i ) * q + p, j * q + p, q - p, q - p );
                                    ctx.fillRect ( i * q + p, ( s - j ) * q + p, q - p, q - p );
                                    ctx.fillRect ( ( s - i ) * q + p, ( s - j ) * q + p, q - p, q - p );
                                    }
                                }
                        } ( this )
                    },
                // ==| Grid |==================================================================
                grid: {
                    value: new class extends toggle {
                        constructor () {
                                super ( "grid" );
                                // ==| Tiling |================================================================
                                this.tilingｰbuttons = {};
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
                        hide () { this.paint ( "transparent" ); }
                        show () { this.paint ( config.data.grid.color ); }
                        paint ( color ) { /* a valid CSS color, such as transparent or #e0e0e0 */
                                document.documentElement.style.setProperty ( "--pattern-color", color );
                                }
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
                                game.resize ();
                                }
                        zoom () {
                                document.documentElement.style.setProperty ( "--pattern-scale", this.scale );
                                }
                        }
                    },
                // ==| Trail |=================================================================
                trail: {
                    value: new class extends toggle {
                        constructor () { super ( "trail" ); }
                        hide () { log ( "`hiding the real trail`" ); }
                        show () { log ( "`showing the real trail`" ); }
                        }
                    },
                // ==| Speed |=================================================================
                speed: {
                    value: new class extends slider {
                        constructor () { super ( "speed" ); }
                        change () { log ( `sliding speed to ${ config.data.speed.value }` ); }
                        }
                    },
                // ==| Zoom |==================================================================
                zoom: {
                    value: new class extends slider {
                        constructor () { super ( "zoom" ); }
                        change () {
                                log ( `zoom: ${ config.data.zoom.value }, cell size: ${ game.grid.width }×${ game.grid.height }px, scale: ${ game.grid.scale }` );
                                game.grid.zoom ();
                                game.resize ();
                                }
                        }
                    }
                }
                );
            // We might be tempted to fold resizing into the grid.
            // However, resizing affects more than the grid: the whole game must be recomputed.
            this.ⴵ = { move: null, resize: null }; // timers for mouse move and resize throttling
            window.addEventListener ( "resize", event => this.resize ( event ), { passive: true } );
            this.resize ();
            // ==| Mouse coordinates |=====================================================
            this.coordinates = footer.add ( "coordinates" );
            this.coordinates.style.fontSize = "larger";
            this.coordinates.innerHTML = "";
            }
    // ==| Mouse events |===========================================================
    pos ( event ) {
            const w = this.width;
            const h = this.height;
            return {
                x: ᒥｘᒧ ( ᒪｘᒧ ( w * ( event.clientX - this.canvas.pos.left ) / this.canvas.width ), 0, w - 1 ),
                y: ᒥｘᒧ ( ᒪｘᒧ ( h * ( event.clientY - this.canvas.pos.top ) / this.canvas.height ), 0, h - 1 )
                };
            }
    click ( event ) {
            const { x, y } = this.pos ( event );
            log ( `sglclick — x: ${ x }, y: ${ y }` );
            }
    dblclick ( event ) {
            log ( `dblclick — x: ${ event.clientX - this.canvas.pos.left }, y: ${ event.clientY - this.canvas.pos.top }` );
            }
    move ( event ) {
            if ( this.ⴵ.move ) return; // mouse move timer is running, let's wait till it pops
            // ok, timer has popped, let's reset another one
            this.ⴵ.move = setTimeout ( () => {
                    this.ⴵ.move = null;
                    // const coordinates = footer.div ( "coordinates" );
                    const { x, y } = this.pos ( event );
                    this.coordinates.innerHTML = `<i class="material-icons">my_location</i> <sup>${ x },${ y }</sup><br />`;
                    this.coordinates.innerHTML += `<i class="material-icons">crop_free</i> <sup>${ this.width }, ${ this.height }</sup>`;
                    }, 66 );
            }
    resize ( /* event */ ) {
            if ( this.ⴵ.resize ) return; // resize timer is running, let's wait till it pops
            this.ⴵ.resize = setTimeout ( () => {
                    this.ⴵ.resize = null;
                    const ᒪｘꓹｓᒧ = ( x, s ) => ᒪｘᒧ ( x / s ) * s; // flooring x to nearest multiple of s lower than x
                    const { canvas } = this;
                    // force the canvas to a small size to let CSS flex box resize other elements first
                    canvas.height = 1; canvas.width = 1;
                    // now get the dimensions of the enclosing fieldset, and compute canvas size based on these
                    const cs = window.getComputedStyle ( this.elem, null );
                    let h = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.height ) - ᒪｘᒧ ( cs.paddingTop ) - ᒪｘᒧ ( cs.paddingBottom ) - ᒪｘᒧ ( cs.marginTop ) - ᒪｘᒧ ( cs.marginBottom ), this.grid.height );
                    let w = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.width ) - ᒪｘᒧ ( cs.paddingLeft ) - ᒪｘᒧ ( cs.paddingRight ), this.grid.width );
                    h += 1 / this.grid.scale;
                    w += 1 / this.grid.scale;
                    switch ( this.grid.tiling ) {
                        case tiles.hexagon: w += 2 * this.grid.width / 3; break;
                        case tiles.square: break;
                        case tiles.triangle: if ( ᒪｘᒧ ( 2 * ᒪｘᒧ ( w ) / this.grid.width ) !== ᒪｘᒧ ( 2 * w / this.grid.width ) ) w += this.grid.width / 2; break;
                        default: throw TypeError ( `Invalid game tiling type: ${ this.tiling }` );
                        }
                    log ( `resizing canvas to ${ w }×${ h } pixels` );
                    setTimeout ( () => { // defer real resizing/redrawing of the canvas after the CSS flex box has redrawn boundaries
                            canvas.width = w;
                            canvas.height = h;
                            // fake mouse movement to force display of coordinates.
                            this.move ( { clientX: this.canvas.pos.left, clientY: this.canvas.pos.top } );
                            this.redraw ();
                            }, 0 );
                    }, 100 );
            }
    // ==| Accessors |==============================================================
    get tiling () { return this.grid.tiling; }
    // return height and width as a number of cells:
    get height () { return ᒪｘᒧ ( ( this.tiling === tiles.triangle ? 2 : 1 ) * this.canvas.height / this.grid.height ); }
    get width () { return ᒪｘᒧ ( ( this.tiling === tiles.square ? 1 : 2 ) * this.canvas.width / this.grid.width ); }
    // ==| Low level cell coloring |===============================================
    // EXPERIMENTAL !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // This will probably be replaced by plenty other functions
    color ( x, y, color ) {
            // RIDICULOOUS ! this should not be done on a cell by cell basis: all these values are common.
            const { ctx } = this.canvas;
            const { height, scale, width } = this.grid;
            ctx.fillStyle = color;
            switch ( this.tiling ) {
                case tiles.hexagon: return this.hexagonｰcolor ( ctx, x, y, width / 3, height / 2, .5 / scale );
                case tiles.square: return this.squareｰcolor ( ctx, x, y, width, height, 1 / scale );
                case tiles.triangle: return this.triangleｰcolor ( ctx, x, y, width / 2, height, .5 / scale );
                default: throw TypeError ( `Invalid game tiling type: ${ this.tiling }` );
                }
            }
    hexagonｰcolor ( ctx, x, y, w, h, pw ) {
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
    squareｰcolor ( ctx, x, y, w, h, pw ) {
            // compute where top-left corner is and draw from there
            ctx.fillRect ( x * w + pw, y * h + pw, w - pw, h - pw );
            }
    triangleｰcolor ( ctx, x, y, w, h, pw ) {
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
    // END OF EXPERIMENTAL ZONE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    redraw () {
            const { ctx } = this.canvas;
            ctx.strokeStyle = "#000000";
            ctx.clearRect ( 0, 0, this.width, this.height );
            ctx.fillStyle = "#ffffff";
            // ctx.fillRect ( 1, 1, 100, 100 );
            ctx.fillStyle = "#c8000080";
            ctx.fillRect ( 10, 20, 90, 80 );
            ctx.fillStyle = "#8000c880";
            ctx.fillRect ( 30, 50, 50, 50 );
            ctx.fillStyle = "#ffffff";
            ctx.fillRect ( 50, 50, 11, 11 );
            ctx.fillRect ( 51, 64, 9, 9 );
            ctx.fillRect ( 52, 76, 7, 7 );
            ctx.fillRect ( 53, 86, 5, 5 );
            ctx.fillRect ( 54, 95, 3, 3 );
            ctx.fillRect ( 55, 99, 1, 1 );
            this.color ( 0, 0, "#54321040" );
            this.color ( 1, 0, "#54321050" );
            this.color ( 0, 1, "#54321060" );
            this.color ( 12, 13, "#54321040" );
            this.color ( 13, 13, "#54321050" );
            this.color ( 13, 14, "#54321060" );
            this.color ( this.width - 1, this.height - 1, "#54321070" );
            this.color ( this.width - 1, -1, "#54321070" );
            this.color ( this.width - 1, this.height - 2, "#54321080" );
            this.color ( this.width - 2, this.height - 1, "#54321090" );
            this.color ( this.width - 2, -1, "#54321090" );
            this.color ( this.width - 2, this.height - 2, "#543210a0" );
            }
    };

export default class eternalｰview {
    /**
     * The eternalｰview is data-less. It operates on singleton objects (game, config, defaults…).
     * Hence, multiple instances present no issue (they share prototype anyway).
     */
    constructor () {
            game.grid.tiling = config.data.grid.tiling;
            game.grid.visible = config.data.grid.visible;
            game.trail.visible = config.data.trail.visible;
            game.speed.value = config.data.speed.value;
            game.zoom.value = config.data.zoom.value;
            game.rules.neighbourhood.range.value = config.data.rules.neighbourhood.range;
            game.rules.neighbourhood.mode.value = config.data.rules.neighbourhood.mode;

            /* UPDATE ALL OTHER CONFIG VALUES !!!!! */
            }
    get config () { return config; }
    get gridʔ̣ () { return game.grid.visible; }
    get trailʔ̣ () { return game.trail.visible; }
    get width () { return game.width; }
    get height () { return game.height; }

    log ( ...args ) { log ( ...args ); }
    }

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

const log = ( ...args ) => console.log ( ...args ); // eslint-disable-line no-console
const ᒪｘᒧ = x => Math.floor ( parseInt ( x, 10 ) ); // eslint-disable-line no-restricted-properties
const assignꔛ = Object.assign; // eslint-disable-line no-restricted-properties
const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
// const keysǃ = o => o.keys ? [ ...o.keys () ] : Object.keys ( o ); // eslint-disable-line no-restricted-properties
const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties

function virtualⵢ () { throw TypeError ( "Invalid call to virtual function!" ); }

// ==| Configuration |=========================================================

import eternalｰconfig from "./eternalｰconfig.js";

const defaults = {
    grid: { visible: true, color: "#e0e0e0", type: "square", scaling: { mode: "linear", step: .1 } },
    speed: { value: 0 },
    trail: { visible: true, color: "#800080" }, // most recent color, gradient goes to white
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

class board extends elements {
    constructor ( name ) {
            super ( name );
            // double click must be declared before click so that it can be trapped. It generates a click too.
            this.elem.addEventListener ( "dblclick", event => this.dblclick ( event ), { passive: true } );
            this.elem.addEventListener ( "click", event => this.click ( event ), { passive: true } );
            }
    dblclick ( event ) { virtualⵢ ( event ); }
    click ( event ) { virtualⵢ ( event ); }
    }

class button extends elements {
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "click", event => this.press ( event ), { passive: true } );
            }
    press ( event ) { virtualⵢ ( event ); }
    }

class radioｰbutton extends elements {
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "change", event => { this.state = event.target.checked; }, { passive: true } );
            }
    get state () { return this.elem.checked; }
    set state ( state ) {
            this.elem.checked = state;
            if ( this.state ) this.select ();
            }
    select () { virtualⵢ (); }
    }

class slider extends elements {
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "change", event => { this.value = event.target.value; }, { passive: true } );
            }
    get value () { return this.elem.value; }
    set value ( value ) {
            // we must set config.data….value first, before calling virtual slide !
            this.elem.value = config.data [ this.name ].value = value;
            config.store ();
            this.slide ();
            }
    slide () { virtualⵢ (); }
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
                    value: new class extends elements {
                        constructor () { // this.ctx is readonly, non configurable and non enumerable
                                super ( "canvas" );
                                // ==| Underlying grid |=======================================================
                                this.svg = new elements ( "svg" );
                                // ==| Context |===============================================================
                                this.ctx = this.elem.getContext ( "2d" );
                                // ==| Image |=================================================================
                                this.image = this.ctx.createImageData ( this.width, this.height );
                                this.pos = this.elem.getBoundingClientRect ();
                                freezeꔛ ( this );
                                }
                        // get height () { return this.elem.height; }
                        get height () { return this.svg.elem.height.baseVal.value; }
                        set height ( height ) { this.svg.elem.setAttribute ( "height", `${ this.elem.height = height }px` ); }
                        get width () { return this.svg.elem.width.baseVal.value; }
                        // get width () { return this.elem.width; }
                        set width ( width ) { this.svg.elem.setAttribute ( "width", `${ this.elem.width = width }px` ); }
                        get rgba () { assignꔛ ( this.image, this.ctx.getImageData ( 0, 0, this.width, this.height ) ); return this.image.data; }
                        set rgba ( data ) { this.ctx.putImageData ( data, 0, 0 ); }
                        }
                    },
                // ==| Grid |==================================================================
                grid: {
                    value: new class extends toggle {
                        constructor () {
                                super ( "grid" );
                                // ==| Tiling |================================================================
                                this.types = {};
                                const tiling = document.querySelectorAll ( "input[name='tiling']" );
                                tiling.forEach (
                                    option => {
                                            const name = option.value;
                                            // ==| Tile radio buttons |====================================================
                                            this.types [ name ] = new class extends radioｰbutton {
                                                constructor ( grid ) {
                                                        super ( name );
                                                        this.grid = grid;
                                                        const p = this.pattern = document.getElementById ( `${ name }-pattern` );
                                                        this.baseｰheight = p.height.baseVal.value;
                                                        this.baseｰwidth = p.width.baseVal.value;
                                                        }
                                                select () { this.grid.type = name; } // Uh ho … danger !
                                                } ( this );
                                            this.types [ name ].elem.checked = name === config.data.grid.type;
                                            }
                                    );
                                freezeꔛ ( this );
                                }
                        hide () { this.paint ( "transparent" ); }
                        show () { this.paint ( config.data.grid.color ); }
                        paint ( color ) { /* a valid CSS color, such as transparent or #e0e0e0 */
                                document.documentElement.style.setProperty ( "--pattern-color", color );
                                }
                        get height () { return this.types [ this.type ].baseｰheight * this.scale; }
                        get width () { return this.types [ this.type ].baseｰwidth * this.scale; }
                        get scale () {
                                const sc = config.data.grid.scaling;
                                const zm = +config.data.zoom.value + +config.data.zoom.shift;
                                switch ( sc.mode ) {
                                    case "linear": return 1 + zm * sc.step;
                                    case "geometric": return sc.step ** zm;
                                    default: throw TypeError ( `Invalid scaling mode: ${ sc.mode }` );
                                    }
                                }
                        // ==| Type |==================================================================
                        get type () { return config.data.grid.type; }
                        set type ( type ) {
                                document.documentElement.style.setProperty ( "--grid-fill", `url(#${ type }-pattern)` );
                                config.data.grid.type = type;
                                config.store ();
                                game.resize ();
                                }
                        zoom () {
                                log ( `computed scale thus ${ this.scale }` );
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
                        slide ( value ) { log ( `sliding speed to ${ value }` ); }
                        }
                    },
                // ==| Zoom |==================================================================
                zoom: {
                    value: new class extends slider {
                        constructor () { super ( "zoom" ); }
                        slide () {
                                log ( `sliding zoom to ${ config.data.zoom.value }: cell size is ${ game.grid.width }×${ game.grid.height }px` );
                                game.grid.zoom ();
                                game.resize ();
                                }
                        }
                    }
                }
                );
            // We might be tempted to fold resize and throttle into grid.
            // However, resizing affects more than the grid: the whole game must be recomputed.
            this.ⴵ = null; // timer id for resize throttling
            window.addEventListener ( "resize", () => this.throttle (), { passive: true } );
            this.resize ();
            }
    // ==| Game methods |==========================================================
    click ( event ) {
            const x = ᒪｘᒧ ( this.width * ( event.clientX - this.canvas.pos.left ) / this.canvas.width );
            const y = ᒪｘᒧ ( this.height * ( event.clientY - this.canvas.pos.top ) / this.canvas.height );
            log ( `sglclick — x: ${ x }, y: ${ y }` );
            }
    dblclick ( event ) {
            log ( `dblclick — x: ${ event.clientX - this.canvas.pos.left }, y: ${ event.clientY - this.canvas.pos.top }` );
            }
    // ==| Accessors |==============================================================
    get type () { return this.grid.type; }
    // return height and width as a number of cells:
    get height () { return ᒪｘᒧ ( ( this.type === "triangle" ? 2 : 1 ) * this.canvas.height / this.grid.height ); }
    get width () { return ᒪｘᒧ ( ( this.type === "square" ? 1 : 2 ) * this.canvas.width / this.grid.width ); }
    // ==| Low level cell coloring |===============================================
    // EXPERIMENTAL !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // This will propbably be replaced by plenty other functions
    color ( x, y, color ) {
            // RIDICULOOUS ! this should not be done on a cell by cell basis: all these values are common.
            const { ctx } = this.canvas;
            const { height, scale, width } = this.grid;
            ctx.fillStyle = color;
            switch ( this.type ) {
                case "hexagon": return this.hexagonｰcolor ( ctx, x, y, width / 3, height / 2, .5 / scale );
                case "square": return this.squareｰcolor ( ctx, x, y, width, height, 1 / scale );
                case "triangle": return this.triangleｰcolor ( ctx, x, y, width / 2, height, .5 / scale );
                default: throw TypeError ( `Invalid game type: ${ this.type }` );
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
    // EXPERIMENTAL ZONE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // ==| Zoom |==================================================================
    throttle () { // pace resize events to 10fps to avoid redrawing too often
            if ( this.ⴵ ) return;
            this.ⴵ = setTimeout ( () => { this.ⴵ = null; this.resize (); }, 100 );
            }
    resize () {
            const ᒪｘꓹｓᒧ = ( x, s ) => ᒪｘᒧ ( x / s ) * s; // flooring x to nearest multiple of s lower than x
            const { canvas } = this;
            // force the canvas to a small size to let CSS flex box resize other elements first
            canvas.height = 1; canvas.width = 1;
            // now get the dimensions of the enclosing fieldset, and compute canvas size based on these
            const cs = window.getComputedStyle ( this.elem, null );
            let w = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.width ) - ᒪｘᒧ ( cs.paddingLeft ) - ᒪｘᒧ ( cs.paddingRight ), this.grid.width );
            let h = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.height ) - ᒪｘᒧ ( cs.paddingTop ) - ᒪｘᒧ ( cs.paddingBottom ) - ᒪｘᒧ ( cs.marginTop ) - ᒪｘᒧ ( cs.marginBottom ), this.grid.height );
            switch ( this.grid.type ) {
                case "hexagon":
                    w += 2 * this.grid.width / 3 + 1 / this.grid.scale;
                    break;
                case "square":
                    w += 1 / this.grid.scale;
                    break;
                case "triangle":
                    w += 1 / this.grid.scale;
                    if ( ᒪｘᒧ ( 2 * ᒪｘᒧ ( w ) / this.grid.width ) !== ᒪｘᒧ ( 2 * w / this.grid.width ) ) w += this.grid.width / 2;
                    break;
                default: throw TypeError ( `Invalid game type: ${ this.type }` );
                }
            h += 1 / this.grid.scale;
            log ( `resizing canvas to ${ w }×${ h } pixels` );
            setTimeout ( () => { // defer real resizing/redrawing of the canvas after the CSS flex box has redrawn boundaries
                    // if we have a hex grid, we must remove 1/3 of the scaled width from the result, and if it is triangular, we must remove 1/2 of the scaled width
                    canvas.width = w;
                    canvas.height = h;
                    this.redraw ();
                    log ( `i.e. to ${ this.width }×${ this.height } cells. ( par = ${ ᒪｘᒧ ( 2 * w / this.grid.width ) } vs ${ ᒪｘᒧ ( 2 * ᒪｘᒧ ( w ) / this.grid.width ) } )` );
                    }, 0 );
            }
    redraw () {
            const { ctx } = this.canvas;
            log ( "fake redraw" );
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


// ==| Footer |================================================================
// const footer = new class extends elements {
//     constructor () { super ( "footer" ); }
//     log ( ...args ) {
//             this.elem.innerHTML = `${ new Date ().toLocaleTimeString () } → ${ [ ...args ].
//                 map ( JSON.stringify ).
//                 map ( s => s.replace ( /^"(.*)"$/, "$1" ) ).
//                 join ( " " ) }<br />${ this.elem.innerHTML }`;
//             }
//     };
// const log = footer.log.bind ( footer );

// TEST !!
game.redraw ();

export default class eternalｰview {
    /**
     * The eternalｰview is data-less. It operates on singleton objects (game, config, defaults…).
     * Hence, multiple instances present no issue (they share prototype anyway).
     */
    constructor () {
            game.grid.type = config.data.grid.type;
            game.grid.visible = config.data.grid.visible;
            game.trail.visible = config.data.trail.visible;
            game.speed.value = config.data.speed.value;
            game.zoom.value = config.data.zoom.value;
            }
    get gridʔ̣ () { return game.grid.visible; }
    get trailʔ̣ () { return game.trail.visible; }
    get width () { return game.width; }
    get height () { return game.height; }

    log ( ...args ) { log ( ...args ); }
    }

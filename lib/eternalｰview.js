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
const keysǃ = o => o.keys ? [ ...o.keys () ] : Object.keys ( o ); // eslint-disable-line no-restricted-properties
const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties

function virtualⵢ () { throw TypeError ( "Invalid call to virtual function!" ); }

// ==| Configuration |=========================================================

import eternalｰconfig from "./eternalｰconfig.js";

const defaults = {
    grid: { visible: true, color: "#e0e0e0", type: "square", baseｰsize: 10, stepｰsize: 1 },
    speed: { value: 0 },
    trail: { visible: true, color: "#800080" }, // most recent color, gradient goes to white
    zoom: { value: 0 },
    };

const config = new eternalｰconfig ( "view", defaults );


// ==| DOM elements |==========================================================

class elements { // standard elements record their `name` and DOM element (`elem`)
    constructor ( name ) { // name and elem are readonly, frozen, non enumerable properties
            propertyꔛ ( this, "name", { value: name } );
            propertyꔛ ( this, "elem", { value: document.getElementById ( name ) } );
            }
    }

class button extends elements {
    constructor ( name ) {
            super ( name );
            const button = this.elem;
            button.addEventListener ( "click", () => this.press (), { passive: true } );
            }
    press () { virtualⵢ (); }
    }

class radioｰbutton extends elements {
    constructor ( name ) {
            super ( name );
            const radio = this.elem;
            radio.addEventListener ( "change", event => { this.state = event.target.checked; }, { passive: true } );
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
            const slider = this.elem;
            slider.addEventListener ( "change", event => { this.value = event.target.value; }, { passive: true } );
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
            const toggle = this.elem;
            toggle.addEventListener ( "click", () => { this.visible = toggle.checked; }, { passive: true } );
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
// width, height - represent the size of the canvas (readonly)
// canvas, grid, trail, speed, zoom - represent the state of control knobs
// resize () => fetches the current game width and height,
//              then resizes and redraws the canvas.
// ============================================================================
const game = new class extends elements {
    constructor () {
            super ( "game" );
            propertiesꔛ ( this, {
                // ==| Canvas |================================================================
                canvas: {
                    value: new class extends elements {
                        constructor () { // this.ctx is readonly, non configurable and non enumerable
                                super ( "canvas" );
                                // ==| Context |===============================================================
                                this.ctx = this.elem.getContext ( "2d" );
                                // ==| Image |=================================================================
                                this.image = this.ctx.createImageData ( this.width, this.height );
                                freezeꔛ ( this );
                                }
                        get width () { return this.elem.width; }
                        get height () { return this.elem.height; }
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
                                this.gridｰtypes = {};
                                const tiling = document.querySelectorAll ( "input[name='tiling']" );
                                tiling.forEach (
                                    option => {
                                            const name = option.value;
                                            this.gridｰtypes [ name ] = new class extends radioｰbutton {
                                                constructor () { super ( name ); }
                                                select () { game.type = name; }
                                                };
                                            this.gridｰtypes [ name ].elem.checked = name === config.data.grid.type;
                                            }
                                    );
                                log ( this.gridｰtypes );
                                freezeꔛ ( this );
                                }
                        hide () { this.paint (); }
                        show () { this.paint (); }
                        paint () { /* a valid CSS color, such as transparent or #e0e0e0 */
                                const color = config.data.grid.visible ? config.data.grid.color : "transparent";
                                keysǃ ( this.gridｰtypes ).forEach (
                                    type => {
                                            const style = getComputedStyle ( document.body );
                                            let url = style.getPropertyValue ( `--${ type }` );
                                            url = url.replace ( /stroke\s*=\s*'[^']*'/, `stroke='${ color }'` );
                                            document.documentElement.style.setProperty ( `--${ type }`, url );
                                            }
                                    );
                                game.type = config.data.grid.type;
                                }
                        scale () {
                                const scale = this.size / config.data.grid.baseｰsize;
                                log ( `computed scale is thus ${ scale }` );
                                keysǃ ( this.gridｰtypes ).forEach (
                                    type => {
                                            const style = getComputedStyle ( document.body );
                                            let url = style.getPropertyValue ( `--${ type }` );
                                            url = url.replace ( /stroke-width\s*=\s*'[^']*'/, `stroke-width='${ 1 / scale }'` );
                                            document.documentElement.style.setProperty ( `--${ type }`, url );
                                            document.documentElement.style.setProperty ( "--scale", scale );
                                            }
                                    );
                                game.type = config.data.grid.type;
                                }
                        get size () { // size includes the grid border width
                                return config.data.grid.baseｰsize + config.data.grid.stepｰsize * config.data.zoom.value;
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
                // ==| Type |==================================================================
                type: {
                    get () { return config.data.grid.type; },
                    set ( type ) {
                            const style = getComputedStyle ( document.body );
                            [
                                "image",
                                "position",
                                "size"
                                ].forEach ( attribute => {
                                        document.documentElement.style.setProperty (
                                            `--grid-${ attribute }`,
                                            style.getPropertyValue ( `--${ type }-grid-${ attribute }` )
                                            );
                                        }
                                    );
                            config.data.grid.type = type;
                            config.store ();
                            }
                    },
                // ==| Zoom |==================================================================
                // A zoom level of -2 draws 3x3 cells (or 4x4 if the grid is off)
                // A zoom level of -1 draws 5x5 cells (or 6x6 if the grid is off)
                // A zoom level of  0 draws 7x7 cells (or 8x8 if the grid is off)
                // A zoom level of +1 draws 9x9 cells (or 10x10 if the grid is off)
                // A zoom level of +2 draws 11x11 cells (or 12x12 if the grid is off)
                zoom: {
                    value: new class extends slider {
                        constructor () { super ( "zoom" ); }
                        slide () {
                                log ( `sliding zoom to ${ config.data.zoom.value }: cell size is ${ game.grid.size }px` );
                                game.grid.scale ();
                                game.resize ();
                                }
                        }
                    }
                }
                );
            this.ⴵ = null; // timer id for resize throttling
            window.addEventListener ( "resize", () => this.throttle (), { passive: true } );
            this.resize ();
            }
    // This is the end of the game constructor, here are game methods
    get width () { return this.canvas.width; }
    get height () { return this.canvas.height; }
    throttle () { // pace resize events to 10fps to avoid redrawing too often
            if ( this.ⴵ ) return;
            this.ⴵ = setTimeout ( () => { this.ⴵ = null; this.resize (); }, 100 );
            }
    resize () {
            const ᒪｘꓹｓᒧ = ( x, s ) => ᒪｘᒧ ( x / s ) * s; // flooring x to nearest multiple of s lower than x
            const gridｰsize = this.grid.size;
            const theｰcanvas = this.canvas.elem;
            // force the canvas to a small size to let CSS flex box resize other elements first
            theｰcanvas.width = 1;
            theｰcanvas.height = 1;
            const shift = config.data.grid.baseｰsize / gridｰsize;
            const cs = window.getComputedStyle ( this.elem, null );
            const w = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.width ) - ᒪｘᒧ ( cs.paddingLeft ) - ᒪｘᒧ ( cs.paddingRight ) - shift, gridｰsize ) + 1;
            const h = ᒪｘꓹｓᒧ ( ᒪｘᒧ ( cs.height ) - ᒪｘᒧ ( cs.paddingTop ) - ᒪｘᒧ ( cs.paddingBottom ) - shift, gridｰsize ) + 1;
            log ( `resizing canvas to ${ w }x${ h }` );
            setTimeout ( () => { // defer real resizing/redrawing of the canvas after the CSS flex box has redrawn boundaries
                    theｰcanvas.width = w;
                    theｰcanvas.height = h;
                    this.redraw ();
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
            ctx.fillStyle = "#0000c880";
            ctx.fillRect ( 30, 50, 50, 50 );
            ctx.fillStyle = "#ffffff";
            ctx.fillRect ( 50, 50, 11, 11 );
            ctx.fillRect ( 51, 64, 9, 9 );
            ctx.fillRect ( 52, 76, 7, 7 );
            ctx.fillRect ( 53, 86, 5, 5 );
            ctx.fillRect ( 54, 95, 3, 3 );
            ctx.fillRect ( 55, 99, 1, 1 );
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
            game.grid.visible = config.data.grid.visible;
            game.trail.visible = config.data.trail.visible;
            game.speed.value = config.data.speed.value;
            game.zoom.value = config.data.zoom.value;
            game.type = config.data.grid.type;
            }
    get gridʔ̣ () { return game.grid.visible; }
    get trailʔ̣ () { return game.trail.visible; }
    get width () { return game.width; }
    get height () { return game.height; }

    log ( ...args ) { log ( ...args ); }
    }

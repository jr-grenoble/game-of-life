// TODO: move computedStyle out of resize
// TODO: implement a neighborhood watcher
// TODO: implement a 2 players game, cf. https://arxiv.org/pdf/cond-mat/0207679.pdf
// TODO: implement an import/export capability
// TODO: implement pattern library, rule library and storage capabilities


// ==| VIEW |==================================================================
//  * MVC view for eternal life game
//
// * MVC view for the eternal life game
// * The view has primitives to display state on a canvas.
// * It also keeps track of external events and user input.
// * It processes locally some user actions such as displaying or hiding the grid.

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

    ￤﹍０﹍￤﹍１﹍￤﹍２﹍￤﹍３﹍￤﹍      Hexagonal cells intersect with natural square cells as per the diagram left.
    ￤／￣￣￤＼＿＿￤／￣￣￤＼＿＿￤０      E.g, in square cell 0,0, there are 3 bits of hexagonal cells -1,-1 (top left), -1,0 (bottom left) and 0,0 (right).
    ￤＼＿＿￤／﹍﹍￤＼＿＿￤／﹍﹍￤﹍      And in square cell 1,0, there are 3 bits of hexagonal cells 1,-1 (top), 0,0 (left) and 0,1 (bottom).
    ￤／￣￣￤＼＿＿￤／￣￣￤＼＿＿￤１
    ￤＼＿＿￤／﹍﹍￤＼＿＿￤／﹍﹍￤﹍      These rules apply for any column, i.e. depend only on whether the first square coordinate is even or odd.

    Note that a basic hexagonal cell spends a width of 2 grid units and a height of 1.
    Note also that odd column cells have their top shifted by half a grid unit height.

      0   1
    ｜……｜……｜…    Triangular cells intersect with natural square cells as per the diagram left.
    ｜╲ ｜ ╱｜0    E.g., in square cell 0,0, the top right part belongs to triangle cell 0,-1, while the bottom right is in triangle 0,0.
    ｜…╲｜╱…｜…    And in square cell 1,2, the top left is in triangle 1,1, while the bottom right is in triangle 1,2.
    ｜ ╱｜╲ ｜1
    ｜╱…｜…╲｜…    These rules apply based on the parity of the square coordinates. For identifal parity (both odd or both even),
    ｜╲ ｜ ╱｜2    the rule described for 0,0 applies. For opposite parities, the rule described for 1,2 applies.
    ｜…╲｜╱…｜…
    `;
// ============================================================================

// ==| Configuration |=========================================================

import eternalｰconfig from "./eternalｰconfig.js";

// We import enumerations from the eternalｰconfig
const { effects, tiles, surroundings, key } = eternalｰconfig;
const { hexagon, square, triangle } = tiles; // these are the tessalations we know about in this module
const { moore } = surroundings;

// We also import common utilities
const { coordｰutilities, functionalｰutilities, generalｰutilities, mathｰutilities } = eternalｰconfig;
// And here is what we use from these utilities
const { shiftｰpair } = coordｰutilities;
const { Ǝʔ̣, virtualⵢ } = functionalｰutilities;
const { arrayʔ̣, freezeꔛ, freezeｰtoｰcoreꔛ, integerǃ, ㄱnumberʔ̣, propertiesꔛ, propertyꔛ, undefinedʔ̣ } = generalｰutilities;
const { ᒪｘᒧ, ᑕｘꔷᑐ, evenʔ̣, div2 } = mathｰutilities;

// Default configuration; this is permanently replaced by user preferences. // TODO: create a reset configuration menu entry
// If you want to manually force defaults, use the Chrome debugger and clear storage in the application tab
const defaults = {
    darwin: {
        visible: true,				// evolution is visible (mutations are enabled)
        },
    geometry: {
        width: null,				// width of board expressed in number of cells
        height: null,				// height of board expressed in number of cells
        maxr: 3,					// maximum range (checked against html)
        maxh: 512,					// maximum width (number of cells)
        maxw: 512,					// maximum height (number of cells)
        top: effects.bottom,		// cells will reappear on bottom when they hit the top border
        right: effects.left,		// cells will reappear on left when they hit right border
        bottom: effects.top,		// cells will reappear on top when they hit the bottom border
        left: effects.right,		// cells will reappear on right when they hit the left border
        },
    grid: {
        visible: true,				// the grid is visible
        color: "#e0e0e0",			// it is light grey
        live: "#a30015",			// live cells are dark red
        tiling: square,				// cells are square
        },
    rules: {
        neighborhood: {				// the Von Neumann distance is Manhattan distance d ((x0,y0), (x1,y1)) = sum(|x1-x0|,|y1-y0|)
            vicinity: moore,		// the Moore distance is basically Chebyshev distance d ((x0,y0), (x1,y1)) = max(|x1-x0|,|y1-y0|)
            range: 1,				// vicinity extends to this range, using one of the 2 distances above (vonｰneumann or moore)
            },
        born: [ 3 ],				// an empty cell gives birth to a new cell iff it has 3 live neighbors in its vicinity
        mutate: [ 1 ],				// a cell can mutate iff it has 1 live neighbor in its vicinity
        survive: [ 2, 3 ],			// a live cell survives iff it has 2 or 3 live neighbors in its vicinity
        probability: 5,				// mutation probability is 10^-5
        },
    speed: {
        value: 0,					// speedometer value, the higher the faster, the lower the slower
        maxs: 2,					// maximum speed (checked against html)
        },
    trail: {
        visible: true,				// trail is visible by default
        color: "#ff80ff",			// it is vivid pink at first generation
        alpha: 4,					// then, it fades to transparent by a factor of 1 - 2^(-α), i.e. it disappear immediately if α is 0
        },
    zoom: {
        value: 0,					// zoom, uses a power scale
        maxz: 0,					// maximum zoom value (checked against html)
        },
    };
// Nevert store state in config defaults (state must be explicitly stored)
freezeｰtoｰcoreꔛ ( defaults );
const config = new eternalｰconfig ( "view", defaults );


// ==| Globals |===============================================================
// We are in a module ⇒ we can use globals safely to avoid parameter passing.

// These globals are either initialized once by the view constructor,
// or they are re-initialized by the controller.

// Functions allowing to trigger the model;
// the controller passes these functions to the view right after init.
let neighborhoods = undefined;
let area = void ( () => "return the number of cells in the neighborhood area, exclduing central cell" );
let aliveʔ̣ = void ( ( x, y ) => `test if cell at ${ x, y } is live` );
let breedǃ = void ( ( x, y ) => `turn cell at ${ x, y } alive` );
let chokeǃ = void ( ( x, y ) => `kill cell at ${ x, y }` );
let clearǃ = void ( () => void "kill all cells on board" );
let cycleǃ = void ( ( burry, nurse ) => `run rules to compute next cells, then sweep the board to ${ burry } deads and ${ nurse } babies` );
let shakeǃ = void ( () => "fill board at random" );
let sweepǃ = void ( ( burry, nurse ) => `sweep the board to ${ burry } deads and ${ nurse } babies, without changing state` );

// These globals avoid calling accessors and are positionned whenever the config changes
const cell = {
    scale: 1,
    shape: square,
    width: null,
    height: null,
    adjustｰdims ( w, h ) { // adjust a width "w" to be an integer multiple of cell widths and keep h as is
            switch ( cell.shape ) {
                case hexagon:
                    w += 2 * cell.width / 3;
                    break;
                case square:
                    break;
                case triangle:
                    if ( ᒪｘᒧ ( 2 * ᒪｘᒧ ( w ) / game.width ) !== ᒪｘᒧ ( 2 * w / game.width ) ) w += cell.width / 2;
                    break;
                default: throw TypeError ( `Invalid game tiling type: ${ cell.shape }` );
                }
            return [ w, h ];
            },
    resize () {
            cell.scale = 2 ** ( config.data.zoom.value / 5 );
            cell.shape = config.data.grid.tiling;
            cell.width = tesselation.tilingｰbuttons [ cell.shape ].baseｰwidth * cell.scale;
            cell.height = tesselation.tilingｰbuttons [ cell.shape ].baseｰheight * cell.scale;
            }
    };

// ==| DOM elements |==========================================================
// The following classes provide DOM element encapsulation

class element { // standard elements record their `name` and DOM element (`elem`)
    constructor ( name ) { // name and elem are readonly, frozen, non enumerable properties
            propertyꔛ ( this, "name", { value: name } );
            propertyꔛ ( this, "elem", { value: document.getElementById ( name ) } );
            }
    // end of element class
    }

class board extends element { // board elements call click, dblclick and move when receiving corresponding events
    constructor ( name ) {
            super ( name );
            // double click must be declared before click so that it can be trapped. It generates a click too.
            this.elem.addEventListener ( "dblclick", event => this.dblclick ( event ) );
            this.elem.addEventListener ( "click", event => this.click ( event ) );
            document.addEventListener ( "keydown", event => event.target === this.elem ? this.keydown ( event ) : null );
            this.elem.addEventListener ( "keyup", event => this.keyup ( event ) );
            this.elem.addEventListener ( "mousemove", event => this.move ( event ) );
            window.addEventListener ( "resize", event => this.resize ( event ) );
            }
    click ( event ) { virtualⵢ ( event ); }
    dblclick ( event ) { virtualⵢ ( event ); }
    keydown ( event ) { log ( "kd" ); virtualⵢ ( event ); } // TODO: make it work !
    keyup ( event ) { log ( "ku" ); virtualⵢ ( event ); }   // TODO: make it work !
    move ( event ) { virtualⵢ ( event ); }
    resize ( event ) { virtualⵢ ( event ); }
    // end of board class
    }

class button extends element { // button elements call press when they are clicked
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "click", event => this.press ( event ) );
            }
    press ( event ) { virtualⵢ ( event ); }
    // end of button class
    }

class canvas extends element { // canvas elements do not handle any events but allow to draw cells
    constructor ( name, svg ) { // this.ctx is readonly, non configurable and non enumerable
            super ( name );
            // ==| Underlying grid |=======================================================
            this.svg = new element ( svg );
            // ==| Context |===============================================================
            this.ctx = this.elem.getContext ( "2d" );
            // Position of canvas is needed by resize function
            this.pos = this.elem.getBoundingClientRect ();
            }

    set alpha ( alpha ) {
            this.ctx.save ();
            this.ctx.globalAlpha = 1 - 2 ** -alpha;
            this.ctx.globalCompositeOperation = "copy";
            this.ctx.drawImage ( this.elem, 0, 0 );
            this.ctx.restore ();
            }

    get height () { return this.ctx.canvas.clientHeight; }
    set height ( height ) {
            height = `${ height }px`;
            this.elem.setAttribute ( "height", height );
            this.svg.elem.setAttribute ( "height", height );
            }
    get width () { return this.ctx.canvas.clientWidth; }
    set width ( width ) {
            width = `${ width }px`;
            this.elem.setAttribute ( "width", width );
            this.svg.elem.setAttribute ( "width", width );
            }

    // ==| Cell drawing |===========================================================
    drawｰhex ( x, y, w, h ) {
            const { ctx } = this;
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
    drawｰsqr ( x, y, w, h ) {
            const { ctx } = this;
            const px = x * w;
            const py = y * h;
            ctx.fillRect ( px, py, w, h );
            ctx.strokeRect ( px, py, w, h );
            }
    drawｰtri ( x, y, w, h ) {
            const { ctx } = this;
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
            const { height, width } = cell; // scaled width and height of cells in pixels
            const { color: stroke, tiling, visible } = config.data.grid; // TODO: use globals
            const { ctx } = this;
            let w = width, h = height, cellθ = virtualⵢ;
            switch ( tiling ) {
                case hexagon:
                    w /= 3;
                    h /= 2;
                    cellθ = ( x, y ) => this.drawｰhex ( x, y, w, h );
                    break;
                case square:
                    cellθ = ( x, y ) => this.drawｰsqr ( x, y, w, h );
                    break;
                case triangle:
                    w /= 2;
                    cellθ = ( x, y ) => this.drawｰtri ( x, y, w, h );
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
    // ==| Drawing brush |==========================================================
    // Both cycleǃ and sweepǃ model functions accept callback functions as parameters
    // to process dead and newborn cells (they pass the [x,y] coordinates of these
    // cells to the callbacks). They also call the setup and close methods of these callbacks.
    // The draw method builds a drawing brush with the proper color.
    draw ( color ) {
            const { ctx, cellθ, stroke, visible } = this.drawｰctx ();
            const brush = cellθ;
            brush.setup = () => { ctx.save (); ctx.fillStyle = color; ctx.strokeStyle = visible ? stroke : color; };
            brush.close = () => ctx.restore ();
            return brush;
            }
    // end of canvas class
    }

class field extends element { // field elements allow for displaying text in predefined areas
    constructor ( name, content = "" ) {
            super ( name );
            this.content = content;
            }
    get content () { return this.elem.innerHTML; }
    set content ( content ) { this.elem.innerHTML = content; }
    // end of field class
    }

class input extends element { // input elements call change when their value changes
    constructor ( name, configｰdata = config.data [ name ], configｰname = "value" ) {
            super ( name );
            this.configｰdata = configｰdata;
            this.configｰname = configｰname;
            this.elem.addEventListener ( "change", event => { this.value = event.target.value; } );
            }

    set init ( value ) { // allow initialization without calling this.change
            value = arrayʔ̣ ( value ) ? value : ㄱnumberʔ̣ ( +value ) ? value : +value;
            this.elem.value = this.configｰdata [ this.configｰname ] = value;
            }

    get value () { const s = this.elem.value, n = arrayʔ̣ ( s ) ? s : +s; return ㄱnumberʔ̣ ( n ) ? s : n; }
    set value ( value ) {
            // we must set config.data….value first, before calling virtual change !
            this.init = value;
            config.store ();
            this.change ( value );
            }
    change ( value ) { void value; }
    // end of input class
    }

class inputｰrange extends input { // input range elements allow entering range of values and validate them
    // valid input looks like 1-3,5,7-9 (meaning 1,2,3,5,7,8,9), similar to page numbers in a print dialog window
    get value () { return this.configｰdata [ this.configｰname ]; }

    // To access the (derived) class name and call static methods,
    // we use the `this.constructor.static_method` idiom in the methods below.
    set value ( value ) {
            // Keep track of previous value in case the new one is bogus, but revalidate it in case geometry has changed
            const prevｰvalue = this.constructor.validate ( this.constructor.string ( this.value ) );

            // OK, if the browser thinks it's legit, check validity further
            if ( this.elem.checkValidity () ) try {
                const nextｰvalue = this.constructor.validate ( value ); // give a chance to throw before assigning to super
                super.value = nextｰvalue;
                }
                catch ( e ) { // just in case validate catches an error, do not display the corresponding value, just the error!
                    this.elem.value = `${ e }`;
                    }
            // otherwise return to previously validated value
            else this.elem.value = prevｰvalue;
            this.display ( this.configｰdata [ this.configｰname ] );
            }
    change () { config.store (); }
    display ( value ) { this.elem.value = this.constructor.string ( value ); }

    // The following methods are static because they do not depend on any instance data.
    // They are however overriden by derived classes.
    static validate ( str ) { virtualⵢ ( str ); } // there's no default validation
    static string ( vector ) { virtualⵢ ( vector ); } // there's no default conversion to string
    // end of inputｰrange class
    }

class inputｰneighborhoodｰrange extends inputｰrange { // inputｰneighborhoodｰrange elements allow for entering lists and ranges of numbers corresponding to rules
    // the following methods aren't needed, but kept as comment for illustration purpose
    // get value () { return super.value; }
    // set value ( value ) { super.value = value; }
    // change () { super.change (); }
    // display ( value ) { super.display ( value ); }

    static validate ( str ) { // input validation function: turn a string into a validated array of numbers
            const max = area ();
            // normalize separator and only keep digits and - and ,
            str = str.replace ( ";", "," ).replace ( /\s|[^0-9,-]/g, "" );
            const result = [];
            const chunks = str.split ( "," );
            chunks.forEach ( chunk => {
                    const range = chunk.match ( /\d+/g );
                    if ( +range [ 0 ] > max ) range [ 0 ] = max;
                    if ( range.length === 1 ) range.push ( +range [ 0 ] );
                    else if ( +range [ 1 ] > max ) range [ 1 ] = max;
                    const [ i0, i1 ] = +range [ 0 ] < +range [ 1 ] ? [ 0, 1 ] : [ 1, 0 ];
                    for ( let i = +range [ i0 ]; i <= +range [ i1 ]; ++i ) result.push ( i );
                    } );
            return [ ...new Set ( result ) ].sort ( ( a, b ) => a - b ); // numerically sort unique values
            }
    static string ( vector ) { // turns [ 2,4,5,6,9,11,12,13,15 ] into "2;4-6;9;11-13;15"
            const l = vector.length - 1; // last index in vector array
            // map [ 2,4,5,6,9,11,12,13,15 ] into array of strings (quote ommitted) [ "2,","4-","-","6,","9,","11-","-","13,","15," ]
            vector = vector.map ( ( v, i, a ) => i < l && a [ i + 1 ] - v === 1 ? `${ i > 0 && v - a [ i - 1 ] === 1 ? "" : v }-` : `${ v },` );
            return vector.join ( "" ).   // concatenate all strings in vector array
                replace ( /-+/g, "-" ). // replace multiple dashes by single dash
                slice ( 0, -1 );        // remove trailing comma
            }
    // end of inputｰneighborhoodｰrange class
    }

const movable = base => class extends base { // mixin class, makes an element movable over some flyover zones
    flyover ( ...zones ) {
            const { elem } = this;
            let dx = 0, dy = 0;
            elem.draggable = true;

            const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = elem;
            elem.style.margin = "0";
            elem.style.right = "";
            elem.style.bottom = "";
            elem.style.left = `${ offsetLeft }px`;
            elem.style.top = `${ offsetTop }px`;
            elem.style.width = `${ offsetWidth }px`;
            elem.style.height = `${ offsetHeight }px`;

            elem.addEventListener ( "dragstart", e => {
                    e.dataTransfer.setData ( "text/plain", elem.id );
                    const { offsetLeft, offsetTop } = elem;
                    dx = offsetLeft - e.x;
                    dy = offsetTop - e.y;
                    } );
            zones.forEach ( zone => {
                    zone.elem.addEventListener ( "dragover", e => { e.preventDefault (); } );
                    zone.elem.addEventListener ( "drop", e => {
                            e.preventDefault ();
                            if ( e.dataTransfer.getData ( "text/plain" ) !== elem.id ) return; // not for us !
                            elem.style.left = `${ e.x + dx }px`;
                            elem.style.top = `${ e.y + dy }px`;
                            } );
                    } );
            }
    // end of movable mixin class
    };

class modalｰbutton extends button { // modal buttons prepare to display a modal popup on top of a frosted window; everything remains hidden by default
    constructor ( name ) {
            super ( name );
            this.frosted = new element ( "frosted" );
            this.popup = new ( movable ( element ) ) ( "popup" ); // required parentheses to indicate the target of new
            // this could be equivalently but more explicitly stated as:
            // this. popup = new class extends movable ( element ) {} ( "popup" );
            this.popup.flyover ( this.frosted );

            this.panes = this.frosted.elem.querySelectorAll ( "#popup > div" );
            this.panes.forEach ( pane => { pane.style.visibility = "hidden"; } );
            this.cancel = document.getElementById ( "cancel" );
            this.cancel.addEventListener ( "click", ( /* event */ ) => {
                    this.panes.forEach ( pane => { pane.style.visibility = "hidden"; } );
                    this.frosted.elem.style.visibility = "hidden";
                    } );
            }
    press ( /* event */ ) {
            this.frosted.elem.style.visibility = "visible";
            }
    // end of modalｰbutton class
    }

class radioｰbutton extends element { // radio buttons call change when checked
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "change", event => { this.state = event.target.checked; } );
            }
    // allow initialization without calling this.change
    set init ( state ) { this.elem.checked = state; }
    get state () { return this.elem.checked; }
    set state ( state ) { this.init = state; if ( this.state ) this.change (); }
    change () { virtualⵢ (); }
    // end of radioｰbutton class
    }


class slider extends input { // slider elements do the same as regular input but they also display value in an adjacent field, formatted with the format function
    constructor ( name, configｰdata = config.data [ name ], configｰname = "value", format = x => x.toFixed ( 1 ) ) {
            super ( name, configｰdata, configｰname );
            this.format = format;
            this.valueｰlabel = document.getElementById ( `${ name }-value` );

            // draw tickmarks for the slider

            // utility to get number of pixels out of CSS dimensions
            const px = x => integerǃ ( x );
            // Get the dimensions of the slider and a couple of other attributes
            const { elem: sliderｰelem } = this;
            const { min = 0, max = 100 } = sliderｰelem;
            const sliderｰstyle = getComputedStyle ( sliderｰelem );

            // number of tickmarks (limited to 10):
            let tickmarks = max - min;
            while ( tickmarks > 10 ) tickmarks /= 2;
            // tickmarks += 1;

            // now create the tick table
            const tickｰtable = document.createElement ( "table" );
            tickｰtable.className = "slider-table";
            tickｰtable.style.display = "inline-block";
            tickｰtable.style.borderCollapse = "collapse";
            const tickｰrow = document.createElement ( "tr" );
            tickｰrow.className = "slider-tick-lane";
            tickｰtable.appendChild ( tickｰrow );

            // Create ticks
            const tickｰtemplate = document.createElement ( "td" );
            tickｰtemplate.className = "slider-tick";
            tickｰtemplate.style.width = `${ px ( sliderｰstyle.width ) / tickmarks }px`;
            for ( let i = 0; i < tickmarks; i++ ) tickｰrow.appendChild ( tickｰtemplate.cloneNode ( true ) );

            // Position the tick table
            tickｰtable.style.position = "absolute";
            tickｰtable.style.width = sliderｰstyle.width;
            tickｰtable.style.top = `${ sliderｰelem.offsetTop + px ( sliderｰstyle.paddingTop ) }px`;
            tickｰtable.style.left = `${ sliderｰelem.offsetLeft + px ( sliderｰstyle.paddingLeft ) }px`;
            tickｰtable.style.zIndex = -1;
            sliderｰelem.parentNode.insertBefore ( tickｰtable, sliderｰelem.nextSibling );
            }

    set init ( value ) {
            this.valueｰlabel.innerHTML = `${ this.format ( +value ) }`;
            super.init = value;
            }
    set value ( value ) {
            this.init = value;
            super.value = value;
            }
    // end of slider class
    }

class toggle extends element { // checkbox elements call `hide` when unchecked and `show` when checked
    constructor ( name ) {
            super ( name );
            this.elem.addEventListener ( "click", event => { this.visible = event.target.checked; } );
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
    // end of toggle class
    }

// ==| Footer |================================================================
// The footer area provides ways to display status information in separate divs
// ============================================================================
const footer = new class extends element {
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
    // end of footer class
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


// ==| Colors |================================================================
// Colors handle user input and  trigger game redrawing with new colors
const colors = {
    grid: new class extends input {
        constructor () { super ( "grid-color", config.data.grid, "color" ); }
        change () { if ( grid.visible ) grid.show (); }
        },
    live: new class extends input {
        constructor () { super ( "live-color", config.data.grid, "live" ); }
        change () { game.redraw ( false ); }
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
        change () { game.redraw ( false ); }
        },
    };
freezeꔛ ( colors );


// ==| Darwin |================================================================
// Darwin handles toggling spontaneuous (random) mutations
const darwin = new class extends toggle {
    hide () { game.redraw ( false ); }
    show () { game.redraw ( false ); }
    } ( "darwin" );
freezeꔛ ( darwin );


// ==| Grid |==================================================================
// Grid handles toggling the grid on and off and getting its cell dimensions
const grid = new class extends toggle {
    hide () { this.paint ( "transparent" ); }
    show () { this.paint ( config.data.grid.color ); }
    paint ( color ) { /* a valid CSS color, such as transparent or #e0e0e0 */
            document.documentElement.style.setProperty ( "--pattern-color", color );
            game.redraw ( false );
            }
    } ( "grid" );
freezeꔛ ( grid );


// ==| Neighborhood |===========================================================
// Neighborhood handles user input regarding neighborhood type and redraws the
// game in case of change
const neighborhood = {
    // neighborhood range and vicinity is represented on a canvas
    canvas: new canvas ( "neighborhood-canvas", "neighborhood-svg" ),

    vicinity: new class extends input {
        constructor () { super ( "neighborhood", config.data.rules.neighborhood, "vicinity" ); }
        change () {
                neighborhood.resize ();
                game.redraw ( true );
                }
        },

    range: new class extends slider {
        constructor () {
                super ( "range", config.data.rules.neighborhood, "range", x => x.toFixed ( 0 ) );
                if ( config.data.geometry.maxr !== +this.elem.max ) {
                    config.data.geometry.maxr = +this.elem.max;
                    config.store ();
                    }
                }
        change ( value ) {
                document.documentElement.style.setProperty ( "--neighborhood-range", value );
                neighborhood.resize ();
                game.redraw ( true );
                }
        },

    redraw () {
            const { canvas } = neighborhood;
            const { range } = config.data.rules.neighborhood;
            const vicinity = key ( surroundings, config.data.rules.neighborhood.vicinity );
            const { live, tiling } = config.data.grid;
            const trail = config.data.trail.color;
            const center = [ range + 1, ( range + 1 ) * ( tiling === triangle ? 2 : 1 ) ];
            canvas.clear ();
            canvas.drawｰcell ( ...center, live );
            neighborhoods [ vicinity ] [ tiling ] ( ...center ).map ( ( [ x, y ] ) => canvas.drawｰcell ( x, y, trail ) );
            },

    resize () {
            const { range } = config.data.rules.neighborhood; // neighborhood range
            const { adjustｰdims, height, width } = cell;
            const { canvas, redraw } = neighborhood;
            const h = 2 * range + 3; // number of cells per column in the neighborhood canvas
            let w; // number of cells per column in the neighborhood canvas
            switch ( tesselation.tiling ) {
                case hexagon: w = div2 ( h ); break;
                case square: w = h; break;
                case triangle: w = div2 ( h ) + 0.5; break;
                default:
                }
            const pw = 1 / cell.scale;
            [ canvas.width, canvas.height ] = shiftｰpair ( pw, pw ) ( adjustｰdims ( w * width, h * height ) );
            redraw ();
            },
    };
freezeꔛ ( neighborhood );


// ==| Rules |==================================================================
// Rules handle user input regarding cell birth and survival type
const rules = {
    born: new inputｰneighborhoodｰrange ( "born", config.data.rules, "born" ),
    mutate: new inputｰneighborhoodｰrange ( "mutate", config.data.rules, "mutate" ),
    survive: new inputｰneighborhoodｰrange ( "survive", config.data.rules, "survive" ),
    probability: new slider ( "probability", config.data.rules, "probability" ),
    };
freezeꔛ ( rules );


// ==| Speed |=================================================================
// Speed handles user input regarding speed and resets statistics
const speed = new class extends slider {
    constructor () {
            super ( "speed" );
            if ( config.data.speed.maxs !== +this.elem.max ) {
                config.data.speed.maxs = +this.elem.max;
                config.store ();
                }
            }
    change () { game.play.reset (); }
    };
freezeꔛ ( speed );

// ==| Stitching |==============================================================
// Stitching handles user input regarding geometry (border stitching effects)
const stitching = {
    top: new input ( "top-effect", config.data.geometry, "top" ),
    right: new input ( "right-effect", config.data.geometry, "right" ),
    bottom: new input ( "bottom-effect", config.data.geometry, "bottom" ),
    left: new input ( "left-effect", config.data.geometry, "left" ),
    };
freezeꔛ ( stitching );


// ==| Tiling |================================================================
// Tesselation handles user input regarding tiling radio buttons
const tesselation = new class {
    constructor () {
            this.tilingｰbuttons = {}; // note that tiling buttons appear in the config pane
            document.querySelectorAll ( "input[name='tiling']" ).forEach (
                option => {
                        const name = option.value;
                        this.tilingｰbuttons [ name ] = new class extends radioｰbutton {
                            constructor () {
                                    super ( name );
                                    const p = this.pattern = document.getElementById ( `${ name }-pattern` );
                                    this.baseｰheight = p.height.baseVal.value;
                                    this.baseｰwidth = p.width.baseVal.value;
                                    }
                            change () { tesselation.tiling = name; }
                            } ( this );
                        this.tilingｰbuttons [ name ].elem.checked = name === config.data.grid.tiling;
                        }
                );
            }

    get tiling () { return config.data.grid.tiling; }
    set tiling ( tile ) {
            document.documentElement.style.setProperty ( "--grid-fill", `url(#${ tile }-pattern)` );
            config.data.grid.tiling = tile;
            config.store ();
            cell.resize ();
            neighborhood.resize ();
            game.resize ();
            }
    };
freezeꔛ ( tesselation );

// ==| Trail |=================================================================
// Trail handles toggling trail on and off and redrawing the board
const trail = new class extends toggle {
    hide () { game.redraw ( false ); }
    show () { game.redraw ( false ); }
    } ( "trail" );
freezeꔛ ( trail );


// ==| Zoom |==================================================================
// The zoom handles user input and triggers game resizing
const zoom = new class extends slider {
    constructor () {
            super ( "zoom" );
            if ( config.data.zoom.maxz !== +this.elem.max ) {
                config.data.zoom.maxz = +this.elem.max;
                config.store ();
                }
            }
    change () {
            cell.resize ();
            document.documentElement.style.setProperty ( "--pattern-scale", cell.scale );
            game.resize ();
            }
    };
freezeꔛ ( speed );


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

            // ==| Board canvas |==========================================================
            this.canvas = new canvas ( "canvas", "svg" );

            // ==| Play |==================================================================
            this.play = new class extends button {
                constructor () { super ( "play" ); }
                reset () {
                        this.steps = this.ticks = 0;
                        this.start = performance.now ();
                        }
                press () { // toggle play state and button label
                        if ( game.playing ) {
                            window.cancelAnimationFrame ( game.playing );
                            game.playing = null;
                            this.elem.value = "play_arrow";
                            }
                        else {
                            this.reset ();
                            const step = timestamp => {
                                    const elapsed = timestamp - this.start;
                                    const speed = 2 ** ( config.data.speed.maxs - config.data.speed.value );
                                    if ( this.ticks++ % speed < 1 ) { // tests allows for speed to be fractional
                                        game.comments.innerHTML = `
                                            ${ ( elapsed / 1000 ).toPrecision ( 3 ) } s elapsed (${ this.steps++ } steps)<br />
                                            ${ ᒪｘᒧ ( elapsed / this.steps ) } ms per step`;
                                        game.redraw ( true );
                                        }

                                    game.playing = window.requestAnimationFrame ( step );
                                    };
                            game.playing = window.requestAnimationFrame ( step );
                            this.elem.value = "pause";
                            }
                        }
                };

            // ==| Step |==================================================================
            this.step = new class extends button {
                constructor () { super ( "step" ); }
                press () { game.redraw ( true ); }
                };

            // ==| Clear |=================================================================
            this.clear = new class extends button {
                constructor () { super ( "clear" ); this.randomize = true; }
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
                        game.canvas.clear ();
                        game.redraw ( false );
                        }
                };

            // ==| Cloud upload |==========================================================
            // ==| Cloud download |========================================================

            // ==| Config dialog |=========================================================
            this.config = new class extends modalｰbutton {
                constructor () {
                        super ( "config" );
                        this.settings = new element ( "settings" );
                        }
                press ( event ) {
                        super.press ( event );
                        this.settings.elem.style.visibility = "visible";
                        neighborhood.resize ();
                        }
                };

            // ==| Mouse watch |===========================================================
            this.watch = new class extends element {
                constructor () {
                        super ( "position-watch" );
                        this.canvas = new canvas ( "position-canvas", "position-svg" );
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
                        this.dimensions = `${ game.width }, ${ game.height }`;
                        this.position = `${ i },${ j }`;
                        }
                };

            this.ⴵ = { move: null, resize: null }; // timers for mouse move and resize throttling
            this.comments = footer.add ( "comments" );
            this.comments.innerHTML = "approximative hexagonal and triangular coordinates:<br />click leftmost / topmost vertex to toggle";
            this.playing = null;
            // end of game constructor
            }
    // ==| Mouse events |===========================================================
    pos ( event ) { // return grid coordinates from where the event occurred
            // [ w, h ] are the size of individual tiling patterns;
            // remember that a hexagonal cell is the leftmost 2/3 of that pattern
            // and a triangle cell is half of that pattern
            const { width: w, height: h } = cell;

            // TODO: change names of xꕑ, yꕑ for better names !!!
            // Refer to geometry consideration at the top of this file to understand how square tiles map to other type of tiles
            switch ( tesselation.tiling ) {
                case hexagon: {
                    // grid-based coordinates, refer to top of file diagram
                    const [ x, y ] = [ 2 * ( event.clientX - this.canvas.pos.left ) / w, ( event.clientY - this.canvas.pos.top ) / h ];
                    const [ i, j ] = [ ᒪｘᒧ ( x ), ᒪｘᒧ ( y ) ];
                    // We bring x,y coordinates into the square cell i,j; i.e. (x,y) ∈ ⟦0,1⟧²
                    // and, as we only need 3x and 2y in our formulas, we scale them accordingly
                    const [ xꕑ, yꕑ ] = [ 3 * ( x - i ), 2 * ( y - j ) ];
                    // For cells in even columns, we must test where we are in the leftmost third
                    if ( evenʔ̣ ( i ) ) {
                        // if we are left of the diagonal going from middle left up to top left third,
                        // i.e. yꕑ < 1 - xꕑ, we are hexagonal cell in i-1,j-1:
                        if ( yꕑ < 1 - xꕑ ) return [ i - 1, j - 1 ];
                        // if we are left of the diagonal going from middle left down to bottom left third,
                        // i.e. yꕑ > 1 + xꕑ, we are in hexagonal cell i-1,j:
                        if ( yꕑ > xꕑ + 1 ) return [ i - 1, j ];
                        // otherwise we are in hexagonal cell i,j:
                        return [ i, j ];
                        }
                    // From here on, i is odd
                    // and we must test whether we are in the bottom right or not;
                    // if we are in the top half of square cell i,j (i.e. yꕑ < 1), we test whether we are left
                    // or right of the diagonal going from top left to the third of the horizontal middle line;
                    // if we are left (i.e. xꕑ < yꕑ), we are in hexagonal cell i-1,j, otherwise in i,j-1:
                    if ( yꕑ < 1 ) return yꕑ < xꕑ ? [ i, j - 1 ] : [ i - 1, j ];
                    // otherwise, yꕑ > 1 and we are in the bottom half of square cell i,j and we test whether we
                    // are left or right of the diagonal from bottom left to the third of the horizontal middle line;
                    // if we are left (i.e. yꕑ < 2 - xꕑ), we are in hexagonal cell i-1,j, otherwise in i,j:
                    if ( yꕑ < 2 - xꕑ ) return [ i - 1, j ];
                    return [ i, j ];
                    }
                case square: { // this is the nominal case
                    const [ x, y ] = [ ( event.clientX - this.canvas.pos.left ) / w, ( event.clientY - this.canvas.pos.top ) / h ];
                    const [ i, j ] = [ ᒪｘᒧ ( x ), ᒪｘᒧ ( y ) ];
                    return [ i, j ];
                    }
                case triangle: {
                    // we bring x,y coordinates into the square cell i,j; i.e. (x,y) ∈ ⟦0,1⟧²
                    const [ x, y ] = [ 2 * ( event.clientX - this.canvas.pos.left ) / w, 2 * ( event.clientY - this.canvas.pos.top ) / h ];
                    const [ i, j ] = [ ᒪｘᒧ ( x ), ᒪｘᒧ ( y ) ];
                    const [ xꕑ, yꕑ ] = [ x - i, y - j ];
                    // Depending on whether i and j are of the same parity, we test where xꕑ,yꕑ is with respect to the square diagonal:
                    // For i and j of the same parity, the diagonal goes from top left to bottom right,
                    // and if (xꕑ,yꕑ) is above it (i.e. xꕑ > yꕑ), it is in the triangle i,j-1 instead of i,j when below that diagonal.
                    // For i and j of opposite parities, the diagonal goes bottom left to top right
                    // and if (xꕑ,yꕑ) is above it (i.e. xꕑ + yꕑ < 1), we are in triangle i, j- 1 instead of i,j when below the diagonal.
                    return [ i, evenʔ̣ ( i + j ) ? yꕑ > xꕑ ? j : j - 1 : xꕑ + yꕑ > 1 ? j : j - 1 ];
                    }
                default:
                    throw TypeError ( `Invalid game tiling type: ${ tesselation.tiling }` );
                }
            // end of pos method
            }
    click ( event ) { // toggle state of clicked cell
            const [ x, y ] = this.pos ( event );
            const { trail, grid } = config.data;
            const color = aliveʔ̣ ( x, y ) ?
                ( chokeǃ ( x, y ), trail.visible ? trail.color : "transparent" ) :
                ( breedǃ ( x, y ), grid.live );
            this.canvas.drawｰcell ( x, y, color );
            log ( `toggled ${ x },${ y }` );
            }
    dblclick ( event ) {
            const { width: w, height: h } = cell; // size of cells
            const [ i, j ] = this.pos ( event ); // <= this does not work currently
            const [ x, y ] = [ ( event.clientX - this.canvas.pos.left ) / w, ( event.clientY - this.canvas.pos.top ) / h ]; // <= this works  and maps to rectangular mapping
            log ( `⌖ cell-xy: ${ x.toFixed ( 2 ) },${ y.toFixed ( 2 ) } — grid-xy: ${ i },${ j }` );
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
                    const { adjustｰdims, height, width } = cell; // cell dimensions in pixels
                    const { canvas } = this;
                    const pw = 1 / cell.scale; // pen width
                    // force the canvas to a small size to let CSS flex box resize other elements first
                    canvas.height = 1; canvas.width = 1;
                    // now get the dimensions of the enclosing fieldset, and compute canvas size based on these
                    // TODO move this out of the function, as it is a live view… no need to refetch it. !!
                    const cs = window.getComputedStyle ( this.elem, null );
                    const px = x => integerǃ ( x );
                    let h = ᒪｘꓹｓᒧ ( px ( cs.height ) - px ( cs.paddingTop ) - px ( cs.paddingBottom ) - px ( cs.marginTop ) - px ( cs.marginBottom ), height );
                    let w = ᒪｘꓹｓᒧ ( px ( cs.width ) - px ( cs.paddingLeft ) - px ( cs.paddingRight ), width );
                    h += pw;
                    w += pw;
                    [ w, h ] = adjustｰdims ( w, h );
                    neighborhood.resize ();

                    window.requestAnimationFrame ( () => { // defer real resizing/redrawing of the canvas after the CSS flex box has redrawn boundaries
                            canvas.width = w;
                            canvas.height = h;
                            config.data.geometry.height = this.height;
                            config.data.geometry.width = this.width;
                            config.store ();
                            // fake mouse movement to force display of coordinates.
                            this.move ( { clientX: this.canvas.pos.left, clientY: this.canvas.pos.top } );
                            this.redraw ( false );
                            } );
                    } );
            }
    // ==| Accessors |==============================================================
    // return height and width as a number of cells:
    get height () { return ᑕｘꔷᑐ ( ( tesselation.tiling === triangle ? 2 : 1 ) * this.canvas.height / cell.height ); }
    get width () { return ᑕｘꔷᑐ ( ( tesselation.tiling === square ? 1 : 2 ) * this.canvas.width / cell.width ); }
    // get height () { return ᒪｘᒧ ( ( tesselation.tiling === triangle ? 2 : 1 ) * this.canvas.height / cell.height ); }
    // get width () { return ᒪｘᒧ ( ( tesselation.tiling === square ? 1 : 2 ) * this.canvas.width / cell.width ); }
    // ==| Drawing |================================================================
    redraw ( cycle = false ) {
            // handle trail first if it is visible
            // write previous canvas picture with greater alpha
            if ( config.data.trail.visible ) this.canvas.alpha = config.data.trail.alpha;
            else this.canvas.clear ();
            const { trail, grid } = config.data;
            const bearing = grid.live;
            const burying = trail.visible ? trail.color : "transparent";
            // overwrite current state cells with trail colors and paint (new) state cells in live colors
            if ( cycle ) cycleǃ ( this.canvas.draw ( burying ), this.canvas.draw ( bearing ) );
            else sweepǃ ( this.canvas.draw ( burying ), this.canvas.draw ( bearing ) );
            }
    };

export default class eternalｰview {
    /**
     * The eternalｰview is data-less. It operates on singleton objects (game, config, defaults…).
     * Hence, multiple instances present no issue (they share prototype anyway).
     */
    constructor () {
            // set values of control knobs
            speed.init = config.data.speed.value;

            colors.grid.init = config.data.grid.color;
            colors.live.init = config.data.grid.live;
            colors.trail.init = config.data.trail.color;
            colors.alpha.init = config.data.trail.alpha;

            stitching.bottom.init = config.data.geometry.bottom;
            stitching.left.init = config.data.geometry.left;
            stitching.right.init = config.data.geometry.right;
            stitching.top.init = config.data.geometry.top;

            neighborhood.vicinity.init = config.data.rules.neighborhood.vicinity;
            neighborhood.range.init = config.data.rules.neighborhood.range;

            rules.born.display ( config.data.rules.born );
            rules.mutate.display ( config.data.rules.mutate );
            rules.survive.display ( config.data.rules.survive );
            rules.probability.value = config.data.rules.probability;
            }

    run () {
            if ( Ǝʔ̣ ( undefinedʔ̣ ) ( aliveʔ̣, breedǃ, chokeǃ, clearǃ, cycleǃ, shakeǃ, sweepǃ, neighborhoods ) ) throw "Cannot run: missing model functions";
            // Trigger redrawing.
            zoom.value = config.data.zoom.value;
            tesselation.tiling = config.data.grid.tiling;
            grid.visible = config.data.grid.visible;
            trail.visible = config.data.trail.visible;
            }
    // Allow configuration to be passed to other modules
    get config () { return config; }

    // Import neighborhood computation functions into the view:
    set vicinities ( vicinities ) { neighborhoods = vicinities; }

    // Import state manipulation functions into the view:
    set model ( functions ) { ( { area, aliveʔ̣, breedǃ, chokeǃ, clearǃ, cycleǃ, shakeǃ, sweepǃ } = functions ); }

    log ( ...args ) { log ( ...args ); }
    }

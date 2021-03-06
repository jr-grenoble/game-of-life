/**
 * Configuration handling for eternal life game
 *
 * We store configuration in local storage, using JSON format.
 * Instead of storing individual values, we bucket them together
 * so that the model can set and get its data in one go,
 * the view in another go, a.s.o.
 * @module eternalｰconfig.js
 */

// ==| Utilities |=============================================================
// All these utilities function should move eventually to a common utilities
// include file. Probably a single file would do, although it could become
// quite large.

// ==| Coordinates handling |==================================================
// Handling (coordinate) pairs (i.e. an array of two numbers) is common,
// here are a few utility functions to do so.
// Packing utilities assume that coordinates are unsigned and do not exceed 65535.

const coordｰutilities = { // Functions that manipulate coordinates (unsigned 16-bit integers)

    // Compare two pairs
    pairꘌʔ̣: ( [ x, y ], [ xᐟ, yᐟ ] ) => x === xᐟ && y === yᐟ,

    // Turn x and y coordinates into a pair (array)
    // eslint-disable-next-line no-bitwise
    pairǃ: ( x, y ) => [ x, y ],

    // Pack an [x,y] coordinates pair into a unique hash index, suitable for sets
    // eslint-disable-next-line no-bitwise
    pairｰᗒindex: ( [ x, y ] ) => ( x & 0xffff ) << 16 | y & 0xffff,

    // Unpack index into each coordinate separately
    // eslint-disable-next-line no-bitwise
    indexｰᗒx: index => index >>> 16,
    // eslint-disable-next-line no-bitwise
    indexｰᗒy: index => index & 0xffff,

    // Unpack index into a pair of coordinates
    indexｰᗒpair: index => [ indexｰᗒx ( index ), indexｰᗒy ( index ) ],

    // Shift a pair of coordinates by x and y
    shiftｰpair: ( x, y ) => ( [ i, j ] ) => [ x + i, y + j ],

    };
const { indexｰᗒx, indexｰᗒy } = coordｰutilities;

// ==| Functional programming |================================================
// FP is a powerful concept. These utilities allow you to create new functions.

class binder { constructor ( n ) { this.index = n; } static typeʔ̣ ( obj ) { return obj instanceof binder; } }
const functionalｰutilities = { // Functional programming utilities

    // Apply a boolean test to a sequence of parameters.
    // ᗄʔ̣ ( test ) ( ...sequence ) returns true only if all elements in the sequence test true
    // Ǝʔ̣ ( test ) ( ...sequence ) returns true if any of the element of the sequence tests true
    //
    // Note that all the elements of the sequence are evaluated, hence all side effects
    // apply. If you do not want this behavior, use native [].every or [].some.
    ᗄʔ̣: test => ( ...a ) => a.every ( test ),
    Ǝʔ̣: test => ( ...a ) => a.some ( test ),

    // Placeholder argument, used by bindǃ and partialǃ (see these functions)
    ʔ̣: new binder ( "ʔ̣" ),

    // Rest of arguments, used by bindǃ and partialǃ (see these functions)
    ⵈ: new binder ( "ⵈ" ),

    // Positional argument, used by bindǃ and partialǃ (see these functions)
    argǃ: n => new binder ( n ),

    // Bind a method to an object, producing a regular function that can be called out of context.
    // The method can either be a string or the real method, allowing both
    // bindǃ ( this, "method" ) and bindǃ ( this, this.method )
    //
    // Note that, to make its first two parameters stand out, bindǃ is called as:
    //      newfunc = bindǃ ( object, method ) ( arg1, arg2, … );
    // This means that if there are no parameters to bind, the function must be called like this:
    //      newfunc = bindǃ ( object, method ) ();
    //
    // This function accepts the same partial argument application as partialǃ (see it for details).
    // //   E.g. if:
    // const obj = {
    //      state: 0,
    //      name: "obj",
    //      clear () { this.state = 0; },
    //      status: ( msg, value ) => `${this.name}[${++this.state}] ${msg}: ${value}`
    //      };
    //
    // //   One can define:
    // const raz = bindǃ ( obj, "clear" ) ();     // prefer binding non arrow methods by name
    // const hhgg = bindǃ ( obj, obj.status ) ( ʔ̣, 42 );  // hhgg takes only one parameter
    // //   Then, use these functions as follows:
    // hhgg ( "The answer to your question is" ); // => "obj[1] The answer to your question is: 42"
    // hhgg ( "What was the question?" );         // => "obj[2] What was the question?: 42"
    // raz();                                     // => undefined
    // hhgg ( "Beware of non arrow methods" );    // => "obj[1] Beware of non arrow functions: 42"
    //
    // Note that arrow methods have their this tied to lexical scope contrary to regular methods.
    // //   This means that if you create and call a function like this:
    // const razforfun = bindǃ (someobject, obj.clear ) (); razforfun ();
    // //   You'll just have created the property "state" in someobject, and set it to 0…
    bindǃ: ( obj, method ) => ( ...args ) => {
            // When method is a string, get the corresponding method from obj.
            if ( stringʔ̣ ( method ) ) [ method ] = obj;

            // If no partial application, just return the bound method:
            if ( ! args.some ( arg => binder.typeʔ̣ ( arg ) ) ) return method.bind ( obj, ...args );

            // Otherwise, return a function that accepts any number of arguments (newｰargs):
            return ( ...newｰargs ) => {
                    let next = 0;

                    // we must merge the initial args (when bindǃ was called) with the newｰargs passed
                    // to the bound function. We place these in mergedｰargs
                    const mergedｰargs = [], ⵈⵈ = new binder ();

                    // for each arg passed into bindǃ (not to be confused with the new arguments!)
                    args.forEach ( arg => {
                            // detect placeholders, rest and positional args
                            if ( binder.typeʔ̣ ( arg ) ) switch ( arg ) {
                                // we will handle rest at end, just insert a special ⵈⵈ in the mergedｰargs
                                case ⵈ: mergedｰargs.push ( ⵈⵈ ); break;
                                // fetch argument from newｰargs, in sequential order
                                case ʔ̣: mergedｰargs.push ( newｰargs [ next++ ] ); break;
                                // fetch argument from newｰargs, by index position
                                default: mergedｰargs.push ( newｰargs [ arg.index ] );
                                }
                            // insert regular arguments from the initial call to bindǃ, in sequential order
                            else mergedｰargs.push ( arg );
                            }
                        );

                    // Now, we replace the special ⵈⵈ sign by the rest of the newｰargs
                    // (i.e. those of them that were not used as positional parameters ʔ̣)
                    for (
                        newｰargs = newｰargs.slice ( next );
                        -1 !== ( next = mergedｰargs.findIndex ( arg => arg === ⵈⵈ ) );
                        mergedｰargs.splice ( next, 1, ...newｰargs )
                        );
                    // And finally we can apply our initial method to these merged arguments
                    return method.apply ( obj, mergedｰargs );
                    };
            },

    // Compose functions, e.g. composeǃ ( e, f, g ) ( args ) is the same as g ( f ( e ( args ) ) )
    composeǃ: ( ...functions ) => args => functions.reduceRight ( ( arg, fn ) => fn ( arg ), args ),

    // Curry a non variadic function, i.e. a function with a fixed number of arguments
    // and without optional arguments (the signature of the function)
    // This produces a complete set of partial application functions. For instance if:
    // f3 = ( x, y, z ) => x * y + z;
    // //   and if we define:
    // f = curryǃ ( f3 )
    // //   then the following holds true, whatever x, y, z:
    // f3 ( x, y, z ) === f ( x ) ( y ) ( z ) &&
    // f3 ( x, y, z ) === f ( x ) ( y , z ) &&
    // f3 ( x, y, z ) === f ( x, y ) ( z ) &&
    // f3 ( x, y, z ) === f ( x, y, z );
    //
    curryǃ ( fn ) { return ( ...args ) => args.length >= fn.length ? fn ( ...args ) : curryǃ ( fn.bind ( null, ...args ) ); },

    // Test whether objects are all functions
    functionʔ̣: f => typeof f === "function",

    // Identity function
    identityǃ: x => x,

    // Partial application of parameters, using ʔ̣, ⵈ, and argǃ to identify special arguments.
    // The partialǃ function operates the same as bindǃ except that it takes a function argument
    // as opposed to an object and a method.
    // Here are a few examples:
    // g = partialǃ ( f ) ( ʔ̣, 3 );
    //      → g = x => f( x, 3 ); // extra args are ignored
    // g = partialǃ ( f ) ( ʔ̣, 3, ⵈ );
    //      → g = ( x, ...args ) => f( x, 3, ...args );
    // g = partialǃ ( f ) ( ʔ̣, 3, ʔ̣ );
    //      → g = ( x, y ) => f( x, 3, y ); // extra args ignored
    // g = partialǃ ( f ) ( argǃ ( 1 ), 3, argǃ ( 0 ) );
    //      → g = ( x, y ) => f( y, 3, x ); // extra args ignored
    // g = partialǃ ( f ) ( ʔ̣, ⵈ, argǃ ( 1 ), 7, ⵈ, ʔ̣, 42, argǃ ( 0 ) );
    //      → g = ( x, y, ...args ) => f ( x, ...args, y, 7, ...args, y, 42, x );
    //
    // As can be inferred from the examples above, placeholder arguments (ʔ̣)
    // correspond in strict order to the parameters passed to the bound function.
    // Rest arguments (ⵈ) correspond to all the other parameters (those that placeholders don't eat up).
    // argǃ positional parameters allow reordering of parameters, but do not interfere with rest (ⵈ)
    // nor with placeholders (ʔ̣).
    //
    // Note that arrow functions are at least as convenient as partialǃ application. However,
    // partial application can be generated, while the corresponding arrow function syntax cannot.
    partialǃ: func => ( ...args ) => bindǃ ( null, func, ...args ),

    // Pipe functions, e.g. pipeǃ ( e, f, g ) ( args ) is the same as e ( f ( g ( args ) ) )
    pipeǃ: ( ...functions ) => args => functions.reduce ( ( arg, fn ) => fn ( arg ), args ),

    // Virtual function placeholder, to be used to make sure a function never gets called
    virtualⵢ () { throw TypeError ( "Invalid call to virtual function!" ); },

    // end of functionalｰutilities
    };
const { ʔ̣, ⵈ, bindǃ, curryǃ } = functionalｰutilities;

// ==| General purpose utilities |=============================================
// These utilities are used all over the place. Some of them naturally belong
// to other utilities, but are so frequent they appear here.

const generalｰutilities = { // Standard object and function manipulation

    // Reexports:
    ᗄʔ̣: functionalｰutilities.ᗄʔ̣,
    Ǝʔ̣: functionalｰutilities.Ǝʔ̣,
    functionʔ̣: functionalｰutilities.functionʔ̣,

    // Test whether an object is an array; use ᗄʔ̣ ( arrayʔ̣ ) to test multiple objects.
    // eslint-disable-next-line no-restricted-properties
    arrayʔ̣: Array.isArray,

    // Deep clone an object, ignoring function, symbol and undefined properties (only as good as JSON)
    cloneǃ: obj => JSON.parse ( JSON.stringify ( obj ) ),

    // Test whether variables are all defined; use undefinedʔ̣ to test the opposite.
    definedʔ̣: v => typeof v !== "undefined",

    // Prevent an object from being modified
    // eslint-disable-next-line no-restricted-properties
    freezeꔛ: Object.freeze,
    freezeｰtoｰcoreꔛ: obj => {
            if ( objectｰlikeʔ̣ ( obj ) ) propertiesǃ ( obj ).forEach ( prop => freezeｰtoｰcoreꔛ ( obj [ prop ] ) );
            return freezeꔛ ( obj );
            },

    // Convert a string to an integer, ignoring fractional part as well as extra characters
    // Examples:
    // integerǃ ( "3.1416px" ); // => 3
    // integerǃ ( "3.1416e4" ); // => 3
    // integerǃ ( 3.1416e4 );   // => 31416
    // integerǃ ( 3.1416e40 );  // => 3
    // eslint-disable-next-line no-restricted-properties
    integerǃ: str => Number.parseInt ( str, 10 ),

    // Yield an array of the keys of an object (or indexes of an array)
    // eslint-disable-next-line no-restricted-properties
    keysǃ: o => o.keys ? [ ...o.keys () ] : Object.keys ( o ),

    // Merge multiple object properties into the first object target.
    // Call as mergeꔛ ( target, ...sources );
    // eslint-disable-next-line no-restricted-properties
    mergeꔛ: Object.assign,

    // Test whether an object is null
    nullʔ̣: obj => obj === null,

    // Test whether an object is a number (excluding NaN) or NaN
    // eslint-disable-next-line no-restricted-properties
    numberʔ̣: n => "number" === typeof n && ! Number.isNaN ( n ),
    // eslint-disable-next-line no-restricted-properties
    ㄱnumberʔ̣: Number.isNaN,

    objectｰlikeʔ̣: obj => objectʔ̣ ( obj ) || typeof obj === "function",
    objectʔ̣: obj => ! nullʔ̣ ( obj ) && typeof obj === "object",

    // Create a new object with a shallow copy of the properties from the list of source objects
    // eslint-disable-next-line no-restricted-properties
    objectǃ: ( ...objects ) => Object.assign ( {}, ...objects ),

    // Test whether a property name or symbol is a direct property of an object.
    // Because the function is curried, one can call it with ᗄʔ̣ or Ǝʔ̣ for a specific object
    // as in Ǝʔ̣ ( propertyʔ̣ ( some-object ) ) ( property1, property2, … )
    // eslint-disable-next-line no-restricted-properties
    propertyʔ̣: curryǃ ( ( obj, prop ) => ( {} ).hasOwnProperty.call ( obj, prop ) ),

    // Define property/properties on objects
    // eslint-disable-next-line no-restricted-properties
    propertiesꔛ: Object.defineProperties,
    // eslint-disable-next-line no-restricted-properties
    propertyꔛ: Object.defineProperty,

    // Return all property names, including symbols and including non-enumerable properties;
    // use keysǃ for enumerable non symbol properties (or for…in if you want to go through inherited properties).
    // You can restrict to named or symbol properties by using propertyｰnamesǃ or propertyｰsymbolsǃ respectively.
    // eslint-disable-next-line no-restricted-properties
    propertiesǃ: obj => [ ...propertyｰnamesǃ ( obj ), ...propertyｰsymbolsǃ ( obj ) ],
    // eslint-disable-next-line no-restricted-properties
    propertyｰnamesǃ: Object.getOwnPropertyNames,
    // eslint-disable-next-line no-restricted-properties
    propertyｰsymbolsǃ: Object.getOwnPropertySymbols,

    // Test whether something is a string. Note that stringʔ̣ ( new String ( "a" ) ) returns false,
    // because new String returns an object, not a string litteral. Conversely, stringʔ̣ ( String ( "a" ) )
    // returns true, because String merely converts to a string litteral.
    stringʔ̣: s => typeof s === "string",

    // Test whether a variable is undefined; use definedʔ̣ to test the opposite.
    undefinedʔ̣: v => typeof v === "undefined",

    // Yield an array of the values contained in an object or array
    // eslint-disable-next-line no-restricted-properties
    valuesǃ: o => functionʔ̣ ( o.values ) ? [ ...o.values () ] : Object.values ( o ),

    // end of generalｰutilities
    };
const { cloneǃ, freezeꔛ, freezeｰtoｰcoreꔛ, functionʔ̣, keysǃ, mergeꔛ, nullʔ̣, objectʔ̣, objectｰlikeʔ̣, objectǃ, propertiesǃ, propertyｰnamesǃ, propertyｰsymbolsǃ, stringʔ̣ } = generalｰutilities;

// ==| Mathematical utilities |================================================
// Common math functions and constants

const mathｰutilities = { // Mathematical constants and functions

    // Reexports:
    integerǃ: generalｰutilities.integerǃ,
    numberʔ̣: generalｰutilities.numberʔ̣,
    ㄱnumberʔ̣: generalｰutilities.ㄱnumberʔ̣,

    // MATH infinity - always use +ထ and -ထ
    // eslint-disable-next-line no-restricted-syntax
    ထ: Infinity,

    // MATH number π
    // eslint-disable-next-line no-restricted-properties
    π: Math.PI,

    // MATH integer part of x
    // eslint-disable-next-line no-restricted-properties
    ᒪｘᒧ: x => Math.floor ( x ),

    // MATH rounding to nearest integer
    // eslint-disable-next-line no-restricted-properties
    ᑕｘꔷᑐ: x => Math.round ( x ),

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
    division: ( n, p ) => { const r = ( n % p + p ) % p; return [ ( n - r ) / p, r ]; },

    // MATH random
    randomǃ: () => Math.random (),

    };
const { ᒷᐧᒲ, ᒯᐧᒬ, rem3, rem } = mathｰutilities;

// ==| Configuration utilities |===============================================
// These rely on the localStorage object, available in browsers and server
// environments.
// Configuration is organized by buckets that are guaranteed to be unique;
// This means that if two modules access the same configuration bucket (same name),
// they actually share configuration.

const storage = localStorage;

// Configuration clients typically listen to configuration changes.
// They record their listenerｰid "channel" so that they can stop listening.
let listenerｰid = 0;

// All
const configurations = {};

class configuration {
    constructor ( bucket, defaults = {} ) {
            this.bucket = bucket;
            this.data = objectǃ ( cloneǃ ( defaults ), JSON.parse ( storage.getItem ( bucket ) ) );
            this.listeners = {};
            freezeꔛ ( this );
            }

    /**
     * `listen` registers a listener to the listeners list; listeners get called whenever the config changes.
     *
     * @param {Function} listener - a parameterless function to be called when stored configuration changes.
     * @returns id - a symbol that can be used to stop listening by calling `ignore`
     */
    listen ( listener ) { this.listeners [ ++listenerｰid ] = listener; return listenerｰid; }

    /**
     * `ignore` deregisters a listener from the configuration store.
     *
     * @param {Symbol} id - an identifier previously returned by the `listen` method.
     */
    ignore ( id ) { delete this.listeners [ id ]; }

    /**
     * `load` fetches the content of a bucket from local storage and fills the corresponding
     * singleton object with its values; default values can supplement what is retrieved
     * from local storage, but locally stored values have priority.
     *
     * The `store method` will write these values back to local storage.
     * @param {Object} [defaults] - default values that get overriden by stored values
     */
    load ( defaults = {} ) { mergeꔛ ( this.data, cloneǃ ( defaults ), JSON.parse ( storage.getItem ( this.bucket ) ) ); }

    /**
     * `defaults` adds default value to the configuration, without overwriting existing values,
     * and saves the result back to local storage.
     *
     * @param {Object} [defaults] - default values that get overriden by stored values
     */
    defaults ( defaults ) { storage.setItem ( this.bucket, JSON.stringify ( mergeꔛ ( this.data, cloneǃ ( defaults ), this.data ) ) ); }

    /**
     * `store` writes the content of a bucket to local storage. It takes its input from the
     * singleton object corresponding to the bucket and blends them with new attributes if present.
     * The new attributes override existing values in the bucket
     * @param {Object} [attributes] - new attributes that override existing values from the bucket
     */
    store ( attributes = {} ) {
            storage.setItem ( this.bucket, JSON.stringify ( mergeꔛ ( this.data, attributes ) ) );
            for ( const listener in this.listeners ) this.listeners [ listener ] ();
            }

    /**
     * `destructor` empties a bucket and also erases its content in local storage.
     * The corresponding configuration is no longer accessible
     */
    destructor () { storage.removeItem ( this.bucket ); delete configurations [ this.bucket ]; }
    }


export default class eternalｰconfig {
    // the constructor always returns the same singleton config, ensuring only one config can exist
    constructor ( bucket, defaults = {} ) {
            if ( bucket in configurations ) configurations [ bucket ].defaults ( defaults );
            else configurations [ bucket ] = new configuration ( bucket, defaults );
            return configurations [ bucket ];
            }

    // make common constants (enums) available
    static get effects () { return freezeꔛ ( { drop: "drop", top: "top", right: "right", bottom: "bottom", left: "left" } ); }
    static get tiles () { return freezeꔛ ( { hexagon: "hexagon", square: "square", triangle: "triangle" } ); }
    static get surroundings () { return freezeꔛ ( { moore: "Moore", vonｰneumann: "Von Neumann" } ); }
    static key ( enums, value ) { return keysǃ ( enums ).find ( key => enums [ key ] === value ); }

    // make common utilities available
    static get coordｰutilities () { return freezeꔛ ( coordｰutilities ); }
    static get functionalｰutilities () { return freezeꔛ ( functionalｰutilities ); }
    static get generalｰutilities () { return freezeꔛ ( generalｰutilities ); }
    static get mathｰutilities () { return freezeꔛ ( mathｰutilities ); }

    // end of config class
    }

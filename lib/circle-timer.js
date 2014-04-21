/**
 * Raphael extension to create a circle timer and execute a callback when it's finished.
 *
 * @param ms Length of time, in milliseconds, of the timer to run
 * @param options Options object. Current options properties include 'bgColor' and 'fgColor'
 * @param callback Function to execute when the timer reaches zero.
 * @constructor
 *
 * Options:
 *  bgColor: color of the timer circle background. defaults to #fff.
 *  fgColor: color of the timer circle foreground and ticker text. defaults to #fe9149.
 *  errorColor: color of the ticker when time runs out (and for the throb effect). defaults to #f8cfcf
 *  counterBgColor: background color for the ticker (middle of the circle). defaults to the container background color.
 *  includeText: whether or not to include the ticker countdown number text. defaults to true.
 *
 * Methods:
 *  constructor: specify the countdown time (in milliseconds), options (optional), and callback (optional). If no options
 *               are passed and the second parameter is a callback, it will be used as such.
 *  start: start the timer countdown.
 *  stop: stop the timer and clear it.
 *  ffwdToEnd: rapidly deplete the counter down to zero and show error color. Does not execute callback.
 */
Raphael.fn.CircleTimer = function(ms, options, callback) {

    // get a handle on the Raphael paper object
    var r = this;

    // default the options object if it wasn't passed in
    if(!options) {
        options = {};
    }

    // get the container holding this asset
    var container = r.canvas.parentNode;

    // handle to the Raphael animation objects
    var tickerAnimation, glowAnimation;

    // handle to the timer interval for updating the countdown text
    var textTimer;

    // handle to the timer interval for glowing the ticker after a certain period
    var glowTimer;

    // set up the parameters according to the settings provided
    var params = {
        'x' : r.width / 2,
        'y' : r.height / 2,
        'r' : r.width / 2,
        'bgColor' : options.bgColor || '#fff',
        'fgColor' : options.fgColor || '#fe9149',
        'errorColor' : options.errorColor || '#f8cfcf',
        'counterBgColor' : new ColorTools().getColor(container) || '#f1f1f1',
        'time' : ms || 0,
        'includeText' : typeof(options.includeText) != 'undefined' ? options.includeText : true
    };

    // function to see if something is a function.
    var isFunction = function(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    };

    // if the third param is just the callback and no options are passed, use it as the callback
    if(isFunction(options)) {
        callback = options;
    } else {
        if(!isFunction(callback)) {
            callback = function() {};
        }
    }

    // timer object to handle counting elapsed time, etc.
    this.timer = {
        startTime : 0,
        endTime : 0,
        running : false,

        start : function() {
            this.startTime = new Date().getTime();
            this.running = true;
        },

        stop : function() {
            this.endTime = new Date().getTime();
            this.running = false;
        },

        getElapsedTime : function() {
            if(this.running) {
                return new Date().getTime() - this.startTime;
            } else {
                return this.endTime - this.startTime;
            }
        }

    };

    // create the segment shape that represents "pie slice" of a certain size
    r.customAttributes.segment = function (x, y, r, a1, a2) {
        var flag = (a2 - a1) > 180,
            a1 = (a1 % 360) * Math.PI / 180;
        a2 = (a2 % 360) * Math.PI / 180;

        return {
            path: [
                ["M", x, y],
                ["l", r * Math.cos(a1), r * Math.sin(a1)],
                ["A", r, r, 0, +flag, 1, x + r * Math.cos(a2), y + r * Math.sin(a2)],
                ["z"]
            ],
            'fill': params.bgColor,
            'stroke-width': 0,
            'stroke': params.counterBgColor
        };
    };

    // create background circle
    var bgCircle = r.circle(params.x, params.y, params.r);
    bgCircle.attr({'fill':params.fgColor, 'stroke-width':0});

    // create foreground circle
    var fgCircle = r.circle(params.x, params.y, params.r - 20);
    fgCircle.attr({'fill':params.counterBgColor, 'stroke-width':0});

    // create the text to display
    var counterText = r.text(params.x, params.y, '');
    counterText.attr({'fill': params.fgColor, 'font-size': (params.r * 0.8), 'font-family': 'Trebuchet MS','font-weight': 'bold'});

    // create the ticker object
    var ticker = r.path().attr({
        segment: [params.x, params.y, params.r, -90, -90]
    });

    // bring foreground circle to the front
    fgCircle.toFront();

    // show the text or not
    if(params.includeText) {
        counterText.toFront();
    } else {
        counterText.hide();
    }

    this.start = function() {

        if (!this.timer.running) {
            // get var handle to current object for use in callbacks below
            var self = this;

            // set the counter text
            counterText.attr({'text':Math.ceil(params.time / 1000)});

            tickerAnimation = new Raphael.animation({
                    segment: [params.x, params.y, params.r, -90, 269]
                }, params.time, 'linear',
                function() {
                    self.stop();
                    bgCircle.attr({'fill': params.errorColor});
                    ticker.hide();
                    counterText.toBack();
                    setTimeout(callback, 0);
                }
            );

            glowAnimation = new Raphael.animation(
                {'fill': params.errorColor},
                250,
                'linear',
                function() {
                    this.animate(new Raphael.animation(
                        {'fill': params.bgColor},
                        250,
                        'linear',
                        doGlowAnimation
                    ));
                }
            );

            var doGlowAnimation = function() {
                ticker.animate(glowAnimation)
            };

            // start ticker animation
            ticker.animate(tickerAnimation);

            // set the glow (throb) animation to start 75% of the way through the animation
            glowTimer = setTimeout(doGlowAnimation, params.time * 0.75);

            // start the timer
            this.timer.start();

            // update the text on a timer that can be cleared
            textTimer = setInterval(function() {
                if(self.timer.running) {
                    counterText.attr({'text':Math.ceil((params.time - self.timer.getElapsedTime()) / 1000)});
                }
            }, 100);
        }
    };

    this.stop = function() {

        // clear any events in the timeout queue
        clearInterval(textTimer);
        clearInterval(glowTimer);

        // stop the animations attached to the objects
        ticker.stop(tickerAnimation);

        // stop the timer
        this.timer.stop();

        // remove the countdown text
        counterText.attr({'text': ''});

    };

    this.ffwdToEnd = function() {

        // get the current position on the circle of the segment
        var currentTickerPoint = ticker.attrs.segment[4];

        // create a new path that covers the rest from the current position to the beginning
        var tickerFillIn = r.path().attr({
            segment: [params.x, params.y, params.r, -90, currentTickerPoint+1], 'fill': params.errorColor
        });

        // pull the foreground circle to the front
        fgCircle.toFront();

        // stop the animations attached to objects
        ticker.stop(tickerAnimation);

        // clear the time out queue for the glow effect
        clearInterval(glowTimer);

        // animate the ticker to the end at a much faster rate. It's basically starting the animation from the current
        // position gathered above, and going to the end. That's why the other segment created above is needed.

        var ffwd = new Raphael.animation(
            {segment: [params.x, params.y, params.r, currentTickerPoint, 270]},
            500,
            'ease-in',
            function() {
                bgCircle.attr({'fill': params.errorColor});
                ticker.hide();
                tickerFillIn.hide();
            });

        // animate the fill
        tickerFillIn.animate(ffwd);


    };

    return this;

};

/**
 * Tools to determine background color (and things necessary in doing so)
 *
 * Copied from http://www.ruzee.com/blog/2006/07/retrieving-css-styles-via-javascript/
 * and http://stackoverflow.com/questions/9625505/reliable-way-to-get-background-color-of-an-element-in-a-consistent-format-across
 * and then encapsulated.
 */
var ColorTools = function() {

    function colorToHex(color) {
        if (color.substr(0, 1) === '#') { // IE
            if (color.length == 4) { // IE 7 & 8 return '#F00' instead of #FF0000
                return "#" +
                    color.charAt(1) + color.charAt(1) +
                    color.charAt(2) + color.charAt(2) +
                    color.charAt(3) + color.charAt(3);
            }
            return color;
        } else if (color.substr(0,3) === 'rgb') { // Non-IE
            var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);

            var red = parseInt(digits[2]);
            var green = parseInt(digits[3]);
            var blue = parseInt(digits[4]);

            var rgb = blue | (green << 8) | (red << 16);
            return digits[1] + '#' + rgb.toString(16);
        }
        return colourNameToHex(color); // if we have color name like 'red'
    }

    function colourNameToHex(colour) {

        var colours = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
            "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
            "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
            "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
            "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
            "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
            "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
            "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
            "honeydew":"#f0fff0","hotpink":"#ff69b4",
            "indianred ":"#cd5c5c","indigo ":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
            "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
            "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
            "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
            "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
            "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
            "navajowhite":"#ffdead","navy":"#000080",
            "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
            "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
            "red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
            "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
            "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
            "violet":"#ee82ee",
            "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
            "yellow":"#ffff00","yellowgreen":"#9acd32"};

        if (typeof colours[colour.toLowerCase()] != 'undefined')
            return colours[colour.toLowerCase()];

        return false;
    }

    function rzCC(s){
        for(var exp=/-([a-z])/; exp.test(s); s=s.replace(exp,RegExp.$1.toUpperCase()));
        return s;
    }

    function rzGetStyle(e,a){
        var v=null;
        if(document.defaultView && document.defaultView.getComputedStyle){
            var cs=document.defaultView.getComputedStyle(e,null);
            if(cs && cs.getPropertyValue) v=cs.getPropertyValue(a);
        }
        if(!v && e.currentStyle) v=e.currentStyle[rzCC(a)];
        return v;
    }

    function rzGetBgColor(e){
        var v=rzGetStyle(e,'background-color');
        while (!v || v=='transparent' || v=='#000000' || v=='rgba(0, 0, 0, 0)'){
            if(e==document.body) v='#fff'; else {
                e=e.parentNode;
                v=rzGetStyle(e,'background-color');
            }
        }
        return colorToHex(v);
    }

    this.getColor = function(e) {
        return rzGetBgColor(e);
    }
};

// jquery plugin setup
(function( $ ) {

    $.fn.CircleTimer = function(ms, options, callback) {

        var raphaelObjects = [];

        this.each(function() {
            var $this = $(this);
            raphaelObjects.push(Raphael(this, $this.width(), $this.height()).CircleTimer(ms, options, callback));
        });

        // if only one object, return it; otherwise, return an array of objects
        return raphaelObjects.length == 1 ? raphaelObjects.pop() : raphaelObjects;
    }
})( jQuery );
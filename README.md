CircleTimer
===========

Raphael extension to create a circle timer and execute a callback when it's finished.

![Alt text](/example/screenshot.png?raw=true)

```javascript
  CircleTimer(timeInMs, optionsObject, callback);
```

Basic usage (with jQuery as a jQuery plugin):
```javascript
$('#timer').CircleTimer(10000, 
  function() {
    alert('done!');
  }
).start();
```


Options:
 *  **bgColor**: color of the timer circle background. defaults to #fff.
 *  **fgColor**: color of the timer circle foreground and ticker text. defaults to #fe9149.
 *  **errorColor**: color of the ticker when time runs out (and for the throb effect). defaults to #f8cfcf
 *  **counterBgColor**: background color for the ticker (middle of the circle). defaults to the container background color.
 *  **includeText**: whether or not to include the ticker countdown number text. defaults to true.
  
Methods:
 *  **constructor**: specify the countdown time (in milliseconds), options (optional), and callback (optional). If no options are passed and the second parameter is a callback, it will be used as such.
 *  **start()**: start the timer countdown.
 *  **stop()**: stop the timer and clear it.
 *  **ffwdToEnd()**: rapidly deplete the counter down to zero and show error color. Does not execute callback. 

# libxdo
Node.js wrapper to use [libxdo/xdotool](https://github.com/jordansissel/xdotool).

fake keyboard/mouse input, window management, and more using X11’s XTEST extension and other Xlib functions

## This project is NOT mantained anymore!

This library is still incomplete. Unfortunaly, I don't have time for this project anymore.

**If someone wants to take over the project, I'm happy to give them the appropriate permissions to the repository.**


# Example
```node
'use strict';

// nvm use lts/*
// node .

//-----------------------------------------------------------------------------
// EXAMPLE IN C   ( gcc -lxdo example.c )
//-----------------------------------------------------------------------------
// #include <xdo.h>
//
// void main() {
//   xdo_t *xdo = xdo_new(NULL);
//   //xdo_send_keysequence_window(xdo, CURRENTWINDOW, "Ctrl+Q", 0);
//   xdo_enter_text_window(xdo, CURRENTWINDOW, "Hello @!", 500*1000);
//   xdo_free(xdo);
// }
//-----------------------------------------------------------------------------


//---------------------------------------------------------
// EXAMPLE VERSION 1
//---------------------------------------------------------

// const libxdo = require('./libxdo.js');

// let xdo = libxdo.xdo_new(null);
// if (xdo.isNull()) { console.log("Oh no! Couldn't create object!"); return -1; }
// //libxdo.xdo_send_keysequence_window(xdo, libxdo.CURRENTWINDOW, "Ctrl+Q", 0);
// libxdo.xdo_enter_text_window(xdo, libxdo.CURRENTWINDOW, "Hello @!", 500*1000);
// libxdo.xdo_free(xdo);


//---------------------------------------------------------
// EXAMPLE VERSION 2   ( a little bit more C feeling )
//---------------------------------------------------------

const {
  xdo_new,
  xdo_enter_text_window,
  //xdo_send_keysequence_window,
  xdo_free,
  CURRENTWINDOW
} = require('libxdo');

let xdo = xdo_new(null);
if (xdo.isNull()) { console.log("Oh no! Couldn't create object!"); return -1; }
//xdo_send_keysequence_window(xdo, CURRENTWINDOW, "Ctrl+Q", 0);
xdo_enter_text_window(xdo, CURRENTWINDOW, "Hello @!", 500*1000);
xdo_free(xdo);
```


# Contribution and Inspirations
- [https://github.com/jordansissel/xdotool](https://github.com/jordansissel/xdotool)
- [https://github.com/jordansissel/xdotool/blob/master/xdo.h](https://github.com/jordansissel/xdotool/blob/master/xdo.h)   <-- sourced from here
- [https://github.com/node-ffi/node-ffi/wiki/Node-FFI-Tutorial#common-usage](https://github.com/node-ffi/node-ffi/wiki/Node-FFI-Tutorial#common-usage)
- [https://stackabuse.com/how-to-create-c-cpp-addons-in-node/](https://stackabuse.com/how-to-create-c-cpp-addons-in-node/)

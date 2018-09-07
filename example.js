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
} = require('./index.js');

let xdo = xdo_new(null);
if (xdo.isNull()) { console.log("Oh no! Couldn't create object!"); return -1; }
//xdo_send_keysequence_window(xdo, CURRENTWINDOW, "Ctrl+Q", 0);
xdo_enter_text_window(xdo, CURRENTWINDOW, "Hello @!", 500*1000);
xdo_free(xdo);

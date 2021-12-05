//'use strict';

// nvm use lts/*

// Contribution and Inspirations
// https://github.com/jordansissel/xdotool
// https://github.com/jordansissel/xdotool/blob/master/xdo.h   <-- sourced from here
// https://github.com/node-ffi/node-ffi/wiki/Node-FFI-Tutorial#common-usage
// https://stackabuse.com/how-to-create-c-cpp-addons-in-node/


const ref       = require('ref-napi');
//const CString   = ref.types.CString;
const Struct    = require('ref-struct-di')(ref);
//const ArrayType = require('ref-array');
const ffi       = require('ffi-napi');

/**
 * @mainpage
 *
 * libxdo helps you send fake mouse and keyboard input, search for windows,
 * perform various window management tasks such as desktop changes, window
 * movement, etc.
 *
 * For examples on libxdo usage, the xdotool source code is a good reference.
 *
 * @see xdo_new
 */


// +++++++++++++++++++++++++++++++++++++++
//         CONSTS AND STRUCTS
// +++++++++++++++++++++++++++++++++++++++

/**
 * When issuing a window size change, giving this flag will make the size
 * change be relative to the size hints of the window.  For terminals, this
 * generally means that the window size will be relative to the font size,
 * allowing you to change window sizes based on character rows and columns
 * instead of pixels.
 */
const SIZE_USEHINTS   = (1 << 0);
const SIZE_USEHINTS_X = (1 << 1);
const SIZE_USEHINTS_Y = (1 << 2);

/**
 * CURRENTWINDOW is a special identify for xdo input faking (mouse and
 * keyboard) functions like xdo_send_keysequence_window that indicate we should target the
 * current window, not a specific window.
 *
 * Generally, this means we will use XTEST instead of XSendEvent when sending
 * events.
 */
const CURRENTWINDOW = (0);

/**
 * @internal
 * Map character to whatever information we need to be able to send
 * this key (keycode, modifiers, group, etc)
 */
const struct_charcodemap_t = Struct({
  'key'           : 'char', // wchar_t
  'code'          : 'char', // KeyCode
  'symbol'        : 'char', // KeySym
  'group'         : 'int',
  'modmask'       : 'int',
  'needs_binding' : 'int',
});
const p_struct_charcodemap_t = ref.refType(struct_charcodemap_t);

//typedef enum {
//  XDO_FEATURE_XTEST, /** Is XTest available? */
//} XDO_FEATURES;

/**
 * The main context.
 */
const struct_xdo_t = Struct({
  
  /** The Display for Xlib */
  'xdpy'                     : ref.refType('int'), // Display*

  /** The display name, if any. NULL if not specified. */
  'display_name'             : 'char *',
  
  /** @internal Array of known keys/characters */
  'charcodes'                : p_struct_charcodemap_t,

  /** @internal Length of charcodes array */
  'charcodes_len'            : 'int',

  /** @internal highest keycode value */
  'keycode_high'             : 'int',

  /** @internal lowest keycode value */
  'keycode_low'              : 'int',

  /** @internal number of keysyms per keycode */
  'keysyms_per_keycode'      : 'int',

  /** Should we close the display when calling xdo_free? */
  'close_display_when_freed' : 'int',

  /** Be extra quiet? (omits some error/message output) */
  'quiet'                    : 'int',

  /** Enable debug output? */
  'debug'                    : 'int',

  /** Feature flags, such as XDO_FEATURE_XTEST, etc... */
  'features_mask'            : 'int',
});
const p_struct_xdo_t = ref.refType(struct_xdo_t);


/**
 * Search only window title. DEPRECATED - Use SEARCH_NAME
 * @see xdo_search_windows
 */
const SEARCH_TITLE       = (1 << 0);

/**
 * Search only window class.
 * @see xdo_search_windows
 */
const SEARCH_CLASS       = (1 << 1);

/**
 * Search only window name.
 * @see xdo_search_windows
 */
const SEARCH_NAME        = (1 << 2);

/**
 * Search only window pid.
 * @see xdo_search_windows
 */
const SEARCH_PID         = (1 << 3);

/**
 * Search only visible windows.
 * @see xdo_search_windows
 */
const SEARCH_ONLYVISIBLE = (1 << 4);

/**
 * Search only a specific screen. 
 * @see xdo_search.screen
 * @see xdo_search_windows
 */
const SEARCH_SCREEN      = (1 << 5);

/**
 * Search only window class name.
 * @see xdo_search
 */
const SEARCH_CLASSNAME   = (1 << 6);

/**
 * Search a specific desktop
 * @see xdo_search.screen
 * @see xdo_search_windows
 */
const SEARCH_DESKTOP     = (1 << 7);


/**
 * The window search query structure.
 *
 * @see xdo_search_windows
 */
const struct_xdo_search_t = Struct({
  
  /** pattern to test against a window title */
  'title'        : 'string', // const char *

  /** pattern to test against a window class */
  'winclass'     : 'string', // const char *
  
  /** pattern to test against a window class */
  'winclassname' : 'string', // const char *

  /** pattern to test against a window name */
  'winname'      : 'string', // const char *

  /** window pid (From window atom _NET_WM_PID) */
  'pid'          : 'int',

  /** depth of search. 1 means only toplevel windows */
  'max_depth'    : 'long',

  /** boolean; set true to search only visible windows */
  'only_visible' : 'int',

  /** what screen to search, if any. If none given, search all screens */
  'screen'       : 'int',
});
const p_struct_xdo_search_t = ref.refType(struct_xdo_search_t);

const XDO_ERROR   = 1;
const XDO_SUCCESS = 0;

// For xdo_wait_for_window_size param to_or_from
const SIZE_TO   = 0;
const SIZE_FROM = 1;

// For xdo_window_state param action
const _NET_WM_STATE_REMOVE = 0;  // remove/unset property
const _NET_WM_STATE_ADD    = 1;  // add/set property
const _NET_WM_STATE_TOGGLE = 2;  // toggle property

// For xdo_find_window_client param direction
/**
 * Find a client window that is a parent of the window given
 */
const XDO_FIND_PARENTS  = (0);
/**
 * Find a client window that is a child of the window given
 */
const XDO_FIND_CHILDREN = (1);



// +++++++++++++++++++++++++++++++++++++++
//         FUNCTION DEFINITION
// +++++++++++++++++++++++++++++++++++++++

module.exports = ffi.Library('libxdo', {

  /**
   * Create a new xdo_t instance.
   *
   * @param display the string display name, such as ":0". If null, uses the
   * environment variable DISPLAY just like XOpenDisplay(NULL).
   *
   * @return Pointer to a new xdo_t or NULL on failure
   */
  'xdo_new' : [ p_struct_xdo_t, [ 
      'string',  // const char *display
  ] ],

  /**
   * Create a new xdo_t instance with an existing X11 Display instance.
   *
   * @param xdpy the Display pointer given by a previous XOpenDisplay()
   * @param display the string display name
   * @param close_display_when_freed If true, we will close the display when
   * xdo_free is called. Otherwise, we leave it open.
   */
  'xdo_new_with_opened_display' : [ p_struct_xdo_t , [ 
      ref.refType('int'),  // Display *xdpy
      'string',            // const char *display
      'int',               // int close_display_when_freed
  ] ],

  /**
   * Return a string representing the version of this library
   */
  'xdo_version' : [ 'string' /* const char* */, [ /* void */ ] ],

  /**
   * Free and destroy an xdo_t instance.
   *
   * If close_display_when_freed is set, then we will also close the Display.
   */
  'xdo_free' : [ 'void', [ 
      p_struct_xdo_t,  // xdo_t *xdo
  ] ],

  /**
   * Move the mouse to a specific location.
   *
   * @param x the target X coordinate on the screen in pixels.
   * @param y the target Y coordinate on the screen in pixels.
   * @param screen the screen (number) you want to move on.
   */
  'xdo_move_mouse' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int x
      'int',           // int y
      'int',           // int screen
  ] ],

  /**
   * Move the mouse to a specific location relative to the top-left corner
   * of a window.
   *
   * @param x the target X coordinate on the screen in pixels.
   * @param y the target Y coordinate on the screen in pixels.
   */
  'xdo_move_mouse_relative_to_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // int x
      'int',           // int y
  ] ],

  /**
   * Move the mouse relative to it's current position.
   *
   * @param x the distance in pixels to move on the X axis.
   * @param y the distance in pixels to move on the Y axis.
   */
  'xdo_move_mouse_relative' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int x
      'int',           // int y
  ] ],

  /**
   * Send a mouse press (aka mouse down) for a given button at the current mouse
   * location.
   *
   * @param window The window you want to send the event to or CURRENTWINDOW
   * @param button The mouse button. Generally, 1 is left, 2 is middle, 3 is
   *    right, 4 is wheel up, 5 is wheel down.
   */
  'xdo_mouse_down' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // int button
  ] ],

  /**
   * Send a mouse release (aka mouse up) for a given button at the current mouse
   * location.
   *
   * @param window The window you want to send the event to or CURRENTWINDOW
   * @param button The mouse button. Generally, 1 is left, 2 is middle, 3 is
   *    right, 4 is wheel up, 5 is wheel down.
   */
  'xdo_mouse_up' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // int button
  ] ],

  /**
   * Get the current mouse location (coordinates and screen number).
   *
   * @param x integer pointer where the X coordinate will be stored
   * @param y integer pointer where the Y coordinate will be stored
   * @param screen_num integer pointer where the screen number will be stored
   */
  'xdo_get_mouse_location' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // int *x
      ref.refType('int'),  // int *y
      ref.refType('int'),  // int *screen_num
  ] ],


  /**
   * Get the window the mouse is currently over
   *
   * @param window_ret Winter pointer where the window will be stored.
   */
  'xdo_get_window_at_mouse' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // Window *window_ret
  ] ],

  /**
   * Get all mouse location-related data.
   *
   * If null is passed for any parameter, we simply do not store it.
   * Useful if you only want the 'y' coordinate, for example.
   *
   * @param x integer pointer where the X coordinate will be stored
   * @param y integer pointer where the Y coordinate will be stored
   * @param screen_num integer pointer where the screen number will be stored
   * @param window Window pointer where the window/client the mouse is over
   *   will be stored.
   */
  'xdo_get_mouse_location2' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // int *x_ret
      ref.refType('int'),  // int *y_ret
      ref.refType('int'),  // int *screen_num_ret
      ref.refType('int'),  // int *window_ret
  ] ],

  /**
   * Wait for the mouse to move from a location. This function will block
   * until the condition has been satisfied.
   *
   * @param origin_x the X position you expect the mouse to move from
   * @param origin_y the Y position you expect the mouse to move from
   */
  'xdo_wait_for_mouse_move_from' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int origin_x
      'int',           // int origin_y
  ] ],

  /**
   * Wait for the mouse to move to a location. This function will block
   * until the condition has been satisfied.
   *
   * @param dest_x the X position you expect the mouse to move to
   * @param dest_y the Y position you expect the mouse to move to
   */
  'xdo_wait_for_mouse_move_to' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int dest_x
      'int',           // int dest_y
  ] ],

  /**
   * Send a click for a specific mouse button at the current mouse location.
   *
   * @param window The window you want to send the event to or CURRENTWINDOW
   * @param button The mouse button. Generally, 1 is left, 2 is middle, 3 is
   *    right, 4 is wheel up, 5 is wheel down.
   */
  'xdo_click_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // int button
  ] ],

  /**
   * Send a one or more clicks for a specific mouse button at the current mouse
   * location.
   *
   * @param window The window you want to send the event to or CURRENTWINDOW
   * @param button The mouse button. Generally, 1 is left, 2 is middle, 3 is
   *    right, 4 is wheel up, 5 is wheel down.
   */
  'xdo_click_window_multiple' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // int button
      'int',           // int repeat
      'int',           // useconds_t delay
  ] ],

  /**
   * Type a string to the specified window.
   *
   * If you want to send a specific key or key sequence, such as "alt+l", you
   * want instead xdo_send_keysequence_window(...).
   *
   * @param window The window you want to send keystrokes to or CURRENTWINDOW
   * @param string The string to type, like "Hello world!"
   * @param delay The delay between keystrokes in microseconds. 12000 is a decent
   *    choice if you don't have other plans.
   */
  'xdo_enter_text_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'string',        // const char *string
      'int',           // useconds_t delay
  ] ],

  /**
   * Send a keysequence to the specified window.
   *
   * This allows you to send keysequences by symbol name. Any combination
   * of X11 KeySym names separated by '+' are valid. Single KeySym names
   * are valid, too.
   *
   * Examples:
   *   "l"
   *   "semicolon"
   *   "alt+Return"
   *   "Alt_L+Tab"
   *
   * If you want to type a string, such as "Hello world." you want to instead
   * use xdo_enter_text_window.
   *
   * @param window The window you want to send the keysequence to or
   *   CURRENTWINDOW
   * @param keysequence The string keysequence to send.
   * @param delay The delay between keystrokes in microseconds.
   */
  'xdo_send_keysequence_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'string',        // const char *keysequence
      'int',           // useconds_t delay
  ] ],

  /**
   * Send key release (up) events for the given key sequence.
   *
   * @see xdo_send_keysequence_window
   */
  'xdo_send_keysequence_window_up' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'string',        // const char *keysequence
      'int',           // useconds_t delay
  ] ],

  /**
   * Send key press (down) events for the given key sequence.
   *
   * @see xdo_send_keysequence_window
   */
  'xdo_send_keysequence_window_down' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'string',        // const char *keysequence
      'int',           // useconds_t delay
  ] ],

  /**
   * Send a series of keystrokes.
   *
   * @param window The window to send events to or CURRENTWINDOW
   * @param keys The array of charcodemap_t entities to send.
   * @param nkeys The length of the keys parameter
   * @param pressed 1 for key press, 0 for key release.
   * @param modifier Pointer to integer to record the modifiers activated by
   *   the keys being pressed. If NULL, we don't save the modifiers.
   * @param delay The delay between keystrokes in microseconds.
   */
  'xdo_send_keysequence_window_list_do' : [ 'int', [ 
      p_struct_xdo_t,          // const xdo_t *xdo
      'int',                   // Window window
      p_struct_charcodemap_t,  // charcodemap_t *keys
      'int',                   // int nkeys
      'int',                   // int pressed
      ref.refType('int'),      // int *modifier
      'int',                   // useconds_t delay
  ] ],

  /**
   * Wait for a window to have a specific map state.
   *
   * State possibilities:
   *   IsUnmapped - window is not displayed.
   *   IsViewable - window is mapped and shown (though may be clipped by windows
   *     on top of it)
   *   IsUnviewable - window is mapped but a parent window is unmapped.
   *
   * @param wid the window you want to wait for.
   * @param map_state the state to wait for.
   */
  'xdo_wait_for_window_map_state' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'int',           // int map_state
  ] ],

  /**
   * 
   */
  'xdo_wait_for_window_size' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // unsigned int width
      'int',           // unsigned int height
      'int',           // int flags
      'int',           // int to_or_from
  ] ],

  /**
   * Move a window to a specific location.
   *
   * The top left corner of the window will be moved to the x,y coordinate.
   *
   * @param wid the window to move
   * @param x the X coordinate to move to.
   * @param y the Y coordinate to move to.
   */
  'xdo_move_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'int',           // int x
      'int',           // int y
  ] ],

  /**
   * Apply a window's sizing hints (if any) to a given width and height.
   *
   * This function wraps XGetWMNormalHints() and applies any 
   * resize increment and base size to your given width and height values.
   *
   * @param window the window to use
   * @param width the unit width you want to translate
   * @param height the unit height you want to translate
   * @param width_ret the return location of the translated width
   * @param height_ret the return location of the translated height
   */
  'xdo_translate_window_with_sizehint' : [ 'int', [ 
      p_struct_xdo_t,               // const xdo_t *xdo
      'int',                        // Window window
      'int',                        // unsigned int width
      'int',                        // unsigned int height
      ref.refType('int'),           // unsigned int *width_ret
      ref.refType('int'),           // unsigned int *height_ret
  ] ],

  /**
   * Change the window size.
   *
   * @param wid the window to resize
   * @param w the new desired width
   * @param h the new desired height
   * @param flags if 0, use pixels for units. If SIZE_USEHINTS, then
   *   the units will be relative to the window size hints.
   */
  'xdo_set_window_size' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'int',           // int w
      'int',           // int h
      'int',           // int flags
  ] ],

  /**
   * Change a window property.
   *
   * Example properties you can change are WM_NAME, WM_ICON_NAME, etc.
   *
   * @param wid The window to change a property of.
   * @param property the string name of the property.
   * @param value the string value of the property.
   */
  'xdo_set_window_property' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'string',        // const char *property
      'string',        // const char *value
  ] ],

  /**
   * Change the window's classname and or class.
   *
   * @param name The new class name. If NULL, no change.
   * @param _class The new class. If NULL, no change.
   */
  'xdo_set_window_class' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'string',        // const char *name
      'string',        // const char *_class
  ] ],

  /**
   * Sets the urgency hint for a window.
   */
  'xdo_set_window_urgency' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'int',           // int urgency
  ] ],

  /**
   * Set the override_redirect value for a window. This generally means
   * whether or not a window manager will manage this window.
   *
   * If you set it to 1, the window manager will usually not draw borders on the
   * window, etc. If you set it to 0, the window manager will see it like a
   * normal application window.
   *
   */
  'xdo_set_window_override_redirect' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'int',           // int override_redirect
  ] ],

  /**
   * Focus a window.
   *
   * @see xdo_activate_window
   * @param wid the window to focus.
   */
  'xdo_focus_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
  ] ],

  /**
   * Raise a window to the top of the window stack. This is also sometimes
   * termed as bringing the window forward.
   *
   * @param wid The window to raise.
   */
  'xdo_raise_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
  ] ],

  /**
   * Get the window currently having focus.
   *
   * @param window_ret Pointer to a window where the currently-focused window
   *   will be stored.
   */
  'xdo_get_focused_window' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // Window *window_ret
  ] ],

  /**
   * Wait for a window to have or lose focus.
   *
   * @param window The window to wait on
   * @param want_focus If 1, wait for focus. If 0, wait for loss of focus.
   */
  'xdo_focus_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // int want_focus
  ] ],

  /**
   * Get the PID owning a window. Not all applications support this.
   * It looks at the _NET_WM_PID property of the window.
   *
   * @param window the window to query.
   * @return the process id or 0 if no pid found.
   */
  'xdo_get_pid_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
  ] ],

  /**
   * Like xdo_get_focused_window, but return the first ancestor-or-self window *
   * having a property of WM_CLASS. This allows you to get the "real" or
   * top-level-ish window having focus rather than something you may not expect
   * to be the window having focused.
   *
   * @param window_ret Pointer to a window where the currently-focused window
   *   will be stored.
   */
  'xdo_get_focused_window_sane' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // Window *window_ret
  ] ],

  /**
   * Activate a window. This is generally a better choice than xdo_focus_window
   * for a variety of reasons, but it requires window manager support:
   *   - If the window is on another desktop, that desktop is switched to.
   *   - It moves the window forward rather than simply focusing it
   *
   * Requires your window manager to support this.
   * Uses _NET_ACTIVE_WINDOW from the EWMH spec.
   *
   * @param wid the window to activate
   */
  'xdo_activate_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
  ] ],

  /**
   * Wait for a window to be active or not active.
   *
   * Requires your window manager to support this.
   * Uses _NET_ACTIVE_WINDOW from the EWMH spec.
   *
   * @param window the window to wait on
   * @param active If 1, wait for active. If 0, wait for inactive.
   */
  'xdo_wait_for_window_active' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
      'int',           // Window active
  ] ],

  /**
   * Map a window. This mostly means to make the window visible if it is
   * not currently mapped.
   *
   * @param wid the window to map.
   */
  'xdo_map_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
  ] ],

  /**
   * Unmap a window
   *
   * @param wid the window to unmap
   */
  'xdo_unmap_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
  ] ],

  /**
   * Minimize a window.
   */
  'xdo_minimize_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
  ] ],

  // /**
  //  * Change window state
  //  * @param action the _NET_WM_STATE action
  //  */
  // 'xdo_window_state' : [ 'int', [ 
  //     p_struct_xdo_t,  // const xdo_t *xdo
  //     'int',           // Window window
  //     'long',          // unsigned long action
  //     'string',        // const char *property
  // ] ],

  /** 
   * Reparents a window
   *
   * @param wid_source the window to reparent
   * @param wid_target the new parent window
   */
  'xdo_reparent_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid_source
      'int',           // Window wid_target
  ] ],

  /**
   * Get a window's location.
   *
   * @param wid the window to query
   * @param x_ret pointer to int where the X location is stored. If NULL, X is
   *   ignored.
   * @param y_ret pointer to int where the Y location is stored. If NULL, X is
   *   ignored.
   * @param screen_ret Pointer to Screen* where the Screen* the window on is
   *   stored. If NULL, this parameter is ignored.
   */
  'xdo_get_window_location' : [ 'int', [ 
      p_struct_xdo_t,                   // const xdo_t *xdo
      'int',                            // Window wid
      ref.refType('int'),               // int *x_ret
      ref.refType('int'),               // int *y_ret
      ref.refType(ref.refType('int')),  // Screen **screen_ret
  ] ],

  /**
   * Get a window's size.
   *
   * @param wid the window to query
   * @param width_ret pointer to unsigned int where the width is stored.
   * @param height_ret pointer to unsigned int where the height is stored.
   */
  'xdo_get_window_size' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      'int',               // Window wid
      ref.refType('int'),  // unsigned int *width_ret
      ref.refType('int'),  // unsigned int *height_ret
  ] ],

  /* pager-like behaviors */

  /**
   * Get the currently-active window.
   * Requires your window manager to support this.
   * Uses _NET_ACTIVE_WINDOW from the EWMH spec.
   *
   * @param window_ret Pointer to Window where the active window is stored.
   */
  'xdo_get_active_window' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // Window *window_ret
  ] ],

  /**
   * Get a window ID by clicking on it. This function blocks until a selection
   * is made.
   *
   * @param window_ret Pointer to Window where the selected window is stored.
   */
  'xdo_select_window_with_click' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // Window *window_ret
  ] ],

  /**
   * Set the number of desktops.
   * Uses _NET_NUMBER_OF_DESKTOPS of the EWMH spec.
   *
   * @param ndesktops the new number of desktops to set.
   */
  'xdo_set_number_of_desktops' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'long',          // long ndesktops
  ] ],

  /**
   * Get the current number of desktops.
   * Uses _NET_NUMBER_OF_DESKTOPS of the EWMH spec.
   *
   * @param ndesktops pointer to long where the current number of desktops is
   *   stored
   */
  'xdo_get_number_of_desktops' : [ 'int', [ 
      p_struct_xdo_t,       // const xdo_t *xdo
      ref.refType('long'),  // long *ndesktops
  ] ],

  /**
   * Switch to another desktop.
   * Uses _NET_CURRENT_DESKTOP of the EWMH spec.
   *
   * @param desktop The desktop number to switch to.
   */
  'xdo_set_current_desktop' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'long',          // long desktop
  ] ],

  /**
   * Get the current desktop.
   * Uses _NET_CURRENT_DESKTOP of the EWMH spec.
   *
   * @param desktop pointer to long where the current desktop number is stored.
   */
  'xdo_get_current_desktop' : [ 'int', [ 
      p_struct_xdo_t,       // const xdo_t *xdo
      ref.refType('long'),  // long *desktop
  ] ],

  /**
   * Move a window to another desktop
   * Uses _NET_WM_DESKTOP of the EWMH spec.
   *
   * @param wid the window to move
   * @param desktop the desktop destination for the window
   */
  'xdo_set_desktop_for_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window wid
      'long',          // long desktop
  ] ],

  /**
   * Get the desktop a window is on.
   * Uses _NET_WM_DESKTOP of the EWMH spec.
   *
   * If your desktop does not support _NET_WM_DESKTOP, then '*desktop' remains
   * unmodified.
   *
   * @param wid the window to query
   * @param deskto pointer to long where the desktop of the window is stored
   */
  'xdo_get_desktop_for_window' : [ 'int', [ 
      p_struct_xdo_t,       // const xdo_t *xdo
      'int',                // Window wid
      ref.refType('long'),  // long *desktop
  ] ],

  /**
   * Search for windows.
   *
   * @param search the search query.
   * @param windowlist_ret the list of matching windows to return
   * @param nwindows_ret the number of windows (length of windowlist_ret)
   * @see xdo_search_t
   */
  'xdo_search_windows' : [ 'int', [ 
      p_struct_xdo_t,                   // const xdo_t *xdo
      p_struct_xdo_search_t,            // const xdo_search_t *search
      ref.refType(ref.refType('int')),  // Window **windowlist_ret
      ref.refType('int'),               // unsigned int *nwindows_ret
  ] ],

  /**
   * Generic property fetch.
   *
   * @param window the window to query
   * @param atom the Atom to request
   * @param nitems the number of items 
   * @param type the type of the return
   * @param size the size of the type
   * @return data consisting of 'nitems' items of size 'size' and type 'type'
   *   will need to be cast to the type before using.
   */
  'xdo_get_window_property_by_atom' : [ 'char *' /* unsigned char* */, [ 
      p_struct_xdo_t,       // const xdo_t *xdo
      'int',                // Window window
      'int',                // Atom atom
      ref.refType('long'),  // long *nitems
      ref.refType('int'),   // Atom *type
      ref.refType('int'),   // int *size
  ] ],

  /**
   * Get property of window by name of atom.
   *
   * @param window the window to query
   * @param property the name of the atom
   * @param nitems the number of items 
   * @param type the type of the return
   * @param size the size of the type
   * @return data consisting of 'nitems' items of size 'size' and type 'type'
   *   will need to be cast to the type before using.
   */
  'xdo_get_window_property' : [ 'int', [ 
      p_struct_xdo_t,                    // const xdo_t *xdo
      'int',                             // Window window
      'string',                          // const char *property
      ref.refType(ref.refType('char')),  // unsigned char **value
      ref.refType('long'),               // long *nitems
      ref.refType('int'),                // Atom *type
      ref.refType('int'),                // int *size
  ] ],

  /**
   * Get the current input state. This is a mask value containing any of the
   * following: ShiftMask, LockMask, ControlMask, Mod1Mask, Mod2Mask, Mod3Mask,
   * Mod4Mask, or Mod5Mask.
   *
   * @return the input mask
   */
  'xdo_get_input_state' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
  ] ],

  /**
   * If you need the symbol map, use this method.
   *
   * The symbol map is an array of string pairs mapping common tokens to X Keysym
   * strings, such as "alt" to "Alt_L"
   *
   * @returns array of strings.
   */
  'xdo_get_symbol_map' : [ ref.refType('string'), [ /* void */ ] ],

  /* active modifiers stuff */

  /**
   * Get a list of active keys. Uses XQueryKeymap.
   *
   * @param keys Pointer to the array of charcodemap_t that will be allocated
   *    by this function.
   * @param nkeys Pointer to integer where the number of keys will be stored.
   */
  'xdo_get_active_modifiers' : [ 'int', [ 
      p_struct_xdo_t,                       // const xdo_t *xdo
      ref.refType(p_struct_charcodemap_t),  // charcodemap_t **keys
      ref.refType('int'),                   // int *nkeys
  ] ],

  /**
   * Send any events necessary to clear the active modifiers.
   * For example, if you are holding 'alt' when xdo_get_active_modifiers is 
   * called, then this method will send a key-up for 'alt'
   */
  'xdo_clear_active_modifiers' : [ 'int', [ 
      p_struct_xdo_t,          // const xdo_t *xdo
      'int',                   // Window window
      p_struct_charcodemap_t,  // charcodemap_t *active_mods
      'int',                   // int active_mods_n
  ] ],

  /**
   * Send any events necessary to make these modifiers active.
   * This is useful if you just cleared the active modifiers and then wish
   * to restore them after.
   */
  'xdo_set_active_modifiers' : [ 'int', [ 
      p_struct_xdo_t,          // const xdo_t *xdo
      'int',                   // Window window
      p_struct_charcodemap_t,  // charcodemap_t *active_mods
      'int',                   // int active_mods_n
  ] ],

  /**
   * Get the position of the current viewport.
   *
   * This is only relevant if your window manager supports
   * _NET_DESKTOP_VIEWPORT 
   */
  'xdo_get_desktop_viewport' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // int *x_ret
      ref.refType('int'),  // int *y_ret
  ] ],

  /**
   * Set the position of the current viewport.
   *
   * This is only relevant if your window manager supports
   * _NET_DESKTOP_VIEWPORT
   */
  'xdo_set_desktop_viewport' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int x
      'int',           // int y
  ] ],

  /**
   * Kill a window and the client owning it.
   *
   */
  'xdo_kill_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
  ] ],

  /**
   * Close a window without trying to kill the client.
   *
   */
  'xdo_close_window' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // Window window
  ] ],

  /**
   * Find a client window (child) in a given window. Useful if you get the
   * window manager's decorator window rather than the client window.
   */
  'xdo_find_window_client' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      'int',               // Window window
      ref.refType('int'),  // Window *window_ret
      'int',               // int direction
  ] ],

  /**
   * Get a window's name, if any.
   *
   * TODO(sissel): Document
   */
  'xdo_get_window_name' : [ 'int', [ 
      p_struct_xdo_t,       // const xdo_t *xdo
      'int',                // Window window
      ref.refType('char'),  // unsigned char **name_ret
      ref.refType('int'),   // int *name_len_ret
      ref.refType('int'),   // int *name_len_ret
  ] ],

  /**
   * Disable an xdo feature.
   *
   * This function is mainly used by libxdo itself, however, you may find it useful
   * in your own applications.
   * 
   * @see XDO_FEATURES
   */
  'xdo_disable_feature' : [ 'void', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int feature
  ] ],

  /**
   * Enable an xdo feature.
   *
   * This function is mainly used by libxdo itself, however, you may find it useful
   * in your own applications.
   * 
   * @see XDO_FEATURES
   */
  'xdo_enable_feature' : [ 'void', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int feature
  ] ],

  /**
   * Check if a feature is enabled.
   *
   * This function is mainly used by libxdo itself, however, you may find it useful
   * in your own applications.
   * 
   * @see XDO_FEATURES
   */
  'xdo_has_feature' : [ 'int', [ 
      p_struct_xdo_t,  // const xdo_t *xdo
      'int',           // int feature
  ] ],

  /**
   * Query the viewport (your display) dimensions
   *
   * If Xinerama is active and supported, that api internally is used.
   * If Xineram is disabled, we will report the root window's dimensions
   * for the given screen.
   */
  'xdo_get_viewport_dimensions' : [ 'int', [ 
      p_struct_xdo_t,      // const xdo_t *xdo
      ref.refType('int'),  // unsigned int *width
      ref.refType('int'),  // unsigned int *height
      'int',               // int screen
  ] ],

});

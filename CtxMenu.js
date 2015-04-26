var Manager = (function() {
  var Manager = {
    items: [],

    disactiveAll: function() {
      this.items.forEach(function(cMenu) {
        if (cMenu.isActive) {
          cMenu.disactive();
        }
      });
    }
  };

  /**
   *  CtxMenu disable the browser contextmenu by default
   *  extend tkeepNatives to address the exception
   *  by adding the exception in the config when construct the CtxMenu
   *  the exception is in the format {ids:string[], tags:string[], classes:string[]}
   *    ex: { tags: ['INPUT'], classes:['xxxclass']}
   */
  var tkeepNatives = {
    ids: [],
    tags: [],
    classes: []
  };


  function returnFalse() {
    return false;
  }

  /**
   *  given an object's  key value, lookup its index in the array
   *  @returns {int} the object's index
   */
  function objectIndexOf(objArr, key, val) {
    var idx = -1,
      i;
    for (i = 0; i < objArr.length; i++) {
      if (objArr[i][key] === val) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  /**
   * each menu item on Panes is a Menu
   * @param {jqElem}  jquery elem
   * @param {object}  opt
   * @param {object}  param {funcObj: Object, pane: Pane}
   */
  var Menu = function(elem, opt, param) {
    var thisPane = param.pane,
      funcObj = param.funcObj;


    var onMouseIn = function(evt) {
      funcObj.clickGroup.call(this, evt, thisPane, opt.key);
    };

    var _self = this;
    if (opt.hasNext) {
      _self.subKey = opt.key;
      elem.attr('data-msub', _self.subKey);
      elem.click(onMouseIn);
    } else { // normal item
      _self.subKey = null;
      elem.click(function(e) {
        if (!_self.enable) {
          return false;
        }
        funcObj.clickItem.call(this, e);
      });

      if (opt.action && typeof opt.action === 'function') {
        elem.click(function(e) {
          if (_self.enable) {
            opt.action.call(this, e);
            return;
          }
          return false;
        });
      }
    }

    elem.on('contextmenu', returnFalse).hover(onMouseIn);

    this.mItem = elem;
    this.isSelected = false;

    if (opt.disable) {
      this.enable = false;
    }
  };

  /**
    @typedef Menu
    @type {object}
    @property {jqElem} mItem
    @property {string} subKey - used as the subpane id
    @property {bool} isSelected - if the menu is selceted
  */
  Menu.prototype = {
    mItem: null,
    subKey: null, // used as the subpane id
    _selected: false,
    _enable: true,

    set isSelected(val) {
      this._selected = val;
    },
    get isSelected() {
      return this._selected;
    },
    set enable(val) {
      var cls = 'disabled';
      if (val === this._enable) {
        return;
      }
      if (!val) {
        this.mItem.addClass(cls);
      } else {
        this.mItem.removeClass(cls);
      }

      this._enable = val;
    },
    get enable() {
      return this._enable;
    }
  };

  /**
   * each Menu houses in a Pane
   */
  var Pane = function(key, opt, ctx) {
    this.id = key;
    this.context = ctx;
    this.parent = ctx.parent;
    this.previous = opt.prev || null;

    if (key === ctx.rootId) {
      this.isRoot = true;
    }

    this.menus = {};
    Pane.createPane(this);
    Pane.buildPane(this, opt.items);
  };

  /**
    @typedef Pane
    @type {object}
    @property {Object.<string, Menu>} menus
    @property {string} id - maps to the menu key on the previous layer (except it is the root pane)
    @property {jqElem} mPane - element that houses the menus
    @property {bool} shown - flag indicating if it is currently shown
    @property {CtxMenu} context
    @property {string} curr - currently selceted menu key
  */
  Pane.prototype = {
    id: '',
    mPane: null,
    menus: {},
    _curr: null, // currently active subkey
    shown: false,
    context: null,
    isRoot: false,
    set curr(val) {
      if (this._curr && this._curr !== val) {
        this.menus[this._curr].isSelected = false;
      }
      if (val) {
        this.menus[val].isSelected = true;
      }
      this._curr = val;
    },
    get curr() {
      return this._curr;
    },
    hide: function() {
      this.mPane.hide();
      this.curr = null;
      this.shown = false;
    }
  };


  // on mouseEnter or click menu, show paneObj
  Pane.menuEnter = function(evt, thisPane, subkey) {
    if (!thisPane) {
      console.warn('lack of the current pane');
      return;
    }

    var ctx = thisPane.context,
      thisPaneIdx = ctx.activeStackExist(thisPane.id);

    if (thisPane.curr !== subkey) {
      // pop current
      CtxMenu.popUntilIndex(ctx, thisPaneIdx);
      if (!thisPane.menus[subkey].enable) {
        return;
      }

      // show
      ctx.showSubpane(subkey, $(this).offset());
      return;
    }

    ctx.disactiveSubpaneMenus(subkey);
    ctx.showSubpane(subkey, $(this).offset());
  };

  // create pane Elem
  Pane.createPane = function(paneObj) {
    var newPane = $('<div>', {
      id: paneObj.id,
      class: 'ctx-menu'
    });
    newPane.click(returnFalse).mousedown(returnFalse);
    paneObj.parent.append(newPane);
    paneObj.mPane = newPane;
  };
  // show menu pane based on the given pos
  Pane.show = function(paneObj, pos, preWidth) {
    var ctxmenuElem = paneObj.mPane;

    // browser width and height
    var bWidth = $('body').width(),
      bHeight = document.documentElement.clientHeight;

    // pane width
    var mWidth = ctxmenuElem.width(),
      mHeight = ctxmenuElem.height();

    // pWidth: width of the previous layer
    // sHeightMove: adjustment height on submenu
    var pWidth, sHeightMove;
    if (preWidth && preWidth > 0) {
      sHeightMove = 25;
      pWidth = preWidth - 1;
    } else {
      pWidth = sHeightMove = 0;
    }

    pos.left = (pos.left + mWidth + pWidth > bWidth) ? (pos.left - mWidth < 0 ? 0 : pos.left - mWidth) : pos.left + pWidth;
    pos.top = (pos.top + mHeight > bHeight) ? (pos.top - mHeight + sHeightMove < 0 ? 0 : pos.top - mHeight + sHeightMove) : pos.top;

    ctxmenuElem.css(pos).show();

    paneObj.shown = true;
  };
  // @returns {Menu}
  Pane.createMenu = function(paneObj, opt) {
    var item = $('<div>', {
      class: 'cm-item',
      html: $('<a>' + opt.text + '</a>')
    });
    var mkey = opt.key;
    var funcObj = {
      clickDisable: returnFalse,
      clickGroup: Pane.menuEnter,
      clickItem: function() {
        paneObj.context.disactive();
      }
    };

    return new Menu(item, opt, { pane: paneObj, funcObj: funcObj });
  };

  // build pane by the given parsed menu config
  Pane.buildPane = function(paneObj, cmenus) {
    var frag = $(document.createDocumentFragment()), k;

    for(k in cmenus) {
      paneObj.context.menuMap[k] = paneObj.id;
      paneObj.menus[k] = Pane.createMenu(paneObj, cmenus[k]);
      frag.append(paneObj.menus[k].mItem);
    }

    paneObj.mPane.append(frag);
  };

  /**
   * act as the manager of Panes
   */
  var CtxMenu = function(id, opt) {
    this.name = id;

    this.parent = opt.parent || $('body');
    opt.parent = this.parent;

    this.rootId = id;
    this.c = {}; // parsed config
    this.panes = {};
    this.activePanes = [];
    this.isActive = false;
    this.menuMap = {};

    // use native contextmenu when right-clicks on the specified selectors
    if (opt.keepnative) {
      CtxMenu.g_KeepNative(opt.keepnative);
    }

    // parse the opt to match each pane
    this.parseOptionItems(opt.items, this.rootId, null);

    // create panes
    CtxMenu.build(this);

    this.rootPane = this.panes[this.rootId];
  };

  CtxMenu.prototype = {
    target: null,
    rootPane: null,
    parent: null,
    _active: false,
    rootId: '',

    set isActive(val) {
      this._active = val;
    },
    get isActive() {
      return this._active;
    },

    // if the parent layer shown
    previousShown: function(key) {
      if (!this.panes[key]) {
        return;
      }
      var prevKey = this.panes[key].previous;
      if (!prevKey || !this.panes[prevKey]) {
        return;
      }

      return this.panes[prevKey].curr;
    },
    showSubpane: function(subkey, pos) {
      if (!this.panes[subkey]) {
        return;
      }
      // already shown
      if (this.panes[subkey].shown) {
        return;
      }

      var mPaneWidth = 0,
        sub = this.panes[subkey];
      var prev = (sub.previous && this.panes[sub.previous]) ? this.panes[sub.previous] : null;

      if (prev) {
        mPaneWidth = prev.mPane.width();
        prev.curr = subkey;
      }
      if (this.activeStackPush(sub) >= 0) {
        Pane.show(sub, pos, mPaneWidth);
      }

    },
    // enable or disable a menu given its menu key
    setMenuEnable: function(mkey, enable) {
      // lookup which pane it belongs to
      var id = this.menuMap[mkey];
      if (!id) {
        console.log('mismatch menu for key# ' + mkey);
        return;
      }
      var pane = this.panes[id];
      if (!pane) {
        console.warn('notfound pane for id# ' + id);
        return;
      }
      pane.menus[mkey].enable = enable;
    },
    disactiveSubpaneMenus: function(subkey) {
      var sub = this.panes[subkey];
      if (sub && sub.curr) {
        this.activeStackPop();
      }
    },
    // if the pane in the stack
    // @returns {int}  stack index, -1 if not found
    activeStackExist: function(key) {
      return objectIndexOf(this.activePanes, 'id', key);
    },
    // push pane into the stack
    activeStackPush: function(pane) {
      if (objectIndexOf(this.activePanes, 'id', pane.id) < 0) {
        this.activePanes.push(pane);
      }
      return this.activePanes.length - 1;
    },
    // pop pane from the stack
    activeStackPop: function() {
      if (this.activePanes.length < 2) {
        return null;
      }
      var ele = null;
      ele = this.activePanes.pop();
      ele.hide();
      return ele;
    },
    /**
     *  parse the given option items
     *  @param {{menukey:menuObj},...} items
     *  @param {string} belonging key of menupane
     *  @param {string} key of the previous layer
     */
    parseOptionItems: function(items, key, prev) {
      var ctx = this; // CtxMenu instance
      var conf, c ;
      c = ctx.c[key] = {
        items: {},
        prev: prev  // null if it is the root pane
      };

      Object.keys(items).forEach(function(sk) {
        conf = CtxMenu.extractConfig(sk, items[sk]);
        if(conf.hasNext) {
          ctx.parseOptionItems.call(ctx, items[sk].items, sk, key);
        }
        c.items[sk] = conf;
      });

    },
    // active context menu at the given position
    active: function(pos) {
      this.isActive = true;
      // show rootPane
      Pane.show(this.rootPane, pos);

      this.activeStackPush(this.rootPane);
    },
    // disactive context menu
    disactive: function() {
      this.isActive = false;
      // dismiss each pane
      $.each(this.activePanes, function(k, p) {
        p.hide();
      });
      this.activePanes = [];
    },
    rebindTarget: function() {
      var cMenu = this;
      $(document).off('contextmenu', cMenu.elem);

      cMenu.bindTarget(cMenu.elem, cMenu.excludeObj);
    },
    bindTarget: function(elem, excludeObj) {
      var cMenu = this;

      cMenu.excludeObj = excludeObj;
      cMenu.elem = elem;
      console.log('bind context menu: ' + elem + ':  ' + $(elem).length);

      $(document).on('contextmenu', elem, function(e) {
        CtxMenu.processRightClick(cMenu, (e || window.event));
      });

      $(document).on('contextmenu', function() {
        if (!cMenu.halt) {
          cMenu.disactive();
          return;
        }
      });
    }
  };
  CtxMenu.processRightClick = function(ctxmenu, e) {
    var target = e.target;
    var excludeObj = ctxmenu.excludeObj;

    Manager.disactiveAll();
    ctxmenu.halt = false;

    if (excludeObj) {

      // beforehand check must pass to go on
      if (excludeObj.before && !excludeObj.before(target)) {
        return;
      }

      // native context-menu is allowed on target
      if (excludeObj.excep && CtxMenu.checkExclusion(excludeObj.excep, target)) {
        return;
      }

      // no context-menu is allowed on target
      if (excludeObj.noctxmenu && CtxMenu.checkExclusion(excludeObj.noctxmenu, target)) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
    }

    ctxmenu.halt = true;
    CtxMenu.onContextMenu.call(this, ctxmenu, e);
  };

  /**
     Check if target Elem matches the provided list

     @param{object} {{ids:string[], tags:string[], classes:string[]}} list
     @param{HTMLElement} target element to be checked
     @returns {bool}
   */
  CtxMenu.checkExclusion = function(list, target) {

    // check the Id list
    if (list.ids && list.ids.length > 0 && list.ids.indexOf(target.id) > -1) {
      // console.log('match#' + target.id);
      return true;
    }

    // check the tag list
    if (list.tags && list.tags.indexOf(target.nodeName) > -1) {
      // console.log('match ' + target.nodeName);
      return true;
    }

    // check the list of class
    var sz, lstExcep;
    if ((sz = target.classList.length) > 0 && (lstExcep = list.classes) && list.classes.length > 0) {
      for (var i = 0; i < sz; i++) {
        if (lstExcep.indexOf(target.classList[i]) > -1) {
          // console.log('match class ' + target.classList[i]);
          return true;
        }
      }
    }

    return false;
  };
  CtxMenu.popUntilIndex = function(ctxmenu, index) {
    var i, sz = ctxmenu.activePanes.length,
      ele;
    for (i = sz - 1; i > index; i--) {
      ele = ctxmenu.activeStackPop();
    }
  };

  // parse menu options
  CtxMenu.extractConfig = function(mkey, m) {
    var disable = m.disable ? m.disable : false;

    // has sublayer
    if(m.items) {
      return {
        text: m.text,
        key:mkey,
        hasNext: true,
        disable: disable
      };
    }

    // regular menu item
    return  {
      text: m.text,
      key:mkey,
      action: m.action||null,
      disable: disable
    };
  };
  CtxMenu.build = function(ctxmenu) {
    var conf = ctxmenu.c;

    // assigns each config to one pane with the key
    // i.e., each pane corresponds to one menu key (except the root pane)
    $.each(conf, function(key, c) {
      ctxmenu.panes[key] = new Pane(key, c, ctxmenu);
    });
  };
  CtxMenu.onContextMenu = function(ctxMenu, evt) {
    if (!ctxMenu.rootPane) {
      console.warn('ctx menu miss rootPane', ctxMenu);
      return;
    }
    if (ctxMenu.activePanes.length) {
      ctxMenu.disactive();
    }

    ctxMenu.active({
      left: evt.clientX,
      top: evt.clientY
    });

    $(document).one('click mousedown', function() {
      ctxMenu.disactive();
    });

    evt.preventDefault();
    evt.stopPropagation();
  };
  // extend the global keep-native list
  CtxMenu.g_KeepNative = function(obj) {

    var extendList = function(from, to) {
      from.forEach(function(ele) {
        if (to.indexOf(ele) < 0) {
          to.push(ele);
        }
      });
    };

    if (obj.ids && obj.ids.length > 0) {
      extendList(obj.ids, tkeepNatives.ids);
    }
    if (obj.tags && obj.tags.length > 0) {
      extendList(obj.tags, tkeepNatives.tags);
    }
    if (obj.classes && obj.classes.length > 0) {
      extendList(obj.classes, tkeepNatives.classes);
    }
  };

  // prevent native contextmenu from appearing
  // except the global keep-native list
  $(document).on('contextmenu', function(evt) {
    // allow native context menu
    if (CtxMenu.checkExclusion(tkeepNatives, evt.target)) {
      return;
    }

    evt.preventDefault();
    evt.stopPropagation();
  });

  // create and add a new CtxMenu
  Manager.add = function(id, opt) {
    var mgr = this;

    mgr.items.push(new CtxMenu(id, opt));

    return mgr.items[mgr.items.length - 1];
  };

  return Manager;
})();

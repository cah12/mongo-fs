
'use strict';
/*
 *contextMenu.js v 1.4.1
 *Author: Sudhanshu Yadav
 *s-yadav.github.com
 *Copyright (c) 2013-2015 Sudhanshu Yadav.
 *Dual licensed under the MIT and GPL licenses
 */
;
(function ($, window, document, undefined) {
  "use strict";

  $.single = (function () {
    var single = $({});
    return function (elm) {
      single[0] = elm;
      return single;
    };
  }());

  $.fn.contextMenu = function (method, selector, option) {

    //parameter fix
    if (!methods[method]) {
      option = selector;
      selector = method;
      method = 'popup';
    }
    //need to check for array object
    else if (selector) {
      if (!((selector instanceof Array) || (typeof selector === 'string') || (selector.nodeType) || (selector.jquery))) {
        option = selector;
        selector = null;
      }
    }

    if ((selector instanceof Array) && (method != 'update')) {
      method = 'menu';
    }

    var myoptions = option;
    if ($.inArray(method, ['menu', 'popup', 'close', 'destroy']) > -1) {
      option = iMethods.optionOtimizer(method, option);
      this.each(function () {
        var $this = $(this)
        myoptions = $.extend({}, $.fn.contextMenu.defaults, option);
        if (!myoptions.baseTrigger) {
          myoptions.baseTrigger = $this;
        }
        methods[method].call($this, selector, myoptions)
      });
    } else {
      methods[method].call(this, selector, myoptions)
    }
    return this;
  };
  $.fn.contextMenu.defaults = {
    triggerOn: 'click', //avaliable options are all event related mouse plus enter option
    subMenuTriggerOn: 'hover click',
    displayAround: 'cursor', // cursor or trigger
    mouseClick: 'left',
    verAdjust: 0,
    horAdjust: 0,
    top: 'auto',
    left: 'auto',
    closeOther: true, //to close other already opened context menu
    containment: window,
    winEventClose: true,
    position: 'auto', //allowed values are top, left, bottom and right
    closeOnClick: true, //close context menu on click/ trigger of any item in menu

    //callback
    onOpen: function (data, event) { },
    afterOpen: function (data, event) { },
    onClose: function (data, event) { }
  };

  var methods = {
    menu: function (selector, option) {
      selector = iMethods.createMenuList(this, selector, option);
      iMethods.contextMenuBind.call(this, selector, option, 'menu');
    },
    popup: function (selector, option) {
      $(selector).addClass('iw-contextMenu');
      iMethods.contextMenuBind.call(this, selector, option, 'popup');
    },
    update: function (selector, option) {
      var self = this;
      option = option || {};

      this.each(function () {
        var trgr = $(this),
          menuData = trgr.data('iw-menuData');
        //refresh if any new element is added
        if (!menuData) {
          self.contextMenu('refresh');
          menuData = trgr.data('iw-menuData');
        }

        var menu = menuData.menu;
        if (typeof selector === 'object') {

          for (var i = 0; i < selector.length; i++) {
            var name = selector[i].name,
              disable = selector[i].disable,
              fun = selector[i].fun,
              icon = selector[i].icon,
              img = selector[i].img,
              title = selector[i].title,
              className = selector[i].className,
              elm = menu.children('li').filter(function () {
                return $(this).contents().filter(function () {
                  return this.nodeType == 3;
                }).text() == name;
              }),
              subMenu = selector[i].subMenu;

            //toggle disable if provided on update method
            disable != undefined && (disable ? elm.addClass('iw-mDisable') : elm.removeClass('iw-mDisable'));

            //bind new function if provided
            fun && elm.unbind('click.contextMenu').bind('click.contextMenu', fun);

            //update title
            title != undefined && elm.attr('title', title);

            //update class name
            className != undefined && elm.attr('class', className);

            var imgIcon = elm.find('.iw-mIcon');
            if (imgIcon.length) imgIcon.remove();

            //update image or icon
            if (img) {
              elm.prepend('<img src="' + img + '" align="absmiddle" class="iw-mIcon" />');
            } else if (icon) {
              elm.prepend('<span align="absmiddle" class="iw-mIcon ' + icon + '" />');
            }

            //to change submenus
            if (subMenu) {
              elm.contextMenu('update', subMenu);
            }
          }
        }

        iMethods.onOff(menu);

        //bind event again if trigger option has changed.
        var triggerOn = option.triggerOn;
        if (triggerOn) {
          trgr.unbind('.contextMenu');

          //add contextMenu identifier on all events
          triggerOn = triggerOn.split(" ");
          var events = [];
          for (var i = 0, ln = triggerOn.length; i < ln; i++) {
            events.push(triggerOn[i] + '.contextMenu')
          }

          //to bind event
          trgr.bind(events.join(' '), iMethods.eventHandler);
        }

        //set menu data back to trigger element
        menuData.option = $.extend({}, menuData.option, option);
        trgr.data('iw-menuData', menuData);
      });
    },
    refresh: function () {
      var menuData = this.filter(function () {
        return !!$(this).data('iw-menuData');
      }).data('iw-menuData'),
        newElm = this.filter(function () {
          return !$(this).data('iw-menuData');
        });
      //to change basetrigger on refresh  
      menuData.option.baseTrigger = this;
      iMethods.contextMenuBind.call(newElm, menuData.menuSelector, menuData.option);
    },
    open: function (sel, data) {
      data = data || {};
      var e = data.event || $.Event('click');
      if (data.top) e.clientY = data.top;
      if (data.left) e.clientX = data.left;
      this.each(function () {
        iMethods.eventHandler.call(this, e);
      });
    },
    //to force context menu to close
    close: function () {
      var menuData = this.data('iw-menuData');
      if (menuData) {
        iMethods.closeContextMenu(menuData.option, this, menuData.menu, null);
      }
    },
    //to get value of a key
    value: function (key) {
      var menuData = this.data('iw-menuData');
      if (menuData[key]) {
        return menuData[key];
      } else if (menuData.option) {
        return menuData.option[key];
      }
      return null;
    },
    destroy: function () {
      var trgr = this,
        menuId = trgr.data('iw-menuData').menuId,
        menu = $('.iw-contextMenu[menuId=' + menuId + ']'),
        menuData = menu.data('iw-menuData');

      //Handle the situation of dynamically added element.
      if (!menuData) return;


      if (menuData.noTrigger == 1) {
        if (menu.hasClass('iw-created')) {
          menu.remove();
        } else {
          menu.removeClass('iw-contextMenu ' + menuId)
            .removeAttr('menuId').removeData('iw-menuData');
          //to destroy submenus
          menu.find('li.iw-mTrigger').contextMenu('destroy');
        }
      } else {
        menuData.noTrigger--;
        menu.data('iw-menuData', menuData);
      }
      trgr.unbind('.contextMenu').removeClass('iw-mTrigger').removeData('iw-menuData');
    }
  };
  var iMethods = {
    contextMenuBind: function (selector, option, method) {
      var trigger = this,
        menu = $(selector),
        menuData = menu.data('iw-menuData');

      //fallback
      if (menu.length == 0) {
        menu = trigger.find(selector);
        if (menu.length == 0) {
          return;
        }
      }

      if (method == 'menu') {
        iMethods.menuHover(menu);
      }
      //get base trigger
      var baseTrigger = option.baseTrigger;


      if (!menuData) {
        var menuId;
        if (!baseTrigger.data('iw-menuData')) {
          menuId = Math.ceil(Math.random() * 100000);
          baseTrigger.data('iw-menuData', {
            'menuId': menuId
          });
        } else {
          menuId = baseTrigger.data('iw-menuData').menuId;
        }
        //create clone menu to calculate exact height and width.
        var cloneMenu = menu.clone();
        cloneMenu.appendTo('body');

        menuData = {
          'menuId': menuId,
          'menuWidth': cloneMenu.outerWidth(true),
          'menuHeight': cloneMenu.outerHeight(true),
          'noTrigger': 1,
          'trigger': trigger
        };


        //to set data on selector
        menu.data('iw-menuData', menuData).attr('menuId', menuId);
        //remove clone menu
        cloneMenu.remove();
      } else {
        menuData.noTrigger++;
        menu.data('iw-menuData', menuData);
      }

      //to set data on trigger
      trigger.addClass('iw-mTrigger').data('iw-menuData', {
        'menuId': menuData.menuId,
        'option': option,
        'menu': menu,
        'menuSelector': selector,
        'method': method
      });

      //hover fix
      var triggerOn = option.triggerOn;
      if (triggerOn.indexOf('hover') != -1) {
        triggerOn = triggerOn.replace('hover', 'mouseenter');
        //hover out if display is of context menu is on hover
        if (baseTrigger.index(trigger) != -1) {
          baseTrigger.add(menu).bind('mouseleave.contextMenu', function (e) {
            if ($(e.relatedTarget).closest('.iw-contextMenu').length == 0) {
              $('.iw-contextMenu[menuId="' + menuData.menuId + '"]').fadeOut(100);
            }
          });
        }

      }

      trigger.delegate('input,a,.needs-click', 'click', function (e) {
        e.stopImmediatePropagation()
      });

      //add contextMenu identifier on all events
      triggerOn = triggerOn.split(' ');
      var events = [];
      for (var i = 0, ln = triggerOn.length; i < ln; i++) {
        events.push(triggerOn[i] + '.contextMenu')
      }

      //to bind event
      trigger.bind(events.join(' '), iMethods.eventHandler);

      //to stop bubbling in menu
      menu.bind('click mouseenter', function (e) {
        e.stopPropagation();
      });

      menu.delegate('li', 'click', function (e) {
        if (option.closeOnClick && !$.single(this).hasClass('iw-has-submenu')) iMethods.closeContextMenu(option, trigger, menu, e);
      });
    },
    eventHandler: function (e) {
      e.preventDefault();
      var trigger = $(this),
        trgrData = trigger.data('iw-menuData'),
        menu = trgrData.menu,
        menuData = menu.data('iw-menuData'),
        option = trgrData.option,
        cntnmnt = option.containment,
        clbckData = {
          trigger: trigger,
          menu: menu
        },
        //check conditions
        cntWin = cntnmnt == window,
        btChck = option.baseTrigger.index(trigger) == -1;

      //to close previous open menu.
      if (!btChck && option.closeOther) {
        $('.iw-contextMenu').css('display', 'none');
      }

      //to reset already selected menu item
      menu.find('.iw-mSelected').removeClass('iw-mSelected');

      //call open callback
      option.onOpen.call(this, clbckData, e);


      var cObj = $(cntnmnt),
        cHeight = cObj.innerHeight(),
        cWidth = cObj.innerWidth(),
        cTop = 0,
        cLeft = 0,
        menuHeight = menuData.menuHeight,
        menuWidth = menuData.menuWidth,
        va, ha,
        left = 0,
        top = 0,
        bottomMenu,
        rightMenu,
        verAdjust = va = parseInt(option.verAdjust),
        horAdjust = ha = parseInt(option.horAdjust);

      if (!cntWin) {
        cTop = cObj.offset().top;
        cLeft = cObj.offset().left;

        //to add relative position if no position is defined on containment
        if (cObj.css('position') == 'static') {
          cObj.css('position', 'relative');
        }

      }


      if (option.displayAround == 'cursor') {
        left = cntWin ? e.clientX : e.clientX + $(window).scrollLeft() - cLeft;
        top = cntWin ? e.clientY : e.clientY + $(window).scrollTop() - cTop;
        bottomMenu = top + menuHeight;
        rightMenu = left + menuWidth;
        //max height and width of context menu
        if (bottomMenu > cHeight) {
          if ((top - menuHeight) < 0) {
            if ((bottomMenu - cHeight) < (menuHeight - top)) {
              top = cHeight - menuHeight;
              va = -1 * va;
            } else {
              top = 0;
              va = 0;
            }
          } else {
            top = top - menuHeight;
            va = -1 * va;
          }
        }
        if (rightMenu > cWidth) {
          if ((left - menuWidth) < 0) {
            if ((rightMenu - cWidth) < (menuWidth - left)) {
              left = cWidth - menuWidth;
              ha = -1 * ha;
            } else {
              left = 0;
              ha = 0;
            }
          } else {
            left = left - menuWidth;
            ha = -1 * ha;
          }
        }
      } else if (option.displayAround == 'trigger') {
        var triggerHeight = trigger.outerHeight(true),
          triggerWidth = trigger.outerWidth(true),
          triggerLeft = cntWin ? trigger.offset().left - cObj.scrollLeft() : trigger.offset().left - cLeft,
          triggerTop = cntWin ? trigger.offset().top - cObj.scrollTop() : trigger.offset().top - cTop,
          leftShift = triggerWidth;

        left = triggerLeft + triggerWidth;
        top = triggerTop;


        bottomMenu = top + menuHeight;
        rightMenu = left + menuWidth;
        //max height and width of context menu
        if (bottomMenu > cHeight) {
          if ((top - menuHeight) < 0) {
            if ((bottomMenu - cHeight) < (menuHeight - top)) {
              top = cHeight - menuHeight;
              va = -1 * va;
            } else {
              top = 0;
              va = 0;
            }
          } else {
            top = top - menuHeight + triggerHeight;
            va = -1 * va;
          }
        }
        if (rightMenu > cWidth) {
          if ((left - menuWidth) < 0) {
            if ((rightMenu - cWidth) < (menuWidth - left)) {
              left = cWidth - menuWidth;
              ha = -1 * ha;
              leftShift = -triggerWidth;
            } else {
              left = 0;
              ha = 0;
              leftShift = 0;
            }
          } else {
            left = left - menuWidth - triggerWidth;
            ha = -1 * ha;
            leftShift = -triggerWidth;
          }
        }
        //test end
        if (option.position == 'top') {
          top = triggerTop - menuHeight;
          va = verAdjust;
          left = left - leftShift;
        } else if (option.position == 'left') {
          left = triggerLeft - menuWidth;
          ha = horAdjust;
        } else if (option.position == 'bottom') {
          top = triggerTop + triggerHeight;
          va = verAdjust;
          left = left - leftShift;
        } else if (option.position == 'right') {
          left = triggerLeft + triggerWidth;
          ha = horAdjust;
        }
      }

      //applying css property
      var cssObj = {
        'position': (cntWin || btChck) ? 'fixed' : 'absolute',
        'display': 'inline-block',
        'height': '',
        'width': ''
      };


      //to get position from offset parent
      if (option.left != 'auto') {
        left = iMethods.getPxSize(option.left, cWidth);
      }
      if (option.top != 'auto') {
        top = iMethods.getPxSize(option.top, cHeight);
      }
      if (!cntWin) {
        var oParPos = trigger.offsetParent().offset();
        if (btChck) {
          left = left + cLeft - $(window).scrollLeft();
          top = top + cTop - $(window).scrollTop();
        } else {
          left = left - (cLeft - oParPos.left);
          top = top - (cTop - oParPos.top);
        }
      }
      cssObj.left = left + ha + 'px';
      cssObj.top = top + va + 'px';

      menu.css(cssObj);

      //to call after open call back
      option.afterOpen.call(this, clbckData, e);


      //to add current menu class
      if (trigger.closest('.iw-contextMenu').length == 0) {
        $('.iw-curMenu').removeClass('iw-curMenu');
        menu.addClass('iw-curMenu');
      }


      var dataParm = {
        trigger: trigger,
        menu: menu,
        option: option,
        method: trgrData.method
      };
      $('html').unbind('click', iMethods.clickEvent).click(dataParm, iMethods.clickEvent);
      $(document).unbind('keydown', iMethods.keyEvent).keydown(dataParm, iMethods.keyEvent);
      if (option.winEventClose) {
        $(window).bind('scroll resize', dataParm, iMethods.scrollEvent);
      }
    },

    scrollEvent: function (e) {
      iMethods.closeContextMenu(e.data.option, e.data.trigger, e.data.menu, e);
    },

    clickEvent: function (e) {
      var button = e.data.trigger.get(0);

      if ((button !== e.target) && ($(e.target).closest('.iw-contextMenu').length == 0)) {
        iMethods.closeContextMenu(e.data.option, e.data.trigger, e.data.menu, e);
      }
    },
    keyEvent: function (e) {
      e.preventDefault();
      var menu = e.data.menu,
        option = e.data.option,
        keyCode = e.keyCode;
      // handle cursor keys
      if (keyCode == 27) {
        iMethods.closeContextMenu(option, e.data.trigger, menu, e);
      }
      if (e.data.method == 'menu') {
        var curMenu = $('.iw-curMenu'),
          optList = curMenu.children('li:not(.iw-mDisable)'),
          selected = optList.filter('.iw-mSelected'),
          index = optList.index(selected),
          focusOn = function (elm) {
            iMethods.selectMenu(curMenu, elm);
            var menuData = elm.data('iw-menuData');
            if (menuData) {
              iMethods.eventHandler.call(elm[0], e);

            }
          },
          first = function () {
            focusOn(optList.filter(':first'));
          },
          last = function () {
            focusOn(optList.filter(':last'));
          },
          next = function () {
            focusOn(optList.filter(':eq(' + (index + 1) + ')'));
          },
          prev = function () {
            focusOn(optList.filter(':eq(' + (index - 1) + ')'));
          },
          subMenu = function () {
            var menuData = selected.data('iw-menuData');
            if (menuData) {
              iMethods.eventHandler.call(selected[0], e);
              var selector = menuData.menu;
              selector.addClass('iw-curMenu');
              curMenu.removeClass('iw-curMenu');
              curMenu = selector;
              optList = curMenu.children('li:not(.iw-mDisable)');
              selected = optList.filter('.iw-mSelected');
              first();
            }
          },
          parMenu = function () {
            var selector = curMenu.data('iw-menuData').trigger;
            var parMenu = selector.closest('.iw-contextMenu');
            if (parMenu.length != 0) {
              curMenu.removeClass('iw-curMenu').css('display', 'none');
              parMenu.addClass('iw-curMenu');
            }
          };
        switch (keyCode) {
          case 13:
            selected.click();
            break;
          case 40:
            (index == optList.length - 1 || selected.length == 0) ? first() : next();
            break;
          case 38:
            (index == 0 || selected.length == 0) ? last() : prev();
            break;
          case 33:
            first();
            break;
          case 34:
            last();
            break;
          case 37:
            parMenu();
            break;
          case 39:
            subMenu();
            break;
        }
      }
    },
    closeContextMenu: function (option, trigger, menu, e) {

      //unbind all events from top DOM
      $(document).unbind('keydown', iMethods.keyEvent);
      $('html').unbind('click', iMethods.clickEvent);
      $(window).unbind('scroll resize', iMethods.scrollEvent);
      $('.iw-contextMenu').css('display', 'none');
      $(document).focus();

      //call close function
      option.onClose.call(this, {
        trigger: trigger,
        menu: menu
      }, e);
    },
    getPxSize: function (size, of) {
      if (!isNaN(size)) {
        return size;
      }
      if (size.indexOf('%') != -1) {
        return parseInt(size) * of / 100;
      } else {
        return parseInt(size);
      }
    },
    selectMenu: function (menu, elm) {
      //to select the list
      var selected = menu.find('li.iw-mSelected'),
        submenu = selected.find('.iw-contextMenu');
      if ((submenu.length != 0) && (selected[0] != elm[0])) {
        submenu.fadeOut(100);
      }
      selected.removeClass('iw-mSelected');
      elm.addClass('iw-mSelected');
    },
    menuHover: function (menu) {
      var lastEventTime = Date.now();
      menu.children('li').bind('mouseenter.contextMenu click.contextMenu', function (e) {
        //to make curmenu
        $('.iw-curMenu').removeClass('iw-curMenu');
        menu.addClass('iw-curMenu');
        iMethods.selectMenu(menu, $(this));
      });
    },
    createMenuList: function (trgr, selector, option) {
      var baseTrigger = option.baseTrigger,
        randomNum = Math.floor(Math.random() * 10000);
      if ((typeof selector == 'object') && (!selector.nodeType) && (!selector.jquery)) {
        var menuList = $('<ul class="iw-contextMenu iw-created iw-cm-menu" id="iw-contextMenu' + randomNum + '"></ul>');

        var z = option.zIndex || trgr.css("zIndex") //added               
        menuList.css("zIndex", z)//added
        //menuList.css("zIndex", trgr.css("zIndex"))//removed
        $.each(selector, function (index, selObj) {
          var name = selObj.name,
            fun = selObj.fun || function () { },
            subMenu = selObj.subMenu,
            img = selObj.img || '',
            icon = selObj.icon || '',
            title = selObj.title || "",
            className = selObj.className || "",
            disable = selObj.disable,
            list = $('<li title="' + title + '" class="' + className + '">' + name + '</li>');

          if (img) {
            list.prepend('<img src="' + img + '" align="absmiddle" class="iw-mIcon" />');
          } else if (icon) {
            list.prepend('<span align="absmiddle" class="' + "iw-mIcon " + icon + '" />');
          }
          //to add disable
          if (disable) {
            list.addClass('iw-mDisable');
          }

          if (!subMenu) {
            list.bind('click.contextMenu', function (e) {
              fun.call(this, {
                trigger: baseTrigger,
                menu: menuList
              }, e);
            });
          }

          //to create sub menu
          menuList.append(list);
          if (subMenu) {
            list.addClass('iw-has-submenu').append('<div class="iw-cm-arrow-right" />');
            iMethods.subMenu(list, subMenu, baseTrigger, option);
          }
        });

        if (baseTrigger.index(trgr[0]) == -1) {
          trgr.append(menuList);
        } else {
          var par = option.containment == window ? 'body' : option.containment;
          $(par).append(menuList);
        }

        iMethods.onOff($('#iw-contextMenu' + randomNum));
        return '#iw-contextMenu' + randomNum;
      } else if ($(selector).length != 0) {
        var element = $(selector);
        element.removeClass('iw-contextMenuCurrent')
          .addClass('iw-contextMenu iw-cm-menu iw-contextMenu' + randomNum)
          .attr('menuId', 'iw-contextMenu' + randomNum)
          .css('display', 'none');

        //to create subMenu
        element.find('ul').each(function (index, element) {
          var subMenu = $(this),
            parent = subMenu.parent('li');
          parent.append('<div class="iw-cm-arrow-right" />');
          subMenu.addClass('iw-contextMenuCurrent');
          iMethods.subMenu(parent, '.iw-contextMenuCurrent', baseTrigger, option);
        });
        iMethods.onOff($('.iw-contextMenu' + randomNum));
        return '.iw-contextMenu' + randomNum;
      }
    },
    subMenu: function (trigger, selector, baseTrigger, option) {
      trigger.contextMenu('menu', selector, {
        triggerOn: option.subMenuTriggerOn,
        displayAround: 'trigger',
        position: 'auto',
        mouseClick: 'left',
        baseTrigger: baseTrigger,
        containment: option.containment
      });
    },
    onOff: function (menu) {

      menu.find('.iw-mOverlay').remove();
      menu.find('.iw-mDisable').each(function () {
        var list = $(this);
        list.append('<div class="iw-mOverlay"/>');
        list.find('.iw-mOverlay').bind('click mouseenter', function (event) {
          event.stopPropagation();
        });

      });

    },
    optionOtimizer: function (method, option) {
      if (!option) {
        return;
      }
      if (method == 'menu') {
        if (!option.mouseClick) {
          option.mouseClick = 'right';
        }
      }
      if ((option.mouseClick == 'right') && (option.triggerOn == 'click')) {
        option.triggerOn = 'contextmenu';
      }

      if ($.inArray(option.triggerOn, ['hover', 'mouseenter', 'mouseover', 'mouseleave', 'mouseout', 'focusin', 'focusout']) != -1) {
        option.displayAround = 'trigger';
      }
      return option;
    }
  };
})(jQuery, window, document);
/* ******************************contextmenu end************************************************************************** */


/* 
isFile: 
displayName: 
parentPath: 
parentId: 
path: 
id: 
ext: 
sep: 
*/
class FileSystemServices {
  constructor(options) {
    let self = this;
    options = options || {};
    //this.options = options;
    const fsServerUrl = options.fsServerUrl || "http://localhost:3000";
    const getDataCb =
      options.getDataCb ||
      function () {
        console.error("No getDataCb provided.");
      };
    const openCb =
      options.openCb ||
      function (data) {
        console.warn("No openCb provided.");
        console.log(data);
      };
    const listOfFileTypes = options.listOfFileTypes || [];
    const listOfOpenWithTypes = options.listOfOpenWithTypes || [];

    const imageLoaderSrc = options.imageLoaderSrc || null;
    const imageFolderSrc = options.imageFolderSrc || null;
    const imageFileSrc = "https://cdn.jsdelivr.net/gh/cah12/mongo-fs/img/file.png";//options.imageFileSrc || null;

    console.log(444, imageLoaderSrc, imageFolderSrc, imageFileSrc)


    this.storeAccessToken =
      options.storeAccessToken ||
      function storeAccessToken(token) {
        localStorage.setItem("AccessToken", token);
      };

    this.getAccessToken =
      options.getAccessToken ||
      function getAccessToken() {
        return localStorage.getItem("AccessToken");
      };

    this.clearAccessToken =
      options.clearAccessToken ||
      function clearAccessToken() {
        localStorage.removeItem("AccessToken");
      };

    var loginDlg = $(
      '<div id="registerLoginModal" class="modal fade" role="dialog"> <div class="modal-dialog"> <!-- Modal content--> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal">&times;</button> <h4 style="color:rgb(51, 122, 183);" id="dlg-title" class="modal-title">Sign Up</h4> </div> <div class="modal-body"> <div class="bottom-border"><span class="glyphicon glyphicon-user"></span><input id="dlg-username" class="no-outline" type="text" style="width: 97%; border-style: none;" placeholder="Enter Username"></div> <br> <div id="dlg-email-row"> <div class="bottom-border"><span class="glyphicon glyphicon-envelope"></span><input id="dlg-email" class="no-outline" type="text" style="width: 97%; border-style: none;" placeholder="Enter Email Address"></div> <br> </div> <div class="bottom-border"><span class="glyphicon glyphicon-lock"></span><input id="dlg-password" class="no-outline" type="password" style="width: 97%; border-style: none;" placeholder="Enter Password"></div> <br> <div id="dlg-repeat-row"> <div class="bottom-border"><span class="glyphicon glyphicon-lock"></span><input id="dlg-repeat-password" class="no-outline" type="password" style="width: 97%; border-style: none;" placeholder="Repeat Password"></div> </div> </div> <div class="modal-footer"> <div><input type="button" id="dlg-cancel-button" class="btn btn-primary" value="Cancel" /> <input type="button" id="dlg-ok-button" class="btn btn-primary" value="Sig Up" /></div> </div> </div> </div> </div>'
    );
    $("body").append(loginDlg);

    var saveDlg = $(
      '<div id="explorerSaveAsModal" class="modal fade" role="dialog" data-backdrop="static" data-keyboard="false"> <div class="modal-dialog"> <!-- Modal content--> <div id="dlg-saveDlg" class="modal-content"> <div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button> <h4 id="dlgTitle" class="modal-title">Save As</h4> </div> <div class="modal-body"><br> <div class="container"></div> <div class="row"> <div class="col-sm-1"></div> <div class="col-sm-10"> <div class="row"> <div class="col-sm-2"> <label for="parent">Folder</label> </div> <div class="col-sm-7"> <input type="text" class="form-control inputClass" id="parent" name="parent" readonly> </div> <div class="col-sm-3"> <input type="button" class="form-control inputClass" id="configButton" value="Config"> </div> </div> <br> <div class="row"> <div class="col-sm-5"> <div style="overflow: scroll; height: 200px; border: solid; border-width: 1px;"> <table style="border-width: 0px; white-space: nowrap;" id="foldersTable"> <tbody></tbody> </table> </div> </div> <div id="menuElement" style="position: relative;" class="col-sm-7"> <div style="overflow: scroll; height: 200px; border: solid; border-width: 1px;"> <table style="border-width: 0px; white-space: nowrap;" id="filesTable"> <tbody></tbody> </table> </div> </div> </div><br> <div id="inputFields"> <div class="row"> <div class="col-sm-3"> <label for="name">File name</label> </div> <div class="col-sm-9"> <input type="text" class="form-control inputClass" id="name" name="name"> </div> </div> <br> <div class="row"> <div class="col-sm-3"> <label for="parent">Save as type</label> </div> <div class="col-sm-9"> <select class="form-control inputClass" id="saveAsType"></select> </div> </div> <br> <button id="dlgSaveButton" style="width: 100%" class="btn btn-primary">Save</button> </div> </div> <div class="col-sm-1"></div> </div> </div> </div> </div> </div>'
    );
    $("body").append(saveDlg);

    var configDlg = $(
      '<div id="configModal" class="modal fade" role="dialog" data-backdrop="static" data-keyboard="false"> <div class="modal-dialog"> <!-- Modal content--> <div class="modal-content"> <div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button> <h4 id="dlg-title" style="text-align: center;" class="modal-title">Configuration</h4> </div> <div class="modal-body"><br> <div class="container"></div> <div class="row"> <div class="col-sm-1"></div> <div class="col-sm-10"> <div class="row"> <table class="config-table" style="width: 100%;"> <tr class="config-table"> <th class="config-table">Propery</th> <th class="config-table">Value</th> </tr> <tr class="config-table"> <td class="config-table">Root directory name</td> <td class="config-table"><input id="rootDir" type="text" style="width: 100%;" value="root:" /></td> </tr> <tr class="config-table"> <td class="config-table">Separator</td> <td class="config-table"><input id="sep" type="text" style="width: 100%;" value="" /></td> </tr> <tr class="config-table"> <td class="config-table">Dialog background color</td> <td class="config-table"><input id="dialog-background-color" type="color" value="#ffffff" /></td> </tr> <tr class="config-table"> <td class="config-table">Input background color</td> <td class="config-table"><input id="input-background-color" type="color" value="#ffffff" /></td> </tr> </table> </div> <br> <div class="row"> <div class="col-sm-4"><input type="button" id="config-cancel-button" class="btn btn-primary" value="Cancel" style="width: 100%" ; /></div> <div class="col-sm-4"><input type="button" id="config-restore-button" class="btn btn-primary" value="Restore Defaults" style="width: 100%" ; /></div> <div class="col-sm-4"><input type="button" id="config-ok-button" class="btn btn-primary" value="Ok" style="width: 100%" ; /></div> </div> </div> </div> </div> </div> </div> </div>'
    );
    $("body").append(configDlg);

    if (imageLoaderSrc)
      saveDlg.append(
        $(
          '<img id="imageLoader" class="loader" style= "position: absolute;" src=' + imageLoaderSrc + '>'
        )
      );
    
    var configData = null;


    $("#config-restore-button").click(() => {
      configData.dialogBackgroundColor = "#ffffff";
      configData.inputBackgroundColor = "#ffffff";
      configData.rootDir = "root:";
      configData.sep = "\\";
      $("#rootDir").val(configData.rootDir);
      $("#sep").val(configData.sep);
      $("#dialog-background-color").val(configData.dialogBackgroundColor);
      $("#input-background-color").val(configData.inputBackgroundColor);
    });

    var prevW = parseInt(saveDlg.css("width"));
    var prevH = parseInt(saveDlg.css("height"));

    if (imageLoaderSrc) {
      $("#imageLoader").css("left", prevW / 2 - 15);
      $("#imageLoader").css("top", prevH / 2 - 15);

      $(window).on("resize", () => {
        var w = parseInt(saveDlg.css("width"));
        if (w !== prevW) {
          $("#imageLoader").css("left", 0.5 * w - 15);
        }
        var h = parseInt(saveDlg.css("height"));
        if (h !== prevH) {
          $("#imageLoader").css("top", 0.5 * h - 15);
        }
      });
      $("#imageLoader").hide();
    }

    const m_fsServerUrl = fsServerUrl;
    var name = "root";
    var parentName = "";
    var currentRowSelector = null;
    var currentSelectedRowSelector = null;
    var nodes = null;
    var filesTableRowSelected = false;
    var filesTableFileSelected = false;
    var selectedName = null;
    var editing = false;
    var rigthClickOnSelectedRow = false;

    var fileExtensions = [];

    $("body").on("contextmenu", function (e) {
      e.preventDefault();
    });

    String.prototype.spliceStr = function (idx, rem, str) {
      return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
    };

    function findNode(_data) {
      return new Promise((resolve, reject) => {
        $.ajax({
          method: "POST",
          headers: {
            Authorization: "Bearer " + self.getAccessToken(),
          },
          url: m_fsServerUrl + "/node",
          data: JSON.stringify(_data),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success: function (data) {
            resolve(data);
          },
          error: function (returnval) {
            console.log("findNode fail");
            reject(null);
          },
        });
      });
    }

    //Renames a file or folder
    function renameNode(/* _data */) {
      const currentName = currentSelectedRowSelector.attr(
        "data-tt-displayName"
      );
      var _data = {};
      if (currentSelectedRowSelector.attr("data-tt-file") === "file") {
        _data.name = currentSelectedRowSelector.attr("data-tt-path");
      } else {
        _data.name = currentSelectedRowSelector.attr("data-tt-id");
      }
      var input = $('<input type="text"/>');
      input.val(currentName); //init text input
      var td = $(currentSelectedRowSelector.children()[0]);
      var innerTdHtml = td.html();
      var indexOfDisplayName = innerTdHtml.length - currentName.length;
      const n = innerTdHtml.indexOf(currentName);
      td.html(
        innerTdHtml.spliceStr(indexOfDisplayName, currentName.length, "")
      );
      td.append(input);
      input[0].focus();
      currentSelectedRowSelector.toggleClass("selected");
      editing = true;
      input.on("keyup", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) {
          input.remove();
          editing = false;
          td.html(
            innerTdHtml.spliceStr(
              indexOfDisplayName,
              $(this).val().length,
              $(this).val()
            )
          );
        }
      });
      var changed = false;
      input.focusout(async function () {
        if (!changed) {
          input.trigger("change");
        }
      });
      var m = 1;
      input.change(async function () {
        //console.log(_data.name, _data.newName)
        if (_data.name == _data.newName) {
          input.remove();
          editing = false;
          td.html(
            innerTdHtml.spliceStr(
              indexOfDisplayName,
              currentName.length,
              currentName
            )
          );
          return;
        } else {
          changed = true;
          //See if the file exists
          var g_data = {};
          var _parent = currentSelectedRowSelector.attr("data-tt-parent-id");
          g_data.name = _parent;
          g_data.name += configData.sep;

          g_data.name += $(this).val();
          if (currentSelectedRowSelector.attr("data-tt-ext")) {
            g_data.name += "." + currentSelectedRowSelector.attr("data-tt-ext");
          }

          // console.log(487, g_data)
          try {
            $.ajax({
              method: "POST",
              headers: {
                Authorization: "Bearer " + self.getAccessToken(),
              },
              url: m_fsServerUrl + "/access",
              data: JSON.stringify(g_data),
              contentType: "application/json; charset=utf-8",
              dataType: "json",
              success: async function (res) {
                var parts = input.val().split("(");
                var modifiedName = parts[0] + "(" + m + ")";
                var ans = confirm(
                  `The file "${input.val()}" already exist. Would you like to rename it to ${modifiedName}`
                );
                if (ans) {
                  input.val(modifiedName);
                  m++;
                } else {
                  _data.newName = _data.name;
                  editing = false;
                }
                changed = false;
                input[0].focus();
              },
              error: function (res) {
                _data.newName = g_data.name;
                //console.log(666)
                $.ajax({
                  method: "POST",
                  headers: {
                    Authorization: "Bearer " + self.getAccessToken(),
                  },
                  url: m_fsServerUrl + "/rename",
                  data: JSON.stringify(_data),
                  contentType: "application/json; charset=utf-8",
                  dataType: "json",
                  success: async function (data) {
                    input.remove();
                    editing = false;
                    changed = false;
                    selectedName = _data.newName;
                    await doInit(_parent);
                  },
                  error: function (returnval) {
                    input[0].focus();
                    input.trigger("change");
                  },
                });
              },
            });
          } catch (err) {
            console.log(50, err);
          }
        }
      });
    }

    function doRemove() {
      var message = "";
      if (currentSelectedRowSelector.attr("data-tt-file") == "file") {
        message = `Do you want to permanently remove the file "${currentSelectedRowSelector.attr(
          "data-tt-path"
        )}"?`;
      } else {
        message = `Do you want to permanently remove the folder "${selectedName}"?`;
      }
      if (!confirm(message)) {
        return;
      }
      var node = $("#filesTable").treetable(
        "node",
        currentSelectedRowSelector.attr("id")
      );
      var _parent = currentSelectedRowSelector.attr("data-tt-parent-id");
      var endPoint = "removeFolder";
      var m_selectedName = selectedName;
      if (currentSelectedRowSelector.attr("data-tt-file") == "file") {
        endPoint = "removeFile";
        m_selectedName = m_selectedName.replace("f", "");
      }
      var _data = { name: m_selectedName };
      $.ajax({
        method: "DELETE",
        url: m_fsServerUrl + "/" + endPoint,
        headers: {
          Authorization: "Bearer " + self.getAccessToken(),
        },
        data: JSON.stringify(_data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: async function () {
          try {
            //refresh
            await doInit(_parent);
            //Selected file/folder removed. Invalidate variable.
            selectedName = null;
          } catch {
            console.log("doInit failed");
          }
        },
        error: function (returnval) {
          console.log(returnval.responseJSON);
          alert(returnval.responseJSON.msg);
        },
      });
    }

    function addFile() {
      var _parent = $("#parent").val();
      var _data = {
        id: "inputRowId",
        isFile: true,
        displayName: "",
        parentId: _parent,
        parentPath: _parent,
      };
      var node = null;
      if (currentSelectedRowSelector) {
        node = $("#filesTable").treetable(
          "node",
          currentSelectedRowSelector.attr("id")
        );
      }
      var input = $('<input type="text"/>');
      input.val($("#name").val()); //init text input
      var inputRow = makeRow(_data);
      $("#filesTable").treetable("loadBranch", node, inputRow);
      editing = true;
      var td = $(inputRow.children()[0]);
      td.append(input);
      input[0].focus();
      var _ext = $("#saveAsType").val();
      //_data.parent = _parent; //parent name
      var error = false;

      var changed = false;
      input.focusout(async function () {
        if (!changed) {
          //changed = false;
          input.trigger("change");
        }
      });
      var n = 1;
      input.change(async function () {
        //console.log(444);
        changed = true;
        if ($(this).val().trim() == "") {
          try {
            $("#filesTable").treetable("removeNode", inputRow.attr("id"));
          } catch (err) {
            //console.log({"removeNode Error": err})
          }
        } else {
          var m_data = {};
          m_data.name = _parent + configData.sep + $(this).val();
          if (_ext !== ".all") {
            var ext = getFileExtension($(this).val());
            if (!ext || _ext !== ext) {
              m_data.name += _ext;
            }
          }
          //See if the file exists
          try {
            $.ajax({
              method: "POST",
              url: m_fsServerUrl + "/access",
              headers: {
                Authorization: "Bearer " + self.getAccessToken(),
              },
              data: JSON.stringify(m_data),
              contentType: "application/json; charset=utf-8",
              dataType: "json",
              success: async function (res) {
                var parts = input.val().split("(");
                var modifiedName = parts[0] + "(" + n + ")";
                var ans = confirm(
                  `The file "${input.val()}" already exist. Would you like to rename it to ${modifiedName}`
                );
                if (ans) {
                  input.val(modifiedName);
                  n++;
                } else {
                  input.val("");
                  editing = false;
                }
                changed = false;
                input[0].focus();
              },
            });
          } catch (err) {
            console.log(50, err);
          }
          $.ajax({
            method: "POST",
            url: m_fsServerUrl + "/createFile",
            headers: {
              Authorization: "Bearer " + self.getAccessToken(),
            },
            data: JSON.stringify(m_data),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: async function (data) {
              //refresh
              try {
                await doInit(_parent);
                editing = false;
              } catch {
                console.log("doInit failed");
              }
            },
            error: function (returnval) {
              var parts = input.val().split("(");
              var modifiedName = parts[0] + "(" + n + ")";
              var ans = confirm(
                `The file "${input.val()}" already exist. Would you like to rename it to ${modifiedName}`
              );
              if (ans) {
                input.val(modifiedName);
                n++;
              } else {
                input.val("");
                editing = false;
              }
              changed = false;
              input[0].focus();
            },
          });
        }
      });
    }

    var addingFolder = false;

    function addFolder(_data) {
      var _parent = $("#parent").val();
      var _data = {
        id: "inputRowId",
        isFile: false,
        displayName: "",
        parentId: _parent,
        parentPath: _parent,
      };

      addingFolder = true;
      var node = null;
      if (currentSelectedRowSelector) {
        node = $("#filesTable").treetable(
          "node",
          currentSelectedRowSelector.attr("id")
        );
      }

      var input = $('<input type="text"/>');
      var inputRow = makeRow(_data);
      $("#filesTable").treetable("loadBranch", node, inputRow);
      var td = $(inputRow.children()[0]);
      td.append(input);
      input[0].focus();
      input.focusout(function () {
        addingFolder = false;
        var str = $(this).val().trim();
        if ($(this).val().trim() == "") {
          try {
            $("#filesTable").treetable("removeNode", inputRow.attr("id"));
          } catch {
            //console.log("removeNode fail");
          }
        }
      });
      input.change(function () {
        addingFolder = false;
        var m_data = {};
        m_data.name = _parent + configData.sep + $(this).val();
        if ($(this).val().trim() !== "") {
          $.ajax({
            method: "POST",
            url: m_fsServerUrl + "/createFolder",
            headers: {
              Authorization: "Bearer " + self.getAccessToken(),
            },
            data: JSON.stringify(m_data),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: async function (data) {
              //refresh
              await doInit(_parent);
            },
            error: function (returnval) {
              console.log(returnval.responseJSON);
              alert(returnval.responseJSON.msg);
              input[0].focus();
            },
          });
        }
      });
    }

    let openFileWithSubmenu = [];

    var menuNotSelectedSubmenu = [
      {
        //pos: 0,
        name: "Folder",
        // img: 'images/brush.png',
        title: "Creates a new folder.",
        fun: function () {
          //console.log("Create a new folder.");
          if (addingFolder) return;
          if (
            currentSelectedRowSelector &&
            currentSelectedRowSelector.attr("data-tt-file") == "file"
          )
            return;
          //var _data = { "parent": name, "isFile": false, "name": "" };
          addFolder();
        },
      },
      {
        //pos: 4,
        //disable: true,
        name: "Text Document",
        //img: 'images/scissors.png',
        title: "Creates a new text document.",
        fun: function () {
          //console.log("Create a new file.");
          $("#name").val("New Text Document");
          $("#saveAsType").val(".txt");
          //$("#saveAsType").trigger("change")
          updateFilesTable();
          if (
            currentSelectedRowSelector &&
            currentSelectedRowSelector.attr("data-tt-file") == "file"
          )
            return;
          addFile();
        },
      },
    ];

    //build the sub-menu for 'new'
    listOfFileTypes.forEach((item) => {
      var menuItem = {
        name: item.defaultFilename,
        title: `Creates a new ${item.defaultFilename}.`,
        fun: function () {
          $("#name").val(`New ${item.defaultFilename}`);
          $("#saveAsType").val(item.ext);
          if (
            currentSelectedRowSelector &&
            currentSelectedRowSelector.attr("data-tt-file") == "file"
          )
            return;
          addFile();
        },
      };

      //console.log(menuItem);

      menuNotSelectedSubmenu.push(menuItem);
    });

    listOfOpenWithTypes.forEach((item) => {
      var menuItem = {
        name: item.name,
        title: `Opens with ${item.name}.`,
        fun: function () {
          openFileWith(item.options);
        },
      };

      //console.log(menuItem);openFileWithMenu

      openFileWithSubmenu.push(menuItem);
    });

    var menuNotSelected = [
      {
        //disable: true,
        name: "New",
        title: "Creates a new folder or file",
        subMenu: menuNotSelectedSubmenu,
      },
    ];

    var openFileWithMenu = {
      //disable: true,
      name: "Open with...",
      title: "Opens the current selection",
      subMenu: openFileWithSubmenu,
    };

    var menuSelected = [
      {
        //pos: 0,
        name: "Open",
        // img: 'images/brush.png',
        title: "Opens the current selection.",
        fun: function () {
          currentSelectedRowSelector.trigger("dblclick");
        },
      } /* ,

      openFileWithMenu */,
      {
        //pos: 0,
        name: "Rename",
        // img: 'images/brush.png',
        title: "Renames the current selection.",
        fun: function () {
          renameNode();
        },
      },
      {
        //pos: 4,
        name: "Remove",
        //img: 'images/scissors.png',
        title: "Removes current selection.",
        fun: function () {
          doRemove();
          //console.log("Removes the current selection.");
        },
      } /* ,
      newMenu, */,
    ];

    var pointIn = false;

    $("#menuElement").mouseenter(() => {
      pointIn = true;
    });

    $("#menuElement").mouseleave(() => {
      pointIn = false;
    });

    var menuActive = false;
    $("#explorerSaveAsModal").mousedown(function (e) {
      if (e.button != 2 || !pointIn /* || !filesTableRowSelected */) {
        //not right button
        if (menuActive) {
          $("#explorerSaveAsModal").contextMenu("destroy");
          menuActive = false;
        }
        return;
      }

      if (currentSelectedRowSelector && !rigthClickOnSelectedRow) {
        currentSelectedRowSelector.toggleClass("selected"); //deselect
        currentSelectedRowSelector = null;
        filesTableRowSelected = false;
        filesTableFileSelected = false;
      }

      menuActive = true;
      if (currentSelectedRowSelector) {
        //console.log("File");
        if (currentSelectedRowSelector.attr("data-tt-file") == "file") {
          //file selected. Add openFileWithMenu
          if (
            openFileWithSubmenu.length > 0 &&
            menuSelected[1].name !== "Open with..."
          ) {
            menuSelected.splice(1, 0, openFileWithMenu);
          }
        } else {
          //file not selected. Remove openFileWithMenu
          if (
            openFileWithSubmenu.length > 0 &&
            menuSelected[1].name === "Open with..."
          ) {
            menuSelected.splice(1, 1);
          }
        }
      }

      var menu = filesTableRowSelected == true ? menuSelected : menuNotSelected;
      $("#explorerSaveAsModal").contextMenu(menu, {
        triggerOn: "contextmenu touchstart",
      });
      rigthClickOnSelectedRow = false;
    });

    $("#saveAsType").append($('<option value=".all">All Files</option>'));
    fileExtensions.push(".all");
    $("#saveAsType").append(
      $('<option value=".txt">Text documents (*.txt)</option>')
    );
    fileExtensions.push(".txt");

    for (var i = 0; i < listOfFileTypes.length; ++i) {
      $("#saveAsType").append(
        $(
          "<option value=" +
          listOfFileTypes[i].ext +
          ">" +
          listOfFileTypes[i].display +
          "</option>"
        )
      );
      fileExtensions.push(listOfFileTypes[i].ext);
    }

    function getChildren(nodeName, nodeParent) {
      //console.log(nodeName, nodeParent)

      var result = [];

      for (var i = 0; i < nodes.length; ++i) {
        if (nodes[i].path.length > nodeName.length) {
          if (
            nodes[i].path.indexOf(nodeName) !== -1 &&
            nodes[i].parentPath == nodeName
          ) {
            result.push(nodes[i]);
          }
        }
      }
      return result;
    }

    function selectRow(row) {
      if (typeof row == "string") row = $(document.getElementById(row));
      if (currentRowSelector && currentRowSelector.hasClass("selected"))
        currentRowSelector.toggleClass("selected");
      if (row) {
        row.toggleClass("selected");
      }
      var idAttr = null;
      if (row && row.hasClass("selected")) {
        filesTableRowSelected = false;
        idAttr = row.attr("data-tt-id");

        if (row.attr("data-tt-parent-id")) {
          var nodeIds = row.attr("data-tt-parent-id").split(configData.sep);
          var id = "";
          for (var i = 0; i < nodeIds.length; ++i) {
            if (i > 0) {
              id += configData.sep;
            }
            id += nodeIds[i];
            $("#foldersTable").treetable("expandNode", id);
          }
        }
      }
      if (!idAttr) {
        return false;
      }
      currentRowSelector = row;
      name = idAttr; //long name
      parentName = row.attr("data-tt-parent-id");
      return true;
    }

    // Highlight selected row

    function clearFilesTable() {
      var chdrn = $($("#filesTable").children()[0]).children();
      for (var i = 0; i < chdrn.length; ++i) {
        $(chdrn[i]).remove();
      }
    }

    $("#saveAsType").on("change", () => {
      updateFilesTable();
    });

    function getFileExtension(name) {
      var l = name.length;
      var str = name[l - 4];
      if (str !== ".") return null;
      str += name[l - 3];
      str += name[l - 2];
      str += name[l - 1];
      if (str == ".all") return null;
      return str;
    }

    function updateFilesTable() {
      clearFilesTable();
      var children = getChildren(name, parentName);
      for (var i = 0; i < children.length; ++i) {
        var _name = children[i].path;
        //console.log(_name)
        if (children[i].isFile) {
          var selectedExtType = $("#saveAsType").val();
          if (selectedExtType == ".all") {
            addRow(children[i]);
            continue;
          } else {
            if (children[i].ext) {
              const dotExt = "." + children[i].ext;
              if (dotExt == selectedExtType) {
                addRow(children[i]);
              }
              continue;
            }
          }
        } else {
          addRow(children[i]);
        }
      }
    }

    $("#foldersTable tbody").on("mousedown", "tr", function (e) {
      if (e.button != 0) {
        return;
      }
      $(".selected").not(this).removeClass("selected");
      selectRow($(this));
      $("#parent").val(name);
      if ($(this).hasClass("selected")) {
        if ($(this).attr("data-tt-file") !== "file") {
          //we selected a folder
          updateFilesTable();
        }
      }
    });

    // Highlight selected row
    $("#filesTable tbody").on("mousedown", "tr", function (e) {
      if (e.button == 2) {
        if (currentSelectedRowSelector) {
          if (currentSelectedRowSelector.attr("id") !== $(this).attr("id")) {
            //right click on a non-selected row
            currentSelectedRowSelector.toggleClass("selected"); //deselect
            currentSelectedRowSelector = null;
            filesTableRowSelected = false;
            filesTableFileSelected = false;
            rigthClickOnSelectedRow = false;
          } else {
            rigthClickOnSelectedRow = true;
          }
        } else {
          rigthClickOnSelectedRow = false;
        }
        return;
      }
      if (e.button != 0 || editing) {
        return;
      }
      selectedName = null;
      $(".selected").not(this).removeClass("selected");
      $(this).toggleClass("selected");
      if ($(this).hasClass("selected")) {
        filesTableRowSelected = true;
        if ($(this).attr("data-tt-file") == "file") {
          filesTableFileSelected = true;
          $("#name").val($(this).attr("data-tt-displayName"));
          var ext = getFileExtension($("#name").val()) || ".all";
          $("#saveAsType").val(ext);
        } else {
          filesTableFileSelected = false;
        }
        currentSelectedRowSelector = $(this);
        selectedName = $(this).attr("id");
        //console.log("selectedName", selectedName);
      } else {
        filesTableRowSelected = false;
        currentSelectedRowSelector = null;
        rigthClickOnSelectedRow = false;
      }
      var _parent = $(this).attr("data-tt-parent-id");
      // console.log(455, _parent)
      //$("#foldersTable").treetable("expandNode", _parent);
    });

    $("#filesTable tbody").on("dblclick", "tr", function () {
      //console.log()
      /* if(editing){
        return;
      } */
      var _name = $(this).attr("id");
      if ($(this).attr("data-tt-file") !== "file") {
        //we selected a folder
        //var _name = $(this).attr("id");
        //console.log(111, _name)
        selectRow(_name);
        $("#parent").val(_name);
        updateFilesTable();
      } else {
        if (!editing) openFile($(this).attr("data-tt-path"));
      }
    });

    function drag(ev) {
      ev.originalEvent.dataTransfer.setData("text", $(this).attr("id"));
    }

    function allowDrop(ev) {
      ev.preventDefault();
    }

    function drop(ev) {
      ev.preventDefault();
      var originalNode = $(
        document.getElementById(ev.originalEvent.dataTransfer.getData("text"))
      );
      var finalNode = $(document.getElementById($(this).attr("id")));
      //console.log("nodes:", originalNode, finalNode)
      if (finalNode.attr("data-tt-file") !== "file") {
        var originalPath =
          originalNode.attr("data-tt-path") || originalNode.attr("id");
        var finalPath = finalNode.attr("data-tt-id");
        if (finalPath.indexOf(originalPath) !== -1) {
          //cannot drop on descendant
          console.log(789);
          return;
        }
        var parts = originalPath.split(configData.sep);
        var originalBasename = parts[parts.length - 1];
        var newName = finalPath + configData.sep + originalBasename;

        if (originalPath == newName) {
          return;
        }
        $.ajax({
          method: "POST",
          url: m_fsServerUrl + "/rename",
          headers: {
            Authorization: "Bearer " + self.getAccessToken(),
          },
          data: JSON.stringify({ name: originalPath, newName: newName }),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success: async function (data) {
            if (originalNode.attr("data-tt-file") === "file") {
              await doInit(finalPath);
            } else {
              await doInit(newName);
            }
          },
          error: function (err) {
            console.log("move", err);
          },
        });
      }
    }

    function makeRow(rootData) {
      var row = null;
      if (rootData.isFile) {
        if (imageFileSrc)
          row = $(
            '<tr draggable="true"><td><img src=' + imageFileSrc + '> ' +
            rootData.displayName +
            "</td></tr>"
          );
        else
          row = $(
            '<tr draggable="true"><td>' + rootData.displayName + '</td></tr>'
          );
        row.attr("data-tt-file", "file");
        row.attr("data-tt-ext", rootData.ext);
        row.attr("data-tt-path", rootData.path);
      } else {
        if (imageFolderSrc)
          row = $(
            '<tr><td><img src=' + imageFolderSrc + '> ' +
            rootData.displayName +
            "</td></tr>"
          );
        else
          row = $(
            '<tr><td>' + rootData.displayName + '</td></tr>'
          );
        row.attr("data-tt-file", "folder");
      }
      row.attr("data-tt-displayName", rootData.displayName);
      var _id = rootData.id;
      row.attr("data-tt-id", _id);
      row.attr("id", _id);
      if (rootData.parentPath !== undefined && rootData.parentPath !== "") {
        row.attr("data-tt-parent-id", rootData.parentId); //name is parent
      }
      if (rootData.path == configData.rootDir) {
        currentRowSelector = row;
      }
      row.on("dragstart", drag);
      row.on("dragover", allowDrop);
      row.on("drop", drop);
      return row;
    }

    function addRow(rootData) {
      $($("#filesTable").children()[0]).append(makeRow(rootData));
    }

    var options = {
      expandable: true,
      clickableNodeNames: true,
    };

    $("#filesTable").treetable(options /* , true */);

    var initialized = false;

    function openFile(filename, options) {
      options = options || { encoding: "utf8", flag: "r" };
      var _data = { name: filename, options: options };
      $.ajax({
        method: "POST",
        url: m_fsServerUrl + "/readStream",
        headers: {
          Authorization: "Bearer " + self.getAccessToken(),
        },
        data: JSON.stringify(_data),
        contentType: "application/json; charset=utf-8",
        beforeSend: function () {
          if (imageLoaderSrc)
            $("#imageLoader").show();
        },
        complete: function () {
          if (imageLoaderSrc)
            $("#imageLoader").hide();
        },
        success: function (data) {
          openCb(data, getFileExtension(filename));
        },
        error: function (returnval) {
          console.log(returnval.responseJSON);
          alert(returnval.responseJSON.msg);
        },
      });
    }

    function openFileWith(options) {
      openFile(currentSelectedRowSelector.attr("data-tt-path"), options);
    }

    $("#dlgSaveButton").click(async () => {
      try {
        const ext =
          $("#saveAsType").val() == ".all" ? null : $("#saveAsType").val();
        const data = getDataCb(ext);
        if (!data) {
          return;
        }
        await save(data);
        $("#explorerSaveAsModal").modal("toggle");
      } catch {
        $("#name")[0].focus();
      }
    });

    $(".config-close").click(() => {
      $("#configModal").modal("toggle");
    });

    this.configDlg = function () {
      self.getConfigFs((data) => {
        $("#rootDir").val(data.rootDir || "root:");
        $("#sep").val(data.sep || "\\");
        $("#dialog-background-color").val(
          data.dialogBackgroundColor || "#ffffff"
        );
        $("#input-background-color").val(
          data.inputBackgroundColor || "#ffffff"
        );
        $("#configModal").modal();
      });
    };

    $("#config-ok-button").click(async () => {
      configData.rootDir = $("#rootDir").val();
      configData.sep = $("#sep").val();
      configData.dialogBackgroundColor = $("#dialog-background-color").val();
      configData.inputBackgroundColor = $("#input-background-color").val();
      self.setConfigFs(configData, async (err) => {
        try {
          await doInit(configData.rootDir);
        } catch (err) {
          console.log("Init failed");
        }
        if (!err) {
          $("#configModal").modal("toggle");
        }
      });
    });

    this.loginDlg = function () {
      $("#dlg-repeat-row").hide();
      $("#dlg-email-row").hide();
      $("#dlg-title").html("Sign In");
      $("#dlg-ok-button").val("Sign In");
      $("#registerLoginModal").modal();
    };

    this.registerDlg = function () {
      $("#dlg-repeat-row").show();
      $("#dlg-email-row").show();
      $("#dlg-title").html("Sign Up");
      $("#dlg-ok-button").val("Sign Up");
      $("#registerLoginModal").modal();
    };

    function validateEmail(email) {
      const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
    }

    $("#dlg-ok-button").on("click", () => {
      if ($("#dlg-title").html() == "Sign In") {
        self.connectFs(
          $("#dlg-username").val(),
          $("#dlg-password").val(),
          (data) => {
            //console.log(1235, data.error)
            if (data.error) {
              alert(data.msg);
            } else {
              $("#dlg-password").val("");

              if (mongoFsLoginLogoutRegisterSeletor) {
                let innerHtml = mongoFsLoginLogoutRegisterSeletor.html();
                innerHtml = innerHtml.replace(
                  "Mongo File System(MFS) ",
                  "Logout from MFS "
                );
                mongoFsLoginLogoutRegisterSeletor.html(innerHtml);
                mongoFsLoginLogoutRegisterSeletor.attr(
                  "title",
                  "Logout from Mongo File System"
                );
                mongoFsLoginLogoutRegisterSeletor.contextMenu([]);
              }

              console.log(data.msg);
              $(window).trigger("connected");
              $("#registerLoginModal").modal("toggle");
            }
          }
        );
      } else {
        if (!validateEmail($("#dlg-email").val())) {
          alert("Invalid email");
          return;
        }
        if ($("#dlg-password").val() !== $("#dlg-repeat-password").val()) {
          alert("Password different from repeat-password");
          return;
        }
        self.registerFs(
          $("#dlg-username").val(),
          $("#dlg-password").val(),
          $("#dlg-email").val(),
          (data) => {
            if (!data.success) {
              alert(data.msg);
              $("#dlg-username").val("");
              $("#dlg-email").val("");
              $("#dlg-password").val("");
              $("#dlg-repeat-password").val("");
            } else {
              $("#dlg-password").val("");
              $("#dlg-repeat-password").val("");
              $(window).trigger("registered");
              $("#registerLoginModal").modal("toggle");
            }
          }
        );
      }
    });

    $("#dlg-password").keyup(function (e) {
      if ($("#dlg-title").html() == "Sign In") {
        if (e.keyCode === 13) {
          $("#dlg-ok-button").trigger("click");
        }
      }
    });

    $("#dlg-repeat-password").keyup(function (e) {
      if (e.keyCode === 13) {
        $("#dlg-ok-button").trigger("click");
      }
    });

    $("#configButton").click(() => {
      self.configDlg();
    });

    $("#dlg-cancel-button").on("click", () => {
      $("#registerLoginModal").modal("toggle");
    });

    let mongoFsLoginLogoutRegisterSeletor = $(
      ".mongo-fs-login-logout-register"
    );
    if (!mongoFsLoginLogoutRegisterSeletor[0]) {
      mongoFsLoginLogoutRegisterSeletor = null;
    }
    //console.log(111, mongoFsLoginLogoutRegisterSeletor)
    if (mongoFsLoginLogoutRegisterSeletor) {
      if ($(".mongo-fs-login-logout-register")[0].tagName !== "A") {
        mongoFsLoginLogoutRegisterSeletor = $("<a/>");
        $(".mongo-fs-login-logout-register").html("");
        $(".mongo-fs-login-logout-register").append(
          mongoFsLoginLogoutRegisterSeletor
        );
      }

      const glyphiconUser = $('<span class="glyphicon glyphicon-user"></span>');
      mongoFsLoginLogoutRegisterSeletor.html("Mongo File System(MFS) ");
      mongoFsLoginLogoutRegisterSeletor.append(glyphiconUser);
      mongoFsLoginLogoutRegisterSeletor.attr(
        "title",
        "Register for or Login to Mongo File System"
      );

      let mongoFsLoginLogoutRegisterMenu = [
        {
          name: "Register",
          title: "Register for Mongo File System",
          fun: self.registerDlg,
        },
        {
          name: "Login",
          title: "Login to Mongo File System",
          fun: self.loginDlg,
        },
      ];
      mongoFsLoginLogoutRegisterSeletor.contextMenu(
        mongoFsLoginLogoutRegisterMenu
      );
      mongoFsLoginLogoutRegisterSeletor.click(() => {
        if (mongoFsLoginLogoutRegisterSeletor) {
          if (
            mongoFsLoginLogoutRegisterSeletor
              .html()
              .indexOf("Logout from MFS") !== -1
          ) {
            self.disconnectFs((data) => {
              if (data.error) return console.log(data.msg);
              let innerHtml = mongoFsLoginLogoutRegisterSeletor.html();
              innerHtml = innerHtml.replace(
                "Logout from MFS ",
                "Mongo File System(MFS) "
              );
              mongoFsLoginLogoutRegisterSeletor.html(innerHtml);
              mongoFsLoginLogoutRegisterSeletor.attr(
                "title",
                "Register for or Login to Mongo File System"
              );
              mongoFsLoginLogoutRegisterSeletor.contextMenu(
                mongoFsLoginLogoutRegisterMenu
              );
              console.log(data.msg);
              $(window).trigger("disconnected");
            });
          }
        }
      });
    }

    let mongoFsExplorerSeletor = $(".mongo-fs-explorer");
    if (!mongoFsExplorerSeletor[0]) mongoFsExplorerSeletor = null;
    if (mongoFsExplorerSeletor) {
      let innerHtml = $(".mongo-fs-explorer").html().length ? $(".mongo-fs-explorer").html() : "File Explorer";
      if ($(".mongo-fs-explorer")[0].tagName !== "A") {
        mongoFsExplorerSeletor = $("<a/>");
        $(".mongo-fs-explorer").html("");
        $(".mongo-fs-explorer").append(
          mongoFsExplorerSeletor
        );
      }
      mongoFsExplorerSeletor.html(innerHtml);
      mongoFsExplorerSeletor.click(() => {
        self.explorerDlg();
      });
    }

    let mongoFsSaveAsSeletor = $(".mongo-fs-save-as");
    if (!mongoFsSaveAsSeletor[0]) mongoFsSaveAsSeletor = null;
    if (mongoFsSaveAsSeletor) {
      let innerHtml = $(".mongo-fs-save-as").html().length ? $(".mongo-fs-save-as").html() : "Save";
      if ($(".mongo-fs-save-as")[0].tagName !== "A") {
        mongoFsSaveAsSeletor = $("<a/>");
        $(".mongo-fs-save-as").html("");
        $(".mongo-fs-save-as").append(
          mongoFsSaveAsSeletor
        );
      }
      mongoFsSaveAsSeletor.html(innerHtml);
      mongoFsSaveAsSeletor.click(() => {
        self.saveDlg();
      });
    }

    this.saveDlg = function () {
      if (!self.getAccessToken()) return alert("Not connected...");
      $("#dlgTitle").html("Save As");
      $("#inputFields").show();
      $("#explorerSaveAsModal").modal();
      this.init();
    };

    this.explorerDlg = function () {
      if (!self.getAccessToken()) return alert("Not connected...");
      $("#dlgTitle").html("File Explorer");
      $("#inputFields").hide();
      $("#explorerSaveAsModal").modal();
      $("#saveAsType").val(".all");
      this.init();
    };

    function save(fileData) {
      return new Promise((resolve, reject) => {
        var _data = {};
        _data.name = $("#parent").val() + configData.sep + $("#name").val();
        _data.data = fileData;
        const ext = $("#saveAsType").val();
        if (ext !== ".all") {
          _data.name += ext;
        }
        $.ajax({
          method: "POST",
          url: m_fsServerUrl + "/createFile",
          headers: {
            Authorization: "Bearer " + self.getAccessToken(),
          },
          data: JSON.stringify(_data),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          beforeSend: function () {
            if (imageLoaderSrc)
              $("#imageLoader").show();
          },
          complete: function () {
            if (imageLoaderSrc)
              $("#imageLoader").hide();
          },
          success: function (data) {
            resolve(true);
          },
          error: function (returnval) {
            alert(returnval.responseJSON.msg);
            reject(false);
          },
        });
      });
    }

    $("#foldersTable").treetable(options);

    let prevRoot = options.rootDir || "root:";

    function doInit(selectedFolder) {
      return new Promise((resolve, reject) => {
        $("#dlg-saveDlg").css(
          "background-color",
          configData.dialogBackgroundColor || "#ffffff"
        );
        $(".inputClass").css(
          "background-color",
          configData.inputBackgroundColor || "#ffffff"
        );
        $.ajax({
          method: "GET",
          headers: {
            Authorization: "Bearer " + self.getAccessToken(),
          },
          url: m_fsServerUrl + "/tree",
          success: function (data) {
            nodes = data.tree;
            if (initialized) {
              $("#foldersTable").treetable("removeNode", prevRoot);
            } else {
            }
            selectedFolder = configData.rootDir;
            prevRoot = configData.rootDir;
            for (var i = 0; i < data.tree.length; ++i) {
              if (!data.tree[i].isFile) {
                var parentNode = $("#foldersTable").treetable(
                  "node",
                  data.tree[i].parentId
                );
                $("#foldersTable").treetable(
                  "loadBranch",
                  parentNode,
                  makeRow(data.tree[i])
                );
              }
            }
            initialized = true;
            $("#foldersTable").treetable("collapseAll");
            selectRow(selectedFolder);
            updateFilesTable();
            var m_name = selectedFolder;
            $("#parent").val(m_name);
            resolve(true);
          },
          error: function (returnval) {
            reject(false);
          },
        });
      });
    }

    this.init = async function () {
      try {
        await doInit(configData.rootDir);
      } catch (err) {
        console.log("Init failed");
      }
    };

    //email is optional
    this.registerFs = function (name, pass, email, cb) {
      let data = { username: name, password: pass, email };
      if (typeof email !== "string") {
        data.email = "";
        cb = email;
      }
      $.ajax({
        method: "POST",
        url: m_fsServerUrl + "/registerFs",
        headers: {
          Authorization: "Bearer " + self.getAccessToken(),
        },
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
          cb(data);
        },
        error: function (data) {
          cb(data);
        },
      });
    };

    this.getConfigFs = function (cb) {
      $.ajax({
        method: "GET",
        url: m_fsServerUrl + "/config",
        headers: {
          Authorization: "Bearer " + self.getAccessToken(),
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
          cb(data);
        },
        error: function (data) {
          cb(data);
        },
      });
    };

    this.setConfigFs = function (data, cb) {
      $.ajax({
        method: "POST",
        url: m_fsServerUrl + "/config",
        headers: {
          Authorization: "Bearer " + self.getAccessToken(),
        },
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function () {
          cb(null);
        },
        error: function (data) {
          cb(data.responseJSON);
        },
      });
    };

    this.connectFs = function (username, password, cb) {
      //Break any existing connection.
      if (self.getAccessToken()) {
        self.disconnectFs()
      }
      let connectOptions = { username, password };
      $.ajax({
        method: "POST",
        url: m_fsServerUrl + "/connect",
        data: JSON.stringify(connectOptions),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
          self.storeAccessToken(data.accessToken);
          configData = data.configData;
          name = configData.rootDir;
          cb && cb({ error: false, msg: "Connected" });
        },
        error: function (data) {
          cb && cb(data.responseJSON);
        },
      });
    };

    this.disconnectFs = function (cb) {
      $.ajax({
        method: "POST",
        url: m_fsServerUrl + "/disconnect",
        headers: {
          Authorization: "Bearer " + self.getAccessToken(),
        },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (data) {
          cb && cb({ error: false, msg: "Disconnected" });
        },
        error: function (data) {
          cb && cb({ error: true, msg: data.responseJSON });
        },
      });
      self.clearAccessToken();
    };

    //Break any existing connection.
    if (self.getAccessToken()) {
      self.disconnectFs();
    }

    window.addEventListener("beforeunload", function (e) {
      self.disconnectFs();
    });
  }
}

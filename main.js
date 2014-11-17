/*
outliner
-html:
	-umschalten zwischen id's, tags, classes, attr
	-context menu / (zoom oder ausschnit anzeigen)
-css querys
-colapse/open all
//-filter /prototypes,anonym,
--prefs:
-colors


minimap
-aware inline editor/view (codeMirror->events)

next version features
alle extensions können ein fenster mit ihrer id öffnen
darin sieht man dann welche neuen features schon implementiert sind
und ein voting für neue features.
und man kann ideen an den server senden
der extension autor segnet die ab oder nich und wenn ja stehen sie bei dem voting
-changelog/rating/counts:running, installed(realy)/downloads/comments/buggreporting/issues


 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Stefan Schulz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, document, $, brackets, setTimeout, localStorage, setInterval, window, CSSRule */
define(function (require, exports, module) {
    "use strict";

	//first of all init preferences 2 ensure that at load all perfs are exists
	var prefs = require('./preferences');
	prefs.init();

    var AppInit         = brackets.getModule("utils/AppInit"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        ThemeManager	= brackets.getModule("view/ThemeManager"),
		modulePath		= ExtensionUtils.getModulePath(module),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		WorkspaceManager= brackets.getModule("view/WorkspaceManager"),
		Outliner		= require('./outliner'),
		Minimap			= require('./minimap'),
		outlinerActive	= false,
		outlinerOpen	= false,
		parsed			= false,
		doClose			= false,
		$quickButton,
		$panelRight,
		$panel,
		$wrapper,
		$content,
		$outlineRoot,
		$minimapRoot,
		$footer,
		$headline,
		lastDoc,
		currDoc,
		activeTab,
		_win,
		currentView;

	exports.changeTab = function(tabName) {
		if (tabName === 'outline') {
			$minimapRoot.hide();
			$outlineRoot.show();
			Outliner.setViewState(true);
			Minimap.setViewState(false);
			activeTab = tabName;
		} else if (tabName === 'minimap') {
			$outlineRoot.hide();
			Outliner.setViewState(false);
			Minimap.setViewState(true);
			$minimapRoot.show();
			activeTab = tabName;
		}
	};

	function setActive(flag) {
		if (flag) {
			outlinerActive = true;
			$quickButton.children('img').attr('src', modulePath + './media/blueprint.png');
			openView();
		} else {
			outlinerActive = false;
			$quickButton.children('img').attr('src', modulePath + './media/blueprint_dark.png');
			closeView();
		}
	}
	function openView() {
		outlinerOpen = true;
		switch (currentView) {
			case 'right':
				$($wrapper).appendTo($panelRight);
				if (outlinerActive) {
					Resizer.show($panelRight);
				}
				Minimap.onOpenIn('right');
				break;
			case 'bottom':
				$($wrapper).appendTo($panel.$panel);
				if (outlinerActive) {
					$panel.show();
				}
				Minimap.onOpenIn('bottom');
				break;
			case 'window':
				openWindow(function () {
					Minimap.onOpenIn('window', _win);
					var container = _win.document.getElementById('blueprint-outliner');
					$($wrapper).appendTo($(container));
				});
				break;
		}
	}
	function closeView() {
		outlinerOpen = false;
		switch (currentView) {
			case 'right':
				Resizer.hide($panelRight);
				break;
			case 'bottom':
				$panel.hide();
				break;
			case 'window':
				$wrapper.detach();
				closeWindow();
				break;
		}
	}
	function switchView(viewName) {
		if (currentView === viewName) {
			return;
		}
		$wrapper.detach();
		closeView();
		currentView = viewName;
		openView();
	}

	function closeWindow() {
		if (_win) {
			doClose = true;
            _win.close();
            _win = null;
		}
	}
    function openWindow(cb) {
        if (_win && _win.closed) { _win = null; }
        if (!_win) {
			var path = 'file:///' + modulePath + 'window.html';
            _win = window.open(path);//'about:blank');
			_win.onload = function() {
				copyCssToWindow();
				cb(_win);
			};
			_win.onbeforeunload = function() {
				$wrapper.detach();
				if (!doClose) {
					currentView = 'right';
					openView();
				}
				doClose = false;
			};
        } else {
            _win.close();
            _win = null;
        }
    }
	function copyCssToWindow() {
		var mainCss = document.styleSheets,
			themePath = ThemeManager.getCurrentTheme().file._path,
			windowCss = _win.document.styleSheets;

		_win.document.head.appendChild(document.createElement("style"));

		var targetCss = windowCss[windowCss.length - 1];
		var rule_index = 0; // We'll need this to help us add the rules in order.
		for (var i=0; i<mainCss.length; i++) {
				//filter by files
				if (typeof mainCss[i].href === 'string' &&
					(mainCss[i].href.slice(-14) !== 'codemirror.css' ||
				    mainCss[i].href.slice(-20) !== themePath.slice(-20)) ) {
					continue;
				}
			for (var j=0; j<mainCss[i].cssRules.length; j++) {
				// Loop through the rules in each of the parent document's stylesheets.
				var r = mainCss[i].cssRules[j];
				if (r.type == CSSRule.IMPORT_RULE) {
					// If the current rule is an @import, copy the rules from the stylesheet it imports.
					for (var k=0; k<r.styleSheet.cssRules.length; k++) {
						/* FIXME: Assuming a max depth of 1 import for now.
						This should really be done recursively, but it's a PoC, so hey.
						*/
						// Insert the rule from the parent doc's stylesheet into ours.
						targetCss.insertRule(r.styleSheet.cssRules[k].cssText, rule_index++);
					}
				} else {
					// Insert the rule from the parent doc's stylesheet into ours.
					targetCss.insertRule(r.cssText, rule_index++);
				}
			}
		}
	}
	function parseDoc() {
		if (outlinerActive) {
			if (!Outliner.update(currDoc) && prefs.get('outline/unknownTypeChangeTab')) {
				exports.changeTab('minimap');
			}
			Minimap.update(currDoc);
			parsed = true;
		} else {
			parsed = false;
		}
		if (!currDoc) {
			if (currentView !== 'window') {
				closeView();
			}
		} else if (!lastDoc) {
			if (currentView !== 'window') {
				openView();
			}
		}
	}
	function initHtml() {
        //create quick button
        $quickButton = $('<a id="toolbar-blueprint-outline" title="toggle outline" href="#" style="font-size:22px;"><img src="' + modulePath + 'media/blueprint_dark.png"></a>');
		$("#main-toolbar .buttons").find("#toolbar-extension-manager").after($quickButton);
        $($quickButton).click(function () {
			if (outlinerActive && !outlinerOpen) {
				openView();
			} else if (outlinerActive) {
				setActive(false);
			} else {
				setActive(true);
			}
		});

		//create html   mySidePanelRight
		$('head').append('<link rel="stylesheet" type="text/css" href="' + modulePath + 'blueprint.css">');
		$panelRight = $('<div id="side-panel-right"></div>'); //right sidebar
			$wrapper = $('<div id="blueprint-outliner"></div>');
				$headline = $('<div class="headline">' +
							  '<span class="outline tab">Outline</span>' +
							  '<span class="minimap tab">Minimap</span>' +
							  '<span class="top-bottons">' +
							  	'<span class="button" name="close"></span>' +
							  	'<span class="button" name="window"></span>' +
							  	'<span class="button" name="right"></span>' +
							  	'<span class="button" name="bottom"></span></span></div>');
				$content = $('<div class="content"></div>');
					$outlineRoot = $('<ul class="outline-root childs"></ul>');
					$minimapRoot = $('<div class="minimap" id="editor-holder"></div>');
				$footer = $('<div class="footer"></div>');

		$panelRight.hide();
		$('#main-toolbar').before($panelRight);

		$wrapper.append($headline);
		$wrapper.append($content);
		$wrapper.append($footer);

		$footer.append('<div class="button prefs"></div>');

		$content.append($outlineRoot);
		$content.append($minimapRoot);

		//DropdownButton();


		$('.button.prefs', $footer).click(function () {
			if (prefs.isUiOpen()) {
				prefs.closeUI();
			} else {
				prefs.openUI();
			}
		});
		$('.button', $headline).click(function() {
			switch ($(this).attr('name')) {
				case 'bottom':
					switchView('bottom');
					break;
				case 'right':
					switchView('right');
					break;
				case 'window':
					switchView('window');
					break;
				case 'close':
					closeView();
					break;
			}
		});

		Resizer.makeResizable($panelRight[0], Resizer.DIRECTION_HORIZONTAL, 'left', 100, true);


		//resize events
		var allroundHandler = function (e, width) {
			$('.main-view .content').css('right', 'calc(' + width + 'px + 30px)');
		};
		$panelRight.on('panelResizeUpdate', allroundHandler);
		$panelRight.on('panelCollapsed', function () {
			$('.main-view .content').css('right', '30px');
		});
		$panelRight.on('panelExpanded', function (e, w) {
			if (!parsed) {
				parseDoc();
			}
			allroundHandler(e,w);
		});

	}
	function changeDocument(doc) {
		lastDoc = currDoc;
		currDoc = doc;
		parsed = false;
		exports.changeTab(prefs.get('generel/autoChangeTab'));
		parseDoc();
	}

	//extention rating ping
    var trackingServiceUrl = 'http://brackets-online.herokuapp.com/',
        // http://brackets-online.herokuapp.com/ is an address of default tracking service
        // Change it if you use self-hosting instance of online tracking service
        appToken = '543d126e454c6181ea000118',
        // read https://github.com/dnbard/brackets-extension-rating/wiki/Online-and-max-users-counters-in-this-extension
        // to learn on how to obtain an application token for your extension
        mins60 = 60 * 60 * 1000,
        mins5 = 5 * 60 * 1000,
        keyId = 'blueprint.outliner';

    function tick(){
        var userId = getUserId(appToken, keyId),
            url;
        if (userId){
            url = trackingServiceUrl + 'tick/' + appToken + '/' + userId;
        } else {
            url = trackingServiceUrl + 'tick/' + appToken;
        }

        $.ajax({ url: url })
            .success(function(data){
                //TODO: create complex model of data in local storage to support any number of extensions
                if (data && data !== 'OK' && data !== 'ERROR'){
                    saveUserId(data, appToken, keyId);
                }
            }).error(function(){
                console.log('Can\'t track online status, retry in 5 mins') ;
                setTimeout(tick, mins5);
            });
    }


    function getUserId(appToken, keyId){
        if (typeof appToken !== 'string' || typeof keyId !== 'string'){
            throw new Error('Invalid argument');
        }

        return JSON.parse(localStorage.getItem(keyId) || '{ }')[appToken];
    }

    function saveUserId(id, appToken, keyId){
        if (typeof id !== 'string' || typeof appToken !== 'string' || typeof keyId !== 'string'){
            throw new Error('Invalid argument');
        }

        var obj = JSON.parse(localStorage.getItem(keyId) || '{ }');
        obj[appToken] = id;
        localStorage.setItem(keyId, JSON.stringify(obj));
    }
	//extension rating ping end
	AppInit.appReady(function () {
		//extension rating tick
		tick();
        setInterval(tick, mins60);
		//create html
		$panel = WorkspaceManager.createBottomPanel('blueprint-bottomPanel', $("<div id='blueprint-bottomPanel' class='bottom-panel'></div>"), 200);
		initHtml();

		Outliner.init($outlineRoot);
		Minimap.init($minimapRoot);

		var openState = prefs.get('generel/openOnStart');
		if (openState !== false) {
			setActive(true);
			switchView(openState);
		} else {
			switchView('right');
		}

		window.addEventListener("focus", function() {
			if (_win) {
//				setTimeout(function(){
//					window.blur();
//					console.log('focus', _win.focus());
//					_win.focus();
//				}, 1000);
			}
		}, false);
		$('.tab', $headline).click(function () {
			if ($(this).hasClass('outline')) {
				exports.changeTab('outline');
			} else {
				exports.changeTab('minimap');
			}
		});
		$(DocumentManager).on('documentSaved', function (e, document) {
			//if (!Resizer.isVisible($panelRight)) return true;
			if (currDoc === document) {
				parsed = false;
				parseDoc();
			}
		});
		$(DocumentManager).on('currentDocumentChange', function (e, cd) {
			//if (!Resizer.isVisible($panelRight)) return true;
			changeDocument(cd);
		});
    });

});

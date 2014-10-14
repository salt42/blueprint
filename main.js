/*
glob:
-conf
-switch if outliner cant show


*/

/*
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
/*global define, $, brackets, window */
define(function (require, exports, modul) {
    "use strict";

    var AppInit         = brackets.getModule("utils/AppInit"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		MainViewManager	= brackets.getModule('view/MainViewManager'),
		Outliner		= require('./outliner'),
		Minimap			= require('./minimap'),
		$quickButton,
		$panelRight,
		$content,
		$outlineRoot,
		$minimapRoot,
		$footer,
		$footerOutline,
		$headline,
		currDoc,
		sidebarOpen,
		activeTab,
		parsed = false;

	function changeTab(tabName) {
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
	}
	function toggleSidebar(flag) {
		if(flag) {
			Resizer.show($panelRight);
		} else {
			Resizer.hide($panelRight);
		}
	}
	//(e, newFile:File, newPaneId:string, oldFile:File, oldPaneId:string)
	$(MainViewManager).on('currentFileChange ', function(e, newFile, newPaneId, oldFile, oldPaneId) {
		if (newFile != null) {
			var doc = DocumentManager.getDocumentForPath(newFile._path);
			doc.done(function(doc) {
				currDoc = doc;
				parsed = false;
				parseDoc();
			});
		}
	});
	//(e, newPaneId:string, oldPaneId:string)
	$(MainViewManager).on('activePaneChange', function(e, newPaneId, oldPaneId) {
		//console.log(newPaneId + ' now active')
	});

	function parseDoc() {
		if (sidebarOpen) {
			Outliner.update(currDoc);
			Minimap.update(currDoc);
			parsed = true;
		} else {
			parsed = false;
		}
	}

	function initHtml() {
		var modulePath = ExtensionUtils.getModulePath(modul);
        //create quick button
		// &#955;   HL sing
        $quickButton = $('<a id="toolbar-blueprint-outline" title="toggle outline" href="#" style="font-size:22px;"><img src="' + modulePath + '/blueprint_dark.png"></a>');
		$("#main-toolbar .buttons").find("#toolbar-extension-manager").after($quickButton);
        $($quickButton).click(function () {
			if (Resizer.isVisible($panelRight)) {
				//hide
				sidebarOpen = false;
				Resizer.hide($panelRight);
				$quickButton.children('img').attr('src', modulePath + '/blueprint_dark.png');
			} else {
				//show
				sidebarOpen = true;
				Resizer.show($panelRight);
				$quickButton.children('img').attr('src', modulePath + '/blueprint.png');
			}
		});

		//create html
		$('head').append('<link rel="stylesheet" type="text/css" href="' + modulePath + '/css.css">');
		$panelRight = $('<div id="mySidePanelRight"></div>');
			$headline = $('<div class="headline"><span class="outline tab">Outline</span><span class="minimap tab">Minimap</span></div>');
			$content = $('<div class="content"></div>');
				$outlineRoot = $('<ul class="outline-root childs"></ul>');
				$minimapRoot = $('<div class="minimap"></div>');
			$footer = $('<div class="footer"></div>');
		$panelRight.hide();
		$('#main-toolbar').before($panelRight);
		$panelRight.append($headline);
		$panelRight.append($content);
		$panelRight.append($footer);

		$content.append($outlineRoot);
		$content.append($minimapRoot);

		Resizer.makeResizable($panelRight[0], Resizer.DIRECTION_HORIZONTAL, 'left', 100, true);


		//resize events
		var allroundHandler = function (e, width) {
			$('.main-view .content').css('right', 'calc(' + width + 'px + 30px)');
		};
		$panelRight.on('panelResizeUpdate', allroundHandler);
		$panelRight.on('panelExpanded', allroundHandler);
		$panelRight.on('panelCollapsed', function () {
			$('.main-view .content').css('right', '30px');
		});
		$panelRight.on('panelCollapsed panelExpanded', function (e) {
			if (e.type === 'panelExpanded') {
				//show
				sidebarOpen = true;
				if (!parsed) parseDoc();
				$quickButton.children('img').attr('src', modulePath + '/blueprint.png');
			} else {
				//hide
				sidebarOpen = false;
				$quickButton.children('img').attr('src', modulePath + '/blueprint_dark.png');
			}
		});

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
	AppInit.appReady(function () {
		var modulePath = ExtensionUtils.getModulePath(modul);
		//create html
		tick();
        setInterval(tick, mins60);
		initHtml();

		Outliner.init($outlineRoot);
		Minimap.init($minimapRoot);


		$('.tab', $headline).click(function (e) {
			if ($(this).hasClass('outline')) {
				changeTab('outline');
			} else {
				changeTab('minimap');
			}
		});
		$(DocumentManager).on('documentSaved', function (e, document) {
			//if (!Resizer.isVisible($panelRight)) return true;
			if (currDoc === document) {
				parsed = false;
				parseDoc();
			}
		});
		$(DocumentManager).on('currentDocumentChange', function (e, cd, prevDoc) {
			//if (!Resizer.isVisible($panelRight)) return true;
			currDoc = cd;
			parsed = false;
			parseDoc();
		});
		changeTab('outline');
		sidebarOpen = false;
//		toggleSidebar(true); muss später passieren
    });
});

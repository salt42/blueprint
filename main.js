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
		currDoc,
		$headline;


	function changeTab(tabName) {
		if (tabName === 'outline') {
			$minimapRoot.hide();
			$outlineRoot.show();
			$content.removeClass('minimap').addClass('outline');//@todo pointless ?
		} else if (tabName === 'minimap') {
			$outlineRoot.hide();
			$minimapRoot.show();
			$content.removeClass('outline').addClass('minimap'); //@todo pointless ?
		}
	}
	//(e, newFile:File, newPaneId:string, oldFile:File, oldPaneId:string)
	$(MainViewManager).on('currentFileChange ', function(e, newFile, newPaneId, oldFile, oldPaneId) {
		if (newFile != null) {
			var doc = DocumentManager.getDocumentForPath(newFile._path);
			doc.done(function(doc) {
				currDoc = doc;
				parseDoc();
			});
		}
	});
	//(e, newPaneId:string, oldPaneId:string)
	$(MainViewManager).on('activePaneChange', function(e, newPaneId, oldPaneId) {
		//console.log(newPaneId + ' now active')
	});
	function parseDoc() {
		//Minimap.update(currDoc);
		Outliner.update(currDoc)
/*		$outlineRoot.html('');
		if (mode === 'javascript') {
			myWorker.postMessage(text);
			//changeTab('outline');
/*			DocumentManager.getDocumentText(currDoc.file).done(function (content) {
				myWorker.postMessage(content);
			});
		} else if (mode === 'css') {
			updateCss(text);
			//changeTab('outline');
/*			DocumentManager.getDocumentText(currDoc.file).done(function (content) {
				updateCss(content);
			});
		} else {
			//changeTab('minimap');
			$outlineRoot.html('I don\'t understand "' + mode + '"<br>for the moment i only now JavaScript and CSS ');
		}
		//update minimap
		updateMap(text, mode);*/
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
				Resizer.hide($panelRight);
				$quickButton.children('img').attr('src', modulePath + '/blueprint_dark.png');
			} else {
				//show
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
	}

	AppInit.appReady(function () {
		var modulePath = ExtensionUtils.getModulePath(modul);
		//create html
		initHtml();

		Outliner.init($outlineRoot);
		Minimap.init($minimapRoot);


		$('.tab', $headline).click(function (e) {
			if ($(this).hasClass('outline')) {
				if ($content.hasClass('minimap')) {
					//show outline
					changeTab('outline');
				}
			} else {
				if ($content.hasClass('outline')) {
					//show minimap
					changeTab('minimap');
				}
			}
		});
		changeTab('outline');
    });
});

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, $, brackets, window, Worker */

define(function (require, exports, modul) {
    "use strict";
    var AppInit         = brackets.getModule("utils/AppInit"),
		EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		CodeMirror		= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$quickButton,
		$panelRight,
		$content,
		$outlineRoot,
		$minimap,
		$minimapOverlay,
		$minimapRoot,
		$footer,
		currDoc,
		$headline,
		myWorker;


	function setEditorLine(line) {
		var currentEditor = EditorManager.getActiveEditor();
        currentEditor.setCursorPos(line - 1, 0, true);
        currentEditor.focus();
        //setTimeout(function(){currentEditor.focus()}, 10);
	}

	function setEditorView(firstLine) {
		var currentEditor = EditorManager.getActiveEditor(),
			scrollPosition = firstLine * currentEditor.getTextHeight();
		currentEditor.setScrollPos(0, scrollPosition);
		currentEditor.focus();
		updateScrollOverlay();
	}


	function updateMap(text, mode) {
		$minimapRoot.html('');
		CodeMirror.runMode(text, mode, $minimapRoot[0]);
		updateScrollOverlay();
	}

	function updateScrollOverlay() {
		var $scrollbar = $('#editor-holder .CodeMirror:visible .CodeMirror-scroll'),
			currentEditor = EditorManager.getActiveEditor(),
			firstLine = Math.round(currentEditor.getScrollPos().y / currentEditor.getTextHeight()),
			lineHight = 20;

		var t = $scrollbar.height() / currentEditor.getTextHeight();
		$minimapOverlay.css('height', t * lineHight + 'px');
		if ($minimap.height() > $content.height()) {
			var overageLines = ($minimap.height() - $content.height()) / lineHight;
			//var overageLines = $content.height() / lineHight;
			var scrollPercent = currentEditor.getScrollPos().y / ($minimap.height() - $content.height());
			//var scrollPercent = 1;
			console.log(scrollPercent);
			$minimapRoot.css('top', 0 - (Math.round( scrollPercent * overageLines ) * lineHight) + 'px');
			//$minimapRoot.css('top',(($minimap.height() * currentEditor.getVirtualScrollAreaTop()) / currentEditor.totalHeight()) + 'px');
		} else {
			$minimapRoot.css('top', 0 + 'px');
		}

		$minimapOverlay.css('top', parseInt($minimapRoot.css('top')) + (firstLine * lineHight) + 'px');
	}

	function jumpTo(y, setCursor) {
		//y == mouse.y relative 2 minimap
//		var t = $minimapRoot.css('top');
//		var top = Math.abs(parseInt(t.replace('px', '')));
		var clickedLine = Math.round(y / 20 * 4);
		if (setCursor) {
			setEditorLine(clickedLine);
		} else {
			console.log(clickedLine, y);
			setEditorView(clickedLine);
		}

	}


	function init() {
		var modulePath = ExtensionUtils.getModulePath(modul),
			currentEditor = EditorManager.getActiveEditor();




		var dragState = false;

		$($minimap).on('mousedown', function(e) {
			console.log(e)
			if (e.target === $minimapOverlay[0]) {
				dragState = 'possible';
			} else if (e.target === $minimapRoot[0] || e.target.offsetParent === $minimapRoot[0]) {
				//console.log(e.offsetY);
				//scrollTo(e.offsetY);
				jumpTo(e.offsetY , true);
			}
		});
		$($minimap).on('mousemove', function(e) {
			if (dragState == 'possible') {
				//start dragging
				dragState = 'dragging';
			}
			if (dragState == 'dragging') {
				console.log(e);
				var minimapRootTop = parseInt($minimapRoot.css('top')),
					minimapOverlayTop = parseInt($minimapOverlay.css('top'));
				console.log();
				jumpTo(minimapRootTop + minimapOverlayTop + e.offsetY, false);
			}
		});
		//mouseup on document
		$(document).on('mouseup', function(e) {
			if (dragState === 'dragging' || dragState === 'possible') {
				dragState = false;
			}
		});

		$($minimap).on('mousewheel', function(e) {
			scrollTo(e.originalEvent.wheelDeltaY * -1, true);
			return false;
		});

		$(currentEditor).on('scroll', function(e) {
			if (dragState === false) {
				updateScrollOverlay();
			}
		});
		$(DocumentManager).on('documentSaved', function (e, document) {
			//if (!Resizer.isVisible($panelRight)) return true;
			if (currDoc === document) {
				parseDoc();
			}
		});
		$(DocumentManager).on('currentDocumentChange', function (e, cd, prevDoc) {
			//if (!Resizer.isVisible($panelRight)) return true;
			currDoc = cd;
			parseDoc();
		});
		//load startup document
		currDoc = DocumentManager.getCurrentDocument();
		parseDoc();
		updateScrollOverlay();
		changeTab('minimap');
    }
	AppInit.appReady(init);
});// .CodeMirror-scroll>.CodeMirror-sizer  min-height   -30px = height

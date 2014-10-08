define(function (require, exports, modul) {
    "use strict";
    var EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		CodeMirror		= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),

		dragState 		= false,
		$content,
		$root,
		$minimapOverlay,
		$minimapRoot;


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

	function setEditorView(firstLine) {
		var currentEditor = EditorManager.getActiveEditor(),
			scrollPosition = firstLine * currentEditor.getTextHeight();
		currentEditor.setScrollPos(0, scrollPosition);
		currentEditor.focus();
		updateScrollOverlay();
	}
	function updateScrollOverlay() {
		var $scrollbar = $('#editor-holder .CodeMirror:visible .CodeMirror-scroll'),
			currentEditor = EditorManager.getActiveEditor(),
			firstLine = Math.round(currentEditor.getScrollPos().y / currentEditor.getTextHeight()),
			lineHight = 20;

		var t = $scrollbar.height() / currentEditor.getTextHeight();
		$minimapOverlay.css('height', t * lineHight + 'px');
		if ($root.height() >
			$content.height()) {
			var overageLines = ($root.height() - $content.height()) / lineHight;
			//var overageLines = $content.height() / lineHight;
			var scrollPercent = currentEditor.getScrollPos().y / ($root.height() - $content.height());
			//var scrollPercent = 1;
			console.log(scrollPercent);
			$minimapRoot.css('top', 0 - (Math.round( scrollPercent * overageLines ) * lineHight) + 'px');
			//$minimapRoot.css('top',(($root.height() * currentEditor.getVirtualScrollAreaTop()) / currentEditor.totalHeight()) + 'px');
		} else {
			$minimapRoot.css('top', 0 + 'px');
		}

		$minimapOverlay.css('top', parseInt($minimapRoot.css('top')) + (firstLine * lineHight) + 'px');
	}


	exports.init = function ($parent) {
		$root = $parent;
		$minimapOverlay = $('<div class="minimap-overlay"></div>');
		$minimapRoot = $('<div class="minimap-root cm-s-dark-theme"></div>');
		$content = $($parent.parent('.content')[0]);



		$parent.on('mousedown', function(e) {
			console.log(e)
			if (e.target === $minimapOverlay[0]) {
				dragState = 'possible';
			} else if (e.target === $minimapRoot[0] || e.target.offsetParent === $minimapRoot[0]) {
				//console.log(e.offsetY);
				//scrollTo(e.offsetY);
				jumpTo(e.offsetY , true);
			}
		});
		$parent.on('mousemove', function(e) {
			if (dragState == 'possible') {
				//start dragging
				dragState = 'dragging';
			}
			if (dragState == 'dragging') {
				console.log(e);
				var minimapRootTop = parseInt($minimapRoot.css('top')),
					minimapOverlayTop = parseInt($minimapOverlay.css('top'));
				jumpTo(minimapRootTop + minimapOverlayTop + e.offsetY, false);
			}
		});
		//mouseup on document
		$(document).on('mouseup', function(e) {
			if (dragState === 'dragging' || dragState === 'possible') {
				dragState = false;
			}
		});

//		$parent.on('mousewheel', function(e) {
//			scrollTo(e.originalEvent.wheelDeltaY * -1, true);
//			return false;
//		});
		var currentEditor = EditorManager.getActiveEditor();
		$(currentEditor).on('scroll', function(e) {
			console.log(e)
			if (dragState === false) {
				updateScrollOverlay();
			}
		});

		$parent.append($minimapOverlay);
		$parent.append($minimapRoot);
	};
	exports.update = function (content, language) {
		$minimapRoot.html('');
		CodeMirror.runMode(content, language, $minimapRoot[0]);
		updateScrollOverlay();
	};
});

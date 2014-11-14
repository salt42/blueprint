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
/*global define, $, brackets, document */
define(function (require, exports) {
    "use strict";
    var EditorManager   = brackets.getModule("editor/EditorManager"),
		ThemeManager  = brackets.getModule("view/ThemeManager"),
		CodeMirror		= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		prefs			= require('./preferences'),
		_document,
		$content,
		$root,
		$minimapOverlay,
		$minimapRoot,
		viewCorrection = 54;


	var entityMap = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': '&quot;',
		"'": '&#39;',
		"/": '&#x2F;'
	};

	function escapeHtml(string) {
		return String(string).replace(/[&<>"'\/]/g, function (s) {
			return entityMap[s];
		});
	}
	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: http://codemirror.net/LICENSE
	CodeMirror.runMode = function(string, modespec) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, modespec),
			options,
			html = '<span class="line-number" value="1"></span>',
			lineNumber = 1,
			tabSize = (options && options.tabSize) || CodeMirror.defaults.tabSize,
			col = 0;


		var callback = function(text, style) {
			if (text == "\n") {
				(++lineNumber);
				col = 0;
				html += '\n<span class="line-number" value="' + lineNumber + '"></span>';
				return;
			}
			var content = '';
			// replace tabs
			for (var pos = 0;;) {
				var idx = text.indexOf("\t", pos);
				if (idx == -1) {
					content += text.slice(pos);
					col += text.length - pos;
					break;
				} else {
					col += idx - pos;
					content += text.slice(pos, idx);

					var size = tabSize - col % tabSize;
					col += size;
					for (var i = 0; i < size; ++i) {
						content += " ";
					}
					pos = idx + 1;
				}
			}
			if (style) {
				if (style === 'string') {
					content = escapeHtml(content);
				}
				var className = "cm-" + style.replace(/ +/g, " cm-");
				html += '<span class="' + className + '">' + content + '</span>';
			} else {
				html += content;
			}
		};

		var lines = CodeMirror.splitLines(string),
			state = CodeMirror.startState(mode);

		for (var i = 0, e = lines.length; i < e; ++i) {
			if (i) {
				callback("\n");
			}
			var stream = new CodeMirror.StringStream(lines[i]);
			while (!stream.eol()) {
				var style = mode.token(stream, state);
				callback(stream.current(), style);
				stream.start = stream.pos;
			}
		}
		return html;
	};

	function jumpTo(y, setCursor) {
		var clickedLine = Math.round(y / 20 * 4);
		if (setCursor) {
			setEditorLine(clickedLine);
		} else {
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
	function setEditorLine(line) {
		var currentEditor = EditorManager.getActiveEditor();
        currentEditor.setCursorPos(line - 1, 0, true);
        currentEditor.focus();
	}
	function updateScrollOverlay() {
		if (!_document) { return false;}
		var currentEditor = _document._masterEditor,
			editorHeight = $(currentEditor.getScrollerElement()).height(),
			lineHight = 20,
			contentHeight = $content[0].parentNode.clientHeight - viewCorrection,
			scrollPercent = currentEditor.getScrollPos().y / (currentEditor.totalHeight() - 18 - editorHeight),
			lines = currentEditor.lineCount() + 1,
			overlayTop;

		var overlayHeight = Math.round(editorHeight / currentEditor.getTextHeight() * lineHight / 4);
		$minimapOverlay.css('height', overlayHeight + 'px');
//		if ($minimapRoot.height() / 4 + 5 > contentHeight) {
		if ((lines + 1) * 5 > contentHeight) {
			var overageLines = lines - contentHeight / 5;
			$minimapRoot.css('top', 0 - (scrollPercent * (overageLines) * 20) + 'px');
			overlayTop = scrollPercent * (contentHeight - $minimapOverlay.height());// - overlayHeight;//(overlayHeight / 4)) * 4;
		} else {
			$minimapRoot.css('top', 0 + 'px');
			overlayTop = scrollPercent * ((lines * 5) - $minimapOverlay.height());// - overlayHeight;//(overlayHeight / 4)) * 4;
		}
		$minimapOverlay.css('top', overlayTop + 'px');
	}
	function moveOverlay(y, percent) {
		if (!_document) { return false;}
		var contentHeight = $content[0].parentNode.clientHeight - viewCorrection,
			hundertPro,
			perCent,
			lines = _document._masterEditor.lineCount();


		if ((lines * 5) > contentHeight) {
			hundertPro = contentHeight - $minimapOverlay.height();
		} else {
			hundertPro = (lines * 5) - $minimapOverlay.height();
		}

		perCent = (parseInt($minimapOverlay.css('top')) + y) / hundertPro;
		if (percent) {
			perCent = (parseInt($minimapOverlay.css('top'))) / hundertPro + y;
		}
		var currentEditor = _document._masterEditor,
			editorHeight = $(currentEditor.getScrollerElement()).height();
			//scrollPercent = currentEditor.getScrollPos().y / (currentEditor.totalHeight() - 18 - editorHeight);
		if (perCent > 1) {
			perCent = 1;
		}
		//set scroll pos
		var newY = Math.round(perCent * (currentEditor.totalHeight() - 18 - editorHeight));

		currentEditor.setScrollPos(0, newY);
		updateScrollOverlay();
	}

	function appendStringAsNodes() {
		/* jslint ignore:start */
		var frag = document.createDocumentFragment(),
			element = arguments[0],
			html = arguments[1],
			tmp = document.createElement('body'),
			child;

		tmp.innerHTML = html;

		while (child = tmp.firstChild) {
			frag.appendChild(child);
		}
		element.appendChild(frag); // Now, append all elements at once

		frag = tmp = null;
		/* jslint ignore:end */
	}
	//api
	var dragState = false,
		lastEvent;

	function mouseUpHelper() {
		if (dragState === 'dragging' || dragState === 'possible') {
			dragState = false;
		}
	}
	exports.init = function ($parent) {
		$root = $parent;
		$minimapOverlay = $('<div class="minimap-overlay"></div>');// cm-s-light-theme"></div>');
		$minimapRoot = $('<div class="minimap-root CodeMirror cm-s-rhode-island-red"></div>');
		$content = $($parent.parent('.content')[0]);

		$parent.on('mousedown', function(e) {
			if (e.target === $minimapOverlay[0]) {
				dragState = 'possible';
				lastEvent = e;
			} else if (e.target === $minimapRoot[0] || e.target.offsetParent === $minimapRoot[0]) {
				jumpTo(e.offsetY , true);
			}
		});
		$parent.on('mousemove', function(e) {
			if (dragState == 'possible') {
				//start dragging
				dragState = 'dragging';
			}
			if (dragState == 'dragging') {
				moveOverlay(e.clientY - lastEvent.clientY);
				lastEvent = e;
			}
		});
		//mouseup on document
		$(document).on('mouseup', mouseUpHelper);

		$parent.on('mousewheel', function(e) {
			//@todo scroll speed pref auf scroll übertragen
			var speed = parseInt(prefs.get('minimap/scrollSpeed')),
				editor = _document._masterEditor,
				lineHeight = editor.getTextHeight(),
				scroll = lineHeight * speed;

			if (e.originalEvent.wheelDeltaY > 0) {
				scroll = -Math.abs(scroll);
			}
			var y = editor.getScrollPos().y;
			editor.setScrollPos(null, y + scroll);
		});
		$parent.append($minimapOverlay);
		$parent.append($minimapRoot);

//		$(EditorManager).on('activeEditorChange', function (e, newFocusEditor) {
//			//@todo
//		});
	};
	exports.update = function (doc) {
		if (!doc) {
			//clear
			$('.wrap' ,$minimapRoot).remove();
			_document = null;
			return true;
		}
		var mode = doc.getLanguage().getMode(),
			text = doc.getText();

		$('.wrap' ,$minimapRoot).remove();
		_document = doc;

		var html = CodeMirror.runMode(text, mode);
		$minimapRoot.append('<div class="wrap CodeMirror-scroll"></div>');
		appendStringAsNodes($('.wrap' ,$minimapRoot)[0], html);

		var currentEditor = doc._masterEditor;
		$(currentEditor).on('scroll', function() {
			if (dragState === false) {
				updateScrollOverlay();
			}
		});
	};
	exports.onOpenIn = function(viewName, win) {
		if (viewName === 'window') {
			$(win).on('mouseup', mouseUpHelper);
			viewCorrection = 54;
		} else if(viewName === 'bottom') {
			viewCorrection = 28;
		} else {
			viewCorrection = 54;
		}
	};
	exports.setViewState = function (state) {
		if (state) {
			updateScrollOverlay();
		} else {

		}
	};
});

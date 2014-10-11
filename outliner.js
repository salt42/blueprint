/*
glob:
-lizenz
-conf
-switch if outliner cant show

outliner:
-sorting

minimap:
-dont parese if hidden
-?zoom


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
/*global define, $, brackets, window, Worker */
define(function (require, exports, modul) {
    "use strict";
    var EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),

		$root,
		JsWorker;


	function setEditorLine(line) {
		var currentEditor = EditorManager.getCurrentFullEditor();
        currentEditor.setCursorPos(line - 1, 0, true);
        currentEditor.focus();
        //setTimeout(function(){currentEditor.focus()}, 10);
	}
	function updateJsTree(dataTree) {
		var parents = [],
			k;
		$root.html('');
		var recBuild = function (data) {
			var html = '',
				paramStr = '',
				cssClasses = 'toggle',
				mouseOverText = 'Attributes: &nbsp;&nbsp;';

			html = '<span class="type">' + data.type + '&nbsp;</span><span class="func-name">' + data.name + '</span><span class="func-params"> ( ';
			for (k = 0; k < data.params.length; k++) {
				var type = '&lt;' + data.params[k].type + '&gt; ';
				if (data.params[k].type === '') {
					type = '';
				}
				mouseOverText += '\n ' + type + ' ' + data.params[k].name;
				paramStr += ', ' + type + data.params[k].name;
				if (type !== '') {
					html += '<span class="type">' + type + '</span>';
				}
				html += '<span class="name">' + data.params[k].name + '</span>';
				if (k !== data.params.length - 1) {
					html += ', ';
				}
			}
			html += ' )   </span>';
			paramStr = paramStr.substr(1);

			if (data.childs.length === 0) {
				cssClasses += ' no-childs';
			}
			var $ele = $('<li><div class="' + cssClasses + '">&nbsp;</div><span class="line" title="' + mouseOverText + '">' + html + '</span><ul class="childs"></ul></li>');

			$ele.click(function (e) {
				if ($(e.target).hasClass('toggle')) {
					//hide/show
					if ($(e.target).hasClass('colapsed')) {
						$(e.target).removeClass('colapsed');
					} else {
						$(e.target).addClass('colapsed');
					}
					$('.childs', this).toggle();
				} else {
					setEditorLine(data.loc.start.line);
				}
				return false;
			});
			if (parents.length === 0) {
				$root.append($ele);
			} else {
				parents[parents.length - 1].children('.childs').append($ele);
			}
			parents.push($ele);
			for (k in data.childs) {
				recBuild(data.childs[k]);
			}
			parents.pop();
		};
		for (k in dataTree.childs) {
			recBuild(dataTree.childs[k]);
		}
	}
	function updateCss(content) {
		var lines = content.split("\n"),
			i,
			re,
			onClickOnLine = function (e) {
				setEditorLine(e.data);
			};

		$root.html('');
		for (i = 0; i < lines.length; i++) {
			re = lines[i].match(/^(.*?){/);
			if (re !== null) {
				var selectorText = re[1].trim();
				var $ele = $('<li><span class="line" title="' + selectorText + '"><span class="selector">' + selectorText + '</span></span></li>');
				$ele.appendTo($root);
				$ele.click(i + 1, onClickOnLine);
			}
		}
	}

	exports.init = function ($parent) {
		$root = $parent;
		var modulePath = ExtensionUtils.getModulePath(modul);
		$parent.append('<div>outliner</div>');

		JsWorker = new Worker(modulePath + "/outlineWorker.js");
		JsWorker.onmessage = function (e) {
			if (e.data.type === 'log') {
				console.log(e.data.value[0], e.data.value[1]);
			} else if (e.data.type === 'data') {
				updateJsTree(e.data);
			}
		};
		JsWorker.addEventListener('error', function(e) {
			console.log('outline worker error: ' + e.message);
		}, false);

	};
	exports.update = function (doc) {
		var mode = doc.getLanguage().getMode(),
			text = doc.getText();

		if (mode === 'javascript') {
			JsWorker.postMessage(text);
			//changeTab('outline');
		} else if (mode === 'css') {
			updateCss(text);
			//changeTab('outline');
		} else {
			//changeTab('minimap');
			$root.html('I don\'t understand "' + mode + '"<br>for the moment i only now JavaScript and CSS ');
		}
	};
});

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
/*global define, $, brackets */
define(function (require, exports) {
    "use strict";
    var EditorManager   = brackets.getModule("editor/EditorManager"),
		prefs = require('./preferences'),
		$root,
		$content,
		$footerOutline,
		_document,
		sortMode = 'none',
		newDocFlag = true,
		outlines = {
//			'html' : require('./outlines/html'),
			'css' : require('./outlines/css'),
			'js' : require('./outlines/js'),
		};

	/** create dom tree
	 *	@param {object} dataTree
	 */
	function updateTree(dataTree) {
		$root.html('');
		var recursive = function (node) {
			var html = '',
				dataDash = '',
				name,
				typeStr = '';

			//create data attribs
			for(name in node) {
				if (name === '_line' || name === 'childs') { continue; }
				dataDash += 'data-' + name + '="' + node[name] + '" ';
			}
			//open new li and add data-dashes
			var toggleCss = 'toggle';
			if (node.childs.length === 0) {
				toggleCss += ' no-childs';
			}
			if (node.type) {
				//typeStr = '<span class="typeImage ' + node.type + '"></span>';
			}
			html += '<li ' + dataDash + '><div class="' + toggleCss + '">&nbsp;</div>' + typeStr + '<span class="line">' + node._line + '</span><ul class="childs">';


			//iterate over childs
			for (name in node.childs) {
				html += recursive(node.childs[name]);
			}
			//close ul li
			html += '</ul></li>';
			return html;
		};
		var re = '';
		for (var i in dataTree.childs) {
			re += recursive(dataTree.childs[i]);
		}
		appendStringAsNodes($root[0], re);
		sort($content);
	}
	function sort($parent, mode) {
		var $list = $parent.children('ul').children('li'),
			list = $list.get(),
			i;
		if (typeof mode === 'string') {
			sortMode = mode;
		}
		var sort_by_name = function(a, b) {
			var sa = $(a).data('name'),//children('.line').children('.name').html(),
				sb = $(b).data('name');//children('.line').children('.name').html();
			return sa.toLowerCase().localeCompare(sb.toLowerCase());
		};
		var sort_by_line = function(a, b) {
			var sa = parseInt(a.dataset['startline']),
				sb = parseInt(b.dataset['startline']);
			return (sa < sb)? false : true;
		};
		var sort_by_line_down = function(a, b) {
			var sa = parseInt(a.dataset['startline']),
				sb = parseInt(b.dataset['startline']);
			return (sa > sb)? false : true;
		};
		if (sortMode === 'none') {
			list.sort(sort_by_line);
		} else if (sortMode === 'asc') {
			list.sort(sort_by_name);
		}
		for (i = 0; i < list.length; i++) {
			list[i].parentNode.appendChild(list[i]);
		}
		$list.each(function() {
			if ($(this).children('ul').children('li').length >= 0) {
				sort($(this), mode);
			}
		});
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
	function setEditorLine(line) {
		var currentEditor = EditorManager.getCurrentFullEditor();
        currentEditor.setCursorPos(line - 1, 0, true);
        currentEditor.focus();
	}
	exports.init = function($parent) {
		var name;

		$root = $parent;
		$content = $root.parent('.content');

		$parent.append('<div>outliner</div>');

		$footerOutline = $('<div class="outline-buttons"><span class="button sort" alt="Switch sort mode"></span></div>');
		$('#mySidePanelRight .footer').append($footerOutline);

		//events
        $($root).on('click', '.line', function () {
			var line = this.parentNode.dataset.startline;
			setEditorLine(line);
		});
		$($root).on('click', '.toggle', function (e) {
			//hide/show
			if ($(e.target).hasClass('colapsed')) {
				$(e.target).removeClass('colapsed');
			} else {
				$(e.target).addClass('colapsed');
			}
			var $parent = $(e.target).parent('li');
			$parent.children('.childs').toggle();

		});

      $('.sort', $footerOutline).click(function () {
			if (sortMode === 'none') {
				sort($content, 'asc');
			} else if (sortMode === 'asc') {
				sort($content, 'none');
			}
		});

		//init outlines
		for(name in outlines) {
			outlines[name].init(exports, $root);
		}
	};
	exports.setEditorLine = setEditorLine;
	/**
	 *	@param {string} outlineName
	 *	@param {string} name used as class
	 *	@param {function} callBack function
	 */
	exports.registerButton = function(outlineName, buttonName, callBack) {
		//build html, add click event
	};
	exports.update = function (doc) {
		if (!doc) {
			//clear
			$root.html('');
			_document = null;
			return true;
		}
		var mode = doc.getLanguage().getMode(),
			text = doc.getText();

		newDocFlag = (_document == doc)? false: true;
		_document = doc;

		if (newDocFlag) {
			sortMode = prefs.get('outline/defaultSorting');
		}

		switch (mode) {
//			case 'text/x-brackets-html':
//				outlines.html.update(text, updateTree);
//				break;
			case 'javascript':
				outlines.js.update(text, updateTree);
				break;
			case 'css':
				outlines.css.update(text, updateTree);
				break;
			default:
				$root.html('can\'t display "' + mode + '"');
				return false;
		}
		return true;
	};
	exports.setViewState = function (state) {
		if (state) {
			$footerOutline.show();
		} else {
			$footerOutline.hide();
		}
	};

});

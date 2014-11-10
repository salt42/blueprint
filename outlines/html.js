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
define(function (require, exports, modul) {
    "use strict";
	var	CodeMirror		= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		EditorManager   = brackets.getModule("editor/EditorManager"),
		prefs			= require('../preferences'),
		dataTree		= [],
		currentEditorTabSize = 4;

	/**
	 *	@param {string} code
	 *	@param {string} modespec
	 *	@return {object} dataTree
	 */
	function updateHtml(code, modespec) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, modespec),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			stream,
			lastBracket,
			parentList = [],
			rootElement = {childs : [] },
			currElement = rootElement,
			isAttr  = false,
			charNumber = 0,
			openTagCharPos = 0,
			inOpenTag = false;
		
		var isVoidElement = function(tagName) {
			var voidTags = [
				"area", "base", "br", "col", "command", "embed", 
				"hr", "img", "input", "keygen", "link", 
				"meta", "param", "source", "track", "wbr"
			];
			return $.inArray(tagName, voidTags) > -1;
		};
		var getNext = function() {
			var curr = stream.current();
			stream.start = stream.pos;
			return curr;
		};
		var callback = function(token, lineNumber, style) {
			switch(style) {
				case 'tag bracket':
					lastBracket = token;
					if (token.search('>') !== -1) {
						//close tag
						var attribStr = '',
							nameStr = '';

						if (inOpenTag) {
							inOpenTag = false;
							if (!currElement) { break; }
							if ('id' in currElement.attr) {
								attribStr += ' <span class="id">#' + currElement.attr.id + '</span>';
								nameStr += ' #' + currElement.attr.id;
							}
							if ('class' in currElement.attr) {
								attribStr += ' <span class="class">.' + currElement.attr.class + '</span>';
								nameStr += ' .' + currElement.attr.class;
							}
							currElement.line = '<span class="tag">' + currElement.name + '</span>' + attribStr;
							var tagName = currElement.name;
							currElement.name = currElement.name + nameStr;
							
							if(isVoidElement(tagName)) {
								parentList.pop();
								currElement = parentList[parentList.length-1];
							}
						}
						isAttr = false;
					} else if (token.search('<') !== -1) {
						openTagCharPos = charNumber -(token.length);
					}
					break;
				case 'tag':
					if (lastBracket === '<') {
						//open tag
						inOpenTag = true;
						var element = {
							name : token,
							line : '',
							startline : lineNumber,
							startchar : openTagCharPos,
							childs : [],
							attr : [],
						}
						currElement.childs.push(element);
						parentList.push(element);
						currElement = element;
					} else if (lastBracket === '</') {
						//close tag
						parentList.pop();
						currElement = parentList[parentList.length-1];
					}
					break;
				case 'attribute':
					isAttr = token;
					break;
				case 'string':
					if (isAttr !== false) {
						//add attribute
						currElement.attr[isAttr] = token.replace(/["']/g, '');
						isAttr = false;
					}
					break;
			}
		};
		for (var i = 0, e = lines.length; i < e; ++i) {
			stream = new CodeMirror.StringStream(lines[i]);
			charNumber = 0;
			while (!stream.eol()) {
				var style = mode.token(stream, state),
					token = getNext();

				if (style === null) {
					token = token.replace(/\\t/g, new Array(currentEditorTabSize).join(' '));
				}
				charNumber = charNumber + token.length;
				if (style !== null) {
					callback(token, i + 1, style);
				}
			}
		}
		return rootElement;
	}

	exports.init = function (outliner) {
		//set dom
		//register buttons
		outliner.registerButton('class/button-name', function() {
			//onclick
		});
	};
	exports.update = function (code, cb) {
		console.log(EditorManager.getCurrentFullEditor())
		//currentEditorTabSize = EditorManager.getCurrentFullEditor().getTabSize();
		dataTree = updateHtml(code, 'text/x-brackets-html');
		console.log(dataTree)
		cb(dataTree);
	};

});

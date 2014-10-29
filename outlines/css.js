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
/*global define, $ */
define(function (require, exports) {
    "use strict";
	var CodeMirror	= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$root,
		outliner;

	function updateHtml(code) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, 'css'),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			stream,
			lastBracket,
			parentList = [],
			rootElement = {childs : []},
			currElement = rootElement,
			isAttr  = false;

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
						isAttr = false;
						//close if  "\>"
					}
					break;
				case 'tag':
					if (lastBracket === '<') {
						//open tag
						var element = {
							name : token,
							line : lineNumber,
							attr : [],
							childs : []
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
			while (!stream.eol()) {
				var style = mode.token(stream, state),
					token = getNext();

				if (style !== null) {
					console.log(token, style)
//					callback(token, i + 1, style);
				}
			}
		}
		return rootElement.childs;
	}




	function updateCss(content) {
		var lines = content.split("\n"),
			i,
			re,
			onClickOnLine = function (e) {
				outliner.setEditorLine(e.data);
			};

		$root.html('');
		for (i = 0; i < lines.length; i++) {
			re = lines[i].match(/^(.*?){/);
			if (re !== null) {
				var selectorText = re[1].trim();
				var $ele = $('<li><span class="line" title="' + selectorText + '"><span class="name">' + selectorText + '</span></span></li>');
				$ele.appendTo($root);
				$ele.click(i + 1, onClickOnLine);
			}
		}
	}
	exports.init = function(outLiner, $ele) {
		outliner = outLiner;
		$root = $ele;
		//set dom
		//register buttons
		outliner.registerButton('css', 'class/button-name', function() {
			//onclick
		});
	};
	/*
	 *	@param {string} code string
	 */
	exports.update = function(code, cb) {
		var treeData = updateCss(code);
		//updateHtml(code);
		//cb(treeData);
	};
});

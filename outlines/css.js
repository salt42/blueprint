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
	var CodeMirror	= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$root,
		outliner;


//	var className = "cm-" + style.replace(/ +/g, " cm-");
//				html += '<span class="' + className + '">' + content + '</span>';
//
// alles so machen wie die original runmode function nur das nur die selectoren und die querrys erfasst werden

	function updateHtml(code) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, 'css'),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			stream,
			selector = '',
			selectorHTML = '',
			rootElement = {childs : []},
			currElement = rootElement,
			elementStack = [rootElement],
			inQuerry = false,
			isQuerry = false,
			inDefine = false;

		var getNext = function() {
			var curr = stream.current();
			stream.start = stream.pos;
			return curr;
		};
		var selectorAdd = function(str, html) {
			selector += str || '';
			selectorHTML += html || '';
		};

		var callback = function(token, lineNumber, style) {
			if (!style) {
				switch (token) {
					case '>':
					case '<':
					case '*':
					case '~':
					case '[':
					case ']':
					case '=':
					case ',':
					case '(':
					case ')':
					case ':':
					case ' ':
						selectorAdd(token, token);
						break;
					case '{':
						//create item with selector and line
						var ele = {
							startline : lineNumber,
							childs : [],
							name : selector,
							_line : selectorHTML,
						};
						currElement.childs.push(ele);
						selector = '';
						selectorHTML = '';
						if (isQuerry) {
							isQuerry = false;
							inQuerry = true;
							currElement = ele;
							elementStack.push(ele);
						} else {
							inDefine = true;
						}
						break;
					case '}':
						if (inDefine) {
							inDefine = false;
						} else {
							if (inQuerry) {
								inQuerry = false;
								elementStack.pop();
								currElement = elementStack[elementStack.length-1];
							}
						}
						selector = '';
						selectorHTML = '';
						break;
					case ';':
						if (inDefine) {
							break;
						}
						selectorAdd(token, token);
						currElement.childs.push({
							startline : lineNumber,
							childs : [],
							name : selector,
							_line : selectorHTML,
						});
						isQuerry = false;
						selector = '';
						selectorHTML = '';
						break;
				}
				return;
			}
			switch(style) {
				case 'builtin':
				case 'qualifier':
					var type = token.substr(0, 1),
						name = token.substr(1);

					selectorAdd(token, '<span class="type">' + type + '</span><span class="name">' + name + '</span>');
					break;
				case 'tag':
				case 'number':
				case 'attribute':
				case 'property':
				case 'string':
					selectorAdd(token, '<span class="name">' + token + '</span>');
					break;
				case 'def':
					//define media querry
					isQuerry = true;
					selectorAdd(token, '<span class="querryType">' + token + '</span>');
					break;
				case 'keyword':

					break;
				case 'comment':

					break;
				default:
					break;
			}
		};

		for (var i = 0, e = lines.length; i < e; ++i) {
			stream = new CodeMirror.StringStream(lines[i]);
			while (!stream.eol()) {
				var style = mode.token(stream, state),
					token = getNext();
//				console.log(style, token, token.length)
				callback(token, i + 1, style);
			}
		}


		//console.log(rootElement)
		return rootElement;
	}




//	function updateCss(content) {
//		var lines = content.split("\n"),
//			i,
//			re,
//			onClickOnLine = function (e) {
//				outliner.setEditorLine(e.data);
//			};
//
//		$root.html('');
//		for (i = 0; i < lines.length; i++) {
//			re = lines[i].match(/^(.*?){/);
//			if (re !== null) {
//				var selectorText = re[1].trim();
//				var $ele = $('<li><span class="line" title="' + selectorText + '"><span class="name">' + selectorText + '</span></span></li>');
//				$ele.appendTo($root);
//				$ele.click(i + 1, onClickOnLine);
//			}
//		}
//	}
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
//		var treeData = updateCss(code);
//		console.log(CSSUtils.extractAllSelectors(code, CodeMirror.getMode(CodeMirror.defaults, 'css')))
//		console.log(CSSUtils.extractAllNamedFlows(code))
		var data = updateHtml(code);
		cb(data);
	};
});

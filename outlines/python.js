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
		api;


	function update(code, tabsSize) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, 'css'),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			stream,
			rootElement = {
				childs : [],// the root element just needs childs, the next lines are the required fields for all elements
				//startline : 1, //
				//name : 'name string for sorting',
				//line : 'content of the "li>.line" element. can contain html elements',
			},
			currElement = rootElement,
			elementStack = [rootElement];

		var getNext = function() {
			var curr = stream.current();
			stream.start = stream.pos;
			return curr;
		};
		var skipLine = false,
			funcName = false,
			className = false,
			newLine = true;

		var callback = function(token, lineNumber, style) {
			var tabCount = 0,
				bothCount = 0;

			if (skipLine === true) { return }
			if (newLine) {
				tabCount = token.replace(/\t/g, '\t').length;
				bothCount = token.replace(/\s|\t/g, '').length;
				//check if tabs or spaces
				if (tabCount === bothCount) {
					//use tabs
					console.log('tabs', tabCount);
				} else {
					//use space
					console.log('space', token.length / tabsSize);
				}
				//check diff between lastLine and this line

				return;
			}
			switch(style) {
				case 'builtin':
					if (token === '#') {
						skipLine = true;
					}
					break;
				case 'tag':
					if (funcName) {
						//add function
						var func = {
							childs : [],
							startline : lineNumber,
							name : token, //need for sorting
							line : '<span class="type">func</span> <span class="name">' + token + '</span>',
						};
						currElement.childs.push(func);
						funcName = false;
					} else if (className){
						//add class
						var clas = {
							childs : [],
							startline : lineNumber,
							name : token, //need for sorting
							line : '<span class="type">class</span> <span class="name">' + token + '</span>',
						};
						currElement.childs.push(clas);
						//elementStack.push(clas);
						className = false;
					} else {
						switch(token) {
							case 'def':
								funcName = true;
								break;
							case 'class':
								className = true;
								break;
						}
					}
					break;
			}
			//foreach found element create a element like rootElement
			//style can be null, this occurse on space, brackets, etc
		};

		//loop over lines
		for (var i = 0, e = lines.length; i < e; ++i) {
			newLine = true;
			skipLine = false;
			stream = new CodeMirror.StringStream(lines[i]);
			while (!stream.eol()) {
				var style = mode.token(stream, state),
					token = getNext();
				//console.log(style, token, token.length)
				callback(token, i + 1, style);
				newLine = false;
			}
		}


		//console.log(rootElement)
		return rootElement;
	}
	/*
	 *	@param {object} outliner api
	 *	@param {object} $ele
	 */
	exports.init = function(outliner, $ele) {
		$root = $ele;
		api = outliner;
		//set dom
		//register buttons
		outliner.registerButton('class/button-name', function() {
			//onclick
		});
	};
	/*
	 *	@param {string} code string
	 */
	exports.update = function(code, cb) {
		var data = update(code, api.getTabSize());
		/**
			element = {
				childs : [],
				startline : 1, // need for sorting and click function
				name : 'name string', //need for sorting
				line : 'content of the "li>.line" element. can contain html elements',
			},
		 */
		cb(data);
	};
});

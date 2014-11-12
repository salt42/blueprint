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
/*global define, brackets */
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
			funcDef = false,
			classDef = false,
			newLine = true,
			currTabCount = 0;

		var callback = function(token, lineNumber, style) {
			var tabCount = 0,
				spaceCount = 0,
				paramStr = '',
				i;

			if (skipLine === true) { return; }
			if (newLine) {
				if (token.match(/[^\s]/) === null) {
					tabCount = (token.match(/\t/g) || []).length;
					spaceCount = (token.match(/ /g) || []).length;
					spaceCount = Math.floor(spaceCount / tabsSize);
					tabCount = tabCount + spaceCount;
					while(tabCount < elementStack.length - 1) {
						elementStack.pop();
						if (elementStack.length < 2) {
							break;
						}
					}
					currElement = elementStack[elementStack.length - 1];
					currTabCount = tabCount;
					return;
				} else {
					elementStack = [rootElement];
					currElement = rootElement;
					currTabCount = 0;
				}
			}
			if (style === null) {
				switch(token) {
					case '(':
						if (funcDef === 'wait4params') { funcDef = 'params'; }
						if (classDef === 'wait4params') { classDef = 'params'; }
						break;
					case ')':
						for(i in currElement._params) {
							paramStr += ' <span class="name">' + currElement._params[i] + '</span>,';
						}
						paramStr = paramStr.substr(0, paramStr.length-1);
						if (funcDef === 'params') {
							currElement.line = '<span class="type">func</span> <span class="name">' + currElement.name + '</span>';
							currElement.line += ' (<span class="params">' + paramStr + '</span> )';
							funcDef = false;
						}
						if (classDef === 'params') {
							currElement.line = '<span class="type">class</span> <span class="name">' + currElement.name + '</span>';
							currElement.line += ' (<span class="params">' + paramStr + '</span> )';
							classDef = false;
						}
						break;
				}
			} else {
				switch(style) {
					case 'builtin':
						if (token === '#') {
							skipLine = true;
						}
						break;
					case 'variable-3':
						switch(token) {
							case 'def':
								funcDef = 'name';
								break;
						}
						break;
					case 'tag':
						if (funcDef) {
							switch(funcDef) {
								case 'name':
									var func = {
										childs : [],
										startline : lineNumber,
										name : token,
										line : '',
										_params : [],
									};

									currElement.childs.push(func);
									elementStack.push(func);
									currElement = func;
									currTabCount = ++currTabCount;

									funcDef = 'wait4params';
									break;
								case 'params':
									//add param
									currElement._params.push(token);
									break;
							}
						} else if (classDef){
							switch(classDef) {
								case 'name':
									var clas = {
										childs : [],
										startline : lineNumber,
										name : token,
										line : '',
										_params : [],
									};

									currElement.childs.push(clas);
									elementStack.push(clas);
									currElement = clas;
									currTabCount = ++currTabCount;

									classDef = 'wait4params';
									break;
								case 'params':
									//add param
									currElement._params.push(token);
									break;
							}
						} else {
							switch(token) {
								case 'def':
									funcDef = 'name';
									break;
								case 'class':
									classDef = 'name';
									break;
							}
						}
						break;
				}
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

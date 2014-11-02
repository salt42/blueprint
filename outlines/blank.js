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
		$root;

	function update(code) {
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
		var callback = function(token, lineNumber, style) {
			//foreach found element create a element like rootElement
			//style can be null, this occurse on space, brackets, etc
		};

		//loop over lines
		for (var i = 0, e = lines.length; i < e; ++i) {
			stream = new CodeMirror.StringStream(lines[i]);
			while (!stream.eol()) {
				var style = mode.token(stream, state),
					token = getNext();
				//console.log(style, token, token.length)
				callback(token, i + 1, style);
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
		var data = update(code);
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

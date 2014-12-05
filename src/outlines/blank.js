/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets */
define(function (require, exports) {
    "use strict";
	var CodeMirror	= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$root;

	function update(code) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, 'css'),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			rootElement = {
				childs : [],// the root element just needs childs, the next lines are the required fields for all elements
				//startline : 1, //
				//name : 'name string for sorting',
				//line : 'content of the "li>.line" element. can contain html elements',
			},
//			currElement = rootElement,
//			elementStack = [rootElement],
			stream;

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

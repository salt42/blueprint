/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets */
define(function (require, exports, module) {
    "use strict";
	var CodeMirror	= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");


	function BasicParser() {
		this._mode = 'javascript';
		this._code = '';
		this._lines = [];
		this._stream = null;
		this._rootElement = { childs : [] };
		this._elementStack = [this._rootElement];
	}
	BasicParser.prototype.resetParser = function() {
		this._rootElement = { childs : [] };
		this._elementStack = [this._rootElement];
	};
	BasicParser.prototype.parse = function(mode, code) {
		this.resetParser();
		this._mode = CodeMirror.getMode(CodeMirror.defaults, mode);
		this._code = code;
		this._lines = CodeMirror.splitLines(this._code);
		var state = CodeMirror.startState(this._mode);
		//loop over lines
		for (var i = 0, e = this._lines.length; i < e; ++i) {
			this._stream = new CodeMirror.StringStream(this._lines[i]);
			while (!this._stream.eol()) {
				var style = this._mode.token(this._stream, state),
					token = this.getNext();
				this.do(token, i + 1, style);
			}
		}
		return this._rootElement;
	};
	BasicParser.prototype.getNext = function() {
		var curr = this._stream.current();
		this._stream.start = this._stream.pos;
		return curr;
	};
	BasicParser.prototype.do = function(token, lineNumber, style) {
		if (style !== 'comment') {
			this.doToken(token, lineNumber, style);
		} else {
			this.doComment(lineNumber, token);
		}
	};
	/**
	 * called for each comment
	 * @param {String} token      pice of code
	 * @param {Number} lineNumber line number
	 * @param {string} style      "type" of token
	 */
	BasicParser.prototype.doComment = function(lineNumber, token) {
		var words = token.replace(/(\/\/|\/\*+)/, '')
					.trim()
					.split(' ');

		if (words[0] === 'region' || words[0] === '@region') {
			var name = words[1] || '';
			this.push(this.addChild('region',
					 name,
					 '<span class="region">' + name + '</span>',
					 lineNumber));
		} else if (words[0] === 'endregion' || words[0] === '@endregion') {
			this.pop();
		}
	};
	/**
	 * called for each token except comments
	 * @param {String} token      pice of code
	 * @param {Number} lineNumber line number
	 * @param {string} style      "type" of token
	 */
	BasicParser.prototype.doToken = function(token, lineNumber, style) {};
	BasicParser.prototype.push = function(ele) {
		this._elementStack.push(ele);
	};
	BasicParser.prototype.pop = function() {
		if (this._elementStack.length > 1) {
			console.log('pop')
			this._elementStack.pop();
		}
	};
	BasicParser.prototype.getCurrent = function() {
		return this._elementStack.slice(-1)[0];
	};
	BasicParser.prototype.addChild = function(name, line, lineNumber) {
		var newEle = {
			name: name,
			line: line,
			startline: lineNumber,
			childs: []
		};

		this.getCurrent().childs.push(newEle);
		return newEle;
	};
	module.exports = BasicParser;
});

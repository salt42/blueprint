/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define */
define(function (require, exports) {
    "use strict";
	var BasicParser	= require("./basicParser"),
		$root,
		parser;

	function SCSSparser() {
		BasicParser.prototype.constructor.call(this);

		this.state = 'none';
		this.tempState = 'none';
		this.selector = '';
		this.selectorHTML = '';
		this.varSelector = '';
		this.bracketsCount = 0;
	}
	SCSSparser.prototype = Object.create(BasicParser.prototype, SCSSparser.prototype);
	SCSSparser.prototype.constructor = SCSSparser;

	SCSSparser.prototype.resetParser = function() {
		BasicParser.prototype.resetParser.call(this);
		this.resetSTATE();
	};
	SCSSparser.prototype.doToken = function(token, lineNumber, style) {
		if (this.state !== 'none') {
			if (token === '#{') {
				this.tempState = this.state;
				this.state = 'inVarInclude';
			}
			switch (this.state) {
				case 'inVarInclude':
					if (token === '}') {
						this.state = this.tempState;
						this.createHtml(this.varSelector + token, 'variable-2');
						this.varSelector = '';
					} else {
						this.varSelector += token;
					}
					break;
				case 'inProperty':
					if (token === ';') {
						this.resetSTATE();
					} else if (token === '}') {
						this.resetSTATE();
						this.doToken(token, lineNumber, style);
						return;
					}else if (token.match(/:\s*{/g) !== null) {
						this.bracketsCount = 1;
						this.state = 'inNotSupported';
					}
					break;
				case 'inVariableDefine':
					if (token === ';') {
						//this.addChild('variable', this.selector, this.selectorHTML, lineNumber);
						this.resetSTATE();
					} else {
						//this.createHtml(token, style);
					}
					break;
				case 'inSelector':
					switch (token) {
						case '{':
							this.push(this.addChild('selector', this.selector, this.selectorHTML, lineNumber));
							this.resetSTATE();
							break;
						default:
							this.createHtml(token, style);
					}
					break;
				case 'inMedia':
					if (token === ';') {
						this.addChild('media', this.selector, this.selectorHTML, lineNumber);
						this.resetSTATE();
					} else if (token === '{') {
						this.push(this.addChild('media', this.selector, this.selectorHTML, lineNumber));
						this.resetSTATE();
					} else {
						this.createHtml(token, style);
					}
					break;
				case 'inImport':
					if (token === ';') {
						this.addChild('import', this.selector, this.selectorHTML, lineNumber);
						this.resetSTATE();
					} else {
						this.createHtml(token, style);
					}
					break;
				case 'inExtend':
					if (token === ';') {
						this.addChild('extend', this.selector, this.selectorHTML, lineNumber);
						this.resetSTATE();
					} else {
						this.createHtml(token, style);
					}
					break;
				case 'inMixin':
					if (token === ';') {
						this.addChild('mixin', this.selector, this.selectorHTML, lineNumber);
						this.resetSTATE();
					} else if (token === '{') {
						this.push(this.addChild('mixin', this.selector, this.selectorHTML, lineNumber));
						this.resetSTATE();
					} else {
						this.createHtml(token, style);
					}
					break;
				case 'inInclude':
					if (token === ';') {
						this.addChild('include', this.selector, this.selectorHTML, lineNumber);
						this.resetSTATE();
					} else if (token === '{') {
						this.push(this.addChild('include', this.selector, this.selectorHTML, lineNumber));
						this.resetSTATE();
					} else {
						this.createHtml(token, style);
					}
					break;
				case 'inIfElse':
					if (token === '{') {
						this.push(this.getCurrent());
						this.resetSTATE();
					}
					break;
				case 'inNotSupported':
					if (token === '{') {
						this.bracketsCount++;
					} else if (token === '}') {
						this.bracketsCount--;
						if (this.bracketsCount === 0) {
							this.resetSTATE();
						}
					} else if (token === ';' && this.bracketsCount === 0) {
						this.resetSTATE();
					}
					break;
			}
			return;
		}

		switch (style) {
			case 'property':
				if (this.state === 'none') {
					this.state = 'inProperty';
				}
				break;
			case 'variable-2':
				if (this.state === 'none') {
					this.state = 'inVariableDefine';
					this.createHtml(token, style);
				}
				break;
			case 'tag':
			case 'qualifier':
			case 'builtin':
				if (this.state === 'none') {
					this.state = 'inSelector';
				}
				this.createHtml(token, style);
				break;
			case 'def':
				switch (token) {
					case '@extend':
						this.state = 'inExtend';
						this.createHtml(token, style);
						break;
					case '@mixin':
						this.state = 'inMixin';
						this.createHtml(token, style);
						break;
					case '@include':
						this.state = 'inInclude';
						this.createHtml(token, style);
						break;
					case '@import':
						this.state = 'inImport';
						this.createHtml(token, style);
						break;
					case '@media':
						this.state = 'inMedia';
						this.createHtml(token, style);
						break;
					case '@if':
						this.state = 'inIfElse';
						this.createHtml(token, style);
						break;
					case '@else':
						this.state = 'inIfElse';
						this.createHtml(token, style);
						break;
					default:
						this.resetSTATE();
						this.state = 'inNotSupported';
				}
				break;
			case null:
				if (token === '}') {
					this.pop();
					break;
				}
				if (this.state === 'none') {
					switch(token) {
						case '>':
						case '*':
						case '[':
						case '&':
						case '#':
						case '.':
						case ':':
							this.state = 'inSelector';
							this.createHtml(token, style);
							break;
					}
				}
		}
	};
	SCSSparser.prototype.resetSTATE = function() {
		this.selector = '';
		this.selectorHTML = '';
		this.state = 'none';
		this.bracketsCount = 0;
	};
	SCSSparser.prototype.addChild = function(type, name, html, lineNumber) {
		var line = '<span class="type" data-type="' + type + '"></span>';

		switch (type) {
			case 'mixin':
				line += html;
				break;
			case 'import':
				name = '__' + name;
				line += html;
				break;
			default:
				line += html;
		}
		return BasicParser.prototype.addChild.call(this, name, line, lineNumber);
	};
	SCSSparser.prototype.createHtml = function(token, style) {
		var html = '';

		switch (style) {
			case 'tag':
				html = '<span class="tag">' + token + '</span>';
				break;
			case 'qualifier':
				html = '<span class="class">' + token + '</span>';
				break;
			case 'builtin':
				html = '<span class="id">' + token + '</span>';
				break;
			case 'string':
				html = '<span class="string">' + token + '</span>';
				break;
			case 'property':
				html = '<span class="property">' + token + '</span>';
				break;
			case 'attribute':
				html = '<span class="attribute">' + token + '</span>';
				break;
			case 'number':
				html = '<span class="number">' + token + '</span>';
				break;
			case 'def':
				html = '<span class="def">' + token + '</span>';
				break;
			case 'atom':
				html = '<span class="atom">' + token + '</span>';
				break;
			case 'variable-2':
				html = '<span class="variable">' + token + '</span>';
				break;
			case 'variable-3':
				if (this.selectorHTML.charAt(this.selectorHTML.length-1) === ':') {
					if (this.selectorHTML.charAt(this.selectorHTML.length-2) === ':') {
						this.selector = this.selector.slice(0, this.selector.length-2);
						this.selectorHTML = this.selectorHTML.slice(0, this.selectorHTML.length-2);
						html = '<span class="pseudoElement">::' + token + '</span>';
					} else {
						this.selector = this.selector.slice(0, this.selector.length-1);
						this.selectorHTML = this.selectorHTML.slice(0, this.selectorHTML.length-1);
						html = '<span class="pseudoClass">:' + token + '</span>';
					}
				}
				break;
			case 'keyword':
				if (token === "!important") {
					html = '<span class="important">' + token + '</span>';
				}
				break;
			default:
				html = token;
		}
		switch (token) {
			case '&':
				html = '<span class="parentSelector">&</span>';
				break;
			case '@media':
				html = '<span class="media">@media</span>';
				break;
			case '@import':
				html = '<span class="import">@import</span>';
				break;
			case '@mixin':
				html = '<span class="mixin">@mixin</span>';
				break;
			case '@include':
				html = '<span class="include">@include</span>';
				break;
			case '@extend':
				html = '<span class="extend">@extend</span>';
				break;
		}
		this.selectorHTML += html;
		this.selector += token;
	};

	/*
	 *	@param {object} outliner api
	 *	@param {object} $ele
	 */
	exports.init = function(outliner, $ele) {
		$root = $ele;
		parser = new SCSSparser();
	};
	/*
	 *	@param {string} code string
	 */
	exports.update = function(code, cb) {
		var data = parser.parse("text/x-scss", code);
		cb(data);
	};
});

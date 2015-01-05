/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets */
define(function (require, exports) {
    "use strict";
	var CodeMirror	= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$root;

	function escapeHTML(s) {
		return s.replace(/"/g, "'");
//			s.replace(/&/g, '&amp;')
//				.replace(/</g, '&lt;')
//				.replace(/>/g, '&gt;');
	}
	function update(code) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, "text/x-less"),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			stream,
			rootElement = {
				childs : [],
			},
			currElement = rootElement,
			elementStack = [rootElement],
			STATE = 'none',
			selector = '',
			selectorHTML = '',
			lastToken = '',
			tempState,
			varSelector = '',
			bracketsCount = 0;

		function getNext() {
			var curr = stream.current();
			stream.start = stream.pos;
			return curr;
		}
		function addChild(type, name, html, lineNumber) {
			var line = '<span class="type" data-type="' + type + '"></span>';

			switch (type) {
				case 'mixin':
					line += '<span class="mixin"><<</span>';
					line += html;
					break;
				case 'import':
					name = '__' + name; // __ for better sorting (imports are at top)
					line += html;
					break;
				default:
					line += html;
			}
			var newEle = {
				name: escapeHTML(name),
				line: line,
				startline: lineNumber,
				childs: []
			};

			currElement.childs.push(newEle);
			return newEle;
		}
		function createHtml(token, style) {
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
				case 'variable-2':
					html = '<span class="variable">' + token + '</span>';
					break;
				case 'atom':
					html = '<span class="atom">' + token + '</span>';
					break;
				case 'variable-3':
					if (selectorHTML.charAt(selectorHTML.length-1) === ':') {
						if (selectorHTML.charAt(selectorHTML.length-2) === ':') {
							selector = selector.slice(0, selector.length-2);
							selectorHTML = selectorHTML.slice(0, selectorHTML.length-2);
							html = '<span class="pseudoElement">::' + token + '</span>';
						} else {
							selector = selector.slice(0, selector.length-1);
							selectorHTML = selectorHTML.slice(0, selectorHTML.length-1);
							html = '<span class="pseudoClass">:' + token + '</span>';
						}
					}
					break;
				case 'keyword':
					if (token === "!important") {
						html = '<span class="important">' + token + '</span>';
					} else {
						html = token;
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
			}
			selectorHTML += html;
			selector += token;
		}
		function push(ele) {
			currElement = ele;
			elementStack.push(ele);
		}
		function pop() {
			elementStack.pop();
			currElement = elementStack.slice(-1)[0];
		}
		function resetSTATE() {
			selector = '';
			selectorHTML = '';
			STATE = 'none';
			bracketsCount = 0;
		}

		var callback = function(token, lineNumber, style) {
			if (style === 'comment') {
				if (token.match(/(\/\/|\/\*+)/) !== null) {
					var words = token.replace(/(\/\/|\/\*+)/, '')
								.trim()
								.split(' ');

					if (words[0] === 'region' || words[0] === '@region') {
						var name = words[1] || '';
						push(addChild('region',
								 name,
								 '<span class="region">' + name + '</span>',
								 lineNumber));
					} else if (words[0] === 'endregion' || words[0] === '@endregion') {
						pop();
					}
				}
				return;
			}
//console.log(lineNumber, token, style)
			if (STATE !== 'none') {
				if (token === '@' && style === 'variable-2') {
					tempState = STATE;
					STATE = 'inVarInclude';
				}

				switch (STATE) {
					case 'inVarInclude':
						if (token === '}') {
							STATE = tempState;
							createHtml(varSelector + token, 'variable-2');
							varSelector = '';
						} else {
							varSelector += token;
						}
						break;
					case 'inProperty':
						if (token === ';') {
							resetSTATE();
						} else {
							//selector += token;
						}
						break;
					case 'inSelector':
						if (token === ';') {
							addChild('mixin', selector, selectorHTML, lineNumber);
							resetSTATE();
						} else if (token === '{') {
							push(addChild('selector', selector, selectorHTML, lineNumber));
							resetSTATE();
						} else {
							createHtml(token, style);
						}
						break;
					case 'inMedia':
						if (token === ';') {
							addChild('media', selector, selectorHTML, lineNumber);
							resetSTATE();
						} else if (token === '{') {
							push(addChild('media', selector, selectorHTML, lineNumber));
							resetSTATE();
						} else {
							createHtml(token, style);
						}
						break;
					case 'inImport':
						if (token === ';') {
							addChild('import', selector, selectorHTML, lineNumber);
							resetSTATE();
						} else {
							createHtml(token, style);
						}
						break;
					case 'inMixin':
						if (token === ';') {
							addChild('mixin', selector, selectorHTML, lineNumber);
							resetSTATE();
						} else if (token === '{') {
							push(addChild('mixin', selector, selectorHTML, lineNumber));
							resetSTATE();
						} else {
							createHtml(token, style);
						}
						break;
					case 'inVariable':
						if (token === ';') {
							addChild('variable', selector, selectorHTML, lineNumber);
							resetSTATE();
						} else {
							createHtml(token, style);
						}
						break;
					case 'inNotSupported':
						if (token === '{') {
							bracketsCount++;
						} else if (token === '}') {
							bracketsCount--;
							if (bracketsCount === 0) {
								resetSTATE();
							}
						}
						break;
				}
				return;
			}

			switch (style) {
				case 'meta':
				case 'string-2':
				case 'property':
					if (STATE === 'none') {
						STATE = 'inProperty';
					}
					break;
				case 'atom':
				case 'tag':
				case 'qualifier':
				case 'builtin':
					if (STATE === 'none') {
						STATE = 'inSelector';
					}
					createHtml(token, style);
					break;
				case 'def':
					switch (token) {
						case '@mixin':
							STATE = 'inMixin';
							createHtml(token, style);
							break;
						case '@import':
							STATE = 'inImport';
							createHtml(token, style);
							break;
						case '@media':
							STATE = 'inMedia';
							createHtml(token, style);
							break;
						case '@charset':
							STATE = 'inNotSupported';
//							createHtml(token, style);
							break;
						case '@document':
							STATE = 'inNotSupported';
//							createHtml(token, style);
							break;
						case '@font-face':
							STATE = 'infont-inNotSupported';
//							createHtml(token, style);
							break;
						case '@keyframes':
							STATE = 'inNotSupported';
//							createHtml(token, style);
							break;
						case '@page':
							STATE = 'inNotSupported';
//							createHtml(token, style);
							break;
						case '@supports':
							STATE = 'inNotSupported';
//							createHtml(token, style);
							break;
						case '@namespace':
							STATE = 'inNotSupported';
//							createHtml(token, style);
							break;
						default:
							STATE = 'inNotSupported';
							break;
					}
					break;
				case 'variable-2':
					if (STATE === 'none') {
						STATE = 'inVariable';
					}
					createHtml(token, style);
					break;
				case null:
					if (token === '}' && elementStack.length > 1) {
						pop();
						break;
					}
					if (STATE === 'none') {
						switch(token) {
							case '.':
							case '#':
							//default css
							case '&':
							case '>':
							case '*':
							case '[':
							case ':':
								STATE = 'inSelector';
								createHtml(token, style);
								break;
						}
					}
			}
		};

		//loop over lines
		for (var i = 0, e = lines.length; i < e; ++i) {
			stream = new CodeMirror.StringStream(lines[i]);
			while (!stream.eol()) {
				var style = mode.token(stream, state),
					token = getNext();
				callback(token, i + 1, style);
				lastToken = token;
			}
		}

		return rootElement;
	}
	/*
	 *	@param {object} outliner api
	 *	@param {object} $ele
	 */
	exports.init = function(outliner, $ele) {
		$root = $ele;
	};
	/*
	 *	@param {string} code string
	 */
	exports.update = function(code, cb) {
		var data = update(code);
		cb(data);
	};
});

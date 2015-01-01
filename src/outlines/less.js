/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets, window */
define(function (require, exports) {
    "use strict";
	var CodeMirror	= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$root;

	function update(code) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, "text/x-scss"),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			stream,
			rootElement = {
				childs : [],// the root element just needs childs, the next lines are the required fields for all elements
				//startline : 1,
				//name : 'name string for sorting',
				//line : 'content of the "li>.line" element. can contain html elements',
			},
			currElement = rootElement,
			elementStack = [rootElement],
			STATE = 'none',
			selector = '',
			selectorHTML = '';

		function getNext() {
			var curr = stream.current();
			stream.start = stream.pos;
			return curr;
		}
		function addChild(type, name, html, lineNumber) {
			var def = '',
				line = '<span class="type" data-type="' + type + '"></span>';

			switch (type) {
				case 'mixin':
					line += '<<';
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
				name: name,//@todo remove whitespace at end
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
				case 'atom':
					html = '<span class="atom">' + token + '</span>';
					break;
				case 'variable-3':
					if (selectorHTML.charAt(selectorHTML.length-1) === ':') {
						console.log('ahhh')
						if (selectorHTML.charAt(selectorHTML.length-2) === ':') {
							selector = selector.slice(0, selector.length-2);
							selectorHTML = selectorHTML.slice(0, selectorHTML.length-2);
							html = '<span class="pseudoElement">::' + token + '</span>';
						} else {
							selector = selector.slice(0, selector.length-1);
							selectorHTML = selectorHTML.slice(0, selectorHTML.length-1);
							console.log('bhhh', selectorHTML)
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
			}
			selectorHTML += html;
			selector += token;
		}
		function push(ele) {
			currElement = ele;
			elementStack.push(ele);
		}
		function resetSTATE() {
			selector = '';
			selectorHTML = '';
			STATE = 'none';
		}
		var callback = function(token, lineNumber, style) {
			if (style === 'comment') { return; }
//			console.log(lineNumber, '"' + token + '"', style);

			if (STATE !== 'none') {
				switch (STATE) {
					case 'inProperty':
						if (token === ';') {
							resetSTATE();
						} else {
							selector += token;
						}
						break;
					case 'inSelector':
						switch (token) {
							case ';':
								addChild('mixin', selector, selectorHTML, lineNumber);
								resetSTATE();
								break;
							case '{':
								push(addChild('selector', selector, selectorHTML, lineNumber));
								resetSTATE();
								break;
							default:
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
					case 'inParentSelector':
						switch (token) {
							case ';':
								addChild('mixin', selector, selectorHTML, lineNumber);
								resetSTATE();
								break;
							case '{':
								push(addChild('parentSelector', selector, selectorHTML, lineNumber));
								resetSTATE();
								break;
							default:
								createHtml(token, style);
						}
						break;
				}
				return;
			}

			switch (style) {
				case 'meta':
				case 'property':
					if (STATE === 'none') {
						STATE = 'inProperty';
					}
					break;
//				case 'string':
//				case 'variable-2':
//					if (STATE !== 'none') {
//						selector += token;
//					}
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
					}
					break;
				case null:
					if (token === '}' && elementStack.length > 1) {
						elementStack.pop();
						currElement = elementStack.slice(-1)[0];
						break;
					}
					if (STATE === 'none') {
						switch(token) {
							case '&':
								STATE = 'inParentSelector';
								createHtml(token, style);
								break;
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
				//console.log(style, token, token.length)
				callback(token, i + 1, style);
			}
		}

		window.rootElement = rootElement;
//		console.table(rootElement.childs);
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
		console.time('less');
		var data = update(code);
		console.timeEnd('less');
		cb(data);
	};
});

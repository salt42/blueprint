/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets */
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
					case '|=':
					case '+':
					case '^':
					case '>':
					case '<':
					case '*':
					case '~':
					case '~=':
					case '$':
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
							line : selectorHTML,
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
							line : selectorHTML,
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
					var type = token.substr(0, 1);

					if (type === '#') {
						selectorAdd(token, '<span class="id">' + token + '</span>');
					} else if (type === '.') {
						selectorAdd(token, '<span class="class">' + token + '</span>');
					}
//					selectorAdd(token, '<span class="type">' + type + '</span><span class="name">' + name + '</span>');
					break;
				case 'tag':
					selectorAdd(token.replace(/"/g,''), '<span class="tag">' + token + '</span>');
					break;
				case 'string':
				case 'number':
				case 'attribute':
				case 'property':
				case 'variable-3':
					selectorAdd(token.replace(/"/g,''), '<span class="name">' + token + '</span>');
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
				//console.log(style, token, token.length)
				callback(token, i + 1, style);
			}
		}


		//console.log(rootElement)
		return rootElement;
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
		var data = updateHtml(code);
		cb(data);
	};
});

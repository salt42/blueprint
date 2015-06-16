/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets */
define(function (require, exports) {
    "use strict";
	var CodeMirror	= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$root,
		api;


	function update(code, tabsSize) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, 'python'),
			lines = CodeMirror.splitLines(code),
			state = CodeMirror.startState(mode),
			stream,
			rootElement = {
				childs : [],
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
						if(!funcDef && !classDef) break;
						for(i=0;i<currElement._params.length;i++) {
							paramStr += '<span class="name">' + currElement._params[i] + '</span>,';
						}
						paramStr = paramStr.substr(0, paramStr.length-1);
						if (funcDef === 'params') {
							currElement.line = '<span class="type" data-type="FunctionDeclaration"></span><span class="name">' + currElement.name + '</span>';
							currElement.line += '(<span class="params">' + paramStr + '</span>)';
							funcDef = false;
						}
						if (classDef === 'params') {
							currElement.line = '<span class="type" data-type="Class"></span><span class="name">' + currElement.name + '</span>';
							currElement.line += '(<span class="params">' + paramStr + '</span>)';
							classDef = false;
						}
						break;
					case ':':
						if(!classDef) break;
						if (classDef === 'wait4params') {
							currElement.line = '<span class="type" data-type="Class"></span><span class="name">' + currElement.name + '</span>';
							currElement.line += '(<span class="params">' + '' + '</span>)';
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
					case 'variable':
						if(funcDef=='params' || classDef=='params') {
							currElement._params.push(token);
						}
						break;
					case 'def':
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
						}
						break;
					case'keyword': 
						switch(token) {
							case 'def':
								funcDef = 'name';
								break;
							case 'class':
								classDef = 'name';
								break;
						}
						
						break;
				}
			}
		};
		//loop over lines
		for (var i = 0, e = lines.length; i < e; ++i) {
			newLine = true;
			skipLine = false;
			stream = new CodeMirror.StringStream(lines[i]);
			while (!stream.eol()) {
				var style = mode.token(stream, state),
					token = getNext();

				callback(token, i + 1, style);
				newLine = false;
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
		api = outliner;
	};
	/*
	 *	@param {string} code string
	 */
	exports.update = function(code, cb) {
		var data = update(code, api.getTabSize());
		cb(data);
	};
});

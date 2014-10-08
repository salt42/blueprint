define(function (require, exports, modul) {
    "use strict";
    var EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		CodeMirror		= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),

		$root,
		JsWorker;


	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: http://codemirror.net/LICENSE
	CodeMirror.runMode = function(string, modespec, callback, options) {
		var mode = CodeMirror.getMode(CodeMirror.defaults, modespec);
		var ie = /MSIE \d/.test(navigator.userAgent);
		var ie_lt9 = ie && (document.documentMode == null || document.documentMode < 9);

		if (callback.nodeType == 1) {
			var tabSize = (options && options.tabSize) || CodeMirror.defaults.tabSize;
			var node = callback, col = 0;
			node.innerHTML = "";
			callback = function(text, style) {
				if (text == "\n") {
					// Emitting LF or CRLF on IE8 or earlier results in an incorrect display.
					// Emitting a carriage return makes everything ok.
					node.appendChild(document.createTextNode(ie_lt9 ? '\r' : text));
					col = 0;
					return;
				}
				var content = "";
				// replace tabs
				for (var pos = 0;;) {
					var idx = text.indexOf("\t", pos);
					if (idx == -1) {
						content += text.slice(pos);
						col += text.length - pos;
						break;
					} else {
						col += idx - pos;
						content += text.slice(pos, idx);
						var size = tabSize - col % tabSize;
						col += size;
						for (var i = 0; i < size; ++i) content += " ";
						pos = idx + 1;
					}
				}
				if (style) {
					var sp = node.appendChild(document.createElement("span"));
					sp.className = "cm-" + style.replace(/ +/g, " cm-");
					sp.appendChild(document.createTextNode(content));
				} else {
					node.appendChild(document.createTextNode(content));
				}
			};
	  	}

		var lines = CodeMirror.splitLines(string), state = CodeMirror.startState(mode);
		for (var i = 0, e = lines.length; i < e; ++i) {
			if (i) callback("\n");
			var stream = new CodeMirror.StringStream(lines[i].substr(0,100));
			while (!stream.eol()) {
				var style = mode.token(stream, state);
				callback(stream.current(), style, i, stream.start, state);
				stream.start = stream.pos;
			}
		}
	};
	function setEditorLine(line) {
		var currentEditor = EditorManager.getCurrentFullEditor();
        currentEditor.setCursorPos(line - 1, 0, true);
        currentEditor.focus();
        //setTimeout(function(){currentEditor.focus()}, 10);
	}
	function updateJsTree(dataTree) {
		var parents = [],
			k;
		$root.html('');
		var recBuild = function (data) {
			var html = '',
				paramStr = '',
				cssClasses = 'toggle',
				mouseOverText = 'Attributes: &nbsp;&nbsp;';

			html = '<span class="type">' + data.type + '&nbsp;</span><span class="func-name">' + data.name + '</span><span class="func-params"> ( ';
			for (k = 0; k < data.params.length; k++) {
				var type = '&lt;' + data.params[k].type + '&gt; ';
				if (data.params[k].type === '') {
					type = '';
				}
				mouseOverText += '\n ' + type + ' ' + data.params[k].name;
				paramStr += ', ' + type + data.params[k].name;
				if (type !== '') {
					html += '<span class="type">' + type + '</span>';
				}
				html += '<span class="name">' + data.params[k].name + '</span>';
				if (k !== data.params.length - 1) {
					html += ', ';
				}
			}
			html += ' )   </span>';
			paramStr = paramStr.substr(1);

			if (data.childs.length === 0) {
				cssClasses += ' no-childs';
			}
			var $ele = $('<li><div class="' + cssClasses + '">&nbsp;</div><span class="line" title="' + mouseOverText + '">' + html + '</span><ul class="childs"></ul></li>');

			$ele.click(function (e) {
				if ($(e.target).hasClass('toggle')) {
					//hide/show
					if ($(e.target).hasClass('colapsed')) {
						$(e.target).removeClass('colapsed');
					} else {
						$(e.target).addClass('colapsed');
					}
					$('.childs', this).toggle();
				} else {
					setEditorLine(data.loc.start.line);
				}
				return false;
			});
			if (parents.length === 0) {
				$root.append($ele);
			} else {
				parents[parents.length - 1].children('.childs').append($ele);
			}
			parents.push($ele);
			for (k in data.childs) {
				recBuild(data.childs[k]);
			}
			parents.pop();
		};
		for (k in dataTree.childs) {
			recBuild(dataTree.childs[k]);
		}
	}
	function updateCss(content) {
		var lines = content.split("\n"),
			i,
			re,
			onClickOnLine = function (e) {
				setEditorLine(e.data);
			};

		$root.html('');
		for (i = 0; i < lines.length; i++) {
			re = lines[i].match(/^(.*?){/);
			if (re !== null) {
				var selectorText = re[1].trim();
				var $ele = $('<li><span class="line" title="' + selectorText + '"><span class="selector">' + selectorText + '</span></span></li>');
				$ele.appendTo($outlineRoot);
				$ele.click(i + 1, onClickOnLine);
			}
		}
	}






	exports.init = function ($parent) {
		$root = $parent;
		var modulePath = ExtensionUtils.getModulePath(modul);
		$parent.append('<div>outliner</div>');

		JsWorker = new Worker(modulePath + "/outlineWorker.js");
		JsWorker.onmessage = function (e) {
			if (e.data.type === 'log') {
				console.log(e.data.value[0], e.data.value[1]);
			} else if (e.data.type === 'data') {
				updateJsTree(e.data);
			}
		};



	};
	exports.update = function (doc) {
		var mode = doc.getLanguage().getMode(),
			text = doc.getText();

		if (mode === 'javascript') {
			JsWorker.postMessage(text);
			//changeTab('outline');
		} else if (mode === 'css') {
			updateCss(text);
			//changeTab('outline');
		} else {
			//changeTab('minimap');
			$outlineRoot.html('I don\'t understand "' + mode + '"<br>for the moment i only now JavaScript and CSS ');
		}
	};
});

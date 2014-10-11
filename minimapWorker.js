// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

CodeMirror = {};

(function() {
"use strict";

function splitLines(string){ return string.split(/\r?\n|\r/); };

function StringStream(string) {
  this.pos = this.start = 0;
  this.string = string;
  this.lineStart = 0;
}

StringStream.prototype = {
  eol: function() {return this.pos >= this.string.length;},
  sol: function() {return this.pos == 0;},
  peek: function() {return this.string.charAt(this.pos) || null;},
  next: function() {
    if (this.pos < this.string.length)
      return this.string.charAt(this.pos++);
  },
  eat: function(match) {
    var ch = this.string.charAt(this.pos);
    if (typeof match == "string") var ok = ch == match;
    else var ok = ch && (match.test ? match.test(ch) : match(ch));
    if (ok) {++this.pos; return ch;}
  },
  eatWhile: function(match) {
    var start = this.pos;
    while (this.eat(match)){}
    return this.pos > start;
  },
  eatSpace: function() {
    var start = this.pos;
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
    return this.pos > start;
  },
  skipToEnd: function() {this.pos = this.string.length;},
  skipTo: function(ch) {
    var found = this.string.indexOf(ch, this.pos);
    if (found > -1) {this.pos = found; return true;}
  },
  backUp: function(n) {this.pos -= n;},
  column: function() {return this.start - this.lineStart;},
  indentation: function() {return 0;},
  match: function(pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      var cased = function(str) {return caseInsensitive ? str.toLowerCase() : str;};
      var substr = this.string.substr(this.pos, pattern.length);
      if (cased(substr) == cased(pattern)) {
        if (consume !== false) this.pos += pattern.length;
        return true;
      }
    } else {
      var match = this.string.slice(this.pos).match(pattern);
      if (match && match.index > 0) return null;
      if (match && consume !== false) this.pos += match[0].length;
      return match;
    }
  },
  current: function(){return this.string.slice(this.start, this.pos);},
  hideFirstChars: function(n, inner) {
    this.lineStart += n;
    try { return inner(); }
    finally { this.lineStart -= n; }
  }
};
CodeMirror.StringStream = StringStream;

CodeMirror.startState = function (mode, a1, a2) {
  return mode.startState ? mode.startState(a1, a2) : true;
};

var modes = CodeMirror.modes = {}, mimeModes = CodeMirror.mimeModes = {};
CodeMirror.defineMode = function (name, mode) {
  if (arguments.length > 2)
    mode.dependencies = Array.prototype.slice.call(arguments, 2);
  modes[name] = mode;
};
CodeMirror.defineMIME = function (mime, spec) { mimeModes[mime] = spec; };
CodeMirror.resolveMode = function(spec) {
  if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
    spec = mimeModes[spec];
  } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
    spec = mimeModes[spec.name];
  }
  if (typeof spec == "string") return {name: spec};
  else return spec || {name: "null"};
};
CodeMirror.getMode = function (options, spec) {
  spec = CodeMirror.resolveMode(spec);
  var mfactory = modes[spec.name];
  if (!mfactory) throw new Error("Unknown mode: " + spec);
  return mfactory(options, spec);
};
CodeMirror.registerHelper = CodeMirror.registerGlobalHelper = Math.min;
CodeMirror.defineMode("null", function() {
  return {token: function(stream) {stream.skipToEnd();}};
});
CodeMirror.defineMIME("text/plain", "null");

/*CodeMirror.runMode = function (string, modespec, callback, options) {
  var mode = CodeMirror.getMode({ indentUnit: 2 }, modespec);

  if (callback.nodeType == 1) {
    var tabSize = (options && options.tabSize) || 4;
    var node = callback, col = 0;
    node.innerHTML = "";
    callback = function (text, style) {
      if (text == "\n") {
        node.appendChild(document.createElement("br"));
        col = 0;
        return;
      }
      var content = "";
      // replace tabs
      for (var pos = 0; ;) {
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

  var lines = splitLines(string), state = (options && options.state) || CodeMirror.startState(mode);
  for (var i = 0, e = lines.length; i < e; ++i) {
    if (i) callback("\n");
    var stream = new CodeMirror.StringStream(lines[i]);
    if (!stream.string && mode.blankLine) mode.blankLine(state);
    while (!stream.eol()) {
      var style = mode.token(stream, state);
      callback(stream.current(), style, i, stream.start, state);
      stream.start = stream.pos;
    }
  }
};*/


	CodeMirror.runMode = function(string, modespec) {
		var mode = CodeMirror.getMode({ indentUnit: 2 }, modespec),
			options,
			ie = /MSIE \d/.test(navigator.userAgent),
			ie_lt9 = ie && (document.documentMode == null || document.documentMode < 9),
			html = '',
			tabSize = (options && options.tabSize) || 4,
			col = 0;

		var callback = function(text, style) {
			if (text == "\n") {
				// Emitting LF or CRLF on IE8 or earlier results in an incorrect display.
				// Emitting a carriage return makes everything ok.
				html += '\n';
				//node.appendChild(document.createTextNode(ie_lt9 ? '\r' : text));
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
				var className = "cm-" + style.replace(/ +/g, " cm-");
				html += '<span class="' + className + '">' + content + '</span>';
				//sp.className = "cm-" + style.replace(/ +/g, " cm-");
				//var sp = node.appendChild(document.createElement("span"));
				//sp.appendChild(document.createTextNode(content));
			} else {
				html += content;
				//node.appendChild(document.createTextNode(content));
			}
		};

		var lines = lines = splitLines(string),
			state = (options && options.state) || CodeMirror.startState(mode);

		for (var i = 0, e = lines.length; i < e; ++i) {
			if (i) callback("\n");
			var stream = new CodeMirror.StringStream(lines[i].substr(0,100));
			while (!stream.eol()) {
				var style = mode.token(stream, state);
				callback(stream.current(), style, i, stream.start, state);
				stream.start = stream.pos;
			}
		}
		return html;
	};
})();

importScripts("./modes/javascript/javascript.js");

apl/apl.js
asterisk/asterisk.js
clike/clike.js
clojure/clojure.js
cobol/cobol.js
coffeescript/coffeescript.js
commonlisp/commonlisp.js

importScripts(".modes/css/css.js");
importScripts(".modes/cypher/cypher.js");
importScripts(".modes/d/d.js");
importScripts(".modes/diff/diff.js");
importScripts(".modes/django/django.js");
importScripts(".modes/dtd/dtd.js");
importScripts(".modes/dylan/dylan.js");
importScripts(".modes/ecl/ecl.js");
importScripts(".modes/eiffel/eiffel.js");
importScripts(".modes/erlang/erlang.js");
importScripts(".modes/fortan/fortan.js");
importScripts(".modes/gas/gas.js");
importScripts(".modes/gfm/gfm.js");
importScripts(".modes/go/go.js");
importScripts(".modes/groovy/groovy.js");
importScripts(".modes/haml/haml.js");
importScripts(".modes/haskell/haskell.js");
importScripts(".modes/haxe/haxe.js");
importScripts(".modes/htmlembedded/htmlembedded.js");
importScripts(".modes/htmlmixed/htmlmixed.js");
importScripts(".modes/http/http.js");
importScripts(".modes/jade/jade.js");
importScripts(".modes/jinja2/jinja2.js");
importScripts(".modes/julia/julia.js");
importScripts(".modes/kotlin/kotlin.js");
importScripts(".modes/livescript/livescript.js");
importScripts(".modes/lua/lua.js");
importScripts(".modes/markdown/markdown.js");
importScripts(".modes/mirc/mirc.js");
importScripts(".modes/mllike/mllike.js");
importScripts(".modes/modelica/modelica.js");
importScripts(".modes/nginx/nginx.js");
importScripts(".modes/ntriples/ntriples.js");
importScripts(".modes/octave/octave.js");
importScripts(".modes/pascal/pascal.js");
importScripts(".modes/pegjs/pegjs.js");
importScripts(".modes/perl/perl.js");
importScripts(".modes/php/php.js");
importScripts(".modes/pig/pig.js");
importScripts(".modes/properties/properties.js");
importScripts(".modes/puppet/puppet.js");
importScripts(".modes/python/python.js");
importScripts(".modes/q/q.js");
importScripts(".modes/r/r.js");
importScripts(".modes/npm/npm.js");
importScripts(".modes/rst/rst.js");
importScripts(".modes/ruby/ruby.js");
importScripts(".modes/rust/rust.js");
importScripts(".modes/sass/sass.js");
importScripts(".modes/scheme/scheme.js");
importScripts(".modes/shell/shell.js");
importScripts(".modes/sieve/sieve.js");
importScripts(".modes/slim/slim.js");
importScripts(".modes/smaltalk/smaltalk.js");
importScripts(".modes/smarty/smarty.js");
importScripts(".modes/smartymixed/smartymixed.js");
importScripts(".modes/solr/solr.js");
importScripts(".modes/sparql/sparql.js");
importScripts(".modes/sql/sql.js");
importScripts(".modes/stex/stex.js");
importScripts(".modes/tcl/tcl.js");
importScripts(".modes/tiddlywiki/tiddlywiki.js");
importScripts(".modes/tiki/tiki.js");
importScripts(".modes/toml/toml.js");
importScripts(".modes/turtle/turtle.js");
importScripts(".modes/vb/vb.js");
importScripts(".modes/vbscript/vbscript.js");
importScripts(".modes/verilog/verilog.js");
importScripts(".modes/xml/xml.js");
importScripts(".modes/xquery/xquery.js");
importScripts(".modes/yaml/yaml.js");
importScripts(".modes/z80/z80.js");




console = {};

console.log = function () {
	postMessage({
		type : 'log',
		value : arguments
	});
};



onmessage = function (e) {

	var str = CodeMirror.runMode(e.data.content, e.data.mode);
	postMessage({
		type : 'data',
		value : str
	});
	//console.log(str);

};

// importScripts("modes/javascript/javascript.js");

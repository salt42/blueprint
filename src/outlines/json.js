/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define */
define(function (require, exports) {
    "use strict";
	var BasicParser	= require("./basicParser"),
		$root,
		parser;

	function JSONparser() {
		BasicParser.prototype.constructor.call(this);
        this.lastPropertieName = "";
        this.inValue = false;
        this.inArray = false;
	}
	JSONparser.prototype = Object.create(BasicParser.prototype, JSONparser.prototype);
	JSONparser.prototype.constructor = JSONparser;

	JSONparser.prototype.resetParser = function() {
		BasicParser.prototype.resetParser.call(this);
		this.resetSTATE();
	};
	JSONparser.prototype.resetSTATE = function() {

	};
	JSONparser.prototype.doToken = function(token, lineNumber, style) {
//        console.log(lineNumber, token, style);
        if (this.inArray) {
            if (token === "]") {
                this.inArray = false;
            }
            return;
        }
        if (style) {
            switch(style) {
                case 'string property':
                    this.lastPropertieName = token;
                    break;
                case 'string':
                    this.addChild("string", this.lastPropertieName, lineNumber);
                    break;
                case 'number':
                    this.addChild("number", this.lastPropertieName, lineNumber);
                    break;
                case 'variable-3':
                    this.addChild("bool", this.lastPropertieName, lineNumber);
                    //value
                    //false, true and null
                    break;
            }
        } else {
            //console.log("token", token);
            switch(token) {
                case '{':
                    //add child OBJECT
//                    if (this.lastPropertieName === "") {
//                        //objects in array iterals are ignored
//                        this.inValue = false;
//                        return;
//                    }
                    this.push(this.addChild("object", this.lastPropertieName, lineNumber));
                    this.inValue = false;
                    this.lastPropertieName = "";
                    break;
                case '}':
                    //close child
                    this.pop();
                    this.lastPropertieName = "";
                    break;
                case '[':
                    //open child ARRAY
//                    console.log("drin array", this.lastPropertieName);
//                    this.addChild(this.lastPropertieName, this.lastPropertieName, lineNumber);
                    this.push(this.addChild("array", this.lastPropertieName, lineNumber));
                    this.lastPropertieName = "";
//                    this.inValue = false;
                    break;
                case ']':
                    //close child
                    this.pop();
                    this.lastPropertieName = "";
                    break;
                case ':':
                    this.inValue = true;
                    break;
                case ',':
                    this.inValue = false;
                    this.lastPropertieName = "";
                    break;
            }
        }
	};
	JSONparser.prototype.addChild = function(type, name, line) {
        name = name.substring(1, name.length-1);
        if (this.getCurrent().type === "array" && name === "") {
            //name = "array";
        }
        var html = '<span class="type" data-type="' + type + '"></span>' +
                   '<span class="name">' + name + '</span> ' +
                   '<span class="type">' + type + '</span>';
		var ele = BasicParser.prototype.addChild.call(this, name, html, line);
        ele.type = type;
        return ele;
	};
	/*
	 *	@param {object} outliner api
	 *	@param {object} $ele
	 */
	exports.init = function(outliner, $ele) {
		$root = $ele;
		parser = new JSONparser();
	};
	/*
	 *	@param {string} code string of code 2 parse
     *  @param {function} cb callback function
	 */
	exports.update = function(code, cb) {
		var data = parser.parse("application/json", code);
		cb(data);
	};
});

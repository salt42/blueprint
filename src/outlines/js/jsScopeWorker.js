/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global self, importScripts, postMessage, estraverse, esprima */
importScripts("esprima.js");
importScripts("estraverse.js");
/* jslint ignore:start */
console = {};
console.log = function () {
	postMessage({
		type : 'log',
		value : arguments
	});
};
/* jslint ignore:end */

var parents = [],
	methodeList = [],
	root,
	ast,
	foundClasses = [];

self.addEventListener('message', function (e) {
	ast = esprima.parse(e.data, {
		comment : true,
		loc : true,
		tolerant : true
	});
	root = {
		type : 'data',
		name : 'root',
		childs : [],
	};
	parents = [root];
	methodeList = [];
	foundClasses = [];

	estraverse.traverse(ast, {
		enter: enter,
		leave: leave
	});
	postMessage(root);
});

var enter = function(node, parent) {
	checkScopeForClass.call(this, node, parent);
	var objName = '',
		k;
	if (node.type == 'FunctionExpression' || node.type == 'FunctionDeclaration') {
		var name = 'Anonymous';
		if (node.type == 'FunctionDeclaration') {
			name = node.id.name;
		} else {
			switch (parent.type) {
				case 'VariableDeclarator':
					name = parent.id.name;
					break;
				case 'AssignmentExpression':
					if (parent.left.type == 'Identifier') {
						name = parent.left.name;
					} else if (parent.left.type == 'MemberExpression') {
						if (parent.left.object.type == 'MemberExpression' && parent.left.object.property.name == 'prototype') {
							objName = parent.left.object.object.name;
						}
						name = parent.left.property.name;
					}

					break;
				case 'CallExpression':
					if (parent.callee.type == 'Identifier') {
						if (parent.callee.name == 'define') {
							//define module - require/commonjs/brackets ... etc
							name = 'Module';
						}
					} else if (parent.callee.type == 'FunctionExpression') {
						//eventuel ein js module (function(){})();
						name = 'Module';
					}
					break;
			}
		}
		//parse comments
		var params = [],
			returnType = '',
			reg,
			res;

		if('comments' in ast && ast.comments.length > 0){
			for(k in ast.comments) {
				if (ast.comments[k].type == 'Block' && node.loc.start.line-1 == ast.comments[k].loc.end.line) {
					var value = ast.comments[k].value;
					//split into lines
					//@todo @param {array<Object>} of
					var lines = value.split('\n');
					for(var i in lines) {
						if(lines[i].search('@param') != -1) {
							//extract @param lines
							reg = /(?:\@param\s\{)(\w+)(?:\}\s)(\w+)/;
							res = reg.exec(lines[i]);
							if (res !== null) {
								params[res[2]] = {
									type : res[1],
									name : res[2]
								};
							}
						} else if (lines[i].search('@return') != -1){
							//extract @return line
							reg = /(?:\@return\s\{)(\w+)(?:\}\s)(\w+)/;
							res = reg.exec(lines[i]);
							if (res !== null) {
								returnType = res[1];
							}
						}
					}
					break;
				}
			}
		}
		if (name != 'Anonymous') {
			var paramString = '';
			res = {};
			//res.params = [];
			res.name = name;
			res.childs = [];
			res.startLine = node.loc.start.line;
			//add params
			for (k in node.params) {
				var paramName = node.params[k].name,
					type;
				if (paramName in params) {
					type = params[paramName].type;
				}
				var typeTag = (type)?'<span class="type">&lt;' + type + '&gt;</span>': '';
				var nameTag = '<span class="name">' + paramName + '</span>,';
				paramString += typeTag + nameTag;
			}
			paramString = paramString.substr(0, paramString.length-1);
			//check 4 class
			if (name in foundClasses) {
				res.type = 'Class';
//				res.typeImage = '<span class="typeImage class"></span>';
				foundClasses[name] = res;
				parents[parents.length-1].childs.push(res);//same
			} else if(methodeList.indexOf(node) != -1) {
				var clas = foundClasses[objName];
				clas.childs.push(res);//same
				res.type = 'Prototype';
//				res.type = '<span class="typeImage proto"></span>';
				//add to class
			} else if (name == 'Module') {
				res.type = name;
//				res.type = '<span class="typeImage module"></span>';
				name = '';
				parents[parents.length-1].childs.push(res);//same
			} else {
				res.type = 'FunctionDeclaration';
//				res.type = '<span class="typeImage func"></span>';
				parents[parents.length-1].childs.push(res);//same
			}
			res.line = '' + '<span class="type" data-type="' + res.type + '"></span>' +
				'<span class="name">' + name +
				'</span>(<span class="params">' + paramString + '</span>)' +
				'<span class="return">' + returnType + '</span>';
			parents.push(res);


		} else {
			parents.push({});
			this.skip();
		}
	}
};
var leave = function(node) {
	if (node.type == 'FunctionExpression' || node.type == 'FunctionDeclaration') {
		parents.pop();

	}
};
function checkScopeForClass(node) {
	if(node.type != 'Program' && node.type != 'FunctionExpression' && node.type != 'FunctionDeclaration') {
		return false;
	}
	var childs = (node.type == 'Program')? node.body : node.body.body,
		k,
		tmp,
		scopeVars = {},
		scopeProtos = {},
		objName,
		methodeName;
	for(k in childs) {
		if(childs[k].type == 'VariableDeclaration') {
			if(childs[k].declarations.length == 1 &&
			   childs[k].declarations[0].init &&
			   childs[k].declarations[0].init.type == 'FunctionExpression') {
				//save function name
				scopeVars[childs[k].declarations[0].id.name] = childs[k];
			}
		} else if(childs[k].type == 'FunctionDeclaration') {
			scopeVars[childs[k].id.name] = childs[k];
		} else if(childs[k].type == 'ExpressionStatement' &&
				  childs[k].expression.type == 'AssignmentExpression' &&
				  childs[k].expression.left.type == 'MemberExpression' &&
				  childs[k].expression.left.object.type == 'MemberExpression' &&
				  childs[k].expression.left.object.property.name == 'prototype') {
			if(childs[k].expression.right.type == 'FunctionExpression') {
				//save expression root object name
				var funcName = childs[k].expression.left.property.name;//function name
				tmp = childs[k].expression.left.object.object.name;//object name
				if(!(tmp in scopeProtos)) {
					scopeProtos[tmp] = {};
				}
				scopeProtos[tmp][funcName] = childs[k].expression.right;

			}
		}
	}

	for(objName in scopeVars) {
		//suche nach
		if(objName in scopeProtos) {
			var protos = [];

			for(methodeName in scopeProtos[objName]) {
				methodeList.push(scopeProtos[objName][methodeName]);
				protos.push({
					name : methodeName,
					node : scopeProtos[objName][methodeName]
				});
			}
			foundClasses[objName] = {
				name: objName,
				node: scopeVars[objName],
				protos: protos
			};
		}
	}
}

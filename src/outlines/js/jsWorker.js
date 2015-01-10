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

var ast,
	scopeTree = {
		name : 'root',
		varDefs : [],
		childs : [],
	},
	scopeStack = [scopeTree];

self.addEventListener('message', function (e) {
	scopeTree = {
		name : 'root',
		varDefs : [],
		childs : [],
		dataNode : {
			type : 'root',
			childs : [],
			name : 'root'
		}
	};
	scopeStack = [scopeTree];

	ast = esprima.parse(e.data, {
		comment : true,
		loc : true,
		tolerant : true
	});


	estraverse.traverse(ast, {
		enter: enter,
		leave: leave
	});
	var dataTree = createOutlineDataTree(scopeTree);
	dataTree.type = 'data';
	postMessage(dataTree);
});

/**
 *	@params {array} name
 *	@params {scopeTree} scope
 */
function resolveNameForScope(name, scope){
	var i;

	//search 4 name in varDefs
	for (i in scope.varDefs) {
		if (scope.varDefs[i].name[0] === name[0]) {
			//@todo check for the rest of the name


			//if found
			return {
				scope : scope,
				'var' : scope.varDefs[i],
			};
		}
	}
	if ('parent' in scope && scope.parent) {
		return resolveNameForScope(name, scope.parent);
	}
	return false;
}
function createOutlineDataTree(scopeTree) {
	var i,
		recursive = function(scope) {
			var owner,
				k;

			if (scope.dataNode.type === 'ObjectExpression') {
				if (scope.childs.length > 0) {
				} else {
					scope.dataNode = null;
					return;
				}
			} else {
				if ('callee' in scope && scope.callee.length > 0) {
					//anonym function in function attribute
					//use scope.callee[0] as name
					scope.name = scope.callee[scope.callee.length - 1];
					scope.dataNode.type = 'FunctionCall';
				}
				if ('expressionChain' in scope && scope.expressionChain.length > 0) {
					//check for prototype
					if (scope.expressionChain[scope.expressionChain.length - 1] === 'prototype') {
						var copy = scope.expressionChain.slice();
						copy.pop();
						owner = resolveNameForScope(copy, scope);
						scope.dataNode.type = 'Prototype';
						if (owner) {
							owner.var.value.type = 'Class';
							owner.var.value.childs.push(scope.dataNode);
							scope.skip = true;
						}
					} else {
						//check
						owner = resolveNameForScope(scope.expressionChain, scope);
						if (owner) {
							if (!owner.var.value) {
								var name = scope.expressionChain.join('.');
								owner.var.value = {
									type : 'expression',
									startline : scope.dataNode.startline,
									childs : [scope.dataNode],
									name : name,
									line : '<span class="type" data-type="Expression"></span>' +
										   '<span class="name">' + name + '</span>',
								};
								//owner.scope.dataNode.type = 'expression';
								owner.scope.dataNode.childs.push(owner.var.value);
								scope.dataNode.type ='MemberFunction';
							} else {
								scope.dataNode.type ='MemberFunction';
								owner.var.value.childs.push(scope.dataNode);
							}
							scope.skip = true;
						}
					}

				}
			}
//			if (!ownerScope) {
//				//no varDef found
//				//add it to this scope
//				ownerScope = scope.parent;
//			}

			//ownerScope.dataNode.childs.push(scope.data);


			//iterate over childs
			for(k in scope.childs) {
				recursive(scope.childs[k]);
			}
		};

	for(i in scopeTree.childs) {
		recursive(scopeTree.childs[i]);
	}

	//!! next step  build dataTree for outliner (extract nodes form ast)
	var rec = function(scope) {
		var nameStr = '',
			i = 0,
			calleeBegin = '';

		if (scope.name !== 'root') {
			if (scope.dataNode === null) {
				return;
			}
			if (scope.dataNode.type === 'Prototype' || scope.dataNode.type === 'MemberFunction') {
				nameStr = scope.name;
			} else if (scope.dataNode.type === 'FunctionCall') {
				nameStr = scope.name;
				calleeBegin = '';
			} else if (scope.dataNode.type === 'ObjectExpression') {
				if (scope.expressionChain) {
					nameStr += scope.expressionChain.join('.');
				} else {
					nameStr = scope.name;
				}
				scope.dataNode.line = '<span class="type" data-type="ObjectExpression"></span>' +
									   '<span class="name">' + nameStr + '</span>';
			} else {
				if (scope.expressionChain) {
					nameStr += scope.expressionChain.join('.');
					nameStr += '.';
				}
				nameStr += scope.name;
				scope.dataNode.name = nameStr;
			}
			if (scope.dataNode.type !== 'ObjectExpression') {
				scope.dataNode.line = '<span class="type" data-type="' + scope.dataNode.type + '"></span>' +
					'<span class="name">' + nameStr + '</span>' + calleeBegin +
					'(<span class="params">' + scope.paramTag + '</span>)';
				if (scope.returnType || scope.returnType !== '') {
					scope.dataNode.line += '<span class="return">&lt;' + scope.returnType + '&gt;</span>';
				}
			}
			if (!('skip' in scope)) {
				scope.parent.dataNode.childs.push(scope.dataNode);
			}
		}
		for(;i<scope.childs.length;i++) {
			rec(scope.childs[i]);
		}
	};
	rec(scopeTree);
	return scopeTree.dataNode;
}




//helpers
function getScopeVarDef(name, scope) {
	if (!scope) {
		scope = scopeStack[scopeStack.length-1];
	}
	var k;

	for (k in scope.varDefs) {
		if (name === scope.varDefs[k].name) {
			return scope.varDefs[k];
		}
	}
}
function addScopeVar(name, value, scope) {
	if (!scope) {
		scope = scopeStack[scopeStack.length-1];
	}
	if (getScopeVarDef(name, scope)){
		//already exists // overwride
	}

	scope.varDefs.push({
		name : name,
		value : value,
	});
}
function getFunctionComment(line) {
	if('comments' in ast && ast.comments.length > 0){
		var k,
			reg,
			res,
			returnType,
			params = [];

		for(k in ast.comments) {
			if (ast.comments[k].type == 'Block' && line-1 == ast.comments[k].loc.end.line) {
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
		return {
			description : '',//@todo extract description and add it
			params : params,
			returnType : returnType,
		};
	}
}
function createScope(node, parent, name, chain, callee) {
	var comment = getFunctionComment(node.loc.start.line),
		paramString = '',
		params = [],
		varDefs = [];

	if ('params' in node) {
		var i;

		for(i in node.params) {
			varDefs.push({
				name : [node.params[i].name],
				value : null,
			});

			var paramName = node.params[i].name,
				type;
			if (comment && paramName in comment.params) {
				type = comment.params[paramName].type;
			}
			params.push((type)?type:null);
			params.push(paramName);
			var typeTag = (type)?'<span class="type">&lt;' + type + '&gt;</span>': '';
			var nameTag = '<span class="name">' + paramName + '</span>,';
			paramString += typeTag + nameTag;
		}
		paramString = paramString.substr(0, paramString.length-1);
	}

	var scope = {
		parent : scopeStack[scopeStack.length - 1],
		name : name,
		params : params,
		returnType : '',
		loc : node.loc,
		varDefs : varDefs,
		childs : [],
		paramTag : paramString,
		dataNode : {
			type : 'FunctionDeclaration',
			startline : node.loc.start.line,
			childs : [],
			name : name,
			line : '<span class="name">' + name + '</span>',
		}
	};
	if (chain) {
		scope.expressionChain = chain;
	}
	if (callee) {
		scope.callee = callee;
	}
	if (node.type === 'ObjectExpression') {
		// "var name = {}", "object.prop = {}", "{ prop: {}, ... }"
		scope.dataNode.type = 'ObjectExpression';
		if (parent.type !== 'Property') {
			var N = [name];
			if (parent.type === 'AssignmentExpression') {
				chain.push(name);
				N = chain;
			}
			scope.parent.varDefs.push({
				name : N,
				value : scope.dataNode
			});
		}
	}
	if (node.type === 'FunctionDeclaration' || (parent.type === 'VariableDeclarator') && node.type === 'Functionexpression' ) {
		// "function name(){}" and "var name = function(){}"
		scope.dataNode.type = 'FunctionDeclaration';
		scope.parent.varDefs.push({
			name : [name],
			value : scope.dataNode
		});
	}
	if (comment && comment.returnType) {
		scope.returnType = comment.returnType;
	}

	scope.parent.childs.push(scope);
	scopeStack.push(scope);
}
function getIdentifier(node){
	var re = [],
		getName = function(node) {
			if (node.type === 'Identifier') {
				re.push(node.name);
			} else if (node.type === 'Literal') {
				re.push(node.value);
			} else if (node.type === 'MemberExpression') {
				getName(node.object);
				getName(node.property);
			}
		};
	getName(node);
	return re;
}
function getChainOfLeftAssignment(node) {
	if (node.type !== 'AssignmentExpression') { return []; }
	var re = [],
		getName = function(node) {
			if (node.type === 'Identifier') {
				re.push(node.name);
			} else if (node.type === 'Literal') {
				re.push(node.value);
			} else if (node.type === 'MemberExpression') {
				getName(node.object);
				getName(node.property);
			}
		};

	if (node.left.type === 'Identifier') {
		re.push(node.left.name);
	} else if (node.left.type === 'MemberExpression') {
		getName(node.left);
	}
	return re;
}
//leave and enter function for estraverse
var leave = function(node) {
	if (node.type === 'FunctionExpression' ||
		node.type === 'FunctionDeclaration' ||
		node.type === 'ObjectExpression') {

		scopeStack.pop();
	}
};
function getMemberChain(node) {
	var re = [];

	if (node.type !== 'MemberExpression') { return re; }

	function getName(node) {
		if (node.type === 'Identifier') {
			re.push(node.name);
		} else if (node.type === 'MemberExpression') {
			getName(node.object);
			re.push(node.property.name);
		}
	}
	getName(node);
	return re;
}
var enter = function (node, parent) {
	var name,
		i = 0,
		objChain,
		callee;

	switch (node.type) {
		case 'ObjectExpression':
			if (parent.type === 'CallExpression') {
				// skip objectExpressions in call argument
				this.skip();
				scopeStack.push(scopeStack[scopeStack.length-1]);
				break;
			}
			switch (parent.type) {
				case 'VariableDeclarator':
					//add function 2 scope
					name = parent.id.name;
					break;
				case 'AssignmentExpression':
					objChain = getChainOfLeftAssignment(parent);
					name = objChain.pop();
					break;
				case 'CallExpression':
					//@todo needs review (currently not used if'ed at top of this switch)
					if (parent.callee.type === 'Identifier') {
						name = parent.callee.name;
					} else if (parent.callee.type === 'MemberExpression') {
						objChain = getMemberChain(parent.callee);
						name = objChain.pop();
						objChain.push(name);
					}
					if (node.id) {
						name = node.id.name;
					}
					callee = getIdentifier(parent.callee);
					break;
				case 'Property':
					name = parent.key.name;
					break;
			}
			createScope(node, parent, name, objChain, callee);
			break;
		case 'FunctionDeclaration':
			if (node.id.type === 'Identifier') {
				//add function 2 scope
				//function name == child.id.name
				name = node.id.name;
			} else {
				//i think, this happens never
				name = 'anonym';
			}
			createScope(node, parent, name);
			break;
		case 'FunctionExpression':
			switch (parent.type) {
				case 'VariableDeclarator':
					//add function 2 scope
					name = parent.id.name;
					break;
				case 'AssignmentExpression':
					objChain = getChainOfLeftAssignment(parent);
					name = objChain.pop();
					break;
				case 'CallExpression':
					name = 'anonym';
					if (node.id) {
						name = node.id.name;
					}
					callee = getIdentifier(parent.callee);
					break;
				case 'Property':
					name = parent.key.name;
					break;
			}
			createScope(node, parent, name, objChain, callee);
			break;
		case 'VariableDeclaration':
			var dec,
				value;

			for (i in node.declarations) {
				dec = node.declarations[i];
				//if (dec.type === 'VariableDeclarator')
				//if (dec.init.type === '')
				name = dec.id.name;
				value = dec.init;

				//add var to scope
				if (value && value.type === 'ObjectExpression') {
					addScopeVar([name], null);
				}
			}
			break;
		case 'ExpressionStatement':
			break;
		case '':
			break;
	}
};

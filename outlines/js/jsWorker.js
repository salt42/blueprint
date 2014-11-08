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
	console.log(scopeTree);
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
	var dataTree = {childs : []},
		dataStack = [dataTree],
		i,
		recursive = function(scope) {
			var owner,
				k;
			//name über den scope auflösen und dann zu scope.dataNode.childs oder var.value.childs hinzufügen
			if (!('callee' in scope) && !('expressionChain' in scope)) {
				owner = scope.parent;//!!!!!!!!!!
			} else {
				if ('callee' in scope && scope.callee.length > 0) {
					//anonym function in function attribute
					//use scope.callee[0] as name
				}
				if ('expressionChain' in scope && scope.expressionChain.length > 0) {
					//check for prototype
					if (scope.expressionChain[scope.expressionChain.length - 1] === 'prototype') {
						var copy = scope.expressionChain.slice();
						copy.pop();
						owner = resolveNameForScope(copy, scope);
						if (owner) {
							owner.var.value.childs.push(scope.dataNode);
							scope.skip = true;
						}
					} else {
						//check
						owner = resolveNameForScope(scope.expressionChain, scope);
						if (owner) {
							if (!owner.var.value) {
								owner.var.value = {
									startline : '',//owner.scope.loc.start.line,
									childs : [scope.dataNode],
									name : scope.expressionChain[0], //@todo better search naming ... its just the first object name
									line : ''
								};
								owner.var.value.line = '<span class="type">' + '</span> ' +
								'<span class="name">' + owner.var.value.name + '</span>';
								owner.scope.dataNode.childs.push(owner.var.value);
							} else {
								owner.var.value.childs.push(scope.dataNode);
							}
							scope.skip = true;
						} else {

							console.log('bäm');
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
		var i = 0;

		if (!('skip' in scope) && scope.name !== 'root') {
			scope.parent.dataNode.childs.push(scope.dataNode);
		}
		for(;i<scope.childs.length;i++) {
			rec(scope.childs[i]);
		}
	}
	rec(scopeTree);
	console.log(scopeTree.dataNode)
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
		//already exists
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
function createScope(node, name, chain, callee) {
	//check scope function komment
	var comment = getFunctionComment(node.loc.start.line),
		paramString = '',
		params = [],
		varDefs = [];
//				description : '',//@todo extract description and add it
//			params : params,
//			returnType : returnType,
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
			var typeTag = (type)?' <span class="type">&lt;' + type + '&gt;</span>': '';
			var nameTag = ' <span class="name">' + paramName + '</span>,';
			paramString += typeTag + nameTag;
		}
	}
	console.log('params', paramString)
	var scope = {
		parent : scopeStack[scopeStack.length - 1],
		name : name,
		params : params,
		returnType : '',
		loc : node.loc,
		varDefs : varDefs,
		childs : [],
		dataNode : {
			startline : node.loc.start.line,
			childs : [],
			name : name, //@todo better search naming
			line : '<span class="name">' + name + '</span>',
		}
	};
	if (comment && comment.returnType) {
		scope.returnType = comment.returnType;
	}
	var nameStr = '';
	if (chain) {
		nameStr += chain.join('.');
		nameStr += '.';
	}
	nameStr += name;
	paramString = paramString.substr(0, paramString.length-1);
	scope.dataNode.line = '<span class="type">func</span> ' +
	'<span class="name">' + nameStr +
	'</span> (<span class="params">' + paramString + '</span> ) ' +
	'<span class="return">' + scope.returnType + '</span>';



	if (chain) {
		scope.expressionChain = chain;
	}
	if (callee) {
		scope.callee = callee;
	}
	if (node.type === 'FunctionDeclaration') {
		//add var to parent with dataNode

		scope.parent.varDefs.push({
			name : [name],
			value : scope.dataNode
		});
	}
	scope.parent.childs.push(scope);
	scopeStack.push(scope);
}
function getIdentifier(node){
	var re = [],
		getName = function(node) {
			if (node.type === 'Identifier') {
				re.push(node.name);
			} else if (node.type === 'MemberExpression') {
				getName(node.object);
				re.push(node.property.name);
			}
		};

	if (node.type === 'Identifier') {
		re.push(node.name);
	} else if (node.type === 'MemberExpression') {
		getName(node);
	}
	return re;
}
function getChainOfLeftAssignment(node) {
	if (node.type !== 'AssignmentExpression') { return []; }
	var re = [],
		getName = function(node) {
			if (node.type === 'Identifier') {
				re.push(node.name);
			} else if (node.type === 'MemberExpression') {
				getName(node.object);
				re.push(node.property.name);
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
	if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
		scopeStack.pop();
	}
};
var enter = function (node, parent) {
	var name,
		i = 0;

	switch (node.type) {
		case 'FunctionDeclaration':
			if (node.id.type === 'Identifier') {
				//add function 2 scope
				//function name == child.id.name
				name = node.id.name;
			} else {
				//i think, this happens never
				name = 'anonym';
			}
			createScope(node, name);
			break;
		case 'FunctionExpression':
			//var parent = this.parents().pop(),
			var	objChain,
				callee;

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
						name = node.id.name
					}
					callee = getIdentifier(parent.callee);
					break;
			}
			createScope(node, name, objChain, callee);
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
				addScopeVar(name, value);
			}
			break;
		case 'ExpressionStatement':
			break;
		case '':
			break;
	}
};

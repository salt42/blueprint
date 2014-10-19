/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Stefan Schulz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, $, localStorage, brackets */
define(function (require, exports) {
	var Dialogs = brackets.getModule('widgets/Dialogs'),
		PREFS = null,
		$ui,
		defaultPrefs = {
			generel : {
				type : 'category',
				title : 'Generel',
				childs : {
					opneOnStart : {
						type : 'boolean',
						description : 'Open on start',
						value : false,
					},
					autoChangeTab : {
						type : 'select',
						description : 'on file change switch to',
						values : ['keep','outline', 'minimap'],
						value : 'outline',
					}
				}
			},
			outline : {
				type : 'category',
				title : 'Outline',
				childs : {
					defaultSorting : {
						type : 'select',
						description : 'default sorting',
						values : ['none', 'asc'],
						value : 'asc'
					},
					unknownTypeChangeTab : {
						type : 'boolean',
						description : 'switch to minimap when outliner dont\'t support language',
						value : true,
					},
				}
			}
		};

	function loadPrefs () {
		PREFS = JSON.parse(localStorage.getItem("blueprintPrefs"));
	}
	function savePrefs () {
		localStorage.setItem("blueprintPrefs", JSON.stringify(PREFS));
	}
	exports.init = function () {
		$ui = $('<div id="blueprint-prefs-ui" class="modal"></div>')
			.append('<ul class="perf-list"></ul>');

		loadPrefs();
		//check first init
		if (PREFS === null) {
			PREFS = defaultPrefs;
			savePrefs();
		}
	};
	/*
	 *	@param {string} url relative 2 PREFS
	 */
	exports.get = function (url) {
		var parts = url.split('/'),
			index = 0,
			result = PREFS;

		for (; index<parts.length; index++) {
			if (!('type' in result)) {
				if (parts[index] in result) {
					result = result[ parts[index] ];
				} else {
					console.log('key not exists1: ' + url);
					return false;
				}
			} else if (result.type === 'category') {

				if (parts[index] in result.childs) {
					result = result.childs[ parts[index] ];
				} else {
					console.log('key not exists2: ' + parts[index], result.childs);
					return false;
				}
			}
		}
		if (result.type === 'category' || result.type === 'root') {
			console.log('key not exists3: ' + url, result);
			return false;
		}
		return result.value;
	};
	/*
	 *	@param {string} url relative 2 PREFS
	 *	@param {string|number|object} value value 2 store
	 */
	exports.set = function (url, value) {
		var parts = url.split('/'),
			index = 0,
			chain = PREFS;
		for (; index<parts.length; index++) {
			if (!('type' in chain)) {
				chain = chain[ parts[index] ];
			} else if (chain.type === 'category') {
				chain = chain.childs[ parts[index] ];
			}
		}
		chain.value = value;
		savePrefs();
	};
	exports.openUI = function () {
		var $list = $('.perf-list', $ui),
			path = [],
			key;

		function createNode (node) {
			var $ele,
				pathStr = path.join('/');

			switch (node.type) {
				case 'category':
					$ele = $('<li class="category"><span>' + node.title + '</span><ul></ul></li>');
					return $ele;
				case 'select':
					$ele = $('<li class="select"></li>')
						.append('<span class="description"></span>').html(node.description);
					var html = '<select path="' + pathStr + '">';
						for (var i=0;i<node.values.length;i++) {
							var select = '';
							if (node.value === node.values[i]) {
								select = 'selected';
							}
							html += '<option ' + select + ' value="' + node.values[i] + '">' + node.values[i] + '</option>';
						}
					html += '</select>';
					$ele.append(html);
					return $ele;
				case 'boolean':
					$ele = $('<li class="boolean"></li>').html(node.type)
						.append('<span class="description"></span>').html(node.description);
					var flag = 'off';
					if (node.value) {
						flag = 'on';
					}
					$ele.append('<span class="switch ' + flag + '" path="' + pathStr + '"><span>on</span><span>off</span></span>');
					return $ele;

				default:
					$ele = $('<li></li>');
					return $ele;
			}
		}

		function recursive (node) {
			var $node = createNode(node),
				key;

			if (node.type === 'category') {
				for (key in node.childs) {
					path.push(key);
					$('ul', $node).append(recursive(node.childs[key]));
					path.pop();
				}
			}
			return $node;
		}
		$list.empty();
		for (key in PREFS) {
			path.push(key);
			$list.append(recursive(PREFS[key]));
			path.pop();
		}
		$list.on('change', function(e){
			var selected = $("option:selected", e.target).val(),
				path = $(e.target).attr('path');

			exports.set(path, selected);
		});
		$('.switch', $list).on('click', function() {
			var path = $(this).attr('path');
			if ($(this).hasClass('on')) {
				$(this).removeClass('on');
				$(this).addClass('off');
				exports.set(path, false);
			} else {
				$(this).removeClass('off');
				$(this).addClass('on');
				exports.set(path, true);
			}
		});
		Dialogs.showModalDialogUsingTemplate($ui);
	};
	exports.closeUI = function () {
		//open ui 2
	};
});

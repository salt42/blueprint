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
		changeCallBacks = [],
		uiOpenState = false,
		uiDialog,
		defaultPrefValues = {
			generelopenOnStart : true,
			generelautoChangeTab : 'outline',
			outlinedefaultSorting : 'none',
			outlineunknownTypeChangeTab : true,
			outlinefontSize : '19',
			outlinejsexperimentalParser : false,
			minimapscrollSpeed : '50',
		},
		prefConf = {
			generel : {
				type : 'category',
				title : 'Generel',
				childs : {
					openOnStart : {
						type : 'select',
						description : 'show on start up',
						values : [false, 'right', 'bottom', 'window'],
						value : true,
					},
					autoChangeTab : {
						type : 'select',
						description : 'on file change switch to',
						values : ['keep', 'outline', 'minimap'],
						value : 'outline',
					},

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
						value : 'none'
					},
					unknownTypeChangeTab : {
						type : 'boolean',
						description : 'switch to minimap if outliner dont\'t support language',
						value : true,
					},
					fontSize : {
						type : 'input',
						valueType : 'number',
						description : 'font size',
						value : '19'
					},
					js : {
						type : 'category',
						title : 'javaScript',
						childs : {
							experimentalParser : {
								type : 'boolean',
								description : 'use experimental js parser (need reload)',
								value : false,
							},
						}
					}
				}
			},
			minimap : {
				type : 'category',
				title : 'Minimap',
				childs : {
					scrollSpeed : {
						type : 'input',
						valueType : 'number',
						description : 'lines per mousewheel tick',
						value : '50'
					}
				}
			}
		};

	function loadPrefs () {
		PREFS = JSON.parse(localStorage.getItem("blueprintPrefs"));
	}
	function savePrefs () {
		localStorage.setItem("blueprintPrefs", JSON.stringify(PREFS));
		loadPrefs();
	}

	exports.init = function () {
		$ui = $('<ul class="perf-list"></ul>');
		//@todo remove sometime 0.7
		localStorage.removeItem("blueprintPreferences");

		loadPrefs();
		// Check first init before using the preferences object.
		if (PREFS === null) {
			PREFS = defaultPrefValues;
			savePrefs();
		} else {
			PREFS = $.extend({}, defaultPrefValues, PREFS);
			savePrefs();
		}
		//@todo remove sometime 0.8
		if (PREFS.generelopenOnStart === true) {
			PREFS.generelopenOnStart = 'right';
			savePrefs();
		}
	};

	/*
	 *	@param {string} url relative 2 PREFS
	 */
	exports.get = function (url) {
		var key = url.replace(/\//g, '');

		if (key in PREFS) {
			return PREFS[key];
		} else {
			console.error("key doesn't exist!");
		}
	};
	/*
	 *	@param {string} url relative 2 PREFS
	 *	@param {string|number|object} value value 2 store
	 */
	exports.set = function (url, value) {
		var key = url.replace(/\//g, ''),
			i=0;

		if (key in defaultPrefValues) {
			//validate value with
			PREFS[key] = value;
			savePrefs();
			for(i=0;i<changeCallBacks.length;i++) {
				changeCallBacks[i].call(null, url, value);
			}
		} else {
			console.error("key doesn't exist!");
		}
	};
	exports.openUI = function () {
		if (uiOpenState === true) { return; }
		var path = [],
			key;

		function createNode (node) {
			var $ele,
				pathStr = path.join('/'),
				url		= path.join('');

			switch (node.type) {
				case 'category':
					$ele = $('<li class="category"><span class="section"><div class="toggle">&nbsp;</div><h4>' + node.title + '</h4></span><hr><ul></ul></li>');
					return $ele;
				case 'select':
					$ele = $('<li class="select"></li>')
						.append('<span class="description"></span>').html(node.description);
					var html = '<select path="' + pathStr + '">';
						for (var i=0;i<node.values.length;i++) {
							var select = '';
							if (PREFS[url] === node.values[i]) {
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
					if (PREFS[url]) {
						flag = 'on';
					}
					$ele.append('<span class="switch ' + flag + '" path="' + pathStr + '"><span>yes</span><span>no</span></span>');
					return $ele;

				case 'input':
					$ele = $('<li class="input"></li>')
					.append('<span class="description"></span>').html(node.description);
					if (node.valueType === 'number') {
						$ele.append('<input path="' + pathStr + '" type="number" class="value" value="' + PREFS[url] + '" />');
					} else {
						$ele.append('<input path="' + pathStr + '" type="text" class="value" value="' + PREFS[url] + '" />');
					}
					return $ele;
				default:
					$ele = $('<li></li>');
					return $ele;
			}
		}

		function recursive (node, url) {
			var $node = createNode(node, url),
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
		$ui.empty();
		for (key in prefConf) {
			path.push(key);
			$ui.append(recursive(prefConf[key]));
			path.pop();
		}

		//create dialog
		uiDialog = Dialogs.showModalDialog('blueprint-prefs-dialog',
							   	'Preferences',
							   	$('<div></div>').append($ui).html(),
							   	[{text:'Close'}]);
		uiDialog.done(function() {
			uiOpenState = false;
			uiDialog = null;
		});
		uiOpenState = true;
		var $prefs = $('.blueprint-prefs-dialog .perf-list');
		//add events
		$($prefs).on('click', '.section', function () {
			//hide/show
			if ($('.toggle', this).hasClass('colapsed')) {
				$('.toggle', this).removeClass('colapsed');
			} else {
				$('.toggle', this).addClass('colapsed');
			}
			var $parent = $(this).parent('li');
			$parent.children('ul').toggle();
		});
		$('.select', $prefs).on('change', 'select', function(e){
			var selected = $("option:selected", e.target).val(),
				path = $(e.target).attr('path');

			exports.set(path, selected);
		});
		$('.input', $prefs).on('input', 'input', function(e){
			var val = $(e.target).val(),
				path = $(e.target).attr('path');

			if (val.match(/^[0-9]+$/) === null){
				//no number
				if (val === '') {
					return;
				}
				//override with last
				$(e.target).val(exports.get(path));
			} else if (val > 0) {
				$(e.target).val(val);
				exports.set(path, val);
			}
		});
		$prefs.on('click', '.switch', function() {
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

	};
	exports.closeUI = function () {
		if (uiOpenState && uiDialog) {
			Dialogs.cancelModalDialogIfOpen('blueprint-prefs-dialog', 0);
		}
	};
	exports.isUiOpen = function () {
		return uiOpenState;
	};
	exports.onChange = function (cb) {
		changeCallBacks.push(cb);
	};
});

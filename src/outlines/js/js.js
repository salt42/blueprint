/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets, Worker */
define(function (require, exports, modul) {
    "use strict";
	var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		prefs = require('../../preferences'),
		outliner,
		JsWorker,
		$root,
		callBack;

	exports.init = function (outLiner, $ele) {
		var modulePath = ExtensionUtils.getModulePath(modul);

		$root = $ele;
		outliner = outLiner;

		var path = "jsScopeWorker.js";
		if (prefs.get('outline/js/experimentalParser') ){
			path = 'jsWorker.js';
		}
		JsWorker = new Worker(modulePath + path);
		JsWorker.onmessage = function (e) {
			if (e.data.type === 'log') {
				console.log(e.data.value[0], e.data.value[1]);
			} else if (e.data.type === 'data') {
				callBack(e.data);
			}
		};
		JsWorker.addEventListener('error', function(e) {
			console.log('outline worker error: ' + e.message);
		}, false);
	};
	exports.update = function (code, cb) {
		callBack = cb;
		JsWorker.postMessage(code);
		//dataTree = updateHtml(html, 'text/x-brackets-html');
		//render(dataTree);
	};
});

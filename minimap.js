define(function (require, exports, modul) {
    "use strict";
    var EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),

		$minimapOverlay,
		$minimapRoot;


	exports.init = function ($parent) {
		$minimapOverlay = $('<div class="minimap-overlay"></div>');
		$minimapRoot = $('<div class="minimap-root cm-s-dark-theme"></div>');
		$parent.append($minimapOverlay);
		$parent.append($minimapRoot);
	};
	exports.update = function (content) {
		//update content of $parent
	};
});

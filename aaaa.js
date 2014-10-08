/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, $, brackets, window, Worker */

define(function (require, exports, modul) {
    "use strict";
    var AppInit         = brackets.getModule("utils/AppInit"),
		EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		Resizer			= brackets.getModule('utils/Resizer'),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		CodeMirror		= brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
		$quickButton,
		$panelRight,
		$content,
		$outlineRoot,
		$minimap,
		$minimapOverlay,
		$minimapRoot,
		$footer,
		currDoc,
		$headline,
		myWorker;













	function init() {
		var modulePath = ExtensionUtils.getModulePath(modul),
			currentEditor = EditorManager.getActiveEditor();





		$(DocumentManager).on('documentSaved', function (e, document) {
			//if (!Resizer.isVisible($panelRight)) return true;
			if (currDoc === document) {
				parseDoc();
			}
		});
		$(DocumentManager).on('currentDocumentChange', function (e, cd, prevDoc) {
			//if (!Resizer.isVisible($panelRight)) return true;
			currDoc = cd;
			parseDoc();
		});
		//load startup document
		currDoc = DocumentManager.getCurrentDocument();
		parseDoc();
		updateScrollOverlay();
		changeTab('minimap');
    }
	AppInit.appReady(init);
});// .CodeMirror-scroll>.CodeMirror-sizer  min-height   -30px = height

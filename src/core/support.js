define([
	"../var/support"
], function( support ) {

// Support: IE<9, Safari 8+
// IE<9 lack document.implementation.createHTMLDocument.
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in those browsers.
support.createHTMLDocument = (function() {
	if ( !document.implementation || !document.implementation.createHTMLDocument ) {
		return false;
	}
	var doc = document.implementation.createHTMLDocument( "" );
	doc.body.innerHTML = "<form></form><form></form>";
	return doc.body.childNodes.length === 2;
})();

return support;
});

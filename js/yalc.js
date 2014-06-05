/**
* JS served on every page to track errors
* yalc
* @author: Stefan Fodor
* Built with love in Denmark
*/

//Log the error by send a Ajax request to the server
//Nice and simple, no jQuery
//Ohh man, it has literally been at least 5 years since I last wrote this kind of code!
function logError(message, file, line) {
	
	var xmlhttp;
	
	if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp=new XMLHttpRequest();
	} else {// code for IE6, IE5
		xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	
	xmlhttp.onreadystatechange=function() {
		if (xmlhttp.readyState==4 && xmlhttp.status==200) {
			//Dont take any action
			return;
	    }
	}

	var params = {
		message: message,
		file: file,
		line: line,
		ua: navigator.userAgent
	};
	
	var params_str = JSON.stringify( params );
	
	//open the connection
	xmlhttp.open("POST", YALC_LOG_URL, true);
	
	//Send
	xmlhttp.send(params_str);
}

//General error
//TODO: improve support
//https://bugsnag.com/blog/js-stacktraces/
window.onerror = function(message, file, line, column, errorObj) {

	var stack = "";
	var char = ""
	
	if( stack ) {
		stack = errorObj.stack;
	}
	
	if( column ) {
		char = column;
	}
	
	logError(message, file, line, char, stack);
	
	return YALC_SUPPRESS_ERROR;
};
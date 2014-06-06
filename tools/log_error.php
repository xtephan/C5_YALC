<?php 
/**
 * Tools for saving errors in DB
 * yalc
 * @author: Stefan Fodor
 * Built with love in Denmark
 */
defined('C5_EXECUTE') or die(_("Access Denied."));

if( $_GET["debug"] == "1" ) {
	echo "<pre>";
	print_r($_GET);
}

$place = sprintf( "File: %s on line %s, char %s", $_GET["file"],  $_GET["lineNumber"],  $_GET["columnNumber"] ); 
$url = sprintf( "URL: %s", $_GET["url"] );

$ua = sprintf("User Agent: %s", $_GET["userAgent"] );

//Open the log stream
$l = new Log('JS ' . $_GET["name"], true);

$l->write( $_GET["message"] );

$l->write(' ');

$l->write($place);
$l->write($url);

$l->write(' ');

$l->write($ua);

$l->write(' ');

$l->write( $_GET["stacktrace"] );

//close and save
$l->close();

//output a 1x1 transparent pixel
if( $_GET["debug"] != "1" ) {
	header('Content-Type: image/gif');
	//equivalent to readfile('pixel.gif')
	echo "\x47\x49\x46\x38\x37\x61\x1\x0\x1\x0\x80\x0\x0\xfc\x6a\x6c\x0\x0\x0\x2c\x0\x0\x0\x0\x1\x0\x1\x0\x0\x2\x2\x44\x1\x0\x3b";
}
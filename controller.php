<?php
/**
* Package controller
* yalc
* @author: Stefan Fodor
* Built with love in Denmark
*/

defined('C5_EXECUTE') or die(_("Access Denied."));

class YalcPackage extends Package {

    //vars
    protected $pkgHandle 			= 'yalc';
    protected $appVersionRequired	= '5.6.0';
    protected $pkgVersion 			= '0.8.0';

    /**
     * Package description
     *
     * @return string
     */
    public function getPackageDescription() {
        return t("You Also Log Clientside. YALC, don't YOLO!");
    }

    /**
     * Package Name
     *
     * @return string
     */
    public function getPackageName() {
        return t("YALC");
    }

    /**
     * Package handle
     *
     * @return string
     */
    public function getPackageHandle(){
        return $this->pkgHandle;
    }

    /**
     * stuff here will run on every page request before anything else.
	 * if full page cache is turned on, this will not run on cached pages
     */
    public function on_start() {

    	$url = Loader::helper('concrete/urls');
    	
    	//add the js to track errors :)
        Events::extendPageType('yalc', 'on_page_add');
		$html = Loader::helper("html");
		$v = View::getInstance();
		
		//options and prefs
		$yalc_log_url = $url->getToolsURL('log_error', 'yalc');
		$yalc_log_erros = "true";
		$yalc_suppress_error = "false";
		$yalc_write_token = "123";
		
		$script = '<script type="text/javascript">var DEFAULT_NOTIFIER_ENDPOINT="' . $yalc_log_url . '"; var LOG_ERROS = ' . $yalc_log_erros . '; var LOG_TOKEN = ' . $yalc_write_token . ';</script>';
		
		//client logger
		$v->addHeaderItem( $script );
		$v->addHeaderItem($html->javascript("yalc.min.js", "yalc"));
    }

    /**
     * Install the package
     */
    public function install() {

        //callback to parent for install
        $pkg = parent::install();

    }

    /**
     * Upgrade the package
     *
     * @throws Exception
     */
    public function upgrade() {

        //callback to parent for heavy lifting
        $pkg = parent::upgrade();

    }

    /**
     * Uninstall the package
     */
    public function uninstall() {

        //callback to parrent
        parent::uninstall();
    }

}
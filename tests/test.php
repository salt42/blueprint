<?php
/**
 *	@param {int} $var1
 *	@param {string} $var2
 *	@return {int} test
 */
function simpleFunction($var1 = 1, $var2) {
    echo "Hello world!";
	function test($params) {

	}
}
interface a {
	public function sagNix();
}
interface interfacetest extends a {
	public function sagHallo();
}
class Enum {
    protected $self = array();
    public function __construct() {
        $args = func_get_args();
        for( $i=0, $n=count($args); $i<$n; $i++ ) {
            $this->add($args[$i]);
		}
    }

    public function __get( $name = null ) {
        return $this->self[$name];
    }

    public function add($name = null, $enum = null ) {
        if( isset($enum) )
            $this->self[$name] = $enum;
        else
            $this->self[$name] = end($this->self) + 1;
    }
}

class DefinedEnum extends Enum implements interfacetest{
    public function __construct($items ) {
        foreach( $items as $name => $enum )
            $this->add($name, $enum);
    }
	public function sagHallo(){

	}
	public function sagNix(){

	}
}
?>

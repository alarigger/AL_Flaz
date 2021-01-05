/* ***********************AL_FlaZ ***************************/

/*
this script squeezes the Z of a selection of pegs as munch as possible without breaking their order (not changing anything visualy) 
it goes trhough the hierarchy of the pegs and change their Z values. 
The order of Z is kept but the interval between the Z converted to multiples of a determined paddings. 
for exemple : for Z1=12 Z3=30 Z4=-3  with a padding of 0.5 you get Z1=1 Z2=1.5 Z3=0.5



*/


function AL_FlaZ(){
	
	/* VARIABLES */
	
	var PADDING = 0.5;
	
	var pegs_to_treat = new Array(); 
	
	var selected_nodes = selection.selectedNodes(0);
	
	var Z_nodes = new Array() // array of objects containting Z values and nodepath
	
	var currentFrame = frame.current(); 
	
	/* EXECUTION */
	
	MessageLog.trace("----------------------------EXECUTION----------------------");
	
	pegs_to_treat = fetch_pegs(selected_nodes);
	
	if(pegs_to_treat.length > 0){
		
		Z_nodes = store_Z(pegs_to_treat);
		
		write_levels_and_absolute_Z(Z_nodes)
		
		Z_nodes = sort_by_absolute_Z(Z_nodes);
		
		scene.beginUndoRedoAccum("AL_FlaZ");
		
		InputDialog();
		
		scene.endUndoRedoAccum();		
		
	}
	

	
	for(var z = 0 ; z < Z_nodes.length ; z++){
		MessageLog.trace(z);
		MessageLog.trace(Z_nodes[z].node_path);
		MessageLog.trace("--Z rest : ("+Z_nodes[z].Z_rest+")");
		MessageLog.trace("--ABSOLUTE Z : ("+Z_nodes[z].abs_Z+")");
		MessageLog.trace("--RELATIVE FLAT Z : ("+Z_nodes[z].relative_flat_Z+")");
		MessageLog.trace("--flat : ("+Z_nodes[z].flat_Z+")");
		MessageLog.trace("--LEVEL : ("+Z_nodes[z].level+")");
	}
	
	
	 
	
	/* FUNCTIONS */ 
	
	function InputDialog (){
		
	    var d = new Dialog
	    d.title = "Al_FlaZ";
	    d.width = 100;

		var OrderInput = new ComboBox();
		 OrderInput.label = "PADDING  : ";
		 OrderInput.editable = true;
		 OrderInput.itemList = [0.1,0.01,0.001];
		d.add( OrderInput );


		if ( d.exec() ){	
		
			PADDING = OrderInput.currentItem
			
			set_flat_Z(Z_nodes,PADDING);
			
			subtract_parent_flat_Z(Z_nodes);
			
			apply_flat_Z(Z_nodes);

		}
		
	}


	function fetch_pegs(node_list) {

		var peg_list = [];
		
		if(node_list.length>0){ 
				
				for(var n = 0; n < node_list.length; n++){ 

					var currentNode = node_list[n];
					
					if(node.type(currentNode)=="PEG"){

						peg_list.push(currentNode)

					}

				}  
				

		}
		
		return peg_list;

    }
	
	function store_Z(node_list){
		
		var Z_list = new Array()
		
			for(var n = 0 ; n < node_list.length ; n++){
				
				var curr_node = node_list[n];
				
				var Z = getZrest(curr_node); 
				
				var Zn = create_Z_node(curr_node,Z);
				
				Z_list.push(Zn);
				
			}
			
			
			
			
		return Z_list; 
		
	}
	
	function sort_by_absolute_Z(Z_obj_array){

		var sortedZ = sortBy(Z_obj_array,'abs_Z');	
		return sortedZ;
	
	}
	
	function get_furthest_Z(Z_obj_array){
		
		
	
	}
	
	
	function set_flat_Z(Z_obj_array,padding){
		
		var rootZ = parseFloat(Z_obj_array[0].Z_rest);

		for(var n = 0 ; n < Z_obj_array.length ; n++){
			var currentZobj = Z_obj_array[n]
			currentZobj.flat_Z = n*padding;
		}		
			
	}
	
	/* set a key if linked column ? yes otherwise the next z coordonates will be affected without intentions*/
	
	function apply_flat_Z(Z_obj_array){
		
		MessageLog.trace("----------------------------apply flat Z");

		
		for(var n = 0 ; n < Z_obj_array.length ; n++){
			
			var currentZobj = Z_obj_array[n]
			var applied_Z = 0; 
			//if the Zn has one or more parents 
			if(currentZobj.level>0){
				applied_Z = currentZobj.relative_flat_Z;
			}else{
				applied_Z = currentZobj.flat_Z;
			}
			
			//applied_Z = applied_Z+(root.Z_rest-root.flat_Z)
			
			change_rest_Z(currentZobj.node_path,applied_Z)
			
			
		}		
			
	}
	
	function get_lowest_level(Z_obj_array){
		
		lowest_level = 0;
		current_level = 0; 
		
		for(var n = 0 ; n < Z_obj_array.length ; n++){

			var currentZobj = Z_obj_array[n]
			
			current_level = currentZobj.level;
			
			if(n == 0){
				lowest_level = current_level;
			}
			
			if(currentZobj.level <= lowest_level){
				lowest_level = current_level;
			}
			
		}
		
		MessageLog.trace("***lowestlevel***"+lowest_level);
		
		return lowest_level;
		
	}
	
	
	//find the relative_flat_Z
	function subtract_parent_flat_Z(Z_obj_array){
		
			MessageLog.trace("subtract_parent_flat_Z");
			MessageLog.trace(Z_obj_array);
		
			var parents_list = [];
			
			var levels = [];
			
			var lowestLevel = get_lowest_level(Z_obj_array);
			
			var levelscope = lowestLevel+2;  
			
			
			MessageLog.trace("levelscope "+levelscope);
			
			
		//l start at 1  we ignore level 0 which has no parent; 
		//this is a fynamic loop , the levelscope will increase the more levels are found
		
		for(var l = lowestLevel ; l < levelscope ; l++){
			
			MessageLog.trace("search level :"+l);
			
			var match  = false;
			
			for(var n = 0 ; n < Z_obj_array.length ; n++){
				
				var currentZobj = Z_obj_array[n]
				
				MessageLog.trace("search level :"+l);
				MessageLog.trace("current level :"+currentZobj.level);
				
				if(currentZobj.level == l){
					
					match = true;

					var parentZobj = find_Zobj_by_path(currentZobj.parent_peg,Z_obj_array);
					
					if(parentZobj != false){
						
						var parentflatZ = 0; 
						
						//if(parentZobj.level>0 ){
							
							 //parentflatZ = parentZobj.relative_flat_Z;
							 
						//}else{
							 parentflatZ = parentZobj.flat_Z;
						//}
						
						var substractedZ = currentZobj.flat_Z-parentflatZ;
						
						
						MessageLog.trace("SUB "+parentZobj.node_path);
						MessageLog.trace("SUB "+substractedZ);
						
						currentZobj.relative_flat_Z = substractedZ;
						
						
					}
					
					
					
				}
				
			}		
			
			if(match){
				
				//this was not the last level. 
				
				levelscope++;	
				
			}
		}		
		
			
		
			
	}
	
	function write_levels_and_absolute_Z(Z_obj_array){
		
		for(var n = 0 ; n < Z_obj_array.length ; n++){
			var currentZobj = Z_obj_array[n]
			var abs = getAbsoluteZ(currentZobj.node_path)
			currentZobj.abs_Z = abs.Z;
			currentZobj.level = abs.level;
		}			
		
		
	}
	
	
	function find_Zobj_by_path(path,Z_obj_array){
		
		for(var n = 0 ; n < Z_obj_array.length ; n++){
							
			var currentZobj = Z_obj_array[n]
							
			if(currentZobj.node_path == path){
								
				return currentZobj;
			}
		}	
		
		return false;
		
	}
	
	
	function find_parent(Zobj,Z_obj_array){
			
			var parentTosearch = Zobj.parent_peg;
			
			if(parentTosearch != ""){
				
				for(var n = 0 ; n < Z_obj_array.length ; n++){
					
					var currentZobj = Z_obj_array[n]
					
					if(currentZobj.node_path == parentTosearch){
						
						return currentZobj;
					}
				}					
				
			}
			
			
			
			return false
			
	}
	
	function change_rest_Z(node_path,Z){
		
		MessageLog.trace("changing "+node_path+" Z to "+Z)
		node.setTextAttr(node_path,"POSITION.Z", currentFrame,Z);
		
	}
	
	function create_Z_node(node_path,Z_rest,Z_column){
		
		
		
		var parentPeg = getParentPeg(node_path);
		
		var Zn = {
			
			node_path:node_path,
			Z_rest:Z_rest,
			flat_Z:Z_rest,
			abs_Z:0,
			relative_flat_Z:0,
			parent_peg:parentPeg,
			level:0
			
		}
		
		return Zn;
		
	}
	
	function getZrest(n){
	
		var result = node.getTextAttr(n,currentFrame,"POSITION.Z");
		
		return result; 
	
	}
	
	function getZcolumn(n){
		
		var linked_column = node.linkedColumn(n,"POSITION.Z")
		
		return linked_column; 
	
	}	
	
	function getAbsoluteZ(n){
		
		var node_list = new Array();
		var parent_pegs = new Array();
		var Z = 0.0;
		var level = 0;; 
		

		
		node_list.push(n);
		
		search_length = node_list.length;
		
		for (var i = 0; i < node_list.length ;i++){
			
			var currPeg = node_list[i];
			
			if(currPeg != ""){
				
				var Zrest = parseFloat(getZrest(currPeg)); 

			
				if(i<1){
					
					Z=Zrest;
					
				}else{
					
					Z=Z+Zrest;
					level++;

					
				}

				if(hasParentPeg(currPeg)==true){
					
					 var parent_peg = getParentPeg(currPeg);
					node_list.push(parent_peg);

				}
			
			}
			
		}
		
		var result={
			Z:Z,
			level:level
			
		}	
		
		return result;
		
	}
	
	function hasParentPeg(n){
		
		var numInput = node.numberOfInputPorts(n);
		
		if(numInput > 0){
			
				var source = node.srcNode(n, (numInput-1));
				
				if(source != ""){
					return true;
				}

		}
		
		return false;
			

	}

	
	function getParentPeg(n){
		
		var numInput = node.numberOfInputPorts(n);
		
		var source = node.srcNode(n,numInput-1);
		
		return source;
		
	}
	
	function sortBy(arr,p) {
	  return arr.slice(0).sort(function(a,b) {
		  var ap = parseFloat(a[p]);
		  var bp = parseFloat(b[p]);
		return (ap > bp) ? 1 : (ap < bp) ? -1 : 0;
	  });
	}

	
	;

	
}

/**
 * Created by ghassaei on 9/16/16.
 */

var nodeMaterial = new THREE.MeshBasicMaterial({color: 0xec008b});
var nodeMaterialHighlight = new THREE.MeshBasicMaterial({color: 0xffd8ef, side:THREE.DoubleSide});
var nodeGeo = new THREE.SphereGeometry(1,20);

function Node(position, index){

    this.type = "node";
    this.index = index;

    this.object3D = new THREE.Mesh(nodeGeo, nodeMaterial);
    this.object3D._myNode = this;

    this.render(position);
}

Node.prototype.getIndex = function(){//in nodes array
    return this.index;
};

Node.prototype.highlight = function(){
    this.object3D.material = nodeMaterialHighlight;
};

Node.prototype.unhighlight = function(){
    this.object3D.material = nodeMaterial;
};

Node.prototype.hide = function(){
    this.object3D.visible = false;
};

Node.prototype.show = function(){
    this.object3D.visible = true;
};

Node.prototype.render = function(position){
    this.object3D.position.set(position.x, position.y, position.z);
};


//deallocate

Node.prototype.destroy = function(){
    //object3D is removed in outer scope
    this.object3D._myNode = null;
    this.object3D = null;
};
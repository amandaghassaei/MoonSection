/**
 * Created by amandaghassaei on 4/9/17.
 */

var isCropping = false;

var regionResolution = 10;

var regionGeo = new THREE.Geometry();
for (var i=0;i<regionResolution;i++){
    for (var j=0;j<regionResolution;j++) {
        regionGeo.vertices.push(new THREE.Vector3());
        if (i>0 && j>0){
            var index = i*regionResolution+j;
            regionGeo.faces.push(new THREE.Face3(index-1, index, index-regionResolution));
            regionGeo.faces.push(new THREE.Face3(index-1, index-regionResolution, index-regionResolution-1));
        }
    }
}
regionGeo.dynamic = true;
var region = new THREE.Mesh(regionGeo, new THREE.MeshLambertMaterial({color:0xffffff, shading:THREE.FlatShading}));
region.visible = false;

var $holdon, $completion;

function initRegion(){
    threeView.scene.add(region);
    $holdon = $("#holdon");
    $completion = $("#percentCompletion");
}

function cropRegion(){

    $holdon.on('shown.bs.modal', function (e) {
        isCropping = true;

        $(".cropView").hide();
        $(".exportView").show();

        moon.visible = false;
        cropLine.visible = false;
        axis.visible = false;
        cropCenter.hide();
        threeView.render();

        makeGeo();
        $holdon.modal("hide");
    });
    $holdon.modal("show");
}

function back(){

    isCropping = false;

    $(".cropView").show();
    $(".exportView").hide();

    region.visible = false;
    moon.visible = true;
    cropLine.visible = true;
    axis.visible = true;
    threeView.render();
}

function makeGeo(){
    var rad = radius + scale*127;
    var centerPosition = new THREE.Vector3(rad*Math.sin(cropPosition.y)*Math.cos(cropPosition.x),
        rad*Math.sin(cropPosition.y)*Math.sin(cropPosition.x),
        rad*Math.cos(cropPosition.y));

    centerPosition.normalize();

    var basis1 = new THREE.Vector3(1, 0, 0);
    var basis2 = new THREE.Vector3(0, 1, 0);
    var quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), centerPosition);
    var quaternion2 = new THREE.Quaternion().setFromAxisAngle(centerPosition, cropRotation+cropPosition.x);
    basis1.applyQuaternion(quaternion);
    basis1.applyQuaternion(quaternion2);
    basis2.applyQuaternion(quaternion);
    basis2.applyQuaternion(quaternion2);

    var dir = centerPosition.clone().multiplyScalar(-1);

    centerPosition.multiplyScalar(rad);

    basis1.multiplyScalar(cropSize);
    basis2.multiplyScalar(cropSize);

    var topLeft = centerPosition.clone().sub(basis1).sub(basis2);
    var topRight = centerPosition.clone().sub(basis1).add(basis2);
    var bottomRight = centerPosition.clone().add(basis1).add(basis2);
    var bottomLeft = centerPosition.clone().add(basis1).sub(basis2);


    for (var i = 0; i < regionResolution; i++) {
        var u = i / (regionResolution-1);

        var left = interpolate(topLeft, bottomLeft, u);
        var right = interpolate(topRight, bottomRight, u);

        for (var j = 0; j < regionResolution; j++) {
            var v = j / (regionResolution-1);

            $completion.html(parseInt((i*regionResolution+j)/regionResolution/regionResolution*100)+"%");

            var vertex = raycastOnSurface(interpolate(left, right, v), dir);
            regionGeo.vertices[i*regionResolution+j].set(vertex.x, vertex.y, vertex.z);
        }
    }
    regionGeo.center();
    regionGeo.computeFaceNormals();
    regionGeo.computeBoundingSphere();
    regionGeo.verticesNeedUpdate = true;

    region.visible = true;

    threeView.render();
}

function raycastOnSurface(vertex, dir){
    projRaycaster.set(vertex, dir);
    var intersection = projRaycaster.intersectObject(moon, false);
    if (intersection.length == 0) {
        console.warn("no intersection");
        return new THREE.Vector3();
    }
    return intersection[0].point;
}
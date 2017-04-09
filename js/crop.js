/**
 * Created by amandaghassaei on 4/9/17.
 */

var isCropping = false;

var regionResolution = 10;
var fineResolution = 30;
var resolution = regionResolution*fineResolution + 1;
var allAngles = [];
var regionGeo = new THREE.Geometry();
//surface vertices
for (var i=0;i<resolution;i++){
    allAngles.push([]);
    for (var j=0;j<resolution;j++) {
        allAngles[i][j] = null;
        regionGeo.vertices.push(new THREE.Vector3());
        if (i>0 && j>0){
            var index = i*resolution+j;
            regionGeo.faces.push(new THREE.Face3(index-1, index, index-resolution));
            regionGeo.faces.push(new THREE.Face3(index-1, index-resolution, index-resolution-1));
        }
    }
}
//edge vertices

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

    for (var i = 0; i < resolution; i+= fineResolution) {
        var u = i / (resolution-1);

        var left = interpolate(topLeft, bottomLeft, u);
        var right = interpolate(topRight, bottomRight, u);

        for (var j = 0; j < resolution; j+= fineResolution) {
            var v = j / (resolution-1);

            // $completion.html(parseInt((i*regionResolution+j)/regionResolution/regionResolution*100)+"%");

            var vertex = raycastOnSurface(interpolate(left, right, v), dir);
            var angles = getAngularCoordinates(vertex);
            allAngles[i][j] = angles;

            vertex = makeVertexWithVal(getInterpolatedPxValue(angles), angles);

            regionGeo.vertices[i*resolution+j].set(vertex.x, vertex.y, vertex.z);
        }
    }

    for (var i = fineResolution; i < resolution; i += fineResolution) {
        for (var j = fineResolution; j < resolution; j += fineResolution) {

            var ne = regionGeo.vertices[(i-fineResolution)*resolution+j];
            var se = regionGeo.vertices[i*resolution+j];
            var sw = regionGeo.vertices[i*resolution+j-fineResolution];
            var nw = regionGeo.vertices[(i-fineResolution)*resolution+j-fineResolution];

            for (var a = 0; a < fineResolution; a++) {
                var u = a / fineResolution;

                var left = interpolate(nw, sw, u);
                var right = interpolate(ne, se, u);

                for (var b = 0; b < fineResolution; b++) {
                    var v = b / fineResolution;

                    var indexI = i-fineResolution+a;
                    var indexJ = j-fineResolution+b;
                    var vertex = interpolate(left, right, v);
                    var angles = getAngularCoordinates(vertex);
                    allAngles[indexI][indexJ] = angles;
                    vertex = makeVertexWithVal(getInterpolatedPxValue(angles), angles);

                    regionGeo.vertices[indexI*resolution+indexJ].set(vertex.x, vertex.y, vertex.z);
                }
            }

            if (i==resolution-1) {
                for (var b = 0; b < fineResolution; b++) {
                    var v = b / fineResolution;
                    var indexJ = j-fineResolution+b;
                    var vertex = interpolate(sw, se, v);
                    var angles = getAngularCoordinates(vertex);
                    allAngles[i][indexJ] = angles;
                    vertex = makeVertexWithVal(getInterpolatedPxValue(angles), angles);
                    regionGeo.vertices[i * resolution + indexJ].set(vertex.x, vertex.y, vertex.z);
                }
            }
            if (j==resolution-1){
                for (var a = 0; a < fineResolution; a++) {
                    var v = a / fineResolution;
                    var indexI = i-fineResolution+a;
                    var vertex = interpolate(ne, se, v);
                    var angles = getAngularCoordinates(vertex);
                    allAngles[indexI][j] = angles;
                    vertex = makeVertexWithVal(getInterpolatedPxValue(angles), angles);
                    regionGeo.vertices[indexI*resolution + j].set(vertex.x, vertex.y, vertex.z);
                }
            }

        }
    }

    regionGeo.center();
    regionGeo.computeFaceNormals();
    regionGeo.computeBoundingSphere();
    regionGeo.verticesNeedUpdate = true;

    region.visible = true;

    // wireframe
    // var geo = new THREE.WireframeGeometry( regionGeo); // or WireframeGeometry
    // var mat = new THREE.LineBasicMaterial( {color: 0xff0000} );
    // var wireframe = new THREE.LineSegments( geo, mat );
    // region.add( wireframe );

    threeView.render();
}

function updateRegionSurface(){

    for (i=0;i<resolution;i++){
        for (j=0;j<resolution;j++){
            var angles = allAngles[i][j].clone();
            var vertex = makeVertexWithVal(getInterpolatedPxValue(angles), angles);
            regionGeo.vertices[i*resolution + j].set(vertex.x, vertex.y, vertex.z);
        }
    }

    regionGeo.center();
    regionGeo.computeFaceNormals();
    regionGeo.computeBoundingSphere();
    regionGeo.verticesNeedUpdate = true;
    threeView.render();
}

function makeVertexWithVal(val, angles){
    var rad = radius + scale*(val-val/2);
    var RsinPhi = rad*Math.sin(angles.y);
    var RcosPhi = rad*Math.cos(angles.y);
    return new THREE.Vector3(RsinPhi*Math.cos(angles.x), RsinPhi*Math.sin(angles.x), RcosPhi);
}

function getInterpolatedPxValue(angles){
    var index = new THREE.Vector2(imgWidth*(angles.x/Math.PI/2), imgHeight*(angles.y/Math.PI));
    var neIndex = index.clone().ceil();
    var swindex = index.clone().floor();
    var ne = imgdata[4*(neIndex.y*imgWidth+neIndex.x)];
    var se = imgdata[4*(swindex.y*imgWidth+neIndex.x)];
    var sw = imgdata[4*(swindex.y*imgWidth+swindex.x)];
    var nw = imgdata[4*(neIndex.y*imgWidth+swindex.x)];

    var dist = index.sub(swindex);

    var n = (ne*dist.x+nw*(1-dist.x))/2;
    var s = (se*dist.x+sw*(1-dist.x))/2;

    return (n*dist.y+s*(1-dist.y))/2;
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
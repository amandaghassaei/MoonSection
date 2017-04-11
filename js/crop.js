/**
 * Created by amandaghassaei on 4/9/17.
 */

var isCropping = false;

var baseThickness = 1;

var moonMaterial = new THREE.MeshLambertMaterial({color:0xffffff, shading:THREE.FlatShading});
var normalMaterial = new THREE.MeshNormalMaterial();

var cornerPositions = [null, null, null, null];

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
for (var i=0;i<resolution;i++){
    var index = regionGeo.vertices.length;
    regionGeo.vertices.push(new THREE.Vector3());
    if (i>0) {
        regionGeo.faces.push(new THREE.Face3(index, index-1, i));
        regionGeo.faces.push(new THREE.Face3(index - 1, i-1, i));
    }
}
for (var i=0;i<resolution;i++){
    var index = regionGeo.vertices.length;
    regionGeo.vertices.push(new THREE.Vector3());
    if (i>0) {
        var _i = resolution*(resolution-1)+i;
        regionGeo.faces.push(new THREE.Face3(index-1, index, _i));
        regionGeo.faces.push(new THREE.Face3(index - 1, _i, _i-1));
    }
}
for (var i=0;i<resolution;i++){
    var index = regionGeo.vertices.length;
    regionGeo.vertices.push(new THREE.Vector3());
    if (i>0) {
        var _i = i*resolution;
        regionGeo.faces.push(new THREE.Face3(index-1, index, _i));
        regionGeo.faces.push(new THREE.Face3(index - 1, _i, _i-resolution));
    }
}
for (var i=0;i<resolution;i++){
    var index = regionGeo.vertices.length;
    regionGeo.vertices.push(new THREE.Vector3());
    if (i>0) {
        var _i = (i+1)*resolution-1;
        regionGeo.faces.push(new THREE.Face3(index, index-1, _i));
        regionGeo.faces.push(new THREE.Face3(index - 1, _i-resolution, _i));
    }
}
for (var i=0;i<5;i++) {
    regionGeo.vertices.push(new THREE.Vector3());
}
for (var i=1;i<resolution;i++){
    regionGeo.faces.push(new THREE.Face3(resolution*resolution+i-1, resolution*resolution+i, regionGeo.vertices.length-1));
}
for (var i=1;i<resolution;i++){
    regionGeo.faces.push(new THREE.Face3(resolution*(resolution+1)+i, resolution*(resolution+1)+i-1, regionGeo.vertices.length-1));
}
for (var i=1;i<resolution;i++){
    regionGeo.faces.push(new THREE.Face3(resolution*(resolution+2)+i, resolution*(resolution+2)+i-1, regionGeo.vertices.length-1));
}
for (var i=1;i<resolution;i++){
    regionGeo.faces.push(new THREE.Face3(resolution*(resolution+3)+i-1, resolution*(resolution+3)+i, regionGeo.vertices.length-1));
}


regionGeo.dynamic = true;
var region = new THREE.Mesh(regionGeo, moonMaterial);
region.visible = false;

var $holdon, $completion;

function initRegion(){
    threeView.scene.add(region);
    threeView.sceneDepth.add(region.clone());
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

        directionalLight2.intensity = 0.3;

        makeGeo();
        threeView.render();
        $holdon.modal("hide");
    });
    $holdon.modal("show");
}

function back(){

    isCropping = false;

    $(".cropView").show();
    $(".exportView").hide();

    directionalLight2.intensity = 0.0;

    region.visible = false;
    moon.visible = true;
    cropLine.visible = true;
    axis.visible = true;
    threeView.render();

    updateGeo(false);
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

    vertex = intersectionWithSphere(topLeft, dir);
    regionGeo.vertices[regionGeo.vertices.length-4].set(vertex.x, vertex.y, vertex.z);
    cornerPositions[0] = regionGeo.vertices[regionGeo.vertices.length-4];
    vertex = intersectionWithSphere(topRight, dir);
    regionGeo.vertices[regionGeo.vertices.length-3].set(vertex.x, vertex.y, vertex.z);
    cornerPositions[1] = regionGeo.vertices[regionGeo.vertices.length-3];
    vertex = intersectionWithSphere(bottomRight, dir);
    regionGeo.vertices[regionGeo.vertices.length-2].set(vertex.x, vertex.y, vertex.z);
    cornerPositions[2] = regionGeo.vertices[regionGeo.vertices.length-2];
    vertex = intersectionWithSphere(bottomLeft, dir);
    regionGeo.vertices[regionGeo.vertices.length-1].set(vertex.x, vertex.y, vertex.z);
    cornerPositions[3] = regionGeo.vertices[regionGeo.vertices.length-1];

    regionGeo.center();
    regionGeo.computeFaceNormals();
    regionGeo.computeBoundingSphere();
    regionGeo.verticesNeedUpdate = true;

    region.visible = true;

    updateRegionBase();

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

    updateRegionBase();
}

function updateRegionBase(){
    var centerPosition = new THREE.Vector3(Math.sin(cropPosition.y)*Math.cos(cropPosition.x),
        Math.sin(cropPosition.y)*Math.sin(cropPosition.x),
        Math.cos(cropPosition.y));
    var dir = centerPosition.clone().normalize().multiplyScalar(-baseThickness*100);

    //todo get base min

    console.log(cornerPositions[0]);

    var min = dir.clone().add(cornerPositions[0]);
    var max = dir.clone().add(cornerPositions[1]);
    for (var i=0;i<resolution;i++){
        var t = i/(resolution-1);
        var vertex = interpolate(min, max, t);
        regionGeo.vertices[resolution*resolution+i].set(vertex.x, vertex.y, vertex.z);
    }
    min = dir.clone().add(cornerPositions[3]);
    max = dir.clone().add(cornerPositions[2]);
    for (var i=0;i<resolution;i++){
        var t = i/(resolution-1);
        var vertex = interpolate(min, max, t);
        regionGeo.vertices[resolution*(resolution+1)+i].set(vertex.x, vertex.y, vertex.z);
    }
    min = dir.clone().add(cornerPositions[0]);
    max = dir.clone().add(cornerPositions[3]);
    for (var i=0;i<resolution;i++){
        var t = i/(resolution-1);
        var vertex = interpolate(min, max, t);
        regionGeo.vertices[resolution*(resolution+2)+i].set(vertex.x, vertex.y, vertex.z);
    }
    min = dir.clone().add(cornerPositions[1]);
    max = dir.clone().add(cornerPositions[2]);
    for (var i=0;i<resolution;i++){
        var t = i/(resolution-1);
        var vertex = interpolate(min, max, t);
        regionGeo.vertices[resolution*(resolution+3)+i].set(vertex.x, vertex.y, vertex.z);
    }

    var vertex = interpolate(dir.clone().add(regionGeo.vertices[0]), max, 0.5);
    regionGeo.vertices[regionGeo.vertices.length-5].set(vertex.x, vertex.y, vertex.z);


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
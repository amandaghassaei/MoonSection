/**
 * Created by ghassaei on 2/22/17.
 */

var loaded = false;

var defaultRadius = 1737;
var defaultScale = 19.91/255;
var radius = defaultRadius;
var scale = defaultScale;

var cropPosition = new THREE.Vector3(0, Math.PI/2);//theta, phi
var cropRotation = 0;
var cropSize = 700;

var imgWidth = 1000;
var imgHeight = 500;

var imgdata, threeView, moon;

var geometry = new THREE.Geometry();
geometry.dynamic = true;

var cropCenter = new Node(new THREE.Vector3());
var squareGeo = new THREE.Geometry();
for (var i=0;i<10;i++){
    for (var j=0;j<4;j++){
        squareGeo.vertices.push(new THREE.Vector3());
    }
}
var cropLine = new THREE.Line(squareGeo, new THREE.LineBasicMaterial({color:0xec008b}));

var axis = new THREE.Line(new THREE.Geometry(), new THREE.LineBasicMaterial({color:0xaaaaaa}));
axis.geometry.vertices.push(new THREE.Vector3(0,0,1));
axis.geometry.vertices.push(new THREE.Vector3(0,0,-1));

var useNormalMaterial = false;

var ssao = false;

var projRaycaster = new THREE.Raycaster();

function changeMaterial(){
    if (useNormalMaterial){
        moon.material = normalMaterial;
        region.material = normalMaterial;
    } else {
        moon.material = moonMaterial;
        region.material = moonMaterial;
    }
    threeView.render();
}

function updateCrop(projection){
    var rad = radius + defaultScale*127;
    cropCenter.object3D.scale.set(radius/50, radius/50, radius/50);
    var centerPosition = new THREE.Vector3(rad*Math.sin(cropPosition.y)*Math.cos(cropPosition.x),
        rad*Math.sin(cropPosition.y)*Math.sin(cropPosition.x),
        rad*Math.cos(cropPosition.y));
    cropCenter.render(centerPosition.clone());

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


    // if (projection) {
    var offset = dir.clone().multiplyScalar(-defaultScale*200);
        for (var i = 0; i < 10; i++) {
            var t = i / 9;
            var vertex = intersectionWithSphere(interpolate(topLeft, topRight, t), dir).add(offset);
            squareGeo.vertices[i].set(vertex.x, vertex.y, vertex.z);
            vertex = intersectionWithSphere(interpolate(topRight, bottomRight, t), dir).add(offset);
            squareGeo.vertices[10 + i].set(vertex.x, vertex.y, vertex.z);
            vertex = intersectionWithSphere(interpolate(bottomRight, bottomLeft, t), dir).add(offset);
            squareGeo.vertices[20 + i].set(vertex.x, vertex.y, vertex.z);
            vertex = intersectionWithSphere(interpolate(bottomLeft, topLeft, t), dir).add(offset);
            squareGeo.vertices[30 + i].set(vertex.x, vertex.y, vertex.z);
        }
    // } else {
    //     for (var i = 0; i < 10; i++) {
    //         var t = i / 9;
    //         var vertex = interpolate(topLeft, topRight, t);
    //         squareGeo.vertices[i].set(vertex.x, vertex.y, vertex.z);
    //         vertex = interpolate(topRight, bottomRight, t);
    //         squareGeo.vertices[10 + i].set(vertex.x, vertex.y, vertex.z);
    //         vertex = interpolate(bottomRight, bottomLeft, t);
    //         squareGeo.vertices[20 + i].set(vertex.x, vertex.y, vertex.z);
    //         vertex = interpolate(bottomLeft, topLeft, t);
    //         squareGeo.vertices[30 + i].set(vertex.x, vertex.y, vertex.z);
    //     }
    // }

    squareGeo.computeBoundingSphere();
    squareGeo.verticesNeedUpdate = true;

    threeView.render();
}

function intersectionWithSphere(vertex, dir){
    var a = dir.clone().dot(dir);
    var b = (vertex.clone().dot(dir))*2;
    var c = vertex.clone().dot(vertex) - radius*radius;

    var root = b*b-4*a*c;

    if (root<=0){
        console.warn("bad intersection");
    }

    var t = (-b-Math.sqrt(root))/(2*a);
    return vertex.clone().add(dir.clone().multiplyScalar(t));
}

function interpolate(from, to, t){
    return to.clone().multiplyScalar(t).add(from.clone().multiplyScalar(1 - t));
}

function raycastToSurface(vertex, dir){
    projRaycaster.set(vertex, dir);
    var intersection = projRaycaster.intersectObject(moon, false);
    if (intersection.length == 0) {
        console.warn("no intersection");
        return new THREE.Vector3();
    }
    return intersection[0].point.sub(dir.clone().multiplyScalar(defaultScale*255));
}

function getAngularCoordinates(vertex){
    vertex.normalize();
    var phi = Math.acos(vertex.z);
    var theta = Math.atan2(vertex.y, vertex.x);
    return new THREE.Vector2(theta, phi);
}

function projectToSurface(vertex){
    var angles = getAngularCoordinates(vertex);
    var rad = radius + defaultScale*255;
    var RsinPhi = rad*Math.sin(angles.y);
    var RcosPhi = rad*Math.cos(angles.y);
    vertex.set(RsinPhi*Math.cos(angles.x), RsinPhi* Math.sin(angles.x), RcosPhi);
    return vertex;
}

function updateGeo(makeFaces){
    axis.scale.set(1,1,radius*1.5);
     for (var i=0;i<imgWidth;i++){
        var theta = 2*Math.PI*i/imgWidth;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        for (var j=0;j<imgHeight;j++){
            var index = i*imgHeight + j;
            var pxVal = imgdata[4*(j*imgWidth + i)];
            var rad = radius + defaultScale*(pxVal-pxVal/2);
            var phi = Math.PI*j/(imgHeight-1);
            var RsinPhi = rad*Math.sin(phi);
            var RcosPhi = rad*Math.cos(phi);
            if (makeFaces) geometry.vertices.push(new THREE.Vector3(RsinPhi*cosTheta, RsinPhi*sinTheta, RcosPhi));
            else geometry.vertices[index].set(RsinPhi*cosTheta, RsinPhi*sinTheta, RcosPhi);

            if (makeFaces) {
                if (j > 0 && i > 0) {
                    geometry.faces.push(new THREE.Face3(index, index - 1, index - imgHeight));
                    geometry.faces.push(new THREE.Face3(index - imgHeight, index - 1, index - imgHeight - 1));
                } else if (j>0){
                    geometry.faces.push(new THREE.Face3(index, index - 1, index + (imgWidth-1)*imgHeight));
                    geometry.faces.push(new THREE.Face3(index + (imgWidth-1)*imgHeight, index - 1, index + (imgWidth-1)*imgHeight - 1));
                }
            }
        }
    }
    geometry.verticesNeedUpdate = true;
    geometry.computeFaceNormals();
    geometry.computeBoundingSphere();
    updateCrop(true);
}

$(function() {

    var $loadingModal = $("#loadingModal");

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var isDragging = false;
    var mouseDown = false;
    var highlightedObj;

    $loadingModal.on('shown.bs.modal', function (e) {

        var uiControls = initControls();

        threeView = initThreeView();

        var $imgLoader = $("#imgLoader");
        $imgLoader.innerWidth = imgWidth;
        $imgLoader.innerHeight = imgHeight;
        $imgLoader.clientWidth = imgWidth;
        $imgLoader.clientHeight = imgHeight;

        var img = document.getElementById("heightmapSmall");
        var context = document.getElementById('imgLoader').getContext('2d');
        context.canvas.width = imgWidth; context.canvas.height = imgHeight;
        context.drawImage(img, 0, 0, imgWidth, imgHeight);
        imgdata = context.getImageData(0, 0, imgWidth, imgHeight).data;

        moon = new THREE.Mesh(geometry, moonMaterial);
        threeView.scene.add(moon);
        threeView.sceneDepth.add(moon.clone());

        threeView.scene.add(cropCenter.object3D);
        threeView.scene.add(cropLine);

        threeView.scene.add(axis);

        initRegion();

        updateGeo(true);
        $loadingModal.modal("hide");
        $("#controls").fadeIn();
        $("#controlsLeft").fadeIn();

        window.addEventListener('resize', function(){
            threeView.onWindowResize();
        }, false);

        document.addEventListener( 'mousedown', mousedown, false );
        document.addEventListener( 'mouseup', mouseUp, false );
        document.addEventListener( 'mousemove', mouseMove, false );

    });
    $loadingModal.modal("show");

    function mousedown(){
        if (isCropping) return;
        if (highlightedObj){
            threeView.enableControls(false);
        }
        mouseDown = true;
    }
    function mouseUp(){
        if (isCropping) return;
        if (highlightedObj) {
            updateCrop(true);
        }
        isDragging = false;
        threeView.enableControls(true);
        axis.visible = false;
        mouseDown = false;
        threeView.render();
    }
    function mouseMove(e){

        if (isCropping) return;

        if (mouseDown) {
            isDragging = true;
        }

        var shouldRender = axis.visible != isDragging && !highlightedObj;
        axis.visible = isDragging && !highlightedObj;

        e.preventDefault();
        mouse.x = (e.clientX/window.innerWidth)*2-1;
        mouse.y = - (e.clientY/window.innerHeight)*2+1;
        raycaster.setFromCamera(mouse, threeView.camera);

        var intersection = raycaster.intersectObject(moon);
        if (intersection.length == 0){
            if (cropCenter.object3D.visible){
                cropCenter.hide();
                threeView.render();
            }
        } else if (intersection[0].point.clone().sub(cropCenter.object3D.position).lengthSq()>100000){
            if (cropCenter.object3D.visible){
                cropCenter.hide();
                threeView.render();
            }
        } else {
            if (!cropCenter.object3D.visible) {
                cropCenter.show();
                threeView.render();
            }
        }

        var _highlightedObj = null;
        if (!isDragging) {
            _highlightedObj = checkForIntersections(e, cropCenter.object3D);
            setHighlightedObj(_highlightedObj);
        } else if (isDragging && highlightedObj){
            if (intersection.length>0){
                var position = intersection[0].point;
                cropCenter.render(position.clone());
                position.normalize();
                var phi = Math.acos(position.z);
                var theta = Math.atan2(position.y, position.x);
                cropPosition.x = theta;
                cropPosition.y = phi;
                $("#theta").val(theta.toFixed(2));
                $("#phi").val(phi.toFixed(2));
                updateCrop(false);
                threeView.render();
            }
        }
        if(shouldRender) threeView.render();
    }
    function setHighlightedObj(object){
        if (highlightedObj && (object != highlightedObj)) {
            highlightedObj.unhighlight();
            // globals.controls.hideMoreInfo();
        }
        var shouldRender = highlightedObj != object;
        highlightedObj = object;
        if (highlightedObj) highlightedObj.highlight();
        if (shouldRender) threeView.render();
    }

    function checkForIntersections(e, object){
        var _highlightedObj = null;
        var intersections = raycaster.intersectObject(object);
        if (intersections.length > 0) {
            var objectFound = false;
            _.each(intersections, function (thing) {
                if (objectFound) return;
                if (thing.object && thing.object._myNode){
                    _highlightedObj = thing.object._myNode;
                    _highlightedObj.highlight();
                    objectFound = true;
                }
            });
        }
        return _highlightedObj;
    }
});
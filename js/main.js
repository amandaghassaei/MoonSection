/**
 * Created by ghassaei on 2/22/17.
 */


var defaultRadius = 1737;
var defaultScale = 19.91/255;
var radius = defaultRadius;
var scale = defaultScale;

var cropPosition = new THREE.Vector3(0, Math.PI/2);//theta, phi
var cropRotation = 0;
var cropSize = 10;

var imgWidth = 1000;
var imgHeight = 500;

var imgdata, threeView;

var geometry = new THREE.Geometry();
geometry.dynamic = true;

var cropCenter = new Node(new THREE.Vector3());

function updateCrop(){
    cropCenter.render(new THREE.Vector3(radius*Math.sin(cropPosition.y)*Math.cos(cropPosition.x),
        radius*Math.sin(cropPosition.y)*Math.sin(cropPosition.x),
        radius*Math.cos(cropPosition.y))
    );
    threeView.render();
}

function updateGeo(makeFaces){
     for (var i=0;i<imgWidth;i++){
        var theta = 2*Math.PI*i/imgWidth;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        for (var j=0;j<imgHeight;j++){
            var index = i*imgHeight + j;
            var pxVal = imgdata[4*(j*imgWidth + i)];
            var rad = radius + scale*(pxVal-pxVal/2);
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
    updateCrop();
}

$(function() {

    window.addEventListener('resize', function(){
        threeView.onWindowResize();
    }, false);

    var uiControls = initControls();

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var isDragging = false;
    var draggingNode = null;
    var mouseDown = false;
    var highlightedObj;

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

    var moon = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color:0xffffff, shading:THREE.FlatShading}));
    threeView.scene.add(moon);

    threeView.scene.add(cropCenter.object3D);

    updateGeo(true);

    // var topPole = new THREE.Vector3(0,0,radius);
    // var bottomPole = new THREE.Vector3(0,0,-radius);
    // geometry.vertices.push(topPole);
    // geometry.vertices.push(bottomPole);
    // for (var i=1;i<imgWidth;i++) {
    //     var index = i*imgHeight+3;
    //     geometry.faces.push(new THREE.Face3(index, 0, index-imgHeight));
    //     var index = i*imgHeight+1+imgHeight;
    //     geometry.faces.push(new THREE.Face3(index, index-imgHeight, 1));
    // }

    $(document).dblclick(function() {
    });

    document.addEventListener('mousedown', function(){
        if (highlightedObj){
            threeView.enableControls(false);
        }
        mouseDown = true;
    }, false);
    document.addEventListener('mouseup', function(e){
        isDragging = false;
        threeView.enableControls(true);
        mouseDown = false;
    }, false);
    document.addEventListener( 'mousemove', mouseMove, false );
    function mouseMove(e){

        if (mouseDown) {
            isDragging = true;
        }

        e.preventDefault();
        mouse.x = (e.clientX/window.innerWidth)*2-1;
        mouse.y = - (e.clientY/window.innerHeight)*2+1;
        raycaster.setFromCamera(mouse, threeView.camera);

        var _highlightedObj = null;
        if (!isDragging) {
            _highlightedObj = checkForIntersections(e, cropCenter.object3D);
            setHighlightedObj(_highlightedObj);
        }  else if (isDragging && highlightedObj){
            var intersection = raycaster.intersectObject(moon);
            if (intersection.length>0){
                var position = intersection[0].point;
                cropCenter.render(position.clone());
                position.normalize();
                var phi = Math.acos(position.z);
                var theta = Math.atan2(position.y, position.x);
                cropPosition.x = theta;
                cropPosition.y = phi;
                updateCrop();
                $("#theta").val(theta.toFixed(2));
                $("#phi").val(phi.toFixed(2));
            }
        }
    }
    function setHighlightedObj(object){
        if (highlightedObj && (object != highlightedObj)) {
            highlightedObj.unhighlight();
            // globals.controls.hideMoreInfo();
        }
        highlightedObj = object;
        if (highlightedObj) highlightedObj.highlight();
        threeView.render();
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
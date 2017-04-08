/**
 * Created by ghassaei on 2/22/17.
 */

globals = {};

$(function() {

    window.addEventListener('resize', function(){
        threeView.onWindowResize();
    }, false);

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var isDragging = false;
    var draggingNode = null;
    var mouseDown = false;
    var highlightedObj;


    var radius = 100;
    var scale = 3;

    var threeView = initThreeView();

    var imgWidth = 1000;
    var imgHeight = 500;
    var $imgLoader = $("#imgLoader");
    $imgLoader.innerWidth = imgWidth;
    $imgLoader.innerHeight = imgHeight;
    $imgLoader.clientWidth = imgWidth;
    $imgLoader.clientHeight = imgHeight;

    var img = document.getElementById("heightmapSmall");
    var context = document.getElementById('imgLoader').getContext('2d');
    context.canvas.width = imgWidth; context.canvas.height = imgHeight;
    context.drawImage(img, 0, 0, imgWidth, imgHeight);
    var imgdata = context.getImageData(0, 0, imgWidth, imgHeight).data;

    var geometry = new THREE.Geometry();
    geometry.dynamic = true;

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

    for (var i=0;i<imgWidth;i++){
        var theta = 2*Math.PI*i/(imgWidth-1);
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        for (var j=0;j<imgHeight;j++){
            var index = i*imgHeight + j;
            var rad = radius + scale*imgdata[4*(j*imgWidth + i)]/255;
            var phi = Math.PI*j/(imgHeight-1);
            var RsinPhi = rad*Math.sin(phi);
            var RcosPhi = rad*Math.cos(phi);
            geometry.vertices.push(new THREE.Vector3(RsinPhi*cosTheta, RsinPhi*sinTheta, RcosPhi));

            if (j>0 && i>0){
                geometry.faces.push(new THREE.Face3(index, index-1, index-imgHeight));
                geometry.faces.push(new THREE.Face3(index-imgHeight, index-1, index-imgHeight-1));
            }
        }
    }
    geometry.computeFaceNormals();
    geometry.computeBoundingSphere();
    var moon = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color:0xff00ff, shading:THREE.FlatShading}));
    threeView.scene.add(moon);
    threeView.render();

    // threeView.scene.add(new THREE.Mesh(new THREE.SphereGeometry(10), new THREE.MeshBasicMaterial()));




    $(document).dblclick(function() {
    });

    document.addEventListener('mousedown', function(){
        mouseDown = true;
    }, false);
    document.addEventListener('mouseup', function(e){
        isDragging = false;
        if (draggingNode){
            draggingNode = null;
            setHighlightedObj(null);
        }
        mouseDown = false;
    }, false);
    // document.addEventListener( 'mousemove', mouseMove, false );
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
            var objsToIntersect = [];
            objsToIntersect = objsToIntersect.concat(globals.model.getObjectsToIntersect());
            _highlightedObj = checkForIntersections(e, objsToIntersect);
            setHighlightedObj(_highlightedObj);
        }  else if (isDragging && highlightedObj){
            if (!draggingNode) {
                draggingNode = highlightedObj;
                threeView.enableControls(false);
            }
            threeView.render();
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

    function checkForIntersections(e, objects){
        var _highlightedObj = null;
        var intersections = raycaster.intersectObjects(objects, true);
        if (intersections.length > 0) {
            var objectFound = false;
            _.each(intersections, function (thing) {
                if (objectFound) return;
                if (thing.object && thing.object._myNode){
                    _highlightedObj = thing.object._myNode;
                    if (!_highlightedObj.fixed) return;
                    _highlightedObj.highlight();
                    objectFound = true;
                }
            });
        }
        return _highlightedObj;
    }
});
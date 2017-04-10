/**
 * Created by ghassaei on 9/16/16.
 */

var directionalLight1, directionalLight2, ambientLight;

function initThreeView() {

    var scene = new THREE.Scene();
    var sceneDepth = new THREE.Scene();

    var camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000);//-40, 40);
    // var VIEW_ANGLE = 45, ASPECT = window.innerWidth / window.innerHeight, NEAR = -10000, FAR = 10000;
    // var camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    var controls;

    var depthMaterial, effectComposer, depthRenderTarget;
    var ssaoPass;

    var animationRunning = false;
    var pauseFlag = false;


    init();

    function init() {

        var container = $("#threeContainer");
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.append(renderer.domElement);

        scene.background = new THREE.Color(0x000011);
        sceneDepth.background = new THREE.Color(0x000011);
        directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight1.position.set(-10000, 10000, 10000);
        camera.add(directionalLight1);
        directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.0);
        directionalLight2.position.set(10000, -10000, -10000);
        camera.add(directionalLight2);
        ambientLight = new THREE.AmbientLight(0x000044, 0.25);
        scene.add(ambientLight);

        scene.add(camera);

        camera.zoom = 0.14;
        camera.position.x = 4000;
        camera.position.y = 0;
        camera.position.z = 0;
        camera.lookAt(new THREE.Vector3(0,0,0));
        camera.updateProjectionMatrix();

        camera.up.set( 0, 0, 1 );

        controls = new THREE.OrthographicTrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;

        controls.noZoom = false;
        controls.noPan = true;

        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.addEventListener('change', render);

        var renderPass = new THREE.RenderPass( scene, camera );

        // Setup depth pass
        depthMaterial = new THREE.MeshDepthMaterial();
        depthMaterial.depthPacking = THREE.RGBADepthPacking;
        depthMaterial.blending = THREE.NoBlending;

        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        depthRenderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );

        // Setup SSAO pass
        ssaoPass = new THREE.ShaderPass( THREE.SSAOShader );
        ssaoPass.renderToScreen = true;
        //ssaoPass.uniforms[ "tDiffuse" ].value will be set by ShaderPass
        ssaoPass.uniforms[ "tDepth" ].value = depthRenderTarget.texture;
        ssaoPass.uniforms[ 'size' ].value.set( window.innerWidth, window.innerHeight );
        ssaoPass.uniforms[ 'cameraNear' ].value = camera.near;
        ssaoPass.uniforms[ 'cameraFar' ].value = camera.far;
        ssaoPass.uniforms[ 'onlyAO' ].value = ssao? 1:0;
        ssaoPass.uniforms[ 'aoClamp' ].value = 0.3;
        ssaoPass.uniforms[ 'lumInfluence' ].value = 0.5;
        // Add pass to effect composer
        effectComposer = new THREE.EffectComposer( renderer );
        effectComposer.addPass( renderPass );
        effectComposer.addPass( ssaoPass );

        render();
    }

    function render() {
        if (!animationRunning) {
            _render();
        }
    }

    function startAnimation(callback){
        console.log("starting animation");
        if (animationRunning){
            console.warn("animation already running");
            return;
        }
        animationRunning = true;
        _loop(function(){
                callback();
            _render();
        });

    }

    function pauseAnimation(){
        if (animationRunning) pauseFlag = true;
    }

    function _render(){

        if (ssao) {
            // Render depth into depthRenderTarget
            sceneDepth.overrideMaterial = depthMaterial;
            renderer.render(sceneDepth, camera, depthRenderTarget, true);
            // Render renderPass and SSAO shaderPass
            // sceneDepth.overrideMaterial = null;
            effectComposer.render();
        } else {
            renderer.render(scene, camera);
        }

    }

    function _loop(callback){
        callback();
        requestAnimationFrame(function(){
            if (pauseFlag) {
                pauseFlag = false;
                animationRunning = false;
                console.log("pausing animation");
                render();//for good measure
                return;
            }
            _loop(callback);
        });
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.left = -window.innerWidth / 2;
        camera.right = window.innerWidth / 2;
        camera.top = window.innerHeight / 2;
        camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        var width = window.innerWidth;
        var height = window.innerHeight;

        ssaoPass.uniforms[ 'size' ].value.set( width, height );
        var pixelRatio = renderer.getPixelRatio();
        var newWidth  = Math.floor( width / pixelRatio ) || 1;
        var newHeight = Math.floor( height / pixelRatio ) || 1;
        depthRenderTarget.setSize( newWidth, newHeight );
        effectComposer.setSize( newWidth, newHeight );

        render();
    }

    function enableControls(state){
        controls.enable(state);
    }

    return {
        render: render,
        onWindowResize: onWindowResize,
        startAnimation: startAnimation,
        pauseAnimation: pauseAnimation,
        enableControls: enableControls,
        scene: scene,
        sceneDepth: sceneDepth,
        camera: camera
    }
}
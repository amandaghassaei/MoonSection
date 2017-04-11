/**
 * Created by ghassaei on 10/7/16.
 */


function initControls(){

    setLink("#about", function(){
        $('#aboutModal').modal('show');
    });

    setSliderInputStop("#radius", radius, 100, 10000, 1, function(val){
        radius = val;
        updateGeo();
    });


    setSliderInput("#scale", scale*255, 0, 1000, 1, function(val){
        scale = val/255;
        if (isCropping) updateRegionSurface();
    });

    setLink("#reset", function(){
        if (isCropping) {
            scale = defaultScale;
            updateSliderInput("#scale", scale*255);
            updateRegionSurface();
        } else {
            radius = defaultRadius;
            updateSliderInput("#radius", radius);
            updateGeo();
        }
    });

    setInput("#theta", cropPosition.x, function(val){
        cropPosition.x = val;
        updateCrop();
    }, 0, Math.PI*2);
    setInput("#phi", cropPosition.y, function(val){
        cropPosition.y = val;
        updateCrop();
    }, -Math.PI/2, Math.PI/2);

    setSliderInput("#cropSize", cropSize, 100, 2000, 0.1, function(val){
        cropSize = val;
        updateCrop(false);
    });

    setSliderInputStop("#cropSize", cropSize, 100, 2000, 0.1, function(val){
        cropSize = val;
        updateCrop(true);
    });

    setSliderInput("#cropRotation", cropRotation, 0, Math.PI/2, 0.01, function(val){
        cropRotation = val;
        updateCrop(false);
    });

    setSliderInputStop("#cropRotation", cropRotation, 0, Math.PI/2, 0.01, function(val){
        cropRotation = val;
        updateCrop(true);
    });

    setRadio("materialType", "white", function(val){
        useNormalMaterial = val == "normal";
        changeMaterial();
    });

    setLink("#crop", function(){
        cropRegion();
    });

    setLink("#back", function(){
        back();
    });

    setCheckbox("#ssao", ssao, function(state){
        ssao = state;
        if (state) {
            directionalLight1.intensity = 0.9;
            ambientLight.intensity = 0.3;
        }
        else {
            directionalLight1.intensity = 0.7;
            ambientLight.intensity = 0.25;
        }
        threeView.render();
    });

    setSliderInput("#baseThickness", baseThickness, 0, 10, 0.1, function(val){
        baseThickness = val;
        updateRegionBase();
    });

    function setButtonGroup(id, callback){
        $(id+" a").click(function(e){
            e.preventDefault();
            var $target = $(e.target);
            var val = $target.data("id");
            if (val) {
                $(id+" span.dropdownLabel").html($target.html());
                callback(val);
            }
        });
    }

    function setLink(id, callback){
        $(id).click(function(e){
            e.preventDefault();
            callback(e);
        });
    }

    function setRadio(name, val, callback){
        $("input[name=" + name + "]").on('change', function() {
            var state = $("input[name="+name+"]:checked").val();
            callback(state);
        });
        $(".radio>input[value="+val+"]").prop("checked", true);
    }

    function setInput(id, val, callback, min, max){
        var $input = $(id);
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }
            if (min !== undefined && val < min) val = min;
            if (max !== undefined && val > max) val = max;
            $input.val(val.toFixed(2));
            callback(val);
        });
        $input.val(val.toFixed(2));
    }

    function setCheckbox(id, state, callback){
        var $input  = $(id);
        $input.on('change', function () {
            if ($input.is(":checked")) callback(true);
            else callback(false);
        });
        $input.prop('checked', state);
    }

    function setSlider(id, val, min, max, incr, callback, callbackOnStop){
        var slider = $(id).slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });
        slider.on("slide", function(e, ui){
            var val = ui.value;
            callback(val);
        });
        slider.on("slidestop", function(){
            var val = slider.slider('value');
            if (callbackOnStop) callbackOnStop(val);
        })
    }

    function setLogSliderInput(id, val, min, max, incr, callback){

        var scale = (Math.log(max)-Math.log(min)) / (max-min);

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: (Math.log(val)-Math.log(min)) / scale + min,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', (Math.log(val)-Math.log(min)) / scale + min);
            callback(val, id);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            val = Math.exp(Math.log(min) + scale*(val-min));
            $input.val(val.toFixed(2));
            callback(val, id);
        });
    }

    function updateSliderInput(id, val){
        var slider = $(id+">div").slider({
            value: val
        });
        var $input = $(id+">input");
        $input.val(val.toFixed(2));
    }

    function setSliderInputStop(id, val, min, max, incr, callback){

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', val);
            callback(val);
        });
        $input.val(val.toFixed(2));
        slider.on("slidestop", function(e, ui){
            var val = ui.value;
            $input.val(val);
            callback(val);
        });
    }

    function setSliderInput(id, val, min, max, incr, callback){

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', val);
            callback(val);
        });
        $input.val(val.toFixed(2));
        slider.on("slide", function(e, ui){
            var val = ui.value;
            $input.val(val);
            callback(val);
        });
    }
    return {
        updateSliderInput: updateSliderInput
    }
}


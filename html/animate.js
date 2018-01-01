var animateBase;	// URL of your caching server endpoint
var holderDiv;		// The div we render into
var renderer;		// PIXI renderer
var stage;			// PIXI stage
var queue = [];		// Holds a queue of phrases to be spoken
var start;			// Start time of current action
var loaded;			// true after onSceneLoaded is called
var animating;		// true while speaking
var texture;		// Current texture
var n = 0;			// Make texture refs unique
var data;			// JSON animation data
var savedURL;		// Current url
var frame;			// Current frame
var state = "";		// Save character state between API invocations
var stopping;		// True while stopping

function animateInit(div, width, height) {
    animateBase = "/tts/animate.jpeg";						// REVIEW - this sample assumes a /tts/animate.jpeg api endpoint, see the README for installation notes
    holderDiv = document.getElementById(div);
    renderer = new PIXI.CanvasRenderer(width, height); 		// CanvasRenderer uses a regular HTML5 Canvas object. Use PIXI.autoDetectRenderer(width, height) instead to use native webgl support
    stage = new PIXI.Container();
    execute("");
    // start simplest idle
    setTimeout(doIdleThing, 3000+Math.random()*3000);
}

function doIdleThing() {
    if (!animating && queue.length == 0) {
        execute("<blink/>");
    }
    setTimeout(doIdleThing, 3000+Math.random()*3000);
}

function animateSpeakQueued(text) {
    var action = "<say>" + text + "</say>";
    if (animating)
        queue.push(action);
    else
        playTTS(action);
}

function animateStop() {
    queue = [];
    stopping = true;
    var audio = document.getElementById("audio");
    audio.pause();
}

function playTTS(action) {
    animating = true;
	var audio = document.getElementById("audio");
	audio.oncanplaythrough = function() {
		audio.pause();
		// Now load the animation
		execute(action);
	}
    audio.onerror = function() {
		alert("Error obtaining audio.")
    }
	savedURL = animateBase + "?action=" + encodeURIComponent(action) + "&audio=true";
    audio.src = savedURL;
    audio.play();
}

function execute(action) {
    animating = true;
    savedURL = animateBase + "?action=" + encodeURIComponent(action);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", savedURL, true);
    xhr.addEventListener("error", function(err) {
    	alert(err.message);
    });
    xhr.addEventListener("load", function() {
        var test = xhr.getResponseHeader("x-msi-animationdata");
    	try {
            data = JSON.parse(test);
        } catch(err) {
		}
		if (!data) {
            alert(xhr.response); // A helpful error
            return;
		}
        ++n;
        PIXI.loader.add("image"+n, savedURL).load(function() {
            texture = PIXI.loader.resources["image"+n].texture;
            // render the first frame and start animation loop
            frame = undefined;
            start = undefined;
            animate(0);
            // add renderer to div if not already there
            if (renderer.view.parent != holderDiv)
                holderDiv.appendChild(renderer.view);
            // start audio
            if (savedURL.indexOf(encodeURIComponent("<say>")) > -1) {
                // Start the audio, if any
                var audio = document.getElementById("audio");
                audio.play();
            }
        });
    }, false);
    xhr.send();
}

function animate(timestamp) {
    if (!start)
        start = timestamp;
    var progress = timestamp - start;

    // exit case
    if (frame == -1)
    {
        animateComplete();
        return;
    }

    var frameNew = Math.floor(progress / 1000 * data.fps);
    if (frameNew == frame) {
        requestAnimationFrame(animate);
        return;
    }
    if (!stopping) frame = frameNew;

    if (frame >= data.frames.length)
    {
        animateComplete();
        return;
    }

    // first arg is the image frame to show
    var recipe = data.recipes[data.frames[frame][0]];
    stage.removeChildren();
    for (var i = 0; i < recipe.length; i++) {
        var sprite = new PIXI.Sprite(new PIXI.Texture(texture, new PIXI.Rectangle(recipe[i][2], recipe[i][3], recipe[i][4], recipe[i][5])));
        sprite.x = recipe[i][0];
        sprite.y = recipe[i][1];
        stage.addChild(sprite);
    }

    // third arg is an extensible side-effect string that is triggered when a given frame is reached
    if (data.frames[frame][2])
        onEmbeddedCommand(data.frames[frame][2]);
    // second arg is -1 if this is the last frame to show, or a recovery frame to go to if stopping early
    if (data.frames[frame][1] == -1)
        frame = -1;
    else if (stopping && data.frames[frame][1])
        frame = data.frames[frame][1];

    //Render the stage to see the animation
    renderer.render(stage);
    requestAnimationFrame(animate);
}

function animateComplete() {
	animating = false;
	stopping = false;
    if (!loaded) {
        loaded = true;
        onSceneLoaded();
    }
    if (queue.length > 0) {
        var action = queue.shift();
        playTTS(action);
        onQueueLengthDecrease(queue.length);
    }
}

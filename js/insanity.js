//This game was created and developed by Jiří Kozlovský whose nickname is 'jirislav'.
//This code is licensed under MIT license. Feel free to fork & modify.

/* TODO list

   1) fabricate dynamic welcomeScreen where can be chosen difficulty - each'll have seperate records

   2) fabricate pause functionality
   2-a)  every second elapsed while paused will substract one scorePoint

   3)  addEventListener to 'real-time' resize window

   4)  save 10 best records && prompt for identifier (nickname)

   end of TODO */

var Insanity = function(){

	if (! (this instanceof Insanity) || Insanity.helper.checkIsAlreadyRunning()) {
		return undefined;
	}

	// Set global listeners now
	document.body.onresize = function() {
		Insanity.playBox.applyResize();
	}

	Insanity.playBox.updateSizes();

	// Now we are done here
	this.done(this.states.birth);
};

// Done method should ONLY be called from within the main Insanity() prototype, or after an async call completes
// The argument state server only for asynchronous jobs when they finish
Insanity.prototype.done = function(state) {

	if (state !== undefined) // Can be undefined e.g. with synchronous callback
		Insanity.prototype.updateState(state);

	var isAsync = false;

	switch (this.state) {
		case this.states.birth:
			isAsync = true;

			Insanity.playBox.HUD.processCountDown();
			break;
		case this.states.countDownComplete:

			Insanity.playBox.HUD.create();
			break;
		case this.states.HUDready:

			Insanity.playBox.playground.create();
			break;
		case this.states.playgroundCreated:

			Insanity.playBox.playground.handler.startSendingClickables();
			break;
		case this.states.doneSendingClickables:
			// Ending the game construction ..
			return true;
		default:
			break;
	}

	if (isAsync)
		return true;

	if (this.previousState === this.state) {
		console.log("State did not change - ending the logic now.\n Last state: " + this.state);
		return false;
	} else {
		return this.done();
	}
}

Insanity.prototype.updateState = function(state) {
	// Store last value just in case ..
	this.previousState = this.state;

	this.state = state;
}

Insanity.prototype.states = {
	"birth" : 0,
	"countDownComplete" : 1,
	"HUDready" : 2,
	"playgroundCreated" : 3,
	"doneSendingClickables" : 4
}

Insanity.options = {

	version : "1.3.0",

	countDownFrom : 3,

	levelTransitionDuration: 1400,

		// Decide about the probability of green ones
	clickable : {
		greenRate : 0.4,
		maxCount : 5
	},

		// The speed is measured in ms / circle to reach the top
	speed : {
		initial : 2500,
		speedUpBy : 20,
		speedUpEveryClickable : 4,
		maxSpeed : 500
	},

	lifes : {
		initialCount : 5,
		maxCount : 10
	},
	scores : {
		initialCount : 0
	},
	columns : {
		initialCount : 3
	},
	HUD : {
		durationToAppear : 1000,
		durationToDisAppear : 250,
	},
	playground : {
		maxRatio : 13E-1 // Equals 1.3
	}
}

// Helper relatively static variables ..
Insanity.staticVars = {
	HUD : {
		// CSS styles we will soon fetch
		topDivHeight : undefined,
		progressBarHeight : undefined, 

			// Pointers of various elemnents to prevent d3.select() as it's really slow
		progressBarPtr : undefined,
		topDivPtr : undefined,
		levelPtr : undefined,
		scorePtr : undefined,

	},
	playground : {

		mainPtr : undefined,

	}
}

// TODO All dynamicVars should belong to own Object ..
Insanity.dynamicVars = {
	level : 1,
	timeStarted : 0,

	lifes : 0,
	playground : {
		height : 0,
		exists : false 
	},
	HUD : {
		progressBarExists : false,
		exists : false,
	},
	clickable : {

		// Hold count of clickables generated current level
		levelCount : 0,

		// Defines position on Y axis where will be clickable born
		birthPlace : 0,

		greensInRow : 0,

		circle : {
			radius : 0,
		},
	},

		// Speed is defined in ms / circle needed to reach the top
	speed : {
		value : 0,
		maxReached : false
	},
	doWeHaveMouseOverNow : false
}

Insanity.playBox = {

	sizes : {
		"width" : undefined,
		"height" : undefined
	},

	updateSizes : function () {
		Insanity.playBox.sizes = Insanity.helper.getScreenSize();

		// TODO: Think about having all those values handled by CSS ...
		// h / 20
		Insanity.playBox.sizes.twentiethHeight = Insanity.playBox.sizes.height / 20;

		// h / 200
		Insanity.playBox.sizes.twoHundredthHeight = Insanity.playBox.sizes.twentiethHeight / 10;

		// h / 10
		Insanity.playBox.sizes.tenthHeight = Insanity.playBox.sizes.twentiethHeight * 2;

		// h / 4
		Insanity.playBox.sizes.quarterHeight = Insanity.playBox.sizes.twentiethHeight * 5;

		// h / 30
		Insanity.playBox.sizes.thirtieth = Insanity.playBox.sizes.width / 30;

		// h / 15
		Insanity.playBox.sizes.fifteenthWidth = Insanity.playBox.sizes.thirtieth * 2;

		// h / 2
		Insanity.playBox.sizes.halfWidth = Insanity.playBox.sizes.thirtieth * 15;
	},

		// Window resize handler
	applyResize : function() {
		Insanity.playBox.updateSizes();

		Insanity.playBox.HUD.redraw();

		//FIXME resize the playground & all the elements within it
		Insanity.playBox.playground.redraw();
	},
}

Insanity.playBox.playground = {

	create : function() {

		if (Insanity.dynamicVars.playground.exists) {
			console.error("Playground already exists, cannot create another !");
			return false;
		} else {
			Insanity.dynamicVars.playground.exists = true;
		}

		var definition = Insanity.playBox.playground.getSVGdefinition();

		Insanity.staticVars.playground.mainPtr = body.append("svg:svg")
			.attr(definition.attr)
			.style(definition.style);

		return Insanity.prototype.updateState(Insanity.prototype.states.playgroundCreated);
	},

	getSVGdefinition : function() {

		var svgWidth;

		// Apply maxRatio if needed
		if (Insanity.playBox.sizes.width < Insanity.options.playground.maxRatio * Insanity.playBox.sizes.height ) {
			svgWidth = Insanity.playBox.sizes.width;  
		} else {
			svgWidth = Math.round( Insanity.options.playground.maxRatio * Insanity.playBox.sizes.height );
		}

		// TODO: Think about better place to call this helper
		Insanity.helper.clickable.updateDynamicVars();

		var style =  {
			"left" : function() { return Insanity.helper.getHorizontalMiddle(this) },
			"top" : Insanity.staticVars.HUD.topDivHeight + "px"
		};

		var attr = {
			"width" : svgWidth,
			"height" : Insanity.dynamicVars.playground.height,
		};

		return {
			"style" : style,
			"attr" : attr
		};
	},

	redraw : function() {
		if (Insanity.dynamicVars.playground.exists) {
			var definition = Insanity.playBox.playground.getSVGdefinition();

			Insanity.staticVars.playground.mainPtr
				.attr(definition.attr)
				.style(definition.style);
		}
	},

	remove : function() {

		if (!Insanity.dynamicVars.playground.exists) {
			console.error("Playground does not exist!");
			return false;
		} else {
			Insanity.dynamicVars.playground.exists = false;
		}

		//TODO: Implement playground removal .. it should nicely dispose all clickables & then remove itself
		return true;
	},
};

Insanity.playBox.playground.handler = {
	startSendingClickables : function() {

		Insanity.dynamicVars.speed.value = Insanity.options.speed.initial;

		Insanity.helper.callAsync(function() {
			Insanity.playBox.playground.handler.sendClickable();
		});


		Insanity.dynamicVars.timeStarted = Date.now();
		return Insanity.prototype.updateState(Insanity.prototype.states.doneSendingClickables);
	},

	destructDynamicVars : function() {
		Insanity.dynamicVars.speed.maxReached = false;
		Insanity.dynamicVars.speed.value = 0;

		Insanity.dynamicVars.clickable.levelCount = 0;
		Insanity.dynamicVars.clickable.birthPlace = 0;
		Insanity.dynamicVars.clickable.circle.radius = 0;
	},

	stopSendingClickables : function() {
		Insanity.playBox.playground.handler.destructDynamicVars();
		// TODO: Create global disposal of all the clickables
	},

	createClickable : function(shape, style, eventName, eventCallback) {
		++ Insanity.dynamicVars.clickable.levelCount;

		return Insanity.staticVars.playground.mainPtr
			.append(shape)
			.style(style)
			.on(eventName, eventCallback);
	},

	createCircle : function() {

		// For now we have only two colors ..
		var color = Math.random() < Insanity.options.clickable.greenRate ? 'green' : 'red';

		var style = {
			"fill": color,
		};

		var eventName = Insanity.dynamicVars.doWeHaveMouseOverNow ? 'mouseover' : 'mousedown';

		var eventCallback = function() {
			Insanity.playBox.playground.handler.processClickableHit(this);
		};

		return Insanity.playBox.playground.handler.createClickable('circle', style, eventName, eventCallback);
	},

	sendClickable : function() { // TODO rename sendClickable to sendCircle & implement sendClickable mor uniquely

		Insanity.playBox.playground.handler.updateSpeed();

		// Create circle clickable
		var clickable = Insanity.playBox.playground.handler.createCircle();

		var radius = Insanity.dynamicVars.clickable.circle.radius;

		// Pick a position & set the radius
		clickable.attr({
			"r" : radius,
			"cy" : Insanity.dynamicVars.clickable.birthPlace - radius,
			"cx" : Insanity.playBox.playground.handler.pickColumn()
		});

		clickable.transition()
			.duration(Insanity.dynamicVars.speed.value)
			.ease("linear")
			.attr("cy", -radius)
			.each("end", function() {
				Insanity.playBox.playground.handler.clickableReachedEnd(clickable);
			}).remove();

		var delay = 1.2 * Insanity.dynamicVars.speed.value / Insanity.options.clickable.maxCount;
		setTimeout(function() {
			Insanity.playBox.playground.handler.sendClickable();
		}, delay);

	},

	pickColumn : function() {
		// TODO implement picking up the column ..
		return 150;
	},

	updateSpeed : function() {
		if (! Insanity.dynamicVars.maxSpeedReached)
			// Do we have to speed up ?
			if ( Insanity.dynamicVars.circleRoundID % Insanity.options.speed.speedUpEveryClickable === 0) {

				// Speed it up ..
				Insanity.dynamicVars.speed -= Insanity.options.speed.speedUpBy;

				// Filter the max speed
				if (Insanity.dynamicVars.speed < Insanity.options.speed.maxSpeed) {
					Insanity.dynamicVars.maxSpeedReached = true;
					Insanity.dynamicVars.speed = Insanity.options.speed.maxSpeed;
				}
			}
	},

	processClickableHit : function(clickable) {

		if (clickable instanceof Element)
			clickable = d3.select(clickable);

		// If the clickable is red
		if (Insanity.helper.clickable.isColor('red', clickable)) {

			Insanity.playBox.playground.handler.addLifes(-1);

			Insanity.dynamicVars.clickable.greensInRow = 0;
		} else {
			++ Insanity.dynamicVars.clickable.greensInRow;
			// TODO call CLickedGreen logic instead
		}

	},

	clickableReachedEnd : function(clickable) {
		// If the clickable is green
		if (Insanity.helper.clickable.isColor('green', clickable)) { // FIXME create helper "isColor(color)"

			Insanity.playBox.playground.handler.addLifes(-1);

			Insanity.dynamicVars.clickable.greensInRow = 0;
		}
	},

	addLifes : function(count) {
		// Handle backend ..
		Insanity.dynamicVars.lifes += count;

		// TODO: End the game if lifes === 0

		// Let the user know
		Insanity.playBox.HUD.addLifes(count);
	}
};

Insanity.playBox.HUD = {

	create : function() {

		if (Insanity.dynamicVars.HUD.exists) {
			console.error("HUD already exists, cannot create another !");
			return false;
		} else {
			Insanity.dynamicVars.HUD.exists = true;
		}

		var topDiv = body.append("div").attr("id","top");

		Insanity.staticVars.HUD.topDivPtr = topDiv;

		// Get the CSS value
		Insanity.staticVars.HUD.topDivHeight = parseInt( topDiv.style('height') );

		// Create lifes span
		var lifesDiv = topDiv.append("div").attr("id","lifes");

		lifesDiv.append("span").classed("lifes",true)
			.text(Insanity.options.lifes.initialCount);

		lifesDiv.append("span")
			.text(" life(s)");

		// Create level span
		var levelSpanStyle = Insanity.playBox.HUD.getLevelSpanStyle();

		levelSpanStyle.opacity = 0;

		var levelSpan = topDiv.append("span").attr("id","level")
			.text("Level 1")
			.style(levelSpanStyle);

		levelSpan
			.transition()
			.ease("exp").duration(Insanity.options.HUD.durationToAppear)
			.style("opacity", 1);

		Insanity.staticVars.HUD.levelPtr = levelSpan;


		// Create score span
		var scoreSpan = topDiv.append("span").attr("id","score")
			.text(Insanity.options.scores.initialCount);

		Insanity.staticVars.HUD.scorePtr = scoreSpan;

		// Create version span
		topDiv.append("span").attr("id","version")
			.text(Insanity.options.version);

		// Drive the HUD into the observable area
		topDiv.transition()
			.duration(Insanity.options.HUD.durationToAppear)
			.style("top", "0px");

		// Finally create the progress bar
		Insanity.playBox.HUD.progressBar.create();

		// Finally just update state as this is called synćhronously
		return Insanity.prototype.updateState(Insanity.prototype.states.HUDready);
	},

	getLevelSpanStyle : function () {
		return { 
			"left" : function() { return Insanity.helper.getHorizontalMiddle(this) }
		};
	},

	remove : function() {
		if (!Insanity.dynamicVars.HUD.exists) {
			console.error("HUD does not exist!");
			return false;
		} else {
			Insanity.dynamicVars.HUD.exists = false;
		}

		Insanity.staticVars.HUD.topDivPtr
			.transition().duration( Insanity.options.HUD.durationToDisAppear )
			.style("top", "-" + Insanity.staticVars.HUD.topDivHeight + "px")
			.each("end", function() {
				Insanity.staticVars.HUD.topDivPtr.remove();
			});

		Insanity.playBox.HUD.progressBar.remove();
		return true;
	},

	redraw : function() {
		if (Insanity.dynamicVars.HUD.exists) {
			// Update levelSpan style
			Insanity.staticVars.HUD.levelPtr.style(Insanity.playBox.HUD.getLevelSpanStyle());
		}
	},

	processCountDown : function(i) {

		var color;
		if (i === undefined) {
			i = Insanity.options.countDownFrom;
			color = "red";
		} else if (typeof i === "string") {
			color = "green";
		} else {
			color = "orange";
		}

		Insanity.helper.transitions.createCountDown(i, 'countdown', color);

		if (color !== "green") {

			// If the next number is 0, we should show something like Start!
			if (--i === 0) {
				i = "Go !!";
			}

			// Callback in one second
			return setTimeout(function(){
				Insanity.playBox.HUD.processCountDown(i)
			}, 1E3);
		} else {
			// Purge all countdown spans ..
			setTimeout(function () {
				d3.selectAll('span.countdown').remove();
			}, 1E3);

			// Now we are done here
			return Insanity.prototype.done(Insanity.prototype.states.countDownComplete)
		}
	},

	progressBar : {
		create : function() {

			if (Insanity.dynamicVars.HUD.progressBarExists) {
				console.error("Progress bar already exists, cannot create another !");
				return false;
			} else {
				Insanity.dynamicVars.HUD.progressBarExists = true;
			}

			var progressBar = body.append("div").attr("id", "progressBar");

			// Get the CSS height value (including the borders ..)
			Insanity.staticVars.HUD.progressBarHeight = 1.2 * parseInt( progressBar.style('height') );

			// We want a nice, smooth transition :)
			progressBar.style("bottom", "-" + Insanity.staticVars.HUD.progressBarHeight + "px");

			progressBar.transition()
				.duration(levelTransitionDuration)
				.style(Insanity.playBox.HUD.progressBar.getStyle());

			Insanity.dynamicVars.HUD.progressBarPtr = progressBar;

			return true;
		},

		getStyle : function () {
			return {
				"bottom" : "0px",
			};
		},

		remove : function () {

			if (!Insanity.dynamicVars.HUD.progressBarExists) {
				console.error("Progress bar does not exist!");
				return false;
			} else {
				Insanity.dynamicVars.HUD.progressBarExists = false;
			}

			Insanity.dynamicVars.HUD.progressBarPtr
				.transition().duration( Insanity.options.HUD.durationToDisAppear )
				.style("bottom", "-" + Insanity.staticVars.HUD.progressBarHeight + "px")
				.each("end", function() {
					Insanity.dynamicVars.HUD.progressBarPtr.remove();
				});

			return true;
		}
	},

	addLevel : function(count) {

		if ( count == undefined ) {
			Insanity.dynamicVars.level++;
		} else { 
			Insanity.dynamicVars.level += count;
		}

		var a = d3.select("span#level"),
		b = parseInt(a.style("font-size")),
			c = parseInt(a.style("width"));

		var style = {
			"opacity": 0,
			"color" : "green",
			"top" : hQuarter + "px",
			"left" : function() { return Insanity.helper.getHorizontalMiddle(this) }
		};

		// Apply defined style
		Insanity.staticVars.HUD.levelPtr.text("Level " + Insanity.dynamicVars.level)
			.style(style);

		var transitions = [
		{
			"duration" : .25 * Insanity.options.levelTransitionDuration,
			"style" : {
				"opacity" : 1
			}
		},
		{
			"duration" : .75 * Insanity.options.levelTransitionDuration,
			"style" : {
				"color" : "black",
				"top" : "0px",
				"left" : function() { return Insanity.helper.getHorizontalMiddle(this) }
			}
		}
		];


		// Apply those defines transitions
		Insanity.helper.transitions
			.applyTransitions( Insanity.staticVars.HUD.levelPtr, transitions );
	},

	addLifes : function(count) {
		// TODO
	}
};

Insanity.helper = {
	getHorizontalMiddle : function(obj) {

		var objWidth = parseInt( d3.select(obj).style('width') );

		return Math.round( Insanity.playBox.sizes.width - objWidth ) / 2 + "px";
	},

	callAsync : function(closure) {
		if (typeof closure === "function")
			setTimeout(closure, 10); //Wait 10 ms :)
	},

	clickable : {
		updateDynamicVars : function() {
			// FIXME WARNING ! There must be updated playBox.sizes first !!

			// The height is about to be Window height - InfoPanel height - progressBar height
			// which equals all the other space left on the screen until resize
			Insanity.dynamicVars.playground.height = Insanity.playBox.sizes.height - Insanity.staticVars.HUD.topDivHeight - Insanity.staticVars.HUD.progressBarHeight;

			Insanity.dynamicVars.clickable.circle.radius = Insanity.helper.clickable.circle.calculateRadius();

			Insanity.dynamicVars.clickable.birthPlace = Insanity.dynamicVars.playground.height - Insanity.dynamicVars.clickable.circle.radius;
		},
		circle : {
			calculateRadius : function() {
				// FIXME
				return 50;
			}
		},
		isColor : function(color, clickable) {
			switch(color) {
				case "red":
					return "rgb(255, 0, 0)" == clickable.style("fill");
				case "green":
					return "rgb(0, 128, 0)" == clickable.style("fill");
				default:
					return false;
			}
		}
	},

		// transitionDefs must be array of Object like this one:
		// { "duration" : 590, "style" : { top: "0px" } } ...
	transitions : {
		createCountDown : function (text, clazz, color) {
			var style = {
				color: color,
				"left" : function() { return Insanity.helper.getHorizontalMiddle(this) },
				"top": Insanity.playBox.sizes.quarterHeight + "px",
				"opacity": 0
			};

			var transitions = [
			{ 
				"duration" : 590,
				"style" : {
					"top" : "0px",
					"opacity" : 1
				}
			},
			{
				"duration" : 390,
				"style" : {

					"top" : function() {
						return "-" + d3.select(this).style("font-size");
					},

					"opacity": 0
				}
			}
			];

			Insanity.helper.transitions.createTag('span', text, style, clazz, transitions);
		},

		createTag : function(tag, text, style, clazz, transitionDefs) {
			var element = body.append(tag).attr("class", clazz)
				.text(text).style(style);

			Insanity.helper
				.transitions
				.applyTransitions( element, transitionDefs);

			return element;

		},

		applyTransitions : function(d3selector, transitionDefs, key, lastKey) {

			if (key === undefined) {
				var keys = Object.keys(transitionDefs);

				key = parseInt(keys[0]);
				lastKey = parseInt(keys.pop());

			}

			var transitionDef = transitionDefs[key];

			// Default duration
			if (transitionDef.duration === undefined)
				transitionDef.duration = 500;

			// Default style
			if (transitionDef.style === undefined)
				transitionDef.style = { color: "red" , opacity: 1}

			var transition = d3selector.transition()
				.duration(transitionDef.duration)
				.style(transitionDef.style);

			if ( key !== lastKey ) {
				transition = transition.each("end", function() {
					// Do the callback
					Insanity.helper.transitions.applyTransitions(
							d3.select(this), transitionDefs, ++key, lastKey
							);
				});
			}
		}
	},
	getScreenSize : function () {
		var docElement = document.documentElement;

		return {
			"width": --docElement.clientWidth,
			"height": --docElement.clientHeight
		};
	},
	checkIsAlreadyRunning : function() {
		return (document.InsanityRunning === undefined) ?
			!(document.InsanityRunning = true) :
			document.InsanityRunning;
	}
}

// FIXME do some refatroing here ..
Insanity.prototype.createEndGameScreen = function () {

	var endScreen = appendDiv("endScreen");
	var b = getRec();
	var e = ( 1e-3 * ( Date.now() - Insanity.dynamicVars.timeStarted ));

	var r = endScreen.append("div").classed("record",true).append("span");

	b < score ? (saveRec(),r.text("New record achieved!\n")) : r.text("Your best: "+b);

	// Append score reached
	endScreen.append("div").classed("scoreReached", true)
		.append("span").text("You scored: "+score);

	// Append reached level
	endScreen.append("div").classed("levelReached", true)
		.append("span").text("Level reached: "+level);

	// Append elapsed time
	var elapsedTime = "Time elapsed: "+(60 < e ? (Math.round(e/60)+" min(s) "):"")+
		(Math.round(e%60)+" sec(s)");

	endScreen.append("div").classed("elapsed", true)
		.append("span").text(elapsedTime);

	var divTop = body.append('div').attr("id","top");
	var divTopHeight = parseInt( divTop.style('height') );
	var topMargin = Math.round(h/10); //FIXME

	divTop.style({
		background:"transparent",
		"margin-left":"2em"
	});

	divTop.append("button").classed("red", true)
		.on("click", function() {
			deleteHighScores()
		}).text(delRecsText);

	divTop.append("button").classed("green", true)
		.on("click", function() {
			evadeAll();
			setTimeout(parent.location="manual", HUDdurationDisappear)
		}).text(manualButtonText);

	divTop.append("button").classed({"green": true, "restart":true})
		.on("click", function() {
			disposeProgressBar();
			evadeAll();
			setTimeout(parent.location.reload(), HUDdurationDisappear)
		}).on("mouseover", function(){ 
			d3.select(this).text(resetButtonText[1])
		}).on("mouseout", function(){
			d3.select(this).text(resetButtonText[0])
		}).text(resetButtonText[0]);

	d3.select("div#endScreen")
		.style({
			"top" : function() {
				return ( divTopHeight + topMargin + parseInt(d3.select(this).style("top")))+"px"
			},
			"left" : function() {
				return "-" + d3.select(this).style("width")
			}
		}).transition().duration(HUDdurationAppear)
	.style("left", Math.round( w / 15 ) + "px");

	divTop.transition().duration(HUDdurationAppear)
		.style("top", topMargin + "px");
};

//
// 
// HERE STARTS THE OLD VERSION BEING REFACTORED ABOVE ...
//
//
//

var version="1.2.2 - debug",svg,radius,downSight,started,columns,ratio,columnsCount,redsInRound,speed,circlesCountAtOnce,optimizedRenderingSpeed,progressAppearDuration,svgWidth,svgHeight,accelerator,bonusGap,summedGaps,circleRoundID,greensInRow,nbsPoints,oldSpeed,scoreBoard,lifesBoard,progressBarHeight,levelProgress,rgRatio,tenLifesBonus,
    w = document.documentElement.clientWidth-1,
    h = document.documentElement.clientHeight-1,
    hQuarter = Math.round(h / 4),
    mouseOver = !1,
    mouseOverRound = 5,//8
    progressAppearDuration = 200,
    level = 0,
    levelTransitionDuration = 1400,
    ratio = 13E-1,
    dur = 2E3,//2E3
    HUDdurationAppear = 1000,
    HUDdurationDisappear = 250,
    score = 0, 
    body = d3.select("body"),
    lifes = 5,
    flames=[!1,!1],
    stop = !1,
    resetButtonText = ["Start again","Go for it now!"],
    manualButtonText = "Read manual",
    delRecsText = "Delete records",
    circlesCountAtOnceInitial = 3, //4
    columns = {
	    values: new Array(),
	    recalculate: function(a) {
		    var b=svgWidth/(2*a);
		    this.values = new Array();
		    while(a--)this.values[a]=(1+2*a)*b;
	    },
	    chooseRandom: function() {
		    return this.values[Math.floor(Math.random()*this.values.length)]
	    }
    }, 
    assignValues = function(a) {
	    w = document.documentElement.clientWidth-1;
	    h = document.documentElement.clientHeight-1;
	    d3.select("div#top").style("width", w+"px");
	    divTopHeight = Math.round(parseInt(d3.select("div#top").style("height")));
	    svgWidth = w < ratio*h ? w : Math.round(ratio*h);
	    progressBarHeight = h/20;
	    svgHeight = h-divTopHeight-1.2*progressBarHeight;
	    columnsCount = level+2;//+5
	    columns.recalculate(columnsCount);
	    document.getElementById("s"+(level-1)) && circleFadeOut("s"+(level-1));
	    var svgId = "s"+level;
	    svg = body.append("svg:svg").attr({width:svgWidth,height:svgHeight,id:svgId}).style({
		    left: Math.round((w - parseInt(d3.select("#"+svgId).attr("width"))) / 2)+"px",
		    top: divTopHeight+"px"
	    });
	    scoreBoard = d3.select("span#score");
	    lifesBoard = d3.select("span.lifes");
	    hQuarter = Math.round(h / 4);
	    radius = svgWidth / (columnsCount*2+1);
	    downSight = svgWidth + radius;
	    redsInRound=0;
	    tenLifesBonus=10*level;
	    optimizedRenderingSpeed=!1;
	    circleRoundID=0;
	    greensInRow=0;
	    nbsPoints=0;
	    levelProgress=0;
	    speed=1.3;
	    disposeProgressBar(HUDdurationDisappear);
	    setTimeout(createProgressBar, HUDdurationDisappear);
	    rgRatio = 5E-1;
	    !1 == mouseOver && (circlesCountAtOnce=circlesCountAtOnceInitial,bonusGap=10);
	    mouseOverRound <= level && (enlargeBonusGap(),rgRatio=35E-2);
	    1 == level && d3.select("span#level").style("opacity",0).transition().ease("exp").duration(HUDdurationAppear).style("opacity",1)  ||  niceLevelTransition(levelTransitionDuration);
	    summedGaps = sumBonusGaps();
    }, sumBonusGaps = function(a) {
	    var s = 0, n = null == a ? bonusGap : a;
	    while(n)s+=n--;
	    return s;
    }, reversedSumBG = function(a) {
	    var s = 0;
	    while(a<bonusGap)s+=++a;
	    return s;
    }, niceLevelTransition = function(d) {
	    var a = d3.select("span#level"),
	    b = parseInt(a.style("font-size")),
	    c = parseInt(a.style("width"));
	    d3.select("span#level").style("opacity",0).text("Level "+level).style({
		    color:"green",
		    top:hQuarter+"px",
		    "font-size": function() {return a*1.5+"px"},
		    left: function() { return Math.round(w-c)/2+"px"}
	    })
	    .transition().duration(.25*d).style("opacity",1)
		    .transition().duration(.75*d).style({
			    color:"black",
			    top:"0px",
			    "font-size": function() {return a+"px"},
			    left: function() { return Math.round(w-c)/2+"px"}
		    });
    }, enlargeBonusGap = function() {
	    (bonusGap=(Math.ceil(.5*level)+8)) && (circlesCountAtOnce=((1.5 + level/40)*circlesCountAtOnceInitial)) && (!0 == mouseOver || (mouseOver=!0, setTimeout(function() {return echoMouseover(levelTransitionDuration*1.6)},.6*levelTransitionDuration)));
    },echoMouseover = function(d) {
	    body.append("span").text("Switched to mouseover!").style({
		    color: "green",
		    position: "absolute",
		    display: "inline",
			    "white-space": "nowrap",
		    top: hQuarter +"px",
		    left: function() {return "-"+d3.select(this).style("width")},
		    opacity: 0
	    }).transition().duration(.25*d).style({
		    left: function() {return (w-parseInt(d3.select(this).style("width")))/2 + "px"},
		    opacity: 1
	    }).transition().delay(.5*d).duration(.25*d).style({
		    left: function() {return (w+parseInt(d3.select(this).style("width"))) + "px"},
		    opacity: 0
	    }).remove();
    }, startIt = function() {
	    0 == circleRoundID % 8 && speedUp(2*Math.pow(level,1/2));
	    var a = initNew(chooseColor(rgRatio)), b = speed * dur;
	    goUp(a, b);
	    stop || setTimeout(startIt, b / (circlesCountAtOnce+1));
    }, initNew = function(a) {
	    circleRoundID++;
	    return svg.append("circle").attr(attrCircle).style({fill: a, "shape-rendering": function(){return !0 == optimizedRenderingSpeed ? "optimizeSpeed" : null;}}).on(!1 == mouseOver ? "mousedown" : "mouseover", handleClick(a, circleRoundID));
    }, attrCircle = {
	    "id": function() {return "c" + circleRoundID},
	    "r": function() {return radius},
	    "cx": function() {return columns.chooseRandom()},
	    "cy": function() {return downSight}
    }, goUp = function(a, b) {
	    a.transition().duration(b).ease("linear").attr("cy", -radius).each("end", function() {
		    circleReachedEnd(a);
	    }).remove();
    }, circleReachedEnd = function(a) {
	    "rgb(0, 128, 0)" == a.style("fill") && (addLifes(-1), greensInRow=0);
    }, chooseColor = function(a) {
	    var b = Math.random();
	    a < b ? (b="red") : (b="green");
	    return b;
    }, disposeProgressBar = function(a) {
	    d3.select("div#progressBar").transition().ease("quad").duration(80).style("background", "rgba(0, 0, 0, 0) linear-gradient(to right, rgb(0, 128, 0) 100%, rgb(0, 128, 0) 100%, rgba(0, 0, 0, 0) 100%) repeat scroll 0% 0% / auto padding-box border-box").transition().duration(a-80).style("bottom", function() {return "-"+d3.select(this).style("height")}).remove();
    }, createProgressBar = function() {
	    appendDiv().attr("id", "progressBar").style({
		    height: .9*progressBarHeight+"px",
		    bottom: "-"+progressBarHeight+"px",
		    width: .9*w+"px",
			    "margin-bottom": .1*progressBarHeight+"px",
			    "border-width": h/200+"px",
		    left: function() {return (w-parseInt(d3.select(this).style("width")))/2+"px"}
	    }).transition().duration(levelTransitionDuration).style("bottom","0px");
    }, moveProgressBar = function(b, d) {
	    var a = getLevelProgress(), e = a+(100-a)/30, c;
	    (!0==b)?(c = getLastCP()+"%, rgb(0, 128, 0) "+a):(c = getLastCP()+"%, rgb(255, 255, 0) "+a);
	    return d3.select("#progressBar").transition().ease("linear").duration(d).style("background", "rgba(0, 0, 0, 0) linear-gradient(to right, rgb(0, 128, 0) "+c+"%, rgba(255, 255, 0, 0) "+e+"%) repeat scroll 0% 0% / auto padding-box border-box");
    }, getLevelProgress = function() {
	    return Math.round(100*levelProgress/summedGaps);
    }, getLastCP = function() {
	    return Math.round(100*reversedSumBG(bonusGap-nbsPoints)/summedGaps);
    }, levelUp = function(a) {
	    a==null?level++:level+=a;
	    d3.select("span#level").transition().duration(200).style("opacity",1==level?1:0);
	    assignValues(level);
    }, checkNBS = function() {//
	    levelProgress++;
	    greensInRow >= (bonusGap - nbsPoints) ?
		    (greensInRow=0,
		     moveProgressBar(!0, progressAppearDuration),
		     (10>lifes) && addLifes(1),
		     nbsPoints++ == (bonusGap-1) && levelUp()) :
		    moveProgressBar(!1, progressAppearDuration);
    }, speedUp = function(a) {
	    a = 1 - a / 100;
	    a = Math.pow(a, 1 - 1 / (speed * a*1.8 *Math.pow(level,-1/5)));
	    speed *= a;
	    0.5 < speed || (!0 == optimizedRenderingSpeed || (optimizedRenderingSpeed = !0));
    }, addBonusScore = function(a) {

	    scoreBoard.style("color", "green").transition().duration(1E3).transition().style("color", null);
	    score += a;
	    scoreBoard.text(score);

    }, addScore = function(a) {
	    var b = "green";
	    0 >= a && (b = "red");
	    scoreBoard.style("color", b).transition().duration(1E3).transition().style("color", null);
	    9 < lifes && (a+=tenLifesBonus);
	    score += a;
	    scoreBoard.text(score);
    }, flameSpan = function(a,b) {
	    b != flames[a] && (d3.select("span"+(0!=a?"#score":".lifes")).classed("flames",b),(flames[a]=b));
    }, addLifes = function(a) {
	    var b = "red", c = !0;
	    0 < a ? (b = "green", a = "+" + a, c = !1, (8 < lifes ? flameSpan(1,!0) : (1!=lifes || flameSpan(0,!1)))) : (flameSpan(1,!1),(3>lifes && flameSpan(0,!0)));
	    d3.select("div#lifes").append("span").attr("class","bonus").style({top:(hQuarter*2)+"px", display:"inline", color:b}).text(a+" life(s)")
		    .transition().duration(90).style({opacity: 1, top:hQuarter+"px"})
		    .transition().duration(205).ease("exp").style({opacity: 1e-7, top:"0px"})
		    .remove();
	    setTimeout(function() {
		    lifes+=parseInt(a);
		    lifesBoard.text(lifes);
		    -1 == lifes + a && stopIt();
	    }, 310);
	    !0 == c && moveProgressBarToLastCP();
    }, moveProgressBarToLastCP = function() {
	    levelProgress = reversedSumBG(bonusGap-nbsPoints); moveProgressBar(!0, progressAppearDuration);
    }, handleClick = function(a, b) {
	    return "green" == a ? handleGreenClick(b) : handleRedClick(b);
    }, handleGreenClick = function(a) {
	    return function() {
		    greensInRow++;
		    (nbsPoints == (bonusGap-1))?circleFadeOut("s"+(level)):circleFadeOut(a);
		    checkNBS();
		    addScore(15*level); //25
	    };
    }, handleRedClick = function(a) {
	    return function() {
		    greensInRow=0;
		    redsInRound++;
		    var b = level*15 * redsInRound; //*25
		    circleFadeOut(a);
		    moveProgressBarToLastCP();
		    score < b ? (addScore(-score), addLifes(-1)) : addScore(-b*level);
	    };
    }, circleFadeOut = function(a) {
	    return ("s" == a[0] && 
			    (
			     d3.selectAll("circle").on("mousedown", null).transition().duration(200).attr("r", 7 * radius / 6).style("opacity", 1E-7).remove().each("end", function() {d3.select("#"+a).remove()})
			    ) || d3.select("#c" + a).on("mousedown", null).transition().duration(200).attr("r", 7 * radius / 6).style("opacity", 1E-7).remove());
    }, topBackground = function(b, c) {  // B true -> show using C in appendTopDiv .. false -> hide 
	    !1 == b ? d3.select("div#top").style("width", w+"px").transition().duration(HUDdurationDisappear)
		    .style("top", function() {return "-"+d3.select(this).style("height")})
		    .each("end", function() {d3.select(this).remove()}) :
			    appendTopDiv(null == c ? !1 : !0);
    }, appendTopDiv = function(b) {
	    var a = appendDiv().attr("id","top"), topMargin = Math.round(h/10);
	    if(!b) {
		    var c = a.append("div").attr("id","lifes");
		    c.append("span").classed("lifes",true).text(5);
		    c.append("span").text(" life(s)");
		    a.append("span").attr("id","level").text("Level 1");
		    a.append("span").attr("id","score").text(0);
		    a.append("span").attr("id","version").text("touchpad version "+version);
	    }else{
		    a.style({
			    background:"transparent",
			    "margin-left":"2em"
		    });
		    a.append("button").classed("red", true).on("click",function() {deleteHighScores()}).text(delRecsText);
		    a.append("button").classed("green", true).on("click",function() {evadeAll();setTimeout(parent.location="manual", HUDdurationDisappear)}).text(manualButtonText);
		    a.append("button").classed({"green": true, "restart":true}).on("click",function() {disposeProgressBar();evadeAll();setTimeout(parent.location.reload(), HUDdurationDisappear)}).on("mouseover",function(){d3.select(this).text(resetButtonText[1])}).on("mouseout",function(){d3.select(this).text(resetButtonText[0])}).text(resetButtonText[0]);
		    d3.select("div#endScreen").style({
			    top: function() {return (divTopHeight+topMargin+parseInt(d3.select(this).style("top")))+"px"},
			    left: function() {return "-"+d3.select(this).style("width")}
		    }).transition().duration(HUDdurationAppear).style("left",Math.round(w/15)+"px");
	    }
	    a.transition().duration(HUDdurationAppear).style("top",(!0 == b?(topMargin):0)+"px");
    }, evadeAll = function() {
	    body.selectAll("* div").transition().duration(HUDdurationDisappear).style("top",-h+"px").remove();
    }, saveRec = function() {
	    cookie.set("rec", score);
    }, getRec = function() {
	    return parseInt(cookie.get("rec")) || 0;
    }, pause = function(a) {
	    !0 == a ? ((oldSpeed = speed) && (speed = 1E6)) : (speed=oldSpeed) || (speed=.8);
    }, stopIt = function() {
	    topBackground(!1);
	    stop = !0;
	    circleFadeOut("s"+level);
	    endScreen();
    }, endScreen = function() {
	    var a=appendDiv("endScreen"),  b = getRec(), e = (1e-3*((new Date()).getTime()-started.getTime())), r = a.append("div").classed("record",true).append("span");
	    b < score ? (saveRec(),r.text("New record achieved!\n")) : r.text("Your best: "+b);
	    a.append("div").classed("scoreReached",true).append("span").text("You scored: "+score);
	    a.append("div").classed("levelReached",true).append("span").text("Level reached: "+level);
	    a.append("div").classed("elapsed",true).append("span").text("Time elapsed: "+(60 < e ? (Math.round(e/60)+" min(s) "):"")+
			    (Math.round(e%60)+" sec(s)"));
	    topBackground(!0, !0);
    }, appendDiv = function(a) {
	    return (null == a ? body.append("div") : body.append("div").attr("id", a));
    }, delBest = function() {
	    d3.select("div.record span").text("Your best: 0");
	    cookie.del("rec") && console.log("Best record ("+getRec()+" score points) has been successfully deleted.");
    }, deleteHighScores = function() {
	    confirm("Really do you want to delete your high score?\n\n\tYou already have awesome " + getRec() + " points!") && delBest();
    }, totalSecs = function(a) {
	    return Math.round(((new Date).getTime() - a.getTime()) / 100) / 10;
    }, prepareUI = function() {
	    d3.select("div#lifes").style("display", "block");
	    d3.selectAll("span").style("display", "inline")
		    .transition().duration(HUDdurationAppear);

	    // Create nice transition from the middle to above
	    d3.select("span#level").style("left", function() { return Math.round(w-parseInt(d3.select(this).style("width")))/2+"px"});

	    // Why now ??
	    levelUp();
    }, decreaseCountdown = function(a) {
	    var b = body.append("span").attr("class", "countdown")
		    .text(a).style({
			    color:0<a?(3==a?"red":"orange"):"green",
			    left: function() {
				    return (w-parseInt(d3.select(this).style("width")))/2 + "px";
			    },
			    top: hQuarter+"px",
			    opacity: 0
		    })
	    .transition().duration(590).style({
		    top: "0px",
		    opacity: 1
	    })
	    .transition().duration(390).style({top:function(){return "-"+d3.select(this).style("font-size");}, opacity: 0})
		    .remove();

    }, countDown = function(i) {
	    setTimeout(function() {
		    if (i !== 1) {
			    decreaseCountdown(--i);
			    countDown(i);
		    } else {
			    initialize();
		    }
	    }, 1E3);
    }, initialize = function() {
	    topBackground(!0);
	    prepareUI();
	    started = new Date();
	    startIt();
	    decreaseCountdown("Go !");
    }, debug = function(a,b) {
	    null == a && (a=!0);
	    null == b && (b=1);
	    "columns" == a && debugColumns();
	    !1 == a ? (lifes= 5,speed=1) : (lifes= 5000,speed=b);
    };

var I = new Insanity();
//countDown(4);

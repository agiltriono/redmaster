/**************************************************************************
 * Smart Carousel Responsive jQuery Plugin
 * @info: http://www.codegrape.com/item/smart-carousel-responsive-jquery-plugin/3627
 * @version: 1.0 (29/07/2016)
 * @requires: jQuery v1.7 or later (tested on 1.12.4)
 * @author: flashblue - http://www.codegrape.com/user/flashblue
**************************************************************************/

/***********************
	- Global class -
***********************/
var SMART = SMART || {};

/*************************
	- Carousel class -
*************************/
SMART.Carousel = function(element, options) {
	
	//Default values
	var defaults = {
		itemWidth:300,
		itemHeight:450,
		
		distance:15,
		startIndex:"auto",
		loop:true,
		motionStartDistance:150,
		topMargin:30,
		navigationButtonsVisible:true,
		slideSpeed:500,
		selectByClick:false,
		
		//Keyboard
		enableKeyboard:true,
		
		//Mouse wheel
		enableMouseWheel:true,
		reverseMouseWheel:false,
		
		//Auto slide
		autoSlideshow:false,
		autoSlideshowDelay:3000,
		
		//Selected item
		selectedItemDistance:50,
		selectedItemZoomFactor:1,
		
		//Unselected item
		unselectedItemZoomFactor:0.6,
		unselectedItemAlpha:0.6,
		
		//Preload
		preload:true,
		showPreloader:true,
		
		//Gradient
		gradientStartPoint:0.15,
		gradientEndPoint:1,
		gradientOverlayVisible:true,
		gradientOverlayColor:"#fff",
		gradientOverlaySize:215,
		
		//Reflection
		reflectionVisible:false,
		reflectionDistance:1,
		reflectionSize:100,
		reflectionAlpha:0.3
	};
	
	//Merge options with the default settings
	if (options) {
		$.extend(defaults, options);
	}
	
	//Other properties
	this.opt = defaults;
	this.targetLeft = 0;
	this.mouseOver = false;
	this.dragging = false;
	this.selectedItem = null;
	this.closestItem = null;
	this.container = null;
	this.contentContainer = null;
	this.preloader = null;
	this.timer = null;
	this.centerX = null;
	this.centerY = null;
	this.alphaUnit = null;
	this.scaleUnit = null;
	this.extraDistanceUnit = null;
	this.carouselItems = [];
	this.dom = { carousel: element };
	this.events = {};
	
	//Initialize carousel
	this.init();
	
};

SMART.Carousel.prototype = {
	
	//Initialize carousel
	init:function() {		
		this.initDOM();
		this.initConfigParams();
		this.initEvents();
		this.initContentWrapper();
		this.initContainer();
		this.initGradientOverlays();
		this.initNavigationButtons();
		this.initResizeListener();
		this.initKeyboardNavigation();
		this.initMouseWheelSupport();
		this.initAutoSlideshow();
		this.calculateUnits();
		this.update();
		
		//Show carousel
		this.dom.carousel.css("visibility", "visible");		
	},
	
	//Initialize DOM elements
	initDOM:function() {		
		this.dom.document = $(document);
		this.dom.wrapper = this.dom.carousel.children(".smart-carousel-wrapper");
		this.dom.container = this.dom.wrapper.children(".smart-carousel-container");
		this.dom.items = this.dom.container.children("li");
		this.dom.links = this.dom.container.find("li > a");
		this.dom.images = this.dom.container.find("li img");
		this.dom.carousel.addClass("sc-no-select");
		
		//Preload setup
		if (this.opt.preload) {
			//Do not support IE7-IE8
			if ($.support.leadingWhitespace!=false) {
				this.dom.wrapper.css({visibility:"hidden", opacity:0});			
			
				//Append the preloader if requested
				if (this.opt.showPreloader) {
					this.preloader = $('<div class="sc-preloader"></div>');
					this.dom.carousel.append(this.preloader);
				}
			}
		}

		//For each image disable dragging
		this.dom.images.each(function() {
			$(this).addClass("sc-image");
			
			this.ondragstart = function() {
				return false;
			};
		});
	},
	
	//Initialize configuration parameters
	initConfigParams:function() {		
		var itemPaddingSize = parseInt(this.dom.items.css("padding-left")),
			itemBorderSize = parseInt(this.dom.items.css("border-left-width")),
			imagePaddingSize = parseInt(this.dom.images.css("padding-left")),
			imageBorderSize = parseInt(this.dom.images.css("border-left-width"));
					
		//Update itemWidth and itemHeight by adding the padding and border values
		this.opt.itemWidth += (itemPaddingSize+itemBorderSize+imagePaddingSize+imageBorderSize)*2;
		this.opt.itemHeight += (itemPaddingSize+itemBorderSize+imagePaddingSize+imageBorderSize)*2;
		
		//Set transform origin
		if (SMART.Utils.has2dTransformationSupport()) {
			this.dom.items.css(SMART.Utils.getPrefixedProperty("transformOrigin"), "center "+Math.round(this.opt.itemHeight/2)+"px");
		}		
	},
	
	//Initialize mouse and touch events
	initEvents:function() {		
		if (SMART.Utils.hasTouchSupport()) {
			this.events.startEvent = "touchstart.sc";
			this.events.moveEvent = "touchmove.sc";
			this.events.endEvent = "touchend.sc";
			this.events.touchCancel = "touchcancel.sc";
		} else {
			this.events.startEvent = "mousedown.sc";
			this.events.moveEvent = "mousemove.sc";
			this.events.endEvent = "mouseup.sc";
		}		
	},
	
	//Initialize carousel container that holds the items
	initContainer:function() {		
		var that = this;
		var numLoadedItems = 0;
		
		//Create a new container
		this.container = new SMART.Container(this.dom.container, this);
		
		//For each dom element create a new carousel item
		this.dom.items.each(function(index) {
			var carouselItem = new SMART.CarouselItem($(this), that);
			
			//Subscribe for the load event
			carouselItem.subscribe("load", function(item) {
				++numLoadedItems;
				
				if (numLoadedItems==that.dom.items.length) {
					that.onAllLoaded();
				}
			});
			
			//Start loading the carousel item
			carouselItem.load();
			that.carouselItems.push(carouselItem);
		});

		//Add the start listener to the container
		this.dom.carousel.on(this.events.startEvent, function(e) {
			that.onStart(e);
		});
		
		if (!SMART.Utils.hasTouchSupport()) {
			this.dom.carousel.hover(function(e) {
				that.mouseOver = true;
				that.updateCursor();
			}, function(evt) {
				that.mouseOver = false;
				that.updateCursor();
			});
		}
		
		//Set selected item
		this.selectedItem = this.getStartItem();
		this.selectedItem.addClass("sc-selected");
		this.updatePlugin();		
	},
	
	//Initializes gradient overlays
	initGradientOverlays:function() {		
		if (this.opt.gradientOverlayVisible) {
			//Create overlays
			var leftOverlay = this.createGradientOverlay("left", this.opt.gradientStartPoint, this.opt.gradientEndPoint, this.opt.gradientOverlayColor, this.opt.gradientOverlaySize),
				rightOverlay = this.createGradientOverlay("right", this.opt.gradientStartPoint, this.opt.gradientEndPoint, this.opt.gradientOverlayColor, this.opt.gradientOverlaySize);
			
			//Append overlays
			this.dom.carousel.append(leftOverlay);
			this.dom.carousel.append(rightOverlay);			
		}		
	},
	
	//Initialize content wrapper that holds the current content
	initContentWrapper:function() {		
		var contentWrapper = $('<div class="sc-content-wrapper"></div>');		
		this.contentContainer = $('<div class="sc-content-container"></div>');			
		this.contentContainer.append('<div class="sc-content"><h2></h2><p></p></div>');
		contentWrapper.append(this.contentContainer);
		
		//Do not support IE7-IE8
		if ($.support.leadingWhitespace!=false) {
			if (this.opt.preload) {
				this.contentContainer.css({visibility:"hidden", opacity:0});
			}
		}
		
		this.dom.carousel.append(contentWrapper);		
	},
	
	//Initialize prev/next navigation buttons
	initNavigationButtons:function() {		
		var that = this;
		
		if (this.opt.navigationButtonsVisible) {
			//Create buttons
			var prevButton = $('<a href="#" class="sc-nav-button sc-prev sc-no-select"></a>');
			var nextButton = $('<a href="#" class="sc-nav-button sc-next sc-no-select"></a>');
			
			//Append buttons
			this.dom.carousel.append(prevButton);
			this.dom.carousel.append(nextButton);
			
			prevButton.click(function(e) {				
				e.preventDefault();
				that.selectPrevious(that.opt.slideSpeed);
			});
			
			nextButton.click(function(e) {
				e.preventDefault();
				that.selectNext(that.opt.slideSpeed);
			});
		}		
	},	
	
	//Initializes window resize listener
	initResizeListener:function() {		
		var that = this;
		
		//On resize update plugin
		$(window).resize(function(evt) {
			that.updatePlugin(evt);
		});		
	},
	
	//Add the keyboard navigation capability
	initKeyboardNavigation:function() {
		var that = this;
		
		if (this.opt.enableKeyboard) {
			this.dom.document.keydown(function(e) {
				//Check the source of the event
				if (e.target.type!="textarea" && e.target.type!="text") {
					switch (e.keyCode) {
						case 37: //Left arrow
							that.selectPrevious(that.opt.slideSpeed);
							break;
						case 39: //Right arrow
							that.selectNext(that.opt.slideSpeed);
							break;
					}
				}
			});
		}		
	},
	
	//Add the mouse wheel support
	initMouseWheelSupport:function() {                
		var that = this;
		var carousel = this.dom.carousel.get(0);

		if (this.opt.enableMouseWheel) {
			var onMouseWheel = function(e) {
				var delta = 0;
				
				//Prevent the default action
				if (e.preventDefault) {  
					e.preventDefault();  
				} else {  
					e.returnValue = false;  
					e.cancelBubble = true;  
				}

				//Normalize wheel delta to 1/-1
				if (e.wheelDelta) {
					delta = e.wheelDelta / 120;
				} else if (e.detail) {
					delta = -e.detail / 3;
				}
				
				// Reverse the direction of the mouse wheel
				if (that.opt.reverseMouseWheel) {
					delta *= -1;
				}

				if (delta>0) {
					that.selectPrevious(that.opt.slideSpeed);
				} else if (delta<0) {
					that.selectNext(that.opt.slideSpeed);
				}
			};
			
			//Add the mousewheel event
			if (carousel.addEventListener) {
				carousel.addEventListener("mousewheel", onMouseWheel, false);
				carousel.addEventListener("DOMMouseScroll", onMouseWheel, false); //For firefox 
			} else if (carousel.attachEvent) {
				carousel.attachEvent("onmousewheel", onMouseWheel);
			}			
		}
	},
	
	//Initializes automatic slideshow
	initAutoSlideshow:function() {		
		if (this.opt.autoSlideshow) {
			this.startAutoSlideshow();
		}		
	},
	
	//Start auto slideshow
	startAutoSlideshow:function() {		
		var that = this;
		
		//If there is not an existing timer create one
		if (!this.timer) {
			this.timer = new SMART.Timer(this.opt.autoSlideshowDelay);
			
			this.timer.subscribe(function(e) {
				if (that.selectedItem.index()<(that.carouselItems.length-1)) {
					that.selectNext(that.opt.slideSpeed);
				} else {
					if (that.opt.loop) {
						that.select(that.carouselItems[0], that.opt.slideSpeed);
					}
				}
			});
		}
		
		this.timer.start();		
	},
	
	//Stop auto slideshow
	stopAutoSlideshow:function() {		
		if (this.timer) {
			this.timer.stop();
		}		
	},
	
	//Closest item to the center is changed event
	onClosestChanged:function(item) {		
		this.setCurrentContent(item);
		
		//Fire the event
		this.dom.carousel.trigger({
			type:"smart_carousel.closestitemchanged",
			item:item
		});		
	},
	
	//Set the current content by reading values from the given item
	setCurrentContent:function(item) {		
		if (item.content.length>0) {
			this.contentContainer.find("h2").html(item.content.children("h2").html());
			this.contentContainer.find("p").html(item.content.children("p").html());
		} else {
			this.contentContainer.find("h2").empty();
			this.contentContainer.find("p").empty();
		}		
	},
	
	//Get carousel item
	getStartItem:function() {		
		var index = this.opt.startIndex;
		
		if (index==="auto") {
			index = Math.round(this.carouselItems.length/2)-1;
		}
		
		return this.carouselItems[index];		
	},
	
	//Perform a z-sort on the carousel items
	zSort:function(list) {		
		var length = this.carouselItems.length;
		
		//Sort the items in ascending order, closer comes first
		list.sort(function(a, b) {
			return a.distance-b.distance;
		});
		
		//Set the z-indexes starting from total length
		for (var i=0; i<list.length; i++) {
			var item = list[i];
			item.setZIndex(length);
			--length;
		}
		
		//Set the closest item
		if (list[0]) {
			if (this.closestItem !== list[0]) {
				this.closestItem = list[0];
				this.onClosestChanged(this.closestItem);
			}
		}
		
		//Help garbage collector
		list = null;		
	},
	
	//Select the given item
	select:function(arg, duration) {		
		//Check the type of the argument
		if (typeof(arg)==="number") {
			var item = this.carouselItems[arg];
		} else if (typeof(arg)==="object") {
			item = arg;
		}
		
		//Remove the selected class from the previous item
		if (this.selectedItem) {
			this.selectedItem.removeClass("sc-selected");
		}
		
		//Add the selected class to the current item
		item.addClass("sc-selected");
		
		//Set the selected item
		this.selectedItem = item;
		var target = this.selectedItem.getBaseOffset()+this.opt.itemWidth/2+this.opt.selectedItemDistance;
		this.container.setX(this.centerX-target, duration);
		
		//Fire the event
		this.dom.carousel.trigger({
			type:"smart_carousel.itemselected",
			item:this.selectedItem
		});		
	},
	
	//Select the previous carousel item in the queue
	selectPrevious:function(duration) {		
		var selectedIndex = this.selectedItem.index();
		
		if (selectedIndex==0) {
			selectedIndex = this.carouselItems.length;
		}
		
		this.select(selectedIndex-1, duration);		
	},
	
	//Select the next carousel item in the queue
	selectNext:function(duration) {
		var selectedIndex = this.selectedItem.index();
		
		if (selectedIndex==(this.carouselItems.length-1)) {
			selectedIndex = -1;
		}
		
		this.select(selectedIndex+1, duration);		
	},
	
	//Calculate the units which will be used on each animation frame
	calculateUnits:function() {	
		this.alphaUnit = (1-this.opt.unselectedItemAlpha)/this.opt.motionStartDistance;
		this.scaleUnit = (this.opt.selectedItemZoomFactor-this.opt.unselectedItemZoomFactor)/this.opt.motionStartDistance;
		this.extraDistanceUnit = this.opt.selectedItemDistance/this.opt.motionStartDistance;		
	},
	
	//This method is called on each animation frame
	update:function() {
		var that = this;		
		var container = this.container;
		var	containerLeft = container.getLeft();
		var	zSortList = [];
							
		for (var i=0; i<this.carouselItems.length; i++) {
			var item = this.carouselItems[i];
			var	distance = (containerLeft+item.x+this.opt.itemWidth/2)-this.centerX;
			var	absDistance = Math.abs(distance);
			
			//Calculate the extra distance		
			if (absDistance<=this.opt.motionStartDistance) {
				var alpha = this.calculateAlpha(absDistance),
					scale = this.calculateScale(absDistance),
					extraDistance = this.calculateExtraDistance(absDistance);
			} else {
				alpha = this.opt.unselectedItemAlpha;
				scale = this.opt.unselectedItemZoomFactor;
				extraDistance = 0;
			}
			
			if (absDistance <= this.centerX) {
				//Add the items within the motion start distance to the zSortList
				item.setDistance(absDistance);
				zSortList.push(item);
			}
						
			item.setAlpha(alpha);
			item.setScale(scale);
			
			//Determine the location of the item (left|right) and set the extra distance accordingly
			if (distance>0) {
				item.setX(item.getBaseOffset()+this.opt.selectedItemDistance*2-extraDistance);
			} else {
				item.setX(item.getBaseOffset()+extraDistance);
			}
			
			//Help garbage collector
			distance = absDistance = alpha = scale = extraDistance = null;
		}
		
		//z-sort the items within the motion start distance
		this.zSort(zSortList);
		
		//Update the container location
		if (this.dragging) {
			container.setX(this.targetLeft);
		}
		
		//Request a new animation frame
		window.requestAnimFrame(function() {
			that.update();
		});		
	},
	
	//Update plugin properties
	updatePlugin:function() {		
		var width = this.dom.carousel.width();
		var	height = this.dom.carousel.height();
		
		//General property updates
		this.centerX = Math.floor(width/2);
		this.centerY = Math.floor(height/2);		
		this.updateLayout();		
	},
	
	//Update plugin layout by relocating the carousel items
	updateLayout:function() {	
		var	selectedIndex = this.selectedItem.index();
			
		//Set top margin
		this.container.setTopMargin(this.opt.topMargin);
		
		for (var i=0; i<this.carouselItems.length; i++) {
			var item = this.carouselItems[i];
			var extraOffset = 0;
				
			//Update base offset
			item.updateBaseOffset();
			
			//Calculate the extra offset
			if (i==selectedIndex) {
				extraOffset = this.opt.selectedItemDistance;
			} else if (i>selectedIndex) {
				extraOffset = this.opt.selectedItemDistance*2;
			}
			
			item.setX(item.getBaseOffset()+extraOffset);
			item.setScale(this.opt.unselectedItemZoomFactor);
		}
		
		//Up scale the selected item
		this.selectedItem.setScale(this.opt.selectedItemZoomFactor);
		this.container.setX(this.centerX-this.selectedItem.x-this.opt.itemWidth/2);
	},
	
	//Update mouse cursor
	updateCursor:function() {	
		if (this.dragging) {
			SMART.Utils.setCursor("closedhand");
		} else {
			if (this.mouseOver) {
				SMART.Utils.setCursor("openhand");
			} else {
				SMART.Utils.setCursor("auto");
			}
		}
	},
	
	//Calculate alpha value of a carousel item by considering the given distance
	calculateAlpha:function(absDistance) {		
		return (this.opt.motionStartDistance-absDistance)*this.alphaUnit+this.opt.unselectedItemAlpha;		
	},
	
	//Calculates scale value of a carousel item by considering the given distance
	calculateScale:function(absDistance) {
		return (this.opt.motionStartDistance-absDistance)*this.scaleUnit+this.opt.unselectedItemZoomFactor;
	},
	
	//Calculates extra distance value of a carousel item by considering the given distance
	calculateExtraDistance:function(absDistance) {		
		return Math.ceil((this.opt.motionStartDistance-absDistance)*this.extraDistanceUnit);		
	},
	
	//Mouse clicked or the screen is touched event
	onStart:function(e) {	
		//Return if one of the navigation buttons is clicked
		if (e.target.nodeName=="A") {
			return;
		}
		
		var that = this,
			oEvt = e.originalEvent,
			lastX = startX = SMART.Utils.hasTouchSupport() ? oEvt.targetTouches[0].clientX : e.clientX,
			startY = SMART.Utils.hasTouchSupport() ? oEvt.targetTouches[0].clientY : e.clientY,
			length = this.carouselItems.length,
			firstTarget = this.centerX-(this.opt.selectedItemDistance+this.opt.itemWidth/2),
			lastTarget = firstTarget-((this.opt.itemWidth*this.opt.unselectedItemZoomFactor+this.opt.distance)*(length-1)),
			containerLeft = this.container.getLeft(),
			vx = 0,
			scrollingChecked = false,
			completeDefaultAction = false,
			isScrolling = false;		
			
		//Stop auto slideshow
		if (this.timer) {
			this.timer.stop();
		}
		
		//Add the moveEvent and endEvent listeners
		this.dom.document.on(this.events.moveEvent, onMove);
		this.dom.document.on(this.events.endEvent, onEnd);
		
		//Add touchCancel event if necessary
		if (this.events.touchCancel) {
			this.dom.document.on(this.events.touchCancel, onEnd);
		}
		
		//If there are more than 1 touch points, let the browser do the default action.
		if (SMART.Utils.hasTouchSupport()) {
			if (oEvt.touches.length>1) {
				completeDefaultAction = true;
				return;
			}
		} else {
			e.preventDefault();
		}
		
		//This method is called when the mouse or touch pointer is moved
		function onMove(e) {
			
			var oEvt = e.originalEvent,
				pointerX = SMART.Utils.hasTouchSupport() ? oEvt.touches[0].clientX : e.clientX,
				pointerY = SMART.Utils.hasTouchSupport() ? oEvt.touches[0].clientY : e.clientY,
				target = (pointerX-startX)/2 + containerLeft;
				
			//Calculate the velocity
			vx = lastX - pointerX;
			lastX = pointerX;
				
			//If there are more than 1 touch points, let the browser do the default action
			if (SMART.Utils.hasTouchSupport()) {
				if (oEvt.touches.length>1) {
					completeDefaultAction = true;
					return;
				}

				if (!scrollingChecked) {
					scrollingChecked = true;
					
					if (Math.abs(pointerY-startY) > Math.abs(pointerX-startX)+5) {
						that.isScrolling = true;
					} else {
						that.isScrolling = false;
					}
				}

				if (that.isScrolling) {
					completeDefaultAction = true;
					return;
				}
			}
			
			e.preventDefault();
			
			//Avoid dragging out of the bounds
			if (target>firstTarget+40) {
				target = firstTarget+40+(target-firstTarget)*0.2;
			}
				
			//Avoid dragging out of the bounds
			if (target<lastTarget-40) {
				target = lastTarget-40-(lastTarget-target)*0.2;
			}
			
			//Update cursor
			if (!that.dragging) {
				that.dragging = true;
				that.updateCursor();
			}
			
			that.targetLeft = target;			
		};
		
		//This method is called when the mouse is up or touch ended.
		function onEnd(e) {			
			var oEvt = e.originalEvent,
				endX = SMART.Utils.hasTouchSupport() ? oEvt.changedTouches[0].clientX : e.clientX,
				endY = SMART.Utils.hasTouchSupport() ? oEvt.changedTouches[0].clientY : e.clientY,
				slideCount = Math.round(vx/20),
				index = that.closestItem.index();
			
			//Restart auto slideshow
            if (that.timer) {
				that.timer.start();
			}
							
			//Remove event listeners
			that.dom.document.off(that.events.moveEvent, onMove);
			that.dom.document.off(that.events.endEvent, onEnd);
			
			if (that.events.touchCancel) {
				that.dom.document.off(that.events.touchCancel, onEnd);
			}			
			
			//Treat the drag as click if there is no movement
			if (Math.abs(startX-endX)==0) {
				var element = $(document.elementFromPoint(endX, endY));
				
				if (element.hasClass("sc-image")) {
					//If the parent is a link select its parent
					if (element.parent().is("a")) {
						element = element.parent();
					}
					
					var item = that.carouselItems[element.parent().index()];
					
					//Either launch the url (if any) or select the target item
					if (that.opt.selectByClick && item!==that.selectedItem) {
						that.select(item, that.opt.slideSpeed);
					} else if (that.opt.selectByClick && item===that.selectedItem) {
						that.selectNext(that.opt.slideSpeed);
					}

				} else {
					if (that.opt.selectByClick) {
						that.selectNext(that.opt.slideSpeed);
					}
				}
			} else {
				//Help user to complete his action in case the dragged distance is too small
				if (slideCount==0 && Math.abs(vx)>0 && that.closestItem.index()==that.selectedItem.index()) {
					slideCount = vx>0 ? 1 : vx<0 ? -1 : 0;
				}

				//Add the slide count to the target index
				index += slideCount;

				//Bound check
				index = index<0 ? 0 : index>length-1 ? length-1 : index;

				//Select the target item
				if (!isScrolling && !completeDefaultAction) {
					that.select(index, that.opt.slideSpeed);
				}
			}
			
			//Update the cursor
			that.dragging = false;
			that.updateCursor();			
		};
	},
	
	//All of the carousel items are loaded event
	onAllLoaded:function() {	
		var that = this;
		
		//Do not support IE7-IE8
		if ($.support.leadingWhitespace!=false) {
			var fadeWrapperIn = function() {
				that.dom.wrapper.css("visibility", "visible");
				that.dom.wrapper.animate({opacity:1}, 700);
				that.contentContainer.css("visibility", "visible");
				that.contentContainer.animate({opacity:1}, 700);
			};

			if (this.opt.preload) {
				if (this.opt.showPreloader) {
					this.preloader.fadeOut(700, fadeWrapperIn);
				} else {
					fadeWrapperIn();
				}
			}
		}		
	},
	
	//Attachs an event handler function
	on:function(events, func) {
		this.dom.carousel.on(events, null, null, func);		
	},
	
	//Selection animation has started event
	onSelectionAnimationStart:function() {		
		this.dom.carousel.trigger({
			type:"smart_carousel.selectionanimationstart",
			item:this.selectedItem
		});		
	},
	
	//Selection animation has ended event
	onSelectionAnimationEnd:function() {		
		this.dom.carousel.trigger({
			type:"smart_carousel.selectionanimationend",
			item:this.selectedItem
		});		
	},
	
	//Create gradient overlay
	createGradientOverlay:function(side, startPoint, endPoint, color, width) {		
		if (SMART.Utils.hasCanvasSupport()) {
			var overlay = $('<canvas class="sc-overlay" width="'+width+'" height="1"></canvas'),
				ctx = overlay.get(0).getContext("2d"),
				c = SMART.Utils.hexToRgb(color),
				gradient = null;

			//Set css width
			overlay.css("width", width+"px");
			
			//Add the css overlay class
			overlay.addClass("sc-overlay-"+side);
			
			//Set up the gradient direction
			if (side=="left") {
				gradient = ctx.createLinearGradient(0, 0, width, 0);
			} else if (side=="right") {
				gradient = ctx.createLinearGradient(width, 0, 0, 0);
			}
			
			//Apply gradient
			gradient.addColorStop(startPoint, "rgba("+c.r+", "+c.g+", "+c.b+", 1)");
			gradient.addColorStop(endPoint, "rgba("+c.r+", "+c.g+", "+c.b+", 0)");
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, 1);
			return overlay;
		}		
	}
	
};

/**********************
	- Utils class -
**********************/
SMART.Utils = {
	
	touchSupport:null,
	canvasSupport:null,
	transformation2dSupport:null,
	transformation3dSupport:null,
	transitionSupport:null,
	prefixedProps:[],
	
	//Detect if the browser has touch support
	hasTouchSupport:function() {		
		if (this.touchSupport===null) {
			this.touchSupport = Modernizr.touch;
		}
		
		return this.touchSupport;		
	},
	
	//Detect if the browser has canvas support
	hasCanvasSupport:function() {		
		if (this.canvasSupport===null) {
			this.canvasSupport = Modernizr.canvas;
		}
		
		return this.canvasSupport;		
	},
	
	//Detect if the browser has css 2d transformation support
	has2dTransformationSupport:function() {		
		if (this.transformation2dSupport===null) {
			this.transformation2dSupport = Modernizr.csstransforms;
		}
		
		return this.transformation2dSupport;		
	},
	
	//Detect if the browser has css 3d transformation support
	has3dTransformationSupport:function() {		
		if (this.transformation3dSupport===null) {
			this.transformation3dSupport = Modernizr.csstransforms3d;
		}
		
		return this.transformation3dSupport;		
	},
	
	//Detect if the browser has css transition support
	hasTransitionSupport:function() {		
		if (this.transitionSupport===null) {
			this.transitionSupport = Modernizr.csstransitions;
		}
		
		return this.transitionSupport;		
	},
	
	//Get prefixed version of the given css property
	getPrefixedProperty:function(prop) {		
		if (this.prefixedProps[prop]===undefined) {
			this.prefixedProps[prop] = Modernizr.prefixed(prop);
		}
		
		return this.prefixedProps[prop];		
	},
	
	//Set the mouse cursor
	setCursor:function(cursor) {
		switch (cursor) {
			case "openhand":
				$('body').css("cursor", "url(css/smart-carousel/openhand.cur), auto");
				break;
			case "closedhand":
				$('body').css("cursor", "url(css/smart-carousel/closedhand.cur), auto");
				break;
			default:
				$("body").css("cursor", cursor);
				break;
		}
	},
	
	//Convert HEX color to RGB
	hexToRgb:function(hex) {
		//Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		
		hex = hex.replace(shorthandRegex, function(m, r, g, b) {
			return r+r+g+g+b+b;
		});
	
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		
		return result ? {
			r:parseInt(result[1], 16),
			g:parseInt(result[2], 16),
			b:parseInt(result[3], 16)
		} : null;
	}
	
};

//Animation frame according to the type of the browser
window.requestAnimFrame = (function() {
	return 	window.requestAnimationFrame 		||
			window.webkitRequestAnimationFrame	||
			window.mozRequestAnimationFrame		||
			window.oRequestAnimationFrame		||
			window.msRequestAnimationFrame		||
			function(callback) {
				window.setTimeout(callback, 1000/60);
			};
})();

/*****************************
	- Image loader class -
*****************************/
SMART.ImageLoader = function(img) {
	
    this.subscribers = [];
    this.img = img;
	this.fired = false;
	
};

SMART.ImageLoader.prototype = {

    //Subscribe to be notified when the image is loaded
	subscribe:function(fn) {
        this.subscribers.push(fn);
    },

    //Unsubscribe from the subscribers list
	unsubscribe:function(fn) {
        for (var i = 0; i < this.subscribers.length; i++) {
            if (this.subscribers[i] === fn) {
                delete(this.subscribers[i]);
            }
        }
    },

    //Publish the event by calling the subscribers
    publish:function() {		
		//If the event is already fired return
		if (this.fired) {
			return;			
		} else {
			this.fired = true;
		}

        for (var i=0; i<this.subscribers.length; i++) {
            if (typeof this.subscribers[i]==="function") {
                this.subscribers[i]();
            }
        }
    },

    //Start loading the given image
    load:function() {
		var that = this;
		
        //Add an event listener to be notified when the loading process is complete
        if (this.img.addEventListener) {
            this.img.addEventListener("load", function(e) {
                that.onLoad(e);
            }, false);
        } else if (this.img.attachEvent) {
            this.img.attachEvent("onload", function(e) {
                that.onLoad(e);
            });
        }
        
        //If it's already completed, reset the src and force the load event to be fired
		if (this.img.complete || this.img.complete===undefined || this.img.readyState==="loading") {
			var src = this.img.src;
			this.img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
			this.img.src = src;
		}
    },

    //Loading process is complete
    onLoad:function(evt) {
        //IE sometimes fires for the 1x1 image that is used for the src, avoid this
        if (this.img.height>1) {
            this.publish();
        }
    }

};

/**********************
	- Timer class -
**********************/
SMART.Timer = function(delay, repeatCount) {	

	this.delay = delay || 2000;
	this.repeatCount = repeatCount || 0;
	this.currentCount = 0;
	this.intervalID = null;
	this.running = false;
	this.subscribers = [];	
	
};

SMART.Timer.prototype = {
	
	//Subscribe to be notified when a new timer event is occured
	subscribe:function(fn) {
        this.subscribers.push(fn);
    },

    //Unsubscribe from the subscribers list
	unsubscribe:function(fn) {
        for (var i=0; i<this.subscribers.length; i++) {
            if (this.subscribers[i]===fn) {
                delete(this.subscribers[i]);
            }
        }
    },

    //Publish the event by calling the subscribers
	publish:function(type) {		
        for (var i=0; i<this.subscribers.length; i++) {
            if (typeof this.subscribers[i]==="function") {
                this.subscribers[i](type);
            }
        }
    },
	
	//Reset the timer counter
	reset:function() {		
		this.currentCount = 0;		
	},
	
	//Start the timer
	start:function() {	
		var that = this;
		
		if (!this.running) {
			this.intervalID = setInterval(function() {
				that.tick();
			}, this.delay);
			
			this.running = true;
		}		
	},
	
	//Stops the timer
	stop:function() {		
		if (this.running) {
			clearInterval(this.intervalID);
			this.running = false;
		}		
	},
	
	//Timer ticked
	tick:function() {		
		++this.currentCount;
		
		// Publish the timer event
		this.publish("timer");
		
		if (this.currentCount==this.repeatCount) {
			this.reset();
			this.stop();
			
			//Publish the timer complete event
			this.publish("timercomplete");
		}		
	}
	
};

/******************************
	- Carousel item class -
******************************/
SMART.CarouselItem = function(element, carousel) {
	
	// Class properties
	this.element = element;
	this.carousel = carousel;
	this.actualWidth = carousel.opt.itemWidth;
	this.actualHeight = carousel.opt.itemHeight;
	this.x = 0;
	this.y = 0;
	this.scaledX = 0;
	this.scaledY = 0;
	this.scale = 1;
	this.alpha = 1;	
	this.width = this.actualWidth;
	this.height = this.actualHeight;
	this.baseOffset = 0;
	this.zIndex = 0;
	this.distance = -1;
	this.extraItemSize = 0;
	this.extraImageSize = 0;	
	this.url = element.children("a");
	this.imageElement = element.find("img");
	this.image = this.imageElement.get(0);
	this.content = element.children(".sc-content");
	this.subscribers = { load: [] };
	this.loaded = false;
	this.reflection = null;
	
	// Initialize the item
	this.init();
	
};

SMART.CarouselItem.prototype = {
	
	//Initialize the carousel item
	init:function() {				
		//IE7/IE8 don't scale paddings and borders, their values should be subtracted during update
		//Calculate the extra size for IE7/IE8 (Padding + border value)
		if ($.support.leadingWhitespace==false) {
			var imgPaddingSize = parseInt(this.imageElement.css("padding-left"))*2,
				imgBorderSize = parseInt(this.imageElement.css("border-left-width"))*2,
				itemPaddingSize = parseInt(this.element.css("padding-left"))*2,
				itemBorderSize = parseInt(this.element.css("border-left-width"))*2;
			this.extraImageSize = imgPaddingSize+imgBorderSize;
			this.extraItemSize = itemPaddingSize+itemBorderSize;
		}
		
		this.updateBaseOffset();		
	},
	
	//Start loading the carousel item
	load:function() {		
		var that = this;
		
		if (!this.loaded) {
			var imageLoader = new SMART.ImageLoader(this.image);
			
			imageLoader.subscribe(function() {
				that.onImageLoaded();
			});

			//Start loading the image
			imageLoader.load();
		}		
	},
	
	//Subscribe to be notified when the given event type is occured
    subscribe:function(type, fn) {		
		this.subscribers[type].push(fn);		
	},
	
	//Unsubscribe from the subscribers list
    unsubscribe:function(type, fn) {
		for (var i=0; i<this.subscribers[type].length; i++) {
			if (this.subscribers[type][i]===fn) {
				delete(this.subscribers[type][i]);
			}
		}
	},
	
	//Publish the event by calling the subscribers
    publish:function(type, args) {
		for (var i=0; i<this.subscribers[type].length; i++) {
			if (typeof this.subscribers[type][i]==="function") {
				this.subscribers[type][i](args);
			}
		}
	},
	
	//Return the index of the item
    index:function() {
        return this.element.index();
    },
	
	//Image that the carousel item holds is loaded event
	onImageLoaded:function() {		
		var that = this;
		
		//Add a reflection if requested
		if (this.carousel.opt.reflectionVisible) {
			this.reflection = SMART.CarouselItem.createReflection(
				that.imageElement,
				this.carousel.opt.reflectionSize,
				this.carousel.opt.reflectionAlpha
			);
				
			this.reflection.css({
				"float":"left",
				"clear":"both",
				"margin-top":this.carousel.opt.reflectionDistance+"px"
			});
			
			this.element.append(this.reflection);
			this.update();
		}
		
		this.loaded = true;		
		this.publish("load", this);		
	},
	
	//Set the opacity of the carousel item
	setAlpha:function(alpha) {		
		if (alpha!=this.alpha) {
			this.alpha = alpha;
			this.update();
		}		
	},
	
	//Set the x position of the carousel item
	setX:function(x) {		
		if (x!=this.x) {
			this.scaledX += (x-this.x);
			this.x = x;
			this.update();
		}		
	},
	
	//Set the y position of the carousel item
	setY:function(y) {		
		if (y!=this.y) {
			this.scaledY += (y-this.y);
			this.y = y;
			this.update();
		}		
	},
	
	//Set the x and y positions of the carousel item
	setXY:function(x, y) {		
		if (x!=this.x && y!=this.y) {
			this.scaledX += (x-this.x);
			this.scaledY += (y-this.y);
			this.x = x;
			this.y = y;
			this.update();
		}		
	},
	
	//Set the scale of the carousel item
	setScale:function(scale) {		
		if (scale!=this.scale) {
			this.scale = scale;
			this.update();
		}		
	},
	
	//Set the distance between centerX and the item
	setDistance:function(distance) {		
		this.distance = distance;		
	},
	
	//Set the css z-index of the related dom element
	setZIndex:function(index) {		
		if (index!=this.zIndex) {
			this.zIndex = index;
			this.element.css("z-index", index);
		}		
	},
	
	//Get the base offset for the item
	getBaseOffset:function() {		
		return this.baseOffset;		
	},		
	
	//Calculate and update the base offset for the item
	updateBaseOffset:function() {		
		this.baseOffset = this.index()*(this.carousel.opt.itemWidth*this.carousel.opt.unselectedItemZoomFactor+this.carousel.opt.distance);
	},
	
	//Update each item location
	update:function() {		
		if (SMART.Utils.has2dTransformationSupport()) {
			var transformStatement = "translate("+ this.x+"px, "+this.y+"px) scale("+this.scale+")";
			
			//Trigger hardware accelaration by adding a z property
			if (SMART.Utils.has3dTransformationSupport()) {
				transformStatement += " translateZ(0)";
			}
			
			this.element.css(SMART.Utils.getPrefixedProperty("transform"), transformStatement);
			this.element.css("opacity", this.alpha);
		} else {
			var targetWidth = this.actualWidth*this.scale,
				targetHeight = this.actualHeight*this.scale;
				
			//Update properties
			this.scaledX = this.x+(this.actualWidth-targetWidth)/2;
			this.scaledY = this.y+(this.actualHeight-targetHeight)/2;
			this.width = targetWidth;
			this.height = targetHeight;
			
			//Target item properties
			var props = {
				left:this.scaledX,
				top:this.scaledY,
				width:this.width-this.extraItemSize,
				height:this.height-this.extraItemSize
			};

			//Target image properties
			var imageProps = {
				width:props.width-this.extraImageSize,
				height:props.height-this.extraImageSize
			};
			
			//If there is a reflection apply scale
			if (this.carousel.opt.reflectionVisible && !SMART.Utils.hasCanvasSupport()) {
				//Add the opacity property				
				imageProps.opacity = this.alpha;
				
				if (this.reflection) {
					this.reflection.css({
						width:props.width,
						height:props.height,
						filter:SMART.CarouselItem.getAlphaFilterStatement(this.carousel.opt.reflectionAlpha, this.carousel.opt.reflectionSize, this.carousel.opt.itemHeight)
					});
				}
			} else {
				props.opacity = this.alpha;
			}
			
			this.element.css(props);
			this.imageElement.css(imageProps);
		}		
	},
	
	//Launch the url related with this carousel item
	launchURL:function() {
		if (this.url.length>0) {
			var target = this.url.attr("target");
			target = target ? target : "_self";			
			window.open(this.url.attr("href"), target);
		}		
	},
	
	//Add the specified class to the related dom element
	addClass:function(className) {		
		this.element.addClass(className);		
	},
	
	//Remove the given class from the related dom element
	removeClass:function(className) {		
		this.element.removeClass(className);		
	}
	
};


//Generates a transparent mirrored reflection by using the given image
SMART.CarouselItem.createReflection = function(image, size, alpha) {	
	//Get dimensions
	var imageWidth = image.width(),
		imageHeight = image.height(),
		reflection = null;
	
	if (SMART.Utils.hasCanvasSupport()) {
		reflection = $("<canvas>"),		
			ctx = reflection.get(0).getContext("2d");
		
		//Set the width and height of the reflection
		reflection.attr({width: imageWidth, height: size});
		reflection.addClass("reflection");
		ctx.save();
		ctx.translate(0, imageHeight);
		ctx.scale(1, -1);
		ctx.drawImage(image.get(0), 0, 0, imageWidth, imageHeight);
		ctx.restore();
		ctx.globalCompositeOperation = "destination-out";

		//Paint the alpha gradient mask
		var gradient = ctx.createLinearGradient(0, 0, 0, size);
		gradient.addColorStop(0, "rgba(0, 0, 0, " + (1 - alpha) + ")");
		gradient.addColorStop(1, "rgba(0, 0, 0, 1.0)");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, imageWidth, size);
	} else {
		reflection = $("<img>");
		reflection.attr({src:image.get(0).src});
		reflection.css("filter", SMART.CarouselItem.getAlphaFilterStatement(alpha, size, imageHeight));
	}		
	
	return reflection;	
};

//Returns an alpha filter statement for IE
SMART.CarouselItem.getAlphaFilterStatement = function(alpha, size, height) {		
	return "flipv progid:DXImageTransform.Microsoft.Alpha(opacity="+(alpha*100)+", style=1, finishOpacity=0, startx=0, starty=0, finishx=0, finishy="+(size/height*100)+")";
};

/**************************
	- Container class -
**************************/
SMART.Container = function(element, carousel) {
	
	this.element = element;
	this.carousel = carousel;
	this.x = 0;
	
};

SMART.Container.prototype = {
	
	//Set the x position of the container
	setX:function(x, duration) {		
		this.x = x;
		this.update(duration);		
	},
	
	//Get the left position of the container
	getLeft:function() {		
		return this.element.position().left;		
	},
	
	//Set the top margin of the container
	setTopMargin:function(margin) {		
		var itemHeight = this.carousel.opt.itemHeight;
		
		//Find the margin diff at the top of the item
		if (margin=="auto") {
			margin = (this.carousel.dom.carousel.height()-itemHeight*this.carousel.opt.selectedItemZoomFactor)/2;		
		}
		
		//Add the calculated margin to the 0
		margin = -itemHeight*(1-this.carousel.opt.selectedItemZoomFactor)/2+margin;
		this.element.css("margin-top", margin+'px');		
	},
	
	//Update the position of the container with animation
	update:function(duration) {		
		var that = this;
				
		//If the duration is set animate properties, otherwise set them directly
		if (duration) {
			//Let the carousel know the selection animation has started
			this.carousel.onSelectionAnimationStart();
			
			//Listen for the transitionEnd event
			this.element.on("webkitTransitionEnd transitionend oTransitionEnd otransitionend MSTransitionEnd", function(evt) {
				that.element.off("webkitTransitionEnd transitionend oTransitionEnd otransitionend MSTransitionEnd");
				
				//Let the carousel know the selection animation has ended
				that.carousel.onSelectionAnimationEnd();
			});
			
			if (SMART.Utils.hasTransitionSupport()) {
				this.element.css(SMART.Utils.getPrefixedProperty("transition"), "left "+(duration/1000)+"s ease-out");
				this.element.css("left", this.x);
			} else {
				this.element.stop().animate({left:this.x}, duration, function() {
					//Let the carousel know the selection animation has ended
					that.carousel.onSelectionAnimationEnd();
				});
			}						
		} else {
			//Remove the previous transition if there is any
			if (SMART.Utils.hasTransitionSupport()) {
				this.element.css(SMART.Utils.getPrefixedProperty("transition"), "");
			}
			
			this.element.stop().css({left:this.x});
		}		
	}
	
};

/************************
	- Init carousel -
************************/
(function($) {
	
	$.fn.smartCarousel = function(options) {
		
		//An array to hold the carousel instances
		var result = [];
		
		this.each(function() {
			var element = $(this);
			
			//Check to see if an instance has been previously created
			if (!element.data("smart-carousel")) {
				//Create a new Carousel instance and attach the instance to the element)
				element.data("smart-carousel", new SMART.Carousel(element, options));
			}
			
			//Add the instance to the result array
			result.push(element.data("smart-carousel"));
		});
		
		//Return an array if there are more than one carousel
		return result.length>1 ? result : result[0];
		
	};
	
})(jQuery);

/* Modernizr 2.8.3 (Custom Build) | MIT & BSD
 * Build: http://modernizr.com/download/#-cssanimations-csstransforms-csstransforms3d-csstransitions-canvas-canvastext-touch-cssclasses-prefixed-teststyles-testprop-testallprops-prefixes-domprefixes
 */
;window.Modernizr=function(a,b,c) {function z(a) {j.cssText=a}function A(a,b) {return z(m.join(a+";")+(b||""))}function B(a,b) {return typeof a===b}function C(a,b) {return!!~(""+a).indexOf(b)}function D(a,b) {for(var d in a) {var e=a[d];if (!C(e,"-")&&j[e]!==c)return b=="pfx"?e:!0}return!1}function E(a,b,d) {for(var e in a) {var f=b[a[e]];if (f!==c)return d===!1?a[e]:B(f,"function")?f.bind(d||b):f}return!1}function F(a,b,c) {var d=a.charAt(0).toUpperCase()+a.slice(1),e=(a+" "+o.join(d+" ")+d).split(" ");return B(b,"string")||B(b,"undefined")?D(e,b):(e=(a+" "+p.join(d+" ")+d).split(" "),E(e,b,c))}var d="2.8.3",e={},f=!0,g=b.documentElement,h="modernizr",i=b.createElement(h),j=i.style,k,l={}.toString,m=" -webkit- -moz- -o- -ms- ".split(" "),n="Webkit Moz O ms",o=n.split(" "),p=n.toLowerCase().split(" "),q={},r={},s={},t=[],u=t.slice,v,w=function(a,c,d,e) {var f,i,j,k,l=b.createElement("div"),m=b.body,n=m||b.createElement("body");if (parseInt(d,10))while(d--)j=b.createElement("div"),j.id=e?e[d]:h+(d+1),l.appendChild(j);return f=["&#173;",'<style id="s',h,'">',a,"</style>"].join(""),l.id=h,(m?l:n).innerHTML+=f,n.appendChild(l),m||(n.style.background="",n.style.overflow="hidden",k=g.style.overflow,g.style.overflow="hidden",g.appendChild(n)),i=c(l,a),m?l.parentNode.removeChild(l):(n.parentNode.removeChild(n),g.style.overflow=k),!!i},x={}.hasOwnProperty,y;!B(x,"undefined")&&!B(x.call,"undefined")?y=function(a,b) {return x.call(a,b)}:y=function(a,b) {return b in a&&B(a.constructor.prototype[b],"undefined")},Function.prototype.bind||(Function.prototype.bind=function(b) {var c=this;if (typeof c!="function")throw new TypeError;var d=u.call(arguments,1),e=function() {if (this instanceof e) {var a=function() {};a.prototype=c.prototype;var f=new a,g=c.apply(f,d.concat(u.call(arguments)));return Object(g)===g?g:f}return c.apply(b,d.concat(u.call(arguments)))};return e}),q.canvas=function() {var a=b.createElement("canvas");return!!a.getContext&&!!a.getContext("2d")},q.canvastext=function() {return!!e.canvas&&!!B(b.createElement("canvas").getContext("2d").fillText,"function")},q.touch=function() {var c;return"ontouchstart"in a||a.DocumentTouch&&b instanceof DocumentTouch?c=!0:w(["@media (",m.join("touch-enabled),("),h,")","{#modernizr{top:9px;position:absolute}}"].join(""),function(a) {c=a.offsetTop===9}),c},q.cssanimations=function() {return F("animationName")},q.csstransforms=function() {return!!F("transform")},q.csstransforms3d=function() {var a=!!F("perspective");return a&&"webkitPerspective"in g.style&&w("@media (transform-3d),(-webkit-transform-3d) {#modernizr{left:9px;position:absolute;height:3px;}}",function(b,c) {a=b.offsetLeft===9&&b.offsetHeight===3}),a},q.csstransitions=function() {return F("transition")};for(var G in q)y(q,G)&&(v=G.toLowerCase(),e[v]=q[G](),t.push((e[v]?"":"no-")+v));return e.addTest=function(a,b) {if (typeof a=="object")for(var d in a)y(a,d)&&e.addTest(d,a[d]);else{a=a.toLowerCase();if (e[a]!==c)return e;b=typeof b=="function"?b():b,typeof f!="undefined"&&f&&(g.className+=" "+(b?"":"no-")+a),e[a]=b}return e},z(""),i=k=null,e._version=d,e._prefixes=m,e._domPrefixes=p,e._cssomPrefixes=o,e.testProp=function(a) {return D([a])},e.testAllProps=F,e.testStyles=w,e.prefixed=function(a,b,c) {return b?F(a,b,c):F(a,"pfx")},g.className=g.className.replace(/(^|\s)no-js(\s|$)/,"$1$2")+(f?" js "+t.join(" "):""),e}(this,this.document);



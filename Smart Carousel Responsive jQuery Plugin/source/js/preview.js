$(document).ready(function() {
	
	//Scroll
	$("ul.navbar-nav li a").click(function(e){
		var content = $(this).attr("href");
		var checkURL = content.match(/^#([^\/]+)$/i);
		var scroll_offset = -72;
		
		if (checkURL) {
			$.scrollTo($(content), 700, {
				offset:scroll_offset
			});
		} else {
			window.location = content;
		}
		
		e.preventDefault();
	});
	
	$("ul.navbar-nav li").click(function () {
		$('ul.navbar-nav li').removeClass("active");
		$(this).addClass("active");
	});
	
	var lastId;
	var top_menu = $("ul.navbar-nav");
	var top_menu_height = top_menu.outerHeight()+500;
	var menu_items = top_menu.find("a");
	
	scroll_items = menu_items.map(function() {
		var content = $(this).attr("href");
		var checkURL = content.match(/^#([^\/]+)$/i);
		
		if (checkURL) {
			var item = $($(this).attr("href"));
			if (item.length) return item;
		}
	});
	
	$(window).scroll(function () {
		var from_top = $(this).scrollTop()+top_menu_height;
		var cur = scroll_items.map(function() {
			if ($(this).offset().top<from_top) return this;
		});
		
		cur = cur[cur.length-1];
		var id = cur && cur.length ? cur[0].id : "";
		
		if (lastId!==id) {
			lastId = id;
			menu_items.parent().removeClass("active").end().filter("[href=#"+id+"]").parent().addClass("active");
		}
	});
		
	if (window.location.hash) {
		var destination = window.location.hash;
		window.location.hash = "";
		
		$(window).load(function() {
			setTimeout(function() {
				window.location.hash = destination;
			}, 300);
		});
	}
	
});
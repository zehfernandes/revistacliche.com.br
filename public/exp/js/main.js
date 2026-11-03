$(function(){

	/*EXP visited pages: each page sets whatPage before loading this file*/
	var pages = [];
	try { pages = (localStorage.getItem('pages_visit') || '').split(',').filter(Boolean); } catch (e) {}

	if (jQuery.inArray(whatPage, pages) == -1) {
		pages.push(whatPage);
	}
	try { localStorage.setItem('pages_visit', pages.join(',')); } catch (e) {}

	$.each(pages, function( index, value ) {
		$("."+value).css('background','#fad54a');
	});
	$('.experience-amount').text(pages.length * 100 + '/500');

	/*EXP hover*/
	$( ".experience-bars li" ).hover(function() {
		$(this).addClass('hover');
	}, function() {
		$(this).removeClass('hover');
	});


	/*Sidebar Mobile*/
	$( "#mobile-sidebar" ).click(function(e) {

		var $_bar = $('.experience-bars');

		if (  !$_bar.hasClass('open') ) {
			$_bar.addClass('open');
			$_bar.css('height', $(document).height() );
			$(this).html('Close');
		} else {
			$_bar.removeClass('open');
			$(this).html('Menu');
		}

		e.preventDefault();
	});



	/*INIT*/
	$('audio').mediaelementplayer({
		audioWidth: 490,
		audioHeight: 34,
		enableAutosize: true,
		features: ['playpause','progress','current','volume']
	});

});
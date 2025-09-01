/*
	Massively by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

/**
 * main.js - Page initialization and UI behaviours.
 *
 * Summary:
 * This module initializes UI behaviours (parallax background, navigation panel,
 * scrolly, intro visibility) and provides a parallax plugin ($.fn._parallax).
 *
 * Expected runtime dependencies (globals provided by the environment):
 * - jQuery ($)
 * - breakpoints (object with .on)
 * - browser (object describing client browser)
 * - scrollex, scrolly, panel (jQuery plugins)
 *
 * Refactor notes:
 * - Internal helpers isolate DOM access and event binding to improve testability.
 * - Defensive checks guard against missing DOM elements or plugin failures.
 * - Minimal behavioral changes; this file preserves original runtime side-effects.
 */

(function($) {

	// ---------------------------
	// Cached DOM references
	// ---------------------------

	const $window = $(window);
	const $body = $('body');
	const $wrapper = $('#wrapper');
	const $header = $('#header');
	const $nav = $('#nav');
	const $main = $('#main');

	let $navPanelToggle = null;
	let $navPanel = null;
	let $navPanelInner = null;

	// ---------------------------
	// Helper utilities
	// ---------------------------

	/**
	 * Safely find elements within a context. Returns a jQuery object.
	 * If the selector yields no results, still returns an empty jQuery object.
	 * @param {jQuery|Element|string} context Context to query (or selector string for global).
	 * @param {string} [selector] Selector to find inside context. If omitted, context is used as selector.
	 * @returns {jQuery}
	 */
	const safeFind = function(context, selector) {
		try {
			if (selector === undefined) {
				return $(context || []);
			}
			const $ctx = (context && context.jquery) ? context : $(context);
			return $ctx.find(selector);
		} catch (err) {
			// Defensive: on unexpected errors, return empty jQuery collection.
			if (console && console.error) console.error('safeFind error:', err);
			return $();
		}
	};

	/**
	 * Bind a namespaced event to the window object.
	 * @param {string} namespace Event namespace (e.g., 'scroll._parallax').
	 * @param {Function} handler Event handler.
	 */
	const bindWindowEvent = function(namespace, handler) {
		try {
			$window.on(namespace, handler);
		} catch (err) {
			if (console && console.error) console.error('bindWindowEvent error:', err);
		}
	};

	/**
	 * Unbind a namespaced event from the window object.
	 * @param {string} namespace Event namespace to remove.
	 */
	const unbindWindowEvent = function(namespace) {
		try {
			$window.off(namespace);
		} catch (err) {
			if (console && console.error) console.error('unbindWindowEvent error:', err);
		}
	};

	/**
	 * Safely execute a function that interacts with external plugins or globals.
	 * Errors are caught and logged but do not interrupt runtime.
	 * @param {Function} fn Function to execute.
	 */
	const safeExecute = function(fn) {
		try {
			fn();
		} catch (err) {
			if (console && console.error) console.error('safeExecute caught error:', err);
		}
	};

	// ---------------------------
	// Breakpoints configuration
	// ---------------------------

	try {
		breakpoints({
			default:   ['1681px',   null       ],
			xlarge:    ['1281px',   '1680px'   ],
			large:     ['981px',    '1280px'   ],
			medium:    ['737px',    '980px'    ],
			small:     ['481px',    '736px'    ],
			xsmall:    ['361px',    '480px'    ],
			xxsmall:   [null,       '360px'    ]
		});
	} catch (err) {
		if (console && console.error) console.error('breakpoints initialization failed:', err);
	}

	// ---------------------------
	// Parallax plugin
	// ---------------------------

	/**
	 * Applies parallax scrolling to an element's background image.
	 * Preserves the original public signature: $.fn._parallax(intensity)
	 *
	 * @param {number} intensity Multiplier intensity for parallax effect (0 disables).
	 * @return {jQuery} jQuery object (supports chaining)
	 */
	$.fn._parallax = function(intensity) {

		const $localWindow = $(window);
		const $elements = $(this);

		// If no elements or disabled via intensity 0, return jQuery object directly.
		if ($elements.length === 0 || intensity === 0) {
			return $elements;
		}

		// If multiple elements, initialize each individually.
		if ($elements.length > 1) {
			for (let i = 0; i < $elements.length; i++) {
				$($elements[i])._parallax(intensity);
			}
			return $elements;
		}

		// Default intensity if not provided.
		if (!intensity) intensity = 0.25;

		// Initialize parallax for the single element in the collection.
		$elements.each(function() {

			const $section = $(this);

			// Create a dedicated background element inside the section.
			const $bg = $('<div class="bg"></div>').appendTo($section);

			// Handlers to enable/disable parallax behaviour.
			const enableParallax = function() {

				$bg
					.removeClass('fixed')
					.css('transform', 'matrix(1,0,0,1,0,0)');

				bindWindowEvent('scroll._parallax', function() {
					// Compute relative position and apply transform.
					const pos = parseInt($localWindow.scrollTop(), 10) - parseInt($section.position().top, 10);
					$bg.css('transform', 'matrix(1,0,0,1,0,' + (pos * intensity) + ')');
				});
			};

			const disableParallax = function() {

				$bg
					.addClass('fixed')
					.css('transform', 'none');

				unbindWindowEvent('scroll._parallax');
			};

			// Disable parallax for known poor-performance environments.
			if (browser && (
				browser.name === 'ie' ||
				browser.name === 'edge' ||
				(window.devicePixelRatio && window.devicePixelRatio > 1) ||
				browser.mobile
			)) {
				disableParallax();
			} else {
				// Use breakpoints to toggle parallax on larger screens.
				try {
					breakpoints.on('>large', enableParallax);
					breakpoints.on('<=large', disableParallax);
				} catch (err) {
					// If breakpoints isn't available, default to enabling the effect.
					if (console && console.error) console.error('breakpoints._parallax binding failed:', err);
					enableParallax();
				}
			}

		});

		// Ensure layout updates on load/resize.
		$localWindow
			.off('load._parallax resize._parallax')
			.on('load._parallax resize._parallax', function() {
				$localWindow.trigger('scroll');
			});

		return $elements;

	};

	// ---------------------------
	// Initialization routines
	// ---------------------------

	// Play initial animations on page load.
	$window.on('load', function() {
		try {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		} catch (err) {
			if (console && console.error) console.error('initial animation error:', err);
		}
	});

	// Scrolly: safe plugin invocation
	safeExecute(function() {
		const $scrolly = safeFind(document, '.scrolly');
		if ($scrolly.length) $scrolly.scrolly();
	});

	// Background parallax for wrapper.
	safeExecute(function() {
		if ($wrapper && $wrapper.length) $wrapper._parallax(0.925);
	});

	// ---------------------------
	// Navigation panel (toggle + panel)
	// ---------------------------

	/**
	 * Create and insert the navigation toggle into the DOM.
	 * Also attaches scrollex handlers to change styling when scrolling past header.
	 */
	const createNavPanelToggle = function() {

		// Build toggle anchor.
		$navPanelToggle = $(
			'<a href="#navPanel" id="navPanelToggle">Menu</a>'
		).appendTo($wrapper);

		// If header is missing, bail out.
		if (!$header || $header.length === 0) return;

		// Change toggle styling once we've scrolled past the header.
		try {
			$header.scrollex({
				bottom: '5vh',
				enter: function() {
					$navPanelToggle.removeClass('alt');
				},
				leave: function() {
					$navPanelToggle.addClass('alt');
				}
			});
		} catch (err) {
			// If scrollex isn't available, don't block overall initialization.
			if (console && console.error) console.error('scrollex for header failed:', err);
		}
	};

	/**
	 * Create the navigation panel, insert into the DOM and wire responsive behavior.
	 */
	const createNavPanel = function() {

		$navPanel = $(
			'<div id="navPanel">' +
				'<nav>' +
				'</nav>' +
				'<a href="#navPanel" class="close"></a>' +
			'</div>'
		)
			.appendTo($body);

		// Configure panel plugin options within a safe execution block.
		safeExecute(function() {
			if ($navPanel && $.isFunction($navPanel.panel)) {
				$navPanel.panel({
					delay: 500,
					hideOnClick: true,
					hideOnSwipe: true,
					resetScroll: true,
					resetForms: true,
					side: 'right',
					target: $body,
					visibleClass: 'is-navPanel-visible'
				});
			}
		});

		// Get inner nav container.
		$navPanelInner = $navPanel.children('nav');

		// Move nav content between the main nav and the panel on breakpoint changes.
		const $navContent = $nav.children();

		try {
			breakpoints.on('>medium', function() {
				// NavPanel -> Nav.
				$navContent.appendTo($nav);

				// Remove alternative icon styling for larger screens.
				$nav.find('.icons, .icon').removeClass('alt');
			});

			breakpoints.on('<=medium', function() {
				// Nav -> NavPanel.
				$navContent.appendTo($navPanelInner);

				// Add alternative icon styling for smaller screens.
				$navPanelInner.find('.icons, .icon').addClass('alt');
			});
		} catch (err) {
			if (console && console.error) console.error('nav panel breakpoint binding failed:', err);
		}

		// Hack: Disable transitions on older Windows Phone versions.
		try {
			if (browser && browser.os === 'wp' && browser.osVersion < 10) {
				$navPanel.css('transition', 'none');
			}
		} catch (err) {
			if (console && console.error) console.error('navPanel OS hack failed:', err);
		}
	};

	// Create nav toggle and panel.
	createNavPanelToggle();
	createNavPanel();

	// ---------------------------
	// Intro behaviour
	// ---------------------------

	const $intro = $('#intro');

	if ($intro && $intro.length > 0) {

		// Fix flex min-height on IE via resize handler.
		if (browser && browser.name === 'ie') {
			$window.on('resize.ie-intro-fix', function() {
				try {
					const h = $intro.height();
					if (h > $window.height()) $intro.css('height', 'auto');
					else $intro.css('height', h);
				} catch (err) {
					if (console && console.error) console.error('ie-intro-fix error:', err);
				}
			}).trigger('resize.ie-intro-fix');
		}

		// Hide intro on scroll for screens larger than 'small'.
		try {
			breakpoints.on('>small', function() {
				$main.unscrollex();

				$main.scrollex({
					mode: 'bottom',
					top: '25vh',
					bottom: '-50vh',
					enter: function() {
						$intro.addClass('hidden');
					},
					leave: function() {
						$intro.removeClass('hidden');
					}
				});
			});
		} catch (err) {
			if (console && console.error) console.error('intro >small scrollex binding failed:', err);
		}

		// Hide intro on scroll for screens smaller than or equal to 'small'.
		try {
			breakpoints.on('<=small', function() {
				$main.unscrollex();

				$main.scrollex({
					mode: 'middle',
					top: '15vh',
					bottom: '-15vh',
					enter: function() {
						$intro.addClass('hidden');
					},
					leave: function() {
						$intro.removeClass('hidden');
					}
				});
			});
		} catch (err) {
			if (console && console.error) console.error('intro <=small scrollex binding failed:', err);
		}
	}

})(jQuery);
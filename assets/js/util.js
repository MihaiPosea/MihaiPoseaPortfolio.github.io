/**
 * util.js - Lightweight UI utility plugins for jQuery
 *
 * Exports:
 *  - $.fn.navList: Generate an indented list of links from a nav (returns HTML string).
 *  - $.fn.panel: Panel-ify an element (attach show/hide behavior, events).
 *  - $.fn.placeholder: Apply a placeholder polyfill for inputs on browsers that lack support.
 *  - $.prioritize: Move specified elements to/from the top of their parents.
 *
 * Notes:
 *  - This file encapsulates private helpers to avoid polluting globals.
 *  - Public function names and signatures are preserved.
 *  - Internal code organized into sections: private helpers, core utilities, public API.
 *  - Basic input validation and narrow try/catch blocks added around DOM interactions.
 *
 * Global dependencies: jQuery
 */
(function($) {
	'use strict';

	/**
	 * Private helpers and pure logic encapsulated in an IIFE to avoid global pollution.
	 */
	var UtilHelpers = (function() {
		// Constants
		var DEFAULT_PLACEHOLDER_SELECTOR = 'input[type=text],textarea';
		var DEFAULT_PASSWORD_SELECTOR = 'input[type=password]';

		/**
		 * Returns true if value is a non-empty string.
		 * @param {*} value
		 * @returns {boolean}
		 */
		function isStringNotEmpty(value) {
			return typeof value === 'string' && value.length > 0;
		}

		/**
		 * Safely obtains an attribute value from a jQuery element.
		 * @param {jQuery} $el
		 * @param {string} attrName
		 * @returns {string|undefined}
		 */
		function safeAttr($el, attrName) {
			try {
				return $el.attr(attrName);
			} catch (err) {
				console.warn('safeAttr: failed to read attribute', attrName, err);
				return undefined;
			}
		}

		/**
		 * Build anchor HTML string for navList.
		 * Kept pure (no DOM side effects).
		 * @param {string} linkText
		 * @param {string|undefined} href
		 * @param {string|undefined} target
		 * @param {number} indent
		 * @returns {string}
		 */
		function buildAnchorHTML(linkText, href, target, indent) {
			var targetAttr = (isStringNotEmpty(target) ? ' target="' + target + '"' : '');
			var hrefAttr = (isStringNotEmpty(href) ? ' href="' + href + '"' : '');
			var classes = 'link depth-' + indent;
			var indentSpan = '<span class="indent-' + indent + '"></span>';
			return '<a class="' + classes + '"' + targetAttr + hrefAttr + '>' + indentSpan + linkText + '</a>';
		}

		/**
		 * Normalize a configuration object by applying defaults.
		 * Shallow-merge only top-level keys.
		 * @param {Object} defaults
		 * @param {Object} userConfig
		 * @returns {Object}
		 */
		function normalizeConfig(defaults, userConfig) {
			var cfg = {};
			var key;
			for (key in defaults) {
				if (Object.prototype.hasOwnProperty.call(defaults, key)) {
					cfg[key] = defaults[key];
				}
			}
			if (userConfig && typeof userConfig === 'object') {
				for (key in userConfig) {
					if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
						cfg[key] = userConfig[key];
					}
				}
			}
			return cfg;
		}

		/**
		 * Ensure the provided target is a jQuery object.
		 * If not, attempt to wrap it.
		 * @param {*} candidate
		 * @returns {jQuery}
		 */
		function ensureJQueryObject(candidate) {
			try {
				if (candidate instanceof $) {
					return candidate;
				}
				return $(candidate);
			} catch (err) {
				console.error('ensureJQueryObject: invalid target', err);
				return $(); // empty jQuery
			}
		}

		return {
			DEFAULT_PLACEHOLDER_SELECTOR: DEFAULT_PLACEHOLDER_SELECTOR,
			DEFAULT_PASSWORD_SELECTOR: DEFAULT_PASSWORD_SELECTOR,
			isStringNotEmpty: isStringNotEmpty,
			safeAttr: safeAttr,
			buildAnchorHTML: buildAnchorHTML,
			normalizeConfig: normalizeConfig,
			ensureJQueryObject: ensureJQueryObject
		};
	})();

	/* ===========================
	   Core utilities (private)
	   =========================== */

	/**
	 * Validate that 'this' within a plugin context is a jQuery collection.
	 * Returns a jQuery object for chaining even when empty.
	 * @param {*} ctx
	 * @returns {jQuery}
	 */
	function validateThisAsJQuery(ctx) {
		try {
			if (ctx && ctx.jquery) return ctx;
		} catch (err) {
			// fallthrough
		}
		return $(ctx);
	}

	/* ===========================
	   Public API (jQuery plugins)
	   =========================== */

	/**
	 * Generate an indented list of links from a nav. Meant for use with panel().
	 * Returns a string containing concatenated anchor tags.
	 * Public signature unchanged: $.fn.navList = function()
	 *
	 * @return {string} HTML string with generated anchors.
	 */
	$.fn.navList = function() {
		var $el = validateThisAsJQuery(this);

		// If no elements, return empty string.
		if ($el.length === 0) {
			return '';
		}

		// Only operate on the first element in collection (original behavior iterates anchors within context).
		var $context = $el.first();
		var anchorElements;
		try {
			anchorElements = $context.find('a');
		} catch (err) {
			console.error('navList: failed to find anchors in context', err);
			return '';
		}

		var htmlFragments = [];
		anchorElements.each(function() {
			var $anchor = $(this);
			var indent = Math.max(0, $anchor.parents('li').length - 1);
			var hrefVal = UtilHelpers.safeAttr($anchor, 'href');
			var targetVal = UtilHelpers.safeAttr($anchor, 'target');
			var text = '';
			try {
				text = $anchor.text();
			} catch (err) {
				console.warn('navList: failed to read anchor text', err);
				text = '';
			}
			htmlFragments.push(UtilHelpers.buildAnchorHTML(text, hrefVal, targetVal, indent));
		});

		return htmlFragments.join('');
	};

	/**
	 * Panel-ify an element.
	 * Public signature unchanged: $.fn.panel = function(userConfig)
	 *
	 * @param {Object} userConfig User configuration for panel behavior.
	 * @return {jQuery} jQuery object for chaining.
	 */
	$.fn.panel = function(userConfig) {
		var $collection = validateThisAsJQuery(this);

		// No elements?
		if ($collection.length === 0) {
			return $collection;
		}

		// Multiple elements? Apply to each individually and return collection.
		if ($collection.length > 1) {
			$collection.each(function() {
				$(this).panel(userConfig);
			});
			return $collection;
		}

		// Single element handling
		var $element = $collection.first();
		var $body = $('body');
		var $window = $(window);
		var id = UtilHelpers.safeAttr($element, 'id');
		var defaults = {
			delay: 0,
			hideOnClick: false,
			hideOnEscape: false,
			hideOnSwipe: false,
			resetScroll: false,
			resetForms: false,
			side: null,
			target: $element,
			visibleClass: 'visible'
		};

		var config = UtilHelpers.normalizeConfig(defaults, userConfig);

		// Ensure target is a jQuery object.
		config.target = UtilHelpers.ensureJQueryObject(config.target);

		// Attach an instance method to hide the panel.
		$element._hide = function(event) {
			try {
				if (!config.target.hasClass(config.visibleClass)) return;
			} catch (err) {
				console.warn('panel._hide: failed to check visibility', err);
				return;
			}

			if (event && typeof event.preventDefault === 'function') {
				try {
					event.preventDefault();
					event.stopPropagation();
				} catch (err) {
					console.warn('panel._hide: failed to cancel event', err);
				}
			}

			try {
				config.target.removeClass(config.visibleClass);
			} catch (err) {
				console.error('panel._hide: failed to remove visible class', err);
			}

			// Post-hide operations after delay.
			window.setTimeout(function() {
				try {
					if (config.resetScroll) $element.scrollTop(0);
				} catch (err) {
					console.warn('panel._hide: resetScroll failed', err);
				}

				try {
					if (config.resetForms) {
						$element.find('form').each(function() {
							try {
								this.reset();
							} catch (err) {
								console.warn('panel._hide: form reset failed', err);
							}
						});
					}
				} catch (err) {
					console.warn('panel._hide: resetForms error', err);
				}
			}, config.delay);
		};

		// Vendor-specific CSS tweaks (best-effort).
		try {
			$element.css('-ms-overflow-style', '-ms-autohiding-scrollbar').css('-webkit-overflow-scrolling', 'touch');
		} catch (err) {
			console.warn('panel: vendor CSS tweaks failed', err);
		}

		// Hide on link click inside panel.
		if (config.hideOnClick) {
			try {
				$element.find('a').css('-webkit-tap-highlight-color', 'rgba(0,0,0,0)');
			} catch (err) {
				console.warn('panel: failed to set tap highlight color', err);
			}

			$element.on('click', 'a', function(event) {
				var $anchor = $(this);
				var hrefVal = UtilHelpers.safeAttr($anchor, 'href');
				var targetVal = UtilHelpers.safeAttr($anchor, 'target');

				// If href invalid or points to panel itself, ignore.
				if (!isValidHrefForPanelClick(hrefVal, id)) return;

				// Cancel original event.
				try {
					event.preventDefault();
					event.stopPropagation();
				} catch (err) {
					console.warn('panel: failed to cancel event on link click', err);
				}

				// Hide the panel.
				$element._hide();

				// Redirect to href after delay+10ms.
				window.setTimeout(function() {
					try {
						if (targetVal === '_blank') window.open(hrefVal);
						else window.location.href = hrefVal;
					} catch (err) {
						console.error('panel: failed to redirect to href', err);
					}
				}, config.delay + 10);
			});
		}

		// Touch start: record position (narrow try/catch).
		$element.on('touchstart', function(event) {
			try {
				var touch = event.originalEvent && event.originalEvent.touches && event.originalEvent.touches[0];
				if (!touch) return;
				$element.touchPosX = touch.pageX;
				$element.touchPosY = touch.pageY;
			} catch (err) {
				// Non-critical
			}
		});

		// Touch move: handle swipe-to-hide and prevent overscroll.
		$element.on('touchmove', function(event) {
			try {
				if ($element.touchPosX === null || $element.touchPosY === null) return;

				var touch = event.originalEvent.touches[0];
				var diffX = $element.touchPosX - touch.pageX;
				var diffY = $element.touchPosY - touch.pageY;
				var elementHeight = $element.outerHeight();
				var scrollDistance = ($element.get(0).scrollHeight - $element.scrollTop());

				if (config.hideOnSwipe) {
					var isSwipe = evaluateSwipe(config.side, diffX, diffY);
					if (isSwipe) {
						$element.touchPosX = null;
						$element.touchPosY = null;
						$element._hide();
						// Stop further handling.
						return false;
					}
				}

				// Prevent vertical overscroll
				if (($element.scrollTop() < 0 && diffY < 0) || (scrollDistance > (elementHeight - 2) && scrollDistance < (elementHeight + 2) && diffY > 0)) {
					try {
						event.preventDefault();
						event.stopPropagation();
					} catch (err) {
						// ignore
					}
				}
			} catch (err) {
				console.warn('panel: touchmove handler error', err);
			}
		});

		// Prevent certain events inside the panel from bubbling.
		$element.on('click touchend touchstart touchmove', function(event) {
			try {
				event.stopPropagation();
			} catch (err) {
				// ignore
			}
		});

		// Hide panel if a child anchor tag pointing to its ID is clicked.
		if (isStringNotEmpty(id)) {
			$element.on('click', 'a[href="#' + id + '"]', function(event) {
				try {
					event.preventDefault();
					event.stopPropagation();
				} catch (err) {
					// ignore
				}
				config.target.removeClass(config.visibleClass);
			});
		}

		// Body: Hide panel on body click/tap.
		$body.on('click touchend', function(event) {
			$element._hide(event);
		});

		// Body: Toggle panel on anchor click that targets this panel by ID.
		if (isStringNotEmpty(id)) {
			$body.on('click', 'a[href="#' + id + '"]', function(event) {
				try {
					event.preventDefault();
					event.stopPropagation();
				} catch (err) {
					// ignore
				}
				config.target.toggleClass(config.visibleClass);
			});
		}

		// Window: Hide on Escape if configured.
		if (config.hideOnEscape) {
			$window.on('keydown', function(event) {
				try {
					if (event.keyCode === 27) $element._hide(event);
				} catch (err) {
					// ignore
				}
			});
		}

		return $element;

		/* -------------------------
		   Helper functions scoped to panel
		   ------------------------- */

		/**
		 * Determine whether an href should trigger navigation/hide logic.
		 * Mirrors original logic: ignore empty, '#', panel id URL.
		 * @param {string|undefined} href
		 * @param {string|undefined} panelId
		 * @returns {boolean}
		 */
		function isValidHrefForPanelClick(href, panelId) {
			if (!UtilHelpers.isStringNotEmpty(href)) return false;
			if (href === '#') return false;
			if (panelId && href === '#' + panelId) return false;
			return true;
		}

		/**
		 * Evaluate swipe direction relative to configured side.
		 * Returns true if swipe magnitude and direction meets threshold.
		 * @param {string|null} side
		 * @param {number} diffX
		 * @param {number} diffY
		 * @returns {boolean}
		 */
		function evaluateSwipe(side, diffX, diffY) {
			var boundary = 20;
			var delta = 50;
			switch (side) {
				case 'left':
					return (diffY < boundary && diffY > (-1 * boundary)) && (diffX > delta);
				case 'right':
					return (diffY < boundary && diffY > (-1 * boundary)) && (diffX < (-1 * delta));
				case 'top':
					return (diffX < boundary && diffX > (-1 * boundary)) && (diffY > delta);
				case 'bottom':
					return (diffX < boundary && diffX > (-1 * boundary)) && (diffY < (-1 * delta));
				default:
					return false;
			}
		}
	};

	/**
	 * Apply "placeholder" attribute polyfill to one or more forms.
	 * Public signature unchanged: $.fn.placeholder = function()
	 *
	 * @return {jQuery} jQuery object for chaining.
	 */
	$.fn.placeholder = function() {
		var $collection = validateThisAsJQuery(this);

		// Browser supports native placeholder? Then no-op.
		try {
			if (typeof (document.createElement('input')).placeholder !== 'undefined') return $collection;
		} catch (err) {
			// If feature detection fails, proceed to polyfill attempt.
		}

		if ($collection.length === 0) {
			return $collection;
		}

		if ($collection.length > 1) {
			$collection.each(function() {
				$(this).placeholder();
			});
			return $collection;
		}

		var $form = $collection.first();

		// Text and TextArea handling
		try {
			$form.find(UtilHelpers.DEFAULT_PLACEHOLDER_SELECTOR).each(function() {
				var $input = $(this);
				var placeholderText = UtilHelpers.safeAttr($input, 'placeholder') || '';
				if ($input.val() === '' || $input.val() === placeholderText) {
					$input.addClass('polyfill-placeholder').val(placeholderText);
				}
			}).on('blur', function() {
				var $i = $(this);
				try {
					if ($i.attr('name') && $i.attr('name').match(/-polyfill-field$/)) return;
					if ($i.val() === '') {
						$i.addClass('polyfill-placeholder').val($i.attr('placeholder'));
					}
				} catch (err) {
					// ignore
				}
			}).on('focus', function() {
				var $i = $(this);
				try {
					if ($i.attr('name') && $i.attr('name').match(/-polyfill-field$/)) return;
					if ($i.val() === $i.attr('placeholder')) {
						$i.removeClass('polyfill-placeholder').val('');
					}
				} catch (err) {
					// ignore
				}
			});
		} catch (err) {
			console.warn('placeholder: text/textarea handling failed', err);
		}

		// Password handling: create a text clone to show placeholder.
		try {
			$form.find(UtilHelpers.DEFAULT_PASSWORD_SELECTOR).each(function() {
				var $password = $(this);
				var cloneHtml;
				try {
					cloneHtml = $('<div>').append($password.clone()).remove().html().replace(/type="password"/i, 'type="text"').replace(/type=password/i, 'type=text');
				} catch (err) {
					console.warn('placeholder: password clone generation failed', err);
					return;
				}

				var $clone = $(cloneHtml);
				if (UtilHelpers.isStringNotEmpty($password.attr('id'))) $clone.attr('id', $password.attr('id') + '-polyfill-field');
				if (UtilHelpers.isStringNotEmpty($password.attr('name'))) $clone.attr('name', $password.attr('name') + '-polyfill-field');

				$clone.addClass('polyfill-placeholder').val($clone.attr('placeholder')).insertAfter($password);

				if ($password.val() === '') $password.hide();
				else $clone.hide();

				$password.on('blur', function(event) {
					try {
						event.preventDefault();
					} catch (err) {
						// ignore
					}
					var $x = $password.parent().find('input[name=' + $password.attr('name') + '-polyfill-field]');
					if ($password.val() === '') {
						$password.hide();
						$x.show();
					}
				});

				$clone.on('focus', function(event) {
					try {
						event.preventDefault();
					} catch (err) {
						// ignore
					}
					var $i = $clone.parent().find('input[name=' + $clone.attr('name').replace('-polyfill-field', '') + ']');
					$clone.hide();
					$i.show().focus();
				}).on('keypress', function(event) {
					try {
						event.preventDefault();
					} catch (err) {
						// ignore
					}
					$clone.val('');
				});
			});
		} catch (err) {
			console.warn('placeholder: password handling failed', err);
		}

		// Form events: submit and reset
		try {
			$form.on('submit', function() {
				$form.find('input[type=text],input[type=password],textarea').each(function() {
					var $i = $(this);
					try {
						if ($i.attr('name') && $i.attr('name').match(/-polyfill-field$/)) $i.attr('name', '');
						if ($i.val() === $i.attr('placeholder')) {
							$i.removeClass('polyfill-placeholder');
							$i.val('');
						}
					} catch (err) {
						// ignore
					}
				});
			}).on('reset', function(event) {
				try {
					event.preventDefault();
				} catch (err) {
					// ignore
				}

				try {
					$form.find('select').val($('option:first').val());
				} catch (err) {
					// ignore
				}

				$form.find('input,textarea').each(function() {
					var $i = $(this);
					var x;
					try {
						$i.removeClass('polyfill-placeholder');
						switch (this.type) {
							case 'submit':
							case 'reset':
								break;
							case 'password':
								$i.val($i.attr('defaultValue'));
								x = $i.parent().find('input[name=' + $i.attr('name') + '-polyfill-field]');
								if ($i.val() === '') {
									$i.hide();
									x.show();
								} else {
									$i.show();
									x.hide();
								}
								break;
							case 'checkbox':
							case 'radio':
								$i.attr('checked', $i.attr('defaultValue'));
								break;
							case 'text':
							case 'textarea':
								$i.val($i.attr('defaultValue'));
								if ($i.val() === '') {
									$i.addClass('polyfill-placeholder');
									$i.val($i.attr('placeholder'));
								}
								break;
							default:
								$i.val($i.attr('defaultValue'));
								break;
						}
					} catch (err) {
						// ignore per-element errors
					}
				});
			});
		} catch (err) {
			console.warn('placeholder: form events setup failed', err);
		}

		return $form;
	};

	/**
	 * Moves elements to/from the first positions of their respective parents.
	 * Public signature unchanged: $.prioritize = function($elements, condition)
	 *
	 * @param {jQuery|string} $elements Elements (or selector) to move.
	 * @param {boolean} condition If true, moves elements to the top. Otherwise, moves elements back to their original locations.
	 */
	$.prioritize = function($elements, condition) {
		var key = '__prioritize';

		// Expand $elements if it's not already a jQuery object.
		var $coll;
		try {
			$coll = (typeof $elements !== 'undefined' && $elements !== null && $elements.jquery) ? $elements : $($elements);
		} catch (err) {
			console.error('prioritize: invalid elements parameter', err);
			return;
		}

		// Iterate through elements.
		$coll.each(function() {
			var $elem = $(this);
			var $parent = $elem.parent();

			if ($parent.length === 0) return;

			// If not moved yet.
			if (!$elem.data(key)) {
				// If condition false, do nothing.
				if (!condition) return;

				var $placeholder = $elem.prev();
				// If already first child, nothing to do.
				if ($placeholder.length === 0) return;

				// Move element to top of parent.
				$elem.prependTo($parent);
				// Mark element as moved, storing placeholder reference.
				$elem.data(key, $placeholder);
			} else {
				// Already moved.
				if (condition) return;

				var $savedPlaceholder = $elem.data(key);
				// Move element back after stored placeholder.
				$elem.insertAfter($savedPlaceholder);
				// Remove marker.
				$elem.removeData(key);
			}
		});
	};

	/* ===========================
	   Utility functions exposed to this module scope
	   (kept private to avoid polluting global namespace)
	   =========================== */

	/**
	 * Helper wrapper to check a value is non-empty string, exposes to module scope.
	 * @param {*} value
	 * @returns {boolean}
	 */
	function isStringNotEmpty(value) {
		return UtilHelpers.isStringNotEmpty(value);
	}

})(jQuery);
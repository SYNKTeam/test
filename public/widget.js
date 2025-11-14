(function() {
  'use strict';

  // Configuration
  const DEFAULT_CONFIG = {
    apiUrl: window.location.origin + '/api',
    position: 'bottom-right', // bottom-right, bottom-left
    primaryColor: '#111827',
    autoOpen: false
  };

  // Merge user config with defaults
  const config = Object.assign({}, DEFAULT_CONFIG, window.SYNKChatConfig || {});

  // Prevent multiple instances
  if (window.SYNKChatWidget) {
    console.warn('[SYNK Chat] Widget already loaded');
    return;
  }

  // Create widget container
  const container = document.createElement('div');
  container.id = 'synk-chat-widget-root';
  container.style.cssText = 'position: fixed; z-index: 9999;';

  // Position the widget
  if (config.position === 'bottom-left') {
    container.style.bottom = '24px';
    container.style.left = '24px';
  } else {
    container.style.bottom = '24px';
    container.style.right = '24px';
  }

  // Wait for DOM to be ready
  function initWidget() {
    document.body.appendChild(container);

    // Load React and ReactDOM from CDN
    const reactScript = document.createElement('script');
    reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
    reactScript.crossOrigin = 'anonymous';

    const reactDOMScript = document.createElement('script');
    reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
    reactDOMScript.crossOrigin = 'anonymous';

    // Load widget CSS
    const widgetCSS = document.createElement('link');
    widgetCSS.rel = 'stylesheet';
    widgetCSS.href = config.cssUrl || window.location.origin + '/assets/index.css';

    // Load widget JS
    const widgetScript = document.createElement('script');
    widgetScript.type = 'module';
    widgetScript.src = config.jsUrl || window.location.origin + '/assets/index.js';

    // Load in sequence
    document.head.appendChild(widgetCSS);
    document.head.appendChild(reactScript);

    reactScript.onload = function() {
      document.head.appendChild(reactDOMScript);

      reactDOMScript.onload = function() {
        document.head.appendChild(widgetScript);

        widgetScript.onload = function() {
          console.log('[SYNK Chat] Widget loaded successfully');

          // Expose API
          window.SYNKChatWidget = {
            open: function() {
              window.dispatchEvent(new CustomEvent('synk-chat-open'));
            },
            close: function() {
              window.dispatchEvent(new CustomEvent('synk-chat-close'));
            },
            toggle: function() {
              window.dispatchEvent(new CustomEvent('synk-chat-toggle'));
            }
          };

          // Auto-open if configured
          if (config.autoOpen) {
            setTimeout(function() {
              window.SYNKChatWidget.open();
            }, 1000);
          }
        };

        widgetScript.onerror = function() {
          console.error('[SYNK Chat] Failed to load widget script');
        };
      };

      reactDOMScript.onerror = function() {
        console.error('[SYNK Chat] Failed to load React DOM');
      };
    };

    reactScript.onerror = function() {
      console.error('[SYNK Chat] Failed to load React');
    };
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();

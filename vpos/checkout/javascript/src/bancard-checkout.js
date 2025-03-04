import exceptions from './bancard-checkout-exceptions';
import constants from './constants';

const CHECKOUT_IFRAME_URL = `${constants.BANCARD_URL}/checkout/new`;
const NEW_CARD_IFRAME_URL = `${constants.BANCARD_URL}/checkout/register_card/new`;
const ZIMPLE_IFRAME_URL = `${constants.BANCARD_URL}/checkout/zimple/new`;
const ALLOWED_STYLES_URL = `${constants.BANCARD_URL}/checkout/allowed_styles`;
const CONFIRMATION_IFRAME_URL = `${constants.BANCARD_URL}/alias_token/confirmation/new`;
const PREAUTHORIZATION_IFRAME_URL = `${constants.BANCARD_URL}/checkout/preauthorization/new`;

const Settings = {
  handler: 'default',
};

const internalMethods = {
  redirect: (data, callback) => {
    const { message, details, return_url: returnUrl } = data;

    let url = internalMethods.addParamToUrl(returnUrl, 'status', message);

    if (typeof details !== 'undefined') {
      url = internalMethods.addParamToUrl(url, 'description', details);
    }

    if (callback != null){
      callback(data);
    } else {
      window.location.replace(url);
    }
  },

  updateMinHeight: (iframeHeight, divId) => {
    const iframe = document.querySelectorAll(`#${divId} iframe`)[0];
    iframe.style.minHeight = `${iframeHeight}px`;
  },

  setListener: (divId, callback) => {
    window.addEventListener('message', e => internalMethods.responseHandler(e, divId, callback));
  },

  responseHandler: (event, divId, callback) => {
    if (event.origin !== constants.BANCARD_URL) {
      return;
    }

    if (typeof event.data.iframeHeight !== 'undefined') {
      internalMethods.updateMinHeight(event.data.iframeHeight, divId);
      return;
    }

    if (Settings.handler === 'default') {
      internalMethods.redirect(event.data, callback);
    } else {
      Settings.handler(event.data);
    }
  },

  addParamToUrl: (url, param, value) => {
    const lastUrlChar = url.slice(-1);
    const paramValue = `${param}=${value}`;
    let newUrl = url;

    if (['&', '?'].indexOf(lastUrlChar) > -1) {
      newUrl += paramValue;
    } else if (url.indexOf('?') > -1) {
      newUrl = `${newUrl}&${paramValue}`;
    } else {
      newUrl = `${newUrl}?${paramValue}`;
    }

    return newUrl;
  },

  request: async (method, url) => {
    const response = await fetch(url, { method });
    const data = await response.json();

    return data;
  },

  validateStyles: (styles) => {
    internalMethods
      .request('GET', ALLOWED_STYLES_URL)
      .then((data) => {
        const allowedStyles = data.allowed_styles;

        internalMethods.checkInvalidStyles(allowedStyles, styles);
      });
  },

  checkInvalidStyles: (allowedStyles, styles) => {
    const stylesNames = Object.keys(styles);

    stylesNames.forEach((styleName) => {
      if (typeof allowedStyles[styleName] === 'undefined') {
        console.warn(`Invalid Style Object: the style ${styleName} is not allowed`);
      } else {
        let showWarning = false;

        if (allowedStyles[styleName] === 'color') {
          if (styles[styleName].match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/) == null) {
            showWarning = true;
          }
        } else if (!['true', 'false', true, false].includes(styles[styleName])) {
          showWarning = true;
        }

        if (showWarning) {
          console.warn(`Invalid Value: the value ${styles[styleName]} for the style ${styleName} is not valid.`);
        }
      }
    });
  },

  initializeIframe: (divId, iFrameUrl, options, callback) => {
    if (typeof divId !== 'string' || divId === '') {
      throw new exceptions.InvalidParameter('Div id');
    }

    const iframeContainer = window.document.getElementById(divId);

    if (!iframeContainer) {
      throw new exceptions.DivDoesNotExist(divId);
    }

    let newIframeUrl = iFrameUrl;

    if (typeof options !== 'undefined') {
      if (typeof options.styles !== 'undefined') {
        internalMethods.validateStyles(options.styles);

        const styles = encodeURIComponent(JSON.stringify(options.styles));
        newIframeUrl = internalMethods.addParamToUrl(newIframeUrl, 'styles', styles);
      }

      if (typeof options.responseHandler !== 'undefined') {
        Settings.handler = options.responseHandler;
      }
    }

    const iframe = window.document.createElement('iframe');

    iframe.src = newIframeUrl;
    iframe.style.width = '100%';
    iframe.style.borderWidth = '0px';

    iframeContainer.innerHTML = '';
    iframeContainer.appendChild(iframe);

    internalMethods.setListener(divId, callback);
  },

  createForm: ({
    divId, processId, options, url, callback
  }) => {
    if (typeof processId !== 'string' || processId === '') {
      throw new exceptions.InvalidParameter('Process id');
    }

    const iFrameUrl = internalMethods.addParamToUrl(url, 'process_id', processId);

    internalMethods.initializeIframe(divId, iFrameUrl, options, callback);
  },

  loadPinPad: ({
    divId, aliasToken, options, url,
  }) => {
    if (typeof aliasToken !== 'string' || aliasToken === '') {
      throw new exceptions.InvalidParameter('Alias token');
    }

    const iFrameUrl = internalMethods.addParamToUrl(url, 'alias_token', aliasToken);

    internalMethods.initializeIframe(divId, iFrameUrl, options);
  },

  clearElement: (element) => {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  },
};

class Bancard {
  get Checkout() {
    return {
      createForm: (divId, processId, options, callback) => {
        this.divId = divId;
        this.callback = callback;
        internalMethods.createForm({
          divId, processId, options, url: CHECKOUT_IFRAME_URL, callback: callback
        });
      },
    };
  }

  get Cards() {
    return {
      createForm: (divId, processId, options, callback) => {
        this.divId = divId;
        internalMethods.createForm({
          divId, processId, options, url: NEW_CARD_IFRAME_URL, callback: callback
        });
      },
    };
  }

  get Zimple() {
    return {
      createForm: (divId, processId, options, callback) => {
        this.divId = divId;
        internalMethods.createForm({
          divId, processId, options, url: ZIMPLE_IFRAME_URL, callback: callback
        });
      },
    };
  }

  get Confirmation() {
    return {
      loadPinPad: (divId, aliasToken, options, callback) => {
        this.divId = divId;
        internalMethods.loadPinPad({
          divId, aliasToken, options, url: CONFIRMATION_IFRAME_URL, callback: callback
        });
      },
    };
  }

  get Preauthorization() {
    return {
      createForm: (divId, processId, options, callback) => {
        this.divId = divId;
        internalMethods.createForm({
          divId, processId, options, url: PREAUTHORIZATION_IFRAME_URL, callback: callback
        });
      },
    };
  }

  destroy() {
    const iframeContainer = window.document.getElementById(this.divId);

    window.removeEventListener('message', internalMethods.responseHandler);

    if (iframeContainer) {
      internalMethods.clearElement(iframeContainer);
    }

    this.divId = null;
  }
}

export default Bancard;

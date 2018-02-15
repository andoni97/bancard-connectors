import Bancard from '../bancard-checkout';

describe('Bancard', () => {
  let instance;
  beforeEach(() => { instance = new Bancard(); });

  describe('when valid div', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="targetDiv" />';
      instance.Checkout.createForm('targetDiv', '1234');
      window.location.replace = jest.fn();
    });

    afterEach(() => { instance.destroy(); });

    test('It creates the iframe', () => {
      expect(document.querySelectorAll('iframe').length).toBe(1);
    });

    test('Iframe points to correct URL', () => {
      expect(document.querySelectorAll('iframe')[0].getAttribute('src'))
        .toBe('https://desa.infonet.com.py:8085/checkout/new?process_id=1234');
    });

    test('It redirects to correct URL', (done) => {
      instance.setBancardUrl(''); // This is needed because jsdom doesn't have an origin
      const url = 'http://example.com';
      const message = 'sample';

      window.addEventListener('message', () => {
        expect(window.location.replace).toBeCalledWith(`${url}?status=${message}`);
        done();
      });

      window.postMessage({ return_url: url, message }, '*');
    });

    describe('When invalid styles', () => {
      const customStyles = {
        'wrong-style': '#FFFFFF',
        'header-text-color': '#FFFFFF',
        'header-show': 'wrong-value',
      };

      const options = { styles: customStyles };

      beforeEach(() => { instance.Checkout.createForm('targetDiv', '1234', options); });

      afterEach(() => { instance.destroy(); });

      const allowedStyles = {
        'header-background-color': 'color',
        'header-text-color': 'color',
        'header-show': 'boolean',
      };

      global.console = { warn: jest.fn() };
      fetch.mockResponse(JSON.stringify({ allowed_styles: allowedStyles }));

      test('It throws a warning', () => {
        expect(global.console.warn)
          .toHaveBeenCalledWith('Invalid Value: the value wrong-value for the style header-show is not valid.');
        expect(global.console.warn)
          .toHaveBeenCalledWith('Invalid Style Object: the style wrong-style is not allowed');
      });
    });

    describe('When destroying the library', () => {
      test("It's correctly destroyed", () => {
        instance.destroy();

        expect(document.querySelectorAll('iframe').length).toBe(0);
      });

      test("Calling destroy twice doesn't break the page", () => {
        instance.destroy();
        instance.destroy();
      });

      test('It can be reinitialized correctly', () => {
        instance.Checkout.createForm('targetDiv', '1234');

        expect(document.querySelectorAll('iframe').length).toBe(1);
      });
    });
  });

  describe('When invalid div', () => {
    afterEach(() => { instance.destroy(); });

    test('It throws exception', () => {
      expect(() => { instance.Checkout.createForm('nonexistentDiv', '1234'); })
        .toThrowError(instance.Exceptions.DivDoesNotExist);
    });
  });

  describe('When invalid process_id', () => {
    afterEach(() => { instance.destroy(); });

    test('It throws exception', () => {
      expect(() => { instance.Checkout.createForm('targetDiv', ''); })
        .toThrowError(instance.Exceptions.InvalidParameter);
    });

    test('It throws exception', () => {
      expect(() => { instance.Checkout.createForm('targetDiv', 23); })
        .toThrowError(instance.Exceptions.InvalidParameter);
    });
  });
});

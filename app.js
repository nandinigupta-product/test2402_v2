/*
  Forex Widget - Static replica (no build, no server APIs)
  Data sources (relative): ./data/cities.json, ./data/currencies.json, ./data/rates.json

  If the widget looks blank:
  - Open DevTools Console and Network tab
  - Ensure you're NOT opening via file:// (fetch will fail)
  - Host via GitHub Pages / any static server
*/
(function () {
  var ROOT_ID = 'fx-widget-root';

  // Inline SVG icon helper (keeps widget build-less and dependency-free)
  function svgIcon(name, className) {
    var cls = className || '';
    var common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    switch (name) {
      case 'x':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
      case 'chevronDown':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M6 9l6 6 6-6"/></svg>';
      case 'search':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
      case 'truck':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/></svg>';
      case 'inr':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M7 6h10"/><path d="M7 10h10"/><path d="M7 6c3 6 10 6 10 6"/><path d="M7 18l6-8"/></svg>';
      case 'trendingDown':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M23 18h-6"/><path d="M23 18v-6"/></svg>';
      case 'banknote':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M2 8h20v8H2z"/><path d="M6 8c0 2-2 2-2 2v4s2 0 2 2"/><path d="M18 8c0 2 2 2 2 2v4s-2 0-2 2"/><circle cx="12" cy="12" r="2"/></svg>';
      case 'creditCard':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>';
      case 'shield':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6z"/></svg>';
      case 'tag':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M20 13l-7 7-11-11V2h7z"/><circle cx="7.5" cy="7.5" r="1"/></svg>';
      case 'copy':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      case 'arrowRight':
        return '<svg viewBox="0 0 24 24" class="' + cls + '" ' + common + '><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>';
      default:
        return '';
    }
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function loadJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
      return res.json();
    });
  }

  function fmtINR(value) {
    var n = Number(value || 0);
    // en-IN formatting for commas
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function getTatText() {
    var now = new Date();
    var cutoffHour = 13; // 1 PM
    var day = now.getDay(); // 0 Sun .. 6 Sat
    var beforeCutoff = now.getHours() < cutoffHour;

    var delivery = new Date(now);
    var sameDay = false;

    if (day === 0) {
      // Sunday -> Monday
      delivery.setDate(delivery.getDate() + 1);
    } else if (day === 6 && !beforeCutoff) {
      // Sat after cutoff -> Monday
      delivery.setDate(delivery.getDate() + 2);
    } else if (beforeCutoff) {
      sameDay = true;
    } else {
      delivery.setDate(delivery.getDate() + 1);
    }

    var isMobile = window.matchMedia && window.matchMedia('(max-width: 639px)').matches;
    var opts = isMobile ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' };
    var d = delivery.toLocaleDateString('en-IN', opts);

    if (sameDay) return 'Get delivery by today, 9:00 PM';
    // if delivery is tomorrow relative to now
    var tom = new Date(now); tom.setDate(tom.getDate() + 1);
    var isTomorrow = delivery.toDateString() === tom.toDateString();
    if (isTomorrow) return 'Get delivery by tomorrow, 9:00 PM';
    return 'Get delivery by ' + d + ', 9:00 PM';
  }

  function renderBase(root) {
    root.innerHTML = `
      <div class="w-full max-w-[460px] mx-auto">
        <div class="bg-white rounded-md shadow-lg border border-gray-200 overflow-visible relative">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <div class="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md whitespace-nowrap" data-testid="badge-limited">Limited Time Offer</div>
          </div>

          <div class="bg-[#093562] px-4 sm:px-5 pt-5 pb-3 rounded-t-md relative">
            <button type="button" id="fx-close-widget" class="absolute top-3 right-3 rounded-md p-1 text-white opacity-80 hover:opacity-100" aria-label="Close" data-testid="button-close">
              <span class="sr-only">Close</span>
              ${svgIcon('x', 'w-4 h-4')}
            </button>
            <div class="flex flex-col items-center justify-center w-full pr-10" data-testid="title-with-logo">
              <img src="./images/bmf-logo.png" alt="BookMyForex" class="h-8 w-auto object-contain" />
              <h2 class="mt-1 text-lg font-semibold text-white text-center" data-testid="text-widget-title">Buy Forex Online</h2>
            </div>
            <div class="flex items-center justify-between mt-2" data-testid="header-callouts">
              <div class="flex items-center gap-1">
                ${svgIcon('trendingDown', 'w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFB427] flex-shrink-0')}
                <span class="text-[11px] sm:text-[13px] text-white font-semibold whitespace-nowrap">Best Rates</span>
              </div>
              <div class="flex items-center gap-1">
                ${svgIcon('truck', 'w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFB427] flex-shrink-0')}
                <span class="text-[11px] sm:text-[13px] text-white font-semibold whitespace-nowrap">Doorstep Delivery</span>
              </div>
              <div class="flex items-center gap-1">
                ${svgIcon('inr', 'w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFB427] flex-shrink-0')}
                <span class="text-[11px] sm:text-[13px] text-white font-semibold whitespace-nowrap">Pay on Delivery</span>
              </div>
            </div>
          </div>

          <div class="p-4 sm:p-5">
            <form id="fx-form" class="space-y-3 sm:space-y-4">
              <div id="fx-tabs" class="flex rounded-md border border-gray-300 overflow-hidden" data-testid="tabs-product">
                <button type="button" id="tab-notes" class="flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center bg-[#093562] text-white" data-testid="tab-notes">
                  ${svgIcon('banknote', 'w-4 h-4 mr-1.5 flex-shrink-0')}
                  Currency Notes
                </button>
                <button type="button" id="tab-card" class="flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100" data-testid="tab-card">
                  ${svgIcon('creditCard', 'w-4 h-4 mr-1.5 flex-shrink-0')}
                  Forex Card
                </button>
              </div>

              <div class="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-md px-3 py-2" data-testid="delivery-tat-bar">
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-2">
                    ${svgIcon('truck', 'w-4 h-4 text-blue-600 flex-shrink-0')}
                    <span id="tat-text" class="text-[11px] sm:text-[12px] text-blue-800 font-semibold truncate" data-testid="delivery-tat">...</span>
                  </div>
                  <div class="text-[10px] text-blue-700 ml-6" data-testid="delivery-tat-sub">...</div>
                </div>

                <!-- City selector (compact) -->
                <div class="relative" id="city-selector">
                  <button type="button" id="city-trigger" class="flex items-center gap-1 text-blue-600 font-semibold text-[12px] sm:text-[13px] hover:text-blue-700 transition-colors flex-shrink-0" data-testid="select-city" aria-expanded="false">
                    <span id="city-trigger-label">Select City</span>
                    ${svgIcon('chevronDown', 'w-3.5 h-3.5')}
                  </button>

                  <div id="city-popover" class="hidden absolute right-0 mt-2 w-[280px] p-0 rounded-md shadow-lg border border-gray-200 bg-white z-50">
                    <div class="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
                      <div class="flex items-center border-b px-3" cmdk-input-wrapper="">
                        ${svgIcon('search', 'mr-2 h-4 w-4 shrink-0 opacity-50')}
                        <input id="city-search" class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Search city..." />
                      </div>
                      <div id="city-list" class="max-h-[260px] overflow-y-auto overflow-x-hidden"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Currency</label>

                <div class="relative" id="currency-selector">
                  <button type="button" id="currency-trigger" class="inline-flex items-center justify-between w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-none font-normal" aria-expanded="false" data-testid="select-currency">
                    <span class="flex items-center gap-2" id="currency-trigger-label">
                      <span class="text-gray-400">Select currency...</span>
                    </span>
                    ${svgIcon('chevronDown', 'ml-2 h-3.5 w-3.5 shrink-0 text-gray-400')}
                  </button>

                  <div id="currency-popover" class="hidden absolute left-0 mt-2 w-full sm:w-[340px] p-0 rounded-md shadow-lg border border-gray-200 bg-white z-50">
                    <div class="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
                      <div class="flex items-center border-b px-3" cmdk-input-wrapper="">
                        ${svgIcon('search', 'mr-2 h-4 w-4 shrink-0 opacity-50')}
                        <input id="currency-search" class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Search currency..." />
                      </div>
                      <div id="currency-list" class="max-h-[280px] overflow-y-auto overflow-x-hidden"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block" data-testid="label-amount">AMOUNT (<span id="amount-currency">USD</span>)</label>
                <div data-testid="amount-row">
                  <input id="amount-input" type="text" inputmode="numeric" pattern="[0-9,]*" maxlength="11" placeholder="Enter amount" class="w-full h-12 rounded-md bg-white border border-gray-300 text-base font-semibold pl-3 pr-3 focus:outline-none focus:ring-2 focus:ring-[#093562]/30 focus:border-[#093562]" data-testid="input-amount" />
                  <span id="amount-max" class="hidden text-[11px] text-gray-400 mt-1 block" data-testid="text-max-limit"></span>

                  <div id="rate-display" class="hidden flex items-center justify-between mt-2 min-w-0" data-testid="rate-display">
                    <div class="text-[13px] leading-[18px] text-gray-400" data-testid="text-rate">
                      <span>Rate: </span>
                      <span id="rate-text" class="text-gray-600">₹0.00/USD</span>
                    </div>
                    <div class="flex items-baseline gap-1.5" data-testid="text-converted-amount">
                      <span class="text-[13px] font-bold text-[#093562] flex-shrink-0">Total:</span>
                      <span id="total-text" class="text-[20px] font-extrabold text-[#093562] whitespace-nowrap" data-testid="text-total-value">₹0</span>
                    </div>
                  </div>
                </div>

                  <div id="brg-inline" class="hidden flex items-center gap-1.5 mt-1 text-[11px] text-gray-500" data-testid="brg-inline">
                    ${svgIcon('shield', 'w-3 h-3 text-green-500 flex-shrink-0')}
                    <span class="font-medium">Best Rate Guarantee</span>
                  </div>

              </div>

              

              <div id="coupon-banner" class="hidden flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-2 justify-between bg-emerald-50 border border-emerald-200 border-dashed rounded-md px-3 py-2" data-testid="coupon-banner">
                <div class="flex items-start gap-2 min-w-0">
                  <span class="mt-0.5 text-emerald-700 flex-shrink-0">${svgIcon('tag','w-4 h-4','')}</span>
                  <div class="min-w-0">
                    <div class="text-[13px] font-semibold text-emerald-800" id="coupon-title">Cashback applied</div>
                    <div class="text-[12px] text-emerald-700" id="coupon-subtitle">Discount applied on checkout</div>
                  </div>
                </div>
                <button type="button" id="coupon-copy-btn" class="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-100 border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-200/40 whitespace-nowrap" data-testid="coupon-copy">
                  ${svgIcon('copy','w-4 h-4','')}
                  <span id="coupon-copy-text">Copy Code</span>
                </button>
              </div>

              <div id="savings-banner" class="hidden flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2" data-testid="savings-banner">
                ${svgIcon('trendingDown', 'w-4 h-4 text-green-600 flex-shrink-0')}
                <span class="text-xs text-green-700 font-medium">You save upto <span class="font-bold" id="savings-text">₹0</span> vs banks & airports</span>
              </div>

              <div class="space-y-2">
                <div class="flex flex-col gap-3 items-stretch">
                  <button type="submit" id="submit-btn" class="w-full h-11 rounded-md text-[14px] font-bold bg-[#FFB427] hover:bg-[#e6a223] text-white uppercase tracking-wider border-0 shadow-none ring-0 outline-none focus:ring-0 focus-visible:ring-0 whitespace-nowrap flex items-center justify-center gap-2 flex-nowrap px-3" data-testid="button-submit">
                    <span>Book This Order</span>
                    ${svgIcon('arrowRight', 'w-4 h-4 shrink-0')}
                  </button>

                  <a id="wa-btn" href="#" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" class="w-full h-11 rounded-md flex items-center justify-center gap-2 text-[14px] font-semibold text-[#25D366] border border-[#25D366]/40 hover:bg-[#25D366]/5 transition-colors" data-testid="button-whatsapp">
                    <img src="./assets/whatsapp.png" alt="" class="w-5 h-5 flex-shrink-0" />
                    <span class="whitespace-nowrap">Forex on WhatsApp</span>
                  </a>
                </div>
</form>
          </div>
        </div>
      </div>
    `;
  }

  function boot() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    renderBase(root);

    var citiesUrl = new URL('./data/cities.json', document.baseURI).toString();
    var currenciesUrl = new URL('./data/currencies.json', document.baseURI).toString();
    var ratesUrl = new URL('./data/rates.json', document.baseURI).toString();

    Promise.all([
      loadJson(citiesUrl),
      loadJson(currenciesUrl),
      loadJson(ratesUrl)
    ]).then(function (arr) {
      var cities = arr[0] || [];
      var currencies = arr[1] || [];
      var rates = arr[2] || [];

      setup(root, cities, currencies, rates);
    }).catch(function (e) {
      console.error(e);
      root.innerHTML = '<div class="bg-white rounded-md border border-gray-200 p-4 text-sm text-red-600">Failed to load widget data. Ensure this is served via a web server (e.g., GitHub Pages) and that ./data/*.json exist.</div>';
    });
  }

  function setup(root, cities, currencies, ratesData) {
    // ---------- state ----------
    var params = new URLSearchParams(window.location.search);
    var product = (params.get('product') || 'note').toLowerCase();
    if (product !== 'card' && product !== 'note') product = 'note';

    var city = (params.get('city') || (cities[0] && cities[0].code) || 'DEL').toUpperCase();
    var currency = (params.get('currency') || 'USD').toUpperCase();
    var amount = 0;

    // ---------- elements ----------
    var tabNotes = $('#tab-notes', root);
    var tabCard = $('#tab-card', root);

    var cityTrigger = $('#city-trigger', root);
    var cityValue = $('#city-trigger-label', root);
    var cityPopover = $('#city-popover', root);
    var citySearch = $('#city-search', root);
    var cityList = $('#city-list', root);

    var currencyTrigger = $('#currency-trigger', root);
    var currencyValue = $('#currency-trigger-label', root);
    var currencyPopover = $('#currency-popover', root);
    var currencySearch = $('#currency-search', root);
    var currencyList = $('#currency-list', root);

    var amountInput = $('#amount-input', root);
    var rateText = $('#rate-text', root);
    var totalText = $('#total-text', root);
    var tatText = $('#tat-text', root);
    var waBtn = $('#wa-btn', root);

    var closeBtn = $("#fx-close-widget", root);
    var pageOverlay = document.getElementById("fx-page-overlay");

    function closeWidget() {
      if (pageOverlay) pageOverlay.style.display = "none";
      try { window.parent && window.parent.postMessage({ type: "fxWidgetClosed" }, "*"); } catch (e) {}
    }


    function findCity(code) {
      for (var i=0;i<cities.length;i++) if (cities[i].code === code) return cities[i];
      return null;
    }
    function findCurrency(code) {
      for (var i=0;i<currencies.length;i++) if (currencies[i].code === code) return currencies[i];
      return null;
    }
    function findRate(code) {
      for (var i=0;i<ratesData.length;i++) if (ratesData[i].code === code) return ratesData[i];
      return null;
    }

    function closePopovers() {
      if (cityPopover) cityPopover.classList.add('hidden');
      if (currencyPopover) currencyPopover.classList.add('hidden');
    }

    function setProduct(p) {
      product = p;
      if (tabNotes) tabNotes.classList.toggle('active', product === 'note');
      if (tabCard) tabCard.classList.toggle('active', product === 'card');
      updateRateAndTotal();
    }

    function renderCityItems(filter) {
      if (!cityList) return;
      var q = (filter || '').toLowerCase().trim();
      var items = cities.filter(function (c) {
        if (!q) return true;
        return (c.name || '').toLowerCase().indexOf(q) !== -1 || (c.code || '').toLowerCase().indexOf(q) !== -1;
      });
      cityList.innerHTML = items.map(function (c) {
        var active = c.code === city ? ' bg-blue-50' : '';
        return '<button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50'+active+'" data-city="'+c.code+'">'+
          '<div class="font-medium">'+c.name+'</div><div class="text-xs text-gray-500">'+c.code+'</div></button>';
      }).join('');
      $all('button[data-city]', cityList).forEach(function (btn) {
        btn.addEventListener('click', function () {
          city = btn.getAttribute('data-city');
          closePopovers();
          updateSelectors();
          updateTat();
          updateWhatsapp();
        });
      });
    }

    function renderCurrencyItems(filter) {
      if (!currencyList) return;
      var q = (filter || '').toLowerCase().trim();
      var items = currencies.filter(function (c) {
        if (!q) return true;
        return (c.name || '').toLowerCase().indexOf(q) !== -1 || (c.code || '').toLowerCase().indexOf(q) !== -1;
      });
      currencyList.innerHTML = items.map(function (c) {
        var active = c.code === currency ? ' bg-blue-50' : '';
        return '<button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50'+active+'" data-cur="'+c.code+'">'+
          '<div class="flex items-center gap-2"><span class="font-medium">'+c.code+'</span><span class="text-gray-500 text-xs">'+(c.name||'')+'</span></div></button>';
      }).join('');
      $all('button[data-cur]', currencyList).forEach(function (btn) {
        btn.addEventListener('click', function () {
          currency = btn.getAttribute('data-cur');
          closePopovers();
          updateSelectors();
          updateRateAndTotal();
          updateWhatsapp();
        });
      });
    }

    function updateSelectors() {
      var c = findCity(city);
      if (cityValue) cityValue.textContent = c ? c.name : city;

      var cur = findCurrency(currency);
      if (currencyValue) currencyValue.textContent = cur ? (cur.code + ' • ' + (cur.name || '')) : currency;
    }

    function updateTat() {
      if (tatText) tatText.textContent = getTatText();
    }

    function updateRateAndTotal() {
      var r = findRate(currency);
      var rate = 0;
      if (r) rate = (product === 'card') ? Number(r.cardRate || 0) : Number(r.notesRate || 0);

      if (rateText) rateText.textContent = rate ? ('Rate ' + rate.toFixed(2)) : 'Rate -';
      var total = rate ? (Number(amount || 0) * rate) : 0;
      if (totalText) totalText.textContent = fmtINR(total);
    }

    function updateWhatsapp() {
      if (!waBtn) return;
      var c = findCity(city);
      var cityName = c ? c.name : city;
      var msg = 'Hi, I want to buy ' + (amount ? Number(amount).toLocaleString('en-IN') : '') + ' ' + currency + ' ' + (product === 'card' ? 'Forex Card' : 'Currency Notes') + ' in ' + cityName + '. Please share the best rate.';
      waBtn.href = 'https://wa.me/919212219191?text=' + encodeURIComponent(msg);
    }

    // ---------- bindings ----------
    if (closeBtn) closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeWidget();
    });
    if (pageOverlay) pageOverlay.addEventListener('click', function (e) {
      if (e.target === pageOverlay) closeWidget();
    });

    if (tabNotes) tabNotes.addEventListener('click', function () { setProduct('note'); });
    if (tabCard) tabCard.addEventListener('click', function () { setProduct('card'); });

    if (cityTrigger) cityTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      closePopovers();
      if (cityPopover) {
        cityPopover.classList.toggle('hidden');
        if (!cityPopover.classList.contains('hidden')) {
          if (citySearch) citySearch.value = '';
          renderCityItems('');
          if (citySearch) citySearch.focus();
        }
      }
    });
    if (citySearch) citySearch.addEventListener('input', function () {
      renderCityItems(citySearch.value);
    });

    if (currencyTrigger) currencyTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      closePopovers();
      if (currencyPopover) {
        currencyPopover.classList.toggle('hidden');
        if (!currencyPopover.classList.contains('hidden')) {
          if (currencySearch) currencySearch.value = '';
          renderCurrencyItems('');
          if (currencySearch) currencySearch.focus();
        }
      }
    });
    if (currencySearch) currencySearch.addEventListener('input', function () {
      renderCurrencyItems(currencySearch.value);
    });

    document.addEventListener('click', function (e) {
      var t = e.target;
      var insideWidget = root.contains(t);
      if (!insideWidget) return;
      var inCity = cityPopover && cityPopover.contains(t);
      var inCur = currencyPopover && currencyPopover.contains(t);
      var isCityBtn = cityTrigger && cityTrigger.contains(t);
      var isCurBtn = currencyTrigger && currencyTrigger.contains(t);
      if (!inCity && !inCur && !isCityBtn && !isCurBtn) {
        closePopovers();
      }
    });

    if (amountInput) {
      amountInput.addEventListener('input', function () {
        var raw = (amountInput.value || '').replace(/[^0-9]/g, '');
        amount = raw ? Number(raw) : 0;
        // keep formatted
        if (raw) amountInput.value = Number(raw).toLocaleString('en-IN');
        updateRateAndTotal();
        updateWhatsapp();
      });
    }

    // ---------- initial paint ----------
    setProduct(product);
    updateSelectors();
    updateTat();
    updateRateAndTotal();
    updateWhatsapp();
    setInterval(updateTat, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

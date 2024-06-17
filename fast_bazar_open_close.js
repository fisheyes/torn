// ==UserScript==
// @name         Fast Bazaar Open and Close - v1
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       You
// @match        https://www.torn.com/item.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        none
// @updateURL    https://fisheyes.github.io/torn/fast_bazar_open_close.js
// @downloadURL  https://fisheyes.github.io/torn/fast_bazar_open_close.js
// ==/UserScript==

(function() {
    'use strict';

    let isBazaarOpen = false;

    function toggleBazaar() {
        const step = isBazaarOpen ? 'closeBazaar' : 'openBazaar';
        getAction({
            type: 'post',
            action: 'bazaar.php',
            data: {
                sid: 'bazaar',
                step: step,
            },
            success: (str) => {
                try {
                    console.log(str);
                    // const msg = JSON.parse(str);
                    // $('#buyBeerResult').html(msg.text).css('color', msg.success ? 'green' : 'red');
                    isBazaarOpen = !isBazaarOpen;
                    updateButtonText();
                } catch (e) {
                    console.log(e);
                }
            },
        });
    }

    function buyShares(){
    getAction({
            type: 'post',
            action: 'page.php',
                 sid: 'StockMarket',
                step: 'buyShares',
            data: {
                stockid:1,
                amount: 1,
               },
            success: (str) => {
                try {
                    console.log(str);
                    // const msg = JSON.parse(str);
                    // $('#buyBeerResult').html(msg.text).css('color', msg.success ? 'green' : 'red');
                   // isBazaarOpen = !isBazaarOpen;
                   // updateButtonText();
                } catch (e) {
                    console.log(e);
                }
            },
        });
    }

    function updateButtonText() {
        const button = document.getElementById('toggleBazaarButton');
        if (button) {
            button.textContent = isBazaarOpen ? 'Close Bazaar' : 'Open Bazaar';
        }
    }

    function addButton() {
        const button = document.createElement('button');
        button.id = 'toggleBazaarButton';
        button.textContent = isBazaarOpen ? 'Close Bazaar' : 'Open Bazaar';
        button.style.marginTop = '10px';
        button.addEventListener('click', toggleBazaar);

        const header = document.querySelector('.content-title');
        if (header) {
            header.appendChild(button);
        }
    }
      function addStockButton() {
        const stockButton = document.createElement('stockButton');
        stockButton.id = 'buyStock';
        stockButton.textContent = 'Buy Stock';
        stockButton.style.marginTop = '10px';
        stockButton.addEventListener('click', buyShares);

        const header = document.querySelector('.content-title');
        if (header) {
            header.appendChild(stockButton);

        }
    }

   addButton();
   // addStockButton();
})();

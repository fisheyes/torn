// ==UserScript==
// @name         Torn Weekly Respect Tracker (Fixed)
// @namespace    http://torn.com
// @version      2.2
// @description  Sunday-to-Sunday respect tracker with working refresh on all pages
// @author       YourName
// @match        https://www.torn.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      api.torn.com
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'torn_api_key';
    const OVERLAY_ID = 'weekly-respect-container';
    const MINIMIZED_OVERLAY_ID = 'weekly-respect-minimized';
    const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache
    let isMinimized = false;

    async function getApiKey() {
        let apiKey = GM_getValue(STORAGE_KEY, null);
        if (!apiKey) {
            apiKey = prompt("Enter your Torn API key (securely stored):");
            if (apiKey) {
                GM_setValue(STORAGE_KEY, apiKey.trim());
                return apiKey;
            }
            throw new Error("API key required");
        }
        return apiKey;
    }

    function getSundayToSundayBoundaries() {
        const now = new Date();
        const sunday = new Date(now);
        sunday.setHours(0, 0, 0, 0);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        const nextSunday = new Date(sunday);
        nextSunday.setDate(sunday.getDate() + 7);
        return {
            start: Math.floor(sunday.getTime() / 1000),
            end: Math.floor(nextSunday.getTime() / 1000)
        };
    }

    function classifyResult(result) {
        if (!result) return 'other';
        const normalized = result.toString().trim().toLowerCase();
        const lossKeywords = ['lost', 'loss', 'defeated by', 'hospitalized', 'mugged'];
        if (lossKeywords.some(kw => normalized.includes(kw))) return 'loss';
        if (normalized.includes('draw') || normalized.includes('stalemate')) return 'other';
        return 'win';
    }

    function fetchAllAttackLogs(apiKey, callback) {
        const {start, end} = getSundayToSundayBoundaries();
        let allAttacks = [];

        // Add cache-busting timestamp to avoid Torn's 30-second cache
        const cacheBuster = Math.floor(Date.now() / 1000);

        function fetchPage(lastId = 0) {
            const url = `https://api.torn.com/user/?selections=attacks&key=${apiKey}&from=${start}&to=${end}&_cb=${cacheBuster}${lastId ? `&start=${lastId}` : ''}`;
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        if (data.error) return console.error('API Error:', data.error);
                        const attacks = data.attacks ? Object.entries(data.attacks) : [];
                        allAttacks = allAttacks.concat(attacks);
                        if (attacks.length === 100) {
                            fetchPage(attacks[attacks.length - 1][0]);
                        } else {
                            callback(allAttacks);
                        }
                    }
                },
                onerror: console.error
            });
        }
        fetchPage();
    }

    function processLogs(logEntries, myId) {
        let totalRespect = 0;
        let wins = 0, losses = 0, other = 0;
        logEntries.forEach(([_, attack]) => {
            if (attack.attacker_id == myId) {
                totalRespect += attack.respect || 0;
                switch (classifyResult(attack.result)) {
                    case 'win': wins++; break;
                    case 'loss': losses++; break;
                    default: other++;
                }
            }
        });
        return {totalRespect, wins, losses, other, timestamp: Date.now()};
    }

    function minimizeOverlay() {
        const container = document.getElementById(OVERLAY_ID);
        if (!container) return;
        const minimized = document.createElement('div');
        minimized.id = MINIMIZED_OVERLAY_ID;
        minimized.style = `
            position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.85);
            color: white; padding: 8px 12px; border-radius: 8px; z-index: 10000;
            font-family: Arial, sans-serif; min-width: 120px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25); cursor: pointer;
            display: flex; align-items: center; justify-content: space-between;
        `;
        minimized.innerHTML = `
            <div style="font-size:0.9em;">Weekly Stats</div>
            <button id="maximizeBtn" style="background:#4CAF50;color:white;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:0.9em;">+</button>
        `;
        container.replaceWith(minimized);
        isMinimized = true;
        minimized.querySelector('#maximizeBtn').addEventListener('click', () => {
            fetchAndProcessData(true);
        });
    }

    function displayRespectOverlay(data, windowStart, windowEnd) {
        const prev = document.getElementById(OVERLAY_ID);
        if (prev) prev.remove();
        const minimized = document.getElementById(MINIMIZED_OVERLAY_ID);
        if (minimized) minimized.remove();

        const startDate = new Date(windowStart * 1000).toLocaleDateString();
        const endDate = new Date((windowEnd-1) * 1000).toLocaleDateString();
        const lastUpdate = new Date(data.timestamp).toLocaleTimeString();

        const container = document.createElement('div');
        container.id = OVERLAY_ID;
        container.style = `
            position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.85);
            color: white; padding: 12px 15px; border-radius: 8px; z-index: 10000;
            font-family: Arial, sans-serif; min-width: 250px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        `;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size:1.2em; font-weight:bold;">Weekly Respect</div>
                <div>
                    <button id="minimizeBtn" style="background:#2196F3;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;margin-right:5px;">_</button>
                    <button id="refreshBtn" style="background:#4CAF50;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">R</button>
                </div>
            </div>
            <div style="font-size:0.95em; margin-bottom:8px; color:#ddd;">${startDate} - ${endDate}</div>
            <div style="font-size:0.8em; margin-bottom:10px; color:#aaa;">Updated: ${lastUpdate}</div>
            <div style="margin-bottom:6px;">
                <span>Respect: </span>
                <span style="font-weight:bold; color:#FFD700;">${data.totalRespect.toFixed(2)}</span>
            </div>
            <div style="display:flex; gap:15px; font-size:0.9em;">
                <div>Wins: <b style="color:#4CAF50;">${data.wins}</b></div>
                <div>Losses: <b style="color:#F44336;">${data.losses}</b></div>
                <div>Other: <b>${data.other}</b></div>
            </div>
        `;

        document.body.appendChild(container);
        isMinimized = false;

        container.querySelector('#minimizeBtn').addEventListener('click', minimizeOverlay);
        container.querySelector('#refreshBtn').addEventListener('click', () => {
            container.innerHTML = `<div style="padding:10px; text-align:center;">Loading fresh data...</div>`;
            fetchAndProcessData(true);
        });
    }

    async function fetchAndProcessData(forceRefresh = false) {
        try {
            const apiKey = await getApiKey();
            const userInfo = await new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://api.torn.com/user/?selections=basic&key=${apiKey}`,
                    onload: (r) => resolve(JSON.parse(r.responseText))
                });
            });

            if (userInfo.error) {
                console.error('API Error:', userInfo.error);
                return;
            }

            const {start, end} = getSundayToSundayBoundaries();
            fetchAllAttackLogs(apiKey, (logs) => {
                const results = processLogs(logs, userInfo.player_id);
                displayRespectOverlay(results, start, end);
            });
        } catch (e) {
            console.error('Script Error:', e);
        }
    }

    // Initialize immediately - no cache
    setTimeout(() => {
        fetchAndProcessData(true);
    }, 1000);
})();

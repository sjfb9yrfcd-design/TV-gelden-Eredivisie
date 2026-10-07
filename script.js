document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [historyResponse, currentResponse] = await Promise.all([
            fetch('history.json'),
            fetch('current.json')
        ]);

        const historyData = await historyResponse.json();
        const currentData = await currentResponse.json();

        const lastModifiedHeader = currentResponse.headers.get('last-modified');
        displayLastUpdated(lastModifiedHeader);

        fetchVisitorCount();

        calculateAndRender(historyData, currentData);
    } catch (error) {
        console.error("Fout bij het laden van de databestanden:", error);
    }
});

// Functie om afwijkende clubnamen (Teletekst vs Historie) automatisch gelijk te trekken
function normalizeClubName(name) {
    if (!name) return "";
    let clean = name.trim();
    
    // Mappings voor eventuele afwijkingen tussen Teletekst en je history.json
    const mapping = {
        "FC Twente": "Twente",
        "Go Ahead Eagles": "Go Ahead",
        "NAC Breda": "NAC",
        "Fortuna Sittard": "Fortuna"
    };
    
    return mapping[clean] || clean;
}

function displayLastUpdated(headerDate) {
    const updateElement = document.getElementById('last-updated');
    if (!updateElement) return;

    if (headerDate) {
        let date = new Date(headerDate);
        let options = { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Europe/Amsterdam'
        };
        updateElement.textContent = date.toLocaleDateString('nl-NL', options);
    } else {
        // Fallback als de header ontbreekt (bijv. lokale test)
        let now = new Date();
        updateElement.textContent = now.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    }
}

async function fetchVisitorCount() {
    const counterElement = document.getElementById('visitor-count');
    if (!counterElement) return;

    try {
        const response = await fetch('https://api.counterapi.dev/v1/eredivisie-tv-ranking/bezoekers/up');
        const data = await response.json();
        
        if (data && data.count !== undefined) {
            counterElement.textContent = data.count.toLocaleString('nl-NL');
        } else {
            counterElement.textContent = "N.b.";
        }
    } catch (e) {
        console.error("Kon bezoekersaantal niet ophalen:", e);
        counterElement.textContent = "N.b.";
    }
}

function calculateTVRanking(seasonsList, activeClubs) {
    let scores = {};

    activeClubs.forEach(club => {
        scores[club] = 0;
    });

    seasonsList.forEach((seasonObj, index) => {
        const weight = index + 1; 
        
        seasonObj.standings.forEach(clubEntry => {
            let normalizedName = normalizeClubName(clubEntry.name);
            
            if (scores.hasOwnProperty(normalizedName)) {
                let rankPoints = 19 - clubEntry.position; 
                if (rankPoints < 0) rankPoints = 0;

                scores[normalizedName] += rankPoints * weight;
            }
        });
    });

    let sortedRanking = Object.keys(scores).map(club => ({
        name: club,
        score: scores[club]
    })).sort((a, b) => b.score - a.score);

    let results = {};
    sortedRanking.forEach((item, index) => {
        results[item.name] = {
            position: index + 1,
            score: item.score
        };
    });

    return results;
}

function calculateAndRender(history, currentSeasonStandings) {
    // Normaliseer ook direct de actieve clubs uit current.json
    let activeClubs = currentSeasonStandings.map(c => normalizeClubName(c.name));

    let startRanking = calculateTVRanking(history, activeClubs);

    let simulatedHistory = [
        ...history.slice(1), 
        { season: "current", standings: currentSeasonStandings }
    ];
    let currentTVRanking = calculateTVRanking(simulatedHistory, activeClubs);

    let tableData = activeClubs.map(club => {
        let startData = startRanking[club] || { position: 99, score: 0 };
        let currentData = currentTVRanking[club] || { position: 99, score: 0 };
        let diff = startData.position - currentData.position;

        return {
            club: club,
            startPos: startData.position,
            startScore: startData.score,
            currentPos: currentData.position,
            currentScore: currentData.score,
            diff: diff
        };
    });

    tableData.sort((a, b) => a.currentPos - b.currentPos);

    const tbody = document.querySelector("#tv-ranking-table tbody");
    tbody.innerHTML = "";

    tableData.forEach(row => {
        let diffHtml = "";
        if (row.diff > 0) {
            diffHtml = `<span class="pos-up">▲ +${row.diff}</span>`;
        } else if (row.diff < 0) {
            diffHtml = `<span class="pos-down">▼ ${row.diff}</span>`;
        } else {
            diffHtml = `<span class="pos-same">-</span>`;
        }

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${row.club}</strong></td>
            <td>${row.startPos} <small style="color: #777;">(${row.startScore} pnt)</small></td>
            <td>${row.currentPos} <small style="color: #777;">(${row.currentScore} pnt)</small></td>
            <td>${diffHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [historyResponse, currentResponse] = await Promise.all([
            fetch('history.json'),
            fetch('current.json')
        ]);

        const historyData = await historyResponse.json();
        const currentData = await currentResponse.json();

        calculateAndRender(historyData, currentData);
    } catch (error) {
        console.error("Fout bij het laden van de databestanden:", error);
    }
});

function calculateTVRanking(seasonsList) {
    let scores = {};

    // 10 seizoenen: het oudste seizoen krijgt factor 1, het nieuwste factor 10
    // (of afhankelijk van hoe jouw historie is opgebouwd, hier gaan we uit van 10 seizoenen in volgorde)
    seasonsList.forEach((seasonRanking, index) => {
        const weight = index + 1; // index 0 = oudste (gewicht 1), index 9 = meest recent (gewicht 10)
        
        seasonRanking.forEach(club => {
            // Eredivisie puntentelling: plek 1 = 18 punten, plek 18 = 1 punt
            let rankPoints = 19 - club.position; 
            if (rankPoints < 0) rankPoints = 0;

            if (!scores[club.name]) {
                scores[club.name] = 0;
            }
            scores[club.name] += rankPoints * weight;
        });
    });

    // Zet om naar een sorteerbare array
    let sortedRanking = Object.keys(scores).map(club => ({
        name: club,
        score: scores[club]
    })).sort((a, b) => b.score - a.score);

    // Wijs posities toe (1 t/m N)
    let positions = {};
    sortedRanking.forEach((item, index) => {
        positions[item.name] = index + 1;
    });

    return positions;
}

function calculateAndRender(history, currentSeasonStandings) {
    // 1. Bereken TV-ranglijst bij start van het seizoen (op basis van de 10 historische seizoenen)
    let startRanking = calculateTVRanking(history);

    // 2. Bereken de 'Wat-als' ranglijst: 
    // Schuif de historie op: laat het alleroudste seizoen vallen, en voeg de huidige tussenstand toe als nieuwste seizoen.
    let simulatedHistory = [...history.slice(1), currentSeasonStandings];
    let currentTVRanking = calculateTVRanking(simulatedHistory);

    // Verzamel alle unieke clubs
    let allClubs = Object.keys(startRanking);

    // Combineer data voor de tabel
    let tableData = allClubs.map(club => {
        let startPos = startRanking[club] || 99;
        let currentPos = currentTVRanking[club] || 99;
        let diff = startPos - currentPos; // positief is stijgen (bijv. start 10, nu 8 = +2 plekken op tv-ranglijst)

        return {
            club: club,
            startPos: startPos,
            currentPos: currentPos,
            diff: diff
        };
    });

    // Sorteer op basis van de huidige TV-ranglijst positie
    tableData.sort((a, b) => a.currentPos - b.currentPos);

    // Render in HTML
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
            <td>${row.startPos}</td>
            <td>${row.currentPos}</td>
            <td>${diffHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

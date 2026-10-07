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

function calculateTVRanking(seasonsList, activeClubs) {
    let scores = {};

    // Initialiseer alleen de clubs die DIT seizoen actief in de Eredivisie spelen
    activeClubs.forEach(club => {
        scores[club] = 0;
    });

    // Loop door de historische seizoenen (oud naar nieuw)
    seasonsList.forEach((seasonObj, index) => {
        const weight = index + 1; // index 0 = oudste (gewicht 1), index 9 = meest recent (gewicht 10)
        
        seasonObj.standings.forEach(clubEntry => {
            // Tel alleen mee als deze club ook daadwerkelijk in het huidige seizoen in de Eredivisie zit
            if (scores.hasOwnProperty(clubEntry.name)) {
                // Eredivisie puntentelling: plek 1 = 18 punten, plek 18 = 1 punt
                let rankPoints = 19 - clubEntry.position; 
                if (rankPoints < 0) rankPoints = 0;

                scores[clubEntry.name] += rankPoints * weight;
            }
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
    // Stap 1: Haal de lijst op van alle clubs die dit seizoen actief zijn in de Eredivisie
    let activeClubs = currentSeasonStandings.map(c => c.name);

    // Stap 2: Bereken TV-ranglijst bij start van het seizoen (op basis van de 10 historische seizoenen, gefilterd op actieve clubs)
    let startRanking = calculateTVRanking(history, activeClubs);

    // Stap 3: Bereken de 'Wat-als' ranglijst: 
    // We bouwen een gesimuleerde historie op waarin we het oudste seizoen weglaten, 
    // en de actuele tussenstand van dit seizoen toevoegen als het meest recente seizoen.
    let simulatedHistory = [
        ...history.slice(1), 
        { season: "current", standings: currentSeasonStandings }
    ];
    let currentTVRanking = calculateTVRanking(simulatedHistory, activeClubs);

    // Stap 4: Combineer data voor de tabel op basis van de actieve clubs
    let tableData = activeClubs.map(club => {
        let startPos = startRanking[club] || 99;
        let currentPos = currentTVRanking[club] || 99;
        let diff = startPos - currentPos; // positief is stijgen op tv-ranglijst

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

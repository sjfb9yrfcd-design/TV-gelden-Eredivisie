import json
import re
import urllib.request
from bs4 import BeautifulSoup

def fetch_teletekst_standings():
    url = "https://teletekst-data.nos.nl/webplus?p=819"
    
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            html_content = response.read().decode('utf-8')
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Teletekst data staat vaak in een <pre> blok of als platte tekst
        text_data = soup.get_text()
        
        standings = []
        # We zoeken naar regels die beginnen met een getal en een punt (bijv. " 1. PSV" of "1. Ajax")
        # Teletekst regels zien er ongeveer zo uit: " 1. PSV      6  5  1  0..."
        lines = text_data.split('\n')
        
        for line in lines:
            line = line.strip()
            # Regex om regels te vangen zoals "1. PSV" of "12. Sparta R'dam"
            match = re.match(r'^(\d{1,2})\.\s+([A-Za-zÀ-ÿ0-9\s\'\-\.]+?)(?=\s{2,}\d|\s+\d{1,2}\s+\d|\s*[\d\-]{3,})', line)
            
            if not match:
                # Probeer een iets lossere patroonmatching als de bovenste te strikt is
                match = re.match(r'^(\d{1,2})\.\s+([A-Za-zÀ-ÿ0-9\s\'\-\.]+)', line)
                
            if match:
                pos = int(match.group(1))
                team_name = match.group(2).strip()
                
                # Opschonen van eventuele achtergebleven cijfers in de naam
                team_name = re.sub(r'\s+\d+.*', '', team_name).strip()
                
                # Zorg dat we alleen de 18 Eredivisieposities meenemen (1 t/m 18)
                if 1 <= pos <= 18:
                    # Voorkom dubbele invoer als een regel meerdere keren geparseerd wordt
                    if not any(item['position'] == pos for item in standings):
                        standings.append({
                            "name": team_name,
                            "position": pos
                        })
                        
        # Sorteer op positie voor de zekerheid
        standings = sorted(standings, key=lambda x: x['position'])
        
        # Als het er precies 18 zijn, hebben we een complete stand!
        if len(standings) == 18:
            return standings
        else:
            print(f"Waarschuwing: {len(standings)} clubs gevonden i.p.v. 18. Ruwe data controleren...")
            return standings if len(standings) > 0 else None
            
    except Exception as e:
        print(f"Fout bij ophalen van Teletekst 819: {e}")
        return None

if __name__ == "__main__":
    standings = fetch_teletekst_standings()
    
    if standings and len(standings) > 0:
        with open('current.json', 'w', encoding='utf-8') as f:
            json.dump(standings, f, indent=2, ensure_ascii=False)
        print(f"current.json succesvol geüpdatet met {len(standings)} clubs vanaf Teletekst 819!")
    else:
        print("Kon de stand niet parsen van Teletekst, bestaande bestand blijft behouden.")

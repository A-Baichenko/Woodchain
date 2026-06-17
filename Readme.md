# WoodChain: Blockchain ansehen und verstehen

Diese Anleitung zeigt, wie die Hyperledger-Fabric-Blockchain von WoodChain abgerufen und gelesen wird. Als Beispiel dient ein exportierter Block mit einer `CreateWoodWithPlan`-Transaktion.

## Installation und GitHub-Upload

### Projekt sicher auf GitHub hochladen

Vor dem Hochladen pruefen, dass keine Passwoerter, privaten Schluessel, lokal erzeugten Fabric-Zertifikate oder Build-Dateien auf GitHub landen.

Im Hauptordner von WoodChain sollte deshalb eine `.gitignore` mit mindestens folgendem Inhalt liegen:

```gitignore
# Java und Maven
target/
*.class
*.jar

# IntelliJ IDEA
.idea/
*.iml

# Lokale Einstellungen und Geheimnisse
.env
.env.*
!.env.example
*.log

# Betriebssystem
.DS_Store
Thumbs.db

# Exportierte Blockchain-Daten
blockchain-bloecke/
*.block
newest-block.json

# Lokal von Fabric erzeugte Netzwerkdaten
organizations/
channel-artifacts/
system-genesis-block/
```

Wichtig: Der eigene WoodChain-Chaincode muss hochgeladen werden. Nur automatisch erzeugte Zertifikate, Schluessel, Bloecke und Build-Dateien werden ausgeschlossen.

### Repository bei GitHub erstellen

1. Bei GitHub anmelden.
2. Oben rechts auf `+` und danach auf `New repository` klicken.
3. Als Namen zum Beispiel `WoodChain` eintragen.
4. `Public` oder `Private` auswaehlen.
5. Keine zusaetzliche README und keine `.gitignore` durch GitHub erzeugen lassen.
6. Auf `Create repository` klicken.

### Lokales Projekt hochladen

Im Terminal in den Hauptordner des Projekts wechseln:

```bash
cd ~/WoodChain
```

Danach das lokale Repository vorbereiten:

```bash
git init
git branch -M main
git add .
git status
git commit -m "WoodChain-Projekt hinzugefuegt"
```

Bei `git status` unbedingt kontrollieren, dass keine `.env`-Datei, privaten Schluessel oder Fabric-Zertifikate aufgelistet werden.

Nun das Projekt mit dem zuvor erstellten GitHub-Repository verbinden. `DEIN-BENUTZERNAME` muss ersetzt werden:

```bash
git remote add origin https://github.com/DEIN-BENUTZERNAME/WoodChain.git
git push -u origin main
```

Falls GitHub nach einem Passwort fragt, wird statt des normalen GitHub-Passworts ein Personal Access Token verwendet. Einfacher geht es mit GitHub Desktop oder einer Anmeldung ueber den Browser.

### Spaetere Aenderungen hochladen

```bash
cd ~/WoodChain
git add .
git commit -m "Projekt aktualisiert"
git push
```

### WoodChain auf einem anderen PC starten

Auf dem neuen PC werden benoetigt:

- Git
- Docker Desktop unter Windows oder Docker Engine unter Linux
- unter Windows: WSL 2 mit Ubuntu
- mindestens etwa 10 GB freier Speicherplatz

Docker Desktop muss gestartet sein. Unter Windows sollten die folgenden Befehle im Ubuntu-Terminal von WSL ausgefuehrt werden.

Installation pruefen:

```bash
git --version
docker --version
docker compose version
```

Projekt herunterladen:

```bash
cd ~
git clone https://github.com/DEIN-BENUTZERNAME/WoodChain.git
cd WoodChain
```

Eine echte `.env`-Datei wird aus Sicherheitsgruenden nicht hochgeladen. Falls im Projekt eine `.env.example` vorhanden ist, wird daraus die lokale Konfiguration erstellt:

```bash
cp .env.example .env
```

Danach die Werte in `.env` pruefen und bei Bedarf anpassen. Eine `.env.example` darf nur Beispielwerte und keine echten Passwoerter enthalten.

Wenn das Repository die vollstaendige Docker-Compose-Konfiguration fuer Anwendung, Datenbank und Hyperledger Fabric enthaelt, reicht im Projektordner:

```bash
docker compose up --build -d
```

Laufende Container anzeigen:

```bash
docker compose ps
```

Protokolle anzeigen:

```bash
docker compose logs -f
```

Die Anwendung ist anschliessend normalerweise unter folgender Adresse erreichbar:

```text
http://localhost:8080
```

Falls in der `.env`-Datei ein anderer Port eingestellt ist, muss dieser statt `8080` verwendet werden.

Projekt stoppen:

```bash
docker compose down
```

Anwendung nach Aenderungen neu bauen und starten:

```bash
docker compose down
docker compose up --build -d
```

Komplett neu starten:

```bash
docker compose down -v
docker compose up --build -d
```

Dieser Schritt entfernt auch lokale Docker-Volumes. Dadurch werden Datenbank- und Blockchain-Daten geloescht und beim naechsten Start neu erstellt.

### Falls Fabric ausserhalb von Docker Compose liegt

Wenn das Fabric-Testnetzwerk nicht Bestandteil der WoodChain-Compose-Datei ist, muss auf dem neuen PC zusaetzlich dieselbe kompatible Version von `fabric-samples` eingerichtet werden. Danach werden im Ordner `fabric-samples/test-network` der Channel `mychannel` und der eigene Chaincode `woodchain` gestartet beziehungsweise bereitgestellt.

Wichtig: Der Pfad zum Chaincode und die Fabric-Version muessen zur Konfiguration des Projekts passen. Automatisch erzeugte Zertifikate vom alten PC sollten nicht kopiert werden. Das neue Netzwerk erzeugt eigene Identitaeten und beginnt mit einer neuen, leeren Blockchain.

### Kurzer Funktionstest auf dem neuen PC

1. Mit `docker compose ps` pruefen, ob alle Container laufen.
2. `http://localhost:8080` im Browser oeffnen.
3. Mit einem Testbenutzer anmelden.
4. Als Foerster eine neue Holzcharge anlegen.
5. Die Holzcharge in der Rueckverfolgung suchen.
6. Mit `peer channel getinfo -c mychannel` pruefen, ob ein neuer Block entstanden ist.

Wenn die Website funktioniert, aber die Blockchain nicht erreichbar ist, zuerst die Protokolle der Anwendung und der Fabric-Container kontrollieren:

```bash
docker compose logs --tail=200
```

GitHub speichert den Quellcode und die Konfiguration des Projekts, aber nicht automatisch den aktuellen Inhalt der laufenden Blockchain. Auf einem neuen PC entsteht beim Start eines neuen Fabric-Netzwerks eine neue Blockchain.

Damit das Projekt wirklich auf einem anderen PC laeuft, muessen daher im Repository vorhanden sein:

- der Java-/Spring-Boot-Quellcode
- der eigene WoodChain-Chaincode
- `pom.xml` beziehungsweise alle benoetigten Build-Dateien
- `compose.yaml` oder `docker-compose.yml`
- Startskripte fuer das Fabric-Netzwerk
- Datenbank-Migrationen
- `.env.example` mit sicheren Beispielwerten
- diese README

---

## Wichtig: Hyperledger Fabric hat keine Coins

WoodChain verwendet Hyperledger Fabric als private, erlaubnisbasierte Blockchain. Es gibt hier keinen Coin und kein Mining. Gespeichert werden Transaktionen und Zustandsaenderungen, zum Beispiel das Anlegen oder Transportieren einer Holzcharge.

## 1. Umgebung vorbereiten

Im Terminal in das Fabric-Testnetzwerk wechseln:

```bash
cd ~/hyperledger/fabric-samples/test-network

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config

source scripts/envVar.sh
setGlobals 1
```

`setGlobals 1` waehlt Organisation 1 (`Org1MSP`) und deren Peer aus.

## 2. Blockchain-Hoehe anzeigen

```bash
peer channel getinfo -c mychannel
```

Wichtige Werte:

- `height`: Anzahl der Bloecke. Die Zaehlung beginnt bei Block 0.
- `currentBlockHash`: Hash des aktuellsten Blocks.
- `previousBlockHash`: Hash des vorherigen Blocks.

Wenn `height` beispielsweise `7` ist, existieren die Bloecke 0 bis 6.

## 3. Neuesten Block herunterladen

```bash
peer channel fetch newest newest.block \
  -c mychannel \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
```

Die Datei `newest.block` ist der rohe Block im binaeren Protocol-Buffer-Format. Beim direkten Oeffnen erscheinen deshalb unlesbare Zeichen.

## 4. Block als Rohdaten ansehen

```bash
xxd newest.block | less
```

Die linke Spalte zeigt Positionen, die Mitte Hexadezimalwerte und die rechte Seite lesbare Zeichen. Mit `Q` wird die Ansicht beendet.

## 5. Block in lesbares JSON umwandeln

```bash
configtxlator proto_decode \
  --input newest.block \
  --type common.Block \
  --output newest-block.json
```

Anschliessend anzeigen:

```bash
less newest-block.json
```

Alternativ formatiert mit `jq`:

```bash
jq . newest-block.json | less
```

## 6. Aufbau eines Fabric-Blocks

Ein Block besteht auf oberster Ebene aus drei Bereichen:

```text
Block
|- header
|- data
`- metadata
```

### `header`

Der Block-Header identifiziert den Block und verbindet ihn kryptografisch mit seinem Vorgaenger.

- `number`: Blocknummer innerhalb des Channels.
- `previous_hash`: Hash des vorherigen Blocks.
- `data_hash`: Hash der Transaktionsdaten dieses Blocks.

Im Beispiel:

```json
{
  "number": "6",
  "previous_hash": "mzYK0X61PV0/rzJpqB/ldbpnKxhouxM+Uo7TXZb+19s=",
  "data_hash": "05kfvcx28gnjtGBoH2B003dV6FGG+YRgXC7fftX5NwE="
}
```

Block 6 verweist ueber `previous_hash` auf Block 5. Wird ein alter Block nachtraeglich veraendert, stimmen die Hash-Verknuepfungen nicht mehr. Dadurch werden Manipulationen erkennbar.

### `data`

`data.data` enthaelt die Transaktionen des Blocks. Jeder Eintrag besitzt einen signierten `payload`.

### `metadata`

Dieser Bereich enthaelt Verwaltungsinformationen des Orderers, Signaturen und den Gueltigkeitsstatus der Transaktionen. Die langen Base64-Zeichenfolgen sind kodierte binaere Daten und Zertifikate.

## 7. Transaktion im Beispiel

Der `channel_header` beschreibt die Transaktion:

```json
{
  "channel_id": "mychannel",
  "timestamp": "2026-06-17T14:16:49.234067865Z",
  "tx_id": "91416d5283362949407657064d459c5b0b3d1916211c44e0ca9bc571496c8909",
  "type": 3
}
```

- `channel_id`: Channel, auf dem die Transaktion gespeichert wurde.
- `timestamp`: Zeitpunkt der Transaktion in UTC. In Deutschland war dies am 17. Juni 2026 um 16:16:49 Uhr MESZ.
- `tx_id`: Eindeutige Transaktions-ID.
- `type: 3`: Normale Endorser-Transaktion, also ein Chaincode-Aufruf.

## 8. Ersteller und Identitaet

Unter `creator` steht:

```json
"mspid": "Org1MSP"
```

Das bedeutet, dass die Transaktion mit einer Identitaet aus Organisation 1 eingereicht wurde.

`id_bytes` ist das Base64-kodierte X.509-Zertifikat des Benutzers. Es dient als kryptografische Identitaet. Es ist kein Passwort und kein Coin.

`nonce` ist ein einmaliger Zufallswert. Zusammen mit der Identitaet hilft er dabei, eine eindeutige Transaktions-ID zu erzeugen und Wiederholungen zu verhindern.

## 9. Chaincode-Aufruf und Argumente

Unter `chaincode_proposal_payload` stehen der aufgerufene Chaincode und seine Argumente:

```json
"name": "woodchain"
```

Die Werte unter `args` sind Base64-kodiert. Dekodiert ergeben sie:

```text
CreateWoodWithPlan
WOOD-20260617-911326
Eiche
222
Deutschland
Forstamt Foerster Demo
Bexbach
Logistik Demo
Saegewerk Demo
```

Damit wurde die Holzcharge `WOOD-20260617-911326` angelegt. Die Funktion speichert Holzart, Volumen, Herkunft, Besitzer, Standort und die geplanten Partner.

Einen einzelnen Base64-Wert kann man so dekodieren:

```bash
echo 'Q3JlYXRlV29vZFdpdGhQbGFu' | base64 --decode
```

Ergebnis:

```text
CreateWoodWithPlan
```

## 10. Endorsements

Unter `endorsements` befinden sich im Beispiel zwei Bestaetigungen:

- ein Endorsement von `Org1MSP`
- ein Endorsement von `Org2MSP`

Jeder Endorser hat das Simulationsergebnis kryptografisch signiert. Damit wird nachgewiesen, dass die benoetigten Organisationen dem Ergebnis zugestimmt haben.

`endorser` enthaelt die Identitaet des bestaetigenden Peers. `signature` ist dessen digitale Signatur.

## 11. Chaincode-Ergebnis

Im Bereich `response` steht:

```json
"status": 200
```

Das bedeutet, dass der Chaincode-Aufruf erfolgreich ausgefuehrt wurde.

`payload` ist das Base64-kodierte Ergebnis. Dekodiert enthaelt es den gespeicherten Zustand der Holzcharge:

```json
{
  "harvestDate": "2026-06-17T14:16:49.234067865Z",
  "id": "WOOD-20260617-911326",
  "lastUpdate": "2026-06-17T14:16:49.234067865Z",
  "location": "Bexbach",
  "logisticsToRetail": "",
  "logisticsToSawmill": "Logistik Demo",
  "origin": "Deutschland",
  "owner": "Forstamt Foerster Demo",
  "retail": "",
  "sawmill": "Saegewerk Demo",
  "status": "HARVESTED",
  "targetLocation": "Saegewerk Demo",
  "treeType": "Eiche",
  "volumeM3": "222"
}
```

## 12. Read/Write-Set

Das `rwset` zeigt, was der Chaincode gelesen und geschrieben hat.

### `_lifecycle`

Dieser Namespace gehoert zur Verwaltung des Chaincodes. Fabric liest hier unter anderem die aktuell installierte Chaincode-Sequenz.

### `woodchain`

Dieser Namespace enthaelt die eigentlichen WoodChain-Daten.

Unter `reads` steht der Schluessel:

```text
WOOD-20260617-911326
```

`version: null` bedeutet bei dieser Erstellung, dass vorher noch kein Zustand mit diesem Schluessel existierte.

Unter `writes` wird derselbe Schluessel mit dem neuen, Base64-kodierten JSON-Zustand gespeichert:

```json
{
  "is_delete": false,
  "key": "WOOD-20260617-911326",
  "value": "..."
}
```

- `is_delete: false`: Der Datensatz wird geschrieben, nicht geloescht.
- `key`: Eindeutige ID der Holzcharge im World State.
- `value`: Neuer Zustand der Holzcharge.

Wichtig: Der World State speichert den aktuellen Zustand fuer schnelle Abfragen. Die Blockchain speichert zusaetzlich die unveraenderliche Folge aller Transaktionen und damit die Historie.

## 13. Signaturen

Die Felder `signature` beweisen kryptografisch, dass die jeweilige Nachricht von der angegebenen Identitaet signiert wurde und seitdem nicht unbemerkt veraendert wurde.

Die Signaturen selbst sind nicht sinnvoll als normaler Text lesbar. Sie werden von Fabric automatisch mit den zugehoerigen Zertifikaten geprueft.

## 14. Kurz erklaert: Was ist hier die Blockchain?

Nicht ein einzelnes JSON-Feld ist allein die Blockchain. Die Blockchain ist die geordnete Kette aller Bloecke des Channels:

```text
Block 0 -> Block 1 -> Block 2 -> ... -> Block 6
```

Jeder Block enthaelt:

1. den Hash des vorherigen Blocks,
2. den Hash seiner eigenen Transaktionsdaten,
3. signierte Transaktionen,
4. Bestaetigungen der beteiligten Organisationen,
5. Metadaten zur Validierung.

Das JSON ist lediglich die lesbare Darstellung eines einzelnen binaeren Fabric-Blocks.

## 15. Bestimmten Block abrufen

Anstelle von `newest` kann eine konkrete Blocknummer angegeben werden:

```bash
peer channel fetch 6 block-6.block \
  -c mychannel \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
```

Danach dekodieren:

```bash
configtxlator proto_decode \
  --input block-6.block \
  --type common.Block \
  --output block-6.json
```

## 16. Alle Bloecke einzeln in einem Ordner speichern

Mit diesem Ablauf werden alle vorhandenen Bloecke einzeln heruntergeladen. Zu jedem Block werden sowohl die rohe binaere `.block`-Datei als auch eine lesbare `.json`-Datei gespeichert.

```bash
cd ~/hyperledger/fabric-samples/test-network

mkdir -p blockchain-bloecke

HEIGHT=$(peer channel getinfo -c mychannel 2>/dev/null \
  | sed -n 's/^Blockchain info: //p' \
  | jq -r '.height')

for ((i=0; i<HEIGHT; i++)); do
  peer channel fetch "$i" "blockchain-bloecke/block-$i.block" \
    -c mychannel \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile "$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

  configtxlator proto_decode \
    --input "blockchain-bloecke/block-$i.block" \
    --type common.Block \
    --output "blockchain-bloecke/block-$i.json"
done
```

Der Ordner sieht danach beispielsweise so aus:

```text
blockchain-bloecke/
|- block-0.block
|- block-0.json
|- block-1.block
|- block-1.json
|- block-2.block
`- block-2.json
```

- `.block`: Roher, binaerer Fabric-Block.
- `.json`: Derselbe Block in lesbarer Form.

Alle erzeugten Dateien anzeigen:

```bash
ls -lh blockchain-bloecke
```

Einen einzelnen Block oeffnen:

```bash
less blockchain-bloecke/block-6.json
```

Mit `Q` wird die Ansicht beendet.

## 17. Nuetzliche Zusammenfassung mit `jq`

Blocknummer und Hashes:

```bash
jq '.header' newest-block.json
```

Transaktions-ID, Zeit und Channel:

```bash
jq '.data.data[].payload.header.channel_header | {channel_id, timestamp, tx_id, type}' newest-block.json
```

Chaincode-Name und Rueckgabestatus:

```bash
jq '.data.data[].payload.data.actions[].payload.action.proposal_response_payload.extension | {chaincode: .chaincode_id.name, status: .response.status}' newest-block.json
```

Geschriebene World-State-Schluessel:

```bash
jq '.data.data[].payload.data.actions[].payload.action.proposal_response_payload.extension.results.ns_rwset[] | select(.namespace == "woodchain") | .rwset.writes[] | {key, is_delete}' newest-block.json
```

## Merksatz fuer die Praesentation

> Der Block zeigt eine signierte und von Org1 und Org2 bestaetigte Chaincode-Transaktion. Dabei wurde die Holzcharge als neuer Zustand in den WoodChain-Namespace geschrieben. Der vorherige Block-Hash verbindet diesen Block unveraenderlich mit der bestehenden Blockchain.

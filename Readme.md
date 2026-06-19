# WoodChain

WoodChain ist eine Webanwendung zur Rückverfolgung von Holz entlang der Lieferkette.  
Die Anwendung verwendet **Spring Boot**, **MySQL**, **Docker** und **Hyperledger Fabric**.

> Diese Anleitung beginnt bei einem neuen Windows-PC. Führe alle Schritte in der angegebenen Reihenfolge aus.

---

# Installation auf einem neuen PC

## 1. Voraussetzungen

Benötigt werden:

- Windows 10 oder Windows 11 (64 Bit)
- aktivierte Virtualisierung im BIOS/UEFI
- Internetverbindung
- GitHub-Zugriff auf das Repository
- mindestens 8 GB RAM, empfohlen sind 16 GB RAM
- ungefähr 15 GB freier Speicherplatz

## 2. WSL und Ubuntu installieren

PowerShell **als Administrator** öffnen und ausführen:

```powershell
wsl --install -d Ubuntu
```

Danach Windows neu starten.

Ubuntu über das Startmenü öffnen. Beim ersten Start einen Linux-Benutzernamen und ein Passwort festlegen. Bei der Eingabe des Passworts werden keine Zeichen angezeigt – das ist normal.

Anschließend WSL aktualisieren. Dafür erneut PowerShell öffnen:

```powershell
wsl --update
wsl --set-default-version 2
```

Mit diesem Befehl kann geprüft werden, ob Ubuntu WSL 2 verwendet:

```powershell
wsl -l -v
```

Bei Ubuntu muss unter `VERSION` die Zahl `2` stehen.

## 3. Docker Desktop installieren

PowerShell öffnen und Docker Desktop installieren:

```powershell
winget install -e --id Docker.DockerDesktop
```

Danach Docker Desktop starten und warten, bis die Docker Engine vollständig läuft.

In Docker Desktop folgende Einstellungen aktivieren:

1. **Settings → General → Use the WSL 2 based engine**
2. **Settings → Resources → WSL Integration**
3. Die Integration für **Ubuntu** einschalten
4. **Apply & restart** anklicken

> Docker nicht zusätzlich mit `apt install docker.io` in Ubuntu installieren. Das kann dazu führen, dass zwei getrennte Docker-Engines verwendet werden und Container nicht in Docker Desktop erscheinen.

## 4. Docker in Ubuntu prüfen

Ubuntu öffnen und ausführen:

```bash
unset DOCKER_HOST
docker context use default
docker version
docker compose version
docker info --format '{{.Name}}'
```

Die Befehle müssen ohne Fehlermeldung funktionieren. Bei Verwendung von Docker Desktop wird beim letzten Befehl normalerweise `docker-desktop` angezeigt.

Der Kontext `desktop-linux` darf in Ubuntu nicht manuell ausgewählt werden. In WSL wird der Kontext `default` verwendet.

## 5. Benötigte Programme in Ubuntu installieren

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl jq
```

Versionen prüfen:

```bash
git --version
curl --version
jq --version
```

## 6. WoodChain von GitHub herunterladen

In Ubuntu ausführen:

```bash
cd ~
git clone https://github.com/A-Baichenko/Woodchain.git
cd ~/Woodchain
```

Projektinhalt prüfen:

```bash
ls -la
```

Wurde das Repository bereits heruntergeladen, werden spätere Änderungen so geladen:

```bash
cd ~/Woodchain
git pull origin main
```

## 7. Hyperledger Fabric herunterladen

Die Fabric-Dateien werden direkt innerhalb des WoodChain-Projektordners installiert:

```bash
cd ~/Woodchain
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh docker samples binary
```

Danach müssen unter anderem diese Ordner vorhanden sein:

```text
~/Woodchain/fabric-samples
~/Woodchain/fabric-samples/bin
~/Woodchain/fabric-samples/test-network
~/Woodchain/chaincode/woodchain
```

Prüfen:

```bash
ls ~/Woodchain/fabric-samples/test-network
ls ~/Woodchain/chaincode/woodchain
```

## 8. Fabric-Binärdateien zum PATH hinzufügen

```bash
echo 'export PATH="$HOME/Woodchain/fabric-samples/bin:$PATH"' >> ~/.bashrc
echo 'export FABRIC_CFG_PATH="$HOME/Woodchain/fabric-samples/config"' >> ~/.bashrc
source ~/.bashrc
```

Prüfen:

```bash
peer version
```

## 9. Hyperledger-Netzwerk starten

```bash
cd ~/Woodchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c mychannel -ca
```

Dadurch werden unter anderem folgende Bestandteile gestartet:

- zwei Peer-Knoten
- ein Orderer
- die Certificate Authorities
- der Channel `mychannel`

Laufende Fabric-Container anzeigen:

```bash
docker ps
```

## 10. WoodChain-Chaincode installieren

Der eigene Java-Chaincode befindet sich im Repository unter `chaincode/woodchain`.

```bash
cd ~/Woodchain/fabric-samples/test-network
./network.sh deployCC \
  -ccn woodchain \
  -ccp ../../chaincode/woodchain \
  -ccl java \
  -ccv 1.0 \
  -ccs 1
```

Wichtig:

- Channel: `mychannel`
- Chaincode-Name: `woodchain`
- Chaincode-Sprache: Java
- Version: `1.0`

Die Installation kann beim ersten Mal mehrere Minuten dauern.

## 11. Webanwendung und Datenbank starten

Zurück in den Projektordner wechseln und Docker Compose starten:

```bash
cd ~/Woodchain
docker compose up --build -d
```

Status prüfen:

```bash
docker compose ps
docker ps
```

Logs der Anwendung anzeigen:

```bash
docker compose logs -f woodchain_app
```

Die Logansicht wird mit `Strg + C` verlassen. Der Container läuft dabei weiter.

> Falls der Service in der Compose-Datei anders heißt, zuerst `docker compose config --services` ausführen und den angezeigten Namen verwenden.

## 12. Anwendung öffnen

Im Browser öffnen:

```text
http://localhost:8080
```

Damit die Anwendung funktioniert, müssen sowohl das Fabric-Netzwerk als auch die Compose-Container laufen.

---

# Normaler Start nach einem Neustart

Docker Desktop starten und warten, bis die Engine bereit ist. Danach in Ubuntu:

```bash
unset DOCKER_HOST
docker context use default

cd ~/Woodchain/fabric-samples/test-network
./network.sh up createChannel -c mychannel -ca

cd ~/Woodchain
docker compose up -d
```

Falls das Fabric-Netzwerk zuvor vollständig gelöscht wurde, muss der Chaincode erneut installiert werden:

```bash
cd ~/Woodchain/fabric-samples/test-network
./network.sh deployCC \
  -ccn woodchain \
  -ccp ../../chaincode/woodchain \
  -ccl java \
  -ccv 1.0 \
  -ccs 1
```

---

# Anwendung stoppen

## Nur Webanwendung und MySQL stoppen

```bash
cd ~/Woodchain
docker compose down
```

## Fabric-Netzwerk stoppen und entfernen

```bash
cd ~/Woodchain/fabric-samples/test-network
./network.sh down
```

`network.sh down` entfernt das Testnetzwerk und dessen Ledger-Daten. Beim nächsten Neuaufbau muss der Chaincode erneut installiert werden.

---

# Alles vollständig neu aufbauen

Dieser Ablauf entfernt die aktuellen Compose-Container, die MySQL-Daten und das Fabric-Testnetzwerk:

```bash
cd ~/Woodchain
docker compose down -v

cd ~/Woodchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c mychannel -ca
./network.sh deployCC \
  -ccn woodchain \
  -ccp ../../chaincode/woodchain \
  -ccl java \
  -ccv 1.0 \
  -ccs 1

cd ~/Woodchain
docker compose up --build -d
```

> Achtung: `docker compose down -v` löscht auch die Daten aus dem MySQL-Volume.

---

# Kontrolle und Fehlersuche

## Welche Container laufen?

```bash
docker ps
docker ps -a
```

## Status der WoodChain-Container

```bash
cd ~/Woodchain
docker compose ps
```

## Logs anzeigen

```bash
cd ~/Woodchain
docker compose logs --tail=200
```

## Container erscheinen nicht in Docker Desktop

Zuerst prüfen, welche Docker-Engine Ubuntu verwendet:

```bash
unset DOCKER_HOST
docker context use default
docker context show
docker info --format '{{.Name}}'
docker context ls
```

Erwartet wird:

- Kontext: `default`
- Engine-Name: normalerweise `docker-desktop`

Danach Docker Desktop vollständig neu starten und erneut ausführen:

```bash
cd ~/Woodchain
docker compose up -d
docker ps
```

Wenn `docker info --format '{{.Name}}'` einen anderen Linux-Rechnernamen anzeigt, läuft wahrscheinlich noch eine zweite, direkt in Ubuntu installierte Docker-Engine. Dann wurden die Container nicht in Docker Desktop erstellt.

## Compose zeigt keine Container an

`docker compose ps` zeigt nur Container des Compose-Projekts im aktuellen Ordner. Deshalb immer zuerst in den Projektordner wechseln:

```bash
cd ~/Woodchain
docker compose ps -a
```

Fabric-Container gehören nicht zu dieser Compose-Datei. Sie werden stattdessen mit folgendem Befehl angezeigt:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

## Port 8080 ist bereits belegt

```bash
sudo ss -ltnp | grep ':8080'
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

## Anwendung startet immer wieder neu

```bash
cd ~/Woodchain
docker compose ps -a
docker compose logs --tail=200 woodchain_app
```

Häufige Ursachen sind:

- Fabric-Netzwerk läuft nicht
- Chaincode `woodchain` wurde nicht installiert
- falscher Channel- oder Chaincode-Name
- MySQL ist noch nicht bereit
- Zertifikatspfade stimmen nicht

## Prüfen, ob der Chaincode installiert ist

```bash
docker exec cli peer lifecycle chaincode querycommitted \
  --channelID mychannel \
  --name woodchain
```

Falls kein Container namens `cli` vorhanden ist, kann die Prüfung über die Peer-Umgebungsvariablen des Fabric-Testnetzwerks erfolgen.

---

# Aufbau des Projekts

```text
Woodchain/
├── chaincode/woodchain/     eigener Java-Chaincode
├── fabric-samples/          lokales Fabric-Testnetzwerk
├── src/                     Spring-Boot-Anwendung und Frontend
├── compose.yml              Webanwendung und MySQL (ggf. docker-compose.yml)
├── Dockerfile               Docker-Image der Webanwendung
└── pom.xml                  Maven-Konfiguration
```

`fabric-samples` wird bei der Installation lokal heruntergeladen und muss nicht zwingend im GitHub-Repository gespeichert werden. Der eigene Chaincode unter `chaincode/woodchain` gehört dagegen zum Projekt und wird mit Git versioniert.

---

# Technischer Ablauf

1. Ein Benutzer führt in der Weboberfläche eine Aktion aus.
2. Die Spring-Boot-Anwendung verarbeitet die Anfrage.
3. Die Fabric Gateway API sendet eine Transaktion an Hyperledger Fabric.
4. Die Peers prüfen und bestätigen die Transaktion.
5. Der Orderer ordnet die Transaktionen und erzeugt neue Blöcke.
6. Die bestätigten Daten werden unveränderbar im Ledger gespeichert.
7. MySQL speichert zusätzliche Anwendungsdaten wie Benutzer und Rollen.

---

# Rohe Blockchain ansehen

Zuerst die Umgebung für Peer 0 von Organisation 1 setzen:

```bash
cd ~/Woodchain/fabric-samples/test-network

export PATH="$HOME/Woodchain/fabric-samples/bin:$PATH"
export FABRIC_CFG_PATH="$HOME/Woodchain/fabric-samples/config"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PWD/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"
export ORDERER_CA="$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
```

## Anzahl der Blöcke anzeigen

```bash
peer channel getinfo -c mychannel
```

`height` ist die aktuelle Anzahl der Blöcke. Bei `"height":6` existieren die Blöcke mit den Nummern 0 bis 5.

## Neuesten Block herunterladen

```bash
mkdir -p ~/Woodchain/blocks

peer channel fetch newest \
  ~/Woodchain/blocks/newest.block \
  -c mychannel \
  -o localhost:7050 \
  --tls \
  --cafile "$ORDERER_CA"
```

Der Block ist zunächst eine binäre Protobuf-Datei. So wird er als lesbare JSON-Datei gespeichert:

```bash
configtxlator proto_decode \
  --input ~/Woodchain/blocks/newest.block \
  --type common.Block \
  --output ~/Woodchain/blocks/newest.json
```

## Alle Blöcke einzeln in einen Ordner exportieren

```bash
cd ~/Woodchain/fabric-samples/test-network
mkdir -p ~/Woodchain/blocks

HEIGHT=$(peer channel getinfo -c mychannel 2>&1 \
  | sed -n 's/.*"height":\([0-9]*\).*/\1/p')

for ((i=0; i<HEIGHT; i++)); do
  peer channel fetch "$i" \
    "$HOME/Woodchain/blocks/block_$i.block" \
    -c mychannel \
    -o localhost:7050 \
    --tls \
    --cafile "$ORDERER_CA"

  configtxlator proto_decode \
    --input "$HOME/Woodchain/blocks/block_$i.block" \
    --type common.Block \
    --output "$HOME/Woodchain/blocks/block_$i.json"
done
```

Danach enthält `~/Woodchain/blocks` jeden Block einzeln als `.block`- und `.json`-Datei.

## Warum gibt es nach der ersten Holzcharge schon mehrere Blöcke?

Nicht nur eine Holzcharge erzeugt Blockchain-Blöcke. Bereits beim Einrichten werden technische Transaktionen gespeichert, zum Beispiel:

- Erstellung und Konfiguration des Channels
- Freigaben des Chaincodes durch die Organisationen
- Aktivierung der Chaincode-Definition
- eigentliche WoodChain-Transaktionen

Deshalb bedeutet beispielsweise eine Blockhöhe von 6 nicht, dass sechs Holzchargen angelegt wurden. Einige Blöcke gehören zur Einrichtung des Netzwerks.

## Rollen

- `ADMIN` – Verwaltung und vollständige Übersicht
- `FOERSTER` – Holzernte und Anlage neuer Holzchargen
- `LOGISTIK` – Transport
- `SAEGEWERK` – Verarbeitung
- `HANDEL` – Handel und Verkauf

---

# Wichtige Begriffe

- **Blockchain:** Verkettete Folge von Blöcken mit bestätigten Transaktionen.
- **Hyperledger Fabric:** Private Blockchain-Plattform für Unternehmen.
- **Peer:** Knoten, der den Ledger speichert und Transaktionen prüft.
- **Orderer:** Ordnet bestätigte Transaktionen und erstellt Blöcke.
- **Channel:** Getrennter Kommunikations- und Ledger-Bereich. WoodChain verwendet `mychannel`.
- **Chaincode:** Smart Contract mit den Regeln der Anwendung. Er heißt `woodchain`.
- **Ledger:** Gesamter Datenbestand aus Blockchain und aktuellem Weltzustand.
- **Certificate Authority:** Erstellt digitale Identitäten und Zertifikate.
- **Docker:** Startet die einzelnen Bestandteile in isolierten Containern.

---

# Änderungen zu GitHub hochladen

```bash
cd ~/Woodchain
git status
git add .
git commit -m "Projekt aktualisiert"
git pull --rebase origin main
git push origin main
```

Die Adresse des Repositorys kann bei Bedarf korrigiert werden:

```bash
git remote set-url origin https://github.com/A-Baichenko/Woodchain.git
git remote -v
```

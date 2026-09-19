# Vokabeltrainer

Eine Lern-App, die Vokabeln nicht nur abfragt, sondern auf schnelles Behalten
optimiert ist: **Bild → Bedeutung → aktiver Abruf → Schreiben → Audio →
sofortiges Feedback → schwieriges Wort erneut abrufen.**

Kein Spaced-Repetition-System mit Tagesintervallen. Stattdessen erkennt die App
**innerhalb einer Lernsession**, welche Wörter Mühe machen, und fragt genau
diese häufiger und genau in der Übungsart ab, in der sie nicht saßen.

## Starten

Die App braucht keinen Build-Schritt und keine Abhängigkeiten – nur einen
kleinen Webserver, weil ES-Module über `file://` nicht geladen werden dürfen:

```bash
cd vokabeltrainer
python3 -m http.server 8777      # oder: npx http-server -p 8777
```

Dann <http://localhost:8777/> öffnen. Drei Beispiel-Lernsets (Englisch Alltag,
Englisch Essen & Trinken, Spanisch) sind vorhanden, die App ist sofort testbar.

Alle Daten liegen im `localStorage` des Browsers.

## Die Übungsarten

| Übung | Vorderseite | Aufgabe |
|---|---|---|
| Neues Wort | Bild, Wort, Übersetzung, Klang | einprägen (einmal pro neuem Wort) |
| Bild → Wort | nur das Bild | Wort tippen |
| Übersetzung → Fremdsprache | „Apfel“ | „apple“ tippen |
| Fremdsprache → Bedeutung | „apple“ | Bedeutung tippen oder auswählen |
| Schreiben | Bild + Bedeutung + Ton | korrekte Schreibweise tippen |
| Karteikarte | Bild/Bedeutung | selbst abrufen, dann aufdecken und bewerten |
| Hören → Schreiben | nur Ton | Wort aus dem Gehör schreiben |

Die Reihenfolge wird in jeder Runde neu gemischt. Welche Übung ein Wort
bekommt, hängt davon ab, was bei diesem Wort noch nicht sitzt.

## Wie die adaptive Wiederholung arbeitet

Jedes Wort bekommt für die Dauer der Runde einen Schwierigkeitswert („Hitze“):

* **falsch** → Hitze steigt deutlich, das Wort kehrt nach 2–3 anderen Aufgaben
  zurück – in derselben Übungsart, die nicht saß.
* **wieder falsch** → höhere Priorität, das Wort drängt sich nach vorne.
* **richtig** → Hitze sinkt, der Abstand zur nächsten Abfrage wächst; das Wort
  kommt später noch einmal, aber nicht sofort.

Ein Wort gilt für die Runde als **gesichert**, wenn es mehrfach *und* in
mindestens zwei verschiedenen Übungsarten selbstständig abgerufen wurde.
Der Fortschrittsbalken zählt gesicherte Wörter, nicht durchgeklickte Karten.

## Fehler werden sofort genutzt

Nach einer falschen Antwort springt die App nicht zum nächsten Wort:

1. Die richtige Lösung wird gezeigt und benannt, was falsch war.
2. Das Eingabefeld wird geleert – das Wort muss einmal korrekt geschrieben werden.
3. Das Wort kehrt kurz darauf in derselben Übungsart zurück.

Tippfehler werden erkannt (auch vertauschte Buchstaben: `appel` → `apple`),
aber nicht stillschweigend als richtig gewertet: Sie zählen als Schreibfehler,
müssen korrigiert werden und steuern die Schreibübung an. Eine Antwort, die
zufällig eine **andere Vokabel der Runde** ist, gilt immer als falsch.

## Hinweise

Vier Stufen: Bild hervorheben → erster Buchstabe → erste zwei Buchstaben →
Lösung. Jede genutzte Stufe wird gezählt und senkt den Wert des Abrufs; ein
selbstständig abgerufenes Wort steigt schneller auf „beherrscht“.

## Aufbau des Codes

```
index.html          Gerüst
app.css             Oberfläche (hell/dunkel, mobil)
js/
  core/             DOM-Hilfen, Speicher (localStorage), Formate
  data/             Vokabelmodell, Beispieldaten, Bildkatalog, Import
  learn/            Antwortprüfung, Übungsarten, Hinweise,
                    Aufgaben-Generator, adaptive Wiederholung, Sessionablauf
  audio/            Aussprache (Sprachausgabe oder eigene Tondatei)
  progress/         Fortschrittsberechnung
  ui/               Ansichten (Start, Editor, Session, Ergebnis, Fortschritt)
```

Die Lernlogik in `js/learn/` kennt keine Oberfläche, die Oberfläche keine
Lernlogik: `Lernsession` liefert die nächste Aufgabe, nimmt Antworten entgegen
und meldet, was als Nächstes zu tun ist.

## Tests

Die Lernlogik (Antwortprüfung, adaptive Wiederholung, Aufgabenwahl, Import)
wird ohne Browser und ohne Abhängigkeiten geprüft:

```bash
node tests/logik.test.mjs
```

## Vokabeln aus einem Foto

Eine Vokabelliste aus dem Schulbuch oder dem Heft abfotografieren – „📷 Aus
Foto“ auf der Startseite oder im Lernset. Claude liest das Bild, ordnet die
beiden Spalten nach Sprache zu (nicht nach Position) und erkennt auch
Handschrift.

**Artikel gehören zur Vokabel und werden mitgenommen.** Sie landen in einem
eigenen Feld (`la casa`, `the window`), sind in der Prüfliste sichtbar und
änderbar und werden beim Lernen überall mit angezeigt. Wird beim Abfragen nur
das Wort ohne Artikel getippt, zählt die Antwort als richtig, gilt aber als
unvollständig: die volle Form wird angezeigt und einmal geschrieben, und das
Wort ist für die Runde noch nicht gesichert. Ein falscher Artikel wird
ebenso benannt.

**Mehrere Seiten** gehen in einem Durchgang: Fotos nacheinander hinzufügen
(bis zu 12), einzelne Seiten wieder entfernen, dann alle zusammen auswerten.
Die Seiten werden in Anfragen zu je drei Bildern gelesen – der Fortschritt
zeigt, welche Seite gerade dran ist – und die Ergebnisse in der Reihenfolge
der Bilder zusammengeführt. Vokabeln, die auf zwei Fotos vorkommen (etwa bei
überlappenden Ausschnitten), erscheinen nur einmal; ergänzende Angaben wie
Artikel oder Plural werden dabei übernommen. Bricht eine Anfrage ab, bleiben
die bereits gelesenen Seiten erhalten und werden mit einem Hinweis angezeigt.

Das Erkannte wird **immer zuerst zum Prüfen angezeigt**: Wörter korrigieren,
Zeilen löschen, Bilder ändern – erst dann wird übernommen. Überschriften wie
„Unit 3“ und Nummerierungen werden aussortiert.

Diese Funktion läuft über Claude und steht deshalb nur in der veröffentlichten
Version der App zur Verfügung; die Anfrage geht über das Claude-Konto des
Nutzers. In einer lokalen Kopie sagt der Dialog das und verweist auf den
Import als Textliste.

## Vokabeln anlegen

* **Einzeln** über „+ Vokabel hinzufügen“ – mit Artikel, Plural, Beispielsatz,
  Thema, Bild und eigener Tondatei.
* **Als Liste** über den Reiter „Importieren“:

  ```
  apple – Apfel
  house – Haus
  tree – Baum
  ```

  Getrennt wird an `–`, `-`, `=`, `;`, `:`, `|` oder Tabulator; ein dritter Teil
  wird als Beispielsatz übernommen. CSV mit Kopfzeile
  (`wort;bedeutung;artikel;plural;beispiel;kategorie;bild`) wird ebenfalls
  erkannt, auch als Datei.

Zu jedem importierten Wort wird automatisch ein passendes Symbol
vorgeschlagen – das Bild ist der Gedächtnisanker und wird bei jedem späteren
Abruf desselben Wortes wieder verwendet. Eigene Fotos werden beim Hochladen auf
640 px verkleinert, damit der Browserspeicher nicht überläuft.

## Audio

Die Aussprache kommt aus der Sprachausgabe des Browsers (passend zur
eingestellten Sprache des Lernsets) oder aus einer eigenen Tondatei an der
Vokabel. Steht für eine Sprache keine Stimme bereit, entfallen Hörübungen
automatisch – Audio ist nie die einzige Lernform, sondern immer mit Abrufen
oder Schreiben verbunden.

## Hinweis zur Website in diesem Repository

Der Vokabeltrainer liegt bewusst in einem eigenen Ordner und hat mit der
Website von A.Awad Bauservice nichts zu tun. `build.js` und der
Veröffentlichungs-Workflow der Website fassen diesen Ordner nicht an.

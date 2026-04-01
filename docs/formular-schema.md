# Schema fuer online Formulare

Diese Datei beschreibt das JSON-Format fuer Frageboegen in der App so, dass es gut in KI-Prompts verwendet werden kann.

## Ziel

Die App erwartet fuer jeden Fragebogen eine JSON-Definition.

Diese Definition beschreibt:

- den Titel des Fragebogens
- optional einen Beschreibungstext
- optional einen Dankestext
- die Abschnitte des Fragebogens
- die Fragen innerhalb dieser Abschnitte
- optionale Erlaeuterungstexte zwischen Fragen
- den Fragetyp jeder Frage
- ob eine Frage Pflicht ist
- bei Auswahlfragen die moeglichen Optionen

Das Ziel fuer KI-gestuetzte Erzeugung ist:

1. Anforderungen an einen Fragebogen beschreiben
2. Rueckfragen klaeren
3. die Struktur in sinnvolle Abschnitte gliedern
4. am Ende valides JSON nach diesem Schema erzeugen

## Prompt-Vorlage fuer KI

Du kannst einer KI zum Beispiel diesen Prompt geben:

```text
Ich moechte ein Formular nach diesem Schema entwickeln.

Erzeuge am Ende ausschliesslich valides JSON fuer die App.
Wenn Informationen fehlen, stelle erst Rueckfragen.
Strukturiere das Formular in sinnvolle sections, wenn thematische Bloecke sinnvoll sind.
Wenn zwischen Fragen Erlaeuterungen, Hinweise oder Ueberleitungstexte gewuenscht sind, nutze content-Elemente.
Verwende fuer ids nur Buchstaben, Zahlen, Bindestriche und Unterstriche.
Verwende fuer Pflichtfelder "required": true, sonst false.
Bei Auswahlfragen muessen Optionen als Array mit value und label angegeben werden.

Schema:
- title: string, Pflicht
- descriptionMd: string, optionaler Beschreibungstext
- thankYouMd: string, optionaler Dankestext nach dem Absenden
- sections: Array von Abschnitten, mindestens 1 Eintrag

Jede section hat:
- id: string, Pflicht
- title: string, Pflicht
- descriptionMd: string, optional
- items: Array, mindestens 1 Eintrag

Jedes item ist entweder:

1. Frage
- kind: "question"
- id: string, Pflicht
- type: einer von text, textarea, email, number, date, singleChoice, multiChoice
- label: string, Pflicht
- helpTextMd: string, optional
- required: boolean, Pflicht

Zusatzfelder je nach type:
- text: optional placeholder
- textarea: optional placeholder, optional rows
- email: optional placeholder
- number: optional min, optional max, optional step
- date: optional min, optional max
- singleChoice: options ist Pflicht
- multiChoice: options ist Pflicht

2. Erlaeuterungstext
- kind: "content"
- id: string, Pflicht
- textMd: string, Pflicht

Optionen haben:
- value: string, Pflicht
- label: string, Pflicht
```

## Vollstaendiges Schema

### Wurzelobjekt

Das JSON fuer einen Fragebogen hat diese Struktur:

```json
{
  "title": "string",
  "descriptionMd": "string",
  "thankYouMd": "string",
  "sections": []
}
```

### Felder des Wurzelobjekts

- `title`
  - Typ: `string`
  - Pflicht: ja
  - Bedeutung: Titel des Fragebogens

- `descriptionMd`
  - Typ: `string`
  - Pflicht: nein
  - Bedeutung: Beschreibung unter dem Titel
  - Hinweis: Die App kann diesen Text je nach Ansicht anzeigen oder ausblenden

- `thankYouMd`
  - Typ: `string`
  - Pflicht: nein
  - Bedeutung: Dankestext nach dem Absenden

- `sections`
  - Typ: `array`
  - Pflicht: ja
  - Muss enthalten: mindestens einen Abschnitt

## Aufbau eines Abschnitts

Jeder Abschnitt ist ein Objekt mit diesen Feldern:

- `id`
  - Typ: `string`
  - Pflicht: ja
  - Muss eindeutig sein
  - Erlaubte Zeichen: Buchstaben, Zahlen, `_`, `-`

- `title`
  - Typ: `string`
  - Pflicht: ja
  - Bedeutung: sichtbare Ueberschrift des Abschnitts

- `descriptionMd`
  - Typ: `string`
  - Pflicht: nein
  - Bedeutung: optionaler Einleitungstext des Abschnitts

- `items`
  - Typ: `array`
  - Pflicht: ja
  - Muss enthalten: mindestens ein Element
  - Elemente koennen Fragen oder Erlaeuterungstexte sein

## Aufbau eines Items in `sections[].items`

Jedes Item braucht ein Feld `kind`.

Erlaubte Werte:

- `question`
- `content`

### 1. Question-Item

Eine Frage in einem Abschnitt.

Gemeinsame Felder:

- `kind`
  - Typ: `string`
  - Wert: `"question"`

- `id`
  - Typ: `string`
  - Pflicht: ja
  - Muss eindeutig sein
  - Erlaubte Zeichen: Buchstaben, Zahlen, `_`, `-`
  - Beispiel: `email`, `customer_name`, `satisfaction-level`

- `type`
  - Typ: `string`
  - Pflicht: ja
  - Erlaubte Werte:
    - `text`
    - `textarea`
    - `email`
    - `number`
    - `date`
    - `singleChoice`
    - `multiChoice`

- `label`
  - Typ: `string`
  - Pflicht: ja
  - Bedeutung: sichtbare Fragebezeichnung

- `helpTextMd`
  - Typ: `string`
  - Pflicht: nein
  - Bedeutung: optionaler Hilfetext unter der Frage

- `required`
  - Typ: `boolean`
  - Pflicht: ja
  - Bedeutung: `true` fuer Pflichtfrage, sonst `false`

## Fragetypen

### 1. text

Einfache einzeilige Texteingabe.

Zusaetzliche Felder:

- `placeholder`: `string`, optional

Beispiel:

```json
{
  "kind": "question",
  "id": "name",
  "type": "text",
  "label": "Ihr Name",
  "required": true,
  "placeholder": "Max Mustermann"
}
```

### 2. textarea

Mehrzeilige Texteingabe.

Zusaetzliche Felder:

- `placeholder`: `string`, optional
- `rows`: `number`, optional

Beispiel:

```json
{
  "kind": "question",
  "id": "comment",
  "type": "textarea",
  "label": "Ihre Anmerkungen",
  "required": false,
  "rows": 5,
  "placeholder": "Schreiben Sie hier Ihren Kommentar"
}
```

### 3. email

E-Mail-Feld.

Zusaetzliche Felder:

- `placeholder`: `string`, optional

Beispiel:

```json
{
  "kind": "question",
  "id": "email",
  "type": "email",
  "label": "Ihre E-Mail-Adresse",
  "required": true,
  "placeholder": "name@example.com"
}
```

### 4. number

Zahlenfeld.

Zusaetzliche Felder:

- `min`: `number`, optional
- `max`: `number`, optional
- `step`: `number`, optional

Beispiel:

```json
{
  "kind": "question",
  "id": "age",
  "type": "number",
  "label": "Ihr Alter",
  "required": false,
  "min": 0,
  "max": 120,
  "step": 1
}
```

### 5. date

Datumsfeld.

Zusaetzliche Felder:

- `min`: `string`, optional
- `max`: `string`, optional

Hinweis:

- Datumswerte sollten als ISO-Datum geschrieben werden, z. B. `2026-04-01`

Beispiel:

```json
{
  "kind": "question",
  "id": "appointment_date",
  "type": "date",
  "label": "Wunschtermin",
  "required": true,
  "min": "2026-04-01",
  "max": "2026-12-31"
}
```

### 6. singleChoice

Genau eine Option aus mehreren.

Zusaetzliche Felder:

- `options`: Pflicht

`options` ist ein Array von Objekten:

- `value`: `string`, Pflicht
- `label`: `string`, Pflicht

Beispiel:

```json
{
  "kind": "question",
  "id": "satisfaction",
  "type": "singleChoice",
  "label": "Wie zufrieden sind Sie?",
  "required": true,
  "options": [
    { "value": "very-good", "label": "Sehr zufrieden" },
    { "value": "good", "label": "Zufrieden" },
    { "value": "neutral", "label": "Neutral" },
    { "value": "bad", "label": "Unzufrieden" }
  ]
}
```

### 7. multiChoice

Mehrere Optionen gleichzeitig moeglich.

Zusaetzliche Felder:

- `options`: Pflicht

Beispiel:

```json
{
  "kind": "question",
  "id": "topics",
  "type": "multiChoice",
  "label": "Welche Themen interessieren Sie?",
  "required": false,
  "options": [
    { "value": "price", "label": "Preis" },
    { "value": "quality", "label": "Qualitaet" },
    { "value": "support", "label": "Support" }
  ]
}
```

## Content-Item

Ein Erlaeuterungs- oder Hinweistext innerhalb eines Abschnitts.

Felder:

- `kind`
  - Typ: `string`
  - Wert: `"content"`

- `id`
  - Typ: `string`
  - Pflicht: ja
  - Muss innerhalb des Fragebogens eindeutig sein

- `textMd`
  - Typ: `string`
  - Pflicht: ja
  - Bedeutung: sichtbarer Text zwischen Fragen

Beispiel:

```json
{
  "kind": "content",
  "id": "privacy_hint",
  "textMd": "Ihre Angaben werden ausschliesslich fuer die interne Auswertung verwendet."
}
```

## Komplettes Beispiel

```json
{
  "title": "Kundenfeedback April 2026",
  "descriptionMd": "Bitte beantworten Sie die Fragen kurz.",
  "thankYouMd": "Vielen Dank fuer Ihre Teilnahme.",
  "sections": [
    {
      "id": "contact",
      "title": "Kontaktdaten",
      "descriptionMd": "Bitte tragen Sie zuerst Ihre Kontaktdaten ein.",
      "items": [
        {
          "kind": "content",
          "id": "contact_intro",
          "textMd": "Wir nutzen Ihre Angaben nur fuer die Kontaktaufnahme zu diesem Feedback."
        },
        {
          "kind": "question",
          "id": "name",
          "type": "text",
          "label": "Ihr Name",
          "required": true,
          "placeholder": "Max Mustermann"
        },
        {
          "kind": "question",
          "id": "email",
          "type": "email",
          "label": "Ihre E-Mail-Adresse",
          "required": true,
          "placeholder": "max@example.com"
        }
      ]
    },
    {
      "id": "feedback",
      "title": "Feedback",
      "items": [
        {
          "kind": "question",
          "id": "satisfaction",
          "type": "singleChoice",
          "label": "Wie zufrieden sind Sie insgesamt?",
          "required": true,
          "options": [
            { "value": "very-happy", "label": "Sehr zufrieden" },
            { "value": "happy", "label": "Zufrieden" },
            { "value": "neutral", "label": "Neutral" },
            { "value": "unhappy", "label": "Unzufrieden" }
          ]
        },
        {
          "kind": "content",
          "id": "topics_hint",
          "textMd": "Bei der naechsten Frage koennen Sie mehrere Themen auswaehlen."
        },
        {
          "kind": "question",
          "id": "topics",
          "type": "multiChoice",
          "label": "Welche Themen interessieren Sie besonders?",
          "required": false,
          "options": [
            { "value": "price", "label": "Preis" },
            { "value": "quality", "label": "Qualitaet" },
            { "value": "support", "label": "Support" }
          ]
        },
        {
          "kind": "question",
          "id": "comment",
          "type": "textarea",
          "label": "Gibt es noch etwas, das wir wissen sollten?",
          "required": false,
          "rows": 5
        }
      ]
    }
  ]
}
```

## Gute Anweisungen fuer KI

Wenn du mit KI iterativ zu einem Fragebogen kommen willst, helfen diese Zusatzanweisungen:

```text
Fuehre mich schrittweise zu einer finalen JSON-Definition.
Stelle zuerst Rueckfragen zu Ziel, Zielgruppe, Abschnitten, Fragen, Fragetypen und Pflichtfeldern.
Pruefe, ob das Formular in thematische sections gegliedert werden sollte.
Pruefe, ob zwischen Fragen Erlaeuterungen oder Uebergaenge als content-Elemente sinnvoll sind.
Schlage sinnvolle ids fuer sections, content-Elemente und Fragen vor.
Zeige vor dem finalen JSON kurz eine strukturierte Zusammenfassung des Formulars.
Gib am Ende nur das fertige JSON ohne Erklaerung aus.
```

## Wichtige Regeln

- `sections` darf nicht leer sein
- jede `section.id` muss eindeutig sein
- jede `question.id` muss eindeutig sein
- jede `content.id` muss eindeutig sein
- `singleChoice` und `multiChoice` brauchen `options`
- `required` muss immer als `true` oder `false` gesetzt sein
- bei leerem optionalem Textfeld kann das Feld weggelassen oder als leerer String gesetzt werden

## Rueckwaertskompatibilitaet

Die App akzeptiert intern noch ein aelteres Format mit einem top-level-Feld `questions`.
Fuer neue Formulare solltest du aber immer das hier dokumentierte Format mit `sections` und `items` verwenden.

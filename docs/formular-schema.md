# Formularschema fuer die App

Diese Datei beschreibt das JSON-Format fuer Frageboegen in der App so, dass es gut in KI-Prompts verwendet werden kann.

## Ziel

Die App erwartet fuer jeden Fragebogen eine JSON-Definition.

Diese Definition beschreibt:

- den Titel des Fragebogens
- optional einen Beschreibungstext
- optional einen Dankestext
- alle Fragen
- den Fragetyp jeder Frage
- ob eine Frage Pflicht ist
- bei Auswahlfragen die moeglichen Optionen

Das Ziel fuer KI-gestuetzte Erzeugung ist:

1. Anforderungen an einen Fragebogen beschreiben
2. Rueckfragen klaeren
3. am Ende valides JSON nach diesem Schema erzeugen

## Prompt-Vorlage fuer KI

Du kannst einer KI zum Beispiel diesen Prompt geben:

```text
Ich moechte ein Formular nach diesem Schema entwickeln.

Erzeuge am Ende ausschliesslich valides JSON fuer die App.
Wenn Informationen fehlen, stelle erst Rueckfragen.
Verwende fuer question.id nur Buchstaben, Zahlen, Bindestriche und Unterstriche.
Verwende fuer Pflichtfelder "required": true, sonst false.
Bei Auswahlfragen muessen Optionen als Array mit value und label angegeben werden.

Schema:
- title: string, Pflicht
- descriptionMd: string, optionaler Beschreibungstext
- thankYouMd: string, optionaler Dankestext nach dem Absenden
- questions: Array von Fragen, mindestens 1 Eintrag

Jede Frage hat:
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
  "questions": []
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

- `questions`
  - Typ: `array`
  - Pflicht: ja
  - Muss enthalten: mindestens eine Frage

## Allgemeiner Aufbau einer Frage

Jede Frage ist ein Objekt mit gemeinsamen Feldern und typspezifischen Zusatzfeldern.

Gemeinsame Felder:

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

## Komplettes Beispiel

```json
{
  "title": "Kundenfeedback April 2026",
  "descriptionMd": "Bitte beantworten Sie die Fragen kurz. Die Antworten werden direkt an die angegebene E-Mail-Adresse gesendet.",
  "thankYouMd": "Vielen Dank. Unten sehen Sie Ihre Antworten noch einmal in strukturierter Form.",
  "questions": [
    {
      "id": "name",
      "type": "text",
      "label": "Ihr Name",
      "required": true,
      "placeholder": "Max Mustermann"
    },
    {
      "id": "email",
      "type": "email",
      "label": "Ihre E-Mail-Adresse",
      "required": true,
      "placeholder": "max@example.com"
    },
    {
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
      "id": "comment",
      "type": "textarea",
      "label": "Gibt es noch etwas, das wir wissen sollten?",
      "required": false,
      "rows": 5
    }
  ]
}
```

## Gute Anweisungen fuer KI

Wenn du mit KI iterativ zu einem Fragebogen kommen willst, helfen diese Zusatzanweisungen:

```text
Fuehre mich schrittweise zu einer finalen JSON-Definition.
Stelle zuerst Rueckfragen zu Ziel, Zielgruppe, Fragen, Fragetypen und Pflichtfeldern.
Schlage sinnvolle ids fuer die Fragen vor.
Zeige vor dem finalen JSON kurz eine strukturierte Zusammenfassung des Formulars.
Gib am Ende nur das fertige JSON ohne Erklaerung aus.
```

## Wichtige Regeln

- `questions` darf nicht leer sein
- jede `id` muss eindeutig sein
- `singleChoice` und `multiChoice` brauchen `options`
- `required` muss immer als `true` oder `false` gesetzt sein
- bei leerem optionalem Textfeld kann das Feld weggelassen oder als leerer String gesetzt werden


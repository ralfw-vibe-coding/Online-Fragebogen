# Online Frageboegen

Eine kleine Web-Anwendung zum Anlegen, Vorschauen, Veroeffentlichen und Auswerten von Online-Frageboegen.

## Zweck

Die App ist fuer einen sehr einfachen Fragebogen-Workflow gebaut:

1. Im Admin-Bereich wird ein Fragebogen angelegt.
2. Die Definition des Fragebogens liegt als JSON vor.
3. Alternativ kann die JSON-Definition per KI aus einem natuerlichsprachlichen Prompt erzeugt werden.
4. Der Fragebogen wird sofort in einer Live-Vorschau angezeigt.
5. Nach dem Speichern bekommt der Fragebogen einen oeffentlichen Link.
6. Teilnehmer fuellen den Fragebogen ueber den Link aus.
7. Antworten werden in Postgres gespeichert.
8. Zusaetzlich wird eine E-Mail mit Markdown- und JSON-Inhalt an die hinterlegte Empfaengeradresse gesendet.

## Funktionen

- Admin-Login mit PIN
- Frageboegen anlegen
- Frageboegen bearbeiten
- Frageboegen loeschen, inklusive Antworten
- Live-Vorschau waehrend der Bearbeitung
- Oeffentliche Formularseite
- Danke-Seite mit lesbarer Antwortzusammenfassung
- Link oeffnen
- Link kopieren
- KI-gestuetzte Erzeugung der Formular-JSON aus einem Prompt

## Architektur

Das Projekt ist ein kleines Monorepo:

- `apps/server`
  - Fastify-Server
  - REST-API
  - statische Auslieferung des gebauten Frontends
  - Neon/Postgres-Anbindung
  - Resend-Mailversand
  - OpenAI-Integration fuer Formular-Generierung

- `apps/web`
  - React-Frontend mit Vite
  - Admin-Bereich
  - oeffentliche Formularansicht

- `packages/shared`
  - gemeinsames Survey-Schema
  - Zod-Validierung
  - gemeinsame Typen

- `db/schema.sql`
  - Postgres-Schema fuer Neon

## Verwendete Dienste

- Postgres bei Neon
- Resend fuer E-Mail-Versand
- OpenAI fuer Prompt -> Formular-JSON

## Voraussetzungen

- Node.js
- npm
- Neon-Projekt mit Postgres-Datenbank
- Resend-Account mit verifizierter Absenderdomain
- OpenAI-API-Key

## Lokale Einrichtung

### 1. Abhaengigkeiten installieren

```bash
npm install
```

### 2. `.env` anlegen

Am besten `.env.example` nach `.env` kopieren und die Werte fuellen.

Beispiel:

```env
NODE_ENV=development
ADMIN_PIN=123456
COOKIE_SECRET=replace-with-a-long-random-string
WEB_ORIGIN=http://localhost:5173
API_PORT=3001
DATABASE_URL=postgres://USER:PASSWORD@HOST/DB?sslmode=require
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
MAIL_FROM=no-reply@example.com
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5-mini
```

### 3. Datenbankschema ausfuehren

Die Datei [db/schema.sql](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/db/schema.sql) in Neon ausfuehren.

### 4. App lokal starten

```bash
npm run dev
```

Dann:

- Frontend: `http://localhost:5173`
- Admin: `http://localhost:5173/admin`

Das Frontend spricht lokal ueber einen Vite-Proxy mit der API.

## Build

```bash
npm run build
```

Der Build erzeugt:

- Server-Bundle in `apps/server/dist`
- Frontend-Bundle in `apps/web/dist`

Der Server liefert das gebaute Frontend selbst aus.

## Benoetigte Einrichtung pro Dienst

### Neon

Du brauchst:

- eine Postgres-Datenbank
- die `DATABASE_URL`
- das Schema aus `db/schema.sql`

Hinweis:

- Beim Loeschen eines Fragebogens werden seine Antworten per `ON DELETE CASCADE` mit geloescht.

### Resend

Du brauchst:

- `RESEND_API_KEY`
- eine verifizierte Domain
- eine gueltige Absenderadresse in `MAIL_FROM`

Beispiel:

```env
MAIL_FROM=no-reply@deinedomain.de
```

Der API-Key darf auf Senden reduziert sein. Das ist fuer diese App ausreichend.

### OpenAI

Du brauchst:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Empfohlen:

```env
OPENAI_MODEL=gpt-5-mini
```

Die App nutzt das Modell serverseitig, um aus einem natuerlichsprachlichen Prompt eine valide Formular-JSON zu erzeugen.

## Deployment auf Deno Deploy

Die App laeuft auf Deno Deploy als Dynamic App.

### Eintraege in Deno Deploy

- `Framework preset`: `No Preset`
- `Install command`: `npm install`
- `Build command`: `npm run build`
- `Pre-deploy command`: leer
- `Runtime`: `Dynamic App`
- `Entrypoint`: `apps/server/dist/index.js`
- `Runtime Working Directory`: leer
- `Arguments`: leer

Wichtig:

- Den `Entrypoint` als kompletten Pfad eintragen
- `Runtime Working Directory` leer lassen
- nicht gleichzeitig `apps/server` als Working Directory setzen, wenn der Entrypoint schon mit `apps/server/...` beginnt

### Environment Variables auf Deno Deploy

Setze dort mindestens:

- `NODE_ENV=production`
- `ADMIN_PIN`
- `COOKIE_SECRET`
- `WEB_ORIGIN`
- `DATABASE_URL`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Beispiel:

```env
NODE_ENV=production
WEB_ORIGIN=https://deine-app.deno.dev
OPENAI_MODEL=gpt-5-mini
```

## Admin-Workflow

### Fragebogen anlegen

1. Titel eintragen
2. Slug wird automatisch erzeugt
3. Empfaenger-E-Mail eintragen
4. Entweder JSON direkt pflegen oder per Prompt erzeugen
5. Live-Vorschau pruefen
6. Speichern

### Fragebogen bearbeiten

- In der Liste auf den Stift neben dem Titel klicken
- Fragebogen wird in den Editor geladen
- Beim Speichern wird der bestehende Datensatz aktualisiert

### Fragebogen loeschen

- In der Liste auf die rote Muelltonne klicken
- Die Muelltonne wird zu einem `?`
- Beim zweiten Klick wird der Fragebogen mitsamt Antworten geloescht
- Klick irgendwo anders bricht die Loeschbestaetigung wieder ab

## Oeffentliche Formularnutzung

- Der oeffentliche Link steht in der Fragebogenliste
- Teilnehmer fuellen das Formular aus
- Nach dem Absenden:
  - werden Antworten in Postgres gespeichert
  - wird eine E-Mail an die hinterlegte Empfaengeradresse gesendet
  - sieht der Teilnehmer eine lesbare Zusammenfassung seiner Antworten

## JSON-Formularschema

Die Beschreibung des JSON-Schemas fuer Formulare steht in:

[docs/formular-schema.md](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/docs/formular-schema.md)

Diese Datei ist besonders dafuer gedacht, einen KI-Prompt zu formulieren wie:

> Ich moechte ein Formular nach diesem Schema entwickeln: ...

## Wichtige Dateien

- [apps/server/src/index.ts](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/apps/server/src/index.ts)
- [apps/server/src/routes/admin.ts](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/apps/server/src/routes/admin.ts)
- [apps/server/src/routes/public.ts](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/apps/server/src/routes/public.ts)
- [apps/server/src/openai.ts](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/apps/server/src/openai.ts)
- [apps/web/src/App.tsx](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/apps/web/src/App.tsx)
- [packages/shared/src/survey.ts](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/packages/shared/src/survey.ts)
- [db/schema.sql](/Users/ralfw/Repositories/08%20Vibe%20Coding/Online%20Fragebogen/db/schema.sql)


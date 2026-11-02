# Voci-Kiste Français

Französisch-Wörtertrainer mit Karteikasten (wie der Klett-VocaTrainer zu «C'est ça»).

- **index.html**: Übungsseite für die Kinder (Name wählen, PIN tippen, üben)
- **eltern.html**: Elternseite: Fortschritt pro Kind, Wörter eintragen, Kinder verwalten

Die Seite liegt gratis auf **GitHub Pages**. Wörter, Kinder und Fortschritt werden in **Supabase** gespeichert (auch gratis).
Die Einrichtung dauert etwa 20 Minuten und muss nur einmal gemacht werden.

---

## Schritt 1 · Supabase-Projekt anlegen

1. Auf **supabase.com** ein Konto erstellen (z. B. mit GitHub anmelden).
2. **New project** wählen:
   - Name: `voci-kiste`
   - Database Password: ein sicheres Passwort, gut aufbewahren
   - Region: eine in Europa (z. B. *Central EU (Frankfurt)* oder *Zurich*)
3. Warten, bis das Projekt bereit ist (1–2 Minuten).

## Schritt 2 · Datenbank einrichten

1. Die Datei **setup.sql** in einem Texteditor öffnen.
2. Die Zeile `insert into public.admins(email) values ('IHRE-EMAIL@BEISPIEL.CH')` suchen und **Ihre E-Mail-Adresse** eintragen.
3. In Supabase links auf **SQL Editor** klicken, dann auf **New query**.
4. Den ganzen Inhalt von setup.sql hineinkopieren und auf **Run** klicken.
   Unten sollte «Success. No rows returned» stehen.

## Schritt 3 · Ihr Eltern-Login anlegen

1. In Supabase links **Authentication** → **Users** → **Add user** → **Create new user** wählen.
2. **Dieselbe E-Mail** wie in Schritt 2 und ein Passwort eintragen. **Auto Confirm User** muss angehakt sein.
3. Damit sich niemand sonst registrieren kann: **Authentication** → **Sign In / Providers** (bzw. *Providers* → *Email*) öffnen
   und **Allow new users to sign up** ausschalten.

## Schritt 4 · Verbindung eintragen

1. In Supabase **Project Settings** (Zahnrad) → **Data API** bzw. **API Keys** öffnen.
2. Die **Project URL** kopieren (sieht aus wie `https://abcdefgh.supabase.co`).
3. Den **öffentlichen Schlüssel** kopieren: *anon public* oder *Publishable key*.
   ⚠️ Den Schlüssel *service_role* bzw. *Secret key* **nie** verwenden.
4. Die Datei **config.js** öffnen und beides eintragen:
   ```js
   window.VOCI_CONFIG = {
     url: "https://abcdefgh.supabase.co",
     key: "eyJhbGciOi..."
   };
   ```

## Schritt 5 · Auf GitHub Pages stellen

1. Auf **github.com** anmelden → oben rechts **+** → **New repository**.
   - Name: `voci-kiste`
   - **Public** wählen (GitHub Pages ist für öffentliche Repositorys gratis)
   - **Create repository** klicken
2. Auf der neuen Seite **uploading an existing file** klicken.
   Alle Dateien aus diesem Ordner hineinziehen (index.html, eltern.html, app.js, eltern.js, shared.js, style.css, config.js; README.md und setup.sql dürfen mit).
   Danach **Commit changes** klicken.
3. **Settings** → **Pages** öffnen. Bei *Branch* **main** und **/ (root)** wählen und auf **Save** klicken.
4. Nach 1–2 Minuten erscheint oben die Adresse, z. B.
   `https://IHR-NAME.github.io/voci-kiste/`

- Übungsseite für die Kinder: `https://IHR-NAME.github.io/voci-kiste/`
- Elternseite: `https://IHR-NAME.github.io/voci-kiste/eltern.html`

## Schritt 6 · Loslegen

1. Die **Elternseite** öffnen und mit E-Mail und Passwort aus Schritt 3 anmelden.
2. Unter **Kinder** jedes Kind mit Vornamen und einer 4-stelligen PIN eintragen.
3. Unter **Wörter** die Unités eintragen, pro Zeile `le cahier ; das Heft`.
   Danach die zwei Beispiel-Unités löschen.
4. Auf dem Gerät des Kindes die **Übungsseite** öffnen und als Lesezeichen oder auf dem Startbildschirm speichern.
   Das Kind wählt seinen Namen und tippt die PIN. Das Gerät merkt sich die Anmeldung.

---

## Gut zu wissen

- **Pause bei Nichtgebrauch:** Gratis-Projekte bei Supabase werden nach **7 Tagen ohne Nutzung** pausiert.
  Wenn die Kinder regelmässig üben, passiert das nicht. Nach den Ferien im Supabase-Dashboard auf **Restore project** klicken.
- **Sicherheit:** Der öffentliche Schlüssel in config.js darf sichtbar sein, die Zugriffsregeln in der Datenbank schützen die Daten.
  Ohne Eltern-Login sieht niemand die Fortschritte. Die 4-stellige PIN reicht für einen Wörtertrainer, ist aber kein starkes Passwort.
  Darum nur Vornamen oder Spitznamen verwenden.
- **Übungszeit:** Gezählt wird nur aktive Zeit. Pausen über 90 Sekunden zwischen zwei Antworten fallen weg.
- **Aussprache:** Sie hängt von den Stimmen auf dem Gerät ab. Am besten klingt sie, wenn eine französische Stimme installiert ist
  (Windows: Einstellungen → Zeit und Sprache → Sprache → Französisch hinzufügen).
- **Änderungen am Code:** Datei auf GitHub öffnen → Stift-Symbol → ändern → *Commit changes*. Nach etwa einer Minute ist die Änderung online.

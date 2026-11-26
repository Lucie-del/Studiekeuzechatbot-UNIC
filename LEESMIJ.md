# UNIC Studiekeuzecoach: zo zet je hem online

## Wat zit erin

| Bestand | Wat het doet |
|---|---|
| `index.html` | De website (frontend): chatvenster, stappen en "Achter de schermen" |
| `netlify/functions/chat.mjs` | De backend: bevat de **systeemprompt** en de **API-koppeling** met het taalmodel |
| `netlify.toml` | Vertelt Netlify waar de website en de backend staan |

Zo werkt het:
leerling typt → `index.html` stuurt het gesprek naar `/api/chat` → de backend zet de systeemprompt ervoor en stuurt alles met de geheime API-sleutel naar het taalmodel (Groq) → het antwoord gaat terug naar de website.

## Stap 1: gratis API-sleutel maken

1. Ga naar https://console.groq.com en maak een gratis account.
2. Ga naar **API Keys** en klik op **Create API Key**.
3. Kopieer de sleutel (begint met `gsk_`). Zet hem nergens in de code en deel hem niet!

## Stap 2: online zetten op Netlify

Let op: slepen naar Netlify Drop werkt **niet** voor de backend. Gebruik een van deze twee manieren.

**Manier A: met GitHub (aanrader)**
1. Zet deze map in een nieuwe GitHub-repository.
2. Netlify: **Add new site → Import an existing project → GitHub**, kies de repository.
3. Laat de build-instellingen leeg en klik op **Deploy**.

**Manier B: met de Netlify CLI** (Node.js nodig)
1. Open een terminal in deze map.
2. `npx netlify-cli login`
3. `npx netlify-cli deploy --prod`

## Stap 3: de API-sleutel in Netlify zetten

1. Netlify: **Site configuration → Environment variables → Add a variable**.
2. Key: `GROQ_API_KEY`, value: jouw sleutel.
3. Ga naar **Deploys → Trigger deploy → Deploy site**, zodat de sleutel wordt gebruikt.

Klaar! Open je site en klik op **Start het gesprek**.

## Problemen?

- **"De API-sleutel ontbreekt"**: stap 3 is niet gelukt, of je bent de nieuwe deploy vergeten.
- **"Het taalmodel gaf een fout (404)"**: het model bestaat misschien niet meer. Zet in Netlify een extra variabele `GROQ_MODEL` met een model uit https://console.groq.com/docs/models (bijvoorbeeld `openai/gpt-oss-120b`).
- **"Even te veel verzoeken"**: de gratis limiet is even bereikt. Wacht een minuut.
- Foutmeldingen van de backend zie je in Netlify onder **Logs → Functions**.

## De systeemprompt aanpassen

Open `netlify/functions/chat.mjs` en pas de tekst tussen de backticks bij `const SYSTEEMPROMPT` aan. Na een nieuwe deploy gebruikt de chatbot de nieuwe versie.

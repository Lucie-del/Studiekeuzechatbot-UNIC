// Backend van de UNIC Studiekeuzecoach (Netlify Function)
// Deze code draait op de server van Netlify, niet in de browser van de leerling.
// Daardoor blijft de API-sleutel geheim en kan niemand de systeemprompt aanpassen.

// ===== 1. DE SYSTEEMPROMPT: bepaalt de rol en de regels van de chatbot =====
const SYSTEEMPROMPT = `Je bent de UNIC Studiekeuzecoach: een vriendelijke, neutrale studiekeuzecoach voor havo- en vwo-leerlingen van Unic Utrecht. Je werkt zoals een goede decaan: je kiest niet voor de leerling, maar helpt de leerling met goede vragen zelf ontdekken wat past.

GESPREKSPAD — behandel deze tien onderwerpen in deze volgorde, één open vraag per bericht:
1. Interesses: waar word je enthousiast van?
2. Schoolvakken: welke vakken vind je leuk of gaan je goed af?
3. Aanpak: wat doe je graag bij een opdracht (onderzoeken, ontwerpen, problemen oplossen, samenwerken)?
4. Voorkeuren: werk je liever met mensen, data, techniek, ideeën of taal?
5. Leerwijze: praktisch bezig zijn, theoretisch verdiepen of een combinatie?
6. Samenwerken: zelfstandig, in een team, of met veel vrijheid?
7. Thema's: welke onderwerpen wil je later aanpakken?
8. Sterke kanten: wat zijn je kwaliteiten?
9. Niveau: denk je aan hbo, wo, of weet je het nog niet?
10. Toekomst: wat vind je belangrijk in een studie of baan?
Deze vragen zijn gebaseerd op de vijf LOB-competenties (kwaliteiten, motieven, werkexploratie, loopbaansturing, netwerken) en de RIASEC-interessetypes van Holland.

REGELS
- Stel open vragen, nooit ja/nee-vragen. Houd berichten kort (maximaal 3 zinnen) en spreek de leerling aan met "je".
- Geef bij elke vraag 3 of 4 korte voorbeeldantwoorden. De leerling mag ook in eigen woorden antwoorden.
- Doorvragen: is een antwoord heel kort of vaag, stel dan één verdiepende open vraag over hetzelfde onderwerp (bijvoorbeeld "Wat vind je daar precies leuk aan?"). Doe dat hooguit één keer per onderwerp en ga daarna verder.
- Praat de leerling niet naar de mond. Zegt de leerling iets stelligs zonder reden (bijvoorbeeld "ik moet geneeskunde doen van mijn ouders"), stel dan vriendelijk een kritische tegenvraag.
- Voorkom bias: doe geen aannames op basis van geslacht, afkomst of achtergrond, vraag daar nooit naar en gebruik geen stereotypes. Kijk breed naar hbo- en wo-opleidingen.
- Vraag niet naar persoonlijke gegevens (naam, adres, school, telefoonnummer). Noemt de leerling ze toch, herhaal ze dan niet.
- Gaat het gesprek over iets anders dan studiekeuze, breng het vriendelijk terug. Merk je dat de leerling ergens mee worstelt (stress, verdriet), reageer dan begripvol en raad aan met een mentor, decaan of iemand die de leerling vertrouwt te praten.
- Noem alleen bestaande Nederlandse opleidingen. Weet je iets niet zeker, zeg dat dan en verwijs naar Studiekeuze123.nl.

AFSLUITING — als alle tien onderwerpen besproken zijn:
- Geef precies drie opleidingen die passen bij de antwoorden, rekening houdend met de voorkeur voor hbo of wo.
- Geef per opleiding: de naam, het niveau, waarom die past (verwijs naar wat de leerling zei) en één ding om zelf te checken.
- Sluit af met: dit is geen definitief advies; bekijk vakken en toelatingseisen, ga naar een open dag of meeloopdag en praat met je decaan.

ANTWOORDFORMAAT — antwoord ALTIJD met alleen geldige JSON, zonder tekst eromheen:
{"bericht": "je bericht aan de leerling", "stap": 1, "voorbeelden": ["…", "…", "…"], "klaar": false, "studies": []}
- "stap" is het nummer (1–10) van het onderwerp waar je vraag over gaat.
- Bij de afsluiting: "klaar": true, "stap": 10, "voorbeelden": [] en "studies": [{"naam": "…", "niveau": "hbo of wo", "waarom": "…", "checken": "…"}] met precies drie studies; zet de afsluitende tekst in "bericht".`;

// ===== 2. INSTELLINGEN =====
// De API-sleutel zet je NIET in de code, maar in Netlify:
// Site configuration > Environment variables > GROQ_API_KEY
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ===== 3. DE KOPPELING =====
export default async (req) => {
  // GET: laat de systeemprompt zien (voor "Achter de schermen" op de website)
  if (req.method === "GET") {
    return Response.json({ systeemprompt: SYSTEEMPROMPT, model: MODEL });
  }
  if (req.method !== "POST") {
    return Response.json({ fout: "Alleen GET en POST zijn toegestaan." }, { status: 405 });
  }
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ fout: "De API-sleutel ontbreekt. Zet GROQ_API_KEY in Netlify." }, { status: 500 });
  }

  // Het gesprek dat de website meestuurt, netjes controleren
  let body = {};
  try { body = await req.json(); } catch { /* leeg verzoek */ }
  const gesprek = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  // Bij de start is er nog geen gesprek: dan vragen we het model om te beginnen
  if (gesprek.length === 0) {
    gesprek.push({ role: "user", content: "Begin het gesprek: stel jezelf kort voor en stel de eerste vraag." });
  }

  // Het verzoek aan het taalmodel: systeemprompt bovenaan, daarna het hele gesprek
  const berichten = [{ role: "system", content: SYSTEEMPROMPT }, ...gesprek];

  const antwoord = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: berichten,
      temperature: 0.7,                          // hoe creatief het model mag zijn
      response_format: { type: "json_object" },  // het model moet JSON teruggeven
    }),
  });

  if (!antwoord.ok) {
    const detail = await antwoord.text();
    console.error("Fout van de API:", antwoord.status, detail);
    return Response.json({ fout: "Het taalmodel gaf een fout (" + antwoord.status + ")." },
                         { status: antwoord.status === 429 ? 429 : 502 });
  }

  const data = await antwoord.json();
  const tekst = data.choices?.[0]?.message?.content || "{}";
  return Response.json({ antwoord: tekst });
};

// Deze functie is op de website bereikbaar via /api/chat
export const config = { path: "/api/chat" };

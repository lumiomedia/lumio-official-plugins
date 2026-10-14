## 0.1.6

- En stängning i kanalspelaren: spelarens egen Stäng (kanalens runda × bara när spelaren inte visas).
- Kanalpillen uppe till vänster hålls fri från macOS-fönstrets trafikljus.

## 0.1.5

- IPTV-VOD (Xtream-katalogen) är en egen källa, av som standard. Kanaler utan den spelar aldrig en titels VOD-version.
- Nya kanaler har bibliotek, watchlist och debrid förvalda. Befintliga kanaler med Bibliotek räknas utan VOD — kryssa i IPTV-VOD i studion för att ta med den.
- Kräver Lumio med stöd för allowCatalog för att utesluta VOD-versioner av sammanslagna titlar; äldre versioner spelar som förut.

## 0.1.4

- Är tablåns längd längre än filen och liveläget hamnar efter filens slut visas "Programmet är slut" och kanalen fortsätter vid gränsen — ingen Ingen signal.
- Filernas verkliga längd minns och används när kanalens titelpool byggs om nästa gång.

## 0.1.3

- Ingen "Ingen signal" medan kanalen faktiskt spelar: bara ett laddfel utan framsteg räknas.
- Spelarens egna Kopiera länk och Stäng visas inte i kanalläget; kanalens × stänger.
- Ljusare programblock i tablån, ett steg ljusare på raden under pekaren eller i fokus; pågående program tydligt orange.

## 0.1.2

- Heron bläddras med styrplattans tvåfingersvep och med ◀▶ på prickarna; inga pilknappar.
- Saknar programmet bakgrundsbild visas affischen skarp till höger i stället för suddig.
- Kanalbyten: inställningskortet ligger kvar ända tills bilden visas på livepositionen (ingen svart ruta emellan), och ingen spelarkrom syns under kortet.
- Kompakt topprad i spelaren: kanalen uppe till vänster, rund Stäng-knapp uppe till höger.
- Ett ensamt kanalbyte slås upp direkt; väntan bara vid snabbzappning. Bytestiden loggas per fas.

## 0.1.1

- TABLÅ i spelaren öppnar tablån som lager ovanpå videon; en kanal i tablån spelas live direkt.
- Zappläget ser ut som gamla TV:n: inga spelarkontroller, LUMIO TV, stort kanalnummer, brus vid varje byte och knappraden CH ▼ CH ▲ KANALLISTA ↩ FÖRRA.
- Kanalbyten visar ett inställningskort (kanal, program, bild) tills den nya bilden syns — aldrig svart skärm. Grannkanaler ur bibliotek och debrid förladdas.
- Kanallistan fladdrar inte längre och byter aldrig film mitt i ett program när tablån räknas om.
- En källa som tar slut före programgränsen startar inte nästa program i förväg; kanalen fortsätter live vid gränsen.

## 0.1.0 — första versionen

- Personliga kanaler med regler för genre, årtionde, längd, typ och ordning.
- Källor: bibliotek, watchlist och debrid.
- Deterministisk tablå som följer väggklockan, med sändningsfönster (kvällar, sent).
- Ingångar i huvudmenyn, som hemrad och i inställningar.

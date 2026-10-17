## 0.1.26

- Kanaler av utvalda titlar: nytt fält "Titlar" i kanalstudion. Sök en film eller serie (först bland dina källor, sedan TMDb) och välj en eller flera — kanalen sänder då bara dem, från vilken av kanalens källor som helst. Genre, era, längd och typ gäller inte (fälten tonas ner); sändningstid och ordning gäller som vanligt.
- En vald titel som inte finns i någon källa sänds ändå: en film via strömuppslag, en serie med alla säsonger (de tre första direkt, resten hämtas i bakgrunden).
- En ensam vald serie ger "Avsnitt i följd" som ordning, och titeln föreslås som kanalnamn när namnet är tomt.
- TV: titelfältet skrivs med skärmtangentbordet och förslagen nås med ▲▼.

- Valda titlar hämtas parallellt med källorna (kanalen fylls direkt), och sökförslagen visar exakta namnträffar först, serier före filmer.

## 0.1.25

- Skrivbord: 50 px marginal på båda sidor (heron och tablån).

## 0.1.24

- TV: ▲ från första kanalen går till toppmenyn (fokusmotorn följer nu tablåns radbyten; förut stod den kvar på startraden och ▲ hoppade tillbaka ner).

## 0.1.23

- Skrivbord: 30 px marginal på båda sidor.
- TV: sidan dras bara ut till den behållare som faktiskt klipper (inget kapas längre i vänsterkanten).
- TV: ▲ från första kanalen går till appens toppmeny.

## 0.1.22

- Tablån i spelaren går kant i kant hela vägen ner och täcker spelarens kontroller.

## 0.1.21

- Kant i kant: sidan går ut över appkolumnens sidomarginaler även på TV; innehållet ~20 från sidorna (TV i TV-enheter, skrivbord 20 px).

## 0.1.20

- Tablån har samma marginal till vänster och höger (TV och skrivbord).

## 0.1.19

- TV: samma marginal (60) på båda sidor av heron och tablån.

## 0.1.18

- Skrivbord: Kanaler-sidan går ut över appkolumnens sidomarginaler (bredare tablå, som TV-läget).
- TABLÅ och tidslinjens klockslag i samma ljusa färg som herons inforad.
- Bannern för äldre värd: utan versionsnummer, placerad till höger om menyknappen.

## 0.1.17

- En kanal som hamnar efter filens slut (filen kortare än tablåns plats, t.ex. ett avsnitt på en filmplats) öppnar inte längre samma fil om och om igen. En annan version provas en gång; finns ingen visas "Programmet är slut · Härnäst" och kanalen går live vid nästa programgräns. Filens verkliga längd sparas och gäller från nästa tablåbygge (kräver appen med onDurationKnown).
- Kanalpillen på skärmarna utan spelare (Ingen signal, Programmet är slut, vila) läggs till höger om appens menyknapp i stället för under den.

## 0.1.16

- Heron hoppar inte längre vid kanalbyte: LIVE- och VILA-brickan har samma höjd och brickraden bryts aldrig.

## 0.1.15

- Kanalerna följer appens accentfärg (Utseende → Accent) i stället för en fast orange: pågående program, nu-linjen, markeringar, knappar och etiketter.

## 0.1.14

- Tablåns rullning tänder inte längre appens uttoning bakom toppmenyn (kräver appen med data-no-chrome-fade).

## 0.1.13

- Appens toppmeny (snabbmenyn) syns nu även på Kanaler-sidan på skrivbordet; sidans innehåll börjar under menyn (kräver appen med keepsTvTopChrome på skrivbordet).

## 0.1.12

- Rättat: programblock kunde ligga ovanpå varandra i tablån (tablålåset mötte den räknade tablån utan klippning när tablån visade tiden före låset). Tablån är nu alltid sammanhängande.
- Kanalbrickorna använder bara bokstäver och siffror: "Action & thrills" → AT, "80s & 90s" → 80.
- Heron byter inte höjd för en vilande kanal: återkomsttiden står i metaraden.
- Kanalpillen i spelaren hamnar under spelarens egen titelrad (mätt), aldrig ovanpå den.
- Tablån använder hela bredden; den markerade radens ram klipps aldrig i kanterna.

## 0.1.11

- Tablåns tidsaxel står still; bara kanalraderna rör sig.
- Fast fokusband på TV: raden med fokus står alltid överst under tidsaxeln och raderna glider mjukt under den med ▲▼. Skrivbordets piltangenter gör samma sak; mus och styrplatta rullar fritt och heron följer raden under pekaren.
- Heron byter aldrig höjd: raden "Fler titler laddas…" är borta och alla rader har fast plats och kortas med ellips.

## 0.1.10

- Tablålås: när en kanals tablå visats ligger de närmaste sex timmarna fast. Nya källor, rättade fillängder och ny metadata ändrar bara tiden efter det — det som står i tablån är det som sänds. Låset fylls på rullande och släpps när kanalens regler ändras.

## 0.1.9

- Ny sidlayout på alla ytor: appens meny överst, en stillastående kompakt hero för kanalen tablån pekar på, och tablån under i en egen rullning där raderna tonar ut under heron.
- Heron följer tablån: raden med fokus (TV), raden under pekaren annars vald rad (skrivbord), tryckt rad (mobil). Karusellen och prickarna är borta.
- TV: OK på en rad tittar live; håll OK för Från början, Redigera kanal och Zappa. Skrivbord/mobil: Titta live och Från början i heron, klick på vald rad eller dubbelklick tittar live.
- HEM, KANALER, NY KANAL och Redigera är borttagna från sidan — kanalerna hanteras under Inställningar → Kanaler.

## 0.1.8

- TV-läget behåller appens toppmeny (HOME, SÖK, FILMER ... LIVE TV, SPORT) ovanför kanalsidan; sidans översta rad ligger under den.

## 0.1.7

- TV-läget följer appens TV-skala: mått och text växer som appens egna ytor (hero, rader, knappar) i stället för fasta, små storlekar.
- Tablåns programblock klipper inte längre titeln på TV.
- Herons bläddringsprickar är en egen fokusrad som på appens startsida; ◀▶ byter kanal, OK spelar.
- Fjärrkontrollen når allt: startfokus på Titta live, ▲▼ mellan rader, Bakåt stänger lager i rätt ordning, sifferknapparna byter kanal i spelaren.

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

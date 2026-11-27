# Andre360

App web instalável (PWA) do projeto **360 dias rumo aos 60** do André. Treino e dieta enchem o **Cofre do Tênis**. Doce e pão de queijo esvaziam. Cofre cheio = tênis novo liberado. 👟

## Regras
- Pote de R$ 300/mês dividido por peso: corrida 8, academia 8, almoço 3, jantar 3. O mês perfeito soma exatamente R$ 300.
- Treinos têm **meta semanal em qualquer dia** (seg–dom): corrida 3×, academia 2×. O que passar da meta fica registrado, mas não vale dinheiro.
- Almoço e jantar na dieta valem todo dia. Doce −R$ 15, pão de queijo −R$ 10 (por unidade).
- Extras (somam por cima do pote, 1× por dia): ler 10 páginas +R$ 5; esfiha da tarde sem sobremesa +R$ 1; esteira em dia de chuva +R$ 8 (também conta como corrida na meta da semana).
- Bônus: +R$ 5 a cada 7 dias seguidos na dieta; +R$ 10 por semana perfeita de treinos.
- 2 coringas por mês: as refeições do dia contam e ele cobre um treino que faltar na semana.
- O cofre **acumula** entre os meses. Ao resgatar um tênis, o preço sai do cofre e ele vai para a sapateira.
- Edição até 2 dias para trás. Mudança de metas vale a partir do mês seguinte.
- Contagem regressiva para os 60 anos (03/11/2027).

## Estrutura (sem build)
- `js/engine.js`: todo o cálculo (funções puras com memo). `js/store.js`: persistência e migrações.
- `js/views/*`: telas (Hoje, Semanas, Cofre, Conquistas, Ajustes, boas-vindas, padrinho).
- `js/strava.js`: Strava direto do navegador (o Garmin sincroniza com o Strava). Passo a passo dentro do app, em Ajustes.
- `js/cloud.js`: Firebase (Auth por e-mail/senha + Firestore), local-first.

## Nuvem e padrinho
1. Crie um projeto no Firebase, ative **Authentication › E-mail/senha** e autorize o domínio `raphaelbessac-afk.github.io`.
2. Crie o **Firestore** (São Paulo) e publique as regras de `firestore.rules`.
3. Registre um app Web e cole o `firebaseConfig` em `js/firebase-config.js`.

Dados completos ficam em `athletes/{uid}` (só o André). Um resumo vai para `public/{shareId}`, que o padrinho abre em `…/padrinho.html?p=<shareId>` (página sem manifest, para o atalho do iPhone guardar o id) e onde pode deixar recados (`cheers`).

## Publicar
GitHub Pages servindo a raiz da `main`. A cada versão, suba `VERSION` em `sw.js` e em `js/rules.js`.

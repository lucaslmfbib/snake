# Cyber Snake 3000

Jogo da cobrinha no navegador controlado por gestos da mão na webcam (MediaPipe Hands), com ranking online, power-ups e sons sintetizados. Também funciona pelo teclado (setas ou WASD).

## Estrutura
- `index.html`, `style.css`: tela e visual (neon, glassmorphism).
- `js/game.js`: lógica do jogo (canvas, cobra, frutas, power-ups, pontuação).
- `js/hand-tracker.js`: webcam + MediaPipe Hands, converte a posição do dedo indicador em direção.
- `js/audio.js`: efeitos sonoros com Web Audio API.
- `api/ranking.js`: função serverless da Vercel para o ranking global; guarda os dados num JSON público no extendsclass.com.
- `Cyber_Snake_Colab.ipynb`: versão para o Colab.

## Como rodar
- `python3 -m http.server 8080` e abrir http://localhost:8080 (a câmera funciona em localhost; o ranking online não, sem a Vercel).
- Com o ranking: `npx vercel dev`.
- Deploy: Vercel (com a função) ou GitHub Pages (só o jogo).

## Convenções
- JavaScript puro, sem build nem frameworks; manter assim.
- O ranking não tem autenticação nem validação forte de pontuação: qualquer pessoa pode enviar resultados.
- Não há testes automatizados; testar com câmera e com teclado.

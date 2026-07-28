# 🐍 CYBER SNAKE 3000 - Jogo da Cobrinha por Gestos (Webcam)

Um jogo da cobrinha (Snake Game) futurista rodando diretamente no navegador, controlado em tempo real pelos movimentos da mão capturados pela câmera (Webcam) utilizando a biblioteca **MediaPipe Hands** da Google.

---

## 👤 Autor

- **Elaborado por**: Lucas Martins
- **E-mail**: [lucaslmf@gmail.com](mailto:lucaslmf@gmail.com)
- **LinkedIn**: [linkedin.com/in/lucaslmf](https://www.linkedin.com/in/lucaslmf)
- **Instagram**: [@lucaslmf_](https://www.instagram.com/lucaslmf_/)

---

## 🚀 Recursos do Jogo

- **Controle por Visão Computacional**: Rastreamento da mão e do dedo indicador em tempo real (360° fluído).
- **Preview da Câmera (PIP)**: Janela de apoio exibindo o esqueleto neon da mão.
- **Ranking Mundial (Leaderboard)**: Registro dos melhores jogadores com posições 🥇 🥈 🥉 e salvamento automático.
- **Frutas & Power-Ups**: Fruta bônus de ouro (★) e desacelerador de tempo (⚡).
- **Efeitos de Áudio Sintetizados**: Sons retro-arcade gerados via Web Audio API.
- **Suporte a Teclado**: Controle opcional pelas setas ou teclas W, A, S, D.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Canvas** & **Vanilla CSS3** (Design Cyberpunk Neon, Glassmorphism, Animações)
- **JavaScript (ES6+)**
- **MediaPipe Hands API** (Detecção de Landmarks de mão)
- **Web Audio API** (Sintetizador de áudio)

---

## 💻 Como Rodar Localmente

1. Clone este repositório:
   ```bash
   git clone https://github.com/SEU-USUARIO/snake-hand-gesture.git
   cd snake-hand-gesture
   ```

2. Inicie um servidor estático simples:
   ```bash
   python3 -m http.server 8080
   ```

3. Abra no seu navegador:
   ```text
   http://localhost:8080
   ```

---

## 🌐 Publicando no GitHub Pages (Grátis)

1. Vá nas **Settings** do seu repositório no GitHub.
2. Acesse a seção **Pages** na barra lateral.
3. Em **Source**, selecione a branch `main` e a pasta `/ (root)`.
4. Clique em **Save**. Em instantes o seu jogo estará online para qualquer pessoa jogar!

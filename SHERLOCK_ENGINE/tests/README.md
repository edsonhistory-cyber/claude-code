# Testes de playthrough (Playwright)

Bots que jogam cada caso do boot ao veredito, verificando o fluxo completo
(a acusação correta é derivada decodificando o JSON lacrado dentro do teste).

```bash
npm i playwright-core                # uma vez
python3 -m http.server 8123 &        # servir a pasta SHERLOCK_ENGINE
node tests/playthrough.mjs           # CASE001
node tests/playthrough2.mjs          # CASE002
node tests/playthrough_case.mjs 3    # CASE003
node tests/playthrough_case.mjs 4    # CASE004
node tests/editor_test.mjs           # Sherlock Studio
```

`CHROMIUM_PATH` aponta para o binário do Chromium (padrão: /opt/pw-browsers/chromium).

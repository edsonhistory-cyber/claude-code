# Monitor de Rede (app Android)

App de celular para descobrir **o que está deixando a internet de casa lenta**.

## O que o app faz

| Parte | O que mostra |
|---|---|
| **Diagnóstico** | Lista o que está pesando, do mais grave ao mais leve, com o jeito de resolver cada item |
| **Minha conexão** | Rede, faixa (2,4 ou 5 GHz), canal, força do sinal, IP, roteador e DNS |
| **Vizinhos** | Todas as redes Wi-Fi por perto, quantas ficam em cada canal e qual é o **melhor canal** para o seu roteador |
| **Aparelhos** | Os aparelhos ligados na sua rede (IP, nome e tipo provável), com aviso quando aparece um **NOVO** |
| **Velocidade** | Download, upload, tempo de resposta até o roteador e até a internet, travamento com a rede cheia e o DNS mais rápido |
| **Histórico** | Os últimos 20 testes, para comparar horários diferentes |

O app separa os problemas que vêm **do Wi-Fi da sua casa** dos que vêm **da operadora**:
- ele mede o tempo do celular até o roteador;
- e mede o tempo do roteador até a internet.

## Como instalar

1. No celular, abra a página **Releases** do repositório e baixe o arquivo `MonitorRede.apk` da versão mais nova.
2. Abra o arquivo. Se o Android pedir, permita "instalar apps desconhecidos" para o navegador.
3. Abra o **Monitor de Rede** e aceite a permissão de localização. O Android exige essa permissão para mostrar as redes Wi-Fi. O app não guarda e não envia a sua localização.
4. Ligue a **Localização (GPS)** do celular e toque em **VERIFICAR TUDO**.

> Cada versão nova é assinada com uma chave diferente. Se o Android disser que o app "não é compatível" na atualização, desinstale a versão antiga e instale a nova.

## Limitações do Android (honestas)

- **Trocar o canal do roteador:** o app mostra qual canal usar e abre `mwlogin.net`. A troca você faz no roteador, em uns 30 segundos. O roteador não deixa outros apps mudarem as configurações dele.
- **DNS:** o app descobre o DNS mais rápido e abre a tela de configurações. O Android não deixa apps trocarem o DNS sozinhos.
- **Lista de aparelhos:** alguns celulares não respondem a buscas e escondem o nome. A lista completa fica no roteador, em "Lista de dispositivos".
- **Teste de velocidade:** usa os servidores da Cloudflare e só roda no Wi-Fi, para não gastar os seus dados móveis.

## Para programadores

Projeto Kotlin sem bibliotecas extras (`minSdk 26`, `targetSdk 34`). O GitHub Actions monta o APK automaticamente (`.github/workflows/app-monitor-rede.yml`) e publica o arquivo em Releases.

```
gradle assembleDebug
```

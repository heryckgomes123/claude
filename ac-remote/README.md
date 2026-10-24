# Controle do Ar

Interface para celular que envia comandos ao ar-condicionado através de um servidor pequeno na sua rede.

## Rodando

```bash
cd ac-remote
AC_TOKEN=$(openssl rand -hex 16) PORT=8080 node server.mjs
```

Requer Node 18+. Não tem dependências para instalar.

No celular (mesma rede Wi-Fi), abra `http://IP-DO-COMPUTADOR:8080`, toque em **Config**, informe o endereço
e o `AC_TOKEN`, e salve. Para usar como app, use "Adicionar à tela inicial".

## Como funciona

- A página envia o estado completo (`power`, `mode`, `temp`, `fan`) para `POST /api/ac` com `Authorization: Bearer <token>`.
- O servidor valida o corpo e chama `driver.send(state)`.
- O envio real fica no `driver` dentro de `server.mjs`. Hoje ele só registra no log.

## Ligando ao aparelho

Troque o objeto `driver` pela integração do seu aparelho. Exemplos do que costuma ser usado:

- **IR com hub** (Broadlink RM4, ESP32 com emissor IR): enviar o código IR correspondente ao estado.
- **API da marca ou nuvem** (Midea, Daikin, LG ThinQ, Tuya): chamar o endpoint da marca com as credenciais.
- **Home Assistant**: chamar um serviço `climate.set_hvac_mode` / `climate.set_temperature` via REST.

O driver deve lançar erro se o comando falhar. Nesse caso o celular mostra "Falha".

## Segurança

- Use um `AC_TOKEN` longo e aleatório. Qualquer um com o token consegue ligar ou desligar o aparelho.
- Não exponha a porta na internet. Use apenas na rede local, ou um túnel com autenticação (VPN, Tailscale).
- Credenciais da marca devem ficar em variáveis de ambiente, não no código.

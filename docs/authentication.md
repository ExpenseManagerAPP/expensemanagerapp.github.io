# Autenticação no front-end

O app usa o login próprio do CAP ([fluxo completo no repositório do CAP](https://github.com/ExpenseManagerAPP/expensemanagerapp/blob/main/docs/authentication-flow.md)). Não há XSUAA, approuter nem redirecionamento: a tela de login faz um `fetch` para `/auth/password` e as chamadas OData levam `Authorization: Bearer <token>`.

## Ambientes

O ambiente é detectado pelo hostname em `webapp/util/Environment.ts`.

| Ambiente | Como roda | Provider | URLs |
|---|---|---|---|
| GitHub Pages (`expensemanagerapp.github.io`) | build publicado na branch `gh-pages` | `AppAuthenticationProvider` | `webapp/config/runtime-config.json` (URL do CAP, atualizada pelo workflow **Setup BTP trial** do CAP) |
| Local com proxy (`npm run start`) | `ui5-local.yaml` + `custom-proxy/` | `AppAuthenticationProvider` | Relativas: `/api/service/ExpenseManager/` e `/auth`, encaminhadas ao `backend` do `ui5-local.yaml` |
| Mock (`npm run start-mock`) | `ui5-mock.yaml` | `MockAuthenticationProvider` | Dados falsos, sem chamadas reais |

O `custom-proxy` remove o prefixo `/api` das rotas OData e repassa `/auth` como está, então o login funciona no `localhost` contra o CAP remoto ou local.

## Sessão

- `AuthApi` chama `/auth/password`, `/auth/refresh` e `/auth/change-password` e monta a sessão (`accessToken`, `refreshToken`, `expiresAt`, `userName`, `name`, `role`, `mustChangePassword`).
- `AuthenticationService` guarda a sessão no `localStorage` (uma aba nova já entra logada) e renova o token 2 minutos antes de expirar; o `Component` troca o header `Authorization` do modelo OData quando isso acontece.
- No logout o modelo OData é descartado, os bindings da pessoa são soltos e o modelo `ui` volta ao estado inicial, para nada do usuário anterior aparecer para o próximo.

## Rotas protegidas

`webapp/routing/AppRouter.ts` consulta um guard antes de interpretar cada hash, então nenhuma view protegida chega a ser exibida:

- sem sessão válida → `#/login`;
- troca de senha pendente → `#/change-password` (os serviços recusam o usuário até a troca);
- já logado abrindo o login ou a troca de senha → início.

## Arquivos

| Arquivo | Papel |
|---|---|
| `webapp/auth/AuthApi.ts` | Configuração de runtime e chamadas às rotas `/auth` |
| `webapp/auth/AuthenticationService.ts` | Sessão, renovação do token e eventos de expiração/logout |
| `webapp/auth/providers/AppAuthenticationProvider.ts` | Provider do login próprio |
| `webapp/auth/providers/MockAuthenticationProvider.ts` | Provider do modo mock |
| `webapp/routing/AppRouter.ts` | Router com guard |
| `webapp/controller/Login.controller.ts` / `ChangePassword.controller.ts` | Telas de login e troca de senha |
| `webapp/util/http.ts` | `fetch` autenticado (CSRF, 401 → sessão expirada) |

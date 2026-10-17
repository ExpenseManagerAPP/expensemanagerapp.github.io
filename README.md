# Expense Manager App

Aplicativo financeiro responsivo em SAPUI5 Freestyle e TypeScript, publicado em **[expensemanagerapp.github.io](https://expensemanagerapp.github.io/)**. O backend é o CAP do repositório [ExpenseManagerAPP/expensemanagerapp](https://github.com/ExpenseManagerAPP/expensemanagerapp), com login próprio.

## O que tem

- Visão geral com saldo, indicadores, gráficos de gastos por categoria e evolução mensal, lançamentos, cartões e dívidas.
- Abas de cartões, categorias, faturas, dívidas e compartilhamento, com edição em rascunho e aviso ao sair com alterações.
- Login próprio com renovação automática do token e troca de senha obrigatória no primeiro acesso.
- Tema claro e escuro, textos em português e inglês.

## Executar e validar

```sh
npm run start          # local, contra o CAP configurado no ui5-local.yaml
npm run start-mock     # dados falsos (ui5-mock.yaml)
npm run ts-typecheck
npm run build
```

O build é publicado no GitHub Pages pela Action `.github/workflows/deploy.yml` a cada push na `main` (pasta `dist/` na branch `gh-pages`).

A URL do CAP fica em `webapp/config/runtime-config.json`; o workflow **Setup BTP trial** do repositório do CAP atualiza esse arquivo depois de um deploy e faz o commit que republica o site.

## Documentação

Veja [`docs/`](./docs/README.md), em especial o guia de [autenticação](./docs/authentication.md).

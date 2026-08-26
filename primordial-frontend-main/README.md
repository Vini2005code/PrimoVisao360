# Primordial Frontend

Frontend do projeto **Primordial**, um sistema de prontuário eletrônico médico em desenvolvimento.

## 🗂 Arquitetura de Pastas

```text
src/
├── assets/                     # Recursos estáticos
│
├── components/
│   ├── home/
│   │   └── ModuleCard.tsx       # Card da Home
│   │
│   ├── layout/
│   │   ├── AppSidebar.tsx       # Sidebar (desktop)
│   │   ├── AppTopbar.tsx        # Topbar
│   │   └── MobileDrawer.tsx     # Menu mobile
│   │
│   └── ui/                      # Componentes genéricos
│
├── layouts/
│   └── AppLayout.tsx            # Layout base (Sidebar + Topbar + Outlet)
│
├── lib/
│   └── utils.ts                 # Utilitários
│
├── pages/
│   ├── home/
│   │   ├── Home.tsx             # Página inicial
│   │   └── homeShortcuts.ts     # Atalhos da Home
│   │
│   ├── login/
│   │   └── Login.tsx            # Página de login
│   │
│   └── patients/
│       └── Patients.tsx         # Página de pacientes
│
├── routes/
│   ├── AppRoutes.tsx            # Rotas da aplicação
│   └── paths.ts                 # Constantes de paths
│
├── App.tsx                      # Componente raiz
├── index.css                    # Estilos globais
└── main.tsx                     # Bootstrap
```

## Visão 360 — itens salvos e exportação

- A aba usa o contrato tipado `PatientVision360SavedItem` de ponta a ponta.
- Em produção, a persistência permanece no backend Java, sob autenticação, escopo da clínica e RLS, pelos endpoints `GET/POST /patients/{patientId}/vision-360/saved-items` e `DELETE /patients/{patientId}/vision-360/saved-items/{itemId}`.
- Sem `VITE_API_URL`, o modo de demonstração persiste somente dados sintéticos no IndexedDB do navegador, isolados pela chave `clinicId:patientId`.
- A exclusão ocorre exclusivamente pelo botão de fechamento explícito de cada item.
- O PDF é montado em um Web Worker no navegador, com jsPDF e fontes Noto Sans empacotadas localmente. O nome reidentificado vem do paciente já carregado pelo prontuário; nenhum dado é enviado a CDN, API de PDF ou gerador externo.
- O `Blob` e a URL temporária existem apenas durante o download e são liberados em seguida. Como o PDF exportado contém PII, o armazenamento e o compartilhamento do arquivo baixado devem seguir as políticas da clínica.

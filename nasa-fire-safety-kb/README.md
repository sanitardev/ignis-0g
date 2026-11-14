# NASA Microgravity Fire Safety Knowledge Base (ACME, FLEX, BASS & Related Programs)

Структурированная база знаний по экспериментам NASA в области горения и пожарной безопасности в условиях микрогравитации (МКС CIR, MSG, Cygnus) для использования в RAG-пайплайнах, LLM-агентах и инженерном анализе.

## Структура репозитория

```text
nasa-fire-safety-kb/
├── README.md                               # Документация репозитория и правила использования в LLM
├── 00_index/
│   ├── ignis_master_db.csv                 # Сводная таблица (22 записи: ACME, FLEX, BASS, Saffire, SoFIE, SAME, Reference)
│   ├── ignis_master_db.json                # Машиночитаемая версия в JSON для прямого контекста или Tool Calling
│   └── sources_registry.json               # Реестр официальных идентификаторов NTRS / PSI / DOI
├── 01_experiment_cards/                    # Markdown-карточки с YAML Frontmatter для семантического поиска (RAG)
│   ├── FLEX/                               # FLEX-1, FLEX-2/CFI, FLEX-2J (JAXA), FLEX-ICE-GA (ASI)
│   ├── BASS/                               # BASS / BASS-II, BASS-M (Milliken)
│   ├── ACME/                               # Overview, BRE, s-Flame, Flame Design, E-FIELD, CLD Flame, CFI-G, SLICE
│   └── Related_Programs/                   # Saffire I-V, SAME, SoFIE-GEL, SoFIE-MIST
└── 02_normative_baselines/                 # Стандарты и целевые атмосферы (NASA-STD-6001, ISS Cabin, SEA 56.5 kPa / 34% O2)
```

## Рекомендации по интеграции в LLM / RAG
1. **Фильтрация по метаданным:** используйте YAML-заголовки (`--- ... ---`) в начале каждого `.md` файла или `00_index/ignis_master_db.json` для точных числовых запросов (`pressure_kpa`, `o2_pct`, `flow_cms`).
2. **Чанкинг (Markdown Header Splitting):** разбивайте `.md` файлы по заголовкам второго уровня (`## 1.` – `## 7.`), сохраняя YAML-метаданные в каждом чанке.
3. **Валидация ответов:** при генерации ответа LLM должна опираться на значения из таблицы/карточек и указывать `sub_experiment` и `source_id`.

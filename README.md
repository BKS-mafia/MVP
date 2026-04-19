# 🎭 AI Mafia — Онлайн-игра с AI-агентами

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

> **AI Mafia** — многопользовательская онлайн-игра «Мафия» с AI-персонажами, управляемыми через OpenRouter API. Погрузитесь в классическую детективную игру, где игроки-люди соревнуются с интеллектуальными AI-агентами!

## 🎮 Описание проекта

**AI Mafia** — полноценное веб-приложение для игры в популярную настольную игру «Мафия» онлайн. Проект включает:

- 🤖 **AI-агенты** — играйте вместе с интеллектуальными ботами, использующими современные LLM (Gemini, GPT-4, Claude и др.)
- 🏠 **Гибкая система комнат** — создавайте публичные или приватные лобби с настраиваемыми параметрами
- 💬 **Real-time коммуникация** — мгновенный обмен сообщениями через WebSocket
- 🎭 **Классические роли** — Мафия, Доктор, Комиссар, Мирный житель
- 🌙 **Дневные и ночные фазы** — полноценная механика игры с голосованиями и дискуссиями
- 👻 **Ghost Chat** — общение мёртвых игроков после выбывания
- 🧪 **Turing Test** — угадайте, кто из игроков был AI

---

## 🏗️ Архитектура проекта

```
┌─────────────────────────────────────────────────────────────────┐
│                           NGINX                                  │
│                     (Port 80 / Reverse Proxy)                    │
└─────────────┬───────────────────────┬───────────────────────────┘
              │                       │
     ┌────────▼─────────┐   ┌────────▼─────────┐
     │     FRONTEND     │   │     BACKEND      │
     │    (Next.js)     │   │    (FastAPI)     │
     │   Port 3000      │   │    Port 8000     │
     └───────────────────┘   └────────┬─────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
     ┌────────▼─────────┐   ┌────────▼─────────┐   ┌─────────▼─────────┐
     │   POSTGRESQL     │   │      REDIS       │   │   OpenRouter API   │
     │    (Database)    │   │  (Cache/PubSub)  │   │    (AI Agents)     │
     │    Port 5432     │   │    Port 6379     │   │                    │
     └───────────────────┘   └──────────────────┘   └───────────────────┘
```

### Технологический стек

| Компонент | Технологии | Описание |
|-----------|------------|----------|
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy 2.0, Pydantic 2.0 | REST API + WebSocket сервер |
| **Frontend** | Next.js 16, React 19, TypeScript, Ant Design, Zustand | Веб-интерфейс игры |
| **База данных** | PostgreSQL 15 | Хранение данных игроков и комнат |
| **Кэширование** | Redis 7 | Real-time события, Pub/Sub |
| **AI** | OpenRouter API | Подключение к различным LLM |
| **Веб-сервер** | Nginx (Alpine) | Reverse proxy и балансировка |
| **Контейнеризация** | Docker, Docker Compose | Полная оркестрация приложения |

---

## 🚀 Быстрый старт

### Предварительные требования

- [Docker](https://docs.docker.com/get-docker/) и [Docker Compose](https://docs.docker.com/compose/install/)
- [OpenRouter API Key](https://openrouter.ai/) для AI-агентов

### Запуск за 3 команды

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd MVP

# 2. Настройте переменные окружения
cp backend/.env.example backend/.env
# Отредактируйте backend/.env, добавив ваш OPENROUTER_API_KEY

# 3. Запустите приложение
docker-compose up -d
```

После запуска приложение будет доступно:

| Сервис | URL |
|--------|-----|
| 🌐 Веб-интерфейс | http://localhost |
| 📚 Swagger UI | http://localhost/api/docs |
| 📄 ReDoc | http://localhost/api/redoc |
| 💚 Health Check | http://localhost/api/health |

---

## 📦 Подробная установка

### Настройка переменных окружения

Создайте файл `backend/.env` на основе примера:

```env
# ===========================================
# OpenRouter API Configuration
# ===========================================
OPENROUTER_API_KEY=sk-or-v1-your-key-here
DEFAULT_AI_MODEL=google/gemini-2.5-flash-lite

# ===========================================
# Application Settings
# ===========================================
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ===========================================
# Database Configuration
# ===========================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mafia
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/mafia

# ===========================================
# Redis Configuration
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_URL=redis://localhost:6379/0

# ===========================================
# Game Settings
# ===========================================
MAX_PLAYERS_PER_ROOM=10
MIN_PLAYERS_TO_START=5
GAME_TIMEOUT_SECONDS=300
AI_RESPONSE_DELAY_MIN=1
AI_RESPONSE_DELAY_MAX=5
```

### Запуск через Docker Compose

```bash
# Сборка и запуск всех сервисов
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend

# Остановка всех сервисов
docker-compose down

# Остановка с удалением volumes (полный сброс)
docker-compose down -v
```

### Запуск без Docker

#### Backend

```bash
cd backend

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\bin\test-ai-players.js  # Windows

# Установка зависимостей
pip install -r requirements.txt

# Инициализация базы данных
python scripts/init_db.py

# Запуск сервера
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev
```

---

## 🎭 Игровые роли

| Роль | Команда | Способности |
|------|---------|-------------|
| 🔪 **Мафия** | Мафия | Каждую ночь убивает одного мирного жителя |
| 💉 **Доктор** | Мирные | Защищает игрока от убийства |
| 🔍 **Комиссар** | Мирные | Проверяет игрока на принадлежность к мафии |
| 👤 **Мирный** | Мирные | Без специальных способностей |

### Правила победы

- 🟢 **Мирные побеждают** — когда все члены мафии убиты
- 🔴 **Мафия побеждает** — когда число мафии ≥ число мирных

---

## 💬 Система чатов

| Чат | Описание | Доступ |
|-----|----------|--------|
| 🏙️ **cityGroup** | Общий чат для дискуссий | Все живые игроки (день) |
| 🔪 **mafiaGroup** | Приватный чат мафии | Только мафия (ночь) |
| 🩺 **roleChat** | Чат особых ролей | Доктор и Комиссар (ночь) |
| 👻 **Ghost Chat** | Чат мёртвых игроков | Все мёртвые игроки |

---

## 📡 API документация

### REST API эндпоинты

#### Комнаты

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/rooms` | Список активных комнат |
| `POST` | `/api/rooms` | Создать комнату |
| `GET` | `/api/rooms/{room_id}` | Информация о комнате |
| `DELETE` | `/api/rooms/{room_id}` | Удалить комнату |
| `POST` | `/api/rooms/{room_id}/join` | Присоединиться |
| `POST` | `/api/rooms/{room_id}/leave` | Покинуть комнату |
| `POST` | `/api/rooms/{room_id}/start` | Начать игру |
| `GET` | `/api/s/{short_id}` | Короткая ссылка на комнату |

#### Игроки

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/players` | Создать игрока |
| `GET` | `/api/players/{player_id}` | Информация об игроке |
| `PUT` | `/api/players/{player_id}` | Обновить данные |
| `DELETE` | `/api/players/{player_id}` | Удалить игрока |

#### Аутентификация

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/auth/login` | Вход в игру |
| `POST` | `/api/auth/logout` | Выход из игры |

### WebSocket

Подключение: `ws://host/ws/rooms/{room_id}?token={player_token}`

#### Входящие события (сервер → клиент)

- `player_joined` — игрок присоединился
- `player_left` — игрок покинул
- `game_started` — игра началась
- `phase_changed` — смена фазы (lobby → night → day → voting → finished)
- `role_assigned` — роль назначена
- `vote_started` / `vote_ended` — голосование
- `player_eliminated` — игрок исключён
- `chat_message` — сообщение в чат
- `game_over` — игра окончена

#### Исходящие события (клиент → сервер)

- `chat_message` — отправить сообщение
- `vote_action` — голосовать за игрока
- `night_action` — ночное действие
- `ready` — готовность к игре
- `turing_test_vote` — голосование в Turing Test

Подробная документация WebSocket API: [`backend/docs/websocket_api.md`](backend/docs/websocket_api.md)

---

## 📁 Структура проекта

```
MVP/
├── backend/                     # Python/FastAPI Backend
│   ├── app/
│   │   ├── main.py            # Точка входа приложения
│   │   ├── prompts.json       # Промпты для AI агентов
│   │   ├── api/               # REST API эндпоинты
│   │   │   ├── auth.py        # Аутентификация
│   │   │   ├── players.py     # Управление игроками
│   │   │   └── rooms.py       # Управление комнатами
│   │   ├── models/            # SQLAlchemy модели
│   │   │   ├── player.py      # Модель игрока
│   │   │   ├── room.py        # Модель комнаты
│   │   │   ├── game.py        # Модель игры
│   │   │   └── game_event.py  # Модель событий
│   │   ├── schemas/           # Pydantic схемы валидации
│   │   ├── crud/              # Операции с БД
│   │   ├── services/          # Бизнес-логика
│   │   │   ├── ai_service.py  # AI агенты
│   │   │   ├── game_service.py# Игровой процесс
│   │   │   └── room_service.py# Управление комнатами
│   │   ├── websocket/         # WebSocket обработчики
│   │   ├── game/              # Игровая логика
│   │   │   └── state_machine.py # Машина состояний
│   │   ├── ai/                # AI модули
│   │   │   ├── openrouter_client.py # OpenRouter API
│   │   │   └── mcp_tools.py   # Инструменты для агентов
│   │   ├── db/                # Работа с БД
│   │   ├── redis/             # Redis клиент
│   │   └── core/              # Конфигурация
│   ├── docker/                # Dockerfile
│   ├── scripts/               # Скрипты (init_db.py)
│   ├── docs/                  # Документация
│   └── requirements.txt       # Python зависимости
│
├── frontend/                   # Next.js/React Frontend
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx          # Главная страница
│   │   ├── join/             # Страница входа
│   │   ├── room/[id]/        # Комната игры
│   │   │   ├── lobby/        # Лобби комнаты
│   │   │   └── page.tsx      # Страница игры
│   │   └── roomEdit/         # Редактирование комнаты
│   ├── src/
│   │   ├── entities/         # Бизнес-сущности
│   │   │   ├── chat/         # Компоненты чата
│   │   │   ├── room/         # API комнат
│   │   │   └── voting/       # Компоненты голосования
│   │   ├── shared/           # Общие компоненты
│   │   │   ├── api/          # API клиент, WebSocket
│   │   │   ├── hooks/        # React хуки
│   │   │   └── store/        # Zustand store
│   │   └── widget/           # Переиспользуемые виджеты
│   │       ├── Lobby/        # Лобби
│   │       ├── JoinPage/     # Страница входа
│   │       ├── TelegramClone/# UI в стиле Telegram
│   │       └── providers/    # React providers
│   ├── public/               # Статические файлы
│   ├── package.json          # Node зависимости
│   └── next.config.ts        # Next.js конфигурация
│
├── nginx/                     # Nginx configuration
│   └── nginx.conf            # Конфигурация reverse proxy
│
├── docker-compose.yml        # Docker Compose оркестрация
├── README.md                 # Этот файл
└── .gitignore               # Git ignore
```

---

## ✨ Возможности

### Для игроков

- 🎮 Создание и управление игровыми комнатами
- 🤖 Игра против AI-агентов с реалистичным поведением
- 💬 Real-time чат с поддержкой нескольких каналов
- 🗳️ Система голосований и ночных действий
- 📊 Статистика игры и результаты
- 🔗 Приглашение друзей через короткие ссылки

### Для разработчиков

- 📚 Swagger UI для тестирования API
- 🧪 Turing Test — угадай谁是 AI
- 🔄 WebSocket для real-time обновлений
- 🐳 Полная контейнеризация через Docker
- 📝 Подробная документация WebSocket API

---

## 🔧 Конфигурация

### Параметры игры

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `MAX_PLAYERS_PER_ROOM` | 10 | Максимум игроков |
| `MIN_PLAYERS_TO_START` | 5 | Минимум для старта |
| `GAME_TIMEOUT_SECONDS` | 300 | Таймаут хода |
| `AI_RESPONSE_DELAY_MIN` | 1 сек | Мин. задержка AI |
| `AI_RESPONSE_DELAY_MAX` | 5 сек | Макс. задержка AI |

### AI модели

Проект использует OpenRouter API, поддерживаются:

- `google/gemini-2.5-flash-lite` (по умолчанию)
- `openai/gpt-4`
- `anthropic/claude-3`
- И другие модели OpenRouter

---

## 🧪 Тестирование

### Backend тесты

```bash
cd backend
pytest tests/ -v
```

### Frontend тесты

```bash
cd frontend
npm run test
```

### Playwright E2E тесты

```bash
cd frontend
npx playwright test
```

---

## 🛣 Roadmap

- [ ] Добавить систему аутентификации пользователей
- [ ] Реализовать систему рейтингов и статистики
- [ ] Добавить больше AI моделей и настроек
- [ ] Мобильное приложение
- [ ] Приватные комнаты с паролем
- [ ] Турнирный режим
- [ ] Spectator mode для зрителей

---

## 🤝 Contributing

1. Fork репозиторий
2. Создайте ветку для новой функциональности (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. Подробности в файле [LICENSE](LICENSE).

---

## 📞 Контакты

- 🐛 Bug Reports: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 Email: your.email@example.com

---

<div align=center>

**Сделано с ❤️ для любителей игры Мафия**

</div>
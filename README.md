# 💪 TrainerApp

Web app per personal trainer e loro clienti. Il trainer gestisce clienti, schede di allenamento e libreria esercizi; il cliente visualizza la propria scheda e registra i progressi.

---

## Funzionalità

**Per il trainer**
- Gestione clienti con livello, obiettivo e note
- Creazione e assegnazione di schede di allenamento con scadenza
- Libreria esercizi con supporto video YouTube e immagini
- Pannello admin per la gestione degli utenti

**Per il cliente**
- Visualizzazione della scheda attiva
- Log delle sessioni con pesi/rep per ogni esercizio
- Timer integrato per i tempi di recupero
- Grafici progresso per esercizio

---

## Stack

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Deploy | Vercel / Netlify (consigliato) |

---

## Setup locale

### 1. Clona il repo
```bash
git clone https://github.com/TUO_USERNAME/NOME_REPO.git
cd NOME_REPO
npm install
```

### 2. Configura le variabili d'ambiente
```bash
cp .env.example .env
```
Apri `.env` e inserisci le credenziali del tuo progetto Supabase (le trovi in **Settings → API** nella dashboard).

### 3. Avvia in sviluppo
```bash
npm run dev
```

---

## Database

Le migration SQL sono in `supabase/migrations/`. Per applicarle al tuo progetto Supabase:

```bash
# Installa Supabase CLI se non ce l'hai
npm install -g supabase

# Collega al tuo progetto
supabase link --project-ref YOUR_PROJECT_ID

# Applica le migration
supabase db push
```

---

## Script disponibili

```bash
npm run dev        # Avvia dev server (localhost:8080)
npm run build      # Build di produzione
npm run preview    # Anteprima build locale
npm run lint       # ESLint
npm run test       # Vitest
```

---

## Deploy

Per il deploy su **Vercel** o **Netlify**, ricordati di aggiungere le variabili d'ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`) nelle impostazioni del progetto — non committare mai il file `.env`.

---

## Struttura progetto

```
src/
├── components/      # Componenti riutilizzabili (UI + logica)
├── hooks/           # Custom hooks (React Query + Supabase)
├── integrations/    # Client Supabase e types generati
├── lib/             # Utility (YouTube, helpers)
├── pages/           # Pagine dell'app (routing)
supabase/
├── functions/       # Edge Functions
├── migrations/      # Migration SQL
```

---

## Licenza

MIT

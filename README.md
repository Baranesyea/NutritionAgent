# Nutrition Agent — ערן

מערכת תזונה אוטונומית לניהול תפריט שבועי.

## רכיבים

| רכיב | תיאור |
|------|--------|
| **Repo** | Source of truth — קבצי JSON עם תפריט, מאזן, לוג |
| **Dashboard** | GitHub Pages — ממשק מובייל כהה, RTL |
| **Routines** | 3 סוכנים אוטונומיים: תכנון שבועי, צ'ק-אין יומי, סיכום שבועי |

## מבנה תיקיות

```
├── knowledge/
│   └── profile.json          # פרופיל ויעדי מאקרוס
├── data/
│   ├── current-week/
│   │   ├── menu.json         # תפריט שבועי נוכחי
│   │   ├── shopping-list.json
│   │   ├── meal-prep.json
│   │   ├── balance.json      # מתוכנן vs בפועל
│   │   └── log.json
│   └── history/              # ארכיון שבועות קודמים
├── docs/                     # GitHub Pages Dashboard
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── .claude/
    └── CLAUDE.md             # הוראות לסוכנים
```

## דשבורד

`https://baranesyea.github.io/nutritionagent/`

## רוטינים

| רוטין | טריגר | פעולה |
|-------|--------|--------|
| Weekly Planner | חמישי 07:00 | תפריט + קניות + מיל פרפ → push לריפו |
| Daily Check-in | כל יום 08:00 | בדיקת סטיות + תיקון תפריט → push לריפו |
| Weekly Summary | שישי 18:00 | סיכום שבוע בלוג → push לריפו |

> כל המידע מוצג בדשבורד — אין מיילים.

## יעדי מאקרו (ערן)

- קלוריות: **1,930 / יום** | **13,510 / שבוע**
- חלבון: **193g / יום**
- פחמימות: **193g / יום**
- שומן: **43g / יום**

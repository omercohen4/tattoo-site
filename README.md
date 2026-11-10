# אתר הסטודיו

אתר בעמוד אחד: HTML, CSS ו-JavaScript רגילים. מתפרסם דרך GitHub Pages מענף `main`.

התוכן (תמונות וטקסטים) נמצא בקבצים נפרדים בתיקייה `content/`, ו-`index.html` נבנה מהם אוטומטית. ככה סהר יכול לערוך את התוכן מפאנל הניהול בלי לגעת בקוד.

## מבנה

| קובץ | מה יש בו |
|---|---|
| `content/*.yml` | התוכן: קעקועים, ציורים, טקסטים, ביקורות ופרטי קשר. את זה עורכים |
| `templates/index.html` | המבנה של העמוד. שינויים בעיצוב ובמבנה נעשים כאן |
| `index.html` | **נבנה אוטומטית. לא לערוך ישירות**, כל שינוי בו יימחק בבנייה הבאה |
| `tools/build.py` | הבנייה: מכין תמונות חדשות ובונה את `index.html` |
| `.github/workflows/build.yml` | מריץ את הבנייה ב-GitHub אחרי כל שינוי בתוכן |
| `.pages.yml` | הגדרות פאנל הניהול (Pages CMS): המסכים והשדות שסהר רואה |
| `assets/css/style.css` | העיצוב. הצבעים והגדלים מוגדרים למעלה, בחלק `Tokens` |
| `assets/js/main.js` | הגלריה, התפריט, כרטיס הביקור והאנימציות |
| `assets/vendor/` | GSAP ו-ScrollTrigger (ספריית האנימציות) |
| `assets/img/work/` | התמונות של הגלריה |

## איך שינוי מגיע לאתר

1. סהר שומר שינוי בפאנל הניהול, והשינוי נשמר ב-`content/` או ב-`assets/img/work/`.
2. הבנייה ב-GitHub רצה: תמונה חדשה נחתכת ל-4:5 מהמרכז, מוקטנת ל-920x1150 ונשמרת כ-JPG, ו-`index.html` נבנה מחדש.
3. GitHub Pages מפרסם. כל התהליך לוקח כמה דקות.

## בנייה מקומית

```
pip install pyyaml jinja2 pillow
python3 tools/build.py
```

## מה עוד נשאר

- הביקורות בחלק "מה אומרים עליי" זמניות. להחליף בביקורות אמיתיות
- המשפטים שגוגל מציג (`description`, `og:description` ובלוק `application/ld+json`) נמצאים ב-`templates/index.html`, לא בפאנל
- כשיהיה דומיין: לעדכן את הכתובת ב-`canonical`, ב-`og:url`, ב-`og:image`, בבלוק `application/ld+json`, ב-`robots.txt` וב-`sitemap.xml`

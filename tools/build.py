"""בונה את index.html מהתבנית (templates/index.html) ומקבצי התוכן (content/*.yml).

בדרך הוא מסדר את התמונות של הגלריה: כל תמונה שעוד לא בפורמט של האתר
נחתכת ליחס 4:5 (מהמרכז), מוקטנת ל-920x1150 ונשמרת כ-JPG, והנתיב שלה
מתעדכן בקובץ התוכן.

תמונות שאף עבודה לא משתמשת בהן נשארות בתיקייה: פאנל הניהול מעלה תמונה
ושומר את הרשימה בשתי שמירות נפרדות, ומחיקה אוטומטית הייתה מוחקת תמונה
חדשה בין שתי השמירות.

הרצה: python3 tools/build.py   (מתיקיית השורש של האתר)
"""
import hashlib
import json
import os
import re
from urllib.parse import quote_plus

import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup, escape
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK_DIR = 'assets/img/work'
W, H = 920, 1150


def path(*p):
    return os.path.join(ROOT, *p)


def load(name):
    with open(path('content', name + '.yml'), encoding='utf-8') as f:
        return yaml.safe_load(f) or {}


def save(name, data):
    # שומרים את ההערה שבראש הקובץ, אם יש
    with open(path('content', name + '.yml'), encoding='utf-8') as f:
        head = ''.join(line for line in f.read().splitlines(True) if line.startswith('#'))
    with open(path('content', name + '.yml'), 'w', encoding='utf-8') as f:
        f.write(head)
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False, width=1000)


def clock(v):
    """שעה כטקסט: YAML קורא 23:00 כמספר (1380 דקות), אז מחזירים אותו לשעה."""
    if v is None or v == '':
        return ''
    if isinstance(v, int):
        return '%02d:%02d' % divmod(v, 60)
    v = str(v).strip()
    m = re.fullmatch(r'(\d{1,2}):(\d{2})', v)
    return '%02d:%s' % (int(m.group(1)), m.group(2)) if m else v


def process_image(rel):
    """מחזיר נתיב לתמונה מוכנה לאתר, ומכין אותה אם צריך."""
    rel = rel.split('?')[0].lstrip('/')
    src = path(rel)
    if not os.path.exists(src):
        print('אזהרה: התמונה לא נמצאה ולכן לא מופיעה באתר:', rel)
        return None
    with Image.open(src) as im:
        w, h = im.size
        ready = (rel.lower().endswith('.jpg') and rel.startswith(WORK_DIR + '/')
                 and abs(w / h - 0.8) < 0.01 and w <= W)
        if ready:
            return rel
        im = ImageOps.exif_transpose(im).convert('RGB')  # תמונות מהטלפון שמורות לפעמים מסובבות
        w, h = im.size
        if w / h > 0.8:
            nw = round(h * 0.8)
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = round(w / 0.8)
            im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        im.thumbnail((W, H), Image.LANCZOS)
        base = os.path.splitext(os.path.basename(rel))[0]
        base = re.sub(r'[^A-Za-z0-9_-]+', '-', base).strip('-') or 'work'
        out = WORK_DIR + '/' + base + '.jpg'
        n = 2
        while os.path.exists(path(out)) and path(out) != src:
            out = '%s/%s-%d.jpg' % (WORK_DIR, base, n)
            n += 1
        im.save(path(out), quality=85, optimize=True, progressive=True)
    if path(out) != src:
        os.remove(src)
    print('תמונה הוכנה:', rel, '->', out)
    return out


def gallery(name, kind, default_alt):
    data = load(name)
    items = data.get('items') or []
    changed = False
    works = []
    for item in items:
        if not item or not item.get('image'):
            continue
        rel = process_image(item['image'])
        if rel is None:
            continue
        if rel != item['image']:
            item['image'] = rel
            changed = True
        with Image.open(path(rel)) as im:
            w, h = im.size
        with open(path(rel), 'rb') as f:
            version = hashlib.md5(f.read()).hexdigest()[:8]  # תמונה שהוחלפה תיטען מחדש גם אם הדפדפן שמר את הישנה
        works.append({'type': kind, 'src': rel + '?v=' + version, 'width': w, 'height': h,
                      'alt': (item.get('alt') or '').strip() or default_alt})
    if changed:
        save(name, data)
    return works


def main():
    tattoos = gallery('tattoos', 'tattoo', 'קעקוע של Sahar Tzaig')
    drawings = gallery('drawings', 'drawing', 'ציור בעיפרון של Sahar Tzaig')

    contact = load('contact')
    for k in ('weekdays_open', 'weekdays_close', 'friday_open', 'friday_close'):
        contact[k] = clock(contact.get(k))
    contact['instagram'] = str(contact.get('instagram') or '').strip().lstrip('@')
    contact['phone'] = str(contact.get('phone') or '').strip()
    digits = re.sub(r'\D', '', contact['phone'])
    local = digits[3:] if digits.startswith('972') else digits.lstrip('0')

    env = Environment(loader=FileSystemLoader(path('templates')),
                      autoescape=select_autoescape(['html']), keep_trailing_newline=True)
    # JSON למידע שגוגל קורא, עם עברית קריאה
    env.filters['tojson'] = lambda v: Markup(json.dumps(v, ensure_ascii=False).replace('<', '\\u003c'))
    env.filters['nl2br'] = lambda v: Markup('<br>').join(escape(line) for line in str(v or '').strip().splitlines())
    def asset_version(rel):
        with open(path(rel), 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()[:8]

    a11y = load('accessibility')
    a11y['coordinator_phone'] = str(a11y.get('coordinator_phone') or contact['phone']).strip()
    a11y['updated'] = str(a11y.get('updated') or '').strip()
    shared = dict(
        contact=contact, a11y=a11y,
        wa_number='972' + local,
        a11y_phone_tel='+972' + re.sub(r'\D', '', a11y['coordinator_phone']).lstrip('0'),
        css_version=asset_version('assets/css/style.css'),
        a11y_js_version=asset_version('assets/js/a11y.js'),
        main_js_version=asset_version('assets/js/main.js'),
    )
    with open(path('accessibility.html'), 'w', encoding='utf-8') as f:
        f.write(env.get_template('accessibility.html').render(**shared))

    html = env.get_template('index.html').render(
        works=tattoos + drawings,
        gallery=load('gallery'), about=load('about'), how=load('how'),
        faq=load('faq'), reviews=load('reviews'), base='',
        **shared,
        phone_intl='+972-' + (local[:2] + '-' + local[2:5] + '-' + local[5:] if len(local) == 9 else local),
        instagram_url='https://www.instagram.com/%s/' % contact['instagram'],
        maps_query=quote_plus('%s %s' % (contact.get('street', ''), contact.get('city', ''))),
    )
    with open(path('index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('index.html נבנה: %d קעקועים, %d ציורים' % (len(tattoos), len(drawings)))


if __name__ == '__main__':
    main()

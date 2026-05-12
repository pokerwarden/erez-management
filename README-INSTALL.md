# מדריך התקנה — מערכת ניהול תיקים

## דרישות מקדימות

1. **Docker Desktop** — הורד והתקן מ: https://www.docker.com/products/docker-desktop
2. ודא ש-Docker Desktop פועל (יש להשאיר אותו פתוח ברקע)

---

## התקנה ראשונה

### שלב 1: פתיחת הקובץ
```bash
unzip lawfirm-system-v1.0.zip
cd lawfirm-system-v1.0
```

### שלב 2: הרצת ההתקנה
```bash
chmod +x install.sh
./install.sh
```

הסקריפט יבצע אוטומטית:
- טעינת Docker images
- יצירת סיסמאות אקראיות מאובטחות
- הרצת בסיס הנתונים
- הרצת migrations
- יצירת משתמש מנהל ראשון

### שלב 3: פתיחת המערכת
פתח דפדפן ועבור ל: **http://localhost:4000**

---

## גישה מרשת המשרד

לאפשר לכל המחשבים ברשת לגשת למערכת:

1. מצא את כתובת ה-IP של השרת (המחשב עם ההתקנה):
   ```bash
   # ב-Windows:
   ipconfig
   # ב-Mac/Linux:
   ifconfig
   ```

2. ממחשבים אחרים, פתח: **http://[IP-של-השרת]:3000**
   - לדוגמה: `http://192.168.1.100:3000`

---

## ניהול n8n (אוטומציות)

פאנל n8n נמצא ב: **http://localhost:5678**

- שם משתמש: `admin`
- סיסמה: מוגדרת ב-`.env` תחת `N8N_PASSWORD`

---

## גיבוי ושחזור

### גיבוי
```bash
chmod +x backup.sh
./backup.sh
```
הגיבוי יישמר בתיקיית `backups/`

### שחזור
```bash
chmod +x restore.sh
./restore.sh backups/db_20240101_120000.sql
```

---

## עדכון גרסה

```bash
chmod +x update.sh
./update.sh update-v1.1.tar.gz
```

---

## פקודות שימושיות

```bash
# הפסקת המערכת
docker compose stop

# הפעלת המערכת
docker compose start

# צפייה ב-logs
docker compose logs -f

# הצגת סטטוס
docker compose ps

# הסרה מלאה (מוחק את כל הנתונים!)
chmod +x uninstall.sh
./uninstall.sh
```

---

## תמיכה טכנית

לפניות תמיכה, שלח את ה-logs:
```bash
docker compose logs > logs.txt
```

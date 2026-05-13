const he = {
  // Navigation
  dashboard: 'לוח בקרה',
  cases: 'תיקים',
  myTasks: 'המשימות שלי',
  employees: 'עובדים',
  settings: 'הגדרות',
  logout: 'התנתקות',

  // Case statuses
  OPEN: 'פתוח',
  IN_PROGRESS: 'בטיפול',
  PENDING_CLIENT: 'ממתין ללקוח',
  PENDING_COURT: 'ממתין לבית משפט',
  PENDING_RESPONSE: 'ממתין לתגובה',
  CLOSED: 'סגור',
  ARCHIVED: 'בארכיון',

  // Task statuses
  TODO: 'לביצוע',
  DONE: 'הושלם',

  // Task priorities
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה',
  URGENT: 'דחוף',

  // User roles
  ADMIN: 'מנהל',
  EMPLOYEE: 'עובד',

  // Actions
  save: 'שמור',
  cancel: 'ביטול',
  delete: 'מחק',
  edit: 'ערוך',
  add: 'הוסף',
  create: 'צור',
  upload: 'העלה',
  search: 'חיפוש',
  filter: 'סנן',
  close: 'סגור',
  confirm: 'אישור',

  // Common
  name: 'שם',
  email: 'דוא"ל',
  phone: 'טלפון',
  address: 'כתובת',
  description: 'תיאור',
  status: 'סטטוס',
  priority: 'עדיפות',
  dueDate: 'תאריך יעד',
  createdAt: 'תאריך יצירה',
  updatedAt: 'עדכון אחרון',
  actions: 'פעולות',
  loading: 'טוען...',
  noResults: 'לא נמצאו תוצאות',
  required: 'שדה חובה',

  // Cases
  caseNumber: 'מספר תיק',
  courtCaseNumber: 'מס\' תיק בי"מ',
  caseTitle: 'כותרת התיק',
  clientName: 'שם לקוח',
  caseType: 'סוג תיק',
  courtDate: 'תאריך דיון',
  courtName: 'בית משפט',
  assignedTo: 'מוקצה ל',
  newCase: 'תיק חדש',
  editCase: 'ערוך תיק',

  // Financial fields
  initialPrice: 'הצעת מחיר ראשונית',
  totalCaseValue: 'שווי תיק כולל',
  workHours: 'זמן עבודה (שע\')',
  clientProposal: 'הצעת לקוח',
  totalUsed: 'סה"כ נוצל',
  billing: 'חיובים',
  financial: 'פיננסי',

  // Status requests
  statusRequest: 'בקשת התייחסות',
  sendStatusRequest: 'שלח בקשת התייחסות',
  resolveRequest: 'סמן כנפתר',
  pendingRequests: 'בקשות ממתינות',

  // Overview
  overview: 'מבט-על',

  // Tasks
  taskTitle: 'כותרת משימה',
  newTask: 'משימה חדשה',
  editTask: 'ערוך משימה',
  assignee: 'מוקצה ל',
  relatedCase: 'תיק קשור',

  // Comments
  comments: 'הערות',
  addComment: 'הוסף הערה',
  writeComment: 'כתוב הערה...',

  // Documents
  documents: 'מסמכים',
  uploadDocument: 'העלה מסמך',
  fileName: 'שם קובץ',
  fileSize: 'גודל',
  uploadedAt: 'הועלה ב',

  // Notifications
  notifications: 'התראות',
  markAllRead: 'סמן הכל כנקרא',
  noNotifications: 'אין התראות חדשות',

  // Auth
  login: 'כניסה',
  password: 'סיסמה',
  loginTitle: 'כניסה למערכת',

  // Setup
  setupTitle: 'הגדרה ראשונית',
  setupDescription: 'צור משתמש מנהל ראשון',
  adminName: 'שם המנהל',

  // Dashboard
  totalOpenCases: 'תיקים פתוחים',
  overdueTasks: 'משימות שפג תוקפן',
  pendingTasks: 'משימות ממתינות',
  employeeWorkload: 'עובדים',
  activeCases: 'תיקים פעילים',
  pendingTasksCount: 'משימות פעילות',

  // Firm settings
  firmName: 'שם המשרד',
  firmLogo: 'לוגו המשרד',
  primaryColor: 'צבע ראשי',
  uploadLogo: 'העלה לוגו',
}

export type I18nKey = keyof typeof he

export function t(key: I18nKey | string): string {
  return (he as Record<string, string>)[key] ?? key
}

export default he

// recipes database — keyed by meal ID
// Each recipe: { servings, prepTime (min), cookTime (min), ingredientsDetailed[], instructions[], tip }

export const RECIPES = {

  b002: {
    servings: 1,
    prepTime: 2,
    cookTime: 5,
    ingredientsDetailed: [
      { amount: '3 כפות', item: 'שיבולת שועל גסה' },
      { amount: '½ בננה בשלה', item: 'מועכת' },
      { amount: '120 מ"ל', item: 'חלב אם, פורמולה או חלב רגיל' },
    ],
    instructions: [
      'בשל שיבולת שועל עם הנוזל 3–4 דקות עד שמסמיך.',
      'הוסף בננה מועכת וערבב.',
      'קרר מעט לפני הגשה.',
    ],
    tip: 'אפשר להוסיף קינמון קטן לטעם.',
  },

  b004: {
    servings: 1,
    prepTime: 1,
    cookTime: 3,
    ingredientsDetailed: [
      { amount: '2', item: 'ביצים' },
      { amount: '1 כפית', item: 'חמאה' },
    ],
    instructions: [
      'הטמע חמאה במחבת על להבה נמוכה.',
      'טרוף ביצים והוסף למחבת.',
      'ערבב לאט עד שמתקשה — שמור על רכות.',
    ],
    tip: 'עצור בישול לפני שהביצה נעשית יבשה לחלוטין.',
  },

  b005: {
    servings: 4,
    prepTime: 3,
    cookTime: 8,
    ingredientsDetailed: [
      { amount: '1', item: 'בננה בשלה מאוד' },
      { amount: '1', item: 'ביצה' },
    ],
    instructions: [
      'מעך בננה עם מזלג עד לקבלת מחית חלקה.',
      'הוסף ביצה וערבב היטב.',
      'שפוך כפיות בטיגון יבש או עם טיפת שמן קוקוס.',
      'אפה 2–3 דקות כל צד על להבה נמוכה-בינונית.',
    ],
    tip: 'ניתן להקפיא — חמם בטוסטר ישר מהמקפיא.',
  },

  b011: {
    servings: 12,
    prepTime: 10,
    cookTime: 20,
    ingredientsDetailed: [
      { amount: '2', item: 'בננות בשלות' },
      { amount: '1 כוס', item: 'שיבולת שועל גסה' },
      { amount: '1', item: 'ביצה' },
      { amount: '1 כפית', item: 'שמן קוקוס מומס' },
      { amount: '½ כפית', item: 'קינמון' },
    ],
    instructions: [
      'חמם תנור ל-180°.',
      'מעך בננות, הוסף ביצה ושמן קוקוס וערבב.',
      'הוסף שיבולת שועל וקינמון ועט לתערובת.',
      'שפוך לתבנית מאפינים משומנת.',
      'אפה 18–20 דקות עד שקיסם יוצא יבש.',
    ],
    tip: 'ניתן להקפיא עד חודש. חמם במיקרו 30 שניות.',
  },

  l001: {
    servings: 4,
    prepTime: 5,
    cookTime: 25,
    ingredientsDetailed: [
      { amount: '2 בינוניות', item: 'בטטה, קלופה וחתוכה לקוביות' },
      { amount: '1 כפית', item: 'שמן זית' },
      { amount: 'לפי הצורך', item: 'מים לבישול' },
    ],
    instructions: [
      'בשל קוביות בטטה במים רותחים 20–25 דקות.',
      'סנן ושמור מעט ממי הבישול.',
      'בלנד עם שמן זית ומעט מי בישול עד לקבלת מחית חלקה.',
    ],
    tip: 'ניתן להקפיא בכוסות קטנות עד חודש. מאוד מתאים לארוחה ראשונה.',
  },

  l004: {
    servings: 3,
    prepTime: 10,
    cookTime: 25,
    ingredientsDetailed: [
      { amount: '150 גר\'', item: 'חזה עוף' },
      { amount: '1 בינונית', item: 'בטטה, קלופה' },
      { amount: '1 כפית', item: 'שמן זית' },
    ],
    instructions: [
      'בשל בטטה עד שמתרככת (20 דקות) וסנן.',
      'בשל עוף בקלייה קלה או אידוי עד שמוכן לחלוטין.',
      'בלנד עוף ובטטה יחד עם מעט מי בישול ושמן זית.',
    ],
    tip: 'ניתן להקפיא. מניבה ארוחות לכמה ימים.',
  },

  l005: {
    servings: 6,
    prepTime: 5,
    cookTime: 20,
    ingredientsDetailed: [
      { amount: '1 כוס', item: 'עדשים כתומות' },
      { amount: '1', item: 'גזר, חתוך לקוביות' },
      { amount: '½ כפית', item: 'כמון' },
      { amount: '1 כפית', item: 'שמן זית' },
      { amount: '3 כוסות', item: 'מים' },
    ],
    instructions: [
      'שטוף עדשים היטב.',
      'בשל עדשים, גזר ומים עד שהעדשים מתרככות (15–20 דקות).',
      'הוסף כמון ושמן זית.',
      'בלנד לקבלת מחית חלקה.',
    ],
    tip: 'קפא מצוין. מניב עד 6 ארוחות בינוניות.',
  },

  l007: {
    servings: 2,
    prepTime: 3,
    cookTime: 15,
    ingredientsDetailed: [
      { amount: '150 גר\'', item: 'פילה סלמון' },
      { amount: '½', item: 'לימון, מיץ' },
      { amount: '1 כפית', item: 'שמן זית' },
    ],
    instructions: [
      'חמם תנור ל-180°.',
      'הנח סלמון בתבנית עם שמן זית ומיץ לימון.',
      'אפה 12–15 דקות עד שהדג שלם ומתפרק בקלות.',
      'רסק עם מזלג.',
    ],
    tip: 'ניתן להגיש עם פירה בטטה לארוחה עשירה.',
  },

  l009: {
    servings: 10,
    prepTime: 15,
    cookTime: 15,
    ingredientsDetailed: [
      { amount: '300 גר\'', item: 'בורי או דניס טחון' },
      { amount: '2 כפות', item: 'פירורי לחם' },
      { amount: '1', item: 'ביצה' },
      { amount: '1 כף', item: 'שמיר קצוץ' },
    ],
    instructions: [
      'ערבב דג, פירורי לחם, ביצה ושמיר.',
      'צור כדורים קטנים.',
      'אדה על קיטור 12–15 דקות.',
    ],
    tip: 'ניתן להקפיא. מחמם יפה.',
  },

  l011: {
    servings: 8,
    prepTime: 10,
    cookTime: 60,
    ingredientsDetailed: [
      { amount: '½', item: 'עוף שלם או שוקיים' },
      { amount: '2', item: 'גזרים' },
      { amount: '1 גבעול', item: 'סלרי' },
      { amount: '1', item: 'בצל' },
      { amount: 'חופן', item: 'פטרוזיליה' },
      { amount: '6 כוסות', item: 'מים' },
    ],
    instructions: [
      'הנח הכל בסיר, מלא מים.',
      'הרתח ונקה קצף.',
      'בשל על להבה נמוכה שעה.',
      'סנן ושמור ציר. גרר בשר עוף לגשה.',
    ],
    tip: 'ציר העוף מצוין להקפאה בנפרד.',
  },

  l013: {
    servings: 5,
    prepTime: 10,
    cookTime: 20,
    ingredientsDetailed: [
      { amount: '300 גר\'', item: 'בקר טחון רזה' },
      { amount: '1', item: 'גזר מגורר' },
      { amount: '1', item: 'קישוא מגורר' },
      { amount: '1', item: 'עגבנייה קצוצה' },
      { amount: '1 כפית', item: 'שמן זית' },
    ],
    instructions: [
      'חמם שמן בסיר, הוסף ירקות ואדה 5 דקות.',
      'הוסף בקר טחון וערבב עד שמתבשל (10 דקות).',
      'הוסף עגבנייה ובשל עוד 5 דקות.',
      'רסק קצת לפי גיל הילד.',
    ],
    tip: 'ניתן להקפיא. מקור ברזל מעולה.',
  },

  d001: {
    servings: 6,
    prepTime: 10,
    cookTime: 25,
    ingredientsDetailed: [
      { amount: '2', item: 'גזרים' },
      { amount: '1', item: 'קישוא' },
      { amount: '1', item: 'בצל' },
      { amount: '1', item: 'תפוח אדמה' },
      { amount: '1 כפית', item: 'שמן זית' },
      { amount: '5 כוסות', item: 'מים' },
    ],
    instructions: [
      'חתוך ירקות לקוביות גדולות.',
      'בשל במים עד שמתרכך לחלוטין (25 דקות).',
      'בלנד הכל עם שמן זית.',
      'תאם סמיכות עם מי בישול.',
    ],
    tip: 'ניתן להקפיא. מחמם ומזין לאחר אמבטיה.',
  },

  d004: {
    servings: 6,
    prepTime: 5,
    cookTime: 25,
    ingredientsDetailed: [
      { amount: '1 כוס', item: 'עדשים כתומות' },
      { amount: '2', item: 'גזרים' },
      { amount: '½ כפית', item: 'כמון' },
      { amount: '1 כפית', item: 'שמן זית' },
      { amount: '5 כוסות', item: 'מים' },
    ],
    instructions: [
      'שטוף עדשים.',
      'בשל עם גזר ומים 20–25 דקות.',
      'הוסף כמון ושמן זית.',
      'בלנד לסמיכות מרק.',
    ],
    tip: 'מחמם ונוחה להכין מראש. ניתן להקפיא.',
  },

  d012: {
    servings: 15,
    prepTime: 15,
    cookTime: 20,
    ingredientsDetailed: [
      { amount: '400 גר\'', item: 'עוף טחון' },
      { amount: '3 כפות', item: 'פירורי לחם' },
      { amount: '1', item: 'ביצה' },
      { amount: '1 כף', item: 'פטרוזיליה קצוצה' },
    ],
    instructions: [
      'ערבב עוף, פירורי לחם, ביצה ופטרוזיליה.',
      'גבל ידיים רטובות לכדורים קטנים.',
      'אדה 15–20 דקות על קיטור.',
    ],
    tip: 'ניתן להקפיא. מצוין לאחיזה עצמאית לתינוקות מגיל 10 חודשים.',
  },

  d018: {
    servings: 8,
    prepTime: 10,
    cookTime: 50,
    ingredientsDetailed: [
      { amount: '½', item: 'עוף' },
      { amount: '¾ כוס', item: 'אורז' },
      { amount: '2', item: 'גזרים' },
      { amount: '1 גבעול', item: 'סלרי' },
      { amount: 'חופן', item: 'פטרוזיליה' },
      { amount: '6 כוסות', item: 'מים' },
    ],
    instructions: [
      'בשל עוף עם ירקות ומים שעה.',
      'הוצא עוף, גרר, החזר לסיר.',
      'הוסף אורז ובשל 20 דקות נוספות.',
    ],
    tip: 'מרק קלאסי לתינוקות. מניח להכין כמות גדולה ולהקפיא.',
  },
}

export const getRecipe = (mealId) => RECIPES[mealId] || null

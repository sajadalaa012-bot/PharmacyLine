from sqlalchemy.orm import Session
from models import Category, Product

# Mapping of categories and their display orders
CATEGORIES = {
    "Vitamins & Supplements": {
        "display_order": 1,
        "products": [
            {"name": "HAIR SKIN NAILS GUMMIES", "code": "F1", "price": 21000, "image_url": "/products/F1.jpg"},
            {"name": "HAIR SKIN NAILS GUMMIES ADVANCED", "code": "F2", "price": 21000, "image_url": "/products/F2.jpg"},
            {"name": "HYDROXY BLACK الأمريكي الأصلي", "code": "F3", "price": 31500, "image_url": "/products/F3.jpg"},
            {"name": "HYDROXY GAMMIES MUILT VIT", "code": "F4", "price": 18000, "image_url": "/products/F4.jpg"},
            {"name": "HYDROXY GAMMIES", "code": "F5", "price": 18000, "image_url": "/products/F5.jpg"},
            {"name": "B12 100 TAB الأمريكي الأصلي", "code": "F6", "price": 22000, "image_url": "/products/F6.jpg"},
            {"name": "B12 STROBARY 100 TAB الأمريكي الأصلي", "code": "F7", "price": 22000, "image_url": "/products/F7.jpg"},
            {"name": "BIOTIN 1000 MCG 100 TAB الأمريكي الأصلي", "code": "F8", "price": 19000, "image_url": "/products/F8.jpg"},
            {"name": "FISH OIL 1200 MG 120 SOFT GEL الأمريكي الأصلي", "code": "F9", "price": 19000, "image_url": "/products/F9.jpg"},
            {"name": "NOW BIOTIN صنع في تركيا", "code": "F10", "price": 17000, "image_url": "/products/F10.jpg"},
            {"name": "NOW E-400 صنع في تركيا", "code": "F11", "price": 12000, "image_url": "/products/F11.jpg"},
            {"name": "NOW CHOLINE & INOSITOL صنع في تركيا", "code": "F12", "price": 25000, "image_url": "/products/F12.jpg"},
            {"name": "NOW B-50 صنع في تركيا", "code": "F13", "price": 17000, "image_url": "/products/F13.jpg"},
            {"name": "NOW MAGNESIUM صنع في تركيا", "code": "F14", "price": 17000, "image_url": "/products/F14.jpg"},
            {"name": "APPLE CIDER GAMMIES", "code": "F15", "price": 16500, "image_url": "/products/F15.jpg"},
            {"name": "ONE A DAY VIT FOR WOMEN 200 TAB", "code": "F16", "price": 22500, "image_url": "/products/F16.jpg"},
            {"name": "ONE A DAY VIT FOR WOMEN 60 TAB", "code": "F17", "price": 14250, "image_url": "/products/F17.jpg"},
            {"name": "ONE A DAY VIT FOR MEN 200 TAB", "code": "F18", "price": 22500, "image_url": "/products/F18.jpg"},
            {"name": "ONE A DAY VIT FOR MEN 60 TAB", "code": "F19", "price": 14250, "image_url": "/products/F19.jpg"},
        ]
    },
    "Skincare Serums & Ampoules": {
        "display_order": 2,
        "products": [
            {"name": "سيروم بيوتي الكوري استيراد دبي ) BEAUTY OF JOSEN (", "code": "F21", "price": 12750, "image_url": "/products/F21.jpg"},
            {"name": "GINSENG CLEANSING OIL استيراد دبي BEAUTY OF JOSEN", "code": "F23", "price": 12750, "image_url": "/products/F23.jpg"},
            {"name": "(تونر الحلزون ) الكوري COSRX استيراد دبي", "code": "F28", "price": 16500, "image_url": "/products/F28.jpg"},
            {"name": "RETINAL SHOT", "code": "F33", "price": 12000, "image_url": "/products/F33.jpg"},
            {"name": "ORDINARY سيروم الفا اربوتين استيراد دبي", "code": "F35", "price": 15000, "image_url": "/products/F35.jpg"},
            {"name": "ORDINARY سيروم ريتينول استيراد دبي", "code": "F36", "price": 15000, "image_url": "/products/F36.jpg"},
            {"name": "ORDINARY سيروم الكافيين استيراد دبي", "code": "F37", "price": 15000, "image_url": "/products/F37.jpg"},
            {"name": "ORDINARY سيروم مقشر استيراد دبي", "code": "F38", "price": 15000, "image_url": "/products/F38.jpg"},
            {"name": "ORDINARY سيروم حمض اللاكتيك استيراد دبي", "code": "F39", "price": 15000, "image_url": "/products/F39.jpg"},
            {"name": "ORDINARY سيروم نيساميد + زنك استيراد دبي", "code": "F40", "price": 15000, "image_url": "/products/F40.jpg"},
            {"name": "ORDINARY ( TONER 7% BYLOCOLICACID ) استيراد دبي", "code": "F41", "price": 16500, "image_url": "/products/F41.jpg"},
            {"name": "Dr. melaxin ampoule الأصلي", "code": "F42", "price": 18000, "image_url": "/products/F42.jpg"},
            {"name": "Dr. melaxin Niacinamide serum الأصلي", "code": "F46", "price": 15000, "image_url": "/products/F46.jpg"},
            {"name": "SERUM SIMPLE ( VIT F , VIT C , NAIC )", "code": "F96", "price": 6000, "image_url": "/products/F96.jpg"},
            {"name": "CENTELLA SERUM FRESH AMP", "code": "F111", "price": 15000, "image_url": "/products/F113.jpg"},
            {"name": "CENTELLA SERUM", "code": "F112", "price": 15000, "image_url": "/products/F114.jpg"},
            {"name": "CENTELLA HYLA SERUM", "code": "F118", "price": 15000, "image_url": "/products/F120.jpg"},
        ]
    },
    "Skincare Creams & Lotions": {
        "display_order": 3,
        "products": [
            {"name": "(كريم هايلورونيك أسيد) الكوري COSRX استيراد دبي", "code": "F27", "price": 15000, "image_url": "/products/F27.jpg"},
            {"name": "(كريم الحلزون) الكوري COSRX استيراد دبي", "code": "F29", "price": 15000, "image_url": "/products/F29.jpg"},
            {"name": "عصارة 345 الكورية استيراد دبي", "code": "F31", "price": 11250, "image_url": "/products/F31.jpg"},
            {"name": "عصارة 922 استيراد دبي", "code": "F32", "price": 12750, "image_url": "/products/F32.jpg"},
            {"name": "Dr. melaxin Niacinamide cream الأصلي", "code": "F43", "price": 16500, "image_url": "/products/F43.jpg"},
            {"name": "Dr. melaxin Eye cream الأصلي", "code": "F44", "price": 18000, "image_url": "/products/F44.jpg"},
            {"name": "Dr. melaxin repaire cream الأصلي", "code": "F45", "price": 16500, "image_url": "/products/F45.jpg"},
            {"name": "MELANO FREE 4% الأصلي استيراد دبي", "code": "F48", "price": 5250, "image_url": "/products/F48.jpg"},
            {"name": "كريم ميلانو علبة الأصلي استيراد دبي", "code": "F49", "price": 5250, "image_url": "/products/F49.jpg"},
            {"name": "عصارة A313 استيراد دبي", "code": "F50", "price": 11250, "image_url": "/products/F50.jpg"},
            {"name": "الاصدار الجديد QVكريم استيراد دبي", "code": "F51", "price": 11250, "image_url": "/products/F51.jpg"},
            {"name": "لوشن QV استيراد دبي", "code": "F52", "price": 11250, "image_url": "/products/F52.jpg"},
            {"name": "day cream QV 75 g", "code": "F53", "price": 13500, "image_url": "/products/F53.jpg"},
            {"name": "skin lotion QV 500 mL", "code": "F54", "price": 13500, "image_url": "/products/F54.jpg"},
            {"name": "hand cream QV spF 15", "code": "F55", "price": 11250, "image_url": "/products/F55.jpg"},
            {"name": "ACM DEPWHITE ADVANCE وارد تركي", "code": "F56", "price": 9000, "image_url": "/products/F56.jpg"},
            {"name": "CREAM COLLAGEN ELIZA", "code": "F64", "price": 13500, "image_url": "/products/F64.jpg"},
            {"name": "ISISPHARMA مرطب للبشرة الجافة صنع في تركيا", "code": "F65", "price": 9000, "image_url": "/products/F65.jpg"},
            {"name": "ISISPHARMA مقشر للبقع الداكنة صنع في تركيا", "code": "F66", "price": 10500, "image_url": "/products/F66.jpg"},
            {"name": "سيباميل كريم اليد صنع في تركيا", "code": "F68", "price": 5000, "image_url": "/products/F68.jpg"},
            {"name": "سيباميل مرهم وقاية صنع في تركيا", "code": "F69", "price": 6000, "image_url": "/products/F69.jpg"},
            {"name": "سيباميل بلسم للكعب المتشقق صنع في تركيا", "code": "F70", "price": 6000, "image_url": "/products/F70.jpg"},
            {"name": "( lotion Moisturizing ) Cerave 732 مل وارد الامارات", "code": "F72", "price": 12000, "image_url": "/products/F72.jpg"},
            {"name": "( SA lotion ) Cerave 732 مل وارد الامارات", "code": "F75", "price": 12000, "image_url": "/products/F75.jpg"},
            {"name": "Cerave ( 343 غم مرطب ) وارد الامارات", "code": "F76", "price": 12000, "image_url": "/products/F76.jpg"},
            {"name": "EUCERIN Q10 ANTI – WRINKLE الأصلي", "code": "F82", "price": 15000, "image_url": "/products/F82.jpg"},
            {"name": "EUCERIN NIGHT CREAM الأصلي", "code": "F83", "price": 15000, "image_url": "/products/F83.jpg"},
            {"name": "EUCERIN GEL CREAM الأصلي", "code": "F84", "price": 15000, "image_url": "/products/F84.jpg"},
            {"name": "EUCERIN BRIGHTENING", "code": "F85", "price": 19500, "image_url": "/products/F85.jpg"},
            {"name": "EUCERIN PH5", "code": "F86", "price": 19500, "image_url": "/products/F86.jpg"},
            {"name": "EUCERIN ROUGH NESS RELIEF LOTION", "code": "F87", "price": 15000, "image_url": "/products/F87.jpg"},
            {"name": "EQQUAL BERRY RICE PDRN", "code": "F89", "price": 15000, "image_url": "/products/F89.jpg"},
            {"name": "EQQUAL BERRY PLUMPING", "code": "F90", "price": 15000, "image_url": "/products/F90.jpg"},
            {"name": "EQQUAL BERRY VITAMIN", "code": "F91", "price": 15000, "image_url": "/products/F91.jpg"},
            {"name": "SIMPLE LOTION 15 ML الأصلي", "code": "F93", "price": 7500, "image_url": "/products/F93.jpg"},
            {"name": "KENTA CREAM لتفتيح وتبيض البشرة الأصلي", "code": "F99", "price": 11250, "image_url": "/products/F101.jpg"},
            {"name": "جل الصبار (إماراتي)", "code": "F110", "price": 3750, "image_url": "/products/F112.jpg"},
            {"name": "CENTELLA TONER", "code": "F113", "price": 15000, "image_url": "/products/F115.jpg"},
            {"name": "CENTELLA PRO BIO _ CICA", "code": "F114", "price": 15000, "image_url": "/products/F116.jpg"},
            {"name": "CENTELLA (PRO BIO-CICA CREAM)", "code": "F119", "price": 15000, "image_url": "/products/F121.jpg"},
            {"name": "كريم فيتامين E الإماراتي المزدوج", "code": "F120", "price": 3000, "image_url": "/products/F122.jpg"},
            {"name": "كريم الجلسرين الأصلي", "code": "F121", "price": 3750, "image_url": "/products/F123.jpg"},
            {"name": "عصارة الجلسرين الأصلي", "code": "F122", "price": 3000, "image_url": "/products/F124.jpg"},
            {"name": "CICAPLAST B5 استيراد دبي", "code": "F123", "price": 9750, "image_url": "/products/F125.jpg"},
        ]
    },
    "Sunscreen & UV Protection": {
        "display_order": 4,
        "products": [
            {"name": "واقي شمس بيوتي الكوري استيراد دبي BEAUTY OF JOSEN", "code": "F22", "price": 13750, "image_url": "/products/F22.jpg"},
            {"name": "واقي شمس بيوتي (الاصدار الجديد) استيراد دبي BEAUTY OF JOSEN", "code": "F24", "price": 12750, "image_url": "/products/F24.jpg"},
            {"name": "(واقي شمس ألوفيرا) 50 COSRX استيراد دبي", "code": "F30", "price": 13500, "image_url": "/products/F30.jpg"},
            {"name": "Pharmacies W وارد تركي", "code": "F47", "price": 12750, "image_url": "/products/F47.jpg"},
            {"name": "ACM SPF 50 وارد تركي", "code": "F59", "price": 7500, "image_url": "/products/F59.jpg"},
            {"name": "واقي شمس SIMPLE +50 SPF", "code": "F60", "price": 6000, "image_url": "/products/F60.jpg"},
            {"name": "واقي شمس فارمسرز امتياز طبق الاصل 50", "code": "F61", "price": 4500, "image_url": "/products/F61.jpg"},
            {"name": "TIZO ULTRA ZINC وارد دبي", "code": "F62", "price": 15000, "image_url": "/products/F62.jpg"},
            {"name": "واقي شمس AVENE SPF 50", "code": "F63", "price": 10500, "image_url": "/products/F63.jpg"},
            {"name": "عصارة واقي شمس لاروش الاصدار الجديد استيراد دبي", "code": "F100", "price": 10000, "image_url": "/products/F102.jpg"},
            {"name": "واقي شمس لاروش الاصدار الجديد استيراد دبي", "code": "F101", "price": 10000, "image_url": "/products/F103.jpg"},
            {"name": "واقي شمس UV الأصلي", "code": "F103", "price": 13000, "image_url": "/products/F105.jpg"},
        ]
    },
    "Cleansers & Washes": {
        "display_order": 5,
        "products": [
            {"name": "عصارة سالسيك أسيد الكوري COSRX استيراد دبي", "code": "F25", "price": 12750, "image_url": "/products/F25.jpg"},
            {"name": "CLEANSER PH LOW الكوري COSRX استيراد دبي", "code": "F26", "price": 12750, "image_url": "/products/F26.jpg"},
            {"name": "( Acne control ) Cerave 732 مل وارد الامارات", "code": "F73", "price": 12000, "image_url": "/products/F73.jpg"},
            {"name": "( hydrating to foam ) Cerave 732 مل وارد الامارات", "code": "F74", "price": 12000, "image_url": "/products/F74.jpg"},
            {"name": "بايوديرم غسول (العرض الخاص) الأصلي", "code": "F88", "price": 25500, "image_url": "/products/F88.jpg"},
            {"name": "PANOXYL ACNE FOAMING WASH الاصدار الجديد", "code": "F92", "price": 18000, "image_url": "/products/F92.jpg"},
            {"name": "SIMPLE MOISTURIZING الأصلي", "code": "F94", "price": 6000, "image_url": "/products/F94.jpg"},
            {"name": "SIMPLE REFRESHING الأصلي", "code": "F95", "price": 6000, "image_url": "/products/F95.jpg"},
            {"name": "NEUTROGENA الاصدار الجديد", "code": "F98", "price": 11250, "image_url": "/products/F100.jpg"},
            {"name": "غسول نيفيا الأصلي", "code": "F104", "price": 5500, "image_url": "/products/F106.jpg"},
            {"name": "غسول كارنيه استيراد دبي", "code": "F105", "price": 5500, "image_url": "/products/F107.jpg"},
            {"name": "REVUELE الأصلي", "code": "F107", "price": 5250, "image_url": "/products/F109.jpg"},
            {"name": "CENTELLA LIGHT CLEANSER OIL", "code": "F115", "price": 15000, "image_url": "/products/F117.jpg"},
            {"name": "CENTELLA TEA – TRICA FOAM 100 ML", "code": "F116", "price": 15000, "image_url": "/products/F118.jpg"},
            {"name": "CENTELLA AMPOULE FOAM 125 ML", "code": "F117", "price": 15000, "image_url": "/products/F119.jpg"},
        ]
    },
    "Hair Care & Treatments": {
        "display_order": 6,
        "products": [
            {"name": "MINOXIDIL KIT USA غير متوفر", "code": "F20", "price": 39000, "image_url": "/products/F20.jpg"},
            {"name": "CRESCINA امبولات انبات الشعر (صنع تركي طبق الاصل)", "code": "F34", "price": 60000, "image_url": "/products/F34.jpg"},
            {"name": "ACM NOVOPHANE LOTION وارد تركي", "code": "F57", "price": 10500, "image_url": "/products/F57.jpg"},
            {"name": "ACM NOVOPHANE CAP. وارد تركي", "code": "F58", "price": 21000, "image_url": "/products/F58.jpg"},
            {"name": "كريم الشعر الياباني استيراد دبي FINO", "code": "F79", "price": 13500, "image_url": "/products/F79.jpg"},
            {"name": "شامبو + مكيف استيراد دبي FINO", "code": "F80", "price": 11250, "image_url": "/products/F80.jpg"},
            {"name": "بخاخ معالج استيراد دبي FINO", "code": "F81", "price": 10500, "image_url": "/products/F81.jpg"},
            {"name": "سيروم اكليل الجبل الأصلي (استيراد خاص)", "code": "F108", "price": 11250, "image_url": "/products/F110.jpg"},
            {"name": "شامبو اكليل الجبل (إماراتي أصلي)", "code": "F109", "price": 6750, "image_url": "/products/F111.jpg"},
            {"name": "شامبو قمل لوباج صنع في تركيا", "code": "F136", "price": 5500, "image_url": "/products/F138.jpg"},
            {"name": "شامبو كيتوناز صنع في تركيا", "code": "F137", "price": 2800, "image_url": "/products/F139.jpg"},
            {"name": "شامبو كيتونازول 9% شركة كور مسك", "code": "F138", "price": 4500, "image_url": "/products/F140.jpg"},
            {"name": "MINOXIDIL 10% صنع في تركيا", "code": "F139", "price": 5000, "image_url": "/products/F141.jpg"},
            {"name": "شامبو سيلسن بلو صنع في تركيا", "code": "F140", "price": 5000, "image_url": "/products/F142.jpg"},
            {"name": "SHAMPO CONAZOL صنع في تركيا", "code": "F141", "price": 4500, "image_url": "/products/F143.jpg"},
            {"name": "بخاخ القمل نايدا بلس (وارد تركي)", "code": "F142", "price": 8250, "image_url": "/products/F144.jpg"},
        ]
    },
    "Soaps & Cleansing Bars": {
        "display_order": 7,
        "products": [
            {"name": "صابون كوجك", "code": "F124", "price": 2250, "image_url": "/products/F126.jpg"},
            {"name": "صابون ميلانو", "code": "F125", "price": 3000, "image_url": "/products/F127.jpg"},
            {"name": "صابون كوزركس", "code": "F126", "price": 3000, "image_url": "/products/F128.jpg"},
            {"name": "صابون الصبار", "code": "F127", "price": 2250, "image_url": "/products/F129.jpg"},
            {"name": "صابون الثمن التايلاندي", "code": "F128", "price": 2250, "image_url": "/products/F130.jpg"},
            {"name": "صابون كبسولة", "code": "F129", "price": 2250, "image_url": "/products/F131.jpg"},
            {"name": "صابون الحبة السوداء", "code": "F130", "price": 1500, "image_url": "/products/F132.jpg"},
            {"name": "صابون الجلسرين", "code": "F131", "price": 1500, "image_url": "/products/F133.jpg"},
            {"name": "صابون الكبريت", "code": "F132", "price": 2250, "image_url": "/products/F134.jpg"},
            {"name": "صابون خميرة البيرة", "code": "F133", "price": 1500, "image_url": "/products/F135.jpg"},
            {"name": "صابون رتن – أي", "code": "F134", "price": 2250, "image_url": "/products/F136.jpg"},
        ]
    },
    "First Aid & Skin Treatments": {
        "display_order": 8,
        "products": [
            {"name": "PHARMACERS KIT WHITENING صنع في تركيا", "code": "F67", "price": 15500, "image_url": "/products/F67.jpg"},
            {"name": "كريم المخدر الكوري الأصلي 222 غرام 21%", "code": "F77", "price": 24750, "image_url": "/products/F77.jpg"},
            {"name": "عصارة لاروش EFFACLAR", "code": "F78", "price": 7500, "image_url": "/products/F78.jpg"},
            {"name": "بكج كوجك اسد استيراد دبي", "code": "F102", "price": 15000, "image_url": "/products/F104.jpg"},
            {"name": "بكج لاروش الاصدار الجديد واقي شمس + سيروم B5 الأصلي", "code": "F106", "price": 22000, "image_url": "/products/F108.jpg"},
            {"name": "عصارة كرم جي إيراني أصلي", "code": "F143", "price": 3750, "image_url": "/products/F145.jpg"},
            {"name": "عصارة سكينورين ازليلاللك 20 اصلية وارد عمان", "code": "F144", "price": 12000, "image_url": "/products/F146.jpg"},
            {"name": "عصارة ميبو سكار وارد تركي", "code": "F145", "price": 9750, "image_url": "/products/F147.jpg"},
            {"name": "عصارة ميبو وارد تركي", "code": "F146", "price": 9750, "image_url": "/products/F148.jpg"},
            {"name": "عصارة بيباثين كريم وارد تركي", "code": "F147", "price": 4500, "image_url": "/products/F149.jpg"},
            {"name": "عصارة هايدروسوفت وارد تركي", "code": "F148", "price": 4500, "image_url": "/products/F150.jpg"},
            {"name": "صودة كريم 120 غرام صيني درجة اولى", "code": "F197", "price": 3000, "image_url": "/products/F202.jpg"},
        ]
    },
    "Oral & Personal Care": {
        "display_order": 9,
        "products": [
            {"name": "LACALUT غرغرة صنع في تركيا", "code": "F71", "price": 6000, "image_url": "/products/F71.jpg"},
            {"name": "فازلين مورد شفه الأصلي", "code": "F97", "price": 3750, "image_url": "/products/F99.jpg"},
            {"name": "غرغرة زاك متوفرة بثلاثة الوان صنع في تركيا", "code": "F135", "price": 1500, "image_url": "/products/F137.jpg"},
            {"name": "ماسكة يد", "code": "F191", "price": 3000, "image_url": "/products/F196.jpg"},
            {"name": "دهن النعام الأصلي", "code": "F192", "price": 4500, "image_url": "/products/F197.jpg"},
            {"name": "فكس", "code": "F193", "price": 12000, "image_url": "/products/F198.jpg"},
            {"name": "كولجيت فرشاة", "code": "F194", "price": 12000, "image_url": "/products/F199.jpg"},
            {"name": "بكج زيت الخروع صيني درجة اولى", "code": "F195", "price": 15000, "image_url": "/products/F200.jpg"},
            {"name": "معجون مارفيس وارد دبي", "code": "F196", "price": 4500, "image_url": "/products/F201.jpg"},
        ]
    },
    "Fitness & Weight Loss": {
        "display_order": 10,
        "products": [
            {"name": "C4 ULTIMATE BLACK الأصلي", "code": "F169", "price": 17000, "image_url": "/products/F173.jpg"},
            {"name": "كبسول ماشا تركي الأصلي", "code": "F170", "price": 15000, "image_url": "/products/F175.jpg"},
            {"name": "مسمن وجه هايدروكسي الأصلي", "code": "F171", "price": 18000, "image_url": "/products/F176.jpg"},
            {"name": "مسمن هايدروكسي عام الأصلي", "code": "F172", "price": 18000, "image_url": "/products/F177.jpg"},
            {"name": "C4 ULTIMATE RED الأصلي", "code": "F173", "price": 21000, "image_url": "/products/F178.jpg"},
            {"name": "SMART KETO CAP 60 غير متوفر", "code": "F174", "price": 21000, "image_url": "/products/F174.jpg"},
            {"name": "PRO KETO CAP 60", "code": "F175", "price": 21000, "image_url": "/products/F183.jpg"},
            {"name": "ACTIVE SLIM الأصلي اللبناني الاصدار الجديد", "code": "F176", "price": 21000, "image_url": "/products/F179.jpg"},
            {"name": "TENUATE RETARD منحف", "code": "F177", "price": 19500, "image_url": "/products/F180.jpg"},
            {"name": "AB SLIM GREEN قاطع شهية", "code": "F186", "price": 18500, "image_url": "/products/F190.jpg"},
            {"name": "شاي ماتشا + فواكه تركي الأصلي", "code": "F187", "price": 5500, "image_url": "/products/F191.jpg"},
            {"name": "حزام مشد نسائي", "code": "F190", "price": 8250, "image_url": "/products/F195.jpg"},
        ]
    },
    "Specialty & Libido Supplements": {
        "display_order": 11,
        "products": [
            {"name": "العسل الحيوي الأصلي 12 SHEET", "code": "F149", "price": 16500, "image_url": "/products/F151.jpg"},
            {"name": "العسل السوري الصغير", "code": "F150", "price": 3500, "image_url": "/products/F154.jpg"},
            {"name": "عسل بلاك هورس 12SHEET", "code": "F151", "price": 13500, "image_url": "/products/F155.jpg"},
            {"name": "عسل WENICK 12SHEET", "code": "F152", "price": 15000, "image_url": "/products/F156.jpg"},
            {"name": "شوكولاتة BUFALO", "code": "F153", "price": 3000, "image_url": "/products/F157.jpg"},
            {"name": "مزلق + مخدر تايلاندي", "code": "F154", "price": 4500, "image_url": "/products/F158.jpg"},
            {"name": "مزلق PLAY امتياز", "code": "F155", "price": 3000, "image_url": "/products/F159.jpg"},
            {"name": "قطرات اثارة نسائي 8P – 1B تركي غير متوفر", "code": "F156", "price": 15000, "image_url": "/products/F160.jpg"},
            {"name": "شوكولاتة اثارة نسائي 8P – 1B تركي", "code": "F157", "price": 15000, "image_url": "/products/F161.jpg"},
            {"name": "علك اثارة نسائي (الباكيت يحتوي على 2 قطع كل قطعة 8 شرايط )", "code": "F158", "price": 9000, "image_url": "/products/F162.jpg"},
            {"name": "بخاخ القرش DELAY SPRAY", "code": "F159", "price": 3000, "image_url": "/products/F163.jpg"},
            {"name": "كريم ايروس الأصلي", "code": "F160", "price": 3750, "image_url": "/products/F164.jpg"},
            {"name": "بخاخ ايروس الأصلي", "code": "F161", "price": 5500, "image_url": "/products/F165.jpg"},
            {"name": "كاماجرا رجالي تركي 100 ملغ", "code": "F188", "price": 6000, "image_url": "/products/F193.jpg"},
            {"name": "كبسول مقوي روسي 1B – 10P الأصلي", "code": "F189", "price": 3150, "image_url": "/products/F194.jpg"},
        ]
    },
    "Collagen & Health": {
        "display_order": 12,
        "products": [
            {"name": "ZINC 60 CAP", "code": "F162", "price": 15000, "image_url": "/products/F166.jpg"},
            {"name": "MAGNESIUM 60 CAP", "code": "F163", "price": 16000, "image_url": "/products/F167.jpg"},
            {"name": "APPLE CIDER VINEGAR 60 CAP", "code": "F164", "price": 18000, "image_url": "/products/F168.jpg"},
            {"name": "(Glycinate) magnesium 400 mg", "code": "F165", "price": 18000, "image_url": "/products/F169.jpg"},
            {"name": "K2+D3", "code": "F166", "price": 15000, "image_url": "/products/F170.jpg"},
            {"name": "MARY RUTH’S MULTI – VITAMIN", "code": "F167", "price": 21000, "image_url": "/products/F171.jpg"},
            {"name": "MARY RUTH’S HAIR GROWTH", "code": "F168", "price": 21000, "image_url": "/products/F172.jpg"},
            {"name": "COLLAGEN + C", "code": "F178", "price": 15000, "image_url": "/products/F181.jpg"},
            {"name": "Marine collagen ( 120 )", "code": "F179", "price": 18000, "image_url": "/products/F182.jpg"},
            {"name": "You theory collagen (120)", "code": "F180", "price": 21000, "image_url": "/products/F184.jpg"},
            {"name": "COLLAGE N شراب كولاجين ML 473 العلبة البلاستيكية وارد تركي", "code": "F181", "price": 21000, "image_url": "/products/F185.jpg"},
            {"name": "COLLAGEN + C شراب (الشكل القديم) وارد تركي", "code": "F182", "price": 18000, "image_url": "/products/F186.jpg"},
            {"name": "HYALURONIC ACID", "code": "F183", "price": 15000, "image_url": "/products/F187.jpg"},
            {"name": "كبسول جينسينغ الأصلي 60CAP", "code": "F184", "price": 16500, "image_url": "/products/F188.jpg"},
            {"name": "OMEGA 3 T&D أوميغا 3 امتياز هندي", "code": "F185", "price": 6000, "image_url": "/products/F189.jpg"},
        ]
    },
}

def seed_database(db: Session) -> None:
    """Seed the database with initial product data if empty."""
    # Check if we already have categories. If so, don't re-seed
    if db.query(Category).count() > 0:
        print("[INFO] Database already contains category data. Skipping seeding.")
        return


    for cat_name, cat_data in CATEGORIES.items():
        category = Category(name=cat_name, display_order=cat_data["display_order"])
        db.add(category)
        db.flush()  # Get the category ID

        for prod in cat_data["products"]:
            product = Product(
                name=prod["name"],
                code=prod["code"],
                price=prod["price"],
                image_url=prod["image_url"],
                category_id=category.id,
            )
            db.add(product)

    db.commit()
    print("[OK] Database seeded with new product catalog and photo references.")
